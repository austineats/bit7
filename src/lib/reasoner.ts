import { z } from "zod";
import type { AppContextBrief } from "./contextResearch.js";
import { withTimeout } from "./llmTimeout.js";
import { recordSpend, calculateCost } from "./costTracker.js";
import { resolveModel, supportsToolUse, supportsCacheControl } from "./modelResolver.js";
import { extractJSON, extractTextFromResponse, llmLog } from "./llmCompat.js";
import { getUnifiedClient } from "./unifiedClient.js";

const reasonedIntentSchema = z.object({
  normalized_prompt: z.string().min(1),
  app_name_hint: z.string().min(1).transform(s => s.slice(0, 80)),
  primary_goal: z.string().min(1).transform(s => s.slice(0, 300)),
  domain: z.string().min(1).transform(s => s.slice(0, 100)),
  reference_app: z.string().nullable().optional(),
  design_philosophy: z.string().min(1).transform(s => s.slice(0, 300)),
  target_user: z.string().min(1).transform(s => s.slice(0, 200)),
  key_differentiator: z.string().min(1).transform(s => s.slice(0, 300)),
  visual_style_keywords: z.array(z.string()).min(1).max(10),
  premium_features: z.array(z.string()).min(1).max(10),
  nav_tabs: z.array(z.object({
    id: z.string(),
    label: z.string().transform(s => s.slice(0, 30)),
    icon: z.string().min(1).max(30),
    layout: z.string().min(1).max(50),
    purpose: z.string().transform(s => s.slice(0, 200)),
  })).min(2).max(6),
  primary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  theme_style: z.enum(["light", "dark", "vibrant"]),
  app_icon: z.string().min(1).max(30),
  output_format_hint: z.string().min(1).max(50),
  layout_blueprint: z.string().min(1),
  animation_keywords: z.array(z.string()).min(1).max(3),
  visual_requirements: z.object({
    hero_pattern: z.string().min(1).max(50),
    card_style: z.string().min(1).max(50),
    data_density: z.string().min(1).max(50),
    color_usage: z.string().min(1).max(50),
  }),
  item_display_format: z.string().min(1).max(50),
  typography_style: z.string().min(1).max(50),
  narrative: z.string().min(1).transform(s => s.slice(0, 500)),
  feature_details: z.array(z.object({ name: z.string(), description: z.string() })).min(1).max(10),
  reasoning_summary: z.string().min(1),
  domain_keywords: z.array(z.string()).optional(),
  design_tokens: z.object({
    colors: z.object({
      primary: z.string(),
      secondary: z.string(),
      accent: z.string(),
      background: z.string(),
      surface: z.string(),
      text: z.string(),
      muted: z.string(),
    }),
    typography: z.object({
      headings: z.object({
        font: z.string(),
        weight: z.string(),
        sizes: z.array(z.string()),
      }),
      body: z.object({
        font: z.string(),
        weight: z.string(),
        sizes: z.array(z.string()),
      }),
    }),
    spacing: z.object({
      base: z.number(),
      scale: z.array(z.number()),
    }),
    borders: z.object({
      radius: z.object({ sm: z.string(), md: z.string(), lg: z.string(), full: z.string() }),
      width: z.object({ thin: z.string(), medium: z.string() }),
    }),
    shadows: z.object({ sm: z.string(), md: z.string(), lg: z.string() }),
    animations: z.object({
      duration: z.object({ fast: z.string(), normal: z.string(), slow: z.string() }),
      easing: z.string(),
    }),
  }).optional(),
});

export type ReasonedIntent = z.infer<typeof reasonedIntentSchema>;

