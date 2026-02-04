<div align="center">

[![OpenCode Orxa](./.github/assets/oc-orxa.png)](https://github.com/Reliability-Works/opencode-orxa)

</div>

<div align="center">

[![npm version](https://img.shields.io/npm/v/@reliabilityworks/opencode-orxa?style=flat-square&color=369eff&logo=npm&logoColor=white)](https://www.npmjs.com/package/@reliabilityworks/opencode-orxa)
[![npm downloads](https://img.shields.io/npm/dt/@reliabilityworks/opencode-orxa?style=flat-square&color=ff6b35&logo=npm&logoColor=white)](https://www.npmjs.com/package/@reliabilityworks/opencode-orxa)
[![License](https://img.shields.io/badge/license-SUL--1.0-white?style=flat-square&labelColor=black)](https://github.com/yourusername/opencode-orxa/blob/main/LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/Reliability-Works/opencode-orxa?style=flat-square&color=ffcb47&logo=github&logoColor=black)](https://github.com/Reliability-Works/opencode-orxa/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/Reliability-Works/opencode-orxa?style=flat-square&color=ff80eb&logo=github&logoColor=black)](https://github.com/Reliability-Works/opencode-orxa/issues)
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
  - [Installation](#installation)
    - [For Humans](#installation-for-humans)
      - [Prerequisites](#prerequisites)
      - [Install Orxa](#install-orxa)
      - [What the Postinstall Script Does](#what-the-postinstall-script-does)
      - [Verifying Installation](#verifying-installation)
      - [Verify Installation (Runtime)](#verify-installation-runtime)
    - [For LLM Agents](#installation-for-llm-agents)
    - [Uninstallation](#uninstallation)
  - [Quick Start](#quick-start)
  - [Features](#features)
  - [Agent Fleet](#agent-fleet)
  - [Slash Commands](#slash-commands)
  - [Orxa Orchestration Mode](#orxa-orchestration-mode)
  - [Configuration](#configuration)
  - [Bundled MCPs](#bundled-mcps)
  - [Bundled Skills](#bundled-skills)
  - [Enforcement Rules](#enforcement-rules)
  - [CLI](#cli)
  - [Additional Features](#additional-features)
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

## Installation

### For Humans

### Prerequisites

**⚠️ CRITICAL: OpenCode must be installed first.**

The Orxa is a plugin that extends OpenCode. If you haven't installed OpenCode yet, follow the installation instructions at:

👉 **[OpenCode Installation Guide](https://github.com/anomalyco/opencode)**

Once OpenCode is installed, verify it's working:

```bash
opencode --version
```

### Install Orxa

```bash
# Install the plugin globally
npm install -g @reliabilityworks/opencode-orxa
```

> **Note:** npm v7+ suppresses postinstall script output by default during global installs. The installation IS working (config files are created, plugin is registered), but you won't see the output unless you use the `--foreground-scripts` flag.

#### To See Full Installation Output

```bash
# Install with visible output (npm v7+)
npm install -g @reliabilityworks/opencode-orxa --foreground-scripts
```

### What the Postinstall Script Does

When you run `npm install -g @reliabilityworks/opencode-orxa`, the postinstall script automatically:

1. **Creates the orxa directory structure:**
   ```
   ~/.config/opencode/orxa/
   ├── orxa.json          # Main configuration
   └── agents/
       ├── custom/            # Your custom agents
       ├── overrides/         # Override built-in subagents
       └── subagents/         # Built-in subagents (copied from plugin)
   ```

2. **Generates default `orxa.json`** with sensible defaults

3. **Copies subagent YAML files** to `~/.config/opencode/orxa/agents/subagents/`
   - 14 subagent YAMLs (strategist, reviewer, build, coder, frontend, architect, git, explorer, librarian, navigator, writer, multimodal, mobile-simulator, orxa-worker)
   
   > **Note:** Primary agents (`orxa.yaml` and `plan.yaml`) are built into the plugin and loaded directly from the package. They are not copied to your config directory.

4. **Registers the plugin** in `~/.config/opencode/opencode.json`

5. **Shows installation summary** with next steps

> **Note:** On npm v7+, you may not see the installation summary output due to output suppression. The script is still running and completing all these steps—verify by checking the files exist (see [Verifying Installation](#verifying-installation) below).

**Agent Loading Priority:**
When OpenCode loads agents, it checks in this order:
1. **Custom** (`agents/custom/`) - Your entirely new agents
2. **Overrides** (`agents/overrides/`) - Your modifications to built-in agents
3. **Built-in** (`agents/subagents/`) - Default agents copied from the plugin

**Why use overrides?** If you edit files directly in `subagents/`, your changes will be lost when you update the plugin. Instead, copy the agent file to `overrides/` and edit it there - your customizations will persist across updates.

---

### Verifying Installation

If you didn't see installation output (common with npm v7+), verify the installation completed successfully:

#### 1. Check Configuration Files Exist

```bash
# List the Orxa configuration directory
ls -la ~/.config/opencode/orxa/
```

**Expected output:**
```
drwxr-xr-x  5 user  staff   160 Jan 30 10:00 .
drwxr-xr-x  3 user  staff    96 Jan 30 10:00 ..
-rw-r--r--  1 user  staff  2048 Jan 30 10:00 orxa.json
drwxr-xr-x  5 user  staff   160 Jan 30 10:00 agents
```

#### 2. Check Agent Files Were Copied

```bash
# List all agent files
ls -la ~/.config/opencode/orxa/agents/
ls ~/.config/opencode/orxa/agents/subagents/
```

**Expected output:**
```
# agents/ directory:
drwxr-xr-x  5 user  staff   160 Jan 30 10:00 .
drwxr-xr-x  3 user  staff    96 Jan 30 10:00 ..
drwxr-xr-x  2 user  staff    64 Jan 30 10:00 custom
drwxr-xr-x  2 user  staff    64 Jan 30 10:00 overrides
drwxr-xr-x  2 user  staff    64 Jan 30 10:00 subagents

# subagents/ directory (14 YAML files):
architect.yaml    coder.yaml        explorer.yaml     git.yaml
librarian.yaml    mobile-simulator.yaml  multimodal.yaml
navigator.yaml    reviewer.yaml     strategist.yaml
writer.yaml       build.yaml        frontend.yaml     orxa-worker.yaml
```

#### 3. Verify Plugin Registration

```bash
# Check if plugin is registered in OpenCode config
cat ~/.config/opencode/opencode.json | grep -A5 '"plugin"'
```

**Expected output:**
```json
"plugin": [
  "@reliabilityworks/opencode-orxa"
]
```

#### 4. Check Orxa Configuration

```bash
# Verify orxa.json was created with default settings
cat ~/.config/opencode/orxa/orxa.json | head -20
```

**Expected output:**
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
  },
  "enabled_agents": [
    "orxa",
    "plan",
    "strategist",
    ...
```

#### 5. Quick Verification Command

Run this one-liner to verify all components:

```bash
echo "=== Checking Orxa Installation ===" && \
echo "✓ Config directory:" && ls ~/.config/opencode/orxa/ 2>/dev/null && echo && \
echo "✓ Agent files:" && ls ~/.config/opencode/orxa/agents/subagents/ 2>/dev/null | wc -l && echo "agent files found" && echo && \
echo "✓ Plugin registration:" && grep -o "@reliabilityworks/opencode-orxa" ~/.config/opencode/opencode.json 2>/dev/null && echo && \
echo "=== Installation Verified ==="
```

> **Note:** OpenCode uses `"plugin"` (singular) not `"plugins"` in the configuration file.

**If all checks pass,** your installation is complete! Proceed to [Verify Installation (Runtime)](#verify-installation-runtime) below.

**If files are missing,** try reinstalling with visible output:
```bash
npm uninstall -g @reliabilityworks/opencode-orxa
npm install -g @reliabilityworks/opencode-orxa --foreground-scripts
```

---

### Verify Installation (Runtime)

After confirming the files are in place (see [Verifying Installation](#verifying-installation) above), test the runtime:

```bash
opencode
```

**You should see the welcome toast:**

```
🎼 OpenCode Orxa Initialized

Workforce orchestration enabled. Managing agents...
Type /help for available commands or start delegating tasks.
```

This confirms:
- ✅ Plugin is registered and active
- ✅ All 15 agents are loaded
- ✅ Orxa is the default agent
- ✅ No `--orxa` flag needed (automatic takeover)

**If you don't see the welcome toast:**
1. Check that OpenCode is installed: `opencode --version`
2. Verify the plugin is registered: `cat ~/.config/opencode/opencode.json | grep plugin`
3. Try restarting your terminal or running `hash -r` (to refresh the command cache)

---

### Alternative Installation Methods

```bash
# Using npx (no global install)
npx @reliabilityworks/opencode-orxa init

# Using Bun
bun add -g @reliabilityworks/opencode-orxa
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

📚 **[Supermemory Documentation](https://github.com/supermemoryai/opencode-supermemory)** - Learn more about persistent memory across sessions

The init wizard will automatically detect supermemory and guide you through setup. If you choose not to install it, memory features will be gracefully disabled.

---

### For LLM Agents

<details>
<summary>📋 Click to expand LLM Agent installation guide</summary>

**If you're an LLM agent helping a user set up Orxa, follow this guide.**

#### CRITICAL PREREQUISITE CHECK

**Before installing Orxa, you MUST verify the user has providers and models configured in their `~/.config/opencode/opencode.json`.**

The orxa plugin references models in its config, but those models must be AVAILABLE in OpenCode's main config first.

#### Step-by-Step Setup

##### 1. Check Current OpenCode Configuration

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

##### 2. Run the Interactive Setup Wizard

The easiest way to configure Orxa is with the interactive setup wizard:

```bash
# Install the plugin (add --foreground-scripts if you want to see all output)
npm install -g @reliabilityworks/opencode-orxa

# Run the setup wizard
orxa init
```

> **Note:** npm v7+ suppresses postinstall script output by default. The installation is still working—verify by checking that `~/.config/opencode/orxa/` exists with agent files.

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
🔍 Detecting Agent Configuration...
✅ Found 16 agents with model assignments

📋 Required Models (from agent YAML files):
• opencode/kimi-k2.5 (orxa + 7 subagents)
  Providers: OpenCode OR Kimi for Coding
• opencode/gpt-5.2-codex (plan + 5 subagents)
  Providers: OpenCode OR OpenAI
• opencode/gemini-3-pro (frontend)
  Providers: OpenCode OR Google
• opencode/gemini-3-flash (multimodal)
  Providers: OpenCode OR Google

🔐 Provider Authentication Status:
✅ opencode - Authenticated
✅ kimi-for-coding - Authenticated
❌ openai - Not authenticated

🔐 Authentication Required:
❌ openai - Not authenticated
   Run: opencode auth login
   Then select: OpenAI

✅ RECOMMENDED: OpenCode Provider
   Access to ALL models with one authentication

✅ Configuration saved to ~/.config/opencode/orxa/orxa.json
```

##### 3. Manual Configuration (Alternative)

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

##### 4. Test Installation

```bash
opencode
```

**Expected output:**
```
🎼 OpenCode Orxa v1.0.0
   Orxa agents loaded: 15
   Default agent: orxa
```

#### Example Model Configuration Workflow

```bash
# 1. Check current opencode.json providers
cat ~/.config/opencode/opencode.json | jq '.providers'

# 2. If needed, authenticate missing providers
opencode auth login
# Then select your provider(s) from the interactive menu

# 3. Install orxa
npm install -g @reliabilityworks/opencode-orxa

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

#### Troubleshooting for LLM Agents

**Issue: "Model not found" errors**
- The model specified in orxa.json doesn't exist in opencode.json providers
- Solution: Check available models with `opencode models list`

**Issue: Plugin not loading**
- Check if plugin is registered: `cat ~/.config/opencode/opencode.json | jq '.plugin'`
- Should contain `"@reliabilityworks/opencode-orxa"`

**Issue: Agents not appearing**
- Check agent files exist: `ls ~/.config/opencode/orxa/agents/`
- Should see `subagents/` directory with 14 YAML files
- Note: `orxa.yaml` and `plan.yaml` are built into the plugin, not copied to your config

</details>

---

### Uninstallation

To completely remove OpenCode Orxa:

### 1. Remove the Plugin from OpenCode Config

```bash
# Using jq
jq '.plugin = [.plugin[] | select(. != "@reliabilityworks/opencode-orxa")]' \
    ~/.config/opencode/opencode.json > /tmp/oc.json && \
    mv /tmp/oc.json ~/.config/opencode/opencode.json

# Or manually edit the file and remove "@reliabilityworks/opencode-orxa" from the plugin array
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
npm uninstall -g @reliabilityworks/opencode-orxa
```

### 4. Verify Removal

```bash
opencode
```

The welcome toast should no longer show "🎼 OpenCode Orxa" and you should see your original OpenCode agents.

---

## Updating the Plugin

To update OpenCode Orxa to the latest version:

### From the OpenCode Config Directory

**⚠️ IMPORTANT:** You must run the update command from the `~/.config/opencode` directory:

```bash
# Navigate to the OpenCode config directory
cd ~/.config/opencode

# Update the plugin
npm update -g @reliabilityworks/opencode-orxa
```

### Why This Location Matters

The plugin is installed globally, but npm's update mechanism works best when run from a directory that doesn't have its own `package.json` or `node_modules`. The `~/.config/opencode` directory is the recommended location because:

1. It's the plugin's configuration home
2. It won't conflict with local project dependencies
3. It ensures clean global package resolution

### What Happens During Update

When you update:

1. **New subagent files** are copied to `~/.config/opencode/orxa/agents/subagents/` (only if they don't already exist)
2. **Your existing config** (`orxa.json`) is preserved
3. **Your custom agents** in `agents/custom/` and `agents/overrides/` are preserved
4. **Plugin registration** in `opencode.json` is maintained

### Force a Fresh Install

If you encounter issues after updating:

```bash
# Uninstall completely
npm uninstall -g @reliabilityworks/opencode-orxa

# Remove config (optional - backup first if you have customizations)
mv ~/.config/opencode/orxa ~/.config/opencode/orxa.backup

# Reinstall from the config directory
cd ~/.config/opencode
npm install -g @reliabilityworks/opencode-orxa
```

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

- **16 Specialized Agents** — From frontend to architecture to mobile testing
- **Automatic Escalation** — Failed tasks escalate to senior agents
- **Parallel Execution** — Multiple subagents work simultaneously
- **Context Hygiene** — Smart summarization prevents context bloat

### Developer Experience

- **Slash Commands** — 7 built-in commands for common workflows
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
| **orxa-worker**      | Parallel workstream execution           | Model, prompt, tools, temperature |

### Customizing Agents

#### Primary Agents (orxa, plan)

Primary agents are **built into the plugin** and loaded directly from the package. They have strict enforcement rules that ensure the governance system works correctly.

**What you can customize:**
- **Model only** — Change which LLM they use via `orxa.json`:

```json
{
  "orxa": {
    "model": "opencode/kimi-k2.5"
  }
}
```

**What you cannot customize:**
- System prompts (would break enforcement)
- Tool permissions (would break governance)
- Temperature or other parameters (would affect consistency)

#### Subagents (Full Customization)

Subagents are **copied to your config directory** and can be fully customized via YAML files.

**Two ways to customize:**

**1. JSON overrides in `orxa.json`:**
```json
{
  "subagents": {
    "overrides": {
      "build": {
        "model": "opencode/gpt-5.2-codex",
        "timeout": 300000
      }
    }
  }
}
```

**2. YAML override files** (recommended for complex changes):

Create files in `~/.config/opencode/orxa/agents/overrides/`:

```yaml
# ~/.config/opencode/orxa/agents/overrides/strategist.yaml
name: strategist
model: anthropic/claude-opus
description: Ultra-cautious risk analyzer
system_prompt: |
  You are a paranoid security-focused strategist...
temperature: 0.2
```

**Why use YAML overrides?** Changes in `overrides/` persist across plugin updates. If you edit files directly in `subagents/`, your changes will be lost when you update.

**Loading Priority:**
1. **Custom** (`agents/custom/`) — Your entirely new agents
2. **Overrides** (`agents/overrides/`) — Your modifications to built-in agents
3. **Built-in** (`agents/subagents/`) — Default agents copied from the plugin

---

## Slash Commands

Type `/command-name` to invoke powerful workflows:

### Built-in Commands

| Command     | Aliases        | Description                                        | Delegates To                       |
|-------------|----------------|----------------------------------------------------|------------------------------------|
| `/validate` | `/v`, `/check` | Validate plan with risk analysis + review          | @strategist + @reviewer            |
| `/refactor` | `/rf`          | Intelligent refactoring with architecture analysis | @architect, @explorer, @build, @reviewer |
| `/explain`  | `/ex`, `/exp`  | Explain code, architecture, or concepts            | @librarian                         |
| `/test`     | `/t`           | Generate comprehensive tests                       | @build, @reviewer                  |
| `/debug`    | `/dbg`, `/fix` | Debug issues and trace code flow                   | @architect, @explorer, @coder      |
| `/commit`   | `/c`, `/git`   | Smart git commits with atomic splitting            | @git                               |
| `/search`   | `/s`, `/find`  | Search codebase and web                            | @explorer + @navigator             |

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

# Search everything
/search how authentication works
```

---

## Orxa Orchestration Mode

> **🚧 Coming Soon** — This feature is planned but not yet fully implemented.

Orxa Orchestration Mode enables **parallel multi-agent execution** for complex tasks. Similar to oh-my-opencode's ultrawork, but designed for parallel workstreams with git worktrees.

### What is Orxa Orchestration?

When you type `/orchestrate` before your request, the conductor:

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
/orchestrate implement authentication with login, signup, oauth

# Parallel API development
/orchestrate create REST API for users, posts, and comments with full CRUD

# Parallel UI components
/orchestrate build dashboard with sidebar, header, charts, and data tables

# Parallel feature implementation
/orchestrate add search, filtering, and pagination to the product list
```

### How It Works

```
User Request: "/orchestrate implement auth with login, signup, oauth"
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
└── agents/
    ├── custom/            # Your custom agents
    ├── overrides/         # Override built-in subagents
    └── subagents/         # Default subagents copied from plugin
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
- **Primary agents (orxa, plan):** `model` only — these are built-in and cannot have their prompts/tools changed
- **Subagents:** `model`, `system_prompt`, `description`, `temperature`, `tools`, etc. — these are copied to your config and fully customizable
- Default: `{}` (empty — no overrides applied by default)
- For subagent-specific overrides (model, timeout, retries), use `subagents.overrides` instead
- Example:
```json
{
  "orxa": {
    "model": "opencode/gpt-5.2-codex"
  },
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

**qualityGates.requireTest** (boolean)
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

**escalation.maxAgentAttempts** (number)
- Max attempts before escalating to the next agent
- Default: `2`

**escalation.escalateToOrxa** (boolean)
- Whether to escalate to Orxa after max attempts
- Default: `true`

**escalation.autoEscalationThreshold** (number)
- Number of failures before auto-escalation
- Default: `3`

**escalation.escalationMatrix** (object)
- Map of agent → next agent for escalation
- Default: `{ "coder": "build", "build": "architect", "explorer": "librarian" }`

**escalation.requireExplicitHandoff** (boolean)
- Require explicit handoff messaging when escalating
- Default: `true`

#### UI + Logging

**ui.showWelcomeToast** (boolean)
- Show the welcome toast on startup
- Default: `true`

**ui.showOrxaIndicator** (boolean)
- Show Orxa indicator in the UI
- Default: `true`

**ui.showDelegationSummary** (boolean)
- Show delegation summary after tasks
- Default: `true`

**ui.colorizeOutput** (boolean)
- Enable colorized output in terminal
- Default: `true`

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

## Bundled MCPs

OpenCode Orxa includes two powerful MCP (Model Context Protocol) servers for extended functionality:

### iOS Simulator MCP

Control the iOS Simulator for mobile testing and automation:

| Tool | Description |
|------|-------------|
| `ios_simulator_screenshot` | Take screenshots of the simulator |
| `ios_simulator_ui_tap` | Tap on screen coordinates |
| `ios_simulator_ui_type` | Input text into the simulator |
| `ios_simulator_ui_swipe` | Perform swipe gestures |
| `ios_simulator_launch_app` | Launch apps by bundle ID |
| `ios_simulator_record_video` | Record simulator sessions |

**Requirements:** macOS with Xcode installed

### Playwright MCP

Browser automation using Playwright:

| Tool | Description |
|------|-------------|
| `playwright_browser_navigate` | Navigate to URLs |
| `playwright_browser_click` | Click elements on the page |
| `playwright_browser_type` | Type text into inputs |
| `playwright_browser_take_screenshot` | Capture page screenshots |
| `playwright_browser_evaluate` | Execute JavaScript |
| `playwright_browser_fill_form` | Fill multiple form fields |

**Requirements:** Node.js 18+ (browsers auto-install)

### MCP Configuration

MCPs are configured in your `orxa.json`:

```json
{
  "mcps": {
    "enabled": ["ios-simulator", "playwright"],
    "disabled": [],
    "config": {
      "ios-simulator": {
        "defaultOutputDir": "~/Downloads"
      },
      "playwright": {
        "headless": true,
        "browser": "chromium"
      }
    }
  }
}
```

To disable an MCP, add it to the `disabled` array or remove it from `enabled`.

---

## Bundled Skills

OpenCode Orxa includes 16 skills that provide expert guidance on common development tasks. Access them via `@skill/{name}`:

### General Development
| Skill | Description |
|-------|-------------|
| `@skill/frontend-design` | Frontend design principles and best practices |
| `@skill/web-design-guidelines` | Web interface guidelines and accessibility |
| `@skill/testing-quality` | Testing strategies and quality assurance |
| `@skill/humanizer` | Remove AI writing patterns from text |
| `@skill/image-generator` | Image generation with AI models |
| `@skill/devops-release` | CI/CD and release management |
| `@skill/feature-flags-experiments` | Feature flags and A/B testing |

### Expo / React Native
| Skill | Description |
|-------|-------------|
| `@skill/expo-building-native-ui` | Building native UIs with Expo |
| `@skill/expo-api-routes` | Expo API routes and backend |
| `@skill/expo-cicd-workflows` | CI/CD workflows for Expo apps |
| `@skill/expo-deployment` | Deploying Expo apps to stores |
| `@skill/expo-dev-client` | Expo development client |
| `@skill/expo-tailwind-setup` | Tailwind CSS setup in Expo |
| `@skill/upgrading-expo` | Upgrading Expo SDK versions |

### Vercel & React
| Skill | Description |
|-------|-------------|
| `@skill/vercel-react-best-practices` | React best practices on Vercel |

### Video
| Skill | Description |
|-------|-------------|
| `@skill/remotion-best-practices` | Video creation with Remotion |

### Using Skills

Skills are automatically available through the plugin. Simply reference them by name:

```
You: @skill/frontend-design How should I structure this component?

Orxa: [Loads the frontend-design skill and provides guidance]
```

Skills are bundled with the plugin and don't require copying to your user directory.

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
orxa providers   # Show provider and authentication status
```

### Provider Status Command

The `orxa providers` command displays your OpenCode provider configuration and authentication status:

```bash
$ orxa providers

🔍 OpenCode Configuration

Config: ~/.config/opencode/opencode.json
Auth: ~/.config/opencode/auth.json
Config exists: ✅
Auth file exists: ✅

📋 Providers:

✅ Authenticated:
  opencode
     Auth: Valid API key found
     Models: kimi-k2.5, gpt-5.2-codex, gemini-3-pro...

❌ Needs Authentication:

  openai
     Status: No API key configured
     Instructions:
       Run: opencode auth login
       Then select: OpenAI

⚠️  Not Configured (add to opencode.json to use):
  anthropic
     Available models: claude-opus, claude-sonnet...
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
