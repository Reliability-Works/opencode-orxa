/**
 * Provider Detector - Detects available providers from OpenCode configuration
 * and checks authentication status.
 *
 * Based on oh-my-opencode's setup wizard pattern.
 */

import fs from "fs";
import path from "path";
import os from "os";

export interface ProviderInfo {
  /** Provider ID (e.g., 'opencode', 'anthropic', 'openai', 'google') */
  id: string;
  /** Display name */
  name: string;
  /** Whether this provider is available in opencode.json */
  available: boolean;
  /** Authentication status */
  auth: AuthStatus;
  /** Available models for this provider */
  models: ModelInfo[];
  /** Auth plugin name (for authentication instructions) */
  authPlugin?: string;
}

export interface ModelInfo {
  /** Model ID (e.g., 'kimi-k2.5') */
  id: string;
  /** Full model identifier (e.g., 'opencode/kimi-k2.5') */
  fullId: string;
  /** Display name */
  name: string;
  /** Whether the model supports attachments */
  supportsAttachments?: boolean;
  /** Context window size */
  contextWindow?: number;
}

export interface AuthStatus {
  /** Whether the provider is authenticated */
  authenticated: boolean;
  /** Authentication type ('api', 'oauth', 'none') */
  type?: "api" | "oauth" | "none";
  /** Human-readable status message */
  message: string;
}

export interface DetectedConfig {
  /** Path to opencode.json */
  configPath: string;
  /** Path to auth.json */
  authPath: string;
  /** Available providers */
  providers: ProviderInfo[];
  /** Whether opencode.json exists */
  hasOpenCodeConfig: boolean;
  /** Whether auth.json exists */
  hasAuthConfig: boolean;
}

// Provider to auth plugin mapping
const PROVIDER_AUTH_PLUGINS: Record<string, string> = {
  opencode: "builtin",
  anthropic: "builtin",
  openai: "opencode-openai-codex-auth",
  google: "builtin",
  "kimi-for-coding": "builtin",
};

// Provider display names
const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  opencode: "OpenCode",
  anthropic: "Anthropic",
  openai: "OpenAI",
  google: "Google",
  "kimi-for-coding": "Kimi for Coding",
};

// Model to provider access mapping - which providers can access each model
export const MODEL_PROVIDER_ACCESS: Record<string, string[]> = {
  "opencode/kimi-k2.5": ["opencode", "kimi-for-coding"],
  "opencode/gpt-5.2-codex": ["opencode", "openai"],
  "opencode/gemini-3-pro": ["opencode", "google"],
  "opencode/gemini-3-flash": ["opencode", "google"],
};

/**
 * Get providers that can access a specific model
 */
export const getProvidersForModel = (model: string): string[] => {
  return MODEL_PROVIDER_ACCESS[model] || ["opencode"];
};

/**
 * Check if a specific provider can access a model
 */
export const canProviderAccessModel = (providerId: string, model: string): boolean => {
  const providers = getProvidersForModel(model);
  return providers.includes(providerId);
};

/**
 * Get all models accessible by a provider
 */
export const getModelsForProvider = (providerId: string): string[] => {
  const models: string[] = [];
  for (const [model, providers] of Object.entries(MODEL_PROVIDER_ACCESS)) {
    if (providers.includes(providerId)) {
      models.push(model);
    }
  }
  return models;
};

/**
 * Check if opencode provider can access all given models
 */
export const canOpenCodeAccessAllModels = (models: string[]): boolean => {
  return models.every((model) => canProviderAccessModel("opencode", model));
};

/**
 * Get the path to opencode.json
 */
export const getOpenCodeConfigPath = (): string => {
  const configDir = process.env.OPENCODE_CONFIG_DIR || path.join(os.homedir(), ".config", "opencode");
  return path.join(configDir, "opencode.json");
};

/**
 * Get the path to auth.json
 */
export const getAuthConfigPath = (): string => {
  const dataDir = process.env.OPENCODE_DATA_DIR || path.join(os.homedir(), ".local", "share", "opencode");
  return path.join(dataDir, "auth.json");
};

/**
 * Read and parse opencode.json
 */
export const readOpenCodeConfig = (): Record<string, unknown> | null => {
  try {
    const configPath = getOpenCodeConfigPath();
    if (!fs.existsSync(configPath)) {
      return null;
    }
    const content = fs.readFileSync(configPath, "utf-8");
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    return null;
  }
};

/**
 * Read and parse auth.json
 */
export const readAuthConfig = (): Record<string, unknown> | null => {
  try {
    const authPath = getAuthConfigPath();
    if (!fs.existsSync(authPath)) {
      return null;
    }
    const content = fs.readFileSync(authPath, "utf-8");
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    return null;
  }
};

/**
 * Check if a provider is authenticated
 */
export const checkProviderAuth = (
  providerId: string,
  authConfig: Record<string, unknown> | null
): AuthStatus => {
  if (!authConfig) {
    return {
      authenticated: false,
      type: "none",
      message: "Not authenticated",
    };
  }

  const providerAuth = authConfig[providerId] as Record<string, unknown> | undefined;

  if (!providerAuth) {
    return {
      authenticated: false,
      type: "none",
      message: "Not authenticated",
    };
  }

  const authType = (providerAuth.type as string) || "api";

  // Check for API key
  if (authType === "api" && providerAuth.key) {
    const key = providerAuth.key as string;
    // Mask the key for display
    const maskedKey = key.length > 8 ? `${key.slice(0, 4)}...${key.slice(-4)}` : "****";
    return {
      authenticated: true,
      type: "api",
      message: `API key configured (${maskedKey})`,
    };
  }

  // Check for OAuth tokens
  if (authType === "oauth" && providerAuth.access) {
    // Check if token is expired
    const expires = providerAuth.expires as number | undefined;
    if (expires && Date.now() > expires) {
      return {
        authenticated: false,
        type: "oauth",
        message: "OAuth token expired",
      };
    }
    return {
      authenticated: true,
      type: "oauth",
      message: "OAuth authenticated",
    };
  }

  return {
    authenticated: false,
    type: authType as "api" | "oauth" | "none",
    message: "Authentication incomplete",
  };
};

