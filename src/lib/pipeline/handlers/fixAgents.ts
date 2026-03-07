/**
 * Specialized Fix Agents — targeted, regex-based code repairs.
 * These run without LLM calls for fast, deterministic fixes.
 *
 * IMPORTANT: These agents must be CONSERVATIVE. It is better to
 * leave a minor issue unfixed than to corrupt working JSX code.
 * Only apply fixes that are provably safe — no complex regex
 * transforms on JSX attributes or expressions.
 */

const VOID_TAGS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

function promptAllowsConcentricRings(prompt?: string): boolean {
  const p = (prompt ?? "").toLowerCase();
  return /\b(concentric|multi[-\s]?(ring|arc)|segmented ring|activity rings?|apple watch rings?|radial breakdown|donut breakdown|macro ring)\b/.test(p);
}

function closeUnclosedJsxTags(code: string): { code: string; closedCount: number } {
  const stack: string[] = [];
  const tagPattern = /<\/?([A-Za-z][A-Za-z0-9:_-]*)\b[^>]*>/g;
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(code)) !== null) {
    const fullTag = match[0] ?? "";
    const rawName = match[1] ?? "";
    if (!rawName) continue;

    const tagName = rawName.includes(":") ? (rawName.split(":").pop() ?? rawName) : rawName;
    const lower = tagName.toLowerCase();
    const isClosing = fullTag.startsWith("</");
    const isSelfClosing = /\/\s*>$/.test(fullTag) || VOID_TAGS.has(lower);

    if (isSelfClosing) continue;
    if (isClosing) {
      const idx = stack.lastIndexOf(tagName);
      if (idx >= 0) stack.splice(idx, 1);
      continue;
    }

    stack.push(tagName);
  }

  if (stack.length === 0) return { code, closedCount: 0 };

  const closingTags = stack.slice().reverse().map((name) => `</${name}>`).join("");
  const renderIdx = code.indexOf("ReactDOM.createRoot");
  let insertAt = code.length;
  if (renderIdx >= 0) {
    const beforeRender = code.slice(0, renderIdx);
    const lastReturnOpen = beforeRender.lastIndexOf("return (");
    if (lastReturnOpen >= 0) {
      const returnCloseLines = [...beforeRender.matchAll(/^\s*\);\s*$/gm)];
      const returnClose = returnCloseLines
        .map((m) => (typeof m.index === "number" ? m.index : -1))
        .filter((idx) => idx > lastReturnOpen)
        .pop();
      if (typeof returnClose === "number" && returnClose >= 0) {
        insertAt = returnClose;
      }
    }
    if (insertAt === code.length) {
      const functionCloseLines = [...beforeRender.matchAll(/^\s*}\s*$/gm)];
      const lastFunctionClose = functionCloseLines.length > 0 ? functionCloseLines[functionCloseLines.length - 1] : null;
      insertAt = lastFunctionClose?.index ?? renderIdx;
    }
  }

  const patched = `${code.slice(0, insertAt)}\n${closingTags}\n${code.slice(insertAt)}`;
  return { code: patched, closedCount: stack.length };
}

function extractAttr(tag: string, attr: string): string | null {
  const re = new RegExp(`${attr}\\s*=\\s*(?:"([^"]+)"|'([^']+)'|\\{([^}]+)\\})`, "i");
  const match = tag.match(re);
  if (!match) return null;
  return (match[1] ?? match[2] ?? match[3] ?? "").trim() || null;
}

