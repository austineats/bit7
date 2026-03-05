import Anthropic from "@anthropic-ai/sdk";
import type { PipelineContext, StateTransition } from "../types.js";
import { repairGeneratedCode } from "../../codeGenerator.js";
import { scoreGeneratedCode, generateRetryFeedback } from "../../qualityScorer.js";
import { runAllFixAgents } from "./fixAgents.js";
import { resolveModel } from "../../modelResolver.js";

/**
 * REPAIRING state: run specialized fix agents (deterministic regex-based fixes)
 * followed by an optional LLM repair pass, then transition back to VALIDATING.
 *
 * IMPORTANT: Original code is preserved as a rollback target. If the repaired
 * code doesn't improve the quality score, the original is kept unchanged.
 */
export async function handleRepair(ctx: PipelineContext): Promise<StateTransition> {
  if (!ctx.generatedCode || !ctx.intent || !ctx.qualityBreakdown) {
    ctx.errors.push({
      state: "REPAIRING",
      message: "Repair stage missing required artifacts",
      timestamp: Date.now(),
    });
    return { nextState: ctx.generatedCode ? "VALIDATING" : "FAILED" };
  }

  ctx.repairCount++;
  ctx.onProgress?.({ type: "status", message: `Optimizing quality (repair ${ctx.repairCount}/${ctx.maxRepairs})...` });

  // Save original code for rollback
  const originalCode = ctx.generatedCode;
  const originalScore = ctx.qualityScore ?? 0;
  const navType = (ctx.pipelineArtifact?.ui_blueprint as { nav_type?: string } | undefined)?.nav_type;

  // Phase 1: Run deterministic fix agents (no LLM needed — instant)
  const { code: agentFixedCode, allFixes } = runAllFixAgents(ctx.generatedCode);
  if (allFixes.length > 0) {
    console.log(`Fix agents applied ${allFixes.length} fixes: ${allFixes.join(', ')}`);
  }

  // Score agent-fixed code to preserve improvements even if LLM repair fails
  let bestCode = originalCode;
  let bestScore = originalScore;
  if (allFixes.length > 0) {
    const agentEval = scoreGeneratedCode({
      code: agentFixedCode,
      prompt: ctx.prompt,
      outputFormat: ctx.intent.output_format_hint,
      requestedLayout: ctx.intent.layout_blueprint,
      requestedNavType: navType,
    });
    if (agentEval.quality_score > bestScore) {
      bestCode = agentFixedCode;
      bestScore = agentEval.quality_score;
      console.log(`Fix agents improved score: ${originalScore} -> ${agentEval.quality_score}`);
    }
  }

  // Phase 2: LLM repair pass for issues that need creative judgment
  let candidateCode = agentFixedCode;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    const client = new Anthropic({
      apiKey,
      maxRetries: 3,
      ...(process.env.ANTHROPIC_BASE_URL ? { baseURL: process.env.ANTHROPIC_BASE_URL } : {}),
    });
    const modelId = resolveModel("standard");

    const repairFeedback = generateRetryFeedback(
      ctx.qualityBreakdown,
      candidateCode,
      ctx.intent.layout_blueprint,
      navType,
    );

    try {
      const repairedCode = await repairGeneratedCode(
        client,
        modelId,
        candidateCode,
        repairFeedback,
        ctx.onProgress,
      );

      if (repairedCode && repairedCode.length > 200) {
        candidateCode = repairedCode;
      }
    } catch (e) {
      console.warn(`LLM repair pass ${ctx.repairCount} failed:`, e instanceof Error ? e.message : e);
    }
  }

  // Re-score the LLM-repaired candidate
  const evaluation = scoreGeneratedCode({
    code: candidateCode,
    prompt: ctx.prompt,
    outputFormat: ctx.intent.output_format_hint,
    requestedLayout: ctx.intent.layout_blueprint,
    requestedNavType: navType,
  });

  // Commit the best version: LLM repair > agent fix > original
  if (evaluation.quality_score > bestScore) {
    console.log(`Repair ${ctx.repairCount} improved score: ${originalScore} -> ${evaluation.quality_score}`);
    ctx.generatedCode = candidateCode;
    ctx.qualityScore = evaluation.quality_score;
    ctx.qualityBreakdown = evaluation.quality_breakdown;
  } else if (bestCode !== originalCode) {
    // Agent fixes improved but LLM repair didn't — keep agent improvements
    console.log(`Repair ${ctx.repairCount}: LLM pass didn't help (${evaluation.quality_score}), keeping agent fixes (${bestScore})`);
    ctx.generatedCode = bestCode;
    ctx.qualityScore = bestScore;
  } else {
    // Nothing improved — rollback to original
    console.log(`Repair ${ctx.repairCount} did not improve score (${evaluation.quality_score} vs ${originalScore}), rolling back`);
    ctx.generatedCode = originalCode;
  }

  return { nextState: "VALIDATING" };
}