/**
 * Extract models from provider config
 * Discovers models from user's opencode.json, doesn't hardcode them
 */
const extractModels = (
  providerId: string,
  providerConfig: Record<string, unknown> | undefined
): ModelInfo[] => {
  const models: ModelInfo[] = [];

  if (providerConfig?.models && typeof providerConfig.models === "object") {
    const configModels = providerConfig.models as Record<string, Record<string, unknown>>;
    
    for (const [modelId, modelConfig] of Object.entries(configModels)) {
      const fullId = `${providerId}/${modelId}`;
      
      models.push({
        id: modelId,
        fullId,
        name: (modelConfig.name as string) || modelId,
        supportsAttachments: Boolean(modelConfig.attachment),
        contextWindow: (modelConfig.limit as Record<string, number>)?.context,
      });
    }
  }

  return models;
};

/**
 * Detect available providers from OpenCode configuration
 */
export const detectProviders = (): DetectedConfig => {
  const configPath = getOpenCodeConfigPath();
  const authPath = getAuthConfigPath();
  
  const openCodeConfig = readOpenCodeConfig();
  const authConfig = readAuthConfig();
  
  const providers: ProviderInfo[] = [];
  
  // Always include opencode as a fallback
  const opencodeAuth = checkProviderAuth("opencode", authConfig);
  const opencodeConfig = openCodeConfig?.provider && typeof openCodeConfig.provider === "object"
    ? (openCodeConfig.provider as Record<string, Record<string, unknown>>).opencode
    : undefined;
  providers.push({
    id: "opencode",
    name: "OpenCode",
    available: true,
    auth: opencodeAuth,
    models: extractModels("opencode", opencodeConfig),
    authPlugin: PROVIDER_AUTH_PLUGINS.opencode,
  });

  // Check for other providers in config
  if (openCodeConfig?.provider && typeof openCodeConfig.provider === "object") {
    const providerConfig = openCodeConfig.provider as Record<string, Record<string, unknown>>;
    
    for (const [providerId, config] of Object.entries(providerConfig)) {
      if (providerId === "opencode") continue; // Already added
      
      const auth = checkProviderAuth(providerId, authConfig);
      const displayName = (config.name as string) || providerId;
      
      providers.push({
        id: providerId,
        name: displayName,
        available: true,
        auth,
        models: extractModels(providerId, config),
        authPlugin: PROVIDER_AUTH_PLUGINS[providerId],
      });
    }
  }

  // Add known providers that aren't in config yet (no hardcoded models)
  const knownProviders = ["anthropic", "openai", "google", "kimi-for-coding"];
  for (const providerId of knownProviders) {
    if (!providers.some((p) => p.id === providerId)) {
      const auth = checkProviderAuth(providerId, authConfig);
      
      providers.push({
        id: providerId,
        name: PROVIDER_DISPLAY_NAMES[providerId] || providerId.charAt(0).toUpperCase() + providerId.slice(1).replace(/-/g, " "),
        available: false,
        auth,
        models: [], // No hardcoded models - user must configure
        authPlugin: PROVIDER_AUTH_PLUGINS[providerId],
      });
    }
  }

  return {
    configPath,
    authPath,
    providers,
    hasOpenCodeConfig: openCodeConfig !== null,
    hasAuthConfig: authConfig !== null,
  };
};

/**
 * Get authenticated providers only
 */
export const getAuthenticatedProviders = (detected: DetectedConfig): ProviderInfo[] => {
  return detected.providers.filter((p) => p.auth.authenticated);
};

/**
 * Get providers needing authentication
 */
export const getUnauthenticatedProviders = (detected: DetectedConfig): ProviderInfo[] => {
  return detected.providers.filter((p) => !p.auth.authenticated && p.available);
};

/**
 * Get all available models from authenticated providers
 * Returns models discovered from user's opencode.json, not hardcoded
 */
export const getAvailableModelsFromProviders = (
  providers: ProviderInfo[]
): ModelInfo[] => {
  const models: ModelInfo[] = [];
  
  for (const provider of providers) {
    if (provider.auth.authenticated) {
      models.push(...provider.models);
    }
  }
  
  return models;
};

/**
 * Format provider name for display
 */
export const formatProviderName = (provider: ProviderInfo): string => {
  const authEmoji = provider.auth.authenticated ? "✅" : "❌";
  const availableEmoji = provider.available ? "" : " (not configured)";
  return `${authEmoji} ${provider.name}${availableEmoji}`;
};

/**
 * Get authentication instructions for a provider
 */
export const getAuthInstructions = (provider: ProviderInfo): string => {
  if (provider.auth.authenticated) {
    return "";
  }

  const plugin = provider.authPlugin || "builtin";
  
  if (plugin === "builtin") {
    return `Run: opencode auth login\nThen select: ${provider.name}`;
  }
  
  return `Install plugin: opencode plugin add ${plugin}\nThen run: opencode auth login`;
};
