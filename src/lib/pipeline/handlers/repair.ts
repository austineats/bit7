import Anthropic from "@anthropic-ai/sdk";
import type { PipelineContext, StateTransition } from "../types.js";
import { repairGeneratedCode } from "../../codeGenerator.js";
import { scoreGeneratedCode, generateRetryFeedback, scoreFactoryDimensions } from "../../qualityScorer.js";
import { runAllFixAgents } from "./fixAgents.js";
import { resolveModel } from "../../modelResolver.js";

/**
 * REPAIRING state: run specialized fix agents (deterministic regex-based fixes)
 * followed by an optional LLM repair pass, then transition back to VALIDATING.
 *
 * IMPORTANT: Candidate selection is fatal-first. A candidate that resolves
 * factory fatals wins over higher heuristic score candidates that still fail.
 */

interface RepairCandidate {
  source: "original" | "agent" | "llm";
  code: string;
  qualityScore: number;
  qualityBreakdown: PipelineContext["qualityBreakdown"];
  fatalCount: number;
}

function countFatalFactoryIssues(code: string, prompt: string): number {
  try {
    return scoreFactoryDimensions(code, prompt).issues.filter((issue) => issue.startsWith("FATAL:")).length;
  } catch (e) {
    console.warn("Factory scoring failed during repair candidate selection:", e instanceof Error ? e.message : e);
    return 0;
  }
}

function isBetterCandidate(next: RepairCandidate, current: RepairCandidate): boolean {
  if (next.fatalCount !== current.fatalCount) {
    return next.fatalCount < current.fatalCount;
  }
  return next.qualityScore > current.qualityScore;
}

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
  const originalFatalCount = countFatalFactoryIssues(originalCode, ctx.prompt);
  let bestCandidate: RepairCandidate = {
    source: "original",
    code: originalCode,
    qualityScore: originalScore,
    qualityBreakdown: ctx.qualityBreakdown,
    fatalCount: originalFatalCount,
  };
  const navType = (ctx.pipelineArtifact?.ui_blueprint as { nav_type?: string } | undefined)?.nav_type;
  const hasRingFatalIssue = (ctx.latestFactoryIssues ?? []).some((issue) =>
    issue.includes("FATAL: over-segmented ring for single-metric visualization") ||
    issue.includes("FATAL: concentric calorie+macro ring clutter detected"),
  );

  // Phase 1: Run deterministic fix agents (no LLM needed — instant)
  const { code: agentFixedCode, allFixes } = runAllFixAgents(
    ctx.generatedCode,
    ctx.prompt,
    { forceRingSimplification: hasRingFatalIssue },
  );
  if (allFixes.length > 0) {
    console.log(`Fix agents applied ${allFixes.length} fixes: ${allFixes.join(', ')}`);
  }

  // Score agent-fixed code and prefer it when it removes fatal issues.
  if (allFixes.length > 0) {
    const agentEval = scoreGeneratedCode({
      code: agentFixedCode,
      prompt: ctx.prompt,
      outputFormat: ctx.intent.output_format_hint,
      requestedLayout: ctx.intent.layout_blueprint,
      requestedNavType: navType,
      domainKeywords: ctx.intent.domain_keywords,
    });
    const agentCandidate: RepairCandidate = {
      source: "agent",
      code: agentFixedCode,
      qualityScore: agentEval.quality_score,
      qualityBreakdown: agentEval.quality_breakdown,
      fatalCount: countFatalFactoryIssues(agentFixedCode, ctx.prompt),
    };
    if (isBetterCandidate(agentCandidate, bestCandidate)) {
      console.log(
        `Fix agents selected (fatal ${bestCandidate.fatalCount} -> ${agentCandidate.fatalCount}, ` +
        `score ${bestCandidate.qualityScore} -> ${agentCandidate.qualityScore})`
      );
      bestCandidate = agentCandidate;
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

    const qualityFeedback = generateRetryFeedback(
      ctx.qualityBreakdown,
      candidateCode,
      ctx.intent.layout_blueprint,
      navType,
      ctx.intent.domain_keywords,
      ctx.prompt,
    );
    const fatalFactoryIssues = (ctx.latestFactoryIssues ?? []).filter((issue) => issue.startsWith("FATAL:"));
    const factoryFeedback = fatalFactoryIssues.length > 0
      ? [
          "CRITICAL FACTORY FAILURES (must be fully resolved):",
          ...fatalFactoryIssues.map((issue) => `- ${issue}`),
          "Do not return code until every critical issue above is fixed.",
        ].join("\n")
      : "";
    const repairFeedback = [factoryFeedback, qualityFeedback].filter(Boolean).join("\n\n");

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
    domainKeywords: ctx.intent.domain_keywords,
  });
  const llmCandidate: RepairCandidate = {
    source: "llm",
    code: candidateCode,
    qualityScore: evaluation.quality_score,
    qualityBreakdown: evaluation.quality_breakdown,
    fatalCount: countFatalFactoryIssues(candidateCode, ctx.prompt),
  };

  if (isBetterCandidate(llmCandidate, bestCandidate)) {
    console.log(
      `LLM repair selected (fatal ${bestCandidate.fatalCount} -> ${llmCandidate.fatalCount}, ` +
      `score ${bestCandidate.qualityScore} -> ${llmCandidate.qualityScore})`
    );
    bestCandidate = llmCandidate;
  }

  ctx.generatedCode = bestCandidate.code;
  ctx.qualityScore = bestCandidate.qualityScore;
  ctx.qualityBreakdown = bestCandidate.qualityBreakdown;

  if (bestCandidate.source === "original") {
    console.log(
      `Repair ${ctx.repairCount} kept original (fatal ${originalFatalCount}, score ${originalScore})`
    );
  } else {
    console.log(
      `Repair ${ctx.repairCount} committed ${bestCandidate.source} candidate ` +
      `(fatal ${originalFatalCount} -> ${bestCandidate.fatalCount}, score ${originalScore} -> ${bestCandidate.qualityScore})`
    );
  }

  return { nextState: "VALIDATING" };
}
