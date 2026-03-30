import { useState, useEffect } from "react";
import { Search, X, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";

interface Conversation {
  id: string;
  role: string;
  content: string;
  media_url?: string;
  created_at: string;
}

interface BublProfile {
  name: string;
  age?: number;
  gender?: string;
  bio?: string;
  photo_urls: string[];
  interests: string[];
  location?: string;
  school?: string;
  looking_for?: string;
  verified: boolean;
  active: boolean;
  stats: Record<string, number>;
}

interface UserState {
  data: Record<string, unknown>;
  conversation_count: number;
  last_active: string;
}

interface MatchInfo {
  id: string;
  person_a_phone: string;
  person_b_phone: string;
  person_a_name: string;
  person_b_name: string;
  person_a_ready: boolean;
  person_b_ready: boolean;
  status: string;
  created_at: string;
}

interface PartySlotInfo {
  id: string;
  role: string;
  is_host: boolean;
  name: string | null;
  phone: string | null;
  filled: boolean;
  position: number;
}

interface PartyInfo {
  party: {
    id: string;
    code: string;
    status: string;
    slots: PartySlotInfo[];
  };
  slot: PartySlotInfo;
  teammate: PartySlotInfo | null;
}

interface Signup {
  id: string;
  name: string;
  phone: string;
  gender?: string;
  looking_for?: string;
  hobbies: string[];
  status: string;
  school_id_url?: string;
  created_at: string;
  profile?: BublProfile | null;
  conversations?: Conversation[];
  user_state?: UserState | null;
  match?: MatchInfo | null;
  party_info?: PartyInfo | null;
}

const ADMIN_PASS = "bubl2026";

export function AdminPage() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem("bubl-admin") === "true");
  const [passInput, setPassInput] = useState("");
  const [passError, setPassError] = useState(false);
  const [signups, setSignups] = useState<Signup[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Signup | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConvos, setShowConvos] = useState(false);

  useEffect(() => { if (authed) loadData(); }, [authed]);

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-[24px] font-bold text-white mb-1">bubl.</h1>
          <p className="text-white/30 text-[13px] mb-6">admin access</p>
          <input
            type="password"
            value={passInput}
            onChange={e => { setPassInput(e.target.value); setPassError(false); }}
            onKeyDown={e => {
              if (e.key === "Enter") {
                if (passInput === ADMIN_PASS) {
                  sessionStorage.setItem("bubl-admin", "true");
                  setAuthed(true);
                } else {
                  setPassError(true);
                }
              }
            }}
            placeholder="password"
            className={`w-[240px] px-4 py-2.5 bg-white/5 border ${passError ? 'border-red-500/50' : 'border-white/10'} rounded-lg text-[14px] text-white text-center placeholder-white/20 focus:outline-none focus:border-white/20`}
            autoFocus
          />
          {passError && <p className="text-red-400 text-[12px] mt-2">wrong password</p>}
        </div>
      </div>
    );
  }

  const DEMO_USER: Signup = {
    id: "demo-001",
    name: "Sophia Kim",
    phone: "+19495551234",
    gender: "female",
    looking_for: "male",
    hobbies: ["boba runs", "kdramas", "volleyball", "thrifting"],
    status: "waiting",
    school_id_url: undefined,
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    profile: {
      name: "Sophia Kim",
      age: 17,
      gender: "female",
      bio: "looking for someone to get boba with after school",
      photo_urls: [],
      interests: ["music", "cooking", "beach days"],
      location: "Irvine, CA",
      school: "University High",
      looking_for: "male",
      verified: true,
      active: true,
      stats: { matches: 0, likes: 3, weeks_active: 1 },
    },
    conversations: [
      { id: "c1", role: "user", content: "Hey! I just signed up", created_at: new Date(Date.now() - 2 * 86400000).toISOString() },
      { id: "c2", role: "agent", content: "Welcome to bubl! You're on the waitlist. We match every Thursday — stay tuned!", created_at: new Date(Date.now() - 2 * 86400000 + 5000).toISOString() },
      { id: "c3", role: "user", content: "How does matching work?", created_at: new Date(Date.now() - 86400000).toISOString() },
      { id: "c4", role: "agent", content: "Every Thursday we pair you with someone based on your interests and preferences. You'll get their name via iMessage and can start chatting!", created_at: new Date(Date.now() - 86400000 + 4000).toISOString() },
      { id: "c5", role: "user", content: "That sounds fun, can't wait!", created_at: new Date(Date.now() - 86400000 + 10000).toISOString() },
      { id: "c6", role: "agent", content: "We're excited to match you! Hang tight til Thursday :)", created_at: new Date(Date.now() - 86400000 + 14000).toISOString() },
    ],
    user_state: {
      data: { onboarded: true, preferences_set: true },
      conversation_count: 6,
      last_active: new Date(Date.now() - 86400000 + 14000).toISOString(),
    },
    match: null,
    party_info: {
      party: {
        id: "demo-party",
        code: "BOBA42",
        status: "waiting",
        slots: [
          { id: "s1", role: "girl", is_host: true, name: "Sophia Kim", phone: "+19495551234", filled: true, position: 0 },
          { id: "s2", role: "girl", is_host: false, name: "Emily Chen", phone: "+19495559876", filled: true, position: 1 },
          { id: "s3", role: "guy", is_host: false, name: null, phone: null, filled: false, position: 2 },
          { id: "s4", role: "guy", is_host: false, name: null, phone: null, filled: false, position: 3 },
        ],
      },
      slot: { id: "s1", role: "girl", is_host: true, name: "Sophia Kim", phone: "+19495551234", filled: true, position: 0 },
      teammate: { id: "s2", role: "girl", is_host: false, name: "Emily Chen", phone: "+19495559876", filled: true, position: 1 },
    },
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/blind-date/admin/signups");
      const data = await res.json();
      setSignups([DEMO_USER, ...(data.signups || [])]);
    } catch (e) {
      console.error("Failed to load:", e);
      setSignups([DEMO_USER]);
    }
    setLoading(false);
  };

  const removeSignup = async (id: string) => {
    if (!confirm("Remove this person from the waitlist?")) return;
    try {
      await fetch(`/api/blind-date/admin/signups/${id}`, { method: "DELETE" });
      setSignups(prev => prev.filter(s => s.id !== id));
      if (selected?.id === id) setSelected(null);
    } catch (e) { console.error("Failed to remove:", e); }
  };

  const filtered = signups.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.phone.includes(search) ||
    (s.profile?.school || "").toLowerCase().includes(search.toLowerCase())
  );

  const convos = (selected?.conversations || []).slice().sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex">
      {/* Sidebar — user list */}
      <div className="w-[340px] border-r border-white/5 flex flex-col h-screen">
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-[18px] font-bold">bubl.</span>
              <span className="text-white/30 text-[12px]">admin</span>
            </div>
            <span className="text-white/30 text-[12px]">{signups.length} users</span>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-white/20" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="search name, phone, school..."
              className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/8 rounded-lg text-[13px] text-white placeholder-white/20 focus:outline-none focus:border-white/15" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="text-center text-white/20 py-10 text-[13px]">loading...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-white/20 py-10 text-[13px]">no users</p>
          ) : (
            filtered.map(s => (
              <button key={s.id} onClick={() => { setSelected(s); setShowConvos(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition border-b border-white/[0.03] ${
                  selected?.id === s.id ? "bg-white/[0.06]" : "hover:bg-white/[0.03]"
                }`}>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500/30 to-purple-500/30 flex items-center justify-center shrink-0">
                  {s.school_id_url ? (
                    <img src={s.school_id_url} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <span className="text-[15px] font-bold text-pink-400">{s.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-[14px] font-medium truncate">{s.name}</p>
                  <p className="text-white/30 text-[12px] truncate">
                    {s.phone} {s.profile?.school ? `· ${s.profile.school}` : ""}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                    s.status === "waiting" ? "bg-yellow-500/10 text-yellow-400" :
                    s.status === "matched" ? "bg-green-500/10 text-green-400" :
                    "bg-white/5 text-white/30"
                  }`}>{s.status}</span>
                  {(s.conversations?.length || 0) > 0 && (
                    <span className="text-white/15 text-[10px] flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" /> {s.conversations!.length}
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main — user profile card */}
      <div className="flex-1 overflow-y-auto p-8">
        {selected ? (
          <div className="max-w-2xl mx-auto">
            <button onClick={() => setSelected(null)}
              className="mb-4 text-white/30 hover:text-white/60 transition">
              <X className="w-5 h-5" />
            </button>

            {/* Profile card */}
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl overflow-hidden">
              {/* Photo */}
              {selected.school_id_url && (
                <div className="w-full aspect-[4/3] bg-white/[0.02]">
                  <img src={selected.school_id_url} className="w-full h-full object-cover" />
                </div>
              )}

              {/* Profile photos */}
              {selected.profile?.photo_urls && (selected.profile.photo_urls as string[]).length > 0 && (
                <div className="flex gap-2 p-4 overflow-x-auto">
                  {(selected.profile.photo_urls as string[]).map((url, i) => (
                    <img key={i} src={url} className="w-24 h-24 rounded-lg object-cover shrink-0" />
                  ))}
                </div>
              )}

              <div className="p-6 space-y-5">
                {/* Name + basics */}
                <div>
                  <h2 className="text-[28px] font-bold text-white">
                    {selected.name}
                    {selected.profile?.age && <span className="text-white/40 font-normal ml-2">{selected.profile.age}</span>}
                  </h2>
                  <p className="text-white/40 text-[14px] mt-1">{selected.phone}</p>
                  {selected.profile?.bio && (
                    <p className="text-white/50 text-[14px] mt-2 italic">"{selected.profile.bio}"</p>
                  )}
                </div>

                <div className="h-px bg-white/5" />

                {/* Grid of info */}
                <div className="grid grid-cols-2 gap-4">
                  <ProfileRow label="Status" value={
                    <span className={`text-[13px] px-3 py-1 rounded-full ${
                      selected.status === "waiting" ? "bg-yellow-500/10 text-yellow-400" :
                      selected.status === "matched" ? "bg-green-500/10 text-green-400" :
                      "bg-white/5 text-white/30"
                    }`}>{selected.status}</span>
                  } />
                  <ProfileRow label="Gender" value={<span className="text-white/70 text-[14px]">{selected.gender || selected.profile?.gender || "—"}</span>} />
                  <ProfileRow label="Looking for" value={<span className="text-white/70 text-[14px]">{selected.looking_for || selected.profile?.looking_for || "—"}</span>} />
                  <ProfileRow label="School" value={<span className="text-white/70 text-[14px]">{selected.profile?.school || "—"}</span>} />
                  <ProfileRow label="Location" value={<span className="text-white/70 text-[14px]">{selected.profile?.location || "—"}</span>} />
                  <ProfileRow label="Verified" value={
                    <span className={`text-[13px] ${selected.profile?.verified ? "text-green-400" : "text-white/30"}`}>
                      {selected.profile?.verified ? "yes" : "no"}
                    </span>
                  } />
                  <ProfileRow label="Signed up" value={
                    <span className="text-white/50 text-[13px]">{new Date(selected.created_at).toLocaleString()}</span>
                  } />
                  <ProfileRow label="Last active" value={
                    <span className="text-white/50 text-[13px]">
                      {selected.user_state?.last_active ? new Date(selected.user_state.last_active).toLocaleString() : "—"}
                    </span>
                  } />
                </div>

                {/* Hobbies / Interests */}
                <ProfileRow label="Hobbies & Interests" value={
                  (() => {
                    const tags = [
                      ...(Array.isArray(selected.hobbies) ? selected.hobbies : []),
                      ...(Array.isArray(selected.profile?.interests) ? selected.profile!.interests as string[] : []),
                    ];
                    const unique = [...new Set(tags)];
                    return unique.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {unique.map(h => (
                          <span key={h} className="text-[12px] px-2.5 py-1 rounded-full bg-white/5 text-white/50">{h}</span>
                        ))}
                      </div>
                    ) : <span className="text-white/30 text-[14px]">—</span>;
                  })()
                } />

                {/* Stats */}
                {selected.profile?.stats && Object.keys(selected.profile.stats).length > 0 && (
                  <ProfileRow label="Stats" value={
                    <div className="flex gap-4">
                      {Object.entries(selected.profile.stats).map(([k, v]) => (
                        <div key={k} className="text-center">
                          <p className="text-white text-[18px] font-bold">{v}</p>
                          <p className="text-white/30 text-[11px]">{k}</p>
                        </div>
                      ))}
                    </div>
                  } />
                )}

                {/* Match info */}
                {selected.match && (
                  <>
                    <div className="h-px bg-white/5" />
                    <ProfileRow label="Match" value={
                      <div className="bg-white/[0.03] rounded-lg p-3 space-y-1">
                        <p className="text-white/70 text-[13px]">
                          {selected.match.person_a_name} + {selected.match.person_b_name}
                        </p>
                        <p className="text-white/40 text-[12px]">
                          status: {selected.match.status} · {new Date(selected.match.created_at).toLocaleDateString()}
                        </p>
                        <div className="flex gap-3 mt-1">
                          <span className={`text-[11px] ${selected.match.person_a_ready ? "text-green-400" : "text-white/30"}`}>
                            A: {selected.match.person_a_ready ? "ready" : "not ready"}
                          </span>
                          <span className={`text-[11px] ${selected.match.person_b_ready ? "text-green-400" : "text-white/30"}`}>
                            B: {selected.match.person_b_ready ? "ready" : "not ready"}
                          </span>
                        </div>
                      </div>
                    } />
                  </>
                )}

                {/* Party info */}
                {selected.party_info && (
                  <>
                    <div className="h-px bg-white/5" />
                    <ProfileRow label="Party" value={
                      <div className="bg-white/[0.03] rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-white/70 text-[14px] font-mono font-bold">{selected.party_info.party.code}</span>
                            {selected.party_info.slot.is_host && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400">host</span>
                            )}
                          </div>
                          <span className={`text-[11px] px-2 py-0.5 rounded-full ${
                            selected.party_info.party.status === "matched" ? "bg-green-500/10 text-green-400" :
                            selected.party_info.party.status === "full" ? "bg-blue-500/10 text-blue-400" :
                            "bg-yellow-500/10 text-yellow-400"
                          }`}>{selected.party_info.party.status}</span>
                        </div>

                        {/* Teammate */}
                        <div>
                          <p className="text-white/30 text-[10px] uppercase tracking-wider mb-1">teammate</p>
                          {selected.party_info.teammate?.filled ? (
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-pink-500/20 flex items-center justify-center">
                                <span className="text-[11px] font-bold text-pink-400">{selected.party_info.teammate.name?.charAt(0)}</span>
                              </div>
                              <div>
                                <p className="text-white/70 text-[13px]">{selected.party_info.teammate.name}</p>
                                <p className="text-white/30 text-[11px]">{selected.party_info.teammate.phone}</p>
                              </div>
                            </div>
                          ) : (
                            <p className="text-white/20 text-[12px]">waiting for teammate...</p>
                          )}
                        </div>

                        {/* All slots */}
                        <div>
                          <p className="text-white/30 text-[10px] uppercase tracking-wider mb-1.5">all slots</p>
                          <div className="grid grid-cols-2 gap-2">
                            {selected.party_info.party.slots.map(s => (
                              <div key={s.id} className={`px-3 py-2 rounded-lg text-[12px] ${
                                s.phone === selected.phone
                                  ? "bg-white/[0.08] border border-white/10"
                                  : "bg-white/[0.03]"
                              }`}>
                                <div className="flex items-center gap-1.5">
                                  <span className={`w-2 h-2 rounded-full ${s.role === "guy" ? "bg-blue-400" : "bg-pink-400"}`} />
                                  <span className={s.filled ? "text-white/60" : "text-white/20"}>
                                    {s.filled ? s.name : "empty"}
                                  </span>
                                </div>
                                {s.is_host && <span className="text-white/20 text-[10px]">host</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    } />
                  </>
                )}

                {/* Conversation count + toggle */}
                <div className="h-px bg-white/5" />
                <button
                  onClick={() => setShowConvos(!showConvos)}
                  className="w-full flex items-center justify-between py-2 text-white/50 hover:text-white/70 transition"
                >
                  <span className="text-[13px] font-medium flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Messages ({convos.length})
                    {selected.user_state?.conversation_count ? ` · ${selected.user_state.conversation_count} total` : ""}
                  </span>
                  {showConvos ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {/* Conversation history */}
                {showConvos && convos.length > 0 && (
                  <div className="max-h-[500px] overflow-y-auto space-y-2 bg-white/[0.02] rounded-lg p-3">
                    {convos.map(c => (
                      <div key={c.id} className={`flex ${c.role === "agent" ? "justify-start" : "justify-end"}`}>
                        <div className={`max-w-[80%] px-3 py-2 rounded-xl text-[13px] ${
                          c.role === "agent"
                            ? "bg-white/[0.06] text-white/60"
                            : "bg-blue-500/20 text-blue-200"
                        }`}>
                          <p>{c.content}</p>
                          {c.media_url && (
                            <img src={c.media_url} className="mt-1 max-w-full rounded-lg" />
                          )}
                          <p className="text-white/20 text-[10px] mt-1">
                            {new Date(c.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {showConvos && convos.length === 0 && (
                  <p className="text-white/20 text-[13px] text-center py-4">no messages yet</p>
                )}

                {/* User state data */}
                {selected.user_state?.data && Object.keys(selected.user_state.data).length > 0 && (
                  <>
                    <div className="h-px bg-white/5" />
                    <ProfileRow label="User State Data" value={
                      <pre className="text-white/40 text-[11px] bg-white/[0.02] rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(selected.user_state.data, null, 2)}
                      </pre>
                    } />
                  </>
                )}

                <button onClick={() => removeSignup(selected.id)}
                  className="w-full mt-2 py-2.5 rounded-xl bg-red-500/10 text-red-400 text-[13px] font-medium hover:bg-red-500/20 transition">
                  Remove from waitlist
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-white/15 text-[15px]">select a user to view their profile</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-white/30 text-[11px] uppercase tracking-wider mb-1.5">{label}</p>
      {value}
    </div>
  );
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}
