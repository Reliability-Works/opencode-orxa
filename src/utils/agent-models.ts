/**
 * Agent Models Parser - Reads agent YAML files to extract model assignments
 * 
 * This is the source of truth for which models are used by which agents.
 * Parses the actual agent YAML files to get model assignments.
 */

import fs from "fs";
import path from "path";

export interface AgentModelInfo {
  /** Agent name */
  name: string;
  /** Model assigned to this agent (e.g., 'opencode/kimi-k2.5') */
  model: string;
  /** Agent mode: primary or subagent */
  mode: "primary" | "subagent";
  /** Agent description */
  description?: string;
}

export interface ModelGroup {
  /** The model ID */
  model: string;
  /** Agents using this model */
  agents: AgentModelInfo[];
  /** Count of agents */
  count: number;
}

export interface ParsedAgentConfig {
  /** All agents with their model assignments */
  agents: AgentModelInfo[];
  /** Agents grouped by model */
  models: ModelGroup[];
  /** Unique set of models needed */
  uniqueModels: string[];
  /** Primary agents (orxa, plan) */
  primaryAgents: AgentModelInfo[];
  /** Subagents */
  subagents: AgentModelInfo[];
}

// Model to provider mapping - which providers can access each model
export const MODEL_PROVIDER_ACCESS: Record<string, string[]> = {
  "opencode/kimi-k2.5": ["opencode", "kimi-for-coding"],
  "opencode/gpt-5.2-codex": ["opencode", "openai"],
  "opencode/gemini-3-pro": ["opencode", "google"],
  "opencode/gemini-3-flash": ["opencode", "google"],
};

// Provider display names
export const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  opencode: "OpenCode",
  "kimi-for-coding": "Kimi for Coding",
  openai: "OpenAI",
  google: "Google",
};

/**
 * Parse a single YAML file to extract agent info
 * Handles both old format (name: at start) and new frontmatter format (---
 */
const parseAgentYaml = (filePath: string): AgentModelInfo | null => {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const fileName = path.basename(filePath, path.extname(filePath));
    
    // Check if file has YAML frontmatter (starts with ---)
    const trimmedContent = content.trim();
    let name = "";
    let model = "";
    let mode: "primary" | "subagent" = "subagent";
    let description = "";
    
    if (trimmedContent.startsWith("---")) {
      // New frontmatter format
      const frontmatterEnd = trimmedContent.indexOf("---", 3);
      
      if (frontmatterEnd !== -1) {
        const frontmatter = trimmedContent.slice(3, frontmatterEnd).trim();
        const lines = frontmatter.split("\n");
        
        for (const line of lines) {
          const trimmed = line.trim();
          
          // Parse name (optional in frontmatter, fallback to filename)
          if (trimmed.startsWith("name:")) {
            name = trimmed.replace("name:", "").trim();
          }
          
          // Parse model
          if (trimmed.startsWith("model:")) {
            model = trimmed.replace("model:", "").trim();
          }
          
          // Parse mode
          if (trimmed.startsWith("mode:")) {
            const modeValue = trimmed.replace("mode:", "").trim();
            if (modeValue === "primary" || modeValue === "subagent") {
              mode = modeValue;
            }
          }
          
          // Parse description
          if (trimmed.startsWith("description:")) {
            description = trimmed.replace("description:", "").trim();
          }
        }
      }
      
      // Use filename as name if not specified in frontmatter
      if (!name) {
        name = fileName;
      }
    } else {
      // Old format - parse entire file line by line
      const lines = content.split("\n");
      
      for (const line of lines) {
        const trimmed = line.trim();
        
        // Parse name
        if (trimmed.startsWith("name:")) {
          name = trimmed.replace("name:", "").trim();
        }
        
        // Parse model
        if (trimmed.startsWith("model:")) {
          model = trimmed.replace("model:", "").trim();
        }
        
        // Parse mode
        if (trimmed.startsWith("mode:")) {
          const modeValue = trimmed.replace("mode:", "").trim();
          if (modeValue === "primary" || modeValue === "subagent") {
            mode = modeValue;
          }
        }
        
        // Parse description
        if (trimmed.startsWith("description:")) {
          description = trimmed.replace("description:", "").trim();
        }
      }
    }
    
    if (name && model) {
      return { name, model, mode, description };
    }
    
    return null;
  } catch {
    return null;
  }
};

/**
 * Get the agents directory path
 */
const getAgentsDirectory = (): string => {
  // In development, use the local agents directory
  // In production (after npm install), use the installed agents
  const localPath = path.join(process.cwd(), "agents");
  const installedPath = path.join(
    process.env.HOME || "",
    ".config",
    "opencode",
    "conductor",
    "agents"
  );
  
  if (fs.existsSync(localPath)) {
    return localPath;
  }
  
  if (fs.existsSync(installedPath)) {
    return installedPath;
  }
  
  return localPath; // Fallback to local path
};

