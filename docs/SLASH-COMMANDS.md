# Slash Commands Reference

Complete reference for all built-in slash commands in OpenCode Orxa.

## Table of Contents

- [Overview](#overview)
- [Command Reference](#command-reference)
  - [/orchestrate](#orchestrate)
  - [/validate](#validate)
  - [/refactor](#refactor)
  - [/explain](#explain)
  - [/test](#test)
  - [/debug](#debug)
  - [/commit](#commit)
  - [/search](#search)
- [Command Aliases](#command-aliases)
- [How Commands Work](#how-commands-work)
- [Creating Custom Commands](#creating-custom-commands)
- [Troubleshooting](#troubleshooting)

## Overview

Slash commands provide powerful shortcuts for common development workflows. Instead of manually delegating to multiple agents, you can use a single command to trigger complex multi-agent workflows.

### Usage

Type a slash command in OpenCode:

```
/command-name [arguments]
```

Example:
```
/validate
/refactor src/components/Button.tsx
/explain the authentication middleware
```

### Command Output

Each command returns:
- **Success/failure status**
- **Formatted message** with results
- **Suggested next actions** (actionable items)

## Command Reference

### /orchestrate

**Aliases:** `/orx`, `/ox`

**Description:** Activates Orxa orchestration mode for parallel multi-agent execution. Creates isolated git worktrees with parallel workstreams for complex multi-file tasks, enabling concurrent development by multiple specialized agents.

**When to Use:**
- Complex multi-file features requiring coordinated changes
- Large refactoring projects across multiple modules
- Tasks that can be parallelized (e.g., frontend + backend simultaneously)
- Multi-phase implementations with clear dependencies
- When you need maximum throughput for complex work

**Arguments:**
- `[request]` — Description of the complex task to orchestrate (required)

**Example Usage:**

```
You: /orchestrate Implement a complete user management system with authentication, profiles, and admin dashboard

Orxa: ## 🎼 Orxa Orchestration Mode Activated

Analyzing your request for parallel execution opportunities...

**Parallel Workstreams Identified:**

| Workstream | Agent | Description | Dependencies |
|------------|-------|-------------|--------------|
| #1 | @build | Database schema and auth API | None |
| #2 | @frontend | Login/registration UI | #1 (API contract) |
| #3 | @frontend | User profile page | #1 (API contract) |
| #4 | @build | Admin dashboard backend | #1 |
| #5 | @frontend | Admin dashboard UI | #4 |

**Orchestration Plan:**
1. Create isolated git worktrees for concurrent development
2. Execute independent workstreams in parallel (max 5 concurrent)
3. Monitor progress and resolve dependencies
4. Merge completed workstreams with conflict detection
5. Run quality gates on merged result

**Starting Parallel Execution...**

Workstream #1 (@build): [████████░░] 80% - Creating database schema
Workstream #2 (@frontend): [████░░░░░░] 40% - Awaiting API contract
Workstream #3 (@frontend): [████░░░░░░] 40% - Awaiting API contract
Workstream #4 (@build): [██████░░░░] 60% - Building admin API
Workstream #5 (@frontend): [░░░░░░░░░░] 0% - Awaiting backend completion
```

**Workflow:**
1. **SpecGenerator** analyzes request and identifies parallel workstreams
2. **WorktreeManager** creates isolated git worktrees for each workstream
3. **OrxaOrchestrator** manages parallel execution with dependency resolution
4. Agents work concurrently within their isolated worktrees
5. **MergeQueue** processes completed workstreams with conflict detection
6. **Architect** agent resolves any merge conflicts
7. Quality gates run on the final merged result

**Agents Used:**
- `@orxa` — Orchestration coordinator
- `@orxa-planner` — Creates parallel workstream specifications
- `@orxa-worker` — Executes individual workstreams
- `@architect` — Resolves merge conflicts
- Multiple execution agents (`@build`, `@frontend`, `@coder`, etc.) depending on task

**How It Works:**

1. **Git Worktrees**: Creates isolated working directories linked to the same repository, allowing concurrent development without conflicts
2. **Dependency Graph**: Analyzes task dependencies to determine execution order and parallelization opportunities
3. **Parallel Execution**: Runs up to 5 workstreams simultaneously based on dependencies
4. **Merge Strategy**: FIFO merge queue with automatic conflict detection and resolution
5. **Quality Gates**: All workstreams must pass lint, type-check, and tests before merging

**Configuration:**

Orchestration settings in `orxa.json`:

```json
{
  "orchestration": {
    "enabled": true,
    "maxConcurrent": 5,
    "maxDepth": 3,
    "mergeStrategy": "fifo",
    "qualityGates": ["lint", "typecheck", "test"],
    "worktreePrefix": ".orxa/worktrees/"
  }
}
```

**Tips:**
- Provide clear, comprehensive task descriptions for better parallelization analysis
- Complex tasks with independent components work best (e.g., frontend + backend)
- Review the orchestration plan before execution begins
- Monitor workstream progress in real-time
- Be available to clarify requirements if dependencies change during execution

**Limitations:**
- Maximum 5 concurrent workstreams
- Tasks with heavy interdependencies may not parallelize well
- Merge conflicts are auto-resolved but may require manual review
- Requires clean git repository state (no uncommitted changes)

---

### /validate

**Aliases:** `/v`, `/check`

**Description:** Validates the current plan or codebase with strategist and reviewer agents. Use this before starting any significant work to catch issues early.

**When to Use:**
- Before starting a new feature
- When requirements seem unclear
- To identify risks and edge cases
- Before executing a complex plan

**Arguments:** None

**Example Usage:**

```
You: /validate

Orxa: ## ✅ Validation Complete

### 🔍 Strategist Risk Analysis
- Missing error handling for network failures
- Database schema migration not considered
- Authentication edge case: token expiration

### 📋 Reviewer Assessment
- TODOs are atomic and verifiable ✓
- Success criteria defined ✓
- Scope is appropriate ✓
- Gap: No rollback plan mentioned

---

**Next Steps:**
1. Address critical risks identified by strategist
2. Fix plan clarity issues flagged by reviewer
3. Re-run /validate after fixes
```

**Workflow:**
1. Invokes `@strategist` for risk analysis
2. Invokes `@reviewer` for plan validation
3. Compiles findings into actionable report

**Agents Used:**
- `@strategist` — Identifies risks, hidden requirements, ambiguities
- `@reviewer` — Validates plan completeness against Momus standards

---

### /refactor

**Aliases:** `/rf`

**Description:** Intelligent refactoring with architecture analysis. Analyzes the codebase, finds all affected files, and executes the refactoring with proper verification.

**When to Use:**
- Renaming components or functions
- Extracting reusable code
- Improving code structure
- Migrating to new patterns

**Arguments:**
- `[target]` — File, directory, or module to refactor (optional, defaults to current context)

**Example Usage:**

```
You: /refactor src/components/Button.tsx

Orxa: ## 🔧 Refactoring: src/components/Button.tsx

Starting intelligent refactoring workflow...

**Actions:**
1. @architect: Analyze current architecture and propose refactoring strategy
2. @explorer: Find all references and dependencies affected by refactoring
3. @build: Execute refactoring with LSP-powered renames and edits
4. Run quality gates (lint, type-check, tests) after changes
5. @reviewer: Review refactored code for correctness
```

**Workflow:**
1. `@architect` analyzes the target and proposes strategy
2. `@explorer` finds all references and dependencies
3. `@build` executes the refactoring
4. Quality gates verify the changes
5. `@reviewer` validates correctness

**Agents Used:**
- `@architect` — Architecture analysis
- `@explorer` — Reference finding
- `@build` — Refactoring execution
- `@reviewer` — Final validation

**Tips:**
- Be specific about what you want refactored
- The command handles finding all affected files automatically
- Always review the changes before committing

---

### /explain

**Aliases:** `/ex`, `/exp`

**Description:** Get clear, educational explanations of code, architecture, or concepts. The librarian agent breaks down complex topics into understandable explanations.

**When to Use:**
- Understanding unfamiliar code
- Learning new patterns or libraries
- Onboarding to a codebase
- Explaining architecture decisions

**Arguments:**
- `[topic]` — What to explain (required)

**Example Usage:**

```
You: /explain the authentication middleware

Orxa: ## 📚 Explanation

The authentication middleware is a gatekeeper that verifies user identity before allowing access to protected routes.

**High-Level Overview:**
It sits between the incoming request and your route handlers. Think of it like a bouncer at a club — it checks your ID (token) before letting you in.

**Key Components:**
1. **Token Extractor** — Pulls the JWT from the Authorization header
2. **Verifier** — Validates the token signature and expiration
3. **User Loader** — Fetches user data from the database
4. **Context Setter** — Attaches user info to the request object

**Data Flow:**
```
Request → Extract Token → Verify → Load User → Attach to Request → Next Middleware
```

**Important Patterns:**
- Uses async/await for database operations
- Throws AuthError for invalid tokens (caught by error handler)
- Caches user data for 5 minutes to reduce DB load

**Next Steps:**
- Ask follow-up questions if anything is unclear
- Use /search to find related concepts
- Use /refactor if you want to improve the code after understanding it
```

**Workflow:**
1. Delegates to `@librarian` with educational prompt
2. Librarian analyzes the code/concept
3. Returns structured explanation with analogies

**Agents Used:**
- `@librarian` — Research and explanation specialist

**Tips:**
- Ask about specific functions, files, or concepts
- The more specific you are, the better the explanation
- Great for documenting code after understanding it

---

### /test

**Aliases:** `/t`

**Description:** Generate comprehensive tests for code. The build agent analyzes the target and creates unit tests covering happy paths, edge cases, and error scenarios.

**When to Use:**
- Adding tests to untested code
- Increasing test coverage
- Testing new features
- Regression testing after changes

**Arguments:**
- `[target]` — File or module to test (optional, defaults to current context)

**Example Usage:**

```
You: /test src/utils/helpers.ts

Orxa: ## 🧪 Test Generation: src/utils/helpers.ts

Starting test generation workflow...

**Actions:**
1. @build: Analyze the target code and identify testable units
2. @build: Write comprehensive unit tests covering:
   - Happy path scenarios
   - Edge cases and boundary conditions
   - Error handling paths
   - Integration points
3. Run tests to verify they pass
4. @reviewer: Review test coverage and quality
```

**Workflow:**
1. `@build` analyzes the code structure
2. Identifies testable units (functions, classes, methods)
3. Generates comprehensive test suite
4. Runs tests to verify they work
5. `@reviewer` validates coverage

**Agents Used:**
- `@build` — Test generation and execution
- `@reviewer` — Coverage validation

**Test Coverage Includes:**
- ✅ Happy path scenarios
- ✅ Edge cases and boundary conditions
- ✅ Error handling paths
- ✅ Integration points
- ✅ Mock external dependencies

**Tips:**
- Specify the exact file for best results
- Review generated tests for completeness
- Add custom test cases for domain-specific logic

---

### /debug

**Aliases:** `/dbg`, `/fix`

**Description:** Systematic debugging workflow. Traces code flow, identifies root causes, and implements minimal fixes.

**When to Use:**
- Something is broken and you don't know why
- Error messages are unclear
- Bugs that are hard to reproduce
- Performance issues

**Arguments:**
- `[issue]` — Description of the problem (optional, defaults to current context)

**Example Usage:**

```
You: /debug why the login is failing

Orxa: ## 🐛 Debugging: why the login is failing

Starting debugging workflow...

**Actions:**
1. @architect: Analyze the error/issue and hypothesize root causes
2. @explorer: Trace code flow to understand execution path
3. @explorer: Find where the issue originates
4. @coder: Implement minimal fix for the root cause
5. Run tests to verify the fix works
6. Check for regressions in related code
```

**Workflow:**
1. `@architect` analyzes the error and hypothesizes causes
2. `@explorer` traces the code execution path
3. Identifies the root cause location
4. `@coder` implements a minimal fix
5. Tests verify the fix
6. Regression checks ensure no new issues

**Agents Used:**
- `@architect` — Root cause analysis
- `@explorer` — Code flow tracing
- `@coder` — Fix implementation

**Debugging Strategy:**
1. **Hypothesis Formation** — What could cause this?
2. **Evidence Gathering** — Trace execution, check logs
3. **Root Cause Identification** — Where exactly does it fail?
4. **Minimal Fix** — Smallest change that fixes the issue
5. **Verification** — Confirm fix works, check for regressions

**Tips:**
- Provide as much context as possible
- Include error messages if available
- Mention what you've already tried

---

### /commit

**Aliases:** `/c`, `/git`

**Description:** Smart git commits with automatic atomic splitting. Analyzes changes and creates well-structured commits following conventional commit format.

**When to Use:**
- Ready to commit your changes
- Large changes that should be split
- Want consistent commit messages
- Following conventional commits

**Arguments:**
- `[message]` — Base commit message (optional)

**Example Usage:**

```
You: /commit "Add user authentication"

Orxa: ## 📦 Git Commit

Starting smart commit workflow...

**Actions:**
1. @git: Check current git status
2. @git: Analyze changes and determine if atomic splitting is needed:
   - 3+ files changed → Split into 2+ commits
   - 5+ files changed → Split into 3+ commits
   - 10+ files changed → Split into 5+ commits
3. @git: Create atomic commits with descriptive messages
4. @git: Use commit message pattern: "Add user authentication"
5. @git: Push commits if appropriate
```

**Workflow:**
1. `@git` checks current status
2. Analyzes the scope of changes
3. Determines if splitting is beneficial
4. Creates atomic commits
5. Optionally pushes to remote

**Agents Used:**
- `@git` — Git operations specialist

**Atomic Splitting Rules:**

| Files Changed | Commits Created |
|---------------|-----------------|
| 1-2 files     | Single commit   |
| 3-4 files     | 2 commits       |
| 5-9 files     | 3 commits       |
| 10+ files     | 5+ commits      |

**Commit Message Format:**

Uses conventional commits:
```
feat: add user authentication
fix: resolve login redirect issue
refactor: extract auth utilities
docs: update authentication README
test: add auth middleware tests
```

**Tips:**
- Provide a base message for context
- Let the agent split logically (by feature, not just file count)
- Review commits before pushing
- Use for consistent commit history

---

### /search

**Aliases:** `/s`, `/find`

**Description:** Comprehensive search across codebase and web. Combines codebase exploration with web research for complete answers.

**When to Use:**
- Finding code in large codebases
- Researching how something works
- Looking for examples
- Understanding external libraries

**Arguments:**
- `[query]` — Search query (required)

**Example Usage:**

```
You: /search how authentication works

Orxa: ## 🔍 Search: "how authentication works"

**Actions:**
1. @explorer: Search codebase for:
   - "authentication"
   - Related functions, classes, and files
   - Usage examples and references
2. @navigator: Search web for:
   - Documentation about "authentication"
   - Best practices and examples
   - Common patterns and solutions
3. Compile results into organized findings
```

**Workflow:**
1. `@explorer` searches the codebase
2. `@navigator` searches the web
3. Results are compiled and organized
4. Provides code examples and documentation links

**Agents Used:**
- `@explorer` — Codebase search specialist
- `@navigator` — Web research specialist

**Search Coverage:**
- ✅ Codebase files and content
- ✅ Function and class definitions
- ✅ Usage examples
- ✅ Official documentation
- ✅ Best practices
- ✅ Community examples

**Tips:**
- Use specific terms for better results
- Combine with `/explain` for deeper understanding
- Great for onboarding to new codebases

## Command Aliases

All commands support short aliases for faster typing:

| Command       | Short Alias | Shorter Alias |
|---------------|-------------|---------------|
| `/orchestrate`| `/orx`      | `/ox`         |
| `/validate`   | `/v`        | `/check`      |
| `/refactor`   | `/rf`       | —             |
| `/explain`    | `/ex`       | `/exp`        |
| `/test`       | `/t`        | —             |
| `/debug`      | `/dbg`      | `/fix`        |
| `/commit`     | `/c`        | `/git`        |
| `/search`     | `/s`        | `/find`       |

## How Commands Work

### Command Registry

Commands are registered in `src/commands/index.ts`:

```typescript
export const builtInCommands: SlashCommand[] = [
  validateCommand,
  refactorCommand,
  explainCommand,
  // ... etc
];
```

### Command Structure

Each command implements the `SlashCommand` interface:

```typescript
export interface SlashCommand {
  name: string;                    // Command name (e.g., "validate")
  description: string;             // Human-readable description
  aliases?: string[];              // Alternative names
  handler: (args: string[], context: CommandContext) => Promise<CommandResult>;
}
```

### Execution Flow

1. **User types command** → `/command-name args`
2. **Parser extracts** → command name and arguments
3. **Registry lookup** → Finds command implementation
4. **Handler executes** → Returns `CommandResult`
5. **Result displayed** → Message + suggested actions

### Context Available to Commands

```typescript
export interface CommandContext {
  config: OrxaConfig;         // Full plugin configuration
  session: Session;                // Current session state
  delegateTask: (agent: string, prompt: string) => Promise<string>;
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<void>;
}
```

## Creating Custom Commands

You can create custom slash commands for your workflow.

### Step 1: Create Command File

```typescript
// ~/.config/opencode/orxa/commands/deploy.ts
import type { SlashCommand, CommandContext, CommandResult } from 'opencode-orxa/commands';

export const deployCommand: SlashCommand = {
  name: 'deploy',
  description: 'Deploy to production',
  aliases: ['d'],
  handler: async (args: string[], context: CommandContext): Promise<CommandResult> => {
    const environment = args[0] || 'production';
    
    return {
      success: true,
      message: `Starting deployment to ${environment}...`,
      actions: [
        '@build: Run full test suite',
        '@build: Build production bundle',
        '@git: Tag release',
        `@bash: Deploy to ${environment}`,
        '@navigator: Verify deployment health'
      ]
    };
  }
};
```

### Step 2: Register the Command

Add to your configuration:

```json
{
  "custom_commands": [
    "~/.config/opencode/orxa/commands/deploy.ts"
  ]
}
```

### YAML-Based Custom Commands

For simpler commands, use YAML:

```yaml
# ~/.config/opencode/orxa/commands/my-command.yaml
name: mycommand
description: Does something useful
aliases: [mc]
---
When invoked, this command will:
1. Run @explorer to find relevant files
2. Run @build to process them
3. Report results
```

## Troubleshooting

### Command Not Found

**Problem:** `/command` returns "Unknown command"

**Solutions:**
1. Check spelling and case
2. Verify the plugin is loaded: look for "🎼 OpenCode Orxa" toast
3. Check available commands: type `/` and look for suggestions

### Command Fails Silently

**Problem:** Command appears to do nothing

**Solutions:**
1. Check agent availability: `orxa doctor`
2. Verify the target agent is enabled in config
3. Check OpenCode logs for errors

### Slow Command Execution

**Problem:** Commands take too long

**Solutions:**
1. Some commands invoke multiple agents — this is expected
2. Check your model settings (faster models = faster responses)
3. For `/search`, consider using more specific queries

### Custom Command Not Loading

**Problem:** Custom command doesn't appear

**Solutions:**
1. Verify file path in configuration
2. Check for TypeScript/JavaScript syntax errors
3. Ensure the command exports correctly
4. Restart OpenCode after adding custom commands

## Best Practices

### When to Use Each Command

| Situation                    | Recommended Command |
|------------------------------|---------------------|
| Starting new work            | `/validate`         |
| Complex multi-file tasks     | `/orchestrate`      |
| Code cleanup                 | `/refactor`         |
| Learning codebase            | `/explain`          |
| Adding tests                 | `/test`             |
| Something broken             | `/debug`            |
| Ready to commit              | `/commit`           |
| Finding code                 | `/search`           |

### Command Chains

Commands work well together:

```
/search how auth works
/explain the auth flow
/orchestrate implement full auth system with login, signup, and dashboard
/test src/auth/
/commit "Implement authentication system"
```

### Tips for Effective Use

1. **Start with `/validate`** before complex work
2. **Use `/orchestrate`** for multi-file/multi-phase tasks to maximize parallelism
3. **Use `/explain`** to understand before changing
4. **Run `/test`** after implementing features
5. **`/commit`** regularly with atomic splits
6. **Combine commands** for complete workflows
