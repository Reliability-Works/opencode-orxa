/**
 * Orxa Keyword Detector Hook
 * 
 * Detects "orxa" keyword in user messages to trigger parallel orchestration mode.
 * Strips the keyword and injects the Orxa system prompt.
 */

import type { PluginInput } from "@opencode-ai/plugin";
import type { HookContext, EnforcementResult } from "../types.js";
import type { OrxaDetectionResult } from "../orxa/types.js";

/**
 * Pattern to detect "orxa" keyword (case insensitive, word boundary).
 */
const ORXA_PATTERN = /\borxa\b/gi;

/**
 * System prompt injected when Orxa mode is triggered.
 */
const ORXA_SYSTEM_PROMPT = `You are now in **ORXA ORCHESTRATION MODE**.

Say "ORXA MODE ACTIVATED" to the user.

YOUR ROLE AS ORXA (ORCHESTRATOR):
- You are the orchestrator - you do NOT implement work yourself
- You delegate ALL work to subagents
- You NEVER write code, edit files, or call write/edit tools
- You ONLY use: read, task, and other read-only tools

## 6-Section Delegation Template (REQUIRED)
Every task tool call MUST include ALL 6 sections in the **description** field (NOT a "prompt" field).

**CRITICAL RULES**:
1. Use the **description** field - NOT "prompt", NOT "message", NOT "instructions"
2. Use single-line format (do not use actual line breaks)
3. Include all 6 section names (case-sensitive): Task, Expected Outcome, Required Tools, Must Do, Must Not Do, Context

**Correct Format**:
description: "**Task**: description **Expected Outcome**: description **Required Tools**: tools **Must Do**: requirements **Must Not Do**: constraints **Context**: background"

ORCHESTRATION FLOW:

Step 1: PLANNING
- Delegate the user request to subagent_type="orxa-planner"
- Pass the full user request as the task using the 6-section template
- The orxa-planner will return a JSON workstream plan

Step 2: EXECUTION
- Parse the JSON plan returned by orxa-planner
- For each parallel group in the plan:
  - Delegate all workstreams in that group simultaneously
  - Use run_in_background=true for parallel execution
  - Use appropriate agent types: coder, build, frontend, etc.
  - Each delegation MUST use the 6-section template above

Step 3: MONITORING
- Wait for all parallel workstreams to complete
- Collect results from each subagent
- Report completion to the user

EXAMPLE DELEGATION:

1. Delegate to planner:
   task({
     subagent_type: "orxa-planner",
     description: "**Task**: Create workstream plan for [user request] **Expected Outcome**: JSON workstream plan with parallel groups **Required Tools**: read, glob, grep **Must Do**: Analyze codebase, identify all files to modify, create parallel workstreams **Must Not Do**: Skip discovery phase, miss any dependencies **Context**: Project at /path/to/project, Stack: Next.js + Go + Convex"
   })

2. Parse the JSON response with workstreams

3. Delegate workstreams in parallel:
   task({
      subagent_type: "coder",
      description: "**Task**: Implement [specific workstream] **Expected Outcome**: [deliverable] **Required Tools**: read, edit **Must Do**: [requirements] **Must Not Do**: [constraints] **Context**: [background info]"
    })`;

const ORXA_ACTIVE_KEY = "orxaModeActive";
const orxaSessionState = new Map<string, { active: boolean; updatedAt: string }>();

const getOrxaSessionActive = (
  sessionID?: string,
  session?: { metadata?: Record<string, unknown> }
): boolean => {
  if (session) {
    if (session.metadata && typeof session.metadata[ORXA_ACTIVE_KEY] === "boolean") {
      return session.metadata[ORXA_ACTIVE_KEY] as boolean;
    }

    return false;
  }

  if (!sessionID) {
    return false;
  }

  return orxaSessionState.get(sessionID)?.active ?? false;
};

const setOrxaSessionActive = (
  sessionID?: string,
  session?: { metadata?: Record<string, unknown> },
  active: boolean = true
): void => {
  if (session) {
    session.metadata = {
      ...(session.metadata ?? {}),
      [ORXA_ACTIVE_KEY]: active,
    };
    return;
  }

  if (sessionID) {
    orxaSessionState.set(sessionID, {
      active,
      updatedAt: new Date().toISOString(),
    });
  }
};

/**
 * Detect if a message contains the Orxa keyword.
 * 
 * @param message - The user's message
 * @returns Detection result with cleaned message
 */
export function detectOrxaKeyword(message: string): OrxaDetectionResult {
  const matches = message.match(ORXA_PATTERN);
  
  if (!matches || matches.length === 0) {
    return {
      triggered: false,
      cleaned_message: message,
    };
  }

  // Remove the keyword from the message
  const cleanedMessage = message
    .replace(ORXA_PATTERN, '')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    triggered: true,
    cleaned_message: cleanedMessage,
    keyword_variant: matches[0],
    task_description: cleanedMessage,
  };
}

