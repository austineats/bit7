/**
 * Search 21st.dev for UI components via Brave Search.
 * Scrapes component pages for names, descriptions, and implementation hints.
 * Results enhance the code gen system prompt with real-world component patterns.
 */

import { braveSearch } from "./braveSearch.js";

// ─── Types ──────────────────────────────────────────────────────

export interface UIComponentResult {
  name: string;
  category: string;
  description: string;
  codeHint: string;
  sourceUrl: string;
}

// ─── In-memory cache ────────────────────────────────────────────

const componentCache = new Map<string, { results: UIComponentResult[]; timestamp: number }>();
const CACHE_TTL = 3_600_000; // 1 hour

// ─── Fetch helpers ──────────────────────────────────────────────

const USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15",
];

function randomUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": randomUA(),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });
  } finally {
    clearTimeout(timer);
  }
}

// ─── Brave Search for 21st.dev ──────────────────────────────────

interface SearchHit {
  url: string;
  title: string;
  snippet: string;
}

/**
 * Parse Brave Search HTML results for 21st.dev URLs.
 * Brave structure: <div class="snippet" data-type="web">
 *   <a href="URL" class="... l1"><div class="title ...">TITLE</div></a>
 *   <div class="content ...">DESCRIPTION</div>
 * </div>
 */
function parseBraveResults(html: string): SearchHit[] {
  const results: SearchHit[] = [];

  // Extract web result snippets from Brave's HTML
  const snippetPattern = /<div class="snippet\s+svelte-[^"]*"\s+data-pos="\d+"\s+data-type="web"[^>]*>([\s\S]*?)(?=<div class="snippet\s|<\/main>|$)/gi;
  let snippetMatch;

  while ((snippetMatch = snippetPattern.exec(html)) !== null) {
    const block = snippetMatch[1];

    // Extract URL from the result link
    const urlMatch = block.match(/<a href="(https?:\/\/[^"]+)"[^>]*class="[^"]*l1"/);
    if (!urlMatch) continue;
    const url = urlMatch[1];
    if (!url.includes("21st.dev")) continue;

    // Extract title
    const titleMatch = block.match(/class="title[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    const title = titleMatch
      ? titleMatch[1].replace(/<[^>]+>/g, "").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").trim()
      : "";

    // Extract description
    const descMatch = block.match(/class="content[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    const snippet = descMatch
      ? descMatch[1].replace(/<[^>]+>/g, "").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").trim()
      : "";

    if (url && title) {
      results.push({ url, title, snippet });
    }
    if (results.length >= 6) break;
  }

  // Fallback: extract any 21st.dev URLs from the page
  if (results.length === 0) {
    const urlPattern = /href="(https?:\/\/(?:www\.)?21st\.dev\/[^"]*(?:component|community)[^"]*)"/gi;
    const seen = new Set<string>();
    let match;
    while ((match = urlPattern.exec(html)) !== null) {
      const url = match[1];
      if (!seen.has(url) && !url.includes("opengraph-image")) {
        seen.add(url);
        results.push({ url, title: "", snippet: "" });
        if (results.length >= 5) break;
      }
    }
  }

  return results;
}

// ─── Extract real component code from RSC payload ───────────────

/**
 * Extract CDN source code URL from 21st.dev RSC payload.
 * Every 21st.dev component stores its source at cdn.21st.dev.
 * The RSC data includes "code":"https://cdn.21st.dev/..." pointing to the .tsx file.
 */
function extractCdnCodeUrl(html: string): string | null {
  // Search RSC chunks for the CDN code URL
  const pattern = /self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g;
  let match;
  while ((match = pattern.exec(html)) !== null) {
    const raw = match[1]
      .replace(/\\"/g, '"')
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\\\/g, '\\');

    // Look for "code":"https://cdn.21st.dev/...tsx"
    const cdnMatch = raw.match(/"code":"(https:\/\/cdn\.21st\.dev\/[^"]+\.tsx)"/);
    if (cdnMatch) return cdnMatch[1];
  }
  return null;
}

/**
 * Fetch component source code from 21st.dev CDN.
 * Returns the .tsx source code, or null if fetch fails.
 */
async function fetchCdnCode(cdnUrl: string): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(cdnUrl, 5000);
    if (!res.ok) return null;
    const code = await res.text();
    if (code.length < 50) return null;
    return code.slice(0, 3000); // Cap to avoid prompt bloat
  } catch {
    return null;
  }
}

