/**
 * Spec Generator for Orxa Orchestration
 * 
 * Breaks down complex tasks into parallel workstream specifications using
 * the strategist agent. Generates JSON specs with dependency graphs.
 */

import fs from 'fs';
import path from 'path';
import type { 
  WorkstreamSpec, 
  SpecGenerationResult, 
  DependencyGraph 
} from './types';

/**
 * Default system prompt for the strategist agent when generating specs.
 */
const SPEC_GENERATOR_SYSTEM_PROMPT = `You are an expert software architect and task decomposition specialist.

Your role is to analyze complex development tasks and break them into parallel, independent workstreams that can be executed simultaneously by different agents.

RULES:
1. Identify natural boundaries for parallelization (e.g., separate features, independent components)
2. Define clear dependencies between workstreams
3. Provide specific acceptance criteria for each workstream
4. Estimate complexity (low/medium/high) for resource allocation
5. List relevant context files that agents should read
6. Maximum 10 workstreams per task - if more needed, suggest sequential batches

OUTPUT FORMAT:
Return ONLY a JSON array of workstream specifications:

[
  {
    "id": "unique-workstream-id",
    "name": "Human-readable name",
    "description": "Detailed description of what to implement",
    "dependencies": ["ids-of-prerequisites"],
    "acceptance_criteria": ["Specific, testable criteria"],
    "estimated_complexity": "low|medium|high",
    "context_files": ["paths/to/relevant/files"],
    "timeout_minutes": 60,
    "recommended_agent": "build|coder|frontend|architect|etc"
  }
]

GUIDELINES:
- Workstreams should be as independent as possible
- Dependencies should form a DAG (no circular dependencies)
- Each workstream should produce a testable, reviewable output
- Include setup/teardown workstreams if needed
- Consider the "definition of done" for each workstream`;

/**
 * Prompt template for spec generation.
 */
const SPEC_GENERATION_PROMPT_TEMPLATE = `Analyze the following task and break it into parallel workstreams.

USER REQUEST: {{USER_REQUEST}}

{{CONTEXT}}

Generate workstream specifications that can be executed in parallel where possible.
Consider:
- Which parts are truly independent?
- What are the natural integration points?
- Which workstreams should be done first to unblock others?

Return ONLY the JSON array. No markdown, no explanations.`;

/**
 * Generates workstream specifications from a user request.
 */
export class SpecGenerator {
  private specsDir: string;

  constructor(
    private readonly strategistAgent: string = 'strategist',
    projectRoot: string = process.cwd()
  ) {
    this.specsDir = path.join(projectRoot, '.opencode', 'orxa', 'specs');
  }

