/**
 * Search Figma Community for free templates via Brave Search.
 * Fetches the best match via Figma API and extracts design tokens.
 * Results are cached in the figma_templates DB table.
 */

import { fetchFigmaTemplate, parseFigmaUrl, templateToContextBrief, type FigmaTemplateData } from "./figmaClient.js";
import { importFigmaTemplate, getCachedTemplate } from "./figmaTemplateCache.js";
import type { AppContextBrief } from "./contextResearch.js";

// ─── In-memory search result cache ──────────────────────────────

const searchCache = new Map<string, { fileKey: string | null; timestamp: number }>();
const SEARCH_CACHE_TTL = 3_600_000; // 1 hour

// ─── Brave Search ───────────────────────────────────────────────

// Rotate user agents to avoid fingerprinting
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

/**
 * Extract Figma community file URLs from Brave Search HTML results.
 * Brave uses: <a href="https://www.figma.com/community/file/ID/..." class="svelte-... l1">
 */
function extractFigmaUrls(html: string): string[] {
  const urls: string[] = [];
  const pattern = /https?:\/\/(?:www\.)?figma\.com\/community\/file\/(\d+)[^"'\s<>]*/gi;
  let match;
  while ((match = pattern.exec(html)) !== null) {
    urls.push(match[0]);
  }
  // Deduplicate by file key
  const seen = new Set<string>();
  return urls.filter((url) => {
    const key = parseFigmaUrl(url);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Search for Figma templates using Brave Search.
 * Returns multiple file keys (up to 5) so we can retry if the first one is 404.
 */
async function searchForFigma(query: string): Promise<string[]> {
  const searchQuery = encodeURIComponent(`site:figma.com/community/file ${query} app template`);
  const searchUrl = `https://search.brave.com/search?q=${searchQuery}&source=web`;

  console.log(`[Figma Search] Searching Brave for: ${query}`);

  try {
    const res = await fetchWithTimeout(searchUrl, 10000);
    if (!res.ok) {
      console.warn(`[Figma Search] Brave returned ${res.status}`);
      return [];
    }

    const html = await res.text();
    const figmaUrls = extractFigmaUrls(html);

    if (figmaUrls.length === 0) {
      console.log(`[Figma Search] No Figma community files found for "${query}"`);
      return [];
    }

    const fileKeys = figmaUrls
      .slice(0, 5)
      .map((url) => parseFigmaUrl(url))
      .filter((k): k is string => k !== null);

    console.log(`[Figma Search] Found ${figmaUrls.length} results for "${query}", top ${fileKeys.length} keys: ${fileKeys.join(", ")}`);
    return fileKeys;
  } catch (e) {
    console.warn(`[Figma Search] Failed:`, e instanceof Error ? e.message : e);
    return [];
  }
}

// ─── Main: search + fetch + extract ─────────────────────────────

/**
 * Search Figma Community for the best template matching the user's app type.
 * Tries multiple search queries (broad → narrow) until one finds a result.
 * Fetches design tokens and caches the result.
 * Returns null if no template found or Figma API key not set.
 */
export async function searchFigmaCommunity(
  appType: string,
  discoveredCategory?: string | null,
): Promise<{ template: FigmaTemplateData; contextOverlay: Partial<AppContextBrief> } | null> {
  // Require API key
  if (!process.env.FIGMA_API_KEY) {
    console.log("[Figma Search] FIGMA_API_KEY not set, skipping community search");
    return null;
  }

  // Collect candidate file keys from multiple search queries
  const queries = buildFigmaSearchQueries(appType, discoveredCategory);
  const allFileKeys: string[] = [];
  for (const query of queries) {
    const keys = await searchForFigma(query);
    for (const k of keys) {
      if (!allFileKeys.includes(k)) allFileKeys.push(k);
    }
    if (allFileKeys.length >= 5) break; // enough candidates
  }

  if (allFileKeys.length === 0) return null;

  // Try each file key until one works (handles 404s from private/removed files)
  for (const fileKey of allFileKeys.slice(0, 5)) {
    // Check DB cache first
    const cached = await getCachedTemplate(fileKey);
    if (cached) {
      console.log(`[Figma Search] Using cached template "${cached.file_name}" for "${appType}"`);
      const templateData: FigmaTemplateData = {
        file_key: cached.file_key,
        file_name: cached.file_name,
        last_modified: cached.updated_at.toISOString(),
        thumbnail_url: cached.thumbnail_url,
        design_tokens: cached.design_tokens,
        page_names: cached.page_names,
        component_count: cached.component_count,
        raw_metadata: {},
      };
      return {
        template: templateData,
        contextOverlay: templateToContextBrief(templateData),
      };
    }

    // Fetch from Figma API
    try {
      console.log(`[Figma Search] Fetching template ${fileKey} from Figma API...`);
      const template = await fetchFigmaTemplate(fileKey);

      // Cache in DB for future use
      try {
        await importFigmaTemplate(fileKey);
      } catch (e) {
        console.warn("[Figma Search] DB cache failed (non-fatal):", e);
      }

      console.log(`[Figma Search] Got template "${template.file_name}" — ${template.component_count} components, ${template.design_tokens.colors.all.length} colors`);

      return {
        template,
        contextOverlay: templateToContextBrief(template),
      };
    } catch (e) {
      console.warn(`[Figma Search] Template ${fileKey} failed (trying next):`, e instanceof Error ? e.message : e);
      continue; // Try next file key
    }
  }

  console.log("[Figma Search] All candidate templates failed");
  return null;
}

// ─── Prompt Classification Pipeline ─────────────────────────────
// Instead of keyword-matching the raw prompt, we classify WHAT the user
// actually wants, then generate broad → narrow Figma search queries.

interface AppCategory {
  category: string;       // e.g. "dating", "scheduling", "social"
  figmaQueries: string[]; // broad → narrow search terms to try
}

// Comprehensive category map — each entry has BROAD and NARROW queries
// so we always find a Figma template even for niche prompts
const APP_CATEGORIES: AppCategory[] = [
  { category: "dating", figmaQueries: ["dating app mobile", "dating app", "social app mobile UI"] },
  { category: "social", figmaQueries: ["social media app", "social network mobile", "feed app mobile UI"] },
  { category: "chat", figmaQueries: ["messaging app mobile", "chat app", "messenger mobile UI"] },
  { category: "ecommerce", figmaQueries: ["ecommerce app mobile", "shopping app", "online store mobile UI"] },
  { category: "fitness", figmaQueries: ["fitness app mobile", "health tracker app", "workout app mobile UI"] },
  { category: "food", figmaQueries: ["food delivery app", "restaurant app mobile", "recipe app mobile UI"] },
  { category: "finance", figmaQueries: ["banking app mobile", "finance app", "fintech mobile UI"] },
  { category: "productivity", figmaQueries: ["productivity app", "task manager mobile", "project management app UI"] },
  { category: "education", figmaQueries: ["education app mobile", "e-learning app", "course app mobile UI"] },
  { category: "travel", figmaQueries: ["travel app mobile", "booking app", "hotel booking mobile UI"] },
  { category: "music", figmaQueries: ["music app mobile", "music player app", "streaming app mobile UI"] },
  { category: "dashboard", figmaQueries: ["dashboard UI", "admin dashboard", "analytics dashboard web UI"] },
  { category: "realestate", figmaQueries: ["real estate app mobile", "property listing app", "real estate mobile UI"] },
  { category: "crm", figmaQueries: ["CRM dashboard", "sales dashboard", "CRM app UI"] },
  { category: "portfolio", figmaQueries: ["portfolio website", "landing page", "personal website UI"] },
  { category: "weather", figmaQueries: ["weather app mobile", "weather app", "forecast app mobile UI"] },
  { category: "news", figmaQueries: ["news app mobile", "magazine app", "news reader mobile UI"] },
  { category: "scheduling", figmaQueries: ["calendar app mobile", "scheduling app", "booking calendar app UI"] },
  { category: "medical", figmaQueries: ["healthcare app mobile", "medical app", "telemedicine app mobile UI"] },
  { category: "gaming", figmaQueries: ["gaming app mobile", "game UI", "esports app mobile UI"] },
];

// Keywords that signal each category — includes product names, synonyms, and domain terms
const CATEGORY_SIGNALS: Record<string, string[]> = {
  dating: ["dating", "match", "swipe", "tinder", "bumble", "hinge", "ditto", "love", "romance", "singles", "couples"],
  social: ["social", "feed", "post", "follow", "timeline", "community", "network", "share", "friends", "stories", "instagram", "twitter", "tiktok"],
  chat: ["chat", "message", "messaging", "dm", "conversation", "whatsapp", "telegram", "slack", "discord", "communicate"],
  ecommerce: ["shop", "store", "ecommerce", "product", "cart", "buy", "sell", "marketplace", "amazon", "shopify", "etsy", "order"],
  fitness: ["fitness", "workout", "gym", "exercise", "health", "tracker", "training", "steps", "calories", "strava", "peloton", "running"],
  food: ["food", "recipe", "restaurant", "delivery", "menu", "cooking", "meal", "uber eats", "doordash", "grubhub", "ingredients"],
  finance: ["finance", "money", "bank", "invest", "budget", "payment", "wallet", "crypto", "stock", "trading", "robinhood", "venmo", "cashapp"],
  productivity: ["task", "todo", "project", "productivity", "kanban", "planner", "notes", "notion", "trello", "asana", "jira", "organize"],
  education: ["education", "learn", "course", "study", "quiz", "tutorial", "school", "student", "teach", "duolingo", "coursera", "udemy"],
  travel: ["travel", "booking", "hotel", "flight", "trip", "vacation", "airbnb", "expedia", "destination", "itinerary"],
  music: ["music", "spotify", "playlist", "audio", "podcast", "streaming", "player", "song", "album", "artist", "soundcloud"],
  dashboard: ["dashboard", "analytics", "admin", "metrics", "reporting", "monitor", "data", "chart", "statistics"],
  realestate: ["real estate", "property", "house", "rent", "listing", "apartment", "zillow", "realtor", "mortgage"],
  crm: ["crm", "sales", "pipeline", "leads", "contacts", "deals", "salesforce", "hubspot", "client"],
  portfolio: ["portfolio", "resume", "personal", "landing", "showcase", "about me"],
  weather: ["weather", "forecast", "climate", "temperature", "rain", "sunny"],
  news: ["news", "blog", "article", "magazine", "media", "journalist", "headline", "newsletter"],
  scheduling: ["schedule", "calendar", "appointment", "booking", "availability", "meeting", "cal", "calendly", "event", "agenda", "planner"],
  medical: ["medical", "doctor", "patient", "hospital", "health", "prescription", "telemedicine", "clinic", "diagnosis"],
  gaming: ["game", "gaming", "esports", "leaderboard", "score", "player", "tournament", "level"],
};

/**
 * Classify the user's prompt into an app category.
 * This is the "logic pipeline" — it strips product names, looks at the full
 * prompt context, and scores each category to find the best match.
 */
function classifyPrompt(prompt: string): AppCategory {
  const lower = prompt.toLowerCase();

  // Step 1: Strip "like [product]" to avoid matching on brand names
  const withoutRef = lower.replace(/like\s+\w+(?:\s+\w+)?(?:\s+ai)?/gi, "").trim();

  // Step 2: Score each category based on keyword density in BOTH original and stripped prompt
  const scores: Array<{ category: AppCategory; score: number }> = [];

  for (const cat of APP_CATEGORIES) {
    const signals = CATEGORY_SIGNALS[cat.category] ?? [];
    let score = 0;

    for (const signal of signals) {
      // Check original prompt (product names like "tinder" → dating)
      if (lower.includes(signal)) score += 2;
      // Check stripped prompt (domain words like "swipe" → dating)
      else if (withoutRef.includes(signal)) score += 3; // higher weight for domain words
    }

    if (score > 0) scores.push({ category: cat, score });
  }

  // Step 3: Pick highest scoring category
  scores.sort((a, b) => b.score - a.score);

  if (scores.length > 0) {
    const best = scores[0];
    console.log(`[Figma Search] Classified prompt as "${best.category.category}" (score: ${best.score})`);
    if (scores.length > 1) {
      console.log(`[Figma Search] Runner-up: "${scores[1].category.category}" (score: ${scores[1].score})`);
    }
    return best.category;
  }

  // Step 4: Fallback — try to extract ANY meaningful signal from stripped words
  const stopWords = new Set([
    "make", "me", "a", "an", "the", "build", "create", "generate",
    "app", "application", "web", "website", "please", "i", "want",
    "need", "like", "with", "and", "for", "that", "this", "my",
    "can", "you", "just", "simple", "good", "best", "new",
  ]);
  const words = withoutRef.replace(/[^a-z0-9\s]/g, "").split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));

  if (words.length > 0) {
    const fallbackQuery = words.slice(0, 2).join(" ") + " app";
    console.log(`[Figma Search] No category match, using extracted words: "${fallbackQuery}"`);
    return { category: "generic", figmaQueries: [fallbackQuery, "mobile app UI kit", "app template"] };
  }

  console.log("[Figma Search] No classification possible, using generic queries");
  return { category: "generic", figmaQueries: ["mobile app UI kit", "app template", "dashboard UI"] };
}

/**
 * Build multiple search queries from the user's prompt.
 * If `discoveredCategory` is provided (from web search intelligence),
 * use that directly instead of trying to classify from the raw prompt.
 * This is the "logic pipeline" — web search discovers what the product is,
 * and we use that knowledge to find relevant Figma templates.
 */
export function buildFigmaSearchQueries(prompt: string, discoveredCategory?: string | null): string[] {
  // If web search already told us the category, use it directly
  if (discoveredCategory) {
    const match = APP_CATEGORIES.find(c => c.category === discoveredCategory);
    if (match) {
      console.log(`[Figma Search] Using web-search-discovered category "${discoveredCategory}" for queries`);
      return match.figmaQueries;
    }
  }

  // Fallback: classify from the raw prompt (works for direct prompts like "dating app")
  const classified = classifyPrompt(prompt);
  return classified.figmaQueries;
}

/**
 * Build a single search query (backward compat for research handler).
 */
export function buildFigmaSearchQuery(prompt: string, discoveredCategory?: string | null): string {
  return buildFigmaSearchQueries(prompt, discoveredCategory)[0];
}
