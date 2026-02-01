import fs from "fs";
import readline from "readline/promises";
import { stdin as input, stdout as output } from "process";
import {
  ensureUserConfigDirectories,
  getUserConfigPath,
} from "./config/loader";
import { defaultConfig } from "./config/default-config";
import type { OrxaConfig } from "./config/schema";
import {
  checkSupermemoryStatus,
  type SupermemoryStatus,
} from "./utils/supermemory-check";

const BUILTIN_AGENTS = [
  "orxa",
  "plan",
  "strategist",
  "reviewer",
  "build",
  "coder",
  "frontend",
  "architect",
  "git",
  "explorer",
  "librarian",
  "navigator",
  "writer",
  "multimodal",
  "mobile-simulator",
];

const cloneConfig = (): OrxaConfig =>
  JSON.parse(JSON.stringify(defaultConfig)) as OrxaConfig;

const parseCommaList = (value: string): string[] =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const promptWithDefault = async (
  rl: readline.Interface,
  question: string,
  defaultValue: string
): Promise<string> => {
  const prompt = defaultValue
    ? `${question} (${defaultValue}): `
    : `${question}: `;
  const answer = (await rl.question(prompt)).trim();
  return answer || defaultValue;
};

const promptSupermemorySetup = async (
  rl: readline.Interface,
  status: SupermemoryStatus
): Promise<{ memoryAutomation: "strict" | "warn" | "off"; skipMessage: string | null }> => {
  if (status.installed && status.apiKeyConfigured) {
    return {
      memoryAutomation: "strict",
      skipMessage: null,
    };
  }

  output.write("\n");
  output.write("═══════════════════════════════════════════════════════════\n");
  output.write("  📦 Supermemory Plugin Setup\n");
  output.write("═══════════════════════════════════════════════════════════\n\n");

  if (!status.installed) {
    output.write(
      "Supermemory provides persistent memory across sessions.\n" +
        "It allows the Orxa to remember patterns, configs, and decisions.\n\n"
    );

    const options = [
      "Install supermemory (recommended)",
      "Skip for now",
      "Disable memory features permanently",
    ];

    output.write("What would you like to do?\n");
    options.forEach((opt, i) => {
      output.write(`  ${i + 1}. ${opt}\n`);
    });

    const answer = await rl.question("\nEnter choice (1-3): ");
    const choice = parseInt(answer.trim(), 10);

    switch (choice) {
      case 1: {
        output.write("\n📋 Installation Instructions:\n\n");
        output.write("Run the following command:\n");
        output.write("  bunx opencode-supermemory@latest install --no-tui\n\n");
        output.write("Get your API key from: https://www.supermemory.ai\n\n");
        output.write("Then add to ~/.config/opencode/supermemory.jsonc:\n");
        output.write('  { "apiKey": "sm_your_api_key_here" }\n\n');
        output.write("Or set the environment variable:\n");
        output.write("  export SUPERMEMORY_API_KEY=sm_your_api_key_here\n\n");

        const disableUntilReady = await rl.question(
          "Would you like to disable memory features until you configure the API key? (Y/n): "
        );

        if (disableUntilReady.trim().toLowerCase() !== "n") {
          return {
            memoryAutomation: "off",
            skipMessage:
              "Memory features disabled. Run 'orxa init' again after installing supermemory.",
          };
        }

        return {
          memoryAutomation: "warn",
          skipMessage:
            "Memory features enabled in warn mode. Install supermemory for full functionality.",
        };
      }
      case 3:
        return {
          memoryAutomation: "off",
          skipMessage:
            "Memory features disabled. You can re-enable them later by editing orxa.json.",
        };
      default:
        return {
          memoryAutomation: "warn",
          skipMessage:
            "Memory features enabled in warn mode. Install supermemory for full functionality.",
        };
    }
  } else if (!status.apiKeyConfigured) {
    output.write(
      "⚠️  Supermemory is installed but no API key is configured.\n\n"
    );
    output.write("To configure:\n");
    output.write("1. Get your API key from: https://www.supermemory.ai\n");
    output.write("2. Add to ~/.config/opencode/supermemory.jsonc:\n");
    output.write('   { "apiKey": "sm_your_api_key_here" }\n\n');
    output.write("Or set the environment variable:\n");
    output.write("   export SUPERMEMORY_API_KEY=sm_your_api_key_here\n\n");

    const disableUntilReady = await rl.question(
      "Would you like to disable memory features until you configure the API key? (Y/n): "
    );

    if (disableUntilReady.trim().toLowerCase() !== "n") {
      return {
        memoryAutomation: "off",
        skipMessage:
          "Memory features disabled. Run 'orxa init' again after configuring your API key.",
      };
    }

    return {
      memoryAutomation: "warn",
      skipMessage:
        "Memory features enabled in warn mode. Configure your API key for full functionality.",
    };
  }

  return {
    memoryAutomation: "strict",
    skipMessage: null,
  };
};

