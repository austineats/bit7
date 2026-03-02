import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { z } from "zod";
import type { AppContextBrief } from "./contextResearch.js";
import { withTimeout } from "./llmTimeout.js";
import { recordSpend } from "./costTracker.js";

const reasonedIntentSchema = z.object({
  normalized_prompt: z.string().min(1),
  app_name_hint: z.string().min(1).transform(s => s.slice(0, 80)),
  primary_goal: z.string().min(1).transform(s => s.slice(0, 300)),
  domain: z.string().min(1).transform(s => s.slice(0, 100)),
  reference_app: z.string().optional(),
  design_philosophy: z.string().min(1).transform(s => s.slice(0, 300)),
  target_user: z.string().min(1).transform(s => s.slice(0, 200)),
  key_differentiator: z.string().min(1).transform(s => s.slice(0, 300)),
  visual_style_keywords: z.array(z.string()).min(1).max(10),
  premium_features: z.array(z.string()).min(1).max(10),
  nav_tabs: z.array(z.object({
    id: z.string(),
    label: z.string().transform(s => s.slice(0, 30)),
    icon: z.string().min(1).max(30),
    layout: z.enum(["tool", "analyzer", "generator", "dashboard", "planner"]),
    purpose: z.string().transform(s => s.slice(0, 200)),
  })).min(2).max(4),
  primary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  theme_style: z.enum(["light", "dark", "vibrant"]),
  app_icon: z.string().min(1).max(30),
  output_format_hint: z.enum(["markdown", "cards", "score_card", "report", "list", "plain"]),
  layout_blueprint: z.string().optional(),
  animation_keywords: z.array(z.string()).min(1).max(3).optional(),
  narrative: z.string().min(1).transform(s => s.slice(0, 500)),
  feature_details: z.array(z.object({ name: z.string(), description: z.string() })).min(1).max(10),
  reasoning_summary: z.string().min(1),
});

export type ReasonedIntent = z.infer<typeof reasonedIntentSchema>;

