/**
 * Git Worktree Manager for Orxa Orchestration
 * 
 * Handles creation, management, and cleanup of git worktrees for parallel
 * workstream execution. Each workstream gets its own isolated worktree.
 */

import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import type { WorktreeResult, OrxaState } from './types.js';

/**
 * Error thrown when worktree operations fail.
 */
export class WorktreeError extends Error {
  constructor(
    message: string,
    public readonly command?: string,
    public readonly stderr?: string
  ) {
    super(message);
    this.name = 'WorktreeError';
  }
}

/**
 * Manages git worktrees for Orxa parallel execution.
 */
export class WorktreeManager {
  private worktrees: Map<string, string> = new Map();
  private originalBranch: string;
  private repoRoot: string;
  private worktreeBasePath: string;

  constructor(
    private readonly prefix: string = 'orxa',
    repoRoot?: string,
    worktreeBasePath?: string
  ) {
    this.repoRoot = repoRoot || this.findRepoRoot();
    this.worktreeBasePath = worktreeBasePath || path.dirname(this.repoRoot);
    this.originalBranch = this.getCurrentBranch();
  }

  /**
   * Find the root of the git repository.
   */
  private findRepoRoot(): string {
    try {
      const result = execSync('git rev-parse --show-toplevel', {
        encoding: 'utf8',
        cwd: process.cwd(),
      });
      return result.trim();
    } catch (error) {
      throw new WorktreeError(
        'Failed to find git repository root. Are you in a git repository?',
        'git rev-parse --show-toplevel'
      );
    }
  }

  /**
   * Get the current git branch name.
   */
  private getCurrentBranch(): string {
    try {
      const result = execSync('git branch --show-current', {
        encoding: 'utf8',
        cwd: this.repoRoot,
      });
      return result.trim();
    } catch (error) {
      throw new WorktreeError(
        'Failed to get current branch',
        'git branch --show-current'
      );
    }
  }

  /**
   * Get the repository root path.
   */
  getRepoRoot(): string {
    return this.repoRoot;
  }

  /**
   * Get the original branch name.
   */
  getOriginalBranch(): string {
    return this.originalBranch;
  }

  /**
   * Create a new worktree for a workstream.
   * 
   * @param workstreamId - Unique identifier for the workstream
   * @param index - Index number for the worktree (e.g., 1, 2, 3)
   * @returns Result of the worktree creation
   */
  async createWorktree(workstreamId: string, index: number): Promise<WorktreeResult> {
    const worktreeName = `${this.prefix}-${index}`;
    const branchName = `orxa/${workstreamId}`;
    const worktreePath = path.join(this.worktreeBasePath, worktreeName);

    try {
      // Check if worktree already exists
      if (this.worktreeExists(worktreeName)) {
        return {
          success: false,
          error: `Worktree ${worktreeName} already exists`,
        };
      }

      // Create a new branch for this workstream
      execSync(`git branch ${branchName} ${this.originalBranch}`, {
        cwd: this.repoRoot,
        encoding: 'utf8',
      });

      // Create the worktree
      execSync(`git worktree add "${worktreePath}" ${branchName}`, {
        cwd: this.repoRoot,
        encoding: 'utf8',
      });

      // Track the worktree
      this.worktrees.set(workstreamId, worktreePath);

      return {
        success: true,
        path: worktreePath,
        branch: branchName,
      };
    } catch (error) {
      const stderr = error instanceof Error ? error.message : String(error);
      
      // Cleanup branch if worktree creation failed
      try {
        execSync(`git branch -D ${branchName} 2>/dev/null || true`, {
          cwd: this.repoRoot,
        });
      } catch {
        // Ignore cleanup errors
      }

      return {
        success: false,
        error: `Failed to create worktree: ${stderr}`,
      };
    }
  }

  /**
   * Check if a worktree exists.
   */
  private worktreeExists(worktreeName: string): boolean {
    try {
      const result = execSync('git worktree list --porcelain', {
        cwd: this.repoRoot,
        encoding: 'utf8',
      });
      
      return result.includes(worktreeName);
    } catch {
      return false;
    }
  }

