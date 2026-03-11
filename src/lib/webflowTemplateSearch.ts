/**
 * Search for design templates via Brave Search — tries Webflow first,
 * then broadens to any usable template site. Scrapes the live preview
 * for design tokens using the existing competitor scraper infrastructure.
 *
 * Drop-in replacement for searchFigmaCommunity().
 */

import { templateToContextBrief, type FigmaTemplateData, type FigmaDesignTokens } from "./figmaClient.js";
import { scrapeReferenceUrl, type CompetitorVisual } from "./competitorScraper.js";
import { getUnifiedClient } from "./unifiedClient.js";
import { resolveModel } from "./modelResolver.js";
import { getCachedTemplate } from "./figmaTemplateCache.js";
import { prisma } from "./db.js";
import { braveSearch } from "./braveSearch.js";
import type { AppContextBrief } from "./contextResearch.js";

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; StartBox/1.0)" },
      redirect: "follow",
    });
  } finally {
    clearTimeout(timer);
  }
}

// ─── URL extraction ─────────────────────────────────────────────

interface TemplateCandidate {
  url: string;       // the live preview URL to scrape
  name: string;      // human-readable label
  source: string;    // "webflow" | "general"
}

/**
 * Extract Webflow template preview URLs from Brave search HTML.
 * Webflow templates live at webflow.com/templates/... and their
 * previews are hosted on *.webflow.io subdomains.
 */
