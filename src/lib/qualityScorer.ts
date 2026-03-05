import type { OutputFormat, QualityBreakdown } from "../types/index.js";

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

const DOMAIN_TOKEN_STOPWORDS = new Set([
  "a", "an", "and", "app", "application", "are", "as", "at", "be", "build", "built", "can", "create", "created",
  "do", "for", "from", "get", "give", "has", "have", "help", "i", "in", "into", "is", "it", "its", "just", "like",
  "make", "me", "need", "of", "on", "or", "our", "please", "really", "service", "should", "similar", "something",
  "system", "that", "the", "their", "them", "then", "there", "these", "this", "to", "tool", "us", "use", "using",
  "want", "we", "with", "would", "you", "your", "feature", "features", "platform", "product", "workflow", "dashboard",
  "ai",
]);

function sanitizeDomainTerms(terms: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const term of terms) {
    const normalized = String(term ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!normalized) continue;
    const compact = normalized.split(/\s+/).slice(0, 3).join(" ");
    if (compact.length < 3 || compact.length > 32) continue;
    if (DOMAIN_TOKEN_STOPWORDS.has(compact)) continue;
    if (!compact.includes(" ") && DOMAIN_TOKEN_STOPWORDS.has(compact)) continue;
    if (seen.has(compact)) continue;

    seen.add(compact);
    out.push(compact);
  }

  return out;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasDomainTerm(codeLower: string, term: string): boolean {
  if (!term.includes(" ")) {
    const pattern = new RegExp(`\\b${escapeRegExp(term)}\\b`, "i");
    return pattern.test(codeLower);
  }
  return codeLower.includes(term);
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
  const promptTokens = new Set(
    input.prompt
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 3 && !DOMAIN_TOKEN_STOPWORDS.has(t)),
  );

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
  const curatedTerms = sanitizeDomainTerms(input.domainKeywords ?? []);
  const domainTerms: Set<string> = curatedTerms.length > 0
    ? new Set(curatedTerms)
    : promptTokens;

  let domainMatches = 0;
  for (const term of domainTerms) {
    if (hasDomainTerm(codeLower, term)) domainMatches += 1;
  }
  const domainRatio = domainTerms.size ? domainMatches / domainTerms.size : 0.5;
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
    const curated = sanitizeDomainTerms(domainKeywords ?? []);
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

export function scoreFactoryDimensions(code: string): FactoryScoreDimensions {
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
