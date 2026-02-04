#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import os from "os";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_DIR = path.join(os.homedir(), ".config", "opencode", "orxa");
const OPENCODE_CONFIG_PATH = path.join(os.homedir(), ".config", "opencode", "opencode.json");
const BUNDLED_SKILLS_DIR = path.join(__dirname, "skills");
const USER_SKILL_DIR = path.join(os.homedir(), ".config", "opencode", "skill");
const BUNDLED_COMMANDS_DIR = path.join(__dirname, ".opencode", "command");
const USER_COMMAND_DIR = path.join(os.homedir(), ".config", "opencode", "command");

const isGlobalInstall = () => {
  // Check if we're in a global npm/bun directory or being run via npm install/link
  const execPath = process.argv[1] || "";
  const scriptPath = __filename || "";
  const isNpmLifecycle = process.env.npm_lifecycle_event === "postinstall";

  // Check for global npm directories (various patterns across different systems)
  const globalPaths = [
    "/usr/local/lib/node_modules",
    "/usr/lib/node_modules",
    "/opt/homebrew/lib/node_modules",
    "/.nvm/versions/", // nvm global installs
    "/.nvm/versions/node/",
    "/node_modules/.bin/", // global bin
    "/AppData/Roaming/npm/node_modules", // Windows global
    "/.bun/install/global/", // Bun global
    "/.config/yarn/global/", // Yarn global
  ];

  const isInGlobalPath = globalPaths.some((gp) => scriptPath.includes(gp) || execPath.includes(gp));

  // Check if script is NOT in a local node_modules (local installs have ./node_modules/ in path)
  const isLocalPath = scriptPath.includes("/node_modules/") && !isInGlobalPath;

  // Additional checks for npm/bun/pnpm/yarn global
  const hasGlobalIndicator =
    execPath.includes("npm") ||
    execPath.includes("global") ||
    execPath.includes(".bun") ||
    process.env.npm_config_global === "true" ||
    process.env.npm_config_prefix !== undefined;

  // It's global if:
  // 1. We're in a known global path, OR
  // 2. We have global indicators AND are not in a local node_modules, OR
  // 3. It's a postinstall lifecycle event from a global install
  return isInGlobalPath || (hasGlobalIndicator && !isLocalPath) || isNpmLifecycle;
};

const ensureDirectories = () => {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.mkdirSync(path.join(CONFIG_DIR, "agents", "custom"), { recursive: true });
  fs.mkdirSync(path.join(CONFIG_DIR, "agents", "overrides"), { recursive: true });
  fs.mkdirSync(path.join(CONFIG_DIR, "agents", "subagents"), { recursive: true });
};

