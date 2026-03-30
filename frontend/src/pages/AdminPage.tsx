import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";

interface Signup {
  id: string;
  name: string;
  phone: string;
  age?: string;
  gender?: string;
  looking_for?: string;
  hobbies: string[];
  status: string;
  school_id_url?: string;
  created_at: string;
  updated_at?: string;
}

interface Team {
  id: string;
  code: string;
  player1_name: string;
  player1_phone: string;
  player1_gender: string;
  player1_ready: boolean;
  player2_name: string | null;
  player2_phone: string | null;
  player2_gender: string | null;
  player2_ready: boolean;
  status: string;
  created_at: string;
}

interface Analytics {
  totalVisits: number;
  todayVisits: number;
  weekVisits: number;
  activeLastHour: number;
}

const ADMIN_PASS = "bubl2026";

const px = { fontFamily: "'Press Start 2P', monospace" };

export function AdminPage() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem("bubl-admin") === "true");
  const [passInput, setPassInput] = useState("");
  const [passError, setPassError] = useState(false);
  const [signups, setSignups] = useState<Signup[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [analytics, setAnalytics] = useState<Analytics>({ totalVisits: 0, todayVisits: 0, weekVisits: 0, activeLastHour: 0 });
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Signup | null>(null);
  const [tab, setTab] = useState<"users" | "teams" | "activity" | "visits">("users");
  const [statFilter, setStatFilter] = useState<string | null>(null);
  const [activity, setActivity] = useState<{ id: string; action: string; actor_name: string | null; actor_phone: string | null; details: string | null; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (authed) loadData(); }, [authed]);

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#0d0d1a] flex items-center justify-center" style={px}>
        <div className="text-center">
          <h1 className="text-[20px] text-[#ff004d] mb-2" style={px}>bubl.</h1>
          <p className="text-[#c2c3c7] text-[9px] mb-8 tracking-widest" style={px}>&lt; ADMIN ACCESS &gt;</p>
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
            placeholder="PASSWORD"
            className={`w-[280px] px-4 py-3 border-4 ${passError ? 'border-[#ff004d]' : 'border-[#29adff]'} bg-[#1d2b53] text-white text-[11px] text-center placeholder-[#c2c3c7]/30 focus:outline-none focus:border-[#ffec27] rounded-none`}
            style={px}
            autoFocus
          />
          {passError && <p className="text-[#ff004d] text-[9px] mt-3" style={px}>WRONG PASSWORD</p>}
        </div>
      </div>
    );
  }

  const loadData = async () => {
    setLoading(true);
    try {
      const [signupRes, teamRes, analyticsRes, activityRes] = await Promise.all([
        fetch("/api/blind-date/admin/signups"),
        fetch("/api/blind-date/admin/teams"),
        fetch("/api/blind-date/admin/analytics"),
        fetch("/api/blind-date/admin/activity"),
      ]);
      const signupData = await signupRes.json();
      const teamData = await teamRes.json();
      const analyticsData = await analyticsRes.json();
      const activityData = await activityRes.json();
      setSignups(signupData.signups || []);
      setTeams(teamData.teams || []);
      if (analyticsData.ok) setAnalytics(analyticsData);
      setActivity(activityData.logs || []);
    } catch (e) { console.error("Failed to load:", e); }
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
    s.name.toLowerCase().includes(search.toLowerCase()) || s.phone.includes(search)
  );

  const fullTeams = teams.filter(t => t.status === "full");
  const waitingTeams = teams.filter(t => t.status === "waiting");
  const readyCount = teams.filter(t => t.player1_ready && t.player2_ready).length;

  return (
    <div className="min-h-screen bg-[#0d0d1a] text-[#fff1e8] flex flex-col" style={px}>
      {/* Top bar */}
      <div className="border-b-4 border-[#29adff] bg-[#1d2b53]/80 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-[14px] text-[#ff004d]" style={px}>bubl.</span>
            <span className="text-[#c2c3c7] text-[8px]" style={px}>ADMIN</span>
          </div>
          <button onClick={() => loadData()} className="text-[#29adff] text-[7px] hover:text-[#ffec27]" style={px}>REFRESH</button>
        </div>

        {/* Stats — horizontal scroll */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { val: analytics.activeLastHour, label: "ACTIVE 1H", color: "#00e436", filter: "active1h" },
            { val: analytics.todayVisits, label: "TODAY", color: "#29adff", filter: "today" },
            { val: analytics.weekVisits, label: "THIS WEEK", color: "#ff77a8", filter: "week" },
            { val: analytics.totalVisits, label: "ALL TIME", color: "#c2c3c7", filter: "alltime" },
            { val: signups.length, label: "SIGNUPS", color: "#ffec27", filter: "signups" },
            { val: teams.length, label: "TEAMS", color: "#29adff", filter: "teams" },
            { val: fullTeams.length, label: "FULL", color: "#00e436", filter: "full" },
            { val: readyCount, label: "READY", color: "#ff77a8", filter: "ready" },
            { val: waitingTeams.length, label: "WAITING", color: "#5f574f", filter: "waiting" },
          ].map((s, i) => (
            <button key={i} onClick={() => {
              if (["signups"].includes(s.filter)) { setTab("users"); setStatFilter(null); }
              else if (["teams", "full", "ready", "waiting"].includes(s.filter)) { setTab("teams"); setStatFilter(s.filter); }
              else { setTab("activity"); setStatFilter(s.filter); }
            }}
              className={`shrink-0 border-2 px-3 py-1.5 text-center cursor-pointer hover:opacity-80 ${statFilter === s.filter ? "ring-2 ring-white" : ""}`}
              style={{ borderColor: s.color, background: `${s.color}10` }}>
              <p className="text-[11px]" style={{ ...px, color: s.color }}>{s.val}</p>
              <p className="text-[5px] mt-0.5 text-[#c2c3c7]" style={px}>{s.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-col sm:flex-row flex-1">
      {/* Sidebar */}
      <div className="w-full sm:w-[340px] border-b-4 sm:border-b-0 sm:border-r-4 border-[#29adff] flex flex-col sm:h-[calc(100vh-90px)]">
        <div className="p-3 border-b-4 border-[#29adff]">
          {/* Tab switcher */}
          <div className="flex gap-1.5 mb-3">
            <button onClick={() => { setTab("users"); setStatFilter(null); }}
              className={`flex-1 py-2 text-[6px] border-2 ${tab === "users" ? "border-[#29adff] bg-[#29adff] text-[#1d2b53]" : "border-[#29adff]/30 text-[#c2c3c7]"}`} style={px}>
              USERS
            </button>
            <button onClick={() => { setTab("teams"); setStatFilter(null); }}
              className={`flex-1 py-2 text-[6px] border-2 ${tab === "teams" ? "border-[#ff77a8] bg-[#ff77a8] text-[#1d2b53]" : "border-[#ff77a8]/30 text-[#c2c3c7]"}`} style={px}>
              TEAMS
            </button>
            <button onClick={() => { setTab("activity"); setStatFilter(null); }}
              className={`flex-1 py-2 text-[6px] border-2 ${tab === "activity" ? "border-[#ffec27] bg-[#ffec27] text-[#1d2b53]" : "border-[#ffec27]/30 text-[#c2c3c7]"}`} style={px}>
              LOGS
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-[#29adff]" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="SEARCH..."
              className="w-full pl-10 pr-4 py-2.5 border-4 border-[#29adff] bg-[#1d2b53] text-white text-[11px] placeholder-[#c2c3c7]/30 focus:outline-none focus:border-[#ffec27] rounded-none"
              style={px} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="text-center text-[#c2c3c7] py-10 text-[9px]" style={px}>LOADING...</p>
          ) : tab === "activity" ? (
            <ActivityList activity={activity} />
          ) : tab === "users" ? (
            filtered.length === 0 ? (
              <p className="text-center text-[#c2c3c7] py-10 text-[9px]" style={px}>NO USERS</p>
            ) : (
              filtered.map(s => (
                <button key={s.id} onClick={() => setSelected(s)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b-2 border-[#1d2b53] transition-colors ${
                    selected?.id === s.id ? "bg-[#1d2b53]" : "hover:bg-[#1d2b53]/60"
                  }`}>
                  <div className="w-10 h-10 border-2 border-[#ff77a8] bg-[#1d2b53] flex items-center justify-center shrink-0">
                    <span className="text-[12px] text-[#ff77a8]" style={px}>{s.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#fff1e8] text-[9px] truncate" style={px}>{s.name}</p>
                    <p className="text-[#c2c3c7] text-[8px] truncate mt-1" style={px}>{s.phone}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className={`text-[7px] px-2 py-1 border-2 ${
                      s.status === "waiting" ? "border-[#ffec27] bg-[#ffec27]/10 text-[#ffec27]" :
                      s.status === "matched" ? "border-[#00e436] bg-[#00e436]/10 text-[#00e436]" :
                      "border-[#c2c3c7] bg-[#c2c3c7]/10 text-[#c2c3c7]"
                    }`} style={px}>{s.status.toUpperCase()}</span>
                    <span className="text-[#c2c3c7]/50 text-[7px]" style={px}>{timeAgo(s.created_at)}</span>
                  </div>
                </button>
              ))
            )
          ) : (
            /* Teams tab */
            (() => {
              let filteredTeams = teams;
              if (statFilter === "full") filteredTeams = teams.filter(t => t.status === "full");
              else if (statFilter === "ready") filteredTeams = teams.filter(t => t.player1_ready && t.player2_ready);
              else if (statFilter === "waiting") filteredTeams = teams.filter(t => t.status === "waiting");
              return filteredTeams.length === 0 ? (
              <p className="text-center text-[#c2c3c7] py-10 text-[9px]" style={px}>NO TEAMS</p>
            ) : (
              filteredTeams.map(t => (
                <div key={t.id} className="px-4 py-3 border-b-2 border-[#1d2b53]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[#29adff] text-[9px]" style={px}>{t.code}</span>
                    <span className={`text-[7px] px-2 py-1 border-2 ${
                      t.status === "full" ? "border-[#00e436] bg-[#00e436]/10 text-[#00e436]" :
                      "border-[#ffec27] bg-[#ffec27]/10 text-[#ffec27]"
                    }`} style={px}>{t.status.toUpperCase()}</span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 ${t.player1_ready ? "bg-[#00e436]" : "bg-[#ffec27]"}`} />
                      <span className="text-[#fff1e8] text-[8px]" style={px}>{t.player1_name}</span>
                      <span className="text-[#c2c3c7] text-[7px]" style={px}>{t.player1_gender}</span>
                    </div>
                    {t.player2_name ? (
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 ${t.player2_ready ? "bg-[#00e436]" : "bg-[#ffec27]"}`} />
                        <span className="text-[#fff1e8] text-[8px]" style={px}>{t.player2_name}</span>
                        <span className="text-[#c2c3c7] text-[7px]" style={px}>{t.player2_gender}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-[#5f574f]" />
                        <span className="text-[#5f574f] text-[8px]" style={px}>WAITING FOR P2</span>
                      </div>
                    )}
                  </div>
                  <p className="text-[#c2c3c7]/40 text-[7px] mt-2" style={px}>{timeAgo(t.created_at)}</p>
                </div>
              ))
            );
            })()
          )}
        </div>
      </div>

      {/* Main — user profile card */}
      <div className="flex-1 flex items-center justify-center p-8">
        {selected ? (
          <div className="max-w-md w-full">
            {/* Close button */}
            <button onClick={() => setSelected(null)}
              className="mb-4 text-[#c2c3c7] hover:text-[#fff1e8] transition">
              <X className="w-5 h-5" />
            </button>

            {/* Profile card */}
            <div className="border-4 border-[#29adff] bg-[#1d2b53] overflow-hidden">
              {/* Photo */}
              {selected.school_id_url && (
                <div className="w-full aspect-[4/3] bg-[#0d0d1a] border-b-4 border-[#29adff]">
                  <img src={selected.school_id_url} className="w-full h-full object-cover" />
                </div>
              )}

              {/* Info */}
              <div className="p-6 space-y-5">
                <div>
                  <h2 className="text-[16px] text-[#fff1e8]" style={px}>{selected.name}</h2>
                  <p className="text-[#c2c3c7] text-[9px] mt-2" style={px}>{selected.phone}</p>
                </div>

                <div className="h-[4px] bg-[#29adff]/30" />

                <ProfileRow label="STATUS" value={
                  <span className={`text-[9px] px-3 py-1.5 border-2 inline-block ${
                    selected.status === "waiting" ? "border-[#ffec27] bg-[#ffec27]/10 text-[#ffec27]" :
                    selected.status === "matched" ? "border-[#00e436] bg-[#00e436]/10 text-[#00e436]" :
                    "border-[#c2c3c7] bg-[#c2c3c7]/10 text-[#c2c3c7]"
                  }`} style={px}>{selected.status.toUpperCase()}</span>
                } />
                <ProfileRow label="GENDER" value={<span className="text-[#fff1e8]/70 text-[9px]" style={px}>{selected.gender || "---"}</span>} />
                <ProfileRow label="AGE" value={<span className="text-[#fff1e8]/70 text-[9px]" style={px}>{selected.age || "---"}</span>} />
                <ProfileRow label="SCHOOL" value={<span className="text-[#fff1e8]/70 text-[9px]" style={px}>{selected.school_id_url || "---"}</span>} />
                <ProfileRow label="PHONE" value={<span className="text-[#fff1e8]/70 text-[9px]" style={px}>{selected.phone}</span>} />
                <ProfileRow label="LOOKING FOR" value={<span className="text-[#fff1e8]/70 text-[9px]" style={px}>{selected.looking_for || "---"}</span>} />
                <ProfileRow label="HOBBIES" value={
                  Array.isArray(selected.hobbies) && selected.hobbies.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selected.hobbies.map(h => (
                        <span key={h} className="text-[8px] px-2.5 py-1.5 border-2 border-[#ff77a8] bg-[#ff77a8]/10 text-[#ff77a8]" style={px}>{h}</span>
                      ))}
                    </div>
                  ) : <span className="text-[#c2c3c7] text-[9px]" style={px}>---</span>
                } />
                <ProfileRow label="TEAM" value={
                  (() => {
                    const team = teams.find(t => t.player1_phone === selected.phone || t.player2_phone === selected.phone);
                    if (!team) return <span className="text-[#c2c3c7] text-[9px]" style={px}>NO TEAM</span>;
                    const isP1 = team.player1_phone === selected.phone;
                    const teammate = isP1 ? team.player2_name : team.player1_name;
                    const ready = isP1 ? team.player1_ready : team.player2_ready;
                    return (
                      <div className="space-y-1">
                        <span className="text-[#29adff] text-[9px]" style={px}>CODE: {team.code}</span>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 ${ready ? "bg-[#00e436]" : "bg-[#ffec27]"}`} />
                          <span className="text-[#fff1e8]/70 text-[8px]" style={px}>{ready ? "READY" : "NOT READY"}</span>
                        </div>
                        <span className="text-[#fff1e8]/70 text-[8px]" style={px}>TEAMMATE: {teammate || "NONE"}</span>
                        <span className={`text-[8px] px-2 py-1 border-2 inline-block ${
                          team.status === "full" ? "border-[#00e436] text-[#00e436]" : "border-[#ffec27] text-[#ffec27]"
                        }`} style={px}>{team.status.toUpperCase()}</span>
                      </div>
                    );
                  })()
                } />
                <ProfileRow label="SIGNED UP" value={
                  <span className="text-[#c2c3c7] text-[8px]" style={px}>{new Date(selected.created_at).toLocaleString()}</span>
                } />

                <button onClick={() => removeSignup(selected.id)}
                  className="w-full mt-2 py-3 border-4 border-[#ff004d] bg-[#ff004d]/10 text-[#ff004d] text-[9px] hover:bg-[#ff004d]/25 transition"
                  style={px}>
                  REMOVE FROM WAITLIST
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-[#c2c3c7]/40 text-[9px]" style={px}>SELECT A USER TO</p>
            <p className="text-[#c2c3c7]/40 text-[9px] mt-2" style={px}>VIEW THEIR PROFILE</p>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

const actionColors: Record<string, string> = {
  signup: "#ffec27", team_created: "#29adff", team_joined: "#00e436",
  ready_up: "#ff77a8", message: "#c2c3c7", signin: "#29adff",
  admin_delete: "#ff004d", first_message: "#ff77a8", unknown_message: "#5f574f",
};

function ActivityList({ activity }: { activity: { id: string; action: string; actor_name: string | null; actor_phone: string | null; details: string | null; created_at: string }[] }) {
  if (activity.length === 0) return <p className="text-center text-[#c2c3c7] py-10 text-[9px]" style={{ fontFamily: "'Press Start 2P', monospace" }}>NO LOGS</p>;
  return (
    <>
      {activity.map(a => {
        const c = actionColors[a.action] || "#5f574f";
        return (
          <div key={a.id} className="px-3 py-2.5 border-b-2 border-[#1d2b53]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[7px] px-2 py-0.5 border-2" style={{ borderColor: c, color: c, fontFamily: "'Press Start 2P', monospace" }}>{a.action.toUpperCase().replace(/_/g, " ")}</span>
              <span className="text-[#c2c3c7]/40 text-[6px]" style={{ fontFamily: "'Press Start 2P', monospace" }}>{timeAgo(a.created_at)}</span>
            </div>
            {a.actor_name && <p className="text-[#fff1e8] text-[8px]" style={{ fontFamily: "'Press Start 2P', monospace" }}>{a.actor_name}</p>}
            {a.actor_phone && <p className="text-[#c2c3c7] text-[7px]" style={{ fontFamily: "'Press Start 2P', monospace" }}>{a.actor_phone}</p>}
            {a.details && <p className="text-[#c2c3c7]/60 text-[6px] mt-1 break-words leading-[1.8]" style={{ fontFamily: "'Press Start 2P', monospace" }}>{a.details}</p>}
          </div>
        );
      })}
    </>
  );
}

function ProfileRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[#29adff] text-[8px] tracking-wider mb-2" style={{ fontFamily: "'Press Start 2P', monospace" }}>{label}</p>
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
