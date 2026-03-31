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

const px = { fontFamily: "'Press Start 2P', monospace" };

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
  const accent = isGuy ? "#29adff" : "#ff77a8";
  const accentDark = isGuy ? "#1a6faa" : "#aa4070";

  return (
    <motion.div
      variants={itemVariants}
      className="relative flex flex-col group cursor-pointer"
      style={{ width: "100%" }}
      onClick={() => !slot.filled && !mystery && onJoin()}
    >
      {/* Card body — square pixel style */}
      <div
        className="relative flex-1 flex flex-col items-center justify-center"
        style={{
          minHeight: 320,
          background: slot.filled ? "#1d2b53" : "#0d0d1a",
          border: slot.filled ? `4px solid ${accent}` : "4px dashed #c2c3c7",
          boxShadow: slot.filled ? `4px 4px 0 ${accentDark}` : "4px 4px 0 #0a0a12",
        }}
      >
        {/* Top accent line */}
        {slot.filled && (
          <div className="absolute top-0 left-0 right-0 h-[4px]" style={{ background: accent }} />
        )}

        {slot.filled ? (
          blurred ? (
            <>
              {/* Big question mark */}
              <span className="text-[48px] sm:text-[56px] font-bold select-none" style={{ ...px, color: "rgba(255,255,255,0.15)" }}>?</span>
            </>
          ) : (
            <>
              {/* Big emoji avatar */}
              <div className="text-[64px] sm:text-[72px] mb-2 select-none">
                {isGuy ? "🧑" : "👩"}
              </div>
              {/* Ready badge */}
              <div
                className="px-3 py-1 text-[8px] font-bold uppercase tracking-[0.2em] mb-1"
                style={{ ...px, background: accent, color: "#0d0d1a", boxShadow: `2px 2px 0 ${accentDark}` }}
              >
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
              className="w-14 h-14 flex items-center justify-center"
              style={{ border: "2px dashed #c2c3c7" }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c2c3c7" strokeWidth="2" strokeLinecap="square">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </div>
            <p className="text-[8px] mt-3 uppercase tracking-widest" style={{ ...px, color: "#c2c3c7" }}>invite</p>
          </>
        )}
      </div>

      {/* Bottom banner / nameplate */}
      <div
        className="relative py-3 text-center"
        style={{
          background: slot.filled ? "#1d2b53" : "transparent",
          borderLeft: slot.filled ? `4px solid ${accent}` : "none",
          borderRight: slot.filled ? `4px solid ${accent}` : "none",
          borderBottom: slot.filled ? `4px solid ${accent}` : "none",
          boxShadow: slot.filled ? `4px 4px 0 ${accentDark}` : "none",
        }}
      >
        {slot.filled ? (
          <>
            <p className="text-[10px] sm:text-[11px] tracking-wide" style={{ ...px, color: "#fff1e8" }}>
              {blurred ? "? ? ?" : slot.name}
            </p>
            <p className="text-[7px] uppercase tracking-[0.15em] mt-1" style={{ ...px, color: "#c2c3c7" }}>
              {blurred ? "mystery" : slot.is_host ? "matched" : "joined"}
            </p>
          </>
        ) : mystery ? (
          <p className="text-white/10 text-[13px]">? ? ?</p>
        ) : (
          <p className="text-[8px]" style={{ ...px, color: "#c2c3c7" }}>empty slot</p>
        )}
      </div>

      {/* Bottom pixel ornament */}
      {slot.filled && (
        <div className="flex justify-center mt-1">
          <div className="w-3 h-3" style={{ background: accent, boxShadow: `2px 2px 0 ${accentDark}` }} />
        </div>
      )}
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
      style={px}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/80" />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="relative p-8 w-full max-w-sm"
        style={{ background: "#1d2b53", border: "4px solid #29adff", boxShadow: "6px 6px 0 #1a6faa" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-[14px] mb-1" style={{ color: "#ffec27" }}>join the party</h3>
        <p className="text-[8px] mb-6" style={{ color: "#c2c3c7" }}>you're joining as {role === "guy" ? "his" : "her"} +1</p>

        <div className="space-y-3">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="your name"
            className="w-full px-4 py-3 text-[10px] placeholder:text-[#c2c3c7] focus:outline-none"
            style={{ ...px, background: "#1d2b53", border: "4px solid #29adff", color: "#fff1e8", boxShadow: "inset 2px 2px 0 #0d0d1a" }} />
          <div>
            <input type="tel" value={phone} onChange={(e) => setPhone(fmt(e.target.value))} placeholder="phone"
              className="w-full px-4 py-3 text-[10px] placeholder:text-[#c2c3c7] focus:outline-none"
              style={{ ...px, background: "#1d2b53", border: "4px solid #29adff", color: "#fff1e8", boxShadow: "inset 2px 2px 0 #0d0d1a" }} />
            <p className="text-[7px] mt-1 ml-1" style={{ color: "#c2c3c7" }}>iMessage required</p>
          </div>
          <button
            onClick={() => { if (name.trim() && phone.trim()) onSubmit(name.trim(), phone.trim()); }}
            disabled={submitting}
            className="w-full py-3 text-[10px] font-bold uppercase tracking-wider active:translate-y-[2px] disabled:opacity-50"
            style={{ ...px, background: "#00e436", color: "#0d0d1a", border: "4px solid #00e436", boxShadow: "4px 4px 0 #00802a" }}
          >
            {submitting ? ". . ." : "I'm in"}
          </button>
        </div>

        <button onClick={onClose} className="absolute top-3 right-4 text-[16px] hover:opacity-80" style={{ color: "#ff004d" }}>&times;</button>
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
      <div className="min-h-screen flex items-center justify-center" style={{ ...px, background: "#0d0d1a" }}>
        <p className="text-[10px] animate-pulse" style={{ color: "#ffec27" }}>loading...</p>
      </div>
    );
  }

  // No code provided — show start/join landing
  if (!code) {
    return (
      <div className="min-h-screen relative" style={{ ...px, background: "#0d0d1a" }}>
        <nav className="fixed top-0 w-full z-50" style={{ borderBottom: "4px solid #1d2b53" }}>
          <div className="max-w-4xl mx-auto px-6 h-14 flex items-center">
            <button onClick={() => navigate("/")} className="text-[14px] tracking-wide" style={{ ...px, color: "#ffec27" }}>bubl.</button>
          </div>
        </nav>
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 text-center">
          <h1 className="text-[24px] sm:text-[32px] leading-[1.3] mb-3" style={{ color: "#fff1e8" }}>
            double date
          </h1>
          <p className="text-[8px] sm:text-[10px] mb-12" style={{ color: "#c2c3c7" }}>2v2 -- every match brings a friend</p>

          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
            <button
              onClick={() => setShowCreate(true)}
              className="flex-1 py-4 text-[10px] uppercase tracking-wider active:translate-y-[2px]"
              style={{ ...px, background: "#ffec27", color: "#0d0d1a", border: "4px solid #ffec27", boxShadow: "4px 4px 0 #aa9e1a" }}
            >
              start lobby
            </button>
            <button
              onClick={() => setShowJoinCode(true)}
              className="flex-1 py-4 text-[10px] uppercase tracking-wider active:translate-y-[2px]"
              style={{ ...px, background: "transparent", color: "#29adff", border: "4px solid #29adff", boxShadow: "4px 4px 0 #1a6faa" }}
            >
              join lobby
            </button>
          </div>
        </div>

        {/* Create lobby modal */}
        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => setShowCreate(false)}>
            <div className="absolute inset-0 bg-black/80" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="relative p-8 w-full max-w-sm"
              style={{ background: "#1d2b53", border: "4px solid #29adff", boxShadow: "6px 6px 0 #1a6faa" }}
              onClick={e => e.stopPropagation()}>
              <h3 className="text-[12px] mb-1" style={{ color: "#ffec27" }}>start a lobby</h3>
              <p className="text-[7px] mb-6" style={{ color: "#c2c3c7" }}>enter both matched people to create the party</p>
              <div className="space-y-4">
                <div>
                  <p className="text-[8px] uppercase tracking-widest mb-2" style={{ color: "#29adff" }}>his side</p>
                  <input type="text" value={createData.guyName} onChange={e => setCreateData(d => ({ ...d, guyName: e.target.value }))} placeholder="name"
                    className="w-full px-4 py-3 text-[10px] placeholder:text-[#c2c3c7] focus:outline-none mb-2"
                    style={{ ...px, background: "#1d2b53", border: "4px solid #29adff", color: "#fff1e8", boxShadow: "inset 2px 2px 0 #0d0d1a" }} />
                  <input type="tel" value={createData.guyPhone} onChange={e => setCreateData(d => ({ ...d, guyPhone: fmt(e.target.value) }))} placeholder="phone"
                    className="w-full px-4 py-3 text-[10px] placeholder:text-[#c2c3c7] focus:outline-none"
                    style={{ ...px, background: "#1d2b53", border: "4px solid #29adff", color: "#fff1e8", boxShadow: "inset 2px 2px 0 #0d0d1a" }} />
                </div>
                <div>
                  <p className="text-[8px] uppercase tracking-widest mb-2" style={{ color: "#ff77a8" }}>her side</p>
                  <input type="text" value={createData.girlName} onChange={e => setCreateData(d => ({ ...d, girlName: e.target.value }))} placeholder="name"
                    className="w-full px-4 py-3 text-[10px] placeholder:text-[#c2c3c7] focus:outline-none mb-2"
                    style={{ ...px, background: "#1d2b53", border: "4px solid #ff77a8", color: "#fff1e8", boxShadow: "inset 2px 2px 0 #0d0d1a" }} />
                  <input type="tel" value={createData.girlPhone} onChange={e => setCreateData(d => ({ ...d, girlPhone: fmt(e.target.value) }))} placeholder="phone"
                    className="w-full px-4 py-3 text-[10px] placeholder:text-[#c2c3c7] focus:outline-none"
                    style={{ ...px, background: "#1d2b53", border: "4px solid #ff77a8", color: "#fff1e8", boxShadow: "inset 2px 2px 0 #0d0d1a" }} />
                </div>
                <div>
                  <p className="text-[7px] uppercase tracking-widest mb-2" style={{ color: "#c2c3c7" }}>which one are you?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCreateData(d => ({ ...d, iAm: "guy" }))}
                      className="flex-1 py-2.5 text-[8px] active:translate-y-[2px]"
                      style={{
                        ...px,
                        background: createData.iAm === "guy" ? "#29adff" : "transparent",
                        color: createData.iAm === "guy" ? "#0d0d1a" : "#29adff",
                        border: "4px solid #29adff",
                        boxShadow: createData.iAm === "guy" ? "4px 4px 0 #1a6faa" : "none",
                      }}
                    >
                      guys
                    </button>
                    <button
                      onClick={() => setCreateData(d => ({ ...d, iAm: "girl" }))}
                      className="flex-1 py-2.5 text-[8px] active:translate-y-[2px]"
                      style={{
                        ...px,
                        background: createData.iAm === "girl" ? "#ff77a8" : "transparent",
                        color: createData.iAm === "girl" ? "#0d0d1a" : "#ff77a8",
                        border: "4px solid #ff77a8",
                        boxShadow: createData.iAm === "girl" ? "4px 4px 0 #aa4070" : "none",
                      }}
                    >
                      girls
                    </button>
                  </div>
                </div>
                {createError && <p className="text-[8px] text-center" style={{ color: "#ff004d" }}>{createError}</p>}
                <button onClick={handleCreate} disabled={creating}
                  className="w-full py-3 text-[10px] uppercase tracking-wider active:translate-y-[2px] disabled:opacity-50"
                  style={{ ...px, background: "#00e436", color: "#0d0d1a", border: "4px solid #00e436", boxShadow: "4px 4px 0 #00802a" }}>
                  {creating ? ". . ." : "create party"}
                </button>
              </div>
              <button onClick={() => setShowCreate(false)} className="absolute top-3 right-4 text-[16px] hover:opacity-80" style={{ color: "#ff004d" }}>&times;</button>
            </motion.div>
          </motion.div>
        )}

        {/* Join with code modal */}
        {showJoinCode && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => setShowJoinCode(false)}>
            <div className="absolute inset-0 bg-black/80" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="relative p-8 w-full max-w-sm"
              style={{ background: "#1d2b53", border: "4px solid #29adff", boxShadow: "6px 6px 0 #1a6faa" }}
              onClick={e => e.stopPropagation()}>
              <h3 className="text-[12px] mb-1" style={{ color: "#ffec27" }}>join a lobby</h3>
              <p className="text-[7px] mb-6" style={{ color: "#c2c3c7" }}>enter your party code</p>
              <div className="space-y-3">
                <input type="text" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))} placeholder="XXXXXX"
                  className="w-full px-4 py-4 text-[16px] text-center tracking-[0.3em] placeholder:text-[#c2c3c7] focus:outline-none"
                  style={{ ...px, background: "#1d2b53", border: "4px solid #29adff", color: "#fff1e8", boxShadow: "inset 2px 2px 0 #0d0d1a" }} />
                <button onClick={() => { if (joinCode.length >= 4) navigate(`/party/${joinCode}`); }}
                  className="w-full py-3 text-[10px] uppercase tracking-wider active:translate-y-[2px]"
                  style={{ ...px, background: "#00e436", color: "#0d0d1a", border: "4px solid #00e436", boxShadow: "4px 4px 0 #00802a" }}>
                  join
                </button>
              </div>
              <button onClick={() => setShowJoinCode(false)} className="absolute top-3 right-4 text-[16px] hover:opacity-80" style={{ color: "#ff004d" }}>&times;</button>
            </motion.div>
          </motion.div>
        )}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen relative" style={{ ...px, background: "#0d0d1a" }}>
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 text-center">
          <h1 className="text-[16px] mb-4" style={{ color: "#ff004d" }}>party not found</h1>
          <p className="text-[8px] mb-8" style={{ color: "#c2c3c7" }}>{error}</p>
          <button onClick={() => navigate("/")}
            className="px-8 py-3 text-[10px] uppercase tracking-wider active:translate-y-[2px]"
            style={{ ...px, background: "#ffec27", color: "#0d0d1a", border: "4px solid #ffec27", boxShadow: "4px 4px 0 #aa9e1a" }}>
            back to bubl
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative" style={{ ...px, background: "#0d0d1a" }}>
      {/* Pixel star decorations */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {[
          { top: "8%", left: "5%", size: 3 },
          { top: "15%", left: "80%", size: 2 },
          { top: "25%", left: "20%", size: 2 },
          { top: "35%", left: "90%", size: 3 },
          { top: "50%", left: "10%", size: 2 },
          { top: "60%", left: "75%", size: 3 },
          { top: "70%", left: "40%", size: 2 },
          { top: "85%", left: "60%", size: 2 },
          { top: "92%", left: "15%", size: 3 },
        ].map((star, i) => (
          <div key={i} className="absolute animate-pulse" style={{ top: star.top, left: star.left, width: star.size, height: star.size, background: "#fff1e8" }} />
        ))}
      </div>

      <nav className="fixed top-0 w-full z-50" style={{ borderBottom: "4px solid #1d2b53", background: "#0d0d1a" }}>
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="text-[14px] tracking-wide" style={{ ...px, color: "#ffec27" }}>bubl.</button>
          <div className="flex items-center gap-3">
            <span className="text-[8px] tracking-wider" style={{ ...px, color: "#c2c3c7" }}>{party?.code}</span>
            <div className="w-3 h-3 animate-pulse" style={{ background: allFilled ? "#00e436" : "#ffec27" }} />
          </div>
        </div>
      </nav>

      <div className="relative z-10 pt-24 pb-20 px-5 sm:px-6">
        <div className="relative max-w-2xl mx-auto">

        <motion.div
          variants={sectionVariants} initial="hidden" animate="visible"
          className="relative px-8 sm:px-12 py-12"
          style={{
            background: "#1d2b53",
            border: "4px solid #29adff",
            boxShadow: "8px 8px 0 #0a0a12",
          }}
        >

          <motion.div variants={itemVariants} className="text-center mb-12">
            <h1 className="text-[20px] sm:text-[28px] leading-[1.4]" style={{ color: "#fff1e8" }}>
              double date
            </h1>
            <p className="mt-3 text-[8px] sm:text-[9px]" style={{ color: "#c2c3c7" }}>
              2v2 -- every match brings a friend
            </p>
          </motion.div>

          {/* 4-card row: guys | VS | girls */}
          <motion.div variants={sectionVariants} className="flex items-center gap-3 sm:gap-5 mb-10">
            {/* Guys side */}
            <div className="flex-1 flex gap-3 sm:gap-4">
              {slots.filter(s => s.role === "guy").map((s) => (
                <SlotCard key={s.position} slot={s} onJoin={() => setJoinModal("guy")} blurred={!!viewerSide && viewerSide !== "guy" && s.filled} />
              ))}
            </div>

            {/* VS divider */}
            <div className="flex flex-col items-center gap-2 px-1">
              <div className="w-1 h-8" style={{ background: "#c2c3c7" }} />
              <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center" style={{ border: "4px solid #ffec27", background: "#0d0d1a", boxShadow: "3px 3px 0 #aa9e1a" }}>
                <span className="text-[8px] sm:text-[10px]" style={{ ...px, color: "#ffec27" }}>VS</span>
              </div>
              <div className="w-1 h-8" style={{ background: "#c2c3c7" }} />
            </div>

            {/* Girls side */}
            <div className="flex-1 flex gap-3 sm:gap-4">
              {slots.filter(s => s.role === "girl").map((s) => (
                <SlotCard key={s.position} slot={s} onJoin={() => setJoinModal("girl")} blurred={!!viewerSide && viewerSide !== "girl" && s.filled} />
              ))}
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="text-center mb-8">
            {allFilled ? (
              <div className="px-6 py-4" style={{ background: "#0d0d1a", border: "4px solid #00e436", boxShadow: "4px 4px 0 #00802a" }}>
                <p className="text-[9px]" style={{ color: "#00e436" }}>party's full -- let's go</p>
                <p className="text-[7px] mt-2" style={{ color: "#c2c3c7" }}>match details drop thursday 9-11am</p>
              </div>
            ) : (
              <div className="px-6 py-4" style={{ background: "#0d0d1a", border: "4px solid #c2c3c7", boxShadow: "4px 4px 0 #0a0a12" }}>
                <p className="text-[8px]" style={{ color: "#c2c3c7" }}>
                  {slots.filter(s => !s.filled).length} slot{slots.filter(s => !s.filled).length > 1 ? "s" : ""} left -- share the link
                </p>
              </div>
            )}
          </motion.div>

          {joinError && (
            <p className="text-[8px] text-center mb-4" style={{ color: "#ff004d" }}>{joinError}</p>
          )}

          <motion.div variants={itemVariants} className="flex flex-col items-center gap-4">
            <p className="text-[24px] sm:text-[32px] tracking-[0.25em] select-all" style={{ ...px, color: "#29adff" }}>{party?.code}</p>
            <button
              onClick={copyLink}
              className="px-8 py-3 text-[9px] uppercase tracking-wider active:translate-y-[2px]"
              style={{ ...px, background: "#ffec27", color: "#0d0d1a", border: "4px solid #ffec27", boxShadow: "4px 4px 0 #aa9e1a" }}
            >
              {copied ? "copied!" : "copy invite link"}
            </button>
          </motion.div>

          <motion.div variants={itemVariants} className="mt-16 pt-10" style={{ borderTop: "4px solid #29adff" }}>
            <p className="text-[8px] uppercase tracking-widest mb-6 text-center" style={{ color: "#ffec27" }}>how it works</p>
            <div className="grid sm:grid-cols-3 gap-6 text-center">
              {[
                { step: "01", text: "you get matched with someone" },
                { step: "02", text: "both of you invite a friend to fill the party" },
                { step: "03", text: "thursday hits -- double date time" },
              ].map((s) => (
                <div key={s.step}>
                  <span className="text-[10px]" style={{ ...px, color: "#ff004d" }}>{s.step}</span>
                  <p className="text-[7px] mt-2 leading-relaxed" style={{ color: "#c2c3c7" }}>{s.text}</p>
                </div>
              ))}
            </div>
          </motion.div>

        </motion.div>
        </div>
      </div>

      {joinModal && (
        <JoinModal role={joinModal} onClose={() => setJoinModal(null)} onSubmit={handleJoin} submitting={submitting} />
      )}
    </div>
  );
}
