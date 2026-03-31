import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";

const px = { fontFamily: "'Press Start 2P', monospace" };

/* ─── Scroll reveal hook ─── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.05 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, style: { opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(30px)", transition: "opacity 0.7s ease-out, transform 0.7s ease-out" } as React.CSSProperties };
}

/* ─── Animated counter ─── */
function AnimCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        let frame = 0;
        const totalFrames = 40;
        const step = () => {
          frame++;
          setCount(Math.min(Math.round((frame / totalFrames) * target), target));
          if (frame < totalFrames) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
        obs.disconnect();
      }
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [target]);
  return <span ref={ref}>{count}{suffix}</span>;
}


/* ─── Custom pixel select dropdown ─── */
function PixelSelect({ value, onChange, placeholder, options, className = "" }: {
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-3 sm:px-4 border-4 border-[#29adff] bg-[#1d2b53] text-left text-[11px] focus:outline-none focus:border-[#ffec27] h-[48px] flex items-center justify-between"
        style={px}
      >
        <span className={value ? "text-white" : "text-[#29adff]/40"}>
          {value ? options.find(o => o.value === value)?.label || value : placeholder}
        </span>
        <span className="text-[#29adff] text-[8px]">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="absolute z-50 w-full mt-1 border-4 border-[#29adff] bg-[#1d2b53] max-h-[200px] overflow-y-auto" style={{ boxShadow: "4px 4px 0 #1a6b99" }}>
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full px-3 py-2.5 text-left text-[9px] sm:text-[11px] min-h-[40px] ${
                value === opt.value ? "bg-[#29adff] text-[#1d2b53]" : "text-white hover:bg-[#29adff]/20"
              }`}
              style={px}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Pixel border box with optional border beam ─── */
function PixelBox({ children, className = "", color = "#fff", beam = false }: { children: React.ReactNode; className?: string; color?: string; beam?: boolean }) {
  return (
    <div
      className={`relative ${className}`}
      style={{
        border: `4px solid ${color}`,
        boxShadow: `4px 4px 0 ${color}, -4px -4px 0 ${color}, 4px -4px 0 ${color}, -4px 4px 0 ${color}`,
        imageRendering: "pixelated",
      }}
    >
      {beam && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
          <div
            className="absolute w-8 h-8 rounded-full animate-border-beam"
            style={{ background: `radial-gradient(circle, ${color}, transparent)`, filter: "blur(4px)" }}
          />
        </div>
      )}
      {children}
    </div>
  );
}

/* ─── Blinking pixel cursor ─── */
function BlinkCursor() {
  return (
    <span
      className="inline-block w-[12px] h-[22px] bg-white ml-1 align-middle"
      style={{ animation: "blink-pixel 1s step-end infinite" }}
    />
  );
}

/* ─── Glitch logo ─── */
function GlitchLogo({ size = "text-[36px] sm:text-[80px] lg:text-[112px]" }: { size?: string }) {
  return (
    <div className="relative inline-block">
      <h1 className={`${size} leading-none tracking-tight text-[#ff004d] relative z-10`}>
        bubl.
      </h1>
      {/* Glitch layers */}
      <h1
        className={`${size} leading-none tracking-tight text-[#29adff] absolute top-0 left-0 animate-glitch-1 pointer-events-none`}
        aria-hidden
      >
        bubl.
      </h1>
      <h1
        className={`${size} leading-none tracking-tight text-[#ffec27] absolute top-0 left-0 animate-glitch-2 pointer-events-none`}
        aria-hidden
      >
        bubl.
      </h1>
    </div>
  );
}

/* ─── Pixel heart ─── */
function PixelHeart({ size = 32 }: { size?: number }) {
  const s = size / 16;
  const r = (x: number, y: number, w: number, h: number, fill: string) => (
    <rect x={x * s} y={y * s} width={w * s} height={h * s} fill={fill} />
  );
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ imageRendering: "pixelated" }}>
      {r(2,0,3,1,"#000")}{r(8,0,3,1,"#000")}
      {r(1,1,1,1,"#000")}{r(5,1,3,1,"#000")}{r(11,1,1,1,"#000")}
      {r(0,2,1,2,"#000")}{r(12,2,1,2,"#000")}
      {r(0,4,1,1,"#000")}{r(12,4,1,1,"#000")}
      {r(0,5,1,1,"#000")}{r(12,5,1,1,"#000")}
      {r(1,6,1,1,"#000")}{r(11,6,1,1,"#000")}
      {r(2,7,1,1,"#000")}{r(10,7,1,1,"#000")}
      {r(3,8,1,1,"#000")}{r(9,8,1,1,"#000")}
      {r(4,9,1,1,"#000")}{r(8,9,1,1,"#000")}
      {r(5,10,1,1,"#000")}{r(7,10,1,1,"#000")}
      {r(6,11,1,1,"#000")}
      {r(5,5,7,1,"#9b0000")}{r(4,6,7,1,"#9b0000")}{r(5,7,5,1,"#9b0000")}
      {r(6,8,3,1,"#9b0000")}{r(7,9,1,1,"#9b0000")}
      {r(11,2,1,2,"#9b0000")}{r(11,4,1,1,"#9b0000")}{r(11,5,1,1,"#9b0000")}
      {r(10,6,1,1,"#9b0000")}
      {r(2,1,3,1,"#e00")}{r(8,1,3,1,"#e00")}
      {r(1,2,3,1,"#e00")}{r(7,2,4,1,"#e00")}
      {r(1,3,3,1,"#e00")}{r(6,3,5,1,"#e00")}
      {r(1,4,4,1,"#e00")}{r(6,4,6,1,"#e00")}
      {r(1,5,4,1,"#e00")}{r(6,5,5,1,"#e00")}
      {r(2,6,2,1,"#e00")}{r(5,6,5,1,"#e00")}
      {r(3,7,2,1,"#e00")}{r(6,7,4,1,"#e00")}
      {r(4,8,2,1,"#e00")}{r(7,8,2,1,"#e00")}
      {r(5,9,2,1,"#e00")}
      {r(6,10,1,1,"#e00")}
      {r(4,2,3,1,"#ff2222")}{r(4,3,2,1,"#ff2222")}{r(5,4,1,1,"#ff2222")}
      {r(3,2,1,1,"#fff")}{r(4,1,1,1,"#fff")}
      {r(3,3,1,1,"#fff")}
    </svg>
  );
}

