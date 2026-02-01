import { HookContext } from "../types";

let hasShownWelcome = false;

/**
 * Hook handler for session creation - shows welcome message
 * Only shows for orxa sessions (not subagent sessions)
 */
export async function welcomeToastHandler(
  context: HookContext
): Promise<{ injectMessage?: string }> {
  const { config, agentName } = context;

  // Only show once per process
  if (hasShownWelcome) {
    return {};
  }

  // Check if welcome toast is enabled (default to true)
  const isEnabled = config.ui?.showDelegationWarnings !== false;
  if (!isEnabled) {
    return {};
  }

  // Only show for orxa agent (main sessions)
  // Subagent sessions should not trigger the welcome message
  if (agentName && agentName !== "orxa") {
    return {};
  }

  hasShownWelcome = true;

  // Return a message that will be injected into the session
  return {
    injectMessage:
      `🎼 OpenCode Orxa Initialized\n\n` +
      `Workforce orchestration enabled. Managing agents...\n` +
      `Type /help for available commands or start delegating tasks.`,
  };
}
