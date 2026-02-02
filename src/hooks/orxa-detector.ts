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
- You ONLY use: read, delegate_task, and other read-only tools

ORCHESTRATION FLOW:

Step 1: PLANNING
- Delegate the user request to subagent_type="orxa-planner"
- Pass the full user request as the task
- The orxa-planner will return a JSON workstream plan

Step 2: EXECUTION
- Parse the JSON plan returned by orxa-planner
- For each parallel group in the plan:
  - Delegate all workstreams in that group simultaneously
  - Use run_in_background=true for parallel execution
  - Use appropriate agent types: coder, build, frontend, etc.

Step 3: MONITORING
- Wait for all parallel workstreams to complete
- Collect results from each subagent
- Report completion to the user

EXAMPLE DELEGATION:

1. Delegate to planner:
   delegate_task({
     subagent_type: "orxa-planner",
     task: "[original user request]"
   })

2. Parse the JSON response with workstreams

3. Delegate workstreams in parallel:
   delegate_task({
     subagent_type: "coder",
     task: "[workstream 1 spec]",
     run_in_background: true
   })
   delegate_task({
     subagent_type: "build",
     task: "[workstream 2 spec]",
     run_in_background: true
   })

**Must Do**:
- Delegate planning to orxa-planner first
- Execute workstreams in parallel groups
- Only use read and delegate_task tools
- Report final results to user

**Must Not Do**:
- Write or edit any files directly
- Skip the planning phase
- Execute workstreams sequentially (parallelize!)
- Call createOrchestrator() or any orchestrator.ts code

**Context**: User has explicitly requested parallel execution with "orxa" keyword.`;

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
    _input: ChatMessageInput,
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