const createDefaultConfig = (currentVersion) => {
  const configPath = path.join(CONFIG_DIR, "orxa.json");

  // Check if we should skip config creation (for testing init wizard)
  if (process.env.ORXA_SKIP_CONFIG === "true") {
    console.log("ℹ Skipping config creation (ORXA_SKIP_CONFIG=true)");
    console.log("  Run 'orxa init' to create config manually");
    return;
  }

  if (fs.existsSync(configPath)) {
    console.log("✓ Orxa config already exists");
    return;
  }

  const defaultConfig = {
    pluginVersion: currentVersion || "unknown",
    enabled_agents: [
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
      "mobile-simulator"
    ],
    disabled_agents: [],
    agent_overrides: {},
    custom_agents: [],
    mcps: {
      enabled: [],
      disabled: [],
      config: {}
    },
    toolAliases: {
      resolve: {
        apply_patch: "edit",
        write_to_file: "write",
        replace_file_content: "write",
        multi_replace_file_content: "write"
      }
    },
    orxa: {
      model: "opencode/kimi-k2.5",
      allowedTools: ["read", "task", "todowrite", "todoread", "supermemory"],
      blockedTools: ["grep", "glob", "bash"],
      enforcement: {
        delegation: "strict",
        todoCompletion: "strict",
        qualityGates: "strict",
        memoryAutomation: "strict"
      },
      maxManualEditsPerSession: 0,
      requireTodoList: true,
      autoUpdateTodos: false,
      planWriteAllowlist: [".orxa/plans/*.md"],
      blockMobileTools: true
    },
    plan: {
      model: "opencode/kimi-k2.5",
      allowedTools: ["read", "task", "todowrite", "todoread", "supermemory"],
      blockedTools: ["grep", "glob", "bash"]
    },
    governance: {
      onlyOrxaCanDelegate: true,
      blockSupermemoryAddForSubagents: true,
      delegationTemplate: {
        required: true,
        requiredSections: ["Task", "Expected Outcome", "Required Tools", "Must Do", "Must Not Do", "Context"],
        maxImages: 10,
        requireSameSessionId: true,
        contextHygiene: {
          maxToolOutputChars: 4000
        }
      }
    },
    subagents: {
      defaults: {
        model: "opencode/kimi-k2.5",
        timeout: 120000,
        maxRetries: 2
      },
      overrides: {},
      custom: []
    },
    memory: {
      autoExtract: true,
      extractPatterns: ["bug.*fix", "solution.*", "decided.*", "pattern.*", "config.*"],
      requiredTypes: ["error-solution", "learned-pattern", "project-config", "architecture"],
      sessionCheckpointInterval: 20
    },
    qualityGates: {
      requireLint: true,
      requireTypeCheck: true,
      requireTests: true,
      requireBuild: true,
      requireLspDiagnostics: true,
      customValidators: []
    },
    escalation: {
      enabled: true,
      maxAttemptsPerAgent: 2,
      escalationMatrix: {
        coder: "build",
        build: "architect",
        explorer: "librarian"
      },
      requireExplicitHandoff: true
    },
    ui: {
      showDelegationWarnings: true,
      showTodoReminders: true,
      showMemoryConfirmations: true,
      verboseLogging: true
    },
    perAgentRestrictions: {},
    orchestration: {
      enabled: true,
      max_parallel_workstreams: 5,
      queue_directory: "~/.orxa-queue",
      auto_merge: true,
      conflict_resolution_agent: "architect",
      worktree_prefix: "orxa",
      cleanup_worktrees: true,
      require_merge_approval: false,
      workstream_timeout_minutes: 120,
      retry_failed_workstreams: false,
      max_retries: 2,
      queue_poll_interval_ms: 5000
    }
  };

  fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
  console.log("✓ Created default orxa.json");
};

const registerPlugin = () => {
  if (!fs.existsSync(OPENCODE_CONFIG_PATH)) {
    console.log("⚠ opencode.json not found. Skipping plugin registration.");
    console.log("  Please add '@reliabilityworks/opencode-orxa' to your plugins manually.");
    return;
  }
  
  try {
    const config = JSON.parse(fs.readFileSync(OPENCODE_CONFIG_PATH, "utf-8"));
    
    if (!config.plugin) {
      config.plugin = [];
    }
    
    const pluginName = "@reliabilityworks/opencode-orxa";
    if (config.plugin.includes(pluginName)) {
      console.log("✓ Plugin already registered in opencode.json");
      return;
    }

    config.plugin.push(pluginName);
    fs.writeFileSync(OPENCODE_CONFIG_PATH, JSON.stringify(config, null, 2));
    console.log("✓ Registered plugin in opencode.json");
  } catch (error) {
    console.error("⚠ Failed to register plugin:", error.message);
  }
};

const PRIMARY_AGENTS = ["orxa", "plan"];

