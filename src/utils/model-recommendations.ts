/**
 * Model Recommendations for Orxa
 * 
 * Role descriptions and capabilities needed for different agent types.
 * Models are discovered from user's opencode.json providers, not hardcoded.
 */

import type { ProviderInfo } from "./provider-detector.js";

export interface RoleDescription {
  /** Role identifier */
  role: "orxa" | "plan" | "subagent";
  /** Display title */
  title: string;
  /** What this agent does */
  description: string;
  /** Required capabilities */
  capabilities: string[];
  /** Suggested provider types (not specific models) */
  suggestedProviderTypes: string[];
  /** Default model suggestion (can be overridden by user) */
  defaultModel: string;
}

export interface SubagentRoleInfo {
  /** What this subagent specializes in */
  description: string;
  /** Key capabilities needed */
  capabilities: string[];
  /** Suggested provider types */
  suggestedProviderTypes: string[];
}

// Role descriptions - no hardcoded model IDs
export const ROLE_DESCRIPTIONS: Record<string, RoleDescription> = {
  orxa: {
    role: "orxa",
    title: "🎯 Orxa Agent (Orchestration)",
    description: "Orchestrates all work, manages the team, and ensures quality. The central coordinator that delegates tasks and maintains context across the entire workflow.",
    capabilities: [
      "Strong reasoning and instruction following",
      "Large context window for maintaining state",
      "Delegation and task management",
      "Quality judgment and review",
    ],
    suggestedProviderTypes: ["opencode", "anthropic", "openai"],
    defaultModel: "opencode/kimi-k2.5",
  },
  plan: {
    role: "plan",
    title: "📐 Plan Agent (Planning)",
    description: "Creates detailed implementation plans and technical designs. Analyzes codebases, identifies dependencies, and produces actionable specifications.",
    capabilities: [
      "Deep code understanding",
      "Architecture and system design",
      "Technical specification writing",
      "Dependency analysis",
    ],
    suggestedProviderTypes: ["opencode", "anthropic", "openai"],
    defaultModel: "opencode/kimi-k2.5",
  },
  subagent: {
    role: "subagent",
    title: "🔧 Subagents (Execution)",
    description: "Specialized agents that handle specific tasks like coding, review, exploration, and more. Balance of speed and capability is key.",
    capabilities: [
      "Fast response times",
      "Code generation and editing",
      "Testing and validation",
      "Specialized domain knowledge",
    ],
    suggestedProviderTypes: ["opencode", "anthropic", "openai", "google"],
    defaultModel: "opencode/kimi-k2.5",
  },
};

// Subagent role descriptions - for specialized configuration
export const SUBAGENT_ROLE_INFO: Record<string, SubagentRoleInfo> = {
  build: {
    description: "Handles complex builds, compilation, and architecture implementation",
    capabilities: ["Build system expertise", "Complex refactoring", "Architecture implementation"],
    suggestedProviderTypes: ["opencode", "anthropic", "openai"],
  },
  architect: {
    description: "System design, API design, and high-level architecture decisions",
    capabilities: ["System design", "API design", "Scalability planning", "Technical leadership"],
    suggestedProviderTypes: ["opencode", "anthropic", "openai"],
  },
  frontend: {
    description: "UI/UX implementation, component development, and visual tasks",
    capabilities: ["UI/UX development", "Component architecture", "CSS/styling", "Responsive design"],
    suggestedProviderTypes: ["opencode", "anthropic", "openai", "google"],
  },
  multimodal: {
    description: "Image processing, media analysis, and visual content tasks",
    capabilities: ["Image analysis", "Media processing", "Visual understanding", "Multimodal reasoning"],
    suggestedProviderTypes: ["opencode", "google", "anthropic"],
  },
  reviewer: {
    description: "Code review, quality assurance, and best practices enforcement",
    capabilities: ["Code review", "Quality analysis", "Security auditing", "Best practices"],
    suggestedProviderTypes: ["opencode", "anthropic", "openai"],
  },
  strategist: {
    description: "Strategic planning, technical direction, and decision making",
    capabilities: ["Strategic thinking", "Technical direction", "Trade-off analysis", "Planning"],
    suggestedProviderTypes: ["opencode", "anthropic", "openai"],
  },
  explorer: {
    description: "Codebase exploration, research, and information gathering",
    capabilities: ["Code navigation", "Research", "Documentation reading", "Pattern recognition"],
    suggestedProviderTypes: ["opencode", "anthropic", "openai"],
  },
  librarian: {
    description: "Documentation management, file organization, and knowledge management",
    capabilities: ["Documentation", "Organization", "Knowledge management", "Information architecture"],
    suggestedProviderTypes: ["opencode", "anthropic", "openai"],
  },
  coder: {
    description: "General coding tasks, bug fixes, and feature implementation",
    capabilities: ["Code generation", "Bug fixing", "Feature implementation", "Testing"],
    suggestedProviderTypes: ["opencode", "anthropic", "openai"],
  },
  git: {
    description: "Git operations, version control, and repository management",
    capabilities: ["Git expertise", "Version control", "Branch management", "Merge conflict resolution"],
    suggestedProviderTypes: ["opencode", "anthropic", "openai"],
  },
  navigator: {
    description: "Project navigation, file structure understanding, and pathfinding",
    capabilities: ["Project structure", "File navigation", "Import resolution", "Pathfinding"],
    suggestedProviderTypes: ["opencode", "anthropic", "openai"],
  },
  writer: {
    description: "Documentation writing, comments, and text generation",
    capabilities: ["Technical writing", "Documentation", "Code comments", "Communication"],
    suggestedProviderTypes: ["opencode", "anthropic", "openai"],
  },
  "mobile-simulator": {
    description: "Mobile testing, simulator operations, and mobile-specific tasks",
    capabilities: ["Mobile development", "Simulator operations", "iOS/Android expertise", "Mobile testing"],
    suggestedProviderTypes: ["opencode", "anthropic", "openai"],
  },
};

