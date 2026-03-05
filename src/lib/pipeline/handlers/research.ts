import Anthropic from "@anthropic-ai/sdk";
import type { PipelineContext, StateTransition } from "../types.js";
import { gatherAppContext } from "../../contextResearch.js";
import { resolveModel } from "../../modelResolver.js";

/**
 * RESEARCHING state: gather competitive context and competitor visuals.
 * This is fail-safe — errors don't block the pipeline.
 */
export async function handleResearch(ctx: PipelineContext): Promise<StateTransition> {
  ctx.onProgress?.({ type: "status", message: "Researching competitive landscape..." });

  // Step 1: Gather competitive research context
  try {
    ctx.contextBrief = await gatherAppContext(ctx.prompt);
    if (ctx.contextBrief) {
      console.log(
        `Context research complete — ${ctx.contextBrief.competitive_landscape.length} competitors, ` +
        `${ctx.contextBrief.must_have_features.length} must-have features`
      );
    }
  } catch (e) {
    console.warn("Context research failed (non-fatal):", e);
  }

  // Step 2: Visual agent — screenshot + analyze competitor UIs
  if (ctx.contextBrief?.competitive_landscape?.length) {
    try {
      ctx.onProgress?.({ type: "status", message: "Analyzing competitor interfaces..." });
      const { scrapeCompetitorVisuals } = await import("../../competitorScraper.js");
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (apiKey) {
        const visionClient = new Anthropic({
          apiKey,
          maxRetries: 3,
          ...(process.env.ANTHROPIC_BASE_URL ? { baseURL: process.env.ANTHROPIC_BASE_URL } : {}),
        });
        const visuals = await scrapeCompetitorVisuals(
          ctx.contextBrief.competitive_landscape.slice(0, 3).map(c => ({ name: c.name })),
          visionClient,
          resolveModel("fast"),
        );
        if (visuals.length > 0) {
          ctx.competitorVisuals = visuals;
          (ctx.contextBrief as Record<string, unknown>).competitor_visuals = visuals;
          const analyzed = visuals.filter((v: { screenshot_analysis?: unknown }) => v.screenshot_analysis).length;
          console.log(`Visual agent complete — ${visuals.length} scraped, ${analyzed} visually analyzed`);
        }
      }
    } catch (e) {
      console.warn("Visual agent failed (non-fatal):", e);
    }
  }

  return { nextState: "REASONING" };
}
