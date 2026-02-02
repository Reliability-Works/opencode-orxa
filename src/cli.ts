#!/usr/bin/env node
import fs from "fs";
import { spawnSync } from "child_process";
import {
  ensureUserConfigDirectories,
  getCustomAgentsDir,
  getOverridesAgentsDir,
  getUserConfigPath,
  loadOrxaConfig,
} from "./config/loader.js";
import { orxaConfigSchema, type OrxaConfig } from "./config/schema.js";
import { runInitWizard, runInstallWizard } from "./wizard.js";
import {
  detectProviders,
  getAuthenticatedProviders,
  getUnauthenticatedProviders,
  formatProviderName,
  getAuthInstructions,
} from "./utils/provider-detector.js";

const printHelp = (): void => {
  console.log(`
OpenCode Orxa CLI

Usage:
  orxa init       Interactive setup wizard
  orxa install    Enable/disable agents
  orxa doctor     Verify configuration and agent setup
  orxa config     Open config in editor
  orxa providers  Show provider and authentication status

Flags:
  --non-interactive    Run with defaults (no prompts)
  --force              Overwrite existing config on init
`);
};

const isNonInteractive = (args: string[]): boolean =>
  args.includes("--non-interactive") || !process.stdin.isTTY;

const hasFlag = (args: string[], flag: string): boolean => args.includes(flag);

const openConfig = (configPath: string): void => {
  if (!fs.existsSync(configPath)) {
    console.error(`Config not found at ${configPath}. Run 'orxa init' first.`);
    process.exitCode = 1;
    return;
  }

  const editor = process.env.VISUAL || process.env.EDITOR;
  if (editor) {
    spawnSync(editor, [configPath], { stdio: "inherit" });
    return;
  }

  if (process.platform === "darwin") {
    spawnSync("open", [configPath], { stdio: "inherit" });
    return;
  }

  console.log(`Config path: ${configPath}`);
};

const runDoctor = (): void => {
  ensureUserConfigDirectories();
  const configPath = getUserConfigPath();

  if (!fs.existsSync(configPath)) {
    console.error(`Config not found at ${configPath}.`);
    process.exitCode = 1;
    return;
  }

  const raw = fs.readFileSync(configPath, "utf-8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    console.error(`Config JSON is invalid: ${(error as Error).message}`);
    process.exitCode = 1;
    return;
  }

  // Load and validate the merged config (user config + defaults)
  let config: OrxaConfig;
  try {
    config = loadOrxaConfig();
  } catch (error) {
    console.error("Config validation failed:");
    console.error(`- ${(error as Error).message}`);
    process.exitCode = 1;
    return;
  }
  const missingDirs: string[] = [];
  if (!fs.existsSync(getCustomAgentsDir())) {
    missingDirs.push(getCustomAgentsDir());
  }
  if (!fs.existsSync(getOverridesAgentsDir())) {
    missingDirs.push(getOverridesAgentsDir());
  }

  if (missingDirs.length > 0) {
    console.warn("Missing agent directories:");
    missingDirs.forEach((dir) => {
      console.warn(`- ${dir}`);
    });
  }

  console.log("✅ Configuration looks good.");
  console.log(`Enabled agents: ${config.enabled_agents.join(", ") || "none"}`);
  console.log(`Disabled agents: ${config.disabled_agents.join(", ") || "none"}`);
};

const runProviders = (): void => {
  ensureUserConfigDirectories();
  
  const detected = detectProviders();
  
  console.log("\n🔍 OpenCode Configuration\n");
  console.log(`Config: ${detected.configPath}`);
  console.log(`Auth: ${detected.authPath}`);
  console.log(`Config exists: ${detected.hasOpenCodeConfig ? "✅" : "❌"}`);
  console.log(`Auth file exists: ${detected.hasAuthConfig ? "✅" : "❌"}`);
  
  console.log("\n📋 Providers:\n");
  
  const authenticated = getAuthenticatedProviders(detected);
  const unauthenticated = getUnauthenticatedProviders(detected);
  
  if (authenticated.length > 0) {
    console.log("✅ Authenticated:");
    authenticated.forEach((provider) => {
      console.log(`  ${formatProviderName(provider)}`);
      console.log(`     Auth: ${provider.auth.message}`);
      if (provider.models.length > 0) {
        console.log(`     Models: ${provider.models.slice(0, 5).map((m) => m.name).join(", ")}${provider.models.length > 5 ? "..." : ""}`);
      }
    });
    console.log();
  }
  
  if (unauthenticated.length > 0) {
    console.log("❌ Needs Authentication:\n");
    unauthenticated.forEach((provider) => {
      console.log(`  ${provider.name}`);
      console.log(`     Status: ${provider.auth.message}`);
      const instructions = getAuthInstructions(provider);
      if (instructions) {
        console.log(`     Instructions:`);
        instructions.split("\n").forEach((line) => {
          console.log(`       ${line}`);
        });
      }
      console.log();
    });
  }
  
  const notConfigured = detected.providers.filter((p) => !p.available);
  if (notConfigured.length > 0) {
    console.log("⚠️  Not Configured (add to opencode.json to use):\n");
    notConfigured.forEach((provider) => {
      console.log(`  ${provider.name}`);
      if (provider.models.length > 0) {
        console.log(`     Available models: ${provider.models.map((m) => m.name).join(", ")}`);
      }
      console.log();
    });
  }
};

const main = async (): Promise<void> => {
  const [, , command, ...args] = process.argv;
  const nonInteractive = isNonInteractive(args);

  switch (command) {
    case "init": {
      try {
        await runInitWizard({
          nonInteractive,
          overwrite: hasFlag(args, "--force"),
        });
      } catch (error) {
        console.error((error as Error).message);
        process.exitCode = 1;
      }
      break;
    }
    case "install": {
      const baseConfig = fs.existsSync(getUserConfigPath())
        ? loadOrxaConfig()
        : undefined;
      await runInstallWizard({ nonInteractive, baseConfig });
      break;
    }
    case "doctor": {
      runDoctor();
      break;
    }
    case "config": {
      openConfig(getUserConfigPath());
      break;
    }
    case "providers": {
      runProviders();
      break;
    }
    case "help":
    case "--help":
    case "-h":
    case undefined: {
      printHelp();
      break;
    }
    default: {
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exitCode = 1;
    }
  }
};

void main();
