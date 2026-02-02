import type { SlashCommand, CommandContext, CommandResult } from "../types.js";

export const validateCommand: SlashCommand = {
  name: "validate",
  description: "Validate current plan with strategist and reviewer",
  aliases: ["v", "check"],
  handler: async (_args: string[], context: CommandContext): Promise<CommandResult> => {
    try {
      // Invoke strategist for risk analysis
      const strategistResult = await context.delegateTask(
        "strategist",
        `## Task
Analyze the current work plan or codebase for risks, hidden requirements, ambiguities, and potential failure points.

## Expected Outcome
Identify:
1. Missing requirements or assumptions
2. Scope creep risks
3. Technical debt concerns
4. Edge cases not considered
5. Over-engineering risks

## Required Tools
- read
- grep

## Must Do
- Focus on what could go wrong
- Flag any ambiguous requirements
- Identify dependencies that might break

## Must Not Do
- Write code
- Fix issues (just identify them)

## Context
Review the current plan/session to identify risks before execution.`
      );

      // Invoke reviewer for plan validation
      const reviewerResult = await context.delegateTask(
        "reviewer",
        `## Task
Review the current work plan for clarity, verifiability, and completeness against Momus review standards.

## Expected Outcome
Evaluate:
1. Are TODOs atomic and verifiable?
2. Is the plan clear and unambiguous?
3. Are success criteria defined?
4. Is the scope appropriate?
5. Are there any gaps or inconsistencies?

## Required Tools
- read

## Must Do
- Be ruthless in critique
- Check for vague language
- Verify each TODO has clear completion criteria

## Must Not Do
- Be nice (be honest about flaws)
- Suggest fixes (just identify issues)

## Context
Apply Momus review pattern to validate the current plan.`
      );

      return {
        success: true,
        message: `## ✅ Validation Complete

### 🔍 Strategist Risk Analysis
${strategistResult}

---

### 📋 Reviewer Assessment
${reviewerResult}

---

**Next Steps:**
1. Review the feedback above
2. Address any critical issues
3. Proceed with execution when ready`,
        actions: [
          "Address critical risks identified by strategist",
          "Fix plan clarity issues flagged by reviewer",
          "Re-run /validate after fixes"
        ]
      };
    } catch (error) {
      return {
        success: false,
        message: `Validation failed: ${(error as Error).message}`,
        actions: ["Check agent availability", "Review error logs"]
      };
    }
  }
};
