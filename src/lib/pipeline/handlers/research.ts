import type { PipelineContext, StateTransition } from "../types.js";
import { gatherAppContext } from "../../contextResearch.js";
import { resolveModel } from "../../modelResolver.js";
import { getUnifiedClient } from "../../unifiedClient.js";
import { extractReferences } from "../../referenceExtractor.js";
import { searchForProduct, fetchSiteSummary, extractAppCategory, isParkedDomain } from "../../webSearch.js";
import type { CompetitorVisual } from "../../competitorScraper.js";

/**
 * RESEARCHING state: gather competitive context and competitor visuals.
 * This is fail-safe — errors don't block the pipeline.
 *
 * If the user says "like [website]" or includes a URL, we:
 *  1. Web search to discover what the product actually is (for name-only refs)
 *  2. Scrape the real website for visual/layout data
 *  3. Feed all discovered context into the LLM pipeline
 */
export async function handleResearch(ctx: PipelineContext): Promise<StateTransition> {
  ctx.onProgress?.({ type: "status", message: "Researching competitive landscape..." });

  // Step 0: Detect referenced websites from the prompt
  const references = extractReferences(ctx.prompt);
  let referenceVisual: CompetitorVisual | null = null;
  let webSearchContext = ""; // Extra context from web search to feed into the LLM

  if (references.length > 0) {
    const ref = references[0]; // Primary reference
    try {
      // Step 0a: If it's a product name (not an explicit URL), web search first
      // to discover what it really is and find the correct URL.
      // This solves: user says "like Ditto AI" → we need to find out it's a dating app
      if (!ref.isExplicitUrl) {
        ctx.onProgress?.({ type: "status", message: `Searching for ${ref.raw}...` });
        console.log(`Web searching for product: "${ref.raw}"`);

        const searchResult = await searchForProduct(ref.raw);

        if (searchResult.url) {
          console.log(`Web search found URL for "${ref.raw}": ${searchResult.url}`);
          // Override the guessed URL with the real one from web search
          ref.url = searchResult.url;
        }

        if (searchResult.description) {
          console.log(`Web search description for "${ref.raw}": ${searchResult.description.slice(0, 150)}...`);
          webSearchContext += `\n\n--- WEB SEARCH RESULTS FOR "${ref.raw}" ---\n`;
          webSearchContext += `Product URL: ${searchResult.url ?? "unknown"}\n`;
          webSearchContext += `Description: ${searchResult.description}\n`;

          // Include top search result titles for additional context
          if (searchResult.results.length > 0) {
            webSearchContext += `Top results:\n`;
            for (const r of searchResult.results.slice(0, 5)) {
              webSearchContext += `  - ${r.title} (${r.url})\n`;
              if (r.snippet) webSearchContext += `    ${r.snippet.slice(0, 200)}\n`;
            }
          }
        }

        // Also fetch the homepage meta for a richer summary
        if (ref.url) {
          try {
            const siteSummary = await fetchSiteSummary(ref.url);
            if (siteSummary) {
              if (isParkedDomain(siteSummary)) {
                console.warn(`[Research] Parked/for-sale domain detected at ${ref.url} — rejecting as reference`);
                ref.url = ""; // null out so we don't scrape a parking page
                webSearchContext = ""; // discard poisoned context
              } else {
                console.log(`Site summary for ${ref.url}: ${siteSummary.slice(0, 100)}...`);
                webSearchContext += `Site summary: ${siteSummary}\n`;
              }
            }
          } catch {
            // non-fatal
          }
        }
      }

      // Store web search context on pipeline context for downstream handlers (reasoner)
      if (webSearchContext) {
        ctx.webSearchContext = webSearchContext;
      }

      // Step 0b: Scrape the reference URL (skip if parked domain was detected)
      if (!ref.url) {
        console.log(`[Research] No valid URL for "${ref.raw}" — skipping scrape`);
      }

      const { scrapeReferenceUrl } = await import("../../competitorScraper.js");
      const apiKey = process.env.KIMI_API_KEY;
      if (apiKey && ref.url) {
        ctx.onProgress?.({ type: "status", message: `Analyzing ${ref.raw}...` });
        console.log(`Reference detected: "${ref.raw}" → ${ref.url}`);
        const visionClient = getUnifiedClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        referenceVisual = await scrapeReferenceUrl(
          ref.url,
          ref.raw,
          visionClient as any,
          resolveModel("fast"),
        );
        if (referenceVisual) {
          const hasVision = !!referenceVisual.screenshot_analysis;
          const hasHtml = referenceVisual.colors.length > 0 || referenceVisual.layout_signals.length > 0;
          console.log(
            `Reference scrape complete for "${ref.raw}" — ` +
            `vision: ${hasVision}, html metadata: ${hasHtml}, ` +
            `colors: [${referenceVisual.colors.join(", ")}]`
          );
        }
      }
    } catch (e) {
      console.warn(`Reference scrape failed for "${ref.raw}" (non-fatal):`, e);
    }
  }

  // Step 1: Gather competitive research context
  // Augment the prompt with web search data + reference visual data
  try {
    let researchPrompt = ctx.prompt;

    // Inject web search context so the LLM knows what the referenced product actually is
    if (webSearchContext) {
      researchPrompt += webSearchContext;
    }

    if (referenceVisual) {
      const refData: string[] = [];
      if (referenceVisual.meta_description) {
        refData.push(`Site description: "${referenceVisual.meta_description}"`);
      }
      if (referenceVisual.colors.length > 0) {
        refData.push(`Brand colors found: ${referenceVisual.colors.join(", ")}`);
      }
      if (referenceVisual.layout_signals.length > 0) {
        refData.push(`Layout patterns detected: ${referenceVisual.layout_signals.join(", ")}`);
      }
      if (referenceVisual.screenshot_analysis) {
        const sa = referenceVisual.screenshot_analysis;
        refData.push(`Visual analysis of ${referenceVisual.name}:`);
        refData.push(`  Layout: ${sa.layout_type}`);
        refData.push(`  Colors: ${sa.color_palette.join(", ")}`);
        refData.push(`  Nav style: ${sa.navigation_style}`);
        refData.push(`  Key UI elements: ${sa.key_ui_to_replicate.join("; ")}`);
        if (sa.hero_section_spec) refData.push(`  Hero: ${sa.hero_section_spec}`);
        if (sa.card_design_spec) refData.push(`  Cards: ${sa.card_design_spec}`);
        if (sa.typography_hierarchy) refData.push(`  Typography: ${sa.typography_hierarchy}`);
      }
      if (refData.length > 0) {
        researchPrompt += `\n\n--- LIVE WEBSITE ANALYSIS OF "${referenceVisual.name}" (${referenceVisual.url}) ---\n${refData.join("\n")}`;
      }
    }

    ctx.contextBrief = await gatherAppContext(researchPrompt);
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
  // Start with the reference visual (priority), then add other competitors
  const allVisuals: CompetitorVisual[] = [];
  if (referenceVisual) {
    allVisuals.push(referenceVisual);
  }

  if (ctx.contextBrief?.competitive_landscape?.length) {
    try {
      ctx.onProgress?.({ type: "status", message: "Analyzing competitor interfaces..." });
      const { scrapeCompetitorVisuals } = await import("../../competitorScraper.js");
      const apiKey = process.env.KIMI_API_KEY;
      if (apiKey) {
        const visionClient = getUnifiedClient();
        // Skip competitors we already scraped via reference
        const refUrl = referenceVisual?.url?.toLowerCase();
        const remainingCompetitors = ctx.contextBrief.competitive_landscape
          .filter(c => {
            const cUrl = c.name.toLowerCase().replace(/[^a-z0-9]/g, "") + ".com";
            return !refUrl || !refUrl.includes(cUrl);
          })
          .slice(0, referenceVisual ? 2 : 3) // Fewer generic competitors if we have a reference
          .map(c => ({ name: c.name }));

        if (remainingCompetitors.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const visuals = await scrapeCompetitorVisuals(
            remainingCompetitors,
            visionClient as any,
            resolveModel("fast"),
          );
          allVisuals.push(...visuals);
        }
      }
    } catch (e) {
      console.warn("Visual agent failed (non-fatal):", e);
    }
  }

  if (allVisuals.length > 0) {
    ctx.competitorVisuals = allVisuals;
    if (ctx.contextBrief) {
      (ctx.contextBrief as Record<string, unknown>).competitor_visuals = allVisuals;
    }
    const analyzed = allVisuals.filter(v => v.screenshot_analysis).length;
    console.log(`Visual agent complete — ${allVisuals.length} total scraped, ${analyzed} visually analyzed`);
  }

  // Step 3: Logic pipeline — extract app category from web search intelligence
  // This is the key insight: instead of classifying the raw prompt (which has product
  // names like "Ditto AI" that tell us nothing), we classify the web search RESULTS
  // which describe what the product actually does (e.g., "dating app").
  let discoveredCategory: string | null = null;
  if (webSearchContext) {
    discoveredCategory = extractAppCategory(webSearchContext);
    if (discoveredCategory) {
      console.log(`[Research] Web search intelligence → app category: "${discoveredCategory}"`);
    }
  }
  // Also try site summary from reference visual if web search didn't yield a category
  if (!discoveredCategory && referenceVisual?.meta_description) {
    discoveredCategory = extractAppCategory(referenceVisual.meta_description);
    if (discoveredCategory) {
      console.log(`[Research] Reference site meta → app category: "${discoveredCategory}"`);
    }
  }

  // Step 4: Live search — Webflow/general template + 21st.dev components (parallel)
  // Now powered by the discovered category from web search intelligence.
  ctx.onProgress?.({ type: "status", message: "Sourcing design templates..." });

  const { searchWebflowTemplates } = await import("../../webflowTemplateSearch.js");
  const { build21stDevSearchQueries, search21stDevMulti } = await import("../../twentyFirstDevSearch.js");

  const componentQueries = build21stDevSearchQueries(ctx.prompt, discoveredCategory);

  // Run both searches in parallel (both are fail-safe)
  const [figmaResult, components21st] = await Promise.all([
    // Template search: use explicit cached key if provided, otherwise search Webflow/general
    ctx.figmaTemplateKey
      ? (async () => {
          try {
            const { getTemplateAsContext } = await import("../../figmaTemplateCache.js");
            const overlay = await getTemplateAsContext(ctx.figmaTemplateKey!);
            if (overlay) return { contextOverlay: overlay, source: `cached: ${ctx.figmaTemplateKey}` };
          } catch (e) {
            console.warn("[Template] Cached template lookup failed:", e);
          }
          return null;
        })()
      : searchWebflowTemplates(ctx.prompt, discoveredCategory).then(
          (r) => r ? { contextOverlay: r.contextOverlay, source: `webflow: ${r.template.file_name}`, htmlStructure: r.htmlStructure ?? null } : null,
          (e) => { console.warn("[Webflow Search] Error:", e); return null; },
        ),
    // 21st.dev: run multiple queries in parallel and merge
    search21stDevMulti(componentQueries).catch((e) => {
      console.warn("[21st.dev] Search error:", e);
      return [] as import("../../twentyFirstDevSearch.js").UIComponentResult[];
    }),
  ]);

  // Merge Figma template into context (or fall back to built-in library)
  try {
    let templateOverlay: Record<string, unknown> | null = null;
    let templateLabel = "";

    if (figmaResult) {
      templateOverlay = figmaResult.contextOverlay as Record<string, unknown>;
      templateLabel = figmaResult.source;
    }

    if (!templateOverlay) {
      // Fallback: built-in template library
      const { matchTemplate, templateToContextOverlay } = await import("../../figmaTemplateLibrary.js");
      const matched = matchTemplate(ctx.prompt);
      templateOverlay = templateToContextOverlay(matched) as Record<string, unknown>;
      templateLabel = `${matched.name} (built-in fallback)`;
    }

    if (templateOverlay) {
      if (!ctx.contextBrief) {
        const { contextBriefSchema } = await import("../../contextResearch.js");
        const parsed = contextBriefSchema.safeParse(templateOverlay);
        if (parsed.success) {
          ctx.contextBrief = parsed.data;
        } else {
          console.warn("[Template] Zod validation failed, using overlay directly:", parsed.error.issues.map(i => i.message).join(", "));
          // Use the overlay as-is — it has useful design data even if not fully schema-compliant
          ctx.contextBrief = templateOverlay as any;
        }
      } else {
        const overlay = templateOverlay as {
          design_references?: typeof ctx.contextBrief.design_references;
          layout_blueprint?: string;
          ui_component_suggestions?: string[];
          competitor_visuals?: unknown[];
        };
        if (overlay.design_references) {
          ctx.contextBrief.design_references = overlay.design_references;
        }
        if (overlay.layout_blueprint) {
          ctx.contextBrief.layout_blueprint = overlay.layout_blueprint;
        }
        if (overlay.ui_component_suggestions?.length) {
          ctx.contextBrief.ui_component_suggestions = overlay.ui_component_suggestions;
        }
        if (overlay.competitor_visuals?.length) {
          const existing = (ctx.contextBrief as Record<string, unknown>).competitor_visuals as unknown[] ?? [];
          (ctx.contextBrief as Record<string, unknown>).competitor_visuals = [
            ...overlay.competitor_visuals,
            ...existing,
          ];
        }
      }
      console.log(`[Template] Merged "${templateLabel}" into context brief`);
    }
  } catch (e) {
    console.warn("[Template] Merge failed (non-fatal):", e);
  }

  // Store 21st.dev components on context for code gen injection
  if (components21st.length > 0) {
    ctx.twentyFirstDevComponents = components21st;
    console.log(`[21st.dev] ${components21st.length} components ready for code gen: ${components21st.map(c => c.name).join(", ")}`);
  }

  // Store template HTML structure for code gen injection
  const htmlStructure = (figmaResult as { htmlStructure?: string | null })?.htmlStructure;
  if (htmlStructure) {
    ctx.templateHtmlStructure = htmlStructure;
    console.log(`[Template HTML] ${htmlStructure.length} chars of structural HTML ready for code gen`);
  }

  return { nextState: "REASONING" };
}