const REASONER_SYSTEM_PROMPT = `You are an elite AI product designer who deeply understands consumer apps, SaaS tools, and AI services.

Your job: analyze a user's app idea and extract PRECISE structured intent for building a professional, non-AI-looking product. The output should feel like it was designed by a studio like the teams behind Stripe, Linear, or Apple — minimal, editorial, intentional.

=== CORE DESIGN MANDATE ===
Every app you design must follow these rules:
- LIMITED COLOR PALETTE: 3–4 colors max. Apply the 60-30-10 rule (60% dominant neutral, 30% secondary, 10% accent).
- 2 FONTS MAX: One heading family, one body family (or a single family for both). Build hierarchy through size and weight, not font variety.
- CLEAN GRID: Consistent spacing scale. No arbitrary padding. Everything aligned.
- EDITORIAL AESTHETIC: Avoid generic startup aesthetics, purple gradients, default Tailwind/shadcn styles. No floating blobs, no gratuitous gradients, no decorative noise.
- SUBTLE INTERACTIONS: Gentle hover states, smooth transitions. No bouncing or dramatic animations.
- HUMAN COPY: Clear, specific language. No buzzwords like "revolutionize", "supercharge", or "next-gen".

=== UNDERSTANDING THE PROMPT ===
CRITICAL: When the user says "like [Product Name]" or "similar to [Product Name]", you MUST use your knowledge of that product to determine the correct domain, features, layout, and visual style.
Examples:
- "create an app like Cal ai" → Cal.ai is a NUTRITION/CALORIE TRACKING app. Build a calorie tracker with meal logging, macro tracking, food scanning.
- "something like Notion" → Notion is a NOTE-TAKING/WORKSPACE app. Build a notes/docs workspace with pages, blocks, organization.
- "like Spotify" → Spotify is a MUSIC STREAMING app. Build a music player with playlists, discovery, playback controls.
- "similar to Robinhood" → Robinhood is a STOCK TRADING app. Build an investment tracker with portfolio, charts, watchlists.
NEVER ignore the referenced product. NEVER build a generic tool when the user clearly references a specific product. The referenced product tells you EXACTLY what domain, features, and UX patterns to use.

IMPORTANT: If you do NOT recognize the referenced product name, look at any web search context provided below the prompt. If web search context describes the product, use that description to determine the domain. If there is NO web search context AND you don't recognize the product, use the OTHER words in the prompt to infer the domain (e.g., "fitness", "dating", "finance"). Do NOT guess a random unrelated domain — stick to what the prompt actually says.

=== APP NAMING ===
Generate an ORIGINAL, INVENTED product name. One coined word is ideal.
The name should MATCH THE DOMAIN of the referenced product (if any). Don't just pick a random techy name.
- If building a nutrition app: names like "NutriSnap", "CalorieQ", "MacroLens", "FuelTrack"
- If building a notes app: names like "Scriptly", "PageFlow", "NoteVault"
Only avoid using the EXACT real brand name. "Cal AI" → bad. "NutriLens" (same domain, original name) → good.
GOOD names: "Chronofy", "Tempra", "Gridwell", "Lumivault", "Pulsekit", "Flaremind", "Craftpeak"

=== ICONS ===
ALL icons MUST be Lucide React PascalCase names. NEVER use emoji.
Common: Search, Star, Zap, FileText, BarChart2, Settings, Home, Calendar, Target, TrendingUp, Heart, BookOpen, DollarSign, ShoppingCart, Users, Sparkles, Activity, Grid, Layout, Globe, Code, Mail

=== LAYOUT SELECTION ===
Choose a layout that fits the app's purpose. Common patterns include:
- "analyzer" — scans or evaluates something and returns a score/breakdown
- "generator" — creates new content from inputs
- "tool" — calculates, converts, or transforms
- "dashboard" — overview stats, metrics, or summary
- "planner" — structured plans with steps, timelines, schedules
- "browse" — browses or filters a collection of items
- "marketplace" — store or trading platform with listings
- "portfolio" — showcases creative work in a visual grid
- "kanban" — organizes items into columns or stages
- "timeline" — chronological events or history
You may also use any custom layout type that fits the app concept.

=== OUTPUT FORMAT ===
Choose an output format that matches the content:
- "score_card" — includes a score/grade + breakdown
- "cards" — multiple distinct items
- "report" — detailed narrative with sections
- "list" — ordered steps or checklist
- "markdown" — default rich formatted content
- "plain" — simple conversational response
You may also use any custom format that fits.

=== VISUAL STYLE KEYWORDS (pick 2-5 that fit the domain) ===
- "minimal" / "clean" / "spacious" — professional tools, productivity
- "dark" / "moody" / "rich" — developer tools, gaming, media
- "vibrant" / "energetic" / "bold" — fitness, social, creative
- "editorial" / "refined" / "precise" — SaaS, dashboards, professional apps
- "warm" / "organic" / "earthy" — food, wellness, lifestyle
- "corporate" / "structured" / "authoritative" — finance, legal
- "playful" / "rounded" / "friendly" — education, consumer
Avoid "glassmorphic" / "frosted" unless truly domain-appropriate — these patterns often look AI-generated.

=== VISUAL QUALITY GUIDELINES ===
These are REQUIRED principles for every app — this is what separates professional from template:
- Generous vertical spacing between sections helps content breathe
- Interactive elements should have subtle hover/focus states (opacity shifts, gentle color changes — not dramatic transforms)
- Let the domain guide visual choices — a fitness app might use progress rings, a recipe app might use large imagery frames, a data tool might use tables and charts
- Prefer solid backgrounds or very subtle gradients — avoid heavy gradient backgrounds, glowing borders, or frosted glass unless the domain specifically calls for it
- Create visual hierarchy through size, weight, and spacing contrast — not through decorative elements
- Every visual choice must be INTENTIONAL. If you can't explain why a gradient or shadow is there, remove it.

=== NAVIGATION ===
Generate 2-6 tabs. Each tab's "purpose" should describe SPECIFIC UI elements to build.
Example: "Dashboard showing saved recipes as cards with title, cook time, difficulty. Search bar at top, category filter chips."

=== COLOR SELECTION ===
Choose colors that match the domain. Use the 60-30-10 rule:
- 60% dominant: neutral background (white, off-white, dark slate)
- 30% secondary: card surfaces, borders, muted text
- 10% accent: the primary color — CTAs, active states, key highlights
Professional apps often use cooler tones. Health/fitness may use greens and oranges. Creative tools may use purples and vibrant tones.
NEVER flood the UI with the primary color. It should be used sparingly for maximum impact.

=== LAYOUT BLUEPRINT ===
Describe the spatial layout pattern. Common patterns include:
- "centered-hero-input-results" — hero header with centered input and results below
- "split-form-output" — left form panel + right output panel
- "grid-dashboard" — stat grid + main content area
- "marketplace-grid" — search bar + filter chips + responsive card grid
- "bento-overview" — asymmetric grid with featured large card + smaller cards
- "magazine-layout" — featured hero card + multi-column grid below
- "kanban-board" — horizontal scrolling columns with cards
- "sidebar-detail" — fixed sidebar nav + scrollable detail area
- "carousel-showcase" — hero section + horizontal scrolling card carousel
You can also describe a custom layout pattern.

=== ITEM DISPLAY FORMAT ===
Match content type to display format:
- Visual collections (products, cards, recipes): "grid_cards"
- Data records (transactions, contacts, logs): "table_rows"
- Simple items (bookmarks, notes, links): "list_items"
- Workflow items (tasks, tickets): "kanban_columns"
- Time-based events (history, schedule): "timeline"
- Mixed-importance items (dashboard widgets): "bento_grid"
- Featured items (showcases): "carousel"
- Freeform layouts: "masonry"

=== TYPOGRAPHY STYLE ===
Controls heading personality. Choose families based on domain fit and readability rather than a fixed default stack.

Common styles:
- "bold_headlines" — consumer apps, large bold headings
- "editorial_serif" — content/magazine, serif headlines with sans body
- "compact_data" — dashboards/CRM, smaller text, dense layout
- "magazine" — portfolio/showcase, large featured text with smaller body
- "playful" — games/social, rounded, generous spacing
- "modern_geometric" — SaaS/tech, tight tracking, clean lines
- "clean_sans" — professional tools, sans-focused hierarchy
Choose the style that best matches the domain. Sans-only typography is valid for many domains.

=== ANIMATION KEYWORDS (pick 1-3) ===
Prefer subtle, professional animations. Avoid bouncy/dramatic effects that look AI-generated.
- Professional: "smooth", "subtle", "precise"
- Consumer: "gentle", "fluid", "responsive"
- Premium: "elegant", "slow", "refined"
- Technical: "snappy", "sharp", "minimal"
Default to "smooth" + "subtle" unless the domain specifically calls for more energy.

=== VISUAL REQUIREMENTS ===
Specify for every app:
- hero_pattern: What the top looks like ("gradient_banner", "metric_dashboard", "search_hero", "minimal_header", "none", or custom)
- card_style: How cards look ("mixed", "accent_border", "gradient", "elevated", "flat", or custom)
- data_density: How much content on first load ("sparse", "moderate", "dense", or custom)
- color_usage: How vibrantly to use color ("monochrome_accent", "full_color", "gradient_heavy", "dark_with_glow", or custom)

=== DESIGN TOKENS ===
Generate a complete set of design tokens for this specific app. These will be used as CSS custom properties.
REMEMBER: 3-4 colors max, 60-30-10 balance. Choose colors that match the domain and mood. For example:
- A dark finance app: dark backgrounds (#0a0a0f), subtle surface elevation, accent color used sparingly
- A bright fitness app: clean white/light backgrounds, one strong accent color for CTAs and progress indicators
- A warm recipe app: cream/warm backgrounds, earth tones, organic rounded corners
For headings.font and body.font: use at most 2 font families. Choose readable families that match domain tone.
Spacing and border radius should match density: data-heavy apps use tighter spacing and smaller radius.
Shadows should be flat or very subtle — no heavy drop shadows or glow effects.

=== NARRATIVE ===
Write a 1-2 sentence product description (NOT first person) describing what's being built and why.
Use clear, specific language — not marketing buzzwords. Describe what the product DOES, not how it "transforms" or "revolutionizes".

=== FEATURE DETAILS ===
For each feature, provide a description explaining what UI component it maps to and how items should be displayed.
Be specific about grid sizes, card structure, and interactions.

When competitive research context is provided, USE IT to inform decisions about features, colors, layout, and terminology.
Extract the user's intent even if their prompt has typos or is vague. Infer from context.

=== REFERENCE APP HANDLING (CRITICAL) ===
If the user references a real product (e.g., "like Cal ai", "similar to Notion", "Spotify clone"):
1. Set reference_app to the product name
2. Use YOUR KNOWLEDGE of that product to fill in ALL fields — domain, features, layout, colors, visual style
3. The app you design MUST be in the SAME DOMAIN as the referenced product
4. Features MUST match the core functionality of the referenced product
5. Only the NAME should be different (original invented name in the same domain)`;

