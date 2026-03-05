import type { GenerateResult } from "../types/index.js";
import type { ProgressCallback } from "./progressEmitter.js";
import { createPipelineContext, runStateMachine } from "./pipeline/index.js";

export async function generateFromPrompt(
  prompt: string,
  model: "auto" | "kimi" | "sonnet" | "opus" = "auto",
  onProgress?: ProgressCallback,
  signal?: AbortSignal,
): Promise<GenerateResult> {
  // Legacy aliases ("sonnet", "opus") are accepted for backward compatibility,
  // but generation is now always routed through the Kimi path.
  const resolvedModel: "kimi" = "kimi";

  // Create pipeline context and run through the state machine
  const ctx = createPipelineContext(prompt, resolvedModel, onProgress, signal);
  const result = await runStateMachine(ctx);

  if (result.state === "FAILED" || !result.result) {
    const lastError = result.errors[result.errors.length - 1];
    throw new Error(
      lastError?.message ?? "Pipeline failed without producing a result"
    );
  }

  return result.result;
}
