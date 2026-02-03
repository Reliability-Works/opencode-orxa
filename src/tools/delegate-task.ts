import { tool, type ToolDefinition, type ToolContext } from "@opencode-ai/plugin/tool";
import type { PluginInput } from "@opencode-ai/plugin";

export interface DelegateTaskArgs {
  subagent_type?: string;
  prompt: string;
  run_in_background?: boolean;
  session_id?: string;
}

type ToolContextWithMetadata = ToolContext;

interface DelegateTaskOptions {
  client: PluginInput["client"];
  directory: string;
}

type SessionPromptBody = {
  messageID?: string;
  model?: { providerID: string; modelID: string };
  agent?: string;
  noReply?: boolean;
  tools?: Record<string, boolean>;
  system?: string;
  variant?: string;
  parts: Array<{ type: "text"; text: string }>;
};
type SessionCreateResponse = Awaited<
  ReturnType<PluginInput["client"]["session"]["create"]>
>;

interface SessionMessage {
  role: string;
  content: string;
}

const DEFAULT_POLL_INTERVAL_MS = 1000;
const DEFAULT_MAX_POLL_TIME_MS = 120000;
const STABILITY_POLLS_REQUIRED = 2;

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

const getSessionMessages = async (
  client: PluginInput["client"],
  sessionID: string
): Promise<SessionMessage[]> => {
  const response = await client.session.messages({ path: { id: sessionID } });
  const data = (response as { data?: unknown }).data ?? response;

  if (!Array.isArray(data)) {
    return [];
  }

  return data.map((entry) => {
    const info = (entry as { info?: { role?: string } }).info;
    const parts = (entry as { parts?: Array<{ type?: string; text?: string }> }).parts;
    return {
      role: info?.role ?? "assistant",
      content: extractMessageText(parts),
    };
  });
};

const waitForCompletion = async (
  client: PluginInput["client"],
  sessionID: string,
  abort?: AbortSignal
): Promise<string> => {
  const start = Date.now();
  let lastCount = 0;
  let stablePolls = 0;

  while (Date.now() - start < DEFAULT_MAX_POLL_TIME_MS) {
    if (abort?.aborted) {
      return `Task aborted. Session ID: ${sessionID}`;
    }

    await new Promise((resolve) => setTimeout(resolve, DEFAULT_POLL_INTERVAL_MS));

    if (typeof client.session.status === "function") {
      const statusResult = await client.session.status();
      const statuses = (statusResult as { data?: Record<string, { type?: string }> }).data;
      const status = statuses?.[sessionID];
      if (status && status.type !== "idle") {
        stablePolls = 0;
        lastCount = 0;
        continue;
      }
    }

    const messages = await getSessionMessages(client, sessionID);
    const count = messages.length;

    if (count === lastCount) {
      stablePolls += 1;
      if (stablePolls >= STABILITY_POLLS_REQUIRED) {
        break;
      }
    } else {
      stablePolls = 0;
      lastCount = count;
    }
  }

  const finalMessages = await getSessionMessages(client, sessionID);
  const lastAssistant = [...finalMessages].reverse().find((message) => message.role === "assistant");

  return lastAssistant?.content || `Task completed. Session ID: ${sessionID}`;
};

const resolveParentDirectory = async (
  client: PluginInput["client"],
  parentID: string | undefined,
  fallbackDirectory: string
): Promise<string> => {
  if (!parentID || typeof client.session.get !== "function") {
    return fallbackDirectory;
  }

  try {
    const parentSession = await client.session.get({ path: { id: parentID } });
    const data = (parentSession as { data?: { directory?: string } }).data;
    return data?.directory ?? fallbackDirectory;
  } catch {
    return fallbackDirectory;
  }
};

const extractSessionId = (result: SessionCreateResponse): string | undefined => {
  if ("data" in result) {
    const data = result.data as { id?: string } | undefined;
    if (data?.id) {
      return data.id;
    }
  }

  return undefined;
};

export const createDelegateTask = (options: DelegateTaskOptions): ToolDefinition => {
  const description =
    "Delegate a task to a subagent. Provide subagent_type and prompt for new tasks, or session_id to continue. Use run_in_background=true for async execution.";

  return tool({
    description,
    args: {
      subagent_type: tool.schema
        .string()
        .optional()
        .describe("Subagent name to delegate to"),
      prompt: tool.schema.string().describe("Full prompt for the subagent"),
      run_in_background: tool.schema
        .boolean()
        .optional()
        .describe("true=async (returns session_id), false=sync (waits for result)"),
      session_id: tool.schema.string().optional().describe("Existing session ID to continue"),
    },
    async execute(args: DelegateTaskArgs, toolContext: ToolContext) {
      const ctx = toolContext as ToolContextWithMetadata;
      const runInBackground = args.run_in_background === true;
      const agentName = args.subagent_type?.trim();

      if (!args.prompt?.trim()) {
        throw new Error("Invalid arguments: prompt is required.");
      }

      if (!args.session_id && !agentName) {
        throw new Error("Invalid arguments: subagent_type is required for new tasks.");
      }

      const parentID = ctx.sessionID;
      let sessionID = args.session_id;
      let resolvedAgent = agentName;

      if (!sessionID) {
        const directory = await resolveParentDirectory(options.client, parentID, options.directory);
        const createResult = await options.client.session.create({
          body: {
            parentID,
            title: `Delegated task (@${agentName})`,
            permission: [{ permission: "question", action: "deny" as const, pattern: "*" }],
          } as Record<string, unknown>,
          query: { directory },
        });
        sessionID = extractSessionId(createResult);

        if (!sessionID) {
          throw new Error("Failed to create subagent session.");
        }
      }

      ctx.metadata?.({
        title: `delegate_task:${resolvedAgent ?? "session"}`,
        metadata: {
          sessionId: sessionID,
          subagent_type: resolvedAgent,
          run_in_background: runInBackground,
          parentId: parentID,
        },
      });

      const promptBody: SessionPromptBody = {
        tools: {
          task: false,
          delegate_task: false,
        },
        parts: [{ type: "text", text: args.prompt }],
      };

      if (resolvedAgent) {
        promptBody.agent = resolvedAgent;
      }

      await options.client.session.prompt({
        path: { id: sessionID },
        body: promptBody,
      });

      if (runInBackground) {
        return `Task delegated to @${resolvedAgent ?? "subagent"}. Session ID: ${sessionID}`;
      }

      return waitForCompletion(options.client, sessionID, ctx.abort);
    },
  });
};

export default createDelegateTask;