// User-configurable specialized subagent models (empty by default - user sets these)
export const SPECIALIZED_SUBAGENT_MODELS: Record<string, string> = {};

/**
 * Get role description for a role
 */
export const getRoleDescription = (role: "orxa" | "plan" | "subagent"): RoleDescription => {
  return ROLE_DESCRIPTIONS[role] || ROLE_DESCRIPTIONS.subagent;
};

/**
 * Get subagent role info
 */
export const getSubagentRoleInfo = (subagentName: string): SubagentRoleInfo | null => {
  return SUBAGENT_ROLE_INFO[subagentName] || null;
};

/**
 * Get the default model for a specific subagent
 * Returns empty string if not configured (user must specify)
 */
export const getDefaultSubagentModel = (subagentName: string): string => {
  return SPECIALIZED_SUBAGENT_MODELS[subagentName] || "";
};

/**
 * Format role description for display in the wizard
 */
export const formatRoleDescription = (role: "orxa" | "plan" | "subagent"): string[] => {
  const desc = getRoleDescription(role);
  const lines: string[] = [
    desc.title,
    "",
    "Role:",
    `  ${desc.description}`,
    "",
    "Needs:",
    ...desc.capabilities.map((cap) => `  • ${cap}`),
    "",
    "Suggested provider types:",
    `  ${desc.suggestedProviderTypes.join(", ")}`,
  ];
  return lines;
};

/**
 * Format available providers for display
 */
export const formatAvailableProviders = (providers: ProviderInfo[]): string[] => {
  const authenticated = providers.filter((p) => p.auth.authenticated);
  
  if (authenticated.length === 0) {
    return ["⚠️  No authenticated providers found. Please run: opencode auth login"];
  }
  
  return [
    "Available providers:",
    ...authenticated.map((p) => `  ✅ ${p.name}`),
  ];
};

/**
 * Get example models for display (not recommendations, just examples)
 */
export const getModelExamples = (): string[] => {
  return [
    "Examples:",
    "  opencode/kimi-k2.5",
    "  anthropic/claude-3-5-sonnet-latest",
    "  openai/gpt-4o",
    "  google/gemini-2.0-flash",
    "",
    "Your AI can help you choose based on your specific needs.",
  ];
};

/**
 * Format subagent role info for display
 */
export const formatSubagentRoleInfo = (subagentName: string): string[] => {
  const info = getSubagentRoleInfo(subagentName);
  if (!info) {
    return [`${subagentName}: General purpose subagent`];
  }
  
  return [
    `${subagentName}:`,
    `  ${info.description}`,
    "",
    "  Capabilities needed:",
    ...info.capabilities.map((cap) => `    • ${cap}`),
  ];
};

/**
 * Get all available model IDs from providers
 */
export const getAvailableModelsFromProviders = (providers: ProviderInfo[]): string[] => {
  const models: string[] = [];
  
  for (const provider of providers) {
    if (provider.auth.authenticated && provider.models.length > 0) {
      for (const model of provider.models) {
        models.push(model.fullId);
      }
    }
  }
  
  return models;
};

/**
 * Validate a model ID format
 */
export const isValidModelId = (modelId: string): boolean => {
  // Basic validation: must contain a slash (provider/model)
  return modelId.includes("/") && modelId.split("/").length === 2;
};

/**
 * Parse a model ID into provider and model name
 */
export const parseModelId = (modelId: string): { provider: string; model: string } | null => {
  if (!isValidModelId(modelId)) {
    return null;
  }
  
  const [provider, model] = modelId.split("/");
  return { provider, model };
};
