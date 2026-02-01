import { defaultConfig } from "../src/config/default-config";
import { preToolExecution } from "../src/hooks/pre-tool-execution";
import { todoContinuationEnforcer } from "../src/hooks/todo-continuation-enforcer";
import type { OrxaConfig } from "../src/config/schema";
import type { HookContext, Session } from "../src/types";

const buildSession = (overrides?: Partial<Session>): Session => ({
  id: "session-1",
  agentName: "orxa",
  manualEdits: 0,
  todos: [],
  messages: [],
  recentMessages: [],
  ...overrides,
});

describe("Todo Continuation Enforcer", () => {
  it("blocks stopping responses when pending todos and strict", async () => {
    const session = buildSession({
      todos: [
        { id: "1", text: "Finish tests", completed: false },
        { id: "2", text: "Update docs", completed: true },
      ],
    });

    const context: HookContext = {
      args: {},
      config: defaultConfig,
      session,
      response: "Let me know if you need anything else.",
    };

    const result = await todoContinuationEnforcer(context);
    expect(result.blockResponse).toBe(true);
    expect(result.injectMessage).toContain("pending TODO");
    expect(result.injectMessage).toContain("Finish tests");
  });

  it("warns but does not block when set to warn", async () => {
    const session = buildSession({
      todos: [{ id: "1", text: "Ship fix", completed: false }],
    });
    const config = {
      ...defaultConfig,
      orxa: {
        ...defaultConfig.orxa,
        enforcement: {
          ...defaultConfig.orxa.enforcement,
          todoCompletion: "warn",
        },
      },
    } satisfies OrxaConfig;

    const context: HookContext = {
      args: {},
      config,
      session,
      response: "Anything else you'd like me to do?",
    };

    const result = await todoContinuationEnforcer(context);
    expect(result.blockResponse).toBe(false);
    expect(result.injectMessage).toContain("Ship fix");
  });

  it("allows requirement questions even with pending todos", async () => {
    const session = buildSession({
      todos: [{ id: "1", text: "Investigate bug", completed: false }],
    });

    const context: HookContext = {
      args: {},
      config: defaultConfig,
      session,
      response: "Can you confirm the API base URL?",
    };

    const result = await todoContinuationEnforcer(context);
    expect(result.injectMessage).toBeUndefined();
    expect(result.blockResponse).toBeUndefined();
  });

  it("returns empty when no pending todos", async () => {
    const session = buildSession({
      todos: [{ id: "1", text: "Done", completed: true }],
    });

    const context: HookContext = {
      args: {},
      config: defaultConfig,
      session,
      response: "Let me know if you need anything else.",
    };

    const result = await todoContinuationEnforcer(context);
    expect(result.injectMessage).toBeUndefined();
    expect(result.blockResponse).toBeUndefined();
  });
});

describe("Todo Continuation Enforcer pre-tool checks", () => {
  it("blocks question tool when stopping questions are asked", async () => {
    const session = buildSession({
      todos: [{ id: "1", text: "Finish task", completed: false }],
    });
    const config = {
      ...defaultConfig,
      orxa: {
        ...defaultConfig.orxa,
        allowedTools: [...defaultConfig.orxa.allowedTools, "question"],
      },
    };

    const context: HookContext = {
      args: {
        questions: [{ question: "What would you like me to do next?" }],
      },
      toolName: "question",
      tool: { name: "question" },
      config,
      session,
      agentName: "orxa",
    };

    const result = await preToolExecution(context);
    expect(result.allow).toBe(false);
    expect(result.message).toContain("TODO CONTINUATION ENFORCER");
  });
});