function extractWebflowUrls(html: string): TemplateCandidate[] {
  const candidates: TemplateCandidate[] = [];
  const seen = new Set<string>();

  // Match webflow.io preview URLs (the live template sites)
  const ioPattern = /https?:\/\/([a-z0-9-]+)\.webflow\.io[^"'\s<>]*/gi;
  let match;
  while ((match = ioPattern.exec(html)) !== null) {
    const url = match[0].split(/['"<>]/)[0]; // trim trailing junk
    const slug = match[1];
    if (!seen.has(slug)) {
      seen.add(slug);
      candidates.push({ url, name: slug.replace(/-/g, " "), source: "webflow" });
    }
  }

  // Also match webflow.com/templates links — we'll resolve preview URLs later
  const templatePattern = /https?:\/\/(?:www\.)?webflow\.com\/templates\/html\/([a-z0-9-]+)/gi;
  while ((match = templatePattern.exec(html)) !== null) {
    const slug = match[1];
    if (!seen.has(slug)) {
      seen.add(slug);
      // The template listing page itself can be scraped for the preview link
      candidates.push({ url: match[0], name: slug.replace(/-/g, " "), source: "webflow" });
    }
  }

  return candidates.slice(0, 5);
}

/**
 * Extract any usable template/demo site URLs from general search results.
 * Looks for live demo sites from popular template marketplaces.
 */
function extractGeneralTemplateUrls(html: string): TemplateCandidate[] {
  const candidates: TemplateCandidate[] = [];
  const seen = new Set<string>();

  // Match common template preview domains
  const patterns = [
    // Vercel/Next.js templates
    /https?:\/\/([a-z0-9-]+)\.vercel\.app[^"'\s<>]*/gi,
    // Netlify templates
    /https?:\/\/([a-z0-9-]+)\.netlify\.app[^"'\s<>]*/gi,
    // Generic demo/preview links from search results
    /https?:\/\/(?:demo|preview|template)[^"'\s<>]*\.(com|io|app|dev)[^"'\s<>]*/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const url = match[0].split(/['"<>]/)[0];
      if (!seen.has(url)) {
        seen.add(url);
        const name = new URL(url).hostname.replace(/^www\./, "").split(".")[0];
        candidates.push({ url, name, source: "general" });
      }
    }
  }

  return candidates.slice(0, 5);
}

// ─── Brave search queries ───────────────────────────────────────

function buildSearchQueries(appType: string, discoveredCategory?: string | null): string[][] {
  const category = discoveredCategory ?? extractCategoryFromPrompt(appType);

  // Each inner array: [query, source_hint]
  // Try Webflow first, then broaden
  return [
    [`site:webflow.io ${category} app template`, "webflow"],
    [`webflow template ${category} app`, "webflow"],
    [`${category} app template demo site`, "general"],
    [`${category} UI template live preview`, "general"],
  ];
}

function extractCategoryFromPrompt(prompt: string): string {
  const lower = prompt.toLowerCase();
  const stopWords = new Set([
    "make", "me", "a", "an", "the", "build", "create", "generate",
    "app", "application", "web", "website", "please", "i", "want",
    "need", "like", "with", "and", "for", "that", "this", "my",
  ]);
  const words = lower.replace(/[^a-z0-9\s]/g, "").split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));
  return words.slice(0, 3).join(" ") || "mobile app";
}

// ─── Search execution ───────────────────────────────────────────

async function searchBraveCentral(query: string): Promise<string> {
  console.log(`[Webflow Search] Brave query: "${query}"`);
  return braveSearch(query);
}

// ─── Convert CompetitorVisual → FigmaTemplateData ───────────────

function visualToDesignTokens(visual: CompetitorVisual): FigmaDesignTokens {
  const sa = visual.screenshot_analysis;
  const colors = visual.colors.length > 0 ? visual.colors : (sa?.color_palette ?? []);

  return {
    colors: {
      primary: colors[0] ?? "#6366f1",
      secondary: colors[1] ?? "#8b5cf6",
      accent: colors[2] ?? "#f59e0b",
      background: "#ffffff",
      surface: colors[3] ?? "#f8fafc",
      text: "#0f172a",
      muted: "#64748b",
      all: colors.slice(0, 20),
    },
    typography: {
      fonts: sa?.typography_hierarchy ? [sa.typography_hierarchy.split(/[,\s]/)[0]] : [],
      heading_sizes: [48, 36, 24, 20],
      body_size: 16,
      weights: [400, 500, 600, 700],
    },
    spacing: {
      base: 8,
      values: [4, 8, 12, 16, 24, 32, 48, 64],
    },
    borders: {
      radii: [4, 8, 12, 16],
      default_radius: 8,
    },
    shadows: [],
    layout: {
      type: sa?.layout_type ?? (visual.layout_signals.find(s => s.includes("sidebar")) ? "sidebar" : "top-nav"),
      columns: 3,
      frame_names: sa?.section_patterns ?? [],
      component_names: sa?.component_patterns ?? visual.layout_signals,
    },
  };
}

function visualToTemplateData(visual: CompetitorVisual, slug: string): FigmaTemplateData {
  return {
    file_key: `webflow_${slug}`,
    file_name: visual.name,
    last_modified: new Date().toISOString(),
    thumbnail_url: visual.og_image,
    design_tokens: visualToDesignTokens(visual),
    page_names: visual.screenshot_analysis?.section_patterns ?? [],
    component_count: visual.screenshot_analysis?.component_patterns.length ?? 0,
    raw_metadata: { source: "webflow_search", url: visual.url },
  };
}

// ─── Extract real HTML structure from template pages ─────────────

/**
 * Fetch a template page and extract its semantic HTML structure.
 * Strips scripts/styles/SVGs but keeps nav, header, sections, footer
 * with their CSS classes — gives the LLM real layout patterns to follow.
 */
async function extractTemplateStructure(url: string): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(url, 8000);
    if (!res.ok) return null;
    const html = (await res.text()).slice(0, 200_000);

    // Strip noise but keep semantic structure with classes
    const cleaned = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<svg[\s\S]*?<\/svg>/gi, '<svg/>')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\s+/g, ' ');

    // Extract section-level blocks
    const sections: string[] = [];
    const sectionPattern = /<(nav|header|main|section|footer|article)[^>]*>[\s\S]*?<\/\1>/gi;
    let match;
    while ((match = sectionPattern.exec(cleaned)) !== null) {
      // Cap each section to keep it manageable
      const section = match[0].slice(0, 2000);
      if (section.length > 50) { // Skip empty sections
        sections.push(section);
      }
    }

    if (sections.length === 0) {
      // Fallback: try to extract the body content
      const bodyMatch = cleaned.match(/<body[^>]*>([\s\S]*)<\/body>/i);
      if (bodyMatch) {
        // Get first 6000 chars of body as a rough structure
        const body = bodyMatch[1].slice(0, 6000);
        if (body.length > 100) return body;
      }
      return null;
    }

    const result = sections.join('\n\n').slice(0, 8000);
    console.log(`[Template HTML] Extracted ${sections.length} sections from ${url} (${result.length} chars)`);
    return result;
  } catch (e) {
    console.warn(`[Template HTML] Extraction failed for ${url}:`, e instanceof Error ? e.message : e);
    return null;
  }
}

