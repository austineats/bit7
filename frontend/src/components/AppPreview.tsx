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
  <script>
    window.__sbTailwindLoaded = false;
    window.__sbTailwindFailed = false;
    window.__sbTailwindSource = 'none';
    (function() {
      function markLoaded(source) {
        window.__sbTailwindLoaded = true;
        window.__sbTailwindSource = source;
      }

      function loadScript(src, source, onError) {
        var s = document.createElement('script');
        s.src = src;
        s.crossOrigin = 'anonymous';
        s.onload = function() { markLoaded(source); };
        s.onerror = function() { if (onError) onError(); };
        document.head.appendChild(s);
      }

      function loadTailwindFromCdn() {
        // Prefer Tailwind Play CDN; fallback to browser runtime mirrors if blocked.
        loadScript('https://cdn.tailwindcss.com', 'tailwind-play-cdn', function() {
          loadScript('https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4', 'tailwind-browser-jsdelivr', function() {
            loadScript('https://unpkg.com/@tailwindcss/browser@4', 'tailwind-browser-unpkg', function() {
              window.__sbTailwindFailed = true;
            });
          });
        });
      }
      window.__sbLoadTailwindCdn = loadTailwindFromCdn;
      loadTailwindFromCdn();
    })();
  </script>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script>
    // Guard: verify React and ReactDOM loaded from CDN before proceeding
    if (!window.React || !window.ReactDOM) {
      window.__sbCdnFailed = true;
      document.addEventListener('DOMContentLoaded', function() {
        document.body.innerHTML = '<div style="padding:2rem;font-family:system-ui,sans-serif;color:#ef4444;text-align:center">' +
          '<h2 style="margin-bottom:0.5rem">Runtime dependency failed to load</h2>' +
          '<p style="color:#666">React/ReactDOM CDN unavailable. Check your network connection and reload.</p>' +
          '</div>';
      });
    } else {
      window.react = window.React;
      window['react-dom'] = window.ReactDOM;
    }
  </script>
  <script crossorigin src="https://cdn.jsdelivr.net/npm/lucide-react@0.575.0/dist/umd/lucide-react.js"></script>
  <script crossorigin src="https://unpkg.com/lucide-react@0.575.0/dist/umd/lucide-react.js"></script>
  <script crossorigin src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    html, body { width: 100%; height: 100%; }
    body {
      margin: 0;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    button { -webkit-tap-highlight-color: transparent; }
    svg { display: inline-block; vertical-align: middle; }
    #root { width: 100%; min-height: 100vh; }

    /* ── Text visibility safety net — scoped to .sb-fallback namespace ── */
    h1, h2, h3, h4, h5, h6 { color: inherit; }
    p, span, li, td, th, label, dt, dd { color: inherit; }

    /* ── Core utility fallback (keeps previews readable if Tailwind CDN fails) ── */
    .min-h-screen { min-height: 100vh; }
    .min-h-0 { min-height: 0; }
    .h-full { height: 100%; }
    .h-auto { height: auto; }
    .max-h-full { max-height: 100%; }
    .w-full { width: 100%; }
    .w-auto { width: auto; }
    .w-screen { width: 100vw; }
    .w-10 { width: 2.5rem; }
    .h-10 { height: 2.5rem; }
    .max-w-full { max-width: 100%; }
    .max-w-none { max-width: none; }
    .max-w-xs { max-width: 20rem; }
    .max-w-sm { max-width: 24rem; }
    .max-w-md { max-width: 28rem; }
    .max-w-lg { max-width: 32rem; }
    .max-w-xl { max-width: 36rem; }
    .max-w-2xl { max-width: 42rem; }
    .max-w-3xl { max-width: 48rem; }
    .max-w-4xl { max-width: 56rem; }
    .max-w-5xl { max-width: 64rem; }
    .max-w-6xl { max-width: 72rem; }
    .max-w-7xl { max-width: 80rem; }
    .mx-auto { margin-left: auto; margin-right: auto; }
    .my-2 { margin-top: 0.5rem; margin-bottom: 0.5rem; }
    .my-4 { margin-top: 1rem; margin-bottom: 1rem; }
    .mt-1 { margin-top: 0.25rem; }
    .mt-2 { margin-top: 0.5rem; }
    .mt-3 { margin-top: 0.75rem; }
    .mt-4 { margin-top: 1rem; }
    .mt-6 { margin-top: 1.5rem; }
    .mt-8 { margin-top: 2rem; }
    .mb-1 { margin-bottom: 0.25rem; }
    .mb-2 { margin-bottom: 0.5rem; }
    .mb-3 { margin-bottom: 0.75rem; }
    .mb-4 { margin-bottom: 1rem; }
    .mb-6 { margin-bottom: 1.5rem; }
    .p-0 { padding: 0; }
    .p-1 { padding: 0.25rem; }
    .p-2 { padding: 0.5rem; }
    .p-3 { padding: 0.75rem; }
    .p-4 { padding: 1rem; }
    .p-5 { padding: 1.25rem; }
    .p-6 { padding: 1.5rem; }
    .p-8 { padding: 2rem; }
    .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
    .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
    .px-4 { padding-left: 1rem; padding-right: 1rem; }
    .px-5 { padding-left: 1.25rem; padding-right: 1.25rem; }
    .px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
    .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
    .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
    .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
    .py-4 { padding-top: 1rem; padding-bottom: 1rem; }
    .py-6 { padding-top: 1.5rem; padding-bottom: 1.5rem; }
    .py-8 { padding-top: 2rem; padding-bottom: 2rem; }
    .py-10 { padding-top: 2.5rem; padding-bottom: 2.5rem; }
    .py-12 { padding-top: 3rem; padding-bottom: 3rem; }
    .pb-2 { padding-bottom: 0.5rem; }
    .pb-4 { padding-bottom: 1rem; }
    .pt-2 { padding-top: 0.5rem; }
    .pt-4 { padding-top: 1rem; }
    .flex { display: flex; }
    .inline-flex { display: inline-flex; }
    .grid { display: grid; }
    .hidden { display: none; }
    .block { display: block; }
    .flex-col { flex-direction: column; }
    .flex-wrap { flex-wrap: wrap; }
    .flex-1 { flex: 1 1 0%; }
    .flex-auto { flex: 1 1 auto; }
    .flex-none { flex: none; }
    .shrink-0 { flex-shrink: 0; }
    .grow { flex-grow: 1; }
    .items-center { align-items: center; }
    .items-start { align-items: flex-start; }
    .items-end { align-items: flex-end; }
    .items-stretch { align-items: stretch; }
    .justify-center { justify-content: center; }
    .justify-start { justify-content: flex-start; }
    .justify-between { justify-content: space-between; }
    .justify-around { justify-content: space-around; }
    .justify-evenly { justify-content: space-evenly; }
    .justify-end { justify-content: flex-end; }
    .gap-1 { gap: 0.25rem; }
    .gap-2 { gap: 0.5rem; }
    .gap-3 { gap: 0.75rem; }
    .gap-4 { gap: 1rem; }
    .gap-5 { gap: 1.25rem; }
    .gap-6 { gap: 1.5rem; }
    .gap-8 { gap: 2rem; }
    .space-y-1 > :not([hidden]) ~ :not([hidden]) { margin-top: 0.25rem; }
    .space-y-2 > :not([hidden]) ~ :not([hidden]) { margin-top: 0.5rem; }
    .space-y-3 > :not([hidden]) ~ :not([hidden]) { margin-top: 0.75rem; }
    .space-y-4 > :not([hidden]) ~ :not([hidden]) { margin-top: 1rem; }
    .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
    .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .rounded { border-radius: 0.25rem; }
    .rounded-md { border-radius: 0.375rem; }
    .rounded-lg { border-radius: 0.5rem; }
    .rounded-xl { border-radius: 0.75rem; }
    .rounded-2xl { border-radius: 1rem; }
    .rounded-3xl { border-radius: 1.5rem; }
    .rounded-full { border-radius: 9999px; }
    .border { border: 1px solid #e5e7eb; }
    .border-0 { border: 0; }
    .border-b { border-bottom: 1px solid #e5e7eb; }
    .border-t { border-top: 1px solid #e5e7eb; }
    .border-gray-100 { border-color: #f3f4f6; }
    .border-gray-200 { border-color: #e5e7eb; }
    .border-gray-300 { border-color: #d1d5db; }
    .bg-white { background: #ffffff; }
    .bg-black { background: #000000; }
    .bg-gray-50 { background: #f9fafb; }
    .bg-gray-100 { background: #f3f4f6; }
    .bg-gray-200 { background: #e5e7eb; }
    .bg-gray-900 { background: #111827; }
    .bg-indigo-50 { background: #eef2ff; }
    .bg-indigo-100 { background: #e0e7ff; }
    .bg-indigo-500 { background: #6366f1; }
    .bg-indigo-600 { background: #4f46e5; }
    .bg-purple-500 { background: #a855f7; }
    .bg-purple-600 { background: #9333ea; }
    .bg-emerald-100 { background: #d1fae5; }
    .bg-emerald-500 { background: #10b981; }
    .bg-emerald-600 { background: #059669; }
    .bg-teal-600 { background: #0d9488; }
    .bg-red-50 { background: #fef2f2; }
    .bg-orange-100 { background: #ffedd5; }
    .text-white { color: #ffffff; }
    .text-black { color: #000000; }
    .text-gray-400 { color: #9ca3af; }
    .text-gray-500 { color: #6b7280; }
    .text-gray-600 { color: #4b5563; }
    .text-gray-700 { color: #374151; }
    .text-gray-800 { color: #1f2937; }
    .text-gray-900 { color: #111827; }
    .text-indigo-500 { color: #6366f1; }
    .text-indigo-600 { color: #4f46e5; }
    .text-indigo-700 { color: #4338ca; }
    .text-emerald-100 { color: #d1fae5; }
    .text-emerald-600 { color: #059669; }
    .text-red-200 { color: #fecaca; }
    .text-red-700 { color: #b91c1c; }
    .text-orange-600 { color: #ea580c; }
    .text-xs { font-size: 0.75rem; line-height: 1rem; }
    .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
    .text-base { font-size: 1rem; line-height: 1.5rem; }
    .text-lg { font-size: 1.125rem; line-height: 1.75rem; }
    .text-xl { font-size: 1.25rem; line-height: 1.75rem; }
    .text-2xl { font-size: 1.5rem; line-height: 2rem; }
    .text-3xl { font-size: 1.875rem; line-height: 2.25rem; }
    .text-4xl { font-size: 2.25rem; line-height: 2.5rem; }
    .text-5xl { font-size: 3rem; line-height: 1; }
    .font-medium { font-weight: 500; }
    .font-semibold { font-weight: 600; }
    .font-bold { font-weight: 700; }
    .shadow-sm { box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
    .shadow { box-shadow: 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06); }
    .shadow-lg { box-shadow: 0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05); }
    .overflow-hidden { overflow: hidden; }
    .overflow-auto { overflow: auto; }
    .overflow-x-auto { overflow-x: auto; }
    .overflow-y-auto { overflow-y: auto; }
    .transition-colors { transition: color .2s ease, background-color .2s ease, border-color .2s ease; }
    .transition-all { transition: all .2s ease; }
    .duration-300 { transition-duration: .3s; }
    .duration-500 { transition-duration: .5s; }
    .cursor-pointer { cursor: pointer; }
    .text-center { text-align: center; }
    .text-left { text-align: left; }
    .text-right { text-align: right; }
    .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .divide-y > :not([hidden]) ~ :not([hidden]) { border-top: 1px solid #f3f4f6; }
    .hover\\:bg-gray-50:hover { background: #f9fafb; }
    .hover\\:bg-gray-100:hover { background: #f3f4f6; }
    .hover\\:bg-emerald-600:hover { background: #059669; }
    .hover\\:bg-gray-800:hover { background: #1f2937; }
    .hover\\:text-red-500:hover { color: #ef4444; }
    .hover\\:text-gray-700:hover { color: #374151; }
    .focus\\:outline-none:focus { outline: none; }
    .focus\\:ring-2:focus { box-shadow: 0 0 0 2px rgba(99,102,241,0.3); }
    .relative { position: relative; }
    .absolute { position: absolute; }
    .fixed { position: fixed; }
    .sticky { position: sticky; }
    .inset-0 { inset: 0; }
    .top-0 { top: 0; }
    .bottom-0 { bottom: 0; }
    .left-0 { left: 0; }
    .right-0 { right: 0; }
    .z-10 { z-index: 10; }
    .z-20 { z-index: 20; }
    .z-30 { z-index: 30; }
    .z-40 { z-index: 40; }
    .z-50 { z-index: 50; }
    .bg-gradient-to-r { background-image: linear-gradient(to right, var(--tw-gradient-stops)); }
    .bg-gradient-to-l { background-image: linear-gradient(to left, var(--tw-gradient-stops)); }
    .bg-gradient-to-b { background-image: linear-gradient(to bottom, var(--tw-gradient-stops)); }
    .bg-gradient-to-t { background-image: linear-gradient(to top, var(--tw-gradient-stops)); }
    .bg-gradient-to-br { background-image: linear-gradient(to bottom right, var(--tw-gradient-stops)); }
    .bg-gradient-to-bl { background-image: linear-gradient(to bottom left, var(--tw-gradient-stops)); }
    .from-indigo-500 { --tw-gradient-from: #6366f1; --tw-gradient-to: rgba(99,102,241,0); --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to); }
    .from-emerald-500 { --tw-gradient-from: #10b981; --tw-gradient-to: rgba(16,185,129,0); --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to); }
    .from-green-500 { --tw-gradient-from: #22c55e; --tw-gradient-to: rgba(34,197,94,0); --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to); }
    .from-blue-500 { --tw-gradient-from: #3b82f6; --tw-gradient-to: rgba(59,130,246,0); --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to); }
    .from-slate-900 { --tw-gradient-from: #0f172a; --tw-gradient-to: rgba(15,23,42,0); --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to); }
    .to-purple-600 { --tw-gradient-to: #9333ea; }
    .to-emerald-600 { --tw-gradient-to: #059669; }
    .to-teal-600 { --tw-gradient-to: #0d9488; }
    .to-blue-600 { --tw-gradient-to: #2563eb; }
    .to-slate-800 { --tw-gradient-to: #1e293b; }
    .to-white { --tw-gradient-to: #ffffff; }
    .to-gray-50 { --tw-gradient-to: #f9fafb; }
    .via-white { --tw-gradient-via: #ffffff; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-via), var(--tw-gradient-to); }
    .via-slate-50 { --tw-gradient-via: #f8fafc; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-via), var(--tw-gradient-to); }
    @media (min-width: 640px) {
      .sm\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .sm\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .sm\\:text-lg { font-size: 1.125rem; line-height: 1.75rem; }
      .sm\\:text-xl { font-size: 1.25rem; line-height: 1.75rem; }
      .sm\\:text-6xl { font-size: 3.75rem; line-height: 1; }
    }
    @media (min-width: 768px) {
      .md\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .md\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .md\\:px-8 { padding-left: 2rem; padding-right: 2rem; }
      .md\\:text-2xl { font-size: 1.5rem; line-height: 2rem; }
    }
    @media (min-width: 1024px) {
      .lg\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .lg\\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
      .lg\\:text-7xl { font-size: 4.5rem; line-height: 1; }
    }

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
      border-radius: 0.75rem; padding: 1.5rem;
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
      padding: 1.25rem 1.5rem;
    }

    /* ── Colored icon container ── */
    .sb-icon-box {
      display: flex; align-items: center; justify-content: center;
      width: 48px; height: 48px; min-width: 48px;
      border-radius: 0.75rem;
      background: var(--sb-primary-bg, rgba(99,102,241,0.08));
    }
    .sb-icon-box-gradient {
      display: flex; align-items: center; justify-content: center;
      width: 48px; height: 48px; min-width: 48px;
      border-radius: 0.75rem;
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
      border-radius: var(--sb-radius, 0.75rem); padding: 1.5rem;
      box-shadow: var(--sb-card-shadow, 0 1px 3px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.06));
      transition: box-shadow 150ms ease, transform 150ms ease;
    }
    .sb-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06); }
    .sb-stat {
      display: flex; flex-direction: column; gap: 0.375rem;
      background: var(--sb-surface, #ffffff); border: 1px solid rgba(0,0,0,0.1);
      border-radius: var(--sb-radius, 0.75rem); padding: 1.5rem;
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
      height: 4rem; padding: 0 1.5rem;
      background: rgba(255,255,255,0.96); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(0,0,0,0.1);
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    .sb-nav-dark {
      position: sticky; top: 0; z-index: 50;
      display: flex; align-items: center; justify-content: space-between;
      height: 4rem; padding: 0 1.5rem;
      background: rgba(15,23,42,0.85); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .sb-nav-brand { display: flex; align-items: center; gap: 0.75rem; font-weight: 600; font-size: 1rem; color: var(--sb-text, #111); }
    .sb-nav-tabs { display: flex; gap: 0.375rem; }
    .sb-nav-tab {
      display: inline-flex; align-items: center; gap: 0.375rem;
      padding: 0.5rem 1rem; border-radius: 0.625rem;
      font-size: 0.875rem; font-weight: 500; color: rgba(0,0,0,0.45);
      cursor: pointer; transition: all 0.15s; border: none; background: none;
    }
    .sb-nav-tab:hover { color: rgba(0,0,0,0.7); background: rgba(0,0,0,0.04); }
    .sb-nav-tab.active { color: var(--sb-primary, #111); background: var(--sb-primary-bg, rgba(99,102,241,0.1)); font-weight: 600; }

    /* ── Nav layout variants ── */
    .sb-nav-centered {
      position: sticky; top: 0; z-index: 50;
      display: flex; flex-direction: column; align-items: center;
      padding: 1rem 1.5rem 0;
      background: rgba(255,255,255,0.96); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(0,0,0,0.1);
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    .sb-nav-centered .sb-nav-brand { margin-bottom: 0.625rem; }
    .sb-nav-centered .sb-nav-tabs { margin-bottom: 0.625rem; }
    .sb-nav-centered-dark {
      position: sticky; top: 0; z-index: 50;
      display: flex; flex-direction: column; align-items: center;
      padding: 1rem 1.5rem 0;
      background: rgba(15,23,42,0.85); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .sb-nav-centered-dark .sb-nav-brand { margin-bottom: 0.625rem; color: #e2e8f0; }
    .sb-nav-centered-dark .sb-nav-tabs { margin-bottom: 0.625rem; }
    .sb-nav-centered-dark .sb-nav-tab { color: rgba(255,255,255,0.45); }
    .sb-nav-centered-dark .sb-nav-tab:hover { color: rgba(255,255,255,0.7); }
    .sb-nav-centered-dark .sb-nav-tab.active { color: #fff; background: rgba(255,255,255,0.1); }

    .sb-nav-spread {
      position: sticky; top: 0; z-index: 50;
      display: flex; align-items: center; justify-content: space-between;
      height: 4rem; padding: 0 1.5rem;
      background: rgba(255,255,255,0.96); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(0,0,0,0.1);
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    .sb-nav-spread .sb-nav-tabs { margin-left: auto; }
    .sb-nav-spread-dark {
      position: sticky; top: 0; z-index: 50;
      display: flex; align-items: center; justify-content: space-between;
      height: 4rem; padding: 0 1.5rem;
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
      height: 3.5rem; padding: 0 1.5rem;
      background: transparent; border-bottom: none;
    }
    .sb-nav-minimal .sb-nav-brand { display: none; }
    .sb-nav-minimal .sb-nav-tabs { gap: 0.25rem; }
    .sb-nav-minimal .sb-nav-tab { font-size: 0.875rem; }

    /* ── Design system: list items ── */
    .sb-list-item {
      display: flex; align-items: center; gap: 0.875rem;
      padding: 0.875rem 1rem; border-radius: 0.625rem;
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
      width: 36px; height: 36px; min-width: 36px;
      border-radius: 9999px; font-size: 0.8125rem; font-weight: 600;
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
      padding: 1.5rem;
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
    .sb-image-card-body { padding: 1rem 1.25rem; }

    /* ── Real image support inside image cards ── */
    .sb-image-card-img img {
      position: absolute; inset: 0; width: 100%; height: 100%;
      object-fit: cover; z-index: 1;
    }
    .sb-image-card-img.has-img::after { display: none; }

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
      width: 36px; height: 36px; min-width: 36px;
      border-radius: 50%; font-size: 0.8125rem; font-weight: 700;
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
      color: white; border-radius: var(--sb-radius, 0.75rem); padding: 1.5rem;
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
      min-width: 260px; background: rgba(0,0,0,0.02); border-radius: var(--sb-radius, 0.75rem);
      padding: 1rem; display: flex; flex-direction: column; gap: 0.625rem;
    }
    .sb-kanban-col-header {
      font-size: 0.8125rem; font-weight: 600; padding: 0.375rem 0.5rem;
      color: var(--sb-text-secondary, #6b7280); text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    /* ── Bottom action bar ── */
    .sb-bottom-bar {
      position: sticky; bottom: 0; left: 0; right: 0; z-index: 40;
      padding: 0.875rem 1.5rem; display: flex; align-items: center; gap: 1rem;
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

    /* Form elements and buttons are styled by the generated code or sb-* design system classes */

    /* ── Scrollbar ── */
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.2); }

    ${mobile ? `
    /* ── Mobile preview: keep overrides minimal to avoid distorting generated layouts ── */
    html { -webkit-text-size-adjust: 100%; }
    ` : ''}
  </style>
</head>
<body>
  <div id="root">
    <div style="display:flex;align-items:center;justify-content:center;height:100vh">
      <div style="text-align:center;color:rgba(0,0,0,0.4)">
        <div style="width:28px;height:28px;border:2px solid rgba(0,0,0,0.08);border-top-color:var(--sb-primary,#6366f1);border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 0.75rem"></div>
        <div style="font-size:0.8125rem;font-family:system-ui,sans-serif">Loading app...</div>
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
    var _origLR = window.LucideReact || window.lucideReact || {};
    window.LucideReact = new Proxy(_origLR, {
      get: function(target, prop) {
        var val = target[prop];
        if (val !== undefined) return val;
        if (typeof prop === 'string' && prop.length > 0 && prop.charCodeAt(0) >= 65 && prop.charCodeAt(0) <= 90) {
          return _FallbackIcon;
        }
        return val;
      },
      has: function(target, prop) {
        if (prop in target) return true;
        if (typeof prop === 'string' && prop.length > 0 && prop.charCodeAt(0) >= 65 && prop.charCodeAt(0) <= 90) return true;
        return false;
      }
    });
    window.lucideReact = window.LucideReact;

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
    // Clear stale state from previous generations so new apps start fresh
    try { localStorage.clear(); } catch(e) {}

    // StartBox global reactive store — completely hook-free, safe to call ANYWHERE
    var __sbStore = {};
    window.__sbForceUpdate = null;
  </script>

  <script>
    // StartBox SDK — pre-loaded helpers for generated apps
    window.__sb = {
      useStore: function(key, defaultValue) {
        // Read from global store, init from localStorage on first access
        if (!(key in __sbStore)) {
          try { var s = localStorage.getItem(key); __sbStore[key] = s !== null ? JSON.parse(s) : defaultValue; }
          catch(e) { __sbStore[key] = defaultValue; }
        }
        var val = __sbStore[key];
        var setter = function(v) {
          var next = typeof v === 'function' ? v(__sbStore[key]) : v;
          __sbStore[key] = next;
          try { localStorage.setItem(key, JSON.stringify(next)); } catch(e) {}
          // Trigger React re-render via the ForceUpdate wrapper
          if (window.__sbForceUpdate) window.__sbForceUpdate();
        };
        var result = [val, setter];
        result.get = function() { return __sbStore[key]; };
        result.set = setter;
        result.value = val;
        return result;
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
      // Image helper — real images via picsum.photos (seed-based, deterministic)
      img: function(keyword, width, height) {
        var w = width || 400;
        var h = height || 300;
        var seed = String(keyword || 'placeholder').toLowerCase().replace(/[^a-z0-9]/g, '-');
        return 'https://picsum.photos/seed/' + seed + '/' + w + '/' + h;
      },
    };

    // Compatibility aliases: many generated apps call these helpers directly.
    window.useStore = window.__sb.useStore;
    window.toast = window.__sb.toast;
    window.fmt = window.__sb.fmt;
    window.color = window.__sb.color;
    window.copy = window.__sb.copy;
    window.cn = window.__sb.cn;
    window.sbAI = window.__sbAI;
    window.img = window.__sb.img;
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
    // Auto-wrap ReactDOM.createRoot render with ErrorBoundary + ForceUpdate for crash protection
    // and global store reactivity. Generated code doesn't need to know about any of this.
    // Guarded: skip if React/ReactDOM CDN failed to load.
    if (!window.__sbCdnFailed && typeof ReactDOM !== 'undefined' && ReactDOM.createRoot) {
    (function() {
      // ForceUpdate wrapper — re-renders the tree when __sbStore changes
      function SBStoreProvider(props) {
        var _a = React.useState(0), setTick = _a[1];
        React.useEffect(function() {
          window.__sbForceUpdate = function() { setTick(function(t) { return t + 1; }); };
          return function() { window.__sbForceUpdate = null; };
        }, []);
        return props.children;
      }

      var _origCreateRoot = ReactDOM.createRoot;
      ReactDOM.createRoot = function(container) {
        var root = _origCreateRoot.call(ReactDOM, container);
        var _origRender = root.render;
        root.render = function(element) {
          window.__sbRenderComplete = true;
          return _origRender.call(root,
            React.createElement(window.__SBErrorBoundary, null,
              React.createElement(SBStoreProvider, null, element)
            )
          );
        };
        return root;
      };
    })();
    }
  </script>

  <script type="text/babel" data-presets="react,env,typescript">
    if (typeof React === 'undefined' || typeof ReactDOM === 'undefined') {
      throw new Error('React/ReactDOM CDN unavailable');
    }
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

    function __sbTailwindUtilitiesReady() {
      try {
        var probe = document.createElement('div');
        probe.className = 'hidden bg-red-500';
        document.body.appendChild(probe);
        var cs = window.getComputedStyle(probe);
        var bg = cs && cs.backgroundColor ? cs.backgroundColor : '';
        var display = cs && cs.display ? cs.display : '';
        document.body.removeChild(probe);
        var hasBg = bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent';
        var hasHidden = display === 'none';
        return hasBg && hasHidden;
      } catch (e) {
        return false;
      }
    }

    // Tailwind runtime health check — warn only when utility classes are not active.
    setTimeout(function() {
      if (!__sbTailwindUtilitiesReady()) {
        console.warn('[StartBox Preview] Tailwind utility classes inactive; using utility fallback CSS only.');
        if (typeof window.__sbLoadTailwindCdn === 'function' && !window.__sbTailwindRetriedCdn) {
          window.__sbTailwindRetriedCdn = true;
          window.__sbLoadTailwindCdn();
        }
      } else {
        console.log('[StartBox Preview] Tailwind utilities active via:', window.__sbTailwindSource || 'unknown');
      }
    }, 2200);
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
      }}
      title="App Preview"
    />
  );
}
