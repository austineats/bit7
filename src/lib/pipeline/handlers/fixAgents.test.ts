import { describe, expect, it } from "vitest";
import { fixSyntaxIssues } from "./fixAgents.js";
import { scoreFactoryDimensions } from "../../qualityScorer.js";

describe("fixSyntaxIssues", () => {
  it("repairs malformed dynamic JSX tags like <item.size=...>", () => {
    const raw = `
      const { useState } = React;
      function App() {
        const [n, setN] = useState(0);
        const rows = [{ label: 'A' }];
        return <div>{rows.map((item, idx) => (
          <div key={idx}>
            <item.size={20} className="text-gray-400" />
            <button onClick={() => setN(n + 1)}>Inc</button>
          </div>
        ))}</div>;
      }
      ReactDOM.createRoot(document.getElementById("root")).render(<App />);
    `;

    const out = fixSyntaxIssues(raw);
    expect(out.code).toContain("<Sparkles size={20} className=\"text-gray-400\" />");
    expect(out.fixes.some((f) => f.includes("malformed dynamic JSX tags"))).toBe(true);
  });

  it("does not rewrite valid uppercase member component tags", () => {
    const raw = `
      const { Search } = window.LucideReact || {};
      const Icons = { Search };
      function App() {
        return <div><Icons.Search size={18} /></div>;
      }
      ReactDOM.createRoot(document.getElementById("root")).render(<App />);
    `;

    const out = fixSyntaxIssues(raw);
    expect(out.code).toContain("<Icons.Search size={18} />");
  });

  it("fixes inherited light-theme text-white collisions", () => {
    const raw = `
      function App() {
        return <div className="min-h-screen bg-gray-50">
          <h1 className="text-white text-3xl">Good morning</h1>
          <p className="text-white/90">Welcome back</p>
        </div>;
      }
      ReactDOM.createRoot(document.getElementById("root")).render(<App />);
    `;

    const out = fixSyntaxIssues(raw);
    expect(out.code).toContain('className="text-gray-900 text-3xl"');
    expect(out.code).toContain('className="text-gray-900"');
    expect(out.fixes.some((f) => f.includes("light-theme text contrast"))).toBe(true);
  });

  it("does not rewrite text-white on explicit dark surfaces", () => {
    const raw = `
      function App() {
        return <div className="min-h-screen bg-gray-50">
          <span className="bg-slate-900 text-white">Readable</span>
        </div>;
      }
      ReactDOM.createRoot(document.getElementById("root")).render(<App />);
    `;

    const out = fixSyntaxIssues(raw);
    expect(out.code).toContain('className="bg-slate-900 text-white"');
  });

  it("closes unclosed JSX tags to clear transpile fatals", () => {
    const raw = `
      function App() {
        return (
          <div className="p-6">
            <section className="rounded-xl border p-4">
              <h1 className="text-2xl font-bold">Hello</h1>
            </section>
        );
      }
      ReactDOM.createRoot(document.getElementById("root")).render(<App />);
    `;

    const before = scoreFactoryDimensions(raw);
    expect(before.issues.some((i) => i.includes("FATAL: JSX/TS transpile failure"))).toBe(true);

    const out = fixSyntaxIssues(raw);
    const after = scoreFactoryDimensions(out.code);
    expect(after.issues.some((i) => i.includes("FATAL: JSX/TS transpile failure"))).toBe(false);
    expect(out.fixes.some((f) => f.includes("unclosed JSX tag"))).toBe(true);
  });

  it("collapses concentric nutrition rings into a single-metric ring", () => {
    const raw = `
      function App() {
        const arcs = [
          { r: 96, pct: 0.62, color: '#22c55e' },
          { r: 82, pct: 0.48, color: '#3b82f6' },
          { r: 68, pct: 0.31, color: '#f59e0b' },
          { r: 54, pct: 0.22, color: '#ef4444' },
        ];
        return <div>
          <svg viewBox="0 0 240 240">
            <circle cx="120" cy="120" r="96" stroke="#e5e7eb" fill="none" />
            <circle cx="120" cy="120" r="82" stroke="#e5e7eb" fill="none" />
            <circle cx="120" cy="120" r="68" stroke="#e5e7eb" fill="none" />
            <circle cx="120" cy="120" r="54" stroke="#e5e7eb" fill="none" />
            {arcs.map((a, i) => (
              <circle
                key={i}
                cx="120"
                cy="120"
                r={a.r}
                stroke={a.color}
                fill="none"
                strokeDasharray={2 * Math.PI * a.r}
                strokeDashoffset={(2 * Math.PI * a.r) * (1 - a.pct)}
              />
            ))}
            <text x="50%" y="50%" textAnchor="middle">1401</text>
            <text x="50%" y="58%" textAnchor="middle">kcal left</text>
          </svg>
          <div>Protein 60g • Carbs 77g • Fat 27g</div>
        </div>;
      }
      ReactDOM.createRoot(document.getElementById("root")).render(<App />);
    `;

    const before = scoreFactoryDimensions(raw, "Build a nutrition dashboard for desktop");
    expect(before.issues.some((i) => i.includes("FATAL: concentric calorie+macro ring clutter"))).toBe(true);

    const out = fixSyntaxIssues(raw, "Build a nutrition dashboard for desktop");
    const after = scoreFactoryDimensions(out.code, "Build a nutrition dashboard for desktop");
    expect(after.issues.some((i) => i.includes("FATAL: concentric calorie+macro ring clutter"))).toBe(false);
    expect(after.issues.some((i) => i.includes("FATAL: over-segmented ring"))).toBe(false);
    expect(out.fixes.some((f) => f.includes("Collapsed over-segmented ring visuals"))).toBe(true);
    expect((out.code.match(/<circle\b/g) || []).length).toBeLessThanOrEqual(2);
  });
});
