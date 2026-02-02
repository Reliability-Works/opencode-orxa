# Customizing Agents

Step-by-step guide to customizing Orxa agents for your specific workflow needs.

## Table of Contents

- [Overview](#overview)
- [Customization Methods](#customization-methods)
- [Method 1: Configuration Overrides](#method-1-configuration-overrides)
- [Method 2: YAML Override Files](#method-2-yaml-override-files)
- [Method 3: Creating Custom Agents](#method-3-creating-custom-agents)
- [Primary Agent Customization](#primary-agent-customization)
- [Subagent Customization](#subagent-customization)
- [Best Practices](#best-practices)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)

---

## Overview

Orxa provides three levels of agent customization:

| Method               | Scope       | Complexity | Use Case                    |
|----------------------|-------------|------------|-----------------------------|
| **Config Overrides** | JSON config | Easy       | Quick model/temp changes    |
| **YAML Overrides**   | File-based  | Medium     | System prompt modifications |
| **Custom Agents**    | New agents  | Advanced   | Entirely new capabilities   |

### What You Can Customize

**Primary Agents (orxa, plan):**
- ✅ Model selection
- ❌ System prompt (locked for consistency)
- ❌ Tool access (locked for enforcement)

**Subagents (all 13):**
- ✅ Model selection
- ✅ Temperature
- ✅ System prompt
- ✅ Custom instructions
- ✅ Tool access
- ✅ Description

---

## Customization Methods

### Quick Comparison

```
┌─────────────────────────────────────────────────────────────┐
│  METHOD          │  LOCATION                    │  SCOPE    │
├─────────────────────────────────────────────────────────────┤
│  Config Override │  orxa.json                   │  Simple   │
│  YAML Override   │  agents/overrides/*.yaml     │  Full     │
│  Custom Agent    │  agents/custom/*.yaml        │  New      │
└─────────────────────────────────────────────────────────────┘
```

---

## Method 1: Configuration Overrides

The simplest way to customize — edit your `orxa.json` file.

### Location

```
~/.config/opencode/orxa/orxa.json
```

### What You Can Override

**Primary Agents (model only):**
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

**Subagents (more options):**
```json
{
  "agent_overrides": {
    "build": {
      "model": "opencode/gpt-5.2-codex",
      "temperature": 0.2,
      "customInstructions": "Always run the full test suite after changes"
    },
    "frontend": {
      "model": "opencode/gemini-3-pro",
      "temperature": 0.7
    }
  }
}
```

### Available Properties

| Property             | Type     | Applies To          | Description               |
|----------------------|----------|---------------------|---------------------------|
| `model`              | `string` | Primary + Subagents | Model identifier          |
| `temperature`        | `number` | Subagents only      | Creativity (0.0-1.0)      |
| `customInstructions` | `string` | Subagents only      | Appended to system prompt |

### Step-by-Step: Config Override

1. **Open config file:**
   ```bash
   orxa config
   # or
   code ~/.config/opencode/orxa/orxa.json
   ```

2. **Add override section:**
   ```json
   {
     "enabled_agents": ["orxa", "plan", "build", "coder"],
     "agent_overrides": {
       "build": {
         "model": "opencode/gpt-5.2-codex",
         "temperature": 0.2
       }
     }
   }
   ```

3. **Save and restart OpenCode**

4. **Verify:**
   ```bash
   orxa doctor
   ```

---

## Method 2: YAML Override Files

For more extensive customization, use YAML override files.

### Location

```
~/.config/opencode/orxa/agents/overrides/
```

### What You Can Override

**Full agent definition (subagents only):**
- Model
- Temperature
- System prompt (full replacement)
- Tools (allowed/blocked)
- Description

### File Structure

```yaml
# ~/.config/opencode/orxa/agents/overrides/build.yaml
name: build
model: opencode/gpt-5.2-codex
temperature: 0.2
description: Senior Lead Engineer with focus on testing

system_prompt: |
  You are the Lead Engineer. You handle the heavy lifting of implementation.
  
  ## Testing Protocol
  1. Write tests before implementation (TDD when possible)
  2. Run tests after every change
  3. Aim for >80% coverage
  4. Include edge case tests
  
  ## Implementation Protocol
  1. Precision fixes: fix bugs minimally; no unrelated refactors.
  2. Match existing codebase patterns and style.
  3. Never suppress type errors; fix them properly.
  4. Run lsp_diagnostics and relevant tests after every change.
  
  ## Memory Protocol
  - No direct writes: you are forbidden from using supermemory add.
  - Provide Memory Recommendations for @orxa.

tools:
  - read
  - edit
  - write
  - bash
  - grep
  - glob
  - skill
```

### Step-by-Step: YAML Override

1. **Create overrides directory:**
   ```bash
   mkdir -p ~/.config/opencode/orxa/agents/overrides
   ```

2. **Create override file:**
   ```bash
   touch ~/.config/opencode/orxa/agents/overrides/build.yaml
   ```

3. **Edit the file:**
   ```yaml
   name: build
   model: opencode/gpt-5.2-codex
   temperature: 0.2
   system_prompt: |
     Your custom system prompt here...
   ```

4. **Save and restart OpenCode**

5. **Verify override loaded:**
   ```bash
   orxa doctor
   # Should show: "Custom overrides: build"
   ```

### Override Examples

#### Example 1: Testing-Focused Build Agent

```yaml
# ~/.config/opencode/orxa/agents/overrides/build.yaml
name: build
model: opencode/gpt-5.2-codex
temperature: 0.2
description: Senior Lead Engineer with TDD focus

system_prompt: |
  You are the Lead Engineer with a strong focus on test-driven development.
  
  ## TDD Protocol
  1. Write failing test first
  2. Implement minimal code to pass
  3. Refactor while keeping tests green
  4. Repeat
  
  ## Requirements
  - Every feature must have tests
  - Bug fixes must include regression tests
  - Run full test suite before completion
  - Coverage should not decrease
  
  ## Memory Protocol
  - No direct writes: you are forbidden from using supermemory add.
  - Provide Memory Recommendations for @orxa.

tools:
  - read
  - edit
  - write
  - bash
  - grep
  - glob
  - skill
```

#### Example 2: Accessibility-Focused Frontend Agent

```yaml
# ~/.config/opencode/orxa/agents/overrides/frontend.yaml
name: frontend
model: opencode/gemini-3-pro
temperature: 0.3
description: Frontend specialist with accessibility expertise

system_prompt: |
  You are a frontend specialist with deep expertise in accessibility (a11y).
  
  ## Accessibility Requirements
  - All interactive elements must be keyboard accessible
  - Use semantic HTML elements
  - Include proper ARIA labels
  - Maintain WCAG 2.1 AA compliance
  - Test with screen readers in mind
  
  ## Styling
  - Use Tailwind CSS
  - Ensure color contrast ratios meet standards
  - Support reduced motion preferences
  - Test at 200% zoom
  
  ## Memory Protocol
  - No direct writes: you are forbidden from using supermemory add.
  - Provide Memory Recommendations for @orxa.

tools:
  - read
  - edit
  - write
  - glob
```

#### Example 3: Security-Focused Architect

```yaml
# ~/.config/opencode/orxa/agents/overrides/architect.yaml
name: architect
model: opencode/gpt-5.2-codex
temperature: 0.1
description: System architect with security focus

system_prompt: |
  You are a system architect specializing in secure application design.
  
  ## Security-First Approach
  - Consider security implications of every decision
  - Follow OWASP guidelines
  - Design for least privilege
  - Plan for audit logging
  - Consider data protection requirements
  
  ## Architecture Principles
  - Defense in depth
  - Fail securely
  - Keep security simple
  - Fix vulnerabilities at root cause
  
  ## Memory Protocol
  - No direct writes: you are forbidden from using supermemory add.
  - Provide Memory Recommendations for @orxa.

tools:
  - read
  - edit
  - write
  - grep
  - bash
```

---

## Method 3: Creating Custom Agents

Create entirely new agents for specialized tasks.

### When to Create Custom Agents

- ✅ Domain-specific expertise needed
- ✅ Repeated similar tasks
- ✅ Unique tool requirements
- ✅ Team-specific workflows

### Location

```
~/.config/opencode/orxa/agents/custom/
```

### Step-by-Step: Custom Agent

1. **Create custom directory:**
   ```bash
   mkdir -p ~/.config/opencode/orxa/agents/custom
   ```

2. **Create agent YAML file:**
   ```bash
   touch ~/.config/opencode/orxa/agents/custom/database-expert.yaml
   ```

3. **Define the agent:**
   ```yaml
   name: database-expert
   description: Database schema and query optimization specialist
   mode: subagent
   model: opencode/gpt-5.2-codex
   temperature: 0.3
   
   system_prompt: |
     You are a database expert specializing in PostgreSQL optimization.
     
     ## Expertise
     - Query optimization and indexing
     - Schema design and normalization
     - Migration strategies
     - Performance tuning
     
     ## Rules
     1. Always analyze query execution plans
     2. Recommend appropriate indexes
     3. Consider transaction boundaries
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

4. **Enable the agent:**
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

5. **Restart OpenCode**

6. **Test the agent:**
   ```
   You: @database-expert — Optimize the slow query in src/db/queries.ts
   ```

### Custom Agent Examples

#### Example 1: Database Expert

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
  - Transaction management
  
  ## Rules
  1. Always consider query performance
  2. Recommend appropriate indexes with EXPLAIN ANALYZE
  3. Use transactions for data consistency
  4. Explain your recommendations clearly
  5. Consider concurrency and locking
  
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

#### Example 2: DevOps Specialist

```yaml
# ~/.config/opencode/orxa/agents/custom/devops-expert.yaml
name: devops-expert
description: DevOps and infrastructure automation specialist
mode: subagent
model: opencode/gpt-5.2-codex
temperature: 0.2

system_prompt: |
  You are a DevOps specialist with expertise in CI/CD, Docker, and cloud infrastructure.
  
  ## Expertise
  - CI/CD pipeline design
  - Docker and containerization
  - Infrastructure as Code (Terraform, CloudFormation)
  - Cloud platforms (AWS, GCP, Azure)
  - Monitoring and observability
  
  ## Rules
  1. Security is paramount — no secrets in code
  2. Automate everything that can be automated
  3. Design for observability
  4. Document infrastructure decisions
  5. Consider cost implications
  
  ## Memory Protocol
  - No direct writes: you are forbidden from using supermemory add.
  - Provide Memory Recommendations for @orxa.

tools:
  - read
  - edit
  - write
  - bash
  - grep
  - glob
```

#### Example 3: API Designer

```yaml
# ~/.config/opencode/orxa/agents/custom/api-designer.yaml
name: api-designer
description: REST API and GraphQL design specialist
mode: subagent
model: opencode/gpt-5.2-codex
temperature: 0.2

system_prompt: |
  You are an API design specialist with expertise in REST and GraphQL.
  
  ## Expertise
  - REST API design (OpenAPI/Swagger)
  - GraphQL schema design
  - API versioning strategies
  - Authentication and authorization
  - Rate limiting and throttling
  
  ## Design Principles
  1. Follow RESTful conventions
  2. Use consistent naming
  3. Version APIs explicitly
  4. Document with OpenAPI
  5. Consider backward compatibility
  
  ## Memory Protocol
  - No direct writes: you are forbidden from using supermemory add.
  - Provide Memory Recommendations for @orxa.

tools:
  - read
  - edit
  - write
  - grep
  - bash
```

---

## Primary Agent Customization

### Limitations

Primary agents (`orxa`, `plan`) have restricted customization:

| Property        | Can Override? | Notes                  |
|-----------------|---------------|------------------------|
| `model`         | ✅ Yes         | Change the model       |
| `system_prompt` | ❌ No          | Locked for consistency |
| `tools`         | ❌ No          | Locked for enforcement |
| `temperature`   | ❌ No          | Use default            |

### Why These Restrictions?

The Orxa pattern relies on consistent behavior from primary agents:
- **Orxa** must always enforce delegation rules
- **Plan** must always follow planning protocols
- Changes to these would break the orchestration model

### Customizing Primary Agents

**Via config (model only):**
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

### Recommended Models

| Agent    | Recommended Model        | Reason                        |
|----------|--------------------------|-------------------------------|
| **orxa** | `opencode/kimi-k2.5`     | Excellent reasoning, tool use |
| **orxa** | `opencode/gpt-5.2-codex` | Superior technical decisions  |
| **plan** | `opencode/gpt-5.2-codex` | Strong planning capabilities  |
| **plan** | `opencode/kimi-k2.5`     | Good balance of capabilities  |

---

## Subagent Customization

### Full Customization Available

Subagents can be fully customized:

```yaml
name: build
model: opencode/gpt-5.2-codex
temperature: 0.2
description: Custom description

system_prompt: |
  Your complete custom system prompt...

tools:
  - read
  - edit
  - write
  - bash
  # Add or remove tools as needed
```

### Recommended Customizations

#### Build Agent

```yaml
# Focus areas to customize:
- Testing requirements
- Code quality standards
- Performance considerations
- Documentation requirements
```

#### Frontend Agent

```yaml
# Focus areas to customize:
- CSS framework preferences
- Component patterns
- Accessibility requirements
- Browser support
```

#### Architect Agent

```yaml
# Focus areas to customize:
- Design patterns
- Technology preferences
- Security requirements
- Scalability concerns
```

---

## Best Practices

### 1. Start Simple

Begin with config overrides before creating YAML files:

```json
{
  "agent_overrides": {
    "build": {
      "model": "opencode/gpt-5.2-codex"
    }
  }
}
```

### 2. Test Changes

After any customization:
1. Run `orxa doctor` to verify
2. Test with a simple task
3. Check that behavior changed as expected

### 3. Document Customizations

Add comments to your config:

```jsonc
{
  // Using GPT-5.2 for better code generation
  "agent_overrides": {
    "build": {
      "model": "opencode/gpt-5.2-codex"
    }
  }
}
```

### 4. Version Control

Track your customizations:

```bash
# Create a repo for your config
cd ~/.config/opencode/orxa
git init
git add .
git commit -m "Initial Orxa configuration"
```

### 5. Backup Before Major Changes

```bash
# Backup current config
cp ~/.config/opencode/orxa/orxa.json \
   ~/.config/opencode/orxa/orxa.json.backup
```

### 6. Gradual Rollout

Test customizations with `warn` enforcement first:

```json
{
  "orxa": {
    "enforcement": {
      "delegation": "warn"
    }
  }
}
```

---

## Examples

### Complete Configuration Example

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
    "database-expert",
    "git"
  ],
  
  "agent_overrides": {
    "orxa": {
      "model": "opencode/kimi-k2.5"
    },
    "plan": {
      "model": "opencode/gpt-5.2-codex"
    },
    "build": {
      "model": "opencode/gpt-5.2-codex",
      "temperature": 0.2
    },
    "frontend": {
      "model": "opencode/gemini-3-pro",
      "temperature": 0.3
    }
  },
  
  "custom_agents": [
    {
      "name": "database-expert",
      "description": "Database optimization specialist",
      "model": "opencode/gpt-5.2-codex",
      "instructions": "You are a database expert...",
      "allowedTools": ["read", "edit", "write", "bash", "grep"]
    }
  ]
}
```

### Directory Structure Example

```
~/.config/opencode/orxa/
├── orxa.json                    # Main config with overrides
├── agents/
│   ├── overrides/
│   │   ├── build.yaml          # Testing-focused build agent
│   │   └── frontend.yaml       # Accessibility-focused frontend
│   └── custom/
│       ├── database-expert.yaml
│       └── devops-expert.yaml
```

---

## Troubleshooting

### Custom Agent Not Appearing

**Checklist:**
- [ ] File in `~/.config/opencode/orxa/agents/custom/`
- [ ] Valid YAML syntax
- [ ] `name` field matches filename
- [ ] Added to `enabled_agents`
- [ ] OpenCode restarted

**Debug:**
```bash
# Check if file is valid YAML
node -e "console.log(require('js-yaml').load(require('fs').readFileSync('path/to/agent.yaml')))"

# Check if agent is in enabled list
grep "your-agent-name" ~/.config/opencode/orxa/orxa.json
```

### Override Not Taking Effect

**Checklist:**
- [ ] File in correct directory (`overrides/` not `custom/`)
- [ ] For primary agents: only `model` can be overridden
- [ ] Valid YAML syntax
- [ ] No conflicting overrides
- [ ] OpenCode restarted

### Model Change Not Working

**Solutions:**
1. Verify model identifier is correct
2. Check that model is available in your OpenCode
3. Try a different model
4. Check OpenCode logs for errors

### Too Many Customizations

If you have many customizations, consider:
- Consolidating similar custom agents
- Using `customInstructions` instead of full system prompts
- Creating agent "profiles" for different project types

---

## Next Steps

- 📖 [Agent Reference](../AGENTS.md) — Learn about all 15 built-in agents
- ⚙️ [Configuration Guide](../CONFIGURATION.md) — Full configuration options
- 🏗️ [Architecture](../ARCHITECTURE.md) — How agent loading works
- 🔧 [Troubleshooting](../TROUBLESHOOTING.md) — Common issues

---

**Happy customizing!** 🎨

Remember: The goal is to make agents work better for your specific needs while maintaining the core Orxa patterns that ensure quality.
