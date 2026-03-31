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
  signup_ip?: string;
  user_agent?: string;
  referrer?: string;
  created_at: string;
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

interface Activity {
  id: string;
  action: string;
  actor_name: string | null;
  actor_phone: string | null;
  details: string | null;
  created_at: string;
}

interface Visit {
  id: string;
  event: string;
  path: string | null;
  referrer: string | null;
  user_agent: string | null;
  ip: string | null;
  created_at: string;
}

const ADMIN_PASS = "bubl2026";
const px = { fontFamily: "'Press Start 2P', monospace" } as const;

const ACTION_COLORS: Record<string, string> = {
  signup: "#ffec27", team_created: "#29adff", team_joined: "#00e436",
  ready_up: "#ff77a8", message: "#c2c3c7", signin: "#29adff",
  admin_delete: "#ff004d", first_message: "#ff77a8", unknown_message: "#5f574f",
};

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="text-[#29adff] text-[7px] tracking-wider mb-1.5" style={px}>{label}</p>
      {children}
    </div>
  );
}

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span className="text-[7px] px-2 py-0.5 border-2 inline-block" style={{ ...px, borderColor: color, color, background: `${color}10` }}>
      {text}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════
export function AdminPage() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem("bubl-admin") === "true");
  const [passInput, setPassInput] = useState("");
  const [passError, setPassError] = useState(false);

  const [signups, setSignups] = useState<Signup[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [analytics, setAnalytics] = useState({ totalVisits: 0, todayVisits: 0, weekVisits: 0, activeLastHour: 0 });

  const [tab, setTab] = useState<"users" | "guys" | "girls" | "teams" | "logs" | "visits">("users");
  const [teamFilter, setTeamFilter] = useState<string | null>(null);
  const [visitFilter, setVisitFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<Signup | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (authed) load(); }, [authed]);

  // ── Password gate ──
  if (!authed) {
    return (
      <div className="min-h-screen bg-[#0d0d1a] flex items-center justify-center" style={px}>
        <div className="text-center">
          <h1 className="text-[20px] text-[#ff004d] mb-2">bubl.</h1>
          <p className="text-[#c2c3c7] text-[9px] mb-8 tracking-widest">&lt; ADMIN &gt;</p>
          <input
            type="password" value={passInput} autoFocus
            onChange={e => { setPassInput(e.target.value); setPassError(false); }}
            onKeyDown={e => {
              if (e.key === "Enter") {
                if (passInput === ADMIN_PASS) { sessionStorage.setItem("bubl-admin", "true"); setAuthed(true); }
                else setPassError(true);
              }
            }}
            placeholder="PASSWORD"
            className={`w-[280px] px-4 py-3 border-4 ${passError ? "border-[#ff004d]" : "border-[#29adff]"} bg-[#1d2b53] text-white text-[11px] text-center placeholder-[#c2c3c7]/30 focus:outline-none focus:border-[#ffec27]`}
            style={px}
          />
          {passError && <p className="text-[#ff004d] text-[9px] mt-3">WRONG PASSWORD</p>}
        </div>
      </div>
    );
  }

  // ── Data loading ──
  async function load() {
    setLoading(true);
    try {
      const [a, b, c, d, e] = await Promise.all([
        fetch("/api/blind-date/admin/signups").then(r => r.json()),
        fetch("/api/blind-date/admin/teams").then(r => r.json()),
        fetch("/api/blind-date/admin/analytics").then(r => r.json()),
        fetch("/api/blind-date/admin/activity").then(r => r.json()),
        fetch("/api/blind-date/admin/visits").then(r => r.json()),
      ]);
      setSignups(a.signups || []);
      setTeams(b.teams || []);
      if (c.ok) setAnalytics(c);
      setActivity(d.logs || []);
      setVisits(e.visits || []);
    } catch (err) { console.error("Load failed:", err); }
    setLoading(false);
  }

  async function removeUser(id: string) {
    if (!confirm("Remove user?")) return;
    await fetch(`/api/blind-date/admin/signups/${id}`, { method: "DELETE" }).catch(() => {});
    setSignups(p => p.filter(s => s.id !== id));
    if (selectedUser?.id === id) setSelectedUser(null);
  }

  async function removeTeam(id: string) {
    if (!confirm("Remove team?")) return;
    await fetch(`/api/blind-date/admin/teams/${id}`, { method: "DELETE" }).catch(() => {});
    setTeams(p => p.filter(t => t.id !== id));
    if (selectedTeam?.id === id) setSelectedTeam(null);
  }

  async function removeLog(id: string) {
    await fetch(`/api/blind-date/admin/activity/${id}`, { method: "DELETE" }).catch(() => {});
    setActivity(p => p.filter(a => a.id !== id));
  }

  async function removeVisit(id: string) {
    await fetch(`/api/blind-date/admin/visits/${id}`, { method: "DELETE" }).catch(() => {});
    setVisits(p => p.filter(v => v.id !== id));
  }

  // ── Derived data ──
  const fullTeams = teams.filter(t => t.status === "full");
  const waitingTeams = teams.filter(t => t.status === "waiting");
  const readyTeams = teams.filter(t => t.player1_ready && t.player2_ready);

  const guys = signups.filter(s => s.gender === "male");
  const girls = signups.filter(s => s.gender === "female");

  const filteredUsers = signups.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) || s.phone.includes(search)
  );

  let filteredTeams = teams;
  if (teamFilter === "full") filteredTeams = fullTeams;
  else if (teamFilter === "waiting") filteredTeams = waitingTeams;
  else if (teamFilter === "ready") filteredTeams = readyTeams;

  const now = Date.now();
  let filteredVisits = visits;
  if (visitFilter === "active1h") filteredVisits = visits.filter(v => now - new Date(v.created_at).getTime() < 3600000);
  else if (visitFilter === "today") { const t = new Date(); t.setHours(0,0,0,0); filteredVisits = visits.filter(v => new Date(v.created_at) >= t); }
  else if (visitFilter === "week") filteredVisits = visits.filter(v => now - new Date(v.created_at).getTime() < 604800000);

  // ── Stat click handler ──
  function onStat(filter: string) {
    if (["active1h", "today", "week", "alltime"].includes(filter)) { setTab("visits"); setVisitFilter(filter === "alltime" ? null : filter); setTeamFilter(null); }
    else if (filter === "signups") { setTab("users"); setTeamFilter(null); setVisitFilter(null); }
    else if (filter === "guys") { setTab("guys"); setTeamFilter(null); setVisitFilter(null); }
    else if (filter === "girls") { setTab("girls"); setTeamFilter(null); setVisitFilter(null); }
    else if (["teams", "full", "ready", "waiting"].includes(filter)) { setTab("teams"); setTeamFilter(filter === "teams" ? null : filter); setVisitFilter(null); }
  }

  return (
    <div className="min-h-screen bg-[#0d0d1a] text-[#fff1e8] flex flex-col" style={px}>

      {/* ── Top bar ── */}
      <div className="border-b-4 border-[#29adff] bg-[#1d2b53]/80 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-[14px] text-[#ff004d]">bubl.</span>
            <span className="text-[#c2c3c7] text-[8px]">ADMIN</span>
          </div>
          <button onClick={load} className="text-[#29adff] text-[7px] hover:text-[#ffec27]">REFRESH</button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { v: analytics.activeLastHour, l: "ACTIVE 1H", c: "#00e436", f: "active1h" },
            { v: analytics.todayVisits, l: "TODAY", c: "#29adff", f: "today" },
            { v: analytics.weekVisits, l: "THIS WEEK", c: "#ff77a8", f: "week" },
            { v: analytics.totalVisits, l: "ALL TIME", c: "#c2c3c7", f: "alltime" },
            { v: signups.length, l: "SIGNUPS", c: "#ffec27", f: "signups" },
            { v: guys.length, l: "GUYS", c: "#29adff", f: "guys" },
            { v: girls.length, l: "GIRLS", c: "#ff77a8", f: "girls" },
            { v: teams.length, l: "TEAMS", c: "#29adff", f: "teams" },
            { v: fullTeams.length, l: "FULL", c: "#00e436", f: "full" },
            { v: readyTeams.length, l: "READY", c: "#ff77a8", f: "ready" },
            { v: waitingTeams.length, l: "WAITING", c: "#5f574f", f: "waiting" },
          ].map((s, i) => (
            <button key={i} onClick={() => onStat(s.f)}
              className={`shrink-0 border-2 px-3 py-1.5 text-center hover:opacity-80 ${(teamFilter === s.f || visitFilter === s.f) ? "ring-2 ring-white" : ""}`}
              style={{ borderColor: s.c, background: `${s.c}10` }}>
              <p className="text-[11px]" style={{ color: s.c }}>{s.v}</p>
              <p className="text-[5px] mt-0.5 text-[#c2c3c7]">{s.l}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ── Main ── */}
      <div className="flex flex-col sm:flex-row flex-1 overflow-hidden">

        {/* ── Left panel ── */}
        <div className="w-full sm:w-[340px] border-b-4 sm:border-b-0 sm:border-r-4 border-[#29adff] flex flex-col sm:h-[calc(100vh-100px)]">

          {/* Tabs */}
          <div className="flex gap-1 p-3 border-b-4 border-[#29adff]">
            {([["users","#29adff"],["guys","#29adff"],["girls","#ff77a8"],["teams","#ff77a8"],["logs","#ffec27"],["visits","#00e436"]] as const).map(([t, c]) => (
              <button key={t} onClick={() => { setTab(t); setTeamFilter(null); setVisitFilter(null); }}
                className={`flex-1 py-2 text-[6px] border-2 ${tab === t ? `bg-[${c}] text-[#1d2b53]` : "text-[#c2c3c7]"}`}
                style={{ borderColor: tab === t ? c : `${c}40`, background: tab === t ? c : "transparent" }}>
                {t.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Search (users only) */}
          {(tab === "users" || tab === "guys" || tab === "girls") && (
            <div className="p-3 border-b-4 border-[#29adff]">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#29adff]" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="SEARCH..."
                  className="w-full pl-10 pr-4 py-2 border-4 border-[#29adff] bg-[#1d2b53] text-white text-[9px] placeholder-[#c2c3c7]/30 focus:outline-none focus:border-[#ffec27]"
                  style={px} />
              </div>
            </div>
          )}

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <p className="text-center text-[#c2c3c7] py-10 text-[9px]">LOADING...</p>

            ) : (tab === "users" || tab === "guys" || tab === "girls") ? (
              (() => {
                let list = filteredUsers;
                if (tab === "guys") list = list.filter(s => s.gender === "male");
                if (tab === "girls") list = list.filter(s => s.gender === "female");
                return list.length === 0 ? <p className="text-center text-[#c2c3c7] py-10 text-[8px]">NO {tab.toUpperCase()}</p> : (
                list.map(s => (
                  <button key={s.id} onClick={() => { setSelectedUser(s); setSelectedTeam(null); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b-2 border-[#1d2b53] ${selectedUser?.id === s.id ? "bg-[#1d2b53]" : "hover:bg-[#1d2b53]/60"}`}>
                    <div className="w-9 h-9 border-2 border-[#ff77a8] bg-[#1d2b53] flex items-center justify-center shrink-0">
                      <span className="text-[11px] text-[#ff77a8]">{s.name[0]?.toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[8px] truncate">{s.name}</p>
                      <p className="text-[#c2c3c7] text-[7px] truncate mt-0.5">{s.phone}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge text={s.status.toUpperCase()} color={s.status === "matched" ? "#00e436" : "#ffec27"} />
                      <span className="text-[#c2c3c7]/40 text-[6px]">{timeAgo(s.created_at)}</span>
                    </div>
                  </button>
                ))
              );
              })()

            ) : tab === "teams" ? (
              filteredTeams.length === 0 ? <p className="text-center text-[#c2c3c7] py-10 text-[8px]">NO TEAMS</p> : (
                filteredTeams.map(t => (
                  <button key={t.id} onClick={() => { setSelectedTeam(t); setSelectedUser(null); }}
                    className={`w-full text-left px-4 py-3 border-b-2 border-[#1d2b53] ${selectedTeam?.id === t.id ? "bg-[#1d2b53]" : "hover:bg-[#1d2b53]/60"}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[#29adff] text-[9px]">{t.code}</span>
                      <Badge text={t.status.toUpperCase()} color={t.status === "full" ? "#00e436" : "#ffec27"} />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 ${t.player1_ready ? "bg-[#00e436]" : "bg-[#ffec27]"}`} />
                        <span className="text-[7px]">{t.player1_name}</span>
                      </div>
                      {t.player2_name ? (
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 ${t.player2_ready ? "bg-[#00e436]" : "bg-[#ffec27]"}`} />
                          <span className="text-[7px]">{t.player2_name}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-[#5f574f]" />
                          <span className="text-[7px] text-[#5f574f]">WAITING</span>
                        </div>
                      )}
                    </div>
                    <p className="text-[#c2c3c7]/30 text-[6px] mt-1.5">{timeAgo(t.created_at)}</p>
                  </button>
                ))
              )

            ) : tab === "logs" ? (
              activity.length === 0 ? <p className="text-center text-[#c2c3c7] py-10 text-[8px]">NO LOGS</p> : (
                activity.map(a => {
                  const c = ACTION_COLORS[a.action] || "#5f574f";
                  return (
                    <div key={a.id} className="px-3 py-2.5 border-b-2 border-[#1d2b53] group relative">
                      <button onClick={() => removeLog(a.id)} className="absolute top-2 right-2 text-[#ff004d]/0 group-hover:text-[#ff004d]/60 hover:!text-[#ff004d] text-[10px]">&times;</button>
                      <div className="flex items-center justify-between mb-1">
                        <Badge text={a.action.replace(/_/g, " ").toUpperCase()} color={c} />
                        <span className="text-[#c2c3c7]/30 text-[5px]">{timeAgo(a.created_at)}</span>
                      </div>
                      {a.actor_name && <p className="text-[7px]">{a.actor_name}</p>}
                      {a.actor_phone && <p className="text-[#c2c3c7] text-[6px]">{a.actor_phone}</p>}
                      {a.details && <p className="text-[#c2c3c7]/50 text-[5px] mt-1 break-words leading-[1.8]">{a.details}</p>}
                    </div>
                  );
                })
              )

            ) : tab === "visits" ? (
              filteredVisits.length === 0 ? <p className="text-center text-[#c2c3c7] py-10 text-[8px]">NO VISITS</p> : (
                filteredVisits.map(v => (
                  <div key={v.id} className="px-3 py-2 border-b-2 border-[#1d2b53] group relative">
                    <button onClick={() => removeVisit(v.id)} className="absolute top-1.5 right-2 text-[#ff004d]/0 group-hover:text-[#ff004d]/60 hover:!text-[#ff004d] text-[10px]">&times;</button>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[#00e436] text-[7px]">{v.path || "/"}</span>
                      <span className="text-[#c2c3c7]/30 text-[5px]">{timeAgo(v.created_at)}</span>
                    </div>
                    {v.ip && <p className="text-[#ffec27] text-[6px]">IP: {v.ip}</p>}
                    {v.referrer && <p className="text-[#c2c3c7] text-[5px] truncate">FROM: {v.referrer}</p>}
                    {v.user_agent && <p className="text-[#c2c3c7]/30 text-[4px] truncate mt-0.5">{v.user_agent}</p>}
                  </div>
                ))
              )

            ) : null}
          </div>
        </div>

        {/* ── Right detail panel ── */}
        <div className="flex-1 flex items-start justify-center p-4 sm:p-8 overflow-y-auto">
          {selectedUser ? (
            <div className="max-w-md w-full">
              <button onClick={() => setSelectedUser(null)} className="mb-3 text-[#c2c3c7] hover:text-white"><X className="w-5 h-5" /></button>
              <div className="border-4 border-[#29adff] bg-[#1d2b53] p-5 space-y-4">
                <div>
                  <h2 className="text-[14px]">{selectedUser.name}</h2>
                  <p className="text-[#c2c3c7] text-[8px] mt-1">{selectedUser.phone}</p>
                </div>
                <div className="h-[3px] bg-[#29adff]/20" />
                <Row label="STATUS"><Badge text={selectedUser.status.toUpperCase()} color={selectedUser.status === "matched" ? "#00e436" : "#ffec27"} /></Row>
                <Row label="GENDER"><span className="text-[8px] text-[#fff1e8]/70">{selectedUser.gender || "---"}</span></Row>
                <Row label="AGE"><span className="text-[8px] text-[#fff1e8]/70">{selectedUser.age || "---"}</span></Row>
                <Row label="SCHOOL"><span className="text-[8px] text-[#fff1e8]/70">{selectedUser.school_id_url || "---"}</span></Row>
                <Row label="LOOKING FOR"><span className="text-[8px] text-[#fff1e8]/70">{selectedUser.looking_for || "---"}</span></Row>
                <Row label="HOBBIES">
                  {Array.isArray(selectedUser.hobbies) && selectedUser.hobbies.length > 0
                    ? <div className="flex flex-wrap gap-1.5">{selectedUser.hobbies.map(h => <Badge key={h} text={h} color="#ff77a8" />)}</div>
                    : <span className="text-[8px] text-[#c2c3c7]">---</span>}
                </Row>
                <Row label="TEAM">
                  {(() => {
                    const team = teams.find(t => t.player1_phone === selectedUser.phone || t.player2_phone === selectedUser.phone);
                    if (!team) return <span className="text-[8px] text-[#c2c3c7]">NO TEAM</span>;
                    const isP1 = team.player1_phone === selectedUser.phone;
                    return (
                      <div className="space-y-1">
                        <p className="text-[#29adff] text-[8px]">CODE: {team.code}</p>
                        <p className="text-[7px] text-[#fff1e8]/70">TEAMMATE: {isP1 ? team.player2_name || "NONE" : team.player1_name}</p>
                        <Badge text={team.status.toUpperCase()} color={team.status === "full" ? "#00e436" : "#ffec27"} />
                      </div>
                    );
                  })()}
                </Row>
                <Row label="SIGNED UP"><span className="text-[7px] text-[#c2c3c7]">{new Date(selectedUser.created_at).toLocaleString()}</span></Row>
                {selectedUser.signup_ip && <Row label="IP"><span className="text-[8px] text-[#ffec27]">{selectedUser.signup_ip}</span></Row>}
                {selectedUser.user_agent && <Row label="DEVICE"><span className="text-[6px] text-[#c2c3c7] break-words leading-[1.8]">{selectedUser.user_agent}</span></Row>}
                {selectedUser.referrer && <Row label="REFERRER"><span className="text-[7px] text-[#29adff] break-words">{selectedUser.referrer}</span></Row>}
                <button onClick={() => removeUser(selectedUser.id)}
                  className="w-full py-3 border-4 border-[#ff004d] bg-[#ff004d]/10 text-[#ff004d] text-[8px] hover:bg-[#ff004d]/25 mt-2">
                  REMOVE
                </button>
              </div>
            </div>

          ) : selectedTeam ? (
            <div className="max-w-md w-full">
              <button onClick={() => setSelectedTeam(null)} className="mb-3 text-[#c2c3c7] hover:text-white"><X className="w-5 h-5" /></button>
              <div className="border-4 border-[#ff77a8] bg-[#1d2b53] p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-[14px] text-[#ff77a8]">TEAM {selectedTeam.code}</h2>
                  <Badge text={selectedTeam.status.toUpperCase()} color={selectedTeam.status === "full" ? "#00e436" : "#ffec27"} />
                </div>
                <div className="h-[3px] bg-[#ff77a8]/20" />
                <Row label="PLAYER 1">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 ${selectedTeam.player1_ready ? "bg-[#00e436]" : "bg-[#ffec27]"}`} />
                      <span className="text-[9px]">{selectedTeam.player1_name}</span>
                    </div>
                    <p className="text-[#c2c3c7] text-[7px]">{selectedTeam.player1_phone}</p>
                    <p className="text-[#c2c3c7] text-[6px]">{selectedTeam.player1_gender} · {selectedTeam.player1_ready ? "READY" : "NOT READY"}</p>
                  </div>
                </Row>
                <Row label="PLAYER 2">
                  {selectedTeam.player2_name ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 ${selectedTeam.player2_ready ? "bg-[#00e436]" : "bg-[#ffec27]"}`} />
                        <span className="text-[9px]">{selectedTeam.player2_name}</span>
                      </div>
                      <p className="text-[#c2c3c7] text-[7px]">{selectedTeam.player2_phone}</p>
                      <p className="text-[#c2c3c7] text-[6px]">{selectedTeam.player2_gender} · {selectedTeam.player2_ready ? "READY" : "NOT READY"}</p>
                    </div>
                  ) : <span className="text-[8px] text-[#5f574f]">WAITING FOR INVITE</span>}
                </Row>
                <Row label="CREATED"><span className="text-[7px] text-[#c2c3c7]">{new Date(selectedTeam.created_at).toLocaleString()}</span></Row>
                <button onClick={() => removeTeam(selectedTeam.id)}
                  className="w-full py-3 border-4 border-[#ff004d] bg-[#ff004d]/10 text-[#ff004d] text-[8px] hover:bg-[#ff004d]/25 mt-2">
                  REMOVE TEAM
                </button>
              </div>
            </div>

          ) : (
            <div className="text-center mt-20">
              <p className="text-[#c2c3c7]/30 text-[8px]">SELECT A USER OR TEAM</p>
              <p className="text-[#c2c3c7]/30 text-[8px] mt-2">TO VIEW DETAILS</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
