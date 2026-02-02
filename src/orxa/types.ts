/**
 * Core types for Orxa Orchestration Mode
 * 
 * Orxa enables parallel multi-agent orchestration with git worktrees,
 * allowing complex tasks to be broken into parallel workstreams.
 */

/**
 * Represents a single workstream specification.
 * Each workstream is an independent unit of work that can be executed in parallel.
 */
export interface WorkstreamSpec {
  /** Unique identifier for the workstream */
  id: string;
  /** Human-readable name */
  name: string;
  /** Detailed description of the work to be done */
  description: string;
  /** IDs of workstreams that must complete before this one starts */
  dependencies: string[];
  /** Criteria for determining when the workstream is complete */
  acceptance_criteria: string[];
  /** Estimated complexity for resource allocation */
  estimated_complexity: 'low' | 'medium' | 'high';
  /** Files that provide context for this workstream */
  context_files?: string[];
  /** Maximum time allowed for this workstream (in minutes) */
  timeout_minutes?: number;
  /** Agent type best suited for this workstream */
  recommended_agent?: string;
}

/**
 * Represents an item in the Orxa merge queue.
 * Tracks the state of workstream completion and merge status.
 */
export interface OrxaQueueItem {
  /** Unique identifier for the queue item */
  id: string;
  /** Reference to the workstream this item represents */
  workstream_id: string;
  /** Name of the git worktree where work is being done */
  worktree_name: string;
  /** Current status in the queue */
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'merging' | 'conflict';
  /** Git commit hash when completed */
  commit_hash?: string;
  /** When the item was created */
  created_at: string;
  /** When the item was completed */
  completed_at?: string;
  /** Error message if failed */
  error_message?: string;
  /** Number of merge attempts */
  merge_attempts: number;
  /** Conflicting files if status is 'conflict' */
  conflict_files?: string[];
  /** Resolution strategy used */
  resolution_strategy?: 'auto' | 'manual' | 'delegated';
}

/**
 * Represents the current state of an Orxa orchestration session.
 */
export interface OrxaState {
  /** Whether an Orxa session is currently active */
  active: boolean;
  /** Unique session identifier */
  session_id: string;
  /** Original git branch before Orxa started */
  original_branch: string;
  /** All workstreams in this session */
  workstreams: WorkstreamSpec[];
  /** Names of created worktrees */
  worktrees: string[];
  /** Path to the merge queue directory */
  queue_path: string;
  /** When the session started */
  started_at: string;
  /** IDs of completed workstreams */
  completed_workstreams: string[];
  /** IDs of failed workstreams */
  failed_workstreams: string[];
  /** Current phase of orchestration */
  phase: 'idle' | 'generating_specs' | 'creating_worktrees' | 'executing' | 'merging' | 'cleanup';
  /** Configuration used for this session */
  config: OrxaSessionConfig;
}

/**
 * Configuration specific to an Orxa session.
 */
export interface OrxaSessionConfig {
  /** Maximum parallel workstreams */
  max_parallel_workstreams: number;
  /** Whether to auto-merge completed workstreams */
  auto_merge: boolean;
  /** Agent to use for conflict resolution */
  conflict_resolution_agent: string;
  /** Prefix for worktree names */
  worktree_prefix: string;
  /** Whether to cleanup worktrees after merge */
  cleanup_worktrees: boolean;
  /** Queue directory path */
  queue_directory: string;
  /** Polling interval for queue in milliseconds */
  queue_poll_interval_ms: number;
  /** Base path for worktree directories (optional, for testing) */
  worktree_base_path?: string;
}

/**
 * Result of a spec generation operation.
 */
export interface SpecGenerationResult {
  /** Whether generation was successful */
  success: boolean;
  /** Generated workstream specs */
  workstreams?: WorkstreamSpec[];
  /** Error message if failed */
  error?: string;
  /** Raw response from the strategist agent */
  raw_response?: string;
}

/**
 * Result of a worktree operation.
 */
export interface WorktreeResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** Path to the worktree */
  path?: string;
  /** Name of the worktree branch */
  branch?: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Result of a merge operation.
 */
export interface MergeResult {
  /** Whether merge was successful */
  success: boolean;
  /** Commit hash of the merge */
  commit_hash?: string;
  /** Whether there were conflicts */
  had_conflicts: boolean;
  /** Files with conflicts if any */
  conflict_files?: string[];
  /** Resolution method used */
  resolution?: 'auto' | 'manual' | 'delegated' | 'none';
  /** Error message if failed */
  error?: string;
}

/**
 * Progress update for Orxa orchestration.
 */
