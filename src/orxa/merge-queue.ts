/**
 * Merge Queue for Orxa Orchestration
 * 
 * Manages a FIFO queue for merging completed workstreams from parallel
 * worktrees. Handles cherry-picking, conflict detection, and resolution.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import type { 
  OrxaQueueItem, 
  MergeResult, 
  ConflictResolutionResult,
  QueueFileEntry 
} from './types';

/**
 * Error thrown when merge operations fail.
 */
export class MergeQueueError extends Error {
  constructor(
    message: string,
    public readonly workstreamId?: string,
    public readonly conflictFiles?: string[]
  ) {
    super(message);
    this.name = 'MergeQueueError';
  }
}

/**
 * Manages the FIFO merge queue for Orxa workstreams.
 */
export class MergeQueue {
  private queue: OrxaQueueItem[] = [];
  private processing: boolean = false;

  constructor(
    private readonly queuePath: string,
    private readonly repoRoot: string,
    private readonly conflictResolutionAgent: string = 'architect'
  ) {
    this.ensureQueueDirectory();
    this.loadQueue();
  }

  /**
   * Ensure the queue directory exists.
   */
  private ensureQueueDirectory(): void {
    if (!fs.existsSync(this.queuePath)) {
      fs.mkdirSync(this.queuePath, { recursive: true });
    }
  }