const promptAgents = async (
  rl: readline.Interface,
  currentEnabled: string[]
): Promise<{ enabled: string[]; disabled: string[] }> => {
  output.write("\nSelect agents to enable:\n");
  BUILTIN_AGENTS.forEach((agent) => {
    const isEnabled = currentEnabled.includes(agent);
    output.write(`${isEnabled ? "[x]" : "[ ]"} ${agent}\n`);
  });

  const answer = await rl.question(
    "\nDisable agents (comma-separated), or press Enter to keep all enabled: "
  );
  const disableList = new Set(parseCommaList(answer));
  const disabled = BUILTIN_AGENTS.filter((agent) => disableList.has(agent));
  const enabled = BUILTIN_AGENTS.filter((agent) => !disableList.has(agent));

  if (!enabled.includes("orxa")) {
    enabled.push("orxa");
  }
  if (!enabled.includes("plan")) {
    enabled.push("plan");
  }

  const normalizedDisabled = disabled.filter(
    (agent) => agent !== "orxa" && agent !== "plan"
  );

  return {
    enabled: Array.from(new Set(enabled)).sort(),
    disabled: Array.from(new Set(normalizedDisabled)).sort(),
  };
};

export const runInitWizard = async (options?: {
  nonInteractive?: boolean;
  overwrite?: boolean;
}): Promise<OrxaConfig> => {
  ensureUserConfigDirectories();

  const configPath = getUserConfigPath();
  if (fs.existsSync(configPath) && !options?.overwrite) {
    throw new Error(`Config already exists at ${configPath}`);
  }

  const config = cloneConfig();
  const interactive = !options?.nonInteractive && Boolean(process.stdin.isTTY);

  if (!interactive) {
    // Check supermemory status and adjust defaults for non-interactive mode
    const supermemoryStatus = await checkSupermemoryStatus();
    if (!supermemoryStatus.installed || !supermemoryStatus.apiKeyConfigured) {
      config.orxa.enforcement.memoryAutomation = "off";
      output.write("\n⚠️  Supermemory not detected. Memory features disabled.\n");
      output.write("Run 'orxa init' interactively to set up supermemory.\n");
    }

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    output.write("\n✅ Orxa configuration created.\n");
    output.write(`Config path: ${configPath}\n`);
    output.write(`Enabled agents: ${config.enabled_agents.join(", ")}\n`);
    output.write(`Disabled agents: ${config.disabled_agents.join(", ") || "none"}\n`);
    output.write(`Memory automation: ${config.orxa.enforcement.memoryAutomation}\n`);
    return config;
  }

  const rl = readline.createInterface({ input, output });
  try {
    const agentSelection = await promptAgents(rl, BUILTIN_AGENTS);
    config.enabled_agents = agentSelection.enabled;
    config.disabled_agents = agentSelection.disabled;

    output.write(
      "\nModel overrides:\n" +
        "- Primary agents (orxa, plan): model only\n" +
        "- Subagents: full customization available\n\n"
    );

    const defaultModel = await promptWithDefault(
      rl,
      "Default model for subagents",
      config.subagents.defaults.model
    );
    config.subagents.defaults.model = defaultModel;

    const buildModel = await promptWithDefault(
      rl,
      "Model for build + architect (leave blank for default)",
      config.subagents.overrides.build?.model ?? ""
    );
    if (buildModel) {
      config.subagents.overrides.build = {
        ...config.subagents.overrides.build,
        model: buildModel,
      };
      config.subagents.overrides.architect = {
        ...config.subagents.overrides.architect,
        model: buildModel,
      };
      config.agent_overrides.build = { model: buildModel };
      config.agent_overrides.architect = { model: buildModel };
    }

    const visualModel = await promptWithDefault(
      rl,
      "Model for frontend + multimodal (leave blank for default)",
      config.subagents.overrides.frontend?.model ?? ""
    );
    if (visualModel) {
      config.subagents.overrides.frontend = {
        ...config.subagents.overrides.frontend,
        model: visualModel,
      };
      config.subagents.overrides.multimodal = {
        ...config.subagents.overrides.multimodal,
        model: visualModel,
      };
      config.agent_overrides.frontend = { model: visualModel };
      config.agent_overrides.multimodal = { model: visualModel };
    }

    // Check supermemory status and prompt for setup
    output.write("\n🔍 Checking supermemory plugin status...\n");
    const supermemoryStatus = await checkSupermemoryStatus();
    const supermemorySetup = await promptSupermemorySetup(rl, supermemoryStatus);
    
    // Update config based on supermemory setup choice
    config.orxa.enforcement.memoryAutomation = supermemorySetup.memoryAutomation;
    
    if (supermemorySetup.skipMessage) {
      output.write(`\n${supermemorySetup.skipMessage}\n`);
    } else {
      output.write("\n✅ Supermemory is installed and configured.\n");
    }
  } finally {
    rl.close();
  }

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  output.write("\n✅ Orxa configuration created.\n");
  output.write(`Config path: ${configPath}\n`);
  output.write(`Enabled agents: ${config.enabled_agents.join(", ")}\n`);
  output.write(`Disabled agents: ${config.disabled_agents.join(", ") || "none"}\n`);
  output.write(`Memory automation: ${config.orxa.enforcement.memoryAutomation}\n`);

  return config;
};

