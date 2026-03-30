import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { motion } from "motion/react";

type Slot = {
  position: number;
  name: string | null;
  role: "guy" | "girl";
  is_host: boolean;
  filled: boolean;
};

type PartyData = {
  code: string;
  status: string;
  slots: Slot[];
};

const sectionVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const API = import.meta.env.VITE_API_URL || "";

// Classic restroom sign silhouettes
function MaleIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <img src="/male-icon.svg" alt="guy" className={className} style={style} />;
}

function FemaleIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <img src="/female-icon.svg" alt="girl" className={className} style={style} />;
}

function SlotCard({ slot, onJoin, blurred, mystery }: { slot: Slot; onJoin: () => void; blurred?: boolean; mystery?: boolean }) {
  const isGuy = slot.role === "guy";
  const accent = isGuy ? "#2196F3" : "#FF1493";
  const accentMid = isGuy ? "rgba(33,150,243,0.3)" : "rgba(255,20,147,0.3)";

  return (
    <motion.div
      variants={itemVariants}
      className="relative flex flex-col group cursor-pointer"
      style={{ width: "100%" }}
      onClick={() => !slot.filled && !mystery && onJoin()}
    >
      {/* Card body — tall vertical */}
      <div
        className="relative flex-1 flex flex-col items-center justify-center overflow-hidden transition-all duration-300"
        style={{
          minHeight: 180,
          aspectRatio: "1",
          background: "rgba(255,255,255,0.03)",
          border: slot.filled ? `1px solid ${accentMid}` : "1px dashed rgba(255,255,255,0.08)",
        }}
      >
        {/* Top accent line */}
        {slot.filled && (
          <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: accent }} />
        )}

        {slot.filled ? (
          blurred ? (
            <>
              {isGuy
                ? <MaleIcon className="w-16 sm:w-20 mb-2" style={{ opacity: 0.15, filter: "blur(6px)" }} />
                : <FemaleIcon className="w-16 sm:w-20 mb-2" style={{ opacity: 0.15, filter: "blur(6px)" }} />
              }
            </>
          ) : (
            <>
              {isGuy
                ? <MaleIcon className="w-16 sm:w-20 mb-2" style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.3))" }} />
                : <FemaleIcon className="w-16 sm:w-20 mb-2" style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.3))" }} />
              }
              <div className="px-3 py-1 rounded text-[10px] font-bold uppercase tracking-[0.2em] mb-1" style={{ background: accentMid, color: accent }}>
                ready
              </div>
            </>
          )
        ) : mystery ? (
          <>
            {isGuy
              ? <MaleIcon className="w-14 sm:w-18" style={{ opacity: 0.1, filter: "blur(5px)" }} />
              : <FemaleIcon className="w-14 sm:w-18" style={{ opacity: 0.1, filter: "blur(5px)" }} />
            }
          </>
        ) : (
          <>
            <div
              className="w-14 h-14 rounded-lg flex items-center justify-center transition-all group-hover:scale-110"
              style={{ border: "2px dashed rgba(255,255,255,0.1)" }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </div>
            <p className="text-white/15 text-[12px] mt-3 uppercase tracking-widest font-semibold">invite</p>
          </>
        )}
      </div>

      {/* Bottom nameplate — no gradient */}
      <div className="py-3 text-center">
        {slot.filled ? (
          <>
            <p className="text-white font-bold text-[15px] sm:text-[17px] tracking-wide">
              {blurred ? "? ? ?" : slot.name}
            </p>
            <p className="text-white/25 text-[10px] font-mono uppercase tracking-[0.15em] mt-0.5">
              {blurred ? "mystery" : slot.is_host ? "matched" : "joined"}
            </p>
          </>
        ) : mystery ? (
          <p className="text-white/10 text-[13px]">? ? ?</p>
        ) : (
          <p className="text-white/10 text-[13px]">empty slot</p>
        )}
      </div>
    </motion.div>
  );
}