const copySubagentFiles = ({ force = false } = {}) => {
  const sourceSubagentsDir = path.join(__dirname, "agents", "subagents");
  const targetSubagentsDir = path.join(CONFIG_DIR, "agents", "subagents");
  const overridesDir = path.join(CONFIG_DIR, "agents", "overrides");

  if (!fs.existsSync(sourceSubagentsDir)) {
    console.log("⚠ Source subagents directory not found, skipping subagent file copy");
    return;
  }

  let copiedCount = 0;
  let skippedCount = 0;
  let overwrittenCount = 0;

  try {
    const subagentFiles = fs.readdirSync(sourceSubagentsDir).filter(f => f.endsWith(".yaml") || f.endsWith(".yml"));

    for (const filename of subagentFiles) {
      // Skip primary agent YAMLs in subagents directory (they're documentation only)
      const agentName = filename.replace(/\.ya?ml$/, "");
      if (PRIMARY_AGENTS.includes(agentName)) {
        continue;
      }

      const sourcePath = path.join(sourceSubagentsDir, filename);
      const targetPath = path.join(targetSubagentsDir, filename);

      if (fs.existsSync(targetPath) && !force) {
        skippedCount++;
        continue;
      }

      if (fs.existsSync(targetPath) && force) {
        overwrittenCount++;
      }

      fs.copyFileSync(sourcePath, targetPath);
      copiedCount++;
      console.log(`  ✓ Copied subagents/${filename}`);
    }

    console.log(
      `✓ Subagent files: ${copiedCount} copied, ${skippedCount} skipped (already exist), ${overwrittenCount} overwritten`
    );

    // Copy to overrides if overrides directory is empty
    const overridesFiles = fs.existsSync(overridesDir) 
      ? fs.readdirSync(overridesDir).filter(f => f.endsWith(".yaml") || f.endsWith(".yml"))
      : [];
    
    if (overridesFiles.length === 0) {
      let overridesCopiedCount = 0;
      for (const filename of subagentFiles) {
        // Skip primary agent YAMLs
        const agentName = filename.replace(/\.ya?ml$/, "");
        if (PRIMARY_AGENTS.includes(agentName)) {
          continue;
        }

        const sourcePath = path.join(sourceSubagentsDir, filename);
        const overridePath = path.join(overridesDir, filename);
        
        if (!fs.existsSync(overridePath)) {
          fs.copyFileSync(sourcePath, overridePath);
          overridesCopiedCount++;
        }
      }
      if (overridesCopiedCount > 0) {
        console.log(`✓ Copied ${overridesCopiedCount} subagent files to overrides/ as starting point`);
      }
    }
  } catch (error) {
    console.error("⚠ Failed to copy subagent files:", error.message);
  }
};

const copyPrimaryAgentFiles = ({ force = false } = {}) => {
  // Copy documentation versions from agents/docs/ (not the full definitions from agents/)
  const sourceDocsDir = path.join(__dirname, "agents", "docs");
  const targetAgentsDir = path.join(CONFIG_DIR, "agents");

  let copiedCount = 0;
  let skippedCount = 0;

  try {
    for (const agentName of PRIMARY_AGENTS) {
      const yamlFile = `${agentName}.yaml`;
      const sourcePath = path.join(sourceDocsDir, yamlFile);
      const targetPath = path.join(targetAgentsDir, yamlFile);

      if (!fs.existsSync(sourcePath)) {
        console.log(`  ⚠ Documentation file not found: docs/${yamlFile}`);
        continue;
      }

      if (fs.existsSync(targetPath) && !force) {
        skippedCount++;
        continue;
      }

      fs.copyFileSync(sourcePath, targetPath);
      copiedCount++;
      console.log(`  ✓ Copied ${yamlFile} (documentation)`);
    }

    if (copiedCount > 0 || skippedCount > 0) {
      console.log(
        `✓ Primary agent files: ${copiedCount} copied, ${skippedCount} skipped (already exist)`
      );
    }
  } catch (error) {
    console.error("⚠ Failed to copy primary agent files:", error.message);
  }
};

const copyReadmeFiles = ({ force = false } = {}) => {
  const agentDirs = ["subagents", "overrides", "custom"];
  let copiedCount = 0;
  let skippedCount = 0;

  try {
    for (const dir of agentDirs) {
      const sourcePath = path.join(__dirname, "agents", dir, "README.md");
      const targetPath = path.join(CONFIG_DIR, "agents", dir, "README.md");

      if (!fs.existsSync(sourcePath)) {
        continue;
      }

      if (fs.existsSync(targetPath) && !force) {
        skippedCount++;
        continue;
      }

      fs.copyFileSync(sourcePath, targetPath);
      copiedCount++;
      console.log(`  ✓ Copied agents/${dir}/README.md`);
    }

    if (copiedCount > 0 || skippedCount > 0) {
      console.log(
        `✓ README files: ${copiedCount} copied, ${skippedCount} skipped (already exist)`
      );
    }
  } catch (error) {
    console.error("⚠ Failed to copy README files:", error.message);
  }
};