const toolInputSchema = {
  type: "object" as const,
  additionalProperties: false,
  properties: {
    normalized_prompt: { type: "string", description: "Clean rephrasing of the user's prompt" },
    app_name_hint: { type: "string", description: "ORIGINAL coined product name (1-2 words). NEVER use real brand names." },
    primary_goal: { type: "string", description: "1-sentence description of the app's core purpose" },
    domain: { type: "string", description: "Product category e.g. 'Nutrition & Health', 'Finance', 'Productivity'" },
    reference_app: { type: "string", description: "Real competitor app the user referenced, if any" },
    design_philosophy: { type: "string", description: "Design approach including specific visual techniques and spatial patterns" },
    target_user: { type: "string", description: "Who is the primary user?" },
    key_differentiator: { type: "string", description: "What makes this app stand out?" },
    visual_style_keywords: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      maxItems: 5,
      description: "Visual style descriptors",
    },
    premium_features: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      maxItems: 5,
      description: "Key features",
    },
    nav_tabs: {
      type: "array",
      minItems: 2,
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          icon: { type: "string", description: "Lucide React icon name in PascalCase" },
          layout: { type: "string", description: "Layout type — any string describing the page layout" },
          purpose: { type: "string" },
        },
        required: ["id", "label", "icon", "layout", "purpose"],
      },
    },
    primary_color: { type: "string", description: "Hex color e.g. #22c55e" },
    theme_style: { type: "string", enum: ["light", "dark", "vibrant"] },
    app_icon: { type: "string", description: "Lucide React icon name in PascalCase" },
    output_format_hint: { type: "string", description: "Output format — any descriptive string" },
    layout_blueprint: { type: "string", description: "Spatial layout pattern — use a common pattern or describe a custom one" },
    animation_keywords: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 3 },
    visual_requirements: {
      type: "object",
      additionalProperties: false,
      properties: {
        hero_pattern: { type: "string", description: "What the top of the app looks like" },
        card_style: { type: "string", description: "How content cards should look" },
        data_density: { type: "string", description: "How much data to show on first load" },
        color_usage: { type: "string", description: "How vibrantly to use the primary color" },
      },
      required: ["hero_pattern", "card_style", "data_density", "color_usage"],
    },
    item_display_format: {
      type: "string",
      description: "How to display collections of items — any descriptive string",
    },
    typography_style: {
      type: "string",
      description: "Typography personality — any descriptive string",
    },
    narrative: { type: "string", description: "1-2 sentence product description (NOT first-person)" },
    feature_details: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string", description: "Feature name" },
          description: { type: "string", description: "What this feature does — include layout details" },
        },
        required: ["name", "description"],
      },
      minItems: 1,
      maxItems: 10,
    },
    reasoning_summary: { type: "string", description: "Brief summary of your reasoning" },
    design_tokens: {
      type: "object",
      description: "Per-app design tokens for consistent theming",
      properties: {
        colors: {
          type: "object",
          properties: {
            primary: { type: "string", description: "Primary brand color (hex)" },
            secondary: { type: "string", description: "Secondary color (hex)" },
            accent: { type: "string", description: "Accent/highlight color (hex)" },
            background: { type: "string", description: "Page background color (hex)" },
            surface: { type: "string", description: "Card/surface background (hex)" },
            text: { type: "string", description: "Primary text color (hex)" },
            muted: { type: "string", description: "Muted/secondary text color (hex)" },
          },
          required: ["primary", "secondary", "accent", "background", "surface", "text", "muted"],
        },
        typography: {
          type: "object",
          properties: {
            headings: {
              type: "object",
              properties: {
                font: { type: "string", description: "CSS font-family for headings" },
                weight: { type: "string", description: "CSS font-weight e.g. '700' or 'bold'" },
                sizes: { type: "array", items: { type: "string" }, description: "Sizes from h1 to h4 e.g. ['2.5rem', '2rem', '1.5rem', '1.25rem']" },
              },
              required: ["font", "weight", "sizes"],
            },
            body: {
              type: "object",
              properties: {
                font: { type: "string", description: "CSS font-family for body text" },
                weight: { type: "string", description: "CSS font-weight" },
                sizes: { type: "array", items: { type: "string" }, description: "Sizes [base, small, xs]" },
              },
              required: ["font", "weight", "sizes"],
            },
          },
          required: ["headings", "body"],
        },
        spacing: {
          type: "object",
          properties: {
            base: { type: "number", description: "Base spacing unit in px (e.g. 4)" },
            scale: { type: "array", items: { type: "number" }, description: "Multipliers e.g. [1,2,3,4,6,8,12,16]" },
          },
          required: ["base", "scale"],
        },
        borders: {
          type: "object",
          properties: {
            radius: {
              type: "object",
              properties: {
                sm: { type: "string" }, md: { type: "string" }, lg: { type: "string" }, full: { type: "string" },
              },
              required: ["sm", "md", "lg", "full"],
            },
            width: {
              type: "object",
              properties: { thin: { type: "string" }, medium: { type: "string" } },
              required: ["thin", "medium"],
            },
          },
          required: ["radius", "width"],
        },
        shadows: {
          type: "object",
          properties: {
            sm: { type: "string" }, md: { type: "string" }, lg: { type: "string" },
          },
          required: ["sm", "md", "lg"],
        },
        animations: {
          type: "object",
          properties: {
            duration: {
              type: "object",
              properties: { fast: { type: "string" }, normal: { type: "string" }, slow: { type: "string" } },
              required: ["fast", "normal", "slow"],
            },
            easing: { type: "string", description: "CSS easing function" },
          },
          required: ["duration", "easing"],
        },
      },
      required: ["colors", "typography", "spacing", "borders", "shadows", "animations"],
    },
  },
  required: [
    "normalized_prompt", "app_name_hint", "primary_goal", "domain",
    "design_philosophy", "target_user", "key_differentiator",
    "visual_style_keywords", "premium_features",
    "nav_tabs", "primary_color", "theme_style",
    "app_icon", "output_format_hint",
    "layout_blueprint", "animation_keywords", "visual_requirements",
    "item_display_format", "typography_style",
    "narrative", "feature_details", "reasoning_summary",
  ],
};

