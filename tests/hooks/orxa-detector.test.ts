/**
 * Orxa Detector Hook Tests
 * 
 * Tests for keyword detection, system prompt generation, and delegation prompts.
 */

import {
  shouldTriggerOrxa,
  stripOrxaKeyword,
  getOrxaSystemPrompt,
  createOrchestratorDelegationPrompt,
  orxaDetector,
} from '../../src/hooks/orxa-detector';
import type { HookContext } from '../../src/types';
import { defaultConfig } from '../../src/config/default-config';

describe('Orxa Detector Hook', () => {
  describe('shouldTriggerOrxa', () => {
    it('should return true for messages containing /orchestrate', () => {
      expect(shouldTriggerOrxa('/orchestrate do something')).toBe(true);
    });

    it('should return true for uppercase /ORCHESTRATE', () => {
      expect(shouldTriggerOrxa('/ORCHESTRATE do something')).toBe(true);
    });

    it('should return true for mixed case /OrChEsTrAtE', () => {
      expect(shouldTriggerOrxa('/OrChEsTrAtE do something')).toBe(true);
    });

    it('should return false for messages without /orchestrate', () => {
      expect(shouldTriggerOrxa('do something')).toBe(false);
      expect(shouldTriggerOrxa('organize this')).toBe(false);
      expect(shouldTriggerOrxa('')).toBe(false);
    });

    it('should return false for orchestrate without leading slash', () => {
      expect(shouldTriggerOrxa('orchestrate do something')).toBe(false);
      expect(shouldTriggerOrxa('reorchestrate')).toBe(false);
      expect(shouldTriggerOrxa('orchestrated')).toBe(false);
    });
  });

  describe('stripOrxaKeyword', () => {
    it('should strip lowercase /orchestrate', () => {
      expect(stripOrxaKeyword('/orchestrate implement auth')).toBe('implement auth');
    });

    it('should strip uppercase /ORCHESTRATE', () => {
      expect(stripOrxaKeyword('/ORCHESTRATE implement auth')).toBe('implement auth');
    });

    it('should strip mixed case /OrChEsTrAtE', () => {
      expect(stripOrxaKeyword('/OrChEsTrAtE implement auth')).toBe('implement auth');
    });

    it('should handle multiple /orchestrate occurrences', () => {
      expect(stripOrxaKeyword('/orchestrate /orchestrate implement auth')).toBe('implement auth');
    });

    it('should normalize whitespace after stripping', () => {
      expect(stripOrxaKeyword('/orchestrate   implement   auth')).toBe('implement auth');
    });

    it('should return original message if no /orchestrate command', () => {
      expect(stripOrxaKeyword('implement auth')).toBe('implement auth');
      expect(stripOrxaKeyword('orchestrate implement auth')).toBe('orchestrate implement auth');
    });

    it('should handle empty string', () => {
      expect(stripOrxaKeyword('')).toBe('');
    });
  });

  describe('getOrxaSystemPrompt', () => {
    it('should return system prompt containing ORXA ORCHESTRATION MODE', () => {
      const prompt = getOrxaSystemPrompt();
      expect(prompt).toContain('ORXA ORCHESTRATION MODE');
    });

    it('should contain parallel execution instructions', () => {
      const prompt = getOrxaSystemPrompt();
      expect(prompt).toContain('parallel');
    });

    it('should contain orchestrator role instructions', () => {
      const prompt = getOrxaSystemPrompt();
      expect(prompt).toContain('ORCHESTRATOR');
    });

    it('should contain 6-section delegation template', () => {
      const prompt = getOrxaSystemPrompt();
      expect(prompt).toContain('6-Section Delegation Template');
      expect(prompt).toContain('**Task**:');
      expect(prompt).toContain('**Expected Outcome**:');
      expect(prompt).toContain('**Required Tools**:');
      expect(prompt).toContain('**Must Do**:');
      expect(prompt).toContain('**Must Not Do**:');
      expect(prompt).toContain('**Context**:');
    });

    it('should return consistent prompt on multiple calls', () => {
      const prompt1 = getOrxaSystemPrompt();
      const prompt2 = getOrxaSystemPrompt();
      expect(prompt1).toBe(prompt2);
    });
  });

  describe('createOrchestratorDelegationPrompt', () => {
    it('should include cleaned message in prompt', () => {
      const message = 'implement authentication with login and signup';
      const prompt = createOrchestratorDelegationPrompt(message);
      expect(prompt).toContain(message);
    });

    it('should contain Task section', () => {
      const prompt = createOrchestratorDelegationPrompt('test task');
      expect(prompt).toContain('Task');
    });

    it('should contain Expected Outcome section', () => {
      const prompt = createOrchestratorDelegationPrompt('test task');
      expect(prompt).toContain('Expected Outcome');
    });

    it('should contain orchestrator usage instructions', () => {
      const prompt = createOrchestratorDelegationPrompt('test task');
      expect(prompt).toContain('createOrchestrator');
    });

    it('should contain Must Do section', () => {
      const prompt = createOrchestratorDelegationPrompt('test task');
      expect(prompt).toContain('Must Do');
    });

    it('should contain Must Not Do section', () => {
      const prompt = createOrchestratorDelegationPrompt('test task');
      expect(prompt).toContain('Must Not Do');
    });

    it('should contain Context section', () => {
      const prompt = createOrchestratorDelegationPrompt('test task');
      expect(prompt).toContain('Context');
    });

    it('should not reference orxa-orchestrator agent', () => {
      const prompt = createOrchestratorDelegationPrompt('test task');
      expect(prompt).not.toContain('orxa-orchestrator');
    });

    it('should mention parallel execution', () => {
      const prompt = createOrchestratorDelegationPrompt('test task');
      expect(prompt).toContain('parallel');
    });

    it('should handle empty message', () => {
      const prompt = createOrchestratorDelegationPrompt('');
      expect(prompt).toContain('Task');
    });

    it('should handle complex task descriptions', () => {
      const complexTask = 'Build a full-stack application with React frontend, Node.js backend, PostgreSQL database, and Redis caching';
      const prompt = createOrchestratorDelegationPrompt(complexTask);
      expect(prompt).toContain(complexTask);
      expect(prompt).toContain('parallel');
    });
  });

  describe('orxaDetector', () => {
    const createContext = (overrides: Partial<HookContext> = {}): HookContext => ({
      toolName: overrides.toolName,
      tool: overrides.tool,
      args: overrides.args || {},
      agent: overrides.agent || 'orxa',
      agentName: overrides.agentName || 'orxa',
      config: defaultConfig,
      session: {
        id: 'session-1',
        agentName: 'orxa',
        manualEdits: 0,
        todos: [],
        messages: overrides.session?.messages || [],
        agentAttempts: {},
        messageCount: 0,
        recentMessages: [],
        memoryQueue: [],
      },
      ...overrides,
    });

    it('should allow tool executions without checking', async () => {
      const context = createContext({
        toolName: 'read',
        tool: { name: 'read' },
      });

      const result = await orxaDetector(context);
      expect(result.allow).toBe(true);
      expect(result.metadata).toBeUndefined();
    });

    it('should always allow and skip detection', async () => {
      const context = createContext({
        session: {
          id: 'session-1',
          agentName: 'orxa',
          manualEdits: 0,
          todos: [],
          messages: [
            { role: 'user', content: '/orchestrate build API' },
          ],
          agentAttempts: {},
          messageCount: 1,
          recentMessages: [],
          memoryQueue: [],
        },
      });

      const result = await orxaDetector(context);
      expect(result.allow).toBe(true);
      expect(result.metadata).toBeUndefined();
      expect(result.message).toBeUndefined();
    });

    it('should handle empty message', async () => {
      const context = createContext({
        session: {
          id: 'session-1',
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

      const result = await orxaDetector(context);
      expect(result.allow).toBe(true);
    });

    it('should handle session with no messages', async () => {
      const context = createContext({
        session: undefined,
      });

      const result = await orxaDetector(context);
      expect(result.allow).toBe(true);
    });

    it('should allow multi-line messages without triggering', async () => {
      const context = createContext({
        session: {
          id: 'session-1',
          agentName: 'orxa',
          manualEdits: 0,
          todos: [],
          messages: [
            { role: 'user', content: 'Hello\n\n/orchestrate implement feature\n\nThanks' },
          ],
          agentAttempts: {},
          messageCount: 1,
          recentMessages: [],
          memoryQueue: [],
        },
      });

      const result = await orxaDetector(context);
      expect(result.allow).toBe(true);
      expect(result.metadata).toBeUndefined();
    });
  });
});
