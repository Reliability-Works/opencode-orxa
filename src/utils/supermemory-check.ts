import fs from "fs";
import path from "path";
import os from "os";

export interface SupermemoryStatus {
  installed: boolean;
  apiKeyConfigured: boolean;
}

const OPENCODE_CONFIG_DIR = path.join(os.homedir(), ".config", "opencode");
const OPENCODE_JSON_PATH = path.join(OPENCODE_CONFIG_DIR, "opencode.json");
const SUPERMEMORY_CONFIG_PATH = path.join(OPENCODE_CONFIG_DIR, "supermemory.jsonc");

/**
 * Check if the opencode-supermemory plugin is installed and configured
 */
export const checkSupermemoryStatus = async (): Promise<SupermemoryStatus> => {
  // Check if opencode-supermemory is in the plugins list
  let installed = false;
  if (fs.existsSync(OPENCODE_JSON_PATH)) {
    try {
      const opencodeConfig = JSON.parse(fs.readFileSync(OPENCODE_JSON_PATH, "utf-8"));
      const plugins = opencodeConfig.plugin || [];
      installed = plugins.includes("opencode-supermemory") || 
                  plugins.some((p: string) => p.includes("supermemory"));
    } catch {
      // If we can't read the config, assume not installed
      installed = false;
    }
  }

  // Check for API key in environment variable
  const apiKeyFromEnv = process.env.SUPERMEMORY_API_KEY;

  // Check for API key in config file
  let apiKeyFromConfig: string | null = null;
  if (fs.existsSync(SUPERMEMORY_CONFIG_PATH)) {
    try {
      const configContent = fs.readFileSync(SUPERMEMORY_CONFIG_PATH, "utf-8");
      // Remove comments from JSONC before parsing
      const jsonContent = configContent
        .split("\n")
        .filter((line) => !line.trim().startsWith("//"))
        .join("\n");
      const config = JSON.parse(jsonContent);
      apiKeyFromConfig = config.apiKey || null;
    } catch {
      // If we can't read the config, no API key
      apiKeyFromConfig = null;
    }
  }

  return {
    installed,
    apiKeyConfigured: !!(apiKeyFromEnv || apiKeyFromConfig),
  };
};

/**
 * Check if supermemory is available for use (installed AND configured)
 */
export const isSupermemoryAvailable = async (): Promise<boolean> => {
  const status = await checkSupermemoryStatus();
  return status.installed && status.apiKeyConfigured;
};

/**
 * Get the supermemory setup instructions for display to the user
 */
export const getSupermemorySetupInstructions = (): string => {
  return `
📦 Supermemory Plugin Setup

Supermemory provides persistent memory across sessions, allowing the Orxa
to remember important patterns, configurations, and decisions.

To install:
  bunx opencode-supermemory@latest install --no-tui

To get your API key:
  1. Visit: https://www.supermemory.ai
  2. Sign up or log in
  3. Generate an API key

To configure:
  Add to ~/.config/opencode/supermemory.jsonc:
  {
    "apiKey": "sm_your_api_key_here"
  }

Or set the environment variable:
  export SUPERMEMORY_API_KEY=sm_your_api_key_here
`;
};