function buildContextSection(contextBrief?: AppContextBrief | null): string {
  if (!contextBrief) return '';
  return [
    `\n--- COMPETITIVE RESEARCH CONTEXT ---`,
    `Similar products: ${contextBrief.competitive_landscape.map(c => `${c.name}: ${c.key_ux_patterns.join(', ')}`).join(' | ')}`,
    `Visual signatures: ${contextBrief.competitive_landscape.map(c => `${c.name}: ${c.visual_signature}`).join(' | ')}`,
    `Target user: ${contextBrief.target_persona.role} — Pain points: ${contextBrief.target_persona.pain_points.join(', ')}`,
    `User expectations: ${contextBrief.target_persona.expectations.join(', ')}`,
    `Must-have features: ${contextBrief.must_have_features.join(', ')}`,
    `Differentiating features: ${contextBrief.differentiating_features.join(', ')}`,
    `Design guidance: ${contextBrief.design_references.color_psychology}. Layout: ${contextBrief.design_references.layout_pattern}. Typography: ${contextBrief.design_references.typography_style}`,
    `Visual motifs: ${contextBrief.design_references.visual_motifs.join(', ')}`,
    `Domain field labels: ${JSON.stringify(contextBrief.domain_terminology.field_labels)}`,
    `CTA verbs: ${contextBrief.domain_terminology.cta_verbs.join(', ')}`,
    `Section headers: ${contextBrief.domain_terminology.section_headers.join(', ')}`,
    ...(contextBrief.ui_component_suggestions?.length ? [`UI component patterns: ${contextBrief.ui_component_suggestions.join(', ')}`] : []),
    ...(contextBrief.animation_style ? [`Recommended animation style: ${contextBrief.animation_style}`] : []),
    ...(contextBrief.layout_blueprint ? [`Layout blueprint: ${contextBrief.layout_blueprint}`] : []),
    `---`,
  ].join('\n');
}