/**
 * Try to fetch component code from shadcn/ui registry as fallback.
 * Free API, no key needed. Returns null if component doesn't exist.
 */
async function fetchShadcnComponent(name: string): Promise<string | null> {
  // Normalize component name to slug (e.g., "Rich Button" → "button", "Card Hover" → "card")
  const slug = name.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .split(/[\s-]+/)
    .pop() ?? name.toLowerCase(); // Use last word as the base component name

  try {
    const res = await fetchWithTimeout(
      `https://ui.shadcn.com/r/styles/new-york/${slug}.json`, 5000
    );
    if (!res.ok) return null;
    const data = await res.json() as { files?: { content?: string }[] };
    const content = data.files?.[0]?.content;
    if (!content || content.length < 50) return null;
    console.log(`[shadcn] Got source code for "${slug}" (${content.length} chars)`);
    return content.slice(0, 3000);
  } catch {
    return null;
  }
}

// ─── Scrape a 21st.dev component page ──────────────────────────

async function extractComponentInfo(html: string, url: string): Promise<UIComponentResult | null> {
  // Extract title
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const rawTitle = titleMatch?.[1]?.replace(/<[^>]+>/g, "").trim() ?? "";
  // Clean title: 21st.dev format is "Name | Community Components - 21st | 21st"
  // Take everything before the first " | " separator
  const name = rawTitle.split(/\s*\|\s*/)[0]?.trim() ?? rawTitle.trim();
  if (!name || name.length < 3) return null;

  // Extract meta description
  const descMatch =
    html.match(/<meta\s+(?:name|property)="(?:description|og:description)"\s+content="([^"]+)"/i) ??
    html.match(/content="([^"]+)"\s+(?:name|property)="(?:description|og:description)"/i);
  const description = descMatch?.[1]?.slice(0, 300) ?? "";

  // Extract source code CDN URL from RSC payload, then fetch the actual .tsx file
  const cdnUrl = extractCdnCodeUrl(html);
  let extractedCode: string | null = null;
  if (cdnUrl) {
    extractedCode = await fetchCdnCode(cdnUrl);
    if (extractedCode) {
      console.log(`[21st.dev] CDN code for "${name}": ${cdnUrl} (${extractedCode.length} chars)`);
    } else {
      console.log(`[21st.dev] CDN fetch failed for "${name}": ${cdnUrl}`);
    }
  } else {
    console.log(`[21st.dev] No CDN URL found in RSC for "${name}"`);
  }

  // Determine category from URL or title
  const lower = (name + " " + description + " " + url).toLowerCase();
  let category = "component";
  if (lower.includes("hero") || lower.includes("landing")) category = "hero";
  else if (lower.includes("card")) category = "card";
  else if (lower.includes("button") || lower.includes("cta")) category = "interaction";
  else if (lower.includes("nav") || lower.includes("sidebar") || lower.includes("header")) category = "navigation";
  else if (lower.includes("background") || lower.includes("gradient") || lower.includes("pattern")) category = "background";
  else if (lower.includes("text") || lower.includes("typography") || lower.includes("heading")) category = "text";
  else if (lower.includes("form") || lower.includes("input")) category = "form";
  else if (lower.includes("chart") || lower.includes("graph") || lower.includes("stat")) category = "data-display";
  else if (lower.includes("modal") || lower.includes("dialog") || lower.includes("drawer")) category = "overlay";
  else if (lower.includes("tab") || lower.includes("accordion")) category = "layout";

  // Use CDN code if available, otherwise try shadcn fallback
  let codeHint: string;
  if (extractedCode) {
    codeHint = `Source code:\n\`\`\`tsx\n${extractedCode}\n\`\`\``;
  } else {
    // Try shadcn/ui as fallback
    const shadcnCode = await fetchShadcnComponent(name).catch(() => null);
    if (shadcnCode) {
      console.log(`[shadcn] Fallback code for "${name}" (${shadcnCode.length} chars)`);
      codeHint = `Source code (shadcn/ui):\n\`\`\`tsx\n${shadcnCode}\n\`\`\``;
    } else {
      codeHint = `${name} component. Implement with React + Tailwind CSS.`;
    }
  }

  return {
    name,
    category,
    description: description || `${name} UI component from 21st.dev`,
    codeHint,
    sourceUrl: url,
  };
}

