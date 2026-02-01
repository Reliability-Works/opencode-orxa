import { loadOrxaAgents, createConfigHandler } from "../src/config-handler";
import path from "path";

// Mock js-yaml - use actual yaml parsing for integration test
// The real js-yaml will be used since it's installed

describe("Config Handler", () => {
  describe("loadOrxaAgents", () => {
    it("loads all orxa agents from YAML files", () => {
      const agents = loadOrxaAgents();

      // Should have orxa and plan as primary agents
      expect(agents).toHaveProperty("orxa");
      expect(agents).toHaveProperty("plan");

      // Should have subagents
      expect(agents).toHaveProperty("strategist");
      expect(agents).toHaveProperty("reviewer");
      expect(agents).toHaveProperty("build");
      expect(agents).toHaveProperty("coder");
      expect(agents).toHaveProperty("frontend");
      expect(agents).toHaveProperty("architect");
      expect(agents).toHaveProperty("git");
      expect(agents).toHaveProperty("explorer");
      expect(agents).toHaveProperty("librarian");
      expect(agents).toHaveProperty("navigator");
      expect(agents).toHaveProperty("writer");
      expect(agents).toHaveProperty("multimodal");
      expect(agents).toHaveProperty("mobile-simulator");

      // Should have 15 total agents
      expect(Object.keys(agents)).toHaveLength(15);
    });

    it("parses orxa agent correctly", () => {
      const agents = loadOrxaAgents();
      const orxa = agents.orxa;

      expect(orxa.name).toBe("orxa");
      expect(orxa.description).toContain("Workforce Orchestrator");
      expect(orxa.mode).toBe("primary");
      expect(orxa.model).toBe("opencode/kimi-k2.5");
      // Temperature may be parsed as string from YAML
      expect(Number(orxa.temperature)).toBe(0.1);
      expect(orxa.system_prompt).toContain("Engineering Manager");
      expect(orxa.tools?.allowed).toContain("read");
      expect(orxa.tools?.allowed).toContain("delegate_task");
      expect(orxa.tools?.blocked).toContain("grep");
      expect(orxa.tools?.blocked).toContain("glob");
    });

    it("parses plan agent correctly", () => {
      const agents = loadOrxaAgents();
      const plan = agents.plan;

      expect(plan.name).toBe("plan");
      expect(plan.description).toContain("Strategic Planning Consultant");
      expect(plan.mode).toBe("primary");
      expect(plan.model).toBe("opencode/gpt-5.2-codex");
    });

    it("parses subagent correctly", () => {
      const agents = loadOrxaAgents();
      const strategist = agents.strategist;

      expect(strategist.name).toBe("strategist");
      expect(strategist.description).toContain("Pre-planning consultant");
      expect(strategist.mode).toBe("subagent");
    });
  });

  describe("createConfigHandler", () => {
    it("replaces config.agent with orxa agents", async () => {
      const handler = createConfigHandler();
      const config: Record<string, unknown> = {
        agent: {
          someUserAgent: {
            name: "someUserAgent",
            description: "User agent that should be removed",
            mode: "primary",
          },
        },
        default_agent: "someUserAgent",
      };

      await handler(config);

      // Should have replaced agent with orxa agents only
      expect(config.agent).toBeDefined();
      const agents = config.agent as Record<string, unknown>;
      expect(agents).toHaveProperty("orxa");
      expect(agents).toHaveProperty("plan");
      expect(agents).not.toHaveProperty("someUserAgent");

      // Should have 15 orxa agents
      expect(Object.keys(agents)).toHaveLength(15);
    });

    it("sets default_agent to orxa", async () => {
      const handler = createConfigHandler();
      const config: Record<string, unknown> = {
        agent: {},
        default_agent: "other",
      };

      await handler(config);

      expect(config.default_agent).toBe("orxa");
    });

    it("handles empty config", async () => {
      const handler = createConfigHandler();
      const config: Record<string, unknown> = {};

      await handler(config);

      expect(config.agent).toBeDefined();
      expect(config.default_agent).toBe("orxa");
      const agents = config.agent as Record<string, unknown>;
      expect(Object.keys(agents)).toHaveLength(15);
    });
  });
});
