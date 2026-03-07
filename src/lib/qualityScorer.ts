import { createRequire } from "node:module";
import type { OutputFormat, QualityBreakdown } from "../types/index.js";
import {
  extractDomainKeywordsFromPrompt,
  keywordAppearsInText,
  normalizeDomainKeywords,
} from "./domainKeywords.js";

export interface QualityScoreInput {
  code: string;
  prompt: string;
  outputFormat: OutputFormat;
  requestedLayout?: string;
  requestedNavType?: string;
  requestedMood?: string;
  domainKeywords?: string[];
}

const WEIGHTS: Record<keyof QualityBreakdown, number> = {
  visual_richness:        0.25,  // does it LOOK polished and visually appealing?
  interaction_richness:   0.20,  // does the app actually work and feel interactive?
  visual_uniqueness:      0.15,  // does it look unique, not templated?
  domain_specificity:     0.15,  // is it specific to the prompt, not generic?
  content_layout_fit:     0.10,  // does the layout fit the content type?
  layout_diversity:       0.10,  // interesting layout choices
  form_styling:           0.03,  // are form elements styled?
  navigation_correctness: 0.02,  // correct nav pattern?
};

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function hasDomainTerm(codeLower: string, term: string): boolean {
  return keywordAppearsInText(codeLower, term);
}

/* ------------------------------------------------------------------ */
/*  Layout detection helpers                                           */
/* ------------------------------------------------------------------ */

function detectLayout(code: string): {
  hasSidebar: boolean;
  hasBottomNav: boolean;
  hasBentoGrid: boolean;
  hasSplitPanel: boolean;
  hasFullBleed: boolean;
  hasFloatingPill: boolean;
  hasFloatingCards: boolean;
  hasMagazine: boolean;
  hasKanban: boolean;
  isCenteredColumn: boolean;
  hasHamburger: boolean;
  hasSegmented: boolean;
  hasContextualTabs: boolean;
  hasBreadcrumb: boolean;
  hasTopBarTabs: boolean;
} {
  return {
    hasSidebar: /aside|sidebar|w-60|w-64|w-72|min-h-screen\s+border-r/i.test(code),
    hasBottomNav: /fixed\s+bottom|bottom-0.*justify-around|bottom.*tab.*bar|fixed.*bottom.*h-16/i.test(code),
    hasBentoGrid: /col-span-2.*row-span|grid-cols-4\s+gap|grid-cols-3.*col-span-2/i.test(code),
    hasSplitPanel: /w-\[4[05]%\]|w-\[5[05]%\]|flex.*flex-1.*border-r.*flex-1|grid-cols-2.*min-h/i.test(code),
    hasFullBleed: /w-full\s+py-(?:12|16|20)|section\s+className.*w-full/i.test(code),
    hasFloatingPill: /fixed\s+top-4.*rounded-full|translate-x.*rounded-full.*backdrop-blur/i.test(code),
    hasFloatingCards: /min-h-screen\s+bg-gradient.*glass/i.test(code),
    hasMagazine: /grid-cols-3.*col-span-2(?!.*row-span)/i.test(code),
    hasKanban: /overflow-x-auto.*gap-4.*min-h|kanban|flex.*gap-4.*overflow/i.test(code),
    isCenteredColumn: /max-w-(2xl|3xl)\s+mx-auto\s+px-5\s+py-6/i.test(code),
    hasHamburger: /hamburger|drawer|slide.*out|fixed.*left-0.*top-0.*w-72/i.test(code),
    hasSegmented: /segmented|rounded-lg\s+p-0\.5.*button.*bg-white.*shadow/i.test(code),
    hasContextualTabs: /chip.*active|tab.*active.*border-b/i.test(code),
    hasBreadcrumb: /breadcrumb|chevron.*text-sm.*text-gray/i.test(code),
    hasTopBarTabs: /nav.*tab|<nav\s/i.test(code),
  };
}

function detectContentLayoutMismatch(code: string, prompt: string): number {
  const promptLower = prompt.toLowerCase();
  let penalty = 0;

  const isCollectionContent = /collect(?:ion|ible)|trading|pokemon|recipe|product|listing|catalog|gallery|shop|marketplace|portfolio|showcase|browse|nft|inventory/i.test(promptLower);

  const hasSingleColumnStats = /flex\s+flex-col.*stat|space-y-\d+.*stat|flex-col.*gap-\d+.*stat/s.test(code);
  const hasGridCards = /grid-cols-(2|3|4).*gap/s.test(code);

  // Heavy penalty: collection content displayed as stat banners
  if (isCollectionContent && hasSingleColumnStats && !hasGridCards) {
    penalty += 25;
  }

  // Penalty: collection content without any grid
  if (isCollectionContent && !hasGridCards) {
    penalty += 15;
  }

  // Penalty: narrow container for collection content
  const hasOnlyNarrowContainer = /max-w-3xl\s+mx-auto/.test(code) && !hasGridCards;
  if (isCollectionContent && hasOnlyNarrowContainer) {
    penalty += 10;
  }

  return penalty;
}

function layoutMatchScore(detected: ReturnType<typeof detectLayout>, requested: string): number {
  const mapping: Record<string, keyof ReturnType<typeof detectLayout>> = {
    centered_column: "isCenteredColumn",
    bento_grid: "hasBentoGrid",
    sidebar_main: "hasSidebar",
    split_panel: "hasSplitPanel",
    full_bleed_sections: "hasFullBleed",
    floating_cards: "hasFloatingCards",
    magazine_layout: "hasMagazine",
    kanban_board: "hasKanban",
  };
  const key = mapping[requested];
  if (!key) return 50;
  return detected[key] ? 90 : 25;
}

