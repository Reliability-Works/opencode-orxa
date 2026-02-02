import fs from "fs";
import path from "path";
import type { HookContext } from "../types.js";

export const findAgentsMdFiles = (filePath: string): string[] => {
  const agentsMdFiles: string[] = [];
  let currentDir = path.dirname(filePath);
  const root = path.parse(currentDir).root;
  
  // Walk up from file directory to root
  while (currentDir !== root) {
    const agentsMdPath = path.join(currentDir, "AGENTS.md");
    if (fs.existsSync(agentsMdPath)) {
      agentsMdFiles.unshift(agentsMdPath); // Add to beginning (closest first)
    }
    
    // Also check for .claude/AGENTS.md
    const claudeAgentsMdPath = path.join(currentDir, ".claude", "AGENTS.md");
    if (fs.existsSync(claudeAgentsMdPath)) {
      agentsMdFiles.unshift(claudeAgentsMdPath);
    }
    
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) break; // Reached root
    currentDir = parentDir;
  }
  
  // Check root level
  const rootAgentsMd = path.join(root, "AGENTS.md");
  if (fs.existsSync(rootAgentsMd)) {
    agentsMdFiles.unshift(rootAgentsMd);
  }
  
  return agentsMdFiles;
};

export const readAgentsMdContent = async (filePaths: string[]): Promise<string> => {
  const contents: string[] = [];
  
  for (const filePath of filePaths) {
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const relativePath = path.relative(process.cwd(), filePath);
      contents.push(`## Context from ${relativePath}\n\n${content}`);
    } catch {
      // Skip files that can't be read
    }
  }
  
  return contents.join("\n\n---\n\n");
};

export const agentsMdInjector = async (
  context: HookContext
): Promise<{ injectContext?: string } > => {
  // Only inject when reading files
  if (context.tool?.name !== "read") {
    return {};
  }
  
  const args = context.args as Record<string, unknown> | undefined;
  const filePath = args?.filePath as string | undefined;
  if (!filePath) {
    return {};
  }
  
  // Find all AGENTS.md files from this file up to root
  const agentsMdFiles = findAgentsMdFiles(filePath);
  
  if (agentsMdFiles.length === 0) {
    return {};
  }
  
  // Read and combine all AGENTS.md content
  const content = await readAgentsMdContent(agentsMdFiles);
  
  return {
    injectContext: `📋 **Relevant Context from AGENTS.md files:**\n\n${content}\n\n---\n\n`,
  };
};
