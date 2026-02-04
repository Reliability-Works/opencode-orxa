# ORXA Guardrails + Orchestrate Trigger

## Goals
- Block ORXA from writing outside .orxa/ directory
- Allow ORXA to write .md and .json files inside .orxa/
- Fix enforcement when agentName is missing
- Change from "orxa" keyword to "/orchestrate" command
- Block orchestration when agent is plan

## Scope
ORXA may only write to paths matching these globs:
- .orxa/**/*.md
- .orxa/**/*.json

All other paths are blocked for ORXA.

## Keyword
Trigger: orchestrate (case insensitive, word boundary)
Blocked when: input.agent === "plan" OR session.agentName === "plan"

## Files to Modify

### Code Files
1. src/middleware/delegation-enforcer.ts
2. src/hooks/orxa-detector.ts
3. src/config/default-config.ts
4. src/plugin.ts
5. src/types.ts

### Documentation Files
1. docs/ORXA-MODE.md
2. docs/guide/understanding-orchestration.md
3. docs/TROUBLESHOOTING.md
4. docs/ARCHITECTURE.md
5. docs/CONFIGURATION.md
6. docs/AGENTS.md
7. README.md
8. opencode-orxa-spec.md
9. agents/orxa.yaml

### Test Files
1. tests/hooks/orxa-detector.test.ts
2. tests/orxa.test.ts
3. tests/delegation-enforcer.test.ts
4. tests/config/schema.test.ts

## Implementation Details

### 1. delegation-enforcer.ts

#### Add normalizeWriteTarget helper (after imports, before WRITE_TOOLS)
```typescript
import fs from "fs";
import path from "path";

const normalizeWriteTarget = (targetPath: string, workspaceRoot: string): string => {
  // Resolve workspace root symlink once
  const realWorkspaceRoot = fs.realpathSync(workspaceRoot);
  
  // Handle Windows absolute paths (e.g., C:\...)
  let normalizedTarget = targetPath;
  if (/^[a-zA-Z]:[\\/]/.test(targetPath)) {
    normalizedTarget = targetPath.replace(/\\/g, '/');
  }
  
  // Resolve target path against workspace root if relative
  let absoluteTarget = normalizedTarget;
  if (!path.isAbsolute(normalizedTarget) && !/^[a-zA-Z]:/i.test(normalizedTarget)) {
    absoluteTarget = path.join(realWorkspaceRoot, normalizedTarget);
  }
  
  // For existing paths, resolve symlinks. For non-existent paths, resolve parent directory.
  let realTarget: string;
  try {
    realTarget = fs.realpathSync(absoluteTarget);
  } catch (e) {
    // Path doesn't exist - resolve the parent directory instead
    const parentDir = path.dirname(absoluteTarget);
    try {
      const realParent = fs.realpathSync(parentDir);
      realTarget = path.join(realParent, path.basename(absoluteTarget));
    } catch {
      // Parent also doesn't exist - use as-is (will be blocked by allowlist)
      realTarget = absoluteTarget;
    }
  }
  
  // Make relative to workspace root
  let relativePath = path.relative(realWorkspaceRoot, realTarget);
  
  // Normalize separators and strip leading ./
  relativePath = relativePath.replace(/\\/g, '/').replace(/^\.\//, '');
  
  return relativePath;
};
```

#### Update extractWriteTargets (around line 197-229)
Add handling for a/b prefixes in apply_patch:
```typescript
if (toolName === "apply_patch" && typeof record.patchText === "string") {
  const pattern = /^\*\*\* (Add File|Update File|Delete File):\s*(.+)$/gm;
  let match = pattern.exec(record.patchText);
  while (match) {
    let filePath = match[2].trim();
    // Strip a/ or b/ prefix if present (from git diff format)
    filePath = filePath.replace(/^[ab]\//, '');
    paths.push(filePath);
    match = pattern.exec(record.patchText);
  }
}
```

#### Update enforceDelegation (around line 258)
Add effectiveAgentName and use it for all checks:
```typescript
const effectiveAgentName = (agentName || sessionAgentName).toLowerCase();
const isOrxa = effectiveAgentName === "orxa";

// When agent identity is unknown (empty), treat as ORXA for safety
// This prevents bypass by omitting agentName
if (!effectiveAgentName) {
  // Unknown agent - apply ORXA restrictions to be safe
  // Only allow writes to allowlist paths
}
```

