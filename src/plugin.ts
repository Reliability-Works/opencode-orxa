import type { Plugin, PluginInput } from "@opencode-ai/plugin";
import { configHandler } from "./config-handler.js";
import { preToolExecution } from "./hooks/pre-tool-execution.js";
import { postSubagentResponse } from "./hooks/post-subagent-response.js";
import { preTodoCompletion } from "./hooks/pre-todo-completion.js";
import { sessionCheckpoint } from "./hooks/session-checkpoint.js";
import { todoContinuationEnforcer } from "./hooks/todo-continuation-enforcer.js";
import { createWelcomeToastHandler } from "./hooks/welcome-toast.js";
import { orxaDetector } from "./hooks/orxa-detector.js";
import { orxaIndicator } from "./hooks/orxa-indicator.js";

const orxaPlugin: Plugin = async (ctx: PluginInput) => {
  // Create the welcome toast handler with access to the TUI client
  const welcomeToastHandler = createWelcomeToastHandler(ctx);

  return {
    config: configHandler,
    hooks: {
      preToolExecution,
      postSubagentResponse,
      preTodoCompletion,
      sessionCheckpoint,
      todoContinuationEnforcer,
      sessionCreated: welcomeToastHandler,
      orxaDetector,
      orxaIndicator,
    },
    middleware: {
      initialize: (context: unknown) => context,
    },
  };
};

export default orxaPlugin;