export interface OrxaProgress {
  /** Current phase */
  phase: OrxaState['phase'];
  /** Total number of workstreams */
  total_workstreams: number;
  /** Number completed */
  completed: number;
  /** Number failed */
  failed: number;
  /** Number in progress */
  in_progress: number;
  /** Number pending */
  pending: number;
  /** Current workstream being processed */
  current_workstream?: string;
  /** Progress message */
  message: string;
  /** Percentage complete (0-100) */
  percent_complete: number;
}

/**
 * Options for the orchestrator.
 */
export interface OrchestratorOptions {
  /** User's original request */
  user_request: string;
  /** Whether to wait for completion */
  wait_for_completion?: boolean;
  /** Callback for progress updates */
  on_progress?: (progress: OrxaProgress) => void;
  /** Callback when a workstream completes */
  on_workstream_complete?: (workstreamId: string, result: unknown) => void;
  /** Callback when all workstreams complete */
  on_complete?: (state: OrxaState) => void;
  /** Callback on error */
  on_error?: (error: Error) => void;
}

/**
 * Orxa configuration schema additions.
 */
export interface OrxaConfigSchema {
  /** Whether Orxa mode is enabled */
  enabled: boolean;
  /** Maximum number of parallel workstreams */
  max_parallel_workstreams: number;
  /** Directory for the merge queue */
  queue_directory: string;
  /** Whether to automatically merge completed workstreams */
  auto_merge: boolean;
  /** Agent to use for conflict resolution */
  conflict_resolution_agent: string;
  /** Prefix for worktree names */
  worktree_prefix: string;
  /** Whether to cleanup worktrees after successful merge */
  cleanup_worktrees: boolean;
  /** Whether to require approval before merging */
  require_merge_approval: boolean;
  /** Timeout for individual workstreams in minutes */
  workstream_timeout_minutes: number;
  /** Whether to retry failed workstreams */
  retry_failed_workstreams: boolean;
  /** Maximum retry attempts */
  max_retries: number;
}

/**
 * File-based queue entry structure.
 */
export interface QueueFileEntry {
  /** Queue item data */
  item: OrxaQueueItem;
  /** Version for optimistic locking */
  version: number;
  /** Last updated timestamp */
  updated_at: string;
}

/**
 * Dependency graph for workstreams.
 */
export interface DependencyGraph {
  /** Map of workstream ID to its dependencies */
  dependencies: Map<string, Set<string>>;
  /** Map of workstream ID to dependents */
  dependents: Map<string, Set<string>>;
  /** Root workstreams (no dependencies) */
  roots: string[];
  /** All workstream IDs in topological order */
  topological_order: string[];
}

/**
 * Conflict resolution result.
 */
export interface ConflictResolutionResult {
  /** Whether resolution was successful */
  resolved: boolean;
  /** Resolution method used */
  method: 'auto' | 'manual' | 'delegated';
  /** Files that were resolved */
  resolved_files: string[];
  /** Files that still have conflicts */
  remaining_conflicts?: string[];
  /** Resolution commit hash */
  resolution_commit?: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Workstream execution result.
 */
export interface WorkstreamExecutionResult {
  /** Workstream ID */
  workstream_id: string;
  /** Whether execution succeeded */
  success: boolean;
  /** Commit hash if successful */
  commit_hash?: string;
  /** Error message if failed */
  error?: string;
  /** Duration in milliseconds */
  duration_ms: number;
  /** Files modified */
  files_modified?: string[];
  /** Lines added */
  lines_added?: number;
  /** Lines removed */
  lines_removed?: number;
}

/**
 * Orxa detection result from user message.
 */
export interface OrxaDetectionResult {
  /** Whether Orxa mode was triggered */
  triggered: boolean;
  /** Original message with keyword stripped */
  cleaned_message: string;
  /** Detected keyword variant */
  keyword_variant?: string;
  /** Extracted task description */
  task_description?: string;
}

/**
 * Toast notification types for Orxa UI.
 */
export interface OrxaToast {
  /** Unique toast ID */
  id: string;
  /** Toast type */
  type: 'info' | 'success' | 'warning' | 'error';
  /** Toast title */
  title: string;
  /** Toast message */
  message: string;
  /** When the toast was created */
  created_at: string;
  /** Auto-dismiss duration in ms (0 for persistent) */
  duration_ms: number;
}

/**
 * Orxa indicator state for UI.
 */
export interface OrxaIndicatorState {
  /** Whether Orxa is active */
  active: boolean;
  /** Current progress */
  progress: OrxaProgress;
  /** Recent toasts */
  toasts: OrxaToast[];
  /** Session ID */
  session_id?: string;
}