#### Update write allowlist check (around line 320-348)
Normalize paths before checking:
```typescript
if (isWriteTool(normalizedTool)) {
  const rawTargets = extractWriteTargets(normalizedTool, context.args);
  const workspaceRoot = context.workspaceRoot || process.cwd();
  const targets = rawTargets.map(t => normalizeWriteTarget(t, workspaceRoot));
  
  const allowlist = config.orxa.planWriteAllowlist;
  const matchesAllowlist = targets.length > 0 && targets.every(t => matchesAnyGlob(t, allowlist));
  
  // For ORXA or unknown agent, enforce allowlist
  if (isOrxa || !effectiveAgentName) {
    if (!matchesAllowlist) {
      return {
        ...decide(config, "Writes are limited to .orxa/**/*.md and .orxa/**/*.json"),
        recommendedAgent: "plan",
        metadata: { targets }
      };
    }
    return { allow: true };
  }
  // ... rest of logic
}
```

### 2. orxa-detector.ts

#### Update ORXA_PATTERN (line 15)
```typescript
const ORXA_PATTERN = /\borchestrate\b/gi;
```

#### Update shouldTriggerOrxa (line 283-286)
```typescript
export function shouldTriggerOrxa(message: string): boolean {
  return /\borchestrate\b/gi.test(message);
}
```

#### Update stripOrxaKeyword (line 294-299)
Uses ORXA_PATTERN which is already updated.

#### Update createOrchestratorDelegationPrompt (line 314-335)
Change reference from "orxa" to "orchestrate":
```typescript
return `**Task**: Activate Orxa orchestration for: "${cleanedMessage}"
...
**Context**: User explicitly requested parallel execution with "/orchestrate" command...`;
```

#### Update ORXA_SYSTEM_PROMPT (lines 20-75)
Update all references from "orxa" keyword to "/orchestrate" command.

#### Update createOrxaDetector (around line 208-233)
Add plan agent check at the start:
```typescript
export function createOrxaDetector(ctx: PluginInput) {
  return async function orxaDetector(
    input: ChatMessageInput,
    output: ChatMessageOutput
  ): Promise<void> {
    // Block if agent is plan
    const activeAgent = (input.agent || "").toLowerCase();
    if (activeAgent === "plan") {
      return;
    }
    
    // Also check session agent if available
    // (would need session lookup here)
    
    // Rest of existing logic...
  };
}
```

#### Update legacy orxaDetector (around line 240-275)
Add plan agent check:
```typescript
export async function orxaDetector(context: HookContext): Promise<EnforcementResult> {
  // Block if agent is plan
  const effectiveAgentName = (context.agentName || context.session?.agentName || "").toLowerCase();
  if (effectiveAgentName === "plan") {
    return { allow: true };
  }
  
  // Rest of existing logic...
}
```

### 3. default-config.ts (line 83)
```typescript
planWriteAllowlist: [".orxa/**/*.md", ".orxa/**/*.json"],
```

### 4. plugin.ts (lines 127-137)
Add workspaceRoot to context:
```typescript
const context = {
  toolName: toolInput.tool,
  tool: { name: toolInput.tool },
  args: toolOutput?.args ?? {},
  agentName: toolInput.agent,
  agent: toolInput.agent,
  config: orxaConfig,
  session,
  sessionId: toolInput.sessionID,
  attachments: toolInput.attachments,
  workspaceRoot: ctx.directory,  // ADD THIS
};
```

### 5. types.ts (lines 37-66)
Add to HookContext interface:
```typescript
export interface HookContext {
  // ... existing fields ...
  workspaceRoot?: string;
}
```

## Missing Agent Identity Behavior

When both agentName and session.agentName are empty/undefined:
1. Treat as potentially ORXA (most restrictive)
2. Apply write allowlist restrictions
3. Block all writes outside .orxa/**/*.md and .orxa/**/*.json
4. Log warning about unknown agent identity

This prevents bypass by omitting agent identification.

## Verification

Run tests:
```bash
npm test -- tests/hooks/orxa-detector.test.ts
npm test -- tests/orxa.test.ts
npm test -- tests/delegation-enforcer.test.ts
npm test -- tests/config/schema.test.ts
npm test
```