  /**
   * Load the queue from disk.
   */
  private loadQueue(): void {
    if (!fs.existsSync(this.queuePath)) {
      return;
    }

    const files = fs.readdirSync(this.queuePath)
      .filter(f => f.endsWith('.json'))
      .sort(); // FIFO order

    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(this.queuePath, file), 'utf8');
        const entry: QueueFileEntry = JSON.parse(content);
        this.queue.push(entry.item);
      } catch {
        // Skip invalid entries
      }
    }
  }

  /**
   * Add an item to the queue.
   * 
   * @param item - The queue item to add
   */
  enqueue(item: Omit<OrxaQueueItem, 'id' | 'created_at' | 'merge_attempts'>): OrxaQueueItem {
    const fullItem: OrxaQueueItem = {
      ...item,
      id: this.generateId(),
      created_at: new Date().toISOString(),
      merge_attempts: 0,
    };

    this.queue.push(fullItem);
    this.saveQueueItem(fullItem);

    return fullItem;
  }

  /**
   * Generate a unique queue item ID.
   */
  private generateId(): string {
    return `queue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Save a queue item to disk.
   */
  private saveQueueItem(item: OrxaQueueItem): void {
    const entry: QueueFileEntry = {
      item,
      version: 1,
      updated_at: new Date().toISOString(),
    };

    const filePath = path.join(this.queuePath, `${item.workstream_id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(entry, null, 2));
  }

  /**
   * Remove a queue item from disk.
   */
  private removeQueueItem(workstreamId: string): void {
    const filePath = path.join(this.queuePath, `${workstreamId}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  /**
   * Get the next item from the queue (FIFO).
   * 
   * @returns The next item or undefined if queue is empty
   */
  dequeue(): OrxaQueueItem | undefined {
    // Find the first pending or completed item (not failed or already merging)
    const index = this.queue.findIndex(
      item => item.status === 'pending' || item.status === 'completed'
    );

    if (index === -1) {
      return undefined;
    }

    const item = this.queue[index];
    
    // Mark as in_progress
    item.status = 'merging';
    this.saveQueueItem(item);

    return item;
  }

  /**
   * Peek at the next item without removing it.
   */
  peek(): OrxaQueueItem | undefined {
    return this.queue.find(
      item => item.status === 'pending' || item.status === 'completed'
    );
  }

  /**
   * Get all items in the queue.
   */
  getAllItems(): OrxaQueueItem[] {
    return [...this.queue];
  }

  /**
   * Get items by status.
   */
  getItemsByStatus(status: OrxaQueueItem['status']): OrxaQueueItem[] {
    return this.queue.filter(item => item.status === status);
  }

  /**
   * Update an item in the queue.
   */
  updateItem(workstreamId: string, updates: Partial<OrxaQueueItem>): void {
    const item = this.queue.find(i => i.workstream_id === workstreamId);
    if (item) {
      Object.assign(item, updates);
      this.saveQueueItem(item);
    }
  }

  /**
   * Mark an item as completed.
   */
  markCompleted(workstreamId: string, commitHash: string): void {
    this.updateItem(workstreamId, {
      status: 'completed',
      commit_hash: commitHash,
      completed_at: new Date().toISOString(),
    });
  }

  /**
   * Mark an item as failed.
   */
  markFailed(workstreamId: string, errorMessage: string): void {
    this.updateItem(workstreamId, {
      status: 'failed',
      error_message: errorMessage,
    });
  }

  /**
   * Mark an item as having conflicts.
   */
  markConflict(workstreamId: string, conflictFiles: string[]): void {
    this.updateItem(workstreamId, {
      status: 'conflict',
      conflict_files: conflictFiles,
    });
  }

  /**
   * Remove an item from the queue.
   */
  removeItem(workstreamId: string): void {
    const index = this.queue.findIndex(i => i.workstream_id === workstreamId);
    if (index !== -1) {
      this.queue.splice(index, 1);
      this.removeQueueItem(workstreamId);
    }
  }

  /**
   * Get the queue length.
   */
  get length(): number {
    return this.queue.length;
  }

  /**
   * Check if the queue is empty.
   */
  get isEmpty(): boolean {
    return this.queue.length === 0;
  }

  /**
   * Cherry-pick a commit from a worktree into the main branch.
   * 
   * @param workstreamId - ID of the workstream
   * @param commitHash - Hash of the commit to cherry-pick
   * @param targetBranch - Branch to cherry-pick into (defaults to original branch)
   * @returns Merge result
   */
  async cherryPick(
    workstreamId: string,
    commitHash: string,
    targetBranch?: string
  ): Promise<MergeResult> {
    const branch = targetBranch || this.getCurrentBranch();

    try {
      // Checkout target branch
      execSync(`git checkout ${branch}`, {
        cwd: this.repoRoot,
        encoding: 'utf8',
        stdio: 'pipe',
      });

      // Attempt cherry-pick
      execSync(`git cherry-pick ${commitHash}`, {
        cwd: this.repoRoot,
        encoding: 'utf8',
        stdio: 'pipe',
      });

      // Get the new commit hash
      const newHash = execSync('git rev-parse HEAD', {
        cwd: this.repoRoot,
        encoding: 'utf8',
      }).trim();

      return {
        success: true,
        commit_hash: newHash,
        had_conflicts: false,
        resolution: 'none',
      };
    } catch (error) {
      // Check if there are conflicts
      const conflicts = this.getConflictFiles();

      if (conflicts.length > 0) {
        // Abort the cherry-pick
        try {
          execSync('git cherry-pick --abort', {
            cwd: this.repoRoot,
            stdio: 'pipe',
          });
        } catch {
          // Ignore abort errors
        }

        return {
          success: false,
          had_conflicts: true,
          conflict_files: conflicts,
          resolution: 'none',
          error: `Merge conflicts in files: ${conflicts.join(', ')}`,
        };
      }

      return {
        success: false,
        had_conflicts: false,
        resolution: 'none',
        error: error instanceof Error ? error.message : 'Cherry-pick failed',
      };
    }
  }

  /**
   * Get list of files with conflicts.
   */
  private getConflictFiles(): string[] {
    try {
      const result = execSync('git diff --name-only --diff-filter=U', {
        cwd: this.repoRoot,
        encoding: 'utf8',
      });
      return result.trim().split('\n').filter(f => f.length > 0);
    } catch {
      return [];
    }
  }

  /**
   * Check if there are merge conflicts.
   */
  hasConflicts(): boolean {
    try {
      execSync('git diff --check', {
        cwd: this.repoRoot,
        stdio: 'pipe',
      });
      return false;
    } catch {
      return true;
    }
  }

  /**
   * Attempt automatic conflict resolution.
   * 
   * @param strategy - Resolution strategy
   * @returns Whether conflicts were resolved
   */
  async resolveConflictsAuto(strategy: 'ours' | 'theirs' | 'union' = 'theirs'): Promise<ConflictResolutionResult> {
    const conflictFiles = this.getConflictFiles();

    if (conflictFiles.length === 0) {
      return {
        resolved: true,
        method: 'auto',
        resolved_files: [],
      };
    }

    try {
      // Resolve each conflict file
      for (const file of conflictFiles) {
        if (strategy === 'ours') {
          execSync(`git checkout --ours "${file}"`, {
            cwd: this.repoRoot,
            stdio: 'pipe',
          });
        } else if (strategy === 'theirs') {
          execSync(`git checkout --theirs "${file}"`, {
            cwd: this.repoRoot,
            stdio: 'pipe',
          });
        }
        // For 'union', we'd need custom logic

        // Stage the resolved file
        execSync(`git add "${file}"`, {
          cwd: this.repoRoot,
          stdio: 'pipe',
        });
      }

      // Complete the merge
      execSync('git commit --no-edit', {
        cwd: this.repoRoot,
        stdio: 'pipe',
      });

      const commitHash = execSync('git rev-parse HEAD', {
        cwd: this.repoRoot,
        encoding: 'utf8',
      }).trim();

      return {
        resolved: true,
        method: 'auto',
        resolved_files: conflictFiles,
        resolution_commit: commitHash,
      };
    } catch (error) {
      // Abort the merge
      try {
        execSync('git merge --abort', {
          cwd: this.repoRoot,
          stdio: 'pipe',
        });
      } catch {
        // Ignore
      }

      return {
        resolved: false,
        method: 'auto',
        resolved_files: [],
        remaining_conflicts: conflictFiles,
        error: error instanceof Error ? error.message : 'Auto-resolution failed',
      };
    }
  }

  /**
   * Delegate conflict resolution to an agent.
   * 
   * @param workstreamId - ID of the workstream
   * @param conflictFiles - Files with conflicts
   * @returns Resolution result
   */
  async delegateConflictResolution(
    workstreamId: string,
    conflictFiles: string[]
  ): Promise<ConflictResolutionResult> {
    // In a real implementation, this would delegate to the conflict resolution agent
    // For now, return a placeholder result
    
    return {
      resolved: false,
      method: 'delegated',
      resolved_files: [],
      remaining_conflicts: conflictFiles,
      error: 'Conflict resolution delegation not yet implemented',
    };
  }

  /**
   * Process the next item in the queue.
   * 
   * @param autoResolve - Whether to attempt auto-resolution of conflicts
   * @returns Result of processing
   */
  async processNext(autoResolve: boolean = true): Promise<{
    item?: OrxaQueueItem;
    result: MergeResult;
  }> {
    if (this.processing) {
      return {
        result: {
          success: false,
          had_conflicts: false,
          error: 'Queue is already being processed',
        },
      };
    }

    this.processing = true;

    try {
      const item = this.dequeue();

      if (!item) {
        return {
          result: {
            success: false,
            had_conflicts: false,
            error: 'Queue is empty',
          },
        };
      }

      if (!item.commit_hash) {
        this.markFailed(item.workstream_id, 'No commit hash provided');
        return {
          item,
          result: {
            success: false,
            had_conflicts: false,
            error: 'No commit hash provided',
          },
        };
      }

      // Attempt cherry-pick
      let result = await this.cherryPick(item.workstream_id, item.commit_hash);

      if (!result.success && result.had_conflicts && autoResolve) {
        // Attempt auto-resolution
        const resolution = await this.resolveConflictsAuto('theirs');

        if (resolution.resolved) {
          result = {
            success: true,
            commit_hash: resolution.resolution_commit,
            had_conflicts: true,
            resolution: 'auto',
          };
          this.markCompleted(item.workstream_id, resolution.resolution_commit!);
        } else {
          // Mark as conflict for manual resolution
          this.markConflict(item.workstream_id, result.conflict_files || []);
        }
      } else if (result.success) {
        this.markCompleted(item.workstream_id, result.commit_hash!);
      } else {
        this.markFailed(item.workstream_id, result.error || 'Unknown error');
      }

      return { item, result };
    } finally {
      this.processing = false;
    }
  }

  /**
   * Process all items in the queue.
   * 
   * @param autoResolve - Whether to attempt auto-resolution
   * @returns Results for all items
   */
  async processAll(autoResolve: boolean = true): Promise<Array<{
    item: OrxaQueueItem;
    result: MergeResult;
  }>> {
    const results: Array<{ item: OrxaQueueItem; result: MergeResult }> = [];

    while (!this.isEmpty) {
      const { item, result } = await this.processNext(autoResolve);
      if (item) {
        results.push({ item, result });
      }

      // Stop if we hit a conflict that couldn't be auto-resolved
      if (!result.success && result.had_conflicts) {
        break;
      }
    }

    return results;
  }

  /**
   * Get the current git branch.
   */
  private getCurrentBranch(): string {
    try {
      return execSync('git branch --show-current', {
        cwd: this.repoRoot,
        encoding: 'utf8',
      }).trim();
    } catch {
      return 'main';
    }
  }

  /**
   * Clear the entire queue.
   */
  clear(): void {
    // Remove all queue files
    if (fs.existsSync(this.queuePath)) {
      const files = fs.readdirSync(this.queuePath)
        .filter(f => f.endsWith('.json'));
      
      for (const file of files) {
        fs.unlinkSync(path.join(this.queuePath, file));
      }
    }

    this.queue = [];
  }

  /**
   * Get queue statistics.
   */
  getStats(): {
    total: number;
    pending: number;
    completed: number;
    failed: number;
    in_progress: number;
    conflict: number;
  } {
    return {
      total: this.queue.length,
      pending: this.queue.filter(i => i.status === 'pending').length,
      completed: this.queue.filter(i => i.status === 'completed').length,
      failed: this.queue.filter(i => i.status === 'failed').length,
      in_progress: this.queue.filter(i => i.status === 'in_progress').length,
      conflict: this.queue.filter(i => i.status === 'conflict').length,
    };
  }
}

/**
 * Create a merge queue instance.
 */
export function createMergeQueue(
  queuePath: string,
  repoRoot: string,
  conflictResolutionAgent?: string
): MergeQueue {
  return new MergeQueue(queuePath, repoRoot, conflictResolutionAgent);
}

/**
 * Get the default queue path.
 */
export function getDefaultQueuePath(): string {
  const homeDir = process.env.HOME || process.env.USERPROFILE || '/tmp';
  return path.join(homeDir, '.orxa-queue');
}
