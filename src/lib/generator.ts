import { prisma } from "./db.js";
import { runGenerationPipeline } from "./pipeline.js";
import { generateReactCode } from "./codeGenerator.js";
import type { GenerateResult } from "../types/index.js";
import type { ProgressCallback } from "./progressEmitter.js";
import { randomUUID } from "node:crypto";

export async function generateFromPrompt(
  prompt: string,
  model: "auto" | "sonnet" | "opus" = "auto",
  onProgress?: ProgressCallback,
): Promise<GenerateResult> {
  // Always use Haiku (via "sonnet" path) for cost efficiency
  // Opus is only used if explicitly requested — never auto-selected
  const resolvedModel = model === "opus" ? "opus" : "sonnet";

  onProgress?.({ type: "status", message: "Scaffolding project..." });

  // Step 1: Run reasoner pipeline (Haiku) to extract structured intent
  console.log("Starting reasoner pipeline...");
  const { spec, intent } = await runGenerationPipeline(prompt);

  // Emit narrative event — AI self-dialogue before the plan
  if (intent.narrative) {
    onProgress?.({
      type: "narrative",
      message: intent.narrative,
      data: { app_name: intent.app_name_hint },
    });
  }

  // Emit plan event with structured data from the reasoner
  onProgress?.({
    type: "plan",
    message: `Building ${intent.app_name_hint}`,
    data: {
      app_name: intent.app_name_hint,
      domain: intent.domain,
      design: intent.design_philosophy,
      tabs: intent.nav_tabs.map((t: { label: string; icon: string }) => t.label),
      features: intent.premium_features ?? [],
      feature_details: intent.feature_details ?? [],
    },
  });

  onProgress?.({ type: "status", message: "Compiling components..." });

  // Step 2: Generate real React code using the intent + context
  // onProgress is threaded through so code gen emits real-time "writing" events
  // via stream.on('inputJson') as components are detected during Anthropic streaming
  let generated_code: string | null = null;
  let theme_color: string | null = null;
  let tagline_override: string | null = null;
  let quality_score: number | undefined;
  let quality_breakdown: GenerateResult["quality_breakdown"] | undefined;
  let pipeline_run_id: string | undefined;
  let latest_pipeline_summary: string | undefined;
  let pipelineArtifact: unknown = null;

  // Attempt code generation with one retry on failure
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      if (attempt === 2) {
        console.log("Retrying code generation (attempt 2/2)...");
        onProgress?.({ type: "status", message: "Retrying code generation..." });
      }
      const codeResult = await generateReactCode(intent, prompt, resolvedModel, onProgress);
      if (codeResult) {
        generated_code = codeResult.generated_code;
        theme_color = codeResult.primary_color;
        tagline_override = codeResult.tagline;
        quality_score = codeResult.quality_score;
        quality_breakdown = codeResult.quality_breakdown;
        pipeline_run_id = codeResult.pipeline_artifact.run_id;
        latest_pipeline_summary = `Selected ${codeResult.pipeline_artifact.selected_candidate} (${codeResult.quality_score}/100)`;
        pipelineArtifact = codeResult.pipeline_artifact;
        break; // Success — exit retry loop
      } else {
        console.warn(`Code generation returned null (attempt ${attempt}/2)`);
        if (attempt === 2) {
          onProgress?.({ type: "status", message: "Code generation failed after retry" });
        }
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      console.error(`React code generation error (attempt ${attempt}/2):`, errMsg);
      if (attempt === 2) {
        onProgress?.({ type: "status", message: `Code generation error: ${errMsg.slice(0, 80)}` });
      }
    }
  }

  // Step 3: Delete all previous apps (MVP — only keep latest generation)
  await prisma.app.deleteMany();

  // Step 4: Store in DB
  onProgress?.({ type: "status", message: "Deploying to preview..." });
  const app = await prisma.app.create({
    data: {
      name: spec.name,
      description: spec.description,
      spec: spec as object,
      original_prompt: prompt,
      ...(generated_code ? { generated_code } : {}),
      ...(theme_color ? { theme_color } : {}),
      ...(tagline_override ? { tagline: tagline_override } : { tagline: spec.tagline }),
    },
  });

  // Best-effort pipeline/version persistence (safe if DB migration not applied yet)
  if (generated_code) {
    try {
      const versionId = randomUUID();
      await prisma.$executeRawUnsafe(
        `INSERT INTO app_versions (id, app_id, label, source, generated_code, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW())`,
        versionId,
        app.id,
        "Initial Generation",
        "generate",
        generated_code,
        JSON.stringify({
          quality_score: quality_score ?? null,
          quality_breakdown: quality_breakdown ?? null,
        }),
      );
    } catch (e) {
      console.warn("app_versions insert skipped:", e);
    }
  }

  if (pipelineArtifact && pipeline_run_id) {
    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO pipeline_runs (id, app_id, prompt, intent, artifact, quality_score, quality_breakdown, created_at)
         VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7::jsonb, NOW())`,
        pipeline_run_id,
        app.id,
        prompt,
        JSON.stringify(intent),
        JSON.stringify(pipelineArtifact),
        quality_score ?? 0,
        JSON.stringify(quality_breakdown ?? {}),
      );
    } catch (e) {
      console.warn("pipeline_runs insert skipped:", e);
    }
  }

  if (quality_score !== undefined || latest_pipeline_summary) {
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE apps
         SET latest_quality_score = COALESCE($2, latest_quality_score),
             latest_pipeline_summary = COALESCE($3, latest_pipeline_summary),
             updated_at = NOW()
         WHERE id = $1`,
        app.id,
        quality_score ?? null,
        latest_pipeline_summary ?? null,
      );
    } catch (e) {
      console.warn("apps quality fields update skipped:", e);
    }
  }

  return {
    id: app.id,
    short_id: app.short_id,
    name: app.name,
    tagline: app.tagline ?? spec.tagline,
    description: app.description,
    spec,
    generated_code: app.generated_code ?? undefined,
    pipeline_run_id,
    quality_score,
    quality_breakdown,
    latest_pipeline_summary,
    shareUrl: `/share/${app.short_id}`,
  };
}
