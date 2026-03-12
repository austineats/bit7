/**
 * Fetch layout reference code from shadcn/ui blocks registry.
 * Returns real React/TSX source code that the LLM uses as a structural
 * guide — layout patterns, section hierarchy, component organization.
 *
 * Drop-in replacement for the old Webflow template scraper.
 */

import { templateToContextBrief, type FigmaTemplateData, type FigmaDesignTokens } from "./figmaClient.js";
import type { AppContextBrief } from "./contextResearch.js";

// ─── shadcn/ui block registry ────────────────────────────────────

/**
 * Map app categories to relevant shadcn/ui blocks.
 * Each block returns full React/TSX source code via free JSON API.
 */
/** Expanded pools — pick 3 randomly per generation for layout variety */
const CATEGORY_BLOCK_POOLS: Record<string, string[]> = {
  dashboard:   ["dashboard-01", "dashboard-02", "dashboard-03", "sidebar-07", "sidebar-10", "chart-bar-mixed"],
  analytics:   ["dashboard-01", "dashboard-03", "chart-bar-mixed", "sidebar-07", "sidebar-10"],
  finance:     ["dashboard-01", "dashboard-02", "sidebar-07", "login-01", "chart-bar-mixed"],
  ecommerce:   ["sidebar-07", "sidebar-04", "login-01", "login-03", "dashboard-01", "dashboard-02"],
  social:      ["sidebar-04", "sidebar-07", "login-03", "login-05", "dashboard-01", "dashboard-02"],
  dating:      ["login-01", "login-03", "login-05", "sidebar-04", "sidebar-07", "dashboard-01"],
  health:      ["dashboard-01", "dashboard-02", "sidebar-07", "login-01", "chart-bar-mixed"],
  fitness:     ["dashboard-01", "dashboard-03", "sidebar-04", "sidebar-07", "chart-bar-mixed"],
  education:   ["sidebar-07", "sidebar-04", "dashboard-01", "dashboard-02", "login-01"],
  productivity:["sidebar-07", "sidebar-10", "dashboard-01", "dashboard-03", "login-01"],
  saas:        ["dashboard-01", "dashboard-02", "sidebar-07", "sidebar-10", "login-03"],
  crm:         ["dashboard-01", "dashboard-03", "sidebar-10", "sidebar-07", "login-01"],
  project:     ["sidebar-07", "sidebar-10", "dashboard-01", "dashboard-02", "login-01"],
  food:        ["sidebar-04", "sidebar-07", "login-03", "login-05", "dashboard-01"],
  travel:      ["sidebar-04", "sidebar-07", "login-03", "login-01", "dashboard-01"],
  music:       ["sidebar-04", "sidebar-07", "login-03", "login-05", "dashboard-01"],
  default:     ["dashboard-01", "dashboard-02", "sidebar-04", "sidebar-07", "login-01", "login-03"],
};

function pickRandomBlocks(pool: string[], count: number): string[] {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Fetch a shadcn/ui block's source code from the registry.
 * Free API, no auth needed.
 */
async function fetchShadcnBlock(blockName: string): Promise<{ name: string; code: string; description: string } | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(
      `https://ui.shadcn.com/r/styles/new-york/${blockName}.json`,
      { signal: controller.signal },
    );
    clearTimeout(timer);

    if (!res.ok) return null;

    const data = await res.json() as {
      name?: string;
      description?: string;
      files?: Array<{ content?: string; path?: string }>;
    };

    // Get the main page file — usually the first/largest one
    const files = data.files ?? [];
    if (files.length === 0) return null;

    // Find the page-level file (usually page.tsx or the largest file)
    const pageFile = files.find(f => f.path?.includes("page.tsx"))
      ?? files.reduce((best, f) => (f.content?.length ?? 0) > (best.content?.length ?? 0) ? f : best, files[0]);

    const code = pageFile?.content;
    if (!code || code.length < 50) return null;

    console.log(`[shadcn block] Fetched "${blockName}" (${code.length} chars)`);
    return {
      name: data.name ?? blockName,
      code: code.slice(0, 4000), // Cap to avoid prompt bloat
      description: data.description ?? "",
    };
  } catch {
    return null;
  }
}

// ─── Category detection ──────────────────────────────────────────

