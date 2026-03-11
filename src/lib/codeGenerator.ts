import { randomUUID } from "node:crypto";
import { appendFileSync } from "node:fs";
import type { ReasonedIntent } from "./reasoner.js";
import { scoreGeneratedCode, generateRetryFeedback } from "./qualityScorer.js";
import { recordSpend, calculateCost } from "./costTracker.js";
import type { ProgressCallback } from "./progressEmitter.js";
import type { PipelineRunArtifact, QualityBreakdown } from "../types/index.js";
import type { AppContextBrief } from "./contextResearch.js";
import { resolveModel, supportsToolUse, supportsCacheControl } from "./modelResolver.js";
import { extractJSON, extractCodeFromFences, extractTextFromResponse, llmLog } from "./llmCompat.js";

/* ------------------------------------------------------------------ */
/*  Multi-Agent Planning Types                                         */
/* ------------------------------------------------------------------ */

export interface DesignSection {
  id: string;
  type: string;  // e.g. hero, features, content_grid, cta_banner, stats_row, form, timeline, kanban, split_panel, comparison, carousel_showcase, tabbed_content, or any custom type
  background: string;       // e.g. "sb-gradient-radial", "sb-gradient-subtle", "bg-[#09090b]"
  card_type: string;         // e.g. "glass-elevated", "sb-card", "sb-accent-card"
  grid_layout: string;       // e.g. "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6"
  spacing: string;           // e.g. "py-20 px-6 md:px-8"
  purpose: string;           // what this section does
}

export interface DesignBlueprint {
  sections: DesignSection[];
  nav_type: string;          // e.g. "top_bar_tabs", "sidebar_nav", "bottom_tab_bar"
  nav_items: Array<{ label: string; icon: string; id: string }>;
  hero_typography: string;   // e.g. "font-serif italic text-5xl tracking-tight"
  hero_accent?: string;      // word(s) to color with primary in hero headline
  hero_background?: string;  // hero bg treatment e.g. "bg-gradient-to-br from-indigo-50 via-white to-purple-50"
  section_typography: string; // e.g. "text-2xl font-bold tracking-tight font-display"
  button_styles: string;     // e.g. "glass-btn-gradient for primary, glass-btn-secondary for secondary"
  animation_plan: string;    // e.g. "hover:-translate-y-1 on cards, slide-up on results, pulse on loading"
  color_strategy: string;    // e.g. "Primary #7c3aed, tints via color(P, 0.12), dark bg #09090b"
  component_tree: Array<{ name: string; responsibility: string; props: string }>;
  interaction_map: Array<{ element: string; action: string; state_change: string }>;
}

export interface ContentMap {
  hero_headline: string;
  hero_accent_phrase?: string;  // key word(s) to color with primary in hero
  hero_subheadline: string;
  section_titles: Array<{ id: string; title: string; description: string }>;
  cta_labels: Array<{ context: string; label: string }>;
  sample_data: Array<Record<string, string | number | boolean>>;
  empty_state_text: string;
  toast_messages: Array<{ action: string; message: string; type: "success" | "error" | "info" }>;
  badge_labels: Array<{ value: string; color: string }>;
  field_labels: Record<string, string>;
  placeholder_texts: Record<string, string>;
}

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

/* ------------------------------------------------------------------ */
/*  21st.dev / Aceternity-inspired UI pattern library                    */
/*  Each generation randomly selects patterns to ensure visual variety   */
/* ------------------------------------------------------------------ */

/** A self-contained UI pattern that can be built with CSS/Tailwind + React (no imports). */
interface UIPattern {
  name: string;
  category: 'hero' | 'card' | 'background' | 'text' | 'interaction' | 'layout' | 'navigation';
  description: string;
  /** CSS/Tailwind implementation hint for the LLM */
  implementation: string;
}

