import type { PluginInput } from "@opencode-ai/plugin";
import type { OrxaConfig } from "../config/schema.js";
import { HookContext } from "../types.js";
import { checkForUpdates, formatUpdateMessage } from "./update-checker.js";

// Spinner animation frames (like oh-my-opencode)
const SISYPHUS_SPINNER = ["·", "•", "●", "○", "◌", "◦", " "];

let hasShownWelcome = false;

// Cache the version to avoid reading package.json multiple times
let cachedVersion: string | null = null;

/**
 * Get the plugin version from package.json
 */
function getVersion(): string {
  if (cachedVersion) {
    return cachedVersion;
  }

  try {
    // Read version from package.json
    const packageJson = JSON.parse(
      require("fs").readFileSync(
        require("path").join(__dirname, "..", "..", "package.json"),
        "utf-8"
      )
    );
    cachedVersion = packageJson.version || "unknown";
  } catch {
    cachedVersion = "unknown";
  }

  return cachedVersion ?? "unknown";
}

/**
 * Show a spinner toast animation
 */
async function showSpinnerToast(
  ctx: PluginInput,
  version: string
): Promise<void> {
  const totalDuration = 5000;
  const frameInterval = 100;
  const totalFrames = Math.floor(totalDuration / frameInterval);

  for (let i = 0; i < totalFrames; i++) {
    const spinner = SISYPHUS_SPINNER[i % SISYPHUS_SPINNER.length];
    await ctx.client.tui
      .showToast({
        body: {
          title: `${spinner} OpenCode Orxa v${version}`,
          message: "Workforce orchestration enabled. Managing agents...",
          variant: "info" as const,
          duration: frameInterval + 50,
        },
      })
      .catch(() => {
        // Ignore toast errors (e.g., TUI not available)
      });
    await new Promise((resolve) => setTimeout(resolve, frameInterval));
  }
}

/**
 * Show update available toast
 */
async function showUpdateToast(
  ctx: PluginInput,
  currentVersion: string,
  latestVersion: string
): Promise<void> {
  const { title, message } = formatUpdateMessage(currentVersion, latestVersion);
  
  await ctx.client.tui
    .showToast({
      body: {
        title,
        message,
        variant: "warning" as const,
        duration: 8000, // Show longer so user can read the npm command
      },
    })
    .catch(() => {
      // Ignore toast errors
    });
}

/**
 * Background check for updates - non-blocking
 */
async function backgroundUpdateCheck(
  ctx: PluginInput,
  currentVersion: string,
  enabled: boolean
): Promise<void> {
  try {
    const result = await checkForUpdates(currentVersion, enabled);
    
    if (result.hasUpdate && result.latestVersion) {
      // Small delay to let welcome toast finish
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await showUpdateToast(ctx, currentVersion, result.latestVersion);
    }
  } catch {
    // Silently fail - update check is best-effort
  }
}

/**
 * Factory function to create the welcome toast handler
 * Captures the PluginInput context to access client.tui
 */
export function createWelcomeToastHandler(ctx: PluginInput, config: OrxaConfig) {
  /**
   * Event handler for session creation - shows welcome toast
   * Only shows for main sessions (not subagent sessions)
   */
  return async function welcomeToastHandler(input: {
    event: { type: string; properties?: unknown };
  }): Promise<void> {
    const { event } = input;

    if (event.type !== "session.created") {
      return;
    }

    const props = event.properties as { info?: { parentID?: string } } | undefined;
    if (props?.info?.parentID) {
      return;
    }

    if (hasShownWelcome) {
      return;
    }

    const isEnabled = config.ui?.showDelegationWarnings !== false;
    if (!isEnabled) {
      return;
    }

    hasShownWelcome = true;

    const version = getVersion();
    showSpinnerToast(ctx, version).catch(() => {
      // Ignore errors - toast is best-effort
    });

    const autoUpdateCheck = config.ui?.autoUpdateCheck !== false;
    backgroundUpdateCheck(ctx, version, autoUpdateCheck).catch(() => {
      // Ignore errors
    });
  };
}

/**
 * Legacy export for backward compatibility
 * @deprecated Use createWelcomeToastHandler instead
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
  if (agentName && agentName !== "orxa") {
    return {};
  }

  hasShownWelcome = true;

  // Fallback: just return the inject message without visual toast
  return {
    injectMessage:
      `🎼 OpenCode Orxa Initialized\n\n` +
      `Workforce orchestration enabled. Managing agents...\n\n` +
      `⚠️  REMINDER: Create a TODO list BEFORE doing anything else!\n` +
      `Use todowrite to track your work.`,
  };
}