type ChatMessageInput = {
  sessionID: string;
  agent?: string;
  model?: { providerID: string; modelID: string };
  messageID?: string;
};

type ChatMessageOutput = {
  message: Record<string, unknown>;
  parts: Array<{ type: string; text?: string; [key: string]: unknown }>;
};

const extractPromptText = (parts: ChatMessageOutput["parts"]): string =>
  parts
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text)
    .join("\n")
    .trim();

const injectSystemPrompt = (
  parts: ChatMessageOutput["parts"],
  systemPrompt: string,
  cleanedMessage: string
): void => {
  const textPartIndex = parts.findIndex(
    (part) => part.type === "text" && typeof part.text === "string"
  );

  if (textPartIndex === -1) {
    return;
  }

  const originalText = parts[textPartIndex].text ?? "";
  const messageText = cleanedMessage || originalText;
  parts[textPartIndex].text = `${systemPrompt}\n\n---\n\n${messageText}`;
};

const showOrxaToast = (ctx: PluginInput): void => {
  ctx.client.tui
    .showToast({
      body: {
        title: "Orxa Mode Activated",
        message: "Parallel orchestration engaged.",
        variant: "success" as const,
        duration: 3000,
      },
    })
    .catch(() => {
      // Ignore toast errors
    });
};

/**
 * Chat message hook for Orxa detection.
 *
 * @param ctx - Plugin input for TUI access
 * @returns Handler for chat.message
 */
export function createOrxaDetector(ctx: PluginInput) {
  return async function orxaDetector(
    input: ChatMessageInput,
    output: ChatMessageOutput
  ): Promise<void> {
    const promptText = extractPromptText(output.parts);
    if (!promptText) {
      return;
    }

    const detection = detectOrxaKeyword(promptText);

    if (!detection.triggered) {
      return;
    }

    const isActive = getOrxaSessionActive(input.sessionID);
    if (isActive) {
      return;
    }

    setOrxaSessionActive(input.sessionID, undefined, true);

    showOrxaToast(ctx);
    injectSystemPrompt(output.parts, ORXA_SYSTEM_PROMPT, detection.cleaned_message);
  };
}

/**
 * Legacy hook for backward compatibility.
 * @deprecated Use createOrxaDetector with chat.message hook.
 */
export async function orxaDetector(context: HookContext): Promise<EnforcementResult> {
  if (context.toolName || context.tool) {
    return { allow: true };
  }

  const message =
    context.session?.messages?.[context.session.messages.length - 1]?.content || "";

  if (!message) {
    return { allow: true };
  }

  const detection = detectOrxaKeyword(message);

  if (!detection.triggered) {
    return { allow: true };
  }

  const sessionID = context.sessionId ?? context.session?.id;
  const isActive = getOrxaSessionActive(sessionID, context.session);
  if (isActive) {
    return { allow: true };
  }

  setOrxaSessionActive(sessionID, context.session, true);

  return {
    allow: true,
    metadata: {
      orxa_triggered: true,
      cleaned_message: detection.cleaned_message,
      inject_system_prompt: ORXA_SYSTEM_PROMPT,
    },
    message: `🚀 **ORXA MODE ACTIVATED**\n\nParallel orchestration engaged. Delegating to orchestrator...`,
  };
}

/**
 * Check if a message should trigger Orxa mode.
 *
 * @param message - Message to check
 * @returns Whether Orxa should be triggered
 */
export function shouldTriggerOrxa(message: string): boolean {
  // Create new regex instance to avoid state issues with global flag
  return /\borxa\b/gi.test(message);
}

/**
 * Strip Orxa keyword from message.
 * 
 * @param message - Original message
 * @returns Message with keyword removed
 */
export function stripOrxaKeyword(message: string): string {
  return message
    .replace(ORXA_PATTERN, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Get the Orxa system prompt.
 */
export function getOrxaSystemPrompt(): string {
  return ORXA_SYSTEM_PROMPT;
}

/**
 * Create a delegation prompt for the orchestrator.
 * 
 * @param cleanedMessage - User request with keyword stripped
 * @returns Formatted delegation prompt
 */
export function createOrchestratorDelegationPrompt(cleanedMessage: string): string {
  return `**Task**: Activate Orxa orchestration for: "${cleanedMessage}"

**Expected Outcome**: 
- Task broken into parallel workstreams by orxa-planner
- Each workstream delegated to appropriate subagents in parallel
- Results collected and reported to user

**Must Do**:
- Step 1: Delegate planning to subagent_type="orxa-planner" with the user request
- Step 2: Parse the JSON workstream plan returned
- Step 3: Delegate each workstream in parallel using run_in_background=true
- Step 4: Monitor progress and report completion

**Must Not Do**:
- Write or edit files directly (you are the orchestrator)
- Skip the planning phase with orxa-planner
- Execute workstreams sequentially instead of in parallel
- Call createOrchestrator() or any code from orchestrator.ts

**Context**: User explicitly requested parallel execution with "orxa" keyword. This is a high-priority orchestration request.`;
}

export default orxaDetector;
