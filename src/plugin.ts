import { configHandler } from "./config-handler";
import { preToolExecution } from "./hooks/pre-tool-execution";
import { postSubagentResponse } from "./hooks/post-subagent-response";
import { preTodoCompletion } from "./hooks/pre-todo-completion";
import { sessionCheckpoint } from "./hooks/session-checkpoint";
import { todoContinuationEnforcer } from "./hooks/todo-continuation-enforcer";
import { welcomeToastHandler } from "./hooks/welcome-toast";
import { orxaDetector } from "./hooks/orxa-detector";
import { orxaIndicator } from "./hooks/orxa-indicator";
import type { OrxaPlugin } from "./index";

const orxaPlugin: OrxaPlugin = {
  name: "opencode-orxa",
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

export = orxaPlugin;
