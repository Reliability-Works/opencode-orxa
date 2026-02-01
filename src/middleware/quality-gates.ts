import { exec } from "child_process";
import { promisify } from "util";
import type { OrxaConfig } from "../config/schema";
import type { GateResult, GateResults } from "../types";

const execAsync = promisify(exec);

const runCommand = async (name: string, command: string): Promise<GateResult> => {
  const start = Date.now();
  try {
    const { stdout, stderr } = await execAsync(command, {
      env: process.env,
      maxBuffer: 5 * 1024 * 1024,
    });
    return {
      name,
      success: true,
      output: [stdout, stderr].filter(Boolean).join("\n"),
      durationMs: Date.now() - start,
    };
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; message?: string };
    return {
      name,
      success: false,
      output: [err.stdout, err.stderr].filter(Boolean).join("\n"),
      error: err.message ?? "Command failed",
      durationMs: Date.now() - start,
    };
  }
};

export const runLint = async (): Promise<GateResult> => runCommand("lint", "npm run lint");

export const runTypeCheck = async (): Promise<GateResult> =>
  runCommand("typecheck", "npm run typecheck");

export const runLspDiagnostics = async (): Promise<GateResult> => {
  const command = process.env.LSP_DIAGNOSTICS_COMMAND ?? "npm run typecheck";
  return runCommand("lsp_diagnostics", command);
};

export const runTests = async (): Promise<GateResult> => runCommand("tests", "npm test");

export const runBuild = async (): Promise<GateResult> => runCommand("build", "npm run build");

export type CustomValidator = OrxaConfig["qualityGates"]["customValidators"][number];
export type QualityGatesConfig = OrxaConfig["qualityGates"];

export const runCustomValidator = async (
  validator: CustomValidator
): Promise<GateResult> => runCommand(validator.name, validator.command);

export const runAllQualityGates = async (
  config: QualityGatesConfig
): Promise<GateResults> => {
  const results: GateResults = {};

  if (config.requireLint) {
    results.lint = await runLint();
  } else {
    results.lint = { name: "lint", success: true, output: "skipped" };
  }

  if (config.requireTypeCheck) {
    results.typecheck = await runTypeCheck();
  } else {
    results.typecheck = { name: "typecheck", success: true, output: "skipped" };
  }

  if (config.requireLspDiagnostics) {
    results.lsp_diagnostics = await runLspDiagnostics();
  } else {
    results.lsp_diagnostics = { name: "lsp_diagnostics", success: true, output: "skipped" };
  }

  if (config.requireTests) {
    results.tests = await runTests();
  } else {
    results.tests = { name: "tests", success: true, output: "skipped" };
  }

  if (config.requireBuild) {
    results.build = await runBuild();
  } else {
    results.build = { name: "build", success: true, output: "skipped" };
  }

  for (const validator of config.customValidators) {
    if (validator.required) {
      results[validator.name] = await runCustomValidator(validator);
    } else {
      results[validator.name] = {
        name: validator.name,
        success: true,
        output: "skipped",
      };
    }
  }

  return results;
};