// ─── In-memory search cache ─────────────────────────────────────

const searchCache = new Map<string, { result: ReturnType<typeof searchWebflowTemplates> extends Promise<infer T> ? T : never; timestamp: number }>();
const SEARCH_CACHE_TTL = 3_600_000; // 1 hour

// ─── Main entry point ───────────────────────────────────────────

/**
 * Search for design templates — Webflow first, then general.
 * Scrapes the live preview site for design tokens.
 * Drop-in replacement for searchFigmaCommunity().
 */
export async function searchWebflowTemplates(
  appType: string,
  discoveredCategory?: string | null,
): Promise<{ template: FigmaTemplateData; contextOverlay: Partial<AppContextBrief>; htmlStructure?: string } | null> {
  // Check in-memory cache
  const cacheKey = `${appType}:${discoveredCategory ?? ""}`;
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < SEARCH_CACHE_TTL) {
    console.log(`[Webflow Search] Using cached result for "${cacheKey}"`);
    return cached.result;
  }

  const queries = buildSearchQueries(appType, discoveredCategory);
  const allCandidates: TemplateCandidate[] = [];

  // Search phase: collect candidate URLs
  for (const [query] of queries) {
    const html = await searchBraveCentral(query);
    if (!html) continue;

    // Try Webflow-specific extraction first
    const webflowCandidates = extractWebflowUrls(html);
    if (webflowCandidates.length > 0) {
      allCandidates.push(...webflowCandidates);
      console.log(`[Webflow Search] Found ${webflowCandidates.length} Webflow candidates`);
    }

    // Also try general template URLs
    const generalCandidates = extractGeneralTemplateUrls(html);
    if (generalCandidates.length > 0) {
      allCandidates.push(...generalCandidates);
      console.log(`[Webflow Search] Found ${generalCandidates.length} general candidates`);
    }

    if (allCandidates.length >= 3) break; // enough candidates
  }

  if (allCandidates.length === 0) {
    console.log("[Webflow Search] No template candidates found");
    searchCache.set(cacheKey, { result: null, timestamp: Date.now() });
    return null;
  }

  // Deduplicate by hostname
  const seenHosts = new Set<string>();
  const uniqueCandidates = allCandidates.filter(c => {
    try {
      const host = new URL(c.url).hostname;
      if (seenHosts.has(host)) return false;
      seenHosts.add(host);
      return true;
    } catch {
      return false;
    }
  });

  console.log(`[Webflow Search] ${uniqueCandidates.length} unique candidates to try`);

  // Scrape phase: try each candidate until one works
  const client = getUnifiedClient();
  const modelId = resolveModel("fast");

  for (const candidate of uniqueCandidates.slice(0, 3)) {
    // Check DB cache
    const slug = candidate.name.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 50);
    const dbCached = await getCachedTemplate(`webflow_${slug}`).catch(() => null);
    if (dbCached) {
      console.log(`[Webflow Search] Using DB-cached template "${dbCached.file_name}"`);
      const templateData: FigmaTemplateData = {
        file_key: dbCached.file_key,
        file_name: dbCached.file_name,
        last_modified: dbCached.updated_at.toISOString(),
        thumbnail_url: dbCached.thumbnail_url,
        design_tokens: dbCached.design_tokens as FigmaDesignTokens,
        page_names: dbCached.page_names as string[],
        component_count: dbCached.component_count,
        raw_metadata: {},
      };
      const result = { template: templateData, contextOverlay: templateToContextBrief(templateData) };
      searchCache.set(cacheKey, { result, timestamp: Date.now() });
      return result;
    }

    try {
      console.log(`[Webflow Search] Scraping "${candidate.name}" at ${candidate.url}...`);

      // For webflow.com/templates listing pages, try to resolve the preview URL
      let scrapeUrl = candidate.url;
      if (candidate.url.includes("webflow.com/templates/")) {
        const previewUrl = await resolveWebflowPreview(candidate.url);
        if (previewUrl) {
          scrapeUrl = previewUrl;
          console.log(`[Webflow Search] Resolved preview URL: ${previewUrl}`);
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const visual = await scrapeReferenceUrl(scrapeUrl, candidate.name, client as any, modelId);

      if (!visual || (!visual.screenshot_analysis && visual.colors.length === 0)) {
        console.warn(`[Webflow Search] Scrape of "${candidate.name}" yielded no data, trying next`);
        continue;
      }

      const template = visualToTemplateData(visual, slug);
      const contextOverlay = templateToContextBrief(template);

      // Cache to DB (non-fatal)
      try {
        await prisma.figmaTemplate.upsert({
          where: { file_key: template.file_key },
          create: {
            file_key: template.file_key,
            file_name: template.file_name,
            thumbnail_url: template.thumbnail_url,
            design_tokens: template.design_tokens as any,
            page_names: template.page_names,
            component_count: template.component_count,
            raw_metadata: template.raw_metadata as any,
          },
          update: {
            file_name: template.file_name,
            thumbnail_url: template.thumbnail_url,
            design_tokens: template.design_tokens as any,
            page_names: template.page_names,
            component_count: template.component_count,
            raw_metadata: template.raw_metadata as any,
          },
        });
      } catch (e) {
        console.warn("[Webflow Search] DB cache failed (non-fatal):", e);
      }

      // Extract real HTML structure from the template page
      const htmlStructure = await extractTemplateStructure(scrapeUrl).catch(() => null);

      const hasVision = !!visual.screenshot_analysis;
      const colorCount = visual.colors.length;
      console.log(
        `[Webflow Search] Got template "${candidate.name}" (${candidate.source}) — ` +
        `vision: ${hasVision}, colors: ${colorCount}, components: ${template.component_count}, ` +
        `htmlStructure: ${htmlStructure ? `${htmlStructure.length} chars` : 'none'}`
      );

      const result = { template, contextOverlay, ...(htmlStructure ? { htmlStructure } : {}) };
      searchCache.set(cacheKey, { result, timestamp: Date.now() });
      return result;
    } catch (e) {
      console.warn(`[Webflow Search] "${candidate.name}" failed (trying next):`, e instanceof Error ? e.message : e);
      continue;
    }
  }

  console.log("[Webflow Search] All candidates failed");
  searchCache.set(cacheKey, { result: null, timestamp: Date.now() });
  return null;
}

// ─── Webflow preview URL resolution ─────────────────────────────

/**
 * Fetch a Webflow template listing page and extract the live preview URL.
 * The preview is usually a .webflow.io subdomain linked from the page.
 */
async function resolveWebflowPreview(listingUrl: string): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(listingUrl, 8000);
    if (!res.ok) return null;
    const html = (await res.text()).slice(0, 80000);

    // Look for webflow.io preview link
    const previewMatch = html.match(/https?:\/\/[a-z0-9-]+\.webflow\.io[^"'\s<>]*/i);
    if (previewMatch) return previewMatch[0].split(/['"<>]/)[0];

    // Look for any "preview" or "demo" link
    const demoMatch = html.match(/href="(https?:\/\/[^"]+)"[^>]*>(?:[^<]*(?:preview|demo|live)[^<]*)<\/a>/i);
    if (demoMatch) return demoMatch[1];

    return null;
  } catch {
    return null;
  }
}
