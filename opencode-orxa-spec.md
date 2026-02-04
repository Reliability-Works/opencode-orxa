# OpenCode Orxa Plugin - Specification

## Overview

Build an OpenCode plugin that enforces strict Orxa/Manager patterns for AI-assisted software development. The plugin acts as a governance layer between the user, the Orxa agent, and all subagents.

## Core Philosophy

**The Orxa is a Manager, not a Doer.**

- Delegates ALL work to specialized subagents
- Maintains project state via TODO lists
- Manages long-term memory via SuperMemory
- Enforces quality gates before marking work complete

## Plugin Architecture

```
User → OpenCode → Orxa Plugin → Orxa Agent → Subagents
                    ↓
             Middleware Layer (enforcement)
                    ↓
          Tool Interception & Validation
```

### Enforcement Layers

- **Tool alias resolver**: Normalizes runtime tool names to canonical names
- **Delegation gate**: Only Orxa can call `delegate_task` (or its aliases)
- **Plan-write gate**: Edit/write tools allowed only for `.orxa/plans/*.md`
- **Orxa tool gate**: Orxa’s allowed tool list is strictly enforced
- **Mobile tool block**: Orxa cannot use `agent-device` tools directly
- **Delegation template validator**: 6-section delegation prompt required
- **Multimodal batch limit**: Blocks delegations with >10 images
- **Session continuity**: Re-delegations must reuse the same `session_id`
- **Context hygiene**: Large tool outputs require summarization before delegation
- **QA gate**: `lsp_diagnostics` is required before TODO completion

## Directory Structure

```
opencode-orxa/
├── plugin.yaml                    # Plugin manifest
├── src/
│   ├── index.ts                   # Main entry point
│   ├── config/
│   │   ├── default-config.ts      # Default configuration
│   │   └── schema.ts              # Config validation schema
│   ├── middleware/
│   │   ├── delegation-enforcer.ts # Blocks manual tool usage
│   │   ├── todo-guardian.ts       # Enforces TODO completion
│   │   ├── memory-automation.ts   # Auto-extracts & saves memories
│   │   └── quality-gates.ts       # Pre-completion validation
│   ├── agents/
│   │   ├── orxa.ts           # Orxa agent definition
│   │   └── subagents/
│   │       ├── coder.ts           # Code specialist
│   │       ├── plan.ts            # Planning/search specialist
│   │       ├── explorer.ts        # Search/Research specialist
│   │       ├── build.ts           # Complex engineering
│   │       ├── architect.ts       # Architecture/debugging
│   │       ├── frontend.ts        # UI/UX specialist
│   │       ├── git.ts             # Git operations
│   │       ├── writer.ts          # Documentation
│   │       ├── librarian.ts       # Research
│   │       ├── navigator.ts       # Web browsing
│   │       ├── mobile-simulator.ts # iOS/Android testing
│   │       └── multimodal.ts      # Image/PDF analysis
│   ├── hooks/
│   │   ├── pre-tool-execution.ts
│   │   ├── post-subagent-response.ts
│   │   ├── pre-todo-completion.ts
│   │   └── session-checkpoint.ts
│   └── utils/
│       ├── drift-detector.ts      # Tracks manual vs delegated work
│       ├── session-memory.ts      # Auto-summarization
│       └── validation.ts          # Output validators
├── agents/                        # User-customizable agent definitions
│   ├── SUBAGENTS.md              # Override instructions
│   └── custom/                   # User-defined subagents
└── tests/
    └── *.test.ts
```

## Configuration Schema

