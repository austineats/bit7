import { useState, useEffect, useRef } from "react";
import { ArrowRight, Mail, ChevronLeft, ChevronRight } from "lucide-react";

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

      // Base gradient that shifts over time
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

      // Draw flowing wave bands
      const waves = [
        { y: 0.2, amp: 60, freq: 1.5, speed: 0.4, color: "rgba(96,165,250,0.35)", width: 0.25 },
        { y: 0.35, amp: 80, freq: 1.2, speed: -0.3, color: "rgba(103,232,249,0.3)", width: 0.22 },
        { y: 0.5, amp: 70, freq: 1.8, speed: 0.5, color: "rgba(255,255,255,0.2)", width: 0.28 },
        { y: 0.65, amp: 90, freq: 1.0, speed: -0.35, color: "rgba(147,197,253,0.35)", width: 0.2 },
        { y: 0.8, amp: 50, freq: 2.0, speed: 0.6, color: "rgba(165,243,252,0.25)", width: 0.18 },
        { y: 0.15, amp: 45, freq: 2.2, speed: -0.5, color: "rgba(219,234,254,0.2)", width: 0.15 },
        { y: 0.45, amp: 100, freq: 0.8, speed: 0.25, color: "rgba(59,130,246,0.2)", width: 0.3 },
        { y: 0.7, amp: 55, freq: 1.6, speed: -0.45, color: "rgba(255,255,255,0.15)", width: 0.2 },
      ];

      for (const wave of waves) {
        ctx!.beginPath();
        const baseY = h * wave.y;
        const bandH = h * wave.width;

        // Top edge
        ctx!.moveTo(0, baseY + wave.amp * Math.sin(wave.speed * t));
        for (let x = 0; x <= w; x += 4) {
          const nx = x / w;
          const y = baseY +
            wave.amp * Math.sin(nx * Math.PI * wave.freq + t * wave.speed) +
            wave.amp * 0.5 * Math.sin(nx * Math.PI * wave.freq * 2.3 + t * wave.speed * 1.4) +
            wave.amp * 0.3 * Math.cos(nx * Math.PI * wave.freq * 0.7 + t * wave.speed * 0.8);
          ctx!.lineTo(x, y);
        }

        // Bottom edge (reverse)
        for (let x = w; x >= 0; x -= 4) {
          const nx = x / w;
          const y = baseY + bandH +
            wave.amp * 0.7 * Math.sin(nx * Math.PI * wave.freq * 1.1 + t * wave.speed * 0.9 + 1) +
            wave.amp * 0.4 * Math.cos(nx * Math.PI * wave.freq * 1.8 + t * wave.speed * 1.2);
          ctx!.lineTo(x, y);
        }

        ctx!.closePath();
        ctx!.fillStyle = wave.color;
        ctx!.fill();
      }

      // Soft light spots that drift
      const spots = [
        { x: 0.3, y: 0.25, r: 0.25, speed: 0.2, color: "rgba(255,255,255,0.12)" },
        { x: 0.7, y: 0.6, r: 0.3, speed: -0.15, color: "rgba(103,232,249,0.1)" },
        { x: 0.5, y: 0.8, r: 0.2, speed: 0.25, color: "rgba(255,255,255,0.08)" },
      ];

      for (const spot of spots) {
        const sx = w * (spot.x + 0.1 * Math.sin(t * spot.speed));
        const sy = h * (spot.y + 0.08 * Math.cos(t * spot.speed * 1.3));
        const sr = Math.min(w, h) * spot.r;
        const g = ctx!.createRadialGradient(sx, sy, 0, sx, sy, sr);
        g.addColorStop(0, spot.color);
        g.addColorStop(1, "transparent");
        ctx!.fillStyle = g;
        ctx!.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
      }

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

