import { useState, useEffect, useRef, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const SMS_EXAMPLES = [
  {
    title: "Fitness Coach",
    messages: [
      { dir: "out", text: "Just finished a 5K run, 28 minutes" },
      { dir: "in", text: "Nice work! That's a 9:01/mi pace — your best this month. You've now logged 4 runs in March. Want me to adjust your training plan for a sub-27 goal?" },
      { dir: "out", text: "Yes please" },
      { dir: "in", text: "Done. Tomorrow: rest day. Wednesday: 3mi tempo at 8:30 pace. I'll text you a reminder at 7am." },
    ],
  },
  {
    title: "Meeting Assistant",
    messages: [
      { dir: "out", text: "What's on my calendar tomorrow?" },
      { dir: "in", text: "You have 3 meetings:\n\n9:00 — Standup (15 min)\n11:00 — Design Review with Sarah\n2:30 — Investor call\n\nYou have a 2.5hr focus block from 11:45–2:30." },
      { dir: "out", text: "Move standup to 9:30" },
      { dir: "in", text: "Done. Standup moved to 9:30. I notified the 4 other attendees." },
    ],
  },
  {
    title: "Restaurant Concierge",
    messages: [
      { dir: "out", text: "Find me a good sushi spot near downtown for tonight, 2 people" },
      { dir: "in", text: "Here are 3 options with availability tonight:\n\n1. Omakase Bar — 8:30pm, $$$$\n2. Sushi Roku — 7:00pm, $$$\n3. Kura Revolving — walk-in, $$\n\nWant me to book one?" },
      { dir: "out", text: "Book #2" },
      { dir: "in", text: "Reserved at Sushi Roku for 2 at 7:00pm tonight. Confirmation #SR-4821. I'll text you a reminder at 6:15." },
    ],
  },
  {
    title: "Study Buddy",
    messages: [
      { dir: "out", text: "Quiz me on chapter 7, organic chemistry" },
      { dir: "in", text: "Q1: What type of reaction converts an alkene to an alcohol using water and an acid catalyst?\n\nA) Elimination\nB) Hydration\nC) Substitution\nD) Oxidation" },
      { dir: "out", text: "B" },
      { dir: "in", text: "Correct! Acid-catalyzed hydration follows Markovnikov's rule. The OH adds to the more substituted carbon.\n\nQ2: What reagent converts a primary alcohol to an aldehyde without over-oxidation?" },
    ],
  },
];

// ── Matrix / code rain background characters ──
function MatrixBG() {
  const chars = useMemo(() => {
    const pool = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+*@&#$!?<>{}[]=/\\|~^%";
    const items: { char: string; x: number; y: number; opacity: number; size: number }[] = [];
    for (let i = 0; i < 120; i++) {
      items.push({
        char: pool[Math.floor(Math.random() * pool.length)],
        x: Math.random() * 100,
        y: Math.random() * 100,
        opacity: 0.03 + Math.random() * 0.08,
        size: 11 + Math.random() * 6,
      });
    }
    return items;
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden>
      {chars.map((c, i) => (
        <span
          key={i}
          className="absolute font-mono text-zinc-900"
          style={{
            left: `${c.x}%`,
            top: `${c.y}%`,
            opacity: c.opacity,
            fontSize: `${c.size}px`,
          }}
        >
          {c.char}
        </span>
      ))}
    </div>
  );
}

// ── Canvas flowing gradient with animated wave shapes ──
function FlowingWaves() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    function resize() {
      canvas!.width = canvas!.offsetWidth * 2;
      canvas!.height = canvas!.offsetHeight * 2;
    }
    resize();
    window.addEventListener("resize", resize);

    function draw(time: number) {
      const w = canvas!.width;
      const h = canvas!.height;
      const t = time * 0.001;

      const angle = t * 0.15;
      const gx0 = w * (0.3 + 0.3 * Math.sin(angle));
      const gy0 = h * (0.2 + 0.2 * Math.cos(angle * 0.7));
      const gx1 = w * (0.7 + 0.3 * Math.cos(angle * 0.5));
      const gy1 = h * (0.8 + 0.2 * Math.sin(angle * 0.9));

      const bg = ctx!.createLinearGradient(gx0, gy0, gx1, gy1);
      bg.addColorStop(0, "#1e40af");
      bg.addColorStop(0.25, "#3b82f6");
      bg.addColorStop(0.45, "#60a5fa");
      bg.addColorStop(0.6, "#67e8f9");
      bg.addColorStop(0.75, "#a5f3fc");
      bg.addColorStop(0.9, "#93c5fd");
      bg.addColorStop(1, "#dbeafe");
      ctx!.fillStyle = bg;
      ctx!.fillRect(0, 0, w, h);

      animId = requestAnimationFrame(draw);
    }

    animId = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}

// ── Dots logo icon (reusable) ──
function DotsIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 52 52">
      {Array.from({ length: 10 }).map((_, i) => {
        const angle = (i * 36 - 90) * (Math.PI / 180);
        const cx = 26 + 19 * Math.cos(angle);
        const cy = 26 + 19 * Math.sin(angle);
        return <circle key={i} cx={cx} cy={cy} r={3.2} fill="white" />;
      })}
    </svg>
  );
}