```typescript
interface OrxaConfig {
  // Enforcement Levels
  enforcement: {
    delegation: "strict" | "warn" | "off"; // Block manual edits?
    todoCompletion: "strict" | "warn" | "off"; // Force TODO completion?
    qualityGates: "strict" | "warn" | "off"; // Require validation?
    memoryAutomation: "strict" | "warn" | "off"; // Auto-save memories?
  };

  // Tool Aliases
  toolAliases: {
    // alias -> canonical tool name
    resolve: Record<string, string>;
  };

  // Orxa Constraints
  orxa: {
    allowedTools: string[]; // Tools Orxa CAN use directly
    blockedTools: string[]; // Tools that MUST be delegated
    maxManualEditsPerSession: number; // Drift threshold
    requireTodoList: boolean; // Must maintain TODOs?
    autoUpdateTodos: boolean; // Auto-mark complete on validation?
    planWriteAllowlist: string[]; // Glob allowlist for edit/write tools
    blockMobileTools: boolean; // Block mobile automation tools
  };

  // Governance
  governance: {
    onlyOrxaCanDelegate: boolean;
    blockSupermemoryAddForSubagents: boolean;
    delegationTemplate: {
      required: boolean;
      requiredSections: string[]; // 6-section delegation template
      maxImages: number;
      requireSameSessionId: boolean;
      contextHygiene: {
        maxToolOutputChars: number;
        summaryHeader: string; // e.g., "Summary"
        requireSummary: boolean;
      };
    };
  };

  // Subagent Configuration
  subagents: {
    defaults: {
      model: string; // Default model for all subagents
      timeout: number; // Default timeout ms
      maxRetries: number; // Auto-retry count
    };
    overrides: Record<
      string,
      {
        // Per-subagent overrides
        model?: string;
        timeout?: number;
        maxRetries?: number;
        customInstructions?: string;
      }
    >;
    custom: Array<{
      // User-defined subagents
      name: string;
      description: string;
      model: string;
      instructions: string;
      allowedTools: string[];
    }>;
  };

  // Memory Configuration
  memory: {
    autoExtract: boolean; // Auto-extract from subagent responses?
    extractPatterns: string[]; // Regex patterns for key info
    requiredTypes: string[]; // Must save these memory types
    sessionCheckpointInterval: number; // Messages between checkpoints
  };

  // Quality Gates
  qualityGates: {
    requireLint: boolean;
    requireTypeCheck: boolean;
    requireTests: boolean;
    requireBuild: boolean;
    requireLspDiagnostics: boolean;
    customValidators: Array<{
      name: string;
      command: string;
      required: boolean;
    }>;
  };

  // Escalation Rules
  escalation: {
    enabled: boolean;
    maxAttemptsPerAgent: number;
    escalationMatrix: Record<string, string>; // coder -> build, etc.
    requireExplicitHandoff: boolean;
  };

  // UI/UX
  ui: {
    showDelegationWarnings: boolean;
    showTodoReminders: boolean;
    showMemoryConfirmations: boolean;
    verboseLogging: boolean;
  };
}

// Default Configuration
export const defaultConfig: OrxaConfig = {
  enforcement: {
    delegation: "strict",
    todoCompletion: "strict",
    qualityGates: "strict",
    memoryAutomation: "strict",
  },
  toolAliases: {
    resolve: {
      apply_patch: "edit",
      write_to_file: "write",
      replace_file_content: "write",
      multi_replace_file_content: "write",
      task: "delegate_task",
    },
  },
  orxa: {
    allowedTools: [
      "read",
      "delegate_task",
      "todowrite",
      "todoread",
      "supermemory",
      "edit",
      "write",
    ],
    blockedTools: ["grep", "glob", "bash", "skill"],
    maxManualEditsPerSession: 0,
    requireTodoList: true,
    autoUpdateTodos: false, // Orxa must explicitly mark done
    planWriteAllowlist: [".orxa/plans/*.md"],
    blockMobileTools: true,
  },
  governance: {
    onlyOrxaCanDelegate: true,
    blockSupermemoryAddForSubagents: true,
    delegationTemplate: {
      required: true,
      requiredSections: [
        "Task",
        "Expected Outcome",
        "Required Tools",
        "Must Do",
        "Must Not Do",
        "Context",
      ],
      maxImages: 10,
      requireSameSessionId: true,
      contextHygiene: {
        maxToolOutputChars: 4000,
        summaryHeader: "Summary",
        requireSummary: true,
      },
    },
  },
  subagents: {
    defaults: {
      model: "opencode/kimi-k2.5",
      timeout: 120000,
      maxRetries: 2,
    },
    overrides: {
      build: {
        model: "openai/gpt-5.2-codex",
        timeout: 300000,
      },
      architect: {
        model: "openai/gpt-5.2-codex",
        timeout: 300000,
      },
      frontend: {
        model: "opencode/gemini-3-pro",
      },
      multimodal: {
        model: "opencode/gemini-3-pro",
      },
    },
    custom: [],
  },
  memory: {
    autoExtract: true,
    extractPatterns: [
      "bug.*fix",
      "solution.*",
      "decided.*",
      "pattern.*",
      "config.*",
    ],
    requiredTypes: [
      "error-solution",
      "learned-pattern",
      "project-config",
      "architecture",
    ],
    sessionCheckpointInterval: 20,
  },
  qualityGates: {
    requireLint: true,
    requireTypeCheck: true,
    requireTests: true,
    requireBuild: true,
    requireLspDiagnostics: true,
    customValidators: [],
  },
  escalation: {
    enabled: true,
    maxAttemptsPerAgent: 2,
    escalationMatrix: {
      coder: "build",
      build: "architect",
      explorer: "librarian",
    },
    requireExplicitHandoff: true,
  },
  ui: {
    showDelegationWarnings: true,
    showTodoReminders: true,
    showMemoryConfirmations: true,
    verboseLogging: true,
  },
};
```

## Tool Alias Configuration

Runtime tool names may differ across OpenCode integrations. The plugin resolves
aliases to canonical names before enforcement.

```typescript
// alias -> canonical tool name
toolAliases: {
  resolve: {
    apply_patch: "edit",
    write_to_file: "write",
    replace_file_content: "write",
    multi_replace_file_content: "write",
    task: "delegate_task",
  },
}
```

**Behavior**
- Aliases are resolved prior to any allow/deny checks.
- Policy decisions must use the canonical tool name.

## Per-Agent Tool Restrictions

- **Only Orxa can delegate**: All `delegate_task` calls (and aliases) are blocked for subagents.
- **Memory writes are Orxa-only**: Subagents are blocked from `supermemory add`.
- **Memory Recommendations**: Subagents must provide a “Memory Recommendation” section instead of writing memories.
- **Plan-only writes (Orxa)**: Orxa can only edit/write files matching `.orxa/plans/*.md`.
- **No grep/glob for Orxa**: All search must be delegated to the Plan agent.

## Delegation Structure Enforcement

All Orxa delegations must follow the 6-section template. Missing sections are blocked.

```
## Task
<what to do>

## Expected Outcome
<deliverables>

## Required Tools
<tools needed>

## Must Do
<mandatory steps>

## Must Not Do
<prohibited actions>

## Context
<relevant context, with summaries of large tool outputs>
```

Additional gates:
- **Max 10 images** per delegation
- **Same `session_id`** required for re-delegations
- **Large tool output** must include a `Summary` section before delegation

## Hook Implementations

### 1. Pre-Tool Execution Hook

