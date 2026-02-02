/**
 * Orxa Orchestrator
 * 
 * Main orchestration logic for parallel multi-agent execution using git worktrees.
 * Coordinates spec generation, worktree creation, parallel delegation, and merge queue.
 */

import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import type {
  OrxaState,
  OrxaSessionConfig,
  OrchestratorOptions,
  OrxaProgress,
  WorkstreamSpec,
  WorkstreamExecutionResult,
  OrxaQueueItem,
} from './types';
import { WorktreeManager, getDefaultQueueDirectory } from './worktree-manager';
import { SpecGenerator } from './spec-generator';
import { MergeQueue } from './merge-queue';

/**
 * Default configuration for Orxa sessions.
 */
const DEFAULT_SESSION_CONFIG: OrxaSessionConfig = {
  max_parallel_workstreams: 5,
  auto_merge: true,
  conflict_resolution_agent: 'architect',
  worktree_prefix: 'orxa',
  cleanup_worktrees: true,
  queue_directory: getDefaultQueueDirectory(),
  queue_poll_interval_ms: 5000,
};

/**
 * Main orchestrator for Orxa parallel execution.
 */
export class OrxaOrchestrator extends EventEmitter {
  private state: OrxaState;
  private worktreeManager: WorktreeManager;
  private specGenerator: SpecGenerator;
  private mergeQueue: MergeQueue;
  private config: OrxaSessionConfig;
  private processing: boolean = false;
  private queuePollInterval?: NodeJS.Timeout;

  constructor(
    private readonly repoRoot: string,
    config?: Partial<OrxaSessionConfig>
  ) {
    super();

    this.config = { ...DEFAULT_SESSION_CONFIG, ...config };
    
    // Initialize state
    this.state = {
      active: false,
      session_id: this.generateSessionId(),
      original_branch: '',
      workstreams: [],
      worktrees: [],
      queue_path: this.config.queue_directory,
      started_at: '',
      completed_workstreams: [],
      failed_workstreams: [],
      phase: 'idle',
      config: this.config,
    };

    // Initialize components
    this.worktreeManager = new WorktreeManager(
      this.config.worktree_prefix,
      this.repoRoot
    );
    
    this.specGenerator = new SpecGenerator('strategist', this.repoRoot);
    
    this.mergeQueue = new MergeQueue(
      this.config.queue_directory,
      this.repoRoot,
      this.config.conflict_resolution_agent
    );
  }

