#!/usr/bin/env node
import fs from "fs";
import { spawnSync } from "child_process";
import {
  ensureUserConfigDirectories,
  getCustomAgentsDir,
  getOverridesAgentsDir,
  getUserConfigPath,
  loadOrxaConfig,
} from "./config/loader";
import { orxaConfigSchema } from "./config/schema";
import { runInitWizard, runInstallWizard } from "./wizard";

const printHelp = (): void => {
  console.log(`
OpenCode Orxa CLI

Usage:
  orxa init       Interactive setup wizard
  orxa install    Enable/disable agents
  orxa doctor     Verify configuration and agent setup
  orxa config     Open config in editor

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

  const result = orxaConfigSchema.safeParse(parsed);
  if (!result.success) {
    console.error("Config validation failed:");
    for (const issue of result.error.issues) {
      console.error(`- ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exitCode = 1;
    return;
  }

  const config = loadOrxaConfig();
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