// Phone mockup
function PhoneMockup({ example }: { example: typeof SMS_EXAMPLES[0] }) {
  return (
    <div className="w-[260px] flex-shrink-0">
      <div className="bg-[#1a1a1f] rounded-[32px] p-2.5 shadow-2xl border border-white/10">
        <div className="flex justify-center mb-1">
          <div className="w-20 h-4 bg-black rounded-full" />
        </div>
        <div className="bg-[#0f0f14] rounded-[22px] overflow-hidden">
          {/* Header with bit7 avatar */}
          <div className="px-3.5 pt-2.5 pb-2 border-b border-white/5">
            <div className="flex items-center justify-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center flex-shrink-0">
                <span className="text-[9px] font-bold text-white tracking-tight">b7</span>
              </div>
              <div>
                <p className="text-[12px] font-medium text-white leading-tight">{example.title}</p>
                <p className="text-[9px] text-white/30 leading-tight">bit7 agent</p>
              </div>
            </div>
          </div>

          {/* Contact card — first thing the AI sends */}
          <div className="px-2.5 pt-2.5 pb-1">
            <div className="flex justify-start">
              <div className="bg-white/[0.07] rounded-[12px] rounded-bl-[4px] px-3 py-2.5 max-w-[88%] border border-white/[0.05]">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center flex-shrink-0">
                    <span className="text-[11px] font-bold text-white tracking-tight">b7</span>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-white leading-tight">bit7 — {example.title}</p>
                    <p className="text-[9px] text-white/40 mt-0.5">AI Agent · Tap to save contact</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Messages */}
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
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [slide, setSlide] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const next = () => setSlide((s) => (s + 1) % SMS_EXAMPLES.length);
  const prev = () => setSlide((s) => (s - 1 + SMS_EXAMPLES.length) % SMS_EXAMPLES.length);

  useEffect(() => {
    requestAnimationFrame(() => setLoaded(true));
  }, []);

  useEffect(() => {
    const id = setInterval(next, 5000);
    return () => clearInterval(id);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || submitting) return;
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 800));
    setSubmitted(true);
    setSubmitting(false);
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* ── Left: Clean white sign-up ── */}
      <div className="lg:w-[45%] min-h-screen bg-white flex flex-col">
        <div className="flex flex-col flex-1 px-8">
          {/* Logo */}
          <header
            className="pt-8 transition-all duration-700 ease-out"
            style={{
              opacity: loaded ? 1 : 0,
              transform: loaded ? "translateY(0)" : "translateY(-12px)",
            }}
          >
            <span className="text-[15px] font-semibold tracking-tight italic text-zinc-800">bit7</span>
          </header>

          {/* Center content */}
          <main className="flex-1 flex items-center justify-center">
            <div className="w-full max-w-[380px]">
              {/* Icon */}
              <div
                className="flex justify-center mb-8 transition-all duration-700 ease-out"
                style={{
                  opacity: loaded ? 1 : 0,
                  transform: loaded ? "translateY(0) scale(1)" : "translateY(20px) scale(0.9)",
                  transitionDelay: "0.1s",
                }}
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <svg viewBox="0 0 32 32" className="w-8 h-8" fill="none">
                    <rect x="4" y="6" width="24" height="20" rx="3" stroke="white" strokeWidth="1.5" />
                    <path d="M4 12h24" stroke="white" strokeWidth="1.5" />
                    <circle cx="8" cy="9" r="1" fill="white" />
                    <circle cx="11.5" cy="9" r="1" fill="white" />
                    <circle cx="15" cy="9" r="1" fill="white" />
                    <rect x="9" y="16" width="14" height="2" rx="1" fill="white" opacity="0.6" />
                    <rect x="11" y="21" width="10" height="2" rx="1" fill="white" opacity="0.3" />
                  </svg>
                </div>
              </div>

              {/* Heading */}
              <h1
                className="text-[28px] sm:text-[32px] font-semibold leading-[1.2] text-center tracking-[-0.02em] mb-8 transition-all duration-700 ease-out text-zinc-900"
                style={{
                  opacity: loaded ? 1 : 0,
                  transform: loaded ? "translateY(0)" : "translateY(24px)",
                  transitionDelay: "0.25s",
                }}
              >
                The App Redefined.
                <br />
                <span className="text-zinc-400">Build SMS Native Apps</span>
              </h1>

              {/* Waitlist form */}
              <div
                className="transition-all duration-700 ease-out"
                style={{
                  opacity: loaded ? 1 : 0,
                  transform: loaded ? "translateY(0)" : "translateY(30px)",
                  transitionDelay: "0.4s",
                }}
              >
                {submitted ? (
                  <div className="border border-blue-200 bg-blue-50 rounded-xl px-5 py-5 text-center animate-fade-up">
                    <p className="text-[15px] font-medium text-zinc-800 mb-1">You're on the list.</p>
                    <p className="text-[13px] text-zinc-500">We'll reach out when it's your turn.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <form onSubmit={handleSubmit} className="space-y-3">
                      <button
                        type="button"
                        className="w-full flex items-center justify-center gap-3 bg-white text-zinc-800 rounded-xl px-5 py-3.5 text-[14px] font-medium hover-lift hover:bg-zinc-50 transition-colors shadow-sm border border-zinc-200"
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Continue with Google
                      </button>

                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: "GitHub", icon: (
                            <svg className="w-5 h-5" fill="#24292f" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" /></svg>
                          )},
                          { label: "Apple", icon: (
                            <svg className="w-5 h-5" fill="#1d1d1f" viewBox="0 0 24 24"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" /></svg>
                          )},
                          { label: "Facebook", icon: (
                            <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                          )},
                        ].map((p) => (
                          <button
                            key={p.label}
                            type="button"
                            className="flex items-center justify-center py-3.5 rounded-xl bg-zinc-50 hover:bg-zinc-100 hover:scale-105 transition-all duration-200 border border-zinc-200"
                          >
                            {p.icon}
                          </button>
                        ))}
                      </div>

                      <div className="relative flex items-center border border-zinc-200 bg-zinc-50 rounded-xl overflow-hidden hover:border-blue-300 transition-colors duration-300">
                        <Mail className="w-4 h-4 text-zinc-400 ml-4 flex-shrink-0" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Continue with Email"
                          className="flex-1 px-3 py-3.5 text-[14px] text-zinc-800 placeholder-zinc-400 focus:outline-none bg-transparent"
                          disabled={submitting}
                        />
                        {email.trim() && (
                          <button
                            type="submit"
                            disabled={submitting}
                            className="mr-2 p-2 bg-blue-500 rounded-lg hover:bg-blue-400 hover:scale-110 transition-all duration-200 disabled:opacity-40"
                          >
                            {submitting ? (
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                              <ArrowRight className="w-4 h-4 text-white" />
                            )}
                          </button>
                        )}
                      </div>
                    </form>
                  </div>
                )}
              </div>

              {/* Terms */}
              <p
                className="text-[12px] text-zinc-400 text-center mt-6 leading-relaxed transition-all duration-700 ease-out"
                style={{
                  opacity: loaded ? 1 : 0,
                  transform: loaded ? "translateY(0)" : "translateY(16px)",
                  transitionDelay: "0.55s",
                }}
              >
                By continuing, you agree to our{" "}
                <span className="underline cursor-pointer hover:text-zinc-600 transition-colors">Terms of Service</span>
                {" "}and{" "}
                <span className="underline cursor-pointer hover:text-zinc-600 transition-colors">Privacy Policy</span>.
              </p>
            </div>
          </main>
        </div>
      </div>

      {/* ── Right: Flowing gradient waves + phone carousel ── */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden flex-col p-5">
        <div className="relative w-full h-full overflow-hidden rounded-[20px]">
          {/* Animated flowing wave canvas */}
          <FlowingWaves />

          {/* Content on top */}
          <div className="relative z-10 flex flex-col h-full">
            {/* Top text */}
            <div
              className="text-center pt-12 transition-all ease-out"
              style={{
                opacity: loaded ? 1 : 0,
                transform: loaded ? "translateY(0)" : "translateY(-30px)",
                transitionDelay: "0.3s",
                transitionDuration: "0.8s",
              }}
            >
              <div className="flex items-center justify-center gap-2 mb-3">
                <span className="text-[40px] animate-bounce-subtle">💬</span>
              </div>
              <h2 className="text-[42px] font-bold text-white tracking-[-0.02em] drop-shadow-lg">AI + SMS</h2>
              <p className="text-[16px] text-white/80 mt-2 leading-relaxed drop-shadow-md">
                Agents that respond to real texts,
                <br />
                on real phone numbers, instantly.
              </p>
            </div>

            {/* Phone carousel — contained so phones don't overflow */}
            <div
              className="flex-1 flex items-center justify-center px-6 py-4 min-h-0 transition-all ease-out"
              style={{
                opacity: loaded ? 1 : 0,
                transform: loaded ? "translateY(0) scale(1)" : "translateY(40px) scale(0.96)",
                transitionDelay: "0.5s",
                transitionDuration: "0.9s",
              }}
            >
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
            <div
              className="flex items-center justify-center gap-4 pb-6 transition-all duration-700 ease-out"
              style={{
                opacity: loaded ? 1 : 0,
                transform: loaded ? "translateY(0)" : "translateY(20px)",
                transitionDelay: "0.7s",
              }}
            >
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
