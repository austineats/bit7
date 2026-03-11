import type { PipelineContext, StateTransition } from "../types.js";
import { generateReactCode } from "../../codeGenerator.js";

/**
 * GENERATING state: if the PLANNING state didn't produce code (first attempt failed),
 * retry code generation one more time.
 *
 * If code already exists from PLANNING, skip straight to VALIDATING.
 */
export async function handleGeneration(ctx: PipelineContext): Promise<StateTransition> {
  // If we already have code from planning, move to validation
  if (ctx.generatedCode) {
    return { nextState: "VALIDATING" };
  }

  if (!ctx.intent) {
    ctx.errors.push({
      state: "GENERATING",
      message: "No intent available for code generation",
      timestamp: Date.now(),
    });
    return { nextState: "FAILED" };
  }

  // Retry code generation (attempt 2)
  console.log("Retrying code generation (attempt 2/2)...");
  ctx.onProgress?.({ type: "status", message: "Retrying code generation..." });

  try {
    const codeResult = await generateReactCode(
      ctx.intent,
      ctx.prompt,
      ctx.model,
      ctx.onProgress,
      ctx.contextBrief,
      ctx.twentyFirstDevComponents,
      ctx.templateHtmlStructure,
    );

    if (codeResult) {
      ctx.generatedCode = codeResult.generated_code;
      ctx.appName = codeResult.app_name;
      ctx.tagline = codeResult.tagline;
      ctx.themeColor = codeResult.primary_color;
      ctx.pages = codeResult.pages;
      ctx.qualityScore = codeResult.quality_score;
      ctx.qualityBreakdown = codeResult.quality_breakdown;
      ctx.pipelineArtifact = codeResult.pipeline_artifact;
      ctx.pipelineSummary = `Selected ${codeResult.pipeline_artifact.selected_candidate} (${codeResult.quality_score}/100)`;
      return { nextState: "VALIDATING" };
    }
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    console.error("Code generation retry failed:", errMsg);
    ctx.errors.push({
      state: "GENERATING",
      message: errMsg,
      timestamp: Date.now(),
    });
  }

  ctx.onProgress?.({ type: "status", message: "Code generation failed after retry" });
  // Hard fail — do not persist a record without generated code
  ctx.errors.push({
    state: "GENERATING",
    message: "Both code generation attempts returned no usable code (NO_CODE_PRODUCED)",
    timestamp: Date.now(),
  });
  return { nextState: "FAILED" };
}
