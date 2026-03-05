import type { PipelineContext, StateTransition } from "../types.js";
import { SCORE_THRESHOLDS } from "../types.js";
import { scoreFactoryDimensions } from "../../qualityScorer.js";

/**
 * VALIDATING state: run four-dimension factory scoring and decide next state.
 *
 * The code has already been through internal quality scoring and repair
 * inside generateReactCode. This validation adds a safety net for security
 * issues, critical code quality problems, and bland/generic output gating.
 *
 * Score thresholds (deterministic — no LLM decides):
 *   Security < 60:                            REPAIRING (security issues are critical)
 *   Code quality < 50:                        REPAIRING (severe runtime/structural issues)
 *   visual_uniqueness < 40 or domain < 35:    REPAIRING (too bland/generic)
 *   Degraded + overall quality < 45:          FAILED (bland degraded output should not ship)
 *   Otherwise:                                FINALIZING (trust the internal quality checks)
 */
export async function handleValidation(ctx: PipelineContext): Promise<StateTransition> {
  if (!ctx.generatedCode) {
    ctx.errors.push({
      state: "VALIDATING",
      message: "No generated code available during validation (NO_CODE_PRODUCED)",
      timestamp: Date.now(),
    });
    return { nextState: "FAILED" };
  }

  // Run four-dimension factory scoring (Code Quality, Design, Security, Performance)
  try {
    const factory = scoreFactoryDimensions(ctx.generatedCode);
    console.log(
      `Factory scores — Code: ${factory.code_quality}, Design: ${factory.design_quality}, ` +
      `Security: ${factory.security}, Performance: ${factory.performance}, Overall: ${factory.overall}`
    );
    if (factory.issues.length > 0) {
      console.log(`Factory issues: ${factory.issues.join(' | ')}`);
    }

    // Trigger repair for critical security issues or severe code quality problems.
    if (factory.security < 60 && ctx.repairCount < ctx.maxRepairs) {
      console.log(`Security score ${factory.security} < 60 — triggering repair (dimension: security)`);
      ctx.onProgress?.({ type: "status", message: `Security check: fixing issues...` });
      return { nextState: "REPAIRING" };
    }
    if (factory.code_quality < 50 && ctx.repairCount < ctx.maxRepairs) {
      console.log(`Code quality score ${factory.code_quality} < 50 — triggering repair (dimension: code_quality)`);
      ctx.onProgress?.({ type: "status", message: `Quality check: fixing code issues...` });
      return { nextState: "REPAIRING" };
    }
  } catch (e) {
    // Factory scoring is a safety net — if it fails, proceed with the code we have
    console.warn("Factory scoring failed (non-fatal):", e instanceof Error ? e.message : e);
  }

  // Gate on visual uniqueness and domain specificity from the quality breakdown
  const breakdown = ctx.qualityBreakdown;
  if (breakdown && ctx.repairCount < ctx.maxRepairs) {
    if (breakdown.visual_uniqueness < 40) {
      console.log(`Visual uniqueness ${breakdown.visual_uniqueness} < 40 — triggering repair`);
      ctx.onProgress?.({ type: "status", message: "Improving visual uniqueness..." });
      return { nextState: "REPAIRING" };
    }
    if (breakdown.domain_specificity < 35) {
      console.log(`Domain specificity ${breakdown.domain_specificity} < 35 — triggering repair`);
      ctx.onProgress?.({ type: "status", message: "Improving domain specificity..." });
      return { nextState: "REPAIRING" };
    }
  }

  // If we've exhausted repairs and still have weak quality dimensions,
  // fail instead of shipping obviously degraded UI.
  if (breakdown && ctx.repairCount >= ctx.maxRepairs) {
    const weakVisual = breakdown.visual_uniqueness < 40;
    const weakDomain = breakdown.domain_specificity < 35;
    const weakLayoutFit = breakdown.content_layout_fit < 45;
    if (weakVisual || weakDomain || weakLayoutFit) {
      const reasons: string[] = [];
      if (weakVisual) reasons.push(`visual uniqueness ${breakdown.visual_uniqueness} < 40`);
      if (weakDomain) reasons.push(`domain specificity ${breakdown.domain_specificity} < 35`);
      if (weakLayoutFit) reasons.push(`content-layout fit ${breakdown.content_layout_fit} < 45`);
      const detail = reasons.join(", ");
      console.log(`Repair limit reached with unresolved quality issues — failing: ${detail}`);
      ctx.onProgress?.({ type: "status", message: "Generation quality too low — please retry" });
      ctx.errors.push({
        state: "VALIDATING",
        message: `Quality gates failed after max repairs: ${detail}`,
        timestamp: Date.now(),
      });
      return { nextState: "FAILED" };
    }
  }

  // Stricter gate for degraded mode — don't ship bland fallback output
  const score = ctx.qualityScore ?? 0;
  if (ctx.degraded && score < 45) {
    console.log(`Degraded mode + quality ${score} < 45 — failing (bland output should not ship)`);
    ctx.onProgress?.({ type: "status", message: "Generation quality too low — please retry" });
    ctx.errors.push({
      state: "VALIDATING",
      message: `Degraded generation with quality score ${score} is below minimum threshold (45). Please retry.`,
      timestamp: Date.now(),
    });
    return { nextState: "FAILED" };
  }

  ctx.onProgress?.({ type: "status", message: `Quality check: ${score}/100` });

  return { nextState: "FINALIZING" };
}