export const runInstallWizard = async (options?: {
  nonInteractive?: boolean;
  baseConfig?: OrxaConfig;
}): Promise<OrxaConfig> => {
  ensureUserConfigDirectories();

  const config = options?.baseConfig
    ? (JSON.parse(JSON.stringify(options.baseConfig)) as OrxaConfig)
    : cloneConfig();
  const interactive = !options?.nonInteractive && Boolean(process.stdin.isTTY);

  if (!interactive) {
    fs.writeFileSync(getUserConfigPath(), JSON.stringify(config, null, 2));
    output.write("\n✅ Orxa agents updated.\n");
    output.write(`Enabled agents: ${config.enabled_agents.join(", ")}\n`);
    output.write(`Disabled agents: ${config.disabled_agents.join(", ") || "none"}\n`);
    return config;
  }

  const rl = readline.createInterface({ input, output });
  try {
    const currentEnabled = options?.baseConfig?.enabled_agents?.length
      ? options.baseConfig.enabled_agents
      : BUILTIN_AGENTS;
    const agentSelection = await promptAgents(rl, currentEnabled);
    config.enabled_agents = agentSelection.enabled;
    config.disabled_agents = agentSelection.disabled;
  } finally {
    rl.close();
  }

  fs.writeFileSync(getUserConfigPath(), JSON.stringify(config, null, 2));
  output.write("\n✅ Orxa agents updated.\n");
  output.write(`Enabled agents: ${config.enabled_agents.join(", ")}\n`);
  output.write(`Disabled agents: ${config.disabled_agents.join(", ") || "none"}\n`);

  return config;
};
