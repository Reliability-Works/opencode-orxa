import type { Todo } from "../types.js";

const DELEGATION_TOOLS = new Set(["task", "delegate_task"]);
const REVIEW_EVIDENCE_TOOLS = new Set(["read", "read_file", "grep", "glob", "bash"]);
const REVIEW_SUBAGENTS = new Set(["reviewer", "strategist", "architect"]);

export interface ReviewGateSessionState {
  requiresReview: boolean;
  pendingDelegations: number;
  lastDelegationAt?: number;
  lastReviewAt?: number;
}

const TODO_LIKE_KEYS = new Set([
  "id",
  "text",
  "title",
  "content",
  "task",
  "completed",
  "done",
  "checked",
  "status",
]);

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const normalizeKey = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : undefined;
};

const isTodoLikeObject = (entry: Record<string, unknown>): boolean =>
  Object.keys(entry).some((key) => TODO_LIKE_KEYS.has(key));

const readCompletion = (entry: Record<string, unknown>): boolean | undefined => {
  if (typeof entry.completed === "boolean") {
    return entry.completed;
  }
  if (typeof entry.done === "boolean") {
    return entry.done;
  }
  if (typeof entry.checked === "boolean") {
    return entry.checked;
  }
  if (typeof entry.status === "string") {
    const status = entry.status.trim().toLowerCase();
    return status === "completed" || status === "done" || status === "checked";
  }
  return undefined;
};

const readTodoKey = (entry: Record<string, unknown>): string | undefined =>
  normalizeKey(entry.id) ??
  normalizeKey(entry.text) ??
  normalizeKey(entry.title) ??
  normalizeKey(entry.content) ??
  normalizeKey(entry.task);

const collectTodoArrays = (
  value: unknown,
  depth = 0,
  maxDepth = 5,
  found: Array<Record<string, unknown>[]> = []
): Array<Record<string, unknown>[]> => {
  if (depth > maxDepth || value == null) {
    return found;
  }

  if (Array.isArray(value)) {
    if (
      value.length > 0 &&
      value.every((entry) => !!asRecord(entry)) &&
      value.some((entry) => isTodoLikeObject(entry as Record<string, unknown>))
    ) {
      found.push(value as Array<Record<string, unknown>>);
    }
    for (const entry of value) {
      collectTodoArrays(entry, depth + 1, maxDepth, found);
    }
    return found;
  }

  const record = asRecord(value);
  if (!record) {
    return found;
  }

  if (isTodoLikeObject(record)) {
    found.push([record]);
  }

  for (const child of Object.values(record)) {
    collectTodoArrays(child, depth + 1, maxDepth, found);
  }

  return found;
};

const getBestTodoCandidate = (args: unknown): Array<Record<string, unknown>> | undefined => {
  const collections = collectTodoArrays(args);
  if (collections.length === 0) {
    return undefined;
  }
  return collections.sort((a, b) => b.length - a.length)[0];
};

const extractDelegatedSubagent = (args: unknown): string | undefined => {
  const record = asRecord(args);
  if (!record) {
    return undefined;
  }

  const direct =
    normalizeKey(record.subagent_type) ??
    normalizeKey(record.subagentType) ??
    normalizeKey(record.subagent) ??
    normalizeKey(record.agent) ??
    normalizeKey(record.targetAgent);
  if (direct) {
    return direct;
  }

  const nested = asRecord(record.input) ?? asRecord(record.task);
  if (!nested) {
    return undefined;
  }

  return (
    normalizeKey(nested.subagent_type) ??
    normalizeKey(nested.subagentType) ??
    normalizeKey(nested.subagent) ??
    normalizeKey(nested.agent) ??
    normalizeKey(nested.targetAgent)
  );
};

export const normalizeToolName = (toolName: string): string => toolName.trim().toLowerCase();

export const isManagerAgent = (agentName?: string): boolean => {
  const normalized = normalizeKey(agentName);
  return normalized === "orxa" || normalized === "plan";
};

export const shouldTrackDelegationForReview = (toolName: string, agentName?: string): boolean =>
  isManagerAgent(agentName) && DELEGATION_TOOLS.has(normalizeToolName(toolName));

export const isReviewEvidenceTool = (
  toolName: string,
  args: unknown,
  agentName?: string
): boolean => {
  if (!isManagerAgent(agentName)) {
    return false;
  }

  const normalizedTool = normalizeToolName(toolName);
  if (REVIEW_EVIDENCE_TOOLS.has(normalizedTool)) {
    return true;
  }

  if (DELEGATION_TOOLS.has(normalizedTool)) {
    const delegated = extractDelegatedSubagent(args);
    return delegated ? REVIEW_SUBAGENTS.has(delegated) : false;
  }

  if (normalizedTool === "slashcommand") {
    const record = asRecord(args);
    const command = normalizeKey(record?.command);
    return command === "validate";
  }

  return false;
};

export const markDelegationNeedingReview = (
  state: ReviewGateSessionState
): ReviewGateSessionState => ({
  ...state,
  requiresReview: true,
  pendingDelegations: Math.max(0, state.pendingDelegations) + 1,
  lastDelegationAt: Date.now(),
});

export const markReviewCompleted = (
  state: ReviewGateSessionState
): ReviewGateSessionState => ({
  ...state,
  requiresReview: false,
  pendingDelegations: 0,
  lastReviewAt: Date.now(),
});

export const isTodoCompletionAttempt = (args: unknown, currentTodos: Todo[]): boolean => {
  if (!currentTodos || currentTodos.length === 0) {
    return false;
  }

  const candidateTodos = getBestTodoCandidate(args);
  if (!candidateTodos || candidateTodos.length === 0) {
    return false;
  }

  const pendingKeys = new Set(
    currentTodos
      .filter((todo) => !todo.completed)
      .map((todo) => normalizeKey(todo.id) ?? normalizeKey(todo.text))
      .filter((value): value is string => Boolean(value))
  );

  let candidateCompletedCount = 0;
  const completedKeys: string[] = [];

  for (const entry of candidateTodos) {
    const completed = readCompletion(entry);
    if (completed) {
      candidateCompletedCount += 1;
      const key = readTodoKey(entry);
      if (key) {
        completedKeys.push(key);
      }
    }
  }

  if (candidateCompletedCount === 0) {
    return false;
  }

  if (pendingKeys.size > 0 && completedKeys.some((key) => pendingKeys.has(key))) {
    return true;
  }

  const currentCompletedCount = currentTodos.filter((todo) => todo.completed).length;
  return candidateCompletedCount > currentCompletedCount;
};
