import type { SlashCommand, CommandContext, CommandResult } from "../types";

export const debugCommand: SlashCommand = {
  name: "debug",
  description: "Debug issues and trace code flow",
  aliases: ["dbg", "fix"],
  handler: async (args: string[], context: CommandContext): Promise<CommandResult> => {
    const issue = args.join(" ") || "the current issue";
    
    return {
      success: true,
      message: `## 🐛 Debugging: ${issue}

Starting debugging workflow...`,
      actions: [
        "@architect: Analyze the error/issue and hypothesize root causes",
        "@explorer: Trace code flow to understand execution path",
        "@explorer: Find where the issue originates",
        "@coder: Implement minimal fix for the root cause",
        "Run tests to verify the fix works",
        "Check for regressions in related code"
      ]
    };
  }
};