function JoinModal({ role, onClose, onSubmit, submitting }: { role: "guy" | "girl"; onClose: () => void; onSubmit: (name: string, phone: string) => void; submitting: boolean }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const fmt = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 10);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="relative bg-[#1a1a1a] border border-white/10 rounded-2xl p-8 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-white font-bold text-[24px] mb-1">join the party</h3>
        <p className="text-white/40 text-[14px] mb-6">you're joining as {role === "guy" ? "his" : "her"} +1</p>

        <div className="space-y-3">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="your name"
            className="w-full px-4 py-3 rounded-lg border border-white/10 text-[15px] text-white placeholder:text-white/20 focus:outline-none focus:border-white/25 transition bg-white/5" />
          <div>
            <input type="tel" value={phone} onChange={(e) => setPhone(fmt(e.target.value))} placeholder="phone"
              className="w-full px-4 py-3 rounded-lg border border-white/10 text-[15px] text-white placeholder:text-white/20 focus:outline-none focus:border-white/25 transition bg-white/5" />
            <p className="text-[11px] text-white/15 mt-1 ml-1">iMessage required</p>
          </div>
          <button
            onClick={() => { if (name.trim() && phone.trim()) onSubmit(name.trim(), phone.trim()); }}
            disabled={submitting}
            className="w-full py-3 rounded-lg bg-white text-black font-semibold text-[14px] hover:bg-white/90 active:scale-[0.98] transition disabled:opacity-50"
          >
            {submitting ? <div className="w-4 h-4 mx-auto border-2 border-black/20 border-t-black rounded-full animate-spin" /> : "I'm in"}
          </button>
        </div>

        <button onClick={onClose} className="absolute top-4 right-4 text-white/30 hover:text-white/60 transition text-[20px]">&times;</button>
      </motion.div>
    </motion.div>
  );
}