const copyBundledSkills = ({ force = false } = {}) => {
  if (!fs.existsSync(BUNDLED_SKILLS_DIR)) {
    console.log("⚠ Bundled skills directory not found, skipping skill copy");
    return;
  }

  let copiedCount = 0;
  let skippedCount = 0;
  let overwrittenCount = 0;

  try {
    const skillFiles = fs
      .readdirSync(BUNDLED_SKILLS_DIR)
      .filter((f) => f.endsWith(".md") && f.toLowerCase() !== "readme.md");

    for (const filename of skillFiles) {
      const skillName = path.basename(filename, ".md");
      const targetSkillDir = path.join(USER_SKILL_DIR, skillName);

      const targetPath = path.join(targetSkillDir, "SKILL.md");

      if (fs.existsSync(targetPath) && !force) {
        skippedCount++;
        continue;
      }

      fs.mkdirSync(targetSkillDir, { recursive: true });
      const sourcePath = path.join(BUNDLED_SKILLS_DIR, filename);

      if (fs.existsSync(targetPath) && force) {
        overwrittenCount++;
      }

      fs.copyFileSync(sourcePath, targetPath);
      copiedCount++;
      console.log(`  ✓ Copied skills/${filename} -> ${skillName}/SKILL.md`);
    }

    console.log(
      `✓ Skills: ${copiedCount} copied, ${skippedCount} skipped (already exist), ${overwrittenCount} overwritten`
    );
  } catch (error) {
    console.error("⚠ Failed to copy bundled skills:", error.message);
  }
};

const copyBundledCommands = ({ force = false } = {}) => {
  if (!fs.existsSync(BUNDLED_COMMANDS_DIR)) {
    console.log("⚠ Bundled commands directory not found, skipping command copy");
    return;
  }

  let copiedCount = 0;
  let skippedCount = 0;
  let overwrittenCount = 0;

  try {
    const commandFiles = fs
      .readdirSync(BUNDLED_COMMANDS_DIR)
      .filter((f) => f.endsWith(".md"));

    for (const filename of commandFiles) {
      const targetPath = path.join(USER_COMMAND_DIR, filename);

      if (fs.existsSync(targetPath) && !force) {
        skippedCount++;
        continue;
      }

      fs.mkdirSync(USER_COMMAND_DIR, { recursive: true });
      const sourcePath = path.join(BUNDLED_COMMANDS_DIR, filename);

      if (fs.existsSync(targetPath) && force) {
        overwrittenCount++;
      }

      fs.copyFileSync(sourcePath, targetPath);
      copiedCount++;
      console.log(`  ✓ Copied command: ${filename}`);
    }

    console.log(
      `✓ Commands: ${copiedCount} copied, ${skippedCount} skipped (already exist), ${overwrittenCount} overwritten`
    );
  } catch (error) {
    console.error("⚠ Failed to copy bundled commands:", error.message);
  }
};

const installAgentDeviceCli = () => {
  console.log("\n📦 Installing agent-device CLI...");

  try {
    execSync("npm install -g agent-device", { stdio: "inherit" });
    console.log("✓ agent-device CLI installed globally");
  } catch (error) {
    console.error("⚠ Failed to install agent-device CLI");
    if (error?.message) {
      console.error(`  ${error.message}`);
    }
    console.error("  You can retry manually: npm install -g agent-device");
  }
};

const installAgentBrowserCli = () => {
  console.log("\n📦 Installing agent-browser CLI...");

  let installed = false;

  try {
    execSync("npm install -g agent-browser", { stdio: "inherit" });
    installed = true;
    console.log("✓ agent-browser CLI installed globally");
  } catch (error) {
    console.error("⚠ Failed to install agent-browser CLI");
    if (error?.message) {
      console.error(`  ${error.message}`);
    }
    console.error("  You can retry manually: npm install -g agent-browser");
  }

  if (!installed) {
    return;
  }

  try {
    execSync("agent-browser install", { stdio: "inherit" });
    console.log("✓ Chromium downloaded for agent-browser");
  } catch (error) {
    console.error("⚠ Failed to download Chromium for agent-browser");
    if (error?.message) {
      console.error(`  ${error.message}`);
    }
    console.error("  You can retry manually: agent-browser install");
  }
};

const getCurrentPluginVersion = () => {
  const packagePath = path.join(__dirname, "package.json");

  try {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf-8"));
    return packageJson.version || null;
  } catch (error) {
    console.error("⚠ Failed to read package.json version:", error.message);
    return null;
  }
};

const readConfigFile = (configPath) => {
  if (!fs.existsSync(configPath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(configPath, "utf-8"));
  } catch (error) {
    console.error("⚠ Failed to read orxa.json:", error.message);
    return null;
  }
};

/**
 * Deep merge helper that preserves user values while adding missing fields from defaults.
 * User's values always take precedence over defaults.
 * Only adds fields that are completely missing (additive only).
 * 
 * @param {object} userConfig - The user's existing configuration
 * @param {object} defaultConfig - The default configuration template
 * @returns {object} - Merged configuration
 */