// ── Phone mockup ──
function PhoneMockup({ example }: { example: (typeof SMS_EXAMPLES)[0] }) {
  return (
    <div className="w-[260px] flex-shrink-0">
      <div className="bg-[#1a1a1f] rounded-[32px] p-2.5 shadow-2xl border border-white/10">
        <div className="flex justify-center mb-1">
          <div className="w-20 h-4 bg-black rounded-full" />
        </div>
        <div className="bg-[#0f0f14] rounded-[22px] overflow-hidden">
          <div className="px-3.5 pt-2.5 pb-2 border-b border-white/5">
            <div className="flex items-center justify-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#4080f0] to-[#8ab4fc] flex items-center justify-center flex-shrink-0">
                <DotsIcon size={14} />
              </div>
              <div>
                <p className="text-[12px] font-medium text-white leading-tight">{example.title}</p>
                <p className="text-[9px] text-white/30 leading-tight">bit7 agent</p>
              </div>
            </div>
          </div>

          <div className="px-2.5 pt-2.5 pb-1">
            <div className="flex justify-start">
              <div className="bg-white/[0.07] rounded-[12px] rounded-bl-[4px] px-3 py-2.5 max-w-[88%] border border-white/[0.05]">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4080f0] to-[#8ab4fc] flex items-center justify-center flex-shrink-0">
                    <DotsIcon size={20} />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-white leading-tight">
                      bit7 — {example.title}
                    </p>
                    <p className="text-[9px] text-white/40 mt-0.5">AI Agent · Tap to save contact</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="px-2.5 pb-2.5 pt-1 space-y-2 min-h-[220px]">
            {example.messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.dir === "out" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] px-2.5 py-1.5 text-[11px] leading-[1.4] ${
                    msg.dir === "out"
                      ? "bg-blue-500 text-white rounded-[14px] rounded-br-[4px]"
                      : "bg-white/10 text-white/80 rounded-[14px] rounded-bl-[4px]"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function WaitlistPage() {
  const [slide, setSlide] = useState(0);

  const next = () => setSlide((s) => (s + 1) % SMS_EXAMPLES.length);
  const prev = () => setSlide((s) => (s - 1 + SMS_EXAMPLES.length) % SMS_EXAMPLES.length);

  useEffect(() => {
    const id = setInterval(next, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      {/* ── Left: Light sign-up panel with matrix characters ── */}
      <div className="lg:w-[45%] min-h-screen bg-white flex flex-col relative">
        <MatrixBG />

        <div className="relative z-10 flex flex-col flex-1 px-8">
          {/* Logo */}
          <header className="pt-8">
            <span className="text-[16px] font-semibold tracking-tight text-zinc-900">bit7</span>
          </header>

          {/* Center content */}
          <main className="flex-1 flex items-center justify-center">
            <div className="w-full max-w-[380px]">
              {/* Dots logo */}
              <div className="flex justify-center mb-8">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#4080f0] via-[#6199f7] to-[#8ab4fc] flex items-center justify-center shadow-lg shadow-blue-500/25">
                  <svg width="56" height="56" viewBox="0 0 52 52">
                    <defs>
                      <filter id="dot-shadow" x="-50%" y="-20%" width="200%" height="200%">
                        <feDropShadow dx="0" dy="1.5" stdDeviation="1" floodColor="#3060c0" floodOpacity="0.4" />
                      </filter>
                      <radialGradient id="dot-fill" cx="40%" cy="35%">
                        <stop offset="0%" stopColor="white" />
                        <stop offset="100%" stopColor="#e8eeff" />
                      </radialGradient>
                    </defs>
                    {Array.from({ length: 10 }).map((_, i) => {
                      const angle = (i * 36 - 90) * (Math.PI / 180);
                      const cx = 26 + 19 * Math.cos(angle);
                      const cy = 26 + 19 * Math.sin(angle);
                      const r = 3.2 + (i % 3 === 0 ? 0.4 : i % 2 === 0 ? -0.2 : 0);
                      return <circle key={i} cx={cx} cy={cy} r={r} fill="url(#dot-fill)" filter="url(#dot-shadow)" />;
                    })}
                  </svg>
                </div>
              </div>

              {/* Heading */}
              <h1 className="text-[28px] sm:text-[32px] font-semibold leading-[1.2] text-center tracking-[-0.02em] mb-8 text-zinc-900">
                World's First
                <br />
                iMessage Agent
                <br />
                <span className="bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-500 bg-clip-text" style={{ WebkitTextFillColor: "transparent" }}>
                  e2e encrypted.
                </span>
              </h1>

              {/* Try it button */}
              <div className="flex justify-center">
                <div
                  className="relative rounded-full p-[2px]"
                  style={{
                    background: "linear-gradient(135deg, rgba(180,200,255,0.5) 0%, rgba(200,220,255,0.15) 40%, rgba(180,200,255,0.4) 100%)",
                  }}
                >
                  <a
                    href="sms:bitseven@icloud.com"
                    className="relative flex items-center justify-center gap-2.5 px-10 py-4 rounded-full text-[15px] font-medium text-zinc-700 cursor-pointer transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] overflow-hidden"
                    style={{
                      background: "linear-gradient(160deg, rgba(240,245,255,0.85) 0%, rgba(220,230,250,0.5) 50%, rgba(235,240,255,0.7) 100%)",
                      backdropFilter: "blur(24px)",
                      WebkitBackdropFilter: "blur(24px)",
                      boxShadow: `
                        0 8px 32px rgba(100,130,200,0.12),
                        0 2px 8px rgba(100,130,200,0.08),
                        inset 0 1.5px 0 rgba(255,255,255,0.9),
                        inset 0 -1px 0 rgba(100,130,200,0.1)
                      `,
                    }}
                  >
                    {/* Top highlight streak */}
                    <div
                      className="absolute top-0 left-[15%] right-[15%] h-[1px] pointer-events-none"
                      style={{
                        background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.95), transparent)",
                      }}
                    />
                    {/* Glass reflection */}
                    <div
                      className="absolute top-0 left-0 right-0 h-[55%] rounded-t-full pointer-events-none"
                      style={{
                        background: "linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 100%)",
                      }}
                    />
                    <div className="relative z-10 flex items-center gap-[3px] bg-zinc-200 rounded-full px-2.5 py-1.5">
                      <span className="w-[6px] h-[6px] rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: "0ms", animationDuration: "1s" }} />
                      <span className="w-[6px] h-[6px] rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: "150ms", animationDuration: "1s" }} />
                      <span className="w-[6px] h-[6px] rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: "300ms", animationDuration: "1s" }} />
                    </div>
                    <span className="relative z-10">Try it Now</span>
                  </a>
                </div>
              </div>

            </div>
          </main>
        </div>
      </div>

      {/* ── Right: Flowing gradient waves + phone carousel ── */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden flex-col p-5">
        <div className="relative w-full h-full overflow-hidden rounded-[20px]">
          <FlowingWaves />

          <div className="relative z-10 flex flex-col h-full">
            {/* Top text */}
            <div className="text-center pt-12">
              <h2 className="text-[42px] font-bold text-white tracking-[-0.02em] drop-shadow-lg">
                AI + SMS 💬
              </h2>
              <p className="text-[16px] text-white/80 mt-2 leading-relaxed drop-shadow-md">
                Agents that respond to real texts,
                <br />
                on real phone numbers, instantly.
              </p>
            </div>

            {/* Phone carousel */}
            <div className="flex-1 flex items-center justify-center px-6 py-4 min-h-0">
              <div className="relative flex items-center gap-5">
                {[0, 1].map((offset) => {
                  const idx = (slide + offset) % SMS_EXAMPLES.length;
                  return (
                    <div
                      key={`phone-${offset}`}
                      className={`carousel-transition ${offset === 0 ? "animate-float" : "animate-float-delayed"}`}
                      style={{
                        opacity: offset === 0 ? 1 : 0.7,
                        scale: offset === 0 ? "1" : "0.9",
                      }}
                    >
                      <div className="hover-lift cursor-default">
                        <PhoneMockup example={SMS_EXAMPLES[idx]} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Carousel controls */}
            <div className="flex items-center justify-center gap-4 pb-6">
              <button
                onClick={prev}
                className="p-2 rounded-full bg-white/20 hover:bg-white/30 hover:scale-110 transition-all duration-200 backdrop-blur-sm"
              >
                <ChevronLeft className="w-4 h-4 text-white" />
              </button>
              <div className="flex items-center gap-2">
                {SMS_EXAMPLES.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setSlide(i)}
                    className={`transition-all duration-300 rounded-full ${
                      i === slide
                        ? "w-6 h-2 bg-white"
                        : "w-2 h-2 bg-white/30 hover:bg-white/50 hover:scale-125"
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={next}
                className="p-2 rounded-full bg-white/20 hover:bg-white/30 hover:scale-110 transition-all duration-200 backdrop-blur-sm"
              >
                <ChevronRight className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
