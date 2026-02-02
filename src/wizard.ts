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
import {
  detectProviders,
  getAuthenticatedProviders,
  getUnauthenticatedProviders,
  getAuthInstructions,
  formatProviderName,
  getProvidersForModel,
  canProviderAccessModel,
  type ProviderInfo,
  type DetectedConfig,
} from "./utils/provider-detector";
import {
  parseAgentModels,
  formatModelName,
  formatProviderOptions,
  getRecommendedProviderSetup,
  formatAgentListForModel,
  PROVIDER_DISPLAY_NAMES,
  type ParsedAgentConfig,
  type ModelGroup,
} from "./utils/agent-models";

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

/**
 * Validate model ID format (provider/model-name)
 */
const isValidModelId = (modelId: string): boolean => {
  return /^[a-z0-9-]+\/[a-z0-9.-]+$/i.test(modelId);
};

/**
 * Draw a box around content (like oh-my-opencode)
 */
const drawBox = (title: string, content: string[]): void => {
  const width = Math.max(
    title.length + 4,
    ...content.map((line) => line.length + 4)
  );
  const horizontalLine = "═".repeat(width);
  
  output.write(`\n╔${horizontalLine}╗\n`);
  output.write(`║${" ".repeat(Math.floor((width - title.length) / 2))}${title}${" ".repeat(Math.ceil((width - title.length) / 2))}║\n`);
  output.write(`╠${horizontalLine}╣\n`);
  
  for (const line of content) {
    const padding = width - line.length - 2;
    output.write(`║ ${line}${" ".repeat(padding > 0 ? padding : 0)}║\n`);
  }
  
  output.write(`╚${horizontalLine}╝\n\n`);
};

/**
 * Display detected providers and their auth status
 */
const detectAndDisplayAuthStatus = (detected: DetectedConfig): void => {
  const content: string[] = [];
  
  if (!detected.hasOpenCodeConfig) {
    content.push("⚠️  No opencode.json found");
    content.push("   Run: opencode init");
  } else {
    const authenticated = getAuthenticatedProviders(detected);
    const unauthenticated = getUnauthenticatedProviders(detected);
    
    if (authenticated.length > 0) {
      content.push(`✅ Authenticated providers: ${authenticated.map((p) => p.name).join(", ")}`);
    }
    
    if (unauthenticated.length > 0) {
      content.push(`❌ Needs authentication: ${unauthenticated.map((p) => p.name).join(", ")}`);
    }
    
    if (authenticated.length === 0 && unauthenticated.length === 0) {
      content.push("No providers configured yet");
    }
  }
  
  drawBox("🔍 OpenCode Configuration", content);
};

/**
 * Display agent configuration with models from YAML files
 */
const displayAgentConfiguration = (agentConfig: ParsedAgentConfig): void => {
  const content: string[] = [
    `Found ${agentConfig.agents.length} agents with model assignments`,
    "",
    "📋 Required Models:",
  ];
  
  for (const modelGroup of agentConfig.models) {
    const modelName = formatModelName(modelGroup.model);
    const agentList = formatAgentListForModel(modelGroup.agents);
    const providerOptions = formatProviderOptions(getProvidersForModel(modelGroup.model));
    
    content.push(`• ${modelGroup.model} (${agentList})`);
    content.push(`  Providers: ${providerOptions}`);
  }
  
  drawBox("🔍 Detecting Agent Configuration", content);
};

/**
 * Display provider options for required models
 */