/* ─── Pixel star decorations ─── */
function PixelStars() {
  const stars = [
    { x: "8%", y: "12%", delay: "0s" },
    { x: "92%", y: "8%", delay: "0.5s" },
    { x: "85%", y: "35%", delay: "1s" },
    { x: "5%", y: "55%", delay: "1.5s" },
    { x: "90%", y: "65%", delay: "0.3s" },
    { x: "15%", y: "80%", delay: "0.8s" },
    { x: "75%", y: "90%", delay: "1.2s" },
  ];
  return (
    <>
      {stars.map((s, i) => (
        <div
          key={i}
          className="fixed w-2 h-2 bg-yellow-300 z-0 pointer-events-none"
          style={{
            left: s.x,
            top: s.y,
            animation: `twinkle-pixel 2s step-end infinite`,
            animationDelay: s.delay,
            imageRendering: "pixelated",
          }}
        />
      ))}
    </>
  );
}

/* ─── Phone Mockup ─── */
function PhoneMockup() {
  return (
    <div className="w-[280px] sm:w-[340px] shrink-0">
      <img src="/IMG_4250.jpeg" className="w-full rounded-[16px]" alt="bubl iMessage preview" />
    </div>
  );
}

/* ─── Interactive FAQ accordion ─── */
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b-4 border-[#29adff]/20">
      <button
        onClick={() => setOpen(!open)}
        className="w-full py-4 sm:py-5 flex items-center justify-between text-left gap-4 group"
        style={px}
      >
        <span className="text-[#fff1e8] text-[9px] sm:text-[12px] leading-[2]">&gt; {q}</span>
        <span
          className="text-[#ffec27] text-[14px] shrink-0 transition-none"
          style={{ transform: open ? "rotate(90deg)" : "none" }}
        >
          {open ? "-" : "+"}
        </span>
      </button>
      {open && (
        <div className="pb-4 sm:pb-5 -mt-1">
          <p className="text-[#c2c3c7] text-[8px] sm:text-[11px] leading-[2.2] pl-4">{a}</p>
        </div>
      )}
    </div>
  );
}

