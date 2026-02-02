import type { SlashCommand, CommandContext, CommandResult } from "../types.js";

export const commitCommand: SlashCommand = {
  name: "commit",
  description: "Smart git commits with atomic splitting",
  aliases: ["c", "git"],
  handler: async (args: string[], context: CommandContext): Promise<CommandResult> => {
    const message = args.join(" ") || "";
    
    return {
      success: true,
      message: `## 📦 Git Commit

Starting smart commit workflow...`,
      actions: [
        "@git: Check current git status",
        "@git: Analyze changes and determine if atomic splitting is needed:",
        "  - 3+ files changed → Split into 2+ commits",
        "  - 5+ files changed → Split into 3+ commits", 
        "  - 10+ files changed → Split into 5+ commits",
        "@git: Create atomic commits with descriptive messages",
        message ? `@git: Use commit message pattern: "${message}"` : "@git: Auto-generate commit messages based on changes",
        "@git: Push commits if appropriate"
      ]
    };
  }
};
