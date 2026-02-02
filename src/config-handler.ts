import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { getCustomAgentsDir, getOverridesAgentsDir } from "./config/loader.js";
import { PRIMARY_AGENTS } from "./config/default-config.js";
import type { OrxaConfig, AgentConfig } from "./config/schema.js";

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
export const loadOrxaAgents = (options?: {
  enabledAgents?: string[];
  disabledAgents?: string[];
}): Record<string, OpenCodeAgent> => {
  const agents: Record<string, OpenCodeAgent> = {};
  const enabledAgents = options?.enabledAgents ?? [];
  const disabledAgents = options?.disabledAgents ?? [];
  const enabledSet = enabledAgents.length > 0 ? new Set(enabledAgents) : null;
  const disabledSet = new Set(disabledAgents);

  // Get all builtin agent names as the base list
  const agentNames = getAllBuiltinAgentNames();

  // For each agent, resolve the file (checking overrides first)
  for (const agentName of agentNames) {
    if (enabledSet && !enabledSet.has(agentName)) {
      continue;
    }

    if (disabledSet.has(agentName)) {
      continue;
    }

    const filePath = resolveAgentFile(agentName);
    if (filePath) {
      const agent = parseAgentYaml(filePath);
      if (agent) {
        if (enabledSet && !enabledSet.has(agent.name)) {
          continue;
        }

        if (disabledSet.has(agent.name)) {
          continue;
        }

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
    console.log('[orxa] Config handler running');
    const orxaConfig = config as unknown as OrxaConfig;

    // Log the agent_overrides object
    console.log('[orxa] agent_overrides:', JSON.stringify(orxaConfig.agent_overrides, null, 2));

    // Load all orxa agents from YAML files
    const orxaAgents = loadOrxaAgents({
      enabledAgents: orxaConfig.enabled_agents,
      disabledAgents: orxaConfig.disabled_agents,
    });

    // Log which agents are loaded
    console.log('[orxa] Loaded agents:', Object.keys(orxaAgents));

    // Apply agent_overrides from orxaConfig
    const agentOverrides = orxaConfig.agent_overrides ?? {};
    const primaryAgentSet = new Set<string>(PRIMARY_AGENTS);

    for (const [agentName, override] of Object.entries(agentOverrides)) {
      console.log(`[orxa] Processing override for agent: ${agentName}`);
      console.log(`[orxa] Agent exists in orxaAgents: ${!!orxaAgents[agentName]}`);

      if (orxaAgents[agentName]) {
        console.log(`[orxa] Current model for ${agentName}:`, orxaAgents[agentName].model);
        const isPrimaryAgent = primaryAgentSet.has(agentName);
        console.log(`[orxa] Is primary agent: ${isPrimaryAgent}`);

        if (isPrimaryAgent) {
          // Primary agents: only allow model override
          if (override.model !== undefined) {
            console.log(`[orxa] Applying model override for primary agent ${agentName}: ${override.model}`);
            orxaAgents[agentName].model = override.model;
          } else {
            console.log(`[orxa] No model override defined for ${agentName}`);
          }
        } else {
          // Subagents: allow model and other fields
          // Cast to Partial<AgentConfig> since we know it's not a primary agent
          const subagentOverride = override as Partial<AgentConfig>;
          if (subagentOverride.model !== undefined) {
            console.log(`[orxa] Applying model override for subagent ${agentName}: ${subagentOverride.model}`);
            orxaAgents[agentName].model = subagentOverride.model;
          }
          if (subagentOverride.temperature !== undefined) {
            orxaAgents[agentName].temperature = subagentOverride.temperature;
          }
          if (subagentOverride.system_prompt !== undefined) {
            orxaAgents[agentName].system_prompt = subagentOverride.system_prompt;
          }
          if (subagentOverride.tools !== undefined) {
            orxaAgents[agentName].tools = subagentOverride.tools;
          }
        }

        console.log(`[orxa] After override - model for ${agentName}:`, orxaAgents[agentName].model);
      } else {
        console.log(`[orxa] WARNING: Agent '${agentName}' not found in loaded agents, skipping override`);
      }
    }

    // REPLACE config.agent entirely with ONLY orxa agents
    // This completely ignores user's opencode.json agent array
    config.agent = orxaAgents;

    // Log final agent configurations
    console.log('[orxa] Final agent configurations:');
    for (const [name, agent] of Object.entries(orxaAgents)) {
      console.log(`[orxa]   ${name}: model=${agent.model}`);
    }

    // Set default agent to orxa
    config.default_agent = "orxa";
    console.log('[orxa] Config handler completed');
  };
};

/**
 * Config handler function (singleton)
 */
export const configHandler = createConfigHandler();

export default configHandler;