export function PartyPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const viewerSide = searchParams.get("as") as "guy" | "girl" | null;
  const locState = location.state as { hostName?: string; hostRole?: "guy" | "girl" } | null;
  const [party, setParty] = useState<PartyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [joinModal, setJoinModal] = useState<"guy" | "girl" | null>(null);
  const [joinError, setJoinError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoinCode, setShowJoinCode] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [createData, setCreateData] = useState({ name: "", phone: "", role: "" as "guy" | "girl" | "" });
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);

  const fmt = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 10);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  };

  const handleCreate = async () => {
    const { name, phone, role } = createData;
    if (!name.trim() || !phone.trim()) {
      setCreateError("enter your name and phone");
      return;
    }
    if (!role) {
      setCreateError("select guys or girls");
      return;
    }
    setCreating(true);
    setCreateError("");
    try {
      const res = await fetch(`${API}/api/party`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.replace(/\D/g, ""),
          role,
        }),
      });
      const data = await res.json();
      if (data.ok) navigate(`/party/${data.code}?as=${role}`);
      else setCreateError(data.error || "something went wrong");
    } catch {
      const mockCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      navigate(`/party/${mockCode}?as=${role}`);
    } finally {
      setCreating(false);
    }
  };

  // Auto-create party from waitlist signup
  useEffect(() => {
    if (code) return; // already in a lobby
    const saved = localStorage.getItem("bubl_user");
    if (!saved) return;
    try {
      const user = JSON.parse(saved) as { name: string; phone: string; role: "guy" | "girl" };
      if (!user.name || !user.role) return;
      localStorage.removeItem("bubl_user"); // consume it so it doesn't re-trigger
      const mockCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      navigate(`/party/${mockCode}?as=${user.role}`, { replace: true, state: { hostName: user.name, hostRole: user.role } });
    } catch { /* ignore bad data */ }
  }, [code, navigate]);

  // Fetch party data
  useEffect(() => {
    if (!code) {
      setLoading(false);
      return;
    }
    fetch(`${API}/api/party/${code}`)
      .then(r => r.json())
      .then(data => {
        if (data.ok) setParty(data.party);
        else setError(data.error || "party not found");
      })
      .catch(() => {
        // Fallback to mock data — use host info from navigation state or defaults
        const side = (locState?.hostRole || searchParams.get("as") || "guy") as "guy" | "girl";
        const hostName = locState?.hostName || "Alex";
        const otherSide = side === "guy" ? "girl" : "guy";
        setParty({
          code: code!,
          status: "waiting",
          slots: [
            { position: 0, role: side, is_host: true, name: hostName, filled: true },
            { position: 1, role: side, is_host: false, name: null, filled: false },
            { position: 2, role: otherSide, is_host: false, name: null, filled: false },
            { position: 3, role: otherSide, is_host: false, name: null, filled: false },
          ],
        });
        if (!searchParams.get("as")) navigate(`/party/${code}?as=${side}`, { replace: true });
      })
      .finally(() => setLoading(false));
  }, [code]);

  // Poll for updates every 5s
  useEffect(() => {
    if (!code || !party) return;
    const interval = setInterval(() => {
      fetch(`${API}/api/party/${code}`)
        .then(r => r.json())
        .then(data => { if (data.ok) setParty(data.party); })
        .catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, [code, party]);

  const shareUrl = party ? `${window.location.origin}/party/${party.code}` : "";

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoin = async (name: string, phone: string) => {
    if (!joinModal || !code) return;
    setSubmitting(true);
    setJoinError("");
    try {
      const res = await fetch(`${API}/api/party/${code}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, role: joinModal }),
      });
      const data = await res.json();
      if (data.ok) {
        setParty(data.party);
        setJoinModal(null);
        // Set viewer side after joining
        navigate(`/party/${code}?as=${joinModal}`, { replace: true });
      } else {
        setJoinError(data.error || "couldn't join");
      }
    } catch {
      setJoinError("couldn't connect");
    } finally {
      setSubmitting(false);
    }
  };

  const slots = party?.slots || [];
  const mySlots = viewerSide ? slots.filter(s => s.role === viewerSide) : slots.filter(s => s.role === "guy");
  const otherSlots = viewerSide ? slots.filter(s => s.role !== viewerSide) : slots.filter(s => s.role === "girl");
  const myDuoFull = mySlots.length === 2 && mySlots.every(s => s.filled);
  const allFilled = slots.length === 4 && slots.every(s => s.filled);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  // No code provided — show start/join landing
  if (!code) {
    return (
      <div className="min-h-screen relative">
        <div className="fixed inset-0 z-0">
          <img src="/bg.jpg" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 backdrop-blur-[12px] bg-black/50" />
        </div>
        <nav className="fixed top-0 w-full z-50 border-b border-white/5">
          <div className="max-w-4xl mx-auto px-6 h-14 flex items-center">
            <button onClick={() => navigate("/")} className="text-white font-bold text-[18px] tracking-[-0.03em]">bubl.</button>
          </div>
        </nav>
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 text-center">
          <h1 className="text-[48px] sm:text-[64px] font-bold tracking-[-0.04em] text-white leading-[0.95] mb-3">double date</h1>
          <p className="text-white/40 text-[16px] sm:text-[18px] mb-12">grab a friend, get matched with another duo</p>

          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
            <button
              onClick={() => setShowCreate(true)}
              className="flex-1 py-4 rounded-xl bg-white text-black font-semibold text-[15px] hover:bg-white/90 active:scale-[0.97] transition"
            >
              start lobby
            </button>
            <button
              onClick={() => setShowJoinCode(true)}
              className="flex-1 py-4 rounded-xl border border-white/15 text-white font-semibold text-[15px] hover:bg-white/5 active:scale-[0.97] transition"
            >
              join lobby
            </button>
          </div>
        </div>

        {/* Create lobby modal */}
        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => setShowCreate(false)}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative bg-[#1a1a1a] border border-white/10 rounded-2xl p-8 w-full max-w-sm" onClick={e => e.stopPropagation()}>
              <h3 className="text-white font-bold text-[24px] mb-1">start a party</h3>
              <p className="text-white/40 text-[14px] mb-6">grab a friend, then get matched with another duo</p>
              <div className="space-y-4">
                <div>
                  <p className="text-white/40 text-[11px] font-semibold uppercase tracking-widest mb-2">we're the</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCreateData(d => ({ ...d, role: "guy" }))}
                      className={`flex-1 py-3 rounded-lg text-[15px] font-semibold transition ${createData.role === "guy" ? "bg-blue-500/20 border border-blue-500/40 text-blue-400" : "border border-white/10 text-white/30 hover:text-white/50"}`}
                    >
                      guys
                    </button>
                    <button
                      onClick={() => setCreateData(d => ({ ...d, role: "girl" }))}
                      className={`flex-1 py-3 rounded-lg text-[15px] font-semibold transition ${createData.role === "girl" ? "bg-pink-500/20 border border-pink-500/40 text-pink-400" : "border border-white/10 text-white/30 hover:text-white/50"}`}
                    >
                      girls
                    </button>
                  </div>
                </div>
                <div>
                  <p className={`text-[11px] font-semibold uppercase tracking-widest mb-2 ${createData.role === "girl" ? "text-pink-400" : "text-blue-400"}`}>your info</p>
                  <input type="text" value={createData.name} onChange={e => setCreateData(d => ({ ...d, name: e.target.value }))} placeholder="your name"
                    className="w-full px-4 py-3 rounded-lg border border-white/10 text-[15px] text-white placeholder:text-white/20 focus:outline-none focus:border-white/25 transition bg-white/5 mb-2" />
                  <input type="tel" value={createData.phone} onChange={e => setCreateData(d => ({ ...d, phone: fmt(e.target.value) }))} placeholder="phone"
                    className="w-full px-4 py-3 rounded-lg border border-white/10 text-[15px] text-white placeholder:text-white/20 focus:outline-none focus:border-white/25 transition bg-white/5" />
                  <p className="text-[11px] text-white/15 mt-1 ml-1">iMessage required</p>
                </div>
                {createError && <p className="text-red-400 text-[13px] text-center">{createError}</p>}
                <button onClick={handleCreate} disabled={creating}
                  className="w-full py-3 rounded-lg bg-white text-black font-semibold text-[14px] hover:bg-white/90 active:scale-[0.98] transition disabled:opacity-50">
                  {creating ? <div className="w-4 h-4 mx-auto border-2 border-black/20 border-t-black rounded-full animate-spin" /> : "create party"}
                </button>
              </div>
              <button onClick={() => setShowCreate(false)} className="absolute top-4 right-4 text-white/30 hover:text-white/60 transition text-[20px]">&times;</button>
            </motion.div>
          </motion.div>
        )}

        {/* Join with code modal */}
        {showJoinCode && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => setShowJoinCode(false)}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative bg-[#1a1a1a] border border-white/10 rounded-2xl p-8 w-full max-w-sm" onClick={e => e.stopPropagation()}>
              <h3 className="text-white font-bold text-[24px] mb-1">join a lobby</h3>
              <p className="text-white/40 text-[14px] mb-6">enter your party code</p>
              <div className="space-y-3">
                <input type="text" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))} placeholder="XXXXXX"
                  className="w-full px-4 py-4 rounded-lg border border-white/10 text-[24px] text-white placeholder:text-white/15 focus:outline-none focus:border-white/25 transition bg-white/5 text-center font-mono tracking-[0.3em]" />
                <button onClick={() => { if (joinCode.length >= 4) navigate(`/party/${joinCode}`); }}
                  className="w-full py-3 rounded-lg bg-white text-black font-semibold text-[14px] hover:bg-white/90 active:scale-[0.98] transition">
                  join
                </button>
              </div>
              <button onClick={() => setShowJoinCode(false)} className="absolute top-4 right-4 text-white/30 hover:text-white/60 transition text-[20px]">&times;</button>
            </motion.div>
          </motion.div>
        )}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen relative">
        <div className="fixed inset-0 z-0">
          <img src="/bg.jpg" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 backdrop-blur-[12px] bg-black/50" />
        </div>
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 text-center">
          <h1 className="text-[32px] font-bold text-white mb-2">party not found</h1>
          <p className="text-white/40 text-[16px] mb-8">{error}</p>
          <button onClick={() => navigate("/")} className="px-8 py-3 rounded-full bg-white text-black font-semibold text-[14px]">
            back to bubl
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <div className="fixed inset-0 z-0">
        <img src="/bg.jpg" alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 backdrop-blur-[12px] bg-black/50" />
      </div>

      <nav className="fixed top-0 w-full z-50 border-b border-white/5">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="text-white font-bold text-[18px] tracking-[-0.03em]">bubl.</button>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[12px] text-white/30 tracking-wider">{party?.code}</span>
            <div className={`w-2 h-2 rounded-full ${allFilled ? "bg-green-500" : "bg-yellow-500"} animate-pulse`} />
          </div>
        </div>
      </nav>

      <div className="relative z-10 pt-24 pb-20 px-5 sm:px-6">
        <motion.div
          variants={sectionVariants} initial="hidden" animate="visible"
          className="max-w-2xl mx-auto"
        >

          <motion.div variants={itemVariants} className="text-center mb-12">
            <h1 className="text-[40px] sm:text-[56px] font-bold tracking-[-0.04em] text-white leading-[0.95]">
              double date
            </h1>
            <p className="mt-3 text-white/40 text-[16px] sm:text-[18px]">
              2v2 &middot; every match brings a friend
            </p>
          </motion.div>

          {/* 2x2 grid: guys left, girls right */}
          <motion.div variants={sectionVariants} className="grid grid-cols-[1fr_1px_1fr] gap-x-6 sm:gap-x-10 gap-y-4 mb-10 items-start">
            {/* Row 1 */}
            <SlotCard slot={mySlots[0] || { position: 0, role: viewerSide || "guy", is_host: true, name: null, filled: false }} onJoin={() => setJoinModal(viewerSide || "guy")} />
            <div className="bg-white/10 self-stretch row-span-2" />
            <SlotCard slot={otherSlots[0] || { position: 2, role: viewerSide === "girl" ? "guy" : "girl", is_host: false, name: null, filled: false }} onJoin={() => {}} blurred={otherSlots[0]?.filled} mystery={!otherSlots[0]?.filled} />
            {/* Row 2 */}
            <SlotCard slot={mySlots[1] || { position: 1, role: viewerSide || "guy", is_host: false, name: null, filled: false }} onJoin={() => setJoinModal(viewerSide || "guy")} />
            <SlotCard slot={otherSlots[1] || { position: 3, role: viewerSide === "girl" ? "guy" : "girl", is_host: false, name: null, filled: false }} onJoin={() => {}} blurred={otherSlots[1]?.filled} mystery={!otherSlots[1]?.filled} />
          </motion.div>

          <motion.div variants={itemVariants} className="text-center mb-8">
            {allFilled ? (
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-6 py-4">
                <p className="text-green-400 font-semibold text-[16px]">you're matched — double date time</p>
                <p className="text-green-400/50 text-[13px] mt-1">details drop thursday</p>
              </div>
            ) : myDuoFull ? (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-6 py-4">
                <p className="text-yellow-400 font-semibold text-[16px]">duo ready — searching for a match...</p>
                <p className="text-yellow-400/50 text-[13px] mt-1">we'll match you with another duo</p>
              </div>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-xl px-6 py-4">
                <p className="text-white/60 text-[15px]">
                  invite your friend to complete your duo
                </p>
              </div>
            )}
          </motion.div>

          {joinError && (
            <p className="text-red-400 text-[13px] text-center mb-4">{joinError}</p>
          )}

          <motion.div variants={itemVariants} className="flex flex-col items-center gap-4">
            <p className="font-mono text-[40px] sm:text-[56px] font-bold tracking-[0.25em] text-white/15 select-all">{party?.code}</p>
            <button
              onClick={copyLink}
              className="px-8 py-3 rounded-full bg-white text-black font-semibold text-[14px] hover:bg-white/90 active:scale-[0.97] transition"
            >
              {copied ? "copied!" : "copy invite link"}
            </button>
          </motion.div>

          <motion.div variants={itemVariants} className="mt-16 border-t border-white/5 pt-10">
            <p className="text-white/30 text-[13px] uppercase tracking-widest font-semibold mb-6 text-center">how it works</p>
            <div className="grid sm:grid-cols-3 gap-6 text-center">
              {[
                { step: "01", text: "start a party and invite your friend" },
                { step: "02", text: "your duo gets matched with another duo" },
                { step: "03", text: "thursday hits — double date time" },
              ].map((s) => (
                <div key={s.step}>
                  <span className="font-mono text-[11px] text-white/15">{s.step}</span>
                  <p className="text-white/40 text-[14px] mt-2 leading-relaxed">{s.text}</p>
                </div>
              ))}
            </div>
          </motion.div>

        </motion.div>
      </div>

      {joinModal && (
        <JoinModal role={joinModal} onClose={() => setJoinModal(null)} onSubmit={handleJoin} submitting={submitting} />
      )}
    </div>
  );
}
