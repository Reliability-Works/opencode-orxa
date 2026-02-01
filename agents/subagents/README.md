# Subagents

This directory contains the default subagent definitions for the OpenCode Orxa plugin. You can customize any subagent by copying its YAML file to your own project and editing it there.

## How customization works

1. Copy the subagent YAML you want to customize.
2. Place it in your project’s `agents/subagents/` directory.
3. Edit the copied file (model, temperature, system prompt, or tools).

The plugin will prefer project-local definitions over bundled defaults.

## What you can customize

- **model**: Swap to any compatible model.
- **temperature**: Adjust creativity vs. determinism.
- **system_prompt**: Extend role guidance or add domain-specific rules.
- **tools**: Add/remove tools to align with your governance.

## Recommended guardrails

- Keep the **Memory Protocol** intact (no `supermemory add` in subagents).
- Preserve **delegation boundaries** (subagents should not delegate).
- Maintain **tool restrictions** for safety (e.g., avoid unrestricted bash in UI agents).

## Example: Override the frontend agent

```yaml
name: frontend
description: Frontend UI/UX specialist. Premium visuals, styling, and animations.
mode: subagent
model: opencode/gemini-3-pro
temperature: 0.2
system_prompt: |
  You are the UI/UX specialist. Prioritize accessibility and performance.

tools:
  - read
  - edit
  - write
  - bash
```

## Subagent list

- strategist
- reviewer
- build
- coder
- frontend
- architect
- git
- explorer
- librarian
- navigator
- writer
- multimodal
- mobile-simulator
