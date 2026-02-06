import { HookContext, EnforcementResult } from "../types.js";
import { enforceDelegation, resolveToolAlias } from "../middleware/delegation-enforcer.js";
import {
  buildTodoContinuationMessage,
  extractQuestionText,
  getPendingTodos,
  isStoppingResponse,
} from "../middleware/todo-guardian.js";
import { commentChecker } from "./comment-checker.js";
import { agentsMdInjector } from "./agents-md-injector.js";

export const preToolExecution = async (context: HookContext): Promise<EnforcementResult> => {
  const { args, config, session } = context;
  const toolName = resolveToolAlias(
    context.tool?.name ?? context.toolName ?? "",
    config.toolAliases?.resolve ?? {}
  );
  const agentName = context.agent ?? context.agentName ?? "";

  const result = enforceDelegation({
    ...context,
    toolName,
    args,
    agentName,
    config,
    session,
  });

  if (!result.allow) {
    return result;
  }

  let nextResult = result;

  // Only block/nudge when agent tries to stop with pending TODOs
  if (session && config.orxa.enforcement.todoCompletion !== "off") {
    const pendingTodos = getPendingTodos(session);
    if (pendingTodos.length > 0 && toolName === "question") {
      const questionText = extractQuestionText(args);
      const isStopping = questionText.some((text) => isStoppingResponse(text));
      if (isStopping) {
        const message = buildTodoContinuationMessage(pendingTodos);
        if (config.orxa.enforcement.todoCompletion === "warn") {
          const warnings = [...(result.warnings ?? []), message];
          return {
            ...result,
            warnings,
            warn: true,
            message: [result.message, message].filter(Boolean).join("\n"),
          };
        }

        return {
          allow: false,
          reason: message,
          block: true,
          message,
        };
      }
    }
  }

  if (toolName === "read" || toolName === "read_file") {
    const injection = await agentsMdInjector({
      ...context,
      tool: { name: toolName === "read_file" ? "read" : toolName },
      toolName,
    });

    if (injection.injectContext) {
      nextResult = {
        ...nextResult,
        metadata: {
          ...(nextResult.metadata ?? {}),
          inject_context: injection.injectContext,
        },
      };
    }
  }

  const commentCheck = await commentChecker({
    ...context,
    tool: { name: toolName },
    toolName,
  });

  if (commentCheck.warning) {
    const warnings = [...(nextResult.warnings ?? []), commentCheck.warning];
    nextResult = {
      ...nextResult,
      warnings,
      warn: true,
      message: [nextResult.message, commentCheck.warning].filter(Boolean).join("\n"),
    };
  }

  return nextResult;
};
