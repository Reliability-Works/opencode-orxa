import type { Plugin } from "@opencode-ai/plugin";
import { configHandler } from "./config-handler.js";
import { preToolExecution } from "./hooks/pre-tool-execution.js";
import { postSubagentResponse } from "./hooks/post-subagent-response.js";
import { preTodoCompletion } from "./hooks/pre-todo-completion.js";
import { sessionCheckpoint } from "./hooks/session-checkpoint.js";
import { todoContinuationEnforcer } from "./hooks/todo-continuation-enforcer.js";
import { welcomeToastHandler } from "./hooks/welcome-toast.js";
import { orxaDetector } from "./hooks/orxa-detector.js";
import { orxaIndicator } from "./hooks/orxa-indicator.js";

const orxaPlugin: Plugin = async (ctx) => {
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
