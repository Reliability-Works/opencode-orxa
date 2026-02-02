/**
 * Orxa Orchestration Module
 * 
 * Parallel multi-agent orchestration with git worktrees.
 * 
 * @example
 * ```typescript
 * import { createOrchestrator } from './orxa';
 * 
 * const orchestrator = createOrchestrator('/path/to/repo', {
 *   max_parallel_workstreams: 5,
 *   auto_merge: true,
 * });
 * 
 * await orchestrator.start('orxa implement authentication');
 * ```
 */

// Types
export * from './types';

// Core components
export { WorktreeManager, createWorktreeManager } from './worktree-manager';
export { SpecGenerator, createSpecGenerator } from './spec-generator';
export { MergeQueue, createMergeQueue } from './merge-queue';
export { OrxaOrchestrator, createOrchestrator } from './orchestrator';

// Utilities
export {
  isGitRepository,
  getDefaultQueueDirectory,
  ensureQueueDirectory,
} from './worktree-manager';

export {
  EXAMPLE_WORKSTREAM_SPECS,
} from './spec-generator';

export {
  getDefaultQueuePath,
} from './merge-queue';

export {
  isOrxaAvailable,
} from './orchestrator';
