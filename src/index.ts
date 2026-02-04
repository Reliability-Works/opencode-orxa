import fs from "fs";
import path from "path";
import {
  getCustomAgentsDir,
  getOverridesAgentsDir,
} from "./config/loader.js";
import { configHandler } from "./config-handler.js";
import { preToolExecution } from "./hooks/pre-tool-execution.js";
import { postSubagentResponse } from "./hooks/post-subagent-response.js";
import { preTodoCompletion } from "./hooks/pre-todo-completion.js";
import { sessionCheckpoint } from "./hooks/session-checkpoint.js";
import { todoContinuationEnforcer } from "./hooks/todo-continuation-enforcer.js";
import { welcomeToastHandler } from "./hooks/welcome-toast.js";
import { orxaDetector } from "./hooks/orxa-detector.js";
import { orxaIndicator } from "./hooks/orxa-indicator.js";
import type {
  EnforcementResult,
  HookContext,
  SessionCheckpointResult,
  SubagentResponseResult,
  TodoCompletionGateResult,
  TodoContinuationResult,
} from "./types.js";

// Orxa Orchestration exports
export * from "./orxa/types.js";
export { WorktreeManager, createWorktreeManager } from "./orxa/worktree-manager.js";
export { SpecGenerator, createSpecGenerator } from "./orxa/spec-generator.js";
export { MergeQueue, createMergeQueue } from "./orxa/merge-queue.js";
export { OrxaOrchestrator, createOrchestrator } from "./orxa/orchestrator.js";

// Bundled skills - internal constant, not exported to avoid plugin loader issues
const BUNDLED_SKILLS = [
  "frontend-design",
  "web-design-guidelines",
  "testing-quality",
  "humanizer",
  "image-generator",
  "devops-release",
  "feature-flags-experiments",
  // Expo skills
  "expo-building-native-ui",
  "expo-api-routes",
  "expo-cicd-workflows",
  "expo-deployment",
  "expo-dev-client",
  "expo-tailwind-setup",
  "upgrading-expo",
  // Vercel & React
  "vercel-react-best-practices",
  // Video
  "remotion-best-practices",
  "agent-browser",
  "agent-device",
] as const;

type BundledSkill = (typeof BUNDLED_SKILLS)[number];

const BUILTIN_SKILLS_DIR = path.resolve(__dirname, "..", "skills");

export interface ResolvedSkill {
  name: string;
  path: string;
  content: string;
}

/**
 * Resolve a bundled skill by name.
 * Returns the skill content from the plugin bundle.
 */
export function resolveSkill(skillName: string): ResolvedSkill | null {
  // Normalize skill name (remove @skill/ prefix if present)
  const normalizedName = skillName.replace(/^@skill\//, "");

  // Check if it's a bundled skill
  if (!BUNDLED_SKILLS.includes(normalizedName as BundledSkill)) {
    return null;
  }

  const skillPath = path.join(BUILTIN_SKILLS_DIR, `${normalizedName}.md`);

  if (!fs.existsSync(skillPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(skillPath, "utf-8");
    return {
      name: normalizedName,
      path: skillPath,
      content,
    };
  } catch {
    return null;
  }
}

/**
 * List all available bundled skills.
 */
export function listBundledSkills(): string[] {
  return [...BUNDLED_SKILLS];
}

/**
 * Check if a skill is available in the bundle.
 */
export function hasSkill(skillName: string): boolean {
  const normalizedName = skillName.replace(/^@skill\//, "");
  return BUNDLED_SKILLS.includes(normalizedName as BundledSkill);
}

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
