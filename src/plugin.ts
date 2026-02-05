import type { Plugin, PluginInput } from "@opencode-ai/plugin";
import { configHandler, loadEnabledAgents, loadAgentByName } from "./config-handler.js";
import { loadOrxaConfig } from "./config/loader.js";
import { createWelcomeToastHandler } from "./hooks/welcome-toast.js";
import { createOrxaDetector } from "./hooks/orxa-detector.js";
import { preToolExecution } from "./hooks/pre-tool-execution.js";
import { postSubagentResponse } from "./hooks/post-subagent-response.js";
import { todoContinuationEnforcer } from "./hooks/todo-continuation-enforcer.js";
import { orxaIndicator } from "./hooks/orxa-indicator.js";
import {
  isStoppingResponse,
  getPendingTodos,
  buildTodoContinuationMessage,
} from "./middleware/todo-guardian.js";
import { slashcommand } from "./tools/slashcommand.js";
import type { Message, Session } from "./types.js";

const orxaPlugin: Plugin = async (ctx: PluginInput) => {
  const orxaConfig = loadOrxaConfig();
  const welcomeToastHandler = createWelcomeToastHandler(ctx, orxaConfig);
  const orxaDetector = createOrxaDetector(ctx);
  const sessionCache = new Map<string, Session>();

  const extractMessageText = (parts?: Array<{ type?: string; text?: string }>): string => {
    if (!parts) {
      return "";
    }

    return parts
      .filter((part) => part.type === "text" && typeof part.text === "string")
      .map((part) => part.text)
      .join("\n")
      .trim();
  };

  const loadSession = async (sessionID?: string, agentName?: string, skipFetch = false): Promise<Session | undefined> => {
    if (!sessionID) {
      return undefined;
    }

    const cached = sessionCache.get(sessionID);

    // If skipFetch is true (for subagents), return cached data or minimal session
    if (skipFetch) {
      if (cached) {
        return cached;
      }
      // Return minimal session without fetching
      return {
        id: sessionID,
        agentName: agentName ?? "unknown",
        manualEdits: 0,
        todos: [],
        messages: [],
        messageCount: 0,
        recentMessages: [],
        memoryQueue: [],
        agentAttempts: {},
      };
    }

    // Use cached data if available to avoid API calls
    if (cached) {
      return cached;
    }

    let messages: Message[] = [];
    try {
      const response = await ctx.client.session.messages({
        path: { id: sessionID },
        query: { directory: ctx.directory },
      });
      const data = (response as { data?: unknown }).data ?? response;
      if (Array.isArray(data)) {
        messages = data.map((entry) => {
          const info = (entry as { info?: { role?: string; tool?: string; toolName?: string } })
            .info;
          const parts = (entry as { parts?: Array<{ type?: string; text?: string }> }).parts;
          return {
            role: info?.role ?? "assistant",
            content: extractMessageText(parts),
            toolName: info?.tool ?? info?.toolName,
          };
        });
      }
    } catch {
      messages = [];
    }

    let todos: Session["todos"] = [];
    try {
      if (typeof ctx.client.session.todo === "function") {
        const todoResponse = await ctx.client.session.todo({ path: { id: sessionID } });
        const data = (todoResponse as { data?: unknown }).data ?? todoResponse;
        if (Array.isArray(data)) {
          todos = data as Session["todos"];
        }
      }
    } catch {
      todos = [];
    }

    const session: Session = {
      id: sessionID,
      agentName: agentName ?? "unknown",
      manualEdits: 0,
      todos,
      messages,
      metadata: undefined,
      messageCount: messages.length,
      recentMessages: messages.slice(-20),
      memoryQueue: [],
      agentAttempts: {},
    };

    sessionCache.set(sessionID, session);
    return session;
  };

  const extractToolOutput = (output: Record<string, unknown> | undefined): string => {
    if (!output) {
      return "";
    }

    if (typeof output.output === "string") {
      return output.output;
    }

    if (typeof output.result === "string") {
      return output.result;
    }

    if (typeof output.message === "string") {
      return output.message;
    }

    return "";
  };

  return {
    config: configHandler,
    tool: {
      slashcommand,
    },
    "chat.message": async (input, output) => {
      await orxaDetector(input, output);

      // Check for todo continuation when agent pauses without tool execution
      const messageInput = input as { agent?: string; sessionID?: string };
      const agentName = messageInput.agent?.toLowerCase() || "";

      // Only apply to ORXA agent and when enforcement is enabled
      if (
        agentName === "orxa" &&
        orxaConfig.orxa.enforcement.todoCompletion !== "off"
      ) {
        const session = await loadSession(
          messageInput.sessionID,
          messageInput.agent,
          false
        );

        if (session) {
          const pendingTodos = getPendingTodos(session);

          if (pendingTodos.length > 0) {
            // Extract message text from output parts
            const messageText = extractMessageText(
              (output as { parts?: Array<{ type?: string; text?: string }> })?.parts
            );

            // Check if this is a stopping response
            if (isStoppingResponse(messageText)) {
              // Inject continuation message into output parts
              const continuationMessage =
                buildTodoContinuationMessage(pendingTodos);
              const messageOutput = output as {
                parts?: Array<{ type?: string; text?: string }>;
              };

              if (messageOutput.parts && Array.isArray(messageOutput.parts)) {
                const textPartIndex = messageOutput.parts.findIndex(
                  (part) => part.type === "text" && typeof part.text === "string"
                );

                if (textPartIndex !== -1) {
                  const originalText = messageOutput.parts[textPartIndex].text || "";
                  messageOutput.parts[textPartIndex].text =
                    `${originalText}\n\n${continuationMessage}`;
                }
              }

              // Show toast in strict mode
              if (orxaConfig.orxa.enforcement.todoCompletion === "strict") {
                ctx.client.tui
                  .showToast({
                    body: {
                      title: "TODO Continuation Required",
                      message: `${pendingTodos.length} pending TODO(s) must be completed before stopping.`,
                      variant: "warning" as const,
                      duration: 5000,
                    },
                  })
                  .catch(() => {});
              }
            }
          }
        }
      }
    },
    "tool.execute.before": async (input, output) => {
      const toolInput = input as { tool: string; sessionID: string; callID: string; agent?: string; attachments?: Array<{ type: string; mimeType?: string; name?: string; size?: number }> };
      const toolOutput = output as { args?: Record<string, unknown> } | undefined;

      // Determine if this is a subagent - skip expensive session loading for subagents
      const agentName = toolInput.agent?.toLowerCase() || "";
      const isSubagent = Boolean(agentName && agentName !== "orxa" && agentName !== "plan");

      if (orxaConfig.ui?.verboseLogging && toolInput.tool === "delegate_task") {
        console.log("[orxa][tool.execute.before] raw tool input", {
          tool: toolInput.tool,
          agent: toolInput.agent,
          isSubagent,
          sessionID: toolInput.sessionID,
          callID: toolInput.callID,
        });
      }

      // Skip session loading for subagents - they don't need ORXA session data
      const session = await loadSession(toolInput.sessionID, toolInput.agent, isSubagent);
      const context = {
        toolName: toolInput.tool,
        tool: { name: toolInput.tool },
        args: toolOutput?.args ?? {},
        agentName: toolInput.agent,
        agent: toolInput.agent,
        config: orxaConfig,
        session,
        sessionId: toolInput.sessionID,
        attachments: toolInput.attachments,
        workspaceRoot: ctx.directory,
      };

      const result = await preToolExecution(context);

      if (result.warn && result.message) {
        ctx.client.tui
          .showToast({
            body: {
              title: "Orxa Warning",
              message: result.message,
              variant: "warning" as const,
              duration: 4000,
            },
          })
          .catch(() => {});
      }

      if (result.block || result.allow === false) {
        throw new Error(result.message ?? result.reason ?? "Tool execution blocked.");
      }
    },
    "tool.execute.after": async (input, output) => {
      const toolInput = input as { tool: string; sessionID: string; callID: string; agent?: string };
      const toolOutput = output as { title: string; output: string; metadata: any; args?: Record<string, unknown> };

      // Determine if this is a subagent - skip expensive session loading for subagents
      const agentName = toolInput.agent?.toLowerCase() || "";
      const isSubagent = Boolean(agentName && agentName !== "orxa" && agentName !== "plan");

      // Skip session loading for subagents - they don't need ORXA session data
      const session = await loadSession(toolInput.sessionID, toolInput.agent, isSubagent);
      const context = {
        toolName: toolInput.tool,
        tool: { name: toolInput.tool },
        args: toolOutput?.args ?? {},
        agentName: toolInput.agent,
        agent: toolInput.agent,
        config: orxaConfig,
        session,
        sessionId: toolInput.sessionID,
        response: extractToolOutput(toolOutput as Record<string, unknown>),
      };

      const postResult = await postSubagentResponse(context);
      if (postResult.injectMessage && typeof output?.output === "string") {
        output.output = `${output.output}\n\n${postResult.injectMessage}`;
      }

      const continuationResult = await todoContinuationEnforcer(context);
      if (continuationResult.injectMessage && typeof output?.output === "string") {
        output.output = `${output.output}\n\n${continuationResult.injectMessage}`;
      }

      await orxaIndicator(context);
    },
    event: async (input) => {
      await welcomeToastHandler(input);
    },
    middleware: {
      initialize: (context: unknown) => context,
    },
  };
};

export default orxaPlugin;
