import type { Memory } from "../types";

const memoryQueue: Memory[] = [];

const uniqueMemories = (memories: Memory[]): Memory[] => {
  const seen = new Set<string>();
  return memories.filter((memory) => {
    const key = `${memory.type}:${memory.content}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

export const extractMemories = (response: string, patterns: string[]): Memory[] => {
  if (!response) {
    return [];
  }

  const memories: Memory[] = [];

  for (const pattern of patterns) {
    const regex = new RegExp(pattern, "gi");
    let match = regex.exec(response);
    while (match) {
      memories.push({
        type: "learned-pattern",
        content: match[0].trim(),
        source: "subagent",
      });
      match = regex.exec(response);
    }
  }

  const memorySection = /Memory Recommendation\s*:?([\s\S]+)$/i.exec(response);
  if (memorySection) {
    const lines = memorySection[1]
      .split("\n")
      .map((line) => line.replace(/^[-*]\s*/, "").trim())
      .filter(Boolean);
    for (const line of lines) {
      memories.push({
        type: "project-config",
        content: line,
        source: "subagent",
      });
    }
  }

  return uniqueMemories(memories);
};

export const queueMemoryRecommendation = (memory: Memory): void => {
  memoryQueue.push(memory);
};

export const shouldAutoSave = (memory: Memory): boolean => {
  if (memory.confidence !== undefined && memory.confidence >= 0.8) {
    return true;
  }

  return [
    "error-solution",
    "learned-pattern",
    "project-config",
    "architecture",
  ].includes(memory.type);
};
