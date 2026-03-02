import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { randomUUID } from "node:crypto";
import type { ReasonedIntent } from "./reasoner.js";
import { scoreGeneratedCode } from "./qualityScorer.js";
import { recordSpend } from "./costTracker.js";
import type { ProgressCallback } from "./progressEmitter.js";
import type { PipelineRunArtifact, QualityBreakdown } from "../types/index.js";


export interface CodeGenerationResult {
  generated_code: string;
  app_name: string;
  tagline: string;
  primary_color: string;
  icon: string;
  pages: string[];
  quality_score: number;
  quality_breakdown: QualityBreakdown;
  pipeline_artifact: PipelineRunArtifact;
}

/* ------------------------------------------------------------------ */
/*  System prompt — JSX + design-system-driven code generation          */
/* ------------------------------------------------------------------ */

function buildCodeGenSystemPrompt(themeStyle: string): string {
  const isDark = themeStyle === 'dark';
  const isVibrant = themeStyle === 'vibrant';
  const darkMode = isDark || isVibrant;

  return `You generate COMPLETE, WORKING single-file React apps. Your code runs in a browser via Babel — it must work on first render with zero errors.

=== ENVIRONMENT (all pre-loaded as globals — NEVER use import/export/require) ===
Globals: React, ReactDOM, window.LucideReact (icons), window.__sb (SDK), Tailwind CSS v3
Last line MUST be: ReactDOM.createRoot(document.getElementById('root')).render(<App />);

=== MANDATORY FIRST LINES ===
const {useState, useEffect, useRef, useCallback, useMemo} = React;
const {Search, Plus, X, Check, ChevronDown, Settings, Home, Star, Heart, User, /* ...only icons you need */} = window.LucideReact || {};
const cn = window.__sb.cn;
const P = '#HEX'; // your chosen primary color
document.documentElement.style.setProperty('--sb-primary', P);
document.documentElement.style.setProperty('--sb-primary-glow', window.__sb.color(P, 0.2));
document.documentElement.style.setProperty('--sb-primary-bg', window.__sb.color(P, 0.12));

=== SDK ===
window.__sb.useStore(key, default) — persistent state hook (survives page nav)
window.__sb.toast(msg, 'success'|'error'|'info') — toast notification
window.__sb.fmt.date(d), .time(d), .number(n), .currency(n), .percent(n), .relative(d)
window.__sb.color(hex, opacity) — rgba string
window.__sb.cn(...args) — className joiner (falsy values filtered)
window.__sb.copy(text) — clipboard + toast
await window.__sbAI(systemPrompt, userMessage) — AI call, returns string

=== SAFE LUCIDE ICONS (only use these — others may not exist) ===
Search, Plus, X, Check, ChevronDown, ChevronRight, ChevronLeft, ChevronUp, Star, Heart, Settings, Home, User, Users, Mail, Phone, Calendar, Clock, MapPin, Filter, Edit, Trash2, Download, Upload, Share2, ExternalLink, BarChart2, TrendingUp, Activity, Zap, Award, Target, BookOpen, FileText, Image, Camera, Music, Play, Pause, Volume2, Wifi, Globe, Lock, Eye, EyeOff, Bell, AlertCircle, Info, ArrowLeft, ArrowRight, ArrowUp, ArrowDown, RefreshCw, Copy, Save, Folder, File, Code, Terminal, Grid, List, Menu, MoreHorizontal, Bookmark, Tag, Send, MessageCircle, ShoppingCart, CreditCard, DollarSign, Package, Box, Sparkles, Wand2, Palette, Layers, Layout, Move, Hash, Link

=== WORKING APP SKELETON (follow this pattern exactly) ===

// 1. DEFINE DATA before any components
const INITIAL_ITEMS = [
  {id: 1, name: 'Realistic Item Name', category: 'Domain Category', status: 'active', value: 85, date: '2024-03-15'},
  // ... 8-15 realistic items with domain-specific fields
];

// 2. DEFINE HELPER COMPONENTS (small, reusable)
function StatCard({label, value, icon: Icon, trend}) {
  return <div className="bg-white rounded-xl border border-gray-200 p-4">
    <div className="flex items-center justify-between mb-2">
      <span className="text-sm text-gray-500">{label}</span>
      {Icon && <Icon className="w-4 h-4 text-gray-400" />}
    </div>
    <div className="text-2xl font-bold text-gray-900">{value}</div>
    {trend && <span className="text-xs text-green-600">+{trend}%</span>}
  </div>;
}

// 3. MAIN APP — single component with page routing
function App() {
  const [page, setPage] = useState('main_tab_id');
  const [items, setItems] = window.__sb.useStore('app_items', INITIAL_ITEMS);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);

  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

  return <div className="min-h-screen bg-gray-50">
    {/* NAV */}
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <span className="font-semibold text-gray-900">AppName</span>
        <div className="flex gap-1">
          {[{id:'tab1',label:'Tab 1',icon:Home}, {id:'tab2',label:'Tab 2',icon:Settings}].map(t =>
            <button key={t.id} onClick={() => setPage(t.id)}
              className={cn("px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                page === t.id ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-900")}>
              <t.icon className="w-4 h-4 inline mr-1.5" />{t.label}
            </button>
          )}
        </div>
      </div>
    </nav>
    {/* PAGES */}
    <div className="max-w-5xl mx-auto px-6 py-8">
      {page === 'tab1' && <div>/* Full working UI with state, interactions, data display */</div>}
      {page === 'tab2' && <div>/* Full working UI */</div>}
    </div>
    {/* MODALS */}
    {showModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowModal(false)}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>/* form */</div>
    </div>}
  </div>;
}
ReactDOM.createRoot(document.getElementById('root')).render(<App />);

=== YOUR #1 JOB: BUILD THE ACTUAL THING THE USER ASKED FOR ===

RULE: The HERO of the app is the MAIN VISUAL/INTERACTIVE ELEMENT — not settings panels, not controls, not lists.
If user says "solar system" → a visual solar system with orbiting planets MUST be on screen
If user says "chess" → a chess board with pieces MUST be on screen
If user says "drawing app" → a canvas you can draw on MUST be on screen
If user says "music player" → audio controls with waveform MUST be on screen
If user says "calculator" → the calculator interface MUST be on screen
If user says "dashboard" → charts and data cards MUST be on screen

BUILD ORDER (follow this exactly):
1. FIRST: Build the core visual element (the thing the user actually wants to see/use)
2. SECOND: Add interactivity (click handlers, state changes, controls)
3. THIRD: Add supporting pages/features
4. LAST: Polish with navigation, settings, extras

NEVER build a settings/controls page without the actual thing it controls.
NEVER build an empty "coming soon" page.
NEVER build a marketing landing page.

FOR VISUAL APPS (games, 3D, visualizers, simulators, creative tools):
- The visual element must take up at least 50% of the viewport
- Use CSS 3D transforms, SVG, or Canvas — NOT just text and cards
- Example: a solar system needs circles orbiting around a center with CSS animations, not a list of planet names
- Example: a Rubik's cube needs a 3D cube with colored faces, not buttons labeled U/R/F

FOR DATA APPS (trackers, planners, CRM, dashboards):
- Show real populated data on first load (8-15 realistic items)
- Build working CRUD: add, edit, delete with modals
- Build search + filter that actually works

STYLING RULES:
- ALWAYS use Tailwind classes on buttons: className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium text-sm transition-colors"
- ALWAYS use Tailwind classes on cards: className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
- NEVER leave elements unstyled — every button, input, card, and container needs proper Tailwind classes
- Text must be readable: use text-gray-900 for headings, text-gray-600 for body text on light backgrounds
- Use ${darkMode ? 'text-white for headings, text-gray-400 for body' : 'text-gray-900 for headings, text-gray-600 for body'}

=== THEME: ${themeStyle.toUpperCase()} ===
${darkMode ? `DARK: bg-[#09090b] page, bg-white/[0.04] cards, border-white/[0.08], text-white headings, text-gray-400 body` :
`LIGHT: bg-gray-50 page, bg-white cards, border-gray-200, shadow-sm, text-gray-900 headings, text-gray-600 body`}

=== PRE-LOADED CSS SHORTCUTS (optional — Tailwind preferred) ===
sb-nav/sb-nav-dark, sb-nav-brand, sb-nav-tabs, sb-nav-tab + .active, glass-btn/glass-btn-primary/glass-btn-gradient, glass-input/sb-dark-input, sb-tag + sb-tag-success/warning/error/primary, sb-toggle + .on, sb-stagger (auto-animates children), sb-stat, sb-card, glass-elevated, sb-chip + .active, sb-list-item, sb-progress + sb-progress-fill, sb-avatar, sb-table/sb-th/sb-td, sb-badge, sb-timeline-item/sb-timeline-dot, sb-form-group, sb-search

=== CODE RELIABILITY (your code MUST compile and render) ===
1. NEVER use import/export/require — everything is global
2. NEVER destructure icons not in the safe list above
3. ALL useState MUST have default values — never useState() without argument
4. Define ALL data arrays BEFORE components that use them
5. onClick must be a function reference: onClick={() => fn()}, NOT onClick={fn()}
6. NEVER use optional chaining on component props inside JSX without fallback
7. Animations: pre-loaded keyframes available: fadeIn, slideUp, slideDown, scaleIn, bounceIn, slideInLeft, slideInRight, countUp, pulse, spin, glow, float, shimmer

ZERO emoji. ZERO markdown fences. ZERO "Powered by AI". Output ONLY the JSX code.`;
}

const codeGenToolSchema = {
  type: "object" as const,
  additionalProperties: false,
  properties: {
    generated_code: {
      type: "string",
      description: "The complete single-file React JSX application code. ZERO emoji characters allowed.",
    },
    app_name: {
      type: "string",
      description: "Short, catchy product name (2-3 words max)",
    },
    tagline: {
      type: "string",
      description: "One-line value proposition (under 60 chars)",
    },
    primary_color: {
      type: "string",
      description: "Primary accent hex color e.g. #22c55e",
    },
    icon: {
      type: "string",
      description: "Lucide React icon name in PascalCase, e.g. 'Utensils', 'FileText', 'Zap'",
    },
    pages: {
      type: "array",
      items: { type: "string" },
      description: "List of page/tab names in the app",
    },
  },
  required: ["generated_code", "app_name", "tagline", "primary_color", "icon", "pages"],
};

const QUALITY_GATE_SCORE = 78;


function cleanGeneratedCode(rawCode: string): string {
  let code = (rawCode ?? "")
    .replace(/^```(?:jsx?|tsx?|javascript)?\n?/m, "")
    .replace(/\n?```$/m, "")
    .trim();

  // Strip any import/export statements (common LLM mistake — breaks Babel in-browser)
  code = code.replace(/^import\s+.*?from\s+['"][^'"]+['"];?\s*$/gm, '');
  code = code.replace(/^export\s+(default\s+)?/gm, '');

  // Ensure render call exists — if missing, append it
  if (code.length > 100 && !code.includes('createRoot')) {
    code += '\nReactDOM.createRoot(document.getElementById("root")).render(<App />);';
  }

  return code;
}

function validateGeneratedCode(code: string): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (!code || code.length < 200) {
    issues.push('Code is too short (< 200 chars)');
  }
  if (!code.includes('useState')) {
    issues.push('Missing useState — app likely has no interactivity');
  }
  if (!code.includes('function App') && !code.includes('const App')) {
    issues.push('Missing App component definition');
  }
  if (!code.includes('createRoot') && !code.includes('ReactDOM.render')) {
    issues.push('Missing render call');
  }
  if (/^import\s+/m.test(code)) {
    issues.push('Contains import statements (will break in-browser Babel)');
  }

  return { valid: issues.length === 0, issues };
}

function classifyComponent(name: string): string {
  if (name === 'App') return 'pages/App';
  if (/Nav|Header|Footer|Sidebar|Layout|TopBar/i.test(name)) return `components/layout/${name}`;
  if (/Card|List|Grid|Item|Badge|Tag|Chip|Row|Cell/i.test(name)) return `components/ui/${name}`;
  if (/Modal|Dialog|Popup|Drawer|Sheet|Toast/i.test(name)) return `components/overlay/${name}`;
  if (/Score|Ring|Chart|Graph|Meter|Gauge/i.test(name)) return `components/data/${name}`;
  return `components/${name}`;
}

/* ------------------------------------------------------------------ */
/*  Kimi (Moonshot) code generation — JSON mode (compatible with       */
/*  thinking models like kimi-k2.5 that reject tool_choice)            */
/* ------------------------------------------------------------------ */

async function runKimiCodeGeneration(
  client: OpenAI,
  modelId: string,
  systemPrompt: string,
  userMessage: string,
  onProgress?: ProgressCallback,
): Promise<CodeGenerationResult | null> {
  const timeoutMs = Number(process.env.STARTBOX_CODEGEN_TIMEOUT_MS ?? 300000);
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

  // Append JSON output instruction to system prompt
  const jsonSystemPrompt = systemPrompt + `\n\nOUTPUT FORMAT: Return a single JSON object with these fields:
- "generated_code": string — the complete JSX application code (no markdown fences)
- "app_name": string — short product name (2-3 words)
- "tagline": string — one-line value proposition
- "primary_color": string — hex color like #6366f1
- "icon": string — Lucide icon name in PascalCase
- "pages": string[] — list of page names
Return ONLY the JSON object. No explanation. No markdown.`;

  try {
    console.log(`[Kimi] Code gen starting — model: ${modelId}, timeout: ${timeoutMs}ms`);

    const stream = await client.chat.completions.create({
      model: modelId,
      messages: [
        { role: "system", content: jsonSystemPrompt },
        { role: "user", content: userMessage },
      ],
      response_format: { type: "json_object" },
      max_tokens: 65536,
      stream: true,
    }, { signal: controller.signal });

    // Accumulate content from streaming chunks (JSON mode uses content, not tool_calls)
    let contentAccumulator = "";
    const detectedComponents = new Set<string>();
    const componentPattern = /function\s+([A-Z][A-Za-z0-9]+)\s*\(/g;
    const constComponentPattern = /const\s+([A-Z][A-Za-z0-9]+)\s*=\s*(?:\(|function)/g;

    const charMilestones: Array<{ threshold: number; message: string; fired: boolean }> = [
      { threshold: 200, message: "Initializing project structure...", fired: false },
      { threshold: 2000, message: "Compiling component modules...", fired: false },
      { threshold: 5000, message: "Linking interactive elements...", fired: false },
      { threshold: 10000, message: "Bundling data layer...", fired: false },
      { threshold: 15000, message: "Optimizing render pipeline...", fired: false },
      { threshold: 20000, message: "Running final build pass...", fired: false },
    ];

    let inputTokens = 0;
    let outputTokens = 0;
    let finishReason = "";

    for await (const chunk of stream) {
      const choice = chunk.choices[0];
      if (!choice) continue;

      if (choice.finish_reason) {
        finishReason = choice.finish_reason;
      }

      // JSON mode streams content (not tool_calls)
      if (choice.delta?.content) {
        contentAccumulator += choice.delta.content;

        // Emit progress milestones based on accumulated length
        if (onProgress) {
          for (const m of charMilestones) {
            if (!m.fired && contentAccumulator.length >= m.threshold) {
              m.fired = true;
              onProgress({ type: 'writing', message: m.message, data: { milestone: true } });
            }
          }

          // Try to detect components in partial code
          const codeMatch = contentAccumulator.match(/"generated_code"\s*:\s*"([\s\S]*)/);
          if (codeMatch) {
            const partialCode = codeMatch[1];

            componentPattern.lastIndex = 0;
            let match: RegExpExecArray | null;
            while ((match = componentPattern.exec(partialCode)) !== null) {
              const name = match[1];
              if (!detectedComponents.has(name)) {
                detectedComponents.add(name);
                const path = classifyComponent(name);
                onProgress({ type: 'writing', message: `Wrote ${path}`, data: { component: name, path } });
              }
            }

            constComponentPattern.lastIndex = 0;
            while ((match = constComponentPattern.exec(partialCode)) !== null) {
              const name = match[1];
              if (!detectedComponents.has(name)) {
                detectedComponents.add(name);
                const path = classifyComponent(name);
                onProgress({ type: 'writing', message: `Wrote ${path}`, data: { component: name, path } });
              }
            }
          }
        }
      }

      // Capture usage from the final chunk
      if (chunk.usage) {
        inputTokens = chunk.usage.prompt_tokens ?? 0;
        outputTokens = chunk.usage.completion_tokens ?? 0;
      }
    }

    clearTimeout(timeoutHandle);

    console.log(`[Kimi] Stream completed — finish: ${finishReason}, content length: ${contentAccumulator.length}`);

    // Emit "created" for all detected components
    if (onProgress && detectedComponents.size > 0) {
      onProgress({ type: 'created', message: 'Created', data: { components: Array.from(detectedComponents) } });
    }

    // Estimate cost: Kimi K2.5 ~$0.60/M input, ~$2.00/M output
    const cost = (inputTokens * 0.60 + outputTokens * 2.00) / 1_000_000;
    console.log(`[Kimi] Tokens — input: ${inputTokens}, output: ${outputTokens} (est cost: $${cost.toFixed(4)})`);
    recordSpend(cost);

    if (!contentAccumulator || contentAccumulator.length < 50) {
      console.error("[Kimi] No content received from stream");
      return null;
    }

    // Parse the accumulated JSON
    let raw: Partial<CodeGenerationResult>;
    try {
      raw = JSON.parse(contentAccumulator);
    } catch {
      // If JSON is truncated, try to extract generated_code
      console.warn("[Kimi] Failed to parse JSON, attempting recovery...");
      const codeMatch = contentAccumulator.match(/"generated_code"\s*:\s*"([\s\S]*?)(?:"\s*,\s*"app_name|$)/);
      if (codeMatch) {
        const recoveredCode = codeMatch[1]
          .replace(/\\n/g, '\n')
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\')
          .replace(/\\t/g, '\t');
        raw = { generated_code: recoveredCode };
      } else {
        console.error("[Kimi] Could not recover code from truncated response");
        console.error("[Kimi] First 500 chars:", contentAccumulator.slice(0, 500));
        return null;
      }
    }

    let cleanCode = cleanGeneratedCode(raw.generated_code ?? "");
    if (!cleanCode) {
      console.error("[Kimi] Code generation produced empty code");
      return null;
    }

    const validation = validateGeneratedCode(cleanCode);
    if (!validation.valid) {
      console.warn(`[Kimi] Code validation issues: ${validation.issues.join(', ')}`);
    }

    return {
      generated_code: cleanCode,
      app_name: raw.app_name ?? "App",
      tagline: raw.tagline ?? "",
      primary_color: raw.primary_color ?? "#6366f1",
      icon: raw.icon ?? "Zap",
      pages: raw.pages ?? [],
      quality_score: 0,
      quality_breakdown: {} as QualityBreakdown,
      pipeline_artifact: {} as PipelineRunArtifact,
    };
  } catch (e) {
    clearTimeout(timeoutHandle);
    if (controller.signal.aborted) {
      throw new Error(`[Kimi] Code generation timed out after ${timeoutMs}ms`);
    }
    throw e;
  }
}

async function runToolCodeGeneration(
  client: Anthropic,
  modelId: string,
  systemPrompt: string,
  userMessage: string,
  onProgress?: ProgressCallback,
): Promise<CodeGenerationResult | null> {
  const timeoutMs = Number(process.env.STARTBOX_CODEGEN_TIMEOUT_MS ?? 120000);

  // Use streaming with AbortController so timeouts actually cancel the request
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

  try {
    console.log(`Code gen starting — model: ${modelId}, max_tokens: 16000, timeout: ${timeoutMs / 1000}s`);
    const stream = client.messages.stream({
      model: modelId,
      max_tokens: 16000,
      system: [
        {
          type: "text" as const,
          text: systemPrompt,
          cache_control: { type: "ephemeral" as const },
        },
      ],
      messages: [{ role: "user", content: userMessage }],
      tools: [
        {
          name: "generate_react_app",
          description:
            "Generate a complete, single-file React application with all features. ZERO emoji allowed.",
          input_schema: codeGenToolSchema,
          cache_control: { type: "ephemeral" as const },
        },
      ],
      tool_choice: { type: "tool", name: "generate_react_app" },
    }, { signal: controller.signal });

    stream.on('error', (err: unknown) => {
      console.error('Stream error event:', err);
    });

    // Hook into streaming to detect components + emit progress milestones in real-time
    const detectedComponents = new Set<string>();
    const componentPattern = /function\s+([A-Z][A-Za-z0-9]+)\s*\(/g;
    const constComponentPattern = /const\s+([A-Z][A-Za-z0-9]+)\s*=\s*(?:\(|function)/g;

    // Character-count milestones — distributed across the build timeline
    const charMilestones: Array<{ threshold: number; message: string; fired: boolean }> = [
      { threshold: 200, message: "Initializing project structure...", fired: false },
      { threshold: 1500, message: "Compiling component modules...", fired: false },
      { threshold: 4000, message: "Linking interactive elements...", fired: false },
      { threshold: 7000, message: "Bundling data layer...", fired: false },
      { threshold: 10000, message: "Optimizing render pipeline...", fired: false },
      { threshold: 13000, message: "Running final build pass...", fired: false },
    ];

    // Pattern-based milestones — contextual events when specific code patterns appear
    const patternMilestones: Array<{ pattern: RegExp; message: string; fired: boolean }> = [
      { pattern: /useState/, message: "Wiring up state hooks...", fired: false },
      { pattern: /LucideReact/, message: "Bundling icon assets...", fired: false },
      { pattern: /__sbAI/, message: "Mounting smart modules...", fired: false },
      { pattern: /useEffect/, message: "Registering lifecycle hooks...", fired: false },
      { pattern: /localStorage|useStore/, message: "Configuring local storage...", fired: false },
      { pattern: /animation|animate|keyframes/i, message: "Compiling animations...", fired: false },
    ];

    // Track the latest snapshot for truncation recovery
    let lastSnapshot: Record<string, unknown> = {};

    stream.on('inputJson', (_delta: string, snapshot: unknown) => {
      lastSnapshot = snapshot as Record<string, unknown>;
      if (!onProgress) return;
      const snap = lastSnapshot;
      const code = typeof snap?.generated_code === 'string' ? snap.generated_code : '';
      if (!code) return;

      // Emit character-count milestones
      for (const m of charMilestones) {
        if (!m.fired && code.length >= m.threshold) {
          m.fired = true;
          onProgress({ type: 'writing', message: m.message, data: { milestone: true } });
        }
      }

      // Emit pattern-based milestones
      for (const m of patternMilestones) {
        if (!m.fired && m.pattern.test(code)) {
          m.fired = true;
          onProgress({ type: 'writing', message: m.message, data: { milestone: true } });
        }
      }

      // Detect function components
      componentPattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = componentPattern.exec(code)) !== null) {
        const name = match[1];
        if (!detectedComponents.has(name)) {
          detectedComponents.add(name);
          const path = classifyComponent(name);
          onProgress({ type: 'writing', message: `Wrote ${path}`, data: { component: name, path } });
        }
      }

      // Detect const arrow components
      constComponentPattern.lastIndex = 0;
      while ((match = constComponentPattern.exec(code)) !== null) {
        const name = match[1];
        if (!detectedComponents.has(name)) {
          detectedComponents.add(name);
          const path = classifyComponent(name);
          onProgress({ type: 'writing', message: `Wrote ${path}`, data: { component: name, path } });
        }
      }
    });

    console.log('Waiting for stream.finalMessage()...');
    const response = await stream.finalMessage();
    console.log(`Stream completed — stop_reason: ${response.stop_reason}, content blocks: ${response.content.length}`);

    // Emit "created" for all detected components after stream completes
    if (onProgress && detectedComponents.size > 0) {
      onProgress({ type: 'created', message: 'Created', data: { components: Array.from(detectedComponents) } });
    }
    clearTimeout(timeoutHandle);

    const usage = response.usage as unknown as Record<string, number>;
    const cacheRead = usage.cache_read_input_tokens ?? 0;
    const cacheCreate = usage.cache_creation_input_tokens ?? 0;
    const uncached = usage.input_tokens - cacheRead - cacheCreate;
    // Sonnet pricing: $3/M input, $15/M output, cache write $3.75/M, cache read $0.30/M
    const cost = ((uncached * 3 + cacheCreate * 3.75 + cacheRead * 0.30 + usage.output_tokens * 15) / 1_000_000);
    console.log(`Code gen tokens — input: ${usage.input_tokens} (cached: ${cacheRead}, wrote: ${cacheCreate}), output: ${usage.output_tokens} (est cost: $${cost.toFixed(3)})`);
    recordSpend(cost);

    if (response.stop_reason === "max_tokens") {
      console.warn("Code generation hit max_tokens limit — output may be truncated");
      onProgress?.({ type: 'status', message: 'Extracting build output...' });
    }

    const toolUse = response.content.find((b) => b.type === "tool_use");
    let raw: Partial<CodeGenerationResult>;

    if (toolUse && toolUse.type === "tool_use") {
      raw = toolUse.input as CodeGenerationResult;
    } else if (response.stop_reason === "max_tokens" && lastSnapshot.generated_code) {
      // Truncated — recover from streaming snapshot
      console.warn("Recovering code from streaming snapshot (max_tokens truncation)");
      raw = lastSnapshot as Partial<CodeGenerationResult>;
    } else {
      console.error("No tool_use block in response. stop_reason:", response.stop_reason, "content types:", response.content.map(b => b.type));
      onProgress?.({ type: 'status', message: 'Retrying build extraction...' });
      return null;
    }

    let cleanCode = cleanGeneratedCode(raw.generated_code ?? "");

    // If code is empty but snapshot has code, try recovering from snapshot
    if (!cleanCode && typeof lastSnapshot.generated_code === 'string' && lastSnapshot.generated_code.length > 100) {
      console.warn(`Recovering from streaming snapshot — snapshot code length: ${(lastSnapshot.generated_code as string).length}`);
      cleanCode = cleanGeneratedCode(lastSnapshot.generated_code as string);
    }

    if (!cleanCode) {
      console.error("Code generation produced empty code after cleaning. Raw length:", (raw.generated_code ?? "").length, "Snapshot length:", typeof lastSnapshot.generated_code === 'string' ? lastSnapshot.generated_code.length : 0);
      return null;
    }

    const validation = validateGeneratedCode(cleanCode);
    if (!validation.valid) {
      console.warn(`Code validation issues: ${validation.issues.join(', ')}`);
    }

    return {
      generated_code: cleanCode,
      app_name: raw.app_name ?? "App",
      tagline: raw.tagline ?? "",
      primary_color: raw.primary_color ?? "#6366f1",
      icon: raw.icon ?? "Zap",
      pages: raw.pages ?? [],
      quality_score: 0,
      quality_breakdown: {} as QualityBreakdown,
      pipeline_artifact: {} as PipelineRunArtifact,
    };
  } catch (e) {
    clearTimeout(timeoutHandle);
    if (controller.signal.aborted) {
      throw new Error(`Code generation timed out after ${timeoutMs}ms`);
    }
    throw e;
  }
}

export async function generateReactCode(
  intent: ReasonedIntent,
  originalPrompt: string,
  model: "sonnet" | "opus" = "sonnet",
  onProgress?: ProgressCallback,
): Promise<CodeGenerationResult | null> {
  const kimiKey = process.env.KIMI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!kimiKey && !anthropicKey) return null;

  const themeStyle = intent.theme_style ?? 'light';

  // Build theme-aware system prompt
  const systemPrompt = buildCodeGenSystemPrompt(themeStyle);

  const tabList = intent.nav_tabs.map(t =>
    `  ${t.id}: "${t.label}" (icon: ${t.icon}, layout: ${t.layout}) — ${t.purpose}`
  ).join("\n");

  const featureDetails = (intent.feature_details ?? []).map(f =>
    `  - ${f.name}: ${f.description}`
  ).join("\n");

  const layoutBlueprint = intent.layout_blueprint ?? 'centered-hero-input-results';
  const visualKeywords = intent.visual_style_keywords?.join(', ') ?? 'clean, modern';
  const animKeywords = intent.animation_keywords?.join(', ') ?? 'smooth, subtle';

  const firstTab = intent.nav_tabs[0];
  const firstTabId = firstTab?.id ?? 'main';

  const baseUserMessage = [
    `Build: "${originalPrompt}"`,
    ``,
    `WHAT THE USER WANTS: ${intent.primary_goal}`,
    `The user expects to see a REAL, WORKING ${intent.domain} app — not a generic dashboard with placeholder buttons.`,
    ``,
    `APP INFO: ${intent.app_name_hint} | Color: ${intent.primary_color} | Theme: ${themeStyle}`,
    ``,
    `PAGES:`,
    tabList,
    `Default page: "${firstTabId}"`,
    ``,
    `KEY FEATURES:`,
    featureDetails || `  - ${intent.premium_features?.join("\n  - ") ?? "standard"}`,
    ``,
    `IMPORTANT — The CORE EXPERIENCE must be front-and-center on page load:`,
    `- If this is a visual app (game, solver, visualizer), the visual element MUST be visible immediately`,
    `- If this is a data app (tracker, CRM, planner), show populated data with working CRUD`,
    `- If this is a tool (calculator, converter, analyzer), show the tool interface ready to use`,
    `- NEVER show a landing page, hero section, or "Get Started" screen`,
    ``,
    `EVERY interactive element must work. Every button must have an onClick that changes state.`,
    `Use window.__sb.useStore() for persistent data. Use window.__sb.toast() for feedback.`,
    `Make it look like a real ${intent.domain} product with ${intent.primary_color} as primary color.`,
    ``,
    `OUTPUT: ONLY the complete JSX code. No markdown. No explanation.`,
  ].join("\n");

  try {
    let candidate: CodeGenerationResult | null = null;

    // Hybrid strategy: try Kimi first (cheap), fall back to Claude if quality is bad
    if (kimiKey) {
      const kimiClient = new OpenAI({
        apiKey: kimiKey,
        baseURL: process.env.KIMI_BASE_URL ?? "https://api.moonshot.ai/v1",
      });
      const kimiModel = process.env.KIMI_MODEL ?? "kimi-k2.5";
      console.log(`[hybrid] Trying Kimi (${kimiModel}) first for cost savings...`);
      try {
        candidate = await runKimiCodeGeneration(kimiClient, kimiModel, systemPrompt, baseUserMessage, onProgress);
      } catch (e) {
        console.warn("[hybrid] Kimi code gen threw:", e instanceof Error ? e.message : e);
        candidate = null;
      }

      // Validate Kimi output with REAL quality scoring — escalate to Claude if bad
      if (candidate) {
        const validation = validateGeneratedCode(candidate.generated_code);
        const code = candidate.generated_code;
        const codeLen = code.length;

        // Quick structural checks first
        if (!validation.valid || codeLen < 3000) {
          console.warn(`[hybrid] Kimi failed structural check (${codeLen} chars, valid=${validation.valid}). Issues: ${validation.issues.join(', ')}`);
          if (anthropicKey) {
            console.log("[hybrid] Escalating to Claude...");
            onProgress?.({ type: 'status', message: 'Improving quality with Claude...' });
            candidate = null;
          }
        } else {
          // Run the real quality scorer
          const kimiEval = scoreGeneratedCode({
            code,
            prompt: originalPrompt,
            outputFormat: intent.output_format_hint,
            requestedLayout: intent.layout_blueprint,
            requestedNavType: undefined,
            requestedMood: themeStyle,
          });

          // Check for specific red flags that indicate broken output
          const hasVisibleText = /text-gray-[6-9]00|text-black|text-white|text-\[#/.test(code);
          const hasRealData = (code.match(/['"][A-Z][a-z]{2,}/g) || []).length >= 5; // at least 5 capitalized string literals
          const hasWorkingHandlers = (code.match(/onClick\s*=\s*\{\s*\(\)\s*=>/g) || []).length >= 3; // at least 3 real click handlers

          const passesGate = kimiEval.quality_score >= QUALITY_GATE_SCORE
            && hasVisibleText
            && hasRealData
            && hasWorkingHandlers;

          if (!passesGate) {
            console.warn(`[hybrid] Kimi failed quality gate: score=${kimiEval.quality_score}/${QUALITY_GATE_SCORE}, visibleText=${hasVisibleText}, realData=${hasRealData}, handlers=${hasWorkingHandlers}`);
            console.warn(`[hybrid] Breakdown:`, JSON.stringify(kimiEval.quality_breakdown));
            if (anthropicKey) {
              console.log("[hybrid] Escalating to Claude for better quality...");
              onProgress?.({ type: 'status', message: 'Improving quality with Claude...' });
              candidate = null; // discard Kimi result
            } else {
              console.warn("[hybrid] No Anthropic key — using Kimi result despite low quality");
            }
          } else {
            console.log(`[hybrid] Kimi passed quality gate: score=${kimiEval.quality_score} — using it (saved Claude cost)`);
          }
        }
      }
    }

    // Claude fallback (or primary if no Kimi key)
    if (!candidate && anthropicKey) {
      const client = new Anthropic({ apiKey: anthropicKey!, maxRetries: 0 });
      const modelId = model === "opus" ? "claude-opus-4-6" : "claude-sonnet-4-6";
      console.log(`[hybrid] Using Claude (${modelId}) for code generation`);
      candidate = await runToolCodeGeneration(client, modelId, systemPrompt, baseUserMessage, onProgress);
    }

    if (!candidate) {
      console.error("Code generation returned null — no usable output from any provider");
      onProgress?.({ type: 'status', message: 'Build failed — retrying is recommended' });
      return null;
    }

    onProgress?.({ type: 'status', message: 'Running quality checks...' });

    const evaluation = scoreGeneratedCode({
      code: candidate.generated_code,
      prompt: originalPrompt,
      outputFormat: intent.output_format_hint,
      requestedLayout: intent.layout_blueprint,
      requestedNavType: undefined, // nav type not separate in reasoner
      requestedMood: themeStyle,
    });

    const pipelineArtifact: PipelineRunArtifact = {
      run_id: randomUUID(),
      stages: [
        "Research & Planning",
        "Code Generation",
        "Quality Scoring",
        "Finalize",
      ],
      selected_candidate: "A",
      candidates: [
        {
          id: "A",
          quality_score: evaluation.quality_score,
          quality_breakdown: evaluation.quality_breakdown,
        },
      ],
      repaired: false,
    };

    const result: CodeGenerationResult = {
      ...candidate,
      quality_score: evaluation.quality_score,
      quality_breakdown: evaluation.quality_breakdown,
      pipeline_artifact: pipelineArtifact,
    };
    console.log(
      `Code generation success: ${result.app_name}, ${result.generated_code.length} chars, score ${result.quality_score}`,
    );
    return result;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Code generation failed:", msg);
    onProgress?.({ type: 'status', message: `Build error: ${msg.slice(0, 100)}` });
    return null;
  }
}
