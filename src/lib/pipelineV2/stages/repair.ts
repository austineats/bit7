import Anthropic from "@anthropic-ai/sdk";
import type { PipelineV2Context, StateTransition } from "../types.js";
import { repairGeneratedCode } from "../../codeGenerator.js";
import { generateRetryFeedback, scoreFactoryDimensions, scoreGeneratedCode } from "../../qualityScorer.js";
import { runAllFixAgents } from "../../pipeline/handlers/fixAgents.js";
import { resolveModel } from "../../modelResolver.js";

export async function handleRepair(ctx: PipelineV2Context): Promise<StateTransition> {
  if (!ctx.generatedCode || !ctx.intent || !ctx.qualityBreakdown) {
    ctx.errors.push({
      state: "REPAIR",
      message: "Repair stage missing required artifacts",
      timestamp: Date.now(),
    });
    return { nextState: ctx.generatedCode ? "VALIDATE" : "FAILED" };
  }

  ctx.repairCount += 1;
  ctx.onProgress?.({ type: "status", message: `Optimizing quality (repair ${ctx.repairCount}/${ctx.maxRepairs})...` });

  const originalCode = ctx.generatedCode;
  const originalScore = ctx.qualityScore ?? 0;
  const originalBreakdown = ctx.qualityBreakdown;
  const navType = (ctx.pipelineArtifact?.ui_blueprint as { nav_type?: string } | undefined)?.nav_type;
  const currentFactory = scoreFactoryDimensions(ctx.generatedCode, ctx.prompt);
  const hasRingFatalIssue = currentFactory.issues.some((issue) =>
    issue.includes("FATAL: over-segmented ring for single-metric visualization") ||
    issue.includes("FATAL: concentric calorie+macro ring clutter detected"),
  );

  const { code: agentFixedCode, allFixes } = runAllFixAgents(
    ctx.generatedCode,
    ctx.prompt,
    { forceRingSimplification: hasRingFatalIssue },
  );
  if (allFixes.length > 0) {
    console.log(`Fix agents applied ${allFixes.length} fixes: ${allFixes.join(", ")}`);
  }

  let bestCode = originalCode;
  let bestScore = originalScore;
  let bestBreakdown = originalBreakdown;

  if (allFixes.length > 0) {
    const agentEval = scoreGeneratedCode({
      code: agentFixedCode,
      prompt: ctx.prompt,
      outputFormat: ctx.intent.output_format_hint,
      requestedLayout: ctx.intent.layout_blueprint,
      requestedNavType: navType,
      domainKeywords: ctx.intent.domain_keywords,
    });
    if (agentEval.quality_score > bestScore) {
      bestCode = agentFixedCode;
      bestScore = agentEval.quality_score;
      bestBreakdown = agentEval.quality_breakdown;
    }
  }

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
      ctx.intent.domain_keywords,
      ctx.prompt,
    );

    try {
      const repairedCode = await repairGeneratedCode(client, modelId, candidateCode, repairFeedback, ctx.onProgress);
      if (repairedCode && repairedCode.length > 200) {
        candidateCode = repairedCode;
      }
    } catch (e) {
      console.warn(`LLM repair pass ${ctx.repairCount} failed:`, e instanceof Error ? e.message : e);
    }
  }

  const evaluation = scoreGeneratedCode({
    code: candidateCode,
    prompt: ctx.prompt,
    outputFormat: ctx.intent.output_format_hint,
    requestedLayout: ctx.intent.layout_blueprint,
    requestedNavType: navType,
    domainKeywords: ctx.intent.domain_keywords,
  });

  if (evaluation.quality_score > bestScore) {
    ctx.generatedCode = candidateCode;
    ctx.qualityScore = evaluation.quality_score;
    ctx.qualityBreakdown = evaluation.quality_breakdown;
  } else if (bestCode !== originalCode) {
    ctx.generatedCode = bestCode;
    ctx.qualityScore = bestScore;
    ctx.qualityBreakdown = bestBreakdown;
  } else {
    ctx.generatedCode = originalCode;
    ctx.qualityScore = originalScore;
    ctx.qualityBreakdown = originalBreakdown;
  }

  return { nextState: "VALIDATE" };
}