const REASONER_SYSTEM_PROMPT = `You are an elite AI product designer who deeply understands consumer apps, SaaS tools, and AI services.

Your job: analyze a user's app idea — enriched with competitive research context when available — and extract PRECISE structured intent for building a polished, commercially-viable AI product.

ICON RULES (CRITICAL — ABSOLUTE REQUIREMENT):
- ALL icons MUST be Lucide React icon component names in PascalCase
- Common icons: Search, Star, ArrowRight, Zap, FileText, BarChart2, Upload, Download, Settings, Home, History, RefreshCw, Utensils, Dumbbell, Brain, Palette, Code, Mail, MessageSquare, Calendar, Target, TrendingUp, Shield, Heart, BookOpen, Briefcase, DollarSign, PieChart, Camera, Mic, Globe, Clock, CheckCircle, AlertTriangle, Layers, Grid, List, Hash, Tag, Award, Bookmark, Compass, MapPin, Phone, Video, Music, Image, Film, Headphones, Wifi, Database, Server, Terminal, GitBranch, Package, Truck, ShoppingCart, CreditCard, Users, UserPlus, Lock, Unlock, Eye, EyeOff, Bell, Volume2, Sun, Moon, Cloud, Thermometer, Droplet, Wind, Flame, Sparkles, Wand2, Scissors, Pen, Type, AlignLeft, LayoutDashboard, PanelLeft, Activity, LineChart, Gauge, CircleDot
- NEVER use emoji characters. Not for app_icon, not for nav tab icons, not anywhere.

LAYOUT SELECTION RULES:
- "analyzer" -> app SCANS or EVALUATES something and returns a score/breakdown (food scanner, resume checker, SEO analyzer, essay grader, code reviewer)
- "generator" -> app CREATES new content from inputs (email writer, caption generator, cover letter, ad copy, story writer)
- "tool" -> app CALCULATES, CONVERTS, or TRANSFORMS (pricing calculator, unit converter, formatter)
- "dashboard" -> app shows OVERVIEW stats, metrics, or a summary view with main action
- "planner" -> app builds STRUCTURED PLANS with steps, timelines, or schedules (meal planner, study schedule, project roadmap)

OUTPUT FORMAT RULES:
- "score_card" -> output includes a score/grade + breakdown (resume scorer, food analyzer, code quality)
- "cards" -> output is multiple distinct items (email variants, content ideas, flashcards, keyword groups)
- "report" -> detailed narrative with sections (contract review, market analysis, research summary)
- "list" -> ordered steps or checklist (action items, task breakdown, recommendations)
- "markdown" -> default rich formatted content with headers and structure
- "plain" -> simple conversational response

VISUAL STYLE KEYWORDS (pick 2-5 that fit the domain):
- "minimal" / "clean" / "spacious" — professional tools, productivity, enterprise
- "dark" / "moody" / "rich" — developer tools, gaming, media, premium
- "vibrant" / "energetic" / "bold" — fitness, social, creative, youth-oriented
- "glassmorphic" / "frosted" / "layered" — modern SaaS, dashboards, analytics
- "warm" / "organic" / "earthy" — food, wellness, lifestyle, health
- "corporate" / "structured" / "authoritative" — finance, legal, enterprise, compliance
- "playful" / "rounded" / "friendly" — education, consumer, onboarding

NAVIGATION RULES:
ALWAYS generate 2-4 tabs. NEVER just 1.
Tab 1: Main action/tool (the core feature users come for)
Tab 2: Results history or secondary action
Tab 3 (optional): Related tool, insights, or settings
Tab 4 (optional): Profile, about, or advanced features
Each tab's "purpose" MUST describe SPECIFIC UI elements to build — not just a vague description. Example: "Dashboard showing saved recipes as cards with title, cook time, difficulty, and category. Search bar at top, category filter chips, and Add Recipe button." NOT just "View recipes".

COLOR SELECTION:
Choose colors that match the domain psychology. Professional apps use cooler tones (blue, slate, indigo). Health/fitness uses greens and oranges. Creative tools use purples, pinks, and vibrant tones. Finance uses deep blues, greens, and teals. Never use pure red as a primary color — it signals danger.

LAYOUT BLUEPRINT (specify the spatial layout pattern):
- "centered-hero-input-results": Hero header with centered input and results below (best for analyzers)
- "split-form-output": Left form panel + right output panel (best for generators)
- "centered-card-tool": Single centered card with input/output (best for tools)
- "grid-dashboard": Stat grid + main content area (best for dashboards)
- "timeline-planner": Config panel + timeline view (best for planners)

ANIMATION KEYWORDS (pick 1-3 that match the product personality):
- Professional/Clinical: "smooth", "subtle", "precise"
- Consumer/Fun: "bouncy", "playful", "energetic"
- Premium/Luxury: "elegant", "slow", "refined"
- Technical/Developer: "snappy", "sharp", "minimal"

QUALITY STANDARD:
This app must feel like a COMMERCIAL PRODUCT someone would pay $29/month for. All field labels must be domain-specific. No generic placeholders. No chatbox interfaces. Every design choice should be informed by what real products in this space look like.
IMPORTANT: The app's DEFAULT PAGE should be the CORE FUNCTIONALITY — not a marketing landing page. Users want to see the actual product immediately, not a sales pitch. Design tabs around what the user will actually DO in the app.

NARRATIVE FIELD:
Write a 1-2 sentence "narrative" as a product description (NOT first person — no "I'll" or "I will") describing what's being built and WHY it's useful. Be specific about the domain and value proposition. Example: "A smart clipboard manager that stores, organizes, and makes your clipboard history searchable and easily accessible."

FEATURE DETAILS:
For each item in premium_features, provide a matching entry in feature_details with a "name" (same as the feature) and a "description" that explains what UI component it maps to and what it does. Be specific about the interaction.
Example: { name: "Clipboard History", description: "Scrollable list of copied items with search, one-click re-copy, and pin-to-top. Each item shows preview text, timestamp, and source app." }
NOT vague descriptions like "Stores things you copy" — describe the ACTUAL UI that should be built.

When competitive research context is provided, USE IT to inform your decisions about features, colors, layout, and terminology. Do not ignore it.

Extract the user's intent even if their prompt has typos or is vague. Infer from context.`;

