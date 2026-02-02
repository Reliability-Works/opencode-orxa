import fs from "fs";
import os from "os";
import path from "path";
import { orxaConfigSchema, OrxaConfig } from "./schema.js";
import { defaultConfig, PRIMARY_AGENTS } from "./default-config.js";

const debugLog = (...args: unknown[]) => {
  if (process.env.OPENCODE_ORXA_DEBUG === '1') {
    console.log('[orxa:loader]', ...args);
  }
};

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
  debugLog('Reading config file:', configPath);

  const exists = fs.existsSync(configPath);
  debugLog('File exists:', exists);

  if (!exists) {
    return null;
  }

  const stats = fs.statSync(configPath);
  debugLog('File size:', stats.size, 'bytes');

  const raw = fs.readFileSync(configPath, "utf-8").trim();
  debugLog('Raw contents (first 500 chars):', raw.slice(0, 500));

  if (!raw) {
    return {};
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
    debugLog('JSON.parse succeeded');
  } catch (error) {
    debugLog('JSON.parse error:', error instanceof Error ? error.message : String(error));
    throw error;
  }

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
};

export const loadOrxaConfig = (
  configPath?: string
): OrxaConfig => {
  debugLog('Loading orxa config...');
  debugLog('os.homedir():', os.homedir());
  debugLog('process.env.HOME:', process.env.HOME);
  debugLog('process.env.XDG_CONFIG_HOME:', process.env.XDG_CONFIG_HOME);

  const resolvedPath = configPath ?? getUserConfigPath();
  debugLog('Resolved config path:', resolvedPath);
  debugLog('Config file exists:', fs.existsSync(resolvedPath));

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
  debugLog('Merged config keys before schema parsing:', Object.keys(merged));
  if (isPlainObject(merged.agent_overrides)) {
    debugLog('agent_overrides keys:', Object.keys(merged.agent_overrides));
  } else {
    debugLog('agent_overrides is not an object:', merged.agent_overrides);
  }

  stripPrimaryAgentOverrides(merged as unknown as Record<string, unknown>);

  try {
    const parsed = orxaConfigSchema.parse(merged);
    debugLog('Schema validation succeeded');
    return parsed;
  } catch (error) {
    debugLog('Schema validation error:', error instanceof Error ? error.message : String(error));
    throw error;
  }
};
