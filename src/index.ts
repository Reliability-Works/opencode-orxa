import fs from "fs";
import path from "path";
import {
  getCustomAgentsDir,
  getOverridesAgentsDir,
} from "./config/loader";
import { configHandler } from "./config-handler";
import { preToolExecution } from "./hooks/pre-tool-execution";
import { postSubagentResponse } from "./hooks/post-subagent-response";
import { preTodoCompletion } from "./hooks/pre-todo-completion";
import { sessionCheckpoint } from "./hooks/session-checkpoint";
import { todoContinuationEnforcer } from "./hooks/todo-continuation-enforcer";
import { welcomeToastHandler } from "./hooks/welcome-toast";
import { orxaDetector } from "./hooks/orxa-detector";
import { orxaIndicator } from "./hooks/orxa-indicator";
import type {
  EnforcementResult,
  HookContext,
  SessionCheckpointResult,
  SubagentResponseResult,
  TodoCompletionGateResult,
  TodoContinuationResult,
} from "./types";

// Orxa Orchestration exports
export * from "./orxa/types";
export { WorktreeManager, createWorktreeManager } from "./orxa/worktree-manager";
export { SpecGenerator, createSpecGenerator } from "./orxa/spec-generator";
export { MergeQueue, createMergeQueue } from "./orxa/merge-queue";
export { OrxaOrchestrator, createOrchestrator } from "./orxa/orchestrator";

export interface OrxaPlugin {
  name: string;
  config: (
    config: Record<string, unknown>
  ) => Promise<void> | void;
  hooks: {
    preToolExecution: (context: HookContext) => Promise<EnforcementResult>;
    postSubagentResponse: (context: HookContext) => Promise<SubagentResponseResult>;
    preTodoCompletion: (context: HookContext) => Promise<TodoCompletionGateResult>;
    sessionCheckpoint: (context: HookContext) => Promise<SessionCheckpointResult>;
    todoContinuationEnforcer: (context: HookContext) => Promise<TodoContinuationResult>;
    sessionCreated?: (context: HookContext) => Promise<{ injectMessage?: string }>;
    orxaDetector?: (context: HookContext) => Promise<EnforcementResult>;
    orxaIndicator?: (context: HookContext) => Promise<void>;
  };
  middleware: {
    initialize: (context: unknown) => unknown;
  };
}

const BUILTIN_AGENTS_DIR = path.resolve(__dirname, "..", "agents");
const AGENT_EXTENSIONS = [".yaml", ".yml"];

export interface ResolvedAgentDefinition {
  name: string;
  path: string;
  source: "custom" | "override" | "builtin";
}

const findAgentFile = (baseDir: string, agentName: string): string | null => {
  for (const extension of AGENT_EXTENSIONS) {
    const directPath = path.join(baseDir, `${agentName}${extension}`);
    if (fs.existsSync(directPath)) {
      return directPath;
    }

    const subagentPath = path.join(baseDir, "subagents", `${agentName}${extension}`);
    if (fs.existsSync(subagentPath)) {
      return subagentPath;
    }
  }

  return null;
};

export const resolveAgentDefinition = (
  agentName: string
): ResolvedAgentDefinition | null => {
  const customPath = findAgentFile(getCustomAgentsDir(), agentName);
  if (customPath) {
    return { name: agentName, path: customPath, source: "custom" };
  }

  const overridePath = findAgentFile(getOverridesAgentsDir(), agentName);
  if (overridePath) {
    return { name: agentName, path: overridePath, source: "override" };
  }

  const builtinPath = findAgentFile(BUILTIN_AGENTS_DIR, agentName);
  if (builtinPath) {
    return { name: agentName, path: builtinPath, source: "builtin" };
  }

  return null;
};

export const orxaPlugin: OrxaPlugin = {
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
    initialize: (context) => context,
  },
};

export default orxaPlugin;
