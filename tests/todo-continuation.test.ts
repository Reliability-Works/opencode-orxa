import { defaultConfig } from "../src/config/default-config";
import { preToolExecution } from "../src/hooks/pre-tool-execution";
import {
  todoContinuationEnforcer,
} from "../src/hooks/todo-continuation-enforcer";
import {
  checkPendingTodos,
  getPendingTodos,
  isStoppingResponse,
  isCompletionSignal,
  extractQuestionText,
  buildTodoContinuationMessage,
  validateTodoCompletion,
} from "../src/middleware/todo-guardian";
import type { OrxaConfig } from "../src/config/schema";
import type { HookContext, Session, Todo } from "../src/types";

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

describe("Todo Guardian", () => {
  const buildSession = (overrides?: Partial<Session>): Session => ({
    id: "session-1",
    agentName: "orxa",
    manualEdits: 0,
    todos: [],
    messages: [],
    recentMessages: [],
    ...overrides,
  });

  describe("checkPendingTodos", () => {
    it("returns null when todo list is not required", () => {
      const session = buildSession({
        todos: [{ id: "1", text: "Task", completed: false }],
      });
      const config = {
        ...defaultConfig,
        orxa: {
          ...defaultConfig.orxa,
          requireTodoList: false,
        },
      };

      const result = checkPendingTodos(session, config);
      expect(result).toBeNull();
    });

    it("warns when no TODO list exists", () => {
      const session = buildSession({ todos: [] });
      const result = checkPendingTodos(session, defaultConfig);
      expect(result?.warning).toContain("No TODO list detected");
      expect(result?.level).toBe("warn");
    });

    it("warns when pending todos exist", () => {
      const session = buildSession({
        todos: [
          { id: "1", text: "Task 1", completed: false },
          { id: "2", text: "Task 2", completed: true },
        ],
      });
      const result = checkPendingTodos(session, defaultConfig);
      expect(result?.warning).toContain("1 pending TODO");
    });

    it("returns null when all todos are completed", () => {
      const session = buildSession({
        todos: [
          { id: "1", text: "Task 1", completed: true },
          { id: "2", text: "Task 2", completed: true },
        ],
      });
      const result = checkPendingTodos(session, defaultConfig);
      expect(result).toBeNull();
    });
  });

  describe("getPendingTodos", () => {
    it("returns empty array when no session", () => {
      const result = getPendingTodos(undefined);
      expect(result).toEqual([]);
    });

    it("returns empty array when no todos", () => {
      const session = buildSession({ todos: [] });
      const result = getPendingTodos(session);
      expect(result).toEqual([]);
    });

    it("returns only pending todos", () => {
      const session = buildSession({
        todos: [
          { id: "1", text: "Pending", completed: false },
          { id: "2", text: "Completed", completed: true },
          { id: "3", text: "Also Pending", completed: false },
        ],
      });
      const result = getPendingTodos(session);
      expect(result).toHaveLength(2);
      expect(result.map((t) => t.text)).toContain("Pending");
      expect(result.map((t) => t.text)).toContain("Also Pending");
    });
  });

  describe("isStoppingResponse", () => {
    it("detects 'what would you like me to do next'", () => {
      expect(isStoppingResponse("What would you like me to do next?")).toBe(true);
    });

    it("detects 'what should I do next'", () => {
      expect(isStoppingResponse("What should I do next?")).toBe(true);
    });

    it("detects 'how would you like to proceed'", () => {
      expect(isStoppingResponse("How would you like to proceed?")).toBe(true);
    });

    it("detects 'anything else'", () => {
      expect(isStoppingResponse("Is there anything else I can help with?")).toBe(true);
    });

    it("detects 'let me know if you need anything else'", () => {
      expect(isStoppingResponse("Let me know if you need anything else.")).toBe(true);
    });

    it("detects 'that's all'", () => {
      expect(isStoppingResponse("That's all for now.")).toBe(true);
    });

    it("detects 'i'm done'", () => {
      expect(isStoppingResponse("I'm done.")).toBe(true);
    });

    it("returns false for requirement questions", () => {
      expect(isStoppingResponse("Can you confirm the API URL?")).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(isStoppingResponse("")).toBe(false);
    });

    it("returns false for whitespace only", () => {
      expect(isStoppingResponse("   ")).toBe(false);
    });
  });

  describe("isCompletionSignal", () => {
    it("detects 'done'", () => {
      expect(isCompletionSignal("Done!")).toBe(true);
    });

    it("detects 'completed'", () => {
      expect(isCompletionSignal("Task completed.")).toBe(true);
    });

    it("detects 'finished'", () => {
      expect(isCompletionSignal("All finished.")).toBe(true);
    });

    it("detects 'wrapped up'", () => {
      expect(isCompletionSignal("Wrapped up the changes.")).toBe(true);
    });

    it("detects 'all set'", () => {
      expect(isCompletionSignal("All set!")).toBe(true);
    });

    it("returns false for non-completion text", () => {
      expect(isCompletionSignal("Working on it...")).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(isCompletionSignal("")).toBe(false);
    });
  });

  describe("extractQuestionText", () => {
    it("extracts single question from args", () => {
      const args = { question: "What is the API URL?" };
      const result = extractQuestionText(args);
      expect(result).toEqual(["What is the API URL?"]);
    });

    it("extracts question from prompt field", () => {
      const args = { prompt: "What should I do?" };
      const result = extractQuestionText(args);
      expect(result).toEqual(["What should I do?"]);
    });

    it("extracts questions from questions array", () => {
      const args = {
        questions: [
          "Question 1?",
          { question: "Question 2?" },
          "Question 3?",
        ],
      };
      const result = extractQuestionText(args);
      expect(result).toEqual(["Question 1?", "Question 2?", "Question 3?"]);
    });

    it("returns empty array for null args", () => {
      const result = extractQuestionText(null);
      expect(result).toEqual([]);
    });

    it("returns empty array for non-object args", () => {
      const result = extractQuestionText("string");
      expect(result).toEqual([]);
    });

    it("handles mixed valid and invalid questions", () => {
      const args = {
        questions: [
          "Valid question?",
          null,
          { other: "field" },
          { question: "Another valid?" },
        ],
      };
      const result = extractQuestionText(args);
      expect(result).toEqual(["Valid question?", "Another valid?"]);
    });
  });

  describe("buildTodoContinuationMessage", () => {
    it("builds message with single todo", () => {
      const todos = [{ id: "1", text: "Finish tests", completed: false }];
      const result = buildTodoContinuationMessage(todos);
      expect(result).toContain("1 pending TODO");
      expect(result).toContain("Finish tests");
      expect(result).toContain("TODO CONTINUATION ENFORCER");
    });

    it("builds message with multiple todos", () => {
      const todos = [
        { id: "1", text: "Task 1", completed: false },
        { id: "2", text: "Task 2", completed: false },
      ];
      const result = buildTodoContinuationMessage(todos);
      expect(result).toContain("2 pending TODO");
      expect(result).toContain("Task 1");
      expect(result).toContain("Task 2");
    });
  });

  describe("validateTodoCompletion", () => {
    it("returns valid when enforcement is off", async () => {
      const todo: Todo = { id: "1", text: "Task", completed: false };
      const config = {
        ...defaultConfig,
        orxa: {
          ...defaultConfig.orxa,
          enforcement: {
            ...defaultConfig.orxa.enforcement,
            todoCompletion: "off" as const,
          },
        },
      };
      const result = await validateTodoCompletion(todo, config);
      expect(result.valid).toBe(true);
    });

    it("returns invalid for empty todo text", async () => {
      const todo: Todo = { id: "1", text: "", completed: true };
      const result = await validateTodoCompletion(todo, defaultConfig);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Todo text cannot be empty.");
    });

    it("returns invalid for incomplete todo", async () => {
      const todo: Todo = { id: "1", text: "Task", completed: false };
      const result = await validateTodoCompletion(todo, defaultConfig);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Todo is not marked complete.");
    });

    it("returns valid for complete todo with text", async () => {
      const todo: Todo = { id: "1", text: "Task", completed: true };
      const result = await validateTodoCompletion(todo, defaultConfig);
      expect(result.valid).toBe(true);
    });
  });
});