  /**
   * Get the path to a worktree by workstream ID.
   */
  getWorktreePath(workstreamId: string): string | undefined {
    return this.worktrees.get(workstreamId);
  }

  /**
   * Get all tracked worktrees.
   */
  getAllWorktrees(): Map<string, string> {
    return new Map(this.worktrees);
  }

  /**
   * Commit changes in a worktree.
   * 
   * @param workstreamId - ID of the workstream
   * @param message - Commit message
   * @returns The commit hash if successful
   */
  async commitChanges(workstreamId: string, message: string): Promise<string | null> {
    const worktreePath = this.worktrees.get(workstreamId);
    if (!worktreePath) {
      return null;
    }

    try {
      // Stage all changes
      execSync('git add -A', {
        cwd: worktreePath,
        encoding: 'utf8',
      });

      // Commit
      execSync(`git commit -m "${message.replace(/"/g, '\\"')}"`, {
        cwd: worktreePath,
        encoding: 'utf8',
      });

      // Get the commit hash
      const hash = execSync('git rev-parse HEAD', {
        cwd: worktreePath,
        encoding: 'utf8',
      }).trim();

      return hash;
    } catch (error) {
      return null;
    }
  }

  /**
   * Push worktree changes to the queue directory.
   * 
   * @param workstreamId - ID of the workstream
   * @param queuePath - Path to the queue directory
   * @returns Whether the push was successful
   */
  async pushToQueue(workstreamId: string, queuePath: string): Promise<boolean> {
    const worktreePath = this.worktrees.get(workstreamId);
    if (!worktreePath) {
      return false;
    }

    try {
      // Create queue item file
      const queueItem = {
        workstream_id: workstreamId,
        worktree_path: worktreePath,
        pushed_at: new Date().toISOString(),
      };

      const queueFile = path.join(queuePath, `${workstreamId}.json`);
      fs.writeFileSync(queueFile, JSON.stringify(queueItem, null, 2));

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Remove a worktree and its branch.
   * 
   * @param workstreamId - ID of the workstream
   * @param force - Whether to force removal even with uncommitted changes
   * @returns Whether removal was successful
   */
  async removeWorktree(workstreamId: string, force: boolean = false): Promise<boolean> {
    const worktreePath = this.worktrees.get(workstreamId);
    if (!worktreePath) {
      return false;
    }

    try {
      // Get the branch name from the worktree path
      const branchName = `orxa/${workstreamId}`;

      // Remove the worktree
      const forceFlag = force ? ' --force' : '';
      execSync(`git worktree remove "${worktreePath}"${forceFlag}`, {
        cwd: this.repoRoot,
        encoding: 'utf8',
      });

      // Delete the branch
      try {
        execSync(`git branch -D ${branchName}`, {
          cwd: this.repoRoot,
          encoding: 'utf8',
        });
      } catch {
        // Branch might already be deleted
      }

      // Remove from tracking
      this.worktrees.delete(workstreamId);

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Clean up all worktrees created by this manager.
   * 
   * @param force - Whether to force removal
   * @returns Results for each worktree
   */
  async cleanupAll(force: boolean = false): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    for (const [workstreamId] of this.worktrees) {
      results[workstreamId] = await this.removeWorktree(workstreamId, force);
    }

    return results;
  }

  /**
   * Check if a worktree has uncommitted changes.
   * 
   * @param workstreamId - ID of the workstream
   * @returns Whether there are uncommitted changes
   */
  hasUncommittedChanges(workstreamId: string): boolean {
    const worktreePath = this.worktrees.get(workstreamId);
    if (!worktreePath) {
      return false;
    }

    try {
      const result = execSync('git status --porcelain', {
        cwd: worktreePath,
        encoding: 'utf8',
      });
      return result.trim().length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Get the diff stats for a worktree.
   * 
   * @param workstreamId - ID of the workstream
   * @returns Diff statistics or null
   */
  getDiffStats(workstreamId: string): { files: number; insertions: number; deletions: number } | null {
    const worktreePath = this.worktrees.get(workstreamId);
    if (!worktreePath) {
      return null;
    }

    try {
      const result = execSync('git diff --shortstat HEAD', {
        cwd: worktreePath,
        encoding: 'utf8',
      });

      // Parse the shortstat output
      const match = result.match(/(\d+) files? changed(?:, (\d+) insertions?\(\+\))?(?:, (\d+) deletions?\(-\))?/);
      if (match) {
        return {
          files: parseInt(match[1], 10),
          insertions: parseInt(match[2] || '0', 10),
          deletions: parseInt(match[3] || '0', 10),
        };
      }

      return { files: 0, insertions: 0, deletions: 0 };
    } catch {
      return null;
    }
  }

  /**
   * List all git worktrees in the repository.
   */
  listAllWorktrees(): Array<{ path: string; branch: string; commit: string }> {
    try {
      const result = execSync('git worktree list --porcelain', {
        cwd: this.repoRoot,
        encoding: 'utf8',
      });

      const worktrees: Array<{ path: string; branch: string; commit: string }> = [];
      const entries = result.split('\n\n');

      for (const entry of entries) {
        const lines = entry.split('\n');
        const worktree: Partial<{ path: string; branch: string; commit: string }> = {};

        for (const line of lines) {
          if (line.startsWith('worktree ')) {
            worktree.path = line.substring(9);
          } else if (line.startsWith('HEAD ')) {
            worktree.commit = line.substring(5);
          } else if (line.startsWith('branch ')) {
            worktree.branch = line.substring(7).replace('refs/heads/', '');
          }
        }

        if (worktree.path && worktree.commit) {
          worktrees.push(worktree as { path: string; branch: string; commit: string });
        }
      }

      return worktrees;
    } catch {
      return [];
    }
  }

  /**
   * Prune stale worktree entries.
   */
  pruneWorktrees(): boolean {
    try {
      execSync('git worktree prune', {
        cwd: this.repoRoot,
        encoding: 'utf8',
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the state of all worktrees for persistence.
   */
  getState(): Pick<OrxaState, 'original_branch' | 'worktrees'> {
    return {
      original_branch: this.originalBranch,
      worktrees: Array.from(this.worktrees.values()),
    };
  }

  /**
   * Restore worktree manager state from persisted state.
   */
  restoreState(state: { original_branch: string; worktrees: string[] }): void {
    this.originalBranch = state.original_branch;
    this.worktrees.clear();
    
    // Reconstruct the worktrees map from paths
    for (const worktreePath of state.worktrees) {
      const worktreeName = path.basename(worktreePath);
      const match = worktreeName.match(new RegExp(`^${this.prefix}-(.+)$`));
      if (match) {
        const workstreamId = match[1];
        this.worktrees.set(workstreamId, worktreePath);
      }
    }
  }
}

/**
 * Create a worktree manager instance.
 */
export function createWorktreeManager(
  prefix?: string,
  repoRoot?: string,
  worktreeBasePath?: string
): WorktreeManager {
  return new WorktreeManager(prefix, repoRoot, worktreeBasePath);
}

/**
 * Check if the current directory is a git repository.
 */
export function isGitRepository(cwd: string = process.cwd()): boolean {
  try {
    execSync('git rev-parse --git-dir', {
      cwd,
      stdio: 'pipe',
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the default queue directory path.
 */
export function getDefaultQueueDirectory(): string {
  const homeDir = process.env.HOME || process.env.USERPROFILE || '/tmp';
  return path.join(homeDir, '.orxa-queue');
}

/**
 * Ensure the queue directory exists.
 */
export function ensureQueueDirectory(queuePath: string): void {
  if (!fs.existsSync(queuePath)) {
    fs.mkdirSync(queuePath, { recursive: true });
  }
}