/* ---------- Salvage partial tool responses ---------- */
function salvagePartialIntent(raw: unknown, prompt: string): ReasonedIntent | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  // Prompt-grounded defaults — derive from user's actual words, not generic templates
  const snippet = prompt.slice(0, 120).trim();
  const shortSnippet = prompt.slice(0, 50).trim();

  const defaults: Record<string, unknown> = {
    normalized_prompt: prompt,
    app_name_hint: shortSnippet.split(/\s+/).slice(0, 2).join("") || "MyApp",
    primary_goal: snippet,
    domain: snippet,  // use actual prompt text, not generic category
    design_philosophy: "Clean, functional design with thoughtful visual hierarchy",
    target_user: "General users",
    key_differentiator: `Designed around: ${snippet}`,
    visual_style_keywords: ["clean", "spacious", "modern"],
    premium_features: [shortSnippet],
    nav_tabs: [
      { id: "main", label: "Main", icon: "Home", layout: "dashboard", purpose: `Core experience for: ${snippet.slice(0, 80)}` },
      { id: "settings", label: "Settings", icon: "Settings", layout: "tool", purpose: "Configuration and preferences" },
    ],
    primary_color: "#3b82f6",
    theme_style: "light",
    app_icon: "Zap",
    output_format_hint: "markdown",
    layout_blueprint: "flexible",
    animation_keywords: ["smooth", "subtle"],
    visual_requirements: {
      hero_pattern: "gradient_banner",
      card_style: "mixed",
      data_density: "moderate",
      color_usage: "full_color",
    },
    item_display_format: "grid_cards",
    typography_style: "bold_headlines",
    narrative: `A tool for "${snippet}".`,
    feature_details: [
      { name: shortSnippet, description: `Core feature based on: ${snippet}` },
    ],
    reasoning_summary: "Recovered from partial model output — prompt-grounded salvage",
  };

  const merged: Record<string, unknown> = {};
  for (const key of Object.keys(defaults)) {
    merged[key] = r[key] !== undefined && r[key] !== null ? r[key] : defaults[key];
  }
  for (const key of Object.keys(r)) {
    if (merged[key] === undefined) merged[key] = r[key];
  }

  // Strip design_tokens during salvage — it's optional and its deeply nested
  // schema is the most common cause of salvage failures.  Better to drop it
  // than let a malformed value kill the entire pipeline.
  delete merged.design_tokens;

  const result = reasonedIntentSchema.safeParse(merged);
  if (result.success) {
    console.log("Salvaged partial intent — recovered fields:", Object.keys(defaults).filter((k) => r[k] === undefined || r[k] === null).join(", ") || "none");
    return result.data;
  }

  console.warn("Salvage also failed:", result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", "));
  return null;
}

