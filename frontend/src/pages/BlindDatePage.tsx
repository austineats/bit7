import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";

const px = { fontFamily: "'Press Start 2P', monospace" };

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


/* ─── Pixel border box ─── */
function PixelBox({ children, className = "", color = "#fff" }: { children: React.ReactNode; className?: string; color?: string }) {
  return (
    <div
      className={`relative ${className}`}
      style={{
        border: `4px solid ${color}`,
        boxShadow: `4px 4px 0 ${color}, -4px -4px 0 ${color}, 4px -4px 0 ${color}, -4px 4px 0 ${color}`,
        imageRendering: "pixelated",
      }}
    >
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

/* ─── Pixel heart — matches the reference image (3D shaded red with black outline + white shine) ─── */
function PixelHeart({ size = 32 }: { size?: number }) {
  const s = size / 16; // scale factor
  const r = (x: number, y: number, w: number, h: number, fill: string) => (
    <rect x={x * s} y={y * s} width={w * s} height={h * s} fill={fill} />
  );
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ imageRendering: "pixelated" }}>
      {/* Black outline */}
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
      {/* Dark red shadow edges */}
      {r(5,5,7,1,"#9b0000")}{r(4,6,7,1,"#9b0000")}{r(5,7,5,1,"#9b0000")}
      {r(6,8,3,1,"#9b0000")}{r(7,9,1,1,"#9b0000")}
      {r(11,2,1,2,"#9b0000")}{r(11,4,1,1,"#9b0000")}{r(11,5,1,1,"#9b0000")}
      {r(10,6,1,1,"#9b0000")}
      {/* Main red fill */}
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
      {/* Bright red highlight */}
      {r(4,2,3,1,"#ff2222")}{r(4,3,2,1,"#ff2222")}{r(5,4,1,1,"#ff2222")}
      {/* White shine spots */}
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

/* ─── Phone Mockup — just messages on mobile, full iPhone on desktop ─── */
function PhoneMockup() {
  return (
    <div className="w-[280px] sm:w-[340px] shrink-0">
      <img src="/bubl. iphone ui.jpeg" className="w-full rounded-[16px]" alt="bubl iMessage preview" />
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

/* ═══ Page ═══ */
type FormState = "idle" | "submitting" | "success";

export function BlindDatePage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [school, setSchool] = useState("");
  const [formState, setFormState] = useState<FormState>("idle");
  const [error, setError] = useState("");
  const signupRef = useRef<HTMLDivElement>(null);

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
      // Navigate immediately — don't set success state to avoid flash
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

      {/* ─── Nav ─── */}
      <nav className="fixed top-0 w-full z-50 border-b-4 border-[#29adff] bg-[#1d2b53]/95">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <span className="text-[#ff004d] text-[14px] sm:text-[18px]">bubl.</span>
          <div className="flex items-center gap-2 sm:gap-4">
            <button onClick={() => navigate("/signin")} className="text-[#c2c3c7] text-[8px] sm:text-[11px] hover:text-[#ffec27] transition-none py-2">
              <span className="hidden sm:inline">&gt;&gt; </span>[ SIGN IN ]
            </button>
            <span className="text-[#5f574f] text-[8px] sm:text-[11px]">|</span>
            <button onClick={scrollToSignup} className="text-[#29adff] text-[8px] sm:text-[11px] hover:text-[#ffec27] transition-none py-2">
              [ JOIN ]<span className="hidden sm:inline"> &gt;&gt;</span>
            </button>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="relative z-10 min-h-[100svh] flex flex-col justify-center px-4 sm:px-6 pt-20 sm:pt-24 pb-12 sm:pb-16">
        <div className="max-w-5xl mx-auto w-full flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 sm:gap-12">
          <div className="flex-1 order-2 lg:order-1">
            <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
              <PixelHeart size={28} />
              <PixelHeart size={28} />
              <PixelHeart size={28} />
            </div>
            <h1 className="text-[36px] sm:text-[80px] lg:text-[112px] leading-none tracking-tight text-[#ff004d]">
              bubl.
            </h1>
            <p className="mt-4 sm:mt-6 text-[#c2c3c7] text-[10px] sm:text-[15px] leading-[2.2] max-w-lg">
              Get a match every Thursday. No app downloads, No awkward dms.
            </p>
            <p className="mt-2 sm:mt-3 text-[#ffec27] text-[9px] sm:text-[11px] leading-[2]">
              &gt; iMessage only<BlinkCursor />
            </p>
            <button
              onClick={scrollToSignup}
              className="mt-6 sm:mt-8 px-6 sm:px-8 py-3 sm:py-4 min-h-[44px] border-4 border-[#ffec27] bg-[#ffec27] text-[#1d2b53] text-[10px] sm:text-[13px] hover:bg-[#fff1a8] active:translate-x-[2px] active:translate-y-[2px] transition-none"
              style={{ boxShadow: "4px 4px 0 #ab5236" }}
            >
              &gt; JOIN WAITLIST
            </button>
          </div>
          <div className="shrink-0 order-1 lg:order-2 self-center">
            {/* Pixel polaroid */}
            <div className="relative">
              <PixelBox color="#ff77a8" className="bg-[#1d2b53] p-0 overflow-hidden">
                <img
                  src="/peson.jpg"
                  alt=""
                  className="w-[180px] sm:w-[260px] lg:w-[300px] aspect-[3/4] object-cover block"
                  style={{ imageRendering: "pixelated" }}
                />
              </PixelBox>
              {/* Pixel decorations */}
              <div className="absolute -top-4 -right-4"><PixelHeart size={24} /></div>
              <div className="absolute -bottom-4 -left-4 text-[#ff004d] text-[24px]">&lt;3</div>
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
                    *** iMessage only *** love is a game, literally *** every thursday *** no app required
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* ─── How it works ─── */}
        <section className="py-16 sm:py-32 px-4 sm:px-6">
          <PixelBox color="#29adff" className="max-w-4xl mx-auto bg-[#1d2b53] p-5 sm:p-12">
            <div className="grid lg:grid-cols-2 gap-8 sm:gap-10 lg:gap-14">
              <div>
                <p className="text-[#ff77a8] text-[9px] sm:text-[11px] mb-4 sm:mb-5">&lt; HOW IT WORKS &gt;</p>
                <h2 className="text-[18px] sm:text-[30px] lg:text-[38px] text-[#fff1e8] leading-[1.7]">
                  Sign up.<br />
                  Get texted.<br />
                  Meet someone<br />
                  <span className="text-[#ff004d] underline decoration-4" style={{ textUnderlineOffset: "8px", textShadow: "0 0 8px #ff004d, 0 0 20px #ff004d55" }}>real.</span>
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
                    <span className="text-[#ffec27] text-[12px] sm:text-[14px] shrink-0">[{i + 1}]</span>
                    <p className="text-[#c2c3c7] text-[9px] sm:text-[11px] leading-[2.2]">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </PixelBox>
        </section>

        {/* ─── Your Personalized Matchmaker ─── */}
        <section className="py-16 sm:py-32 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto">
            {/* Title */}
            <div className="text-center mb-10 sm:mb-16">
              <div className="inline-block bg-[#1d2b53] border-4 border-[#ff77a8] px-4 sm:px-6 py-2 sm:py-3" style={{ boxShadow: "4px 4px 0 #7a2a4a" }}>
                <span className="text-[#fff1e8] text-[11px] sm:text-[20px]">Your </span>
                <span className="text-[#ff004d] text-[11px] sm:text-[20px] italic">Personalized</span>
                <br />
                <span className="text-[#fff1e8] text-[11px] sm:text-[20px]">Matchmaker</span>
              </div>
            </div>

            {/* Three columns — all same height boxes */}
            <div className="grid sm:grid-cols-3 gap-6 sm:gap-6">
              {/* Column 1 — AI Research */}
              <div className="flex flex-col items-center text-center gap-4 sm:gap-5">
                <p className="text-[#fff1e8] text-[10px] sm:text-[14px] leading-[1.8]">Backed by the best<br />AI research</p>
                <div className="bg-[#1d2b53] border-4 border-[#29adff] p-4 sm:p-6 w-full h-[160px] sm:h-[180px] flex items-center justify-center" style={{ boxShadow: "4px 4px 0 #1a6b99" }}>
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex gap-2">
                      <div className="w-[50px] h-[65px] bg-[#fff1e8] border-2 border-[#c2c3c7] flex flex-col items-center justify-center p-1">
                        <div className="w-full h-[2px] bg-[#1d2b53] mb-1" />
                        <div className="w-full h-[2px] bg-[#1d2b53] mb-1" />
                        <div className="w-[80%] h-[2px] bg-[#1d2b53] mb-2" />
                        <div className="w-6 h-6 bg-[#29adff]" />
                      </div>
                      <div className="w-[50px] h-[65px] bg-[#29adff] border-2 border-[#1d2b53] flex flex-col items-center justify-center p-1">
                        <div className="w-full h-[2px] bg-white mb-1" />
                        <div className="w-full h-[2px] bg-white mb-1" />
                        <div className="w-[80%] h-[2px] bg-white mb-2" />
                        <div className="w-6 h-6 bg-[#1d2b53]" />
                      </div>
                    </div>
                    <span className="text-[#29adff] text-[7px]">AI POWERED</span>
                  </div>
                </div>
              </div>

              {/* Column 2 — Learns preferences */}
              <div className="flex flex-col items-center text-center gap-4 sm:gap-5">
                <p className="text-[#fff1e8] text-[10px] sm:text-[14px] leading-[1.8]">bubl learns your<br />preferences</p>
                <div className="bg-[#1d2b53] border-4 border-[#ff77a8] p-4 sm:p-6 w-full h-[160px] sm:h-[180px] flex items-center justify-center" style={{ boxShadow: "4px 4px 0 #993d64" }}>
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative">
                      <div className="w-[70px] h-[85px] bg-[#0d0d1a] border-2 border-[#ff77a8] flex items-center justify-center">
                        {/* 8-bit pixel smiley face */}
                        <svg width="40" height="40" viewBox="0 0 16 16" style={{ imageRendering: "pixelated" }}>
                          {/* Outline */}
                          <rect x="4" y="0" width="8" height="1" fill="#8a6800" />
                          <rect x="2" y="1" width="2" height="1" fill="#8a6800" /><rect x="12" y="1" width="2" height="1" fill="#8a6800" />
                          <rect x="1" y="2" width="1" height="1" fill="#8a6800" /><rect x="14" y="2" width="1" height="1" fill="#8a6800" />
                          <rect x="0" y="3" width="1" height="3" fill="#8a6800" /><rect x="15" y="3" width="1" height="3" fill="#8a6800" />
                          <rect x="0" y="6" width="1" height="4" fill="#8a6800" /><rect x="15" y="6" width="1" height="4" fill="#8a6800" />
                          <rect x="0" y="10" width="1" height="2" fill="#8a6800" /><rect x="15" y="10" width="1" height="2" fill="#8a6800" />
                          <rect x="1" y="12" width="1" height="1" fill="#8a6800" /><rect x="14" y="12" width="1" height="1" fill="#8a6800" />
                          <rect x="2" y="13" width="2" height="1" fill="#8a6800" /><rect x="12" y="13" width="2" height="1" fill="#8a6800" />
                          <rect x="4" y="14" width="8" height="1" fill="#8a6800" />
                          {/* Yellow fill */}
                          <rect x="4" y="1" width="8" height="1" fill="#ffdd00" />
                          <rect x="2" y="2" width="12" height="1" fill="#ffdd00" />
                          <rect x="1" y="3" width="14" height="3" fill="#ffdd00" />
                          <rect x="1" y="6" width="14" height="4" fill="#ffdd00" />
                          <rect x="1" y="10" width="14" height="2" fill="#ffdd00" />
                          <rect x="2" y="12" width="12" height="1" fill="#ffdd00" />
                          <rect x="4" y="13" width="8" height="1" fill="#ffdd00" />
                          {/* Orange shading on right/bottom */}
                          <rect x="13" y="3" width="2" height="6" fill="#e8a800" />
                          <rect x="12" y="10" width="3" height="2" fill="#e8a800" />
                          <rect x="10" y="12" width="4" height="1" fill="#e8a800" />
                          {/* Eyes — squinting */}
                          <rect x="4" y="4" width="1" height="1" fill="#5a3800" /><rect x="6" y="4" width="1" height="1" fill="#5a3800" />
                          <rect x="5" y="5" width="1" height="1" fill="#5a3800" />
                          <rect x="9" y="4" width="1" height="1" fill="#5a3800" /><rect x="11" y="4" width="1" height="1" fill="#5a3800" />
                          <rect x="10" y="5" width="1" height="1" fill="#5a3800" />
                          {/* Mouth — open grin */}
                          <rect x="5" y="8" width="6" height="1" fill="#5a3800" />
                          <rect x="5" y="9" width="6" height="2" fill="#c45000" />
                          <rect x="5" y="9" width="6" height="1" fill="#fff" />
                          <rect x="5" y="10" width="6" height="1" fill="#c45000" />
                        </svg>
                      </div>
                      {/* Scan line — sweeps top to bottom then back */}
                      <div className="absolute -left-3 w-[calc(100%+24px)] h-[2px] bg-[#ff77a8]" style={{ animation: "scan-sweep 2.5s ease-in-out infinite" }} />
                    </div>
                    <span className="text-[#ff77a8] text-[7px]">SCANNING</span>
                    <div className="flex gap-1.5">
                      <span className="text-[14px]">&#x1F3C8;</span>
                      <span className="text-[14px]">&#x1F3B8;</span>
                      <span className="text-[14px]">&#x1F45F;</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Column 3 — Finds the one */}
              <div className="flex flex-col items-center text-center gap-4 sm:gap-5">
                <p className="text-[#fff1e8] text-[10px] sm:text-[14px] leading-[1.8]">Scans the entire pool<br />to find the one</p>
                <div className="bg-[#1d2b53] border-4 border-[#ffec27] p-4 sm:p-6 w-full h-[160px] sm:h-[180px] flex items-center justify-center" style={{ boxShadow: "4px 4px 0 #998d17" }}>
                  <div className="flex flex-col items-center gap-3">
                    <div className="bg-[#2a2a2a] border-4 border-[#5f574f] p-2 rounded-sm">
                      <div className="w-[60px] h-[45px] bg-[#0d0d1a] relative overflow-hidden flex items-center justify-center">
                        <div className="absolute inset-0 opacity-20" style={{
                          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, #fff 3px, #fff 4px)",
                          animation: "blink-pixel 0.5s step-end infinite"
                        }} />
                        <div className="flex gap-2 relative z-10 items-center justify-center">
                          <PixelHeart size={16} />
                          <PixelHeart size={16} />
                        </div>
                      </div>
                    </div>
                    <div className="w-[30px] h-[4px] bg-[#5f574f]" />
                    <span className="text-[#ffec27] text-[7px]">MATCH FOUND</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Pull quote ─── */}
        <section className="py-14 sm:py-24 px-4 sm:px-6">
          <PixelBox color="#ff77a8" className="max-w-3xl mx-auto bg-[#1d2b53] p-5 sm:p-12 text-center">
            <p className="text-[10px] sm:text-[16px] lg:text-[18px] text-[#fff1e8] leading-[2.4]">
              "Instagram gave me digital<br />
              <span className="text-[#7e2553]">'connections.'</span><br />
              Bubl gave me something<br />
              <span className="text-[#ff004d] underline decoration-4" style={{ textUnderlineOffset: "8px" }}>real</span>."
            </p>
            <p className="mt-4 sm:mt-6 text-[8px] sm:text-[10px] text-[#5f574f] uppercase">— actual high schooler, probably</p>
          </PixelBox>
        </section>

        {/* ─── iMessage demo ─── */}
        <section className="py-16 sm:py-32 px-4 sm:px-6">
          <PixelBox color="#29adff" className="max-w-4xl mx-auto bg-[#1d2b53] p-5 sm:p-12">
            <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8 sm:gap-12 lg:gap-16">
              <div className="flex justify-center lg:justify-start">
                <PhoneMockup />
              </div>
              <div className="lg:pt-8">
                <p className="text-[#ff77a8] text-[9px] sm:text-[11px] mb-4 sm:mb-5">&lt; NO APP NEEDED &gt;</p>
                <h2 className="text-[16px] sm:text-[28px] lg:text-[34px] text-[#fff1e8] leading-[1.7] mb-4 sm:mb-5">
                  bubl lives in<br />your texts.
                </h2>
                <p className="text-[#c2c3c7] text-[9px] sm:text-[11px] leading-[2.2] max-w-sm">
                  We text you. You reply yes. We reveal your match. 30 seconds, never leave iMessage.
                </p>
                <div className="mt-6 sm:mt-8 inline-block bg-[#29adff] text-[#1d2b53] px-3 sm:px-4 py-2 text-[9px] sm:text-[11px]">
                  blue bubbles only
                </div>
              </div>
            </div>
          </PixelBox>
        </section>

        {/* ─── Photo collage ─── */}
        <section className="py-16 sm:py-32 px-4 sm:px-6">
          <p className="text-center text-[#ff77a8] text-[10px] sm:text-[13px] mb-8 sm:mb-12">&lt; REAL PEOPLE. REAL NIGHTS. &gt;</p>
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
            <div className="absolute left-0 top-0 w-[44%]" style={{ transform: "rotate(-2deg)" }}>
              <PixelBox color="#ff004d" className="bg-[#1d2b53] p-0 overflow-hidden">
                <img src="/elsam4.jpg" alt="" className="w-full aspect-[4/3] object-cover block" style={{ imageRendering: "pixelated" }} />
              </PixelBox>
            </div>
            <div className="absolute right-0 top-4 w-[42%]" style={{ transform: "rotate(1.5deg)" }}>
              <PixelBox color="#29adff" className="bg-[#1d2b53] p-0 overflow-hidden">
                <img src="/rave1.jpg" alt="" className="w-full aspect-[4/3] object-cover block" style={{ imageRendering: "pixelated" }} />
              </PixelBox>
            </div>
            <div className="absolute left-[22%] bottom-[40px] w-[44%] z-20" style={{ transform: "rotate(1deg)" }}>
              <PixelBox color="#ffec27" className="bg-[#1d2b53] p-0 overflow-hidden">
                <img src="/vibes.jpg" alt="" className="w-full aspect-[16/9] object-cover block" style={{ imageRendering: "pixelated" }} />
              </PixelBox>
            </div>
            {/* Stat badges */}
            <div className="absolute top-[-10px] left-[30%] z-10 bg-[#ff004d] px-4 py-3 border-4 border-[#fff1e8]">
              <p className="text-[#fff1e8] text-[22px] leading-none">100+</p>
              <p className="text-[#1d2b53] text-[8px] mt-1 uppercase">Matches</p>
            </div>
            <div className="absolute top-[45%] right-[4%] z-10 bg-[#ffec27] px-4 py-3 border-4 border-[#fff1e8]">
              <p className="text-[#1d2b53] text-[22px] leading-none">0</p>
              <p className="text-[#1d2b53]/60 text-[8px] mt-1 uppercase">Swipes</p>
            </div>
          </div>
        </section>

        {/* ─── Signup form ─── */}
        <section ref={signupRef} className="py-16 sm:py-32 px-4 sm:px-6">
          <PixelBox color="#ffec27" className="max-w-md mx-auto bg-[#1d2b53] p-5 sm:p-10">
            {formState === "success" ? (
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-6 border-4 border-[#00e436] bg-[#1d2b53] flex items-center justify-center">
                  <Check className="w-8 h-8 text-[#00e436]" strokeWidth={3} />
                </div>
                <h2 className="text-[16px] sm:text-[20px] text-[#00e436] mb-4">LEVEL UP!</h2>
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
                <p className="text-[#ff77a8] text-[9px] sm:text-[11px] mb-3 sm:mb-4 text-center">&lt; WAITLIST &gt;</p>
                <h2 className="text-[18px] sm:text-[32px] text-center mb-6 sm:mb-8 text-[#ffec27]">
                  Get in.
                </h2>

                <div className="space-y-4">
                  <input
                    type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="&gt; name"
                    className={inputClass} style={px}
                  />
                  <PixelSelect
                    value={gender}
                    onChange={setGender}
                    placeholder="&gt; gender"
                    options={[{ value: "male", label: "Male" }, { value: "female", label: "Female" }]}
                  />
                  <input
                    type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="&gt; age"
                    className={inputClass} style={px}
                  />
                  <input
                    type="tel" value={phone} onChange={(e) => setPhone(fmt(e.target.value))} placeholder="&gt; phone (iMessage)"
                    className={inputClass} style={px}
                  />
                  <PixelSelect
                    value={school}
                    onChange={setSchool}
                    placeholder="&gt; school"
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
                    {formState === "submitting" ? "LOADING..." : "> JOIN WAITLIST"}
                  </button>
                </div>
              </>
            )}
          </PixelBox>
        </section>

        {/* ─── FAQ (interactive accordion) ─── */}
        <section className="py-16 sm:py-32 px-4 sm:px-6">
          <PixelBox color="#29adff" className="max-w-2xl mx-auto bg-[#1d2b53] p-5 sm:p-10">
            <p className="text-[#ffec27] text-[11px] sm:text-[14px] mb-6 sm:mb-8">&lt; FAQ &gt;</p>
            <FaqItem q="How does matching work?" a="Every Thursday we pair everyone and send results through iMessage. Both say yes, we set the event." />
            <FaqItem q="Do I need an app?" a="No. iMessage only." />
            <FaqItem q="Why school ID?" a="We verify every user is a real student. Your ID is never shared." />
            <FaqItem q="What if I'm not into my match?" a="Reply 'no'. Back in the pool next week." />
            <FaqItem q="Is it free?" a="Yes." />
          </PixelBox>
        </section>

        {/* ─── Footer ─── */}
        <footer className="py-8 sm:py-10 px-4 sm:px-6 border-t-4 border-[#29adff]">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <span className="text-[#ff004d] text-[11px] sm:text-[14px]">bubl.</span>
            <div className="flex items-center gap-3">
              <PixelHeart size={16} />
              <p className="text-[#5f574f] text-[8px] sm:text-[10px]">every thursday</p>
            </div>
          </div>
        </footer>

      </div>
    </div>
  );
}
