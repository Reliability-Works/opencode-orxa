import { HookContext, TodoContinuationResult } from "../types";
import {
  buildTodoContinuationMessage,
  getPendingTodos,
  isStoppingResponse,
} from "../middleware/todo-guardian";

export const todoContinuationEnforcer = async (
  context: HookContext
): Promise<TodoContinuationResult> => {
  const { session, config, response } = context;

  if (config.orxa.enforcement.todoCompletion === "off") {
    return {};
  }

  const pendingTodos = getPendingTodos(session);
  if (pendingTodos.length === 0) {
    return {};
  }

  const lastMessage = session?.recentMessages?.[session.recentMessages.length - 1];
  const content = response ?? lastMessage?.content ?? "";
  const isStopping = isStoppingResponse(content);

  if (!isStopping) {
    return {};
  }

  return {
    injectMessage: buildTodoContinuationMessage(pendingTodos),
    blockResponse: config.orxa.enforcement.todoCompletion === "strict",
  };
};
