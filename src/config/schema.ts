import { z } from "zod";

export type EnforcementLevel = "strict" | "warn" | "off";

export interface AgentConfig {
  name: string;
  description: string;
  model?: string;
  temperature?: number;
  instructions?: string;
  system_prompt?: string;
  customInstructions?: string;
  allowedTools?: string[];
  blockedTools?: string[];
  tools?: {
    allowed?: string[];
    blocked?: string[];
  };
  extends?: string;
}

export interface OrxaConfig {
  enabled_agents: string[];
  disabled_agents: string[];
  agent_overrides: Record<string, PrimaryAgentOverride | SubagentOverride>;
  custom_agents: AgentConfig[];
  mcp?: Record<string, unknown>;
  toolAliases: {
    resolve: Record<string, string>;
  };
  orxa: {
    model: string;
    allowedTools: string[];
    blockedTools: string[];
    enforcement: {
      delegation: EnforcementLevel;
      todoCompletion: EnforcementLevel;
      qualityGates: EnforcementLevel;
      memoryAutomation: EnforcementLevel;
    };
    maxManualEditsPerSession: number;
    requireTodoList: boolean;
    autoUpdateTodos: boolean;
    planWriteAllowlist: string[];
    blockMobileTools: boolean;
  };
  governance: {
    onlyOrxaCanDelegate: boolean;
    blockSupermemoryAddForSubagents: boolean;
    delegationTemplate: {
      required: boolean;
      requiredSections: string[];
      maxImages: number;
      requireSameSessionId: boolean;
      contextHygiene: {
        maxToolOutputChars: number;
        summaryHeader: string;
        requireSummary: boolean;
      };
    };
  };
  subagents: {
    defaults: {
      model: string;
      timeout: number;
      maxRetries: number;
    };
    overrides: Record<
      string,
      {
        model?: string;
        timeout?: number;
        maxRetries?: number;
        customInstructions?: string;
      }
    >;
    custom: Array<{
      name: string;
      description: string;
      model: string;
      instructions: string;
      allowedTools: string[];
    }>;
  };
  memory: {
    autoExtract: boolean;
    extractPatterns: string[];
    requiredTypes: string[];
    sessionCheckpointInterval: number;
  };
  qualityGates: {
    requireLint: boolean;
    requireTypeCheck: boolean;
    requireTests: boolean;
    requireBuild: boolean;
    requireLspDiagnostics: boolean;
    customValidators: Array<{
      name: string;
      command: string;
      required: boolean;
    }>;
  };
  escalation: {
    enabled: boolean;
    maxAttemptsPerAgent: number;
    escalationMatrix: Record<string, string>;
    requireExplicitHandoff: boolean;
  };
  ui: {
    showDelegationWarnings: boolean;
    showTodoReminders: boolean;
    showMemoryConfirmations: boolean;
    verboseLogging: boolean;
  };
  perAgentRestrictions?: Record<
    string,
    {
      allowedTools?: string[];
      blockedTools?: string[];
      maxAttachments?: number;
    }
  >;
}

export interface PrimaryAgentOverride {
  model?: string;
}

export type SubagentOverride = Partial<AgentConfig>;

const enforcementLevelSchema = z.enum(["strict", "warn", "off"]);

const agentToolsSchema = z.object({
  allowed: z.array(z.string()).optional(),
  blocked: z.array(z.string()).optional(),
});

const agentConfigSchema = z.object({
  name: z.string(),
  description: z.string(),
  model: z.string().optional(),
  temperature: z.number().optional(),
  instructions: z.string().optional(),
  system_prompt: z.string().optional(),
  customInstructions: z.string().optional(),
  allowedTools: z.array(z.string()).optional(),
  blockedTools: z.array(z.string()).optional(),
  tools: agentToolsSchema.optional(),
  extends: z.string().optional(),
});

const customAgentSchema = agentConfigSchema
  .extend({
    model: z.string(),
  })
  .refine((agent) => agent.instructions || agent.system_prompt, {
    message: "Custom agents must define instructions or system_prompt.",
  });

export const primaryAgentOverrideSchema = z
  .object({
    model: z.string().optional(),
  })
  .strict();

export const subagentOverrideSchema = agentConfigSchema.partial();

