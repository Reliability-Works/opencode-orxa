import { enforceDelegation, resolveToolAlias, isWriteTool, matchesAnyGlob, getRecommendedAgent } from '../src/middleware/delegation-enforcer';
import { defaultConfig } from '../src/config/default-config';
import { HookContext } from '../src/types';

describe('Delegation Enforcer', () => {
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

  describe('Tool Alias Resolution', () => {
    it('resolves apply_patch to edit', () => {
      const result = resolveToolAlias('apply_patch', defaultConfig.toolAliases?.resolve || {});
      expect(result).toBe('edit');
    });

    it('resolves task to delegate_task', () => {
      const result = resolveToolAlias('task', defaultConfig.toolAliases?.resolve || {});
      expect(result).toBe('delegate_task');
    });

    it('returns original name if no alias', () => {
      const result = resolveToolAlias('read', defaultConfig.toolAliases?.resolve || {});
      expect(result).toBe('read');
    });
  });

  describe('Orxa Tool Restrictions', () => {
    it('blocks orxa from using edit tool', () => {
      const context = createContext({
        toolName: 'edit',
        tool: { name: 'edit' },
        agent: 'orxa'
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(false);
    });

    it('allows orxa to use read', () => {
      const context = createContext({
        toolName: 'read',
        tool: { name: 'read' },
        agent: 'orxa'
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(true);
    });

    it('blocks orxa from using grep', () => {
      const context = createContext({
        toolName: 'grep',
        tool: { name: 'grep' },
        agent: 'orxa'
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(false);
    });

    it('blocks orxa from using glob', () => {
      const context = createContext({
        toolName: 'glob',
        tool: { name: 'glob' },
        agent: 'orxa'
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(false);
    });
  });

  describe('Delegation Gate', () => {
    it('blocks non-orxa from using delegate_task', () => {
      const context = createContext({
        toolName: 'delegate_task',
        tool: { name: 'delegate_task' },
        agent: 'coder'
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(false);
    });

    it('allows orxa to use delegate_task', () => {
      const context = createContext({
        toolName: 'delegate_task',
        tool: { name: 'delegate_task' },
        args: { prompt: validDelegationPrompt },
        agent: 'orxa'
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(true);
    });
  });

  describe('Memory Gate', () => {
    it('blocks subagent from using supermemory add', () => {
      const context = createContext({
        toolName: 'supermemory',
        tool: { name: 'supermemory' },
        args: { mode: 'add' },
        agent: 'coder'
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(false);
    });

    it('allows orxa to use supermemory add', () => {
      const context = createContext({
        toolName: 'supermemory',
        tool: { name: 'supermemory' },
        args: { mode: 'add' },
        agent: 'orxa'
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(true);
    });
  });

  describe('Mobile Tool Block', () => {
    it('blocks orxa from using ios-simulator tools', () => {
      const context = createContext({
        toolName: 'ios-simulator_ui_tap',
        tool: { name: 'ios-simulator_ui_tap' },
        agent: 'orxa'
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(false);
    });
  });

  describe('Plan-Only Write Gate', () => {
    it('allows orxa to write to plan files', () => {
      const context = createContext({
        toolName: 'write',
        tool: { name: 'write' },
        args: { filePath: '.opencode/plans/test.md' },
        agent: 'orxa'
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(true);
    });

    it('blocks orxa from writing outside plan files', () => {
      const context = createContext({
        toolName: 'write',
        tool: { name: 'write' },
        args: { filePath: 'src/index.ts' },
        agent: 'orxa'
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(false);
    });
  });

  describe('Multimodal Batch Limit', () => {
    it('blocks multimodal delegation with >10 images', () => {
      const context = createContext({
        toolName: 'delegate_task',
        tool: { name: 'delegate_task' },
        args: {
          agent: 'multimodal',
          images: new Array(11).fill('image.jpg'),
          prompt: validDelegationPrompt
        },
        agent: 'orxa'
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(false);
    });

    it('allows multimodal delegation with ≤10 images', () => {
      const context = createContext({
        toolName: 'delegate_task',
        tool: { name: 'delegate_task' },
        args: {
          agent: 'multimodal',
          images: new Array(10).fill('image.jpg'),
          prompt: validDelegationPrompt
        },
        agent: 'orxa'
      });
      const result = enforceDelegation(context);
      expect(result.allow).toBe(true);
    });
  });
});
