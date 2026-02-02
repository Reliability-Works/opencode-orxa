/**
 * Orxa Indicator Hook Tests
 * 
 * Tests for progress toast formatting, progress bar creation, and error handling.
 */

import {
  showOrxaActivatedToast,
  showProgressToast,
  showWorkstreamCompleteToast,
  showWorkstreamFailedToast,
  showConflictToast,
  showCompletionToast,
  showErrorToast,
  formatProgress,
  createProgressBar,
  getIndicatorState,
  getActiveToasts,
  clearAllToasts,
  updateFromOrchestratorEvent,
  orxaIndicator,
} from '../../src/hooks/orxa-indicator';
import type { OrxaProgress } from '../../src/orxa/types';
import type { HookContext } from '../../src/types';
import { defaultConfig } from '../../src/config/default-config';

describe('Orxa Indicator Hook', () => {
  beforeEach(() => {
    clearAllToasts();
  });

  afterEach(() => {
    clearAllToasts();
  });

  describe('showOrxaActivatedToast', () => {
    it('should create activation toast with info type', () => {
      const toast = showOrxaActivatedToast();
      expect(toast.type).toBe('info');
      expect(toast.title).toContain('ORXA MODE ACTIVATED');
    });

    it('should contain activation message', () => {
      const toast = showOrxaActivatedToast();
      expect(toast.message).toContain('Parallel multi-agent orchestration');
    });

    it('should have duration of 5000ms', () => {
      const toast = showOrxaActivatedToast();
      expect(toast.duration_ms).toBe(5000);
    });

    it('should generate unique toast ID', () => {
      const toast1 = showOrxaActivatedToast();
      const toast2 = showOrxaActivatedToast();
      expect(toast1.id).not.toBe(toast2.id);
    });

    it('should update indicator state to active', () => {
      showOrxaActivatedToast();
      const state = getIndicatorState();
      expect(state.active).toBe(true);
    });
  });

  describe('showProgressToast', () => {
    const createProgress = (overrides: Partial<OrxaProgress> = {}): OrxaProgress => ({
      phase: 'executing',
      total_workstreams: 5,
      completed: 3,
      failed: 0,
      in_progress: 2,
      pending: 0,
      message: 'Working...',
      percent_complete: 60,
      ...overrides,
    });

    it('should show progress with correct counts', () => {
      const progress = createProgress();
      const toast = showProgressToast(progress);
      expect(toast.message).toContain('3/5');
    });

    it('should show success type when all complete', () => {
      const progress = createProgress({
        completed: 5,
        total_workstreams: 5,
        percent_complete: 100,
      });
      const toast = showProgressToast(progress);
      expect(toast.type).toBe('success');
      expect(toast.title).toContain('COMPLETE');
    });

    it('should show warning type when failures exist', () => {
      const progress = createProgress({
        failed: 2,
      });
      const toast = showProgressToast(progress);
      expect(toast.type).toBe('warning');
      expect(toast.title).toContain('failures');
    });

    it('should show info type during normal progress', () => {
      const progress = createProgress();
      const toast = showProgressToast(progress);
      expect(toast.type).toBe('info');
    });

    it('should include phase in message', () => {
      const progress = createProgress({ phase: 'merging' });
      const toast = showProgressToast(progress);
      expect(toast.message).toContain('merging');
    });

    it('should handle zero total workstreams', () => {
      const progress = createProgress({
        total_workstreams: 0,
        completed: 0,
      });
      const toast = showProgressToast(progress);
      expect(toast.message).toContain('0/0');
    });

    it('should update current progress in state', () => {
      const progress = createProgress();
      showProgressToast(progress);
      const state = getIndicatorState();
      expect(state.progress.completed).toBe(3);
      expect(state.progress.total_workstreams).toBe(5);
    });
  });

  describe('showWorkstreamCompleteToast', () => {
    it('should create success toast', () => {
      const toast = showWorkstreamCompleteToast('auth-login');
      expect(toast.type).toBe('success');
    });

    it('should include workstream ID in title', () => {
      const toast = showWorkstreamCompleteToast('auth-login');
      expect(toast.title).toContain('Workstream Complete');
    });

    it('should include workstream ID in message', () => {
      const toast = showWorkstreamCompleteToast('auth-login');
      expect(toast.message).toContain('auth-login');
    });

    it('should have duration of 8000ms', () => {
      const toast = showWorkstreamCompleteToast('auth-login');
      expect(toast.duration_ms).toBe(8000);
    });
  });

  describe('showWorkstreamFailedToast', () => {
    it('should create error toast', () => {
      const toast = showWorkstreamFailedToast('auth-login', 'Build failed');
      expect(toast.type).toBe('error');
    });

    it('should include workstream ID in title', () => {
      const toast = showWorkstreamFailedToast('auth-login', 'Build failed');
      expect(toast.title).toContain('Workstream Failed');
    });

    it('should include error message', () => {
      const toast = showWorkstreamFailedToast('auth-login', 'Build failed');
      expect(toast.message).toContain('Build failed');
    });

    it('should have persistent duration (0)', () => {
      const toast = showWorkstreamFailedToast('auth-login', 'Build failed');
      expect(toast.duration_ms).toBe(0);
    });
  });

  describe('showConflictToast', () => {
    it('should create warning toast', () => {
      const toast = showConflictToast('auth-login', ['file1.ts', 'file2.ts']);
      expect(toast.type).toBe('warning');
    });

    it('should include workstream ID', () => {
      const toast = showConflictToast('auth-login', ['file1.ts']);
      expect(toast.message).toContain('auth-login');
    });

    it('should list conflict files', () => {
      const toast = showConflictToast('auth-login', ['file1.ts', 'file2.ts']);
      expect(toast.message).toContain('file1.ts');
      expect(toast.message).toContain('file2.ts');
    });

    it('should mention architect delegation', () => {
      const toast = showConflictToast('auth-login', ['file1.ts']);
      expect(toast.message).toContain('architect');
    });

    it('should have duration of 10000ms', () => {
      const toast = showConflictToast('auth-login', ['file1.ts']);
      expect(toast.duration_ms).toBe(10000);
    });
  });

  describe('showCompletionToast', () => {
    it('should create success toast when no failures', () => {
      const toast = showCompletionToast({ total: 5, completed: 5, failed: 0 });
      expect(toast.type).toBe('success');
      expect(toast.title).toContain('COMPLETE');
    });

    it('should create warning toast when failures exist', () => {
      const toast = showCompletionToast({ total: 5, completed: 3, failed: 2 });
      expect(toast.type).toBe('warning');
      expect(toast.title).toContain('issues');
    });

    it('should include completion stats', () => {
      const toast = showCompletionToast({ total: 5, completed: 5, failed: 0 });
      expect(toast.message).toContain('5/5');
    });

    it('should include failure count when failures exist', () => {
      const toast = showCompletionToast({ total: 5, completed: 3, failed: 2 });
      expect(toast.message).toContain('2 failed');
    });

    it('should have persistent duration', () => {
      const toast = showCompletionToast({ total: 5, completed: 5, failed: 0 });
      expect(toast.duration_ms).toBe(0);
    });

    it('should set indicator state to inactive', () => {
      showOrxaActivatedToast();
      showCompletionToast({ total: 5, completed: 5, failed: 0 });
      const state = getIndicatorState();
      expect(state.active).toBe(false);
    });
  });

  describe('showErrorToast', () => {
    it('should create error toast', () => {
      const toast = showErrorToast('Something went wrong');
      expect(toast.type).toBe('error');
    });

    it('should include error message', () => {
      const toast = showErrorToast('Something went wrong');
      expect(toast.message).toContain('Something went wrong');
    });

    it('should have persistent duration', () => {
      const toast = showErrorToast('Error');
      expect(toast.duration_ms).toBe(0);
    });
  });

  describe('formatProgress', () => {
    const createProgress = (overrides: Partial<OrxaProgress> = {}): OrxaProgress => ({
      phase: 'executing',
      total_workstreams: 10,
      completed: 5,
      failed: 1,
      in_progress: 2,
      pending: 2,
      message: 'Working...',
      percent_complete: 50,
      ...overrides,
    });

    it('should include ORXA ORCHESTRATION header', () => {
      const formatted = formatProgress(createProgress());
      expect(formatted).toContain('ORXA ORCHESTRATION');
    });

    it('should include phase information', () => {
      const formatted = formatProgress(createProgress({ phase: 'merging' }));
      expect(formatted).toContain('Phase: merging');
    });

    it('should include progress bar', () => {
      const formatted = formatProgress(createProgress({ percent_complete: 50 }));
      expect(formatted).toContain('[');
      expect(formatted).toContain(']');
    });

    it('should show correct percentage', () => {
      const formatted = formatProgress(createProgress({ percent_complete: 75 }));
      expect(formatted).toContain('75%');
    });

    it('should show completed count', () => {
      const formatted = formatProgress(createProgress({ completed: 5, total_workstreams: 10 }));
      expect(formatted).toContain('Completed:');
      expect(formatted).toContain('5');
      expect(formatted).toContain('/10');
    });

    it('should show in progress count', () => {
      const formatted = formatProgress(createProgress({ in_progress: 3 }));
      expect(formatted).toContain('In Progress: 3');
    });

    it('should show pending count', () => {
      const formatted = formatProgress(createProgress({ pending: 4 }));
      expect(formatted).toContain('Pending: 4');
    });

    it('should show failed count', () => {
      const formatted = formatProgress(createProgress({ failed: 2 }));
      expect(formatted).toContain('Failed: 2');
    });

    it('should handle 0% progress', () => {
      const formatted = formatProgress(createProgress({ percent_complete: 0, completed: 0 }));
      expect(formatted).toContain('0%');
    });

    it('should handle 100% progress', () => {
      const formatted = formatProgress(createProgress({ percent_complete: 100, completed: 10 }));
      expect(formatted).toContain('100%');
    });
  });

  describe('createProgressBar', () => {
    it('should create bar with correct width', () => {
      const bar = createProgressBar(50, 10);
      expect(bar).toHaveLength(10);
    });

    it('should fill correct percentage', () => {
      const bar = createProgressBar(50, 10);
      expect(bar).toContain('█');
      expect(bar).toContain('░');
    });

    it('should be all filled at 100%', () => {
      const bar = createProgressBar(100, 10);
      expect(bar).toBe('██████████');
    });

    it('should be all empty at 0%', () => {
      const bar = createProgressBar(0, 10);
      expect(bar).toBe('░░░░░░░░░░');
    });

    it('should use default width of 30', () => {
      const bar = createProgressBar(50);
      expect(bar).toHaveLength(30);
    });

    it('should handle custom widths', () => {
      const bar = createProgressBar(50, 20);
      expect(bar).toHaveLength(20);
    });

    it('should handle 25% correctly', () => {
      const bar = createProgressBar(25, 4);
      expect(bar).toBe('█░░░');
    });

    it('should handle 75% correctly', () => {
      const bar = createProgressBar(75, 4);
      expect(bar).toBe('███░');
    });
  });

  describe('getIndicatorState', () => {
    it('should return inactive state initially', () => {
      const state = getIndicatorState();
      expect(state.active).toBe(false);
    });

    it('should return empty toasts initially', () => {
      const state = getIndicatorState();
      expect(state.toasts).toEqual([]);
    });

    it('should return copy of state', () => {
      const state1 = getIndicatorState();
      const state2 = getIndicatorState();
      expect(state1).not.toBe(state2);
    });
  });

  describe('getActiveToasts', () => {
    it('should return empty array initially', () => {
      const toasts = getActiveToasts();
      expect(toasts).toEqual([]);
    });

    it('should return active toasts', () => {
      showOrxaActivatedToast();
      const toasts = getActiveToasts();
      expect(toasts).toHaveLength(1);
    });

    it('should return copy of toasts array', () => {
      showOrxaActivatedToast();
      const toasts1 = getActiveToasts();
      const toasts2 = getActiveToasts();
      expect(toasts1).not.toBe(toasts2);
    });
  });

  describe('clearAllToasts', () => {
    it('should clear all active toasts', () => {
      showOrxaActivatedToast();
      showWorkstreamCompleteToast('test');
      clearAllToasts();
      expect(getActiveToasts()).toHaveLength(0);
    });

    it('should reset indicator state toasts', () => {
      showOrxaActivatedToast();
      clearAllToasts();
      const state = getIndicatorState();
      expect(state.toasts).toHaveLength(0);
    });
  });

  describe('updateFromOrchestratorEvent', () => {
    it('should show activation toast on started event', () => {
      updateFromOrchestratorEvent({ type: 'started' });
      expect(getActiveToasts()).toHaveLength(1);
    });

    it('should show completion toast on workstream_completed', () => {
      updateFromOrchestratorEvent({
        type: 'workstream_completed',
        data: { workstream_id: 'test-workstream' },
      });
      expect(getActiveToasts()).toHaveLength(1);
    });

    it('should show failure toast on workstream_failed', () => {
      updateFromOrchestratorEvent({
        type: 'workstream_failed',
        data: { workstream_id: 'test-workstream', error: 'Build failed' },
      });
      expect(getActiveToasts()).toHaveLength(1);
    });

    it('should show conflict toast on conflict event', () => {
      updateFromOrchestratorEvent({
        type: 'conflict',
        data: { workstream_id: 'test-workstream', conflict_files: ['file1.ts'] },
      });
      expect(getActiveToasts()).toHaveLength(1);
    });

    it('should show completion toast on completed event', () => {
      updateFromOrchestratorEvent({
        type: 'completed',
        data: { total: 5, completed: 5, failed: 0 },
      });
      expect(getActiveToasts()).toHaveLength(1);
    });

    it('should show error toast on error event', () => {
      updateFromOrchestratorEvent({
        type: 'error',
        data: { error: 'Something went wrong' },
      });
      expect(getActiveToasts()).toHaveLength(1);
    });

    it('should handle events without data', () => {
      updateFromOrchestratorEvent({ type: 'workstream_completed' });
      expect(getActiveToasts()).toHaveLength(0);
    });

    it('should handle unknown event types', () => {
      updateFromOrchestratorEvent({ type: 'unknown' });
      expect(getActiveToasts()).toHaveLength(0);
    });
  });

  describe('orxaIndicator', () => {
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
        messages: [],
        agentAttempts: {},
        messageCount: 0,
        recentMessages: [],
        memoryQueue: [],
      },
      response: overrides.response,
      ...overrides,
    });

    it('should extract progress from response', async () => {
      const context = createContext({
        response: 'ORXA: 3/5 workstreams complete',
      });

      await orxaIndicator(context);
      expect(getActiveToasts()).toHaveLength(1);
    });

    it('should not show toast if no ORXA mention', async () => {
      const context = createContext({
        response: 'Regular response without keyword',
      });

      await orxaIndicator(context);
      expect(getActiveToasts()).toHaveLength(0);
    });

    it('should handle empty response', async () => {
      const context = createContext({ response: '' });
      await orxaIndicator(context);
      expect(getActiveToasts()).toHaveLength(0);
    });

    it('should extract correct progress numbers', async () => {
      const context = createContext({
        response: 'ORXA progress: 7/10 workstreams complete',
      });

      await orxaIndicator(context);
      const state = getIndicatorState();
      expect(state.progress.completed).toBe(7);
      expect(state.progress.total_workstreams).toBe(10);
    });
  });
});
