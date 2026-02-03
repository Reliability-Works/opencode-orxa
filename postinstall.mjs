#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import os from "os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_DIR = path.join(os.homedir(), ".config", "opencode", "orxa");
const OPENCODE_CONFIG_PATH = path.join(os.homedir(), ".config", "opencode", "opencode.json");
const BUNDLED_SKILLS_DIR = path.join(__dirname, "skills");
const USER_SKILL_DIR = path.join(os.homedir(), ".config", "opencode", "skill");

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
      enabled: ["ios-simulator", "playwright"],
      disabled: [],
      config: {}
    },
    toolAliases: {
      resolve: {
        apply_patch: "edit",
        write_to_file: "write",
        replace_file_content: "write",
        multi_replace_file_content: "write",
        task: "delegate_task"
      }
    },
    orxa: {
      model: "opencode/kimi-k2.5",
      allowedTools: ["read", "delegate_task", "todowrite", "todoread", "supermemory"],
      blockedTools: ["grep", "glob", "bash", "skill"],
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
    governance: {
      onlyOrxaCanDelegate: true,
      blockSupermemoryAddForSubagents: true,
      delegationTemplate: {
        required: true,
        requiredSections: ["Task", "Expected Outcome", "Required Tools", "Must Do", "Must Not Do", "Context"],
        maxImages: 10,
        requireSameSessionId: true,
        contextHygiene: {
          maxToolOutputChars: 4000,
          summaryHeader: "Summary",
          requireSummary: true
        }
      }
    },
    subagents: {
      defaults: {
        model: "opencode/kimi-k2.5",
        timeout: 120000,
        maxRetries: 2
      },
      overrides: {
        build: { model: "opencode/gpt-5.2-codex", timeout: 300000 },
        architect: { model: "opencode/gpt-5.2-codex", timeout: 300000 },
        frontend: { model: "opencode/gemini-3-pro" },
        multimodal: { model: "opencode/gemini-3-pro" }
      },
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

const copySubagentFiles = ({ force = false } = {}) => {
  const sourceSubagentsDir = path.join(__dirname, "agents", "subagents");
  const targetSubagentsDir = path.join(CONFIG_DIR, "agents", "subagents");

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
  } catch (error) {
    console.error("⚠ Failed to copy subagent files:", error.message);
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
 * Migrate user config to new version by:
 * 1. Preserving all user customizations
 * 2. Adding any new fields from defaults that are missing
 * 3. Updating pluginVersion to current version
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
        enabled: ["ios-simulator", "playwright"],
        disabled: [],
        config: {}
      },
      toolAliases: {
        resolve: {
          apply_patch: "edit",
          write_to_file: "write",
          replace_file_content: "write",
          multi_replace_file_content: "write",
          task: "delegate_task"
        }
      },
      orxa: {
        allowedTools: ["read", "delegate_task", "todowrite", "todoread", "supermemory"],
        blockedTools: ["grep", "glob", "bash", "skill"],
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
      governance: {
        onlyOrxaCanDelegate: true,
        blockSupermemoryAddForSubagents: true,
        delegationTemplate: {
          required: true,
          requiredSections: ["Task", "Expected Outcome", "Required Tools", "Must Do", "Must Not Do", "Context"],
          maxImages: 10,
          requireSameSessionId: true,
          contextHygiene: {
            maxToolOutputChars: 4000,
            summaryHeader: "Summary",
            requireSummary: true
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

    // Perform deep merge: user values win, missing fields added from defaults
    const mergedConfig = deepMergeConfigs(userConfig, defaultConfig);
    
    // Always update pluginVersion to current version
    mergedConfig.pluginVersion = currentVersion || "unknown";
    
    // Write the migrated config
    fs.writeFileSync(configPath, JSON.stringify(mergedConfig, null, 2));
    
    // Report what changed
    const userKeys = new Set(Object.keys(userConfig));
    const defaultKeys = new Set(Object.keys(defaultConfig));
    const newFields = [...defaultKeys].filter(k => !userKeys.has(k));
    
    if (newFields.length > 0) {
      console.log(`✓ Migrated config: added ${newFields.length} new field(s)`);
      console.log(`  New fields: ${newFields.join(", ")}`);
    } else {
      console.log("✓ Config is up to date (no new fields to add)");
    }
    console.log(`✓ Updated pluginVersion to v${currentVersion || "unknown"}`);
    
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

  copySubagentFiles({ force: needsUpdate });
  copyBundledSkills({ force: needsUpdate });
  createDefaultConfig(currentVersion);

  if (userConfig && needsUpdate) {
    migrateConfig(configPath, userConfig, currentVersion);
  }
  registerPlugin();

  // Show MCP status
  console.log("\n📦 Bundled MCPs:");
  console.log("  ✓ ios-simulator (enabled by default)");
  console.log("  ✓ playwright (enabled by default)");
  console.log("    Disable in orxa.json mcps.disabled if not needed");

  console.log("\n🎉 Setup complete!");
  console.log("\nNext steps:");
  console.log("  1. Start using: opencode");
  console.log("  2. Run 'orxa install' to customize enabled agents");
  console.log("  3. Run 'orxa config' to edit configuration");
  console.log("  4. Edit ~/.config/opencode/orxa/orxa.json to configure MCPs\n");
};

main();