const displayProviderOptions = (
  agentConfig: ParsedAgentConfig,
  detected: DetectedConfig
): void => {
  const setup = getRecommendedProviderSetup(agentConfig.uniqueModels);
  const authenticated = getAuthenticatedProviders(detected);
  const authenticatedIds = new Set(authenticated.map((p) => p.id));
  
  const content: string[] = [];
  
  // Show recommended option
  if (setup.recommended === "opencode") {
    const isAuthenticated = authenticatedIds.has("opencode");
    content.push(`${isAuthenticated ? "✅" : "⭐"} RECOMMENDED: OpenCode Provider`);
    content.push("   Access to ALL models with one authentication");
    if (!isAuthenticated) {
      content.push("   Run: opencode auth login");
      content.push("   Then select: OpenCode");
    }
    content.push("");
  }
  
  // Show alternative providers for each model
  content.push("Alternative: Individual Providers");
  
  for (const modelGroup of agentConfig.models) {
    const providers = getProvidersForModel(modelGroup.model);
    const providerList = providers
      .map((p) => {
        const isAuth = authenticatedIds.has(p);
        const displayName = p === "opencode" ? "opencode" : p;
        return isAuth ? `✅ ${displayName}` : displayName;
      })
      .join(" OR ");
    
    content.push(`• ${formatModelName(modelGroup.model)}: ${providerList}`);
  }
  
  drawBox("🔐 Provider Options", content);
};

/**
 * Display authentication summary and instructions for required models
 */
const displayAuthSummary = (
  detected: DetectedConfig,
  agentConfig: ParsedAgentConfig
): boolean => {
  const setup = getRecommendedProviderSetup(agentConfig.uniqueModels);
  const authenticated = getAuthenticatedProviders(detected);
  const authenticatedIds = new Set(authenticated.map((p) => p.id));
  
  const content: string[] = [];
  let hasCritical = false;
  
  // Check if we have the recommended provider
  if (setup.recommended === "opencode" && !authenticatedIds.has("opencode")) {
    content.push("❌ OpenCode provider not authenticated");
    content.push("   Run: opencode auth login");
    content.push("   Then select: OpenCode");
    content.push("");
    hasCritical = true;
  }
  
  // Check individual model access
  for (const model of agentConfig.uniqueModels) {
    const providers = getProvidersForModel(model);
    const hasAccess = providers.some((p) => authenticatedIds.has(p));
    
    if (!hasAccess) {
      const providerNames = providers
        .map((p) => PROVIDER_DISPLAY_NAMES[p] || p)
        .join(" or ");
      content.push(`❌ ${formatModelName(model)} - No authenticated provider`);
      content.push(`   Authenticate with: ${providerNames}`);
      content.push("");
      hasCritical = true;
    }
  }
  
  if (content.length > 0) {
    drawBox("🔐 Authentication Required", content);
  }
  
  return !hasCritical;
};

/**
 * Display final configuration summary
 */
