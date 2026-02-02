/**
 * Tests for model-recommendations.ts
 * 
 * Tests the new role-based approach without hardcoded model IDs.
 */

import {
  ROLE_DESCRIPTIONS,
  SUBAGENT_ROLE_INFO,
  SPECIALIZED_SUBAGENT_MODELS,
  getRoleDescription,
  getSubagentRoleInfo,
  formatRoleDescription,
  formatAvailableProviders,
  getModelExamples,
  formatSubagentRoleInfo,
  isValidModelId,
  parseModelId,
} from "../../src/utils/model-recommendations";
import {
  getAvailableModelsFromProviders,
  type ProviderInfo,
} from "../../src/utils/provider-detector";

describe("Model Recommendations", () => {
  describe("ROLE_DESCRIPTIONS", () => {
    it("has descriptions for all roles", () => {
      expect(ROLE_DESCRIPTIONS.orxa).toBeDefined();
      expect(ROLE_DESCRIPTIONS.plan).toBeDefined();
      expect(ROLE_DESCRIPTIONS.subagent).toBeDefined();
    });

    it("has required fields for orxa role", () => {
      const orxa = ROLE_DESCRIPTIONS.orxa;
      expect(orxa.role).toBe("orxa");
      expect(orxa.title).toBeDefined();
      expect(orxa.description).toBeDefined();
      expect(orxa.capabilities).toBeInstanceOf(Array);
      expect(orxa.capabilities.length).toBeGreaterThan(0);
      expect(orxa.suggestedProviderTypes).toBeInstanceOf(Array);
      expect(orxa.defaultModel).toBeDefined();
    });

    it("has required fields for plan role", () => {
      const plan = ROLE_DESCRIPTIONS.plan;
      expect(plan.role).toBe("plan");
      expect(plan.title).toBeDefined();
      expect(plan.description).toBeDefined();
      expect(plan.capabilities).toBeInstanceOf(Array);
      expect(plan.capabilities.length).toBeGreaterThan(0);
      expect(plan.suggestedProviderTypes).toBeInstanceOf(Array);
      expect(plan.defaultModel).toBeDefined();
    });

    it("has required fields for subagent role", () => {
      const subagent = ROLE_DESCRIPTIONS.subagent;
      expect(subagent.role).toBe("subagent");
      expect(subagent.title).toBeDefined();
      expect(subagent.description).toBeDefined();
      expect(subagent.capabilities).toBeInstanceOf(Array);
      expect(subagent.capabilities.length).toBeGreaterThan(0);
      expect(subagent.suggestedProviderTypes).toBeInstanceOf(Array);
      expect(subagent.defaultModel).toBeDefined();
    });
  });

  describe("SUBAGENT_ROLE_INFO", () => {
    it("has entries for specialized subagents", () => {
      expect(SUBAGENT_ROLE_INFO.build).toBeDefined();
      expect(SUBAGENT_ROLE_INFO.architect).toBeDefined();
      expect(SUBAGENT_ROLE_INFO.frontend).toBeDefined();
      expect(SUBAGENT_ROLE_INFO.multimodal).toBeDefined();
    });

    it("has required fields for each subagent", () => {
      for (const [name, info] of Object.entries(SUBAGENT_ROLE_INFO)) {
        expect(info.description).toBeDefined();
        expect(info.description.length).toBeGreaterThan(0);
        expect(info.capabilities).toBeInstanceOf(Array);
        expect(info.capabilities.length).toBeGreaterThan(0);
        expect(info.suggestedProviderTypes).toBeInstanceOf(Array);
      }
    });
  });

  describe("SPECIALIZED_SUBAGENT_MODELS", () => {
    it("is initially empty (user-configurable)", () => {
      // This should be empty by default - users configure their own
      expect(Object.keys(SPECIALIZED_SUBAGENT_MODELS).length).toBe(0);
    });
  });

  describe("getRoleDescription", () => {
    it("returns orxa description for orxa role", () => {
      const result = getRoleDescription("orxa");
      expect(result.role).toBe("orxa");
      expect(result).toBe(ROLE_DESCRIPTIONS.orxa);
    });

    it("returns plan description for plan role", () => {
      const result = getRoleDescription("plan");
      expect(result.role).toBe("plan");
      expect(result).toBe(ROLE_DESCRIPTIONS.plan);
    });

    it("returns subagent description for subagent role", () => {
      const result = getRoleDescription("subagent");
      expect(result.role).toBe("subagent");
      expect(result).toBe(ROLE_DESCRIPTIONS.subagent);
    });
  });

  describe("getSubagentRoleInfo", () => {
    it("returns info for known subagents", () => {
      const result = getSubagentRoleInfo("build");
      expect(result).toBeDefined();
      expect(result?.description).toBeDefined();
    });

    it("returns null for unknown subagent", () => {
      const result = getSubagentRoleInfo("unknown-agent");
      expect(result).toBeNull();
    });
  });

  describe("formatRoleDescription", () => {
    it("formats orxa role description", () => {
      const result = formatRoleDescription("orxa");
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toContain("Orxa");
    });

    it("includes role description", () => {
      const result = formatRoleDescription("plan");
      expect(result.some((line) => line.includes("Role:"))).toBe(true);
    });

    it("includes capabilities", () => {
      const result = formatRoleDescription("subagent");
      expect(result.some((line) => line.includes("Needs:"))).toBe(true);
    });
  });

  describe("formatAvailableProviders", () => {
    it("shows warning when no authenticated providers", () => {
      const providers: ProviderInfo[] = [];
      const result = formatAvailableProviders(providers);
      expect(result[0]).toContain("⚠️");
    });

    it("shows authenticated providers", () => {
      const providers: ProviderInfo[] = [
        {
          id: "opencode",
          name: "OpenCode",
          available: true,
          auth: { authenticated: true, message: "" },
          models: [],
        },
      ];
      const result = formatAvailableProviders(providers);
      expect(result[0]).toContain("Available providers:");
      expect(result[1]).toContain("✅");
      expect(result[1]).toContain("OpenCode");
    });
  });

  describe("getModelExamples", () => {
    it("returns example models", () => {
      const result = getModelExamples();
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toContain("Examples:");
    });

    it("includes provider/model format examples", () => {
      const result = getModelExamples();
      const hasFormatExample = result.some((line) =>
        line.includes("/")
      );
      expect(hasFormatExample).toBe(true);
    });
  });

  describe("formatSubagentRoleInfo", () => {
    it("formats known subagent info", () => {
      const result = formatSubagentRoleInfo("build");
      expect(result).toBeInstanceOf(Array);
      expect(result[0]).toContain("build:");
    });

    it("returns generic message for unknown subagent", () => {
      const result = formatSubagentRoleInfo("unknown");
      expect(result[0]).toContain("General purpose subagent");
    });
  });

  describe("isValidModelId", () => {
    it("returns true for valid model IDs", () => {
      expect(isValidModelId("opencode/kimi-k2.5")).toBe(true);
      expect(isValidModelId("anthropic/claude-3-5-sonnet")).toBe(true);
      expect(isValidModelId("openai/gpt-4o")).toBe(true);
    });

    it("returns false for invalid model IDs", () => {
      expect(isValidModelId("invalid")).toBe(false);
      expect(isValidModelId("")).toBe(false);
      expect(isValidModelId("too/many/slashes")).toBe(false);
    });
  });

  describe("parseModelId", () => {
    it("parses valid model IDs", () => {
      const result = parseModelId("opencode/kimi-k2.5");
      expect(result).toEqual({
        provider: "opencode",
        model: "kimi-k2.5",
      });
    });

    it("returns null for invalid model IDs", () => {
      expect(parseModelId("invalid")).toBeNull();
      expect(parseModelId("")).toBeNull();
    });
  });

  describe("getAvailableModelsFromProviders", () => {
    it("returns models from authenticated providers", () => {
      const providers: ProviderInfo[] = [
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
      const providers: ProviderInfo[] = [
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
  });
});
