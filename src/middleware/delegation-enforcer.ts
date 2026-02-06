import fs from "fs";
import path from "path";
import { minimatch } from "minimatch";
import type { OrxaConfig } from "../config/schema.js";
import type { EnforcementResult, HookContext } from "../types.js";

const WRITE_TOOLS = new Set([
  "write",
  "edit",
  "apply_patch",
  "write_to_file",
  "replace_file_content",
  "multi_replace_file_content",
]);

const MOBILE_TOOL_PREFIXES = ["agent-device", "android", "mobile"];

const normalizeToolName = (toolName: string): string => toolName.trim();

const normalizeWriteTarget = (targetPath: string, workspaceRoot: string): string => {
  // Resolve workspace root symlink
  const realWorkspaceRoot = fs.realpathSync(workspaceRoot);
  
  // Handle Windows absolute paths (e.g., C:\...)
  let normalizedTarget = targetPath;
  if (/^[a-zA-Z]:[\\/]/.test(targetPath)) {
    normalizedTarget = targetPath.replace(/\\/g, "/");
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
    const parentDir = path.dirname(absoluteTarget);
    try {
      const realParent = fs.realpathSync(parentDir);
      realTarget = path.join(realParent, path.basename(absoluteTarget));
    } catch {
      realTarget = absoluteTarget;
    }
  }
  
  // Make relative to workspace root
  let relativePath = path.relative(realWorkspaceRoot, realTarget);
  relativePath = relativePath.replace(/\\/g, "/").replace(/^\.\//, "");
  
  return relativePath;
};

const resolvePrompt = (args: unknown, explicitPrompt?: string): string => {
  if (explicitPrompt) {
    return explicitPrompt;
  }

  if (!args || typeof args !== "object") {
    return "";
  }

  const record = args as Record<string, unknown>;
  
  // For task tool, the 6-section content is in the 'prompt' field
  // The 'description' field is just a short title (3-5 words)
  // Check prompt first as it contains the actual task content
  if (typeof record.prompt === "string") {
    return record.prompt;
  }
  
  // Check input wrapper for task tool
  if (record.input && typeof record.input === "object") {
    const input = record.input as Record<string, unknown>;
    if (typeof input.prompt === "string") {
      return input.prompt;
    }
    if (typeof input.description === "string") {
      return input.description;
    }
  }
  
  // Fallback to description for backward compatibility
  if (record.description && typeof record.description === "string") {
    return record.description;
  }
  
  // Check for nested prompt in message, instructions, task, context objects
  const nestedCandidates = [
    record.message,
    record.instructions,
    record.task,
    record.context,
  ];
  
  for (const candidate of nestedCandidates) {
    if (candidate && typeof candidate === "object") {
      const nested = candidate as Record<string, unknown>;
      if (typeof nested.prompt === "string") {
        return nested.prompt;
      }
    }
  }
  
  // Check remaining direct string fields
  const stringCandidates = [
    record.message,
    record.instructions,
    record.task,
    record.context,
  ];

  for (const candidate of stringCandidates) {
    if (typeof candidate === "string") {
      return candidate;
    }
  }

  return "";
};

const SECTION_ALIASES: Record<string, string[]> = {
  "Context": ["Context", "Project Context"],
};

const extractSectionMissing = (prompt: string, sections: string[]): string[] => {
  if (!prompt || typeof prompt !== "string") {
    return sections;
  }
  
  return sections.filter((section) => {
    const aliases = SECTION_ALIASES[section] || [section];
    return !aliases.some((alias) => {
      // Simple case-sensitive check - just look for the section name in the prompt
      // This is more lenient and allows various formatting styles
      return prompt.includes(alias);
    });
  });
};

const extractImageCount = (args: unknown, attachments?: HookContext["attachments"]): number => {
  let count = 0;

  if (attachments) {
    count += attachments.filter((item) => item.type === "image" || item.mimeType?.startsWith("image/")).length;
  }

  if (args && typeof args === "object") {
    const record = args as Record<string, unknown>;
    const images = record.images;
    if (Array.isArray(images)) {
      count += images.length;
    }

    const files = record.attachments;
    if (Array.isArray(files)) {
      count += files.filter((item) => {
        if (!item || typeof item !== "object") {
          return false;
        }
        const attachment = item as Record<string, unknown>;
        const type = attachment.type;
        const mime = attachment.mimeType;
        return type === "image" || (typeof mime === "string" && mime.startsWith("image/"));
      }).length;
    }
  }

  return count;
};

const extractToolOutputChars = (args: unknown): number => {
  if (!args || typeof args !== "object") {
    return 0;
  }

  const record = args as Record<string, unknown>;
  const context = record.context;
  if (!context || typeof context !== "object") {
    return 0;
  }

  const ctx = context as Record<string, unknown>;
  const outputs = ctx.toolOutputs ?? ctx.toolOutput;
  if (!outputs) {
    return 0;
  }

  if (typeof outputs === "string") {
    return outputs.length;
  }

  if (Array.isArray(outputs)) {
    return outputs.reduce((sum, entry) => {
      if (typeof entry === "string") {
        return sum + entry.length;
      }
      if (entry && typeof entry === "object") {
        const value = (entry as Record<string, unknown>).content;
        if (typeof value === "string") {
          return sum + value.length;
        }
      }
      return sum;
    }, 0);
  }

  return 0;
};

const extractDelegationAgent = (args: unknown): string => {
  if (!args || typeof args !== "object") {
    return "";
  }

  const record = args as Record<string, unknown>;
  if (typeof record.subagent_type === "string") {
    return record.subagent_type.trim().toLowerCase();
  }
  if (typeof record.agent === "string") {
    return record.agent.trim().toLowerCase();
  }
  if (record.input && typeof record.input === "object") {
    const input = record.input as Record<string, unknown>;
    if (typeof input.subagent_type === "string") {
      return input.subagent_type.trim().toLowerCase();
    }
    if (typeof input.agent === "string") {
      return input.agent.trim().toLowerCase();
    }
  }

  return "";
};

const VISUAL_DELEGATION_PATTERNS = [
  /\bui\b/i,
  /\bux\b/i,
  /\bvisual\b/i,
  /\bfront[-\s]?end\b/i,
  /\bdesign\b/i,
  /\bstyling\b/i,
  /\bstyle\b/i,
  /\bcss\b/i,
  /\btailwind\b/i,
  /\blayout\b/i,
  /\banimation\b/i,
  /\btypography\b/i,
  /\bcolor\b/i,
  /\bresponsive\b/i,
  /\bcomponent(s)?\b/i,
  /\bpixel[-\s]?perfect\b/i,
  /\bhero section\b/i,
  /\blanding page\b/i,
];

const hasVisualTaskIntent = (prompt: string): boolean => {
  if (!prompt) {
    return false;
  }
  return VISUAL_DELEGATION_PATTERNS.some((pattern) => pattern.test(prompt));
};

const decide = (
  config: OrxaConfig,
  reason: string,
  metadata?: Record<string, unknown>
): EnforcementResult => {
  if (config.orxa.enforcement.delegation === "off") {
    return { allow: true, warnings: [reason], metadata };
  }

  if (config.orxa.enforcement.delegation === "warn") {
    return { allow: true, warnings: [reason], metadata };
  }

  return { allow: false, reason, metadata };
};

export const resolveToolAlias = (
  toolName: string,
  aliases: Record<string, string>
): string => aliases[normalizeToolName(toolName)] ?? normalizeToolName(toolName);

export const isWriteTool = (toolName: string): boolean => WRITE_TOOLS.has(toolName);

export const extractWriteTargets = (toolName: string, args: unknown): string[] => {
  if (!args || typeof args !== "object") {
    return [];
  }

  const record = args as Record<string, unknown>;
  const paths: string[] = [];

  const filePath = record.filePath;
  if (typeof filePath === "string") {
    paths.push(filePath);
  }

  const filePaths = record.filePaths;
  if (Array.isArray(filePaths)) {
    for (const entry of filePaths) {
      if (typeof entry === "string") {
        paths.push(entry);
      }
    }
  }

  if (toolName === "apply_patch" && typeof record.patchText === "string") {
    const pattern = /^\*\*\* (Add File|Update File|Delete File):\s*(.+)$/gm;
    let match = pattern.exec(record.patchText);
    while (match) {
      let filePath = match[2].trim();
      // Strip a/ or b/ prefix if present (from git diff format)
      filePath = filePath.replace(/^[ab]\//, "");
      paths.push(filePath);
      match = pattern.exec(record.patchText);
    }
  }

  return paths;
};

export const matchesAnyGlob = (targetPath: string, globs: string[]): boolean =>
  globs.some((pattern) => minimatch(targetPath, pattern, { dot: true }));

export const getRecommendedAgent = (toolName: string): string => {
  if (toolName === "delegate_task") {
    return "orxa";
  }

  if (toolName === "task") {
    return "orxa";
  }

  if (toolName === "grep" || toolName === "glob") {
    return "plan";
  }

  if (toolName === "bash") {
    return "build";
  }

  if (isWriteTool(toolName)) {
    return "plan";
  }

  return "build";
};

export const enforceDelegation = (context: HookContext): EnforcementResult => {
  const { config } = context;
  const agentName = context.agentName ?? "";
  const toolName = resolveToolAlias(context.toolName ?? "", config.toolAliases.resolve);
  const normalizedTool = normalizeToolName(toolName);
  const delegationTool = normalizedTool === "task" ? "delegate_task" : normalizedTool;

  // Check if agent is orxa - check both agentName and session agent
  const sessionAgentName = context.session?.agentName ?? "";
  // Only default to "orxa" if we have no information about the agent
  // If agentName is explicitly empty but session has an agent, use session agent
  // If both are empty, we can't determine the agent - don't assume it's orxa
  const effectiveAgentName = (agentName || sessionAgentName || "unknown") as string;
  const isOrxa = effectiveAgentName.toLowerCase() === "orxa";
  const isKnownNonOrxa = effectiveAgentName !== "unknown" && !isOrxa;



  // Block task/delegate_task tools for non-orxa agents
  // Only block if we KNOW the agent is not orxa (isKnownNonOrxa)
  // If agent is unknown, allow the tool call to proceed
  if (config.governance.onlyOrxaCanDelegate && isKnownNonOrxa) {
    if (normalizedTool === "task") {
      return {
        ...decide(config, "Only the orxa may use the task tool. Use delegate_task instead."),
        recommendedAgent: "orxa",
      };
    }
    if (delegationTool === "delegate_task") {
      return {
        ...decide(config, "Only the orxa may delegate tasks."),
        recommendedAgent: "orxa",
      };
    }
  }

  if (
    config.governance.blockSupermemoryAddForSubagents &&
    normalizedTool === "supermemory" &&
    isKnownNonOrxa
  ) {
    const args = context.args as Record<string, unknown> | undefined;
    if (args?.mode === "add") {
      return {
        ...decide(config, "Subagents cannot add to memory."),
        recommendedAgent: "orxa",
      };
    }
  }

  const perAgent = effectiveAgentName
    ? config.perAgentRestrictions?.[effectiveAgentName]
    : undefined;
  if (perAgent?.allowedTools && !perAgent.allowedTools.includes(normalizedTool)) {
    return {
      ...decide(config, `Tool ${normalizedTool} is not in the allowed list for ${effectiveAgentName}.`),
      recommendedAgent: getRecommendedAgent(normalizedTool),
    };
  }

  if (perAgent?.blockedTools && perAgent.blockedTools.includes(normalizedTool)) {
    return {
      ...decide(config, `Tool ${normalizedTool} is blocked for ${effectiveAgentName}.`),
      recommendedAgent: getRecommendedAgent(normalizedTool),
    };
  }

  // Check write tool allowlist BEFORE checking allowedTools
  // This allows orxa to write to plan files even if write isn't in allowedTools
  if (isWriteTool(normalizedTool)) {
    const workspaceRoot = (context as any).workspaceRoot || process.cwd();
    const targets = extractWriteTargets(normalizedTool, context.args).map((target) =>
      normalizeWriteTarget(target, workspaceRoot)
    );
    const allowlist = config.orxa.planWriteAllowlist;
    const matchesAllowlist =
      targets.length > 0 && targets.every((target) => matchesAnyGlob(target, allowlist));

    if (effectiveAgentName === "plan") {
      if (!matchesAllowlist) {
        return {
          ...decide(
            config,
            "Write access is restricted to .orxa/**/*.md and .orxa/**/*.json."
          ),
          recommendedAgent: "plan",
          metadata: { targets },
        };
      }
    } else if (isOrxa) {
      if (!matchesAllowlist) {
        return {
          ...decide(
            config,
            "Write access is restricted to .orxa/**/*.md and .orxa/**/*.json."
          ),
          recommendedAgent: "plan",
          metadata: { targets },
        };
      }
      // Orxa can write to allowlist paths - allow and skip further checks
      return { allow: true };
    } else {
      // Subagents (coder, build, frontend, etc.) are allowed to write files
      // They are the implementers - this is their primary job
      return { allow: true };
    }
  }

  if (isOrxa) {
    if (config.orxa.blockedTools.includes(normalizedTool)) {
      return {
        ...decide(config, `Tool ${normalizedTool} is blocked for the orxa.`),
        recommendedAgent: getRecommendedAgent(normalizedTool),
      };
    }

    if (!config.orxa.allowedTools.includes(normalizedTool)) {
      return {
        ...decide(config, `Tool ${normalizedTool} is not allowed for the orxa.`),
        recommendedAgent: getRecommendedAgent(normalizedTool),
      };
    }
  }

  if (config.orxa.blockMobileTools && isOrxa) {
    if (MOBILE_TOOL_PREFIXES.some((prefix) => normalizedTool.startsWith(prefix))) {
      return {
        ...decide(config, "Mobile tooling is blocked for the orxa."),
        recommendedAgent: getRecommendedAgent(normalizedTool),
      };
    }
  }

  // Apply delegation validation to orxa/plan
  const isPlan = effectiveAgentName.toLowerCase() === "plan";
  if (delegationTool === "delegate_task" && (isOrxa || isPlan)) {
    const args = context.args as Record<string, unknown> | undefined;
    const promptContent = resolvePrompt(args);

    // Visual routing is policy-level enforcement and must not depend on
    // delegation template validation settings.
    const delegatedAgent = extractDelegationAgent(context.args);
    const visualTaskIntent = hasVisualTaskIntent(promptContent);
    if (visualTaskIntent && delegatedAgent && delegatedAgent !== "frontend") {
      return {
        ...decide(
          config,
          `Visual UI/UX/styling/design tasks must be delegated to frontend. Received "${delegatedAgent}".`
        ),
        recommendedAgent: "frontend",
        metadata: { delegatedAgent },
      };
    }

    if (!config.governance.delegationTemplate.required) {
      return { allow: true };
    }
    
    // 6-section validation - log warning but don't block
    const missing = extractSectionMissing(
      promptContent,
      config.governance.delegationTemplate.requiredSections
    );
    
    // Missing sections are warning only - don't block the delegation
    // The ORXA agent has clear instructions in its system prompt about the 6-section format

    // Image limit validation - always enforced
    const maxImages = config.governance.delegationTemplate.maxImages;
    const imageCount = extractImageCount(context.args, context.attachments);
    if (imageCount > maxImages) {
      return {
        ...decide(config, `Delegation includes too many images (${imageCount}/${maxImages}).`),
        metadata: { imageCount, maxImages },
      };
    }

    // Session validation - always enforced
    if (config.governance.delegationTemplate.requireSameSessionId) {
      const args = context.args as Record<string, unknown> | undefined;
      const targetSession =
        (args?.sessionId as string | undefined) ??
        (args?.task && typeof args.task === "object"
          ? ((args.task as Record<string, unknown>).sessionId as string | undefined)
          : undefined);
      const currentSession = context.session?.id ?? context.sessionId;
      if (targetSession && currentSession && targetSession !== currentSession) {
        return {
          ...decide(config, "Delegation must stay within the same session."),
          metadata: { targetSession, currentSession },
        };
      }
    }

    // Tool output size validation - always enforced
    const hygiene = config.governance.delegationTemplate.contextHygiene;
    const toolOutputChars = extractToolOutputChars(context.args);
    if (toolOutputChars > hygiene.maxToolOutputChars) {
      return {
        ...decide(
          config,
          `Delegation context exceeds tool output limit (${toolOutputChars}/${
            hygiene.maxToolOutputChars
          }).`
        ),
        metadata: { toolOutputChars, limit: hygiene.maxToolOutputChars },
      };
    }
  }

  return { allow: true };
};
