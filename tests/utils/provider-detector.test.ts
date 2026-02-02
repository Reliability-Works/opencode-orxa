/**
 * Tests for provider-detector.ts
 */

import fs from "fs";
import path from "path";
import os from "os";
import {
  getOpenCodeConfigPath,
  getAuthConfigPath,
  readOpenCodeConfig,
  readAuthConfig,
  checkProviderAuth,
  detectProviders,
  getAuthenticatedProviders,
  getUnauthenticatedProviders,
  getAvailableModelsFromProviders,
  formatProviderName,
  getAuthInstructions,
} from "../../src/utils/provider-detector";

// Mock fs and path
jest.mock("fs");
jest.mock("os");

describe("Provider Detector", () => {
  const mockedFs = fs as jest.Mocked<typeof fs>;
  const mockedOs = os as jest.Mocked<typeof os>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedOs.homedir.mockReturnValue("/home/testuser");
  });

  describe("getOpenCodeConfigPath", () => {
    it("returns default path when env var not set", () => {
      delete process.env.OPENCODE_CONFIG_DIR;
      const result = getOpenCodeConfigPath();
      expect(result).toBe("/home/testuser/.config/opencode/opencode.json");
    });

    it("uses env var when set", () => {
      process.env.OPENCODE_CONFIG_DIR = "/custom/config";
      const result = getOpenCodeConfigPath();
      expect(result).toBe("/custom/config/opencode.json");
      delete process.env.OPENCODE_CONFIG_DIR;
    });
  });

  describe("getAuthConfigPath", () => {
    it("returns default path when env var not set", () => {
      delete process.env.OPENCODE_DATA_DIR;
      const result = getAuthConfigPath();
      expect(result).toBe("/home/testuser/.local/share/opencode/auth.json");
    });

    it("uses env var when set", () => {
      process.env.OPENCODE_DATA_DIR = "/custom/data";
      const result = getAuthConfigPath();
      expect(result).toBe("/custom/data/auth.json");
      delete process.env.OPENCODE_DATA_DIR;
    });
  });

  describe("readOpenCodeConfig", () => {
    it("returns null when file does not exist", () => {
      mockedFs.existsSync.mockReturnValue(false);
      const result = readOpenCodeConfig();
      expect(result).toBeNull();
    });

    it("returns parsed config when file exists", () => {
      const mockConfig = {
        provider: {
          opencode: { name: "OpenCode", models: {} },
        },
      };
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockConfig));
      
      const result = readOpenCodeConfig();
      expect(result).toEqual(mockConfig);
    });

    it("returns null when JSON is invalid", () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue("invalid json");
      
      const result = readOpenCodeConfig();
      expect(result).toBeNull();
    });
  });

  describe("readAuthConfig", () => {
    it("returns null when file does not exist", () => {
      mockedFs.existsSync.mockReturnValue(false);
      const result = readAuthConfig();
      expect(result).toBeNull();
    });

    it("returns parsed auth config when file exists", () => {
      const mockAuth = {
        opencode: { type: "api", key: "test-key" },
      };
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockAuth));
      
      const result = readAuthConfig();
      expect(result).toEqual(mockAuth);
    });
  });

  describe("checkProviderAuth", () => {
    it("returns not authenticated when auth config is null", () => {
      const result = checkProviderAuth("opencode", null);
      expect(result.authenticated).toBe(false);
      expect(result.type).toBe("none");
    });

    it("returns not authenticated when provider not in auth config", () => {
      const authConfig = { other: { type: "api", key: "key" } };
      const result = checkProviderAuth("opencode", authConfig);
      expect(result.authenticated).toBe(false);
    });

    it("returns authenticated for API key auth", () => {
      const authConfig = {
        opencode: { type: "api", key: "sk-test1234567890" },
      };
      const result = checkProviderAuth("opencode", authConfig);
      expect(result.authenticated).toBe(true);
      expect(result.type).toBe("api");
      expect(result.message).toContain("sk-t...7890");
    });

    it("returns authenticated for OAuth with valid token", () => {
      const authConfig = {
        openai: {
          type: "oauth",
          access: "valid-token",
          expires: Date.now() + 3600000, // 1 hour from now
        },
      };
      const result = checkProviderAuth("openai", authConfig);
      expect(result.authenticated).toBe(true);
      expect(result.type).toBe("oauth");
    });

    it("returns not authenticated for expired OAuth token", () => {
      const authConfig = {
        openai: {
          type: "oauth",
          access: "expired-token",
          expires: Date.now() - 3600000, // 1 hour ago
        },
      };
      const result = checkProviderAuth("openai", authConfig);
      expect(result.authenticated).toBe(false);
      expect(result.message).toContain("expired");
    });
  });

  describe("detectProviders", () => {
    it("returns opencode as fallback when no config exists", () => {
      mockedFs.existsSync.mockReturnValue(false);
      
      const result = detectProviders();
      
      expect(result.hasOpenCodeConfig).toBe(false);
      expect(result.hasAuthConfig).toBe(false);
      expect(result.providers.length).toBeGreaterThan(0);
      expect(result.providers.some((p) => p.id === "opencode")).toBe(true);
    });

    it("detects providers from opencode.json", () => {
      const mockConfig = {
        provider: {
          opencode: { name: "OpenCode", models: { "kimi-k2.5": { name: "Kimi" } } },
          openai: { name: "OpenAI", models: { "gpt-4": { name: "GPT-4" } } },
        },
      };
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockImplementation((path) => {
        if (path.toString().includes("opencode.json")) {
          return JSON.stringify(mockConfig);
        }
        return "{}";
      });
      
      const result = detectProviders();
      
      expect(result.hasOpenCodeConfig).toBe(true);
      expect(result.providers.some((p) => p.id === "opencode")).toBe(true);
      expect(result.providers.some((p) => p.id === "openai")).toBe(true);
    });

    it("checks auth status for each provider", () => {
      const mockConfig = {
        provider: {
          opencode: { name: "OpenCode", models: {} },
        },
      };
      const mockAuth = {
        opencode: { type: "api", key: "test-key" },
      };
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockImplementation((path) => {
        if (path.toString().includes("opencode.json")) {
          return JSON.stringify(mockConfig);
        }
        if (path.toString().includes("auth.json")) {
          return JSON.stringify(mockAuth);
        }
        return "{}";
      });
      
      const result = detectProviders();
      const opencodeProvider = result.providers.find((p) => p.id === "opencode");
      
      expect(opencodeProvider?.auth.authenticated).toBe(true);
    });

    it("does not hardcode models - discovers from config", () => {
      const mockConfig = {
        provider: {
          opencode: { 
            name: "OpenCode", 
            models: { 
              "custom-model": { name: "Custom Model" },
              "another-model": { name: "Another Model" },
            } 
          },
        },
      };
      const mockAuth = {
        opencode: { type: "api", key: "test-key" },
      };
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockImplementation((path) => {
        if (path.toString().includes("opencode.json")) {
          return JSON.stringify(mockConfig);
        }
        if (path.toString().includes("auth.json")) {
          return JSON.stringify(mockAuth);
        }
        return "{}";
      });
      
      const result = detectProviders();
      const opencodeProvider = result.providers.find((p) => p.id === "opencode");
      
      // Should discover models from config, not hardcode them
      expect(opencodeProvider?.models).toHaveLength(2);
      expect(opencodeProvider?.models[0].id).toBe("custom-model");
      expect(opencodeProvider?.models[1].id).toBe("another-model");
    });
  });

  describe("getAuthenticatedProviders", () => {
    it("returns only authenticated providers", () => {
      const detected = {
        configPath: "",
        authPath: "",
        hasOpenCodeConfig: true,
        hasAuthConfig: true,
        providers: [
          { id: "opencode", name: "OpenCode", available: true, auth: { authenticated: true, message: "" }, models: [] },
          { id: "openai", name: "OpenAI", available: true, auth: { authenticated: false, message: "" }, models: [] },
        ],
      };
      
      const result = getAuthenticatedProviders(detected);
      
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("opencode");
    });
  });

  describe("getUnauthenticatedProviders", () => {
    it("returns only unauthenticated and available providers", () => {
      const detected = {
        configPath: "",
        authPath: "",
        hasOpenCodeConfig: true,
        hasAuthConfig: true,
        providers: [
          { id: "opencode", name: "OpenCode", available: true, auth: { authenticated: true, message: "" }, models: [] },
          { id: "openai", name: "OpenAI", available: true, auth: { authenticated: false, message: "" }, models: [] },
          { id: "anthropic", name: "Anthropic", available: false, auth: { authenticated: false, message: "" }, models: [] },
        ],
      };
      
      const result = getUnauthenticatedProviders(detected);
      
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("openai");
    });
  });

  describe("getAvailableModelsFromProviders", () => {
    it("returns models from authenticated providers only", () => {
      const providers = [
        {
          id: "opencode",
          name: "OpenCode",
          available: true,
          auth: { authenticated: true, message: "" },
          models: [
            { id: "kimi-k2.5", fullId: "opencode/kimi-k2.5", name: "Kimi" },
          ],
        },
        {
          id: "anthropic",
          name: "Anthropic",
          available: true,
          auth: { authenticated: false, message: "Not authenticated" },
          models: [
            { id: "claude-3", fullId: "anthropic/claude-3", name: "Claude" },
          ],
        },
      ];
      
      const result = getAvailableModelsFromProviders(providers);
      
      expect(result).toHaveLength(1);
      expect(result[0].fullId).toBe("opencode/kimi-k2.5");
    });

    it("returns empty array when no authenticated providers", () => {
      const providers = [
        {
          id: "opencode",
          name: "OpenCode",
          available: true,
          auth: { authenticated: false, message: "" },
          models: [{ id: "kimi", fullId: "opencode/kimi", name: "Kimi" }],
        },
      ];
      
      const result = getAvailableModelsFromProviders(providers);
      
      expect(result).toHaveLength(0);
    });

    it("returns models from all authenticated providers", () => {
      const providers = [
        {
          id: "opencode",
          name: "OpenCode",
          available: true,
          auth: { authenticated: true, message: "" },
          models: [
            { id: "kimi", fullId: "opencode/kimi", name: "Kimi" },
          ],
        },
        {
          id: "openai",
          name: "OpenAI",
          available: true,
          auth: { authenticated: true, message: "" },
          models: [
            { id: "gpt-4", fullId: "openai/gpt-4", name: "GPT-4" },
            { id: "gpt-3.5", fullId: "openai/gpt-3.5", name: "GPT-3.5" },
          ],
        },
      ];
      
      const result = getAvailableModelsFromProviders(providers);
      
      expect(result).toHaveLength(3);
    });
  });

  describe("formatProviderName", () => {
    it("shows checkmark for authenticated provider", () => {
      const provider = {
        id: "opencode",
        name: "OpenCode",
        available: true,
        auth: { authenticated: true, message: "" },
        models: [],
      };
      
      const result = formatProviderName(provider);
      
      expect(result).toContain("✅");
      expect(result).toContain("OpenCode");
    });

    it("shows x for unauthenticated provider", () => {
      const provider = {
        id: "openai",
        name: "OpenAI",
        available: true,
        auth: { authenticated: false, message: "" },
        models: [],
      };
      
      const result = formatProviderName(provider);
      
      expect(result).toContain("❌");
      expect(result).toContain("OpenAI");
    });

    it("shows not configured for unavailable providers", () => {
      const provider = {
        id: "anthropic",
        name: "Anthropic",
        available: false,
        auth: { authenticated: false, message: "" },
        models: [],
      };
      
      const result = formatProviderName(provider);
      
      expect(result).toContain("not configured");
    });
  });

  describe("getAuthInstructions", () => {
    it("returns empty string for authenticated provider", () => {
      const provider = {
        id: "opencode",
        name: "OpenCode",
        available: true,
        auth: { authenticated: true, message: "" },
        models: [],
      };
      
      const result = getAuthInstructions(provider);
      
      expect(result).toBe("");
    });

    it("returns builtin auth instructions", () => {
      const provider = {
        id: "opencode",
        name: "OpenCode",
        available: true,
        auth: { authenticated: false, message: "" },
        authPlugin: "builtin",
        models: [],
      };
      
      const result = getAuthInstructions(provider);
      
      expect(result).toContain("opencode auth login");
    });

    it("returns plugin auth instructions", () => {
      const provider = {
        id: "openai",
        name: "OpenAI",
        available: true,
        auth: { authenticated: false, message: "" },
        authPlugin: "opencode-openai-codex-auth",
        models: [],
      };
      
      const result = getAuthInstructions(provider);
      
      expect(result).toContain("opencode plugin add");
    });
  });
});
