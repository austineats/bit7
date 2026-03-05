import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { withTimeout } from "./llmTimeout.js";
import { recordSpend } from "./costTracker.js";

const competitorSchema = z.object({
  name: z.string(),
  description: z.string(),
  key_ux_patterns: z.array(z.string()),
  visual_signature: z.string(),
  pricing_model: z.string(),
});

const contextBriefSchema = z.object({
  competitive_landscape: z.array(competitorSchema).min(1).max(10).default([]),
  target_persona: z.object({
    role: z.string(),
    pain_points: z.array(z.string()),
    expectations: z.array(z.string()),
  }).optional().default({ role: "general user", pain_points: [], expectations: [] }),
  must_have_features: z.array(z.string()).max(15).default([]),
  differentiating_features: z.array(z.string()).max(10).default([]),
  design_references: z.object({
    color_psychology: z.string(),
    layout_pattern: z.string(),
    typography_style: z.string(),
    visual_motifs: z.array(z.string()),
  }).optional().default({
    color_psychology: "neutral",
    layout_pattern: "centered content",
    typography_style: "modern sans-serif",
    visual_motifs: [],
  }),
  domain_terminology: z.object({
    field_labels: z.record(z.string(), z.string()),
    cta_verbs: z.array(z.string()),
    section_headers: z.array(z.string()),
  }).optional().default({
    field_labels: {},
    cta_verbs: ["Analyze", "Generate"],
    section_headers: ["Results"],
  }),
  ui_component_suggestions: z.array(z.string()).max(10).optional().default([]),
  animation_style: z.string().optional().default("subtle, smooth transitions"),
  layout_blueprint: z.string().optional().default("centered content with top navigation"),
  item_display_patterns: z.array(z.object({
    content_type: z.string(),
    recommended_display: z.string(),
    card_structure: z.string(),
  })).max(5).optional().default([]),
  competitor_visuals: z.array(z.object({
    name: z.string(),
    colors: z.array(z.string()),
    og_image: z.string().nullable(),
    layout_signals: z.array(z.string()),
    screenshot_analysis: z.object({
      color_palette: z.array(z.string()),
      layout_type: z.string(),
      component_patterns: z.array(z.string()),
      navigation_style: z.string(),
      image_usage: z.string(),
      interactive_elements: z.array(z.string()),
      key_ui_to_replicate: z.array(z.string()),
      // Granular CSS-level visual extraction fields
      background_treatment: z.string().optional(),
      card_design_spec: z.string().optional(),
      typography_hierarchy: z.string().optional(),
      spacing_pattern: z.string().optional(),
      gradient_specs: z.array(z.string()).optional(),
      border_and_shadow_system: z.string().optional(),
      hero_section_spec: z.string().optional(),
      section_patterns: z.array(z.string()).optional(),
    }).nullable(),
  })).optional().default([]),
});

export type AppContextBrief = z.infer<typeof contextBriefSchema>;