// ─── Extract component links from listing pages ────────────────

/**
 * When we land on a 21st.dev category/listing page, extract links
 * to individual component pages (e.g., /community/components/author/name).
 */
function extractComponentLinksFromListing(html: string): string[] {
  const links: string[] = [];
  const seen = new Set<string>();
  // Match links to individual component pages
  const pattern = /href="(\/community\/components\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+)"/gi;
  let match;
  while ((match = pattern.exec(html)) !== null) {
    const path = match[1];
    if (!seen.has(path)) {
      seen.add(path);
      links.push(`https://21st.dev${path}`);
    }
    if (links.length >= 3) break;
  }
  // Also check RSC payload for component links
  if (links.length === 0) {
    const rscPattern = /\/community\/components\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+/g;
    while ((match = rscPattern.exec(html)) !== null) {
      const path = match[0];
      if (!seen.has(path)) {
        seen.add(path);
        links.push(`https://21st.dev${path}`);
      }
      if (links.length >= 3) break;
    }
  }
  return links;
}

// ─── Main: search + scrape ──────────────────────────────────────

// Junk patterns: generic 21st.dev navigation/category pages, not actual components
const JUNK_NAME_PATTERNS = [
  /^discover\b/i, /community\s*components/i, /community-made/i,
  /^browse\b/i, /^all\s*components/i, /^21st\.dev$/i,
  /^sign\s*in/i, /^log\s*in/i, /^pricing$/i, /^home$/i,
  /^about$/i, /^contact$/i, /^docs$/i,
  /\bcomponents$/i, // Category page titles like "Hero Components", "Text Components"
];

function isJunkResult(name: string): boolean {
  return (
    name.length <= 2 ||
    name.length > 60 ||
    JUNK_NAME_PATTERNS.some((p) => p.test(name))
  );
}

/**
 * Run a single 21st.dev search query and return scraped components.
 */
async function searchSingleQuery(query: string): Promise<UIComponentResult[]> {
  // Check cache
  const cached = componentCache.get(query);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`[21st.dev] Cache hit for "${query}": ${cached.results.length} components`);
    return cached.results;
  }

  console.log(`[21st.dev] Searching Brave for: "${query}"`);

  try {
    const html = await braveSearch(`site:21st.dev/community/components/ ${query}`);
    if (!html) {
      componentCache.set(query, { results: [], timestamp: Date.now() });
      return [];
    }
    const hits = parseBraveResults(html);

    if (hits.length === 0) {
      console.log(`[21st.dev] No results for "${query}"`);
      componentCache.set(query, { results: [], timestamp: Date.now() });
      return [];
    }

    // Separate individual component pages from listing/search pages
    const individualHits: SearchHit[] = [];
    const listingHits: SearchHit[] = [];

    for (const hit of hits) {
      const url = hit.url;
      if (url.includes('/components/s/') || url.match(/\/s\/[^/]+$/) || url.includes('/docs/')) {
        listingHits.push(hit);
      } else {
        individualHits.push(hit);
      }
    }

    // If we only got listing pages, fetch them and follow links to individual components
    if (individualHits.length === 0 && listingHits.length > 0) {
      console.log(`[21st.dev] Only got ${listingHits.length} listing pages — following links to individual components...`);
      for (const listing of listingHits.slice(0, 2)) {
        try {
          const listRes = await fetchWithTimeout(listing.url, 6000);
          if (!listRes.ok) continue;
          const listHtml = (await listRes.text()).slice(0, 200_000);
          const componentLinks = extractComponentLinksFromListing(listHtml);
          console.log(`[21st.dev] Found ${componentLinks.length} component links from listing: ${listing.url}`);
          for (const link of componentLinks) {
            individualHits.push({ url: link, title: "", snippet: "" });
          }
          if (individualHits.length >= 4) break;
        } catch {
          continue;
        }
      }
    }

    if (individualHits.length === 0) {
      console.log(`[21st.dev] No individual component pages found for "${query}"`);
      componentCache.set(query, { results: [], timestamp: Date.now() });
      return [];
    }

    console.log(`[21st.dev] Found ${hits.length} results for "${query}" (${individualHits.length} individual components), scraping top 4...`);

    // Scrape top 4 pages in parallel
    const scrapePromises = individualHits.slice(0, 4).map(async (hit) => {
      try {
        const pageRes = await fetchWithTimeout(hit.url, 8000);
        if (!pageRes.ok) return null;
        // CDN code URL is in RSC data near end of page (~190K+), so read full page
        const pageHtml = await pageRes.text();
        return extractComponentInfo(pageHtml, hit.url);
      } catch {
        // Use search result data as fallback
        const name = hit.title.replace(/\s*[-|]\s*21st(?:\.dev)?.*/i, "").trim();
        if (isJunkResult(name)) return null;
        return {
          name,
          category: "component",
          description: hit.snippet || hit.title,
          codeHint: `${hit.title}. Implement with React + Tailwind CSS. No external dependencies.`,
          sourceUrl: hit.url,
        } satisfies UIComponentResult;
      }
    });

    const results = (await Promise.all(scrapePromises)).filter(
      (r): r is UIComponentResult => r !== null && !isJunkResult(r.name),
    );

    console.log(`[21st.dev] Scraped ${results.length} components for "${query}": ${results.map((r) => `${r.name}(${r.codeHint.startsWith('Source code') ? 'HAS CODE' : 'no code'})`).join(", ")}`);
    componentCache.set(query, { results, timestamp: Date.now() });
    return results;
  } catch (e) {
    console.warn(`[21st.dev] Search failed for "${query}":`, e instanceof Error ? e.message : e);
    componentCache.set(query, { results: [], timestamp: Date.now() });
    return [];
  }
}

