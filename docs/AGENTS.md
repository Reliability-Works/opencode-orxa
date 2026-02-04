# Agent System Documentation

Complete guide to the OpenCode Orxa agent fleet — 17 specialized agents working together to deliver high-quality AI-assisted development.

## Table of Contents

- [Overview](#overview)
- [Agent Hierarchy](#agent-hierarchy)
- [Primary Agents](#primary-agents)
  - [Orxa (Engineering Manager)](#orxa-engineering-manager)
  - [Plan (Product Manager)](#plan-product-manager)
- [Subagents](#subagents)
  - [Strategist](#strategist)
  - [Reviewer](#reviewer)
  - [Build](#build)
  - [Coder](#coder)
  - [Frontend](#frontend)
  - [Architect](#architect)
  - [Git](#git)
  - [Explorer](#explorer)
  - [Librarian](#librarian)
  - [Navigator](#navigator)
  - [Writer](#writer)
  - [Multimodal](#multimodal)
  - [Mobile Simulator](#mobile-simulator)
  - [Orxa-Planner](#orxa-planner)
  - [Orxa-Worker](#orxa-worker)
- [Agent Selection Guide](#agent-selection-guide)
- [Delegation Patterns](#delegation-patterns)
- [Customizing Agents](#customizing-agents)
- [Creating Custom Agents](#creating-custom-agents)
- [Troubleshooting](#troubleshooting)

---

## Overview

The Orxa plugin replaces OpenCode's default agent system with a structured fleet of 17 specialized agents. This design follows the principle of **separation of concerns** — each agent has a specific role, toolset, and expertise area.

### Why Multiple Agents?

| Problem               | Single Agent Solution                  | Multi-Agent Solution                      |
|-----------------------|----------------------------------------|-------------------------------------------|
| Context overload      | One agent tries to remember everything | Each agent focuses on its domain          |
| Tool confusion        | Agent uses wrong tool for task         | Agent has tools appropriate to its role   |
| Quality inconsistency | Same agent does planning and coding    | Specialist agents for each phase          |
| Hallucination         | Agent guesses outside expertise        | Agent delegates to appropriate specialist |

### Agent Categories

```
┌─────────────────────────────────────────────────────────┐
│                    PRIMARY AGENTS                       │
│  ┌─────────────┐    ┌─────────────┐                     │
│  │    Orxa     │    │    Plan     │                     │
│  │  (Manager)  │◄──►│  (Planner)  │                     │
│  └──────┬──────┘    └─────────────┘                     │
└─────────┼───────────────────────────────────────────────┘
          │ delegates to
          ▼
┌─────────────────────────────────────────────────────────┐
│                    SUBAGENTS (15)                       │
│  ┌──────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │Strategist│ │Reviewer │ │  Build  │ │  Coder  │       │
│  └──────────┘ └─────────┘ └─────────┘ └─────────┘       │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐        │
│  │ Frontend│ │Architect│ │   Git   │ │Explorer │        │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘        │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────┐       │
│  │Librarian│ │Navigator│ │ Writer  │ │Multimodal│       │
│  └─────────┘ └─────────┘ └─────────┘ └──────────┘       │
│  ┌─────────────────┐ ┌─────────────┐ ┌──────────────┐   │
│  │ Mobile Simulator│ │ Orxa-Planner│ │  Orxa-Worker │   │
│  └─────────────────┘ └─────────────┘ └──────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## Agent Hierarchy

### Control Flow

```
User Request
     │
     ▼
┌─────────┐
│  Orxa   │ ◄── Only agent that can delegate
│(Manager)│
└────┬────┘
     │
     ├──► Creates/updates TODO list
     │
     ├──► Delegates to subagents (for execution)
     │
     └──► Verifies results, updates memory
```

### Delegation Rules

1. **Only Orxa can delegate** — Subagents cannot use `delegate_task`
2. **Plan handles research** — grep/glob are reserved for Plan agent
3. **Memory authority** — Only Orxa writes to supermemory
4. **Plan-only writes** — Orxa can only write to `.orxa/plans/*.md`

---

## Primary Agents

### Orxa (Engineering Manager)

**Role:** Central orchestrator and manager of all development work.

**Responsibilities:**
- Receive all user requests
- Create and manage TODO lists
- Delegate tasks to appropriate subagents
- Verify work quality through quality gates
- Save important context to memory
- Ensure TODO completion before finishing

**Model:** `opencode/kimi-k2.5` (configurable)

**Allowed Tools:**
| Tool                   | Purpose                |
|------------------------|------------------------|
| `read`                 | Read files for context |
| `delegate_task`        | Delegate to subagents  |
| `todowrite`/`todoread` | Manage TODOs           |
| `supermemory`          | Read/write memory      |
| `edit`/`write`         | Modify plan files only |

**Blocked Tools:**
| Tool            | Why Blocked      | Delegate To          |
|-----------------|------------------|----------------------|
| `grep`          | Research task    | `@plan`              |
| `glob`          | File discovery   | `@plan`              |
| `bash`          | Execution        | Appropriate subagent |
| `agent-device`  | Mobile testing   | `@mobile-simulator`  |

**When to Use:**
Orxa is the default agent for all interactions. You don't choose when to use Orxa — Orxa is always the entry point.

**Example Interaction:**
```
You: Create a React component for a user profile card

Orxa: I'll create a user profile card component. Let me start by
creating a plan and then delegate to the frontend specialist.

[Orxa creates TODO list]
[Orxa delegates to @frontend]
[Orxa verifies results]
[Orxa marks TODO complete]
```

**Configuration:**
```json
{
  "orxa": {
    "model": "opencode/kimi-k2.5",
    "enforcement": {
      "delegation": "strict",
      "todoCompletion": "strict",
      "qualityGates": "strict",
      "memoryAutomation": "strict"
    }
  }
}
```

---

### Plan (Product Manager)

**Role:** Strategic planning and requirements analysis.

**Responsibilities:**
- Interview users to clarify requirements
- Create comprehensive work plans
- Research codebase (grep/glob)
- Identify risks and edge cases
- Define verification strategies

**Model:** `opencode/gpt-5.2-codex`

**Allowed Tools:**
| Tool    | Purpose         |
|---------|-----------------|
| `read`  | Read files      |
| `write` | Create plans    |
| `edit`  | Modify plans    |
| `grep`  | Search codebase |
| `glob`  | Find files      |
| `bash`  | Run commands    |

**Special Capabilities:**
- **grep/glob reserved** — Plan is the only agent that should use these for research
- **Plan writing authority** — Creates `.orxa/plans/*.md` files
- **Interview mode** — Asks clarifying questions for ambiguous requests

**When to Use:**
Orxa automatically delegates to Plan when:
- Requirements need clarification
- Research is needed before execution
- Creating comprehensive work plans

**Example Interaction:**
```
Orxa: @plan — Please interview the user about the authentication
requirements and create a comprehensive plan.

Plan: I'll help you design the authentication system. Let me ask
some clarifying questions:

1. What authentication methods do you need? (OAuth, email/password, SSO?)
2. Do you need session management or JWT tokens?
3. What password requirements should we enforce?
...

[After interview]

Plan: Here's the comprehensive plan: .orxa/plans/auth-implementation.md
```

**Configuration:**
```json
{
  "agent_overrides": {
    "plan": {
      "model": "opencode/gpt-5.2-codex"
    }
  }
}
```

---

## Subagents

### Strategist

**Role:** Pre-planning risk analysis and requirements validation.

**Best For:**
- Identifying hidden requirements
- Risk assessment
- Edge case discovery
- Scope creep prevention

**Model:** `opencode/gpt-5.2-codex`

**When to Delegate:**
```
Orxa: @strategist — Analyze the authentication implementation plan
for risks and missing requirements.
```

**Typical Output:**
- List of risks (security, performance, edge cases)
- Missing requirements
- Assumptions that need validation
- Recommended mitigations

**Memory Recommendations:**
Strategist identifies recurring risk patterns for Orxa to remember.

---

### Reviewer

**Role:** Ruthless plan and code reviewer.

**Best For:**
- Plan validation before execution
- Code review
- Verification of completeness
- Catching omissions

**Model:** `opencode/gpt-5.2-codex`

**When to Delegate:**
```
Orxa: @reviewer — Review this plan for completeness and executability.
```

**Review Pattern:**
1. Mentally simulate every TODO
2. Verify referenced files exist
3. Check for missing context
4. Verdict: OKAY or REJECT with specific holes

**Slash Command:** `/validate` automatically invokes strategist + reviewer.

---

### Build

**Role:** Senior Lead Engineer for complex implementations.

**Best For:**
- Multi-file features
- Complex refactors
- Architecture changes
- Integration work

**Model:** `opencode/gpt-5.2-codex`

**Characteristics:**
- Handles "heavy lifting"
- Proposes approaches for complex tasks
- Executes changes across multiple files
- Provides evidence (logs/tests) of completion

**When to Delegate:**
```
Orxa: @build — Implement the user authentication system across
all layers (API, database, frontend).

Required Tools: read, edit, write, bash, grep

Must Do:
- Create database migrations
- Implement API endpoints
- Add frontend login forms
- Write tests

Must Not Do:
- Skip error handling
- Forget input validation
```

**Escalation Path:**
```
coder → build → architect
```

---

### Coder

**Role:** Quick implementation specialist for focused tasks.

**Best For:**
- Single-file changes
- Bug fixes
- Small features
- Rapid iteration

**Model:** `opencode/kimi-k2.5`

**Characteristics:**
- Fast execution
- Focused scope
- Minimal overhead
- Perfect for well-defined tasks

**When to Delegate:**
```
Orxa: @coder — Fix the off-by-one error in the pagination logic.

Required Tools: read, edit

Must Do:
- Fix the bug in src/utils/pagination.ts
- Run tests to verify

Must Not Do:
- Refactor unrelated code
```

**Escalation Path:**
```
coder → build (if task grows in scope)
```

---

### Frontend

**Role:** UI/UX implementation specialist.

**Best For:**
- React/Vue/Angular components
- CSS/styling
- Responsive design
- Animation and interactions

**Model:** `opencode/gemini-3-pro`

**Characteristics:**
- Strong visual sense
- Knows modern frontend patterns
- Handles component architecture
- Implements design systems

**When to Delegate:**
```
Orxa: @frontend — Create a responsive navigation component with
mobile hamburger menu.

Required Tools: read, edit, write, glob

Must Do:
- Use Tailwind CSS
- Implement mobile-first responsive design
- Add accessibility attributes
- Include hover/focus states
```

---

### Architect

**Role:** System design and debugging specialist.

**Best For:**
- Architecture decisions
- Debugging complex issues
- Performance optimization
- Technical design reviews

**Model:** `opencode/gpt-5.2-codex`

**Characteristics:**
- Deep technical knowledge
- System thinking
- Root cause analysis
- Best practices enforcement

**When to Delegate:**
```
Orxa: @architect — Design the caching strategy for our API layer.

Required Tools: read, grep, write

Must Do:
- Evaluate Redis vs in-memory options
- Design cache invalidation strategy
- Consider edge cases
```

**Escalation Target:**
Build and coder escalate to architect for complex issues.

---

### Git

**Role:** Version control specialist.

**Best For:**
- Commit management
- Branch operations
- Merge conflict resolution
- Repository maintenance

**Model:** `opencode/kimi-k2.5`

**Characteristics:**
- Git expert
- Conventional commits
- Atomic commit creation
- Repository hygiene

**When to Delegate:**
```
Orxa: @git — Create atomic commits for these changes following
conventional commit format.

Required Tools: bash

Must Do:
- Split into logical commits
- Use conventional commit format
- Write descriptive messages
```

**Slash Command:** `/commit` automatically invokes git agent.

---

### Explorer

**Role:** Codebase navigation and search specialist.

**Best For:**
- Finding code
- Understanding structure
- Locating definitions
- Code archaeology

**Model:** `opencode/kimi-k2.5`

**Characteristics:**
- Fast codebase traversal
- Pattern matching
- Reference finding
- Structure mapping

**When to Delegate:**
```
Orxa: @explorer — Find all usages of the `validateUser` function
and understand how it's called.

Required Tools: grep, glob, read

Must Do:
- Find all call sites
- Understand the calling patterns
- Report file locations and line numbers
```

**Slash Command:** `/search` invokes explorer + navigator.

---

### Librarian

**Role:** Documentation and research specialist.

**Best For:**
- Documentation lookup
- Library research
- Best practices
- Technical explanations

**Model:** `opencode/kimi-k2.5`

**Characteristics:**
- Documentation expert
- Research oriented
- Knowledge synthesis
- Educational explanations

**When to Delegate:**
```
Orxa: @librarian — Research the best practices for JWT token
refresh strategies.

Required Tools: read

Must Do:
- Research current best practices
- Compare different approaches
- Recommend the best strategy for our use case
```

**Slash Command:** `/explain` invokes librarian.

---

### Navigator

**Role:** Web browsing and live research specialist.

**Best For:**
- Live web research
- Documentation lookup
- API reference checking
- Community resources

**Model:** `opencode/kimi-k2.5`

**Characteristics:**
- Web browsing capability
- Real-time information
- External resource access
- Current documentation

**When to Delegate:**
```
Orxa: @navigator — Look up the latest React 19 documentation
for the new use hook.

Required Tools: webfetch (if available)

Must Do:
- Find official documentation
- Extract usage examples
- Report any breaking changes
```

**Slash Command:** `/search` invokes explorer + navigator.

---

### Writer

**Role:** Documentation and content creation specialist.

**Best For:**
- README files
- API documentation
- Code comments
- Technical articles

**Model:** `opencode/kimi-k2.5`

**Characteristics:**
- Clear writing
- Documentation structure
- Code examples
- User-focused content

**When to Delegate:**
```
Orxa: @writer — Create comprehensive README documentation for
the authentication module.

Required Tools: read, write

Must Do:
- Include installation instructions
- Document all public methods
- Provide usage examples
- Add troubleshooting section
```

**Slash Command:** `/docs` invokes writer.

---

### Multimodal

**Role:** Image and media analysis specialist.

**Best For:**
- Image analysis
- PDF processing
- Diagram interpretation
- Visual content

**Model:** `opencode/gemini-3-pro`

**Characteristics:**
- Vision capabilities
- Media understanding
- Visual analysis
- Batch processing (max 10 images)

**When to Delegate:**
```
Orxa: @multimodal — Analyze these UI mockup images and extract
the design specifications.

Required Tools: read (images)

Must Do:
- Extract color palette
- Identify typography
- List component requirements
- Note spacing/layout

Must Not Do:
- Process more than 10 images at once
```

**Batch Limit:** Maximum 10 images per delegation (enforced).

---

### Mobile Simulator

**Role:** iOS/Android simulator automation specialist.

**Best For:**
- Mobile testing
- Simulator automation
- Screenshot capture
- UI testing on devices

**Model:** `opencode/kimi-k2.5`

**Characteristics:**
- Simulator control
- Screenshot capture
- UI interaction
- Device testing

**When to Delegate:**
```
Orxa: @mobile-simulator — Test the login flow on iOS simulator
and capture screenshots of each step.

Required Tools: bash (agent-device), screenshot

Must Do:
- Launch the app in simulator
- Navigate through login flow
- Capture screenshots
- Report any UI issues
```

**Restriction:** Orxa cannot use mobile tools directly — must delegate.

---

### Orxa-Planner

**Role:** Parallel workstream planning agent for orchestration mode.

**Best For:**
- Analyzing complex multi-part tasks
- Creating parallel workstream specifications
- Breaking down large projects into concurrent workstreams
- Dependency analysis and execution ordering

**Model:** `opencode/gpt-5.2-codex`

**Characteristics:**
- Analyzes tasks for parallelization opportunities
- Creates structured workstream specifications
- Identifies dependencies between workstreams
- Optimizes for concurrent execution

**When to Delegate:**
```
Orxa: @orxa-planner — Analyze this feature request and create a parallel
workstream plan for implementation.

Required Tools: read, write

Must Do:
- Identify all components that can be worked on in parallel
- Define clear dependencies between workstreams
- Create structured specifications for each workstream
- Recommend optimal execution order
```

**Orchestration Mode Only:**
This agent is specifically designed for Orxa's orchestration mode (`/orchestrate`). It should only be invoked when Orxa needs to plan parallel execution of complex tasks.

**Output Format:**
Returns a structured plan with:
- Workstream definitions with unique IDs
- Dependency mappings
- Estimated complexity for each workstream
- Recommended agent assignments

---

### Orxa-Worker

**Role:** Parallel workstream execution agent for orchestration mode.

**Best For:**
- Executing individual workstreams in parallel
- Working in isolated git worktrees
- Handling concurrent implementation tasks
- Processing merge queue operations

**Model:** `opencode/kimi-k2.5`

**Characteristics:**
- Executes within isolated worktrees
- Reports progress to Orxa
- Handles merge conflict detection
- Works on assigned workstream only

**When to Delegate:**
```
Orxa: @orxa-worker — Execute workstream WS-001: Implement authentication
middleware in isolated worktree.

Required Tools: read, edit, write, bash, grep

Must Do:
- Work only within the assigned workstream scope
- Report progress and completion status
- Handle errors gracefully
- Prepare for merge to main worktree
```

**Orchestration Mode Only:**
This agent is specifically designed for Orxa's orchestration mode (`/orchestrate`). It executes workstreams in parallel git worktrees created by Orxa.

**Worktree Isolation:**
Each orxa-worker operates in a separate git worktree to enable true parallel execution without conflicts. Results are merged back via the merge queue.

---

## Agent Selection Guide

### Quick Reference Table

| Task Type                   | Primary Agent       | Alternative                      |
|-----------------------------|---------------------|----------------------------------|
| **Planning & Requirements** | `@plan`             | `@strategist` for risk analysis  |
| **Complex Implementation**  | `@build`            | `@architect` for design          |
| **Quick Fixes**             | `@coder`            | `@build` if scope grows          |
| **UI/UX Work**              | `@frontend`         | `@multimodal` for image analysis |
| **Code Review**             | `@reviewer`         | `@strategist` for risk review    |
| **Finding Code**            | `@explorer`         | `@navigator` for web research    |
| **Documentation**           | `@writer`           | `@librarian` for research        |
| **Git Operations**          | `@git`              | —                                |
| **Debugging**               | `@architect`        | `@explorer` for tracing          |
| **Testing Mobile**          | `@mobile-simulator` | —                                |

### Decision Flowchart

```
Is this a planning/research task?
├── YES → @plan (for comprehensive planning)
│         @strategist (for risk analysis)
│         @librarian (for documentation research)
│
└── NO → Is this about finding/exploring code?
          ├── YES → @explorer (codebase search)
          │         @navigator (web research)
          │
          └── NO → Is this implementation work?
                    ├── YES → How complex?
                    │         ├── Simple/single-file → @coder
                    │         ├── UI/UX focused → @frontend
                    │         ├── Multi-file/complex → @build
                    │         └── Architecture needed → @architect
                    │
                    └── NO → Is this review/validation?
                              ├── YES → @reviewer (plan/code review)
                              │
                              └── NO → Specialized task?
                                        ├── Documentation → @writer
                                        ├── Git operations → @git
                                        ├── Image analysis → @multimodal
                                        └── Mobile testing → @mobile-simulator
```

---

## Delegation Patterns

### The Standard Delegation Template

Every delegation must follow the 6-section template:

```markdown
## Task
What needs to be done

## Expected Outcome
What success looks like

## Required Tools
Which tools the subagent should use

## Must Do
Critical requirements

## Must Not Do
Explicit restrictions

## Context
Relevant background information
```

### Example Delegations

#### To Build Agent
```
Orxa: @build — Implement user authentication system

## Task
Create a complete authentication system with registration, login,
and password reset functionality.

## Expected Outcome
- Users can register with email/password
- Users can log in and receive JWT token
- Users can request password reset
- All endpoints have proper validation

## Required Tools
read, edit, write, bash, grep

## Must Do
- Use bcrypt for password hashing
- Implement JWT token generation
- Add input validation
- Create database migrations
- Write unit tests

## Must Not Do
- Skip error handling
- Hardcode secrets
- Break existing API contracts

## Context
We're using Express.js with PostgreSQL. Existing user table schema
is in src/db/schema.ts. JWT secret should come from env vars.
```

#### To Frontend Agent
```
Orxa: @frontend — Create login form component

## Task
Create a responsive login form component with email/password fields.

## Expected Outcome
- Functional login form component
- Input validation
- Error message display
- Loading state

## Required Tools
read, edit, write

## Must Do
- Use React Hook Form for validation
- Style with Tailwind CSS
- Include accessibility attributes
- Handle API errors gracefully

## Must Not Do
- Skip client-side validation
- Use inline styles
- Forget error handling

## Context
We're using React 18 with TypeScript. API endpoint is POST /api/auth/login.
Existing components are in src/components/. Follow the Button component pattern.
```

---

## Customizing Agents

### Primary Agent Overrides

Primary agents (`orxa`, `plan`) can only have their model changed:

```json
{
  "agent_overrides": {
    "orxa": {
      "model": "opencode/gpt-5.2-codex"
    },
    "plan": {
      "model": "opencode/kimi-k2.5"
    }
  }
}
```

### Subagent Overrides

Subagents can be fully customized via `~/.config/opencode/orxa/agents/overrides/`:

**Create `~/.config/opencode/orxa/agents/overrides/build.yaml`:**

```yaml
name: build
model: opencode/gpt-5.2-codex
temperature: 0.2
customInstructions: |
  Additional instructions appended to system prompt:
  - Always run the full test suite after changes
  - Prefer functional programming patterns
  - Document all public APIs
```

**Overrideable Properties:**

| Property             | Description                 |
|----------------------|-----------------------------|
| `model`              | Change the model            |
| `temperature`        | Adjust creativity (0.0-1.0) |
| `system_prompt`      | Replace entire prompt       |
| `customInstructions` | Append to existing prompt   |
| `allowedTools`       | Modify tool access          |
| `blockedTools`       | Add tool restrictions       |

---

## Creating Custom Agents

### Step 1: Create Agent YAML

Create a file in `~/.config/opencode/orxa/agents/custom/`:

```yaml
# ~/.config/opencode/orxa/agents/custom/database-expert.yaml
name: database-expert
description: Database schema and query optimization specialist
mode: subagent
model: opencode/gpt-5.2-codex
temperature: 0.3
system_prompt: |
  You are a database expert specializing in PostgreSQL and query optimization.
  
  ## Expertise
  - Schema design and normalization
  - Query optimization and indexing
  - Migration strategies
  - Performance tuning
  
  ## Rules
  1. Always consider query performance
  2. Recommend appropriate indexes
  3. Use transactions for data consistency
  4. Explain your recommendations
  
  ## Memory Protocol
  - No direct writes: you are forbidden from using supermemory add.
  - Provide Memory Recommendations for @orxa.

tools:
  - read
  - edit
  - write
  - bash
  - grep
```

### Step 2: Enable the Agent

Add to your `orxa.json`:

```json
{
  "enabled_agents": [
    "orxa",
    "plan",
    "database-expert",
    "build",
    "coder"
  ]
}
```

### Step 3: Use the Agent

```
Orxa: @database-expert — Optimize the slow query in src/db/queries.ts

## Task
The user reports that the getUserOrders query is taking 5+ seconds.
Optimize it for better performance.

## Expected Outcome
- Query execution time under 100ms
- Proper index recommendations
- Explanation of optimizations made

## Required Tools
read, edit, bash

## Must Do
- Analyze query execution plan
- Recommend appropriate indexes
- Rewrite query if needed
- Test the optimized query

## Must Not Do
- Skip testing the changes
- Recommend dropping existing indexes without analysis

## Context
We're using PostgreSQL 15. The query joins users, orders, and order_items tables.
```

---

## Troubleshooting

### Agent Not Responding

**Problem:** Delegation to agent doesn't work.

**Solutions:**
1. Verify agent is in `enabled_agents` list
2. Check agent YAML file exists
3. Validate YAML syntax
4. Check OpenCode logs

### Wrong Agent for Task

**Problem:** Agent doesn't seem suited for the delegated task.

**Solutions:**
1. Review agent selection guide
2. Check if task description is clear
3. Consider escalating to different agent
4. Provide more context in delegation

### Agent Using Wrong Tools

**Problem:** Agent tries to use tools it shouldn't have.

**Solutions:**
1. Specify `Required Tools` explicitly in delegation
2. Check `Must Not Do` section is clear
3. Verify agent YAML tool configuration
4. Use enforcement levels appropriately

### Custom Agent Not Loading

**Problem:** Custom agent doesn't appear in system.

**Solutions:**
1. Verify file is in `~/.config/opencode/orxa/agents/custom/`
2. Check YAML syntax with online validator
3. Ensure `name` field matches filename
4. Add to `enabled_agents` in config
5. Restart OpenCode

### Agent Override Not Working

**Problem:** Override settings not taking effect.

**Solutions:**
1. For primary agents: only `model` can be overridden
2. Check file is in correct overrides directory
3. Verify YAML syntax
4. Check for conflicting overrides
5. Restart OpenCode

---

## Related Documentation

- [CONFIGURATION.md](CONFIGURATION.md) — Configuration options
- [ARCHITECTURE.md](ARCHITECTURE.md) — How agents work internally
- [SLASH-COMMANDS.md](SLASH-COMMANDS.md) — Commands that invoke agents
- [guide/customizing-agents.md](guide/customizing-agents.md) — Step-by-step customization guide