/* ---------- Anthropic reasoner (tool-use path) ---------- */
async function runToolReasoner(
  client: Anthropic,
  modelId: string,
  prompt: string,
  contextSection: string,
  timeoutMs: number,
): Promise<ReasonedIntent | null> {
  const useCacheControl = supportsCacheControl();

  const response = await withTimeout(
    (signal) => client.messages.create({
      model: modelId,
      max_tokens: 6000,
      temperature: 0.9,
      system: [
        {
          type: "text" as const,
          text: REASONER_SYSTEM_PROMPT,
          ...(useCacheControl ? { cache_control: { type: "ephemeral" as const } } : {}),
        },
      ],
      messages: [{
        role: "user",
        content: `Analyze this app idea and extract precise build intent:\n\n"${prompt}"${contextSection}\n\nReturn structured intent for building this as a polished AI product. Use Lucide icon names (PascalCase) for ALL icons — NEVER emoji.\n\nIMPORTANT: You MUST fill in EVERY required field in the tool schema. Do not skip any fields.`,
      }],
      tools: [{
        name: "extract_intent",
        description: "Extract structured app-building intent from a prompt",
        input_schema: toolInputSchema,
        ...(useCacheControl ? { cache_control: { type: "ephemeral" as const } } : {}),
      }],
      tool_choice: { type: "tool", name: "extract_intent" },
    }, { signal }),
    timeoutMs,
    "Prompt reasoner",
  );

  const u = response.usage as unknown as Record<string, number>;
  recordSpend(calculateCost(modelId, {
    input_tokens: u.input_tokens,
    output_tokens: u.output_tokens,
    cache_read_input_tokens: u.cache_read_input_tokens,
    cache_creation_input_tokens: u.cache_creation_input_tokens,
  }));

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") return null;

  const strict = reasonedIntentSchema.safeParse(toolUse.input);
  if (strict.success) return strict.data;

  console.warn(
    "Strict intent parse failed, salvaging partial response:",
    strict.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", "),
  );
  return salvagePartialIntent(toolUse.input, prompt);
}

