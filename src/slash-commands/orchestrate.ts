import type { SlashCommand, CommandContext, CommandResult } from "../commands/types.js";
import {
  getOrxaSystemPrompt,
  setOrxaSessionActive,
  showOrxaToast,
} from "../hooks/orxa-detector.js";

type CommandToastContext = {
  client?: {
    tui?: {
      showToast: (payload: {
        body: {
          title: string;
          message: string;
          variant: "success" | "info" | "warning" | "error";
          duration: number;
        };
      }) => Promise<void>;
    };
  };
};

type OrxaToastClient = {
  tui: {
    showToast: (payload: {
      body: {
        title: string;
        message: string;
        variant: "success" | "info" | "warning" | "error";
        duration: number;
      };
    }) => Promise<void>;
  };
};

export const orchestrateCommand: SlashCommand = {
  name: "orchestrate",
  description: "Activate Orxa orchestration mode",
  handler: async (args: string[], context: CommandContext): Promise<CommandResult> => {
    const cleanedMessage = args.join(" ").trim();
    const systemPrompt = getOrxaSystemPrompt();

    const session = context.session as { id?: string; metadata?: Record<string, unknown> } | undefined;
    setOrxaSessionActive(session?.id, session, true);

    const toastContext = context as CommandContext & CommandToastContext;
    if (toastContext.client?.tui) {
      showOrxaToast(toastContext.client as OrxaToastClient);
    }

    const injectedMessage = cleanedMessage
      ? `${systemPrompt}\n\n---\n\n${cleanedMessage}`
      : systemPrompt;

    return {
      success: true,
      message: `ORXA MODE ACTIVATED\n\n${injectedMessage}`,
      actions: ["Orxa mode active"],
    };
  },
};
