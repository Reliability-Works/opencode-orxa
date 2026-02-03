import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { getCustomAgentsDir, getOverridesAgentsDir, loadOrxaConfig, getUserConfigPath } from "./config/loader.js";
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
  prompt?: string;
  system_prompt?: string;
  permission?: {
    edit?: "allow" | "block" | "deny";
    bash?: "allow" | "block" | "deny";
    webfetch?: "allow" | "block" | "deny";
    question?: "allow" | "block" | "deny";
    delegate_task?: "allow" | "block" | "deny";
    task?: "allow" | "block" | "deny";
  };
  tools?: {
    allowed?: string[];
    blocked?: string[];
  };
}

/**
 * YAML Agent Definition (as stored in agent YAML files)
 */
interface YamlAgentDefinition {
  name?: string;
  description?: string;
  mode?: "primary" | "subagent" | "all";
  model?: string;
  temperature?: number;
  system_prompt?: string;
  permission?: {
    edit?: "allow" | "block" | "deny";
    bash?: "allow" | "block" | "deny";
    webfetch?: "allow" | "block" | "deny";
    question?: "allow" | "block" | "deny";
    delegate_task?: "allow" | "block" | "deny";
    task?: "allow" | "block" | "deny";
  };
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
 * Extracts YAML frontmatter and markdown body (prompt)
 */
const parseAgentYaml = (filePath: string): OpenCodeAgent | null => {
  try {
    const content = fs.readFileSync(filePath, "utf-8");

    // Extract agent name from filename
    const fileName = path.basename(filePath, path.extname(filePath));

    // Check if file has YAML frontmatter (starts with ---)
    const trimmedContent = content.trim();
    let frontmatter: YamlAgentDefinition = {};
    let prompt = "";

    if (trimmedContent.startsWith("---")) {
      // Find the end of frontmatter (second ---)
      const frontmatterEnd = trimmedContent.indexOf("---", 3);

      if (frontmatterEnd !== -1) {
        // Extract YAML frontmatter (between first and second ---)
        const yamlContent = trimmedContent.slice(3, frontmatterEnd).trim();
        // Extract markdown body (everything after second ---)
        prompt = trimmedContent.slice(frontmatterEnd + 3).trim();

        // Parse YAML frontmatter
        if (yamlContent) {
          frontmatter = yaml.load(yamlContent) as YamlAgentDefinition;
        }
      } else {
        // No closing ---, treat entire content as prompt
        prompt = trimmedContent;
      }
    } else {
      const parsedYaml = yaml.load(trimmedContent);
      if (
        parsedYaml &&
        typeof parsedYaml === "object" &&
        !Array.isArray(parsedYaml) &&
        Object.keys(parsedYaml).some((key) =>
          [
            "name",
            "description",
            "mode",
            "model",
            "temperature",
            "system_prompt",
            "permission",
            "tools",
          ].includes(key)
        )
      ) {
        frontmatter = parsedYaml as YamlAgentDefinition;
        prompt = frontmatter.system_prompt?.toString().trim() || "";
      } else {
        // No frontmatter, treat entire content as prompt
        prompt = trimmedContent;
      }
    }

    // Use name from YAML if available, otherwise use filename
    const name = frontmatter.name || fileName;

    if (!name) {
      console.warn(`Agent file missing 'name' field: ${filePath}`);
      return null;
    }

    return {
      name,
      description: frontmatter.description || "",
      model: frontmatter.model,
      mode: frontmatter.mode,
      temperature: frontmatter.temperature,
      prompt,
      permission: frontmatter.permission,
      tools: frontmatter.tools,
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
/**
 * Migrate deprecated tool aliases from user config
 * Removes aliases that are no longer needed or cause conflicts
 * Returns true if migration was performed
 */
const migrateToolAliasesInConfig = (config: Record<string, unknown>): boolean => {
  const toolAliases = config.toolAliases as Record<string, Record<string, string>> | undefined;
  if (!toolAliases?.resolve) {
    return false;
  }

  // Remove the deprecated task -> delegate_task alias
  // This alias is no longer needed since we use task tool directly
  if (toolAliases.resolve.task === "delegate_task") {
    delete toolAliases.resolve.task;
    return true;
  }
  return false;
};

export const createConfigHandler = () => {
  return async (config: Record<string, unknown>): Promise<void> => {
    // Migrate deprecated tool aliases first
    const migrated = migrateToolAliasesInConfig(config);
    
    // If migration was performed, save the cleaned config back to file
    if (migrated) {
      try {
        const configPath = getUserConfigPath();
        const existingConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        existingConfig.toolAliases = config.toolAliases;
        fs.writeFileSync(configPath, JSON.stringify(existingConfig, null, 2) + '\n');
      } catch (err) {
        // Silently fail - the in-memory migration is sufficient
      }
    }

    // The config object passed by OpenCode contains enabled_agents and disabled_agents from orxa.json
    const orxaConfigFromOpenCode = config as unknown as OrxaConfig;

    // Load agent_overrides separately from orxa.json (OpenCode doesn't pass this)
    const fullOrxaConfig = loadOrxaConfig();
    const agentOverrides = fullOrxaConfig.agent_overrides ?? {};

    // Load all orxa agents from YAML files
  const orxaAgents = loadOrxaAgents({
    enabledAgents: orxaConfigFromOpenCode.enabled_agents,
    disabledAgents: orxaConfigFromOpenCode.disabled_agents,
  });

  if (orxaAgents.orxa) {
    orxaAgents.orxa.permission = {
      ...(orxaAgents.orxa.permission ?? {}),
      task: "allow",
    };

    // Apply orxa.model from config if specified (overrides YAML default)
    if (fullOrxaConfig.orxa?.model !== undefined) {
      orxaAgents.orxa.model = fullOrxaConfig.orxa.model;
    }
  }

    // Apply agent_overrides (already loaded above)
    const primaryAgentSet = new Set<string>(PRIMARY_AGENTS);

    for (const [agentName, override] of Object.entries(agentOverrides)) {
      if (orxaAgents[agentName]) {
        const isPrimaryAgent = primaryAgentSet.has(agentName);

        if (isPrimaryAgent) {
          // Primary agents: only allow model override
          if (override.model !== undefined) {
            orxaAgents[agentName].model = override.model;
          }
        } else {
          // Subagents: allow model and other fields
          // Cast to Partial<AgentConfig> since we know it's not a primary agent
          const subagentOverride = override as Partial<AgentConfig>;
          if (subagentOverride.model !== undefined) {
            orxaAgents[agentName].model = subagentOverride.model;
          }
          if (subagentOverride.temperature !== undefined) {
            orxaAgents[agentName].temperature = subagentOverride.temperature;
          }
          if (subagentOverride.system_prompt !== undefined) {
            orxaAgents[agentName].prompt = subagentOverride.system_prompt;
          }
          if (subagentOverride.tools !== undefined) {
            orxaAgents[agentName].tools = subagentOverride.tools;
          }
        }
      }
    }

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
