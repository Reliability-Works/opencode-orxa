import type { SlashCommand, CommandContext, CommandResult } from "../types";

export const explainCommand: SlashCommand = {
  name: "explain",
  description: "Explain code, architecture, or concepts",
  aliases: ["ex", "exp"],
  handler: async (args: string[], context: CommandContext): Promise<CommandResult> => {
    const target = args.join(" ") || "the current code";
    
    try {
      const explanation = await context.delegateTask(
        "librarian",
        `## Task
Explain the following in clear, educational terms: ${target}

## Expected Outcome
Provide:
1. High-level overview (what it does and why)
2. Key components and their roles
3. How data flows through the system
4. Any important patterns or design decisions

## Required Tools
- read
- grep (if needed to find related code)

## Must Do
- Use analogies where helpful
- Explain the "why" not just the "what"
- Break down complex concepts

## Must Not Do
- Write new code
- Suggest changes (just explain)

## Context
The user wants to understand: ${target}`
      );

      return {
        success: true,
        message: `## 📚 Explanation

${explanation}`,
        actions: [
          "Ask follow-up questions if anything is unclear",
          "Use /search to find related concepts",
          "Use /refactor if you want to improve the code after understanding it"
        ]
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to explain: ${(error as Error).message}`
      };
    }
  }
};