const RESEARCH_SYSTEM_PROMPT = `You are a product research analyst with deep knowledge of consumer apps, SaaS products, and digital design.

Given an app idea, produce a comprehensive context brief that a developer would need to build a premium, commercially-viable version of this product.

Draw on your knowledge of real products in this space. Be specific about UX patterns, visual design choices, color psychology, and domain-specific terminology. Do not invent products — reference real ones you know about.

The output must feel like a competitive analysis document from a top-tier product consultancy.

Be precise with field_labels — these become the actual input labels in the generated app. They should sound like what a real product in this space would use, not generic "Enter text here" labels.

For cta_verbs, provide action words specific to this domain (e.g. "Analyze", "Scan", "Generate", "Score", "Review") — never generic words like "Submit" or "Go".

For ui_component_suggestions, identify specific interactive UI patterns that real competitors in this space use. Be CONCRETE:
GOOD: "SVG circular score ring with animated fill", "drag-and-drop card reordering", "before/after comparison slider", "animated typing indicator during processing", "collapsible accordion for detailed breakdowns", "horizontal scrollable history cards"
BAD: "nice charts", "good layout", "modern design"

For animation_style, describe the motion design language that fits this product category:
GOOD: "Clinical precision: 200-300ms ease-out transitions, subtle slide-ups for results, gentle pulse on loading. Score rings animate fill clockwise over 1.2s with ease-in-out."
BAD: "smooth animations"

For layout_blueprint, provide a specific spatial layout a developer can implement:
GOOD: "Centered hero (max-w-2xl) with gradient header -> large textarea input -> prominent CTA -> results expand below with slide-up animation. Score ring left, breakdown cards right in 2-column grid. History as horizontal scrollable cards below."
BAD: "clean layout with sections"

For item_display_patterns, identify every type of content item in this app and describe EXACTLY how competitors display it:
GOOD: { content_type: "Pokemon cards", recommended_display: "Responsive card grid (grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4) with visual cards", card_structure: "Gradient image area (type-colored: Fire=orange, Water=blue, Grass=green) showing Pokemon silhouette at 60% height -> Bold name + type badge pill -> Stats bar row (HP, ATK, DEF) with tiny progress bars -> Rarity star indicator + market price" }
BAD: { content_type: "items", recommended_display: "grid", card_structure: "shows item info" }

CRITICAL RULE: If the app involves COLLECTIONS or LISTINGS of visual items (products, cards, recipes, art, portfolios, etc.), the layout_blueprint MUST recommend a multi-column card grid — NEVER a single-column stat banner layout or vertical list. Real marketplace and collection apps (eBay, Etsy, Pokemon TCG Online, MTG Arena, Dribbble, Pinterest) ALWAYS use multi-column card grids with visual thumbnails. Each card must have a visual/image area, not just text.

VISUAL SIGNATURE SPECIFICITY (CRITICAL):
For visual_signature in competitive_landscape, describe EXACT visual treatments, not vague impressions:
GOOD: "Dark navy bg #0f172a with purple radial glow at hero, glass-morphism cards with border-white/10 and backdrop-blur, gradient CTAs purple-to-blue with glow shadows, Inter font 56px hero heading font-black tracking-tight"
BAD: "Modern dark theme with nice UI"

For design_references, be specific about EXACT CSS-level patterns:
GOOD color_psychology: "Primary #7c3aed purple conveys innovation. Paired with #3b82f6 blue for trust in gradients. Dark bg #0a0e27 for premium feel. Text white/90 for headings, white/60 for body."
GOOD layout_pattern: "Full-width stacked sections: sticky transparent nav -> centered hero py-24 max-w-4xl with gradient badge pill + 56px heading + dual CTAs -> 3-col feature grid py-20 with icon-box cards -> social proof logo strip -> pricing 3-tier cards -> footer"
GOOD typography_style: "Inter. Hero: 56px/64px font-black tracking-[-0.02em]. Section heads: 36px font-bold tracking-tight. Card titles: 18px font-semibold. Body: 15px leading-relaxed text-gray-400."
BAD: "clean modern sans-serif with good hierarchy"

CRITICAL: visual_signature and design_references must contain enough CSS-level detail that a developer could replicate the competitor's visual style WITHOUT seeing a screenshot. Vague descriptions are useless.`;

