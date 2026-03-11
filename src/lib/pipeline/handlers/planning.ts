import type { PipelineContext, StateTransition } from "../types.js";
import { generateReactCode } from "../../codeGenerator.js";

/**
 * PLANNING state: runs the full code generation pipeline including
 * parallel planning agents (Design Architect + Content Strategist),
 * code synthesis, quality scoring, and auto-fix repair.
 *
 * This delegates to `generateReactCode` which handles the inner loop:
 *   planning agents → code synthesis → quality scoring → repair
 *
 * Transitions to GENERATING on success or failure (GENERATING has retry logic).
 */
export async function handlePlanning(ctx: PipelineContext): Promise<StateTransition> {
  if (!ctx.intent) {
    ctx.errors.push({
      state: "PLANNING",
      message: "No intent available — reasoning state must run first",
      timestamp: Date.now(),
    });
    return { nextState: "FAILED" };
  }

  ctx.onProgress?.({ type: "status", message: "Designing app architecture..." });

  try {
    // generateReactCode handles planning agents, code generation, quality scoring, and repair
    // It returns a CodeGenerationResult or null
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
      ctx.designBlueprint = codeResult.pipeline_artifact.ui_blueprint ?? null;
    } else {
      console.warn("Code generation returned null (attempt 1) — will retry in GENERATING state");
      ctx.onProgress?.({ type: "status", message: "First build attempt incomplete — retrying..." });
    }
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    console.error("Code generation failed (attempt 1):", errMsg);
    ctx.errors.push({
      state: "PLANNING",
      message: errMsg,
      timestamp: Date.now(),
    });
    // Don't throw — transition to GENERATING for retry
  }

  return { nextState: "GENERATING" };
}
