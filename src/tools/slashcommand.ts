import { tool } from "@opencode-ai/plugin/tool";
import type { ToolDefinition } from "@opencode-ai/plugin/tool";
import type { SlashCommand } from "../types.js";
import { builtInCommands } from "../commands/index.js";

interface SlashcommandToolArgs {
  command: string;
  user_message?: string;
}

function formatCommandList(commands: SlashCommand[]): string {
  if (commands.length === 0) {
    return "No commands available.";
  }

  const lines = ["# Available ORXA Commands\n"];

  for (const cmd of commands) {
    const aliases = cmd.aliases?.length ? ` (${cmd.aliases.join(", ")})` : "";
    lines.push(`- **/${cmd.name}${aliases}**: ${cmd.description}`);
  }

  lines.push(`\n**Total**: ${commands.length} commands`);
  return lines.join("\n");
}

async function formatCommandHelp(
  cmd: SlashCommand,
  userMessage?: string
): Promise<string> {
  const sections: string[] = [];

  sections.push(`# /${cmd.name} Command\n`);
  sections.push(`**Description**: ${cmd.description}\n`);

  if (cmd.aliases?.length) {
    sections.push(`**Aliases**: ${cmd.aliases.join(", ")}\n`);
  }

  if (userMessage) {
    sections.push(`**Arguments**: ${userMessage}\n`);
  }

  sections.push("---\n");
  sections.push("This command will execute the ORXA workflow.");

  return sections.join("\n");
}

const TOOL_DESCRIPTION = `Execute ORXA slash commands for orchestrated AI-assisted development.

ORXA commands provide specialized workflows for planning, validation, debugging, and more.
Use these commands when you need structured assistance with software development tasks.

**Available Commands:**
${formatCommandList(builtInCommands)}

**How to use:**
- Call with command name: command='orchestrate'
- Call with command and arguments: command='validate' user_message='check the current plan'
- The tool will execute the ORXA workflow and return results.
`;

export function createSlashcommandTool(): ToolDefinition {
  return tool({
    description: TOOL_DESCRIPTION,

    args: {
      command: tool.schema
        .string()
        .describe(
          "The ORXA slash command name (without leading slash). E.g., 'orchestrate', 'validate', 'debug'"
        ),
      user_message: tool.schema
        .string()
        .optional()
        .describe(
          "Optional arguments or context to pass to the command. E.g., for '/validate my plan', command='validate' user_message='my plan'"
        ),
    },

    async execute(args: SlashcommandToolArgs, ctx) {
      const { command, user_message } = args;

      if (!command) {
        return (
          formatCommandList(builtInCommands) +
          "\n\nProvide a command name to execute."
        );
      }

      const cmdName = command.replace(/^\//, "").toLowerCase();

      // Find the command
      const commandDef = builtInCommands.find(
        (cmd) =>
          cmd.name.toLowerCase() === cmdName ||
          cmd.aliases?.some((alias) => alias.toLowerCase() === cmdName)
      );

      if (!commandDef) {
        const available = builtInCommands.map((c) => c.name).join(", ");
        return `Unknown command: /${cmdName}. Available commands: ${available}`;
      }

      // If just asking for help/info, return command details
      if (!user_message || user_message.trim() === "help") {
        return await formatCommandHelp(commandDef, user_message);
      }

      // Execute the command
      try {
        const argsArray = user_message ? user_message.split(/\s+/) : [];
        
        // Create a minimal context for command execution
        const commandContext = {
          config: {} as never,
          session: { id: ctx.sessionID } as never,
          delegateTask: async (_agent: string, _prompt: string): Promise<string> => {
            return `Task delegation not available in this context. Use the delegate_task tool directly.`;
          },
          readFile: async (path: string): Promise<string> => {
            const fs = await import("fs");
            return fs.readFileSync(path, "utf-8");
          },
          writeFile: async (path: string, content: string): Promise<void> => {
            const fs = await import("fs");
            fs.writeFileSync(path, content, "utf-8");
          },
        };
        
        const result = await commandDef.handler(argsArray, commandContext);

        return result.message;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return `Command execution failed: ${errorMessage}`;
      }
    },
  });
}

// Default instance for export
export const slashcommand: ToolDefinition = createSlashcommandTool();
