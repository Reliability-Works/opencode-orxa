/**
 * Orxa Orchestration Module
 * 
 * Parallel multi-agent orchestration with git worktrees.
 * 
 * @example
 * ```typescript
 * import { createOrchestrator } from './orxa.js';
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
export * from './types.js';

// Core components
export { WorktreeManager, createWorktreeManager } from './worktree-manager.js';
export { SpecGenerator, createSpecGenerator } from './spec-generator.js';
export { MergeQueue, createMergeQueue } from './merge-queue.js';
export { OrxaOrchestrator, createOrchestrator } from './orchestrator.js';

// Utilities
export {
  isGitRepository,
  getDefaultQueueDirectory,
  ensureQueueDirectory,
} from './worktree-manager.js';

export {
  EXAMPLE_WORKSTREAM_SPECS,
} from './spec-generator.js';

export {
  getDefaultQueuePath,
} from './merge-queue.js';

export {
  isOrxaAvailable,
} from './orchestrator.js';
