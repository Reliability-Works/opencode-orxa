import {
  isManagerAgent,
  shouldTrackDelegationForReview,
  isReviewEvidenceTool,
  isTodoCompletionAttempt,
  markDelegationNeedingReview,
  markReviewCompleted,
  type ReviewGateSessionState,
} from "../../src/hooks/subagent-review-gate";
import type { Todo } from "../../src/types";

describe("subagent review gate", () => {
  describe("agent and delegation detection", () => {
    it("identifies manager agents", () => {
      expect(isManagerAgent("orxa")).toBe(true);
      expect(isManagerAgent("plan")).toBe(true);
      expect(isManagerAgent("build")).toBe(false);
    });

    it("tracks delegation only for manager agents", () => {
      expect(shouldTrackDelegationForReview("task", "orxa")).toBe(true);
      expect(shouldTrackDelegationForReview("delegate_task", "plan")).toBe(true);
      expect(shouldTrackDelegationForReview("task", "build")).toBe(false);
      expect(shouldTrackDelegationForReview("read", "orxa")).toBe(false);
    });
  });

  describe("review evidence detection", () => {
    it("accepts direct inspection tools as evidence", () => {
      expect(isReviewEvidenceTool("read", {}, "orxa")).toBe(true);
      expect(isReviewEvidenceTool("glob", {}, "plan")).toBe(true);
      expect(isReviewEvidenceTool("read", {}, "build")).toBe(false);
    });

    it("accepts reviewer/strategist delegation as evidence", () => {
      expect(
        isReviewEvidenceTool("task", { subagent_type: "reviewer" }, "orxa")
      ).toBe(true);
      expect(
        isReviewEvidenceTool("task", { input: { subagent_type: "strategist" } }, "plan")
      ).toBe(true);
      expect(
        isReviewEvidenceTool("task", { subagent_type: "build" }, "orxa")
      ).toBe(false);
    });

    it("accepts slashcommand validate as evidence", () => {
      expect(isReviewEvidenceTool("slashcommand", { command: "validate" }, "orxa")).toBe(true);
      expect(isReviewEvidenceTool("slashcommand", { command: "test" }, "orxa")).toBe(false);
    });
  });

  describe("todo completion detection", () => {
    const currentTodos: Todo[] = [
      { id: "1", text: "Implement feature", completed: false },
      { id: "2", text: "Run tests", completed: false },
      { id: "3", text: "Write docs", completed: true },
    ];

    it("detects completion attempt when pending todo is marked complete by id", () => {
      const args = {
        todos: [
          { id: "1", text: "Implement feature", completed: true },
          { id: "2", text: "Run tests", completed: false },
          { id: "3", text: "Write docs", completed: true },
        ],
      };

      expect(isTodoCompletionAttempt(args, currentTodos)).toBe(true);
    });

    it("does not flag todo updates that keep pending items incomplete", () => {
      const args = {
        todos: [
          { id: "1", text: "Implement feature", completed: false },
          { id: "2", text: "Run tests", completed: false },
          { id: "3", text: "Write docs", completed: true },
        ],
      };

      expect(isTodoCompletionAttempt(args, currentTodos)).toBe(false);
    });

    it("detects completion using status field", () => {
      const args = {
        input: {
          items: [
            { id: "1", title: "Implement feature", status: "completed" },
            { id: "2", title: "Run tests", status: "pending" },
          ],
        },
      };

      expect(isTodoCompletionAttempt(args, currentTodos)).toBe(true);
    });
  });

  describe("state transitions", () => {
    it("sets and clears requiresReview state", () => {
      const initial: ReviewGateSessionState = {
        requiresReview: false,
        pendingDelegations: 0,
      };
      const delegated = markDelegationNeedingReview(initial);
      expect(delegated.requiresReview).toBe(true);
      expect(delegated.pendingDelegations).toBe(1);

      const reviewed = markReviewCompleted(delegated);
      expect(reviewed.requiresReview).toBe(false);
      expect(reviewed.pendingDelegations).toBe(0);
    });
  });
});