const UI_PATTERN_LIBRARY: UIPattern[] = [
  // === HERO PATTERNS ===
  {
    name: "Gradient Mesh Hero",
    category: "hero",
    description: "Hero with overlapping radial gradient backgrounds creating a colorful mesh",
    implementation: "Use 2-3 absolute-positioned divs with large radial-gradient backgrounds at different positions, blur-3xl, opacity-20. Static or animated via useEffect cycling through positions with inline style transitions. Content sits above with relative z-10.",
  },
  {
    name: "Spotlight Hero",
    category: "hero",
    description: "Dark hero with a glowing radial light effect",
    implementation: "Dark bg (#09090b). Large absolute div with radial-gradient(circle at center, rgba(primary,0.15), transparent 70%) and blur-2xl. Use Tailwind bg-clip-text text-transparent bg-gradient-to-r for gradient headline text. Content is relative z-10.",
  },
  {
    name: "Aurora Hero",
    category: "hero",
    description: "Soft aurora-style colored blobs floating behind hero content",
    implementation: "3 absolute divs with rounded-full, blur-3xl, opacity-20, different sizes and colors. Use useEffect + setInterval to slowly toggle translate-y values via inline style with transition: transform 8s ease. Container overflow-hidden.",
  },
  {
    name: "Grid Dot Hero",
    category: "hero",
    description: "Clean hero with a subtle dot grid pattern background and radial fade",
    implementation: "Background div with style={{ backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)', backgroundSize: '24px 24px' }}. Overlay div with radial-gradient(circle, white 40%, transparent) to fade edges. No animation needed.",
  },
  {
    name: "Typewriter Hero",
    category: "hero",
    description: "Hero headline that types out character by character",
    implementation: "useState for displayedText, useEffect with setInterval that adds one char from full string every 50ms. Render a blinking cursor span with opacity toggled via another setInterval (530ms). Clean, no CSS keyframes needed.",
  },
  {
    name: "Split Panel Hero",
    category: "hero",
    description: "Two-column hero: content on one side, interactive preview/demo on the other",
    implementation: "grid grid-cols-1 lg:grid-cols-2 gap-0. Left: text content with generous padding. Right: a live interactive mini-demo or feature preview with a subtle bg tint. No static images.",
  },

  // === CARD PATTERNS ===
  {
    name: "3D Tilt Cards",
    category: "card",
    description: "Cards that subtly tilt in 3D on hover using perspective transforms",
    implementation: "Wrapper div with style={{ perspective: 800 }}. Card uses onMouseMove to get e.nativeEvent.offsetX/Y, compute rotateX = (y - h/2) / 20, rotateY = (x - w/2) / -20. Apply via inline style transform with transition: transform 0.15s. Reset on onMouseLeave.",
  },
  {
    name: "Glassmorphism Cards",
    category: "card",
    description: "Frosted glass cards with backdrop-blur and semi-transparent backgrounds",
    implementation: "Tailwind classes: bg-white/70 backdrop-blur-lg border border-white/50 rounded-2xl shadow-lg. For dark mode: bg-white/10 backdrop-blur-xl border-white/20. Pure Tailwind, no CSS needed.",
  },
  {
    name: "Gradient Border Cards",
    category: "card",
    description: "Cards with colorful gradient borders using a wrapper technique",
    implementation: "Outer div with p-[1px] rounded-xl style={{ background: 'linear-gradient(135deg, primaryColor, secondaryColor)' }}. Inner div with bg-white rounded-xl p-6 for the actual card content. Simple, no animation.",
  },
  {
    name: "Spotlight Hover Cards",
    category: "card",
    description: "Cards that show a radial glow at the cursor position on hover",
    implementation: "Track mouse with onMouseMove storing {x, y} in state. Render overlay div: style={{ background: `radial-gradient(circle at ${x}px ${y}px, rgba(primary,0.1), transparent 70%)`, opacity: isHovered ? 1 : 0, transition: 'opacity 0.2s' }}. Pointer-events-none on overlay.",
  },
  {
    name: "Bento Grid Cards",
    category: "card",
    description: "Varied-size cards in a bento grid where featured items span 2 columns or rows",
    implementation: "CSS grid with Tailwind: grid grid-cols-2 md:grid-cols-3 gap-4. First card uses md:col-span-2 md:row-span-2 for featured emphasis. Each card has different content density and bg tints.",
  },
  {
    name: "Layered Cards",
    category: "card",
    description: "Cards with decorative offset layers behind them showing depth",
    implementation: "relative wrapper. Two absolute divs behind the card: top-1 left-1 bg-primary/5 rounded-xl and top-2 left-2 bg-primary/3 rounded-xl with -z-10. Hover: use inline style transition to spread the layers further apart.",
  },

  // === BACKGROUND PATTERNS ===
  {
    name: "Animated Gradient Background",
    category: "background",
    description: "Slow-cycling gradient background for a section",
    implementation: "useState for gradientAngle, useEffect with setInterval incrementing angle by 1 every 50ms. Apply style={{ background: `linear-gradient(${angle}deg, color1, color2, color3)` }}. Smooth infinite rotation.",
  },
  {
    name: "Noise Texture Overlay",
    category: "background",
    description: "Subtle noise/grain texture overlay for tactile depth",
    implementation: "Absolute overlay div with opacity-[0.03] pointer-events-none with style={{ backgroundImage: `url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")` }}.",
  },
  {
    name: "Grid Lines Background",
    category: "background",
    description: "Clean engineering-style grid lines behind content, fading at edges",
    implementation: "Absolute div with style={{ backgroundImage: 'linear-gradient(to right, #e5e7eb 1px, transparent 1px), linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)', backgroundSize: '40px 40px' }}. Overlay a radial-gradient div to fade edges.",
  },
  {
    name: "Radial Glow Background",
    category: "background",
    description: "A soft radial glow behind the main content area",
    implementation: "Absolute centered div with w-[600px] h-[600px] rounded-full, style={{ background: 'radial-gradient(circle, rgba(primary,0.12), transparent 70%)' }}, blur-3xl, -z-10. No animation, just ambient glow.",
  },

  // === TEXT EFFECTS ===
  {
    name: "Gradient Text",
    category: "text",
    description: "Key headlines with gradient-filled text",
    implementation: "Tailwind only: text-transparent bg-clip-text bg-gradient-to-r from-[primary] to-[secondary]. Use inline style={{ backgroundImage: `linear-gradient(to right, ${P}, ${secondary})`, WebkitBackgroundClip: 'text', color: 'transparent' }} if dynamic colors.",
  },
  {
    name: "Text Shimmer",
    category: "text",
    description: "A shimmer/shine sweep across headline text",
    implementation: "useState for shimmerPos (0 to 200), useEffect with setInterval advancing pos by 2 every 30ms, reset to 0 at 200. Style: backgroundImage linear-gradient(90deg, currentColor 40%, rgba(255,255,255,0.7) ${pos}%, currentColor 60%), WebkitBackgroundClip: 'text', color: 'transparent'. backgroundSize: '200%'.",
  },
  {
    name: "Counting Numbers",
    category: "text",
    description: "Stats that count up from 0 on mount",
    implementation: "useState for displayed value, useEffect with requestAnimationFrame loop. Progress = Math.min(1, elapsed/1500). Use easeOut: 1 - Math.pow(1-progress, 3). Set displayed = Math.round(target * eased). Show with toLocaleString().",
  },

  // === INTERACTION PATTERNS ===
  {
    name: "Hover Scale Cards",
    category: "interaction",
    description: "Cards that gently lift and scale on hover",
    implementation: "Tailwind only: hover:-translate-y-1 hover:shadow-xl transition-all duration-200. Add hover:border-primary/20 for subtle color shift. Simple, reliable, no JS.",
  },
  {
    name: "Staggered List Entry",
    category: "interaction",
    description: "Items fade and slide up with staggered delays on mount",
    implementation: "useState for mounted (false), useEffect sets mounted=true after 50ms. Each item div: style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(12px)', transition: `all 0.4s ease ${index * 60}ms` }}.",
  },
  {
    name: "Smooth Tab Indicator",
    category: "interaction",
    description: "Animated underline or pill that slides to the active tab",
    implementation: "Array of useRef for tab elements. On tab change, read getBoundingClientRect() to get left + width. Render absolute div at bottom with style={{ left: tabLeft, width: tabWidth, transition: 'all 0.3s ease' }} and bg-primary h-0.5.",
  },
  {
    name: "Scroll Progress Bar",
    category: "interaction",
    description: "Thin progress bar at top showing scroll position",
    implementation: "useState for scrollPercent. useEffect adding scroll listener: percent = (scrollY / (document.body.scrollHeight - innerHeight)) * 100. Fixed div at top-0 left-0 with style={{ width: `${percent}%` }}, h-[2px], bg-primary, z-50.",
  },

  // === LAYOUT PATTERNS ===
  {
    name: "Floating Dock Navigation",
    category: "navigation",
    description: "macOS-style dock at bottom with icons that scale on hover",
    implementation: "fixed bottom-4 left-1/2 -translate-x-1/2 z-50. Flex row inside bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg px-2 py-1.5. Each icon button: hover:scale-125 transition-transform duration-150. Active dot: absolute w-1 h-1 rounded-full bg-primary.",
  },
  {
    name: "Side Panel Detail View",
    category: "layout",
    description: "List on left, detail panel slides in on right when item selected",
    implementation: "Flex layout. Left list takes flex-1. Right panel: style={{ width: selectedItem ? 400 : 0, overflow: 'hidden', transition: 'width 0.3s ease' }}. Content inside with min-w-[400px] so it doesn't reflow.",
  },
  {
    name: "Kanban Board Layout",
    category: "layout",
    description: "Horizontal scrolling columns with movable cards",
    implementation: "flex flex-row gap-4 overflow-x-auto pb-4. Each column: min-w-[280px] flex-shrink-0 bg-gray-50 rounded-xl p-4. Cards move between columns via onClick updating a columnId field in state.",
  },
  {
    name: "Infinite Marquee",
    category: "layout",
    description: "Auto-scrolling horizontal strip of items",
    implementation: "Duplicate items array for seamless loop. useState for offset, useEffect with requestAnimationFrame subtracting 0.5 per frame. When offset < -halfWidth, reset to 0. Apply via transform: translateX(${offset}px). overflow-hidden on container.",
  },
  {
    name: "Accordion Sections",
    category: "layout",
    description: "Collapsible sections with smooth height transitions",
    implementation: "useState for openIndex. Content wrapper: style={{ maxHeight: isOpen ? 500 : 0, overflow: 'hidden', transition: 'max-height 0.3s ease' }}. Toggle icon rotates: style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}.",
  },
  {
    name: "Tabbed Content Panels",
    category: "layout",
    description: "Tab switching with fade-in content transitions",
    implementation: "useState for activeTab and fadeKey. On tab change, increment fadeKey. Content wrapper: key={fadeKey} with style={{ animation: 'none' }} but use opacity transition — start opacity-0, useEffect sets opacity-1 after 10ms via state.",
  },

  // === ADVANCED ANIMATIONS (high-impact, 21st.dev / Aceternity level) ===
  {
    name: "Magnetic Cursor Buttons",
    category: "interaction",
    description: "Buttons that magnetically pull toward the cursor when nearby, creating a fluid interactive feel",
    implementation: "Wrap button in a div with onMouseMove. Calculate distance from cursor to button center. If within 100px radius, offset button position toward cursor using transform: translate(deltaX * 0.3, deltaY * 0.3) with transition: transform 0.2s ease-out. Reset on onMouseLeave. Use useRef for button element and getBoundingClientRect().",
  },
  {
    name: "Parallax Scroll Sections",
    category: "hero",
    description: "Multiple layers move at different speeds as user scrolls, creating cinematic depth",
    implementation: "useState for scrollY. useEffect adds scroll listener updating scrollY = window.scrollY. Background layer: style={{ transform: `translateY(${scrollY * 0.3}px)` }}. Midground: translateY(${scrollY * 0.5}px). Foreground stays static. Each layer is absolute positioned with different z-index. Add transition: transform 0.1s for smoothness.",
  },
  {
    name: "Card Stack / Swipe Deck",
    category: "card",
    description: "Tinder-style card stack where top card can be dragged/swiped to reveal the next",
    implementation: "useState for cards array and dragState {x, y, dragging}. Render top 3 cards stacked with decreasing scale and increasing translateY. Top card: onMouseDown starts drag, onMouseMove updates x/y offset via inline style transform: translate(${x}px, ${y}px) rotate(${x * 0.1}deg). On mouseUp, if |x| > 150, animate card off-screen and shift array. Use transition: transform 0.3s when not dragging.",
  },
  {
    name: "Morphing Shape Blob",
    category: "background",
    description: "Organic blob shape that continuously morphs between border-radius values",
    implementation: "useState for blobPhase (0-3). useEffect with setInterval cycling phase every 3000ms. Define 4 border-radius states: ['60% 40% 30% 70% / 60% 30% 70% 40%', '30% 60% 70% 40% / 50% 60% 30% 60%', '40% 60% 60% 40% / 70% 30% 50% 60%', '50% 30% 40% 70% / 40% 60% 60% 30%']. Apply via style={{ borderRadius: states[phase], transition: 'border-radius 3s ease-in-out', width: 400, height: 400, background: `linear-gradient(135deg, ${P}, secondary)` }}.",
  },
  {
    name: "Reveal On Scroll",
    category: "interaction",
    description: "Sections dramatically reveal as user scrolls — elements slide up, fade in, and scale from different directions",
    implementation: "Create a useInView hook: useRef for element, useState for isVisible. useEffect creates IntersectionObserver with threshold 0.15, sets isVisible=true when intersecting. Each section wraps content in ref'd div with style={{ opacity: isVisible ? 1 : 0, transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(40px) scale(0.95)', transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1)' }}. Stagger children with transitionDelay: `${index * 100}ms`.",
  },
  {
    name: "Animated Counter Dashboard",
    category: "text",
    description: "Large metric numbers that spring-animate from 0 to final value with easing, plus micro-progress bars",
    implementation: "useState for progress (0 to 1). useEffect on mount: requestAnimationFrame loop over 1500ms, progress = easeOutExpo(elapsed/1500) where easeOutExpo(t) = t===1 ? 1 : 1 - Math.pow(2, -10*t). Display Math.round(target * progress).toLocaleString(). Below each number, a progress bar div with style={{ width: `${progress * percentage}%`, transition: 'none', background: P, height: 4, borderRadius: 2 }}.",
  },
  {
    name: "Flip Card Grid",
    category: "card",
    description: "Cards that flip 180° on hover/click to reveal back content with 3D perspective transform",
    implementation: "Wrapper: style={{ perspective: 1000 }}. Inner container: style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0)', transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}. Front face: style={{ backfaceVisibility: 'hidden' }} with absolute positioning. Back face: same but transform: rotateY(180deg). Toggle isFlipped on click/hover.",
  },
  {
    name: "Elastic Pull-to-Action",
    category: "interaction",
    description: "Elements that stretch elastically when dragged then snap back with spring physics",
    implementation: "useState for pullDistance. onMouseDown starts tracking, onMouseMove sets pullDistance with resistance: Math.sign(delta) * Math.sqrt(Math.abs(delta)) * 5. Apply style={{ transform: `translateY(${pullDistance}px)`, transition: isDragging ? 'none' : 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)' }}. On mouseUp, reset pullDistance to 0 — the cubic-bezier creates the spring overshoot effect.",
  },
  {
    name: "Particle Constellation",
    category: "background",
    description: "Interactive dots that form constellation lines when cursor is nearby",
    implementation: "Generate 30 random points with useRef. useState for mousePos. useEffect with requestAnimationFrame to slowly drift each point's x/y by sin(time + i) * 0.3. Render on a full-width div using absolute-positioned 3px dots. For each pair within 120px distance (or within 150px of cursor), render a thin line via a rotated absolute div with height:1px, opacity based on distance. Update mousePos via onMouseMove on container.",
  },
  {
    name: "Stacked Image Gallery",
    category: "layout",
    description: "Images/cards fanned like a deck, clicking one brings it to front with smooth 3D animation",
    implementation: "useState for activeIndex. Render items stacked with each card offset by style={{ transform: `translateX(${(i - activeIndex) * 20}px) translateZ(${-Math.abs(i - activeIndex) * 30}px) rotateY(${(i - activeIndex) * -5}deg)`, zIndex: items.length - Math.abs(i - activeIndex), transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)', opacity: Math.abs(i - activeIndex) > 2 ? 0 : 1 }}. Parent: style={{ perspective: 800, transformStyle: 'preserve-3d' }}. onClick sets activeIndex.",
  },
  {
    name: "Liquid Glass Navigation",
    category: "navigation",
    description: "Navigation bar with a liquid glass blob that morphs and slides to the active item",
    implementation: "Array of useRef for nav items. useState for activeIndex and blobStyle. On tab change, read target ref's getBoundingClientRect(). Set blobStyle = { left: rect.left - navLeft, width: rect.width }. Render absolute div behind items: style={{ ...blobStyle, transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)', height: '100%', borderRadius: 12, background: 'rgba(primary, 0.1)', backdropFilter: 'blur(8px)' }}.",
  },
  {
    name: "Text Reveal / Unblur",
    category: "text",
    description: "Hero text that starts blurred and reveals word-by-word with unblur animation",
    implementation: "Split headline into words array. useState for revealedCount (0). useEffect with setInterval incrementing revealedCount by 1 every 80ms until all revealed. Each word span: style={{ filter: i < revealedCount ? 'blur(0px)' : 'blur(8px)', opacity: i < revealedCount ? 1 : 0.3, transform: i < revealedCount ? 'translateY(0)' : 'translateY(8px)', transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)', transitionDelay: `${i * 40}ms` }}.",
  },
];

// Advanced animation pattern names — at least one must be selected per generation
const ADVANCED_PATTERNS = new Set([
  "Magnetic Cursor Buttons", "Parallax Scroll Sections", "Card Stack / Swipe Deck",
  "Morphing Shape Blob", "Reveal On Scroll", "Flip Card Grid", "Elastic Pull-to-Action",
  "Particle Constellation", "Stacked Image Gallery", "Liquid Glass Navigation",
  "Text Reveal / Unblur", "Animated Counter Dashboard",
]);

/**
 * Select a random subset of UI patterns for a generation run.
 * Picks one from each category to ensure variety. Always includes
 * at least 2 advanced/high-difficulty animation patterns.
 */
function selectUIPatterns(count: number = 6): UIPattern[] {
  const categories = Array.from(new Set(UI_PATTERN_LIBRARY.map(p => p.category)));
  const shuffled = categories.sort(() => Math.random() - 0.5);
  const selected: UIPattern[] = [];

  for (const cat of shuffled.slice(0, count)) {
    const candidates = UI_PATTERN_LIBRARY.filter(p => p.category === cat);
    selected.push(candidates[Math.floor(Math.random() * candidates.length)]);
  }

  // Always include one hero and one card pattern if not already present
  if (!selected.some(p => p.category === 'hero')) {
    const heroes = UI_PATTERN_LIBRARY.filter(p => p.category === 'hero');
    selected[0] = heroes[Math.floor(Math.random() * heroes.length)];
  }
  if (!selected.some(p => p.category === 'card')) {
    const cards = UI_PATTERN_LIBRARY.filter(p => p.category === 'card');
    if (selected.length < count) {
      selected.push(cards[Math.floor(Math.random() * cards.length)]);
    } else {
      selected[selected.length - 1] = cards[Math.floor(Math.random() * cards.length)];
    }
  }

  // Ensure at least 2 advanced animation patterns are included
  const advancedInSelected = selected.filter(p => ADVANCED_PATTERNS.has(p.name));
  const advancedPool = UI_PATTERN_LIBRARY.filter(
    p => ADVANCED_PATTERNS.has(p.name) && !selected.includes(p)
  );
  let needed = 2 - advancedInSelected.length;
  while (needed > 0 && advancedPool.length > 0) {
    const pick = advancedPool.splice(Math.floor(Math.random() * advancedPool.length), 1)[0];
    // Replace a non-advanced, non-hero, non-card pattern
    const replaceIdx = selected.findIndex(
      p => !ADVANCED_PATTERNS.has(p.name) && p.category !== 'hero' && p.category !== 'card'
    );
    if (replaceIdx >= 0) {
      selected[replaceIdx] = pick;
    } else {
      selected.push(pick);
    }
    needed--;
  }

  return selected;
}

/** Format selected patterns into a prompt section for the LLM */
function formatUIPatternPrompt(patterns: UIPattern[]): string {
  return patterns.map((p, i) => [
    `${i + 1}. **${p.name}** (${p.category})`,
    `   ${p.description}`,
    `   HOW: ${p.implementation}`,
  ].join('\n')).join('\n\n');
}

/* ------------------------------------------------------------------ */
/*  Randomized style seeds — injected per generation for variety        */
/* ------------------------------------------------------------------ */

export function buildCodeGenSystemPrompt(themeStyle: string, uiPatterns?: UIPattern[]): string {
  const isDark = themeStyle === 'dark';
  const isVibrant = themeStyle === 'vibrant';
  const darkMode = isDark || isVibrant;

  // Select random UI patterns if none provided
  const patterns = uiPatterns ?? selectUIPatterns(4);
  const patternSection = `
=== UI PATTERN LIBRARY (use these specific techniques to make this app look impressive) ===
You MUST incorporate at least 4-5 of these UI patterns into the app. Go BIG on animations — this should feel like a premium 21st.dev / Aceternity showcase, not a basic template.

${formatUIPatternPrompt(patterns)}

=== ANIMATION EXPECTATIONS ===
BUILD IMPRESSIVE, HIGH-DIFFICULTY ANIMATIONS. The app should feel alive and interactive:
- At least ONE advanced animation (parallax, 3D transforms, particle effects, card swiping, scroll-reveal, magnetic interactions)
- Scroll-triggered reveals on ALL major sections (fade + slide + scale with staggered children)
- Smooth micro-interactions on EVERY interactive element (buttons, cards, tabs, inputs)
- Use cubic-bezier easing for premium feel: cubic-bezier(0.16, 1, 0.3, 1) for entrances, cubic-bezier(0.4, 0, 0.2, 1) for movements
- Spring physics for drag interactions: cubic-bezier(0.34, 1.56, 0.64, 1) for overshoot snap-back

CRITICAL: All animations must use React state + inline style transitions OR Tailwind transition/hover utilities.
NEVER write raw CSS @keyframes blocks, @property rules, or <style> tags — they break the in-browser Babel compiler.
For animations, use: useState + useEffect + setInterval/requestAnimationFrame to update inline style values with CSS transition properties.
No framer-motion or external animation libraries.
`;

  return `You generate COMPLETE, WORKING single-file React apps that look professionally designed and functional.
Your goal is to create something that looks like a REAL product — not AI-generated, not templated, not generic startup aesthetic. Think Stripe, Linear, or Apple in design quality.

=== DESIGN PHILOSOPHY ===
- EDITORIAL, NOT GENERIC: Design like a professional studio, not a template marketplace. Avoid generic startup aesthetics, purple gradients, default Tailwind/shadcn looks, and stock imagery patterns.
- INTENTIONAL DESIGN: Every visual choice should have a reason. No decorative gradients, no floating blobs, no generic hero sections with oversized headings and meaningless subtext.
- WORKING FEATURES: Every button, card, and input must DO something. Build real interactivity, not static displays.
- APP NAME: Use the app_name from the request. NEVER copy real brand names.
- Let the domain and content guide your visual choices. A fitness app might use progress rings; a recipe app might use large food imagery frames; a finance app might use charts.
- REFERENCE APPS: When the user says "like [Product]" or "similar to [Product]", use YOUR knowledge of that product. You know what Cal.ai, Notion, Spotify, Robinhood etc. are — build something in the SAME domain with the SAME core features. The user's original prompt is the PRIMARY source of truth.

=== TYPOGRAPHY (CRITICAL — 2 FONTS MAX) ===
- Use at most 2 font families per app. One for headings, one for body — or a single family for both.
- Build a clear typographic hierarchy: display (hero), h1, h2, h3, body, caption — each with distinct size, weight, and spacing.
- Choose fonts that fit the domain tone: geometric sans for tech/SaaS, humanist sans for consumer apps, serif for editorial/luxury.
- Use letter-spacing (tracking) intentionally: tighter for large display text, normal for body.
- NEVER use more than 3 font weights across the entire app.

=== VISUAL DESIGN — EDITORIAL STYLE ===
- LIMITED COLOR PALETTE: Use 3–4 colors maximum. Apply the 60-30-10 rule — 60% dominant (backgrounds), 30% secondary (surfaces/cards), 10% accent (CTAs, highlights).
- Make the first screen immediately useful — show the core experience, not a splash page.
- Use a clean grid layout with consistent spacing. Pick a spacing scale (e.g. 4/8/16/24/32/48/64) and stick to it.
- Create custom-feeling components — not obvious default shadcn/Tailwind UI patterns. Adjust border-radius, padding, shadows, and proportions to feel bespoke.
- SUBTLE INTERACTIONS ONLY: hover states with gentle opacity/color shifts, smooth transitions (150-200ms). No bouncing, no dramatic scaling, no gratuitous animations.
- Use whitespace generously — let content breathe. Dense ≠ professional.
- Prefer flat or very subtle shadows over heavy drop shadows or glowing borders.

=== COLOR DIVERSITY (CRITICAL) ===
NEVER default to indigo/purple for every app. Pick a unique primary color that fits the domain:
  Health/Fitness → emerald (#10b981), teal (#14b8a6)
  Finance/Business → blue (#3b82f6), slate (#475569)
  Food/Recipe → orange (#f97316), amber (#f59e0b)
  Social/Community → rose (#f43f5e), pink (#ec4899)
  Education/Learning → violet (#8b5cf6), cyan (#06b6d4)
  Productivity/Tools → sky (#0ea5e9), lime (#84cc16)
  Gaming/Entertainment → fuchsia (#d946ef), red (#ef4444)
  Travel/Lifestyle → teal (#14b8a6), amber (#f59e0b)
  Music/Audio → purple (#a855f7), pink (#ec4899)
  E-commerce/Shopping → orange (#f97316), emerald (#10b981)
These are suggestions — be creative and pick what feels RIGHT for the specific app concept.
The primary color should feel native to the domain, not generic.
Apply the primary color SPARINGLY as the 10% accent — buttons, active states, key highlights. Never flood the UI with it.

=== ENVIRONMENT (pre-loaded globals — NEVER import/export/require) ===
Globals: React, ReactDOM, window.LucideReact (icons), window.__sb (SDK), Tailwind CSS v3
Last line: ReactDOM.createRoot(document.getElementById('root')).render(<App />);

Required first lines:
const {useState, useEffect, useRef, useCallback, useMemo} = React;
const {Search, Plus, X, Check, ChevronDown, /* ...icons you need */} = window.LucideReact || {};
const cn = window.__sb.cn;
const P = '#HEX'; // primary color
document.documentElement.style.setProperty('--sb-primary', P);
document.documentElement.style.setProperty('--sb-primary-glow', window.__sb.color(P, 0.2));
document.documentElement.style.setProperty('--sb-primary-bg', window.__sb.color(P, 0.12));

=== SDK (ALWAYS use the full window.__sb prefix — bare useStore/toast will crash) ===
window.__sb.useStore(key, default) — persistent [value, setter]. Example: const [tab, setTab] = window.__sb.useStore('activeTab', 'home');
window.__sb.toast(msg, type) — toast notification. Example: window.__sb.toast('Saved!', 'success');
window.__sb.fmt.date/time/number/currency/percent/relative — formatters
window.__sb.color(hex, opacity) — rgba string
window.__sb.cn(...args) — className joiner
window.__sb.copy(text) — clipboard + toast
await window.__sbAI(systemPrompt, userMessage) — AI call, returns string

=== STYLE TOKENS ===
You may compose UI using Tailwind utilities and/or sb-* helper classes.
Prefer domain-fit layout and spacing over any fixed template pattern.
Use var(--sb-primary) and window.__sb.color(P, opacity) for brand color consistency.

=== CODE RELIABILITY ===
1. No import/export/require — everything is global
2. No TypeScript — no interfaces, no type annotations, no generics on hooks. Plain JavaScript/JSX ONLY.
3. ALL useState must have default values
4. Define data arrays BEFORE components that use them
5. onClick must be a function reference: onClick={() => fn()}, NOT onClick={fn()}
6. ALL hooks at TOP of component — never inside if/loop/ternary/handler
7. Hook count must be identical on every render — no conditional hooks
8. NEVER use external image URLs (no picsum.photos, unsplash, placeholder.com, or any other image service). For image placeholders, use a colored div with a Lucide "Plus" icon centered inside (e.g. <div className="flex items-center justify-center bg-gray-100 rounded-lg" style={{height:200}}><Plus size={24} className="text-gray-400" /></div>). This creates clean, consistent placeholder areas.
9. NEVER use <style> tags, @keyframes, @property, or any raw CSS blocks — they crash the in-browser Babel compiler. ALL animations must use inline styles with CSS transition property + React state changes, or Tailwind transition/hover utilities.

=== WORKING APP SKELETON (follow this structure) ===

// 1. DATA — define arrays/objects BEFORE components
const ITEMS = [{id: 1, name: 'Example', category: 'Category', status: 'active', value: 85}, ...]; // 8-15 realistic items

// 2. HELPER COMPONENTS — small, reusable
function StatCard({label, value, icon: Icon}) {
  return <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
    <span className="text-sm font-semibold text-gray-500 uppercase">{label}</span>
    <div className="text-3xl font-extrabold text-gray-900 mt-2">{value}</div>
  </div>;
}

// 3. MAIN APP — MUST define function App()
function App() {
  const [page, setPage] = useState('home');
  const [items, setItems] = window.__sb.useStore('items', ITEMS);
  const [search, setSearch] = useState('');
  const TABS = [{id:'home', label:'Home', icon: Home}, {id:'explore', label:'Explore', icon: Search}];
  const grad = 'linear-gradient(135deg, ' + P + ', ' + window.__sb.color(P, 0.7) + ')';

  return <div className="min-h-screen bg-gray-50">
    {/* NAV — sticky top bar, never bottom tabs */}
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
      <div className="w-full px-8 h-16 flex items-center">
        <span className="text-xl font-extrabold text-gray-900 mr-8">AppName</span>
        <div className="flex gap-2">{TABS.map(t => <button key={t.id} onClick={() => setPage(t.id)} className={cn("px-5 py-2.5 rounded-xl text-sm font-semibold", page===t.id?"text-white shadow-md":"text-gray-500 hover:bg-gray-100")} style={page===t.id?{background:grad}:undefined}><t.icon className="w-4 h-4 inline mr-1.5" />{t.label}</button>)}</div>
      </div>
    </nav>
    {/* CONTENT — full-width desktop layout */}
    <div className="w-full px-8 py-8">
      {page === 'home' && <div className="space-y-8">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-5">
          <StatCard label="Metric" value="128" icon={Star} />
        </div>
      </div>}
    </div>
  </div>;
}

// 4. RENDER — always last line
ReactDOM.createRoot(document.getElementById('root')).render(<App />);

CRITICAL: You MUST define function App() { ... } and the final render call. Code without function App() is BROKEN and will not render.
VIEWPORT: DESKTOP (1200px+). Use w-full px-8, grid-cols-2/3/4 with xl: breakpoints. Top horizontal nav bar — never bottom tabs.
GRADIENTS: Build with concatenation: 'linear-gradient(135deg, ' + P + ', ' + window.__sb.color(P, 0.7) + ')'.
CODE SIZE: Keep total output under 12,000 characters. Build 3-5 polished sections, not 10+ mediocre ones. Max 6-8 data items. Reuse helper components — never duplicate JSX blocks. Every section tight, no filler.

=== THEME: ${themeStyle.toUpperCase()} ===
${darkMode
? `Dark mode is preferred for this concept. Choose contrast-safe surfaces and readable text.`
: `Light mode is preferred for this concept. Use depth and hierarchy without forcing a single visual motif.`}
${patternSection}
ZERO emoji. ZERO markdown fences. Output ONLY the JSX code.`;
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


function sanitizeIconDestructuring(code: string): string {
  // Fix "as" aliases (e.g. "Zap as ZapIcon") to destructuring syntax ("Zap: ZapIcon")
  // but do NOT remove any icons — the LucideReact Proxy in the preview handles unknown
  // icons by returning a graceful fallback component. Stripping icons from destructuring
  // causes "X is not defined" crashes because their JSX usage remains in the code.
  return code.replace(
    /const\s*\{([^}]+)\}\s*=\s*window\.LucideReact\s*\|\|\s*\{\};/,
    (match, iconList: string) => {
      const icons = iconList.split(',').map((s: string) => s.trim()).filter(Boolean);
      const fixedIcons: string[] = [];
      for (const icon of icons) {
        // Handle aliases like "Zap as ZapIcon" → convert to destructuring syntax "Zap: ZapIcon"
        const parts = icon.split(/\s+as\s+/);
        const baseName = parts[0].trim();
        if (!baseName) continue;
        if (parts.length > 1) {
          fixedIcons.push(`${baseName}: ${parts[1].trim()}`);
        } else {
          fixedIcons.push(baseName);
        }
      }
      if (fixedIcons.length === 0) fixedIcons.push('Star');
      return `const {${fixedIcons.join(', ')}} = window.LucideReact || {};`;
    }
  );
}

/* ------------------------------------------------------------------ */
/*  Agent Swarm: Design Architect                                      */
/* ------------------------------------------------------------------ */

const DESIGN_ARCHITECT_PROMPT = `You are an elite UI/UX architect who designs like Stripe, Linear, and Apple — not like a template marketplace. Given an app concept, produce a UNIQUE design blueprint.

YOUR GOAL: Design something that looks professionally built by a design studio. It should feel INTENTIONAL and PREMIUM — not AI-generated, not generic startup aesthetic.

=== EDITORIAL DESIGN PRINCIPLES ===
- LIMITED COLOR PALETTE: Use 3–4 colors maximum. Apply 60-30-10 rule — 60% dominant neutral, 30% secondary, 10% accent.
- 2 FONTS MAX: One for headings, one for body (or a single family). Build hierarchy through size/weight, not font variety.
- CLEAN GRID: Pick a consistent spacing scale (4/8/16/24/32/48/64px) and stick to it across all sections.
- CUSTOM COMPONENTS: Don't use obvious default shadcn/Tailwind UI patterns. Adjust border-radius, padding, shadows, and proportions to feel bespoke.
- SUBTLE INTERACTIONS: Hover states with gentle opacity/color shifts, smooth transitions (150-200ms). No bouncing, no dramatic scaling.
- WHITESPACE: Let content breathe. Generous padding creates a premium feel.

=== DOMAIN-DRIVEN CHOICES ===
- Let the content and purpose determine layout, density, and color intensity. A data dashboard should feel different from a recipe browser.
- Consider sidebars, split panels, masonry, bento grids, carousels, full-bleed sections, kanban boards — whatever fits the content.
- For collection/browse apps: use enough sample items to fill the layout (6-10 items).
- For tool/analyzer apps: focus on the input/output workflow, not item grids.

=== COLOR APPLICATION ===
- NEVER default to indigo or purple — choose a primary color that fits the specific app domain
- Apply primary color SPARINGLY as the 10% accent — CTAs, active states, key highlights
- Use primary color tints (window.__sb.color(P, 0.08)) for subtle section backgrounds
- Prefer flat or very subtle shadows over heavy drop shadows or glowing borders
- Avoid gradient-heavy backgrounds — use solid colors or very subtle gradients

=== TYPOGRAPHY ===
- Choose fonts that match domain tone: geometric sans for tech, humanist for consumer, serif for editorial
- Use letter-spacing intentionally: tighter for display text, normal for body
- No more than 3 font weights across the entire app

You can use Tailwind utilities and sb-* helper classes, but the result must NOT look like default Tailwind UI.

SECTION LIMIT: Design exactly 4-5 sections total (including hero). Each section should be impactful — fewer, better sections beat many shallow ones.

Every section must specify: background class, card type, grid layout, spacing, and purpose.
The interaction_map must describe what every button and clickable element does.
The component_tree must list all React components needed (max 8-10 components).

Be SPECIFIC and CREATIVE — no generic "modern layout" descriptions.`;

const designBlueprintToolSchema = {
  type: "object" as const,
  additionalProperties: false,
  properties: {
    sections: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          type: { type: "string", description: "Section type: hero, features, content_grid, cta_banner, stats_row, form, timeline, kanban, split_panel, comparison, testimonials, pricing_table, carousel_showcase, tabbed_content, or any custom type" },
          background: { type: "string", description: "Exact CSS class: sb-gradient-radial, sb-gradient-subtle, bg-[#09090b], etc." },
          card_type: { type: "string", description: "Card class: glass-elevated, sb-card, sb-accent-card, sb-gradient-card" },
          grid_layout: { type: "string", description: "Grid classes: grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6" },
          spacing: { type: "string", description: "Section spacing: py-20 px-6 md:px-8" },
          purpose: { type: "string", description: "What this section shows/does" },
        },
        required: ["id", "type", "background", "card_type", "grid_layout", "spacing", "purpose"],
      },
      minItems: 4,
      maxItems: 10,
    },
    nav_type: { type: "string", description: "Navigation pattern: top_bar_tabs, sidebar_nav, bottom_tab_bar, floating_pill" },
    nav_items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          label: { type: "string" },
          icon: { type: "string" },
          id: { type: "string" },
        },
        required: ["label", "icon", "id"],
      },
    },
    hero_typography: { type: "string", description: "Hero heading classes including font family: font-serif italic text-5xl tracking-tight, or font-display font-black text-6xl" },
    hero_accent: { type: "string", description: "Which word(s) in the hero headline to color with primary color or gradient. Example: 'With AI Magic' or 'Every Goal'" },
    hero_background: { type: "string", description: "Hero background treatment: gradient direction, colors, radial overlays. Example: 'bg-gradient-to-br from-indigo-50 via-white to-purple-50' or 'sb-gradient-radial'" },
    section_typography: { type: "string", description: "Section heading classes: text-2xl font-bold tracking-tight font-display" },
    button_styles: { type: "string", description: "Button strategy: glass-btn-gradient for primary, glass-btn-secondary for secondary" },
    animation_plan: { type: "string", description: "Animation strategy: hover:-translate-y-1 on cards, transitions, loading states" },
    color_strategy: { type: "string", description: "Color usage: Primary hex, tint formula, background treatment" },
    component_tree: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          responsibility: { type: "string" },
          props: { type: "string" },
        },
        required: ["name", "responsibility", "props"],
      },
    },
    interaction_map: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          element: { type: "string" },
          action: { type: "string" },
          state_change: { type: "string" },
        },
        required: ["element", "action", "state_change"],
      },
    },
  },
  required: ["sections", "nav_type", "nav_items", "hero_typography", "section_typography", "button_styles", "animation_plan", "color_strategy", "component_tree", "interaction_map"],
};

export async function planDesign(
  client: Anthropic,
  modelId: string,
  intent: ReasonedIntent,
  contextBrief: AppContextBrief | null | undefined,
): Promise<DesignBlueprint | null> {
  // Kimi K2.5 thinking models take ~90-120s per request — 30s timeout was killing these agents
  const timeoutMs = Number(process.env.STARTBOX_AGENT_TIMEOUT_MS ?? 90000);
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const DESIGN_VARIATIONS = [
      "EMPHASIS: Prioritize clean visual hierarchy with clear focal points. Use whitespace generously.",
      "EMPHASIS: Try an asymmetric layout — bento grid, mixed card sizes, or featured + secondary pattern.",
      "EMPHASIS: Focus on information density appropriate to the domain — data-heavy apps need compact layouts, lifestyle apps need breathing room.",
      "EMPHASIS: Consider a sidebar or split-panel layout if the app has a list-detail pattern.",
      "EMPHASIS: Use color strategically — subtle tints for backgrounds, bold primary for key actions and accents.",
      "EMPHASIS: Design for the interaction flow — what does the user DO first? Make that the most prominent element.",
    ];
    const designHint = DESIGN_VARIATIONS[Math.floor(Math.random() * DESIGN_VARIATIONS.length)];

    // Select random UI patterns from the 21st.dev-inspired library for this generation
    const selectedPatterns = selectUIPatterns(4);
    const patternHints = selectedPatterns.map(p =>
      `  - ${p.name}: ${p.description} (${p.implementation.slice(0, 120)}...)`
    ).join('\n');

    const userMessage = [
      `Design a premium UI blueprint for: "${intent.primary_goal}"`,
      ...(intent.reference_app ? [`REFERENCE PRODUCT: "${intent.reference_app}" — Design the UI to match what users expect from this type of product.`] : []),
      `App: ${intent.app_name_hint} | Theme: ${intent.theme_style} | Color: ${intent.primary_color}`,
      `Layout: ${intent.layout_blueprint}`,
      `Display format: ${intent.item_display_format}`,
      `Typography: ${intent.typography_style}`,
      `Visual style: ${(intent.visual_style_keywords ?? []).join(', ')}`,
      ``,
      designHint,
      ``,
      `UI PATTERNS TO INCORPORATE (pick 2-3 that fit the domain):`,
      patternHints,
      ``,
      `PAGES:`,
      ...intent.nav_tabs.map(t => `  ${t.id}: "${t.label}" (icon: ${t.icon}, layout: ${t.layout}) — ${t.purpose}`),
      ``,
      `FEATURES:`,
      ...(intent.feature_details ?? []).map(f => `  - ${f.name}: ${f.description}`),
      ...(contextBrief ? [
        ``,
        `COMPETITOR VISUAL PATTERNS:`,
        ...contextBrief.competitive_landscape.map(c => `  ${c.name}: ${c.visual_signature}`),
        `Layout blueprint from research: ${contextBrief.layout_blueprint ?? 'none'}`,
        `UI components suggested: ${(contextBrief.ui_component_suggestions ?? []).join(', ')}`,
      ] : []),
    ].join('\n');

    const useTools = supportsToolUse();
    const useCacheControl = supportsCacheControl();
    llmLog("design", { model: modelId });

    // Higher max_tokens for text path — thinking models consume tokens on reasoning
    const response = await client.messages.create({
      model: modelId,
      max_tokens: useTools ? 3000 : 8192,
      temperature: 0.9,
      system: useCacheControl
        ? [{ type: "text" as const, text: DESIGN_ARCHITECT_PROMPT, cache_control: { type: "ephemeral" as const } }]
        : DESIGN_ARCHITECT_PROMPT,
      messages: [{ role: "user", content: useTools
        ? userMessage
        : userMessage + "\n\nRespond with a single JSON object containing these fields: sections (array), nav_type, nav_items, hero_typography, section_typography, button_styles, animation_plan, color_strategy, component_tree (array), interaction_map (array). No markdown, no explanation — just JSON."
      }],
      ...(useTools ? {
        tools: [{
          name: "plan_design",
          description: "Produce a detailed design blueprint for a premium React app",
          input_schema: designBlueprintToolSchema,
          ...(useCacheControl ? { cache_control: { type: "ephemeral" as const } } : {}),
        }],
        tool_choice: { type: "tool" as const, name: "plan_design" },
      } : {}),
    }, { signal: controller.signal });

    clearTimeout(timeoutHandle);

    const usage = response.usage as unknown as Record<string, number>;
    recordSpend(calculateCost(modelId, {
      input_tokens: usage.input_tokens,
      output_tokens: usage.output_tokens,
      cache_read_input_tokens: usage.cache_read_input_tokens,
      cache_creation_input_tokens: usage.cache_creation_input_tokens,
    }));

    if (useTools) {
      const toolUse = response.content.find(b => b.type === "tool_use");
      if (!toolUse || toolUse.type !== "tool_use") return null;
      console.log("Design architect complete");
      return toolUse.input as DesignBlueprint;
    }

    // Text/JSON path for non-tool providers — handle thinking model responses
    const textContent = extractTextFromResponse(
      response.content as Array<{ type: string; text?: string; thinking?: string }>,
    );
    if (!textContent) return null;
    try {
      const parsed = JSON.parse(extractJSON(textContent));
      console.log("Design architect complete (text path)");
      return parsed as DesignBlueprint;
    } catch {
      console.warn("Design architect text parse failed — response (first 300 chars):", textContent.slice(0, 300));
      return null;
    }
  } catch (e) {
    clearTimeout(timeoutHandle);
    console.warn("Design architect failed (non-fatal):", e instanceof Error ? e.message : e);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Agent Swarm: Content Strategist                                    */
/* ------------------------------------------------------------------ */

const CONTENT_STRATEGIST_PROMPT = `You are an elite SaaS copywriter and content strategist.
Given an app concept, produce ALL the text content needed for a premium app that reads like it was written by a human, not generated by AI.

=== COPY VOICE — CLEAR, HUMAN, NOT MARKETING FLUFF ===
- Write like a REAL product, not a startup pitch deck. Avoid buzzwords like "revolutionize", "supercharge", "unleash", "game-changing", "next-gen", "seamlessly".
- Be SPECIFIC and CONCRETE. "Track 30+ nutrients per meal" beats "Powerful nutrition tracking".
- Use plain, confident language. Short sentences. Active voice. No exclamation marks in headlines.
- Headlines should describe what the product DOES, not how it makes you feel.

RULES:
- Hero headlines: concise, specific, under 10 words. State the value clearly — no hype.
- Hero headlines should have ONE accent phrase that could be visually emphasized. Structure the headline so one key phrase stands out.
- Subheadlines: expand on the value prop in 10-15 words. Be concrete, not vague.
- CTA labels: use domain-specific action verbs — NEVER generic "Submit" or "Get Started". Prefer "Log meal", "Create plan", "View report".
- Section titles: descriptive and specific. "Your weekly breakdown" not "Powerful Analytics".
- Sample data: provide 6-10 items with rich, REALISTIC fields (name, category, numeric metrics, status, tags). Data should look like it came from a real user, not a demo. For tool/analyzer apps, provide fewer but more detailed items.
- Badge labels should use domain terminology
- Field labels must match what real products in this space use
- Toast messages should be domain-specific and conversational ("Meal logged" not "Success!")
- Empty state text should be encouraging, actionable, and specific

Produce COMPLETE content — every piece of text the developer needs. Be specific to the domain.
ZERO emoji in any text content.`;

const contentMapToolSchema = {
  type: "object" as const,
  additionalProperties: false,
  properties: {
    hero_headline: { type: "string", description: "Bold, benefit-driven headline under 10 words" },
    hero_accent_phrase: { type: "string", description: "The key word(s) from the headline that should be colored with the primary color. Example: 'With AI Magic' or 'Instantly'" },
    hero_subheadline: { type: "string", description: "Value prop expansion in 10-15 words" },
    section_titles: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
        },
        required: ["id", "title", "description"],
      },
    },
    cta_labels: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          context: { type: "string", description: "Where this CTA appears" },
          label: { type: "string", description: "Domain-specific action verb label" },
        },
        required: ["context", "label"],
      },
    },
    sample_data: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: true,
      },
      minItems: 6,
      maxItems: 10,
      description: "6-10 HIGH-QUALITY sample items. Each must have rich fields (name, category, tags, numeric values for charts/progress, status, color hint). Enough to fill the grid and feel like a real product.",
    },
    empty_state_text: { type: "string", description: "Encouraging text shown when no data exists" },
    toast_messages: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          action: { type: "string" },
          message: { type: "string" },
          type: { type: "string", enum: ["success", "error", "info"] },
        },
        required: ["action", "message", "type"],
      },
    },
    badge_labels: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          value: { type: "string" },
          color: { type: "string", description: "Badge color class: sb-tag-primary, sb-tag-success, sb-tag-warning, sb-tag-error" },
        },
        required: ["value", "color"],
      },
    },
    field_labels: {
      type: "object",
      additionalProperties: { type: "string" },
      description: "Input field name -> label mapping using domain terminology",
    },
    placeholder_texts: {
      type: "object",
      additionalProperties: { type: "string" },
      description: "Input field name -> placeholder text mapping",
    },
  },
  required: ["hero_headline", "hero_subheadline", "section_titles", "cta_labels", "sample_data", "empty_state_text", "toast_messages", "badge_labels", "field_labels", "placeholder_texts"],
};

export async function planContent(
  client: Anthropic,
  modelId: string,
  intent: ReasonedIntent,
  contextBrief: AppContextBrief | null | undefined,
): Promise<ContentMap | null> {
  // Kimi K2.5 thinking models take ~90-120s per request — 30s timeout was killing these agents
  const timeoutMs = Number(process.env.STARTBOX_AGENT_TIMEOUT_MS ?? 90000);
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const userMessage = [
      `Write premium content for: "${intent.primary_goal}"`,
      ...(intent.reference_app ? [`REFERENCE PRODUCT: "${intent.reference_app}" — Use YOUR knowledge of this product. Write content that matches what users expect from this type of app.`] : []),
      `App: ${intent.app_name_hint} | Domain: ${intent.domain}`,
      `Target user: ${intent.target_user}`,
      `Key differentiator: ${intent.key_differentiator}`,
      `Design philosophy: ${intent.design_philosophy}`,
      ``,
      `PAGES:`,
      ...intent.nav_tabs.map(t => `  ${t.id}: "${t.label}" — ${t.purpose}`),
      ``,
      `FEATURES:`,
      ...(intent.premium_features ?? []).map(f => `  - ${f}`),
      ...(contextBrief ? [
        ``,
        `DOMAIN TERMINOLOGY FROM RESEARCH:`,
        `Field labels: ${JSON.stringify(contextBrief.domain_terminology?.field_labels ?? {})}`,
        `CTA verbs: ${(contextBrief.domain_terminology?.cta_verbs ?? []).join(', ')}`,
        `Section headers: ${(contextBrief.domain_terminology?.section_headers ?? []).join(', ')}`,
        `Target persona: ${contextBrief.target_persona?.role ?? 'general user'} — pain points: ${(contextBrief.target_persona?.pain_points ?? []).join(', ')}`,
      ] : []),
    ].join('\n');

    const useTools = supportsToolUse();
    const useCacheControl = supportsCacheControl();
    llmLog("content", { model: modelId });

    // Higher max_tokens for text path — thinking models consume tokens on reasoning
    const response = await client.messages.create({
      model: modelId,
      max_tokens: useTools ? 2000 : 8192,
      temperature: 0.9,
      system: useCacheControl
        ? [{ type: "text" as const, text: CONTENT_STRATEGIST_PROMPT, cache_control: { type: "ephemeral" as const } }]
        : CONTENT_STRATEGIST_PROMPT,
      messages: [{ role: "user", content: useTools
        ? userMessage
        : userMessage + "\n\nRespond with a single JSON object containing these fields: hero_headline, hero_subheadline, section_titles (array), cta_labels (array), sample_data (array of 6-10 items), empty_state_text, toast_messages (array), badge_labels (array), field_labels (object), placeholder_texts (object). No markdown, no explanation — just JSON."
      }],
      ...(useTools ? {
        tools: [{
          name: "plan_content",
          description: "Produce all text content for a premium React app",
          input_schema: contentMapToolSchema,
          ...(useCacheControl ? { cache_control: { type: "ephemeral" as const } } : {}),
        }],
        tool_choice: { type: "tool" as const, name: "plan_content" },
      } : {}),
    }, { signal: controller.signal });

    clearTimeout(timeoutHandle);

    const usage = response.usage as unknown as Record<string, number>;
    recordSpend(calculateCost(modelId, {
      input_tokens: usage.input_tokens,
      output_tokens: usage.output_tokens,
      cache_read_input_tokens: usage.cache_read_input_tokens,
      cache_creation_input_tokens: usage.cache_creation_input_tokens,
    }));

    if (useTools) {
      const toolUse = response.content.find(b => b.type === "tool_use");
      if (!toolUse || toolUse.type !== "tool_use") return null;
      console.log("Content strategist complete");
      return toolUse.input as ContentMap;
    }

    // Text/JSON path for non-tool providers — handle thinking model responses
    const textContent = extractTextFromResponse(
      response.content as Array<{ type: string; text?: string; thinking?: string }>,
    );
    if (!textContent) return null;
    try {
      const parsed = JSON.parse(extractJSON(textContent));
      console.log("Content strategist complete (text path)");
      return parsed as ContentMap;
    } catch {
      console.warn("Content strategist text parse failed — response (first 300 chars):", textContent.slice(0, 300));
      return null;
    }
  } catch (e) {
    clearTimeout(timeoutHandle);
    console.warn("Content strategist failed (non-fatal):", e instanceof Error ? e.message : e);
    return null;
  }
}

export function cleanGeneratedCode(rawCode: string): string {
  let code = (rawCode ?? "").trim();

  // STEP 0: If text contains markdown fences, extract ONLY the fenced code content.
  // This strips preamble text like "Here's the code:" and trailing explanations
  // that thinking models (Kimi K2.5) often output without <think> tags.
  const fencedCode = extractCodeFromFences(code);
  if (fencedCode) {
    code = fencedCode;
  } else {
    // No fences found — strip any preamble text before the actual code starts.
    // Look for the first line that looks like code (const, let, var, function, //, or JSX).
    const codeStartMatch = code.match(/^(const |let |var |function |\/\/|\/\*|<[A-Z])/m);
    if (codeStartMatch && codeStartMatch.index && codeStartMatch.index > 0) {
      const preamble = code.slice(0, codeStartMatch.index);
      // Only strip if the preamble looks like natural language (contains spaces and letters)
      if (/[a-zA-Z]\s+[a-zA-Z]/.test(preamble)) {
        console.log(`[cleanGeneratedCode] stripping ${preamble.length}-char preamble before code`);
        code = code.slice(codeStartMatch.index);
      }
    }
  }

  // Strip residual fence markers (handles partial/malformed fences)
  code = code
    .replace(/^```(?:jsx?|tsx?|javascript)?\n?/m, "")
    .replace(/\n?```$/m, "")
    .trim();

  // Strip any import/export statements (common LLM mistake — breaks Babel in-browser)
  code = code.replace(/^import\s+.*?from\s+['"][^'"]+['"];?\s*$/gm, '');
  code = code.replace(/^import\s+['"][^'"]+['"];?\s*$/gm, ''); // bare imports like import 'react';
  code = code.replace(/^export\s+(default\s+)?/gm, '');

  // Strip <style> JSX tags and raw CSS blocks — they crash in-browser Babel.
  // LLMs sometimes emit @keyframes or @property despite being told not to.
  code = code.replace(/<style[^>]*>\{?[`'"]\s*[\s\S]*?[`'"]\}?\s*<\/style>/g, '');
  code = code.replace(/<style[^>]*>[\s\S]*?<\/style>/g, '');

  // Strip TypeScript syntax — Babel react+env presets can't parse TS.
  // These are common LLM mistakes even when told to output plain JSX.
  // IMPORTANT: Only strip COMPLETE syntactic units to avoid leaving dangling
  // characters (e.g. stripping "string" from "string | null" leaves bare "|").

  // 1. Remove standalone interface/type declarations (full blocks — safe to remove entirely)
  code = code.replace(/^(?:export\s+)?interface\s+\w+\s*\{[^}]*\}\s*;?\s*$/gm, '');
  code = code.replace(/^(?:export\s+)?type\s+\w+\s*=\s*[^;]+;\s*$/gm, '');
  // 2. Remove TS generic annotations on hooks: useState<Type>(...) → useState(...)
  code = code.replace(/(use(?:State|Ref|Callback|Memo|Reducer))<[^>]+>/g, '$1');
  // 3. Remove React.FC / React.FunctionComponent<Props> type annotations on arrow components
  code = code.replace(/:\s*React\.(?:FC|FunctionComponent)(?:<[^>]*>)?\s*=/g, ' =');
  // NOTE: We intentionally do NOT strip inline type annotations (param types,
  // return types, "as" casts) because partial stripping of union types like
  // "string | number" leaves bare "|" characters that cause Babel SyntaxErrors.
  // The system prompt + repair prompt both say "no TypeScript" to prevent these.

  // Fix icon destructuring syntax (e.g. "as" aliases to proper destructuring)
  code = sanitizeIconDestructuring(code);

  // Fix bare SDK calls — model sometimes writes useStore() instead of window.__sb.useStore()
  // Only fix calls that are NOT already prefixed with __sb. or window.__sb.
  code = code.replace(/(?<!\w)(?<!__sb\.)(?<!window\.__sb\.)useStore\s*\(/g, 'window.__sb.useStore(');
  code = code.replace(/(?<!\w)(?<!__sb\.)(?<!window\.__sb\.)toast\s*\(/g, 'window.__sb.toast(');

  // Strip external image URLs — replace with SDK placeholder helper
  code = code.replace(/['"]https?:\/\/(?:picsum\.photos|images\.unsplash\.com|via\.placeholder\.com|source\.unsplash\.com)[^'"]*['"]/g, 'window.__sb.img()');

  // Ensure React destructuring exists — if imports were stripped, hooks would be undefined.
  // This must come before the render check since it prepends to the code.
  if (code.length > 200 && !code.includes('= React') && !code.includes('React.useState')) {
    // Detect which hooks are used in the code
    const usedHooks = ['useState', 'useEffect', 'useRef', 'useCallback', 'useMemo', 'useReducer']
      .filter(h => code.includes(h));
    if (usedHooks.length > 0) {
      console.warn(`Auto-injecting React destructuring for: ${usedHooks.join(', ')}`);
      code = `const {${usedHooks.join(', ')}} = React;\n${code}`;
    }
  }

  // Ensure LucideReact destructuring exists AND includes ALL used icon names.
  // The iframe's LucideReact Proxy returns a fallback for any missing icon name, so we just
  // need the destructuring to exist — it doesn't matter which icons are listed.
  if (code.length > 200) {
    // Extract PascalCase names used as icons — JSX tags + variable references (icon={Plus}, icon: Plus)
    const jsxTags = [...new Set([
      ...(code.match(/<([A-Z][a-zA-Z]+)[\s/>]/g) || []).map(t => t.slice(1, -1)),
      ...(code.match(/[iI]con[=:{]\s*\{?\s*([A-Z][a-zA-Z]+)/g) || []).map(m => m.replace(/^[iI]con[=:{]\s*\{?\s*/, '')),
    ])];
    const definedComponents = new Set(
      (code.match(/(?:function|const)\s+([A-Z][a-zA-Z]+)/g) || []).map(m => m.split(/\s+/).pop() ?? '')
    );
    const iconNames = jsxTags.filter(t => !definedComponents.has(t) && t !== 'App');

    if (!code.includes('window.LucideReact') && !code.includes('lucideReact')) {
      // No destructuring at all — inject one with all detected icons
      if (iconNames.length > 0) {
        console.warn(`Auto-injecting LucideReact destructuring for: ${iconNames.join(', ')}`);
        code = `const {${iconNames.join(', ')}} = window.LucideReact || {};\n${code}`;
      }
    } else if (iconNames.length > 0) {
      // Destructuring exists but may be missing some icons — merge missing ones in
      const destructMatch = code.match(/const\s*\{([^}]+)\}\s*=\s*window\.LucideReact\s*\|\|\s*\{\};/);
      if (destructMatch) {
        const existing = new Set(
          destructMatch[1].split(',').map((s: string) => s.trim().split(/[\s:]/)[0]).filter(Boolean)
        );
        const missing = iconNames.filter(n => !existing.has(n));
        if (missing.length > 0) {
          const allIcons = [...existing, ...missing].join(', ');
          console.warn(`Merging missing icons into LucideReact destructuring: ${missing.join(', ')}`);
          code = code.replace(destructMatch[0], `const {${allIcons}} = window.LucideReact || {};`);
        }
      }
    }
  }

  // Ensure cn helper exists if used — the SDK provides it but code might use it without the assignment
  if (code.includes('cn(') && !code.includes('const cn') && !code.includes('= window.__sb.cn')) {
    code = `const cn = window.__sb.cn;\n${code}`;
  }

  // Ensure render call exists — if missing, append it
  if (code.length > 100 && !code.includes('createRoot')) {
    code += '\nReactDOM.createRoot(document.getElementById("root")).render(<App />);';
  }

  return code;
}

/**
 * Repair truncated code from streaming interruptions.
 * Closes unclosed braces/parens/tags and ensures the render call exists.
 */
export function repairTruncatedCode(code: string): string {
  if (!code || code.trim().length < 50) return code;

  let repaired = code;

  // Count open vs close braces and parens
  const openBraces = (repaired.match(/\{/g) || []).length;
  const closeBraces = (repaired.match(/\}/g) || []).length;
  const openParens = (repaired.match(/\(/g) || []).length;
  const closeParens = (repaired.match(/\)/g) || []).length;

  // Close unclosed parens first, then braces
  for (let i = 0; i < openParens - closeParens; i++) {
    repaired += ')';
  }
  for (let i = 0; i < openBraces - closeBraces; i++) {
    repaired += '\n}';
  }

  // Close unclosed JSX tags — find opened tags without matching close
  const openTags = repaired.match(/<([A-Z][a-zA-Z0-9]*)[^/>]*(?<!\/)>/g) || [];
  const closeTags = repaired.match(/<\/([A-Z][a-zA-Z0-9]*)>/g) || [];
  const openTagNames = openTags.map(t => (t.match(/<([A-Z][a-zA-Z0-9]*)/) || [])[1]).filter(Boolean);
  const closeTagNames = closeTags.map(t => (t.match(/<\/([A-Z][a-zA-Z0-9]*)>/) || [])[1]).filter(Boolean);

  // Build a stack of unclosed tags
  const tagStack: string[] = [];
  for (const tag of openTagNames) {
    tagStack.push(tag);
  }
  for (const tag of closeTagNames) {
    const idx = tagStack.lastIndexOf(tag);
    if (idx !== -1) tagStack.splice(idx, 1);
  }

  // Close remaining open tags in reverse order
  for (let i = tagStack.length - 1; i >= 0; i--) {
    repaired += `</${tagStack[i]}>`;
  }

  // Ensure render call exists
  if (!repaired.includes('createRoot')) {
    repaired += '\nReactDOM.createRoot(document.getElementById("root")).render(<App />);';
  }

  return repaired;
}

export function validateGeneratedCode(code: string): { valid: boolean; issues: string[] } {
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

  // Detect conditional hook calls (common cause of React error #311)
  if (/if\s*\([^)]*\)\s*\{[^}]*use(State|Effect|Callback|Memo|Ref)\s*\(/m.test(code)) {
    issues.push('Hooks called inside if blocks (will crash with error #311)');
  }
  if (/\?\s*use(State|Effect|Callback|Memo|Ref)\s*\(/m.test(code)) {
    issues.push('Hooks called inside ternary (will crash with error #311)');
  }

  // Detect TypeScript syntax that Babel react+env presets can't compile
  if (/^(?:export\s+)?interface\s+\w+\s*\{/m.test(code)) {
    issues.push('Contains TypeScript interface declarations (will break Babel)');
  }
  if (/^(?:export\s+)?type\s+\w+\s*=/m.test(code)) {
    issues.push('Contains TypeScript type aliases (will break Babel)');
  }

  // Check for missing React destructuring — if imports were stripped, hooks are undefined
  if (!code.includes('= React') && !code.includes('React.useState')) {
    issues.push('Missing React destructuring (const {useState, ...} = React)');
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

const VIRTUAL_TEMPLATE_CLEANUP = [
  'entities/Conversation',
  'chat/Message Bubble',
  'chat/Typing Indicator',
  'chat/Chat Input',
  'chat/Conversation Sidebar',
  'chat/Empty State',
  'Chat Page',
] as const;

function cleanTimelineLabel(raw: string, fallback: string): string {
  const cleaned = raw
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s/-]/g, '')
    .trim();
  return cleaned.length > 0 ? cleaned.slice(0, 72) : fallback;
}

function emitVirtualBuildOperations(intent: ReasonedIntent, onProgress?: ProgressCallback) {
  if (!onProgress) return;

  for (const path of VIRTUAL_TEMPLATE_CLEANUP) {
    onProgress({
      type: 'deleted',
      message: `Deleted ${path}`,
      data: { path, operation: 'delete', virtual: true },
    });
  }

  const pageTargets = (intent.nav_tabs ?? [])
    .map((tab) => cleanTimelineLabel(`${tab.label} Page`, 'Main Page'));
  const uniquePageTargets = Array.from(new Set(pageTargets)).slice(0, 8);
  for (const path of uniquePageTargets) {
    onProgress({
      type: 'writing',
      message: `Wrote ${path}`,
      data: { path, operation: 'write', kind: 'page', virtual: true },
    });
  }

  const featureTargets = (intent.feature_details ?? [])
    .map((feature) => cleanTimelineLabel(feature.name, 'Core Feature'))
    .filter(Boolean);
  const uniqueFeatures = Array.from(new Set(featureTargets)).slice(0, 8);
  for (const feature of uniqueFeatures) {
    const path = `features/${feature}`;
    onProgress({
      type: 'writing',
      message: `Wrote ${path}`,
      data: { path, operation: 'write', kind: 'feature', virtual: true },
    });
  }
}

/* ------------------------------------------------------------------ */
/*  Text code generation — for providers that reject tool_choice       */
/*  (e.g., Kimi/Moonshot thinking models)                              */
/* ------------------------------------------------------------------ */

// File-based diagnostic log (temporary) — writes to codegen-debug.log so we can inspect
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { getUnifiedClient } from "./unifiedClient.js";
const __diag_dir = dirname(fileURLToPath(import.meta.url));
const DIAG_LOG = __diag_dir + "/../../codegen-debug.log";
const DIAG_FILE_ENABLED = !!process.env.STARTBOX_DIAG_LOG;
function diagLog(msg: string) {
  if (DIAG_FILE_ENABLED) {
    const line = `[${new Date().toISOString()}] ${msg}\n`;
    try { appendFileSync(DIAG_LOG, line); } catch (e) { console.warn("[diagLog] write failed:", String(e)); }
  }
  console.log(msg);
}

async function runTextCodeGeneration(
  client: Anthropic,
  modelId: string,
  systemPrompt: string,
  userMessage: string,
  onProgress?: ProgressCallback,
): Promise<CodeGenerationResult | null> {
  const timeoutMs = Number(process.env.STARTBOX_CODEGEN_TIMEOUT_MS ?? 240000);
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);
  const heartbeatMessages = [
    "Planning component structure...",
    "Drafting UI sections...",
    "Wiring interactivity...",
    "Applying domain language...",
    "Finalizing code output...",
  ];
  let heartbeatIndex = 0;
  const heartbeat = setInterval(() => {
    if (!onProgress) return;
    const msg = heartbeatMessages[Math.min(heartbeatIndex, heartbeatMessages.length - 1)];
    onProgress({ type: "status", message: msg });
    heartbeatIndex += 1;
  }, 20000);

  try {
    const maxTokens = 32000;
    diagLog(`[text-codegen] starting — model: ${modelId}, max_tokens: ${maxTokens}, timeout: ${timeoutMs / 1000}s`);
    diagLog(`[text-codegen] system prompt: ${systemPrompt.length} chars`);
    diagLog(`[text-codegen] user message: ${userMessage.length} chars`);
    onProgress?.({ type: 'writing', message: 'Generating code (text mode)...', data: { milestone: true } });

    // Use streaming to avoid Anthropic SDK "Streaming is required for operations
    // that may take longer than 10 minutes" rejection on high max_tokens
    const stream = client.messages.stream({
      model: modelId,
      max_tokens: maxTokens,
      temperature: 0.7,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage + "\n\nIMPORTANT: Output ONLY the complete React JSX code. No markdown fences, no explanation, no JSON wrapping. Just the raw code starting with `const {useState, ...} = React;`" }],
    });

    // Wire abort signal to cancel the stream
    const abortHandler = () => stream.abort();
    controller.signal.addEventListener("abort", abortHandler, { once: true });

    const response = await stream.finalMessage();
    controller.signal.removeEventListener("abort", abortHandler);
    clearTimeout(timeoutHandle);

    const usage = response.usage as unknown as Record<string, number>;
    recordSpend(calculateCost(modelId, {
      input_tokens: usage.input_tokens,
      output_tokens: usage.output_tokens,
    }));

    const stopReason = (response as unknown as Record<string, unknown>).stop_reason ?? "unknown";
    const blockTypes = response.content.map(b => b.type);
    diagLog(`[text-codegen] API response — stop_reason: ${String(stopReason)}, input_tokens: ${usage.input_tokens}, output_tokens: ${usage.output_tokens}, content_blocks: [${blockTypes.join(", ")}]`);

    // Log raw content blocks for diagnosis
    for (let i = 0; i < response.content.length; i++) {
      const block = response.content[i] as unknown as Record<string, unknown>;
      diagLog(`[text-codegen] block[${i}] type="${block.type}", text_length=${typeof block.text === 'string' ? block.text.length : 'N/A'}, thinking_length=${typeof block.thinking === 'string' ? block.thinking.length : 'N/A'}`);
      if (typeof block.text === 'string') {
        diagLog(`[text-codegen] block[${i}] first 300 chars: ${block.text.slice(0, 300)}`);
      }
    }

    const textContent = extractTextFromResponse(
      response.content as Array<{ type: string; text?: string; thinking?: string }>,
    );

    diagLog(`[text-codegen] extracted text after thinking strip: ${textContent.length} chars`);
    if (textContent.length > 0) {
      diagLog(`[text-codegen] first 500 chars: ${textContent.slice(0, 500)}`);
      diagLog(`[text-codegen] last 200 chars: ${textContent.slice(-200)}`);
    }

    if (!textContent) {
      diagLog("[text-codegen] FAIL PATH 1: empty response after stripping thinking content");
      return null;
    }

    // Try to extract as JSON first (model may wrap in JSON)
    let rawCode = textContent;
    try {
      const jsonStr = extractJSON(textContent);
      const parsed = JSON.parse(jsonStr);
      if (parsed.generated_code) {
        const cleaned = cleanGeneratedCode(parsed.generated_code);
        diagLog(`[text-codegen] JSON path — generated_code found, cleaned: ${cleaned?.length ?? 0} chars`);
        if (cleaned && cleaned.length > 200) {
          return {
            generated_code: cleaned,
            app_name: parsed.app_name ?? "App",
            tagline: parsed.tagline ?? "",
            primary_color: parsed.primary_color ?? "#3b82f6",
            icon: parsed.icon ?? "Zap",
            pages: parsed.pages ?? [],
            quality_score: 0,
            quality_breakdown: {} as QualityBreakdown,
            pipeline_artifact: {} as PipelineRunArtifact,
          };
        }
      }
    } catch {
      diagLog("[text-codegen] not JSON, treating as raw code");
    }

    // Clean as raw code
    rawCode = cleanGeneratedCode(rawCode);
    diagLog(`[text-codegen] raw code path — cleaned: ${rawCode?.length ?? 0} chars`);
    if (rawCode && rawCode.length > 0 && rawCode.length < 500) {
      diagLog(`[text-codegen] cleaned code (full): ${rawCode}`);
    }

    // Fix 4: fence extraction fallback
    if (!rawCode || rawCode.length < 200) {
      const fencedFallback = extractCodeFromFences(textContent);
      if (fencedFallback && fencedFallback.length > (rawCode?.length ?? 0)) {
        diagLog(`[text-codegen] fence extraction fallback: ${fencedFallback.length} chars (was ${rawCode?.length ?? 0})`);
        rawCode = cleanGeneratedCode(fencedFallback);
        diagLog(`[text-codegen] fence fallback after cleaning: ${rawCode?.length ?? 0} chars`);
      }
    }

    if (!rawCode || rawCode.length < 200) {
      rawCode = repairTruncatedCode(rawCode);
    }
    if (!rawCode || rawCode.length < 100) {
      diagLog(`[text-codegen] FAIL PATH 2: code too short after all cleaning: ${rawCode?.length ?? 0} chars`);
      diagLog(`[text-codegen] original text length was: ${textContent.length} chars`);
      clearInterval(heartbeat);
      return null;
    }

    diagLog(`[text-codegen] SUCCESS: returning ${rawCode.length} chars of code`);
    clearInterval(heartbeat);
    return {
      generated_code: rawCode,
      app_name: "App",
      tagline: "",
      primary_color: "#3b82f6",
      icon: "Zap",
      pages: [],
      quality_score: 0,
      quality_breakdown: {} as QualityBreakdown,
      pipeline_artifact: {} as PipelineRunArtifact,
    };
  } catch (e) {
    clearTimeout(timeoutHandle);
    diagLog(`[text-codegen] EXCEPTION: ${e instanceof Error ? e.message : String(e)}`);
    if (controller.signal.aborted) {
      throw new Error(`Code generation timed out after ${timeoutMs}ms`);
    }
    throw e;
  } finally {
    clearInterval(heartbeat);
  }
}

/* ------------------------------------------------------------------ */
/*  Tool-use code generation (Anthropic providers)                     */
/* ------------------------------------------------------------------ */

export async function runToolCodeGeneration(
  client: Anthropic,
  modelId: string,
  systemPrompt: string,
  userMessage: string,
  onProgress?: ProgressCallback,
): Promise<CodeGenerationResult | null> {
  const timeoutMs = Number(process.env.STARTBOX_CODEGEN_TIMEOUT_MS ?? 240000);

  // Use streaming with AbortController so timeouts actually cancel the request
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const useCacheControl = supportsCacheControl();
    console.log(`Code gen starting — model: ${modelId}, max_tokens: 32000, timeout: ${timeoutMs / 1000}s`);
    const stream = client.messages.stream({
      model: modelId,
      max_tokens: 32000,
      temperature: 0.85,
      system: useCacheControl
        ? [{ type: "text" as const, text: systemPrompt, cache_control: { type: "ephemeral" as const } }]
        : [{ type: "text" as const, text: systemPrompt }],
      messages: [{ role: "user", content: userMessage }],
      tools: [
        {
          name: "generate_react_app",
          description:
            "Generate a complete, single-file React application with all features. ZERO emoji allowed.",
          input_schema: codeGenToolSchema,
          ...(useCacheControl ? { cache_control: { type: "ephemeral" as const } } : {}),
        },
      ],
      tool_choice: { type: "tool", name: "generate_react_app" },
    }, { signal: controller.signal });

    stream.on('error', (err: unknown) => {
      clearTimeout(timeoutHandle);
      console.error('Stream error event:', err);
    });

    // Hook into streaming to detect components + emit progress milestones in real-time
    const detectedComponents = new Set<string>();
    const componentPattern = /function\s+([A-Z][A-Za-z0-9]+)\s*\(/g;
    const constComponentPattern = /const\s+([A-Z][A-Za-z0-9]+)\s*=\s*(?:\(|function)/g;

    // Character-count milestones — distributed across the build timeline
    const charMilestones: Array<{ threshold: number; message: string; fired: boolean }> = [
      { threshold: 200, message: "Initializing project structure...", fired: false },
      { threshold: 1000, message: "Compiling component modules...", fired: false },
      { threshold: 2400, message: "Linking interactive elements...", fired: false },
      { threshold: 4200, message: "Bundling data layer...", fired: false },
      { threshold: 6200, message: "Optimizing render pipeline...", fired: false },
      { threshold: 8200, message: "Running final build pass...", fired: false },
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

      // Emit character-count milestones (wrapped in try-catch to prevent stream crash)
      try {
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
      } catch (e) {
        console.warn("Progress callback error in stream handler:", e instanceof Error ? e.message : e);
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
    const cost = calculateCost(modelId, {
      input_tokens: usage.input_tokens,
      output_tokens: usage.output_tokens,
      cache_read_input_tokens: usage.cache_read_input_tokens,
      cache_creation_input_tokens: usage.cache_creation_input_tokens,
    });
    console.log(`Code gen tokens — input: ${usage.input_tokens} (cached: ${usage.cache_read_input_tokens ?? 0}, wrote: ${usage.cache_creation_input_tokens ?? 0}), output: ${usage.output_tokens} (est cost: $${cost.toFixed(3)})`);
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
      // Attempt to repair truncation damage from interrupted stream
      if (cleanCode) {
        cleanCode = repairTruncatedCode(cleanCode);
        console.warn(`Applied truncation repair to snapshot recovery`);
      }
    }

    if (!cleanCode || cleanCode.trim().length < 100) {
      console.error("Code generation produced empty/short code after cleaning. Raw length:", (raw.generated_code ?? "").length, "Clean length:", cleanCode?.length ?? 0, "Snapshot length:", typeof lastSnapshot.generated_code === 'string' ? lastSnapshot.generated_code.length : 0);
      return null;
    }

    const validation = validateGeneratedCode(cleanCode);
    if (!validation.valid) {
      console.warn(`Code validation issues: ${validation.issues.join(', ')}`);
    }

    // Sanitize exact brand names from app name (only block exact matches, not inspired-by names)
    let appName = raw.app_name ?? "App";
    const FORBIDDEN_EXACT_NAMES = /^(cal\.?ai|notion|spotify|robinhood|figma|slack|uber|airbnb)$/i;
    if (FORBIDDEN_EXACT_NAMES.test(appName.trim())) {
      console.warn(`Blocked exact brand name: "${appName}" — code gen should use an original name`);
      appName = "App";
    }

    return {
      generated_code: cleanCode,
      app_name: appName,
      tagline: raw.tagline ?? "",
      primary_color: raw.primary_color ?? "#3b82f6",
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

/* ------------------------------------------------------------------ */
/*  AutoFix repair pass — improves low-quality generated code           */
/* ------------------------------------------------------------------ */

export async function repairGeneratedCode(
  client: Anthropic,
  modelId: string,
  originalCode: string,
  repairInstructions: string,
  onProgress?: ProgressCallback,
): Promise<string | null> {
  const REPAIR_SYSTEM = `You are a senior UI engineer. Fix the listed issues in this React app code.
Return ONLY the complete fixed code. No explanation, no markdown fences.
Preserve ALL existing functionality and the app's unique design — only fix the specific issues listed.
The code runs via Babel in-browser — NO imports, NO exports, NO TypeScript. Plain JavaScript/JSX only.
NEVER use <style> tags, @keyframes, or @property — they crash the Babel compiler. All animations must use inline styles with transition + React state.
Keep ReactDOM.createRoot(...).render(<App />) as the last line.
Required first lines: const {useState, useEffect, ...} = React; and const {IconName, ...} = window.LucideReact || {};

Preserve the app's typography hierarchy and readability.

Focus on:
- Fixing broken interactivity (buttons that don't work, missing event handlers)
- Fixing conditional hooks (all hooks must be at top of component, never inside if/loop)
- Ensuring render call exists
- Improving spacing and readability if cramped
- Fixing undefined variable references
- Using prompt-specific domain keywords naturally in headings, labels, card titles, and data values
- Use var(--sb-primary) and window.__sb.color(P, opacity) for brand colors.`;

  const userMessage = [
    `FIX THESE ISSUES:`,
    repairInstructions,
    ``,
    `CURRENT CODE:`,
    originalCode,
    ``,
    `Return the COMPLETE fixed code with all existing features preserved. Fix ONLY the issues listed above.`,
  ].join('\n');

  const timeoutMs = 120000;
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

  try {
    onProgress?.({ type: 'status', message: 'Optimizing visual quality...' });
    llmLog("repair", { model: modelId });
    const response = await client.messages.create({
      model: modelId,
      max_tokens: 32000,
      temperature: 0.5,
      system: REPAIR_SYSTEM,
      messages: [{ role: "user", content: userMessage }],
    }, { signal: controller.signal });
    clearTimeout(timeoutHandle);

    const usage = response.usage as unknown as Record<string, number>;
    const cost = calculateCost(modelId, { input_tokens: usage.input_tokens, output_tokens: usage.output_tokens });
    recordSpend(cost);
    console.log(`Repair pass tokens — input: ${usage.input_tokens}, output: ${usage.output_tokens} (est cost: $${cost.toFixed(3)})`);

    // Use extractTextFromResponse to handle thinking model responses
    const text = extractTextFromResponse(
      response.content as Array<{ type: string; text?: string; thinking?: string }>,
    );

    const cleaned = cleanGeneratedCode(text);
    if (!cleaned || cleaned.length < 200) return null;

    const validation = validateGeneratedCode(cleaned);
    if (!validation.valid) {
      console.warn(`Repair output validation issues: ${validation.issues.join(', ')}`);
      return null;
    }

    return cleaned;
  } catch (e) {
    clearTimeout(timeoutHandle);
    console.warn("Repair pass failed:", e instanceof Error ? e.message : e);
    return null;
  }
}

export async function generateReactCode(
  intent: ReasonedIntent,
  originalPrompt: string,
  model: "kimi" = "kimi",
  onProgress?: ProgressCallback,
  contextBrief?: AppContextBrief | null,
  liveComponents?: Array<{ name: string; category: string; description: string; codeHint: string }> | null,
  templateHtmlStructure?: string | null,
): Promise<CodeGenerationResult | null> {
  const client = getUnifiedClient();
  const modelId = resolveModel("standard");
  const fastModelId = resolveModel("fast");

  const themeStyle = intent.theme_style ?? 'light';
  // Select UI patterns once and use across both design architect and code gen
  const selectedUIPatterns = selectUIPatterns(6);
  console.log(`Selected UI patterns: ${selectedUIPatterns.map(p => p.name).join(', ')}`);
  let systemPrompt = buildCodeGenSystemPrompt(themeStyle, selectedUIPatterns);

  // Inject live 21st.dev components if available
  if (liveComponents && liveComponents.length > 0) {
    const { format21stDevComponents } = await import("./twentyFirstDevSearch.js");
    const section = format21stDevComponents(liveComponents as any);
    if (section) {
      systemPrompt += `\n\n${section}`;
      console.log(`[21st.dev] Injected ${liveComponents.length} live components into system prompt`);
    }
  }

  // Inject template HTML structure if available (from Webflow/Vercel/Netlify scraping)
  if (templateHtmlStructure && templateHtmlStructure.length > 100) {
    systemPrompt += `\n\n=== TEMPLATE STRUCTURE REFERENCE ===
Adapt this HTML structure into React + Tailwind. Do NOT copy verbatim —
use it as a structural guide for layout, sections, and component hierarchy.
Strip any Webflow-specific classes and replace with Tailwind utilities.\n\n${templateHtmlStructure}`;
    console.log(`[Template HTML] Injected ${templateHtmlStructure.length} chars of structural HTML into system prompt`);
  }

  /* ---------------------------------------------------------------- */
  /*  Phase 1: Parallel Planning Agents (Design Architect + Content)   */
  /* ---------------------------------------------------------------- */

  onProgress?.({ type: 'status', message: 'Designing app architecture...' });
  onProgress?.({ type: 'status', message: 'Planning UI blueprint and content strategy...' });

  const [designBlueprint, contentMap] = await Promise.all([
    planDesign(client, fastModelId, intent, contextBrief).catch((e) => {
      console.warn("Design agent failed:", e);
      return null;
    }),
    planContent(client, fastModelId, intent, contextBrief).catch((e) => {
      console.warn("Content agent failed:", e);
      return null;
    }),
  ]);

  if (designBlueprint) {
    console.log(`Design blueprint: ${designBlueprint.sections.length} sections, ${designBlueprint.component_tree.length} components, ${designBlueprint.interaction_map.length} interactions`);
  }
  if (contentMap) {
    console.log(`Content map: "${contentMap.hero_headline}", ${contentMap.sample_data.length} sample items, ${contentMap.cta_labels.length} CTAs`);
  }
  if (!designBlueprint && !contentMap) {
    console.warn("Both planning agents failed — proceeding with minimal context");
    onProgress?.({ type: 'status', message: 'Planning agents unavailable — generating with base intent...' });
  }

  /* ---------------------------------------------------------------- */
  /*  Phase 2: Code Synthesis — enhanced with planning agent outputs   */
  /* ---------------------------------------------------------------- */

  const tabList = intent.nav_tabs.map(t =>
    `  ${t.id}: "${t.label}" (icon: ${t.icon}, layout: ${t.layout}) — ${t.purpose}`
  ).join("\n");

  const featureDetails = (intent.feature_details ?? []).map(f =>
    `  - ${f.name}: ${f.description}`
  ).join("\n");

  const firstTab = intent.nav_tabs[0];
  const firstTabId = firstTab?.id ?? 'main';

  // Extract competitor visuals (from Kimi Visual Agent, if available)
  const competitorVisuals = (contextBrief as Record<string, unknown> | undefined)?.competitor_visuals as
    Array<{ name: string; url?: string; colors: string[]; layout_signals: string[]; screenshot_analysis: {
      color_palette: string[]; layout_type: string; component_patterns: string[];
      navigation_style: string; image_usage: string; interactive_elements: string[];
      key_ui_to_replicate: string[];
      background_treatment?: string; card_design_spec?: string; typography_hierarchy?: string;
      spacing_pattern?: string; gradient_specs?: string[]; border_and_shadow_system?: string;
      hero_section_spec?: string; section_patterns?: string[];
    } | null }> | undefined;

  const baseUserMessage = [
    `Build: "${originalPrompt}"`,
    // If user referenced a real product, make it the most prominent signal
    ...(intent.reference_app ? [
      `REFERENCE PRODUCT: "${intent.reference_app}" — Use YOUR knowledge of this product. Build the SAME type of app (same domain, same core features, same UX patterns) with an original name. This is the most important context.`,
    ] : []),
    `GOAL: ${intent.primary_goal}`,
    `APP: ${intent.app_name_hint} | Color: ${intent.primary_color} | Theme: ${themeStyle}`,
    ``,
    `PAGES:`,
    tabList,
    `Default: "${firstTabId}"`,
    ``,
    `FEATURES:`,
    featureDetails || `  - ${intent.premium_features?.join("\n  - ") ?? "standard"}`,
    ...(intent.domain_keywords?.length ? [
      ``,
      `DOMAIN KEYWORDS (must appear naturally in UI copy): ${intent.domain_keywords.join(", ")}`,
    ] : []),
    ``,
    // Only include intent-level design hints when no design blueprint is available
    ...(!designBlueprint ? [
      `LAYOUT: ${intent.layout_blueprint}`,
      `DISPLAY: ${intent.item_display_format}`,
      `TYPOGRAPHY: ${intent.typography_style}`,
      `HERO: ${intent.visual_requirements.hero_pattern}`,
      `CARDS: ${intent.visual_requirements.card_style}`,
      `DENSITY: ${intent.visual_requirements.data_density}`,
      `COLOR: ${intent.visual_requirements.color_usage}`,
    ] : []),
    ``,
    // --- PER-APP DESIGN TOKENS (from reasoner) ---
    ...(intent.design_tokens ? [
      `=== DESIGN TOKENS (additional theming context from reasoner) ===`,
      `The reasoner suggests these colors for this app's domain:`,
      `  secondary: ${intent.design_tokens.colors.secondary}`,
      `  accent: ${intent.design_tokens.colors.accent}`,
      `  background: ${intent.design_tokens.colors.background}`,
      `  surface: ${intent.design_tokens.colors.surface}`,
      `  text: ${intent.design_tokens.colors.text}`,
      `  muted: ${intent.design_tokens.colors.muted}`,
      `  heading font: ${intent.design_tokens.typography.headings.font}`,
      `  body font: ${intent.design_tokens.typography.body.font}`,
      `Use the --sb-primary / --sb-primary-glow / --sb-primary-bg tokens set at the top of your code for the primary color.`,
      `For secondary/accent colors, use the hex values above directly or set additional --sb-secondary / --sb-accent properties.`,
      ``,
    ] : []),
    // --- DESIGN BLUEPRINT from Agent A ---
    ...(designBlueprint ? [
      `=== DESIGN BLUEPRINT (from Design Architect — use as guidance, adapt for better UX if needed) ===`,
      `Navigation: ${designBlueprint.nav_type}`,
      `Hero typography: ${designBlueprint.hero_typography}`,
      `Hero accent word(s): ${designBlueprint.hero_accent || 'color one key phrase with primary color'}`,
      `Hero background: ${designBlueprint.hero_background || 'domain-appropriate treatment (solid, gradient, image, or texture)'}`,
      `Section typography: ${designBlueprint.section_typography}`,
      `Buttons: ${designBlueprint.button_styles}`,
      `Animations: ${designBlueprint.animation_plan}`,
      `Colors: ${designBlueprint.color_strategy}`,
      ``,
      `SECTIONS (build these in order):`,
      ...designBlueprint.sections.map((s, i) =>
        `  ${i + 1}. [${s.type}] "${s.id}" — ${s.purpose}\n     bg: ${s.background} | cards: ${s.card_type} | grid: ${s.grid_layout} | spacing: ${s.spacing}`
      ),
      ``,
      `COMPONENTS TO BUILD:`,
      ...designBlueprint.component_tree.map(c =>
        `  - ${c.name}: ${c.responsibility} (props: ${c.props})`
      ),
      ``,
      `INTERACTION MAP (every element must be functional):`,
      ...designBlueprint.interaction_map.map(i =>
        `  - ${i.element}: ${i.action} -> ${i.state_change}`
      ),
      ``,
    ] : []),
    // --- CONTENT MAP from Agent B ---
    ...(contentMap ? [
      `=== CONTENT MAP (from Content Strategist — use as guidance, adapt to fit the design) ===`,
      `Hero headline: "${contentMap.hero_headline}"`,
      `Hero accent phrase (color this with primary color or sb-gradient-text): "${contentMap.hero_accent_phrase || ''}"`,
      `Hero subheadline: "${contentMap.hero_subheadline}"`,
      ``,
      `Section titles:`,
      ...contentMap.section_titles.map(s => `  - ${s.id}: "${s.title}" — ${s.description}`),
      ``,
      `CTA labels:`,
      ...contentMap.cta_labels.map(c => `  - ${c.context}: "${c.label}"`),
      ``,
      `Field labels: ${JSON.stringify(contentMap.field_labels)}`,
      `Placeholders: ${JSON.stringify(contentMap.placeholder_texts)}`,
      ``,
      `Badges: ${contentMap.badge_labels.map(b => `"${b.value}" (${b.color})`).join(', ')}`,
      `Empty state: "${contentMap.empty_state_text}"`,
      ``,
      `Toast messages:`,
      ...contentMap.toast_messages.map(t => `  - ${t.action}: toast("${t.message}", "${t.type}")`),
      ``,
      `SAMPLE DATA (adapt these examples to fit the final UI; max 6 concise items):`,
      `${JSON.stringify(contentMap.sample_data.slice(0, 6), null, 2)}`,
      ``,
    ] : []),
    // UI pattern hints — same patterns used in system prompt, reinforced here
    `=== UI PATTERNS TO IMPLEMENT (make this app visually unique) ===`,
    `Incorporate at least 2 of these specific techniques:`,
    ...selectedUIPatterns.map(p => `  - ${p.name}: ${p.description}`),
    `These are CSS-only techniques (no external libraries). See the system prompt for implementation details.`,
    ``,
    `RULES:`,
    `- Build WORKING FEATURES with real interactivity, not static displays`,
    `- NEVER use external image URLs. For image placeholders, use a colored div with a centered Plus icon (<Plus size={24} />) — clean and consistent`,
    `- Every button/card must be interactive — onClick that changes state`,
    `- Use window.__sb.useStore() for persistent data, window.__sb.toast() for feedback`,
    `- Show the core experience on first render — the user should immediately see and interact with the main feature`,
    `- Use CSS custom properties (var(--sb-primary), window.__sb.color()) for brand colors instead of hardcoded hex values`,
    `- For collection/browse/marketplace apps: include 6-10 sample items to fill the layout`,
    `- For tool/analyzer/generator apps: focus on the input-output flow, not item grids`,
    // Competitive research context — for inspiration, not rigid copying
    ...(!designBlueprint && contextBrief ? [
      ``,
      `=== COMPETITIVE CONTEXT (for inspiration — design something BETTER, not identical) ===`,
      `Competitors: ${contextBrief.competitive_landscape.map(c => `${c.name} (${c.visual_signature})`).join(', ')}`,
      `UX patterns to consider: ${contextBrief.competitive_landscape.flatMap(c => c.key_ux_patterns).slice(0, 8).join(', ')}`,
      `Target: ${contextBrief.target_persona?.role ?? 'general user'} — ${(contextBrief.target_persona?.expectations ?? []).slice(0, 3).join(', ')}`,
      `Domain labels: ${JSON.stringify(contextBrief.domain_terminology?.field_labels ?? {})}`,
      `Domain CTAs: ${(contextBrief.domain_terminology?.cta_verbs ?? []).join(', ')}`,
      `UI components to consider: ${(contextBrief.ui_component_suggestions ?? []).join(', ')}`,
    ] : []),
    // Competitor visuals — for inspiration, not mandatory replication
    ...(!designBlueprint && competitorVisuals?.length ? [
      ``,
      `=== COMPETITOR VISUAL INSPIRATION (draw from these patterns but create your OWN unique design) ===`,
      ...competitorVisuals.map(v => {
        const a = v.screenshot_analysis;
        if (!a) return `  ${v.name}: colors=[${v.colors.join(',')}] layout=[${v.layout_signals.join(',')}]`;
        return [
          `  --- ${v.name} ---`,
          `  Colors: ${a.color_palette.join(', ')}`,
          `  Layout: ${a.layout_type}`,
          `  Nav: ${a.navigation_style}`,
          `  Key patterns: ${a.key_ui_to_replicate.join(', ')}`,
        ].join('\n');
      }),
    ] : []),
    ``,
    `OUTPUT: Complete JSX code only. No markdown. No explanation.`,
  ].join("\n");

  try {
    emitVirtualBuildOperations(intent, onProgress);
    onProgress?.({ type: 'status', message: 'Synthesizing source code...' });
    onProgress?.({ type: 'status', message: 'Compiling components...' });
    const useTools = supportsToolUse();
    llmLog("codegen", { model: modelId });
    diagLog(`[generateReactCode] starting — model: ${modelId}, mode: ${useTools ? 'tool' : 'text'}, designBlueprint: ${!!designBlueprint}, contentMap: ${!!contentMap}`);
    diagLog(`[generateReactCode] system prompt: ${systemPrompt.length} chars, user message: ${baseUserMessage.length} chars`);
    const candidate = useTools
      ? await runToolCodeGeneration(client, modelId, systemPrompt, baseUserMessage, onProgress)
      : await runTextCodeGeneration(client, modelId, systemPrompt, baseUserMessage, onProgress);

    if (!candidate) {
      diagLog("[generateReactCode] code generation returned null — no usable output");
      onProgress?.({ type: 'status', message: 'Build failed — retrying is recommended' });
      return null;
    }

    // If code gen returned a forbidden name, override with the reasoner's app_name_hint
    if (candidate.app_name === "App" && intent.app_name_hint) {
      candidate.app_name = intent.app_name_hint;
      // Also replace "App" title references in the generated code if they look like a placeholder
      candidate.generated_code = candidate.generated_code.replace(
        /(['"`])Cal\s*AI\1/gi,
        `$1${intent.app_name_hint}$1`,
      );
    }

    onProgress?.({ type: 'status', message: 'Running quality checks...' });

    let evaluation = scoreGeneratedCode({
      code: candidate.generated_code,
      prompt: originalPrompt,
      outputFormat: intent.output_format_hint,
      requestedLayout: intent.layout_blueprint,
      requestedNavType: designBlueprint?.nav_type,
      requestedMood: themeStyle,
      domainKeywords: intent.domain_keywords,
    });

    let repaired = false;

    // AutoFix: if quality score is below threshold, attempt one repair pass
    const REPAIR_THRESHOLD = 55;
    if (evaluation.quality_score <= REPAIR_THRESHOLD) {
      console.log(`Quality score ${evaluation.quality_score} < ${REPAIR_THRESHOLD}, attempting repair...`);

      const repairFeedback = generateRetryFeedback(
        evaluation.quality_breakdown,
        candidate.generated_code,
        intent.layout_blueprint,
        designBlueprint?.nav_type,
        intent.domain_keywords,
      );

      const repairedCode = await repairGeneratedCode(
        client, modelId, candidate.generated_code, repairFeedback, onProgress
      );

      if (repairedCode && repairedCode.length > 200) {
        const repairedEvaluation = scoreGeneratedCode({
          code: repairedCode,
          prompt: originalPrompt,
          outputFormat: intent.output_format_hint,
          requestedLayout: intent.layout_blueprint,
          requestedNavType: designBlueprint?.nav_type,
          requestedMood: themeStyle,
          domainKeywords: intent.domain_keywords,
        });

        if (repairedEvaluation.quality_score > evaluation.quality_score) {
          console.log(`Repair improved score: ${evaluation.quality_score} -> ${repairedEvaluation.quality_score}`);
          candidate.generated_code = repairedCode;
          evaluation = repairedEvaluation;
          repaired = true;
        } else {
          console.log(`Repair did not improve score (${repairedEvaluation.quality_score} vs ${evaluation.quality_score}), keeping original`);
        }
      }
    }

    const pipelineArtifact: PipelineRunArtifact = {
      run_id: randomUUID(),
      stages: [
        "Research & Planning",
        ...(designBlueprint ? ["Design Architect"] : []),
        ...(contentMap ? ["Content Strategist"] : []),
        "Code Generation",
        "Quality Scoring",
        ...(repaired ? ["AutoFix Repair"] : []),
        "Finalize",
      ],
      // Preserve design blueprint nav_type for downstream repair/validation
      ...(designBlueprint ? { ui_blueprint: { nav_type: designBlueprint.nav_type } } : {}),
      selected_candidate: "A",
      candidates: [{
        id: "A",
        quality_score: evaluation.quality_score,
        quality_breakdown: evaluation.quality_breakdown,
      }],
      repaired,
    };

    const result: CodeGenerationResult = {
      ...candidate,
      quality_score: evaluation.quality_score,
      quality_breakdown: evaluation.quality_breakdown,
      pipeline_artifact: pipelineArtifact,
    };
    console.log(`Code generation success: ${result.app_name}, ${result.generated_code.length} chars, score ${result.quality_score}${repaired ? ' (repaired)' : ''}`);
    return result;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Code generation failed:", msg);
    onProgress?.({ type: 'status', message: `Build error: ${msg.slice(0, 100)}` });
    return null;
  }
}