  /**
   * Generate a unique session ID.
   */
  private generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `orxa-${timestamp}-${random}`;
  }

  /**
   * Start an Orxa orchestration session.
   * 
   * @param userRequest - The user's original request
   * @param options - Orchestration options
   * @returns The final state after completion (if wait_for_completion is true)
   */
  async start(
    userRequest: string,
    options: Omit<OrchestratorOptions, 'user_request'> = {}
  ): Promise<OrxaState | void> {
    if (this.state.active) {
      throw new Error('Orxa session already active');
    }

    this.processing = true;
    this.state.active = true;
    this.state.started_at = new Date().toISOString();
    this.state.original_branch = this.worktreeManager.getOriginalBranch();

    this.emit('started', { session_id: this.state.session_id });

    try {
      // Phase 1: Generate specs
      await this.setPhase('generating_specs');
      this.emit('progress', this.createProgress('Generating workstream specifications...'));
      
      const specs = await this.generateSpecs(userRequest);
      this.state.workstreams = specs;

      // Phase 2: Create worktrees
      await this.setPhase('creating_worktrees');
      this.emit('progress', this.createProgress(`Creating ${specs.length} worktrees...`));
      
      await this.createWorktrees(specs);

      // Phase 3: Execute workstreams
      await this.setPhase('executing');
      this.emit('progress', this.createProgress('Executing workstreams in parallel...'));
      
      await this.executeWorkstreams(options as OrchestratorOptions);

      // Phase 4: Merge (if auto_merge is enabled)
      if (this.config.auto_merge) {
        await this.setPhase('merging');
        this.emit('progress', this.createProgress('Merging completed workstreams...'));
        
        await this.processMergeQueue();
      }

      // Phase 5: Cleanup
      await this.setPhase('cleanup');
      if (this.config.cleanup_worktrees) {
        this.emit('progress', this.createProgress('Cleaning up worktrees...'));
        await this.cleanup();
      }

      this.emit('completed', this.state);
      
      if (options.wait_for_completion) {
        return this.state;
      }
    } catch (error) {
      this.emit('error', error);
      throw error;
    } finally {
      this.processing = false;
      this.state.active = false;
      this.stopQueuePolling();
    }
  }

  /**
   * Generate workstream specs from user request.
   */
  private async generateSpecs(userRequest: string): Promise<WorkstreamSpec[]> {
    // In a real implementation, this would delegate to the strategist agent
    // For now, return example specs based on the request
    
    // Parse the request to determine appropriate specs
    const request = userRequest.toLowerCase();
    
    if (request.includes('authentication') || request.includes('auth')) {
      return this.getAuthSpecs();
    }
    
    if (request.includes('api') || request.includes('endpoint')) {
      return this.getApiSpecs();
    }
    
    if (request.includes('ui') || request.includes('component')) {
      return this.getUiSpecs();
    }

    // Default: create a single workstream
    return [{
      id: 'workstream-1',
      name: 'Main Implementation',
      description: userRequest,
      dependencies: [],
      acceptance_criteria: ['Implementation complete', 'Tests passing'],
      estimated_complexity: 'medium',
      context_files: [],
      timeout_minutes: 120,
      recommended_agent: 'build',
    }];
  }

  /**
   * Get example auth-related specs.
   */
  private getAuthSpecs(): WorkstreamSpec[] {
    return [
      {
        id: 'auth-login',
        name: 'Implement Login',
        description: 'Create login endpoint with email/password validation and JWT tokens',
        dependencies: [],
        acceptance_criteria: [
          'POST /api/auth/login endpoint',
          'Email/password validation',
          'JWT token generation',
          'Error handling for invalid credentials',
        ],
        estimated_complexity: 'medium',
        context_files: [],
        timeout_minutes: 90,
        recommended_agent: 'build',
      },
      {
        id: 'auth-signup',
        name: 'Implement Signup',
        description: 'Create user registration with email verification',
        dependencies: [],
        acceptance_criteria: [
          'POST /api/auth/signup endpoint',
          'Password hashing',
          'Email verification flow',
          'Duplicate email handling',
        ],
        estimated_complexity: 'medium',
        context_files: [],
        timeout_minutes: 90,
        recommended_agent: 'build',
      },
      {
        id: 'auth-oauth',
        name: 'Implement OAuth',
        description: 'Add OAuth 2.0 support for Google and GitHub',
        dependencies: ['auth-login'],
        acceptance_criteria: [
          'Google OAuth flow',
          'GitHub OAuth flow',
          'Account linking',
          'Error handling',
        ],
        estimated_complexity: 'high',
        context_files: [],
        timeout_minutes: 120,
        recommended_agent: 'architect',
      },
    ];
  }

  /**
   * Get example API-related specs.
   */
  private getApiSpecs(): WorkstreamSpec[] {
    return [
      {
        id: 'api-crud',
        name: 'CRUD Endpoints',
        description: 'Create RESTful CRUD endpoints',
        dependencies: [],
        acceptance_criteria: ['GET, POST, PUT, DELETE endpoints', 'Input validation', 'Error responses'],
        estimated_complexity: 'medium',
        context_files: [],
        timeout_minutes: 90,
        recommended_agent: 'build',
      },
      {
        id: 'api-validation',
        name: 'Request Validation',
        description: 'Implement request validation middleware',
        dependencies: [],
        acceptance_criteria: ['Validation schemas', 'Error messages', 'Sanitization'],
        estimated_complexity: 'low',
        context_files: [],
        timeout_minutes: 60,
        recommended_agent: 'coder',
      },
    ];
  }

  /**
   * Get example UI-related specs.
   */
  private getUiSpecs(): WorkstreamSpec[] {
    return [
      {
        id: 'ui-components',
        name: 'UI Components',
        description: 'Create reusable UI components',
        dependencies: [],
        acceptance_criteria: ['Component library', 'Storybook stories', 'Unit tests'],
        estimated_complexity: 'medium',
        context_files: [],
        timeout_minutes: 120,
        recommended_agent: 'frontend',
      },
      {
        id: 'ui-styling',
        name: 'Styling System',
        description: 'Implement design system and theming',
        dependencies: [],
        acceptance_criteria: ['CSS variables', 'Theme provider', 'Responsive utilities'],
        estimated_complexity: 'medium',
        context_files: [],
        timeout_minutes: 90,
        recommended_agent: 'frontend',
      },
    ];
  }

  /**
   * Create worktrees for all workstreams.
   */
  private async createWorktrees(specs: WorkstreamSpec[]): Promise<void> {
    for (let i = 0; i < specs.length; i++) {
      const spec = specs[i];
      const result = await this.worktreeManager.createWorktree(spec.id, i + 1);

      if (result.success) {
        this.state.worktrees.push(result.path!);
        this.emit('worktree_created', {
          workstream_id: spec.id,
          path: result.path,
          branch: result.branch,
        });
      } else {
        throw new Error(`Failed to create worktree for ${spec.id}: ${result.error}`);
      }
    }
  }

  /**
   * Execute workstreams in parallel with dependency resolution.
   */
  private async executeWorkstreams(options: OrchestratorOptions): Promise<void> {
    const pending = new Set(this.state.workstreams.map(s => s.id));
    const inProgress = new Set<string>();
    const completed = new Set<string>();

    // Build dependency graph
    const dependencies = new Map<string, Set<string>>();
    for (const spec of this.state.workstreams) {
      dependencies.set(spec.id, new Set(spec.dependencies));
    }

    // Start queue polling
    this.startQueuePolling();

    while (pending.size > 0 || inProgress.size > 0) {
      // Find workstreams ready to execute (all dependencies met)
      const ready: string[] = [];
      for (const id of pending) {
        const deps = dependencies.get(id) || new Set();
        if ([...deps].every(dep => completed.has(dep))) {
          ready.push(id);
        }
      }

      // Start ready workstreams up to max_parallel limit
      while (
        ready.length > 0 &&
        inProgress.size < this.config.max_parallel_workstreams
      ) {
        const id = ready.shift()!;
        pending.delete(id);
        inProgress.add(id);

        this.executeWorkstream(id).then((result) => {
          inProgress.delete(id);

          if (result.success) {
            completed.add(id);
            this.state.completed_workstreams.push(id);
            
            // Add to merge queue
            this.enqueueForMerge(id, result.commit_hash!);
            
            options.on_workstream_complete?.(id, result);
            this.emit('workstream_completed', { workstream_id: id, result });
          } else {
            this.state.failed_workstreams.push(id);
            this.emit('workstream_failed', { workstream_id: id, error: result.error });
          }

          this.emit('progress', this.createProgress());
        });
      }

      // Wait a bit before checking again
      await this.sleep(1000);

      // Check for timeout
      const elapsed = Date.now() - new Date(this.state.started_at).getTime();
      const timeoutMs = 4 * 60 * 60 * 1000; // 4 hours default timeout
      if (elapsed > timeoutMs) {
        throw new Error('Orxa session timeout');
      }
    }
  }

  /**
   * Execute a single workstream.
   */
  private async executeWorkstream(workstreamId: string): Promise<WorkstreamExecutionResult> {
    const spec = this.state.workstreams.find(s => s.id === workstreamId);
    if (!spec) {
      return {
        workstream_id: workstreamId,
        success: false,
        error: 'Workstream spec not found',
        duration_ms: 0,
      };
    }

    const startTime = Date.now();

    try {
      // In a real implementation, this would delegate to a subagent
      // For now, simulate execution
      
      this.emit('workstream_started', { workstream_id: workstreamId, spec });

      // Simulate work duration based on complexity
      const duration = this.getSimulatedDuration(spec.estimated_complexity);
      await this.sleep(duration);

      // Simulate commit
      const commitMessage = `orxa(${workstreamId}): ${spec.name}\n\n${spec.description}`;
      const commitHash = await this.worktreeManager.commitChanges(workstreamId, commitMessage);

      if (!commitHash) {
        return {
          workstream_id: workstreamId,
          success: false,
          error: 'Failed to commit changes',
          duration_ms: Date.now() - startTime,
        };
      }

      return {
        workstream_id: workstreamId,
        success: true,
        commit_hash: commitHash,
        duration_ms: Date.now() - startTime,
        files_modified: ['src/example.ts'], // Simulated
        lines_added: 100,
        lines_removed: 20,
      };
    } catch (error) {
      return {
        workstream_id: workstreamId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration_ms: Date.now() - startTime,
      };
    }
  }

  /**
   * Get simulated duration based on complexity.
   */
  private getSimulatedDuration(complexity: string): number {
    switch (complexity) {
      case 'low':
        return 5000; // 5 seconds
      case 'high':
        return 15000; // 15 seconds
      case 'medium':
      default:
        return 10000; // 10 seconds
    }
  }

  /**
   * Enqueue a completed workstream for merging.
   */
  private enqueueForMerge(workstreamId: string, commitHash: string): void {
    const worktreePath = this.worktreeManager.getWorktreePath(workstreamId);
    
    this.mergeQueue.enqueue({
      workstream_id: workstreamId,
      worktree_name: worktreePath ? path.basename(worktreePath) : workstreamId,
      status: 'completed',
      commit_hash: commitHash,
    });
  }

  /**
   * Process the merge queue.
   */
  private async processMergeQueue(): Promise<void> {
    while (!this.mergeQueue.isEmpty) {
      const { item, result } = await this.mergeQueue.processNext(true);

      if (item) {
        if (result.success) {
          this.emit('merged', {
            workstream_id: item.workstream_id,
            commit_hash: result.commit_hash,
          });
        } else if (result.had_conflicts) {
          this.emit('conflict', {
            workstream_id: item.workstream_id,
            conflict_files: result.conflict_files,
          });
        }
      }
    }
  }

  /**
   * Start polling the queue for new items.
   */
  private startQueuePolling(): void {
    this.queuePollInterval = setInterval(() => {
      // In a real implementation, this would check for external queue items
      // For now, it's a no-op since we manage the queue internally
    }, this.config.queue_poll_interval_ms);
  }

  /**
   * Stop queue polling.
   */
  private stopQueuePolling(): void {
    if (this.queuePollInterval) {
      clearInterval(this.queuePollInterval);
      this.queuePollInterval = undefined;
    }
  }

  /**
   * Set the current phase.
   */
  private async setPhase(phase: OrxaState['phase']): Promise<void> {
    this.state.phase = phase;
    this.emit('phase_changed', { phase });
  }

  /**
   * Create a progress update object.
   */
  private createProgress(message?: string): OrxaProgress {
    const total = this.state.workstreams.length;
    const completed = this.state.completed_workstreams.length;
    const failed = this.state.failed_workstreams.length;
    const inProgress = total - completed - failed; // Simplified

    return {
      phase: this.state.phase,
      total_workstreams: total,
      completed,
      failed,
      in_progress: Math.max(0, inProgress),
      pending: Math.max(0, total - completed - failed - inProgress),
      current_workstream: undefined,
      message: message || this.getPhaseMessage(),
      percent_complete: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }

  /**
   * Get a message for the current phase.
   */
  private getPhaseMessage(): string {
    switch (this.state.phase) {
      case 'generating_specs':
        return 'Generating workstream specifications...';
      case 'creating_worktrees':
        return `Creating ${this.state.workstreams.length} worktrees...`;
      case 'executing':
        return 'Executing workstreams in parallel...';
      case 'merging':
        return 'Merging completed workstreams...';
      case 'cleanup':
        return 'Cleaning up...';
      case 'idle':
      default:
        return 'Idle';
    }
  }

  /**
   * Sleep for a given duration.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get the current state.
   */
  getState(): OrxaState {
    return { ...this.state };
  }

  /**
   * Check if a session is active.
   */
  isActive(): boolean {
    return this.state.active;
  }

  /**
   * Clean up worktrees and resources.
   */
  async cleanup(): Promise<void> {
    await this.worktreeManager.cleanupAll(true);
    this.state.worktrees = [];
    this.emit('cleanup_completed', {});
  }

  /**
   * Cancel the current session.
   */
  async cancel(): Promise<void> {
    this.processing = false;
    this.state.active = false;
    this.stopQueuePolling();
    await this.cleanup();
    this.emit('cancelled', { session_id: this.state.session_id });
  }

  /**
   * Save state to disk for recovery.
   */
  saveState(): void {
    const statePath = path.join(this.repoRoot, '.opencode', 'orxa', 'state.json');
    const dir = path.dirname(statePath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(statePath, JSON.stringify(this.state, null, 2));
  }

  /**
   * Load state from disk.
   */
  loadState(): boolean {
    const statePath = path.join(this.repoRoot, '.opencode', 'orxa', 'state.json');
    
    if (!fs.existsSync(statePath)) {
      return false;
    }

    try {
      const data = JSON.parse(fs.readFileSync(statePath, 'utf8'));
      this.state = { ...this.state, ...data };
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Create an Orxa orchestrator instance.
 */
export function createOrchestrator(
  repoRoot: string,
  config?: Partial<OrxaSessionConfig>
): OrxaOrchestrator {
  return new OrxaOrchestrator(repoRoot, config);
}

/**
 * Check if Orxa mode is available (git repo, etc.).
 */
export function isOrxaAvailable(repoRoot: string = process.cwd()): boolean {
  try {
    // Check if it's a git repo
    fs.accessSync(path.join(repoRoot, '.git'));
    return true;
  } catch {
    return false;
  }
}
