import type { SlashCommand, CommandContext, CommandResult } from "../types.js";
import { validateCommand } from "./built-in/validate.js";
import { refactorCommand } from "./built-in/refactor.js";
import { explainCommand } from "./built-in/explain.js";
import { testCommand } from "./built-in/test.js";
import { debugCommand } from "./built-in/debug.js";
import { commitCommand } from "./built-in/commit.js";
import { searchCommand } from "./built-in/search.js";

export const builtInCommands: SlashCommand[] = [
  validateCommand,
  refactorCommand,
  explainCommand,
  testCommand,
  debugCommand,
  commitCommand,
  searchCommand,
];

export const commandRegistry = new Map<string, SlashCommand>();

export const registerCommand = (command: SlashCommand): void => {
  commandRegistry.set(command.name, command);
  
  // Register aliases
  command.aliases?.forEach((alias: string) => {
    commandRegistry.set(alias, command);
  });
};

export const registerBuiltInCommands = (): void => {
  builtInCommands.forEach(registerCommand);
};

export const getCommand = (name: string): SlashCommand | undefined => {
  return commandRegistry.get(name);
};

export const listCommands = (): SlashCommand[] => {
  // Return unique commands (not aliases)
  const seen = new Set<string>();
  return Array.from(commandRegistry.values()).filter((cmd) => {
    if (seen.has(cmd.name)) return false;
    seen.add(cmd.name);
    return true;
  });
};

export const executeCommand = async (
  input: string,
  context: unknown
): Promise<{ success: boolean; message: string; actions?: string[] }> => {
  const trimmed = input.trim();
  
  // Parse command and args
  const match = trimmed.match(/^\/(\w+)(?:\s+(.*))?$/);
  if (!match) {
    return {
      success: false,
      message: "Invalid command format. Use /command-name [args]"
    };
  }
  
  const [, commandName, argsString] = match;
  const args = argsString ? argsString.split(/\s+/) : [];
  
  const command = getCommand(commandName);
  if (!command) {
    const available = listCommands().map((c) => c.name).join(", ");
    return {
      success: false,
      message: `Unknown command: /${commandName}. Available: ${available}`
    };
  }
  
  try {
    const result = await command.handler(args, context as never);
    return result;
  } catch (error) {
    return {
      success: false,
      message: `Command failed: ${(error as Error).message}`
    };
  }
};

// Initialize built-in commands
registerBuiltInCommands();