  /**
   * Generate workstream specs from a user request.
   * 
   * @param userRequest - The original user request
   * @param contextFiles - Optional context files to include
   * @returns Generation result with workstream specs
   */
  async generateSpecs(
    userRequest: string,
    contextFiles?: string[]
  ): Promise<SpecGenerationResult> {
    try {
      // Build the prompt
      const context = contextFiles && contextFiles.length > 0
        ? `CONTEXT FILES:\n${contextFiles.map(f => `- ${f}`).join('\n')}`
        : '';

      const prompt = SPEC_GENERATION_PROMPT_TEMPLATE
        .replace('{{USER_REQUEST}}', userRequest)
        .replace('{{CONTEXT}}', context);

      // In a real implementation, this would delegate to the strategist agent
      // For now, we'll parse and validate the expected format
      // The actual delegation would be done by the orchestrator
      
      return {
        success: true,
        workstreams: [], // Would be populated by strategist response
        raw_response: prompt, // Placeholder
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Parse workstream specs from a strategist response.
   * 
   * @param response - The raw response from the strategist
   * @returns Parsed workstream specs
   */
  parseSpecs(response: string): WorkstreamSpec[] {
    try {
      // Extract JSON from the response (handle markdown code blocks)
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/) || 
                        response.match(/(\[[\s\S]*\])/);
      
      const jsonStr = jsonMatch ? jsonMatch[1] : response;
      const specs: WorkstreamSpec[] = JSON.parse(jsonStr);

      // Validate each spec
      return specs.map((spec, index) => this.validateAndNormalizeSpec(spec, index));
    } catch (error) {
      throw new Error(`Failed to parse workstream specs: ${error instanceof Error ? error.message : 'Invalid JSON'}`);
    }
  }

  /**
   * Validate and normalize a workstream spec.
   */
  private validateAndNormalizeSpec(spec: Partial<WorkstreamSpec>, index: number): WorkstreamSpec {
    if (!spec.id) {
      spec.id = `workstream-${index + 1}`;
    }

    if (!spec.name) {
      spec.name = `Workstream ${index + 1}`;
    }

    if (!spec.description) {
      throw new Error(`Workstream ${spec.id}: description is required`);
    }

    return {
      id: spec.id,
      name: spec.name,
      description: spec.description,
      dependencies: spec.dependencies || [],
      acceptance_criteria: spec.acceptance_criteria || [],
      estimated_complexity: spec.estimated_complexity || 'medium',
      context_files: spec.context_files || [],
      timeout_minutes: spec.timeout_minutes || 60,
      recommended_agent: spec.recommended_agent || 'coder',
    };
  }

  /**
   * Save workstream specs to disk.
   * 
   * @param sessionId - The Orxa session ID
   * @param specs - The workstream specs to save
   */
  saveSpecs(sessionId: string, specs: WorkstreamSpec[]): void {
    // Ensure directory exists
    if (!fs.existsSync(this.specsDir)) {
      fs.mkdirSync(this.specsDir, { recursive: true });
    }

    const filePath = path.join(this.specsDir, `${sessionId}.json`);
    const data = {
      session_id: sessionId,
      created_at: new Date().toISOString(),
      workstreams: specs,
    };

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }

  /**
   * Load workstream specs from disk.
   * 
   * @param sessionId - The Orxa session ID
   * @returns The loaded specs or null
   */
  loadSpecs(sessionId: string): { session_id: string; created_at: string; workstreams: WorkstreamSpec[] } | null {
    const filePath = path.join(this.specsDir, `${sessionId}.json`);
    
    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return data;
    } catch {
      return null;
    }
  }

  /**
   * Build a dependency graph from workstream specs.
   * 
   * @param specs - The workstream specs
   * @returns Dependency graph
   */
  buildDependencyGraph(specs: WorkstreamSpec[]): DependencyGraph {
    const dependencies = new Map<string, Set<string>>();
    const dependents = new Map<string, Set<string>>();
    const allIds = new Set(specs.map(s => s.id));

    // Initialize maps
    for (const spec of specs) {
      dependencies.set(spec.id, new Set(spec.dependencies));
      dependents.set(spec.id, new Set());
    }

    // Build dependents map
    for (const spec of specs) {
      for (const dep of spec.dependencies) {
        if (!allIds.has(dep)) {
          throw new Error(`Workstream ${spec.id} has unknown dependency: ${dep}`);
        }
        dependents.get(dep)!.add(spec.id);
      }
    }

    // Detect cycles
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (id: string): boolean => {
      visited.add(id);
      recursionStack.add(id);

      for (const dep of dependencies.get(id) || []) {
        if (!visited.has(dep)) {
          if (hasCycle(dep)) return true;
        } else if (recursionStack.has(dep)) {
          return true;
        }
      }

      recursionStack.delete(id);
      return false;
    };

    for (const id of allIds) {
      if (!visited.has(id)) {
        if (hasCycle(id)) {
          throw new Error(`Circular dependency detected involving workstream: ${id}`);
        }
      }
    }

    // Topological sort
    const inDegree = new Map<string, number>();
    for (const id of allIds) {
      inDegree.set(id, dependencies.get(id)!.size);
    }

    const queue: string[] = [];
    for (const [id, degree] of inDegree) {
      if (degree === 0) {
        queue.push(id);
      }
    }

    const topologicalOrder: string[] = [];
    while (queue.length > 0) {
      const id = queue.shift()!;
      topologicalOrder.push(id);

      for (const dependent of dependents.get(id) || []) {
        const newDegree = inDegree.get(dependent)! - 1;
        inDegree.set(dependent, newDegree);
        if (newDegree === 0) {
          queue.push(dependent);
        }
      }
    }

    // Find root workstreams (no dependencies)
    const roots = specs
      .filter(s => s.dependencies.length === 0)
      .map(s => s.id);

    return {
      dependencies,
      dependents,
      roots,
      topological_order: topologicalOrder,
    };
  }

  /**
   * Get workstreams that are ready to execute (all dependencies met).
   * 
   * @param specs - All workstream specs
   * @param completed - IDs of completed workstreams
   * @returns IDs of workstreams ready to execute
   */
  getReadyWorkstreams(specs: WorkstreamSpec[], completed: string[]): string[] {
    const completedSet = new Set(completed);
    
    return specs
      .filter(spec => {
        // Not already completed
        if (completedSet.has(spec.id)) {
          return false;
        }
        // All dependencies met
        return spec.dependencies.every(dep => completedSet.has(dep));
      })
      .map(spec => spec.id);
  }

  /**
   * Get the system prompt for spec generation.
   */
  getSystemPrompt(): string {
    return SPEC_GENERATOR_SYSTEM_PROMPT;
  }

  /**
   * Get the prompt template for spec generation.
   */
  getPromptTemplate(): string {
    return SPEC_GENERATION_PROMPT_TEMPLATE;
  }
}

/**
 * Create a spec generator instance.
 */
export function createSpecGenerator(
  strategistAgent?: string,
  projectRoot?: string
): SpecGenerator {
  return new SpecGenerator(strategistAgent, projectRoot);
}

/**
 * Example workstream specs for testing.
 */
export const EXAMPLE_WORKSTREAM_SPECS: WorkstreamSpec[] = [
  {
    id: 'auth-login',
    name: 'Implement Login Feature',
    description: 'Create login endpoint with email/password validation, JWT token generation, and session management',
    dependencies: [],
    acceptance_criteria: [
      'POST /api/auth/login endpoint exists',
      'Validates email format and password strength',
      'Returns JWT token on success',
      'Returns 401 for invalid credentials',
      'Rate limiting implemented',
    ],
    estimated_complexity: 'medium',
    context_files: ['src/config/auth.ts', 'src/models/user.ts'],
    timeout_minutes: 90,
    recommended_agent: 'build',
  },
  {
    id: 'auth-signup',
    name: 'Implement Signup Feature',
    description: 'Create user registration endpoint with email verification and password hashing',
    dependencies: [],
    acceptance_criteria: [
      'POST /api/auth/signup endpoint exists',
      'Validates email uniqueness',
      'Hashes passwords with bcrypt',
      'Sends verification email',
      'Returns user object without password',
    ],
    estimated_complexity: 'medium',
    context_files: ['src/config/auth.ts', 'src/models/user.ts'],
    timeout_minutes: 90,
    recommended_agent: 'build',
  },
  {
    id: 'auth-oauth',
    name: 'Implement OAuth Integration',
    description: 'Add OAuth 2.0 support for Google and GitHub authentication',
    dependencies: ['auth-login'],
    acceptance_criteria: [
      'Google OAuth flow implemented',
      'GitHub OAuth flow implemented',
      'Links OAuth accounts to existing users',
      'Creates new users for first-time OAuth',
      'Handles OAuth errors gracefully',
    ],
    estimated_complexity: 'high',
    context_files: ['src/config/auth.ts', 'src/models/user.ts', 'src/services/oauth.ts'],
    timeout_minutes: 120,
    recommended_agent: 'architect',
  },
];