```typescript
// src/hooks/pre-tool-execution.ts
export const preToolExecution = async (context: HookContext) => {
  const { tool, args, agent, config, session } = context;
  const toolName = resolveToolAlias(tool.name, config.toolAliases.resolve);

  // BLOCK: Only Orxa can delegate
  if (
    config.governance.onlyOrxaCanDelegate &&
    toolName === "delegate_task" &&
    agent !== "orxa"
  ) {
    return {
      block: true,
      message: `🛑 DELEGATION VIOLATION: Only Orxa can use delegate_task.`,
    };
  }

  // BLOCK: Subagents cannot write memories
  if (
    config.governance.blockSupermemoryAddForSubagents &&
    toolName === "supermemory" &&
    args?.mode === "add" &&
    agent !== "orxa"
  ) {
    return {
      block: true,
      message: `🛑 MEMORY VIOLATION: Subagents cannot use supermemory add. Provide Memory Recommendations instead.`,
    };
  }

  // BLOCK: Orxa trying to use blocked tools
  if (
    agent === "orxa" &&
    config.orxa.blockedTools.includes(toolName)
  ) {
    return {
      block: true,
      message:
        `🛑 DELEGATION VIOLATION: Orxa cannot use '${toolName}'.\n\n` +
        `Delegate to appropriate subagent:\n` +
        `- edit/write → @coder\n` +
        `- git operations → @git\n` +
        `- complex engineering → @build\n` +
        `- UI/UX → @frontend\n` +
        `- plan/search (grep/glob) → @plan`,
      suggestion: {
        action: "delegate_task",
        agent: getRecommendedAgent(toolName),
      },
    };
  }

  // BLOCK: Orxa using tools outside allowlist
  if (agent === "orxa" && !config.orxa.allowedTools.includes(toolName)) {
    return {
      block: true,
      message: `🛑 TOOL VIOLATION: Orxa cannot use '${toolName}'. Delegate this task instead.`,
    };
  }

  // BLOCK: Orxa using agent-device tools
  if (agent === "orxa" && config.orxa.blockMobileTools) {
    if (toolName.startsWith("agent-device")) {
      return {
        block: true,
        message: `🛑 MOBILE VIOLATION: Orxa cannot use agent-device tools. Delegate to @mobile-simulator.`,
      };
    }
  }

  // BLOCK: Orxa can only edit/write plan files
  if (agent === "orxa" && isWriteTool(toolName)) {
    const targets = extractWriteTargets(toolName, args);
    const invalidTargets = targets.filter(
      (path) => !matchesAnyGlob(path, config.orxa.planWriteAllowlist),
    );
    if (invalidTargets.length > 0) {
      return {
        block: true,
        message:
          `🛑 PLAN WRITE VIOLATION: Orxa may only write to plan files.` +
          `\nAllowed: ${config.orxa.planWriteAllowlist.join(", ")}` +
          `\nBlocked: ${invalidTargets.join(", ")}`,
      };
    }
  }

  // BLOCK: Delegation template enforcement
  if (toolName === "delegate_task" && config.governance.delegationTemplate.required) {
    const prompt = args?.prompt || "";
    const missingSections = config.governance.delegationTemplate.requiredSections.filter(
      (section) =>
        !prompt.includes(`## ${section}`) && !prompt.includes(`${section}:`),
    );

    if (missingSections.length > 0) {
      return {
        block: true,
        message:
          `🛑 DELEGATION TEMPLATE VIOLATION: Missing sections: ` +
          `${missingSections.join(", ")}.`,
      };
    }

    const imageCount = args?.images?.length || 0;
    if (imageCount > config.governance.delegationTemplate.maxImages) {
      return {
        block: true,
        message: `🛑 MULTIMODAL LIMIT: ${imageCount} images exceeds max of ${config.governance.delegationTemplate.maxImages}.`,
      };
    }

    if (config.governance.delegationTemplate.requireSameSessionId) {
      const previousSessionId = session.delegationSessionIds?.[args?.agent];
      if (previousSessionId && args?.session_id && args.session_id !== previousSessionId) {
        return {
          block: true,
          message: `🛑 SESSION VIOLATION: Re-delegation must use same session_id (${previousSessionId}).`,
        };
      }
    }

    if (config.governance.delegationTemplate.contextHygiene.requireSummary) {
      const context = args?.context || "";
      const maxChars = config.governance.delegationTemplate.contextHygiene.maxToolOutputChars;
      if (context.length > maxChars) {
        const summaryHeader = config.governance.delegationTemplate.contextHygiene.summaryHeader;
        const hasSummary = context.includes(`${summaryHeader}:`) || context.includes(`## ${summaryHeader}`);
        if (!hasSummary) {
          return {
            block: true,
            message:
              `🛑 CONTEXT HYGIENE: Large tool output requires a '${summaryHeader}' section before delegation.`,
          };
        }
      }
    }
  }

  // CHECK: Pending todos
  if (config.orxa.requireTodoList && session.todos?.length > 0) {
    const pendingTodos = session.todos.filter(
      (t) => t.status === "pending" || t.status === "in_progress",
    );
    if (pendingTodos.length > 0) {
      return {
        warn: true,
        message:
          `📋 You have ${pendingTodos.length} pending TODOs:\n` +
          pendingTodos.map((t) => `  - [${t.status}] ${t.content}`).join("\n") +
          `\n\nComplete these before starting new work.`,
      };
    }
  }

  // CHECK: Drift detection
  const driftScore = session.stats?.manualEdits || 0;
  if (driftScore > config.orxa.maxManualEditsPerSession) {
    return {
      warn: true,
      message: `⚠️  DRIFT DETECTED: ${driftScore} manual edits. You are the Orxa - DELEGATE!`,
    };
  }

  return { allow: true };
};
```

### 2. Post-Subagent Response Hook

```typescript
// src/hooks/post-subagent-response.ts
export const postSubagentResponse = async (context: HookContext) => {
  const { response, agent, config, session } = context;

  // Auto-extract memories
  if (config.memory.autoExtract) {
    const memories = extractMemories(response, config.memory.extractPatterns);
    for (const memory of memories) {
      await context.supermemory.add({
        content: memory.content,
        type: memory.type,
        scope: "project",
      });

      if (config.ui.showMemoryConfirmations) {
        context.notify(`💾 Auto-saved memory: ${memory.type}`);
      }
    }
  }

  // Check for failures
  const failureIndicators = [
    "failed",
    "stuck",
    "error",
    "cannot",
    "unable",
    "giving up",
  ];
  const hasFailed = failureIndicators.some((indicator) =>
    response.toLowerCase().includes(indicator),
  );

  if (hasFailed) {
    const attempts = (session.agentAttempts?.[agent] || 0) + 1;
    session.agentAttempts = { ...session.agentAttempts, [agent]: attempts };

    if (attempts >= config.escalation.maxAttemptsPerAgent) {
      const escalateTo = config.escalation.escalationMatrix[agent];
      if (escalateTo) {
        return {
          escalate: true,
          to: escalateTo,
          message: `🔄 ${agent} failed ${attempts} times. Escalating to @${escalateTo}.`,
          context: `Previous ${agent} attempts failed. Context: ${response.slice(0, 500)}...`,
        };
      }
    }
  }

  return { continue: true };
};
```

### 3. Pre-TODO Completion Hook

```typescript
// src/hooks/pre-todo-completion.ts
export const preTodoCompletion = async (context: HookContext) => {
  const { todo, config, session } = context;

  if (config.qualityGates.requireLint) {
    const lintResult = await context.runCommand("npm run lint");
    if (!lintResult.success) {
      return {
        block: config.enforcement.qualityGates === "strict",
        message: `❌ Quality Gate Failed: Lint errors found.\n${lintResult.output}`,
      };
    }
  }

  if (config.qualityGates.requireTypeCheck) {
    const typeResult = await context.runCommand("npx tsc --noEmit");
    if (!typeResult.success) {
      return {
        block: config.enforcement.qualityGates === "strict",
        message: `❌ Quality Gate Failed: TypeScript errors.\n${typeResult.output}`,
      };
    }
  }

  if (config.qualityGates.requireLspDiagnostics) {
    const lspResult = await context.runCommand("lsp_diagnostics");
    if (!lspResult.success) {
      return {
        block: config.enforcement.qualityGates === "strict",
        message: `❌ Quality Gate Failed: LSP diagnostics errors.\n${lspResult.output}`,
      };
    }
  }

  // Custom validators
  for (const validator of config.qualityGates.customValidators) {
    const result = await context.runCommand(validator.command);
    if (!result.success && validator.required) {
      return {
        block: true,
        message: `❌ Quality Gate Failed: ${validator.name}\n${result.output}`,
      };
    }
  }

  return { allow: true };
};
```

### 4. Session Checkpoint Hook

```typescript
// src/hooks/session-checkpoint.ts
export const sessionCheckpoint = async (context: HookContext) => {
  const { session, config } = context;

  if (session.messageCount % config.memory.sessionCheckpointInterval === 0) {
    // Auto-summarize session
    const summary = await context.summarizeSession(session.recentMessages);

    await context.supermemory.add({
      content: summary,
      type: "conversation",
      scope: "session",
      metadata: {
        messageCount: session.messageCount,
        timestamp: Date.now(),
      },
    });

    // Inject reminder
    return {
      injectMessage:
        `🎯 SESSION CHECKPOINT #${session.messageCount}\n\n` +
        `Remember: You are the Orxa.\n` +
        `- Delegate ALL work to subagents\n` +
        `- Maintain TODO list\n` +
        `- Run quality gates before marking complete\n\n` +
        `Recent summary: ${summary.slice(0, 200)}...`,
    };
  }

  return {};
};
```

## Agent Definitions

### Orxa Agent (plugin-enforced)

```yaml
# agents/orxa.yaml
name: orxa
description: Workforce Orchestrator (Eng Manager). Manages TODOs, delegates work, verifies completion.
mode: primary
model: opencode/kimi-k2.5
system_prompt: |
  You are the Engineering Manager. You do NOT write code. You manage the execution of the Work Plan.

  ## Core Rules (ENFORCED BY PLUGIN)
  1. NEVER write code or edit files outside .orxa/plans/*.md
  2. ALWAYS delegate to subagents using delegate_task
  3. Maintain TODO list obsessively - update status in real-time
  4. Run quality gates before marking any TODO complete
  5. Save important context to supermemory automatically
  6. Only write plan files in .orxa/plans/*.md
  7. Do NOT use grep/glob or mobile automation tools

  ## Bias for Action
  - Manager Identity Check: If you are about to write code, STOP and delegate.
  - Verifying over babysitting: do the next step and verify yourself.

  ## QA Gating (Safety Gate)
  - Zero LSP policy: run project diagnostics (e.g., npm run lint or lsp_diagnostics) before marking TODOs complete.
  - Build verification: if a build step exists, run it.
  - Functional check: run tests or curl scripts when applicable.

  ## Escalation Management
  - Analyze handbacks; do NOT blindly re-delegate to the same agent.
  - Escalate coder failures to build/architect for complex issues.
  - Mobile unblocking: if @mobile-simulator is stuck, summon @explorer/@navigator for precise UI path and re-delegate.
  - Always pass prior attempts, failed commands, and logs.

  ## Delegation Matrix
  | Task Type | Subagent |
  |-----------|----------|
  | Code changes | @coder |
  | Complex engineering | @build |
  | Architecture/debugging | @architect |
  | UI/UX/Frontend | @frontend |
  | Git operations | @git |
  | Plan/search (grep/glob) | @plan |
  | Codebase exploration | @explorer |
  | Research | @librarian |
  | Web browsing | @navigator |
  | Mobile testing | @mobile-simulator |
  | Image/PDF analysis | @multimodal |
  | Documentation | @writer |

  ## Session Continuity
  - Use same session_id when re-delegating to the same agent.
  - Pass full context between related subagent calls.
  - Summarize findings before moving to the next task.

  ## Quality Gates (MUST PASS)
  Before marking TODO complete:
  - [ ] Lint passes
  - [ ] TypeScript check passes
  - [ ] LSP diagnostics pass
  - [ ] Tests pass (if applicable)
  - [ ] Build succeeds (if applicable)

  ## Memory Protocol
  - You are the sole agent allowed to use supermemory add.
  - Auto-save: project setup, bug fixes, configs, patterns, and user preferences.
  - Search supermemory before starting new tasks.

  ## Operational Rules
  - No manual edits: delegate all file changes.
  - Mobile tasks must go to @mobile-simulator.
  - NEVER delegate more than 10 images to @multimodal in one request.
  - Use the 6-section delegation template for every delegate_task call.

tools:
  allowed:
    - read
    - delegate_task
    - todowrite
    - todoread
    - supermemory
    - edit # plan files only (.orxa/plans/*.md)
    - write # plan files only (.orxa/plans/*.md)
  blocked:
    - grep
    - glob
    - bash
    - agent-device
```

### Subagent Definitions

```yaml
# agents/plan.yaml
name: plan
description: Strategic Planning Consultant (Product Manager). Interviews the user and generates master work plans.
mode: primary
model: opencode/gpt-5.2-codex
system_prompt: |
  You are the Product Manager/Strategist. Your goal is to design a perfect work plan before any code is written.

  ## Phase 0: Intent Gate
  Classify the user's intent: Trivial/Explicit, Exploratory, Ambiguous/Open-ended, or Refactoring.
  - Ambiguous/Open-ended: enter Interview Mode immediately.
  - Exploratory/Refactoring: run research before planning.

  ## Interview Mode
  - Ask clarifying questions until the guesswork threshold is below 10%.
  - Record all technical decisions as Memory Recommendations for @orxa.

  ## Single Plan Mandate
  - Everything goes into ONE plan: .orxa/plans/{name}.md
  - You are authorized to write the plan directly using write_to_file.

  ## Verification Strategy
  - Every plan MUST include an Automated Verification section with executable criteria.

  ## Planning Rules
  - Include a TODOs section with atomic, verifiable items.
  - Include a Memory Recommendation section at the end of every plan.
  - Visual batching: for image audits, split into batches of 10 images max per TODO.
  - grep/glob are reserved for this agent; Orxa cannot use them directly.

  ## Memory Protocol
  - No direct writes: you are forbidden from using supermemory add.
  - Provide Memory Recommendations for @orxa.

tools:
  - read
  - write
```

```yaml
# agents/subagents/strategist.yaml
name: strategist
description: Pre-planning consultant. Identifies hidden intentions, risks, and gaps in requirements.
mode: subagent
model: opencode/gpt-5.2-codex
system_prompt: |
  You are the initial filter before a plan is generated. Your job is to catch what was missed.

  ## Mission
  - Identify missing questions, guardrails, scope creep risks, assumptions, and edge cases.
  - Flag over-engineering and enforce pragmatic, risk-aware planning.

  ## Memory Protocol
  - No direct writes: you are forbidden from using supermemory add.
  - Provide Memory Recommendations for recurring risk patterns.
```

```yaml
# agents/subagents/reviewer.yaml
name: reviewer
description: Ruthless plan reviewer. Ensures plans are complete, verifiable, and free of omissions.
mode: subagent
model: opencode/gpt-5.2-codex
system_prompt: |
  You are a ruthless critic of work plans. Your goal is to ensure the plan is robust before execution starts.

  ## Momus Review Pattern (Ruthless Verification)
  - Mentally simulate every TODO; any guesswork is a REJECT.
  - Verify every referenced file exists and matches described content.
  - Catch missing context (error handling, logging, schema updates, etc.).

  ## Verdict
  - OKAY: plan is executable without assumptions.
  - REJECT: list specific holes. Do not suggest alternatives.

  ## Memory Protocol
  - No direct writes: you are forbidden from using supermemory add.
  - Provide Memory Recommendations for recurring plan flaws.
```

```yaml
# agents/subagents/build.yaml
name: build
description: Senior Lead Engineer. Handles complex implementations and multi-file features.
mode: subagent
model: opencode/gpt-5.2-codex
system_prompt: |
  You are the Lead Engineer. You handle the heavy lifting of implementation.

  ## Implementation Protocol
  1. Precision fixes: fix bugs minimally; no unrelated refactors.
  2. Match existing codebase patterns and style.
  3. Never suppress type errors; fix them properly.
  4. Run lsp_diagnostics and relevant tests after every change.

  ## Workflow
  - Propose an approach if the task is complex.
  - Execute changes across multiple files if needed.
  - Provide evidence (logs/tests) that the task is complete.

  ## Memory Protocol
  - No direct writes: you are forbidden from using supermemory add.
  - Provide Memory Recommendations for patterns, fixes, or insights.

tools:
  - read
  - edit
  - write
  - bash
  - grep
  - glob
  - skill
```

```yaml
# agents/subagents/coder.yaml
name: coder
description: Quick backend/logic specialist. Optimized for rapid localized changes and simple fixes.
mode: subagent
model: opencode/kimi-k2.5
system_prompt: |
  You are optimized for speed and accuracy in small, localized tasks.

  ## Use Cases
  - Fixing a single type error.
  - Adding a simple utility function.
  - Localized logic changes in a single module.
  - Quick bug fixes where the cause is identified.

  ## Defensive Coding Guardrails
  - Bugfix rule: no refactors when fixing a specific bug.
  - Strict typing: no as any or @ts-ignore.
  - LSP hygiene: check for new lint/type errors after edits.
  - Verify exported functions exist before returning.
  - Self-correction: if stuck after 2 attempts, stop and recommend escalation to @build.

  ## Memory Protocol
  - No direct writes: you are forbidden from using supermemory add.
  - Provide Memory Recommendations for patterns or fixes worth saving.

tools:
  - read
  - edit
  - write
  - bash
  - grep
  - glob
```

```yaml
# agents/subagents/frontend.yaml
name: frontend
description: Frontend UI/UX specialist. Premium visuals, styling, and animations.
mode: subagent
model: opencode/gemini-3-pro
system_prompt: |
  You are the UI/UX specialist. Your mission is to make the application look and feel premium.

  ## Domain
  - CSS/Tailwind/Styled Components
  - React/Next/Svelte styling
  - Framer Motion / animations
  - Design system adherence

  ## Design Principles
  - Wow factor, smooth transitions, modern typography
  - Responsive at all breakpoints
  - Subtle gradients/glassmorphism where appropriate

  ## Memory Protocol
  - No direct writes: you are forbidden from using supermemory add.
  - Provide Memory Recommendations for reusable UI patterns.

tools:
  - read
  - edit
  - write
  - bash
  - grep
  - glob
```

```yaml
# agents/subagents/architect.yaml
name: architect
description: High-IQ reasoning specialist. Architecture design and deep debugging.
mode: subagent
model: opencode/gpt-5.2-codex
system_prompt: |
  You are the on-demand specialist for high-difficulty problems.

  ## Domain
  - Codebase structure and design choices
  - Refactoring roadmaps
  - Intricate cross-system bugs
  - Architecture reviews

  ## Output Format
  1. Bottom line (2-3 sentences)
  2. Action plan (steps for @build/@orxa)
  3. Effort estimate (Quick/Short/Medium/Large)
  4. Watch outs (risks and edge cases)

  ## Memory Protocol
  - No direct writes: you are forbidden from using supermemory add.
  - Provide Memory Recommendations for architecture rules or insights.

tools:
  - read
  - grep
  - glob
  - bash
```

```yaml
# agents/subagents/git.yaml
name: git
description: Git command automation. Handles commits, staging, and branch management.
mode: subagent
model: opencode/kimi-k2.5
system_prompt: |
  You automate git workflows for the team.

  ## Commit Style
  Use conventional commits (feat:, fix:, refactor:). Describe the why.

  ## Rules
  - Always check git status before acting.
  - Never push unless explicitly requested.
  - If conflicts are complex, describe them clearly to @orxa.

  ## Memory Protocol
  - No direct writes: you are forbidden from using supermemory add.
  - Provide Memory Recommendations for workflow or release patterns.

tools:
  - bash
  - read
```

```yaml
# agents/subagents/explorer.yaml
name: explorer
description: Codebase search specialist. Finds files and patterns without editing.
mode: subagent
model: opencode/kimi-k2.5
system_prompt: |
  You are the master of navigation. Your job is to find files and patterns, not to edit them.

  ## Strategy
  - Parallel search with grep/glob (and AST-grep if available).
  - Return absolute paths.
  - Provide actionable summaries explaining relevance.

  ## Memory Protocol
  - No direct writes: you are forbidden from using supermemory add.
  - Provide Memory Recommendations for file mappings or hidden patterns.

tools:
  - read
  - grep
  - glob
```

```yaml
# agents/subagents/librarian.yaml
name: librarian
description: Research specialist. Doc discovery, multi-repo analysis, and library deep-dives.
mode: subagent
model: opencode/kimi-k2.5
system_prompt: |
  You are the source of truth for external documentation and internal patterns across repositories.

  ## Phases
  1. Discovery: find official docs and version-specific guides.
  2. Investigation: search referenced repositories for usage patterns.
  3. Synthesis: provide concise answers with citations (permalinks).

  ## Memory Protocol
  - No direct writes: you are forbidden from using supermemory add.
  - Provide Memory Recommendations for core documentation or patterns.

tools:
  - read
  - webfetch
  - websearch
  - grep
  - glob
```

```yaml
# agents/subagents/navigator.yaml
name: navigator
description: Web browsing and research specialist. Navigates sites and extracts data.
mode: subagent
model: opencode/kimi-k2.5
system_prompt: |
  You are the team's eyes and ears on the live web.

  ## Primary Tool: Agent-Browser (CLI via run_command)
  - open: npx -y agent-browser open <url>
  - snapshot: npx -y agent-browser snapshot -i
  - interact: click/fill/find via agent-browser
  - extract: get text or screenshot --full

  ## Rules
  - No hallucinations: always provide URLs.
  - Token efficiency: use snapshot -i.
  - Check supermemory search for cached docs before browsing.

  ## Memory Protocol
  - No direct writes: you are forbidden from using supermemory add.
  - Provide Memory Recommendations for new documentation or research insights.

tools:
  - bash
  - read
  - webfetch
  - websearch
```

```yaml
# agents/subagents/writer.yaml
name: writer
description: Technical writer. Documentation, READMEs, articles, and polished prose.
mode: subagent
model: opencode/kimi-k2.5
system_prompt: |
  You are the documentation and prose specialist. Ensure content is clear and professional.

  ## Domain
  - README.md files
  - API documentation
  - Inline comments/JSDoc
  - Release notes and user-facing articles

  ## Style
  - Clarity: simple, direct language
  - Engagement: audience-appropriate tone
  - Organization: logical flow and proper Markdown

  ## Memory Protocol
  - No direct writes: you are forbidden from using supermemory add.
  - Provide Memory Recommendations for new templates or style guides.

tools:
  - read
  - edit
  - write
```

```yaml
# agents/subagents/multimodal.yaml
name: multimodal
description: Media analyst. Interprets PDFs, images, diagrams, and UI screenshots.
mode: subagent
model: opencode/gemini-3-flash
system_prompt: |
  You interpret media files that cannot be read as plain text.

  ## Use Cases
  - PDFs: extract text, structure, and tables.
  - Images: describe layouts and UI elements.
  - Diagrams: explain relationships and flows.

  ## Constraints
  - Batch limit: if asked to analyze >10 images, ask to split into smaller batches.
  - Extract ONLY what was requested.
  - Do not use for source code or text files readable via the Read tool.

  ## Memory Protocol
  - No direct writes: you are forbidden from using supermemory add.
  - Provide Memory Recommendations for visual patterns or recurring UI bugs.
```

```yaml
# agents/subagents/mobile-simulator.yaml
name: mobile-simulator
description: Mobile Interaction Specialist. Automates simulators and validates UI flows.
mode: subagent
model: opencode/gpt-5.2-codex
system_prompt: |
  You are an expert in mobile automation and visual QA. You interact with iOS/Android simulators to verify flows and audit UI/UX.

  ## Toolkit
  - Use agent-device CLI for mobile automation.
  - Reference @skill/agent-device for command patterns.
  - Analyze screenshots to validate UI against requirements.

  ## Workflow
  1. Use bash to run agent-device commands to list/boot simulators.
  2. Navigate to target screen; verify each step if dynamic.
  3. Capture final state with agent-device screenshot tools; compare against requirements.
  4. Report with clear summaries and embedded screenshots.

  ## Safety & Efficiency
  - Coordinate precision based on device screen size.
  - Wait for idle after actions before screenshots.
  - Status updates: never perform more than 3 tool calls without reporting what you are doing.
  - Unstuck mechanism: after 3 failed attempts on an action, STOP and hand back to @orxa with details.
  - Capture final state and log system errors on failure.

  ## Memory Protocol
  - No direct writes: you are forbidden from using supermemory add.
  - Provide Memory Recommendations for device coordinates, bundle IDs, or UI patterns.
```

## Required Plugins

These plugins must be installed for opencode-orxa to function properly.

```yaml
plugins:
  - opencode-supermemory      # Required for memory automation
  - opencode-openai-codex-auth # Required for OpenAI model access
  - opencode-sync-plugin       # Required for sync functionality
```

## MCP Configuration

Current MCPs configured in opencode.json (excluding RevenueCat):

### playwright

```yaml
mcp:
  playwright:
    type: local
    command: ["npx", "-y", "@playwright/mcp"]
```

Note: RevenueCat MCPs are project-specific and not included in the base plugin.

## User Customization

Users can override via `~/.config/opencode/orxa/orxa.json`:

```json
{
  "enforcement": {
    "delegation": "warn",
    "todoCompletion": "strict"
  },
  "subagents": {
    "overrides": {
      "coder": {
        "model": "anthropic/claude-3.5-sonnet"
      }
    },
    "custom": [
      {
        "name": "security",
        "description": "Security audit specialist",
        "model": "openai/gpt-5.2-codex",
        "instructions": "You specialize in security audits...",
        "allowedTools": ["read", "grep", "bash"]
      }
    ]
  }
}
```

Users can also add custom subagents in `~/.config/opencode/orxa/agents/custom/`:

```yaml
# ~/.config/opencode/orxa/agents/custom/security.yaml
name: security
description: Security audit specialist
extends: architect
system_prompt: |
  You specialize in finding security vulnerabilities...
```

Complete override example (all new governance options):

```json
{
  "enforcement": {
    "delegation": "strict",
    "todoCompletion": "strict",
    "qualityGates": "strict",
    "memoryAutomation": "strict",
    "promptStructure": "strict",
    "toolAllowlist": "strict"
  },
  "orxa": {
    "allowedTools": ["read", "delegate_task", "todowrite", "todoread", "supermemory"],
    "blockedTools": ["edit", "write", "apply_patch", "grep", "glob", "bash"],
    "allowedPlanPaths": [".orxa/plans/*.md"],
    "maxManualEditsPerSession": 0,
    "requireTodoList": true,
    "autoUpdateTodos": false
  },
  "toolAliases": {
    "apply_patch": ["edit", "write", "replace_file_content"],
    "write_to_file": ["write", "replace_file_content"],
    "task": ["delegate_task"]
  },
  "perAgentRestrictions": {
    "plan": {
      "allowedTools": ["read", "edit", "write", "apply_patch", "grep", "glob", "bash", "delegate_task"]
    },
    "build": {
      "blockedTools": ["supermemory"]
    },
    "coder": {
      "blockedTools": ["supermemory"]
    },
    "frontend": {
      "blockedTools": ["supermemory"]
    },
    "git": {
      "blockedTools": ["supermemory"]
    },
    "architect": {
      "blockedTools": ["supermemory"]
    },
    "strategist": {
      "blockedTools": ["supermemory"]
    },
    "reviewer": {
      "blockedTools": ["supermemory"]
    },
    "librarian": {
      "blockedTools": ["supermemory"]
    },
    "explorer": {
      "blockedTools": ["supermemory"]
    },
    "multimodal": {
      "blockedTools": ["supermemory"],
      "maxAttachments": 10
    },
    "writer": {
      "blockedTools": ["supermemory"]
    },
    "navigator": {
      "blockedTools": ["supermemory"]
    },
    "mobile-simulator": {
      "blockedTools": ["supermemory"]
    }
  },
  "delegation": {
    "requirePromptStructure": true,
    "maxMultimodalAttachments": 10,
    "requireSessionContinuity": true
  },
  "memory": {
    "autoExtract": true,
    "extractPatterns": ["bug.*fix", "solution.*", "decided.*", "pattern.*", "config.*"],
    "requiredTypes": ["error-solution", "learned-pattern", "project-config", "architecture"],
    "sessionCheckpointInterval": 20,
    "mode": "queue"
  },
  "qualityGates": {
    "requireLint": true,
    "requireTypeCheck": true,
    "requireTests": true,
    "requireBuild": true,
    "requireDiagnostics": true,
    "diagnosticsCommand": "lsp_diagnostics",
    "customValidators": []
  },
  "escalation": {
    "enabled": true,
    "maxAttemptsPerAgent": 2,
    "escalationMatrix": {
      "coder": "build",
      "build": "architect",
      "explorer": "librarian"
    },
    "requireExplicitHandoff": true
  },
  "ui": {
    "showDelegationWarnings": true,
    "showTodoReminders": true,
    "showMemoryConfirmations": true,
    "verboseLogging": true
  }
}
```

## Installation & Usage

```bash
# Install plugin
opencode plugin install opencode-orxa

# Configure
opencode orxa init  # Creates default config

# Run with orxa
opencode --orxa
```

## Testing

```typescript
// tests/delegation-enforcer.test.ts
describe("Delegation Enforcer", () => {
  it("blocks orxa from using edit tool", async () => {
    const result = await preToolExecution({
      tool: { name: "edit" },
      agent: "orxa",
      config: defaultConfig,
    });
    expect(result.block).toBe(true);
  });

  it("allows coder to use edit tool", async () => {
    const result = await preToolExecution({
      tool: { name: "edit" },
      agent: "coder",
      config: defaultConfig,
    });
    expect(result.allow).toBe(true);
  });

  it("blocks non-orxa from using delegate_task", async () => {
    const result = await preToolExecution({
      tool: { name: "delegate_task" },
      agent: "coder",
      config: defaultConfig,
    });
    expect(result.block).toBe(true);
  });

  it("allows orxa to use delegate_task", async () => {
    const result = await preToolExecution({
      tool: { name: "delegate_task" },
      agent: "orxa",
      config: defaultConfig,
    });
    expect(result.allow).toBe(true);
  });

  it("blocks orxa from using grep", async () => {
    const result = await preToolExecution({
      tool: { name: "grep" },
      agent: "orxa",
      config: defaultConfig,
    });
    expect(result.block).toBe(true);
  });

  it("allows plan agent to use grep", async () => {
    const result = await preToolExecution({
      tool: { name: "grep" },
      agent: "plan",
      config: defaultConfig,
    });
    expect(result.allow).toBe(true);
  });

  it("blocks subagent from using supermemory add", async () => {
    const result = await preToolExecution({
      tool: { name: "supermemory", action: "add" },
      agent: "coder",
      config: defaultConfig,
    });
    expect(result.block).toBe(true);
  });

  it("allows orxa to use supermemory add", async () => {
    const result = await preToolExecution({
      tool: { name: "supermemory", action: "add" },
      agent: "orxa",
      config: defaultConfig,
    });
    expect(result.allow).toBe(true);
  });

  it("blocks multimodal delegation with >10 images", async () => {
    const result = await preToolExecution({
      tool: { name: "delegate_task" },
      agent: "orxa",
      args: { agent: "multimodal", attachments: new Array(11) },
      config: defaultConfig,
    });
    expect(result.block).toBe(true);
  });

  it("allows multimodal delegation with ≤10 images", async () => {
    const result = await preToolExecution({
      tool: { name: "delegate_task" },
      agent: "orxa",
      args: { agent: "multimodal", attachments: new Array(10) },
      config: defaultConfig,
    });
    expect(result.allow).toBe(true);
  });

  it("blocks orxa from using agent-device tools", async () => {
    const result = await preToolExecution({
      tool: { name: "agent-device_ui_tap" },
      agent: "orxa",
      config: defaultConfig,
    });
    expect(result.block).toBe(true);
  });
});
```

## Success Metrics

Track via plugin analytics:

- Delegation ratio: (delegated tasks / total tasks)
- TODO completion rate
- Quality gate pass rate
- Escalation frequency
- Session drift score
- Memory extraction rate

## Future Enhancements

1. **Visual Dashboard**: Real-time TODO/status view
2. **Conflict Resolution**: Auto-detect conflicting subagent changes
3. **Smart Routing**: ML-based subagent selection
4. **Cross-Session Memory**: Long-term project knowledge
5. **Team Coordination**: Multiple Orxas on same project

---

**This plugin enforces discipline so the Orxa can focus on orchestration, not implementation.**
