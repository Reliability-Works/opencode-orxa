import { HookContext, SessionCheckpointResult } from "../types";
import { summarizeSession } from "../utils/session-memory";

/**
 * Check if memory features are enabled and supermemory is available
 */
const isMemoryEnabled = (context: HookContext): boolean => {
  const memoryAutomation = context.config.orxa?.enforcement?.memoryAutomation;
  
  // Memory is disabled if set to "off"
  if (memoryAutomation === "off") {
    return false;
  }

  // Check if supermemory tool is available
  if (!context.supermemory) {
    return false;
  }

  return true;
};

export const sessionCheckpoint = async (
  context: HookContext
): Promise<SessionCheckpointResult> => {
  const { session, config } = context;
  
  // Skip if no session or memory is disabled
  if (!session || !isMemoryEnabled(context)) {
    return {};
  }

  const interval = config.memory?.sessionCheckpointInterval || 20;
  const messageCount = session.messageCount ?? session.messages?.length ?? 0;

  if (messageCount % interval === 0 && messageCount > 0) {
    const recentMessages = session.recentMessages ?? session.messages ?? [];
    const summary = await summarizeSession(recentMessages);

    // Only save to supermemory if available
    if (context.supermemory?.add) {
      try {
        await context.supermemory.add({
          content: summary,
          type: "conversation",
          scope: "session",
          metadata: {
            messageCount,
            timestamp: Date.now(),
          },
        });
      } catch (error) {
        // Gracefully handle supermemory errors (e.g., API key not configured)
        if (config.orxa?.enforcement?.memoryAutomation === "warn") {
          return {
            injectMessage:
              `⚠️ SESSION CHECKPOINT #${messageCount}\n\n` +
              `Note: Could not save to supermemory. ${error instanceof Error ? error.message : 'Unknown error'}\n\n` +
              `Remember: You are the Orxa.\n` +
              `- Delegate ALL work to subagents\n` +
              `- Maintain TODO list\n` +
              `- Run quality gates before marking complete`,
          };
        }
      }
    }

    return {
      injectMessage:
        `🎯 SESSION CHECKPOINT #${messageCount}\n\n` +
        `Remember: You are the Orxa.\n` +
        `- Delegate ALL work to subagents\n` +
        `- Maintain TODO list\n` +
        `- Run quality gates before marking complete\n\n` +
        `Recent summary: ${summary.slice(0, 200)}...`,
    };
  }

  return {};
};