/**
 * Search 21st.dev for UI components matching the prompt.
 * Runs multiple queries in parallel and merges + dedupes results.
 */
export async function search21stDev(query: string): Promise<UIComponentResult[]> {
  return searchSingleQuery(query);
}

/**
 * Run multiple search queries in parallel and merge results.
 * If Brave search yields no components with code, falls back to
 * directly fetching from curated component URL registry.
 */
export async function search21stDevMulti(queries: string[]): Promise<UIComponentResult[]> {
  const allResults = await Promise.all(queries.map((q) => searchSingleQuery(q)));
  const merged: UIComponentResult[] = [];
  const seen = new Set<string>();

  for (const results of allResults) {
    for (const r of results) {
      const key = r.name.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(r);
      }
    }
  }

  console.log(`[21st.dev] Merged ${merged.length} unique components from ${queries.length} queries (${merged.filter(r => r.codeHint.startsWith('Source code')).length} with code)`);
  return merged;
}

// ─── High-impact UI component queries ────────────────────────────
// Just grab the coolest effects and animations — works for any app type.
// Each run picks 2 random queries for variety.

const STANDOUT_QUERIES = [
  "animated gradient",
  "shimmer text",
  "spotlight card",
  "glassmorphism hero",
  "hover card effect",
  "animated button",
  "text reveal animation",
  "bento grid",
  "gradient border",
  "card hover 3d",
  "animated background",
  "glow effect",
];

/**
 * Build search query(s) from the user's prompt.
 * Returns the primary query string. For richer results, use build21stDevSearchQueries().
 */
export function build21stDevSearchQuery(prompt: string, discoveredCategory?: string | null): string {
  return build21stDevSearchQueries(prompt, discoveredCategory)[0];
}

/**
 * Pick 2 random high-impact component queries.
 * No domain classification — just grab cool UI effects.
 */
export function build21stDevSearchQueries(_prompt: string, _discoveredCategory?: string | null): string[] {
  // Shuffle and pick 2
  const shuffled = [...STANDOUT_QUERIES].sort(() => Math.random() - 0.5);
  const queries = shuffled.slice(0, 2);
  console.log(`[21st.dev] Search queries: ${queries.join(", ")}`);
  return queries;
}

/**
 * Format 21st.dev component results into a string for the code gen system prompt.
 */
export function format21stDevComponents(components: UIComponentResult[]): string {
  if (components.length === 0) return "";

  const lines = [
    "=== REAL COMPONENT SOURCE CODE REFERENCES ===",
    "Below are actual source code implementations from 21st.dev and shadcn/ui.",
    "Study these patterns and adapt them for the app. Use the same animation techniques, CSS patterns, and component structure. React + Tailwind CSS only (no external imports).\n",
  ];

  for (const comp of components) {
    lines.push(`### ${comp.name} [${comp.category}]`);
    if (comp.description) lines.push(comp.description);
    lines.push(comp.codeHint);
    lines.push("");
  }

  return lines.join("\n");
}
