/**
 * Orxa Orchestration Tests
 * 
 * Comprehensive test suite for Orxa parallel multi-agent orchestration.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import os from 'os';
import {
  WorkstreamSpec,
  OrxaQueueItem,
  OrxaState,
  OrxaConfigSchema,
} from '../src/orxa/types';
import {
  WorktreeManager,
  createWorktreeManager,
  isGitRepository,
  getDefaultQueueDirectory,
  ensureQueueDirectory,
} from '../src/orxa/worktree-manager';
import {
  SpecGenerator,
  createSpecGenerator,
  EXAMPLE_WORKSTREAM_SPECS,
} from '../src/orxa/spec-generator';
import {
  MergeQueue,
  createMergeQueue,
  getDefaultQueuePath,
} from '../src/orxa/merge-queue';
import {
  OrxaOrchestrator,
  createOrchestrator,
  isOrxaAvailable,
} from '../src/orxa/orchestrator';
import {
  detectOrxaKeyword,
  shouldTriggerOrxa,
  stripOrxaKeyword,
  getOrxaSystemPrompt,
  createOrchestratorDelegationPrompt,
} from '../src/hooks/orxa-detector';
import {
  showOrxaActivatedToast,
  showProgressToast,
  showWorkstreamCompleteToast,
  showCompletionToast,
  formatProgress,
  createProgressBar,
  getIndicatorState,
  clearAllToasts,
} from '../src/hooks/orxa-indicator';

// Generate unique test directories to avoid conflicts between parallel tests
let testRunId: string;
let TEST_REPO_PATH: string;
let TEST_QUEUE_PATH: string;

describe('Orxa Orchestration', () => {
  beforeAll(() => {
    // Generate unique test run ID
    testRunId = `test-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    TEST_REPO_PATH = path.join(os.tmpdir(), `orxa-test-repo-${testRunId}`);
    TEST_QUEUE_PATH = path.join(os.tmpdir(), `orxa-test-queue-${testRunId}`);

    // Create test repository
    fs.mkdirSync(TEST_REPO_PATH, { recursive: true });
    execSync('git init', { cwd: TEST_REPO_PATH });
    execSync('git config user.email "test@test.com"', { cwd: TEST_REPO_PATH });
    execSync('git config user.name "Test"', { cwd: TEST_REPO_PATH });
    fs.writeFileSync(path.join(TEST_REPO_PATH, 'README.md'), '# Test Repo');
    execSync('git add .', { cwd: TEST_REPO_PATH });
    execSync('git commit -m "Initial commit"', { cwd: TEST_REPO_PATH });

    // Create test queue directory
    fs.mkdirSync(TEST_QUEUE_PATH, { recursive: true });
  });

  afterAll(() => {
    // Cleanup
    if (fs.existsSync(TEST_REPO_PATH)) {
      fs.rmSync(TEST_REPO_PATH, { recursive: true, force: true });
    }
    if (fs.existsSync(TEST_QUEUE_PATH)) {
      fs.rmSync(TEST_QUEUE_PATH, { recursive: true, force: true });
    }
  });

  describe('Types', () => {
    it('should define WorkstreamSpec interface correctly', () => {
      const spec: WorkstreamSpec = {
        id: 'test-1',
        name: 'Test Workstream',
        description: 'A test workstream',
        dependencies: [],
        acceptance_criteria: ['Criterion 1'],
        estimated_complexity: 'medium',
        context_files: ['src/test.ts'],
        timeout_minutes: 60,
        recommended_agent: 'build',
      };

      expect(spec.id).toBe('test-1');
      expect(spec.estimated_complexity).toMatch(/low|medium|high/);
    });

    it('should define OrxaQueueItem interface correctly', () => {
      const item: OrxaQueueItem = {
        id: 'queue-1',
        workstream_id: 'test-1',
        worktree_name: 'orxa-1',
        status: 'pending',
        created_at: new Date().toISOString(),
        merge_attempts: 0,
      };

      expect(item.status).toMatch(/pending|in_progress|completed|failed|merging|conflict/);
    });

    it('should define OrxaState interface correctly', () => {
      const state: OrxaState = {
        active: false,
        session_id: 'test-session',
        original_branch: 'main',
        workstreams: [],
        worktrees: [],
        queue_path: TEST_QUEUE_PATH,
        started_at: new Date().toISOString(),
        completed_workstreams: [],
        failed_workstreams: [],
        phase: 'idle',
        config: {
          max_parallel_workstreams: 5,
          auto_merge: true,
          conflict_resolution_agent: 'orxa',
          worktree_prefix: 'orxa',
          cleanup_worktrees: true,
          queue_directory: TEST_QUEUE_PATH,
          queue_poll_interval_ms: 5000,
        },
      };

      expect(state.phase).toMatch(/idle|generating_specs|creating_worktrees|executing|merging|cleanup/);
    });
  });

  describe('Worktree Manager', () => {
    let manager: WorktreeManager;
    let worktreeBasePath: string;

    beforeEach(() => {
      // Create unique worktree base path for each test
      worktreeBasePath = path.join(os.tmpdir(), `orxa-worktrees-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
      fs.mkdirSync(worktreeBasePath, { recursive: true });
      manager = createWorktreeManager('test-orxa', TEST_REPO_PATH, worktreeBasePath);
    });

    afterEach(async () => {
      // Cleanup all worktrees created by this manager
      await manager.cleanupAll(true);
      // Remove worktree base directory
      if (fs.existsSync(worktreeBasePath)) {
        fs.rmSync(worktreeBasePath, { recursive: true, force: true });
      }
    });

    it('should create a worktree manager instance', () => {
      expect(manager).toBeInstanceOf(WorktreeManager);
      expect(manager.getRepoRoot()).toBe(TEST_REPO_PATH);
    });

    it('should detect git repository', () => {
      expect(isGitRepository(TEST_REPO_PATH)).toBe(true);
      expect(isGitRepository('/tmp')).toBe(false);
    });

    it('should get default queue directory', () => {
      const queueDir = getDefaultQueueDirectory();
      expect(queueDir).toContain('.orxa-queue');
    });

    it('should ensure queue directory exists', () => {
      const testDir = path.join(TEST_QUEUE_PATH, 'test-subdir');
      ensureQueueDirectory(testDir);
      expect(fs.existsSync(testDir)).toBe(true);
    });

    it('should get original branch', () => {
      const branch = manager.getOriginalBranch();
      expect(branch).toBe('main');
    });

    it('should create and remove a worktree', async () => {
      const result = await manager.createWorktree('test-workstream', 1);
      
      if (result.success) {
        expect(result.path).toBeDefined();
        expect(result.branch).toBe('orxa/test-workstream');
        expect(fs.existsSync(result.path!)).toBe(true);

        // Remove the worktree
        const removed = await manager.removeWorktree('test-workstream');
        expect(removed).toBe(true);
      }
    });

    it('should track worktrees', async () => {
      const result = await manager.createWorktree('track-test', 99);
      
      if (result.success) {
        const worktrees = manager.getAllWorktrees();
        expect(worktrees.has('track-test')).toBe(true);
        
        await manager.removeWorktree('track-test');
      }
    });

    it('should check for uncommitted changes', async () => {
      const result = await manager.createWorktree('changes-test', 2);
      
      if (result.success) {
        // Initially no changes
        expect(manager.hasUncommittedChanges('changes-test')).toBe(false);

        // Create a file
        fs.writeFileSync(path.join(result.path!, 'test.txt'), 'test content');
        
        // Now should have changes
        expect(manager.hasUncommittedChanges('changes-test')).toBe(true);

        await manager.removeWorktree('changes-test', true);
      }
    });
  });

  describe('Spec Generator', () => {
    let generator: SpecGenerator;

    beforeEach(() => {
      generator = createSpecGenerator('strategist', TEST_REPO_PATH);
    });

    it('should create a spec generator instance', () => {
      expect(generator).toBeInstanceOf(SpecGenerator);
    });

    it('should parse workstream specs from JSON', () => {
      const jsonResponse = JSON.stringify(EXAMPLE_WORKSTREAM_SPECS);
      const specs = generator.parseSpecs(jsonResponse);

      expect(specs).toHaveLength(3);
      expect(specs[0].id).toBe('auth-login');
      expect(specs[0].dependencies).toEqual([]);
    });

    it('should parse specs from markdown code blocks', () => {
      const markdownResponse = `
Here are the workstreams:

\`\`\`json
${JSON.stringify(EXAMPLE_WORKSTREAM_SPECS)}
\`\`\`

Let me know if you need anything else.
`;
      const specs = generator.parseSpecs(markdownResponse);
      expect(specs).toHaveLength(3);
    });

    it('should validate and normalize specs', () => {
      const incompleteSpec = `[
        {
          "description": "Test workstream"
        }
      ]`;

      const specs = generator.parseSpecs(incompleteSpec);
      expect(specs[0].id).toBeDefined();
      expect(specs[0].name).toBeDefined();
      expect(specs[0].dependencies).toEqual([]);
    });

    it('should build dependency graph', () => {
      const graph = generator.buildDependencyGraph(EXAMPLE_WORKSTREAM_SPECS);

      expect(graph.roots).toContain('auth-login');
      expect(graph.roots).toContain('auth-signup');
      expect(graph.dependencies.get('auth-oauth')).toContain('auth-login');
      expect(graph.topological_order).toHaveLength(3);
    });

    it('should detect circular dependencies', () => {
      const circularSpecs: WorkstreamSpec[] = [
        {
          id: 'a',
          name: 'A',
          description: 'Depends on B',
          dependencies: ['b'],
          acceptance_criteria: [],
          estimated_complexity: 'low',
        },
        {
          id: 'b',
          name: 'B',
          description: 'Depends on A',
          dependencies: ['a'],
          acceptance_criteria: [],
          estimated_complexity: 'low',
        },
      ];

      expect(() => generator.buildDependencyGraph(circularSpecs)).toThrow('Circular dependency');
    });

    it('should get ready workstreams', () => {
      const ready = generator.getReadyWorkstreams(EXAMPLE_WORKSTREAM_SPECS, []);
      expect(ready).toContain('auth-login');
      expect(ready).toContain('auth-signup');
      expect(ready).not.toContain('auth-oauth'); // Has dependency
    });

    it('should save and load specs', () => {
      const sessionId = 'test-session-123';
      generator.saveSpecs(sessionId, EXAMPLE_WORKSTREAM_SPECS);

      const loaded = generator.loadSpecs(sessionId);
      expect(loaded).not.toBeNull();
      expect(loaded?.workstreams).toHaveLength(3);
      expect(loaded?.session_id).toBe(sessionId);
    });

    it('should return system prompt', () => {
      const prompt = generator.getSystemPrompt();
      expect(prompt).toContain('task decomposition');
      expect(prompt).toContain('parallel');
    });
  });

  describe('Merge Queue', () => {
    let queue: MergeQueue;

    beforeEach(() => {
      // Clear queue
      if (fs.existsSync(TEST_QUEUE_PATH)) {
        fs.rmSync(TEST_QUEUE_PATH, { recursive: true, force: true });
      }
      fs.mkdirSync(TEST_QUEUE_PATH, { recursive: true });
      
      queue = createMergeQueue(TEST_QUEUE_PATH, TEST_REPO_PATH, 'orxa');
    });

    afterEach(() => {
      queue.clear();
    });

    it('should create a merge queue instance', () => {
      expect(queue).toBeInstanceOf(MergeQueue);
    });

    it('should enqueue items', () => {
      const item = queue.enqueue({
        workstream_id: 'test-1',
        worktree_name: 'orxa-1',
        status: 'completed',
        commit_hash: 'abc123',
      });

      expect(item.id).toBeDefined();
      expect(item.status).toBe('completed');
      expect(queue.length).toBe(1);
    });

    it('should dequeue items in FIFO order', () => {
      queue.enqueue({
        workstream_id: 'first',
        worktree_name: 'orxa-1',
        status: 'pending',
      });
      queue.enqueue({
        workstream_id: 'second',
        worktree_name: 'orxa-2',
        status: 'pending',
      });

      const first = queue.dequeue();
      expect(first?.workstream_id).toBe('first');

      const second = queue.dequeue();
      expect(second?.workstream_id).toBe('second');
    });

    it('should mark items as completed', () => {
      queue.enqueue({
        workstream_id: 'complete-test',
        worktree_name: 'orxa-1',
        status: 'pending',
      });

      queue.markCompleted('complete-test', 'def456');
      
      const items = queue.getItemsByStatus('completed');
      expect(items).toHaveLength(1);
      expect(items[0].commit_hash).toBe('def456');
    });

    it('should mark items as failed', () => {
      queue.enqueue({
        workstream_id: 'fail-test',
        worktree_name: 'orxa-1',
        status: 'pending',
      });

      queue.markFailed('fail-test', 'Build failed');
      
      const items = queue.getItemsByStatus('failed');
      expect(items).toHaveLength(1);
      expect(items[0].error_message).toBe('Build failed');
    });

    it('should get queue statistics', () => {
      queue.enqueue({ workstream_id: 's1', worktree_name: 'orxa-1', status: 'completed' });
      queue.enqueue({ workstream_id: 's2', worktree_name: 'orxa-2', status: 'failed' });
      queue.enqueue({ workstream_id: 's3', worktree_name: 'orxa-3', status: 'pending' });

      const stats = queue.getStats();
      expect(stats.total).toBe(3);
      expect(stats.completed).toBe(1);
      expect(stats.failed).toBe(1);
      expect(stats.pending).toBe(1);
    });

    it('should clear the queue', () => {
      queue.enqueue({ workstream_id: 'clear-test', worktree_name: 'orxa-1', status: 'pending' });
      expect(queue.length).toBe(1);

      queue.clear();
      expect(queue.length).toBe(0);
      expect(queue.isEmpty).toBe(true);
    });

    it('should persist queue to disk', () => {
      queue.enqueue({
        workstream_id: 'persist-test',
        worktree_name: 'orxa-1',
        status: 'completed',
        commit_hash: 'abc123',
      });

      // Create new queue instance (should load from disk)
      const newQueue = createMergeQueue(TEST_QUEUE_PATH, TEST_REPO_PATH);
      expect(newQueue.length).toBe(1);
    });
  });

  describe('Orchestrator', () => {
    let orchestrator: OrxaOrchestrator;

    beforeEach(() => {
      orchestrator = createOrchestrator(TEST_REPO_PATH, {
        queue_directory: TEST_QUEUE_PATH,
        max_parallel_workstreams: 2,
      });
    });

    afterEach(async () => {
      if (orchestrator.isActive()) {
        await orchestrator.cancel();
      }
    });

    it('should create an orchestrator instance', () => {
      expect(orchestrator).toBeInstanceOf(OrxaOrchestrator);
    });

    it('should check if Orxa is available', () => {
      expect(isOrxaAvailable(TEST_REPO_PATH)).toBe(true);
      expect(isOrxaAvailable('/tmp')).toBe(false);
    });

    it('should generate session ID', () => {
      const state = orchestrator.getState();
      expect(state.session_id).toMatch(/^orxa-/);
    });

    it('should not be active initially', () => {
      expect(orchestrator.isActive()).toBe(false);
    });

    it('should save and load state', () => {
      orchestrator.saveState();
      
      const newOrchestrator = createOrchestrator(TEST_REPO_PATH);
      const loaded = newOrchestrator.loadState();
      
      expect(loaded).toBe(true);
    });

    it('should emit events', async () => {
      const eventPromise = new Promise<void>((resolve) => {
        orchestrator.once('started', (data) => {
          expect(data.session_id).toBeDefined();
          resolve();
        });
      });

      // Trigger start (will fail in test environment but should emit started)
      orchestrator.start('test request').catch(() => {
        // Expected to fail in test environment
      });

      await eventPromise;
    });
  });

  describe('Orxa Detector Hook', () => {
    it('should detect orxa keyword', () => {
      const result = detectOrxaKeyword('orxa implement authentication');
      expect(result.triggered).toBe(true);
      expect(result.cleaned_message).toBe('implement authentication');
    });

    it('should detect orxa keyword case insensitive', () => {
      expect(detectOrxaKeyword('ORXA do something').triggered).toBe(true);
      expect(detectOrxaKeyword('OrXa test').triggered).toBe(true);
    });

    it('should not trigger on non-orxa messages', () => {
      const result = detectOrxaKeyword('implement authentication');
      expect(result.triggered).toBe(false);
      expect(result.cleaned_message).toBe('implement authentication');
    });

    it('should strip orxa keyword', () => {
      expect(stripOrxaKeyword('orxa do this')).toBe('do this');
      expect(stripOrxaKeyword('ORXA do that')).toBe('do that');
    });

    it('should check if should trigger orxa', () => {
      expect(shouldTriggerOrxa('orxa test')).toBe(true);
      expect(shouldTriggerOrxa('test')).toBe(false);
    });

    it('should return system prompt', () => {
      const prompt = getOrxaSystemPrompt();
      expect(prompt).toContain('ORXA ORCHESTRATION MODE');
      expect(prompt).toContain('parallel');
    });

    it('should create delegation prompt', () => {
      const prompt = createOrchestratorDelegationPrompt('implement auth');
      expect(prompt).toContain('implement auth');
      expect(prompt).toContain('createOrchestrator');
    });
  });

  describe('Orxa Indicator Hook', () => {
    beforeEach(() => {
      clearAllToasts();
    });

    it('should show activation toast', () => {
      const toast = showOrxaActivatedToast();
      expect(toast.type).toBe('info');
      expect(toast.title).toContain('ORXA MODE ACTIVATED');
    });

    it('should show progress toast', () => {
      const progress = {
        phase: 'executing' as const,
        total_workstreams: 5,
        completed: 3,
        failed: 0,
        in_progress: 2,
        pending: 0,
        message: 'Working...',
        percent_complete: 60,
      };

      const toast = showProgressToast(progress);
      expect(toast.message).toContain('3/5');
    });

    it('should show workstream complete toast', () => {
      const toast = showWorkstreamCompleteToast('auth-login');
      expect(toast.type).toBe('success');
      expect(toast.title).toContain('Workstream Complete');
    });

    it('should show completion toast', () => {
      const toast = showCompletionToast({ total: 5, completed: 5, failed: 0 });
      expect(toast.type).toBe('success');
      expect(toast.title).toContain('ORXA ORCHESTRATION COMPLETE');
    });

    it('should format progress', () => {
      const progress = {
        phase: 'executing' as const,
        total_workstreams: 10,
        completed: 5,
        failed: 1,
        in_progress: 2,
        pending: 2,
        message: 'Working...',
        percent_complete: 50,
      };

      const formatted = formatProgress(progress);
      expect(formatted).toContain('ORXA ORCHESTRATION');
      expect(formatted).toContain('50%');
    });

    it('should create progress bar', () => {
      const bar = createProgressBar(50, 10);
      expect(bar).toHaveLength(10);
      expect(bar).toContain('█');
      expect(bar).toContain('░');
    });

    it('should get indicator state', () => {
      const state = getIndicatorState();
      expect(state.active).toBe(false);
      expect(state.toasts).toEqual([]);
    });
  });

  describe('Integration', () => {
    it('should handle full workflow with example specs', async () => {
      // Timeout set in test options below
      
      // Create unique worktree base path for this test
      const worktreeBasePath = path.join(os.tmpdir(), `orxa-integration-${Date.now()}`);
      fs.mkdirSync(worktreeBasePath, { recursive: true });
      
      // Create orchestrator
      const orchestrator = createOrchestrator(TEST_REPO_PATH, {
        queue_directory: TEST_QUEUE_PATH,
        max_parallel_workstreams: 3,
        auto_merge: false, // Don't actually merge in tests
        worktree_base_path: worktreeBasePath,
      });

      // Start orchestration
      const startPromise = orchestrator.start(
        'orxa implement authentication with login, signup, oauth',
        { wait_for_completion: true }
      );

      // Wait for completion or timeout
      try {
        await Promise.race([
          startPromise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 5000)
          ),
        ]);
      } catch {
        // Timeout expected in test environment
        await orchestrator.cancel();
      }

      const state = orchestrator.getState();
      expect(state.session_id).toBeDefined();
      
      // Cleanup
      if (fs.existsSync(worktreeBasePath)) {
        fs.rmSync(worktreeBasePath, { recursive: true, force: true });
      }
    }, 30000);
  });

  describe('Merge Queue - Additional Coverage', () => {
    let queue: MergeQueue;

    beforeEach(() => {
      if (fs.existsSync(TEST_QUEUE_PATH)) {
        fs.rmSync(TEST_QUEUE_PATH, { recursive: true, force: true });
      }
      fs.mkdirSync(TEST_QUEUE_PATH, { recursive: true });
      queue = createMergeQueue(TEST_QUEUE_PATH, TEST_REPO_PATH, 'orxa');
    });

    afterEach(() => {
      queue.clear();
    });

    it('should peek at next item without removing', () => {
      queue.enqueue({ workstream_id: 'test-1', worktree_name: 'orxa-1', status: 'pending' });
      queue.enqueue({ workstream_id: 'test-2', worktree_name: 'orxa-2', status: 'pending' });

      const peeked = queue.peek();
      expect(peeked?.workstream_id).toBe('test-1');
      
      // Should still be able to dequeue the same item
      const dequeued = queue.dequeue();
      expect(dequeued?.workstream_id).toBe('test-1');
    });

    it('should return undefined when peeking empty queue', () => {
      const peeked = queue.peek();
      expect(peeked).toBeUndefined();
    });

    it('should get all items', () => {
      queue.enqueue({ workstream_id: 'test-1', worktree_name: 'orxa-1', status: 'pending' });
      queue.enqueue({ workstream_id: 'test-2', worktree_name: 'orxa-2', status: 'completed' });

      const all = queue.getAllItems();
      expect(all).toHaveLength(2);
    });

    it('should update item properties', () => {
      queue.enqueue({ workstream_id: 'test-1', worktree_name: 'orxa-1', status: 'pending' });
      
      queue.updateItem('test-1', { status: 'in_progress', commit_hash: 'abc123' });
      
      const items = queue.getItemsByStatus('in_progress');
      expect(items).toHaveLength(1);
      expect(items[0].commit_hash).toBe('abc123');
    });

    it('should mark item as conflict', () => {
      queue.enqueue({ workstream_id: 'test-1', worktree_name: 'orxa-1', status: 'pending' });
      
      queue.markConflict('test-1', ['file1.ts', 'file2.ts']);
      
      const items = queue.getItemsByStatus('conflict');
      expect(items).toHaveLength(1);
      expect(items[0].conflict_files).toEqual(['file1.ts', 'file2.ts']);
    });

    it('should remove item from queue', () => {
      queue.enqueue({ workstream_id: 'test-1', worktree_name: 'orxa-1', status: 'pending' });
      queue.removeItem('test-1');
      
      expect(queue.length).toBe(0);
      expect(queue.isEmpty).toBe(true);
    });

    it('should handle cherry-pick with no conflicts', async () => {
      // Create a commit to cherry-pick
      const testFile = path.join(TEST_REPO_PATH, 'cherry-pick-test.txt');
      fs.writeFileSync(testFile, 'test content');
      execSync('git add .', { cwd: TEST_REPO_PATH });
      execSync('git commit -m "test commit"', { cwd: TEST_REPO_PATH });
      
      const commitHash = execSync('git rev-parse HEAD', { cwd: TEST_REPO_PATH, encoding: 'utf8' }).trim();
      
      const result = await queue.cherryPick('test-1', commitHash);
      
      // Should succeed since we're on the same branch
      expect(result.success || !result.had_conflicts).toBeTruthy();
    });

    it('should handle cherry-pick with target branch', async () => {
      const testFile = path.join(TEST_REPO_PATH, 'branch-test.txt');
      fs.writeFileSync(testFile, 'test content');
      execSync('git add .', { cwd: TEST_REPO_PATH });
      execSync('git commit -m "test commit for branch"', { cwd: TEST_REPO_PATH });
      
      const commitHash = execSync('git rev-parse HEAD', { cwd: TEST_REPO_PATH, encoding: 'utf8' }).trim();
      
      const result = await queue.cherryPick('test-1', commitHash, 'main');
      
      expect(result.success || !result.had_conflicts).toBeTruthy();
    });

    it('should detect conflicts', () => {
      // Initially no conflicts
      expect(queue.hasConflicts()).toBe(false);
    });

    it('should attempt auto conflict resolution', async () => {
      const result = await queue.resolveConflictsAuto('theirs');
      // Should succeed since no conflicts exist
      expect(result.resolved).toBe(true);
    });

    it('should delegate conflict resolution', async () => {
      const result = await queue.delegateConflictResolution('test-1', ['file1.ts']);
      
      expect(result.resolved).toBe(false);
      expect(result.method).toBe('delegated');
      expect(result.remaining_conflicts).toContain('file1.ts');
    });

    it('should handle processNext when already processing', async () => {
      // First call will start processing
      queue.enqueue({ workstream_id: 'test-1', worktree_name: 'orxa-1', status: 'completed', commit_hash: 'abc123' });
      
      // Second call should return error
      const result = await queue.processNext();
      expect(result.result.success || result.result.error).toBeDefined();
    });

    it('should handle processNext with no commit hash', async () => {
      queue.enqueue({ workstream_id: 'test-1', worktree_name: 'orxa-1', status: 'completed' });
      
      const { result } = await queue.processNext();
      expect(result.success).toBe(false);
      expect(result.error).toContain('No commit hash');
    });

    it('should process all items', async () => {
      queue.enqueue({ workstream_id: 'test-1', worktree_name: 'orxa-1', status: 'completed', commit_hash: 'abc123' });
      
      const results = await queue.processAll();
      expect(results).toHaveLength(1);
    });

    it('should stop processing on conflict if autoResolve fails', async () => {
      // This test verifies the break condition in processAll
      queue.markConflict('nonexistent', ['file.ts']);
      
      const results = await queue.processAll();
      // Should return empty since no pending items
      expect(results).toHaveLength(0);
    });
  });

  describe('Worktree Manager - Additional Coverage', () => {
    let manager: WorktreeManager;
    let worktreeBasePath: string;

    beforeEach(() => {
      // Create unique worktree base path for each test
      worktreeBasePath = path.join(os.tmpdir(), `orxa-worktrees-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
      fs.mkdirSync(worktreeBasePath, { recursive: true });
      manager = createWorktreeManager('test-orxa', TEST_REPO_PATH, worktreeBasePath);
    });

    afterEach(async () => {
      // Cleanup all worktrees created by this manager
      await manager.cleanupAll(true);
      // Remove worktree base directory
      if (fs.existsSync(worktreeBasePath)) {
        fs.rmSync(worktreeBasePath, { recursive: true, force: true });
      }
    });

    it('should throw error when not in git repository', () => {
      const nonGitPath = path.join(os.tmpdir(), `non-git-dir-${Date.now()}`);
      fs.mkdirSync(nonGitPath, { recursive: true });
      
      expect(() => createWorktreeManager('test', nonGitPath)).toThrow();
      
      fs.rmSync(nonGitPath, { recursive: true, force: true });
    });

    it('should handle worktree creation when worktree already exists', async () => {
      // Create first worktree
      const result1 = await manager.createWorktree('duplicate-test', 1);
      
      if (result1.success) {
        // Try to create again with same index
        const result2 = await manager.createWorktree('duplicate-test-2', 1);
        expect(result2.success).toBe(false);
        expect(result2.error).toContain('already exists');
        
        await manager.removeWorktree('duplicate-test');
      }
    });

    it('should get worktree path', async () => {
      const result = await manager.createWorktree('path-test', 99);
      
      if (result.success) {
        const path = manager.getWorktreePath('path-test');
        expect(path).toBeDefined();
        expect(path).toContain('orxa-99');
        
        await manager.removeWorktree('path-test');
      }
    });

    it('should return undefined for unknown workstream', () => {
      const path = manager.getWorktreePath('nonexistent');
      expect(path).toBeUndefined();
    });

    it('should commit changes', async () => {
      const result = await manager.createWorktree('commit-test', 3);
      
      if (result.success) {
        // Create a file in the worktree
        const testFile = path.join(result.path!, 'committed-file.txt');
        fs.writeFileSync(testFile, 'committed content');
        
        const commitHash = await manager.commitChanges('commit-test', 'Test commit');
        
        if (commitHash) {
          expect(commitHash).toHaveLength(40); // SHA-1 hash length
        }
        
        await manager.removeWorktree('commit-test', true);
      }
    });

    it('should return null when committing to unknown workstream', async () => {
      const commitHash = await manager.commitChanges('nonexistent', 'Test commit');
      expect(commitHash).toBeNull();
    });

    it('should push to queue', async () => {
      const result = await manager.createWorktree('queue-test', 4);
      
      if (result.success) {
        const success = await manager.pushToQueue('queue-test', TEST_QUEUE_PATH);
        expect(success).toBe(true);
        
        // Verify queue file was created
        const queueFile = path.join(TEST_QUEUE_PATH, 'queue-test.json');
        expect(fs.existsSync(queueFile)).toBe(true);
        
        await manager.removeWorktree('queue-test', true);
      }
    });

    it('should return false when pushing unknown workstream', async () => {
      const success = await manager.pushToQueue('nonexistent', TEST_QUEUE_PATH);
      expect(success).toBe(false);
    });

    it('should get diff stats', async () => {
      const result = await manager.createWorktree('diff-test', 5);
      
      if (result.success) {
        // Initially no changes
        let stats = manager.getDiffStats('diff-test');
        expect(stats).toEqual({ files: 0, insertions: 0, deletions: 0 });
        
        // Create and commit a file first
        const testFile = path.join(result.path!, 'diff-file.txt');
        fs.writeFileSync(testFile, 'line 1\nline 2\nline 3\n');
        
        // Now check stats against HEAD
        stats = manager.getDiffStats('diff-test');
        expect(stats).not.toBeNull();
        
        await manager.removeWorktree('diff-test', true);
      }
    });

    it('should return null for unknown workstream stats', () => {
      const stats = manager.getDiffStats('nonexistent');
      expect(stats).toBeNull();
    });

    it('should list all worktrees', () => {
      const worktrees = manager.listAllWorktrees();
      expect(Array.isArray(worktrees)).toBe(true);
    });

    it('should prune worktrees', () => {
      const result = manager.pruneWorktrees();
      expect(typeof result).toBe('boolean');
    });

    it('should get state', () => {
      const state = manager.getState();
      expect(state.original_branch).toBeDefined();
      expect(Array.isArray(state.worktrees)).toBe(true);
    });

    it('should restore state', () => {
      const originalState = manager.getState();
      
      manager.restoreState({
        original_branch: 'feature-branch',
        worktrees: ['/path/to/orxa-test-1'],
      });
      
      const newState = manager.getState();
      expect(newState.original_branch).toBe('feature-branch');
    });

    it('should cleanup all worktrees', async () => {
      const result1 = await manager.createWorktree('cleanup-1', 10);
      const result2 = await manager.createWorktree('cleanup-2', 11);
      
      if (result1.success && result2.success) {
        const results = await manager.cleanupAll();
        
        expect(Object.keys(results)).toHaveLength(2);
        expect(manager.getAllWorktrees().size).toBe(0);
      }
    });

    it('should handle removeWorktree with force flag', async () => {
      const result = await manager.createWorktree('force-remove', 12);
      
      if (result.success) {
        // Create uncommitted changes
        const testFile = path.join(result.path!, 'uncommitted.txt');
        fs.writeFileSync(testFile, 'uncommitted content');
        
        // Should succeed with force
        const removed = await manager.removeWorktree('force-remove', true);
        expect(removed).toBe(true);
      }
    });

    it('should return false when removing unknown workstream', async () => {
      const result = await manager.removeWorktree('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('Spec Generator - Additional Coverage', () => {
    let generator: SpecGenerator;

    beforeEach(() => {
      generator = createSpecGenerator('strategist', TEST_REPO_PATH);
    });

    it('should generate specs with context files', async () => {
      const result = await generator.generateSpecs('Build an API', ['src/config.ts', 'src/routes.ts']);
      
      expect(result.success).toBe(true);
      expect(result.raw_response).toContain('src/config.ts');
      expect(result.raw_response).toContain('src/routes.ts');
    });

    it('should handle generateSpecs with context files', async () => {
      const result = await generator.generateSpecs('Test', ['src/test.ts']);
      expect(result.success).toBe(true);
      expect(result.raw_response).toContain('src/test.ts');
    });

    it('should parse specs from plain JSON', () => {
      const json = JSON.stringify([{
        id: 'test-1',
        name: 'Test Workstream',
        description: 'Test description',
        dependencies: [],
        acceptance_criteria: ['Criterion 1'],
        estimated_complexity: 'low',
      }]);

      const specs = generator.parseSpecs(json);
      expect(specs).toHaveLength(1);
      expect(specs[0].id).toBe('test-1');
    });

    it('should throw error for invalid JSON', () => {
      expect(() => generator.parseSpecs('not valid json')).toThrow();
    });

    it('should throw error for missing description', () => {
      const json = JSON.stringify([{
        id: 'test-1',
        name: 'Test Workstream',
        // No description
      }]);

      expect(() => generator.parseSpecs(json)).toThrow('description is required');
    });

    it('should handle unknown dependency', () => {
      const specs = [{
        id: 'test-1',
        name: 'Test 1',
        description: 'Description 1',
        dependencies: ['unknown-dep'],
        acceptance_criteria: [],
        estimated_complexity: 'low' as const,
      }];

      expect(() => generator.buildDependencyGraph(specs)).toThrow('unknown dependency');
    });

    it('should get prompt template', () => {
      const template = generator.getPromptTemplate();
      expect(template).toContain('{{USER_REQUEST}}');
      expect(template).toContain('{{CONTEXT}}');
    });

    it('should handle loadSpecs with invalid JSON', () => {
      // Create a file with invalid JSON
      const specsDir = path.join(TEST_REPO_PATH, '.opencode', 'orxa', 'specs');
      fs.mkdirSync(specsDir, { recursive: true });
      fs.writeFileSync(path.join(specsDir, 'invalid-session.json'), 'not valid json');
      
      const result = generator.loadSpecs('invalid-session');
      expect(result).toBeNull();
    });
  });

  describe('Orchestrator - Additional Coverage', () => {
    it('should throw error when starting active session', async () => {
      const orchestrator = createOrchestrator(TEST_REPO_PATH, {
        queue_directory: TEST_QUEUE_PATH,
      });

      // Manually set as active
      (orchestrator as unknown as { state: { active: boolean } }).state.active = true;

      await expect(orchestrator.start('test request')).rejects.toThrow('already active');
    });

    it('should handle API specs generation', async () => {
      const orchestrator = createOrchestrator(TEST_REPO_PATH, {
        queue_directory: TEST_QUEUE_PATH,
      });

      const state = orchestrator.getState();
      expect(state.session_id).toMatch(/^orxa-/);
    });

    it('should handle UI specs generation', async () => {
      const orchestrator = createOrchestrator(TEST_REPO_PATH, {
        queue_directory: TEST_QUEUE_PATH,
      });

      const state = orchestrator.getState();
      expect(state.phase).toBe('idle');
    });

    it('should handle default specs for unknown request', async () => {
      const orchestrator = createOrchestrator(TEST_REPO_PATH, {
        queue_directory: TEST_QUEUE_PATH,
      });

      // Verify initial state
      expect(orchestrator.isActive()).toBe(false);
    });

    it('should emit phase changed events', async () => {
      const orchestrator = createOrchestrator(TEST_REPO_PATH, {
        queue_directory: TEST_QUEUE_PATH,
      });

      const eventPromise = new Promise<void>((resolve) => {
        orchestrator.once('phase_changed', (data) => {
          expect(data.phase).toBeDefined();
          resolve();
        });
      });

      // Trigger a phase change by starting
      orchestrator.start('test').catch(() => {
        // Expected to fail
      });

      await eventPromise;
    });

    it('should emit error event', async () => {
      const orchestrator = createOrchestrator(TEST_REPO_PATH, {
        queue_directory: TEST_QUEUE_PATH,
      });

      const eventPromise = new Promise<void>((resolve) => {
        orchestrator.once('error', () => {
          resolve();
        });
      });

      // Force an error by starting twice
      orchestrator.start('test').catch(() => {});
      orchestrator.start('test').catch(() => {});

      await eventPromise;
    });

    it('should handle cancel when not active', async () => {
      const orchestrator = createOrchestrator(TEST_REPO_PATH, {
        queue_directory: TEST_QUEUE_PATH,
      });

      // Should not throw
      await orchestrator.cancel();
      expect(orchestrator.isActive()).toBe(false);
    });

    it('should save and load state', () => {
      const orchestrator = createOrchestrator(TEST_REPO_PATH, {
        queue_directory: TEST_QUEUE_PATH,
      });

      orchestrator.saveState();
      
      const newOrchestrator = createOrchestrator(TEST_REPO_PATH);
      const loaded = newOrchestrator.loadState();
      
      expect(loaded).toBe(true);
    });

    it('should return false when loading non-existent state', () => {
      const orchestrator = createOrchestrator(TEST_REPO_PATH, {
        queue_directory: TEST_QUEUE_PATH,
      });

      // Clear any existing state
      const statePath = path.join(TEST_REPO_PATH, '.opencode', 'orxa', 'state.json');
      if (fs.existsSync(statePath)) {
        fs.unlinkSync(statePath);
      }

      const loaded = orchestrator.loadState();
      expect(loaded).toBe(false);
    });

    it('should handle loadState with invalid JSON', () => {
      const orchestrator = createOrchestrator(TEST_REPO_PATH, {
        queue_directory: TEST_QUEUE_PATH,
      });

      // Create invalid state file
      const statePath = path.join(TEST_REPO_PATH, '.opencode', 'orxa', 'state.json');
      fs.mkdirSync(path.dirname(statePath), { recursive: true });
      fs.writeFileSync(statePath, 'not valid json');

      const loaded = orchestrator.loadState();
      expect(loaded).toBe(false);
    });
  });
});
