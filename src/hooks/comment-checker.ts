import type { HookContext } from "../types.js";

// Patterns that indicate "stopping" questions vs requirement questions
const STOPPING_PATTERNS = [
  /would you like me to/i,
  /what would you like/i,
  /let me know if/i,
  /anything else/i,
  /shall i continue/i,
  /should i proceed/i,
  /do you want me to/i,
  /is there anything/i,
  /need anything else/i,
];

// Patterns that are legitimate requirement questions
const REQUIREMENT_PATTERNS = [
  /what is the/i,
  /how does/i,
  /where is/i,
  /when should/i,
  /why is/i,
  /can you clarify/i,
  /what are the requirements/i,
];

export const isStoppingQuestion = (text: string): boolean => {
  const lowerText = text.toLowerCase();
  
  // Check if it's a requirement question first
  if (REQUIREMENT_PATTERNS.some((pattern) => pattern.test(lowerText))) {
    return false;
  }
  
  // Check if it's a stopping pattern
  return STOPPING_PATTERNS.some((pattern) => pattern.test(lowerText));
};

export const calculateCommentRatio = (code: string): number => {
  const lines = code.split("\n");
  let commentLines = 0;
  let codeLines = 0;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue; // Skip empty lines
    
    if (
      trimmed.startsWith("//") ||
      trimmed.startsWith("#") ||
      trimmed.startsWith("/*") ||
      trimmed.startsWith("*") ||
      trimmed.startsWith("<!--") ||
      trimmed.startsWith("-->")
    ) {
      commentLines++;
    } else {
      codeLines++;
    }
  }
  
  if (codeLines === 0) return 0;
  return commentLines / (commentLines + codeLines);
};

export const commentChecker = async (
  context: HookContext
): Promise<{ warning?: string; level?: "warn" | "error" }> => {
  // Only check after edit/write operations
  if (context.tool?.name !== "edit" && context.tool?.name !== "write") {
    return {};
  }
  
  const args = context.args as Record<string, unknown> | undefined;
  const filePath = args?.filePath as string | undefined;
  const content = args?.content as string | undefined;
  
  if (!filePath || !content) {
    return {};
  }
  
  // Only check code files
  const codeExtensions = [".ts", ".tsx", ".js", ".jsx", ".py", ".java", ".go", ".rs"];
  if (!codeExtensions.some((ext) => filePath.endsWith(ext))) {
    return {};
  }
  
  const ratio = calculateCommentRatio(content);
  
  // Warn if more than 30% comments
  if (ratio > 0.3) {
    return {
      warning: `⚠️ High comment-to-code ratio (${(ratio * 100).toFixed(1)}%). Consider if all comments are necessary. Good code is self-documenting.`,
      level: "warn",
    };
  }
  
  // Error if more than 50% comments
  if (ratio > 0.5) {
    return {
      warning: `❌ Excessive comments (${(ratio * 100).toFixed(1)}%). This is likely over-commented. Remove redundant comments.`,
      level: "error",
    };
  }
  
  return {};
};
