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

const MOBILE_TOOL_PREFIXES = ["ios-simulator", "android", "mobile"];

const normalizeToolName = (toolName: string): string => toolName.trim();

const resolvePrompt = (args: unknown, explicitPrompt?: string): string => {
  if (explicitPrompt) {
    return explicitPrompt;
  }

  if (!args || typeof args !== "object") {
    return "";
  }

  const record = args as Record<string, unknown>;
  const candidates = [
    record.prompt,
    record.message,
    record.instructions,
    record.task,
    record.context,
    record.description, // task tool uses description field
    record.input, // OpenCode tool input wrapper
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string") {
      return candidate;
    }

    if (candidate && typeof candidate === "object") {
      const nested = candidate as Record<string, unknown>;
      if (typeof nested.prompt === "string") {
        return nested.prompt;
      }
      // Check for input.prompt (OpenCode tool input wrapper)
      if (nested.input && typeof nested.input === "object") {
        const input = nested.input as Record<string, unknown>;
        if (typeof input.prompt === "string") {
          return input.prompt;
        }
      }
    }
  }

  return "";
};

const SECTION_ALIASES: Record<string, string[]> = {
  "Context": ["Context", "Project Context"],
};

const extractSectionMissing = (prompt: string, sections: string[]): string[] =>
  sections.filter((section) => {
    const aliases = SECTION_ALIASES[section] || [section];
    return !aliases.some((alias) => {
      const escapedAlias = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      // Match: Task:, ## Task:, **Task**:, **Task:**, etc.
      const pattern = new RegExp(
        `(^|\\n)\\s*(#+\\s*)?(?:\\*\\*\\s*)?${escapedAlias}(?:\\s*\\*\\*)?\\s*:?`,
        "i"
      );
      return pattern.test(prompt);
    });
  });

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
      paths.push(match[2].trim());
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
  const effectiveAgentName = agentName || sessionAgentName;
  const isOrxa = effectiveAgentName.toLowerCase() === "orxa" || 
                 effectiveAgentName.toLowerCase().includes("orxa");


  
  // Block task/delegate_task tools for non-orxa agents
  if (config.governance.onlyOrxaCanDelegate && !isOrxa) {
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
    agentName !== "orxa"
  ) {
    const args = context.args as Record<string, unknown> | undefined;
    if (args?.mode === "add") {
      return {
        ...decide(config, "Subagents cannot add to memory."),
        recommendedAgent: "orxa",
      };
    }
  }

  const perAgent = agentName ? config.perAgentRestrictions?.[agentName] : undefined;
  if (perAgent?.allowedTools && !perAgent.allowedTools.includes(normalizedTool)) {
    return {
      ...decide(config, `Tool ${normalizedTool} is not in the allowed list for ${agentName}.`),
      recommendedAgent: getRecommendedAgent(normalizedTool),
    };
  }

  if (perAgent?.blockedTools && perAgent.blockedTools.includes(normalizedTool)) {
    return {
      ...decide(config, `Tool ${normalizedTool} is blocked for ${agentName}.`),
      recommendedAgent: getRecommendedAgent(normalizedTool),
    };
  }

  // Check write tool allowlist BEFORE checking allowedTools
  // This allows orxa to write to plan files even if write isn't in allowedTools
  if (isWriteTool(normalizedTool)) {
    const targets = extractWriteTargets(normalizedTool, context.args);
    const allowlist = config.orxa.planWriteAllowlist;
    const matchesAllowlist =
      targets.length > 0 && targets.every((target) => matchesAnyGlob(target, allowlist));

    if (agentName === "plan") {
      if (!matchesAllowlist) {
        return {
          ...decide(config, "Plan agent writes are limited to plan allowlist paths."),
          recommendedAgent: "plan",
          metadata: { targets },
        };
      }
    } else if (agentName === "orxa") {
      if (!matchesAllowlist) {
        return {
          ...decide(config, "Orxa writes are limited to plan allowlist paths."),
          recommendedAgent: "plan",
          metadata: { targets },
        };
      }
      // Orxa can write to allowlist paths - allow and skip further checks
      return { allow: true };
    } else {
      return {
        ...decide(config, "Write tools are reserved for the plan agent."),
        recommendedAgent: "plan",
        metadata: { targets },
      };
    }
  }

  if (agentName === "orxa") {
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

  if (config.orxa.blockMobileTools && agentName === "orxa") {
    if (MOBILE_TOOL_PREFIXES.some((prefix) => normalizedTool.startsWith(prefix))) {
      return {
        ...decide(config, "Mobile tooling is blocked for the orxa."),
        recommendedAgent: getRecommendedAgent(normalizedTool),
      };
    }
  }

  // Apply 6-section validation to task tool calls from orxa
  if (normalizedTool === "task" && isOrxa && config.governance.delegationTemplate.required) {
    const prompt = resolvePrompt(context.args, context.delegationPrompt);
    
    // Debug logging to understand what's being passed
    if (config.ui?.verboseLogging) {
      console.log("[orxa][delegation-enforcer] Task tool validation:", {
        toolName: normalizedTool,
        isOrxa,
        args: context.args,
        prompt: prompt?.slice(0, 200) + "...",
        promptLength: prompt?.length,
      });
    }
    const missing = extractSectionMissing(
      prompt,
      config.governance.delegationTemplate.requiredSections
    );
    if (missing.length > 0) {
      return {
        ...decide(
          config,
          `Delegation prompt missing sections: ${missing.join(", ")}.`
        ),
        metadata: { missingSections: missing },
      };
    }

    const maxImages = config.governance.delegationTemplate.maxImages;
    const imageCount = extractImageCount(context.args, context.attachments);
    if (imageCount > maxImages) {
      return {
        ...decide(config, `Delegation includes too many images (${imageCount}/${maxImages}).`),
        metadata: { imageCount, maxImages },
      };
    }

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

    const hygiene = config.governance.delegationTemplate.contextHygiene;
    if (hygiene.requireSummary) {
      const summaryPattern = new RegExp(
        `(^|\\n)\\s*(#+\\s*)?${hygiene.summaryHeader}\\s*:?`,
        "i"
      );
      if (!summaryPattern.test(prompt)) {
        return {
          ...decide(config, `Delegation prompt missing ${hygiene.summaryHeader} section.`),
        };
      }
    }

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