const deepMergeConfigs = (userConfig, defaultConfig) => {
  const result = {};
  
  // Get all unique keys from both configs
  const allKeys = new Set([...Object.keys(userConfig), ...Object.keys(defaultConfig)]);
  
  for (const key of allKeys) {
    const userValue = userConfig[key];
    const defaultValue = defaultConfig[key];
    
    // If key doesn't exist in user config, use default
    if (!(key in userConfig)) {
      result[key] = defaultValue;
      continue;
    }
    
    // If key doesn't exist in defaults, preserve user value
    if (!(key in defaultConfig)) {
      result[key] = userValue;
      continue;
    }
    
    // Both have the key - need to merge
    const userType = Array.isArray(userValue) ? 'array' : typeof userValue;
    const defaultType = Array.isArray(defaultValue) ? 'array' : typeof defaultValue;
    
    // If types differ, user value wins
    if (userType !== defaultType) {
      result[key] = userValue;
      continue;
    }
    
    // Handle arrays - user array wins entirely (preserves their customizations)
    if (userType === 'array') {
      result[key] = userValue;
      continue;
    }
    
    // Handle nested objects - recursive merge
    if (userType === 'object' && userValue !== null && defaultValue !== null) {
      result[key] = deepMergeConfigs(userValue, defaultValue);
      continue;
    }
    
    // For primitives, user value wins
    result[key] = userValue;
  }
  
  return result;
};

/**
 * Migrate user config to new version by completely replacing orxa.json
 * while preserving only the agent_overrides field.
 * 
 * @param {string} configPath - Path to the config file
 * @param {object} userConfig - The user's existing configuration
 * @param {string} currentVersion - The current plugin version
 */
const migrateConfig = (configPath, userConfig, currentVersion) => {
  if (!userConfig) {
    return;
  }

  try {
    // Build the default config template (same as createDefaultConfig)
    const defaultConfig = {
      pluginVersion: currentVersion || "unknown",
      enabled_agents: [
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
        "mobile-simulator"
      ],
      disabled_agents: [],
      agent_overrides: {},
      custom_agents: [],
      mcps: {
        enabled: [],
        disabled: [],
        config: {}
      },
      toolAliases: {
        resolve: {
          apply_patch: "edit",
          write_to_file: "write",
          replace_file_content: "write",
          multi_replace_file_content: "write"
        }
      },
      orxa: {
        allowedTools: ["read", "task", "todowrite", "todoread", "supermemory"],
        blockedTools: ["grep", "glob", "bash"],
        enforcement: {
          delegation: "strict",
          todoCompletion: "strict",
          qualityGates: "strict",
          memoryAutomation: "strict"
        },
        maxManualEditsPerSession: 0,
        requireTodoList: true,
        autoUpdateTodos: false,
        planWriteAllowlist: [".orxa/plans/*.md"],
        blockMobileTools: true
      },
      plan: {
        allowedTools: ["read", "task", "todowrite", "todoread", "supermemory"],
        blockedTools: ["grep", "glob", "bash"]
      },
      governance: {
        onlyOrxaCanDelegate: true,
        blockSupermemoryAddForSubagents: true,
        delegationTemplate: {
          required: true,
          requiredSections: ["Task", "Expected Outcome", "Required Tools", "Must Do", "Must Not Do", "Context"],
          maxImages: 10,
          requireSameSessionId: true,
          contextHygiene: {
            maxToolOutputChars: 4000
          }
        }
      },
      subagents: {
        defaults: {
          model: "opencode/kimi-k2.5",
          timeout: 120000,
          maxRetries: 2
        },
        overrides: {},
        custom: []
      },
      memory: {
        autoExtract: true,
        extractPatterns: ["bug.*fix", "solution.*", "decided.*", "pattern.*", "config.*"],
        requiredTypes: ["error-solution", "learned-pattern", "project-config", "architecture"],
        sessionCheckpointInterval: 20
      },
      qualityGates: {
        requireLint: true,
        requireTypeCheck: true,
        requireTests: true,
        requireBuild: true,
        requireLspDiagnostics: true,
        customValidators: []
      },
      escalation: {
        enabled: true,
        maxAttemptsPerAgent: 2,
        escalationMatrix: {
          coder: "build",
          build: "architect",
          explorer: "librarian"
        },
        requireExplicitHandoff: true
      },
      ui: {
        showDelegationWarnings: true,
        showTodoReminders: true,
        showMemoryConfirmations: true,
        verboseLogging: true
      },
      perAgentRestrictions: {},
      orchestration: {
        enabled: true,
        max_parallel_workstreams: 5,
        queue_directory: "~/.orxa-queue",
        auto_merge: true,
        conflict_resolution_agent: "architect",
        worktree_prefix: "orxa",
        cleanup_worktrees: true,
        require_merge_approval: false,
        workstream_timeout_minutes: 120,
        retry_failed_workstreams: false,
        max_retries: 2,
        queue_poll_interval_ms: 5000
      }
    };

    // Replace config completely, but preserve user customizations
    const newConfig = { ...defaultConfig };
    
    // Preserve user's agent_overrides if they have any
    if (userConfig.agent_overrides && Object.keys(userConfig.agent_overrides).length > 0) {
      newConfig.agent_overrides = userConfig.agent_overrides;
      console.log("✓ Preserved agent_overrides from existing config");
    }
    
    // Preserve user's orxa.model if set
    if (userConfig.orxa?.model) {
      newConfig.orxa.model = userConfig.orxa.model;
      console.log(`✓ Preserved orxa.model: ${userConfig.orxa.model}`);
    }
    
    // Preserve user's plan.model if set
    if (userConfig.plan?.model) {
      newConfig.plan.model = userConfig.plan.model;
      console.log(`✓ Preserved plan.model: ${userConfig.plan.model}`);
    }
    
    // Preserve other orxa settings that user may have customized
    if (userConfig.orxa) {
      // Preserve enforcement settings
      if (userConfig.orxa.enforcement) {
        Object.assign(newConfig.orxa.enforcement, userConfig.orxa.enforcement);
      }
      // Preserve other orxa settings
      const orxaSettingsToPreserve = [
        'maxManualEditsPerSession', 'requireTodoList', 'autoUpdateTodos', 
        'planWriteAllowlist', 'blockMobileTools'
      ];
      for (const setting of orxaSettingsToPreserve) {
        if (userConfig.orxa[setting] !== undefined) {
          newConfig.orxa[setting] = userConfig.orxa[setting];
        }
      }
    }
    
    // Always update pluginVersion to current version
    newConfig.pluginVersion = currentVersion || "unknown";
    
    // Write the new config
    fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2));
    
    console.log(`✓ Updated orxa.json to v${currentVersion || "unknown"}`);
    console.log(`✓ Preserved user customizations`);
    
  } catch (error) {
    console.error("⚠ Failed to migrate orxa.json:", error.message);
    console.error("  Your existing config has been preserved.");
  }
};

