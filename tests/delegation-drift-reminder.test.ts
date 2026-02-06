import { defaultConfig } from "../src/config/default-config";
import {
  delegationDriftReminder,
  resetDelegationDriftReminderStateForTests,
} from "../src/hooks/delegation-drift-reminder";
import type { HookContext } from "../src/types";

describe("delegationDriftReminder", () => {
  const createContext = (overrides: Partial<HookContext> = {}): HookContext => ({
    toolName: "read",
    tool: { name: "read" },
    args: {},
    agentName: "orxa",
    agent: "orxa",
    config: defaultConfig,
    session: {
      id: "session-1",
      agentName: "orxa",
      manualEdits: 0,
      todos: [],
      messages: [],
    },
    sessionId: "session-1",
    ...overrides,
  });

  afterEach(() => {
    resetDelegationDriftReminderStateForTests();
  });

  it("does not remind non-orchestrator agents", () => {
    const context = createContext({
      agentName: "coder",
      agent: "coder",
      session: {
        id: "session-1",
        agentName: "coder",
        manualEdits: 0,
        todos: [],
        messages: [],
      },
    });

    const first = delegationDriftReminder(context);
    const second = delegationDriftReminder(context);
    const third = delegationDriftReminder(context);

    expect(first.injectMessage).toBeUndefined();
    expect(second.injectMessage).toBeUndefined();
    expect(third.injectMessage).toBeUndefined();
  });

  it("injects reminder after repeated self-work calls by orchestrator", () => {
    const context = createContext({ toolName: "read", tool: { name: "read" } });

    const first = delegationDriftReminder(context);
    const second = delegationDriftReminder(context);
    const third = delegationDriftReminder(context);

    expect(first.injectMessage).toBeUndefined();
    expect(second.injectMessage).toBeUndefined();
    expect(third.injectMessage).toContain("Delegation reminder:");
  });

  it("does not repeatedly inject reminder after threshold until delegation happens", () => {
    const context = createContext({ toolName: "read", tool: { name: "read" } });

    delegationDriftReminder(context);
    delegationDriftReminder(context);
    const third = delegationDriftReminder(context);
    const fourth = delegationDriftReminder(context);

    expect(third.injectMessage).toContain("Delegation reminder:");
    expect(fourth.injectMessage).toBeUndefined();
  });

  it("resets reminder state after delegation tool call", () => {
    const readContext = createContext({ toolName: "read", tool: { name: "read" } });
    delegationDriftReminder(readContext);
    delegationDriftReminder(readContext);
    delegationDriftReminder(readContext);

    const delegateContext = createContext({ toolName: "task", tool: { name: "task" } });
    const resetResult = delegationDriftReminder(delegateContext);
    expect(resetResult.injectMessage).toBeUndefined();

    const againFirst = delegationDriftReminder(readContext);
    const againSecond = delegationDriftReminder(readContext);
    const againThird = delegationDriftReminder(readContext);

    expect(againFirst.injectMessage).toBeUndefined();
    expect(againSecond.injectMessage).toBeUndefined();
    expect(againThird.injectMessage).toContain("Delegation reminder:");
  });

  it("counts aliased implementation tools as self-work", () => {
    const patchContext = createContext({
      toolName: "apply_patch",
      tool: { name: "apply_patch" },
    });

    const first = delegationDriftReminder(patchContext);
    const second = delegationDriftReminder(patchContext);
    const third = delegationDriftReminder(patchContext);

    expect(first.injectMessage).toBeUndefined();
    expect(second.injectMessage).toBeUndefined();
    expect(third.injectMessage).toContain("Delegation reminder:");
  });
});
