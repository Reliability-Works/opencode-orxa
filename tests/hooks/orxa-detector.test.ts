/**
 * Orxa Detector Hook Tests
 * 
 * Tests for keyword detection, system prompt generation, and delegation prompts.
 */

import {
  detectOrxaKeyword,
  shouldTriggerOrxa,
  stripOrxaKeyword,
  getOrxaSystemPrompt,
  createOrchestratorDelegationPrompt,
  orxaDetector,
} from '../../src/hooks/orxa-detector';
import type { HookContext } from '../../src/types';
import { defaultConfig } from '../../src/config/default-config';

describe('Orxa Detector Hook', () => {
  describe('detectOrxaKeyword', () => {
    it('should detect "orxa" keyword at start of message', () => {
      const result = detectOrxaKeyword('orxa implement authentication');
      expect(result.triggered).toBe(true);
      expect(result.cleaned_message).toBe('implement authentication');
      expect(result.keyword_variant).toBe('orxa');
    });

    it('should detect "orxa" keyword in middle of message', () => {
      const result = detectOrxaKeyword('Please orxa implement authentication');
      expect(result.triggered).toBe(true);
      expect(result.cleaned_message).toBe('Please implement authentication');
    });

    it('should detect "orxa" keyword at end of message', () => {
      const result = detectOrxaKeyword('implement authentication orxa');
      expect(result.triggered).toBe(true);
      expect(result.cleaned_message).toBe('implement authentication');
    });

    it('should detect uppercase ORXA', () => {
      const result = detectOrxaKeyword('ORXA implement authentication');
      expect(result.triggered).toBe(true);
      expect(result.cleaned_message).toBe('implement authentication');
      expect(result.keyword_variant).toBe('ORXA');
    });

    it('should detect mixed case OrXa', () => {
      const result = detectOrxaKeyword('OrXa implement authentication');
      expect(result.triggered).toBe(true);
      expect(result.cleaned_message).toBe('implement authentication');
    });

    it('should not trigger on partial matches', () => {
      const result = detectOrxaKeyword('orxanize this code');
      expect(result.triggered).toBe(false);
      expect(result.cleaned_message).toBe('orxanize this code');
    });

    it('should not trigger on substring within word', () => {
      const result = detectOrxaKeyword('worxable solution');
      expect(result.triggered).toBe(false);
      expect(result.cleaned_message).toBe('worxable solution');
    });

    it('should handle multiple orxa keywords', () => {
      const result = detectOrxaKeyword('orxa orxa implement authentication');
      expect(result.triggered).toBe(true);
      expect(result.cleaned_message).toBe('implement authentication');
    });

    it('should handle empty message', () => {
      const result = detectOrxaKeyword('');
      expect(result.triggered).toBe(false);
      expect(result.cleaned_message).toBe('');
    });

    it('should handle whitespace-only message', () => {
      const result = detectOrxaKeyword('   ');
      expect(result.triggered).toBe(false);
      // Whitespace-only messages remain as-is when no keyword detected
      expect(result.cleaned_message).toBe('   ');
    });

    it('should preserve task description', () => {
      const result = detectOrxaKeyword('orxa build a REST API with users and posts');
      expect(result.triggered).toBe(true);
      expect(result.task_description).toBe('build a REST API with users and posts');
    });
  });

  describe('shouldTriggerOrxa', () => {
    it('should return true for messages containing orxa', () => {
      expect(shouldTriggerOrxa('orxa do something')).toBe(true);
    });

    it('should return true for uppercase ORXA', () => {
      expect(shouldTriggerOrxa('ORXA do something')).toBe(true);
    });

    it('should return true for mixed case OrXa', () => {
      expect(shouldTriggerOrxa('OrXa do something')).toBe(true);
    });

    it('should return false for messages without orxa', () => {
      expect(shouldTriggerOrxa('do something')).toBe(false);
      expect(shouldTriggerOrxa('organize this')).toBe(false);
      expect(shouldTriggerOrxa('')).toBe(false);
    });

    it('should return false for partial matches', () => {
      expect(shouldTriggerOrxa('worxable')).toBe(false);
      expect(shouldTriggerOrxa('orxanize')).toBe(false);
    });
  });

  describe('stripOrxaKeyword', () => {
    it('should strip lowercase orxa', () => {
      expect(stripOrxaKeyword('orxa implement auth')).toBe('implement auth');
    });

    it('should strip uppercase ORXA', () => {
      expect(stripOrxaKeyword('ORXA implement auth')).toBe('implement auth');
    });

    it('should strip mixed case OrXa', () => {
      expect(stripOrxaKeyword('OrXa implement auth')).toBe('implement auth');
    });

    it('should handle multiple orxa occurrences', () => {
      expect(stripOrxaKeyword('orxa orxa implement auth')).toBe('implement auth');
    });

    it('should normalize whitespace after stripping', () => {
      expect(stripOrxaKeyword('orxa   implement   auth')).toBe('implement auth');
    });

    it('should return original message if no orxa keyword', () => {
      expect(stripOrxaKeyword('implement auth')).toBe('implement auth');
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

    it('should contain orchestration format instructions', () => {
      const prompt = getOrxaSystemPrompt();
      expect(prompt).toContain('createOrchestrator');
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

    it('should detect orxa keyword in user message', async () => {
      const context = createContext({
        session: {
          id: 'session-1',
          agentName: 'orxa',
          manualEdits: 0,
          todos: [],
          messages: [
            { role: 'user', content: 'orxa implement authentication' },
          ],
          agentAttempts: {},
          messageCount: 1,
          recentMessages: [],
          memoryQueue: [],
        },
      });

      const result = await orxaDetector(context);
      expect(result.allow).toBe(true);
      expect(result.metadata?.orxa_triggered).toBe(true);
      expect(result.metadata?.cleaned_message).toBe('implement authentication');
    });

    it('should inject system prompt when orxa triggered', async () => {
      const context = createContext({
        session: {
          id: 'session-1',
          agentName: 'orxa',
          manualEdits: 0,
          todos: [],
          messages: [
            { role: 'user', content: 'orxa build API' },
          ],
          agentAttempts: {},
          messageCount: 1,
          recentMessages: [],
          memoryQueue: [],
        },
      });

      const result = await orxaDetector(context);
      expect(result.metadata?.inject_system_prompt).toContain('ORXA ORCHESTRATION MODE');
    });

    it('should return activation message when triggered', async () => {
      const context = createContext({
        session: {
          id: 'session-1',
          agentName: 'orxa',
          manualEdits: 0,
          todos: [],
          messages: [
            { role: 'user', content: 'orxa build API' },
          ],
          agentAttempts: {},
          messageCount: 1,
          recentMessages: [],
          memoryQueue: [],
        },
      });

      const result = await orxaDetector(context);
      expect(result.message).toContain('ORXA MODE ACTIVATED');
    });

    it('should not trigger on non-orxa messages', async () => {
      const context = createContext({
        session: {
          id: 'session-1',
          agentName: 'orxa',
          manualEdits: 0,
          todos: [],
          messages: [
            { role: 'user', content: 'implement authentication' },
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

    it('should detect orxa in multi-line message', async () => {
      const context = createContext({
        session: {
          id: 'session-1',
          agentName: 'orxa',
          manualEdits: 0,
          todos: [],
          messages: [
            { role: 'user', content: 'Hello\n\norxa implement feature\n\nThanks' },
          ],
          agentAttempts: {},
          messageCount: 1,
          recentMessages: [],
          memoryQueue: [],
        },
      });

      const result = await orxaDetector(context);
      expect(result.metadata?.orxa_triggered).toBe(true);
    });
  });
});
