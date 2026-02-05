# AGENTS.md

This file is the working guide for any coding agent operating in this repository.

## 1. Purpose

`@reliabilityworks/opencode-orxa` is an OpenCode plugin that enforces manager-led, multi-agent workflows (delegation rules, TODO discipline, quality gates, memory guardrails, orchestration mode).

Primary implementation is in TypeScript under `src/`. YAML agent definitions live under `agents/`.

## 2. Fast Start

From repo root:

```bash
npm install
npm run typecheck
npm test -- --runInBand
```

Use these routinely while iterating:

```bash
npm run typecheck
npm run lint
npm test -- --runInBand
```

Build when changing runtime/plugin code:

```bash
npm run build
```

## 3. Key Directories

- `src/index.ts`: plugin entrypoint and registration
- `src/hooks/`: lifecycle hooks (`orxa-detector`, `orxa-indicator`, etc.)
- `src/middleware/`: enforcement core (`delegation-enforcer`, `todo-guardian`, `quality-gates`, `memory-automation`)
- `src/config/`: schema/defaults/loader
- `src/orxa/`: orchestration engine components
- `src/slash-commands/`: slash command handlers (including `/orchestrate`)
- `agents/`: primary + subagent YAML definitions
- `tests/`: Jest suites (source of truth for behavior)
- `docs/`: user/developer docs

## 4. Core Working Rules

1. Do not hand-edit `dist/` files. They are build artifacts from `src/`.
2. Keep behavior changes in `src/`, then run tests.
3. When changing agent models/prompts in `agents/`, update any tests that assert those exact values.
4. Preserve strict delegation semantics:
   - only Orxa delegates
   - subagents execute
   - Orxa does not directly implement code
5. Keep `/orchestrate` flow aligned with current design:
   - plan via `orxa-planner`
   - execute parallel workstreams via `orxa-worker`

## 5. Change Checklist

For any non-trivial change:

1. Update code/config/docs as needed.
2. Run `npm run typecheck`.
3. Run targeted tests first, then full tests:
   - `npm test -- --runInBand`
4. If packaging/runtime behavior changed, run `npm run build`.
5. Verify no accidental unrelated edits.

## 6. Common Task Notes

### A) Changing delegation behavior

- Usually touches:
  - `src/middleware/delegation-enforcer.ts`
  - `src/hooks/orxa-detector.ts`
  - `agents/orxa.yaml`
- Validate with:
  - `tests/delegation-enforcer.test.ts`
  - `tests/delegation-enforcer-coverage.test.ts`
  - `tests/hooks/orxa-detector.test.ts`

### B) Changing agent models/prompts

- Usually touches:
  - `agents/*.yaml`
  - `agents/subagents/*.yaml`
  - related docs in `agents/` and `docs/`
- Often requires test updates:
  - `tests/config-handler.test.ts`
  - `tests/agent-models.test.ts`

### C) Changing orchestration mode

- Usually touches:
  - `src/hooks/orxa-detector.ts`
  - `src/slash-commands/orchestrate.ts`
  - `src/orxa/*`
- Validate with:
  - `tests/orxa.test.ts`
  - `tests/hooks/orxa-detector.test.ts`
  - `tests/hooks/orxa-indicator.test.ts`

## 7. Source of Truth

- Behavior: tests in `tests/`
- Config constraints: `src/config/schema.ts`
- Defaults: `src/config/default-config.ts`
- Agent policy text: `agents/orxa.yaml`
- Deep docs: `docs/AGENTS.md`, `docs/ORXA-MODE.md`, `docs/ARCHITECTURE.md`
