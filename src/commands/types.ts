export interface SlashCommand {
  name: string;
  description: string;
  aliases?: string[];
  handler: (args: string[], context: CommandContext) => Promise<CommandResult>;
}

export interface CommandContext {
  config: unknown;
  session: unknown;
  delegateTask: (agent: string, prompt: string) => Promise<string>;
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<void>;
}

export interface CommandResult {
  success: boolean;
  message: string;
  actions?: string[];
}
