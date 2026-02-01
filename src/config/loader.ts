import fs from "fs";
import os from "os";
import path from "path";
import { orxaConfigSchema, OrxaConfig } from "./schema";
import { defaultConfig, PRIMARY_AGENTS } from "./default-config";

const CONFIG_ROOT_DIR = path.join(os.homedir(), ".config", "opencode", "orxa");
const CONFIG_FILE_NAME = "orxa.json";
const LEGACY_CONFIG_PATH = path.join(
  process.cwd(),
  ".opencode",
  "orxa.config.json"
);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const mergeDeep = <T extends object>(
  target: T,
  source: Record<string, unknown>
): T => {
  const result: Record<string, unknown> = {
    ...(target as Record<string, unknown>),
  };

  for (const [key, value] of Object.entries(source)) {
    const current = result[key];
    if (isPlainObject(current) && isPlainObject(value)) {
      result[key] = mergeDeep(current, value);
      continue;
    }

    result[key] = value;
  }

  return result as T;
};

const readConfigFile = (configPath: string): Record<string, unknown> | null => {
  if (!fs.existsSync(configPath)) {
    return null;
  }

  const raw = fs.readFileSync(configPath, "utf-8").trim();
  if (!raw) {
    return {};
  }

  const parsed = JSON.parse(raw) as unknown;
  if (!isPlainObject(parsed)) {
    throw new Error(`Config file must be a JSON object: ${configPath}`);
  }

  return parsed;
};

const stripPrimaryAgentOverrides = (config: Record<string, unknown>): void => {
  if (!isPlainObject(config.agent_overrides)) {
    return;
  }

  const primaryAgents = new Set<string>(PRIMARY_AGENTS);
  const overrides = config.agent_overrides as Record<string, unknown>;

  for (const [agentName, override] of Object.entries(overrides)) {
    if (!primaryAgents.has(agentName) || !isPlainObject(override)) {
      continue;
    }

    const restrictedKeys = Object.keys(override).filter((key) => key !== "model");
    if (restrictedKeys.length > 0) {
      console.warn(
        `Primary agent override "${agentName}" only supports "model". ` +
          `Ignoring: ${restrictedKeys.join(", ")}.`
      );
    }

    const sanitized: Record<string, unknown> = {};
    if (Object.prototype.hasOwnProperty.call(override, "model")) {
      sanitized.model = override.model;
    }

    overrides[agentName] = sanitized;
  }
};

const normalizeLegacyEnforcement = (config: Record<string, unknown>): void => {
  if (!isPlainObject(config.enforcement)) {
    return;
  }

  if (!isPlainObject(config.orxa)) {
    config.orxa = {};
  }

  const enforcement = config.enforcement as Record<string, unknown>;
  const orxa = config.orxa as Record<string, unknown>;

  if (!isPlainObject(orxa.enforcement)) {
    orxa.enforcement = {};
  }

  orxa.enforcement = mergeDeep(
    enforcement as Record<string, unknown>,
    orxa.enforcement as Record<string, unknown>
  );

  delete config.enforcement;
};

export const getUserConfigDir = (): string => CONFIG_ROOT_DIR;

export const getUserConfigPath = (): string =>
  path.join(CONFIG_ROOT_DIR, CONFIG_FILE_NAME);

export const getLegacyConfigPath = (): string => LEGACY_CONFIG_PATH;

export const getUserAgentsDir = (): string =>
  path.join(CONFIG_ROOT_DIR, "agents");

export const getCustomAgentsDir = (): string =>
  path.join(getUserAgentsDir(), "custom");

export const getOverridesAgentsDir = (): string =>
  path.join(getUserAgentsDir(), "overrides");

export const getSchemasDir = (): string =>
  path.join(CONFIG_ROOT_DIR, "schemas");

export const ensureUserConfigDirectories = (): void => {
  fs.mkdirSync(CONFIG_ROOT_DIR, { recursive: true });
  fs.mkdirSync(getCustomAgentsDir(), { recursive: true });
  fs.mkdirSync(getOverridesAgentsDir(), { recursive: true });
  fs.mkdirSync(getSchemasDir(), { recursive: true });
};

export const loadOrxaConfig = (
  configPath?: string
): OrxaConfig => {
  const resolvedPath = configPath ?? getUserConfigPath();
  let userConfig = readConfigFile(resolvedPath);

  if (!userConfig && !configPath) {
    const legacyConfig = readConfigFile(getLegacyConfigPath());
    if (legacyConfig) {
      userConfig = legacyConfig;
      if (process.env.OPENCODE_ORXA_SILENT !== "1") {
        console.warn(
          `Legacy config detected at ${getLegacyConfigPath()}. ` +
            `Please migrate to ${getUserConfigPath()}.`
        );
      }
    }
  }

  if (userConfig) {
    normalizeLegacyEnforcement(userConfig);
  }

  const merged = mergeDeep(defaultConfig, userConfig ?? {});
  stripPrimaryAgentOverrides(merged as unknown as Record<string, unknown>);
  return orxaConfigSchema.parse(merged);
};