function normalizeSingleMetricRingSvg(svg: string): { svg: string; changed: boolean } {
  const mappedArcLoopPattern =
    /\{\s*[A-Za-z_$][\w$.]*(?:\.slice\(\s*0\s*,\s*1\s*\))?\s*\.map\(\s*\([^)]*\)\s*=>\s*\(\s*<circle\b[\s\S]*?\/>\s*\)\s*\)\s*\}/gs;
  const withoutMappedArcLoops = svg.replace(mappedArcLoopPattern, "");
  const hadMappedArcLoops = withoutMappedArcLoops !== svg;

  const circlePattern = /<circle\b[^>]*\/\s*>|<circle\b[^>]*>\s*<\/circle>/gi;
  const circles = [...withoutMappedArcLoops.matchAll(circlePattern)].map((m) => m[0]);
  if (circles.length === 0) return { svg, changed: false };

  const hasArcSignals = /strokeDasharray|stroke-dasharray|strokeDashoffset|stroke-dashoffset|pathLength/i.test(withoutMappedArcLoops);
  const centerCounts = new Map<string, number>();
  const nonNeutralColors = new Set<string>();
  for (const tag of circles) {
    const cx = extractAttr(tag, "cx");
    const cy = extractAttr(tag, "cy");
    if (cx && cy) {
      const key = `${cx}|${cy}`;
      centerCounts.set(key, (centerCounts.get(key) ?? 0) + 1);
    }
    const stroke = extractAttr(tag, "stroke");
    if (stroke && !/^(?:none|currentColor)$/i.test(stroke) && !/gray|slate|zinc|neutral|muted|#e5e7eb|#d1d5db/i.test(stroke)) {
      nonNeutralColors.add(stroke);
    }
  }
  let maxCenterCount = 0;
  for (const count of centerCounts.values()) {
    if (count > maxCenterCount) maxCenterCount = count;
  }
  const hasConcentricGeometry = maxCenterCount >= 3;

  if (!hasConcentricGeometry) return { svg, changed: false };
  if (!hasArcSignals && !hadMappedArcLoops && nonNeutralColors.size < 2 && circles.length < 5) {
    return { svg, changed: false };
  }

  const arcCircles = circles.filter((tag) => /strokeDasharray|stroke-dasharray|strokeDashoffset|stroke-dashoffset|pathLength/i.test(tag));
  if (!hadMappedArcLoops && arcCircles.length < 2 && circles.length < 5 && nonNeutralColors.size < 2) {
    return { svg, changed: false };
  }

  const trackSource = circles.find((tag) => !/strokeDasharray|stroke-dasharray|strokeDashoffset|stroke-dashoffset|pathLength/i.test(tag)) ?? circles[0];
  const geometrySource = trackSource ?? arcCircles[0];

  const cx = extractAttr(geometrySource, "cx") ?? "120";
  const cy = extractAttr(geometrySource, "cy") ?? "120";
  const r = extractAttr(geometrySource, "r") ?? "84";
  const strokeWidth = extractAttr(geometrySource, "strokeWidth") ?? extractAttr(geometrySource, "stroke-width") ?? "14";

  const trackCircle =
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--sb-muted, #e5e7eb)" strokeWidth="${strokeWidth}" />`;
  const progressCircle =
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--sb-primary, #2563eb)" strokeWidth="${strokeWidth}" strokeLinecap="round" pathLength="100" strokeDasharray="100" strokeDashoffset="35" transform="rotate(-90 ${cx} ${cy})" />`;

  const circleStripped = withoutMappedArcLoops.replace(circlePattern, "");
  const injected = `${trackCircle}\n${progressCircle}\n`;
  const withSingleRing = /<text\b/i.test(circleStripped)
    ? circleStripped.replace(/<text\b/i, `${injected}<text`)
    : circleStripped.replace(/<\/svg>/i, `${injected}</svg>`);

  return { svg: withSingleRing, changed: withSingleRing !== svg };
}