const primaryAgentNames = new Set(["orxa", "plan"]);

const agentOverridesSchema = z
  .record(z.string(), subagentOverrideSchema)
  .superRefine((overrides, ctx) => {
    for (const [agentName, override] of Object.entries(overrides)) {
      if (!primaryAgentNames.has(agentName)) {
        continue;
      }

      const result = primaryAgentOverrideSchema.safeParse(override);
      if (result.success) {
        continue;
      }

      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          `Primary agent override "${agentName}" may only include "model". ` +
          "Remove other fields or use a subagent override instead.",
        path: [agentName],
      });
    }
  });

const perAgentRestrictionSchema = z.object({
  allowedTools: z.array(z.string()).optional(),
  blockedTools: z.array(z.string()).optional(),
  maxAttachments: z.number().int().nonnegative().optional(),
});

export const orxaConfigSchema: z.ZodType<OrxaConfig> = z.object({
  enabled_agents: z.array(z.string()),
  disabled_agents: z.array(z.string()),
  agent_overrides: agentOverridesSchema,
  custom_agents: z.array(customAgentSchema),
  mcp: z.record(z.string(), z.unknown()).optional(),
  toolAliases: z.object({
    resolve: z.record(z.string(), z.string()),
  }),
  orxa: z.object({
    model: z.string(),
    allowedTools: z.array(z.string()),
    blockedTools: z.array(z.string()),
    enforcement: z.object({
      delegation: enforcementLevelSchema,
      todoCompletion: enforcementLevelSchema,
      qualityGates: enforcementLevelSchema,
      memoryAutomation: enforcementLevelSchema,
    }),
    maxManualEditsPerSession: z.number().int().nonnegative(),
    requireTodoList: z.boolean(),
    autoUpdateTodos: z.boolean(),
    planWriteAllowlist: z.array(z.string()),
    blockMobileTools: z.boolean(),
  }),
  governance: z.object({
    onlyOrxaCanDelegate: z.boolean(),
    blockSupermemoryAddForSubagents: z.boolean(),
    delegationTemplate: z.object({
      required: z.boolean(),
      requiredSections: z.array(z.string()),
      maxImages: z.number().int().nonnegative(),
      requireSameSessionId: z.boolean(),
      contextHygiene: z.object({
        maxToolOutputChars: z.number().int().nonnegative(),
        summaryHeader: z.string(),
        requireSummary: z.boolean(),
      }),
    }),
  }),
  subagents: z.object({
    defaults: z.object({
      model: z.string(),
      timeout: z.number().int().nonnegative(),
      maxRetries: z.number().int().nonnegative(),
    }),
    overrides: z.record(
      z.string(),
      z.object({
        model: z.string().optional(),
        timeout: z.number().int().nonnegative().optional(),
        maxRetries: z.number().int().nonnegative().optional(),
        customInstructions: z.string().optional(),
      })
    ),
    custom: z.array(
      z.object({
        name: z.string(),
        description: z.string(),
        model: z.string(),
        instructions: z.string(),
        allowedTools: z.array(z.string()),
      })
    ),
  }),
  memory: z.object({
    autoExtract: z.boolean(),
    extractPatterns: z.array(z.string()),
    requiredTypes: z.array(z.string()),
    sessionCheckpointInterval: z.number().int().nonnegative(),
  }),
  qualityGates: z.object({
    requireLint: z.boolean(),
    requireTypeCheck: z.boolean(),
    requireTests: z.boolean(),
    requireBuild: z.boolean(),
    requireLspDiagnostics: z.boolean(),
    customValidators: z.array(
      z.object({
        name: z.string(),
        command: z.string(),
        required: z.boolean(),
      })
    ),
  }),
  escalation: z.object({
    enabled: z.boolean(),
    maxAttemptsPerAgent: z.number().int().nonnegative(),
    escalationMatrix: z.record(z.string(), z.string()),
    requireExplicitHandoff: z.boolean(),
  }),
  ui: z.object({
    showDelegationWarnings: z.boolean(),
    showTodoReminders: z.boolean(),
    showMemoryConfirmations: z.boolean(),
    verboseLogging: z.boolean(),
  }),
  perAgentRestrictions: z.record(z.string(), perAgentRestrictionSchema).optional(),
});
