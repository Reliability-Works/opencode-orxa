/**
 * Orxa Keyword Detector Hook
 * 
 * Detects "orxa" keyword in user messages to trigger parallel orchestration mode.
 * Strips the keyword and injects the Orxa system prompt.
 */

import type { PluginInput } from "@opencode-ai/plugin";
import type { HookContext, EnforcementResult } from "../types.js";

/**
 * System prompt injected when Orxa mode is triggered.
 */
const ORXA_SYSTEM_PROMPT = `You are now in **ORXA ORCHESTRATION MODE**.

YOUR ROLE AS ORXA (ORCHESTRATOR):
- You are the orchestrator - you do NOT implement work yourself
- You delegate ALL work to subagents
- You NEVER write code, edit files, or call write/edit tools
- You ONLY use: read, task, and other read-only tools

## 6-Section Delegation Template (REQUIRED)
Every task tool call MUST include BOTH fields:
- **description**: A short title (3-5 words) describing the task
- **prompt**: The full 6-section delegation content

**CRITICAL RULES**:
1. Use the **prompt** field for the 6-section content (NOT "description")
2. Use the **description** field for a short task title only
3. Use single-line format (do not use actual line breaks)
4. Include all 6 section names (case-sensitive): Task, Expected Outcome, Required Tools, Must Do, Must Not Do, Context

**Correct Format**:
task({
  subagent_type: "coder",
  description: "Create login page",
  prompt: "**Task**: Create login page **Expected Outcome**: Working login form with validation **Required Tools**: read, edit **Must Do**: Use existing auth hook **Must Not Do**: Change API endpoints **Context**: Login page at app/login.tsx using better-auth"
})

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
     description: "Create workstream plan",
     prompt: "**Task**: Create workstream plan for [user request] **Expected Outcome**: JSON workstream plan with parallel groups **Required Tools**: read, glob, grep **Must Do**: Analyze codebase, identify all files to modify, create parallel workstreams **Must Not Do**: Skip discovery phase, miss any dependencies **Context**: Project at /path/to/project, Stack: Next.js + Go + Convex"
   })

2. Parse the JSON response with workstreams

3. Delegate workstreams in parallel:
   task({
      subagent_type: "coder",
      description: "Implement workstream",
      prompt: "**Task**: Implement [specific workstream] **Expected Outcome**: [deliverable] **Required Tools**: read, edit **Must Do**: [requirements] **Must Not Do**: [constraints] **Context**: [background info]"
    })`;

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

const ORXA_ACTIVE_KEY = "orxaModeActive";
const orxaSessionState = new Map<string, { active: boolean; updatedAt: string }>();

export const getOrxaSessionActive = (
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

export const setOrxaSessionActive = (
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

export const injectSystemPrompt = (
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

type OrxaToastClient = {
  tui: {
    showToast: (payload: {
      body: {
        title: string;
        message: string;
        variant: "success" | "info" | "warning" | "error";
        duration: number;
      };
    }) => Promise<void>;
  };
};

export const showOrxaToast = (client: OrxaToastClient): void => {
  client.tui
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
 * Extract text content from message parts.
 *
 * @param parts - Message parts from chat output
 * @returns Concatenated text content
 */
const extractMessageText = (
  parts: ChatMessageOutput["parts"]
): string => {
  if (!parts || !Array.isArray(parts)) {
    return "";
  }

  return parts
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text)
    .join("\n")
    .trim();
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
    // Only apply to ORXA agent - skip for all other agents
    const agentName = input.agent?.toLowerCase() || '';
    if (agentName !== 'orxa') {
      return;
    }

    // Extract text from message parts
    const messageText = extractMessageText(output.parts);

    // Check if message contains /orchestrate command
    if (!shouldTriggerOrxa(messageText)) {
      return;
    }

    // Strip the /orchestrate command from the message
    const cleanedMessage = stripOrxaKeyword(messageText);

    // Get the system prompt
    const systemPrompt = getOrxaSystemPrompt();

    // Inject system prompt into the message parts
    injectSystemPrompt(output.parts, systemPrompt, cleanedMessage);

    // Show toast notification
    showOrxaToast(ctx.client as unknown as OrxaToastClient);

    // Mark session as active for Orxa mode
    setOrxaSessionActive(input.sessionID, undefined, true);
  };
}

/**
 * Legacy hook for backward compatibility.
 * @deprecated Use createOrxaDetector with chat.message hook.
 */
export async function orxaDetector(context: HookContext): Promise<EnforcementResult> {
  void context;
  return { allow: true };
}

/**
 * Check if a message should trigger Orxa mode.
 * Detects "/orchestrate" command (with leading slash).
 *
 * @param message - Message to check
 * @returns Whether Orxa should be triggered
 */
export function shouldTriggerOrxa(message: string): boolean {
  // Check for /orchestrate command (with leading slash, word boundary, case insensitive)
  return /\/orchestrate\b/gi.test(message);
}

/**
 * Strip Orxa keyword from message.
 * Strips "/orchestrate" command (with leading slash).
 * 
 * @param message - Original message
 * @returns Message with keyword removed
 */
export function stripOrxaKeyword(message: string): string {
  return message
    .replace(/\/orchestrate\b/gi, '')
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

 **Context**: User explicitly requested parallel execution with "/orchestrate" command. This is a high-priority orchestration request.`;
}

/**
 * Format a delegation description with the required 6-section template.
 * This helper ensures all delegations follow the correct format.
 * 
 * @param sections - Object containing the 6 required sections
 * @returns Properly formatted single-line delegation description
 */
export function formatDelegationDescription(sections: {
  task: string;
  expectedOutcome: string;
  requiredTools: string;
  mustDo: string;
  mustNotDo: string;
  context: string;
}): string {
  return `**Task**: ${sections.task} **Expected Outcome**: ${sections.expectedOutcome} **Required Tools**: ${sections.requiredTools} **Must Do**: ${sections.mustDo} **Must Not Do**: ${sections.mustNotDo} **Context**: ${sections.context}`;
}

/**
 * Validate that a delegation description has all 6 required sections.
 * Returns missing sections or empty array if valid.
 * 
 * @param description - The delegation description to validate
 * @returns Array of missing section names
 */
export function validateDelegationDescription(description: string): string[] {
  const requiredSections = [
    "Task",
    "Expected Outcome", 
    "Required Tools",
    "Must Do",
    "Must Not Do",
    "Context"
  ];
  
  const missing: string[] = [];
  
  for (const section of requiredSections) {
    // Check for **Section**: pattern (case-sensitive)
    const pattern = new RegExp(`\\*\\*${section}\\*\\*\\s*:`);
    if (!pattern.test(description)) {
      missing.push(section);
    }
  }
  
  return missing;
}

export default orxaDetector;