const displaySummary = (
  agentConfig: ParsedAgentConfig,
  detected: DetectedConfig
): void => {
  const content: string[] = [];
  
  // Group by model
  for (const modelGroup of agentConfig.models) {
    content.push(`${modelGroup.model}:`);
    for (const agent of modelGroup.agents) {
      const role = agent.mode === "primary" ? "(primary)" : "(subagent)";
      content.push(`  • ${agent.name} ${role}`);
    }
    content.push("");
  }
  
  const authenticated = getAuthenticatedProviders(detected);
  if (authenticated.length > 0) {
    content.push("Authenticated Providers:");
    for (const provider of authenticated) {
      content.push(`  ✅ ${provider.name}`);
    }
  }
  
  drawBox("✅ Configuration Summary", content);
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

/**
 * Prompt user to customize agent models
 */
const promptAgentModelCustomization = async (
  rl: readline.Interface,
  agentConfig: ParsedAgentConfig,
  detected: DetectedConfig
): Promise<Record<string, { model: string }>> => {
  const overrides: Record<string, { model: string }> = {};
  const authenticated = getAuthenticatedProviders(detected);
  const authenticatedIds = new Set(authenticated.map((p) => p.id));
  
  output.write("\n");
  output.write("═══════════════════════════════════════════════════════════\n");
  output.write("  🔧 Agent Model Configuration\n");
  output.write("═══════════════════════════════════════════════════════════\n\n");
  
  output.write("The following models are required based on your agent YAML files.\n");
  output.write("Press Enter to keep the default, or enter a custom model.\n\n");
  
  // Show current assignments
  for (const agent of agentConfig.agents) {
    const providers = getProvidersForModel(agent.model);
    const hasAccess = providers.some((p) => authenticatedIds.has(p));
    const accessIndicator = hasAccess ? "✅" : "❌";
    
    output.write(`${accessIndicator} ${agent.name} (${agent.mode}):\n`);
    output.write(`  Default: ${agent.model}\n`);
    output.write(`  Providers: ${formatProviderOptions(providers)}\n`);
    
    const customModel = await promptWithDefault(
      rl,
      `  Custom model (or Enter for default)`,
      ""
    );
    
    if (customModel && isValidModelId(customModel)) {
      overrides[agent.name] = { model: customModel };
      output.write(`  → Will use: ${customModel}\n`);
    } else if (customModel) {
      output.write(`  ⚠️  Invalid format. Using default.\n`);
    }
    
    output.write("\n");
  }
  
  return overrides;
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

  // Parse agent models from YAML files
  const agentConfig = parseAgentModels();
  
  // Detect providers and auth status
  const detected = detectProviders();

  if (!interactive) {
    // Use models from YAML files as defaults
    for (const agent of agentConfig.agents) {
      if (agent.mode === "primary") {
        config.agent_overrides[agent.name] = { model: agent.model };
        if (agent.name === "orxa") {
          config.orxa.model = agent.model;
        }
      } else {
        config.subagents.overrides[agent.name] = {
          ...config.subagents.overrides[agent.name],
          model: agent.model,
        };
        config.agent_overrides[agent.name] = { model: agent.model };
      }
    }
    
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
    // Display agent configuration from YAML files
    displayAgentConfiguration(agentConfig);
    
    // Display detected providers
    detectAndDisplayAuthStatus(detected);
    
    // Display provider options
    displayProviderOptions(agentConfig, detected);
    
    // Check if we have authenticated providers for all required models
    const authenticated = getAuthenticatedProviders(detected);
    if (authenticated.length === 0) {
      output.write("\n❌ No authenticated providers found.\n\n");
      output.write("Please authenticate at least one provider:\n");
      output.write("  opencode auth login\n\n");
      output.write("Then run 'orxa init' again.\n");
      
      // Still create a basic config with models from YAML
      for (const agent of agentConfig.agents) {
        if (agent.mode === "primary") {
          config.agent_overrides[agent.name] = { model: agent.model };
          if (agent.name === "orxa") {
            config.orxa.model = agent.model;
          }
        } else {
          config.agent_overrides[agent.name] = { model: agent.model };
        }
      }
      
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      return config;
    }
    
    // Prompt for model customization
    const customOverrides = await promptAgentModelCustomization(rl, agentConfig, detected);
    
    // Apply configurations
    for (const agent of agentConfig.agents) {
      const customModel = customOverrides[agent.name]?.model;
      const finalModel = customModel || agent.model;
      
      if (agent.mode === "primary") {
        config.agent_overrides[agent.name] = { model: finalModel };
        if (agent.name === "orxa") {
          config.orxa.model = finalModel;
        }
      } else {
        config.subagents.overrides[agent.name] = {
          ...config.subagents.overrides[agent.name],
          model: finalModel,
        };
        config.agent_overrides[agent.name] = { model: finalModel };
      }
    }
    
    // Set default subagent model from the most common model
    const mostCommonModel = agentConfig.models[0]?.model || "opencode/kimi-k2.5";
    config.subagents.defaults.model = mostCommonModel;

    // Agent selection
    const agentSelection = await promptAgents(rl, BUILTIN_AGENTS);
    config.enabled_agents = agentSelection.enabled;
    config.disabled_agents = agentSelection.disabled;

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
    
    // Display auth summary
    const canProceed = displayAuthSummary(detected, agentConfig);
    if (!canProceed) {
      output.write("\n⚠️  Please authenticate the required providers and run 'orxa init' again.\n");
    }
    
    // Display final summary
    displaySummary(agentConfig, detected);
  } finally {
    rl.close();
  }

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  output.write("\n✅ Orxa configuration saved.\n");
  output.write(`Config path: ${configPath}\n`);

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
