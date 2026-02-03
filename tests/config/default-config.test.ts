/**
 * Default Config Tests
 * 
 * Tests for default configuration values and helper functions.
 */

import {
  defaultConfig,
  getDefaultMemoryAutomation,
  PRIMARY_AGENTS,
  SUBAGENTS,
} from '../../src/config/default-config';

describe('Default Config', () => {
  describe('getDefaultMemoryAutomation', () => {
    it('should return "strict" by default', () => {
      const result = getDefaultMemoryAutomation();
      expect(result).toBe('strict');
    });

    it('should return valid enforcement level', () => {
      const result = getDefaultMemoryAutomation();
      expect(['strict', 'warn', 'off']).toContain(result);
    });
  });

  describe('PRIMARY_AGENTS', () => {
    it('should contain orxa', () => {
      expect(PRIMARY_AGENTS).toContain('orxa');
    });

    it('should contain plan', () => {
      expect(PRIMARY_AGENTS).toContain('plan');
    });

    it('should have exactly 2 primary agents', () => {
      expect(PRIMARY_AGENTS).toHaveLength(2);
    });
  });

  describe('SUBAGENTS', () => {
    it('should contain all expected subagents', () => {
      expect(SUBAGENTS).toContain('strategist');
      expect(SUBAGENTS).toContain('reviewer');
      expect(SUBAGENTS).toContain('build');
      expect(SUBAGENTS).toContain('coder');
      expect(SUBAGENTS).toContain('frontend');
      expect(SUBAGENTS).toContain('architect');
      expect(SUBAGENTS).toContain('git');
      expect(SUBAGENTS).toContain('explorer');
      expect(SUBAGENTS).toContain('librarian');
      expect(SUBAGENTS).toContain('navigator');
      expect(SUBAGENTS).toContain('writer');
      expect(SUBAGENTS).toContain('multimodal');
      expect(SUBAGENTS).toContain('mobile-simulator');
    });

    it('should have 13 subagents', () => {
      expect(SUBAGENTS).toHaveLength(13);
    });
  });

  describe('defaultConfig structure', () => {
    it('should have enabled_agents array', () => {
      expect(Array.isArray(defaultConfig.enabled_agents)).toBe(true);
      expect(defaultConfig.enabled_agents.length).toBeGreaterThan(0);
    });

    it('should have disabled_agents array', () => {
      expect(Array.isArray(defaultConfig.disabled_agents)).toBe(true);
    });

    it('should have agent_overrides object', () => {
      expect(typeof defaultConfig.agent_overrides).toBe('object');
    });

    it('should have custom_agents array', () => {
      expect(Array.isArray(defaultConfig.custom_agents)).toBe(true);
    });

    it('should have mcps configuration', () => {
      expect(typeof defaultConfig.mcps).toBe('object');
      expect(Array.isArray(defaultConfig.mcps.enabled)).toBe(true);
      expect(Array.isArray(defaultConfig.mcps.disabled)).toBe(true);
      expect(typeof defaultConfig.mcps.config).toBe('object');
    });

    it('should have ios-simulator and playwright enabled by default', () => {
      expect(defaultConfig.mcps.enabled).toContain('ios-simulator');
      expect(defaultConfig.mcps.enabled).toContain('playwright');
    });

    it('should have toolAliases with resolve object', () => {
      expect(typeof defaultConfig.toolAliases).toBe('object');
      expect(typeof defaultConfig.toolAliases.resolve).toBe('object');
    });

    it('should have orxa configuration', () => {
      expect(typeof defaultConfig.orxa).toBe('object');
      expect(defaultConfig.orxa.model).toBeDefined();
      expect(Array.isArray(defaultConfig.orxa.allowedTools)).toBe(true);
      expect(Array.isArray(defaultConfig.orxa.blockedTools)).toBe(true);
    });

    it('should have governance configuration', () => {
      expect(typeof defaultConfig.governance).toBe('object');
      expect(typeof defaultConfig.governance.onlyOrxaCanDelegate).toBe('boolean');
      expect(typeof defaultConfig.governance.blockSupermemoryAddForSubagents).toBe('boolean');
    });

    it('should have subagents configuration', () => {
      expect(typeof defaultConfig.subagents).toBe('object');
      expect(typeof defaultConfig.subagents.defaults).toBe('object');
      expect(typeof defaultConfig.subagents.overrides).toBe('object');
      expect(Array.isArray(defaultConfig.subagents.custom)).toBe(true);
    });

    it('should have memory configuration', () => {
      expect(typeof defaultConfig.memory).toBe('object');
      expect(typeof defaultConfig.memory.autoExtract).toBe('boolean');
      expect(Array.isArray(defaultConfig.memory.extractPatterns)).toBe(true);
    });

    it('should have qualityGates configuration', () => {
      expect(typeof defaultConfig.qualityGates).toBe('object');
      expect(typeof defaultConfig.qualityGates.requireLint).toBe('boolean');
      expect(typeof defaultConfig.qualityGates.requireTypeCheck).toBe('boolean');
      expect(typeof defaultConfig.qualityGates.requireTests).toBe('boolean');
      expect(typeof defaultConfig.qualityGates.requireBuild).toBe('boolean');
      expect(typeof defaultConfig.qualityGates.requireLspDiagnostics).toBe('boolean');
    });

    it('should have escalation configuration', () => {
      expect(typeof defaultConfig.escalation).toBe('object');
      expect(typeof defaultConfig.escalation.enabled).toBe('boolean');
      expect(typeof defaultConfig.escalation.maxAttemptsPerAgent).toBe('number');
    });

    it('should have ui configuration', () => {
      expect(typeof defaultConfig.ui).toBe('object');
      expect(typeof defaultConfig.ui.showDelegationWarnings).toBe('boolean');
      expect(typeof defaultConfig.ui.showTodoReminders).toBe('boolean');
      expect(typeof defaultConfig.ui.showMemoryConfirmations).toBe('boolean');
      expect(typeof defaultConfig.ui.verboseLogging).toBe('boolean');
    });

    it('should have orchestration configuration', () => {
      expect(typeof defaultConfig.orchestration).toBe('object');
      expect(typeof defaultConfig.orchestration?.enabled).toBe('boolean');
      expect(typeof defaultConfig.orchestration?.max_parallel_workstreams).toBe('number');
      expect(typeof defaultConfig.orchestration?.auto_merge).toBe('boolean');
    });
  });

  describe('defaultConfig values', () => {
    it('should have correct tool aliases', () => {
      expect(defaultConfig.toolAliases.resolve.apply_patch).toBe('edit');
      expect(defaultConfig.toolAliases.resolve.task).toBeUndefined();
    });

    it('should have correct orxa model', () => {
      expect(defaultConfig.orxa.model).toBe('opencode/kimi-k2.5');
    });

    it('should have correct enforcement levels', () => {
      expect(defaultConfig.orxa.enforcement.delegation).toBe('strict');
      expect(defaultConfig.orxa.enforcement.todoCompletion).toBe('strict');
      expect(defaultConfig.orxa.enforcement.qualityGates).toBe('strict');
      expect(defaultConfig.orxa.enforcement.memoryAutomation).toBe('strict');
    });

    it('should have correct governance settings', () => {
      expect(defaultConfig.governance.onlyOrxaCanDelegate).toBe(true);
      expect(defaultConfig.governance.blockSupermemoryAddForSubagents).toBe(true);
      expect(defaultConfig.governance.delegationTemplate.required).toBe(true);
    });

    it('should have correct delegation template sections', () => {
      const sections = defaultConfig.governance.delegationTemplate.requiredSections;
      expect(sections).toContain('Task');
      expect(sections).toContain('Expected Outcome');
      expect(sections).toContain('Required Tools');
      expect(sections).toContain('Must Do');
      expect(sections).toContain('Must Not Do');
      expect(sections).toContain('Context');
    });

    it('should have correct orchestration defaults', () => {
      expect(defaultConfig.orchestration?.enabled).toBe(true);
      expect(defaultConfig.orchestration?.max_parallel_workstreams).toBe(5);
      expect(defaultConfig.orchestration?.auto_merge).toBe(true);
      expect(defaultConfig.orchestration?.conflict_resolution_agent).toBe('architect');
      expect(defaultConfig.orchestration?.worktree_prefix).toBe('orxa');
      expect(defaultConfig.orchestration?.cleanup_worktrees).toBe(true);
    });

    it('should have all primary and subagents enabled', () => {
      const expectedAgents = [...PRIMARY_AGENTS, ...SUBAGENTS];
      expect(defaultConfig.enabled_agents).toEqual(expect.arrayContaining(expectedAgents));
    });

    it('should have subagent overrides for key agents', () => {
      expect(defaultConfig.agent_overrides.build).toBeDefined();
      expect(defaultConfig.agent_overrides.architect).toBeDefined();
      expect(defaultConfig.agent_overrides.frontend).toBeDefined();
      expect(defaultConfig.agent_overrides.multimodal).toBeDefined();
    });

    it('should have correct subagent default timeouts', () => {
      expect(defaultConfig.subagents.defaults.timeout).toBe(120000);
      expect(defaultConfig.subagents.defaults.maxRetries).toBe(2);
    });
  });
});