/* ─── High score / stats bar ─── */
function ArcadeStats() {
  const reveal = useReveal();
  return (
    <div ref={reveal.ref} style={reveal.style}>
      <div className="max-w-4xl mx-auto grid grid-cols-3 gap-4 sm:gap-8 py-10 sm:py-16 px-4">
        {[
          { label: "MATCHES", value: 100, suffix: "+", color: "#ff004d" },
          { label: "SWIPES", value: 0, suffix: "", color: "#ffec27" },
          { label: "DOWNLOADS", value: 0, suffix: "", color: "#00e436" },
        ].map((stat, i) => (
          <div key={i} className="text-center">
            <div
              className="text-[24px] sm:text-[40px] leading-none neon-text"
              style={{ color: stat.color, textShadow: `0 0 10px ${stat.color}, 0 0 30px ${stat.color}44` }}
            >
              <AnimCounter target={stat.value} suffix={stat.suffix} />
            </div>
            <p className="text-[7px] sm:text-[9px] text-[#5f574f] mt-2 uppercase">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══ Page ═══ */
type FormState = "idle" | "submitting" | "success";

export function BlindDatePage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<"guy" | "girl" | "">("");
  const [school, setSchool] = useState("");
  const [formState, setFormState] = useState<FormState>("idle");
  const [error, setError] = useState("");
  const signupRef = useRef<HTMLDivElement>(null);

  // Section refs (simple fade-up on scroll)
  const howItWorks = useReveal();

  const quote = useReveal();
  const imessage = useReveal();
  const photos = useReveal();
  const signup = useReveal();
  const faq = useReveal();

  const fmt = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 10);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  };
  const submit = async () => {
    setError("");
    if (!name.trim() || !phone.trim() || !age.trim() || !gender || !school) { setError("all fields required!"); return; }
    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum < 14 || ageNum > 18) { setError("bubl. is currently only reserved for highschoolers."); return; }
    setFormState("submitting");
    const fd = new FormData();
    fd.append("name", name.trim());
    fd.append("phone", phone.replace(/\D/g, ""));
    fd.append("age", age.trim());
    fd.append("gender", gender);
    fd.append("school", school);
    try {
      const res = await fetch("/api/blind-date/signup", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "something went wrong"); setFormState("idle"); return; }
      const teamCode = data.teamCode || Math.random().toString(36).slice(2, 6).toUpperCase();
      sessionStorage.setItem(`bubl-invite-${teamCode}`, JSON.stringify({ name: name.trim(), gender }));
      navigate(`/invite/${teamCode}`, { replace: true });
    } catch { setError("connection failed — retry!"); setFormState("idle"); }
  };
  const scrollToSignup = () => signupRef.current?.scrollIntoView({ behavior: "smooth" });

  const inputClass =
    "w-full px-3 sm:px-4 py-3 border-4 border-[#29adff] bg-[#1d2b53] text-white text-[11px] placeholder:text-[#29adff]/40 focus:outline-none focus:border-[#ffec27] h-[48px]";

  return (
    <div className="min-h-screen relative overflow-x-hidden" style={px}>

      {/* Background — dark pixel sky */}
      <div className="fixed inset-0 z-0" style={{ background: "#0d0d1a" }} />
      {/* Scanlines overlay */}
      <div
        className="fixed inset-0 z-[1] pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, #000 2px, #000 4px)",
        }}
      />
      {/* Pixel grid overlay */}
      <div
        className="fixed inset-0 z-[1] pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "8px 8px",
        }}
      />

      <PixelStars />

      {/* ─── Arcade Nav ─── */}
      <nav className="fixed top-0 w-full z-50 border-b-4 border-[#29adff] bg-[#1d2b53]/95 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[#ff004d] text-[14px] sm:text-[18px]">bubl.</span>
            <div className="flex items-center gap-1 ml-2">
              <PixelHeart size={12} />
              <PixelHeart size={12} />
              <PixelHeart size={12} />
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
<button onClick={() => navigate("/signin")} className="text-[#c2c3c7] text-[8px] sm:text-[11px] hover:text-[#ffec27] transition-none py-2">
              <span className="hidden sm:inline">&gt;&gt; </span>[ SIGN IN ]
            </button>
            <span className="text-[#5f574f] text-[8px] sm:text-[11px]">|</span>
            <button onClick={scrollToSignup} className="text-[#29adff] text-[8px] sm:text-[11px] hover:text-[#ffec27] transition-none py-2">
              [ SIGN UP ]<span className="hidden sm:inline"> &gt;&gt;</span>
            </button>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="relative z-10 min-h-[100svh] flex flex-col justify-center px-4 sm:px-6 pt-20 sm:pt-24 pb-12 sm:pb-16">
        <div className="max-w-5xl mx-auto w-full flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 sm:gap-12">
          <div className="flex-1 order-2 lg:order-1 animate-fade-up">
            <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
              <PixelHeart size={28} />
              <PixelHeart size={28} />
              <PixelHeart size={28} />
            </div>
            <GlitchLogo />
            <p className="mt-4 sm:mt-6 text-[#c2c3c7] text-[10px] sm:text-[15px] leading-[2.2] max-w-lg">
              Get a match every Thursday. No app downloads, No awkward dms.
            </p>
            <p className="mt-2 sm:mt-3 text-[#ffec27] text-[9px] sm:text-[11px] leading-[2]">
              &gt; iMessage only<BlinkCursor />
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-6 sm:mt-8">
              <button
                onClick={scrollToSignup}
                className="px-6 sm:px-8 py-3 sm:py-4 min-h-[44px] border-4 border-[#ffec27] bg-[#ffec27] text-[#1d2b53] text-[10px] sm:text-[13px] hover:bg-[#fff1a8] active:translate-x-[2px] active:translate-y-[2px] transition-none"
                style={{ boxShadow: "4px 4px 0 #ab5236", animation: "arcade-pulse 2s ease-in-out infinite" }}
              >
                GET MATCHED
              </button>
              <div className="text-[7px] sm:text-[8px] text-[#5f574f] self-center animate-blink-slow">
                SIGN UP — TAKES 10 SEC
              </div>
            </div>
          </div>
          <div className="shrink-0 order-1 lg:order-2 self-center animate-slide-up-fade" style={{ animationDelay: "0.2s" }}>
            <div className="relative">
              <PixelBox color="#ff77a8" className="bg-[#1d2b53] p-0 overflow-hidden" beam>
                <img
                  src="/peson.jpg"
                  alt=""
                  className="w-[180px] sm:w-[260px] lg:w-[300px] aspect-[3/4] object-cover block"
                  style={{ imageRendering: "pixelated" }}
                />
              </PixelBox>
              <div className="absolute -top-4 -right-4"><PixelHeart size={24} /></div>
              <div className="absolute -bottom-4 -left-4 text-[#ff004d] text-[24px]">&lt;3</div>
              <div className="absolute -bottom-6 -right-6 bg-[#1d2b53] border-2 border-[#29adff] px-2 py-1 text-[7px] text-[#29adff]">
                P1 READY
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="relative z-10">

        {/* ─── Marquee ─── */}
        <div className="border-y-4 border-[#29adff] py-2 sm:py-3 overflow-hidden bg-[#1d2b53]/80">
          <div className="flex whitespace-nowrap" style={{ animation: "marquee-scroll 30s linear infinite" }}>
            {Array.from({ length: 2 }).map((_, half) => (
              <div key={half} className="flex shrink-0">
                {Array.from({ length: 6 }).map((_, i) => (
                  <span key={i} className="text-[#29adff] text-[8px] sm:text-[11px] mx-4 sm:mx-8 uppercase shrink-0">
                    *** iMessage only *** love is a game, literally *** every thursday *** no app required *** PLAYER 2 AWAITS ***
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* ─── Animated stats ─── */}
        <ArcadeStats />

        {/* ─── How it works ─── */}
        <section className="py-16 sm:py-32 px-4 sm:px-6">
          <div ref={howItWorks.ref} style={howItWorks.style}>
            <PixelBox color="#29adff" className="max-w-4xl mx-auto bg-[#1d2b53] p-5 sm:p-12" beam>
              <div className="grid lg:grid-cols-2 gap-8 sm:gap-10 lg:gap-14">
                <div>
                  <p className="text-[#ff77a8] text-[9px] sm:text-[11px] mb-4 sm:mb-5">&lt; HOW TO PLAY &gt;</p>
                  <h2 className="text-[18px] sm:text-[30px] lg:text-[38px] text-[#fff1e8] leading-[1.7]">
                    Sign up.<br />
                    Get texted.<br />
                    Meet someone<br />
                    <span
                      className="text-[#ff004d] underline decoration-4"
                      style={{ textUnderlineOffset: "8px", textShadow: "0 0 8px #ff004d, 0 0 20px #ff004d55" }}
                    >
                      real.
                    </span>
                  </h2>
                </div>
                <div className="flex flex-col justify-center space-y-5 sm:space-y-7">
                  {[
                    "Curate your profile and invite your friend.",
                    "Tell bubl your preferences by Wednesday 11:59 PM.",
                    "Every Thursday, receive two new matches for you and your friend.",
                    "Reply Yes — we set the date.",
                    "Ages are carefully matched for safety.",
                  ].map((text, i) => (
                    <div key={i} className="flex gap-3 sm:gap-4 items-start">
                      <span
                        className="text-[12px] sm:text-[14px] shrink-0"
                        style={{ color: "#ffec27", textShadow: "0 0 6px #ffec2766" }}
                      >
                        [{i + 1}]
                      </span>
                      <p className="text-[#c2c3c7] text-[9px] sm:text-[11px] leading-[2.2]">{text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </PixelBox>
          </div>
        </section>


        {/* ─── Pull quote ─── */}
        <section className="py-14 sm:py-24 px-4 sm:px-6">
          <div ref={quote.ref} style={quote.style}>
            <PixelBox color="#ff77a8" className="max-w-3xl mx-auto bg-[#1d2b53] p-5 sm:p-12 text-center" beam>
              <p className="text-[10px] sm:text-[16px] lg:text-[18px] text-[#fff1e8] leading-[2.4]">
                "Instagram gave me digital<br />
                <span className="text-[#7e2553]">'connections.'</span><br />
                Bubl gave me something<br />
                <span
                  className="text-[#ff004d] underline decoration-4"
                  style={{ textUnderlineOffset: "8px", textShadow: "0 0 10px #ff004d, 0 0 25px #ff004d55" }}
                >
                  real
                </span>."
              </p>
              <p className="mt-4 sm:mt-6 text-[8px] sm:text-[10px] text-[#5f574f] uppercase">— actual high schooler, probably</p>
            </PixelBox>
          </div>
        </section>

        {/* ─── iMessage demo ─── */}
        <section className="py-16 sm:py-32 px-4 sm:px-6">
          <div ref={imessage.ref} style={imessage.style}>
            <PixelBox color="#29adff" className="max-w-4xl mx-auto bg-[#1d2b53] p-5 sm:p-12" beam>
              <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8 sm:gap-12 lg:gap-16">
                <div className="flex justify-center lg:justify-start">
                  <PhoneMockup />
                </div>
                <div className="lg:pt-8">
                  <p className="text-[#ff77a8] text-[9px] sm:text-[11px] mb-4 sm:mb-5">&lt; NO APP NEEDED &gt;</p>
                  <h2
                    className="text-[16px] sm:text-[28px] lg:text-[34px] text-[#fff1e8] leading-[1.7] mb-4 sm:mb-5"
                    style={{ textShadow: "0 0 20px #fff1e822" }}
                  >
                    bubl lives in your texts.
                  </h2>
                  <p className="text-[#c2c3c7] text-[9px] sm:text-[11px] leading-[2.2] max-w-sm">
                    We text you. You reply yes. We reveal your match. 30 seconds, never leave iMessage.
                  </p>
                  <div
                    className="mt-6 sm:mt-8 inline-block bg-[#29adff] text-[#1d2b53] px-3 sm:px-4 py-2 text-[9px] sm:text-[11px]"
                    style={{ textShadow: "none", boxShadow: "0 0 12px #29adff44" }}
                  >
                    blue bubbles only
                  </div>
                </div>
              </div>
            </PixelBox>
          </div>
        </section>

        {/* ─── Photo collage ─── */}
        <section className="py-16 sm:py-32 px-4 sm:px-6">
          <div ref={photos.ref} style={photos.style}>
            <p
              className="text-center text-[#ff77a8] text-[10px] sm:text-[13px] mb-8 sm:mb-12"
              style={{ textShadow: "0 0 8px #ff77a844" }}
            >
              &lt; REAL PEOPLE. REAL NIGHTS. &gt;
            </p>
            {/* Mobile stack */}
            <div className="flex flex-col items-center gap-6 sm:hidden">
              {["/elsam4.jpg", "/rave1.jpg", "/vibes.jpg"].map((src, i) => (
                <PixelBox key={i} color={["#ff004d", "#29adff", "#ffec27"][i]} className="bg-[#1d2b53] p-0 overflow-hidden">
                  <img src={src} alt="" className="w-[260px] max-w-[calc(100vw-4rem)] aspect-[4/3] object-cover block" style={{ imageRendering: "pixelated" }} />
                </PixelBox>
              ))}
            </div>
            {/* Desktop overlapping */}
            <div className="hidden sm:block relative max-w-4xl mx-auto" style={{ minHeight: "520px" }}>
              <div className="absolute left-0 top-0 w-[44%] hover-lift" style={{ transform: "rotate(-2deg)" }}>
                <PixelBox color="#ff004d" className="bg-[#1d2b53] p-0 overflow-hidden">
                  <img src="/elsam4.jpg" alt="" className="w-full aspect-[4/3] object-cover block" style={{ imageRendering: "pixelated" }} />
                </PixelBox>
              </div>
              <div className="absolute right-0 top-4 w-[42%] hover-lift" style={{ transform: "rotate(1.5deg)" }}>
                <PixelBox color="#29adff" className="bg-[#1d2b53] p-0 overflow-hidden">
                  <img src="/rave1.jpg" alt="" className="w-full aspect-[4/3] object-cover block" style={{ imageRendering: "pixelated" }} />
                </PixelBox>
              </div>
              <div className="absolute left-[22%] bottom-[40px] w-[44%] z-20 hover-lift" style={{ transform: "rotate(1deg)" }}>
                <PixelBox color="#ffec27" className="bg-[#1d2b53] p-0 overflow-hidden">
                  <img src="/vibes.jpg" alt="" className="w-full aspect-[16/9] object-cover block" style={{ imageRendering: "pixelated" }} />
                </PixelBox>
              </div>
              {/* Stat badges with neon glow */}
              <div
                className="absolute top-[-10px] left-[30%] z-10 bg-[#ff004d] px-4 py-3 border-4 border-[#fff1e8]"
                style={{ boxShadow: "0 0 15px #ff004d66" }}
              >
                <p className="text-[#fff1e8] text-[22px] leading-none"><AnimCounter target={100} suffix="+" /></p>
                <p className="text-[#1d2b53] text-[8px] mt-1 uppercase">Matches</p>
              </div>
              <div
                className="absolute top-[45%] right-[4%] z-10 bg-[#ffec27] px-4 py-3 border-4 border-[#fff1e8]"
                style={{ boxShadow: "0 0 15px #ffec2766" }}
              >
                <p className="text-[#1d2b53] text-[22px] leading-none">0</p>
                <p className="text-[#1d2b53]/60 text-[8px] mt-1 uppercase">Swipes</p>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Signup form ─── */}
        <section ref={signupRef} className="py-16 sm:py-32 px-4 sm:px-6">
          <div ref={signup.ref} style={signup.style}>
            <PixelBox color="#ffec27" className="max-w-md mx-auto bg-[#1d2b53] p-5 sm:p-10" beam>
              {formState === "success" ? (
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-6 border-4 border-[#00e436] bg-[#1d2b53] flex items-center justify-center" style={{ boxShadow: "0 0 20px #00e43644" }}>
                    <Check className="w-8 h-8 text-[#00e436]" strokeWidth={3} />
                  </div>
                  <h2 className="text-[16px] sm:text-[20px] text-[#00e436] mb-4" style={{ textShadow: "0 0 10px #00e43666" }}>YOU'RE IN!</h2>
                  <p className="text-[#c2c3c7] text-[8px] sm:text-[10px] leading-[2.2] mb-3">
                    we're busy curating your perfect match..
                  </p>
                  <p className="text-[#5f574f] text-[8px] sm:text-[9px] leading-[2] mb-6">
                    text bubl to receive your match!
                  </p>
                  <a
                    href="sms:textbubl@icloud.com&body=Hey Bubl, I've signed up!"
                    className="inline-block px-6 sm:px-8 py-3 border-4 border-[#ff004d] bg-[#ff004d] text-white text-[9px] sm:text-[11px] hover:bg-[#ff77a8] transition-none"
                    style={{ boxShadow: "4px 4px 0 #7e2553" }}
                  >
                    TEXT BUBL &gt;&gt;
                  </a>
                </div>
              ) : (
                <>
                  <p className="text-[#ff77a8] text-[9px] sm:text-[11px] mb-3 sm:mb-4 text-center">&lt; PLAYER SELECT &gt;</p>
                  <h2
                    className="text-[18px] sm:text-[32px] text-center mb-6 sm:mb-8 neon-yellow"
                  >
                    Get Matched.
                  </h2>

                  <div className="space-y-4">
                    <input
                      type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="> name"
                      className={inputClass} style={px}
                    />
                    <PixelSelect
                      value={gender}
                      onChange={(v) => setGender(v as "guy" | "girl")}
                      placeholder="> gender"
                      options={[{ value: "guy", label: "Guy" }, { value: "girl", label: "Girl" }]}
                    />
                    <input
                      type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="> age"
                      className={inputClass} style={px}
                    />
                    <input
                      type="tel" value={phone} onChange={(e) => setPhone(fmt(e.target.value))} placeholder="> phone (iMessage)"
                      className={inputClass} style={px}
                    />
                    <PixelSelect
                      value={school}
                      onChange={setSchool}
                      placeholder="> school"
                      options={[
                        { value: "Portola High School", label: "Portola High School" },
                        { value: "Irvine High School", label: "Irvine High School" },
                        { value: "Northwood High School", label: "Northwood High School" },
                        { value: "Woodbridge High School", label: "Woodbridge High School" },
                        { value: "Beckman High School", label: "Beckman High School" },
                        { value: "Crean Lutheran High School", label: "Crean Lutheran High School" },
                        { value: "University High School", label: "University High School" },
                      ]}
                    />

                    {error && <p className="text-[9px] sm:text-[11px] text-[#ff004d] text-center">! {error}</p>}

                    <button
                      onClick={submit}
                      disabled={formState === "submitting"}
                      className="w-full py-3 sm:py-4 border-4 border-[#00e436] bg-[#00e436] text-[#1d2b53] text-[10px] sm:text-[13px] hover:bg-[#29adff] hover:border-[#29adff] active:translate-x-[2px] active:translate-y-[2px] transition-none disabled:opacity-50 min-h-[44px]"
                      style={{ boxShadow: "4px 4px 0 #008751" }}
                    >
                      {formState === "submitting" ? "MATCHING..." : "GET MATCHED"}
                    </button>
                  </div>
                </>
              )}
            </PixelBox>
          </div>
        </section>

        {/* ─── FAQ ─── */}
        <section className="py-16 sm:py-32 px-4 sm:px-6">
          <div ref={faq.ref} style={faq.style}>
            <PixelBox color="#29adff" className="max-w-2xl mx-auto bg-[#1d2b53] p-5 sm:p-10">
              <p className="text-[#ffec27] text-[11px] sm:text-[14px] mb-6 sm:mb-8" style={{ textShadow: "0 0 8px #ffec2744" }}>&lt; FAQ &gt;</p>
              <FaqItem q="How does matching work?" a="Every Thursday we pair everyone and send results through iMessage. Both say yes, we set the event." />
              <FaqItem q="Do I need an app?" a="No. iMessage only." />
              <FaqItem q="Why school ID?" a="We verify every user is a real student. Your ID is never shared." />
              <FaqItem q="What if I'm not into my match?" a="Reply 'no'. Back in the pool next week." />
              <FaqItem q="Is it free?" a="Yes." />
            </PixelBox>
          </div>
        </section>

        {/* ─── Footer ─── */}
        <footer className="py-8 sm:py-10 px-4 sm:px-6 border-t-4 border-[#29adff]">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-[#ff004d] text-[11px] sm:text-[14px]" style={{ textShadow: "0 0 8px #ff004d44" }}>bubl.</span>
            <div className="flex items-center gap-3">
              <PixelHeart size={16} />
              <p className="text-[#5f574f] text-[8px] sm:text-[10px]">every thursday</p>
            </div>
            <p className="text-[#5f574f] text-[6px] sm:text-[8px]">GAME OVER? NEVER.</p>
          </div>
        </footer>

      </div>
    </div>
  );
}
