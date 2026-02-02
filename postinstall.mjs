#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import os from "os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_DIR = path.join(os.homedir(), ".config", "opencode", "orxa");
const OPENCODE_CONFIG_PATH = path.join(os.homedir(), ".config", "opencode", "opencode.json");

const isGlobalInstall = () => {
  // Check if we're in a global npm/bun directory or being run via npm install/link
  const execPath = process.argv[1] || "";
  const isNpmLifecycle = process.env.npm_lifecycle_event === "postinstall";
  return execPath.includes("npm") || execPath.includes("global") || execPath.includes(".bun") || isNpmLifecycle;
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
    agent_overrides: {
      build: { model: "opencode/gpt-5.2-codex" },
      architect: { model: "opencode/gpt-5.2-codex" },
      frontend: { model: "opencode/gemini-3-pro" },
      multimodal: { model: "opencode/gemini-3-pro" }
    },
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
      allowedTools: ["read", "delegate_task", "todowrite", "todoread", "supermemory", "edit", "write"],
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
      requireTest: true,
      requireBuild: true,
      lintCommand: "npm run lint",
      typeCheckCommand: "npm run typecheck",
      testCommand: "npm test",
      buildCommand: "npm run build"
    },
    escalation: {
      maxAgentAttempts: 3,
      escalateToOrxa: true,
      autoEscalationThreshold: 2
    },
    ui: {
      showWelcomeToast: true,
      showOrxaIndicator: true,
      showDelegationSummary: true,
      colorizeOutput: true
    }
  };

  fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
  console.log("✓ Created default orxa.json");
};

const registerPlugin = () => {
  if (!fs.existsSync(OPENCODE_CONFIG_PATH)) {
    console.log("⚠ opencode.json not found. Skipping plugin registration.");
    console.log("  Please add 'opencode-orxa' to your plugins manually.");
    return;
  }
  
  try {
    const config = JSON.parse(fs.readFileSync(OPENCODE_CONFIG_PATH, "utf-8"));
    
    if (!config.plugin) {
      config.plugin = [];
    }
    
    if (config.plugin.includes("opencode-orxa")) {
      console.log("✓ Plugin already registered in opencode.json");
      return;
    }
    
    config.plugin.push("opencode-orxa");
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