/* ---------- Text/JSON reasoner (non-tool path for Kimi/unknown) ---------- */

// JSON template showing the exact structure the model needs to produce.
// This is critical for text-mode: without tool_choice, the model has no
// schema to follow — it needs an explicit example with nested structures.
const TEXT_REASONER_JSON_TEMPLATE = `{
  "normalized_prompt": "clean rephrasing of the user's prompt",
  "app_name_hint": "OriginalName",
  "primary_goal": "1-sentence description of the app's core purpose",
  "domain": "Product category e.g. Nutrition & Health",
  "reference_app": "",
  "design_philosophy": "design approach",
  "target_user": "who is the primary user",
  "key_differentiator": "what makes this stand out",
  "visual_style_keywords": ["keyword1", "keyword2"],
  "premium_features": ["feature1", "feature2", "feature3"],
  "nav_tabs": [
    {"id": "home", "label": "Home", "icon": "Home", "layout": "dashboard", "purpose": "description of this tab's UI"},
    {"id": "explore", "label": "Explore", "icon": "Search", "layout": "browse", "purpose": "description"}
  ],
  "primary_color": "#3b82f6",
  "theme_style": "light",
  "app_icon": "Zap",
  "output_format_hint": "cards",
  "layout_blueprint": "spatial layout description",
  "animation_keywords": ["smooth", "subtle"],
  "visual_requirements": {
    "hero_pattern": "gradient_banner",
    "card_style": "mixed",
    "data_density": "moderate",
    "color_usage": "full_color"
  },
  "item_display_format": "grid_cards",
  "typography_style": "bold_headlines",
  "narrative": "1-2 sentence product description",
  "feature_details": [
    {"name": "Feature Name", "description": "what this feature does with layout details"}
  ],
  "reasoning_summary": "brief summary of reasoning"
}`;

async function runTextReasoner(
  client: Anthropic,
  modelId: string,
  prompt: string,
  contextSection: string,
  timeoutMs: number,
): Promise<ReasonedIntent | null> {
  // Use higher max_tokens for thinking models — they consume tokens for
  // internal reasoning before producing the actual JSON output
  const response = await withTimeout(
    (signal) => client.messages.create({
      model: modelId,
      max_tokens: 16000,
      temperature: 0.9,
      system: REASONER_SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: `Analyze this app idea and extract precise build intent:\n\n"${prompt}"${contextSection}\n\nReturn structured intent for building this as a polished AI product. Use Lucide icon names (PascalCase) for ALL icons — NEVER emoji.\n\nYou MUST respond with a single JSON object matching this EXACT structure (fill in real values):\n${TEXT_REASONER_JSON_TEMPLATE}\n\nAll fields are required. nav_tabs must have 2-4 items. primary_color must be a hex color like #22c55e.\nRespond ONLY with JSON — no markdown fences, no explanation, no other text.`,
      }],
    }, { signal }),
    timeoutMs,
    "Prompt reasoner (text)",
  );

  const u = response.usage as unknown as Record<string, number>;
  recordSpend(calculateCost(modelId, {
    input_tokens: u.input_tokens,
    output_tokens: u.output_tokens,
  }));

  // Use extractTextFromResponse to properly handle thinking model responses
  const textContent = extractTextFromResponse(
    response.content as Array<{ type: string; text?: string; thinking?: string }>,
  );

  if (!textContent) {
    console.warn("Text reasoner returned empty response after stripping thinking content");
    // Log content block types for diagnostics
    console.warn("Response content block types:", response.content.map(b => b.type).join(", "));
    return null;
  }

  console.log(`Text reasoner response: ${textContent.length} chars (content blocks: ${response.content.map(b => b.type).join(", ")})`);

  try {
    const jsonStr = extractJSON(textContent);
    const parsed = JSON.parse(jsonStr);

    const strict = reasonedIntentSchema.safeParse(parsed);
    if (strict.success) return strict.data;

    console.warn(
      "Text reasoner strict parse failed, salvaging:",
      strict.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", "),
    );
    return salvagePartialIntent(parsed, prompt);
  } catch (e) {
    console.warn("Text reasoner JSON parse failed:", e instanceof Error ? e.message : e);
    console.warn("Raw response (first 500 chars):", textContent.slice(0, 500));
    return null;
  }
}