/**
 * Parse all agent YAML files and extract model assignments
 */
export const parseAgentModels = (): ParsedAgentConfig => {
  const agentsDir = getAgentsDirectory();
  const agents: AgentModelInfo[] = [];
  
  // Parse primary agents
  const primaryAgentsDir = agentsDir;
  const primaryFiles = ["orxa.yaml", "plan.yaml"];
  
  for (const file of primaryFiles) {
    const filePath = path.join(primaryAgentsDir, file);
    if (fs.existsSync(filePath)) {
      const agentInfo = parseAgentYaml(filePath);
      if (agentInfo) {
        agents.push(agentInfo);
      }
    }
  }
  
  // Parse subagents
  const subagentsDir = path.join(agentsDir, "subagents");
  if (fs.existsSync(subagentsDir)) {
    const files = fs.readdirSync(subagentsDir);
    for (const file of files) {
      if (file.endsWith(".yaml")) {
        // Skip primary agent YAMLs in subagents directory (they're documentation only)
        if (file === "orxa.yaml" || file === "plan.yaml") {
          continue;
        }
        const filePath = path.join(subagentsDir, file);
        const agentInfo = parseAgentYaml(filePath);
        if (agentInfo) {
          agents.push(agentInfo);
        }
      }
    }
  }
  
  // Group by model
  const modelGroups = new Map<string, AgentModelInfo[]>();
  for (const agent of agents) {
    if (!modelGroups.has(agent.model)) {
      modelGroups.set(agent.model, []);
    }
    modelGroups.get(agent.model)!.push(agent);
  }
  
  const models: ModelGroup[] = Array.from(modelGroups.entries())
    .map(([model, modelAgents]) => ({
      model,
      agents: modelAgents,
      count: modelAgents.length,
    }))
    .sort((a, b) => b.count - a.count); // Sort by count descending
  
  return {
    agents,
    models,
    uniqueModels: Array.from(modelGroups.keys()).sort(),
    primaryAgents: agents.filter((a) => a.mode === "primary"),
    subagents: agents.filter((a) => a.mode === "subagent"),
  };
};

/**
 * Get providers that can access a specific model
 */
export const getProvidersForModel = (model: string): string[] => {
  return MODEL_PROVIDER_ACCESS[model] || ["opencode"];
};

/**
 * Format model name for display
 */
export const formatModelName = (model: string): string => {
  const parts = model.split("/");
  if (parts.length === 2) {
    const [, modelName] = parts;
    return modelName;
  }
  return model;
};

/**
 * Format provider list for display
 */
export const formatProviderOptions = (providers: string[]): string => {
  return providers
    .map((p) => PROVIDER_DISPLAY_NAMES[p] || p)
    .join(" OR ");
};

/**
 * Check if the opencode provider can access all required models
 */
export const canOpenCodeAccessAllModels = (models: string[]): boolean => {
  return models.every((model) => {
    const providers = getProvidersForModel(model);
    return providers.includes("opencode");
  });
};

/**
 * Get the recommended provider setup
 * Returns the most efficient provider configuration
 */
export const getRecommendedProviderSetup = (
  models: string[]
): {
  recommended: "opencode" | "individual";
  reason: string;
  providersNeeded: string[];
} => {
  const allCanUseOpenCode = canOpenCodeAccessAllModels(models);
  
  if (allCanUseOpenCode) {
    return {
      recommended: "opencode",
      reason: "OpenCode provider can access ALL required models with one authentication",
      providersNeeded: ["opencode"],
    };
  }
  
  // Collect all unique providers needed
  const providersNeeded = new Set<string>();
  for (const model of models) {
    const providers = getProvidersForModel(model);
    // Add the first (preferred) provider for each model
    providersNeeded.add(providers[0]);
  }
  
  return {
    recommended: "individual",
    reason: "Some models require different providers. You'll need to authenticate with multiple providers.",
    providersNeeded: Array.from(providersNeeded),
  };
};

/**
 * Format agent list for a model group
 */
export const formatAgentListForModel = (agents: AgentModelInfo[]): string => {
  const primary = agents.filter((a) => a.mode === "primary");
  const subagents = agents.filter((a) => a.mode === "subagent");
  
  const parts: string[] = [];
  
  if (primary.length > 0) {
    parts.push(primary.map((a) => a.name).join(", "));
  }
  
  if (subagents.length > 0) {
    if (subagents.length <= 3) {
      parts.push(subagents.map((a) => a.name).join(", "));
    } else {
      parts.push(`${subagents.length} subagents`);
    }
  }
  
  return parts.join(" + ");
};
