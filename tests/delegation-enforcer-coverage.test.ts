import { enforceDelegation, extractWriteTargets, resolveToolAlias, isWriteTool, matchesAnyGlob, getRecommendedAgent } from '../src/middleware/delegation-enforcer';
import { defaultConfig } from '../src/config/default-config';
import { HookContext } from '../src/types';

describe('Delegation Enforcer - Coverage Tests', () => {
  const createContext = (overrides: Partial<HookContext> = {}): HookContext => {
    const toolName = overrides.toolName ?? overrides.tool?.name ?? 'read';
    const agentName = overrides.agentName ?? overrides.agent ?? 'orxa';

    return {
      toolName,
      tool: overrides.tool ?? { name: toolName },
      args: {},
      agent: agentName,
      agentName,
      config: defaultConfig,
      session: {
        id: 'session-1',
        agentName,
        manualEdits: 0,
        todos: [],
        messages: [],
        agentAttempts: {},
        messageCount: 0,
        recentMessages: [],
        memoryQueue: []
      },
      ...overrides
    };
  };

  describe('extractWriteTargets with apply_patch patchText', () => {
    it('extracts file paths from apply_patch patchText with Add File directive', () => {
      const patchText = '*** Add File: src/components/Button.tsx';
      const result = extractWriteTargets('apply_patch', { patchText });
      expect(result).toContain('src/components/Button.tsx');
    });

    it('extracts file paths from apply_patch patchText with Update File directive', () => {
      const patchText = '*** Update File: .orxa/plans/implementation.md';
      const result = extractWriteTargets('apply_patch', { patchText });
      expect(result).toContain('.orxa/plans/implementation.md');
    });

    it('extracts file paths from apply_patch patchText with Delete File directive', () => {
      const patchText = '*** Delete File: old-file.ts\n*** Delete File: another-file.js';
      const result = extractWriteTargets('apply_patch', { patchText });
      expect(result).toContain('old-file.ts');
      expect(result).toContain('another-file.js');
    });

    it('extracts multiple file paths from apply_patch patchText', () => {
      const patchText = '*** Add File: .orxa/plans/feature.md\n\n*** Update File: src/utils/helpers.ts\n\n*** Delete File: temp.txt';
      const result = extractWriteTargets('apply_patch', { patchText });
      expect(result).toHaveLength(3);
      expect(result).toContain('.orxa/plans/feature.md');
      expect(result).toContain('src/utils/helpers.ts');
      expect(result).toContain('temp.txt');
    });

    it('returns empty array when args is null', () => {
      const result = extractWriteTargets('apply_patch', null);
      expect(result).toEqual([]);
    });

    it('returns empty array when args is not an object', () => {
      const result = extractWriteTargets('apply_patch', 'string');
      expect(result).toEqual([]);
    });

    it('returns empty array when apply_patch has no patchText', () => {
      const result = extractWriteTargets('apply_patch', {});
      expect(result).toEqual([]);
    });

    it('returns empty array when apply_patch patchText is not a string', () => {
      const result = extractWriteTargets('apply_patch', { patchText: 123 });
      expect(result).toEqual([]);
    });

    it('extracts filePath from args for non-apply_patch tools', () => {
      const result = extractWriteTargets('write', { filePath: 'src/test.ts' });
      expect(result).toContain('src/test.ts');
    });

    it('extracts filePaths array from args for non-apply_patch tools', () => {
      const result = extractWriteTargets('write', { filePaths: ['a.ts', 'b.ts'] });
      expect(result).toContain('a.ts');
      expect(result).toContain('b.ts');
    });
  });

  describe('Write tool restrictions for non-plan/non-orxa agents', () => {
    it('blocks write tools for coder agent', () => {
      const context = createContext({
        toolName: 'write',
        tool: { name: 'write' },
        args: { filePath: 'src/test.ts' },
        agent: 'coder',
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(false);
      expect(result.recommendedAgent).toBe('plan');
    });

    it('blocks edit tools for build agent', () => {
      const context = createContext({
        toolName: 'edit',
        tool: { name: 'edit' },
        args: { filePath: 'src/index.ts' },
        agent: 'build',
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(false);
      expect(result.recommendedAgent).toBe('plan');
    });

    it('blocks apply_patch for strategist agent', () => {
      const context = createContext({
        toolName: 'apply_patch',
        tool: { name: 'apply_patch' },
        args: { patchText: '*** Add File: test.txt\ncontent' },
        agent: 'strategist',
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(false);
      expect(result.recommendedAgent).toBe('plan');
    });

    it('blocks write_to_file for reviewer agent', () => {
      const context = createContext({
        toolName: 'write_to_file',
        tool: { name: 'write_to_file' },
        args: { filePath: 'docs/readme.md' },
        agent: 'reviewer',
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(false);
      expect(result.reason).toContain('Write tools are reserved for the plan agent');
    });

    it('blocks replace_file_content for explorer agent', () => {
      const context = createContext({
        toolName: 'replace_file_content',
        tool: { name: 'replace_file_content' },
        args: { filePath: 'config.json' },
        agent: 'explorer',
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(false);
    });

    it('blocks multi_replace_file_content for frontend agent', () => {
      const context = createContext({
        toolName: 'multi_replace_file_content',
        tool: { name: 'multi_replace_file_content' },
        args: { filePaths: ['a.ts', 'b.ts'] },
        agent: 'frontend',
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(false);
    });

    it('recommends plan agent for blocked write tools', () => {
      const context = createContext({
        toolName: 'write',
        tool: { name: 'write' },
        args: { filePath: 'any-file.ts' },
        agent: 'architect',
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(false);
      expect(result.recommendedAgent).toBe('plan');
    });

    it('includes targets in metadata for blocked write tools', () => {
      const context = createContext({
        toolName: 'write',
        tool: { name: 'write' },
        args: { filePath: 'src/main.ts' },
        agent: 'git',
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(false);
      expect(result.metadata?.targets).toContain('src/main.ts');
    });
  });

  describe('Mobile tool blocking for orxa', () => {
    it('blocks ios-simulator_launch_app for orxa', () => {
      const context = createContext({
        toolName: 'ios-simulator_launch_app',
        tool: { name: 'ios-simulator_launch_app' },
        agent: 'orxa',
        config: {
          ...defaultConfig,
          orxa: {
            ...defaultConfig.orxa,
            allowedTools: [...defaultConfig.orxa.allowedTools, 'ios-simulator_launch_app'],
          },
        },
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(false);
      expect(result.reason).toContain('Mobile tooling is blocked for the orxa');
    });

    it('blocks ios-simulator_ui_swipe for orxa', () => {
      const context = createContext({
        toolName: 'ios-simulator_ui_swipe',
        tool: { name: 'ios-simulator_ui_swipe' },
        agent: 'orxa',
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(false);
    });

    it('blocks ios-simulator_record_video for orxa', () => {
      const context = createContext({
        toolName: 'ios-simulator_record_video',
        tool: { name: 'ios-simulator_record_video' },
        agent: 'orxa',
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(false);
    });

    it('blocks ios-simulator_stop_recording for orxa', () => {
      const context = createContext({
        toolName: 'ios-simulator_stop_recording',
        tool: { name: 'ios-simulator_stop_recording' },
        agent: 'orxa',
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(false);
    });

    it('blocks ios-simulator_ui_type for orxa', () => {
      const context = createContext({
        toolName: 'ios-simulator_ui_type',
        tool: { name: 'ios-simulator_ui_type' },
        agent: 'orxa',
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(false);
    });

    it('blocks ios-simulator_ui_describe_all for orxa', () => {
      const context = createContext({
        toolName: 'ios-simulator_ui_describe_all',
        tool: { name: 'ios-simulator_ui_describe_all' },
        agent: 'orxa',
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(false);
    });

    it('blocks ios-simulator_ui_describe_point for orxa', () => {
      const context = createContext({
        toolName: 'ios-simulator_ui_describe_point',
        tool: { name: 'ios-simulator_ui_describe_point' },
        agent: 'orxa',
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(false);
    });

    it('blocks ios-simulator_ui_view for orxa', () => {
      const context = createContext({
        toolName: 'ios-simulator_ui_view',
        tool: { name: 'ios-simulator_ui_view' },
        agent: 'orxa',
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(false);
    });

    it('blocks ios-simulator_get_booted_sim_id for orxa', () => {
      const context = createContext({
        toolName: 'ios-simulator_get_booted_sim_id',
        tool: { name: 'ios-simulator_get_booted_sim_id' },
        agent: 'orxa',
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(false);
    });

    it('blocks ios-simulator_open_simulator for orxa', () => {
      const context = createContext({
        toolName: 'ios-simulator_open_simulator',
        tool: { name: 'ios-simulator_open_simulator' },
        agent: 'orxa',
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(false);
    });

    it('blocks ios-simulator_install_app for orxa', () => {
      const context = createContext({
        toolName: 'ios-simulator_install_app',
        tool: { name: 'ios-simulator_install_app' },
        agent: 'orxa',
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(false);
    });

    it('blocks ios-simulator_screenshot for orxa', () => {
      const context = createContext({
        toolName: 'ios-simulator_screenshot',
        tool: { name: 'ios-simulator_screenshot' },
        agent: 'orxa',
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(false);
    });

    it('recommends appropriate agent for blocked mobile tools', () => {
      const context = createContext({
        toolName: 'ios-simulator_ui_tap',
        tool: { name: 'ios-simulator_ui_tap' },
        agent: 'orxa',
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(false);
      expect(result.recommendedAgent).toBeDefined();
    });
  });

  describe('Plan agent write allowlist enforcement', () => {
    it('blocks plan agent from writing outside allowlist paths', () => {
      const context = createContext({
        toolName: 'write',
        tool: { name: 'write' },
        args: { filePath: 'src/main.ts' },
        agent: 'plan',
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(false);
      expect(result.reason).toContain('Plan agent writes are limited to plan allowlist paths');
      expect(result.recommendedAgent).toBe('plan');
      expect(result.metadata?.targets).toContain('src/main.ts');
    });

    it('blocks plan agent from editing outside allowlist paths', () => {
      const context = createContext({
        toolName: 'edit',
        tool: { name: 'edit' },
        args: { filePath: 'config/settings.json' },
        agent: 'plan',
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(false);
      expect(result.reason).toContain('Plan agent writes are limited to plan allowlist paths');
    });

    it('allows plan agent to write to allowlist paths', () => {
      const context = createContext({
        toolName: 'write',
        tool: { name: 'write' },
        args: { filePath: '.orxa/plans/roadmap.md' },
        agent: 'plan',
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(true);
    });

    it('allows plan agent to edit files in allowlist paths', () => {
      const context = createContext({
        toolName: 'edit',
        tool: { name: 'edit' },
        args: { filePath: '.orxa/plans/feature.md' },
        agent: 'plan',
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(true);
    });
  });

  describe('Session continuity enforcement', () => {
    const validDelegationPrompt = `
## Summary
Quick summary

## Task
Do something

## Expected Outcome
Result

## Required Tools
read

## Must Do
Step 1

## Must Not Do
Don't break things

## Context
Background info
    `;

    it('blocks delegation with mismatched session ID', () => {
      const context = createContext({
        toolName: "task",
        tool: { name: "task" },
        args: {
          prompt: validDelegationPrompt,
          sessionId: 'different-session-123',
        },
        agent: 'orxa',
        session: {
          id: 'current-session-456',
          agentName: 'orxa',
          manualEdits: 0,
          todos: [],
          messages: [],
          agentAttempts: {},
          messageCount: 0,
          recentMessages: [],
          memoryQueue: [],
        },
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(false);
      expect(result.reason).toContain('Delegation must stay within the same session');
      expect(result.metadata?.targetSession).toBe('different-session-123');
      expect(result.metadata?.currentSession).toBe('current-session-456');
    });

    it('blocks delegation with mismatched session ID in nested task object', () => {
      const context = createContext({
        toolName: "task",
        tool: { name: "task" },
        args: {
          prompt: validDelegationPrompt,
          task: { sessionId: 'task-session-789' },
        },
        agent: 'orxa',
        session: {
          id: 'main-session-000',
          agentName: 'orxa',
          manualEdits: 0,
          todos: [],
          messages: [],
          agentAttempts: {},
          messageCount: 0,
          recentMessages: [],
          memoryQueue: [],
        },
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(false);
      expect(result.reason).toContain('Delegation must stay within the same session');
      expect(result.metadata?.targetSession).toBe('task-session-789');
      expect(result.metadata?.currentSession).toBe('main-session-000');
    });

    it('allows delegation with matching session ID', () => {
      const context = createContext({
        toolName: "task",
        tool: { name: "task" },
        args: {
          prompt: validDelegationPrompt,
          sessionId: 'matching-session-111',
        },
        agent: 'orxa',
        session: {
          id: 'matching-session-111',
          agentName: 'orxa',
          manualEdits: 0,
          todos: [],
          messages: [],
          agentAttempts: {},
          messageCount: 0,
          recentMessages: [],
          memoryQueue: [],
        },
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(true);
    });

    it('allows delegation when no session ID is provided', () => {
      const context = createContext({
        toolName: "task",
        tool: { name: "task" },
        args: {
          prompt: validDelegationPrompt,
        },
        agent: 'orxa',
        session: {
          id: 'some-session',
          agentName: 'orxa',
          manualEdits: 0,
          todos: [],
          messages: [],
          agentAttempts: {},
          messageCount: 0,
          recentMessages: [],
          memoryQueue: [],
        },
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(true);
    });
  });

  describe('Context hygiene - Summary section requirement', () => {
    const promptWithoutSummary = `
## Task
Do something

## Expected Outcome
Result

## Required Tools
read

## Must Do
Step 1

## Must Not Do
Don't break things

## Context
Background info
    `;

    const promptWithSummary = `
## Summary
This is a summary

## Task
Do something

## Expected Outcome
Result

## Required Tools
read

## Must Do
Step 1

## Must Not Do
Don't break things

## Context
Background info
    `;

    it('allows delegation without Summary section when not required', () => {
      const context = createContext({
        toolName: "task",
        tool: { name: "task" },
        args: { prompt: promptWithoutSummary },
        agent: 'orxa',
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(true);
    });

    it('allows delegation with Summary section', () => {
      const context = createContext({
        toolName: "task",
        tool: { name: "task" },
        args: { prompt: promptWithSummary },
        agent: 'orxa',
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(true);
    });

    it('allows delegation with Summary header using different format', () => {
      const promptWithAltSummary = `
Summary:
Alternative summary format

## Task
Do something

## Expected Outcome
Result

## Required Tools
read

## Must Do
Step 1

## Must Not Do
Don't break things

## Context
Background info
      `;
      const context = createContext({
        toolName: "task",
        tool: { name: "task" },
        args: { prompt: promptWithAltSummary },
        agent: 'orxa',
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(true);
    });
  });

  describe('Tool output character limit', () => {
    const validDelegationPromptWithSummary = `
## Summary
Quick summary

## Task
Do something

## Expected Outcome
Result

## Required Tools
read

## Must Do
Step 1

## Must Not Do
Don't break things

## Context
Background info
    `;

    it('blocks delegation with excessive tool output characters', () => {
      // Create a string that exceeds the maxToolOutputChars limit (default is 4000)
      const excessiveOutput = 'x'.repeat(4001);
      const context = createContext({
        toolName: "task",
        tool: { name: "task" },
        args: {
          prompt: validDelegationPromptWithSummary,
          context: {
            toolOutputs: excessiveOutput,
          },
        },
        agent: 'orxa',
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(false);
      expect(result.reason).toContain('exceeds tool output limit');
      expect(result.metadata?.toolOutputChars).toBe(4001);
    });

    it('blocks delegation with excessive tool output in array format', () => {
      const excessiveOutput = ['x'.repeat(2000), 'y'.repeat(2001)];
      const context = createContext({
        toolName: "task",
        tool: { name: "task" },
        args: {
          prompt: validDelegationPromptWithSummary,
          context: {
            toolOutputs: excessiveOutput,
          },
        },
        agent: 'orxa',
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(false);
      expect(result.reason).toContain('exceeds tool output limit');
      expect(result.metadata?.toolOutputChars).toBe(4001);
    });

    it('blocks delegation with excessive tool output in object array format', () => {
      const excessiveOutput = [
        { content: 'x'.repeat(2500) },
        { content: 'y'.repeat(1501) },
      ];
      const context = createContext({
        toolName: "task",
        tool: { name: "task" },
        args: {
          prompt: validDelegationPromptWithSummary,
          context: {
            toolOutputs: excessiveOutput,
          },
        },
        agent: 'orxa',
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(false);
      expect(result.reason).toContain('exceeds tool output limit');
      expect(result.metadata?.toolOutputChars).toBe(4001);
    });

    it('allows delegation with tool output under the limit', () => {
      const acceptableOutput = 'x'.repeat(3999);
      const context = createContext({
        toolName: "task",
        tool: { name: "task" },
        args: {
          prompt: validDelegationPromptWithSummary,
          context: {
            toolOutputs: acceptableOutput,
          },
        },
        agent: 'orxa',
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(true);
    });

    it('allows delegation with toolOutput field (singular)', () => {
      const acceptableOutput = 'x'.repeat(1000);
      const context = createContext({
        toolName: "task",
        tool: { name: "task" },
        args: {
          prompt: validDelegationPromptWithSummary,
          context: {
            toolOutput: acceptableOutput,
          },
        },
        agent: 'orxa',
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(true);
    });

    it('blocks delegation with excessive toolOutput field (singular)', () => {
      const excessiveOutput = 'x'.repeat(4001);
      const context = createContext({
        toolName: "task",
        tool: { name: "task" },
        args: {
          prompt: validDelegationPromptWithSummary,
          context: {
            toolOutput: excessiveOutput,
          },
        },
        agent: 'orxa',
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(false);
      expect(result.reason).toContain('exceeds tool output limit');
    });
  });

  describe('Delegation enforcement modes', () => {
    const validDelegationPrompt = `
## Summary
Quick summary

## Task
Do something

## Expected Outcome
Result

## Required Tools
read

## Must Do
Step 1

## Must Not Do
Don't break things

## Context
Background info
    `;

    it('returns warning when delegation mode is off', () => {
      const context = createContext({
        toolName: "task",
        tool: { name: "task" },
        args: { prompt: 'incomplete prompt' },
        agent: 'coder',
        config: {
          ...defaultConfig,
          orxa: {
            ...defaultConfig.orxa,
            enforcement: {
              ...defaultConfig.orxa.enforcement,
              delegation: 'off',
            },
          },
        },
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings?.length).toBeGreaterThan(0);
    });

    it('returns warning when delegation mode is warn', () => {
      const context = createContext({
        toolName: "task",
        tool: { name: "task" },
        args: { prompt: 'incomplete prompt' },
        agent: 'coder',
        config: {
          ...defaultConfig,
          orxa: {
            ...defaultConfig.orxa,
            enforcement: {
              ...defaultConfig.orxa.enforcement,
              delegation: 'warn',
            },
          },
        },
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings?.length).toBeGreaterThan(0);
    });
  });

  describe('Per-agent restrictions', () => {
    it('blocks tool not in allowed list for agent', () => {
      const context = createContext({
        toolName: 'bash',
        tool: { name: 'bash' },
        agent: 'restricted-agent',
        config: {
          ...defaultConfig,
          perAgentRestrictions: {
            'restricted-agent': {
              allowedTools: ['read', 'write'],
            },
          },
        },
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(false);
      expect(result.reason).toContain('not in the allowed list');
      expect(result.recommendedAgent).toBe('build');
    });

    it('blocks explicitly blocked tool for agent', () => {
      const context = createContext({
        toolName: 'edit',
        tool: { name: 'edit' },
        agent: 'limited-agent',
        config: {
          ...defaultConfig,
          perAgentRestrictions: {
            'limited-agent': {
              blockedTools: ['edit', 'write'],
            },
          },
        },
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(false);
      expect(result.reason).toContain('blocked');
      expect(result.recommendedAgent).toBe('plan');
    });
  });

  describe('getRecommendedAgent helper', () => {
    it('recommends orxa for delegate_task', () => {
      const context = createContext({
        toolName: "task",
        tool: { name: "task" },
        agent: 'coder',
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(false);
      expect(result.recommendedAgent).toBe('orxa');
    });

    it('recommends plan for grep tool', () => {
      const context = createContext({
        toolName: 'grep',
        tool: { name: 'grep' },
        agent: 'coder',
        config: {
          ...defaultConfig,
          perAgentRestrictions: {
            'coder': {
              blockedTools: ['grep'],
            },
          },
        },
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(false);
      expect(result.recommendedAgent).toBe('plan');
    });

    it('recommends plan for glob tool', () => {
      const context = createContext({
        toolName: 'glob',
        tool: { name: 'glob' },
        agent: 'coder',
        config: {
          ...defaultConfig,
          perAgentRestrictions: {
            'coder': {
              blockedTools: ['glob'],
            },
          },
        },
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(false);
      expect(result.recommendedAgent).toBe('plan');
    });

    it('recommends build for bash tool', () => {
      const context = createContext({
        toolName: 'bash',
        tool: { name: 'bash' },
        agent: 'coder',
        config: {
          ...defaultConfig,
          perAgentRestrictions: {
            'coder': {
              blockedTools: ['bash'],
            },
          },
        },
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(false);
      expect(result.recommendedAgent).toBe('build');
    });

    it('recommends plan for write tools', () => {
      const context = createContext({
        toolName: 'write',
        tool: { name: 'write' },
        args: { filePath: 'test.ts' },
        agent: 'coder',
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(false);
      expect(result.recommendedAgent).toBe('plan');
    });

    it('recommends build for other tools', () => {
      const context = createContext({
        toolName: 'unknown_tool',
        tool: { name: 'unknown_tool' },
        agent: 'coder',
        config: {
          ...defaultConfig,
          perAgentRestrictions: {
            'coder': {
              blockedTools: ['unknown_tool'],
            },
          },
        },
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(false);
      expect(result.recommendedAgent).toBe('build');
    });
  });

  describe('Image extraction from attachments', () => {
    const validDelegationPrompt = `
## Summary
Quick summary

## Task
Do something

## Expected Outcome
Result

## Required Tools
read

## Must Do
Step 1

## Must Not Do
Don't break things

## Context
Background info
    `;

    it('counts images from attachments array with mimeType', () => {
      const context = createContext({
        toolName: "task",
        tool: { name: "task" },
        args: {
          prompt: validDelegationPrompt,
          attachments: [
            { type: 'text', mimeType: 'text/plain' },
            { type: 'image', mimeType: 'image/png' },
            { type: 'image', mimeType: 'image/jpeg' },
          ],
        },
        agent: 'orxa',
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(true);
    });

    it('counts images from attachments with type field only', () => {
      const context = createContext({
        toolName: "task",
        tool: { name: "task" },
        args: {
          prompt: validDelegationPrompt,
          attachments: [
            { type: 'image' },
            { type: 'document' },
            { type: 'image' },
          ],
        },
        agent: 'orxa',
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(true);
    });

    it('filters out non-object items in attachments array', () => {
      const context = createContext({
        toolName: "task",
        tool: { name: "task" },
        args: {
          prompt: validDelegationPrompt,
          attachments: [
            { type: 'image', mimeType: 'image/png' },
            null,
            'string-item',
            123,
            { type: 'image', mimeType: 'image/jpeg' },
          ],
        },
        agent: 'orxa',
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(true);
    });

    it('blocks when attachments exceed image limit', () => {
      const attachments = Array(12).fill({ type: 'image', mimeType: 'image/png' });
      const context = createContext({
        toolName: "task",
        tool: { name: "task" },
        args: {
          prompt: validDelegationPrompt,
          attachments,
        },
        agent: 'orxa',
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(false);
      expect(result.reason).toContain('too many images');
    });
  });

  describe('resolveToolAlias edge cases', () => {
    it('normalizes tool names with whitespace', () => {
      const result = resolveToolAlias('  read  ', defaultConfig.toolAliases?.resolve || {});
      expect(result).toBe('read');
    });

    it('resolves aliased tool with whitespace', () => {
      const result = resolveToolAlias('  apply_patch  ', defaultConfig.toolAliases?.resolve || {});
      expect(result).toBe('edit');
    });
  });

  describe('isWriteTool helper', () => {
    it('returns true for write tools', () => {
      expect(isWriteTool('write')).toBe(true);
      expect(isWriteTool('edit')).toBe(true);
      expect(isWriteTool('apply_patch')).toBe(true);
      expect(isWriteTool('write_to_file')).toBe(true);
      expect(isWriteTool('replace_file_content')).toBe(true);
      expect(isWriteTool('multi_replace_file_content')).toBe(true);
    });

    it('returns false for non-write tools', () => {
      expect(isWriteTool('read')).toBe(false);
      expect(isWriteTool('grep')).toBe(false);
      expect(isWriteTool('bash')).toBe(false);
    });
  });

  describe('matchesAnyGlob helper', () => {
    it('matches simple glob patterns', () => {
      expect(matchesAnyGlob('src/test.ts', ['src/*.ts'])).toBe(true);
      expect(matchesAnyGlob('src/nested/test.ts', ['src/*.ts'])).toBe(false);
    });

    it('matches glob patterns with dot option', () => {
      expect(matchesAnyGlob('.orxa/plans/test.md', ['.orxa/plans/*.md'])).toBe(true);
      expect(matchesAnyGlob('.orxa/plans/nested/test.md', ['.orxa/plans/*.md'])).toBe(false);
    });

    it('returns false when no patterns match', () => {
      expect(matchesAnyGlob('src/test.ts', ['docs/*.md'])).toBe(false);
    });
  });

  describe('Explicit delegation prompt', () => {
    const validDelegationPrompt = `
## Summary
Quick summary

## Task
Do something

## Expected Outcome
Result

## Required Tools
read

## Must Do
Step 1

## Must Not Do
Don't break things

## Context
Background info
    `;

    it('uses explicit delegationPrompt over args.prompt', () => {
      const context = createContext({
        toolName: "task",
        tool: { name: "task" },
        args: {
          prompt: 'incomplete prompt missing sections',
        },
        delegationPrompt: validDelegationPrompt,
        agent: 'orxa',
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(true);
    });

    it('prefers explicit delegationPrompt over nested prompt in args', () => {
      const context = createContext({
        toolName: "task",
        tool: { name: "task" },
        args: {
          message: { prompt: 'incomplete nested prompt' },
        },
        delegationPrompt: validDelegationPrompt,
        agent: 'orxa',
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(true);
    });
  });

  describe('Tool output extraction edge cases', () => {
    it('returns 0 when context is not an object', () => {
      const context = createContext({
        toolName: "task",
        tool: { name: "task" },
        args: {
          prompt: `
## Summary
Test

## Task
Do something

## Expected Outcome
Result

## Required Tools
read

## Must Do
Step 1

## Must Not Do
Don't break things

## Context
Background info
          `,
          context: 'not an object',
        },
        agent: 'orxa',
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(true);
    });

    it('returns 0 when context has no toolOutputs or toolOutput', () => {
      const context = createContext({
        toolName: "task",
        tool: { name: "task" },
        args: {
          prompt: `
## Summary
Test

## Task
Do something

## Expected Outcome
Result

## Required Tools
read

## Must Do
Step 1

## Must Not Do
Don't break things

## Context
Background info
          `,
          context: {
            otherField: 'value',
          },
        },
        agent: 'orxa',
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(true);
    });

    it('handles array with non-string non-object items', () => {
      const context = createContext({
        toolName: "task",
        tool: { name: "task" },
        args: {
          prompt: `
## Summary
Test

## Task
Do something

## Expected Outcome
Result

## Required Tools
read

## Must Do
Step 1

## Must Not Do
Don't break things

## Context
Background info
          `,
          context: {
            toolOutputs: [null, 123, true, 'valid string'],
          },
        },
        agent: 'orxa',
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(true);
      expect(result.metadata?.toolOutputChars).toBeUndefined();
    });

    it('handles array with objects missing content field', () => {
      const context = createContext({
        toolName: "task",
        tool: { name: "task" },
        args: {
          prompt: `
## Summary
Test

## Task
Do something

## Expected Outcome
Result

## Required Tools
read

## Must Do
Step 1

## Must Not Do
Don't break things

## Context
Background info
          `,
          context: {
            toolOutputs: [{ otherField: 'value' }, { content: 123 }],
          },
        },
        agent: 'orxa',
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(true);
      expect(result.metadata?.toolOutputChars).toBeUndefined();
    });
  });
});
