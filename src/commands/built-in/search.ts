import type { SlashCommand, CommandContext, CommandResult } from "../types.js";

export const searchCommand: SlashCommand = {
  name: "search",
  description: "Search codebase and web",
  aliases: ["s", "find"],
  handler: async (args: string[], context: CommandContext): Promise<CommandResult> => {
    const query = args.join(" ") || "";
    
    if (!query) {
      return {
        success: false,
        message: "Please provide a search query. Usage: /search [query]"
      };
    }
    
    return {
      success: true,
      message: `## 🔍 Search: "${query}"`,
      actions: [
        "@explorer: Search codebase for:",
        `  - "${query}"`,
        "  - Related functions, classes, and files",
        "  - Usage examples and references",
        "@navigator: Search web for:",
        `  - Documentation about "${query}"`,
        "  - Best practices and examples",
        "  - Common patterns and solutions",
        "Compile results into organized findings"
      ]
    };
  }
};
