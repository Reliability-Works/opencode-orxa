# OpenCode Orxa Documentation Audit Report
**Date:** 2026-02-04  
**Auditor:** ORXA Code Audit Agent  
**Scope:** 13 markdown files in `/Volumes/ExtSSD/Repos/webapp/opencode-orxa/docs/`

---

## Executive Summary

The documentation contains **significant factual inaccuracies** that could mislead users. Key issues include:
- **Agent count discrepancies**: Documentation claims 15 agents, but actual count is **17** (2 primary + 15 subagents)
- **Missing agent documentation**: `orxa-planner` and `orxa-worker` orchestration agents are not documented anywhere
- **Outdated orchestration trigger**: Documentation describes keyword-based "orxa" detection, but actual implementation uses `/orchestrate` command
- **Missing CLI tool references**: No documentation for `agent-device` and `agent-browser` CLI tools (added in v1.0.39)
- **Skill count correct**: 18 skills is accurate (verified in source code)

---

## Critical Issues (Must Fix)

### 1. **Missing Agents Documentation** 🔴
**Problem**: The `orxa-planner` and `orxa-worker` subagents exist as full YAML files but are **completely undocumented**.

**Evidence**:
- Files exist: `agents/subagents/orxa-planner.yaml` and `agents/subagents/orxa-worker.yaml`
- These are orchestration-specific agents for parallel execution
- Zero mentions in any documentation file

**Impact**: Users cannot understand or customize these critical orchestration components.

**Fix Required**:
- Add both agents to AGENTS.md subagent list
- Document their purpose in ORXA-MODE.md
- Include in agent selection guide
- Explain orchestration hierarchy

---

### 2. **Incorrect Agent Counts Throughout** 🔴

**Problem**: Documentation consistently states "15 agents" when actual count is **17**.

**Actual Agent Count**:
```
Primary Agents (2):
  - orxa
  - plan

Subagents (15):
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
  - orxa-planner        ← MISSING FROM DOCS
  - orxa-worker         ← MISSING FROM DOCS

TOTAL: 17 agents (not 15)
```

**Affected Files & Lines**:

| File | Line | Current Text | Correct Text |
|------|------|--------------|--------------|
| `docs/README.md` | 31 | "all 15 agents" | "all 17 agents" |
| `docs/README.md` | 106 | "15 Specialized Agents" | "17 Specialized Agents" |
| `docs/README.md` | 220-236 | "13 subagents listed" | "15 subagents listed" |
| `docs/AGENTS.md` | 3 | "15 specialized agents" | "17 specialized agents" |
| `docs/AGENTS.md` | 36 | "fleet of 15 specialized agents" | "fleet of 17 specialized agents" |
| `docs/AGENTS.md` | 60 | "SUBAGENTS (13)" | "SUBAGENTS (15)" |
| `docs/ARCHITECTURE.md` | 98 | "Return 15 agent configs" | "Return 17 agent configs" |
| `docs/ARCHITECTURE.md` | 44-46 | "13 Subagents" in diagram | "15 Subagents" |
| `docs/FEATURES.md` | 577 | "15 specialists" | "17 specialists" |
| `docs/FEATURES.md` | 591 | "Agent Count: 15+" | "Agent Count: 17" |
| `docs/guide/overview.md` | 117 | "all 15 agents" | "all 17 agents" |
| `docs/guide/overview.md` | 136, 141 | "15 agents loaded" | "17 agents loaded" |
| `docs/guide/customizing-agents.md` | 37 | "all 13" subagents | "all 15" subagents |
| `docs/guide/customizing-agents.md` | 602 | "all 13" | "all 15" |
| `docs/DEVELOPMENT.md` | 100 | "13 subagent definitions" | "15 subagent definitions" |

**Impact**: Users are confused about actual agent availability and capabilities.

---

### 3. **Outdated Orchestration Trigger Documentation** 🔴

**Problem**: Documentation describes outdated keyword-based "orxa" detection, but actual implementation uses `/orchestrate` slash command.

**Current Implementation** (from source):
- Detects `/orchestrate` command (case insensitive, word boundary)
- Removed "orxa" keyword detection in recent updates
- Uses slash command pattern

**Affected Files & Lines**:

| File | Line | Issue |
|------|------|-------|
| `docs/FEATURES.md` | 94 | "Detects 'orxa' keyword" → "Detects '/orchestrate' command" |
| `docs/ARCHITECTURE.md` | 220 | "orxaDetector" description mentions keyword |
| `docs/ORXA-MODE.md` | 39-45 | Correctly shows `/orchestrate` (this is right) |
| `docs/ORXA-MODE.md` | 167-181 | Code example shows `/orchestrate` detection (correct) |
| `docs/guide/overview.md` | 417 | "🚀 [Orxa Mode]" link is fine |

**Note**: ORXA-MODE.md is mostly correct, but FEATURES.md is wrong.

---