const toolInputSchema = {
  type: "object" as const,
  additionalProperties: false,
  properties: {
    normalized_prompt: { type: "string" },
    app_name_hint: { type: "string", description: "Short, catchy product name (2-3 words)" },
    primary_goal: { type: "string" },
    domain: { type: "string" },
    reference_app: { type: "string" },
    design_philosophy: { type: "string" },
    target_user: { type: "string", description: "Who is the primary user? e.g. 'Freelance designers' or 'College students'" },
    key_differentiator: { type: "string", description: "What makes this app stand out from competitors?" },
    visual_style_keywords: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      maxItems: 5,
      description: "Visual style descriptors like 'minimal', 'dark', 'glassmorphic', 'warm'",
    },
    premium_features: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      maxItems: 5,
      description: "Key features that make this feel like a paid product",
    },
    nav_tabs: {
      type: "array",
      minItems: 2,
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          icon: { type: "string", description: "Lucide React icon name in PascalCase, e.g. 'Search', 'BarChart2', 'Settings'" },
          layout: { type: "string", enum: ["tool", "analyzer", "generator", "dashboard", "planner"] },
          purpose: { type: "string" },
        },
        required: ["id", "label", "icon", "layout", "purpose"],
      },
    },
    primary_color: { type: "string", description: "Hex color e.g. #22c55e — chosen based on domain psychology" },
    theme_style: { type: "string", enum: ["light", "dark", "vibrant"] },
    app_icon: { type: "string", description: "Lucide React icon name in PascalCase, e.g. 'Utensils', 'FileText', 'Zap'" },
    output_format_hint: { type: "string", enum: ["markdown", "cards", "score_card", "report", "list", "plain"] },
    layout_blueprint: { type: "string", description: "Spatial layout pattern: 'centered-hero-input-results', 'split-form-output', 'centered-card-tool', 'grid-dashboard', or 'timeline-planner'" },
    animation_keywords: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 3, description: "Animation style words: e.g. ['smooth', 'subtle', 'precise'] or ['bouncy', 'playful', 'energetic']" },
    narrative: { type: "string", description: "1-2 sentence product description (NOT first-person): 'A smart clipboard manager that stores, organizes, and makes your clipboard history searchable.'" },
    feature_details: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string", description: "Feature name (2-4 words)" },
          description: { type: "string", description: "One sentence explaining what this feature does for the user" },
        },
        required: ["name", "description"],
      },
      minItems: 1,
      maxItems: 10,
      description: "Key features with short user-facing descriptions",
    },
    reasoning_summary: { type: "string" },
  },
  required: [
    "normalized_prompt", "app_name_hint", "primary_goal", "domain",
    "design_philosophy", "target_user", "key_differentiator",
    "visual_style_keywords", "premium_features",
    "nav_tabs", "primary_color", "theme_style",
    "app_icon", "output_format_hint",
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

/* ---------- Kimi (Moonshot) reasoner — JSON mode (no tool_choice, compatible with thinking models) ---------- */
async function runKimiReasoner(
  prompt: string,
  contextBrief?: AppContextBrief | null,
): Promise<ReasonedIntent | null> {
  const kimiKey = process.env.KIMI_API_KEY!;
  const client = new OpenAI({
    apiKey: kimiKey,
    baseURL: process.env.KIMI_BASE_URL ?? "https://api.moonshot.ai/v1",
  });
  const model = process.env.KIMI_MODEL ?? "kimi-k2.5";
  const timeoutMs = Number(process.env.STARTBOX_REASONER_TIMEOUT_MS ?? 60000);
  const contextSection = buildContextSection(contextBrief);

  const jsonInstruction = `\n\nRESPOND WITH A SINGLE VALID JSON OBJECT containing these fields:
normalized_prompt (string), app_name_hint (string, 2-3 words), primary_goal (string), domain (string), reference_app (string, optional), design_philosophy (string), target_user (string), key_differentiator (string), visual_style_keywords (string array, 2-5), premium_features (string array, 2-5), nav_tabs (array of {id, label, icon, layout, purpose} — 2-4 tabs, layout must be one of: tool/analyzer/generator/dashboard/planner), primary_color (hex string like #6366f1), theme_style ("light"|"dark"|"vibrant"), app_icon (Lucide PascalCase name), output_format_hint ("markdown"|"cards"|"score_card"|"report"|"list"|"plain"), layout_blueprint (string, optional), animation_keywords (string array, 1-3, optional), narrative (string, 1-2 sentences), feature_details (array of {name, description}), reasoning_summary (string).
NO markdown. NO code fences. Just the raw JSON object.`;

  const userMessage = `Analyze this app idea and extract precise build intent:\n\n"${prompt}"${contextSection}\n\nUse Lucide icon names (PascalCase) for ALL icons — NEVER emoji.${jsonInstruction}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await client.chat.completions.create({
      model,
      max_tokens: 4096,
      messages: [
        { role: "system", content: REASONER_SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      response_format: { type: "json_object" },
    }, { signal: controller.signal });

    clearTimeout(timer);

    // Kimi pricing estimate: ~$0.60/M input, ~$2/M output
    const usage = response.usage;
    if (usage) {
      recordSpend((
        (usage.prompt_tokens ?? 0) * 0.60 +
        (usage.completion_tokens ?? 0) * 2.00
      ) / 1_000_000);
    }

    const content = response.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);
    return reasonedIntentSchema.parse(parsed);
  } catch (e) {
    clearTimeout(timer);
    console.error("Kimi reasoner failed:", e);
    return null;
  }
}

/* ---------- Anthropic reasoner ---------- */
async function runAnthropicReasoner(
  prompt: string,
  contextBrief?: AppContextBrief | null,
): Promise<ReasonedIntent | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY!;
  const client = new Anthropic({ apiKey, maxRetries: 0 });
  const timeoutMs = Number(process.env.STARTBOX_REASONER_TIMEOUT_MS ?? 30000);
  const contextSection = buildContextSection(contextBrief);

  const response = await withTimeout(
    (signal) => client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      system: [
        {
          type: "text" as const,
          text: REASONER_SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" as const },
        },
      ],
      messages: [{
        role: "user",
        content: `Analyze this app idea and extract precise build intent:\n\n"${prompt}"${contextSection}\n\nReturn structured intent for building this as a polished AI product. Use Lucide icon names (PascalCase) for ALL icons — NEVER emoji.`,
      }],
      tools: [{
        name: "extract_intent",
        description: "Extract structured app-building intent from a prompt",
        input_schema: toolInputSchema,
        cache_control: { type: "ephemeral" as const },
      }],
      tool_choice: { type: "tool", name: "extract_intent" },
    }, { signal }),
    timeoutMs,
    "Prompt reasoner",
  );

  // Haiku pricing: $0.80/M input, $4/M output, cache read $0.08/M, cache write $1/M
  const u = response.usage as unknown as Record<string, number>;
  const cr = u.cache_read_input_tokens ?? 0;
  const cw = u.cache_creation_input_tokens ?? 0;
  const uc = u.input_tokens - cr - cw;
  recordSpend((uc * 0.80 + cw * 1 + cr * 0.08 + u.output_tokens * 4) / 1_000_000);

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") return null;

  return reasonedIntentSchema.parse(toolUse.input);
}

/* ---------- Main entry point — prefers Kimi, falls back to Anthropic ---------- */
export async function translateEnglishPromptWithReasoning(
  prompt: string,
  contextBrief?: AppContextBrief | null,
): Promise<ReasonedIntent | null> {
  const useKimi = !!process.env.KIMI_API_KEY;
  const useAnthropic = !!process.env.ANTHROPIC_API_KEY;

  if (!useKimi && !useAnthropic) return null;

  try {
    if (useKimi) {
      console.log("[Reasoner] Using Kimi API");
      return await runKimiReasoner(prompt, contextBrief);
    } else {
      console.log("[Reasoner] Using Anthropic API");
      return await runAnthropicReasoner(prompt, contextBrief);
    }
  } catch (e) {
    console.error("Reasoner failed:", e);
    return null;
  }
}
