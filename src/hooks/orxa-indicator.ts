/**
 * Orxa Indicator Hook
 * 
 * Provides toast notifications and progress indicators for Orxa orchestration.
 * Shows status updates, completion notifications, and error alerts.
 */

import type { HookContext } from '../types';
import type { OrxaProgress, OrxaToast, OrxaIndicatorState } from '../orxa/types';

/**
 * Toast notification durations.
 */
const TOAST_DURATIONS = {
  info: 5000,
  success: 8000,
  warning: 10000,
  error: 0, // Persistent
};

/**
 * Active toasts storage.
 */
let activeToasts: OrxaToast[] = [];
let currentProgress: OrxaProgress | null = null;
let indicatorState: OrxaIndicatorState = {
  active: false,
  progress: {
    phase: 'idle',
    total_workstreams: 0,
    completed: 0,
    failed: 0,
    in_progress: 0,
    pending: 0,
    message: 'Idle',
    percent_complete: 0,
  },
  toasts: [],
};

/**
 * Create a toast notification.
 */
function createToast(
  type: OrxaToast['type'],
  title: string,
  message: string,
  durationMs?: number
): OrxaToast {
  const toast: OrxaToast = {
    id: `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    title,
    message,
    created_at: new Date().toISOString(),
    duration_ms: durationMs ?? TOAST_DURATIONS[type],
  };

  activeToasts.push(toast);
  indicatorState.toasts = [...activeToasts];

  // Auto-dismiss non-persistent toasts
  if (toast.duration_ms > 0) {
    setTimeout(() => {
      dismissToast(toast.id);
    }, toast.duration_ms);
  }

  return toast;
}

/**
 * Dismiss a toast by ID.
 */
function dismissToast(toastId: string): void {
  activeToasts = activeToasts.filter(t => t.id !== toastId);
  indicatorState.toasts = [...activeToasts];
}

/**
 * Show Orxa activation toast.
 */
export function showOrxaActivatedToast(): OrxaToast {
  indicatorState.active = true;
  return createToast(
    'info',
    '🚀 ORXA MODE ACTIVATED',
    'Parallel multi-agent orchestration is now active. Sit back and watch the magic happen!',
    TOAST_DURATIONS.info
  );
}

/**
 * Show progress update toast.
 */
export function showProgressToast(progress: OrxaProgress): OrxaToast {
  currentProgress = progress;
  indicatorState.progress = progress;

  const { completed, total_workstreams, phase, failed } = progress;
  const percent = Math.round((completed / Math.max(1, total_workstreams)) * 100);

  let title = '⏳ Orxa Progress';
  let type: OrxaToast['type'] = 'info';

  if (completed === total_workstreams && total_workstreams > 0) {
    title = '✅ ORXA COMPLETE';
    type = 'success';
  } else if (failed > 0) {
    title = '⚠️ Orxa Progress (with failures)';
    type = 'warning';
  }

  return createToast(
    type,
    title,
    `${completed}/${total_workstreams} workstreams complete (${percent}%) - ${phase}`,
    TOAST_DURATIONS.info
  );
}

/**
 * Show workstream completion toast.
 */
export function showWorkstreamCompleteToast(workstreamId: string): OrxaToast {
  return createToast(
    'success',
    '✅ Workstream Complete',
    `Workstream "${workstreamId}" has been completed and queued for merge.`,
    TOAST_DURATIONS.success
  );
}

/**
 * Show workstream failure toast.
 */
export function showWorkstreamFailedToast(workstreamId: string, error: string): OrxaToast {
  return createToast(
    'error',
    '❌ Workstream Failed',
    `Workstream "${workstreamId}" failed: ${error}`,
    TOAST_DURATIONS.error
  );
}

/**
 * Show merge conflict toast.
 */
export function showConflictToast(workstreamId: string, files: string[]): OrxaToast {
  return createToast(
    'warning',
    '⚠️ Merge Conflict Detected',
    `Workstream "${workstreamId}" has conflicts in: ${files.join(', ')}. Delegating to architect for resolution...`,
    TOAST_DURATIONS.warning
  );
}

/**
 * Show Orxa completion toast.
 */
export function showCompletionToast(stats: {
  total: number;
  completed: number;
  failed: number;
}): OrxaToast {
  indicatorState.active = false;

  const { total, completed, failed } = stats;
  
  if (failed === 0) {
    return createToast(
      'success',
      '🎉 ORXA ORCHESTRATION COMPLETE!',
      `All ${completed}/${total} workstreams completed successfully and merged to main branch!`,
      0 // Persistent
    );
  } else {
    return createToast(
      'warning',
      '⚠️ ORXA ORCHESTRATION COMPLETE (with issues)',
      `${completed}/${total} workstreams completed, ${failed} failed. Check logs for details.`,
      0 // Persistent
    );
  }
}

/**
 * Show error toast.
 */
export function showErrorToast(error: string): OrxaToast {
  return createToast(
    'error',
    '❌ Orxa Error',
    `Orchestration failed: ${error}`,
    0 // Persistent
  );
}

/**
 * Get current indicator state.
 */
export function getIndicatorState(): OrxaIndicatorState {
  return { ...indicatorState };
}

/**
 * Get active toasts.
 */
export function getActiveToasts(): OrxaToast[] {
  return [...activeToasts];
}

/**
 * Clear all toasts.
 */
export function clearAllToasts(): void {
  activeToasts = [];
  indicatorState.toasts = [];
}

/**
 * Format progress for display.
 */
export function formatProgress(progress: OrxaProgress): string {
  const { phase, completed, total_workstreams, failed, in_progress, pending, percent_complete } = progress;
  
  const bars = '█'.repeat(Math.floor(percent_complete / 10)) + '░'.repeat(10 - Math.floor(percent_complete / 10));
  
  return `
┌─────────────────────────────────────────┐
│  🚀 ORXA ORCHESTRATION                  │
├─────────────────────────────────────────┤
│  Phase: ${phase.padEnd(27)} │
│  Progress: [${bars}] ${percent_complete.toString().padStart(3)}%  │
│  Completed: ${completed.toString().padEnd(3)}/${total_workstreams.toString().padEnd(3)}                    │
│  In Progress: ${in_progress.toString().padEnd(3)}                  │
│  Pending: ${pending.toString().padEnd(3)}                      │
│  Failed: ${failed.toString().padEnd(3)}                       │
└─────────────────────────────────────────┘
  `;
}

/**
 * Post-subagent response hook for Orxa progress updates.
 */
export async function orxaIndicator(context: HookContext): Promise<void> {
  // Check if this is an Orxa-related response
  const response = context.response || '';
  
  // Look for Orxa progress indicators in the response
  if (response.includes('ORXA') || response.includes('orxa')) {
    // Extract progress info if present
    const progressMatch = response.match(/(\d+)\/(\d+) workstreams? complete/i);
    
    if (progressMatch) {
      const completed = parseInt(progressMatch[1], 10);
      const total = parseInt(progressMatch[2], 10);
      
      showProgressToast({
        phase: 'executing',
        total_workstreams: total,
        completed,
        failed: 0,
        in_progress: total - completed,
        pending: 0,
        message: 'Workstreams executing...',
        percent_complete: Math.round((completed / total) * 100),
      });
    }
  }
}

/**
 * Create a progress bar string.
 */
export function createProgressBar(percent: number, width: number = 30): string {
  const filled = Math.floor((percent / 100) * width);
  const empty = width - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

/**
 * Update indicator state from orchestrator event.
 */
export function updateFromOrchestratorEvent(event: {
  type: string;
  data?: Record<string, unknown>;
}): void {
  switch (event.type) {
    case 'started':
      showOrxaActivatedToast();
      break;
    case 'workstream_completed':
      if (event.data?.workstream_id) {
        showWorkstreamCompleteToast(event.data.workstream_id as string);
      }
      break;
    case 'workstream_failed':
      if (event.data?.workstream_id) {
        showWorkstreamFailedToast(
          event.data.workstream_id as string,
          (event.data.error as string) || 'Unknown error'
        );
      }
      break;
    case 'conflict':
      if (event.data?.workstream_id) {
        showConflictToast(
          event.data.workstream_id as string,
          (event.data.conflict_files as string[]) || []
        );
      }
      break;
    case 'completed':
      showCompletionToast({
        total: (event.data?.total as number) || 0,
        completed: (event.data?.completed as number) || 0,
        failed: (event.data?.failed as number) || 0,
      });
      break;
    case 'error':
      showErrorToast((event.data?.error as string) || 'Unknown error');
      break;
  }
}

export default orxaIndicator;