function simplifyRingVisuals(
  code: string,
  prompt?: string,
  force = false,
): { code: string; simplified: number } {
  if (!force && promptAllowsConcentricRings(prompt)) return { code, simplified: 0 };

  const lower = code.toLowerCase();
  const circleCount = (code.match(/<circle\b/gi) || []).length;
  const ringSignals =
    /strokedasharray|stroke-dasharray|strokedashoffset|stroke-dashoffset|pathlength/.test(lower) ||
    circleCount >= 4;
  const nutritionSignals = /(calories?|kcal|remaining|left today|protein|carbs?|fat|macro)/.test(lower);
  if (!force && (!ringSignals || !nutritionSignals)) return { code, simplified: 0 };

  let next = code;
  let simplified = 0;

  const mappedArcPattern =
    /([A-Za-z_$][\w$.]*)(?!\s*\.slice\(\s*0\s*,\s*1\s*\))\s*\.map\(\s*\(([^)]*)\)\s*=>\s*\(\s*<circle\b/gs;
  next = next.replace(mappedArcPattern, (_m, source: string, args: string) => {
    simplified += 1;
    return `${source}.slice(0, 1).map((${args}) => (<circle`;
  });

  next = next.replace(/<svg\b[\s\S]*?<\/svg>/gi, (svgBlock) => {
    const normalized = normalizeSingleMetricRingSvg(svgBlock);
    if (normalized.changed) simplified += 1;
    return normalized.svg;
  });

  return { code: next, simplified };
}

/* ------------------------------------------------------------------ */
/*  Syntax Fixer Agent                                                  */
/* ------------------------------------------------------------------ */

export function fixSyntaxIssues(
  code: string,
  prompt?: string,
  options?: { forceRingSimplification?: boolean },
): { code: string; fixes: string[] } {
  const fixes: string[] = [];
  let fixed = code;

  // Fix missing render call
  if (fixed.length > 200 && !fixed.includes('createRoot') && !fixed.includes('ReactDOM.render')) {
    fixed += '\nReactDOM.createRoot(document.getElementById("root")).render(<App />);';
    fixes.push("Added missing render call");
  }

  // Fix bare SDK calls — these are common LLM mistakes that cause crashes
  // Only fix calls that are NOT already prefixed with __sb. or window.__sb.
  const useStoreFixed = fixed.replace(/(?<!\w)(?<!__sb\.)(?<!window\.__sb\.)useStore\s*\(/g, 'window.__sb.useStore(');
  if (useStoreFixed !== fixed) {
    fixed = useStoreFixed;
    fixes.push("Fixed bare useStore() → window.__sb.useStore()");
  }

  const toastFixed = fixed.replace(/(?<!\w)(?<!__sb\.)(?<!window\.__sb\.)toast\s*\(/g, 'window.__sb.toast(');
  if (toastFixed !== fixed) {
    fixed = toastFixed;
    fixes.push("Fixed bare toast() → window.__sb.toast()");
  }

  // Fix malformed dynamic JSX tags like "<item.size={20} ... />"
  // which should be a component tag plus "size" prop. Replace with a safe icon
  // component so code compiles and the repair pass can refine semantics.
  const malformedDynamicTagPreview = /<([a-z][\w$]*)\.([a-zA-Z_$][\w$]*)\s*=/;
  if (malformedDynamicTagPreview.test(fixed)) {
    const malformedDynamicTag = /<([a-z][\w$]*)\.([a-zA-Z_$][\w$]*)\s*=/g;
    fixed = fixed.replace(malformedDynamicTag, '<Sparkles $2=');
    fixes.push("Fixed malformed dynamic JSX tags (e.g. <item.size=...>)");
  }

  const ringSimplification = simplifyRingVisuals(
    fixed,
    prompt,
    Boolean(options?.forceRingSimplification),
  );
  if (ringSimplification.simplified > 0) {
    fixed = ringSimplification.code;
    fixes.push(`Collapsed over-segmented ring visuals (${ringSimplification.simplified} transform${ringSimplification.simplified === 1 ? "" : "s"})`);
  }

  // Fix light-theme contrast collisions for static className strings.
  // This handles:
  // 1) Direct collisions: text-white + light bg on the same element.
  // 2) Inherited collisions: text-white without explicit bg inside a light page shell.
  const LIGHT_BG = /^(?:bg-(?:white|gray-(?:50|100|200)|slate-(?:50|100|200)|zinc-(?:50|100|200)|neutral-(?:50|100|200)))$/;
  const DARK_BG = /^(?:bg-(?:black|gray-(?:800|900|950)|slate-(?:800|900|950)|zinc-(?:800|900|950)|neutral-(?:800|900|950)))$/;
  const hasLightRoot = /className=["'][^"']*\b(?:min-h-screen|h-screen)\b[^"']*\bbg-(?:white|gray-(?:50|100)|slate-(?:50|100)|zinc-(?:50|100)|neutral-(?:50|100))\b[^"']*["']/i.test(fixed);
  const hasDarkScaffold = /\bbg-(?:black|gray-(?:800|900|950)|slate-(?:800|900|950)|zinc-(?:800|900|950)|neutral-(?:800|900|950))\b/i.test(fixed);
  const inferredLightTheme = hasLightRoot && !hasDarkScaffold;
  let contrastFixes = 0;
  const isMeaningfulBgToken = (token: string): boolean => {
    if (!token.startsWith("bg-")) return false;
    if (
      /^bg-(?:opacity-\d+|clip-\w+|fixed|local|scroll|center|left|right|top|bottom|no-repeat|repeat(?:-[xy])?|cover|contain|auto)$/.test(token)
    ) {
      return false;
    }
    return true;
  };

  function rewriteClassList(classList: string): string {
    const tokens = classList.split(/\s+/).filter(Boolean);
    const hasTextWhite = tokens.some((t) => /^text-white(?:\/\d+)?$/.test(t));
    if (!hasTextWhite) return classList;

    const hasLightBg = tokens.some((t) => LIGHT_BG.test(t));
    const hasDarkBg = tokens.some((t) => DARK_BG.test(t));
    const hasExplicitBg = tokens.some((t) => isMeaningfulBgToken(t));
    const hasNonLightBg = tokens.some((t) => isMeaningfulBgToken(t) && !LIGHT_BG.test(t) && t !== "bg-transparent");
    if (hasDarkBg || hasNonLightBg) return classList;
    if (!hasLightBg && !(inferredLightTheme && !hasExplicitBg)) return classList;

    const next = tokens.map((t) => (/^text-white(?:\/\d+)?$/.test(t) ? "text-gray-900" : t));
    if (next.join(" ") !== tokens.join(" ")) contrastFixes += 1;
    return next.join(" ");
  }

  fixed = fixed.replace(/className=(["'])([^"']*)\1/g, (m, quote: string, classList: string) => {
    const next = rewriteClassList(classList);
    return `className=${quote}${next}${quote}`;
  });

  fixed = fixed.replace(/className=\{`([^`]*)`\}/g, (m, classList: string) => {
    // Skip dynamic templates with expressions.
    if (classList.includes("${")) return m;
    const next = rewriteClassList(classList);
    return `className={\`${next}\`}`;
  });

  if (contrastFixes > 0) {
    fixes.push(`Fixed ${contrastFixes} light-theme text contrast collision(s)`);
  }

  const jsxClosure = closeUnclosedJsxTags(fixed);
  if (jsxClosure.closedCount > 0) {
    fixed = jsxClosure.code;
    fixes.push(`Closed ${jsxClosure.closedCount} unclosed JSX tag(s)`);
  }

  return { code: fixed, fixes };
}

/* ------------------------------------------------------------------ */
/*  Run All Fix Agents                                                  */
/* ------------------------------------------------------------------ */

export function runAllFixAgents(
  code: string,
  prompt?: string,
  options?: { forceRingSimplification?: boolean },
): { code: string; allFixes: string[] } {
  const allFixes: string[] = [];

  // Only run the syntax fixer — it handles provably safe transformations.
  // Performance fixes (console.log removal) and accessibility fixes
  // (aria-label injection) are too fragile for regex-based transforms
  // and are better handled by the LLM repair pass.
  const syntax = fixSyntaxIssues(code, prompt, options);
  allFixes.push(...syntax.fixes.map(f => `[Syntax] ${f}`));

  return { code: syntax.code, allFixes };
}
