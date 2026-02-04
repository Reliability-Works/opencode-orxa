/**
 * Config Schema Tests
 * 
 * Tests for Zod schema validation and type definitions.
 */

import {
  orxaConfigSchema,
  primaryAgentOverrideSchema,
  subagentOverrideSchema,
  type OrxaConfig,
  type AgentConfig,
} from '../../src/config/schema';
import { defaultConfig } from '../../src/config/default-config';

describe('Config Schema', () => {
  describe('primaryAgentOverrideSchema', () => {
    it('should validate model-only override', () => {
      const result = primaryAgentOverrideSchema.safeParse({ model: 'gpt-4' });
      expect(result.success).toBe(true);
    });

    it('should reject additional properties', () => {
      const result = primaryAgentOverrideSchema.safeParse({
        model: 'gpt-4',
        description: 'Test',
      });
      expect(result.success).toBe(false);
    });

    it('should allow empty object', () => {
      const result = primaryAgentOverrideSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should validate with undefined model', () => {
      const result = primaryAgentOverrideSchema.safeParse({ model: undefined });
      expect(result.success).toBe(true);
    });
  });

  describe('subagentOverrideSchema', () => {
    it('should validate partial agent config', () => {
      const result = subagentOverrideSchema.safeParse({
        model: 'gpt-4',
        temperature: 0.7,
      });
      expect(result.success).toBe(true);
    });

    it('should allow empty object', () => {
      const result = subagentOverrideSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should validate full agent config', () => {
      const result = subagentOverrideSchema.safeParse({
        name: 'custom-agent',
        description: 'A custom agent',
        model: 'gpt-4',
        temperature: 0.7,
        instructions: 'Do something',
        allowedTools: ['read', 'edit'],
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid temperature type', () => {
      const result = subagentOverrideSchema.safeParse({
        temperature: 'high',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('agent overrides validation', () => {
    it('should validate subagent overrides in full config', () => {
      const config = {
        ...defaultConfig,
        agent_overrides: {
          build: { model: 'gpt-4', temperature: 0.7 },
          strategist: { description: 'Custom strategist' },
        },
      };
      const result = orxaConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should allow primary agent with model only in full config', () => {
      const config = {
        ...defaultConfig,
        agent_overrides: {
          orxa: { model: 'gpt-4' },
          plan: { model: 'gpt-3.5' },
        },
      };
      const result = orxaConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should reject primary agent with extra properties in full config', () => {
      const config = {
        ...defaultConfig,
        agent_overrides: {
          orxa: { model: 'gpt-4', description: 'Custom conductor' },
        },
      };
      const result = orxaConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('should reject primary agent with system_prompt in full config', () => {
      const config = {
        ...defaultConfig,
        agent_overrides: {
          plan: { model: 'gpt-4', system_prompt: 'Custom prompt' },
        },
      };
      const result = orxaConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('should allow empty overrides object in full config', () => {
      const config = {
        ...defaultConfig,
        agent_overrides: {},
      };
      const result = orxaConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should validate mixed primary and subagent overrides in full config', () => {
      const config = {
        ...defaultConfig,
        agent_overrides: {
          orxa: { model: 'gpt-4' },
          build: { model: 'gpt-4', temperature: 0.7, description: 'Builder' },
        },
      };
      const result = orxaConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });
  });

  describe('orxaConfigSchema', () => {
    it('should validate default config', () => {
      const result = orxaConfigSchema.safeParse(defaultConfig);
      expect(result.success).toBe(true);
    });

    it('should validate minimal valid config', () => {
      const minimalConfig: Partial<OrxaConfig> = {
        enabled_agents: ['orxa', 'plan'],
        disabled_agents: [],
        agent_overrides: {},
        custom_agents: [],
        mcps: {
          enabled: [],
          disabled: [],
          config: {},
        },
        toolAliases: { resolve: {} },
        orxa: {
          model: 'gpt-4',
          allowedTools: ['read'],
          blockedTools: [],
          enforcement: {
            delegation: 'strict',
            todoCompletion: 'strict',
            qualityGates: 'strict',
            memoryAutomation: 'strict',
          },
          maxManualEditsPerSession: 0,
          requireTodoList: true,
          autoUpdateTodos: false,
          planWriteAllowlist: ['.orxa/plans/*.md'],
          blockMobileTools: true,
        },
        plan: {
          model: 'gpt-4',
          allowedTools: ['read'],
          blockedTools: [],
        },
        governance: {
          onlyOrxaCanDelegate: true,
          blockSupermemoryAddForSubagents: true,
          delegationTemplate: {
            required: true,
            requiredSections: ['Task'],
            maxImages: 10,
            requireSameSessionId: true,
            contextHygiene: {
              maxToolOutputChars: 4000,
            },
          },
        },
        subagents: {
          defaults: {
            model: 'gpt-4',
            timeout: 120000,
            maxRetries: 2,
          },
          overrides: {},
          custom: [],
        },
        memory: {
          autoExtract: true,
          extractPatterns: [],
          requiredTypes: [],
          sessionCheckpointInterval: 20,
        },
        qualityGates: {
          requireLint: true,
          requireTypeCheck: true,
          requireTests: true,
          requireBuild: true,
          requireLspDiagnostics: true,
          customValidators: [],
        },
        escalation: {
          enabled: true,
          maxAttemptsPerAgent: 2,
          escalationMatrix: {},
          requireExplicitHandoff: true,
        },
        ui: {
          showDelegationWarnings: true,
          showTodoReminders: true,
          showMemoryConfirmations: true,
          verboseLogging: true,
        },
      };

      const result = orxaConfigSchema.safeParse(minimalConfig);
      expect(result.success).toBe(true);
    });

    it('should reject invalid enforcement level', () => {
      const invalidConfig = {
        ...defaultConfig,
        orxa: {
          ...defaultConfig.orxa,
          enforcement: {
            ...defaultConfig.orxa.enforcement,
            delegation: 'invalid',
          },
        },
      };

      const result = orxaConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });

    it('should accept valid enforcement levels', () => {
      const levels = ['strict', 'warn', 'off'];
      
      for (const level of levels) {
        const config = {
          ...defaultConfig,
          orxa: {
            ...defaultConfig.orxa,
            enforcement: {
              ...defaultConfig.orxa.enforcement,
              delegation: level,
            },
          },
        };

        const result = orxaConfigSchema.safeParse(config);
        expect(result.success).toBe(true);
      }
    });

    it('should validate custom agents', () => {
      const config = {
        ...defaultConfig,
        custom_agents: [
          {
            name: 'custom-agent',
            description: 'A custom agent',
            model: 'gpt-4',
            instructions: 'Do something',
            allowedTools: ['read'],
          },
        ],
      };

      const result = orxaConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should reject custom agent without instructions or system_prompt', () => {
      const config = {
        ...defaultConfig,
        custom_agents: [
          {
            name: 'custom-agent',
            description: 'A custom agent',
            model: 'gpt-4',
          },
        ],
      };

      const result = orxaConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('should accept custom agent with system_prompt', () => {
      const config = {
        ...defaultConfig,
        custom_agents: [
          {
            name: 'custom-agent',
            description: 'A custom agent',
            model: 'gpt-4',
            system_prompt: 'You are a custom agent',
          },
        ],
      };

      const result = orxaConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should validate orchestration config', () => {
      const config = {
        ...defaultConfig,
        orchestration: {
          enabled: true,
          max_parallel_workstreams: 5,
          queue_directory: '~/.orxa-queue',
          auto_merge: true,
          conflict_resolution_agent: 'architect',
          worktree_prefix: 'orxa',
          cleanup_worktrees: true,
          require_merge_approval: false,
          workstream_timeout_minutes: 120,
          retry_failed_workstreams: false,
          max_retries: 2,
          queue_poll_interval_ms: 5000,
        },
      };

      const result = orxaConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should reject negative max_parallel_workstreams', () => {
      const config = {
        ...defaultConfig,
        orchestration: {
          ...defaultConfig.orchestration,
          max_parallel_workstreams: -1,
        },
      };

      const result = orxaConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('should reject zero max_parallel_workstreams', () => {
      const config = {
        ...defaultConfig,
        orchestration: {
          ...defaultConfig.orchestration,
          max_parallel_workstreams: 0,
        },
      };

      const result = orxaConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('should validate perAgentRestrictions', () => {
      const config = {
        ...defaultConfig,
        perAgentRestrictions: {
          build: {
            allowedTools: ['read', 'edit'],
            blockedTools: ['bash'],
            maxAttachments: 5,
          },
        },
      };

      const result = orxaConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should reject negative maxAttachments', () => {
      const config = {
        ...defaultConfig,
        perAgentRestrictions: {
          build: {
            maxAttachments: -1,
          },
        },
      };

      const result = orxaConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('should validate qualityGates custom validators', () => {
      const config = {
        ...defaultConfig,
        qualityGates: {
          ...defaultConfig.qualityGates,
          customValidators: [
            {
              name: 'custom-check',
              command: 'npm run custom-check',
              required: true,
            },
          ],
        },
      };

      const result = orxaConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should validate escalation matrix', () => {
      const config = {
        ...defaultConfig,
        escalation: {
          ...defaultConfig.escalation,
          escalationMatrix: {
            coder: 'build',
            build: 'architect',
          },
        },
      };

      const result = orxaConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should validate subagent custom agents', () => {
      const config = {
        ...defaultConfig,
        subagents: {
          ...defaultConfig.subagents,
          custom: [
            {
              name: 'custom-subagent',
              description: 'A custom subagent',
              model: 'gpt-4',
              instructions: 'Do something specific',
              allowedTools: ['read', 'edit'],
            },
          ],
        },
      };

      const result = orxaConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should reject subagent custom without required fields', () => {
      const config = {
        ...defaultConfig,
        subagents: {
          ...defaultConfig.subagents,
          custom: [
            {
              name: 'custom-subagent',
              description: 'A custom subagent',
            },
          ],
        },
      };

      const result = orxaConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('should validate tool aliases', () => {
      const config = {
        ...defaultConfig,
        toolAliases: {
          resolve: {
            apply_patch: 'edit',
            task: 'delegate_task',
          },
        },
      };

      const result = orxaConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should validate mcp configuration', () => {
      const config = {
        ...defaultConfig,
        mcp: {
          playwright: { enabled: true },
          supermemory: { enabled: true },
        },
      };

      const result = orxaConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should validate mcps configuration block', () => {
      const config = {
        ...defaultConfig,
        mcps: {
          enabled: ['playwright'],
          disabled: [],
          config: {
            playwright: {
              headless: true,
              browser: 'chromium',
            },
          },
        },
      };

      const result = orxaConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should reject mcps config without required fields', () => {
      const config = {
        ...defaultConfig,
        mcps: {
          enabled: ['playwright'],
          // missing disabled and config
        },
      };

      const result = orxaConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });
  });

  describe('Type definitions', () => {
    it('should have correct AgentConfig structure', () => {
      const agent: AgentConfig = {
        name: 'test-agent',
        description: 'Test agent',
        model: 'gpt-4',
        temperature: 0.7,
        instructions: 'Test instructions',
        allowedTools: ['read'],
        blockedTools: ['bash'],
      };

      expect(agent.name).toBe('test-agent');
      expect(agent.allowedTools).toContain('read');
    });

    it('should have correct OrxaConfig structure', () => {
      const config: OrxaConfig = defaultConfig;

      expect(config.enabled_agents).toBeDefined();
      expect(config.orxa.enforcement).toBeDefined();
      expect(config.governance.onlyOrxaCanDelegate).toBe(true);
    });
  });
});
