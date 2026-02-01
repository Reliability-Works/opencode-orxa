# OpenCode Orxa Documentation

Welcome to the comprehensive documentation for the **OpenCode Orxa** plugin — a powerful governance layer that enforces strict Orxa/Manager patterns for AI-assisted software development.

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

## Documentation Overview

| Document | Description |
|----------|-------------|
| [**Installation Guide**](INSTALLATION.md) | Complete installation instructions including npm, local development, and verification |
| [**Development Guide**](DEVELOPMENT.md) | How to set up a local development environment, build, test, and contribute |
| [**Slash Commands Reference**](SLASH-COMMANDS.md) | Detailed documentation for all 7 built-in slash commands |
| [**Configuration Guide**](CONFIGURATION.md) | All configuration options, examples, and customization |
| [**Agent System**](AGENTS.md) | Complete guide to the 15 agents and how to customize them |
| [**Architecture Overview**](ARCHITECTURE.md) | How the plugin works internally — hooks, config handler, and lifecycle |

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

### Basic Usage

Once installed, the plugin automatically:

1. **Replaces default agents** with the Orxa agent fleet
2. **Sets Orxa as the default agent** for all sessions
3. **Enforces delegation patterns** — only Orxa can delegate tasks
4. **Activates quality gates** — all work must pass validation

### Your First Delegation

When you ask OpenCode to do something, the Orxa will:

1. Create or update a TODO list
2. Delegate to the appropriate subagent
3. Verify the result against quality gates
4. Update TODO status
5. Save important context to memory

Example interaction:

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

## Core Concepts

### 1. Orxa-Only Delegation

Only the Orxa agent can use `delegate_task`. This ensures:
- Centralized orchestration
- Consistent delegation patterns
- Proper context passing
- Quality verification

### 2. Tool Restrictions

The Orxa has limited tool access by design:

| Allowed | Blocked (must delegate) |
|---------|------------------------|
| `read` | `grep` → delegate to `@plan` |
| `delegate_task` | `glob` → delegate to `@plan` |
| `todowrite`/`todoread` | `bash` → delegate to appropriate subagent |
| `supermemory` | `ios-simulator` → delegate to `@mobile-simulator` |
| `edit`/`write` (plans only) | `skill` → delegate to appropriate subagent |

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

## The Agent Fleet

### Primary Agents

| Agent | Role | Model |
|-------|------|-------|
| **orxa** | Engineering Manager / Orchestrator | `kimi-for-coding/kimi-k2.5` |
| **plan** | Product Manager / Strategist | `opencode/gpt-5.2-codex` |

### Subagents (13 Specialized Agents)

| Agent | Specialty | Best For |
|-------|-----------|----------|
| **strategist** | Risk analysis | Complex tasks, identifying edge cases |
| **reviewer** | Plan validation | Reviewing plans before execution |
| **build** | Complex engineering | Multi-file features, refactors |
| **coder** | Quick fixes | Single-file changes, bug fixes |
| **frontend** | UI/UX | Styling, components, animations |
| **architect** | System design | Architecture decisions, debugging |
| **git** | Version control | Commits, branches, merges |
| **explorer** | Codebase search | Finding code, understanding structure |
| **librarian** | Research | Documentation, external libraries |
| **navigator** | Web browsing | Live web research |
| **writer** | Documentation | READMEs, API docs, articles |
| **multimodal** | Media analysis | Images, PDFs, diagrams |
| **mobile-simulator** | Mobile testing | iOS/Android simulator automation |

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
    "model": "kimi-for-coding/kimi-k2.5",
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

See [**Configuration Guide**](CONFIGURATION.md) for complete options.

## Slash Commands

Orxa provides powerful slash commands for common workflows:

| Command | Description |
|---------|-------------|
| `/validate` | Validate plan with strategist + reviewer |
| `/refactor` | Intelligent refactoring with architecture analysis |
| `/explain` | Get educational explanations of code |
| `/test` | Generate comprehensive tests |
| `/debug` | Debug issues with systematic analysis |
| `/commit` | Smart git commits with atomic splitting |
| `/search` | Search codebase and web simultaneously |

See [**Slash Commands Reference**](SLASH-COMMANDS.md) for detailed usage.

## CLI Commands

The `orxa` CLI provides setup and management utilities:

```bash
orxa init        # Interactive setup wizard
orxa install     # Enable/disable agents
orxa doctor      # Validate configuration
orxa config      # Open config in editor
```

## Directory Structure

```
~/.config/opencode/orxa/
├── orxa.json          # Main configuration
├── agents/
│   ├── custom/            # Your custom agent definitions
│   └── overrides/         # Override built-in subagents
└── schemas/               # JSON schemas
```

## Troubleshooting

### Plugin not activating

1. Verify installation: `orxa doctor`
2. Check opencode.json has plugin registered
3. Ensure required dependencies are installed

### Agents not delegating properly

1. Check enforcement settings in config
2. Verify agent YAML files are in place
3. Run `orxa doctor` to validate setup

### Configuration issues

1. Validate JSON syntax: `orxa doctor`
2. Check for legacy config at `.opencode/orxa.config.json`
3. Reset to defaults: `orxa init --force`

## Contributing

We welcome contributions! See [**Development Guide**](DEVELOPMENT.md) for:
- Setting up local development
- Building and testing
- Making changes
- Submitting pull requests

## License

MIT License — see LICENSE file for details.

## Support

- 📖 Documentation: You're reading it!
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/opencode-orxa/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/yourusername/opencode-orxa/discussions)

---

**Next Steps:**
- 📥 [Install the plugin](INSTALLATION.md)
- ⚙️ [Configure for your workflow](CONFIGURATION.md)
- 🚀 [Try the slash commands](SLASH-COMMANDS.md)
