# OpenCode Orxa Documentation

Welcome to the comprehensive documentation for the **OpenCode Orxa** plugin — a powerful orchestration layer that enforces strict Orxa/Manager patterns for AI-assisted software development.

## What is OpenCode Orxa?

OpenCode Orxa transforms how you work with AI coding assistants by implementing a structured delegation pattern inspired by engineering management best practices. Instead of having a single AI agent try to do everything, Orxa orchestrates a fleet of specialized subagents, each with specific roles and responsibilities.

### Key Philosophy

The Orxa pattern treats AI assistance like engineering team management:

- **The Orxa** (Engineering Manager) — Plans, delegates, and verifies
- **The Plan Agent** (Product Manager) — Creates comprehensive work plans  
- **Specialized Subagents** — Execute specific tasks (coding, testing, documentation, etc.)

This separation of concerns leads to:
- ✅ Higher quality code through specialization
- ✅ Better project organization with structured plans
- ✅ Reduced errors through verification and quality gates
- ✅ Consistent patterns across your codebase

---

## Documentation Overview

| Document                                        | Description                                                                           | Lines   |
| ----------                                      | -------------                                                                         | ------- |
| [**📥 Installation Guide**](INSTALLATION.md)     | Complete installation instructions including npm, local development, and verification | 600+    |
| [**⚙️ Configuration Guide**](CONFIGURATION.md)  | All configuration options, JSONC support, agent overrides, and examples               | 1200+   |
| [**👥 Agent System**](AGENTS.md)                 | Complete guide to all 15 agents with selection guide and customization                | 800+    |
| [**🏗️ Architecture Overview**](ARCHITECTURE.md) | Deep technical documentation — hooks, config handler, enforcement mechanisms          | 900+    |
| [**🚀 Orxa Mode**](ORXA-MODE.md)                 | Parallel multi-agent orchestration with git worktrees                                 | 700+    |
| [**✨ Features Reference**](FEATURES.md)         | All capabilities — slash commands, hooks, quality gates, memory automation            | 600+    |
| [**🔧 Troubleshooting**](TROUBLESHOOTING.md)     | Common issues and solutions with quick fixes                                          | 500+    |
| [**💻 Development Guide**](DEVELOPMENT.md)       | How to set up local development, build, test, and contribute                          | 700+    |
| [**⌨️ Slash Commands**](SLASH-COMMANDS.md)      | Detailed documentation for all 9 built-in slash commands                              | 650+    |

### Getting Started Tutorials

| Guide                                                                   | Description                                                   |
| -------                                                                 | -------------                                                 |
| [**Getting Started**](guide/overview.md)                                | Your first steps with Orxa — installation to first delegation |
| [**Understanding Orchestration**](guide/understanding-orchestration.md) | How Orxa decides what to delegate and to whom                 |
| [**Customizing Agents**](guide/customizing-agents.md)                   | Step-by-step guide to agent customization                     |

---

## Quick Start

### Installation

```bash
# Install globally from npm
npm install -g opencode-orxa

# Or use npx (no permanent install)
npx opencode-orxa init
```

### Verify Installation

```bash
# Check that the CLI is available
orxa doctor

# Start OpenCode (plugin activates automatically)
opencode
```

You should see "🎼 OpenCode Orxa" in the welcome toast when OpenCode starts.

### Your First Delegation

When you ask OpenCode to do something, the Orxa will:

1. Create or update a TODO list
2. Delegate to the appropriate subagent
3. Verify the result against quality gates
4. Update TODO status
5. Save important context to memory

**Example interaction:**

```
You: Create a React component for a user profile card

Orxa: I'll delegate this to the frontend specialist. Let me create a plan first...

[Orxa creates TODO list and delegates to @frontend]

@frontend: I've created the UserProfileCard component with the following features...

Orxa: The component has been created. Running quality gates...
✓ Lint passes
✓ TypeScript check passes
✓ Build succeeds

TODO completed: Create React component for user profile card
```

---

## Feature Highlights

### 🎯 15 Specialized Agents

From strategists to mobile testers, each agent has a specific role and optimized model selection.

[See all agents →](AGENTS.md)

### ⚡ 9 Slash Commands

Powerful shortcuts for common workflows:
- `/validate` — Pre-execution validation
- `/refactor` — Intelligent refactoring
- `/explain` — Educational code explanations
- `/test` — Test generation
- `/debug` — Systematic debugging
- `/commit` — Smart git commits
- `/docs` — Documentation generation
- `/search` — Codebase + web search
- `/review` — Code review

[See all commands →](SLASH-COMMANDS.md)

### 🔒 Enforcement System

Strict patterns ensure quality:
- **Orxa-only delegation** — Centralized orchestration
- **Tool restrictions** — Right tool for the right agent
- **TODO completion guardian** — No incomplete work
- **Quality gates** — Automated verification
- **Memory automation** — Knowledge preservation