function detectCategory(prompt: string, discoveredCategory?: string | null): string {
  if (discoveredCategory) {
    const lower = discoveredCategory.toLowerCase();
    for (const cat of Object.keys(CATEGORY_BLOCK_POOLS)) {
      if (lower.includes(cat) || cat.includes(lower)) return cat;
    }
  }

  const lower = prompt.toLowerCase();
  const keywords: [string, string[]][] = [
    ["dashboard",    ["dashboard", "admin", "analytics", "metrics"]],
    ["ecommerce",    ["shop", "store", "ecommerce", "product", "cart"]],
    ["social",       ["social", "feed", "community", "network", "chat"]],
    ["dating",       ["dating", "match", "date", "romance", "swipe"]],
    ["finance",      ["finance", "bank", "payment", "money", "invest"]],
    ["health",       ["health", "medical", "doctor", "patient", "clinic"]],
    ["fitness",      ["fitness", "workout", "gym", "exercise", "training"]],
    ["education",    ["learn", "course", "education", "school", "student"]],
    ["productivity", ["todo", "task", "project", "manage", "note"]],
    ["saas",         ["saas", "platform", "service", "tool", "api"]],
    ["food",         ["food", "recipe", "restaurant", "delivery", "menu"]],
    ["travel",       ["travel", "hotel", "flight", "booking", "trip"]],
    ["music",        ["music", "playlist", "song", "audio", "podcast"]],
  ];

  for (const [cat, words] of keywords) {
    if (words.some(w => lower.includes(w))) return cat;
  }
  return "default";
}

// ─── Build design tokens from block code analysis ────────────────

/** Dark dramatic tokens — cinematic dark theme as default baseline. */
function buildDesignTokens(): FigmaDesignTokens {
  return {
    colors: {
      primary: "",
      secondary: "",
      accent: "",
      background: "#0a0a0f",
      surface: "rgba(255,255,255,0.06)",
      text: "#ffffff",
      muted: "#a1a1aa",
      all: [],
    },
    typography: {
      fonts: ["system-ui"],
      heading_sizes: [48, 36, 24, 20],
      body_size: 16,
      weights: [400, 500, 600, 700],
    },
    spacing: { base: 8, values: [4, 8, 12, 16, 24, 32, 48, 64] },
    borders: { radii: [4, 8, 12, 16], default_radius: 8 },
    shadows: [],
    layout: {
      type: "flexible",
      columns: 0,
      frame_names: [],
      component_names: [],
    },
  };
}

// ─── In-memory cache ─────────────────────────────────────────────

const searchCache = new Map<string, { result: ReturnType<typeof searchWebflowTemplates> extends Promise<infer T> ? T : never; timestamp: number }>();
const SEARCH_CACHE_TTL = 3_600_000; // 1 hour

// ─── Main entry point ────────────────────────────────────────────

/**
 * Fetch shadcn/ui block code as layout reference for code generation.
 * Returns the same interface as the old Webflow scraper so the pipeline
 * doesn't need changes.
 */
export async function searchWebflowTemplates(
  appType: string,
  discoveredCategory?: string | null,
): Promise<{ template: FigmaTemplateData; contextOverlay: Partial<AppContextBrief>; htmlStructure?: string } | null> {
  // Check cache
  const cacheKey = `${appType}:${discoveredCategory ?? ""}`;
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < SEARCH_CACHE_TTL) {
    console.log(`[Layout Ref] Using cached result for "${cacheKey}"`);
    return cached.result;
  }

  const category = detectCategory(appType, discoveredCategory);
  const pool = CATEGORY_BLOCK_POOLS[category] ?? CATEGORY_BLOCK_POOLS.default;
  const blockNames = pickRandomBlocks(pool, 3);

  console.log(`[Layout Ref] Category "${category}" → fetching blocks: ${blockNames.join(", ")}`);

  // Fetch blocks in parallel
  const blocks = (await Promise.all(blockNames.map(fetchShadcnBlock)))
    .filter((b): b is NonNullable<typeof b> => b !== null);

  if (blocks.length === 0) {
    console.log("[Layout Ref] No blocks fetched");
    searchCache.set(cacheKey, { result: null, timestamp: Date.now() });
    return null;
  }

  // Build the layout reference string from block code
  const layoutRef = blocks.map(b =>
    `### ${b.name}${b.description ? ` — ${b.description}` : ""}\n\`\`\`tsx\n${b.code}\n\`\`\``
  ).join("\n\n");

  console.log(`[Layout Ref] ${blocks.length} blocks ready (${layoutRef.length} chars)`);

  // Build template data for pipeline compatibility
  const template: FigmaTemplateData = {
    file_key: `shadcn_${category}`,
    file_name: `shadcn ${category} layout`,
    last_modified: new Date().toISOString(),
    thumbnail_url: null,
    design_tokens: buildDesignTokens(),
    page_names: blocks.map(b => b.name),
    component_count: blocks.length,
    raw_metadata: { source: "shadcn_blocks", category },
  };

  const contextOverlay = templateToContextBrief(template);
  const result = { template, contextOverlay, htmlStructure: layoutRef };

  searchCache.set(cacheKey, { result, timestamp: Date.now() });
  return result;
}
