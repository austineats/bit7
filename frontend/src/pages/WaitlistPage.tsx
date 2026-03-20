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

// Matrix rain canvas
function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const chars = "01ABCDEFGHIJKLMNOPQRSTUVWXYZ{}[]<>/\\|=+*&^%$#@!";
    const fontSize = 13;
    let columns: number;
    let drops: number[];

    function resize() {
      canvas!.width = canvas!.offsetWidth;
      canvas!.height = canvas!.offsetHeight;
      columns = Math.floor(canvas!.width / fontSize);
      drops = Array(columns).fill(0).map(() => Math.random() * -50);
    }

    resize();
    window.addEventListener("resize", resize);

    function draw() {
      ctx!.fillStyle = "rgba(10, 10, 15, 0.06)";
      ctx!.fillRect(0, 0, canvas!.width, canvas!.height);
      ctx!.fillStyle = "rgba(255, 255, 255, 0.06)";
      ctx!.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        ctx!.fillText(char, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > canvas!.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i] += 0.4;
      }
      animId = requestAnimationFrame(draw);
    }

    draw();
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
    <div className="w-[280px] flex-shrink-0">
      {/* Phone frame */}
      <div className="bg-[#1a1a1f] rounded-[36px] p-3 shadow-2xl border border-white/10">
        {/* Notch */}
        <div className="flex justify-center mb-1">
          <div className="w-24 h-5 bg-black rounded-full" />
        </div>
        {/* Screen */}
        <div className="bg-[#0f0f14] rounded-[24px] overflow-hidden">
          {/* Header */}
          <div className="px-4 pt-3 pb-2 border-b border-white/5">
            <p className="text-[11px] text-white/30 text-center">bit7</p>
            <p className="text-[13px] font-medium text-white text-center mt-0.5">{example.title}</p>
          </div>
          {/* Messages */}
          <div className="px-3 py-3 space-y-2.5 min-h-[320px]">
            {example.messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.dir === "out" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] px-3 py-2 text-[12px] leading-[1.45] ${
                    msg.dir === "out"
                      ? "bg-blue-500 text-white rounded-[16px] rounded-br-[4px]"
                      : "bg-white/10 text-white/80 rounded-[16px] rounded-bl-[4px]"
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

  const next = () => setSlide((s) => (s + 1) % SMS_EXAMPLES.length);
  const prev = () => setSlide((s) => (s - 1 + SMS_EXAMPLES.length) % SMS_EXAMPLES.length);

  // Auto-advance
  useEffect(() => {
    const id = setInterval(next, 5000);
    return () => clearInterval(id);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || submitting) return;
    setSubmitting(true);
    // TODO: wire to backend waitlist endpoint
    await new Promise((r) => setTimeout(r, 800));
    setSubmitted(true);
    setSubmitting(false);
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* ── Left: Dark side ── */}
      <div className="relative lg:w-[45%] min-h-screen bg-[#0a0a0f] text-white flex flex-col overflow-hidden">
        <MatrixRain />

        <div className="relative z-10 flex flex-col flex-1">
          {/* Logo */}
          <header className="px-8 pt-8">
            <span className="text-[15px] font-medium tracking-tight italic">bit7</span>
          </header>

          {/* Center content */}
          <main className="flex-1 flex items-center justify-center px-8">
            <div className="w-full max-w-[380px]">
              {/* Icon */}
              <div className="flex justify-center mb-8">
                <div className="w-16 h-16 rounded-full border border-white/10 bg-white/[0.03] flex items-center justify-center">
                  <svg viewBox="0 0 32 32" className="w-8 h-8" fill="none">
                    <rect x="4" y="6" width="24" height="20" rx="3" stroke="white" strokeWidth="1.5" />
                    <path d="M4 12h24" stroke="white" strokeWidth="1.5" />
                    <circle cx="8" cy="9" r="1" fill="white" />
                    <circle cx="11.5" cy="9" r="1" fill="white" />
                    <circle cx="15" cy="9" r="1" fill="white" />
                    <rect x="9" y="16" width="14" height="2" rx="1" fill="white" opacity="0.4" />
                    <rect x="11" y="21" width="10" height="2" rx="1" fill="white" opacity="0.2" />
                  </svg>
                </div>
              </div>

              <h1 className="text-[28px] sm:text-[32px] font-medium leading-[1.2] text-center tracking-[-0.02em] mb-8">
                Build AI SMS Agents
                <br />
                <span className="text-white/40">in minutes</span>
              </h1>

              {/* Waitlist form */}
              {submitted ? (
                <div className="border border-white/10 bg-white/[0.03] rounded-xl px-5 py-5 text-center">
                  <p className="text-[15px] font-medium mb-1">You're on the list.</p>
                  <p className="text-[13px] text-white/40">We'll reach out when it's your turn.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <form onSubmit={handleSubmit} className="space-y-3">
                    <button
                      type="button"
                      className="w-full flex items-center justify-center gap-3 bg-white text-black rounded-xl px-5 py-3.5 text-[14px] font-medium hover:bg-white/90 transition-colors"
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
                          <svg className="w-5 h-5" fill="white" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" /></svg>
                        )},
                        { label: "Apple", icon: (
                          <svg className="w-5 h-5" fill="white" viewBox="0 0 24 24"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" /></svg>
                        )},
                        { label: "Facebook", icon: (
                          <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                        )},
                      ].map((p) => (
                        <button
                          key={p.label}
                          type="button"
                          className="flex items-center justify-center py-3.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] transition-colors border border-white/[0.06]"
                        >
                          {p.icon}
                        </button>
                      ))}
                    </div>

                    <div className="relative flex items-center border border-white/[0.06] bg-white/[0.04] rounded-xl overflow-hidden">
                      <Mail className="w-4 h-4 text-white/25 ml-4 flex-shrink-0" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Continue with Email"
                        className="flex-1 px-3 py-3.5 text-[14px] text-white placeholder-white/40 focus:outline-none bg-transparent"
                        disabled={submitting}
                      />
                      {email.trim() && (
                        <button
                          type="submit"
                          disabled={submitting}
                          className="mr-2 p-2 bg-blue-500 rounded-lg hover:bg-blue-400 transition-colors disabled:opacity-40"
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

              <p className="text-[12px] text-white/20 text-center mt-6 leading-relaxed">
                By continuing, you agree to our{" "}
                <span className="underline cursor-pointer hover:text-white/40">Terms of Service</span>
                {" "}and{" "}
                <span className="underline cursor-pointer hover:text-white/40">Privacy Policy</span>.
              </p>
            </div>
          </main>
        </div>
      </div>

      {/* ── Right: Gradient showcase ── */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden flex-col"
        style={{
          background: "linear-gradient(135deg, #1e3a5f 0%, #3b82f6 30%, #93c5fd 55%, #dbeafe 75%, #f0f4ff 100%)",
        }}
      >
        {/* Top stats */}
        <div className="relative z-10 pt-10 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-[40px]">💬</span>
          </div>
          <h2 className="text-[42px] font-bold text-white tracking-[-0.02em]">AI + SMS</h2>
          <p className="text-[16px] text-white/70 mt-2 leading-relaxed">
            Agents that respond to real texts,
            <br />
            on real phone numbers, instantly.
          </p>
        </div>

        {/* Phone carousel */}
        <div className="flex-1 flex items-center justify-center px-8">
          <div className="relative flex items-end gap-6">
            {/* Show current and next */}
            {[0, 1].map((offset) => {
              const idx = (slide + offset) % SMS_EXAMPLES.length;
              return (
                <div
                  key={idx}
                  className="transition-all duration-500"
                  style={{
                    transform: offset === 0 ? "translateY(0)" : "translateY(20px)",
                    opacity: offset === 0 ? 1 : 0.7,
                    scale: offset === 0 ? "1" : "0.92",
                  }}
                >
                  <PhoneMockup example={SMS_EXAMPLES[idx]} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Carousel controls */}
        <div className="relative z-10 flex items-center justify-center gap-4 pb-8">
          <button onClick={prev} className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors">
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
                    : "w-2 h-2 bg-white/30 hover:bg-white/50"
                }`}
              />
            ))}
          </div>
          <button onClick={next} className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors">
            <ChevronRight className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