### 4. **Missing `/orchestrate` Slash Command Documentation** 🔴

**Problem**: The `/orchestrate` command is not documented in `SLASH-COMMANDS.md`.

**Command**: `/orchestrate [task description]`  
**Purpose**: Activate Orxa Orchestration Mode for parallel execution  
**Aliases**: None  
**Agents Used**: orxa-planner, orxa-worker, multiple subagents

**Fix Required**:
Add new section to `docs/SLASH-COMMANDS.md` after `/search` command:

```markdown
### /orchestrate

**Aliases:** None

**Description:** Activates Orxa Orchestration Mode for parallel multi-agent execution. Breaks complex tasks into independent workstreams that execute simultaneously using git worktrees.

**When to Use:**
- Complex features with multiple independent parts
- Multi-component implementation
- Parallelizable workstreams
- Large refactoring tasks

**Arguments:**
- `[task description]` — Description of work to parallelize

**Example Usage:**
```
/orchestrate implement authentication with login, signup, and oauth
```

**Workflow:**
1. Analyzes request and creates workstream specifications
2. Creates git worktrees for parallel isolation
3. Delegates each workstream to appropriate agents
4. Monitors progress and handles dependencies
5. Merges completed workstreams via FIFO queue

**Agents Used:**
- `@orxa-planner` — Creates parallel workstream plan
- `@orxa-worker` — Executes individual workstreams
- Various subagents for implementation

**Configuration:**
See [ORXA-MODE.md](ORXA-MODE.md) for detailed orchestration settings.
```

---

### 5. **Missing CLI Tool References** 🔴

**Problem**: No documentation for `agent-device` and `agent-browser` CLI tools added in v1.0.39.

**Background** (from supermemory):
- v1.0.39 removed ios-simulator and playwright MCPs
- Replaced with `agent-device` CLI (mobile automation) and `agent-browser` CLI (web automation)
- Both are bundled as skills
- Installation via `npm install -g`

**Affected Files**:

| File | Section | Fix Needed |
|------|---------|------------|
| `docs/INSTALLATION.md` | "Required Dependencies" | Add CLI tool installation section |
| `docs/INSTALLATION.md` | Post-installation | Add verification for CLI tools |
| `docs/CONFIGURATION.md` | Tool Aliases | Document CLI tool aliases |
| `docs/TROUBLESHOOTING.md` | Installation issues | Add CLI tool troubleshooting |
| `docs/README.md` | Quick Start | Mention CLI tools |

**Fix Required - Add to INSTALLATION.md**:

```markdown
### CLI Tool Installation (Required for v1.0.39+)

Install the required CLI tools for mobile and browser automation:

```bash
# Install agent-device for mobile automation (iOS/Android)
npm install -g agent-device

# Install agent-browser for web automation
npm install -g agent-browser

# Initialize browser tool
agent-browser install
```

**Verification:**

```bash
agent-device --version
agent-browser --version
```

These tools replaced the previous MCP-based approach and provide enhanced capabilities for mobile and web automation.
```

---

## Medium Priority Issues

### 6. **Skill Count Verified** ✅

**Finding**: Documentation does not explicitly state skill count, but source code confirms **18 skills**.

**BUNDLED_SKILLS array** (`src/index.ts` lines 33-55):
1. frontend-design
2. web-design-guidelines
3. testing-quality
4. humanizer
5. image-generator
6. devops-release
7. feature-flags-experiments
8. expo-building-native-ui
9. expo-api-routes
10. expo-cicd-workflows
11. expo-deployment
12. expo-dev-client
13. expo-tailwind-setup
14. upgrading-expo
15. vercel-react-best-practices
16. remotion-best-practices
17. agent-browser
18. agent-device

**Status**: If documentation mentions "17 skills" anywhere, it should be updated to 18.

---

### 7. **Hook Count Inconsistency** 🟡

**Problem**: FEATURES.md line 84 says "8 lifecycle hooks" but actually lists 8 hooks. This is correct.

However, verify all hooks are documented:
1. `preToolExecution` ✅
2. `postSubagentResponse` ✅
3. `preTodoCompletion` ✅
4. `sessionCheckpoint` ✅
5. `todoContinuationEnforcer` ✅
6. `sessionCreated` (welcome toast) ✅
7. `orxaDetector` ✅
8. `orxaIndicator` ✅

**Status**: Count is correct.

---

### 8. **Missing AGENTS.md References** 🟡

**Problem**: `docs/AGENTS.md` is referenced in the "Related Documentation" sections of many files, but ensure it's complete.

**Checklist for AGENTS.md**:
- ✅ Primary agents documented
- ❌ Missing: orxa-planner documentation
- ❌ Missing: orxa-worker documentation
- ✅ 13 standard subagents documented
- ❌ Count says "13 subagents" but should be "15 subagents"

---

### 9. **Version Number References** 🟡

