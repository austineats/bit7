import { randomUUID } from "node:crypto";
import type {
  PipelineState,
  PipelineContext,
  StateHandler,
  StateTransition,
} from "./types.js";
import type { ProgressCallback } from "../progressEmitter.js";

import { handleIntake } from "./handlers/intake.js";
import { handleResearch } from "./handlers/research.js";
import { handleReasoning } from "./handlers/reasoning.js";
import { handlePlanning } from "./handlers/planning.js";
import { handleGeneration } from "./handlers/generation.js";
import { handleValidation } from "./handlers/validation.js";
import { handleRepair } from "./handlers/repair.js";
import { handleFinalize } from "./handlers/finalize.js";

/* ------------------------------------------------------------------ */
/*  State → Handler mapping (deterministic — no LLM chooses next state) */
/* ------------------------------------------------------------------ */

const STATE_HANDLERS: Record<PipelineState, StateHandler | null> = {
  INTAKE:      handleIntake,
  RESEARCHING: handleResearch,
  REASONING:   handleReasoning,
  PLANNING:    handlePlanning,
  GENERATING:  handleGeneration,
  VALIDATING:  handleValidation,
  REPAIRING:   handleRepair,
  FINALIZING:  handleFinalize,
  COMPLETE:    null,  // terminal
  FAILED:      null,  // terminal
};

const STATE_PROGRESS_LABEL: Partial<Record<PipelineState, string>> = {
  INTAKE: "Initializing project structure...",
  RESEARCHING: "Compiling component modules...",
  REASONING: "Linking interactive elements...",
  PLANNING: "Bundling data layer...",
  GENERATING: "Optimizing render pipeline...",
  VALIDATING: "Optimizing render pipeline...",
  REPAIRING: "Optimizing render pipeline...",
  FINALIZING: "Preparing live preview...",
};

/* ------------------------------------------------------------------ */
/*  Create initial pipeline context                                     */
/* ------------------------------------------------------------------ */

export function createPipelineContext(
  prompt: string,
  model: "kimi",
  onProgress?: ProgressCallback,
  signal?: AbortSignal,
  figmaTemplateKey?: string | null,
): PipelineContext {
  return {
    runId: randomUUID(),
    prompt,
    model,
    state: "INTAKE",
    stateHistory: [],
    figmaTemplateKey: figmaTemplateKey ?? null,
    contextBrief: null,
    competitorVisuals: null,
    webSearchContext: null,
    intent: null,
    spec: null,
    twentyFirstDevComponents: null,
    templateHtmlStructure: null,
    designBlueprint: null,
    contentMap: null,
    generatedCode: null,
    appName: null,
    tagline: null,
    themeColor: null,
    pages: [],
    qualityScore: null,
    qualityBreakdown: null,
    pipelineArtifact: null,
    pipelineSummary: null,
    degraded: false,
    repairCount: 0,
    maxRepairs: 0,
    errors: [],
    onProgress,
    signal,
    result: null,
  };
}

/* ------------------------------------------------------------------ */
/*  State Machine Runner                                                */
/* ------------------------------------------------------------------ */

export async function runStateMachine(ctx: PipelineContext): Promise<PipelineContext> {
  const startTime = Date.now();

  // Kimi K2.5 thinking models: each API call takes ~90-120s, pipeline has ~5-6 calls
  const globalTimeoutMs = Number(process.env.STARTBOX_PIPELINE_TIMEOUT_MS) || 900_000; // 15 min default

  while (ctx.state !== "COMPLETE" && ctx.state !== "FAILED") {
    // Abort guard — stop if client disconnected
    if (ctx.signal?.aborted) {
      console.log(`[Pipeline ${ctx.runId.slice(0, 8)}] Aborted (client disconnected)`);
      ctx.errors.push({
        state: ctx.state,
        message: "Pipeline cancelled — client disconnected",
        timestamp: Date.now(),
      });
      ctx.state = "FAILED";
      break;
    }

    // Global timeout guard — prevent runaway generations
    if (Date.now() - startTime > globalTimeoutMs) {
      console.warn(`[Pipeline ${ctx.runId.slice(0, 8)}] Global timeout (${globalTimeoutMs}ms) exceeded`);
      ctx.errors.push({
        state: ctx.state,
        message: `Pipeline timed out after ${Math.round((Date.now() - startTime) / 1000)}s`,
        timestamp: Date.now(),
      });
      // If we have generated code, salvage it; otherwise fail
      if (ctx.generatedCode) {
        ctx.state = "FINALIZING";
        continue;
      } else {
        ctx.state = "FAILED";
        break;
      }
    }

    const handler = STATE_HANDLERS[ctx.state];
    if (!handler) {
      console.error(`No handler for state: ${ctx.state}`);
      ctx.state = "FAILED";
      ctx.errors.push({
        state: ctx.state,
        message: `No handler for state: ${ctx.state}`,
        timestamp: Date.now(),
      });
      break;
    }

    const stateStart = Date.now();
    ctx.stateHistory.push({ state: ctx.state, entered_at: stateStart });

    console.log(`[Pipeline ${ctx.runId.slice(0, 8)}] → ${ctx.state}`);
    const progressLabel = STATE_PROGRESS_LABEL[ctx.state];
    if (progressLabel) {
      ctx.onProgress?.({ type: "status", message: progressLabel });
    }

    let transition: StateTransition;
    try {
      transition = await handler(ctx);
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      console.error(`[Pipeline ${ctx.runId.slice(0, 8)}] ${ctx.state} FAILED:`, errMsg);
      ctx.errors.push({
        state: ctx.state,
        message: errMsg,
        timestamp: Date.now(),
      });

      // On error: if we're past GENERATING, try to finalize with what we have
      // Otherwise, fail the pipeline
      if (ctx.generatedCode && (ctx.state === "VALIDATING" || ctx.state === "REPAIRING")) {
        transition = { nextState: "FINALIZING" };
      } else {
        transition = { nextState: "FAILED" };
      }
    }

    // Record duration for completed state
    const lastEntry = ctx.stateHistory[ctx.stateHistory.length - 1];
    if (lastEntry) {
      lastEntry.duration_ms = Date.now() - stateStart;
    }

    ctx.state = transition.nextState;
  }

  const totalDuration = Date.now() - startTime;
  console.log(
    `[Pipeline ${ctx.runId.slice(0, 8)}] ${ctx.state} in ${totalDuration}ms ` +
    `(${ctx.stateHistory.length} states, ${ctx.repairCount} repairs)`
  );

  return ctx;
}
