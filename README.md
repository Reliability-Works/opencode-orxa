<div align="center">

[![OpenCode Orxa](./.github/assets/oc-orxa.png)](https://github.com/yourusername/opencode-orxa)

</div>

<div align="center">

[![npm version](https://img.shields.io/npm/v/opencode-orxa?style=flat-square&color=369eff&logo=npm&logoColor=white)](https://www.npmjs.com/package/opencode-orxa)
[![npm downloads](https://img.shields.io/npm/dt/opencode-orxa?style=flat-square&color=ff6b35&logo=npm&logoColor=white)](https://www.npmjs.com/package/opencode-orxa)
[![License](https://img.shields.io/badge/license-MIT-white?style=flat-square&labelColor=black)](https://github.com/yourusername/opencode-orxa/blob/main/LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/yourusername/opencode-orxa?style=flat-square&color=ffcb47&logo=github&logoColor=black)](https://github.com/yourusername/opencode-orxa/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/yourusername/opencode-orxa?style=flat-square&color=ff80eb&logo=github&logoColor=black)](https://github.com/yourusername/opencode-orxa/issues)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

</div>

---

# OpenCode Orxa

**The Ultimate Agent Governance Layer for AI-Assisted Development**

OpenCode Orxa transforms your OpenCode experience into a disciplined, manager-led development workflow. Like a skilled engineering manager, the Orxa orchestrates a fleet of specialized agents—each with defined roles, strict permissions, and clear accountability.

**Stop hoping your AI assistant stays organized. Start commanding a coordinated dev team.**

---

## Table of Contents

- [OpenCode Orxa](#opencode-orxa)
  - [Why Orxa?](#why-orxa)
  - [Installation for Humans](#installation-for-humans)
  - [Installation for LLM Agents](#installation-for-llm-agents)
  - [Uninstallation](#uninstallation)
  - [Quick Start](#quick-start)
  - [Features](#features)
  - [Agent Fleet](#agent-fleet)
  - [Slash Commands](#slash-commands)
  - [Configuration](#configuration)
  - [Enforcement Rules](#enforcement-rules)
  - [Development](#development)
  - [License](#license)

---

## Why Orxa?

Traditional AI coding assistants are like having a brilliant but undisciplined developer who:
- Jumps between tasks without finishing them
- Makes changes without understanding the codebase
- Writes code that doesn't match your project's patterns
- Stops working when things get complex

**Orxa solves this through strict governance:**

1. **Manager-Led Workflow** — Only the Orxa can delegate. Subagents execute. No chaos.
2. **TODO-Driven Execution** — Tasks aren't optional. The Orxa ensures completion.
3. **Memory Authority** — Only the Orxa writes to project memory. Context stays consistent.
4. **Quality Gates** — Code must pass lint, type-check, tests, and build before marking complete.
5. **Specialized Subagents** — Each task goes to the right specialist: frontend, backend, architecture, research.

> "The Orxa plugin made our AI-assisted development actually predictable. No more half-finished refactors or mystery code changes and best of all, we can tweak the agent behaviour to our liking." — Early Adopter

---

## Installation for Humans

### Prerequisites

**⚠️ CRITICAL: OpenCode must be installed first.**

The Orxa is a plugin that extends OpenCode. If you haven't installed OpenCode yet:

```bash
# Install OpenCode first (required)
npm install -g opencode

# Or via Homebrew
brew install opencode

# Verify installation
opencode --version
```

### Install Orxa

```bash
# Install the plugin globally
npm install -g opencode-orxa
```

### What the Postinstall Script Does

When you run `npm install -g opencode-orxa`, the postinstall script automatically:

1. **Creates the orxa directory structure:**
   ```
   ~/.config/opencode/orxa/
   ├── orxa.json          # Main configuration
   ├── agents/
   │   ├── custom/            # Your custom agents
   │   └── overrides/         # Override built-in subagents
   └── schemas/
   ```

2. **Generates default `orxa.json`** with sensible defaults

3. **Copies agent YAML files** to `~/.config/opencode/orxa/agents/`
   - `orxa.yaml` (primary)
   - `plan.yaml` (primary)
   - 13 subagent YAMLs in `subagents/` subdirectory

4. **Registers the plugin** in `~/.config/opencode/opencode.json`

5. **Shows installation summary** with next steps

### Verify Installation

After installation, simply run:

```bash
opencode
```

**You should see the welcome toast:**

```
🎼 OpenCode Orxa v1.0.0
   Orxa agents loaded: 15
   Default agent: orxa
   Type /help for available commands
```

This confirms:
- ✅ Plugin is registered and active
- ✅ All 15 agents are loaded
- ✅ Orxa is the default agent
- ✅ No `--orxa` flag needed (automatic takeover)

### Alternative Installation Methods

```bash
# Using npx (no global install)
npx opencode-orxa init

# Using Bun
bun add -g opencode-orxa

# Via OpenCode Plugin Manager
opencode plugin install opencode-orxa
```

### Optional: Supermemory Plugin

The Orxa works great out of the box, but for **persistent memory across sessions** (remembering patterns, configs, and decisions), we recommend installing the supermemory plugin:

```bash
# Install supermemory (optional but recommended)
bunx opencode-supermemory@latest install --no-tui

# Get your API key from https://www.supermemory.ai
# Then configure it in ~/.config/opencode/supermemory.jsonc:
# { "apiKey": "sm_your_api_key_here" }
```

The init wizard will automatically detect supermemory and guide you through setup. If you choose not to install it, memory features will be gracefully disabled.

---

## Installation for LLM Agents

**If you're an LLM agent helping a user set up Orxa, follow this guide.**

### CRITICAL PREREQUISITE CHECK

**Before installing Orxa, you MUST verify the user has providers and models configured in their `~/.config/opencode/opencode.json`.**

The orxa plugin references models in its config, but those models must be AVAILABLE in OpenCode's main config first.

### Step-by-Step Setup

#### 1. Check Current OpenCode Configuration

```bash
# Check what's available in opencode.json
cat ~/.config/opencode/opencode.json | grep -A20 '"providers"'
```

You should see something like:
```json
"providers": {
  "openai": {
    "apiKey": "sk-..."
  },
  "anthropic": {
    "apiKey": "sk-ant-..."
  }
}
```

#### 2. Run the Interactive Setup Wizard

The easiest way to configure Orxa is with the interactive setup wizard:

```bash
npm install -g opencode-orxa
orxa init
```

The wizard will:
1. **Detect your existing OpenCode configuration** - Checks which providers are already set up
2. **Show authentication status** - Displays which providers are authenticated (✅) and which need setup (❌)
3. **Guide you through model selection** - Recommends optimal models for each role:
   - **Orxa Agent** (Orchestration): Best for reasoning and delegation
   - **Plan Agent** (Planning): Best for architecture and task breakdown
   - **Subagents** (Execution): Best for task implementation
4. **Configure specialized models** - Set different models for specific subagents (build, architect, frontend, multimodal)
5. **Provide authentication instructions** - If any providers need auth, shows exact commands to run

**Example wizard flow:**
```
🔍 OpenCode Configuration
✅ Authenticated providers: opencode, anthropic
❌ Needs authentication: openai

🎯 Select Model for Orxa (Orchestration)
1. ✅ Kimi K2.5 - Excellent reasoning, large context window
2. ✅ Claude 3 Opus - Superior reasoning and instruction following
3. ⚠️ GPT-4 - Strong general capabilities (requires auth)

📐 Select Model for Plan Agent (Planning)
...

🔧 Select Default Model for Subagents (Execution)
...

🔐 Authentication Required:
❌ openai - Not authenticated
   Run: opencode auth login
   Then select: OpenAI

✅ Configuration saved to ~/.config/opencode/orxa/orxa.json
```

#### 3. Manual Configuration (Alternative)

If you prefer manual setup, edit `~/.config/opencode/orxa/orxa.json`:

```json
{
  "orxa": {
    "model": "opencode/kimi-k2.5"
  },
  "enabled_agents": [
    "orxa",
    "plan",
    "strategist",
    "reviewer",
    "build",
    "coder",
    "frontend",
    "architect",
    "git",
    "explorer",
    "librarian",
    "navigator",
    "writer",
    "multimodal",
    "mobile-simulator"
  ]
}
```

#### 6. Test Installation

```bash
opencode
```

**Expected output:**
```
🎼 OpenCode Orxa v1.0.0
   Orxa agents loaded: 15
   Default agent: orxa
```

### Example Model Configuration Workflow

```bash
# 1. Check current opencode.json providers
cat ~/.config/opencode/opencode.json | jq '.providers'

# 2. If needed, authenticate missing providers
opencode auth login
# Then select your provider(s) from the interactive menu

# 3. Install orxa
npm install -g opencode-orxa

# 4. Configure orxa with available models
cat > ~/.config/opencode/orxa/orxa.json << 'EOF'
{
  "orxa": {
    "model": "opencode/kimi-k2.5",
    "enforcement": {
      "delegation": "strict",
      "todoCompletion": "strict",
      "qualityGates": "strict",
      "memoryAutomation": "strict"
    }
  },
  "enabled_agents": ["orxa", "plan", "build", "coder", "frontend", "architect", "git", "explorer"]
}
EOF

# 5. Verify
opencode --version
```

### Troubleshooting for LLM Agents

**Issue: "Model not found" errors**
- The model specified in orxa.json doesn't exist in opencode.json providers
- Solution: Check available models with `opencode models list`

**Issue: Plugin not loading**
- Check if plugin is registered: `cat ~/.config/opencode/opencode.json | jq '.plugins'`
- Should contain `"opencode-orxa"`

**Issue: Agents not appearing**
- Check agent files exist: `ls ~/.config/opencode/orxa/agents/`
- Should see orxa.yaml, plan.yaml, and subagents/ directory

---

## Uninstallation

To completely remove OpenCode Orxa:

### 1. Remove the Plugin from OpenCode Config

```bash
# Using jq
jq '.plugins = [.plugins[] | select(. != "opencode-orxa")]' \
    ~/.config/opencode/opencode.json > /tmp/oc.json && \
    mv /tmp/oc.json ~/.config/opencode/opencode.json

# Or manually edit the file and remove "opencode-orxa" from the plugins array
```

### 2. Remove Orxa Configuration Files

```bash
# Remove orxa directory (optional - removes all configs and custom agents)
rm -rf ~/.config/opencode/orxa/

# Or keep configs and just disable
# mv ~/.config/opencode/orxa ~/.config/opencode/orxa.backup
```

### 3. Uninstall the NPM Package

```bash
npm uninstall -g opencode-orxa
```

### 4. Verify Removal

```bash
opencode
```

The welcome toast should no longer show "🎼 OpenCode Orxa" and you should see your original OpenCode agents.

---

## Quick Start

Once installed, using Orxa is simple:

```bash
# Just run opencode normally - Orxa takes over automatically
opencode
```

### Your First Delegation

```
You: Create a React component for a user profile card

Orxa: I'll delegate this to the frontend specialist.

[Orxa creates a TODO list and delegates to @frontend]

@frontend: I'll create a polished user profile card component...
[Works on the task]

Orxa: ✅ Frontend task complete. The component is ready at src/components/UserProfileCard.tsx
```

### Using Slash Commands

```
/validate          # Auto-invoke strategist + reviewer on current plan
/refactor src/...  # Intelligent refactoring
/test src/...      # Generate comprehensive tests
/commit            # Smart git commit with atomic splitting
```

---

## Features

### Core Governance Features

| Feature                      | Description                                  | Impact                       |
|------------------------------|----------------------------------------------|------------------------------|
| **Orxa-Only Delegation**     | Only orxa can use `delegate_task`            | Prevents agent chaos         |
| **TODO Completion Enforcer** | Blocks orxa from stopping with pending TODOs | Ensures task completion      |
| **Memory Authority**         | Only orxa writes to supermemory              | Consistent context           |
| **Quality Gates**            | Lint, type-check, test, build must pass      | Higher code quality          |
| **Plan-Only Writes**         | Orxa only edits `.orxa/plans/*.md`           | Clean separation of concerns |
| **6-Section Delegation**     | Standardized delegation template             | Clear task definitions       |
| **Multimodal Limits**        | Max 10 images per delegation                 | Prevents context overload    |
| **Mobile Tool Block**        | Orxa can't use simulators directly           | Proper delegation chain      |

### Agent Orchestration

- **15 Specialized Agents** — From frontend to architecture to mobile testing
- **Automatic Escalation** — Failed tasks escalate to senior agents
- **Parallel Execution** — Multiple subagents work simultaneously
- **Context Hygiene** — Smart summarization prevents context bloat

### Developer Experience

- **Slash Commands** — 9 built-in commands for common workflows
- **AGENTS.md Injection** — Auto-injects context from AGENTS.md files
- **Comment Checker** — Warns on excessive AI-generated comments
- **Session Checkpoints** — Automatic continuity across sessions

---

## Agent Fleet

### Primary Agents

These agents orchestrate the workflow:

| Agent    | Role                                                                     | Model Override Only |
|----------|--------------------------------------------------------------------------|---------------------|
| **orxa** | Engineering Manager — delegates all work, maintains TODOs, writes memory | ✅ Yes               |
| **plan** | Product Manager — creates work plans, does research, never writes code   | ✅ Yes               |

### Subagents

Specialized workers that can be fully customized:

| Agent                | Specialty                               | Can Override                      |
|----------------------|-----------------------------------------|-----------------------------------|
| **strategist**       | Risk analysis before planning           | Model, prompt, tools, temperature |
| **reviewer**         | Ruthless plan/code reviewer             | Model, prompt, tools, temperature |
| **build**            | Senior Lead Engineer — complex features | Model, prompt, tools, temperature |
| **coder**            | Quick backend/logic specialist          | Model, prompt, tools, temperature |
| **frontend**         | UI/UX specialist                        | Model, prompt, tools, temperature |
| **architect**        | Architecture decisions & debugging      | Model, prompt, tools, temperature |
| **git**              | Git operations specialist               | Model, prompt, tools, temperature |
| **explorer**         | Codebase search & navigation            | Model, prompt, tools, temperature |
| **librarian**        | Research & documentation                | Model, prompt, tools, temperature |
| **navigator**        | Web browsing & external research        | Model, prompt, tools, temperature |
| **writer**           | Documentation & prose                   | Model, prompt, tools, temperature |
| **multimodal**       | Image/PDF analysis                      | Model, prompt, tools, temperature |
| **mobile-simulator** | iOS/Android testing                     | Model, prompt, tools, temperature |

### Customizing Subagents

Create override files in `~/.config/opencode/orxa/agents/overrides/`:

```yaml
# ~/.config/opencode/orxa/agents/overrides/strategist.yaml
name: strategist
model: anthropic/claude-opus
description: Ultra-cautious risk analyzer
system_prompt: |
  You are a paranoid security-focused strategist...
temperature: 0.2
```

**Note:** Primary agents (orxa, plan) can only have their `model` changed to preserve enforcement integrity.

---

## Slash Commands

Type `/command-name` to invoke powerful workflows:

### Built-in Commands

| Command     | Aliases        | Description                                        | Delegates To            |
|-------------|----------------|----------------------------------------------------|-------------------------|
| `/validate` | `/v`, `/check` | Validate plan with risk analysis + review          | @strategist + @reviewer |
| `/refactor` | `/rf`          | Intelligent refactoring with architecture analysis | @architect + @build     |
| `/explain`  | `/ex`, `/exp`  | Explain code, architecture, or concepts            | @librarian              |
| `/test`     | `/t`           | Generate comprehensive tests                       | @build + @coder         |
| `/debug`    | `/dbg`, `/fix` | Debug issues and trace code flow                   | @architect + @explorer  |
| `/commit`   | `/c`, `/git`   | Smart git commits with atomic splitting            | @git                    |
| `/docs`     | `/d`, `/doc`   | Generate documentation                             | @writer                 |
| `/search`   | `/s`, `/find`  | Search codebase and web                            | @explorer + @navigator  |
| `/review`   | `/r`, `/cr`    | Code review with architecture analysis             | @reviewer + @architect  |

### Command Examples

```bash
# Validate before executing
/validate

# Refactor code
/refactor src/components/Button.tsx

# Explain complex code
/explain the authentication middleware

# Generate tests
/test src/utils/helpers.ts

# Debug an issue
/debug why the login is failing

# Smart git commit
/commit "Add user authentication"

# Generate docs
/docs the API module

# Search everything
/search how authentication works

# Code review
/review src/api/routes.ts
```

### Custom Commands

Create custom commands in:
```
~/.config/opencode/orxa/commands/my-command.yaml
```

Example:
```yaml
name: deploy
description: Deploy to production
aliases: [d]
---
When invoked, this command will:
1. Run tests
2. Build the project
3. Deploy to production
4. Verify deployment
```

---

## Orxa Orchestration Mode

Orxa Orchestration Mode enables **parallel multi-agent execution** for complex tasks. Similar to oh-my-opencode's ultrawork, but designed for parallel workstreams with git worktrees.

### What is Orxa Orchestration?

When you prefix your request with `orxa`, the conductor:

1. **Analyzes** your request using the strategist agent
2. **Breaks** it into independent workstreams with dependency graphs
3. **Creates** git worktrees for each workstream (`orxa-1`, `orxa-2`, `orxa-3`...)
4. **Delegates** each workstream to parallel subagents
5. **Polls** the merge queue (`~/.orxa-queue/`)
6. **Cherry-picks** completed work back to main
7. **Resolves** conflicts automatically or delegates to architect

### Usage Examples

```bash
# Parallel authentication implementation
orxa implement authentication with login, signup, oauth

# Parallel API development
orxa create REST API for users, posts, and comments with full CRUD

# Parallel UI components
orxa build dashboard with sidebar, header, charts, and data tables

# Parallel feature implementation
orxa add search, filtering, and pagination to the product list
```

### How It Works

```
User Request: "orxa implement auth with login, signup, oauth"
                    ↓
┌─────────────────────────────────────────────────────────────┐
│  STRATEGIST AGENT                                           │
│  Breaks task into workstreams with dependencies             │
│                                                             │
│  Workstream 1: Login (no deps)                              │
│  Workstream 2: Signup (no deps)                             │
│  Workstream 3: OAuth (depends on Workstream 1)              │
└─────────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────┐
│  WORKTREE CREATION                                          │
│  git worktree add ../orxa-1 orxa/auth-login                 │
│  git worktree add ../orxa-2 orxa/auth-signup                │
│  git worktree add ../orxa-3 orxa/auth-oauth                 │
└─────────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────┐
│  PARALLEL EXECUTION (max 5 concurrent)                      │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ orxa-worker  │  │ orxa-worker  │  │ orxa-worker  │      │
│  │ (login)      │  │ (signup)     │  │ (oauth)      │      │
│  │              │  │              │  │ [waiting]    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│        ↓                  ↓                  ↓              │
│   Commit: abc123     Commit: def456     Commit: ghi789      │
└─────────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────┐
│  MERGE QUEUE (~/.orxa-queue/)                               │
│  FIFO processing with cherry-pick                           │
│                                                             │
│  1. Cherry-pick abc123 → main ✓                            │
│  2. Cherry-pick def456 → main ✓                            │
│  3. Cherry-pick ghi789 → main ⚠️ (conflict)                 │
│     → Delegate to architect for resolution                  │
└─────────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────┐
│  CLEANUP                                                    │
│  git worktree remove orxa-1                                 │
│  git worktree remove orxa-2                                 │
│  git worktree remove orxa-3                                 │
└─────────────────────────────────────────────────────────────┘
                    ↓
         🎉 ORXA ORCHESTRATION COMPLETE!
```

### Configuration

Add to your `~/.config/opencode/orxa/orxa.json`:

```json
{
  "orchestration": {
    "enabled": true,
    "max_parallel_workstreams": 5,
    "queue_directory": "~/.orxa-queue",
    "auto_merge": true,
    "conflict_resolution_agent": "architect",
    "worktree_prefix": "orxa",
    "cleanup_worktrees": true,
    "require_merge_approval": false,
    "workstream_timeout_minutes": 120,
    "retry_failed_workstreams": false,
    "max_retries": 2,
    "queue_poll_interval_ms": 5000
  }
}
```

### Orchestration Options

| Option                       | Description                              | Default         |
|------------------------------|------------------------------------------|-----------------|
| `enabled`                    | Enable Orxa orchestration mode           | `true`          |
| `max_parallel_workstreams`   | Maximum concurrent workstreams           | `5`             |
| `queue_directory`            | Path to merge queue directory            | `~/.orxa-queue` |
| `auto_merge`                 | Automatically cherry-pick completed work | `true`          |
| `conflict_resolution_agent`  | Agent to handle merge conflicts          | `architect`     |
| `worktree_prefix`            | Prefix for worktree names                | `orxa`          |
| `cleanup_worktrees`          | Remove worktrees after merge             | `true`          |
| `require_merge_approval`     | Require user approval before merge       | `false`         |
| `workstream_timeout_minutes` | Timeout per workstream                   | `120`           |
| `retry_failed_workstreams`   | Retry failed workstreams                 | `false`         |
| `max_retries`                | Maximum retry attempts                   | `2`             |
| `queue_poll_interval_ms`     | Queue polling interval                   | `5000`          |

### Best Practices

1. **Use for complex, multi-part tasks** — Orxa shines when work can be parallelized
2. **Ensure good test coverage** — Parallel workstreams need reliable tests
3. **Define clear boundaries** — Workstreams should be as independent as possible
4. **Monitor the queue** — Check `~/.orxa-queue/` for pending merges
5. **Review conflicts** — Architect agent handles conflicts, but review its resolutions

---

## Configuration

Config file location:
`~/.config/opencode/orxa/orxa.json`

Directory structure:

```
~/.config/opencode/orxa/
├── orxa.json          # Main configuration
├── agents/
│   ├── custom/            # Your custom agents
│   └── overrides/         # Override built-in subagents
└── schemas/
```

### Quick Example

```json
{
  "enabled_agents": ["orxa", "plan", "build", "coder"],
  "agent_overrides": {
    "coder": { "model": "openai/gpt-5.2-codex" }
  },
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

### Configuration Options

#### Agent Management

**enabled_agents** (string[])
- Which agents are available for use
- Default: All 15 built-in agents
- Example: `["orxa", "plan", "build", "coder"]`

**disabled_agents** (string[])
- Agents to explicitly disable
- Default: `[]`
- Example: `["strategist", "reviewer"]`

**agent_overrides** (object)
- Override settings for specific agents in `orxa.json`
- Primary agents (orxa, plan): `model` only
- Subagents: `model`, `system_prompt`, `description`, `temperature`, `tools`, etc.
- Default: `{}` with opinionated defaults in `subagents.overrides`
- Example:
```json
{
  "strategist": {
    "model": "anthropic/claude-opus",
    "system_prompt": "Custom prompt..."
  }
}
```

**custom_agents** (object[])
- Inline JSON definitions for custom agents (alternative to YAML files)
- Default: `[]`
- Impact: Adds new agents to the fleet at startup

#### Orxa Settings

**orxa.model** (string)
- Which LLM the Orxa uses
- Default: `"opencode/kimi-k2.5"`
- Impact: Affects Orxa's reasoning and delegation decisions

**orxa.enforcement** (object)
Controls how strictly the plugin enforces rules:

- **delegation**: `"strict"` | `"warn"` | `"off"`
  - `"strict"`: Block non-Orxa agents from delegating
  - `"warn"`: Allow but show warning
  - `"off"`: No enforcement
  - Default: `"strict"`

- **todoCompletion**: `"strict"` | `"warn"` | `"off"`
  - `"strict"`: Orxa cannot stop or ask for next steps while TODOs are pending.
    Automatically injects reminders to continue working.
  - `"warn"`: Warn when Orxa tries to stop with pending TODOs, but allow it
  - `"off"`: No enforcement
  - Default: `"strict"`
  - Impact: Prevents the Orxa from delegating and then stopping before TODOs are complete

- **qualityGates**: `"strict"` | `"warn"` | `"off"`
  - `"strict"`: Block if lint/type-check/tests/build fail
  - `"warn"`: Show warnings but allow
  - `"off"`: No enforcement
  - Default: `"strict"`

- **memoryAutomation**: `"strict"` | `"warn"` | `"off"`
  - `"strict"`: Block subagents from using `supermemory add`
  - `"warn"`: Allow but warn
  - `"off"`: No enforcement
  - Default: `"strict"`

**orxa.allowedTools** (string[])
- Tools the Orxa is allowed to use
- Default: `["read", "delegate_task", "todowrite", "todoread", "supermemory", "edit", "write"]`
- Impact: Any tool not listed is blocked for the Orxa

**orxa.blockedTools** (string[])
- Tools explicitly blocked for the Orxa
- Default: `["grep", "glob", "bash", "skill"]`
- Impact: Blocks high-risk tools even if allowed by other rules

**orxa.maxManualEditsPerSession** (number)
- Maximum manual edits Orxa can make before being blocked
- Default: `0` (Orxa cannot edit files, only delegate)
- Set to higher number to allow some manual edits (not recommended)

**orxa.requireTodoList** (boolean)
- Whether Orxa must maintain a TODO list
- Default: `true`
- Impact: Enforces TODO-driven workflow

**orxa.autoUpdateTodos** (boolean)
- Whether to auto-update TODOs after delegations
- Default: `false`

**orxa.planWriteAllowlist** (string[])
- File globs that Orxa/Plan may write to
- Default: `[".orxa/plans/*.md"]`

**orxa.blockMobileTools** (boolean)
- Block iOS/Android simulator tools for Orxa
- Default: `true`

#### Subagent Defaults

**subagents.defaults.model** (string)
- Default model for subagents
- Default: `"opencode/kimi-k2.5"`

**subagents.defaults.timeout** (number)
- Timeout in milliseconds for subagent tasks
- Default: `120000` (2 minutes)

**subagents.defaults.maxRetries** (number)
- Max retries for subagent tasks
- Default: `2`

**subagents.overrides** (object)
- Per-subagent JSON overrides (model/timeout/retries/customInstructions)
- Default: Built-in overrides for build/architect/frontend/multimodal

**subagents.custom** (object[])
- Inline subagent definitions (name, description, model, instructions, allowedTools)
- Default: `[]`

#### Quality Gates

**qualityGates.requireLint** (boolean)
- Require linting to pass before marking TODO complete
- Default: `true`

**qualityGates.requireTypeCheck** (boolean)
- Require TypeScript type checking to pass
- Default: `true`

**qualityGates.requireTests** (boolean)
- Require tests to pass
- Default: `true`

**qualityGates.requireBuild** (boolean)
- Require build to succeed
- Default: `true`

**qualityGates.requireLspDiagnostics** (boolean)
- Require LSP diagnostics to be clean
- Default: `true`

**qualityGates.customValidators** (object[])
- Additional commands to run as gates (`name`, `command`, `required`)
- Default: `[]`

#### Memory Settings

**memory.autoExtract** (boolean)
- Automatically extract memories from subagent responses
- Default: `true`

**memory.extractPatterns** (string[])
- Regex patterns that trigger auto-extraction
- Default: `["bug.*fix", "solution.*", "decided.*", "pattern.*", "config.*"]`

**memory.requiredTypes** (string[])
- Memory categories that are always considered for extraction
- Default: `["error-solution", "learned-pattern", "project-config", "architecture"]`

**memory.sessionCheckpointInterval** (number)
- Inject checkpoint reminder every N messages
- Default: `20`

#### Governance

**governance.onlyOrxaCanDelegate** (boolean)
- Enforce Orxa-only delegation
- Default: `true`

**governance.blockSupermemoryAddForSubagents** (boolean)
- Prevent subagents from writing to memory
- Default: `true`

**governance.delegationTemplate.required** (boolean)
- Require the delegation template format
- Default: `true`

**governance.delegationTemplate.requiredSections** (string[])
- Section headers required in every delegation
- Default: `["Task", "Expected Outcome", "Required Tools", "Must Do", "Must Not Do", "Context"]`

**governance.delegationTemplate.maxImages** (number)
- Max images allowed per delegation
- Default: `10`

**governance.delegationTemplate.requireSameSessionId** (boolean)
- Enforce delegations to stay within the same session
- Default: `true`

**governance.delegationTemplate.contextHygiene.maxToolOutputChars** (number)
- Maximum tool output characters allowed in delegation context
- Default: `4000`

**governance.delegationTemplate.contextHygiene.summaryHeader** (string)
- Header used for the summary section
- Default: `"Summary"`

**governance.delegationTemplate.contextHygiene.requireSummary** (boolean)
- Require summary section in delegations
- Default: `true`

#### Escalation

**escalation.enabled** (boolean)
- Enable escalation chain between agents
- Default: `true`

**escalation.maxAttemptsPerAgent** (number)
- Max attempts before escalating to the next agent
- Default: `2`

**escalation.escalationMatrix** (object)
- Map of agent → next agent for escalation
- Default: `{ "coder": "build", "build": "architect", "explorer": "librarian" }`

**escalation.requireExplicitHandoff** (boolean)
- Require explicit handoff messaging when escalating
- Default: `true`

#### UI + Logging

**ui.showDelegationWarnings** (boolean)
- Show warnings when delegation rules are violated
- Default: `true`

**ui.showTodoReminders** (boolean)
- Show reminders about pending TODOs
- Default: `true`

**ui.showMemoryConfirmations** (boolean)
- Show confirmation prompts for memory captures
- Default: `true`

**ui.verboseLogging** (boolean)
- Enable verbose logging
- Default: `true`

#### Tooling + Compatibility

**toolAliases.resolve** (object)
- Map tool aliases to canonical tool names
- Default: `{ "apply_patch": "edit", "write_to_file": "write", "replace_file_content": "write", "multi_replace_file_content": "write", "task": "delegate_task" }`

**perAgentRestrictions** (object)
- Per-agent tool restrictions (allowedTools/blockedTools/maxAttachments)
- Default: `{}`

**mcp** (object)
- MCP configuration passthrough
- Default: `{}`

#### Orxa Orchestration

**orchestration.enabled** (boolean)
- Enable Orxa parallel orchestration mode
- Default: `true`

**orchestration.max_parallel_workstreams** (number)
- Maximum number of concurrent workstreams
- Default: `5`

**orchestration.queue_directory** (string)
- Directory for the merge queue
- Default: `"~/.orxa-queue"`

**orchestration.auto_merge** (boolean)
- Automatically cherry-pick completed workstreams
- Default: `true`

**orchestration.conflict_resolution_agent** (string)
- Agent to delegate merge conflicts to
- Default: `"architect"`

**orchestration.worktree_prefix** (string)
- Prefix for git worktree names
- Default: `"orxa"`

**orchestration.cleanup_worktrees** (boolean)
- Remove worktrees after successful merge
- Default: `true`

**orchestration.require_merge_approval** (boolean)
- Require user approval before merging
- Default: `false`

**orchestration.workstream_timeout_minutes** (number)
- Timeout for individual workstreams
- Default: `120`

**orchestration.retry_failed_workstreams** (boolean)
- Automatically retry failed workstreams
- Default: `false`

**orchestration.max_retries** (number)
- Maximum retry attempts for failed workstreams
- Default: `2`

**orchestration.queue_poll_interval_ms** (number)
- Queue polling interval in milliseconds
- Default: `5000`

#### Custom Agents (YAML)

Custom agents and overrides can also be defined via YAML files:

- Custom agents: `~/.config/opencode/orxa/agents/custom/*.yaml`
- Overrides: `~/.config/opencode/orxa/agents/overrides/*.yaml`

Primary agents (orxa, plan) can only override `model` to preserve enforcement integrity.

---

## Enforcement Rules

1. **Only Orxa can delegate**: All `delegate_task` calls from subagents are blocked
2. **No grep/glob for Orxa**: Search operations must be delegated to Plan agent
3. **Memory writes are Orxa-only**: Subagents provide Memory Recommendations instead
4. **Plan-only writes**: Orxa can only write to `.orxa/plans/*.md`
5. **6-section delegation template**: All delegations must include Task, Expected Outcome, Required Tools, Must Do, Must Not Do, Context
6. **Multimodal batch limit**: Max 10 images per delegation
7. **Mobile tool block**: Orxa cannot use ios-simulator tools directly

---

## CLI

```bash
orxa init        # Interactive setup wizard
orxa install     # Enable/disable agents
orxa doctor      # Validate configuration
orxa config      # Open config in editor
```

---

## Additional Features

### Comment Checker

Automatically warns when code has excessive comments:
- **Warning** at >30% comment-to-code ratio
- **Error** at >50% ratio

Good code is self-documenting!

### AGENTS.md Auto-Injection

When reading files, automatically injects relevant AGENTS.md context:
```
src/components/Button.tsx
├── src/components/AGENTS.md  (injected)
├── src/AGENTS.md             (injected)
└── AGENTS.md                 (injected)
```

Create AGENTS.md files in directories to provide context for that section of the codebase.

---

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Test
npm test

# Type check
npm run typecheck
```

---

## License

MIT

---

<div align="center">

**Made with ❤️ for the OpenCode community**

[Report Bug](https://github.com/yourusername/opencode-orxa/issues) · [Request Feature](https://github.com/yourusername/opencode-orxa/issues) · [Documentation](https://github.com/yourusername/opencode-orxa/tree/main/docs)

</div>