/* ---------- Simplified text reasoner retry (fewer required fields) ---------- */
async function runSimplifiedTextReasoner(
  client: Anthropic,
  modelId: string,
  prompt: string,
  timeoutMs: number,
): Promise<ReasonedIntent | null> {
  console.log("Attempting simplified text reasoner retry...");

  const response = await withTimeout(
    (signal) => client.messages.create({
      model: modelId,
      max_tokens: 4000,
      temperature: 0.7,
      system: `You are an app designer. Given a user's app idea, extract structured intent as JSON.\nRespond ONLY with a valid JSON object. No markdown, no explanation.`,
      messages: [{
        role: "user",
        content: `App idea: "${prompt}"\n\nReturn JSON with these fields:\n- app_name_hint: string (original invented name)\n- primary_goal: string (1 sentence)\n- domain: string (category)\n- reference_app: string or null\n- nav_tabs: array of {id, label, icon, layout, purpose} (2-3 tabs)\n- primary_color: string (hex like #6366f1)\n- theme_style: "light" or "dark"\n- premium_features: string array (3-5 features)\n- feature_details: array of {name, description}\n- narrative: string (1 sentence description)\n- visual_style_keywords: string array`,
      }],
    }, { signal }),
    timeoutMs,
    "Simplified reasoner",
  );

  const u = response.usage as unknown as Record<string, number>;
  recordSpend(calculateCost(modelId, {
    input_tokens: u.input_tokens,
    output_tokens: u.output_tokens,
  }));

  const textContent = extractTextFromResponse(
    response.content as Array<{ type: string; text?: string; thinking?: string }>,
  );

  if (!textContent) return null;

  try {
    const jsonStr = extractJSON(textContent);
    const parsed = JSON.parse(jsonStr);
    // Salvage will fill missing fields with prompt-grounded defaults
    return salvagePartialIntent(parsed, prompt);
  } catch (e) {
    console.warn("Simplified reasoner JSON parse also failed:", e instanceof Error ? e.message : e);
    return null;
  }
}

/* ---------- Unified reasoner entry ---------- */
async function runReasoner(
  prompt: string,
  contextBrief?: AppContextBrief | null,
): Promise<ReasonedIntent | null> {
  const client = getUnifiedClient();
  // Kimi K2.5 thinking models take ~90-120s — 30s default was causing timeouts
  const timeoutMs = Number(process.env.STARTBOX_REASONER_TIMEOUT_MS ?? 150000);
  const contextSection = buildContextSection(contextBrief);
  const modelId = resolveModel("fast");

  if (supportsToolUse()) {
    llmLog("reasoner", { model: modelId });
    return runToolReasoner(client, modelId, prompt, contextSection, timeoutMs);
  }

  // Text/JSON path — try full schema first, then simplified retry
  llmLog("reasoner", { model: modelId, note: "text/JSON path (no tool_choice)" });
  const result = await runTextReasoner(client, modelId, prompt, contextSection, timeoutMs);
  if (result) return result;

  // Retry with simplified prompt (fewer fields, simpler instructions)
  llmLog("reasoner", { model: modelId, note: "simplified retry" });
  return runSimplifiedTextReasoner(client, modelId, prompt, timeoutMs);
}

/* ---------- Main entry point ---------- */
export async function translateEnglishPromptWithReasoning(
  prompt: string,
  contextBrief?: AppContextBrief | null,
): Promise<ReasonedIntent | null> {
  if (!process.env.KIMI_API_KEY) return null;

  try {
    console.log("Starting reasoner pipeline...");
    return await runReasoner(prompt, contextBrief);
  } catch (e) {
    console.error("Reasoner failed:", e);
    return null;
  }
}