[See enforcement details →](FEATURES.md#enforcement-features)

### 🚀 Orxa Orchestration Mode

Parallel execution for 3-5x faster development:
- Break complex tasks into parallel workstreams
- Git worktree isolation
- Automatic dependency resolution
- FIFO merge queue

[Learn Orxa mode →](ORXA-MODE.md)

---

## Core Concepts

### 1. Orxa-Only Delegation

Only the Orxa agent can use `delegate_task`. This ensures:
- Centralized orchestration
- Consistent delegation patterns
- Proper context passing
- Quality verification

### 2. Tool Restrictions

The Orxa has limited tool access by design:

| Allowed                     | Blocked (must delegate)                           |
| ---------                   | ------------------------                          |
| `read`                      | `grep` → delegate to `@plan`                      |
| `delegate_task`             | `glob` → delegate to `@plan`                      |
| `todowrite`/`todoread`      | `bash` → delegate to appropriate subagent         |
| `supermemory`               | `agent-device` → delegate to `@mobile-simulator`  |
| `edit`/`write` (plans only) | —                                                 |

### 3. The 6-Section Delegation Template

Every delegation must include:

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

### 4. Quality Gates

Before marking work complete, the Orxa verifies:
- ✅ Lint passes
- ✅ TypeScript type checking passes
- ✅ LSP diagnostics are clean
- ✅ Tests pass (if applicable)
- ✅ Build succeeds (if applicable)

### 5. Memory Protocol

Only the Orxa can write to supermemory. Subagents provide **Memory Recommendations** instead, which the Orxa reviews and saves.

---

## The Agent Fleet

### Primary Agents

| Agent    | Role                               | Model                    |
| -------  | ------                             | -------                  |
| **orxa** | Engineering Manager / Orchestrator | `opencode/kimi-k2.5`     |
| **plan** | Product Manager / Strategist       | `opencode/gpt-5.2-codex` |

### Subagents (13 Specialized Agents)

| Agent                | Specialty           | Best For                              |
| -------              | -----------         | ----------                            |
| **strategist**       | Risk analysis       | Complex tasks, identifying edge cases |
| **reviewer**         | Plan validation     | Reviewing plans before execution      |
| **build**            | Complex engineering | Multi-file features, refactors        |
| **coder**            | Quick fixes         | Single-file changes, bug fixes        |
| **frontend**         | UI/UX               | Styling, components, animations       |
| **architect**        | System design       | Architecture decisions, debugging     |
| **git**              | Version control     | Commits, branches, merges             |
| **explorer**         | Codebase search     | Finding code, understanding structure |
| **librarian**        | Research            | Documentation, external libraries     |
| **navigator**        | Web browsing        | Live web research                     |
| **writer**           | Documentation       | READMEs, API docs, articles           |
| **multimodal**       | Media analysis      | Images, PDFs, diagrams                |
| **mobile-simulator** | Mobile testing      | iOS/Android simulator automation      |

[Full agent documentation →](AGENTS.md)

---

## Configuration

The main configuration file is located at:

```
~/.config/opencode/orxa/orxa.json
```

### Quick Configuration Example

```json
{
  "enabled_agents": ["orxa", "plan", "build", "coder", "frontend"],
  "orxa": {
    "model": "opencode/kimi-k2.5",
    "enforcement": {
      "delegation": "strict",
      "todoCompletion": "strict",
      "qualityGates": "strict"
    }
  },
  "agent_overrides": {
    "coder": {
      "model": "anthropic/claude-3.5-sonnet"
    }
  }
}
```

[Complete configuration reference →](CONFIGURATION.md)

---

## CLI Commands

The `orxa` CLI provides setup and management utilities:

```bash
orxa init        # Interactive setup wizard
orxa install     # Enable/disable agents
orxa doctor      # Validate configuration
orxa config      # Open config in editor
```

---

## Directory Structure

```
~/.config/opencode/orxa/
├── orxa.json          # Main configuration
└── agents/
    ├── custom/            # Your custom agent definitions
    └── overrides/         # Override built-in subagents
```

---

## Next Steps

### New Users
1. 📥 [Install the plugin](INSTALLATION.md)
2. 📖 Read the [Getting Started guide](guide/overview.md)
3. ⚙️ [Configure for your workflow](CONFIGURATION.md)

### Learning Orxa
1. 🧠 [Understand orchestration](guide/understanding-orchestration.md)
2. 👥 [Meet the agents](AGENTS.md)
3. 🚀 [Try Orxa mode](ORXA-MODE.md)

### Power Users
1. 🏗️ [Understand the architecture](ARCHITECTURE.md)
2. 👤 [Customize agents](guide/customizing-agents.md)
3. ✨ [Explore all features](FEATURES.md)

---

## Troubleshooting

### Quick Fixes

| Issue              | Command                     |
| -------            | ---------                   |
| Config errors      | `orxa init --force`         |
| Plugin not loading | `orxa doctor`               |
| Agent not found    | Check `enabled_agents` list |
| Delegation issues  | Check enforcement settings  |

[Full troubleshooting guide →](TROUBLESHOOTING.md)

---

## Contributing

We welcome contributions! See [**Development Guide**](DEVELOPMENT.md) for:
- Setting up local development
- Building and testing
- Making changes
- Submitting pull requests

---

## License

MIT License — see LICENSE file for details.

---

**Ready to get started?** → [Install the plugin](INSTALLATION.md)
