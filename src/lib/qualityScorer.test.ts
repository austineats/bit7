import { describe, expect, it } from "vitest";
import { scoreFactoryDimensions, scoreGeneratedCode } from "./qualityScorer.js";

describe("quality scorer domain specificity", () => {
  it("scores against normalized keyword set instead of raw prompt token denominator", () => {
    const veryLongPrompt = [
      "Build an app for portfolio analytics with many details.",
      "This sentence is intentionally verbose and repeated to simulate long prompts.",
    ]
      .join(" ")
      .repeat(40);

    const code = `
      const { useState } = React;
      function App() {
        const [v, setV] = useState(0);
        return <div>Portfolio analytics dashboard<button onClick={() => setV(v + 1)}>Run</button></div>;
      }
      ReactDOM.createRoot(document.getElementById("root")).render(<App />);
    `;

    const scored = scoreGeneratedCode({
      code,
      prompt: veryLongPrompt,
      outputFormat: "cards",
      domainKeywords: ["portfolio analytics"],
    });

    expect(scored.quality_breakdown.domain_specificity).toBe(100);
  });
});

describe("quality scorer factory fatal checks", () => {
  it("flags surfaced NaN/Infinity values as fatal", () => {
    const code = `
      const { useState } = React;
      function App() {
        const [value, setValue] = useState(0);
        return <div>
          <button onClick={() => setValue(value + 1)}>Inc</button>
          <p>NaN%</p>
        </div>;
      }
      ReactDOM.createRoot(document.getElementById("root")).render(<App />);
    `;

    const factory = scoreFactoryDimensions(code);
    expect(factory.issues.some((i) => i.includes("FATAL: surfaced NaN/Infinity"))).toBe(true);
  });

  it("flags overlapping centered SVG text labels as fatal", () => {
    const code = `
      const { useState } = React;
      function App() {
        const [value] = useState(42);
        return <svg viewBox="0 0 120 120">
          <text x="50%" y="50%" textAnchor="middle">{value}</text>
          <text x="50%" y="50%" textAnchor="middle">kcal</text>
        </svg>;
      }
      ReactDOM.createRoot(document.getElementById("root")).render(<App />);
    `;

    const factory = scoreFactoryDimensions(code);
    expect(factory.issues.some((i) => i.includes("FATAL: overlapping SVG center text"))).toBe(true);
  });

  it("flags transpile syntax errors as fatal", () => {
    const code = `
      const { useState } = React;
      function App() {
        const [value, setValue] = useState(0);
        return <div><button onClick={() => setValue(value + 1)}>Inc</button><span>{value}</div>;
      }
      ReactDOM.createRoot(document.getElementById("root")).render(<App />);
    `;

    const factory = scoreFactoryDimensions(code);
    expect(factory.issues.some((i) => i.includes("FATAL: JSX/TS transpile failure"))).toBe(true);
  });

  it("flags light-theme white text collisions as fatal", () => {
    const code = `
      const { useState } = React;
      function App() {
        const [v, setV] = useState(0);
        return <div className="min-h-screen bg-gray-50 text-white">
          <button onClick={() => setV(v + 1)}>Tap</button>
          <div className="bg-white text-white">Unreadable</div>
        </div>;
      }
      ReactDOM.createRoot(document.getElementById("root")).render(<App />);
    `;

    const factory = scoreFactoryDimensions(code);
    expect(factory.issues.some((i) => i.includes("FATAL: light-theme contrast violation"))).toBe(true);
  });

  it("does not flag valid white text on explicit dark/accent surfaces", () => {
    const code = `
      const { useState } = React;
      function App() {
        const [v, setV] = useState(0);
        return <div className="min-h-screen bg-gray-50 p-4">
          <button className="bg-green-600 text-white px-3 py-2" onClick={() => setV(v + 1)}>Add</button>
          <button className="bg-indigo-600 text-white px-3 py-2" onClick={() => setV(v + 2)}>Save</button>
          <span className="bg-slate-900 text-white px-2 py-1">Badge</span>
          <span className="bg-black text-white px-2 py-1">Chip</span>
        </div>;
      }
      ReactDOM.createRoot(document.getElementById("root")).render(<App />);
    `;

    const factory = scoreFactoryDimensions(code);
    expect(factory.issues.some((i) => i.includes("FATAL: light-theme contrast violation"))).toBe(false);
  });

  it("flags mobile-locked layouts when prompt does not request mobile-only", () => {
    const code = `
      const { useState } = React;
      function App() {
        const [tab, setTab] = useState('home');
        return <div className="min-h-screen max-w-sm mx-auto bg-white">
          <main className="p-4">Content</main>
          <nav className="fixed bottom-0 left-0 right-0 border-t bg-white">
            <button onClick={() => setTab('home')}>Home</button>
          </nav>
        </div>;
      }
      ReactDOM.createRoot(document.getElementById("root")).render(<App />);
    `;

    const factory = scoreFactoryDimensions(code, "Build a nutrition dashboard for desktop and mobile");
    expect(factory.issues.some((i) => i.includes("FATAL: mobile-locked layout detected"))).toBe(true);
  });

  it("flags over-segmented single-metric rings as fatal", () => {
    const code = `
      const { useState } = React;
      function App() {
        const [v] = useState(42);
        return <svg viewBox="0 0 220 220">
          <circle cx="110" cy="110" r="90" stroke="#e5e7eb" fill="none" />
          <circle cx="110" cy="110" r="90" stroke="#3b82f6" fill="none" />
          <circle cx="110" cy="110" r="75" stroke="#f59e0b" fill="none" />
          <circle cx="110" cy="110" r="60" stroke="#22c55e" fill="none" />
          <text x="50%" y="50%" textAnchor="middle">{v}</text>
          <text x="50%" y="60%" textAnchor="middle">calories remaining</text>
        </svg>;
      }
      ReactDOM.createRoot(document.getElementById("root")).render(<App />);
    `;

    const factory = scoreFactoryDimensions(code);
    expect(factory.issues.some((i) => i.includes("FATAL: over-segmented ring"))).toBe(true);
  });

  it("flags concentric calorie+macro ring clutter as fatal", () => {
    const code = `
      const { useState } = React;
      function App() {
        const [v] = useState(1401);
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
            <text x="50%" y="50%" textAnchor="middle">{v}</text>
            <text x="50%" y="58%" textAnchor="middle">kcal left</text>
          </svg>
          <div>Protein 60g • Carbs 77g • Fat 27g</div>
        </div>;
      }
      ReactDOM.createRoot(document.getElementById("root")).render(<App />);
    `;

    const factory = scoreFactoryDimensions(code);
    expect(factory.issues.some((i) => i.includes("FATAL: concentric calorie+macro ring clutter"))).toBe(true);
  });

  it("allows concentric rings when prompt explicitly requests them", () => {
    const code = `
      const { useState } = React;
      function App() {
        const [v] = useState(1401);
        return <svg viewBox="0 0 240 240">
          <circle cx="120" cy="120" r="96" stroke="#e5e7eb" fill="none" />
          <circle cx="120" cy="120" r="82" stroke="#e5e7eb" fill="none" />
          <circle cx="120" cy="120" r="68" stroke="#e5e7eb" fill="none" />
          <circle cx="120" cy="120" r="54" stroke="#e5e7eb" fill="none" />
          <circle cx="120" cy="120" r="96" stroke="#22c55e" fill="none" strokeDasharray="600" strokeDashoffset="180" />
          <circle cx="120" cy="120" r="82" stroke="#3b82f6" fill="none" strokeDasharray="515" strokeDashoffset="240" />
          <circle cx="120" cy="120" r="68" stroke="#f59e0b" fill="none" strokeDasharray="427" strokeDashoffset="290" />
          <circle cx="120" cy="120" r="54" stroke="#ef4444" fill="none" strokeDasharray="339" strokeDashoffset="300" />
          <text x="50%" y="50%" textAnchor="middle">{v}</text>
          <text x="50%" y="58%" textAnchor="middle">kcal left</text>
        </svg>;
      }
      ReactDOM.createRoot(document.getElementById("root")).render(<App />);
    `;

    const factory = scoreFactoryDimensions(code, "Build concentric activity rings like Apple Watch with calorie and macro ring breakdown");
    expect(factory.issues.some((i) => i.includes("FATAL: concentric calorie+macro ring clutter"))).toBe(false);
    expect(factory.issues.some((i) => i.includes("FATAL: over-segmented ring"))).toBe(false);
  });

  it("does not flag single-item mapped ring loops as concentric clutter", () => {
    const code = `
      const { useState } = React;
      function App() {
        const [v] = useState(1401);
        const arcs = [{ r: 96, pct: 0.62, color: '#22c55e' }];
        return <div>
          <svg viewBox="0 0 240 240">
            <circle cx="120" cy="120" r="96" stroke="#e5e7eb" fill="none" />
            {arcs.slice(0, 1).map((a, i) => (
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
            <text x="50%" y="50%" textAnchor="middle">{v}</text>
            <text x="50%" y="58%" textAnchor="middle">kcal left</text>
          </svg>
          <div>Protein 60g • Carbs 77g • Fat 27g</div>
        </div>;
      }
      ReactDOM.createRoot(document.getElementById("root")).render(<App />);
    `;

    const factory = scoreFactoryDimensions(code, "Build a nutrition dashboard for desktop");
    expect(factory.issues.some((i) => i.includes("FATAL: concentric calorie+macro ring clutter"))).toBe(false);
  });

  it("downgrades unresolved refs to warnings so heuristic false-positives do not hard fail", () => {
    const code = `
      const { useState } = React;
      const {Home} = window.LucideReact || {};
      function App() {
        const [v, setV] = useState(0);
        return <div><Home /><UnknownVisual /><button onClick={() => setV(v + 1)}>x</button></div>;
      }
      ReactDOM.createRoot(document.getElementById("root")).render(<App />);
    `;

    const factory = scoreFactoryDimensions(code);
    expect(factory.issues.some((i) => i.includes("WARN: unresolved icon/component refs"))).toBe(true);
    expect(factory.issues.some((i) => i.includes("FATAL: unresolved"))).toBe(false);
  });
});
