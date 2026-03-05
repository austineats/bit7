import { randomUUID } from "node:crypto";
import { prisma } from "../../db.js";
import type { PipelineContext, StateTransition } from "../types.js";
import type { GenerateResult } from "../../../types/index.js";

/**
 * FINALIZING state: persist the generated app to the database,
 * create version and pipeline run records, and build the final result.
 */
export async function handleFinalize(ctx: PipelineContext): Promise<StateTransition> {
  if (!ctx.spec) {
    ctx.errors.push({
      state: "FINALIZING",
      message: "No spec available — reasoning state must complete first",
      timestamp: Date.now(),
    });
    return { nextState: "FAILED" };
  }

  // Hard guard: never persist a record without generated code
  if (!ctx.generatedCode) {
    ctx.errors.push({
      state: "FINALIZING",
      message: "No generated code available — cannot finalize without code (NO_CODE_PRODUCED)",
      timestamp: Date.now(),
    });
    return { nextState: "FAILED" };
  }

  ctx.onProgress?.({ type: "status", message: "Deploying to preview..." });

  // Persist new app — retry on connection pool timeout (Neon connections go stale during long API calls)
  let app;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      if (attempt > 1) {
        console.log(`[finalize] Retry DB write attempt ${attempt}/3 — reconnecting...`);
        await prisma.$disconnect();
        await prisma.$connect();
      }
      app = await prisma.app.create({
        data: {
          name: ctx.spec!.name,
          description: ctx.spec!.description,
          spec: ctx.spec as object,
          original_prompt: ctx.prompt,
          generated_code: ctx.generatedCode,
          ...(ctx.themeColor ? { theme_color: ctx.themeColor } : {}),
          ...(ctx.tagline ? { tagline: ctx.tagline } : { tagline: ctx.spec!.tagline }),
        },
      });
      break;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (attempt < 3 && (msg.includes("connection pool") || msg.includes("Timed out") || msg.includes("Connection refused"))) {
        console.warn(`[finalize] DB write failed (attempt ${attempt}): ${msg}`);
        continue;
      }
      throw e;
    }
  }
  if (!app) throw new Error("[finalize] All DB write attempts failed");

  // Best-effort version persistence
  if (ctx.generatedCode) {
    try {
      const versionId = randomUUID();
      await prisma.$executeRawUnsafe(
        `INSERT INTO app_versions (id, app_id, label, source, generated_code, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW())`,
        versionId,
        app.id,
        "Initial Generation",
        "generate",
        ctx.generatedCode,
        JSON.stringify({
          quality_score: ctx.qualityScore ?? null,
          quality_breakdown: ctx.qualityBreakdown ?? null,
        }),
      );
    } catch (e) {
      console.warn("app_versions insert skipped:", e);
    }
  }

  // Best-effort pipeline run persistence
  if (ctx.pipelineArtifact) {
    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO pipeline_runs (id, app_id, prompt, intent, artifact, quality_score, quality_breakdown, state_history, total_duration_ms, repair_count, final_state, created_at)
         VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7::jsonb, $8::jsonb, $9, $10, $11, NOW())`,
        ctx.pipelineArtifact.run_id,
        app.id,
        ctx.prompt,
        JSON.stringify(ctx.intent),
        JSON.stringify(ctx.pipelineArtifact),
        ctx.qualityScore ?? 0,
        JSON.stringify(ctx.qualityBreakdown ?? {}),
        JSON.stringify(ctx.stateHistory),
        ctx.stateHistory.reduce((sum, s) => sum + (s.duration_ms ?? 0), 0),
        ctx.repairCount,
        "COMPLETE",
      );
    } catch (e) {
      // Fall back to simpler insert if new columns don't exist yet
      try {
        await prisma.$executeRawUnsafe(
          `INSERT INTO pipeline_runs (id, app_id, prompt, intent, artifact, quality_score, quality_breakdown, created_at)
           VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7::jsonb, NOW())`,
          ctx.pipelineArtifact.run_id,
          app.id,
          ctx.prompt,
          JSON.stringify(ctx.intent),
          JSON.stringify(ctx.pipelineArtifact),
          ctx.qualityScore ?? 0,
          JSON.stringify(ctx.qualityBreakdown ?? {}),
        );
      } catch (e2) {
        console.warn("pipeline_runs insert skipped:", e2);
      }
    }
  }

  // Persist degraded marker in pipeline summary
  if (ctx.degraded && ctx.pipelineSummary && !ctx.pipelineSummary.includes("[degraded")) {
    ctx.pipelineSummary += " [degraded]";
  }

  // Update quality fields on the app
  if (ctx.qualityScore !== null || ctx.pipelineSummary) {
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE apps
         SET latest_quality_score = COALESCE($2, latest_quality_score),
             latest_pipeline_summary = COALESCE($3, latest_pipeline_summary),
             updated_at = NOW()
         WHERE id = $1`,
        app.id,
        ctx.qualityScore ?? null,
        ctx.pipelineSummary ?? null,
      );
    } catch (e) {
      console.warn("apps quality fields update skipped:", e);
    }
  }

  // Build final result
  ctx.result = {
    id: app.id,
    short_id: app.short_id,
    name: app.name,
    tagline: app.tagline ?? ctx.spec!.tagline,
    description: app.description,
    spec: ctx.spec!,
    generated_code: app.generated_code ?? undefined,
    pipeline_run_id: ctx.pipelineArtifact?.run_id,
    quality_score: ctx.qualityScore ?? undefined,
    quality_breakdown: ctx.qualityBreakdown ?? undefined,
    latest_pipeline_summary: ctx.pipelineSummary ?? undefined,
    shareUrl: `/share/${app.short_id}`,
  } as GenerateResult;

  return { nextState: "COMPLETE" };
}
