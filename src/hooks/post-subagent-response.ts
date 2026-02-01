import { HookContext, SubagentResponseResult } from "../types";
import { extractMemories } from "../middleware/memory-automation";
import {
  buildTodoContinuationMessage,
  getPendingTodos,
  isCompletionSignal,
  isStoppingResponse,
} from "../middleware/todo-guardian";

export const postSubagentResponse = async (
  context: HookContext
): Promise<SubagentResponseResult> => {
  const { response = "", config, session } = context;
  const agentName = context.agent ?? context.agentName ?? "";

  if (config.memory?.autoExtract) {
    const memories = extractMemories(response, config.memory.extractPatterns || []);

    if (session) {
      session.memoryQueue = session.memoryQueue ?? [];
      for (const memory of memories) {
        session.memoryQueue.push(memory);
        if (config.ui?.showMemoryConfirmations) {
          context.notify?.(`💾 Memory queued for review: ${memory.type}`);
        }
      }
    }
  }

  const failureIndicators = ["failed", "stuck", "error", "cannot", "unable", "giving up"];
  const hasFailed = failureIndicators.some((indicator) =>
    response.toLowerCase().includes(indicator)
  );

  if (hasFailed && session && config.escalation?.enabled) {
    const attempts = (session.agentAttempts?.[agentName] || 0) + 1;
    session.agentAttempts = { ...session.agentAttempts, [agentName]: attempts };

    if (attempts >= (config.escalation?.maxAttemptsPerAgent || 2)) {
      const escalateTo = config.escalation?.escalationMatrix?.[agentName];
      if (escalateTo) {
        return {
          escalate: true,
          to: escalateTo,
          message: `🔄 ${agentName} failed ${attempts} times. Escalating to @${escalateTo}.`,
          context: `Previous ${agentName} attempts failed. Context: ${response.slice(0, 500)}...`,
        };
      }
    }
  }

  if (config.orxa.enforcement.todoCompletion !== "off") {
    const pendingTodos = getPendingTodos(session);
    const needsReminder =
      pendingTodos.length > 0 && (isStoppingResponse(response) || isCompletionSignal(response));
    if (needsReminder) {
      return {
        continue: true,
        injectMessage: buildTodoContinuationMessage(pendingTodos),
      };
    }
  }

  return { continue: true };
};
