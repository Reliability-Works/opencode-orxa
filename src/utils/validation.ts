import { orxaConfigSchema } from "../config/schema.js";
import type { ConfigValidationResult, ToolPayload } from "../types.js";

export interface ValidationError {
  field: string;
  message: string;
}

export const validateToolPayload = (
  payload: ToolPayload,
  maxLength: number
): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (!payload.toolName || typeof payload.toolName !== "string") {
    errors.push({ field: "toolName", message: "Tool name must be provided." });
  }

  if (payload.args === undefined) {
    errors.push({ field: "args", message: "Tool args must be provided." });
  }

  const serialized = JSON.stringify(payload);
  if (serialized.length > maxLength) {
    errors.push({
      field: "payload",
      message: `Tool payload exceeds maximum length (${serialized.length}/${maxLength}).`,
    });
  }

  return errors;
};

export const validateDelegationPrompt = (
  prompt: string,
  requiredSections: string[]
): string[] => {
  if (!prompt || typeof prompt !== "string") {
    return requiredSections;
  }
  
  // Simple case-sensitive check - just look for the section name in the prompt
  return requiredSections.filter((section) => !prompt.includes(section));
};

export const validateConfig = (config: unknown): ConfigValidationResult => {
  const result = orxaConfigSchema.safeParse(config);
  if (result.success) {
    return { valid: true, errors: [] };
  }

  return {
    valid: false,
    errors: result.error.errors.map((error: { message: string }) => error.message),
  };
};
