# Configuration Guide

Complete reference for configuring the OpenCode Orxa plugin.

## Table of Contents

- [Overview](#overview)
- [Configuration File Locations](#configuration-file-locations)
- [JSONC Support](#jsonc-support)
- [Complete Configuration Reference](#complete-configuration-reference)
- [Primary Configuration Sections](#primary-configuration-sections)
  - [Agent Management](#agent-management)
  - [Orxa Configuration](#orxa-configuration)
  - [Governance & Enforcement](#governance--enforcement)
  - [Subagent Configuration](#subagent-configuration)
  - [Memory Settings](#memory-settings)
  - [Quality Gates](#quality-gates)
  - [Escalation Matrix](#escalation-matrix)
  - [Orchestration Mode](#orchestration-mode)
  - [UI Settings](#ui-settings)
- [Agent Overrides](#agent-overrides)
- [Custom Agents](#custom-agents)
- [Tool Aliases](#tool-aliases)
- [Configuration Examples](#configuration-examples)
- [Troubleshooting](#troubleshooting)

---

## Overview

Orxa uses a hierarchical JSON configuration system with a single primary configuration file. The configuration controls every aspect of the plugin's behavior, from which agents are enabled to how strictly enforcement rules are applied.

### Configuration Philosophy

Orxa follows these principles:

1. **Convention over Configuration** — Sensible defaults work out of the box
2. **Gradual Strictness** — Start with `warn` mode, graduate to `strict`
3. **Explicit over Implicit** — All behavior is configurable and documented
4. **Safety First** — Breaking changes require explicit opt-in

---

## Configuration File Locations

### Primary Configuration

```
~/.config/opencode/orxa/orxa.json
```

This is the main configuration file. It controls:
- Which agents are enabled/disabled
- Enforcement levels
- Model selections
- All plugin behavior

### Configuration Priority

If multiple configuration sources exist, they are merged in this priority (highest to lowest):

1. **Runtime overrides** — CLI flags and environment variables
2. **`~/.config/opencode/orxa/orxa.json`** — User configuration
3. **Built-in defaults** — Hardcoded in the plugin

### Legacy Configuration (Deprecated)

```
.opencode/orxa.config.json  # Project-level (DEPRECATED)
```

⚠️ **Warning:** Project-level configuration is deprecated. The wizard will automatically migrate legacy configs to the user-level location with a warning.

---

## JSONC Support

Orxa configuration files support **JSON with Comments (JSONC)**:

```jsonc
{
  // This is a comment
  "enabled_agents": ["orxa", "plan"],
  
  /* 
   * Multi-line comments are also supported
   * Use these for longer explanations
   */
  "orxa": {
    "model": "opencode/kimi-k2.5"  // Inline comments work too
  }
}
```

**Benefits of JSONC:**
- Add explanatory comments to complex configurations
- Temporarily disable settings without deleting them
- Document why certain choices were made

---

## Complete Configuration Reference

### Top-Level Structure

```typescript
interface OrxaConfig {
  // Agent Management
  enabled_agents: string[];
  disabled_agents: string[];
  
  // Agent Customization
  agent_overrides: Record<string, AgentOverride>;
  custom_agents: AgentConfig[];
  
  // MCP Configuration
  mcp?: Record<string, unknown>;
  
  // Tool Aliases
  toolAliases: {
    resolve: Record<string, string>;
  };
  
  // Primary Sections
  orxa: OrxaSettings;
  governance: GovernanceSettings;
  subagents: SubagentSettings;
  memory: MemorySettings;
  qualityGates: QualityGateSettings;
  escalation: EscalationSettings;
  orchestration?: OrchestrationSettings;
  ui: UISettings;
  perAgentRestrictions?: Record<string, AgentRestrictions>;
}
```

---

## Primary Configuration Sections

### Agent Management

Control which agents are available in your OpenCode environment.

```json
{
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
  ],
  "disabled_agents": []
}
```

#### `enabled_agents`

| Property         | Type       | Default    | Description                   |
| ----------       | ------     | ---------  | -------------                 |
| `enabled_agents` | `string[]` | All agents | List of agent names to enable |

**Behavior:**
- Only agents in this list will be loaded
- Must include at minimum `"orxa"` and `"plan"`
- Order doesn't matter

**Example — Minimal Setup:**
```json
{
  "enabled_agents": ["orxa", "plan", "build", "coder"]
}
```

#### `disabled_agents`

| Property          | Type       | Default   | Description                  |
| ----------        | ------     | --------- | -------------                |
| `disabled_agents` | `string[]` | `[]`      | Agents to explicitly disable |

**Use Case:**
Useful when you want to enable all agents *except* specific ones:

```json
{
  "enabled_agents": ["orxa", "plan", "strategist", "reviewer", "build", "coder", "frontend", "architect", "git", "explorer", "librarian", "navigator", "writer", "multimodal", "mobile-simulator"],
  "disabled_agents": ["mobile-simulator"]
}
```

---

### Orxa Configuration

Settings specific to the primary Orxa agent.

```json
{
  "orxa": {
    "model": "opencode/kimi-k2.5",
    "allowedTools": ["read", "delegate_task", "todowrite", "todoread", "supermemory", "edit", "write"],
    "blockedTools": ["grep", "glob", "bash", "skill"],
    "enforcement": {
      "delegation": "strict",
      "todoCompletion": "strict",
      "qualityGates": "strict",
      "memoryAutomation": "strict"
    },
    "maxManualEditsPerSession": 0,
    "requireTodoList": true,
    "autoUpdateTodos": false,
    "planWriteAllowlist": [".orxa/plans/*.md"],
    "blockMobileTools": true
  }
}
```

#### Model Selection

| Property   | Type     | Default                | Description              |
| ---------- | ------   | ---------              | -------------            |
| `model`    | `string` | `"opencode/kimi-k2.5"` | Model for the Orxa agent |

**Recommended Models:**

| Model                    | Best For                    | Reasoning                          |
| -------                  | ----------                  | -----------                        |
| `opencode/kimi-k2.5`     | General orchestration       | Excellent reasoning, good tool use |
| `opencode/gpt-5.2-codex` | Complex technical decisions | Superior coding knowledge          |
| `opencode/gemini-3-pro`  | Fast iteration              | Quick responses, good context      |

#### Tool Access Control

| Property       | Type       | Default   | Description           |
| ----------     | ------     | --------- | -------------         |
| `allowedTools` | `string[]` | See below | Tools Orxa can use    |
| `blockedTools` | `string[]` | See below | Tools Orxa cannot use |

**Default Allowed Tools:**
- `read` — Read files
- `delegate_task` — Delegate to subagents
- `todowrite`/`todoread` — Manage TODOs
- `supermemory` — Access memory
- `edit`/`write` — Modify files (plans only)

**Default Blocked Tools:**
- `grep` → Delegate to `@plan`
- `glob` → Delegate to `@plan`
- `bash` → Delegate to appropriate subagent
- `skill` → Delegate to appropriate subagent

#### Enforcement Levels

| Property                       | Type     | Options      | Description   |         |                       |
| ----------                     | ------   | ---------    | ------------- |         |                       |
| `enforcement.delegation`       | `string` | `"strict"` \ | `"warn"` \    | `"off"` | Who can delegate      |
| `enforcement.todoCompletion`   | `string` | `"strict"` \ | `"warn"` \    | `"off"` | TODO completion rules |
| `enforcement.qualityGates`     | `string` | `"strict"` \ | `"warn"` \    | `"off"` | Quality verification  |
| `enforcement.memoryAutomation` | `string` | `"strict"` \ | `"warn"` \    | `"off"` | Memory handling       |

**Enforcement Level Meanings:**

| Level      | Behavior                                      |
| -------    | ----------                                    |
| `"strict"` | Violations are blocked with error messages    |
| `"warn"`   | Violations are allowed but warnings are shown |
| `"off"`    | Feature is completely disabled                |

**Recommended Progression:**

1. **New Users:** Start with `"warn"` for all settings
2. **Comfortable Users:** Move to `"strict"` for `delegation`
3. **Advanced Users:** Use `"strict"` for all

#### Session Controls

| Property                   | Type       | Default                    | Description                |
| ----------                 | ------     | ---------                  | -------------              |
| `maxManualEditsPerSession` | `number`   | `0`                        | Max manual edits by Orxa   |
| `requireTodoList`          | `boolean`  | `true`                     | Require TODO list for work |
| `autoUpdateTodos`          | `boolean`  | `false`                    | Auto-update TODO status    |
| `planWriteAllowlist`       | `string[]` | `[".orxa/plans/*.md"]`     | Where Orxa can write       |
| `blockMobileTools`         | `boolean`  | `true`                     | Block iOS simulator tools  |

---

### Governance & Enforcement

Core governance rules that define the Orxa pattern.

```json
{
  "governance": {
    "onlyOrxaCanDelegate": true,
    "blockSupermemoryAddForSubagents": true,
    "delegationTemplate": {
      "required": true,
      "requiredSections": [
        "Task",
        "Expected Outcome",
        "Required Tools",
        "Must Do",
        "Must Not Do",
        "Context"
      ],
      "maxImages": 10,
      "requireSameSessionId": true,
      "contextHygiene": {
        "maxToolOutputChars": 4000,
        "summaryHeader": "Summary",
        "requireSummary": true
      }
    }
  }
}
```

#### Core Governance Rules

| Property                          | Type      | Default   | Description                       |
| ----------                        | ------    | --------- | -------------                     |
| `onlyOrxaCanDelegate`             | `boolean` | `true`    | Only Orxa can use `delegate_task` |
| `blockSupermemoryAddForSubagents` | `boolean` | `true`    | Subagents cannot write to memory  |

#### Delegation Template

| Property               | Type       | Default    | Description                |
| ----------             | ------     | ---------  | -------------              |
| `required`             | `boolean`  | `true`     | Require 6-section template |
| `requiredSections`     | `string[]` | 6 sections | Required section headers   |
| `maxImages`            | `number`   | `10`       | Max images per batch       |
| `requireSameSessionId` | `boolean`  | `true`     | Require session continuity |

**The 6-Section Template:**

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

#### Context Hygiene

| Property             | Type      | Default     | Description                  |
| ----------           | ------    | ---------   | -------------                |
| `maxToolOutputChars` | `number`  | `4000`      | Max chars before summarizing |
| `summaryHeader`      | `string`  | `"Summary"` | Header for summaries         |
| `requireSummary`     | `boolean` | `true`      | Require output summarization |

---

### Subagent Configuration

Default settings and overrides for all subagents.

```json
{
  "subagents": {
    "defaults": {
      "model": "opencode/kimi-k2.5",
      "timeout": 120000,
      "maxRetries": 2
    },
    "overrides": {
      "build": {
        "model": "opencode/gpt-5.2-codex",
        "timeout": 300000
      },
      "architect": {
        "model": "opencode/gpt-5.2-codex",
        "timeout": 300000
      },
      "frontend": {
        "model": "opencode/gemini-3-pro"
      },
      "multimodal": {
        "model": "opencode/gemini-3-pro"
      }
    },
    "custom": []
  }
}
```

#### Default Settings

| Property              | Type     | Default                | Description                     |
| ----------            | ------   | ---------              | -------------                   |
| `defaults.model`      | `string` | `"opencode/kimi-k2.5"` | Default model for subagents     |
| `defaults.timeout`    | `number` | `120000`               | Timeout in milliseconds (2 min) |
| `defaults.maxRetries` | `number` | `2`                    | Max retry attempts              |

#### Subagent Overrides

Override settings for specific subagents:

| Subagent     | Recommended Model        | Reason                    |
| ----------   | -------------------      | --------                  |
| `build`      | `opencode/gpt-5.2-codex` | Complex engineering tasks |
| `architect`  | `opencode/gpt-5.2-codex` | System design decisions   |
| `frontend`   | `opencode/gemini-3-pro`  | UI/UX work                |
| `multimodal` | `opencode/gemini-3-pro`  | Image/media analysis      |
| `strategist` | `opencode/gpt-5.2-codex` | Risk analysis             |
| `reviewer`   | `opencode/gpt-5.2-codex` | Critical evaluation       |

---

### Memory Settings

Configure how Orxa extracts and manages memory.

```json
{
  "memory": {
    "autoExtract": true,
    "extractPatterns": [
      "bug.*fix",
      "solution.*",
      "decided.*",
      "pattern.*",
      "config.*"
    ],
    "requiredTypes": [
      "error-solution",
      "learned-pattern",
      "project-config",
      "architecture"
    ],
    "sessionCheckpointInterval": 20
  }
}
```

| Property                    | Type       | Default   | Description                          |
| ----------                  | ------     | --------- | -------------                        |
| `autoExtract`               | `boolean`  | `true`    | Auto-extract patterns from responses |
| `extractPatterns`           | `string[]` | See above | Regex patterns to match              |
| `requiredTypes`             | `string[]` | See above | Memory types to always extract       |
| `sessionCheckpointInterval` | `number`   | `20`      | Messages between checkpoints         |

**Memory Types:**

| Type              | Description             | Example                                  |
| ------            | -------------           | ---------                                |
| `error-solution`  | Fixes for errors        | "Fixed TypeError by adding null check"   |
| `learned-pattern` | Coding patterns         | "Use zod for all validation"             |
| `project-config`  | Configuration decisions | "API base URL is /api/v1"                |
| `architecture`    | Architectural decisions | "Use repository pattern for data access" |
| `preference`      | User preferences        | "Prefer async/await over promises"       |

---

### Quality Gates

Define what checks must pass before work is considered complete.

```json
{
  "qualityGates": {
    "requireLint": true,
    "requireTypeCheck": true,
    "requireTests": true,
    "requireBuild": true,
    "requireLspDiagnostics": true,
    "customValidators": []
  }
}
```

| Property                | Type      | Default   | Description                   |
| ----------              | ------    | --------- | -------------                 |
| `requireLint`           | `boolean` | `true`    | Require linting to pass       |
| `requireTypeCheck`      | `boolean` | `true`    | Require TypeScript check      |
| `requireTests`          | `boolean` | `true`    | Require tests to pass         |
| `requireBuild`          | `boolean` | `true`    | Require build to succeed      |
| `requireLspDiagnostics` | `boolean` | `true`    | Require clean LSP diagnostics |
| `customValidators`      | `array`   | `[]`      | Custom validation commands    |

#### Custom Validators

Add project-specific quality checks:

```json
{
  "qualityGates": {
    "customValidators": [
      {
        "name": "Security Scan",
        "command": "npm run security:scan",
        "required": true
      },
      {
        "name": "API Contract Check",
        "command": "npm run test:contracts",
        "required": false
      }
    ]
  }
}
```

---

### Escalation Matrix

Define how tasks escalate when agents fail.

```json
{
  "escalation": {
    "enabled": true,
    "maxAttemptsPerAgent": 2,
    "escalationMatrix": {
      "coder": "build",
      "build": "architect",
      "explorer": "librarian"
    },
    "requireExplicitHandoff": true
  }
}
```

| Property                 | Type      | Default   | Description                       |
| ----------               | ------    | --------- | -------------                     |
| `enabled`                | `boolean` | `true`    | Enable escalation                 |
| `maxAttemptsPerAgent`    | `number`  | `2`       | Attempts before escalation        |
| `escalationMatrix`       | `object`  | See above | Who to escalate to                |
| `requireExplicitHandoff` | `boolean` | `true`    | Require explicit handoff messages |

**Default Escalation Paths:**

```
coder → build → architect
explorer → librarian
```

---

### Orchestration Mode

Configure Orxa's parallel execution capabilities.

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

| Property                     | Type      | Default           | Description                   |
| ----------                   | ------    | ---------         | -------------                 |
| `enabled`                    | `boolean` | `true`            | Enable orchestration mode     |
| `max_parallel_workstreams`   | `number`  | `5`               | Max concurrent workstreams    |
| `queue_directory`            | `string`  | `"~/.orxa-queue"` | Queue storage location        |
| `auto_merge`                 | `boolean` | `true`            | Auto-merge completed work     |
| `conflict_resolution_agent`  | `string`  | `"architect"`     | Agent for conflict resolution |
| `worktree_prefix`            | `string`  | `"orxa"`          | Prefix for worktree names     |
| `cleanup_worktrees`          | `boolean` | `true`            | Remove worktrees after merge  |
| `require_merge_approval`     | `boolean` | `false`           | Require manual merge approval |
| `workstream_timeout_minutes` | `number`  | `120`             | Timeout per workstream        |
| `retry_failed_workstreams`   | `boolean` | `false`           | Retry failed workstreams      |
| `max_retries`                | `number`  | `2`               | Max retry attempts            |
| `queue_poll_interval_ms`     | `number`  | `5000`            | Queue polling frequency       |

See [ORXA-MODE.md](ORXA-MODE.md) for detailed orchestration documentation.

---

### UI Settings

Control visual feedback and logging.

```json
{
  "ui": {
    "showDelegationWarnings": true,
    "showTodoReminders": true,
    "showMemoryConfirmations": true,
    "verboseLogging": true
  }
}
```

| Property                  | Type      | Default   | Description                          |
| ----------                | ------    | --------- | -------------                        |
| `showDelegationWarnings`  | `boolean` | `true`    | Show delegation restriction warnings |
| `showTodoReminders`       | `boolean` | `true`    | Show pending TODO reminders          |
| `showMemoryConfirmations` | `boolean` | `true`    | Show memory save confirmations       |
| `verboseLogging`          | `boolean` | `true`    | Enable detailed logging              |

---

## Agent Overrides

Customize individual agents without modifying YAML files.

### Primary Agent Overrides

Primary agents (`orxa`, `plan`) can only have their **model** overridden:

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

⚠️ **Restriction:** Primary agents cannot override `system_prompt`, `description`, `tools`, or other properties. This ensures consistent core behavior.

### Subagent Overrides

Subagents can be fully customized:

```json
{
  "agent_overrides": {
    "build": {
      "model": "opencode/gpt-5.2-codex",
      "temperature": 0.2,
      "customInstructions": "Always run tests after changes"
    },
    "frontend": {
      "model": "opencode/gemini-3-pro",
      "temperature": 0.7
    }
  }
}
```

**Overrideable Properties (Subagents Only):**

| Property             | Type       | Description                   |
| ----------           | ------     | -------------                 |
| `model`              | `string`   | Model to use                  |
| `temperature`        | `number`   | Creativity (0.0 - 1.0)        |
| `system_prompt`      | `string`   | Override entire system prompt |
| `customInstructions` | `string`   | Append to system prompt       |
| `allowedTools`       | `string[]` | Allowed tools                 |
| `blockedTools`       | `string[]` | Blocked tools                 |

---

## Custom Agents

Create entirely new agents for your workflow.

### Configuration

```json
{
  "custom_agents": [
    {
      "name": "database-expert",
      "description": "Database schema and query specialist",
      "model": "opencode/gpt-5.2-codex",
      "instructions": "You are a database expert. Optimize queries, design schemas, and ensure data integrity.",
      "allowedTools": ["read", "edit", "write", "grep", "bash"]
    }
  ]
}
```

**Required Properties:**

| Property       | Type       | Description                |
| ----------     | ------     | -------------              |
| `name`         | `string`   | Unique agent identifier    |
| `description`  | `string`   | Human-readable description |
| `model`        | `string`   | Model to use               |
| `instructions` | `string`   | System prompt content      |
| `allowedTools` | `string[]` | Tools this agent can use   |

**Storage Location:**

Custom agents are stored in:
```
~/.config/opencode/orxa/agents/custom/{agent-name}.yaml
```

---

## Tool Aliases

Map alternative tool names to canonical names.

```json
{
  "toolAliases": {
    "resolve": {
      "apply_patch": "edit",
      "write_to_file": "write",
      "replace_file_content": "write",
      "multi_replace_file_content": "write",
      "task": "delegate_task"
    }
  }
}
```

**Purpose:**
- Handle different naming conventions
- Support legacy tool names
- Map shorthand to full names

---

## Configuration Examples

### Example 1: Minimal Setup

```json
{
  "enabled_agents": ["orxa", "plan", "build", "coder"],
  "orxa": {
    "model": "opencode/kimi-k2.5",
    "enforcement": {
      "delegation": "strict",
      "todoCompletion": "warn",
      "qualityGates": "warn",
      "memoryAutomation": "off"
    }
  }
}
```

### Example 2: Strict Enterprise Setup

```json
{
  "enabled_agents": ["orxa", "plan", "strategist", "reviewer", "build", "architect", "git"],
  "orxa": {
    "model": "opencode/gpt-5.2-codex",
    "enforcement": {
      "delegation": "strict",
      "todoCompletion": "strict",
      "qualityGates": "strict",
      "memoryAutomation": "strict"
    },
    "maxManualEditsPerSession": 0,
    "requireTodoList": true
  },
  "governance": {
    "onlyOrxaCanDelegate": true,
    "blockSupermemoryAddForSubagents": true,
    "delegationTemplate": {
      "required": true,
      "requiredSections": ["Task", "Expected Outcome", "Required Tools", "Must Do", "Must Not Do", "Context"]
    }
  },
  "qualityGates": {
    "requireLint": true,
    "requireTypeCheck": true,
    "requireTests": true,
    "requireBuild": true,
    "requireLspDiagnostics": true
  }
}
```

### Example 3: Frontend-Focused Setup

```json
{
  "enabled_agents": ["orxa", "plan", "frontend", "build", "coder", "writer"],
  "agent_overrides": {
    "frontend": {
      "model": "opencode/gemini-3-pro",
      "temperature": 0.7
    },
    "build": {
      "model": "opencode/gpt-5.2-codex"
    }
  },
  "orxa": {
    "enforcement": {
      "delegation": "strict",
      "todoCompletion": "warn",
      "qualityGates": "strict",
      "memoryAutomation": "warn"
    }
  },
  "qualityGates": {
    "requireLint": true,
    "requireTypeCheck": true,
    "requireTests": false,
    "requireBuild": true
  }
}
```

### Example 4: Custom Agent for API Development

```json
{
  "enabled_agents": ["orxa", "plan", "build", "api-expert"],
  "custom_agents": [
    {
      "name": "api-expert",
      "description": "REST API design and implementation specialist",
      "model": "opencode/gpt-5.2-codex",
      "instructions": "You are an API design expert. Follow REST conventions, implement proper error handling, and ensure OpenAPI documentation.",
      "allowedTools": ["read", "edit", "write", "grep", "bash"]
    }
  ],
  "escalation": {
    "escalationMatrix": {
      "coder": "api-expert",
      "api-expert": "architect"
    }
  }
}
```

---

## Troubleshooting

### Configuration Not Loading

**Problem:** Changes to `orxa.json` don't take effect.

**Solutions:**
1. Check JSON syntax: `orxa doctor`
2. Verify file location: `cat ~/.config/opencode/orxa/orxa.json`
3. Restart OpenCode completely
4. Check for syntax errors in JSON

### Validation Errors

**Problem:** `orxa doctor` reports schema validation errors.

**Solutions:**
1. Check for typos in property names
2. Ensure correct types (strings vs arrays)
3. Verify primary agent overrides only include `model`
4. Reset to defaults: `orxa init --force`

### Agent Not Found

**Problem:** Custom agent or override not working.

**Solutions:**
1. Verify agent is in `enabled_agents` list
2. Check YAML file exists in correct location
3. Validate YAML syntax
4. Check OpenCode logs for loading errors

### Enforcement Not Working

**Problem:** Rules not being enforced.

**Solutions:**
1. Check enforcement level is `"strict"` not `"off"`
2. Verify plugin is loaded (look for welcome toast)
3. Check `orxa doctor` for configuration issues
4. Ensure no conflicting plugins

### Performance Issues

**Problem:** Slow response times.

**Solutions:**
1. Reduce `max_parallel_workstreams` in orchestration
2. Lower `sessionCheckpointInterval`
3. Disable unnecessary quality gates
4. Use faster models for appropriate agents

---

## Related Documentation

- [AGENTS.md](AGENTS.md) — Agent system documentation
- [ARCHITECTURE.md](ARCHITECTURE.md) — How configuration is processed
- [ORXA-MODE.md](ORXA-MODE.md) — Orchestration configuration
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) — Common issues and solutions
