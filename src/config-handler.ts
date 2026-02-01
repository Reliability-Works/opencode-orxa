import fs from "fs";
import path from "path";
import yaml from "js-yaml";

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
 * Find an agent file in a directory (checking both root and subagents/ subdir)
 */
const findAgentFile = (baseDir: string, agentName: string): string | null => {
  for (const extension of AGENT_EXTENSIONS) {
    // Check root directory
    const directPath = path.join(baseDir, `${agentName}${extension}`);
    if (fs.existsSync(directPath)) {
      return directPath;
    }

    // Check subagents subdirectory
    const subagentPath = path.join(baseDir, "subagents", `${agentName}${extension}`);
    if (fs.existsSync(subagentPath)) {
      return subagentPath;
    }
  }

  return null;
};

/**
 * Load all agent files from the builtin agents directory
 */
const loadAllBuiltinAgentFiles = (): string[] => {
  const agentFiles: string[] = [];

  // Load from root agents directory
  if (fs.existsSync(BUILTIN_AGENTS_DIR)) {
    const rootEntries = fs.readdirSync(BUILTIN_AGENTS_DIR);
    for (const entry of rootEntries) {
      const fullPath = path.join(BUILTIN_AGENTS_DIR, entry);
      const stat = fs.statSync(fullPath);
      if (stat.isFile() && AGENT_EXTENSIONS.some((ext) => entry.endsWith(ext))) {
        agentFiles.push(fullPath);
      }
    }

    // Load from subagents directory
    const subagentsDir = path.join(BUILTIN_AGENTS_DIR, "subagents");
    if (fs.existsSync(subagentsDir)) {
      const subagentEntries = fs.readdirSync(subagentsDir);
      for (const entry of subagentEntries) {
        const fullPath = path.join(subagentsDir, entry);
        const stat = fs.statSync(fullPath);
        if (stat.isFile() && AGENT_EXTENSIONS.some((ext) => entry.endsWith(ext))) {
          agentFiles.push(fullPath);
        }
      }
    }
  }

  return agentFiles;
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
 * Returns a map of agent name -> OpenCodeAgent
 */
export const loadOrxaAgents = (): Record<string, OpenCodeAgent> => {
  const agents: Record<string, OpenCodeAgent> = {};
  const agentFiles = loadAllBuiltinAgentFiles();

  for (const filePath of agentFiles) {
    const agent = parseAgentYaml(filePath);
    if (agent) {
      agents[agent.name] = agent;
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

    // Log what we're loading
    const agentNames = Object.keys(orxaAgents);
    console.log(`[orxa] Loading ${agentNames.length} orxa agents: ${agentNames.join(", ")}`);

    // REPLACE config.agent entirely with ONLY orxa agents
    // This completely ignores user's opencode.json agent array
    config.agent = orxaAgents;

    // Set default agent to orxa
    config.default_agent = "orxa";

    console.log("[orxa] Agent configuration replaced. Default agent: orxa");
  };
};

/**
 * Config handler function (singleton)
 */
export const configHandler = createConfigHandler();

export default configHandler;