const main = () => {
  console.log("🎼 OpenCode Orxa - Post Install\n");

  console.log("Setting up OpenCode Orxa...\n");

  ensureDirectories();
  console.log("✓ Created config directories");

  const configPath = path.join(CONFIG_DIR, "orxa.json");
  const currentVersion = getCurrentPluginVersion();
  const userConfig = readConfigFile(configPath);
  const lastVersion = userConfig?.pluginVersion;
  const needsUpdate = !lastVersion || lastVersion !== currentVersion;

  if (needsUpdate) {
    console.log(`📦 Updating from v${lastVersion || "unknown"} to v${currentVersion || "unknown"}...`);
  }

  copyPrimaryAgentFiles({ force: needsUpdate });
  copySubagentFiles({ force: needsUpdate });
  copyReadmeFiles({ force: needsUpdate });
  copyBundledSkills({ force: needsUpdate });
  copyBundledCommands({ force: needsUpdate });
  createDefaultConfig(currentVersion);

  if (userConfig && needsUpdate) {
    migrateConfig(configPath, userConfig, currentVersion);
  }
  registerPlugin();

  installAgentDeviceCli();
  installAgentBrowserCli();

  // Show MCP status
  console.log("\n📦 Bundled MCPs:");
  console.log("  (none)");

  console.log("\n🔧 Bundled CLI Tools:");
  console.log("  ✓ agent-device (installed globally)");
  console.log("  ✓ agent-browser (installed globally)");

  console.log("\n🎉 Setup complete!");
  console.log("\nNext steps:");
  console.log("  1. Start using: opencode");
  console.log("  2. Run 'orxa install' to customize enabled agents");
  console.log("  3. Run 'orxa config' to edit configuration");
  console.log("  4. Edit ~/.config/opencode/orxa/orxa.json to configure settings\n");
};

main();
