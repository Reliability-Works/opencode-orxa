import type { OrxaConfig } from "./config/schema.js";

export interface Message {
  role: string;
  content: string;
  toolName?: string;
  toolArgs?: unknown;
  timestamp?: string;
}

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  updatedAt?: string;
}

export interface Session {
  id: string;
  agentName: string;
  manualEdits: number;
  todos: Todo[];
  messages: Message[];
  metadata?: Record<string, unknown>;
  messageCount?: number;
  recentMessages?: Message[];
  memoryQueue?: Memory[];
  agentAttempts?: Record<string, number>;
}

export interface SessionContext {
  sessionId: string;
  summary: string;
  lastUpdated: string;
}

export interface HookContext {
  toolName?: string;
  tool?: {
    name: string;
  };
  args: unknown;
  agentName?: string;
  agent?: string;
  config: OrxaConfig;
  session?: Session;
  sessionId?: string;
  attachments?: Array<{
    type: string;
    mimeType?: string;
    name?: string;
    size?: number;
  }>;
  workspaceRoot?: string;
  delegationPrompt?: string;
  response?: string;
  todo?: Todo;
  notify?: (message: string) => void;
  supermemory?: {
    add: (payload: {
      content: string;
      type: string;
      scope?: string;
      metadata?: Record<string, unknown>;
    }) => Promise<unknown>;
  };
}

export interface EnforcementResult {
  allow: boolean;
  reason?: string;
  warnings?: string[];
  recommendedAgent?: string;
  metadata?: Record<string, unknown>;
  block?: boolean;
  warn?: boolean;
  message?: string;
}

export interface SubagentResponseResult {
  continue?: boolean;
  escalate?: boolean;
  to?: string;
  message?: string;
  context?: string;
  injectMessage?: string;
}

export interface TodoCompletionGateResult {
  allow?: boolean;
  block?: boolean;
  message?: string;
  warnings?: string[];
}

export interface SessionCheckpointResult {
  injectMessage?: string;
}

export interface TodoContinuationResult {
  injectMessage?: string;
  blockResponse?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}

export interface WarningResult {
  warning: string;
  level: "warn" | "info";
}

export interface GateResult {
  name: string;
  success: boolean;
  output?: string;
  error?: string;
  durationMs?: number;
}

export type GateResults = Record<string, GateResult>;

export interface Memory {
  type: string;
  content: string;
  tags?: string[];
  source?: string;
  confidence?: number;
}

export interface ToolPayload {
  toolName: string;
  args: unknown;
  agentName?: string;
  sessionId?: string;
}

export interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
}

// Slash Command Types
export interface SlashCommand {
  name: string;
  description: string;
  aliases?: string[];
  handler: (args: string[], context: CommandContext) => Promise<CommandResult>;
}

export interface CommandContext {
  config: OrxaConfig;
  session: Session;
  delegateTask: (agent: string, prompt: string) => Promise<string>;
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<void>;
}

export interface CommandResult {
  success: boolean;
  message: string;
  actions?: string[];
}
