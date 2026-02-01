import { HookContext, EnforcementResult } from "../types";
import { enforceDelegation, resolveToolAlias } from "../middleware/delegation-enforcer";
import {
  buildTodoContinuationMessage,
  checkPendingTodos,
  extractQuestionText,
  getPendingTodos,
  isStoppingResponse,
} from "../middleware/todo-guardian";
import { commentChecker } from "./comment-checker";
import { agentsMdInjector } from "./agents-md-injector";

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

  if (session && config.ui?.showTodoReminders) {
    const todoWarning = checkPendingTodos(session, config);
    if (todoWarning) {
      const warnings = [...(result.warnings ?? []), todoWarning.warning];
      return {
        ...result,
        warnings,
        warn: true,
        message: [result.message, todoWarning.warning].filter(Boolean).join("\n"),
      };
    }
  }

  return result;
};
