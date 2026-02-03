import {
  parseAgentModels,
  getProvidersForModel,
  formatModelName,
  formatProviderOptions,
  getRecommendedProviderSetup,
  formatAgentListForModel,
  canOpenCodeAccessAllModels,
  MODEL_PROVIDER_ACCESS,
  PROVIDER_DISPLAY_NAMES,
} from "../src/utils/agent-models";

describe("Agent Models Parser", () => {
  describe("parseAgentModels", () => {
    it("should parse all agent YAML files", () => {
      const config = parseAgentModels();
      
      // Should have 17 agents (2 primary + 15 subagents including orxa-worker and orxa-planner)
      expect(config.agents.length).toBe(17);
      
      // Should have 5 unique models (including kimi-for-coding/kimi-k2.5)
      expect(config.uniqueModels).toHaveLength(5);
      expect(config.uniqueModels).toContain("kimi-for-coding/kimi-k2.5");
      expect(config.uniqueModels).toContain("opencode/kimi-k2.5");
      expect(config.uniqueModels).toContain("opencode/gpt-5.2-codex");
      expect(config.uniqueModels).toContain("opencode/gemini-3-pro");
      expect(config.uniqueModels).toContain("opencode/gemini-3-flash");
    });

    it("should identify primary agents correctly", () => {
      const config = parseAgentModels();
      
      const primaryAgents = config.agents.filter((a) => a.mode === "primary");
      expect(primaryAgents).toHaveLength(2);
      
      const primaryNames = primaryAgents.map((a) => a.name);
      expect(primaryNames).toContain("orxa");
      expect(primaryNames).toContain("plan");
    });

    it("should group agents by model correctly", () => {
      const config = parseAgentModels();
      
      // Find kimi-k2.5 group (orxa now uses kimi-for-coding/kimi-k2.5)
      const kimiGroup = config.models.find((m) => m.model === "kimi-for-coding/kimi-k2.5");
      expect(kimiGroup).toBeDefined();
      expect(kimiGroup!.count).toBe(1); // orxa only
      
      // Find gpt-5.2-codex group
      const gptGroup = config.models.find((m) => m.model === "opencode/gpt-5.2-codex");
      expect(gptGroup).toBeDefined();
      expect(gptGroup!.count).toBe(6); // plan + 5 subagents
    });

    it("should parse orxa agent with correct model", () => {
      const config = parseAgentModels();
      
      const orxa = config.agents.find((a) => a.name === "orxa");
      expect(orxa).toBeDefined();
      expect(orxa!.model).toBe("kimi-for-coding/kimi-k2.5");
      expect(orxa!.mode).toBe("primary");
    });

    it("should parse plan agent with correct model", () => {
      const config = parseAgentModels();
      
      const plan = config.agents.find((a) => a.name === "plan");
      expect(plan).toBeDefined();
      expect(plan!.model).toBe("opencode/gpt-5.2-codex");
      expect(plan!.mode).toBe("primary");
    });

    it("should parse frontend agent with gemini-3-pro", () => {
      const config = parseAgentModels();
      
      const frontend = config.agents.find((a) => a.name === "frontend");
      expect(frontend).toBeDefined();
      expect(frontend!.model).toBe("opencode/gemini-3-pro");
    });

    it("should parse multimodal agent with gemini-3-flash", () => {
      const config = parseAgentModels();
      
      const multimodal = config.agents.find((a) => a.name === "multimodal");
      expect(multimodal).toBeDefined();
      expect(multimodal!.model).toBe("opencode/gemini-3-flash");
    });
  });

  describe("getProvidersForModel", () => {
    it("should return correct providers for kimi-k2.5", () => {
      const providers = getProvidersForModel("opencode/kimi-k2.5");
      expect(providers).toContain("opencode");
      expect(providers).toContain("kimi-for-coding");
    });

    it("should return correct providers for gpt-5.2-codex", () => {
      const providers = getProvidersForModel("opencode/gpt-5.2-codex");
      expect(providers).toContain("opencode");
      expect(providers).toContain("openai");
    });

    it("should return correct providers for gemini models", () => {
      const proProviders = getProvidersForModel("opencode/gemini-3-pro");
      expect(proProviders).toContain("opencode");
      expect(proProviders).toContain("google");

      const flashProviders = getProvidersForModel("opencode/gemini-3-flash");
      expect(flashProviders).toContain("opencode");
      expect(flashProviders).toContain("google");
    });

    it("should default to opencode for unknown models", () => {
      const providers = getProvidersForModel("unknown/model");
      expect(providers).toEqual(["opencode"]);
    });
  });

  describe("formatModelName", () => {
    it("should extract model name from full ID", () => {
      expect(formatModelName("opencode/kimi-k2.5")).toBe("kimi-k2.5");
      expect(formatModelName("opencode/gpt-5.2-codex")).toBe("gpt-5.2-codex");
    });

    it("should return full string if no slash", () => {
      expect(formatModelName("kimi-k2.5")).toBe("kimi-k2.5");
    });
  });

  describe("formatProviderOptions", () => {
    it("should format provider list with display names", () => {
      const formatted = formatProviderOptions(["opencode", "openai"]);
      expect(formatted).toContain("OpenCode");
      expect(formatted).toContain("OpenAI");
      expect(formatted).toContain("OR");
    });
  });

  describe("getRecommendedProviderSetup", () => {
    it("should recommend opencode when all models are accessible", () => {
      const setup = getRecommendedProviderSetup([
        "opencode/kimi-k2.5",
        "opencode/gpt-5.2-codex",
      ]);
      
      expect(setup.recommended).toBe("opencode");
      expect(setup.providersNeeded).toEqual(["opencode"]);
      expect(setup.reason).toContain("one authentication");
    });

    it("should recommend individual when opencode cannot access all", () => {
      // Mock a scenario where opencode can't access a model
      const originalAccess = { ...MODEL_PROVIDER_ACCESS };
      MODEL_PROVIDER_ACCESS["test/custom-model"] = ["custom-provider"];
      
      const setup = getRecommendedProviderSetup([
        "opencode/kimi-k2.5",
        "test/custom-model",
      ]);
      
      expect(setup.recommended).toBe("individual");
      expect(setup.providersNeeded).toContain("opencode");
      expect(setup.providersNeeded).toContain("custom-provider");
      
      // Restore
      delete MODEL_PROVIDER_ACCESS["test/custom-model"];
    });
  });

  describe("formatAgentListForModel", () => {
    it("should format primary + subagents correctly", () => {
      const agents = [
        { name: "orxa", model: "opencode/kimi-k2.5", mode: "primary" as const },
        { name: "coder", model: "opencode/kimi-k2.5", mode: "subagent" as const },
        { name: "git", model: "opencode/kimi-k2.5", mode: "subagent" as const },
      ];
      
      const formatted = formatAgentListForModel(agents);
      expect(formatted).toContain("orxa");
      expect(formatted).toContain("coder");
      expect(formatted).toContain("git");
    });

    it("should show count for many subagents", () => {
      const agents = [
        { name: "orxa", model: "opencode/kimi-k2.5", mode: "primary" as const },
        { name: "a", model: "opencode/kimi-k2.5", mode: "subagent" as const },
        { name: "b", model: "opencode/kimi-k2.5", mode: "subagent" as const },
        { name: "c", model: "opencode/kimi-k2.5", mode: "subagent" as const },
        { name: "d", model: "opencode/kimi-k2.5", mode: "subagent" as const },
      ];
      
      const formatted = formatAgentListForModel(agents);
      expect(formatted).toContain("4 subagents");
    });
  });

  describe("canOpenCodeAccessAllModels", () => {
    it("should return true when opencode can access all models", () => {
      const result = canOpenCodeAccessAllModels([
        "opencode/kimi-k2.5",
        "opencode/gpt-5.2-codex",
      ]);
      expect(result).toBe(true);
    });
  });

  describe("MODEL_PROVIDER_ACCESS", () => {
    it("should have all required models", () => {
      expect("opencode/kimi-k2.5" in MODEL_PROVIDER_ACCESS).toBe(true);
      expect("opencode/gpt-5.2-codex" in MODEL_PROVIDER_ACCESS).toBe(true);
      expect("opencode/gemini-3-pro" in MODEL_PROVIDER_ACCESS).toBe(true);
      expect("opencode/gemini-3-flash" in MODEL_PROVIDER_ACCESS).toBe(true);
    });

    it("should have opencode as first option for all models", () => {
      for (const providers of Object.values(MODEL_PROVIDER_ACCESS)) {
        expect(providers[0]).toBe("opencode");
      }
    });
  });

  describe("PROVIDER_DISPLAY_NAMES", () => {
    it("should have display names for all providers", () => {
      expect(PROVIDER_DISPLAY_NAMES["opencode"]).toBe("OpenCode");
      expect(PROVIDER_DISPLAY_NAMES["openai"]).toBe("OpenAI");
      expect(PROVIDER_DISPLAY_NAMES["google"]).toBe("Google");
      expect(PROVIDER_DISPLAY_NAMES["kimi-for-coding"]).toBe("Kimi for Coding");
    });
  });
});
