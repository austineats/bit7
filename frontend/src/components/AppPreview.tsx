import { useMemo } from 'react';

interface AppPreviewProps {
  code: string;
  appId: string;
  height?: string;
  mobile?: boolean;
}

function buildIframeHtml(code: string, appId: string, mobile: boolean): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>App Preview</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <script crossorigin src="https://cdn.tailwindcss.com/3.4.17"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
          },
          spacing: {
            '4.5': '1.125rem',
            '13': '3.25rem',
            '15': '3.75rem',
            '18': '4.5rem',
          },
        },
      },
    };
  </script>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/lucide-react/dist/umd/lucide-react.js"></script>
  <script crossorigin src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
      background: #ffffff;
      color: rgba(0,0,0,0.87);
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      overflow-x: hidden;
      font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11';
    }
    #root { min-height: 100vh; background: #ffffff; color: #111827; }

    /* ── Text visibility safety net — prevent invisible text on white backgrounds ── */
    h1, h2, h3, h4, h5, h6 { color: inherit; }
    p, span, li, td, th, label, dt, dd { color: inherit; }
    /* Cards/containers on white bg should inherit dark text */
    .bg-white, [class*="bg-gray-5"], [class*="bg-gray-1"] { color: #111827; }

    /* ── Critical CSS fallback — ensures layout works before Tailwind JIT processes ── */
    .min-h-screen { min-height: 100vh; }
    .flex { display: flex; }
    .grid { display: grid; }
    .inline-flex { display: inline-flex; }
    .hidden { display: none; }
    .items-center { align-items: center; }
    .items-start { align-items: flex-start; }
    .justify-center { justify-content: center; }
    .justify-between { justify-content: space-between; }
    .flex-col { flex-direction: column; }
    .flex-1 { flex: 1 1 0%; }
    .flex-shrink-0 { flex-shrink: 0; }
    .flex-wrap { flex-wrap: wrap; }
    .gap-1 { gap: 0.25rem; } .gap-2 { gap: 0.5rem; } .gap-3 { gap: 0.75rem; }
    .gap-4 { gap: 1rem; } .gap-5 { gap: 1.25rem; } .gap-6 { gap: 1.5rem; }
    .gap-8 { gap: 2rem; } .gap-10 { gap: 2.5rem; }
    .w-full { width: 100%; } .h-full { height: 100%; }
    .max-w-xs { max-width: 20rem; } .max-w-sm { max-width: 24rem; }
    .max-w-md { max-width: 28rem; } .max-w-lg { max-width: 32rem; }
    .max-w-xl { max-width: 36rem; } .max-w-2xl { max-width: 42rem; }
    .max-w-3xl { max-width: 48rem; } .max-w-4xl { max-width: 56rem; }
    .max-w-5xl { max-width: 64rem; } .max-w-6xl { max-width: 72rem; }
    .mx-auto { margin-left: auto; margin-right: auto; }
    .text-center { text-align: center; } .text-left { text-align: left; }
    .relative { position: relative; } .absolute { position: absolute; }
    .sticky { position: sticky; } .fixed { position: fixed; }
    .inset-0 { inset: 0; } .top-0 { top: 0; } .left-0 { left: 0; } .right-0 { right: 0; } .bottom-0 { bottom: 0; }
    .z-10 { z-index: 10; } .z-50 { z-index: 50; }
    .overflow-hidden { overflow: hidden; } .overflow-auto { overflow: auto; }
    .px-4 { padding-left: 1rem; padding-right: 1rem; }
    .px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
    .px-8 { padding-left: 2rem; padding-right: 2rem; }
    .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
    .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
    .py-4 { padding-top: 1rem; padding-bottom: 1rem; }
    .py-8 { padding-top: 2rem; padding-bottom: 2rem; }
    .py-20 { padding-top: 5rem; padding-bottom: 5rem; }
    .pt-20 { padding-top: 5rem; } .pt-24 { padding-top: 6rem; }
    .pb-24 { padding-bottom: 6rem; } .pb-32 { padding-bottom: 8rem; }
    .p-4 { padding: 1rem; } .p-5 { padding: 1.25rem; } .p-6 { padding: 1.5rem; }
    .mb-1 { margin-bottom: 0.25rem; } .mb-2 { margin-bottom: 0.5rem; }
    .mb-3 { margin-bottom: 0.75rem; } .mb-4 { margin-bottom: 1rem; }
    .mb-6 { margin-bottom: 1.5rem; } .mb-8 { margin-bottom: 2rem; }
    .mb-10 { margin-bottom: 2.5rem; } .mb-16 { margin-bottom: 4rem; }
    .mt-1 { margin-top: 0.25rem; } .mt-2 { margin-top: 0.5rem; }
    .mt-4 { margin-top: 1rem; } .mt-8 { margin-top: 2rem; } .mt-12 { margin-top: 3rem; }
    .bg-white { background-color: #fff; }
    .text-white { color: #fff; }
    .text-gray-900 { color: #111827; } .text-gray-700 { color: #374151; }
    .text-gray-600 { color: #4b5563; } .text-gray-500 { color: #6b7280; }
    .text-gray-400 { color: #9ca3af; }
    .bg-gray-50 { background-color: #f9fafb; } .bg-gray-100 { background-color: #f3f4f6; }
    .bg-gray-950 { background-color: #030712; }
    .border { border-width: 1px; } .border-b { border-bottom-width: 1px; }
    .border-gray-100 { border-color: #f3f4f6; } .border-gray-200 { border-color: #e5e7eb; }
    .rounded-lg { border-radius: 0.5rem; } .rounded-xl { border-radius: 0.75rem; }
    .rounded-2xl { border-radius: 1rem; } .rounded-full { border-radius: 9999px; }
    .shadow-sm { box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05); }
    .shadow-lg { box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1); }
    .text-xs { font-size: 0.75rem; line-height: 1rem; }
    .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
    .text-base { font-size: 1rem; line-height: 1.5rem; }
    .text-lg { font-size: 1.125rem; line-height: 1.75rem; }
    .text-xl { font-size: 1.25rem; line-height: 1.75rem; }
    .text-2xl { font-size: 1.5rem; line-height: 2rem; }
    .text-3xl { font-size: 1.875rem; line-height: 2.25rem; }
    .text-4xl { font-size: 2.25rem; line-height: 2.5rem; }
    .text-5xl { font-size: 3rem; line-height: 1; }
    .font-medium { font-weight: 500; } .font-semibold { font-weight: 600; }
    .font-bold { font-weight: 700; } .font-black { font-weight: 900; }
    .leading-relaxed { line-height: 1.625; }
    .cursor-pointer { cursor: pointer; }
    .pointer-events-none { pointer-events: none; }
    .transition-all { transition-property: all; transition-duration: 150ms; transition-timing-function: cubic-bezier(0.4,0,0.2,1); }
    .transition-colors { transition-property: color, background-color, border-color; transition-duration: 150ms; }
    @media (min-width: 640px) {
      .sm\\:flex { display: flex; }
      .sm\\:flex-row { flex-direction: row; }
      .sm\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (min-width: 768px) {
      .md\\:text-xl { font-size: 1.25rem; line-height: 1.75rem; }
      .md\\:text-4xl { font-size: 2.25rem; line-height: 2.5rem; }
      .md\\:text-5xl { font-size: 3rem; line-height: 1; }
      .md\\:text-6xl { font-size: 3.75rem; line-height: 1; }
      .md\\:text-7xl { font-size: 4.5rem; line-height: 1; }
      .md\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .md\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .md\\:block { display: block; }
      .md\\:flex { display: flex; }
    }
    @media (min-width: 1024px) {
      .lg\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .lg\\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    }
    .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
    .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .grid-cols-5 { grid-template-columns: repeat(5, minmax(0, 1fr)); }
    .space-y-5 > * + * { margin-top: 1.25rem; }
    .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .whitespace-nowrap { white-space: nowrap; }

    /* ── Premium typography — tight letter-spacing on headings ── */
    h1, h2, h3 { letter-spacing: -0.02em; }

    /* ── Per-archetype visual fingerprints (set via data-archetype on root div) ── */
    [data-archetype="marketplace"] { --sb-radius: 0.625rem; --sb-card-shadow: 0 2px 8px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.06); }
    [data-archetype="health_tracker"] { --sb-radius: 1rem; --sb-card-shadow: 0 4px 20px var(--sb-primary-glow, rgba(99,102,241,0.18)), 0 2px 6px rgba(0,0,0,0.06); }
    [data-archetype="finance_dashboard"] { --sb-radius: 0.5rem; --sb-card-shadow: 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06); }
    [data-archetype="social_feed"] { --sb-radius: 1rem; --sb-card-shadow: 0 4px 16px var(--sb-primary-glow, rgba(99,102,241,0.14)), 0 2px 6px rgba(0,0,0,0.06); }
    [data-archetype="productivity_suite"] { --sb-radius: 0.625rem; --sb-card-shadow: 0 1px 3px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.06); }
    [data-archetype="learning_platform"] { --sb-radius: 0.75rem; --sb-card-shadow: 0 2px 10px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06); }
    [data-archetype="creative_studio"] { --sb-radius: 0.75rem; --sb-card-shadow: 0 4px 16px var(--sb-primary-glow, rgba(99,102,241,0.15)), 0 2px 6px rgba(0,0,0,0.06); }
    [data-archetype="content_tool"] { --sb-radius: 0.625rem; --sb-card-shadow: 0 2px 8px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06); }

    /* ── Animation keyframes ── */
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes scaleIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
    @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
    @keyframes countUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes fillRight { from { width: 0%; } to { width: var(--target-width, 100%); } }
    @keyframes ringFill { from { stroke-dashoffset: var(--ring-circumference, 377); } to { stroke-dashoffset: var(--ring-offset, 0); } }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes glow { 0%, 100% { box-shadow: 0 0 20px var(--sb-primary-glow, rgba(99,102,241,0.15)); } 50% { box-shadow: 0 0 40px var(--sb-primary-glow, rgba(99,102,241,0.25)); } }
    @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
    @keyframes gradientShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
    @keyframes borderGlow { 0%,100% { border-color: var(--sb-primary-glow); } 50% { border-color: var(--sb-primary); } }
    @keyframes slideInLeft { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
    @keyframes slideInRight { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
    @keyframes bounceIn { 0% { opacity: 0; transform: scale(0.3); } 50% { transform: scale(1.05); } 70% { transform: scale(0.9); } 100% { opacity: 1; transform: scale(1); } }
    @keyframes ripple { 0% { box-shadow: 0 0 0 0 var(--sb-primary-glow); } 100% { box-shadow: 0 0 0 20px rgba(0,0,0,0); } }

    /* ── Extended CSS variables (set by generated code) ── */
    :root {
      --sb-secondary: var(--sb-primary, #8b5cf6);
      --sb-accent: #f59e0b;
      --sb-surface: #ffffff;
      --sb-surface-elevated: #ffffff;
      --sb-text: #111827;
      --sb-text-secondary: #6b7280;
      --sb-secondary-glow: rgba(139,92,246,0.15);
    }

    /* ── Gradient utilities ── */
    .sb-gradient { background: linear-gradient(135deg, var(--sb-primary), var(--sb-secondary)); color: white; }
    .sb-gradient-subtle { background: linear-gradient(135deg, var(--sb-primary-bg, rgba(99,102,241,0.08)), transparent); }
    .sb-gradient-radial { background: radial-gradient(ellipse at top, var(--sb-primary-bg, rgba(99,102,241,0.08)), transparent 70%); }
    .sb-gradient-text { background: linear-gradient(135deg, var(--sb-primary), var(--sb-secondary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    .sb-gradient-border { border: 2px solid transparent; background-clip: padding-box; position: relative; }
    .sb-gradient-animated { background-size: 200% 200%; animation: gradientShift 3s ease infinite; }

    /* ── Glow effects ── */
    .sb-glow { box-shadow: 0 0 20px var(--sb-primary-glow), 0 0 60px var(--sb-primary-glow); }
    .sb-glow-sm { box-shadow: 0 0 10px var(--sb-primary-glow); }
    .sb-glow-lg { box-shadow: 0 0 30px var(--sb-primary-glow), 0 0 80px var(--sb-primary-glow), 0 0 120px rgba(99,102,241,0.05); }
    .sb-glow-pulse { animation: glow 2s ease-in-out infinite; }

    /* ── Dark theme surfaces ── */
    .sb-dark { background: var(--sb-surface, #0f172a); color: var(--sb-text, #e2e8f0); }
    .sb-dark-elevated { background: var(--sb-surface-elevated, #1e293b); border: 1px solid rgba(255,255,255,0.06); border-radius: 0.75rem; }
    .sb-dark-card {
      background: var(--sb-surface-elevated, #1e293b);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 0.75rem; padding: 1.25rem;
      box-shadow: 0 4px 6px rgba(0,0,0,0.3);
    }
    .sb-dark-input {
      width: 100%; background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1); border-radius: 0.625rem;
      color: #e2e8f0; padding: 0.625rem 0.875rem;
      font-family: inherit; font-size: 0.875rem; line-height: 1.5;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .sb-dark-input::placeholder { color: rgba(255,255,255,0.3); }
    .sb-dark-input:focus { border-color: var(--sb-primary); outline: none; box-shadow: 0 0 0 3px var(--sb-primary-glow); }

    /* ── Glassmorphism / frosted ── */
    .sb-frosted {
      background: rgba(255,255,255,0.08);
      backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 0.75rem;
    }
    .sb-frosted-light {
      background: rgba(255,255,255,0.6);
      backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255,255,255,0.3);
      border-radius: 0.75rem;
    }

    /* ── Gradient button ── */
    .glass-btn-gradient {
      display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
      height: 2.625rem; padding: 0 1.25rem; border-radius: 0.625rem;
      font-weight: 500; font-size: 0.8125rem; font-family: inherit;
      background: linear-gradient(135deg, var(--sb-primary), var(--sb-secondary));
      color: white; border: none; cursor: pointer;
      box-shadow: 0 4px 14px var(--sb-primary-glow);
      transition: all 0.2s ease; white-space: nowrap;
    }
    .glass-btn-gradient:hover { filter: brightness(1.1); box-shadow: 0 6px 20px var(--sb-primary-glow); transform: translateY(-1px); }
    .glass-btn-gradient:active { transform: scale(0.97); }

    /* ── Accent card with left border ── */
    .sb-accent-card {
      border-left: 3px solid var(--sb-primary);
      background: var(--sb-surface, #ffffff);
      border-radius: 0 var(--sb-radius, 0.75rem) var(--sb-radius, 0.75rem) 0;
      padding: 1rem 1.25rem;
    }

    /* ── Colored icon container ── */
    .sb-icon-box {
      display: flex; align-items: center; justify-content: center;
      width: 40px; height: 40px; min-width: 40px;
      border-radius: 0.625rem;
      background: var(--sb-primary-bg, rgba(99,102,241,0.08));
    }
    .sb-icon-box-gradient {
      display: flex; align-items: center; justify-content: center;
      width: 40px; height: 40px; min-width: 40px;
      border-radius: 0.625rem;
      background: linear-gradient(135deg, var(--sb-primary), var(--sb-secondary));
      color: white;
    }

    /* ── Design system: surfaces ── */
    .glass {
      background: var(--sb-surface, #ffffff);
      border: 1px solid rgba(0,0,0,0.09);
      border-radius: 0.75rem;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }
    .glass-elevated {
      background: var(--sb-surface-elevated, #ffffff);
      box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06);
      border: 1px solid rgba(0,0,0,0.1);
      border-radius: var(--sb-radius, 0.75rem);
    }
    .glass-hover { transition: all 0.2s ease; cursor: pointer; }
    .glass-hover:hover { border-color: var(--sb-primary-glow, rgba(0,0,0,0.12)); transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0,0,0,0.1); }

    /* ── Design system: inputs ── */
    .glass-input {
      width: 100%;
      background: #f9fafb;
      border: 1px solid rgba(0,0,0,0.14);
      border-radius: calc(var(--sb-radius, 0.625rem) * 0.8);
      color: #111;
      padding: 0.625rem 0.875rem;
      font-family: inherit;
      font-size: 0.875rem;
      line-height: 1.5;
      transition: border-color 150ms ease, box-shadow 150ms ease;
    }
    .glass-input::placeholder { color: rgba(0,0,0,0.35); }
    .glass-input:focus { border-color: var(--sb-primary, #6366f1); outline: none; box-shadow: 0 0 0 3px var(--sb-primary-glow, rgba(99,102,241,0.15)); }
    textarea.glass-input { min-height: 100px; resize: vertical; }

    /* ── Design system: buttons ── */
    .glass-btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
      height: 2.625rem; padding: 0 1.25rem; border-radius: calc(var(--sb-radius, 0.625rem) * 0.8);
      font-weight: 500; font-size: 0.8125rem; font-family: inherit;
      border: none; cursor: pointer; transition: all 150ms ease;
      white-space: nowrap;
    }
    .glass-btn:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--sb-surface, #fff), 0 0 0 4px var(--sb-primary, #6366f1); }
    .glass-btn:active { transform: scale(0.97); }
    .glass-btn-primary {
      background: var(--sb-primary, #6366f1); color: white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1), 0 0 20px var(--sb-primary-glow, rgba(99,102,241,0.2));
    }
    .glass-btn-primary:hover { filter: brightness(1.1); box-shadow: 0 4px 16px rgba(0,0,0,0.12), 0 0 30px var(--sb-primary-glow, rgba(99,102,241,0.3)); transform: translateY(-1px); }
    .glass-btn-primary:active { transform: scale(0.98) translateY(0); }
    .glass-btn-secondary {
      background: rgba(0,0,0,0.04); border: 1px solid rgba(0,0,0,0.1); color: rgba(0,0,0,0.7);
    }
    .glass-btn-secondary:hover { background: rgba(0,0,0,0.08); color: #111; }
    .glass-btn-lg { height: 2.875rem; padding: 0 1.5rem; font-size: 0.875rem; border-radius: 0.75rem; }

    /* ── Design system: cards ── */
    .sb-card {
      background: var(--sb-surface, #ffffff); border: 1px solid rgba(0,0,0,0.1);
      border-radius: var(--sb-radius, 0.75rem); padding: 1.25rem;
      box-shadow: var(--sb-card-shadow, 0 1px 3px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.06));
      transition: box-shadow 150ms ease, transform 150ms ease;
    }
    .sb-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06); }
    .sb-stat {
      display: flex; flex-direction: column; gap: 0.25rem;
      background: var(--sb-surface, #ffffff); border: 1px solid rgba(0,0,0,0.1);
      border-radius: var(--sb-radius, 0.75rem); padding: 1.25rem;
      box-shadow: var(--sb-card-shadow, 0 1px 3px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.06));
      transition: box-shadow 150ms ease, transform 150ms ease;
    }
    .sb-stat:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.1); transform: translateY(-1px); }
    .sb-stat-value { font-size: 1.5rem; font-weight: 700; letter-spacing: -0.02em; color: var(--sb-text, #111); }
    .sb-stat-label { font-size: 0.8125rem; color: var(--sb-text-secondary, rgba(0,0,0,0.5)); font-weight: 500; }
    .sb-stat-change { font-size: 0.75rem; font-weight: 500; }
    .sb-stat-change.up { color: #059669; }
    .sb-stat-change.down { color: #dc2626; }

    /* ── Design system: badges / pills ── */
    .sb-badge {
      display: inline-flex; align-items: center; gap: 0.25rem;
      padding: 0.125rem 0.5rem; border-radius: 9999px;
      font-size: 0.6875rem; font-weight: 500;
      background: rgba(0,0,0,0.05); color: rgba(0,0,0,0.6);
    }
    .sb-badge-primary { background: var(--sb-primary-bg, rgba(99,102,241,0.1)); color: var(--sb-primary, #6366f1); }

    /* ── Design system: navigation ── */
    .sb-nav {
      position: sticky; top: 0; z-index: 50;
      display: flex; align-items: center; justify-content: space-between;
      height: 3.5rem; padding: 0 1.25rem;
      background: rgba(255,255,255,0.96); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(0,0,0,0.1);
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    .sb-nav-dark {
      position: sticky; top: 0; z-index: 50;
      display: flex; align-items: center; justify-content: space-between;
      height: 3.5rem; padding: 0 1.25rem;
      background: rgba(15,23,42,0.85); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .sb-nav-brand { display: flex; align-items: center; gap: 0.625rem; font-weight: 600; font-size: 0.9375rem; color: var(--sb-text, #111); }
    .sb-nav-tabs { display: flex; gap: 0.25rem; }
    .sb-nav-tab {
      padding: 0.375rem 0.75rem; border-radius: 0.5rem;
      font-size: 0.8125rem; font-weight: 500; color: rgba(0,0,0,0.45);
      cursor: pointer; transition: all 0.15s; border: none; background: none;
    }
    .sb-nav-tab:hover { color: rgba(0,0,0,0.7); background: rgba(0,0,0,0.04); }
    .sb-nav-tab.active { color: var(--sb-primary, #111); background: var(--sb-primary-bg, rgba(99,102,241,0.1)); font-weight: 600; }

    /* ── Nav layout variants ── */
    .sb-nav-centered {
      position: sticky; top: 0; z-index: 50;
      display: flex; flex-direction: column; align-items: center;
      padding: 0.75rem 1.25rem 0;
      background: rgba(255,255,255,0.96); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(0,0,0,0.1);
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    .sb-nav-centered .sb-nav-brand { margin-bottom: 0.5rem; }
    .sb-nav-centered .sb-nav-tabs { margin-bottom: 0.5rem; }
    .sb-nav-centered-dark {
      position: sticky; top: 0; z-index: 50;
      display: flex; flex-direction: column; align-items: center;
      padding: 0.75rem 1.25rem 0;
      background: rgba(15,23,42,0.85); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .sb-nav-centered-dark .sb-nav-brand { margin-bottom: 0.5rem; color: #e2e8f0; }
    .sb-nav-centered-dark .sb-nav-tabs { margin-bottom: 0.5rem; }
    .sb-nav-centered-dark .sb-nav-tab { color: rgba(255,255,255,0.45); }
    .sb-nav-centered-dark .sb-nav-tab:hover { color: rgba(255,255,255,0.7); }
    .sb-nav-centered-dark .sb-nav-tab.active { color: #fff; background: rgba(255,255,255,0.1); }

    .sb-nav-spread {
      position: sticky; top: 0; z-index: 50;
      display: flex; align-items: center; justify-content: space-between;
      height: 3.5rem; padding: 0 1.25rem;
      background: rgba(255,255,255,0.96); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(0,0,0,0.1);
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    .sb-nav-spread .sb-nav-tabs { margin-left: auto; }
    .sb-nav-spread-dark {
      position: sticky; top: 0; z-index: 50;
      display: flex; align-items: center; justify-content: space-between;
      height: 3.5rem; padding: 0 1.25rem;
      background: rgba(15,23,42,0.85); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .sb-nav-spread-dark .sb-nav-brand { color: #e2e8f0; }
    .sb-nav-spread-dark .sb-nav-tab { color: rgba(255,255,255,0.45); }
    .sb-nav-spread-dark .sb-nav-tab:hover { color: rgba(255,255,255,0.7); }
    .sb-nav-spread-dark .sb-nav-tab.active { color: #fff; background: rgba(255,255,255,0.1); }

    .sb-nav-minimal {
      position: sticky; top: 0; z-index: 50;
      display: flex; align-items: center; justify-content: center;
      height: 3rem; padding: 0 1.25rem;
      background: transparent; border-bottom: none;
    }
    .sb-nav-minimal .sb-nav-brand { display: none; }
    .sb-nav-minimal .sb-nav-tabs { gap: 0.125rem; }
    .sb-nav-minimal .sb-nav-tab { font-size: 0.875rem; }

    /* ── Design system: list items ── */
    .sb-list-item {
      display: flex; align-items: center; gap: 0.75rem;
      padding: 0.75rem; border-radius: 0.625rem;
      transition: background 0.15s; cursor: pointer;
    }
    .sb-list-item:hover { background: rgba(0,0,0,0.05); }

    /* ── Design system: divider ── */
    .sb-divider { height: 1px; background: rgba(0,0,0,0.09); margin: 0; border: none; }

    /* ── Design system: skeleton loading ── */
    .sb-skeleton {
      background: linear-gradient(90deg, rgba(0,0,0,0.04) 25%, rgba(0,0,0,0.08) 50%, rgba(0,0,0,0.04) 75%);
      background-size: 200% 100%; border-radius: 0.5rem;
      animation: shimmer 1.5s infinite; color: transparent;
    }

    /* ── Error state ── */
    .sb-error {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      min-height: 100vh; padding: 2rem; text-align: center; background: #fef2f2; color: #111;
    }
    .sb-error h2 { font-size: 1rem; margin-bottom: 0.75rem; color: #dc2626; font-weight: 600; }
    .sb-error pre {
      background: #ffffff; border: 1px solid rgba(0,0,0,0.08);
      border-radius: 0.625rem; padding: 1rem; font-size: 0.75rem;
      color: rgba(0,0,0,0.6); text-align: left; overflow: auto; max-width: 600px; white-space: pre-wrap;
    }

    /* ── Toast notifications ── */
    .sb-toast {
      position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
      padding: 0.5rem 1rem; border-radius: 0.5rem; font-size: 0.8125rem; font-weight: 500;
      color: white; z-index: 9999; animation: slideUp 0.3s ease-out; pointer-events: none;
    }
    .sb-toast--success { background: #059669; }
    .sb-toast--error { background: #dc2626; }
    .sb-toast--info { background: #2563eb; }

    /* ── Utility: stagger children ── */
    .sb-stagger > * { animation: slideUp 0.4s ease-out both; }
    .sb-stagger > *:nth-child(1) { animation-delay: 0s; }
    .sb-stagger > *:nth-child(2) { animation-delay: 0.06s; }
    .sb-stagger > *:nth-child(3) { animation-delay: 0.12s; }
    .sb-stagger > *:nth-child(4) { animation-delay: 0.18s; }
    .sb-stagger > *:nth-child(5) { animation-delay: 0.24s; }
    .sb-stagger > *:nth-child(6) { animation-delay: 0.3s; }
    .sb-stagger > *:nth-child(7) { animation-delay: 0.36s; }
    .sb-stagger > *:nth-child(8) { animation-delay: 0.42s; }
    .sb-stagger > *:nth-child(n+9) { animation-delay: 0.48s; }

    /* ── Design system: progress bar ── */
    .sb-progress {
      width: 100%; height: 6px; background: rgba(0,0,0,0.06);
      border-radius: 9999px; overflow: hidden;
    }
    .sb-progress-fill {
      height: 100%; border-radius: 9999px;
      background: var(--sb-primary, #6366f1);
      transition: width 0.6s ease-out;
    }

    /* ── Design system: avatar ── */
    .sb-avatar {
      display: flex; align-items: center; justify-content: center;
      width: 32px; height: 32px; min-width: 32px;
      border-radius: 9999px; font-size: 0.75rem; font-weight: 600;
      background: rgba(0,0,0,0.05); color: rgba(0,0,0,0.6);
    }

    /* ── Design system: empty state ── */
    .sb-empty {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 0.75rem; padding: 3rem 1.5rem; text-align: center;
      color: rgba(0,0,0,0.35); font-size: 0.8125rem;
    }

    /* ── Design system: toggle switch ── */
    .sb-toggle {
      position: relative; width: 40px; height: 22px;
      background: rgba(0,0,0,0.15); border-radius: 9999px;
      cursor: pointer; transition: background 0.2s; border: none;
    }
    .sb-toggle::after {
      content: ''; position: absolute; top: 2px; left: 2px;
      width: 18px; height: 18px; border-radius: 9999px;
      background: white; transition: transform 0.2s;
      box-shadow: 0 1px 3px rgba(0,0,0,0.15);
    }
    .sb-toggle.on { background: var(--sb-primary, #6366f1); }
    .sb-toggle.on::after { transform: translateX(18px); }

    /* ── Design system: tags ── */
    .sb-tag {
      display: inline-flex; align-items: center; gap: 0.25rem;
      padding: 0.125rem 0.625rem; border-radius: 0.375rem;
      font-size: 0.6875rem; font-weight: 600; text-transform: capitalize;
      background: rgba(0,0,0,0.05); color: rgba(0,0,0,0.6);
    }
    .sb-tag-success { background: #ecfdf5; color: #059669; }
    .sb-tag-warning { background: #fffbeb; color: #d97706; }
    .sb-tag-error { background: #fef2f2; color: #dc2626; }
    .sb-tag-primary { background: var(--sb-primary-bg, rgba(99,102,241,0.1)); color: var(--sb-primary, #6366f1); }

    /* ── Design system: table ── */
    .sb-table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; }
    .sb-th {
      text-align: left; padding: 0.5rem 0.75rem;
      font-size: 0.6875rem; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em;
      color: rgba(0,0,0,0.4); border-bottom: 1px solid rgba(0,0,0,0.06);
    }
    .sb-td {
      padding: 0.625rem 0.75rem; color: rgba(0,0,0,0.8);
      border-bottom: 1px solid rgba(0,0,0,0.04);
    }
    .sb-table tr:hover .sb-td { background: rgba(0,0,0,0.02); }

    /* ── Design system: form group ── */
    .sb-form-group { display: flex; flex-direction: column; gap: 0.375rem; }
    .sb-form-group label {
      font-size: 0.8125rem; font-weight: 500; color: rgba(0,0,0,0.7);
    }
    .sb-form-group .sb-helper {
      font-size: 0.6875rem; color: rgba(0,0,0,0.4);
    }

    /* ── Design system: search input ── */
    .sb-search { position: relative; }
    .sb-search .glass-input { padding-left: 2.5rem; }
    .sb-search-icon {
      position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%);
      color: rgba(0,0,0,0.35); pointer-events: none; display: flex;
    }

    /* ── Feature card with top accent border ── */
    .sb-feature-card {
      background: var(--sb-surface, #ffffff);
      border: 1px solid rgba(0,0,0,0.06);
      border-top: 3px solid var(--sb-primary);
      border-radius: 0 0 var(--sb-radius, 0.75rem) var(--sb-radius, 0.75rem);
      padding: 1.25rem;
      transition: box-shadow 150ms ease, transform 150ms ease;
    }
    .sb-feature-card:hover { box-shadow: 0 4px 6px rgba(0,0,0,0.07); transform: translateY(-2px); }

    /* ── Upload/drop zone ── */
    .sb-upload-zone {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 0.75rem; padding: 2.5rem 1.5rem;
      border: 2px dashed rgba(0,0,0,0.12);
      border-radius: 0.75rem;
      background: var(--sb-primary-bg, rgba(99,102,241,0.04));
      cursor: pointer; transition: all 0.2s ease;
      text-align: center; color: var(--sb-text-secondary, #6b7280);
      font-size: 0.875rem;
    }
    .sb-upload-zone:hover {
      border-color: var(--sb-primary); background: var(--sb-primary-bg, rgba(99,102,241,0.08));
    }

    /* ── Compact inline stat ── */
    .sb-inline-stat {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.5rem 0.75rem; border-radius: 0.5rem;
      background: rgba(0,0,0,0.02);
      font-size: 0.8125rem;
    }
    .sb-inline-stat-value { font-weight: 700; color: var(--sb-text, #111); }
    .sb-inline-stat-label { color: var(--sb-text-secondary, #6b7280); }

    /* ── Chip/pill selector ── */
    .sb-chip {
      display: inline-flex; align-items: center; gap: 0.375rem;
      padding: 0.375rem 0.875rem; border-radius: 9999px;
      font-size: 0.8125rem; font-weight: 500;
      background: rgba(0,0,0,0.05); color: rgba(0,0,0,0.6);
      border: 1px solid rgba(0,0,0,0.08);
      cursor: pointer; transition: all 0.15s;
    }
    .sb-chip:hover { background: rgba(0,0,0,0.09); border-color: rgba(0,0,0,0.15); }
    .sb-chip.active {
      background: var(--sb-primary-bg, rgba(99,102,241,0.1));
      color: var(--sb-primary, #6366f1);
      border-color: var(--sb-primary, #6366f1);
    }

    /* ── Result highlight card ── */
    .sb-result-highlight {
      display: flex; align-items: center; gap: 1.5rem;
      padding: 1.5rem;
      background: linear-gradient(135deg, var(--sb-primary-bg, rgba(99,102,241,0.06)), transparent);
      border: 1px solid rgba(0,0,0,0.06);
      border-radius: var(--sb-radius, 0.75rem);
    }

    /* ── Section divider with label ── */
    .sb-section-label {
      display: flex; align-items: center; gap: 0.75rem;
      font-size: 0.6875rem; font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.05em; color: rgba(0,0,0,0.35);
      margin: 1.5rem 0 0.75rem;
    }
    .sb-section-label::after {
      content: ''; flex: 1; height: 1px; background: rgba(0,0,0,0.06);
    }

    /* ── Image card (marketplace/browse) ── */
    .sb-image-card {
      background: var(--sb-surface, #ffffff);
      border: 1px solid rgba(0,0,0,0.06);
      border-radius: var(--sb-radius, 0.75rem);
      overflow: hidden;
      transition: box-shadow 150ms ease, transform 150ms ease;
    }
    .sb-image-card:hover { box-shadow: 0 8px 25px rgba(0,0,0,0.1); transform: translateY(-2px); }
    .sb-image-card-img {
      width: 100%; height: 0; padding-bottom: 60%;
      background: linear-gradient(135deg, var(--sb-primary-bg, rgba(99,102,241,0.12)), rgba(0,0,0,0.03));
      position: relative; display: flex; align-items: center; justify-content: center;
      overflow: hidden;
    }
    .sb-image-card-img::after {
      content: ''; position: absolute; inset: 0;
      background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%);
      animation: shimmer 2s infinite; background-size: 200% 100%;
    }
    @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
    .sb-image-card-body { padding: 0.875rem; }

    /* ── Price display ── */
    .sb-price { font-weight: 700; font-size: 1.125rem; color: var(--sb-text, #111); letter-spacing: -0.01em; }
    .sb-price-decimal { font-size: 0.75rem; font-weight: 600; vertical-align: super; }

    /* ── Star rating ── */
    .sb-rating { display: inline-flex; gap: 1px; color: #f59e0b; }

    /* ── Timeline item ── */
    .sb-timeline-item {
      display: flex; gap: 0.75rem; position: relative; padding-bottom: 1rem;
    }
    .sb-timeline-dot {
      width: 10px; height: 10px; min-width: 10px;
      border-radius: 50%; background: var(--sb-primary);
      margin-top: 0.375rem; position: relative; z-index: 1;
    }
    .sb-timeline-item:not(:last-child)::before {
      content: ''; position: absolute; left: 4px; top: 1.25rem;
      width: 2px; height: calc(100% - 0.75rem);
      background: rgba(0,0,0,0.08);
    }

    /* ── Step dots (learning path) ── */
    .sb-step-dot {
      display: flex; align-items: center; justify-content: center;
      width: 32px; height: 32px; min-width: 32px;
      border-radius: 50%; font-size: 0.75rem; font-weight: 700;
      background: var(--sb-primary); color: white;
      transition: all 150ms ease;
    }
    .sb-step-dot.locked { background: rgba(0,0,0,0.08); color: rgba(0,0,0,0.3); }
    .sb-step-dot.completed { background: #059669; }

    /* ── Horizontal carousel ── */
    .sb-carousel {
      display: flex; gap: 0.75rem; overflow-x: auto;
      scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch;
      padding-bottom: 0.5rem;
    }
    .sb-carousel::-webkit-scrollbar { display: none; }
    .sb-carousel > * { scroll-snap-align: start; flex-shrink: 0; }

    /* ── Gradient card (full gradient bg) ── */
    .sb-gradient-card {
      background: linear-gradient(135deg, var(--sb-primary), var(--sb-secondary));
      color: white; border-radius: var(--sb-radius, 0.75rem); padding: 1.25rem;
      box-shadow: 0 4px 14px var(--sb-primary-glow);
      transition: all 150ms ease;
    }
    .sb-gradient-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px var(--sb-primary-glow); }

    /* ── Notification badge ── */
    .sb-notification-badge {
      width: 8px; height: 8px; border-radius: 50%;
      background: #ef4444; display: inline-block;
    }

    /* ── Calendar cell ── */
    .sb-calendar-cell {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 0.375rem; border-radius: 0.5rem; font-size: 0.8125rem;
      min-height: 44px; cursor: pointer; transition: background 150ms ease;
    }
    .sb-calendar-cell:hover { background: var(--sb-primary-bg, rgba(99,102,241,0.08)); }
    .sb-calendar-cell.active { background: var(--sb-primary); color: white; border-radius: 50%; }
    .sb-calendar-cell.has-event::after {
      content: ''; width: 4px; height: 4px; border-radius: 50%;
      background: var(--sb-primary); margin-top: 2px;
    }

    /* ── Kanban column ── */
    .sb-kanban-col {
      min-width: 240px; background: rgba(0,0,0,0.02); border-radius: var(--sb-radius, 0.75rem);
      padding: 0.75rem; display: flex; flex-direction: column; gap: 0.5rem;
    }
    .sb-kanban-col-header {
      font-size: 0.8125rem; font-weight: 600; padding: 0.375rem 0.5rem;
      color: var(--sb-text-secondary, #6b7280); text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    /* ── Bottom action bar ── */
    .sb-bottom-bar {
      position: sticky; bottom: 0; left: 0; right: 0; z-index: 40;
      padding: 0.75rem 1.25rem; display: flex; align-items: center; gap: 0.75rem;
      background: var(--sb-surface, rgba(255,255,255,0.95));
      backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
      border-top: 1px solid rgba(0,0,0,0.06);
    }

    /* ── Streak/achievement badge ── */
    .sb-streak-badge {
      display: inline-flex; align-items: center; gap: 0.5rem;
      padding: 0.5rem 1rem; border-radius: 9999px;
      background: linear-gradient(135deg, #f59e0b, #ef4444);
      color: white; font-weight: 700; font-size: 0.875rem;
    }

    /* ── Chat bubbles ── */
    .sb-chat-bubble {
      max-width: 75%; padding: 0.625rem 0.875rem; border-radius: 1rem 1rem 1rem 0.25rem;
      background: rgba(0,0,0,0.04); font-size: 0.875rem; line-height: 1.5;
    }
    .sb-chat-bubble-self {
      max-width: 75%; padding: 0.625rem 0.875rem; border-radius: 1rem 1rem 0.25rem 1rem;
      background: var(--sb-primary); color: white; font-size: 0.875rem; line-height: 1.5;
      margin-left: auto;
    }

    /* ── Typing indicator ── */
    .sb-typing-indicator {
      display: flex; align-items: center; gap: 4px;
      padding: 0.75rem 1rem; background: rgba(0,0,0,0.04);
      border-radius: 1rem 1rem 1rem 0.25rem; width: fit-content;
    }
    .sb-typing-indicator span {
      width: 6px; height: 6px; background: var(--sb-text-secondary, #6b7280);
      border-radius: 50%; animation: typingBounce 1.4s ease-in-out infinite;
    }
    .sb-typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
    .sb-typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes typingBounce { 0%,60%,100% { transform: translateY(0); opacity: 0.4; } 30% { transform: translateY(-4px); opacity: 1; } }

    /* ── Color dot swatch ── */
    .sb-color-dot {
      width: 24px; height: 24px; min-width: 24px;
      border-radius: 50%; border: 2px solid rgba(0,0,0,0.08);
      cursor: pointer; transition: transform 150ms ease;
    }
    .sb-color-dot:hover { transform: scale(1.15); }
    .sb-color-dot.active { border-color: var(--sb-primary); box-shadow: 0 0 0 2px var(--sb-primary-glow); }

    /* ── Map placeholder ── */
    .sb-map-area {
      width: 100%; height: 0; padding-bottom: 50%;
      background: linear-gradient(135deg, #e0f2fe, #dbeafe, #ede9fe);
      border-radius: var(--sb-radius, 0.75rem); position: relative;
      display: flex; align-items: center; justify-content: center;
      overflow: hidden;
    }

    /* ── Sparkline (inline mini chart) ── */
    .sb-sparkline { display: inline-flex; align-items: flex-end; height: 24px; gap: 1px; }
    .sb-sparkline-bar {
      width: 3px; border-radius: 1px;
      background: var(--sb-primary); transition: height 300ms ease;
    }

    /* ── Meter/gauge ── */
    .sb-meter {
      width: 100%; height: 8px; background: rgba(0,0,0,0.06);
      border-radius: 9999px; position: relative; overflow: visible;
    }
    .sb-meter-fill {
      height: 100%; border-radius: 9999px;
      background: linear-gradient(90deg, var(--sb-primary), var(--sb-secondary));
      position: relative;
    }
    .sb-meter-marker {
      position: absolute; right: -4px; top: -3px;
      width: 14px; height: 14px; border-radius: 50%;
      background: white; border: 3px solid var(--sb-primary);
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }

    /* ── Press effect utility ── */
    .sb-press { transition: transform 100ms ease; cursor: pointer; }
    .sb-press:active { transform: scale(0.97); }

    /* ── SAFETY NET: Native form element defaults ── */
    /* Ensures ALL form elements look polished even without explicit sb-*/glass-* classes */

    input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"]):not([type="range"]):not(.glass-input):not(.sb-dark-input) {
      width: 100%;
      background: var(--sb-surface-elevated, #f9fafb);
      border: 1px solid rgba(0,0,0,0.1);
      border-radius: 0.625rem;
      color: var(--sb-text, #111);
      padding: 0.625rem 0.875rem;
      font-family: inherit;
      font-size: 0.875rem;
      line-height: 1.5;
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
      box-sizing: border-box;
    }
    input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"]):not([type="range"]):not(.glass-input):not(.sb-dark-input):focus {
      border-color: var(--sb-primary, #6366f1);
      box-shadow: 0 0 0 3px var(--sb-primary-glow, rgba(99,102,241,0.15));
    }
    input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"]):not([type="range"]):not(.glass-input):not(.sb-dark-input)::placeholder {
      color: rgba(0,0,0,0.35);
    }

    textarea:not(.glass-input):not(.sb-dark-input) {
      width: 100%;
      background: var(--sb-surface-elevated, #f9fafb);
      border: 1px solid rgba(0,0,0,0.1);
      border-radius: 0.625rem;
      color: var(--sb-text, #111);
      padding: 0.625rem 0.875rem;
      font-family: inherit;
      font-size: 0.875rem;
      line-height: 1.5;
      min-height: 100px;
      resize: vertical;
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
      box-sizing: border-box;
    }
    textarea:not(.glass-input):not(.sb-dark-input):focus {
      border-color: var(--sb-primary, #6366f1);
      box-shadow: 0 0 0 3px var(--sb-primary-glow, rgba(99,102,241,0.15));
    }
    textarea:not(.glass-input):not(.sb-dark-input)::placeholder {
      color: rgba(0,0,0,0.35);
    }

    select {
      width: 100%;
      appearance: none;
      -webkit-appearance: none;
      background: var(--sb-surface-elevated, #f9fafb) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E") no-repeat right 0.75rem center;
      background-size: 12px;
      border: 1px solid rgba(0,0,0,0.1);
      border-radius: 0.625rem;
      color: var(--sb-text, #111);
      padding: 0.625rem 2.5rem 0.625rem 0.875rem;
      font-family: inherit;
      font-size: 0.875rem;
      line-height: 1.5;
      cursor: pointer;
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
      box-sizing: border-box;
    }
    select:focus {
      border-color: var(--sb-primary, #6366f1);
      box-shadow: 0 0 0 3px var(--sb-primary-glow, rgba(99,102,241,0.15));
    }

    input[type="radio"] {
      appearance: none;
      -webkit-appearance: none;
      width: 18px; height: 18px; min-width: 18px;
      border: 2px solid rgba(0,0,0,0.2);
      border-radius: 50%;
      cursor: pointer;
      transition: all 0.15s;
      position: relative;
      vertical-align: middle;
      margin: 0;
    }
    input[type="radio"]:checked {
      border-color: var(--sb-primary, #6366f1);
      background: var(--sb-primary, #6366f1);
      box-shadow: inset 0 0 0 3px #fff;
    }
    input[type="radio"]:focus {
      outline: none;
      box-shadow: 0 0 0 3px var(--sb-primary-glow, rgba(99,102,241,0.15));
    }

    input[type="checkbox"] {
      appearance: none;
      -webkit-appearance: none;
      width: 18px; height: 18px; min-width: 18px;
      border: 2px solid rgba(0,0,0,0.2);
      border-radius: 0.25rem;
      cursor: pointer;
      transition: all 0.15s;
      position: relative;
      vertical-align: middle;
      margin: 0;
    }
    input[type="checkbox"]:checked {
      background: var(--sb-primary, #6366f1);
      border-color: var(--sb-primary, #6366f1);
    }
    input[type="checkbox"]:checked::after {
      content: '';
      position: absolute;
      left: 4px; top: 1px;
      width: 6px; height: 10px;
      border: solid white;
      border-width: 0 2px 2px 0;
      transform: rotate(45deg);
    }
    input[type="checkbox"]:focus {
      outline: none;
      box-shadow: 0 0 0 3px var(--sb-primary-glow, rgba(99,102,241,0.15));
    }

    input[type="range"] {
      appearance: none;
      -webkit-appearance: none;
      width: 100%; height: 6px;
      background: rgba(0,0,0,0.08);
      border-radius: 9999px;
      outline: none;
      border: none;
      padding: 0;
    }
    input[type="range"]::-webkit-slider-thumb {
      appearance: none;
      -webkit-appearance: none;
      width: 18px; height: 18px;
      border-radius: 50%;
      background: var(--sb-primary, #6366f1);
      cursor: pointer;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }

    label {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--sb-text-secondary, rgba(0,0,0,0.7));
      cursor: pointer;
    }

    /* Dark theme safety net — activated when root has dark bg classes */
    .dark input:not(.glass-input):not(.sb-dark-input):not([type="radio"]):not([type="checkbox"]):not([type="range"]),
    .dark textarea:not(.glass-input):not(.sb-dark-input),
    .dark select {
      background: rgba(255,255,255,0.05);
      color: #e2e8f0;
      border-color: rgba(255,255,255,0.1);
    }
    .dark input:not(.glass-input):not(.sb-dark-input):not([type="radio"]):not([type="checkbox"]):not([type="range"])::placeholder,
    .dark textarea:not(.glass-input):not(.sb-dark-input)::placeholder {
      color: rgba(255,255,255,0.35);
    }
    .dark input[type="radio"]:checked { box-shadow: inset 0 0 0 3px #0f172a; }
    .dark input[type="checkbox"]:checked::after { border-color: white; }
    .dark label { color: #94a3b8; }
    .dark select { background-color: rgba(255,255,255,0.05); color: #e2e8f0; border-color: rgba(255,255,255,0.1); }

    /* ── Button safety net — make ALL buttons look decent even without Tailwind classes ── */
    button:not([class*="glass-btn"]):not([class*="bg-"]):not([class*="btn"]):not([class*="rounded"]) {
      padding: 0.5rem 1rem;
      border-radius: 0.625rem;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      border: 1px solid #e5e7eb;
      background: #f9fafb;
      color: #374151;
    }
    button:not([class*="glass-btn"]):not([class*="bg-"]):not([class*="btn"]):not([class*="rounded"]):hover {
      background: #f3f4f6;
      border-color: #d1d5db;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    button:not([class*="glass-btn"]):not([class*="bg-"]):not([class*="btn"]):not([class*="rounded"]):active {
      transform: scale(0.98);
    }
    /* Primary-looking buttons (with primary color bg) get white text */
    button[style*="background"] { color: white; border: none; }

    /* ── Card/container safety net — visible borders and subtle backgrounds ── */
    div[class*="border"]:not([class*="bg-"]) {
      background: white;
    }

    /* ── Scrollbar ── */
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.2); }

    ${mobile ? `
    /* ── Mobile preview: lightweight overrides ── */
    /* Let Tailwind responsive classes handle layout naturally. */
    /* Only add safe-area padding, overflow prevention, and touch-friendly sizing. */
    html {
      -webkit-text-size-adjust: 100% !important;
    }
    html, body {
      width: 100% !important;
      max-width: 100% !important;
      overflow-x: hidden !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    body {
      -webkit-overflow-scrolling: touch !important;
    }
    #root {
      overflow-x: hidden !important;
      max-width: 100% !important;
      width: 100% !important;
      min-height: 100vh;
      /* Safe area: space for status bar (48px) and home indicator (34px) */
      padding-top: 48px !important;
      padding-bottom: 34px !important;
    }

    /* === Sidebar collapse (too wide for phone) === */
    aside, [class*="sidebar"], [class*="Sidebar"] {
      display: none !important;
    }

    /* === Grid collapse: only 3+ columns → 2 columns === */
    [class*="grid-cols-3"], [class*="grid-cols-4"],
    [class*="grid-cols-5"], [class*="grid-cols-6"],
    [class*="lg\\:grid-cols-3"], [class*="lg\\:grid-cols-4"] {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    }

    /* === Touch-friendly component sizing === */
    .sb-nav { padding: 0 16px !important; height: 44px !important; }
    .sb-nav-tabs { gap: 2px !important; overflow-x: auto !important; -webkit-overflow-scrolling: touch !important; flex-wrap: nowrap !important; }
    .sb-nav-tab { padding: 6px 12px !important; font-size: 13px !important; white-space: nowrap !important; }
    button, .glass-btn, [role="button"] { min-height: 44px !important; }
    input, select, textarea, .glass-input { font-size: 16px !important; min-height: 44px !important; }

    /* === Responsive media === */
    img, video, canvas { max-width: 100% !important; height: auto !important; }

    /* === Table scroll === */
    .sb-table { display: block !important; overflow-x: auto !important; }

    /* === Scrollbar hiding (native feel) === */
    ::-webkit-scrollbar { display: none !important; }
    * { -ms-overflow-style: none !important; scrollbar-width: none !important; }
    ` : ''}

    /* ── Responsive: fallback for real mobile devices (share page on a phone) ── */
    @media (max-width: 500px) {
      html, body { overflow-x: hidden !important; }
      #root { overflow-x: hidden !important; }
      aside, [class*="sidebar"], [class*="Sidebar"] { display: none !important; }
      [class*="grid-cols-3"], [class*="grid-cols-4"],
      [class*="grid-cols-5"], [class*="grid-cols-6"] {
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      }
      .sb-nav { padding: 0 16px !important; height: 44px !important; }
      .sb-nav-tabs { overflow-x: auto !important; flex-wrap: nowrap !important; }
      .sb-nav-tab { font-size: 13px !important; white-space: nowrap !important; }
      button, .glass-btn { min-height: 44px !important; }
      input, select, textarea, .glass-input { font-size: 16px !important; min-height: 44px !important; }
      img, video, canvas { max-width: 100% !important; height: auto !important; }
    }
  </style>
</head>
<body>
  <div id="root">
    <div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#ffffff">
      <div style="text-align:center;color:rgba(0,0,0,0.4)">
        <div style="width:28px;height:28px;border:2px solid rgba(0,0,0,0.08);border-top-color:var(--sb-primary,#6366f1);border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 0.75rem"></div>
        <div style="font-size:0.8125rem;font-family:Inter,sans-serif">Loading app...</div>
      </div>
    </div>
  </div>

  <script>
    // Inject AI proxy function
    window.__sbAI = async function(system, message) {
      const response = await fetch('/api/apps/${appId}/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system: system, message: message })
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(err.message || 'AI request failed');
      }
      const data = await response.json();
      return data.text;
    };

    // Map lucide-react UMD export and create safe icon lookup
    if (window.LucideReact) {
      window.lucideReact = window.LucideReact;

      // Create a safe wrapper that returns a fallback for missing icons
      // instead of undefined (which causes colored squares with nothing inside)
      var _origLR = window.LucideReact;
      var _FallbackIcon = function(props) {
        var size = (props && props.size) || 18;
        var sw = (props && props.strokeWidth) || 1.5;
        var color = (props && props.style && props.style.color) || (props && props.color) || 'currentColor';
        return React.createElement('svg', {
          width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
          stroke: color, strokeWidth: sw, strokeLinecap: 'round', strokeLinejoin: 'round',
          style: props && props.style, className: props && props.className
        },
          React.createElement('circle', {cx:'12',cy:'12',r:'10'}),
          React.createElement('circle', {cx:'12',cy:'12',r:'1',fill:color,stroke:'none'})
        );
      };
      // Use Proxy with direct property access (not 'in' operator) for better UMD compat
      window.LucideReact = new Proxy(_origLR, {
        get: function(target, prop) {
          // Direct property access — works with getters, frozen objects, etc.
          var val = target[prop];
          if (val !== undefined) return val;
          // For PascalCase names that don't exist, return fallback component
          if (typeof prop === 'string' && prop.length > 0 && prop.charCodeAt(0) >= 65 && prop.charCodeAt(0) <= 90) {
            return _FallbackIcon;
          }
          return val;
        },
        has: function(target, prop) {
          // Make 'in' operator return true for PascalCase icon names
          if (prop in target) return true;
          if (typeof prop === 'string' && prop.length > 0 && prop.charCodeAt(0) >= 65 && prop.charCodeAt(0) <= 90) return true;
          return false;
        }
      });

      // Debug: log a sample icon to verify UMD loaded correctly
      console.log('[StartBox] LucideReact loaded, sample icons:', typeof _origLR.Search, typeof _origLR.Star, typeof _origLR.Mic);
    }

    // Global error handler — only replaces DOM for pre-render crashes
    window.__sbRenderComplete = false;
    window.onerror = function(msg, src, line, col, err) {
      var detail = String(msg);
      if (err && err.stack) detail += '\\n' + String(err.stack);
      if (src) detail += '\\nSource: ' + src + (line ? ':' + line : '') + (col ? ':' + col : '');
      console.error('[StartBox Preview Error]', detail);
      if (!window.__sbRenderComplete) {
        document.getElementById('root').innerHTML =
          '<div class="sb-error"><h2>App Error</h2><pre>' + detail + '</pre></div>';
      }
    };
    window.addEventListener('unhandledrejection', function(e) {
      var msg = e.reason ? (e.reason.message || String(e.reason)) : 'Unhandled promise rejection';
      console.error('[StartBox Preview] Unhandled rejection:', msg);
    });
  </script>

  <script>
    // StartBox SDK — pre-loaded helpers for generated apps
    window.__sb = {
      useStore: function(key, defaultValue) {
        var _a = React.useState(function() {
          try { var s = localStorage.getItem(key); return s ? JSON.parse(s) : defaultValue; } catch(e) { return defaultValue; }
        }), val = _a[0], setVal = _a[1];
        var update = React.useCallback(function(v) {
          setVal(function(prev) {
            var next = typeof v === 'function' ? v(prev) : v;
            try { localStorage.setItem(key, JSON.stringify(next)); } catch(e) {}
            return next;
          });
        }, [key]);
        return [val, update];
      },
      copy: async function(text) {
        try { await navigator.clipboard.writeText(text); window.__sb.toast('Copied!', 'success'); return true; } catch(e) { return false; }
      },
      fmt: {
        date: function(d) { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); },
        time: function(d) { return new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); },
        number: function(n) { return Number(n).toLocaleString(); },
        currency: function(n) { return '$' + Number(n).toFixed(2); },
        percent: function(n) { return Math.round(n) + '%'; },
        relative: function(d) {
          var s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
          if (s < 60) return 'just now';
          if (s < 3600) return Math.floor(s/60) + 'm ago';
          if (s < 86400) return Math.floor(s/3600) + 'h ago';
          return Math.floor(s/86400) + 'd ago';
        },
      },
      toast: function(msg, type) {
        var el = document.createElement('div');
        el.className = 'sb-toast sb-toast--' + (type || 'success');
        el.textContent = msg;
        document.body.appendChild(el);
        setTimeout(function() { if (el.parentNode) el.parentNode.removeChild(el); }, 3000);
      },
      // Utility: generate hex color variants
      color: function(hex, opacity) {
        var r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
        return 'rgba(' + r + ',' + g + ',' + b + ',' + (opacity || 1) + ')';
      },
      // Conditional className joiner: cn('a', cond && 'b', 'c') => 'a c' or 'a b c'
      cn: function() {
        var r = [];
        for (var i = 0; i < arguments.length; i++) {
          var a = arguments[i];
          if (typeof a === 'string' && a) r.push(a);
        }
        return r.join(' ');
      },
    };
  </script>

  <script>
    // React ErrorBoundary — catches render errors without killing the whole app
    (function() {
      function EB(props) { this.state = { hasError: false, error: null }; }
      EB.prototype = Object.create(React.Component.prototype);
      EB.prototype.constructor = EB;
      EB.getDerivedStateFromError = function(error) { return { hasError: true, error: error }; };
      EB.prototype.componentDidCatch = function(error, info) {
        console.error('[StartBox] React render error:', error, info);
      };
      EB.prototype.render = function() {
        if (this.state.hasError) {
          var msg = this.state.error ? String(this.state.error.message || this.state.error) : 'Unknown error';
          return React.createElement('div', { className: 'sb-error' },
            React.createElement('h2', null, 'Something went wrong'),
            React.createElement('pre', null, msg),
            React.createElement('button', {
              className: 'glass-btn glass-btn-primary',
              style: { marginTop: '1rem' },
              onClick: function() { location.reload(); }
            }, 'Reload App')
          );
        }
        return this.props.children;
      };
      window.__SBErrorBoundary = EB;
    })();
  </script>

  <script>
    // Auto-wrap ReactDOM.createRoot render with ErrorBoundary for crash protection
    // This transparently intercepts render calls so generated code doesn't need to know about it
    (function() {
      var _origCreateRoot = ReactDOM.createRoot;
      ReactDOM.createRoot = function(container) {
        var root = _origCreateRoot.call(ReactDOM, container);
        var _origRender = root.render;
        root.render = function(element) {
          window.__sbRenderComplete = true;
          return _origRender.call(root, React.createElement(window.__SBErrorBoundary, null, element));
        };
        return root;
      };
    })();
  </script>

  <script type="text/babel" data-presets="react,env">
    ${code}
  </script>

  <script>
    // Render timeout fallback — if nothing rendered after 10s, show a helpful error
    setTimeout(function() {
      if (!window.__sbRenderComplete) {
        var root = document.getElementById('root');
        if (root) {
          root.innerHTML = '<div class="sb-error">' +
            '<h2>App failed to load</h2>' +
            '<pre>The generated code failed to compile or render.\\nCheck the browser console for details.</pre>' +
            '<button class="glass-btn glass-btn-primary" style="margin-top:1rem" onclick="location.reload()">Reload</button>' +
            '</div>';
        }
      }
    }, 10000);
  </script>

  <script>
    // Mobile responsive fix — only for explicit mobile preview, minimal intervention
    (function() {
      var isMobilePreview = ${mobile ? 'true' : 'false'};
      if (!isMobilePreview) return; // Only run for mobile preview mode

      var cw = document.documentElement.clientWidth || 375;

      function fixOverflow() {
        // Only fix elements that actually overflow the viewport
        var els = document.querySelectorAll('div, section, main, article, aside, header, footer, form, nav');
        for (var i = 0; i < els.length; i++) {
          var el = els[i];
          if (el.getBoundingClientRect().width > cw + 2) {
            el.style.setProperty('max-width', '100%', 'important');
            el.style.setProperty('overflow-x', 'hidden', 'important');
          }
        }
        // Scale down grids with 3+ columns on mobile
        var grids = document.querySelectorAll('[class*="grid-cols-3"], [class*="grid-cols-4"], [class*="lg:grid-cols"]');
        for (var j = 0; j < grids.length; j++) {
          var cs = window.getComputedStyle(grids[j]);
          if (cs.display === 'grid') {
            var cols = (cs.gridTemplateColumns || '').split(/\\s+/).filter(Boolean);
            if (cols.length >= 3) {
              grids[j].style.setProperty('grid-template-columns', 'repeat(2, minmax(0, 1fr))', 'important');
            }
          }
        }
      }

      setTimeout(fixOverflow, 300);
      setTimeout(fixOverflow, 1500);
    })();
  </script>
</body>
</html>`;
}

export function AppPreview({ code, appId, height = '100%', mobile = false }: AppPreviewProps) {
  const iframeKey = useMemo(() => `${appId}:${code}:${mobile}`, [appId, code, mobile]);

  const srcDoc = buildIframeHtml(code, appId, mobile);

  return (
    <iframe
      key={iframeKey}
      srcDoc={srcDoc}
      sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
      style={{
        width: '100%',
        height,
        border: 'none',
        display: 'block',
        background: '#ffffff',
      }}
      title="App Preview"
    />
  );
}
