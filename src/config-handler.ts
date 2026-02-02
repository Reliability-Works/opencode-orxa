import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { getCustomAgentsDir, getOverridesAgentsDir } from "./config/loader.js";

/**
 * OpenCode Agent Definition
 * Matches the expected format for OpenCode config.agent entries
 */
export interface OpenCodeAgent {
  name: string;
  description: string;
  model?: string;
  mode?: "primary" | "subagent" | "all";
  temperature?: number;
  system_prompt?: string;
  tools?: {
    allowed?: string[];
    blocked?: string[];
  };
}

/**
 * YAML Agent Definition (as stored in agent YAML files)
 */
interface YamlAgentDefinition {
  name: string;
  description: string;
  mode?: "primary" | "subagent" | "all";
  model?: string;
  temperature?: number;
  system_prompt?: string;
  tools?: {
    allowed?: string[];
    blocked?: string[];
  };
}

const BUILTIN_AGENTS_DIR = path.resolve(__dirname, "..", "agents");
const AGENT_EXTENSIONS = [".yaml", ".yml"];

/**
 * Find an agent file in a directory (checking both root and subagents subdir)
 */
const findAgentFileInDir = (baseDir: string, agentName: string): string | null => {
  for (const extension of AGENT_EXTENSIONS) {
    const directPath = path.join(baseDir, `${agentName}${extension}`);
    if (fs.existsSync(directPath)) {
      return directPath;
    }

    const subagentPath = path.join(baseDir, "subagents", `${agentName}${extension}`);
    if (fs.existsSync(subagentPath)) {
      return subagentPath;
    }
  }
  return null;
};

/**
 * Resolve an agent definition from user directories or builtin
 * Priority: custom > override > builtin
 */
const resolveAgentFile = (agentName: string): string | null => {
  // Check custom agents first
  const customPath = findAgentFileInDir(getCustomAgentsDir(), agentName);
  if (customPath) {
    return customPath;
  }

  // Check overrides second
  const overridePath = findAgentFileInDir(getOverridesAgentsDir(), agentName);
  if (overridePath) {
    return overridePath;
  }

  // Fall back to builtin
  return findAgentFileInDir(BUILTIN_AGENTS_DIR, agentName);
};

/**
 * Get all agent names from builtin directory
 */
const getAllBuiltinAgentNames = (): string[] => {
  const agentNames: string[] = [];

  if (fs.existsSync(BUILTIN_AGENTS_DIR)) {
    // Get root agents
    const rootEntries = fs.readdirSync(BUILTIN_AGENTS_DIR);
    for (const entry of rootEntries) {
      const fullPath = path.join(BUILTIN_AGENTS_DIR, entry);
      const stat = fs.statSync(fullPath);
      if (stat.isFile() && AGENT_EXTENSIONS.some((ext) => entry.endsWith(ext))) {
        const name = entry.replace(/\.(yaml|yml)$/, "");
        if (!agentNames.includes(name)) {
          agentNames.push(name);
        }
      }
    }

    // Get subagents
    const subagentsDir = path.join(BUILTIN_AGENTS_DIR, "subagents");
    if (fs.existsSync(subagentsDir)) {
      const subagentEntries = fs.readdirSync(subagentsDir);
      for (const entry of subagentEntries) {
        const fullPath = path.join(subagentsDir, entry);
        const stat = fs.statSync(fullPath);
        if (stat.isFile() && AGENT_EXTENSIONS.some((ext) => entry.endsWith(ext))) {
          const name = entry.replace(/\.(yaml|yml)$/, "");
          if (!agentNames.includes(name)) {
            agentNames.push(name);
          }
        }
      }
    }
  }

  return agentNames;
};

/**
 * Parse a YAML agent file into OpenCode agent format
 */
const parseAgentYaml = (filePath: string): OpenCodeAgent | null => {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const parsed = yaml.load(content) as YamlAgentDefinition;

    if (!parsed || typeof parsed !== "object") {
      console.warn(`Invalid YAML in agent file: ${filePath}`);
      return null;
    }

    if (!parsed.name) {
      console.warn(`Agent file missing 'name' field: ${filePath}`);
      return null;
    }

    return {
      name: parsed.name,
      description: parsed.description || "",
      model: parsed.model,
      mode: parsed.mode,
      temperature: parsed.temperature,
      system_prompt: parsed.system_prompt,
      tools: parsed.tools,
    };
  } catch (error) {
    console.warn(`Failed to parse agent file ${filePath}:`, error);
    return null;
  }
};

/**
 * Load all orxa agents from YAML files
 * Checks for user overrides first, then falls back to builtin
 * Returns a map of agent name -> OpenCodeAgent
 */
export const loadOrxaAgents = (): Record<string, OpenCodeAgent> => {
  const agents: Record<string, OpenCodeAgent> = {};

  // Get all builtin agent names as the base list
  const agentNames = getAllBuiltinAgentNames();

  // For each agent, resolve the file (checking overrides first)
  for (const agentName of agentNames) {
    const filePath = resolveAgentFile(agentName);
    if (filePath) {
      const agent = parseAgentYaml(filePath);
      if (agent) {
        agents[agent.name] = agent;
      }
    }
  }

  return agents;
};

/**
 * Create the config handler function
 * This handler intercepts OpenCode's config and replaces agents with orxa agents
 */
export const createConfigHandler = () => {
  return async (config: Record<string, unknown>): Promise<void> => {
    // Load all orxa agents from YAML files
    const orxaAgents = loadOrxaAgents();

    // REPLACE config.agent entirely with ONLY orxa agents
    // This completely ignores user's opencode.json agent array
    config.agent = orxaAgents;

    // Set default agent to orxa
    config.default_agent = "orxa";
  };
};

/**
 * Config handler function (singleton)
 */
export const configHandler = createConfigHandler();

export default configHandler;
