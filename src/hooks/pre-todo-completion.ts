import { HookContext, TodoCompletionGateResult } from "../types.js";
import { runAllQualityGates } from "../middleware/quality-gates.js";

export const preTodoCompletion = async (
  context: HookContext
): Promise<TodoCompletionGateResult> => {
  const { config } = context;

  if (!config.qualityGates) {
    return { allow: true };
  }

  const results = await runAllQualityGates(config.qualityGates);

  for (const result of Object.values(results)) {
    if (!result.success) {
      const message = `❌ Quality Gate Failed: ${result.name}\n${result.output ?? ""}`.trim();
      if (config.orxa.enforcement.qualityGates === "warn") {
        return { allow: true, warnings: [message] };
      }
      return {
        block: config.orxa.enforcement.qualityGates === "strict",
        message,
      };
    }
  }

  return { allow: true };
};
