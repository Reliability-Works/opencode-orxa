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

const createDefaultConfig = () => {
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

const copySubagentFiles = () => {
  const sourceSubagentsDir = path.join(__dirname, "agents", "subagents");
  const targetSubagentsDir = path.join(CONFIG_DIR, "agents", "subagents");

  if (!fs.existsSync(sourceSubagentsDir)) {
    console.log("⚠ Source subagents directory not found, skipping subagent file copy");
    return;
  }

  let copiedCount = 0;
  let skippedCount = 0;

  try {
    const subagentFiles = fs.readdirSync(sourceSubagentsDir).filter(f => f.endsWith(".yaml") || f.endsWith(".yml"));

    for (const filename of subagentFiles) {
      const sourcePath = path.join(sourceSubagentsDir, filename);
      const targetPath = path.join(targetSubagentsDir, filename);

      if (fs.existsSync(targetPath)) {
        skippedCount++;
        continue;
      }

      fs.copyFileSync(sourcePath, targetPath);
      copiedCount++;
      console.log(`  ✓ Copied subagents/${filename}`);
    }

    console.log(`✓ Subagent files: ${copiedCount} copied, ${skippedCount} skipped (already exist)`);
  } catch (error) {
    console.error("⚠ Failed to copy subagent files:", error.message);
  }
};

const copyBundledSkills = () => {
  if (!fs.existsSync(BUNDLED_SKILLS_DIR)) {
    console.log("⚠ Bundled skills directory not found, skipping skill copy");
    return;
  }

  let copiedCount = 0;
  let skippedCount = 0;

  try {
    const skillFiles = fs
      .readdirSync(BUNDLED_SKILLS_DIR)
      .filter((f) => f.endsWith(".md") && f.toLowerCase() !== "readme.md");

    for (const filename of skillFiles) {
      const skillName = path.basename(filename, ".md");
      const targetSkillDir = path.join(USER_SKILL_DIR, skillName);

      if (fs.existsSync(targetSkillDir)) {
        skippedCount++;
        continue;
      }

      fs.mkdirSync(targetSkillDir, { recursive: true });
      const sourcePath = path.join(BUNDLED_SKILLS_DIR, filename);
      const targetPath = path.join(targetSkillDir, "SKILL.md");

      fs.copyFileSync(sourcePath, targetPath);
      copiedCount++;
      console.log(`  ✓ Copied skills/${filename} -> ${skillName}/SKILL.md`);
    }

    console.log(`✓ Skills: ${copiedCount} copied, ${skippedCount} skipped (already exist)`);
  } catch (error) {
    console.error("⚠ Failed to copy bundled skills:", error.message);
  }
};

const main = () => {
  console.log("🎼 OpenCode Orxa - Post Install\n");

  if (!isGlobalInstall()) {
    console.log("ℹ Local install detected. Skipping automatic setup.");
    console.log("  Run 'orxa init' to set up manually.\n");
    return;
  }

  console.log("Setting up OpenCode Orxa...\n");

  ensureDirectories();
  console.log("✓ Created config directories");

  copySubagentFiles();
  copyBundledSkills();
  createDefaultConfig();
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
