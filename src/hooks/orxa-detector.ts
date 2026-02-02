/**
 * Orxa Keyword Detector Hook
 * 
 * Detects "orxa" keyword in user messages to trigger parallel orchestration mode.
 * Strips the keyword and injects the Orxa system prompt.
 */

import type { HookContext, EnforcementResult } from '../types.js';
import type { OrxaDetectionResult } from '../orxa/types.js';

/**
 * Pattern to detect "orxa" keyword (case insensitive, word boundary).
 */
const ORXA_PATTERN = /\borxa\b/gi;

/**
 * System prompt injected when Orxa mode is triggered.
 */
const ORXA_SYSTEM_PROMPT = `You are now in **ORXA ORCHESTRATION MODE**.

Orxa enables parallel multi-agent execution for complex tasks. When you see this prompt, the user's request will be:

1. **Analyzed** - Break into independent workstreams
2. **Parallelized** - Each workstream gets its own git worktree
3. **Executed** - Multiple workstreams run simultaneously
4. **Merged** - Results are cherry-picked back to main branch

YOUR ROLE AS ORXA (ORCHESTRATOR):
- Do NOT implement the work yourself
- Use the orchestration system directly from src/orxa/orchestrator.ts
- Call createOrchestrator() and use it to run orchestration
- Monitor progress, merge queue, and handle conflicts that arise

ORCHESTRATION FORMAT:
When activating orchestration, use:

**Task**: Activate Orxa orchestration for: [original user request without "orxa" keyword]

**Expected Outcome**: Parallel execution of workstreams with automatic merging

**Must Do**:
- Call createOrchestrator() from src/orxa/orchestrator.ts
- Start orchestration with the cleaned user request
- Track progress events and completion signal

**Must Not Do**:
- Delegate to any external orchestrator agent
- Implement features directly
- Skip the orchestration process

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

/**
 * Pre-tool execution hook for Orxa detection.
 * 
 * @param context - Hook context
 * @returns Enforcement result with Orxa prompt if triggered
 */
export async function orxaDetector(context: HookContext): Promise<EnforcementResult> {
  // Only check on initial user message (not tool executions)
  if (context.toolName || context.tool) {
    return { allow: true };
  }

  // Get the user's message from context
  const message = context.session?.messages?.[context.session.messages.length - 1]?.content || '';
  
  if (!message) {
    return { allow: true };
  }

  const detection = detectOrxaKeyword(message);

  if (!detection.triggered) {
    return { allow: true };
  }

  // Orxa keyword detected - inject system prompt
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
- Task broken into parallel workstreams
- Each workstream executed in isolated git worktree
- Results automatically merged via cherry-pick
- Conflicts resolved by the configured conflict resolution agent

**Must Do**:
- Call createOrchestrator() from src/orxa/orchestrator.ts
- Start orchestration with the cleaned user request
- Monitor progress and report completion

**Must Not Do**:
- Delegate to any external orchestrator agent
- Implement features directly
- Skip the orchestration workflow

**Context**: User explicitly requested parallel execution with "orxa" keyword. This is a high-priority orchestration request.`;
}

export default orxaDetector;