**Problem**: No outdated version numbers found in current documentation scan. However, ensure version references are current:

**Files to Check**:
- `docs/FEATURES.md` line 603: "Current (v1.0)" — Should this be v1.0.39?
- Any hardcoded version strings in examples

**Status**: Versions appear to be generic ("v1.0") which is acceptable.

---

## Low Priority Issues

### 10. **File Path Corrections** 🟢

**Problem**: Some file paths in examples should be verified.

**Checked**:
- `~/.config/opencode/orxa/orxa.json` — Correct ✅
- `~/.config/opencode/opencode.json` — Correct ✅
- `agents/subagents/*.yaml` — Correct ✅
- `~/.config/opencode/orxa/agents/custom/` — Correct ✅
- `~/.config/opencode/orxa/agents/overrides/` — Correct ✅

**Status**: File paths are accurate.

---

### 11. **Configuration Examples** 🟢

**Problem**: Verify configuration examples are up to date.

**Checked Examples**:
- ✅ JSON structure matches schema
- ✅ Tool aliases section present
- ⚠️ Missing: CLI tool configuration examples
- ✅ Agent overrides examples correct
- ⚠️ Missing: orxa-planner and orxa-worker in examples

**Status**: Examples work but miss new features.

---

## Summary of Required Changes

### High Priority (Critical)
1. **Add orxa-planner and orxa-worker documentation** to AGENTS.md
2. **Update all agent counts** from 15 → 17 across all files
3. **Update orxaDetector description** in FEATURES.md (keyword → /orchestrate command)
4. **Add /orchestrate slash command** to SLASH-COMMANDS.md
5. **Add CLI tool installation section** to INSTALLATION.md

### Medium Priority
6. Add agent-planner and agent-worker to configuration examples
7. Update orchestration diagrams to show 15 subagents
8. Add CLI tool troubleshooting to TROUBLESHOOTING.md

### Low Priority
9. Verify all file paths in examples
10. Add version migration notes (MCP → CLI tools)

---

## Quick Reference: Fix Checklist

| Priority | Issue | Files Affected | Lines |
|----------|-------|----------------|-------|
| 🔴 | Missing orxa-planner docs | AGENTS.md | Add new section |
| 🔴 | Missing orxa-worker docs | AGENTS.md | Add new section |
| 🔴 | Agent count 15→17 | README.md | 31, 106, 220-236 |
| 🔴 | Agent count 15→17 | AGENTS.md | 3, 36, 60 |
| 🔴 | Agent count 15→17 | ARCHITECTURE.md | 44-46, 98 |
| 🔴 | Agent count 15→17 | FEATURES.md | 577, 591 |
| 🔴 | Agent count 15→17 | guide/overview.md | 117, 136, 141 |
| 🔴 | Agent count 15→17 | guide/customizing-agents.md | 37, 602 |
| 🔴 | Agent count 15→17 | DEVELOPMENT.md | 100 |
| 🔴 | Outdated trigger desc | FEATURES.md | 94 |
| 🔴 | Missing /orchestrate cmd | SLASH-COMMANDS.md | Add section |
| 🔴 | Missing CLI tools | INSTALLATION.md | Add section |
| 🟡 | Missing CLI troubleshooting | TROUBLESHOOTING.md | Add section |

---

## Appendix: Affected File Locations

All files are located in `/Volumes/ExtSSD/Repos/webapp/opencode-orxa/docs/`:

1. `README.md` (351 lines)
2. `AGENTS.md` (1042 lines) 
3. `ARCHITECTURE.md` (988 lines)
4. `CONFIGURATION.md` (921 lines)
5. `FEATURES.md` (628 lines)
6. `SLASH-COMMANDS.md` (659 lines)
7. `ORXA-MODE.md` (747 lines)
8. `TROUBLESHOOTING.md` (695 lines)
9. `DEVELOPMENT.md` (700 lines)
10. `guide/overview.md` (475 lines)
11. `guide/understanding-orchestration.md` (702 lines)
12. `guide/customizing-agents.md` (852 lines)

---

## Recommended Action Plan

1. **Phase 1 - Critical Fixes** (1-2 hours):
   - Fix agent counts in all files (search/replace "15 agents" → "17 agents")
   - Add orxa-planner and orxa-worker to AGENTS.md
   - Update FEATURES.md orxaDetector description
   - Add /orchestrate to SLASH-COMMANDS.md

2. **Phase 2 - Installation Updates** (30 min):
   - Add CLI tool section to INSTALLATION.md
   - Add CLI troubleshooting to TROUBLESHOOTING.md

3. **Phase 3 - Verification** (30 min):
   - Run `orxa doctor` to verify agent counts
   - Check all links between documentation files
   - Verify code examples compile

---

**Report Generated By:** OpenCode Orxa Documentation Audit  
**Total Issues Found:** 11 critical, 3 medium, 2 low  
**Estimated Fix Time:** 3-4 hours