const toolInputSchema = {
  type: "object" as const,
  additionalProperties: false,
  properties: {
    competitive_landscape: {
      type: "array",
      minItems: 1,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          key_ux_patterns: { type: "array", items: { type: "string" } },
          visual_signature: { type: "string", description: "EXACT visual design specs as CSS: background treatment, card design, typography scale, gradient colors, shadow system. NOT vague like 'modern dark theme'. Example: 'Dark #0a0e27 bg with radial purple glow, glass cards border-white/8 rounded-2xl p-6, gradient CTAs purple-600 to blue-500 with glow shadow, Inter 56px font-black hero heading tracking-tight'" },
          pricing_model: { type: "string" },
        },
        required: ["name", "description", "key_ux_patterns", "visual_signature", "pricing_model"],
      },
    },
    target_persona: {
      type: "object",
      additionalProperties: false,
      properties: {
        role: { type: "string" },
        pain_points: { type: "array", items: { type: "string" } },
        expectations: { type: "array", items: { type: "string" } },
      },
      required: ["role", "pain_points", "expectations"],
    },
    must_have_features: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 8 },
    differentiating_features: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 5 },
    design_references: {
      type: "object",
      additionalProperties: false,
      properties: {
        color_psychology: { type: "string" },
        layout_pattern: { type: "string" },
        typography_style: { type: "string" },
        visual_motifs: { type: "array", items: { type: "string" } },
      },
      required: ["color_psychology", "layout_pattern", "typography_style", "visual_motifs"],
    },
    domain_terminology: {
      type: "object",
      additionalProperties: false,
      properties: {
        field_labels: {
          type: "object",
          additionalProperties: { type: "string" },
        },
        cta_verbs: { type: "array", items: { type: "string" } },
        section_headers: { type: "array", items: { type: "string" } },
      },
      required: ["field_labels", "cta_verbs", "section_headers"],
    },
    ui_component_suggestions: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      maxItems: 8,
      description: "Specific UI component patterns competitors use, e.g. 'circular score ring with animated fill', 'drag-and-drop meal cards', 'before/after slider comparison', 'animated progress stepper'",
    },
    animation_style: {
      type: "string",
      description: "Motion design language for this domain, e.g. 'Clinical 200-300ms ease-out, subtle slide-ups, score rings animate over 1.2s' or 'Energetic bouncy animations with confetti for gamified fitness'",
    },
    layout_blueprint: {
      type: "string",
      description: "Spatial layout recommendation, e.g. 'Centered hero max-w-2xl -> textarea input -> CTA -> expanding results below (like Cal AI scan flow)' or 'Split panel: left form, right live preview with variant cards (like Jasper.ai)'",
    },
    item_display_patterns: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          content_type: { type: "string", description: "What kind of items are displayed, e.g. 'Pokemon cards', 'recipe items', 'product listings'" },
          recommended_display: { type: "string", description: "Specific grid/layout recommendation, e.g. '3-column visual card grid with gradient image area, responsive: grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'" },
          card_structure: { type: "string", description: "Internal card layout, e.g. 'Gradient image area (type-colored, 60% height) -> Bold name + type badge -> Stats row (HP, ATK, DEF) with mini progress bars -> Price/rarity footer'" },
        },
        required: ["content_type", "recommended_display", "card_structure"],
      },
      minItems: 1,
      maxItems: 5,
      description: "How different types of content items should be displayed. Be VERY specific about grid columns, card internal structure, and responsive breakpoints.",
    },
  },
  required: [
    "competitive_landscape",
    "target_persona",
    "must_have_features",
    "differentiating_features",
    "design_references",
    "domain_terminology",
    "ui_component_suggestions",
    "animation_style",
    "layout_blueprint",
    "item_display_patterns",
  ],
};

export async function gatherAppContext(prompt: string): Promise<AppContextBrief | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const client = new Anthropic({ apiKey, maxRetries: 0, ...(process.env.ANTHROPIC_BASE_URL ? { baseURL: process.env.ANTHROPIC_BASE_URL } : {}) });
  const timeoutMs = Number(process.env.STARTBOX_CONTEXT_TIMEOUT_MS ?? 45000);

  try {
    const response = await withTimeout(
      (signal) => client.messages.create({
        model: process.env.AI_MODEL_FAST || "claude-haiku-4-5-20251001",
        max_tokens: 3072,
        system: [
          {
            type: "text" as const,
            text: RESEARCH_SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" as const },
          },
        ],
        messages: [{
          role: "user",
          content: `Research this app idea and produce a comprehensive product context brief:\n\n"${prompt}"\n\nIdentify real competitors, target users, must-have features, and design patterns for this category of product.`,
        }],
        tools: [{
          name: "produce_context_brief",
          description: "Produce a structured product research brief for an app idea",
          input_schema: toolInputSchema,
          cache_control: { type: "ephemeral" as const },
        }],
        tool_choice: { type: "tool", name: "produce_context_brief" },
      }, { signal }),
      timeoutMs,
      "Context research",
    );

    const u = response.usage as unknown as Record<string, number>;
    const cr = u.cache_read_input_tokens ?? 0;
    const cw = u.cache_creation_input_tokens ?? 0;
    const uc = u.input_tokens - cr - cw;
    recordSpend((uc * 0.80 + cw * 1 + cr * 0.08 + u.output_tokens * 4) / 1_000_000);

    const toolUse = response.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") return null;

    return contextBriefSchema.parse(toolUse.input);
  } catch (e) {
    console.error("Context research failed (non-fatal):", e);
    return null;
  }
}
