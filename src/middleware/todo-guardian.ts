import type { OrxaConfig } from "../config/schema.js";
import type { Session, Todo, ValidationResult, WarningResult } from "../types.js";

const STOPPING_PATTERNS = [
  /what (?:would|do) you (?:like|want) me to do next/i,
  /what should i do next/i,
  /would you like me to do next/i,
  /how would you like to proceed/i,
  /anything else (?:i can help|you need|you'd like|you would like)/i,
  /is there anything else/i,
  /let me know if you need anything else/i,
  /let me know if you'd like me to/i,
  /that'?s all/i,
  /that'?s everything/i,
  /all done/i,
  /i'?m done/i,
  /nothing else to do/i,
];

const COMPLETION_PATTERNS = [
  /done/i,
  /completed/i,
  /finished/i,
  /wrapped up/i,
  /all set/i,
  /no further action/i,
];

const coerceText = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

export const checkPendingTodos = (
  session: Session,
  config: OrxaConfig
): WarningResult | null => {
  if (!config.orxa.requireTodoList) {
    return null;
  }

  if (session.todos.length === 0) {
    return {
      warning: "No TODO list detected for the session.",
      level: "warn",
    };
  }

  const pending = session.todos.filter((todo) => !todo.completed);
  if (pending.length > 0) {
    return {
      warning: `There are ${pending.length} pending TODO(s).`,
      level: "warn",
    };
  }

  return null;
};

export const getPendingTodos = (session?: Session): Todo[] =>
  session?.todos?.filter((todo) => !todo.completed) ?? [];

export const isStoppingResponse = (content: string): boolean => {
  const trimmed = content.trim();
  if (!trimmed) {
    return false;
  }
  return STOPPING_PATTERNS.some((pattern) => pattern.test(trimmed));
};

export const isCompletionSignal = (content: string): boolean => {
  const trimmed = content.trim();
  if (!trimmed) {
    return false;
  }
  return COMPLETION_PATTERNS.some((pattern) => pattern.test(trimmed));
};

export const extractQuestionText = (args: unknown): string[] => {
  if (!args || typeof args !== "object") {
    return [];
  }

  const record = args as Record<string, unknown>;
  const results: string[] = [];
  const question = coerceText(record.question) ?? coerceText(record.prompt);
  if (question) {
    results.push(question);
  }

  const questions = record.questions;
  if (Array.isArray(questions)) {
    for (const entry of questions) {
      const text = coerceText(entry) ?? coerceText((entry as Record<string, unknown>)?.question);
      if (text) {
        results.push(text);
      }
    }
  }

  return results;
};

export const buildTodoContinuationMessage = (pendingTodos: Todo[]): string => {
  const todoList = pendingTodos.map((todo) => `- ${todo.text}`).join("\n");
  return (
    `⚠️ TODO CONTINUATION ENFORCER\n\n` +
    `You have ${pendingTodos.length} pending TODO(s). You MUST complete them before stopping.\n\n` +
    `Pending TODOs:\n${todoList}\n\n` +
    `Do NOT ask the user what to do next. Continue working on the pending TODOs.`
  );
};

export const validateTodoCompletion = async (
  todo: Todo,
  config: OrxaConfig
): Promise<ValidationResult> => {
  if (config.orxa.enforcement.todoCompletion === "off") {
    return { valid: true };
  }

  if (!todo.text.trim()) {
    return { valid: false, errors: ["Todo text cannot be empty."] };
  }

  if (!todo.completed) {
    return { valid: false, errors: ["Todo is not marked complete."] };
  }

  return { valid: true };
};
