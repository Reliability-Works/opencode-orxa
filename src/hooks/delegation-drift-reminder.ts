import type { HookContext } from "../types.js";
import { resolveToolAlias } from "../middleware/delegation-enforcer.js";

const ORCHESTRATOR_AGENTS = new Set(["orxa", "plan"]);
const DELEGATION_TOOLS = new Set(["task", "delegate_task"]);
const SELF_WORK_TOOLS = new Set([
  "read",
  "read_file",
  "grep",
  "glob",
  "bash",
  "edit",
  "write",
  "apply_patch",
  "write_to_file",
  "replace_file_content",
  "multi_replace_file_content",
]);
const REMINDER_THRESHOLD = 3;

const DELEGATION_DRIFT_REMINDER = [
  "Delegation reminder:",
  "- You are an orchestrator. Delegate implementation work instead of doing it directly.",
  "- Use `task` to delegate execution to the correct subagent.",
  "- Frontend visual UI/UX/styling/design tasks must go to `frontend` only.",
  "- Keep direct work limited to coordination/planning and user conversation.",
].join("\n");

type DelegationDriftState = {
  selfWorkCallsSinceDelegation: number;
  reminderShown: boolean;
};

const sessionStates = new Map<string, DelegationDriftState>();

const getSessionState = (sessionId: string): DelegationDriftState => {
  const existing = sessionStates.get(sessionId);
  if (existing) {
    return existing;
  }
  const state: DelegationDriftState = {
    selfWorkCallsSinceDelegation: 0,
    reminderShown: false,
  };
  sessionStates.set(sessionId, state);
  return state;
};

const resolveAgentName = (context: HookContext): string => {
  const agent = context.agentName ?? context.agent ?? context.session?.agentName ?? "";
  return agent.trim().toLowerCase();
};

export const clearDelegationDriftState = (sessionId: string): void => {
  sessionStates.delete(sessionId);
};

export const resetDelegationDriftReminderStateForTests = (): void => {
  sessionStates.clear();
};

export const delegationDriftReminder = (
  context: HookContext
): { injectMessage?: string } => {
  const sessionId = context.sessionId ?? context.session?.id;
  if (!sessionId) {
    return {};
  }

  const agentName = resolveAgentName(context);
  if (!ORCHESTRATOR_AGENTS.has(agentName)) {
    return {};
  }

  const normalizedTool = resolveToolAlias(
    context.tool?.name ?? context.toolName ?? "",
    context.config.toolAliases?.resolve ?? {}
  );
  const state = getSessionState(sessionId);

  if (DELEGATION_TOOLS.has(normalizedTool)) {
    state.selfWorkCallsSinceDelegation = 0;
    state.reminderShown = false;
    return {};
  }

  if (!SELF_WORK_TOOLS.has(normalizedTool)) {
    return {};
  }

  state.selfWorkCallsSinceDelegation += 1;

  if (
    state.selfWorkCallsSinceDelegation >= REMINDER_THRESHOLD &&
    !state.reminderShown
  ) {
    state.reminderShown = true;
    return { injectMessage: DELEGATION_DRIFT_REMINDER };
  }

  return {};
};