function navMatchScore(detected: ReturnType<typeof detectLayout>, requested: string): number {
  const mapping: Record<string, keyof ReturnType<typeof detectLayout>> = {
    top_bar_tabs: "hasTopBarTabs",
    sidebar_nav: "hasSidebar",
    bottom_tab_bar: "hasBottomNav",
    floating_pill: "hasFloatingPill",
    contextual_tabs: "hasContextualTabs",
    breadcrumb_header: "hasBreadcrumb",
    hamburger_drawer: "hasHamburger",
    segmented_control: "hasSegmented",
  };
  const key = mapping[requested];
  if (!key) return 50;
  return detected[key] ? 90 : 20;
}

/* ------------------------------------------------------------------ */
/*  Main scorer                                                        */
/* ------------------------------------------------------------------ */

export function scoreGeneratedCode(input: QualityScoreInput): {
  quality_score: number;
  quality_breakdown: QualityBreakdown;
} {
  const code = input.code;
  const codeLower = code.toLowerCase();

  const detected = detectLayout(code);

  // --- layout_diversity ---
  let layoutScore: number;
  if (input.requestedLayout) {
    layoutScore = layoutMatchScore(detected, input.requestedLayout);
    if (input.requestedLayout !== "centered_column" && !detected.isCenteredColumn) {
      layoutScore = Math.min(100, layoutScore + 10);
    }
    if (input.requestedLayout !== "centered_column" && detected.isCenteredColumn) {
      layoutScore = Math.max(0, layoutScore - 20);
    }
  } else {
    const nonDefault = [detected.hasSidebar, detected.hasBottomNav, detected.hasBentoGrid,
      detected.hasSplitPanel, detected.hasFullBleed, detected.hasFloatingPill,
      detected.hasFloatingCards, detected.hasMagazine, detected.hasKanban];
    layoutScore = nonDefault.some(Boolean) ? 80 : 40;
  }

  // --- visual_uniqueness ---
  const templatePenalties = [
    /How It Works/i,
    /10k\+|50k\+|100k\+/,
    /4\.\d\s*rating/i,
    /Get Started|Start Now/i,
    /what you can create/i,
    /Lorem ipsum/i,
    /Sample\s+(text|item|data|product)/i,
    /Item\s+[1-9]\b/,
    /John\s+Doe|Jane\s+Doe/i,
  ].filter(p => p.test(code)).length;

  const uniqueSignals = [
    /col-span-2|row-span/,
    /fixed\s+bottom/,
    /aside.*border-r|sidebar/i,
    /rounded-full.*backdrop-blur/,
    /w-\[4[05]%\]/,
    /overflow-x-auto/,
    /masonry|columns-/i,
    /drag|sortable|reorder/i,
    /svg.*viewBox/i,
    /animate-|@keyframes/,
    /grid-cols-[3-6]/,
    /aspect-\[/,
    /var\(--sb-/,
    /useCallback|useMemo/,
  ].filter(p => p.test(code)).length;

  const uniquenessScore = clampScore(
    Math.max(0, 60 - templatePenalties * 8) + uniqueSignals * 6
  );

  // --- domain_specificity ---
  const curatedTerms = normalizeDomainKeywords(input.domainKeywords ?? [], { max: 15 });
  const promptTerms = extractDomainKeywordsFromPrompt(input.prompt, { max: 12 });
  const domainTerms = curatedTerms.length > 0 ? curatedTerms : promptTerms;

  let domainMatches = 0;
  for (const term of domainTerms) {
    if (hasDomainTerm(codeLower, term)) domainMatches += 1;
  }
  const domainRatio = domainTerms.length ? domainMatches / domainTerms.length : 0.5;
  const domainScore = clampScore(domainRatio * 100);

  // --- navigation_correctness ---
  let navScore: number;
  if (input.requestedNavType) {
    navScore = navMatchScore(detected, input.requestedNavType);
  } else {
    navScore = 70; // neutral
  }

  // --- interaction_richness ---
  const interactionSignals = [
    /onClick/, /onChange/, /transition/, /hover:/, /animate/, /useState/,
    /onSubmit/, /onKeyDown/, /useStore/, /toast\(/, /filter\(/, /\.sort\(/,
    /setInterval|setTimeout/, /\.map\(/, /set[A-Z]\w*\(/,
    /onDrag|draggable/, /useCallback/, /useRef/,
  ];
  const interactionScore = clampScore(
    (interactionSignals.filter(p => p.test(code)).length / interactionSignals.length) * 100
  );

  // --- visual_richness ---
  // Measures general visual polish — not tied to any specific design system
  const visualSignals = [
    // Gradient backgrounds
    /gradient|bg-gradient/,
    // Depth effects
    /backdrop-blur|shadow-(lg|xl|2xl)/,
    // Hover/focus effects
    /hover:-translate|hover:shadow|hover:scale|focus:ring/,
    // Typography quality
    /tracking-tight|font-black|font-extrabold/,
    /text-(3xl|4xl|5xl|6xl)/,
    // Animations and transitions
    /animate-|animation:|transition-all.*duration|@keyframes/,
    // Visual elements (SVG, charts, progress)
    /svg.*viewBox|stroke-dashoffset|polyline/i,
    // CSS custom properties for theming
    /var\(--|--[a-z]+-[a-z]+\s*:/,
    // Rounded and polished UI
    /rounded-(xl|2xl|3xl|full)/,
    // Generous spacing
    /py-(12|16|20|24)/,
    /gap-(5|6|8|10)/,
    /p-(5|6|8)/,
  ];
  let visualScore = clampScore(
    (visualSignals.filter(p => p.test(code)).length / visualSignals.length) * 100
  );

  // --- Typography hierarchy bonus ---
  // Reward clear heading size hierarchy (different sizes for different heading levels)
  const hasLargeHero = /text-(5xl|6xl|7xl)/.test(code);
  const hasMediumSection = /text-(xl|2xl|3xl)/.test(code);
  if (hasLargeHero && hasMediumSection) visualScore = clampScore(visualScore + 6);

  // Cramped spacing penalty
  const hasGenerousSpacing = /py-(12|16|20|24)/.test(code);
  const hasCrampedSpacing = /className="[^"]*py-[2-3]\b/.test(code) && !hasGenerousSpacing;
  if (hasCrampedSpacing) visualScore = clampScore(visualScore - 10);

  // --- form_styling ---
  const formElementCount = (code.match(/<input|<textarea|<select/g) || []).length;
  const styledFormCount = (code.match(/className="[^"]*"/g) || []).length;
  const bareFormElements = (code.match(/<(input|textarea|select)\s+(?!.*className)[^>]*>/g) || []).length;
  const formScore = clampScore(
    formElementCount === 0
      ? 80  // no forms = neutral
      : Math.max(0, 100 - bareFormElements * 20)
  );

  // --- content_layout_fit ---
  const mismatchPenalty = detectContentLayoutMismatch(code, input.prompt);
  let contentLayoutScore = 100 - mismatchPenalty;

  // Bonus for responsive grid patterns
  const hasResponsiveGrid = /grid-cols-1\s+sm:grid-cols-2|grid-cols-2\s+lg:grid-cols-3|sm:grid-cols-2\s+lg:grid-cols-4/.test(code);
  if (hasResponsiveGrid) contentLayoutScore = Math.min(100, contentLayoutScore + 10);

  // Bonus for mixing 3+ different card/section patterns
  const cardPatterns = [/rounded-xl.*shadow/, /border.*rounded/, /bg-gradient.*rounded/, /backdrop-blur.*rounded/, /overflow-hidden.*rounded/].filter(p => p.test(code)).length;
  if (cardPatterns >= 3) contentLayoutScore = Math.min(100, contentLayoutScore + 10);

  // Stat overuse penalty
  const statPatterns = (code.match(/stat|metric|kpi/gi) || []).length;
  const contentPatterns = (code.match(/card|grid|list/gi) || []).length;
  if (statPatterns > 6 && statPatterns > contentPatterns) contentLayoutScore -= 15;

  contentLayoutScore = clampScore(contentLayoutScore);

  // h() regression penalty — penalize React.createElement usage (should be JSX)
  const usesH = /const\s+h\s*=\s*React\.createElement/.test(code);
  const hPenalty = usesH ? 15 : 0;

  const breakdown: QualityBreakdown = {
    layout_diversity: clampScore(layoutScore - hPenalty),
    visual_uniqueness: clampScore(uniquenessScore - hPenalty),
    domain_specificity: domainScore,
    navigation_correctness: clampScore(navScore - hPenalty),
    interaction_richness: interactionScore,
    visual_richness: visualScore,
    form_styling: formScore,
    content_layout_fit: clampScore(contentLayoutScore - hPenalty),
  };

  const weighted = Object.keys(WEIGHTS).reduce((sum, key) => {
    const k = key as keyof QualityBreakdown;
    return sum + breakdown[k] * WEIGHTS[k];
  }, 0);

  return {
    quality_score: clampScore(weighted),
    quality_breakdown: breakdown,
  };
}

/* ------------------------------------------------------------------ */
/*  Retry feedback — focuses on functional issues, not design system   */
/* ------------------------------------------------------------------ */

export function generateRetryFeedback(
  breakdown: QualityBreakdown,
  code: string,
  requestedLayout?: string,
  requestedNavType?: string,
  domainKeywords?: string[],
  prompt?: string,
): string {
  const issues: string[] = [];

  if (breakdown.layout_diversity < 60) {
    issues.push(
      `Layout fell back to centered column. The requested layout was "${requestedLayout ?? 'non-default'}". ` +
      `Implement the specified page structure: use the correct grid, sidebar, split-panel, or other structural pattern. ` +
      `Do NOT use max-w-3xl mx-auto px-5 py-6 as a default wrapper.`
    );
  }

  if (breakdown.visual_uniqueness < 60) {
    issues.push(
      'The app looks too generic/templated. Remove filler text like "How It Works", "Get Started", fake social proof. ' +
      'Use domain-specific content and a layout that feels custom-designed for this specific app.'
    );
  }

  if (breakdown.domain_specificity < 60) {
    const curated = normalizeDomainKeywords(domainKeywords ?? [], { max: 15 });
    if (curated.length > 0) {
      const codeLower = code.toLowerCase();
      const missing = curated.filter((term) => !hasDomainTerm(codeLower, term)).slice(0, 10);
      if (missing.length > 0) {
        issues.push(
          `Domain specificity is too low. These domain terms are missing: ${missing.join(", ")}. ` +
          `Use them naturally in headings, labels, button text, card titles, and sample data values.`
        );
      } else {
        issues.push("Use richer domain-specific terminology in labels, categories, and sample data values — avoid generic copy.");
      }
    } else {
      issues.push("Use more domain-specific terminology in labels, categories, and data values — no generic text.");
    }
  }

  if (breakdown.navigation_correctness < 60) {
    issues.push(
      `Wrong navigation pattern. Requested: "${requestedNavType ?? 'non-default'}". ` +
      `Implement the correct nav: sidebar uses <aside>, bottom tab bar uses fixed bottom, ` +
      `floating pill uses centered pill, etc.`
    );
  }

  if (breakdown.interaction_richness < 60) {
    issues.push(
      'Add more interactive elements: onClick handlers, filter chips, toggle controls, hover effects. ' +
      'Every button and card should be clickable and change state.'
    );
  }

  if (breakdown.visual_richness < 60) {
    issues.push(
      'Visual quality is too low. Consider adding:\n' +
      '  a) Hover effects on interactive elements (translate, shadow, scale)\n' +
      '  b) CSS custom properties for theming consistency\n' +
      '  c) Generous spacing between sections and inside cards\n' +
      '  d) Animations or transitions for polish\n' +
      '  e) Clear heading size hierarchy for visual structure\n' +
      '  f) Depth effects like shadows or backdrop-blur where appropriate'
    );
  }

  if (hasOverSegmentedSingleMetricRing(code, prompt)) {
    issues.push(
      "Progress ring is over-segmented for a single headline metric. Keep one primary arc and one neutral track."
    );
  }

  if (hasConcentricMacroCalorieRingClutter(code, prompt)) {
    issues.push(
      "Do not stack calorie and macro metrics into concentric multi-color rings. Use one calorie ring plus separate macro bars/cards."
    );
  }

  if (breakdown.form_styling < 60) {
    issues.push('Form elements are missing className styling. Add proper styling to all <input>, <textarea>, <select> elements.');
  }

  if (breakdown.content_layout_fit < 60) {
    const isCollection = /collect(?:ion|ible)|trading|pokemon|recipe|product|listing|catalog|gallery|shop|marketplace|portfolio|browse/i.test(code);
    if (isCollection) {
      issues.push(
        'CONTENT-LAYOUT MISMATCH: This app shows collection/visual items but uses stat banners or single-column layout. ' +
        'Replace with a responsive card grid (grid-cols-2 sm:grid-cols-3 or similar). Each card should have an image placeholder area ' +
        '(dashed border + icon). Add hover effects for card interactivity.'
      );
    }

    // Stat overuse
    const statCount = (code.match(/stat|metric|kpi/gi) || []).length;
    if (statCount > 6) {
      issues.push(
        'Too many stat/metric elements. Replace some with functional UI components — ' +
        'cards, lists, interactive elements. Stats work best as a 3-4 item summary row above main content.'
      );
    }
  }

  if (/const\s+h\s*=\s*React\.createElement/.test(code)) {
    issues.push('CRITICAL: Write JSX syntax, NOT h()/React.createElement. Babel handles transpilation.');
  }

  // Dedicated spacing check
  const hasGenerousSpacingRetry = /py-(12|16|20|24)/.test(code);
  const hasCrampedSectionsRetry = /className="[^"]*py-[2-3]\b/.test(code) && !hasGenerousSpacingRetry;
  if (hasCrampedSectionsRetry) {
    issues.push(
      'Spacing is too cramped. Increase padding between sections (py-12+), between cards (gap-5+), and inside cards (p-5+).'
    );
  }

  return issues.length > 0
    ? issues.map((issue, i) => `${i + 1}. ${issue}`).join('\n')
    : 'General: improve layout diversity, visual uniqueness, and domain specificity.';
}

/* ------------------------------------------------------------------ */
/*  Four-Dimension Factory Scoring                                      */
/*  Code Quality (30%), Design Quality (25%), Security (25%), Perf (20%)*/
/* ------------------------------------------------------------------ */

export interface FactoryScoreDimensions {
  code_quality: number;      // 0-100
  design_quality: number;    // 0-100
  security: number;          // 0-100
  performance: number;       // 0-100
  overall: number;           // weighted 0-100
  issues: string[];          // actionable issues found
}

const FACTORY_WEIGHTS = {
  code_quality: 0.30,
  design_quality: 0.25,
  security: 0.25,
  performance: 0.20,
};

const require = createRequire(import.meta.url);
type TypeScriptModule = {
  transpileModule: (input: string, options: Record<string, unknown>) => { diagnostics?: Array<Record<string, unknown>> };
  flattenDiagnosticMessageText?: (msg: unknown, newline: string) => string;
  JsxEmit: { React: number };
  ModuleKind: { ESNext: number };
  ScriptTarget: { ES2020: number };
  DiagnosticCategory: { Error: number };
};

let cachedTypeScript: TypeScriptModule | null | undefined;

function getTypeScriptModule(): TypeScriptModule | null {
  if (cachedTypeScript !== undefined) return cachedTypeScript;
  try {
    cachedTypeScript = require("typescript") as TypeScriptModule;
    return cachedTypeScript;
  } catch {
    cachedTypeScript = null;
    return null;
  }
}

function detectCompileSyntaxErrors(code: string): string[] {
  const ts = getTypeScriptModule();
  if (!ts) return [];

  try {
    const result = ts.transpileModule(code, {
      fileName: "generated.tsx",
      reportDiagnostics: true,
      compilerOptions: {
        jsx: ts.JsxEmit.React,
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.ESNext,
      },
    });

    const diagnostics = result.diagnostics ?? [];
    const errors = diagnostics
      .filter((d) => d.category === ts.DiagnosticCategory.Error)
      .slice(0, 3)
      .map((d) => {
        const msg = d.messageText;
        if (typeof msg === "string") return msg;
        if (ts.flattenDiagnosticMessageText) return ts.flattenDiagnosticMessageText(msg, "\n");
        return String(msg);
      })
      .filter(Boolean);

    return errors;
  } catch (e) {
    return [e instanceof Error ? e.message : String(e)];
  }
}

function hasSurfacedInvalidNumbers(code: string): boolean {
  const withoutIsNaN = code.replace(/\bisNaN\s*\(/g, "(");
  const hasInvalidToken = /\b(?:NaN|Infinity)\b/.test(withoutIsNaN);
  if (!hasInvalidToken) return false;

  return (
    />[^<]*(?:NaN|Infinity)[^<]*</.test(withoutIsNaN) ||
    /(?:NaN|Infinity)\s*(?:%|kcal|cal|g|kg|remaining|left|of)\b/i.test(withoutIsNaN) ||
    /\b(?:NaN|Infinity)\b/.test(withoutIsNaN)
  );
}

function hasOverlappingSvgCenterText(code: string): boolean {
  const textTags = [...code.matchAll(/<text\b[^>]*>/gi)].map((m) => m[0]);
  if (textTags.length < 2) return false;

  let centeredCount = 0;
  for (const tag of textTags) {
    const xCentered = /x\s*=\s*(?:["']50%?["']|\{\s*["']?50%?["']?\s*\})/i.test(tag);
    const yCentered = /y\s*=\s*(?:["']50%?["']|\{\s*["']?50%?["']?\s*\})/i.test(tag);
    if (xCentered && yCentered) centeredCount += 1;
    if (centeredCount >= 2) return true;
  }

  return false;
}

function hasLightThemeWhiteTextCollision(code: string): boolean {
  const LIGHT_BG = /^(?:bg-(?:white|gray-(?:50|100|200)|slate-(?:50|100|200)|zinc-(?:50|100|200)|neutral-(?:50|100|200)))$/;
  const DARK_BG = /^(?:bg-(?:black|gray-(?:800|900|950)|slate-(?:800|900|950)|zinc-(?:800|900|950)|neutral-(?:800|900|950)))$/;

  const classLists: string[] = [];
  for (const m of code.matchAll(/className=(["'])([^"']*)\1/g)) {
    classLists.push(m[2] ?? "");
  }
  for (const m of code.matchAll(/className=\{`([^`]*)`\}/g)) {
    const list = m[1] ?? "";
    if (!list.includes("${")) classLists.push(list);
  }
  if (classLists.length === 0) return false;

  const isMeaningfulBgToken = (token: string): boolean => {
    if (!token.startsWith("bg-")) return false;
    if (
      /^bg-(?:opacity-\d+|clip-\w+|fixed|local|scroll|center|left|right|top|bottom|no-repeat|repeat(?:-[xy])?|cover|contain|auto)$/.test(token)
    ) {
      return false;
    }
    return true;
  };

  const hasLightRoot = classLists.some((list) => {
    const tokens = list.split(/\s+/).filter(Boolean);
    const hasScreenHeight = tokens.includes("min-h-screen") || tokens.includes("h-screen");
    const hasLightBg = tokens.some((token) => LIGHT_BG.test(token));
    return hasScreenHeight && hasLightBg;
  });

  const hasDarkScaffold = classLists.some((list) => {
    const tokens = list.split(/\s+/).filter(Boolean);
    return tokens.some((token) => DARK_BG.test(token));
  });

  const inferredLightTheme = hasLightRoot && !hasDarkScaffold;

  for (const classList of classLists) {
    const tokens = classList.split(/\s+/).filter(Boolean);
    const hasTextWhite = tokens.some((token) => /^text-white(?:\/\d+)?$/.test(token));
    if (!hasTextWhite) continue;

    const hasLightBg = tokens.some((token) => LIGHT_BG.test(token));
    const hasDarkOrAccentBg = tokens.some(
      (token) => isMeaningfulBgToken(token) && !LIGHT_BG.test(token) && token !== "bg-transparent",
    );

    if (hasLightBg) return true;
    if (inferredLightTheme && !hasDarkOrAccentBg) return true;
  }

  return false;
}

function hasMobileLockedLayout(code: string, prompt?: string): boolean {
  const promptLower = (prompt ?? "").toLowerCase();
  const mobileRequested = /\b(mobile|phone|iphone|android|watch)\b/.test(promptLower);
  const desktopRequested = /\bdesktop\b/.test(promptLower);
  if (mobileRequested && !desktopRequested) return false;

  const hasFixedBottomNav = /\bfixed\b[^"']*\bbottom-0\b|\bbottom-0\b[^"']*\bfixed\b|fixed\s+bottom/i.test(code);
  const hasNarrowShell =
    /\bmax-w-(?:xs|sm|md)\b[^"']*\bmx-auto\b/i.test(code) ||
    /\bw-\[(?:3[0-9]{2}|400)px\]/.test(code) ||
    /\b(?:max|min)-w-\[(?:3[0-9]{2}|400)px\]/.test(code) ||
    /(?:maxWidth|max-width|width)\s*:\s*['"`]?(?:3[0-9]{2}|400)px/i.test(code);
  const hasDesktopBreakpoints = /\b(?:md|lg|xl):/.test(code);

  return hasFixedBottomNav && hasNarrowShell && !hasDesktopBreakpoints;
}

function extractCircleTags(code: string): string[] {
  const circleTagPattern = /<circle\b[^>]*\/\s*>|<circle\b[^>]*>\s*<\/circle>/gi;
  return [...code.matchAll(circleTagPattern)].map((m) => m[0] ?? "").filter(Boolean);
}

function extractSvgBlocks(code: string): Array<{ svg: string; index: number }> {
  const out: Array<{ svg: string; index: number }> = [];
  const svgPattern = /<svg\b[\s\S]*?<\/svg>/gi;
  let match: RegExpExecArray | null;
  while ((match = svgPattern.exec(code)) !== null) {
    out.push({ svg: match[0] ?? "", index: match.index ?? 0 });
  }
  return out;
}

function nearbyTextContext(code: string, start: number, length: number, radius = 320): string {
  const from = Math.max(0, start - radius);
  const to = Math.min(code.length, start + length + radius);
  return code.slice(from, to);
}

function extractTagAttr(tag: string, attr: string): string | null {
  const re = new RegExp(`${attr}\\s*=\\s*(?:"([^"]+)"|'([^']+)'|\\{([^}]+)\\})`, "i");
  const match = tag.match(re);
  if (!match) return null;
  return (match[1] ?? match[2] ?? match[3] ?? "").trim() || null;
}

function hasConcentricCircleGeometry(code: string): boolean {
  const circleTags = extractCircleTags(code);
  if (circleTags.length < 4) return false;

  const centerCounts = new Map<string, number>();
  for (const tag of circleTags) {
    const cx = extractTagAttr(tag, "cx");
    const cy = extractTagAttr(tag, "cy");
    if (!cx || !cy) continue;
    const key = `${cx}|${cy}`;
    centerCounts.set(key, (centerCounts.get(key) ?? 0) + 1);
  }

  let maxAtSameCenter = 0;
  for (const count of centerCounts.values()) {
    if (count > maxAtSameCenter) maxAtSameCenter = count;
  }
  return maxAtSameCenter >= 3;
}

function hasMappedArcLoop(svg: string): boolean {
  return /\.map\(\s*\([^)]*\)\s*=>\s*\(\s*<circle\b[\s\S]{0,2200}?\/>\s*\)\s*\)/i.test(svg);
}

function hasSingleSliceMappedArcLoop(svg: string): boolean {
  return /\.slice\(\s*0\s*,\s*1\s*\)\s*\.map\(\s*\([^)]*\)\s*=>\s*\(\s*<circle\b[\s\S]{0,2200}?\/>\s*\)\s*\)/i.test(svg);
}

function extractCircleStrokeColors(code: string): string[] {
  const colors = new Set<string>();
  const strokeAttr = /\bstroke\s*=\s*(?:["']([^"']+)["']|\{\s*["']([^"']+)["']\s*\}|\{\s*([A-Za-z_$][\w$.]*)\s*\})/i;
  for (const tag of extractCircleTags(code)) {
    const m = tag.match(strokeAttr);
    if (!m) continue;
    const literal = (m[1] ?? m[2] ?? "").trim();
    const expr = (m[3] ?? "").trim();
    const color = literal || (expr ? `__expr:${expr}` : "");
    if (color) colors.add(color);
  }
  return [...colors];
}

function isNeutralStrokeColor(color: string): boolean {
  const c = color.toLowerCase();
  if (!c || c === "none" || c === "currentcolor") return true;
  if (/gray|slate|zinc|neutral|muted/.test(c)) return true;
  if (/^#(?:d|e|f)[0-9a-f]{2,5}$/i.test(c)) return true;
  if (/rgba?\(\s*(?:0|255)\s*,\s*(?:0|255)\s*,\s*(?:0|255)(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)/.test(c)) return true;
  return false;
}

function promptAllowsConcentricRings(prompt?: string): boolean {
  const p = (prompt ?? "").toLowerCase();
  return /\b(concentric|multi[-\s]?(ring|arc)|segmented ring|activity rings?|apple watch rings?|radial breakdown|donut breakdown|macro ring)\b/.test(p);
}

function hasOverSegmentedSingleMetricRing(code: string, prompt?: string): boolean {
  if (promptAllowsConcentricRings(prompt)) return false;

  const svgs = extractSvgBlocks(code);
  for (const block of svgs) {
    const circleTags = extractCircleTags(block.svg);
    if (circleTags.length < 4) continue;
    if (!hasConcentricCircleGeometry(block.svg)) continue;

    const strokeColors = extractCircleStrokeColors(block.svg);
    const arcCircleCount = circleTags.filter((tag) =>
      /strokeDasharray|stroke-dasharray|strokeDashoffset|stroke-dashoffset|pathLength/i.test(tag),
    ).length;
    const nonNeutral = new Set(strokeColors.filter((c) => !isNeutralStrokeColor(c)));
    const localContext = nearbyTextContext(code, block.index, block.svg.length);
    const mentionsSingleMetric = /(remaining|calories?|kcal|left today|\bleft\b)/i.test(localContext);
    if (!mentionsSingleMetric) continue;

    if (nonNeutral.size >= 2 && circleTags.length >= 4) return true;
    if (arcCircleCount >= 2) return true;
    if (circleTags.length >= 6) return true;
  }

  return false;
}

function hasConcentricMacroCalorieRingClutter(code: string, prompt?: string): boolean {
  if (promptAllowsConcentricRings(prompt)) return false;

  const svgs = extractSvgBlocks(code);
  for (const block of svgs) {
    const circleTags = extractCircleTags(block.svg);
    if (circleTags.length < 5) continue;
    if (!hasConcentricCircleGeometry(block.svg)) continue;

    const localContext = nearbyTextContext(code, block.index, block.svg.length);
    const hasMacroTerms = /(protein|carbs?|fat|macro)/i.test(localContext);
    const hasCalorieTerms = /(calories?|kcal|remaining|left today)/i.test(localContext);
    if (!hasMacroTerms || !hasCalorieTerms) continue;

    const arcCircleCount = circleTags.filter((tag) =>
      /strokeDasharray|stroke-dasharray|strokeDashoffset|stroke-dashoffset|pathLength/i.test(tag),
    ).length;
    if (hasMappedArcLoop(block.svg) && !hasSingleSliceMappedArcLoop(block.svg)) return true;
    if (arcCircleCount < 2) continue;

    const strokeColors = extractCircleStrokeColors(block.svg);
    const nonNeutral = new Set(strokeColors.filter((c) => !isNeutralStrokeColor(c)));
    if (nonNeutral.size >= 2 || arcCircleCount >= 2) return true;
  }

  return false;
}

export function scoreFactoryDimensions(code: string, prompt?: string): FactoryScoreDimensions {
  const issues: string[] = [];

  // ─── CODE QUALITY (30%) ───
  let codeScore = 80; // baseline

  // Balanced braces
  const openBraces = (code.match(/\{/g) || []).length;
  const closeBraces = (code.match(/\}/g) || []).length;
  if (openBraces !== closeBraces) {
    codeScore -= 20;
    issues.push(`Unbalanced braces: ${openBraces} open vs ${closeBraces} close`);
  }

  // Conditional hooks (React error #311)
  if (/if\s*\([^)]*\)\s*\{[^}]*use(State|Effect|Callback|Memo|Ref)\s*\(/m.test(code)) {
    codeScore -= 25;
    issues.push("Hooks called inside conditionals (will crash with React error #311)");
  }

  // State management: useState with setter used
  const useStateCount = (code.match(/useState/g) || []).length;
  const setterCount = (code.match(/set[A-Z]\w*\(/g) || []).length;
  if (useStateCount > 0 && setterCount === 0) {
    codeScore -= 15;
    issues.push("useState declared but no setter functions called");
  }
  if (useStateCount > 0) codeScore += 5; // bonus for using state

  // Error handling in async operations
  const hasAsyncOps = /await\s|\.then\(|fetch\(/.test(code);
  const hasTryCatch = /try\s*\{/.test(code);
  if (hasAsyncOps && !hasTryCatch) {
    codeScore -= 10;
    issues.push("Async operations without error handling");
  }

  // Has App component and render call
  if (!/function\s+App|const\s+App/.test(code)) {
    codeScore -= 20;
    issues.push("Missing App component definition");
  }
  if (!/createRoot|ReactDOM\.render/.test(code)) {
    codeScore -= 20;
    issues.push("Missing render call");
  }

  const compileErrors = detectCompileSyntaxErrors(code);
  if (compileErrors.length > 0) {
    codeScore -= 45;
    issues.push(`FATAL: JSX/TS transpile failure (${compileErrors[0]})`);
  }

  const hasRootMount = /document\.getElementById\(['"]root['"]\)/.test(code);
  if (!hasRootMount) {
    codeScore -= 40;
    issues.push("FATAL: missing render root mount (document.getElementById('root'))");
  }

  if (/ReactDOM\.render\s*\(/.test(code)) {
    codeScore -= 30;
    issues.push("FATAL: ReactDOM.render misuse detected");
  }

  if (/[^.\w]createRoot\s*\(/.test(code) && !/ReactDOM\.createRoot\s*\(/.test(code)) {
    codeScore -= 30;
    issues.push("FATAL: createRoot used without ReactDOM namespace");
  }

  if (hasSurfacedInvalidNumbers(code)) {
    codeScore -= 30;
    issues.push("FATAL: surfaced NaN/Infinity values detected");
  }

  if (hasOverlappingSvgCenterText(code)) {
    codeScore -= 25;
    issues.push("FATAL: overlapping SVG center text labels detected");
  }

  if (hasLightThemeWhiteTextCollision(code)) {
    codeScore -= 25;
    issues.push("FATAL: light-theme contrast violation (text-white on light surfaces)");
  }

  if (hasMobileLockedLayout(code, prompt)) {
    codeScore -= 20;
    issues.push("FATAL: mobile-locked layout detected without mobile-only request");
  }

  if (hasOverSegmentedSingleMetricRing(code, prompt)) {
    codeScore -= 20;
    issues.push("FATAL: over-segmented ring for single-metric visualization");
  }

  if (hasConcentricMacroCalorieRingClutter(code, prompt)) {
    codeScore -= 20;
    issues.push("FATAL: concentric calorie+macro ring clutter detected");
  }

  // Detect unresolved JSX refs that are neither defined components nor declared icons.
  const componentDefs = new Set<string>();
  for (const m of code.matchAll(/function\s+([A-Z][A-Za-z0-9]*)\s*\(/g)) componentDefs.add(m[1]);
  for (const m of code.matchAll(/const\s+([A-Z][A-Za-z0-9]*)\s*=\s*(?:\(|function|React\.memo)/g)) componentDefs.add(m[1]);

  const iconDefs = new Set<string>();
  const iconDecl = code.match(/(?:const|let|var)\s*\{([^}]*)\}\s*=\s*window\.(?:LucideReact|lucideReact)\s*\|\|\s*\{\}\s*;?/);
  if (iconDecl?.[1]) {
    for (const item of iconDecl[1].split(",")) {
      const trimmed = item.trim();
      if (!trimmed) continue;
      const alias = trimmed.split(":").map((p) => p.trim());
      if (alias[0]) iconDefs.add(alias[0]);
      if (alias[1]) iconDefs.add(alias[1]);
    }
  }

  const jsxRefs = new Set<string>();
  for (const m of code.matchAll(/<([A-Z][A-Za-z0-9]*)\b/g)) jsxRefs.add(m[1]);
  const unresolvedRefs = [...jsxRefs].filter(
    (name) =>
      !componentDefs.has(name) &&
      !iconDefs.has(name) &&
      name !== "React" &&
      name !== "Fragment",
  );
  if (unresolvedRefs.length > 0) {
    codeScore -= 12;
    issues.push(`WARN: unresolved icon/component refs (${unresolvedRefs.slice(0, 5).join(", ")})`);
  }

  const hasButtons = /<button\b/.test(code);
  const hasInteractionHandlers = /onClick=|onChange=|onSubmit=|onKeyDown=|onInput=/.test(code);
  if (hasButtons && !hasInteractionHandlers) {
    codeScore -= 35;
    issues.push("FATAL: empty interaction map — buttons exist without handlers");
  }

  // Bonus: useEffect cleanup
  if (/useEffect.*return\s*\(\)\s*=>/s.test(code)) codeScore += 5;

  // ─── DESIGN QUALITY (25%) ───
  let designScore = 60; // baseline

  // Visual hierarchy: heading sizes vary
  const headingSizes = new Set<string>();
  for (const m of code.matchAll(/text-(xl|2xl|3xl|4xl|5xl|6xl)/g)) {
    headingSizes.add(m[1]);
  }
  designScore += Math.min(15, headingSizes.size * 5);

  // Spacing consistency
  const hasConsistentSpacing = /py-(8|10|12|16|20)/.test(code) && /px-(4|6|8)/.test(code);
  if (hasConsistentSpacing) designScore += 5;

  // Responsive patterns
  const responsiveClasses = (code.match(/\b(sm|md|lg|xl):/g) || []).length;
  designScore += Math.min(10, responsiveClasses * 2);

  // CSS custom properties
  const customProps = (code.match(/var\(--/g) || []).length;
  designScore += Math.min(10, customProps * 2);

  // Interactive states
  const hasHoverStates = /hover:/.test(code);
  const hasFocusStates = /focus:/.test(code);
  const hasTransitions = /transition/.test(code);
  if (hasHoverStates) designScore += 5;
  if (hasFocusStates) designScore += 3;
  if (hasTransitions) designScore += 5;

  // Color usage penalty for hardcoded hex values in className
  const hardcodedColors = (code.match(/bg-\[(#[0-9a-f]{6})\]/gi) || []).length;
  if (hardcodedColors > 5) {
    designScore -= 5;
    issues.push("Many hardcoded color values — consider CSS custom properties");
  }

  // ─── SECURITY (25%) ───
  let securityScore = 100; // start perfect, deduct for violations

  // No eval or new Function
  if (/\beval\s*\(/.test(code)) {
    securityScore -= 30;
    issues.push("SECURITY: eval() detected — remove immediately");
  }
  if (/new\s+Function\s*\(/.test(code)) {
    securityScore -= 30;
    issues.push("SECURITY: new Function() detected — remove immediately");
  }

  // No dangerouslySetInnerHTML without sanitization
  if (/dangerouslySetInnerHTML/.test(code)) {
    const hasSanitize = /DOMPurify|sanitize|escape/i.test(code);
    if (!hasSanitize) {
      securityScore -= 25;
      issues.push("SECURITY: dangerouslySetInnerHTML without sanitization");
    }
  }

  // No hardcoded credentials/API keys
  if (/["'](sk-|api[_-]?key|secret|password|token)["']\s*[=:]/i.test(code)) {
    securityScore -= 25;
    issues.push("SECURITY: Possible hardcoded credentials detected");
  }

  // No innerHTML assignments
  if (/\.innerHTML\s*=/.test(code)) {
    securityScore -= 15;
    issues.push("SECURITY: Direct innerHTML assignment — use React JSX instead");
  }

  // ─── PERFORMANCE (20%) ───
  let perfScore = 80; // baseline

  // Code size (use string length as proxy — safe in all Node.js environments)
  const codeSize = code.length;
  if (codeSize > 15000) {
    perfScore -= 10;
    issues.push(`Code size (${(codeSize / 1024).toFixed(1)}KB) exceeds 15KB — consider simplifying`);
  } else if (codeSize < 8000) {
    perfScore += 5; // bonus for lean code
  }

  // Memo patterns for expensive operations
  const hasUseMemo = /useMemo/.test(code);
  const hasUseCallback = /useCallback/.test(code);
  if (hasUseMemo) perfScore += 5;
  if (hasUseCallback) perfScore += 5;

  // Re-render risk: objects/arrays created in render body
  const inlineObjects = (code.match(/=\s*\{[^}]+\}\s*;/g) || []).length;
  const inlineArrays = (code.match(/=\s*\[[^\]]+\]\s*;/g) || []).length;
  if (inlineObjects + inlineArrays > 10 && !hasUseMemo) {
    perfScore -= 5;
  }

  // Console.log removal
  const consoleLogs = (code.match(/console\.(log|warn|error)/g) || []).length;
  if (consoleLogs > 3) {
    perfScore -= 5;
    issues.push("Remove console.log statements from production code");
  }

  // Clamp all scores
  codeScore = clampScore(codeScore);
  designScore = clampScore(designScore);
  securityScore = clampScore(securityScore);
  perfScore = clampScore(perfScore);

  const overall = clampScore(
    codeScore * FACTORY_WEIGHTS.code_quality +
    designScore * FACTORY_WEIGHTS.design_quality +
    securityScore * FACTORY_WEIGHTS.security +
    perfScore * FACTORY_WEIGHTS.performance
  );

  return {
    code_quality: codeScore,
    design_quality: designScore,
    security: securityScore,
    performance: perfScore,
    overall,
    issues,
  };
}
