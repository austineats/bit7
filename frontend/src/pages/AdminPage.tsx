import { useState, useEffect, useMemo } from "react";
import { Search, Trash2, ChevronLeft, ChevronRight, Users, UserCheck, Clock, Eye, BarChart3, Activity as ActivityIcon, Globe, Bell, Settings, Menu } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

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
  profile?: BublProfile | null;
  conversations?: Conversation[];
  user_state?: UserState | null;
  match?: MatchInfo | null;
  party_info?: PartyInfo | null;
}

const ADMIN_PASS = "bubl2026";
const SIDEBAR_W = "w-[220px]";

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export function AdminPage() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem("bubl-admin") === "true");
  const [passInput, setPassInput] = useState("");
  const [passError, setPassError] = useState(false);

  const [signups, setSignups] = useState<Signup[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [analytics, setAnalytics] = useState({ totalVisits: 0, todayVisits: 0, weekVisits: 0, activeLastHour: 0 });

  const [tab, setTab] = useState<"dashboard" | "users" | "guys" | "girls" | "teams" | "logs" | "visits">("dashboard");
  const [teamFilter, setTeamFilter] = useState<string | null>(null);
  const [visitFilter, setVisitFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const perPage = 25;

  useEffect(() => { if (authed) load(); }, [authed]);
  useEffect(() => { setPage(1); setExpandedId(null); }, [tab, teamFilter, visitFilter, search]);

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#2c3e50] flex items-center justify-center font-['Open_Sans',sans-serif]">
        <div className="bg-white rounded p-8 w-80 shadow-lg">
          <h1 className="text-xl font-bold text-[#2c3e50] mb-1">bubl. admin</h1>
          <p className="text-[#999] text-sm mb-5">Sign in to continue</p>
          <input
            type="password" value={passInput} autoFocus
            onChange={e => { setPassInput(e.target.value); setPassError(false); }}
            onKeyDown={e => {
              if (e.key === "Enter") {
                if (passInput === ADMIN_PASS) { sessionStorage.setItem("bubl-admin", "true"); setAuthed(true); }
                else setPassError(true);
              }
            }}
            placeholder="Password"
            className={`w-full px-3 py-2.5 rounded border ${passError ? "border-red-400" : "border-[#ddd]"} text-sm text-[#333] focus:outline-none focus:border-[#1abc9c]`}
          />
          {passError && <p className="text-[#e74c3c] text-xs mt-2">Wrong password</p>}
          <button
            onClick={() => {
              if (passInput === ADMIN_PASS) { sessionStorage.setItem("bubl-admin", "true"); setAuthed(true); }
              else setPassError(true);
            }}
            className="w-full mt-4 py-2.5 bg-[#1abc9c] hover:bg-[#16a085] text-white rounded text-sm font-semibold"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

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
    if (expandedId === id) setExpandedId(null);
  }

  async function removeTeam(id: string) {
    if (!confirm("Remove team?")) return;
    await fetch(`/api/blind-date/admin/teams/${id}`, { method: "DELETE" }).catch(() => {});
    setTeams(p => p.filter(t => t.id !== id));
    if (expandedId === id) setExpandedId(null);
  }

  async function removeLog(id: string) {
    await fetch(`/api/blind-date/admin/activity/${id}`, { method: "DELETE" }).catch(() => {});
    setActivity(p => p.filter(a => a.id !== id));
  }

  async function removeVisit(id: string) {
    await fetch(`/api/blind-date/admin/visits/${id}`, { method: "DELETE" }).catch(() => {});
    setVisits(p => p.filter(v => v.id !== id));
  }

  const fullTeams = teams.filter(t => t.status === "full");
  const waitingTeams = teams.filter(t => t.status === "waiting");
  const readyTeams = teams.filter(t => t.player1_ready && t.player2_ready);
  const guys = signups.filter(s => s.gender === "male");
  const girls = signups.filter(s => s.gender === "female");

  // Chart data: traffic over last 7 days (hourly buckets for today, daily for past week)
  const trafficByDay = useMemo(() => {
    const days: Record<string, number> = {};
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      days[key] = 0;
    }
    for (const v of visits) {
      const d = new Date(v.created_at);
      const key = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      if (key in days) days[key]++;
    }
    return Object.entries(days).map(([name, visits]) => ({ name, visits }));
  }, [visits]);

  // Chart data: signups per day over last 7 days
  const signupsByDay = useMemo(() => {
    const days: Record<string, { guys: number; girls: number }> = {};
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      days[key] = { guys: 0, girls: 0 };
    }
    for (const s of signups) {
      const d = new Date(s.created_at);
      const key = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      if (key in days) {
        if (s.gender === "male") days[key].guys++;
        else if (s.gender === "female") days[key].girls++;
      }
    }
    return Object.entries(days).map(([name, data]) => ({ name, ...data }));
  }, [signups]);

  // Chart data: hourly traffic for today
  const trafficByHour = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const hours: Record<number, number> = {};
    for (let h = 0; h <= now.getHours(); h++) hours[h] = 0;
    for (const v of visits) {
      const d = new Date(v.created_at);
      if (d >= todayStart) {
        const h = d.getHours();
        if (h in hours) hours[h]++;
      }
    }
    return Object.entries(hours).map(([h, count]) => ({
      name: `${Number(h) % 12 || 12}${Number(h) < 12 ? "a" : "p"}`,
      visits: count,
    }));
  }, [visits]);

  let displayUsers = signups.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) || s.phone.includes(search)
  );
  if (tab === "guys") displayUsers = displayUsers.filter(s => s.gender === "male");
  if (tab === "girls") displayUsers = displayUsers.filter(s => s.gender === "female");

  let filteredTeams = teams;
  if (teamFilter === "full") filteredTeams = fullTeams;
  else if (teamFilter === "waiting") filteredTeams = waitingTeams;
  else if (teamFilter === "ready") filteredTeams = readyTeams;

  const now = Date.now();
  let filteredVisits = visits;
  if (visitFilter === "active1h") filteredVisits = visits.filter(v => now - new Date(v.created_at).getTime() < 3600000);
  else if (visitFilter === "today") { const t = new Date(); t.setHours(0,0,0,0); filteredVisits = visits.filter(v => new Date(v.created_at) >= t); }
  else if (visitFilter === "week") filteredVisits = visits.filter(v => now - new Date(v.created_at).getTime() < 604800000);

  const listLen = (tab === "users" || tab === "guys" || tab === "girls") ? displayUsers.length :
    tab === "teams" ? filteredTeams.length : tab === "logs" ? activity.length :
    tab === "visits" ? filteredVisits.length : 0;
  const totalPages = Math.max(1, Math.ceil(listLen / perPage));
  const slice = <T,>(arr: T[]) => arr.slice((page - 1) * perPage, page * perPage);

  const sidebarItem = (key: string, label: string, icon: React.ReactNode) => (
    <button
      key={key}
      onClick={() => { setTab(key as typeof tab); setTeamFilter(null); setVisitFilter(null); }}
      className={`w-full flex items-center gap-3 px-5 py-2.5 text-[13px] text-left ${
        tab === key
          ? "bg-[#1abc9c] text-white"
          : "text-[#aab2bd] hover:text-white hover:bg-white/5"
      }`}
    >
      {icon}
      {label}
    </button>
  );

  const filterBtn = (label: string, value: string | null, current: string | null, set: (v: string | null) => void) =>
    <button onClick={() => set(value)}
      className={`px-3 py-1.5 text-xs rounded ${current === value ? "bg-[#1abc9c] text-white" : "bg-[#ecf0f1] text-[#7f8c8d] hover:bg-[#ddd]"}`}>
      {label}
    </button>;

  const th = "text-left px-4 py-3 text-[11px] font-semibold text-[#7f8c8d] uppercase tracking-wider bg-[#f7f9fa] border-b border-[#eee]";
  const td = "px-4 py-3 text-[13px] text-[#555] border-b border-[#f0f0f0]";

  // Stat cards for dashboard
  const statCards = [
    { label: "Total Signups", value: signups.length, bg: "bg-[#1abc9c]", icon: <Users className="w-6 h-6 text-white/80" /> },
    { label: "Guys", value: guys.length, bg: "bg-[#3498db]", icon: <Users className="w-6 h-6 text-white/80" /> },
    { label: "Girls", value: girls.length, bg: "bg-[#e74c3c]", icon: <Users className="w-6 h-6 text-white/80" /> },
    { label: "Teams", value: teams.length, bg: "bg-[#f39c12]", icon: <UserCheck className="w-6 h-6 text-white/80" /> },
  ];

  const statCards2 = [
    { label: "Full Teams", value: fullTeams.length, bg: "bg-[#2ecc71]", icon: <UserCheck className="w-6 h-6 text-white/80" /> },
    { label: "Ready", value: readyTeams.length, bg: "bg-[#9b59b6]", icon: <Clock className="w-6 h-6 text-white/80" /> },
    { label: "Active (1h)", value: analytics.activeLastHour, bg: "bg-[#e67e22]", icon: <Eye className="w-6 h-6 text-white/80" /> },
    { label: "Today Visits", value: analytics.todayVisits, bg: "bg-[#1abc9c]", icon: <Globe className="w-6 h-6 text-white/80" /> },
  ];

  return (
    <div className="min-h-screen bg-[#ecf0f1] font-['Open_Sans',sans-serif] text-[#333] flex">

      {/* Sidebar */}
      <div className={`${SIDEBAR_W} bg-[#2c3e50] min-h-screen flex-shrink-0 flex flex-col ${sidebarOpen ? "" : "hidden"}`}>
        <div className="px-5 py-4 flex items-center gap-2">
          <span className="text-white text-lg font-bold">bubl.</span>
          <span className="text-[#1abc9c] text-lg font-light">Admin</span>
        </div>

        <nav className="flex-1 py-2">
          <p className="px-5 py-2 text-[10px] font-bold text-[#607080] uppercase tracking-widest">Main</p>
          {sidebarItem("dashboard", "Dashboard", <BarChart3 className="w-4 h-4" />)}

          <p className="px-5 py-2 mt-3 text-[10px] font-bold text-[#607080] uppercase tracking-widest">Users</p>
          {sidebarItem("users", "All Users", <Users className="w-4 h-4" />)}
          {sidebarItem("guys", "Guys", <Users className="w-4 h-4" />)}
          {sidebarItem("girls", "Girls", <Users className="w-4 h-4" />)}

          <p className="px-5 py-2 mt-3 text-[10px] font-bold text-[#607080] uppercase tracking-widest">Data</p>
          {sidebarItem("teams", "Teams", <UserCheck className="w-4 h-4" />)}
          {sidebarItem("logs", "Activity Log", <ActivityIcon className="w-4 h-4" />)}
          {sidebarItem("visits", "Visits", <Globe className="w-4 h-4" />)}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">

        {/* Top Bar */}
        <header className="bg-white h-[50px] flex items-center justify-between px-5 shadow-sm flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-[#999] hover:text-[#333]">
              <Menu className="w-5 h-5" />
            </button>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#bbb]" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                className="pl-8 pr-3 py-1.5 w-48 rounded bg-[#f5f5f5] border-none text-[12px] text-[#333] focus:outline-none focus:bg-[#eee]"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={load} className="text-[12px] text-[#999] hover:text-[#333]">
              {loading ? "Loading..." : "Refresh"}
            </button>
            <Bell className="w-4 h-4 text-[#bbb] hover:text-[#666] cursor-pointer" />
            <Settings className="w-4 h-4 text-[#bbb] hover:text-[#666] cursor-pointer" />
            <div className="w-8 h-8 rounded-full bg-[#1abc9c] flex items-center justify-center text-white text-xs font-bold">A</div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-5 overflow-y-auto">

          {/* Page Title */}
          <div className="flex items-center justify-between mb-5">
            <h1 className="text-[22px] font-light text-[#333]">
              {tab === "dashboard" ? "Dashboard" :
               tab === "users" ? "All Users" :
               tab === "guys" ? "Guys" :
               tab === "girls" ? "Girls" :
               tab === "teams" ? "Teams" :
               tab === "logs" ? "Activity Log" : "Visits"}
            </h1>
            <span className="text-[12px] text-[#999]">bubl. admin / {tab}</span>
          </div>

          {loading ? (
            <div className="bg-white rounded p-20 text-center text-[#999] text-sm">Loading...</div>
          ) : tab === "dashboard" ? (
            <>
              {/* Stat Cards Row 1 */}
              <div className="grid grid-cols-4 gap-4 mb-4">
                {statCards.map(s => (
                  <div key={s.label} className={`${s.bg} rounded p-4 text-white flex items-center justify-between`}>
                    <div>
                      <p className="text-[28px] font-bold leading-none">{s.value}</p>
                      <p className="text-[12px] text-white/70 mt-1">{s.label}</p>
                    </div>
                    {s.icon}
                  </div>
                ))}
              </div>

              {/* Stat Cards Row 2 */}
              <div className="grid grid-cols-4 gap-4 mb-5">
                {statCards2.map(s => (
                  <div key={s.label} className={`${s.bg} rounded p-4 text-white flex items-center justify-between`}>
                    <div>
                      <p className="text-[28px] font-bold leading-none">{s.value}</p>
                      <p className="text-[12px] text-white/70 mt-1">{s.label}</p>
                    </div>
                    {s.icon}
                  </div>
                ))}
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-2 gap-4 mb-5">
                {/* Traffic - Last 7 Days */}
                <div className="bg-white rounded shadow-sm">
                  <div className="px-4 py-3 border-b border-[#eee] flex items-center justify-between">
                    <h3 className="text-[14px] font-semibold text-[#333]">Site Traffic <span className="font-normal text-[#999]">— Last 7 Days</span></h3>
                    <span className="text-[11px] text-[#999]">{analytics.weekVisits} visits</span>
                  </div>
                  <div className="p-4" style={{ height: 240 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trafficByDay}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#999" }} tickLine={false} axisLine={{ stroke: "#eee" }} />
                        <YAxis tick={{ fontSize: 10, fill: "#999" }} tickLine={false} axisLine={false} width={30} />
                        <Tooltip contentStyle={{ fontSize: 12, border: "1px solid #eee", borderRadius: 4, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }} />
                        <Area type="monotone" dataKey="visits" stroke="#1abc9c" fill="#1abc9c" fillOpacity={0.15} strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Signups - Guys vs Girls */}
                <div className="bg-white rounded shadow-sm">
                  <div className="px-4 py-3 border-b border-[#eee] flex items-center justify-between">
                    <h3 className="text-[14px] font-semibold text-[#333]">Signups <span className="font-normal text-[#999]">— Guys vs Girls</span></h3>
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#3498db]" /> Guys</span>
                      <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#e74c3c]" /> Girls</span>
                    </div>
                  </div>
                  <div className="p-4" style={{ height: 240 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={signupsByDay}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#999" }} tickLine={false} axisLine={{ stroke: "#eee" }} />
                        <YAxis tick={{ fontSize: 10, fill: "#999" }} tickLine={false} axisLine={false} width={30} allowDecimals={false} />
                        <Tooltip contentStyle={{ fontSize: 12, border: "1px solid #eee", borderRadius: 4, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }} />
                        <Bar dataKey="guys" fill="#3498db" radius={[2, 2, 0, 0]} />
                        <Bar dataKey="girls" fill="#e74c3c" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Today's Traffic - Hourly */}
              <div className="bg-white rounded shadow-sm mb-5">
                <div className="px-4 py-3 border-b border-[#eee] flex items-center justify-between">
                  <h3 className="text-[14px] font-semibold text-[#333]">Today's Traffic <span className="font-normal text-[#999]">— Hourly</span></h3>
                  <span className="text-[11px] text-[#999]">{analytics.todayVisits} visits today &middot; {analytics.activeLastHour} active last hour</span>
                </div>
                <div className="p-4" style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trafficByHour}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#999" }} tickLine={false} axisLine={{ stroke: "#eee" }} />
                      <YAxis tick={{ fontSize: 10, fill: "#999" }} tickLine={false} axisLine={false} width={30} allowDecimals={false} />
                      <Tooltip contentStyle={{ fontSize: 12, border: "1px solid #eee", borderRadius: 4, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }} />
                      <Area type="monotone" dataKey="visits" stroke="#3498db" fill="#3498db" fillOpacity={0.1} strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Recent Activity + Recent Signups side by side */}
              <div className="grid grid-cols-2 gap-4">
                {/* Recent Signups */}
                <div className="bg-white rounded shadow-sm">
                  <div className="px-4 py-3 border-b border-[#eee] flex items-center justify-between">
                    <h3 className="text-[14px] font-semibold text-[#333]">Recent Signups</h3>
                    <button onClick={() => setTab("users")} className="text-[11px] text-[#1abc9c] hover:underline">View All</button>
                  </div>
                  <div className="divide-y divide-[#f5f5f5]">
                    {signups.slice(0, 8).map(s => (
                      <div key={s.id} className="px-4 py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${s.gender === "male" ? "bg-[#3498db]" : s.gender === "female" ? "bg-[#e74c3c]" : "bg-[#95a5a6]"}`}>
                            {s.name[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="text-[13px] text-[#333] font-medium">{s.name}</p>
                            <p className="text-[11px] text-[#999]">{s.phone}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`text-[10px] px-2 py-0.5 rounded ${s.status === "matched" ? "bg-[#2ecc71]/10 text-[#2ecc71]" : "bg-[#f39c12]/10 text-[#f39c12]"}`}>
                            {s.status}
                          </span>
                          <p className="text-[10px] text-[#ccc] mt-0.5">{timeAgo(s.created_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white rounded shadow-sm">
                  <div className="px-4 py-3 border-b border-[#eee] flex items-center justify-between">
                    <h3 className="text-[14px] font-semibold text-[#333]">Recent Activity</h3>
                    <button onClick={() => setTab("logs")} className="text-[11px] text-[#1abc9c] hover:underline">View All</button>
                  </div>
                  <div className="divide-y divide-[#f5f5f5]">
                    {activity.slice(0, 8).map(a => (
                      <div key={a.id} className="px-4 py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-[#1abc9c]" />
                          <div>
                            <p className="text-[13px] text-[#333]">
                              <span className="font-medium">{a.actor_name || "Unknown"}</span>
                              <span className="text-[#999] ml-1.5">{a.action.replace(/_/g, " ")}</span>
                            </p>
                            {a.details && <p className="text-[11px] text-[#bbb] truncate max-w-[280px]">{a.details}</p>}
                          </div>
                        </div>
                        <span className="text-[10px] text-[#ccc] shrink-0">{timeAgo(a.created_at)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>

          ) : (tab === "users" || tab === "guys" || tab === "girls") ? (
            <div className="bg-white rounded shadow-sm">
              <div className="px-4 py-3 border-b border-[#eee] flex items-center justify-between">
                <h3 className="text-[14px] font-semibold text-[#333]">
                  {tab === "users" ? "All Users" : tab === "guys" ? "Guys" : "Girls"}
                  <span className="text-[#999] font-normal ml-2">({displayUsers.length})</span>
                </h3>
              </div>
              <table className="w-full">
                <thead><tr>
                  <th className={th}>Name</th>
                  <th className={th}>Phone</th>
                  <th className={th}>Gender</th>
                  <th className={th}>Age</th>
                  <th className={th}>Status</th>
                  <th className={th}>Signed Up</th>
                  <th className={th + " text-right"}>Actions</th>
                </tr></thead>
                <tbody>
                  {slice(displayUsers).length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-12 text-[#bbb] text-sm">No users found</td></tr>
                  ) : slice(displayUsers).map(s => (
                    <>
                      <tr key={s.id}
                        onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                        className={`cursor-pointer ${expandedId === s.id ? "bg-[#f8fffe]" : "hover:bg-[#fafafa]"}`}>
                        <td className={td}>
                          <div className="flex items-center gap-3">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold ${s.gender === "male" ? "bg-[#3498db]" : s.gender === "female" ? "bg-[#e74c3c]" : "bg-[#95a5a6]"}`}>
                              {s.name[0]?.toUpperCase()}
                            </div>
                            <span className="font-medium text-[#333]">{s.name}</span>
                          </div>
                        </td>
                        <td className={td + " font-mono text-[12px] text-[#888]"}>{s.phone}</td>
                        <td className={td}>
                          <span className={`text-[12px] ${s.gender === "male" ? "text-[#3498db]" : s.gender === "female" ? "text-[#e74c3c]" : "text-[#bbb]"}`}>
                            {s.gender || "—"}
                          </span>
                        </td>
                        <td className={td + " text-[#888]"}>{s.age || "—"}</td>
                        <td className={td}>
                          <span className={`text-[11px] px-2 py-0.5 rounded ${
                            s.status === "matched" ? "bg-[#2ecc71]/10 text-[#2ecc71]" : "bg-[#f39c12]/10 text-[#f39c12]"
                          }`}>{s.status}</span>
                        </td>
                        <td className={td + " text-[12px] text-[#999]"}>{timeAgo(s.created_at)}</td>
                        <td className={td + " text-right"}>
                          <button onClick={e => { e.stopPropagation(); removeUser(s.id); }}
                            className="text-[#ddd] hover:text-[#e74c3c] p-1">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                      {expandedId === s.id && (
                        <tr key={s.id + "-exp"} className="bg-[#f8fffe]">
                          <td colSpan={7} className="px-4 py-3 border-b border-[#e0e0e0]">
                            <div className="grid grid-cols-4 gap-x-8 gap-y-2 text-[12px]">
                              <div><span className="text-[#999]">Looking for: </span><span className="text-[#555]">{s.looking_for || "—"}</span></div>
                              <div><span className="text-[#999]">Hobbies: </span><span className="text-[#555]">{Array.isArray(s.hobbies) && s.hobbies.length ? s.hobbies.join(", ") : "—"}</span></div>
                              <div><span className="text-[#999]">IP: </span><span className="text-[#555] font-mono">{s.signup_ip || "—"}</span></div>
                              <div><span className="text-[#999]">Referrer: </span><span className="text-[#555]">{s.referrer || "—"}</span></div>
                              <div className="col-span-2"><span className="text-[#999]">Device: </span><span className="text-[#aaa]">{s.user_agent || "—"}</span></div>
                              <div className="col-span-2">
                                <span className="text-[#999]">Team: </span>
                                {(() => {
                                  const team = teams.find(t => t.player1_phone === s.phone || t.player2_phone === s.phone);
                                  if (!team) return <span className="text-[#ccc]">none</span>;
                                  const mate = team.player1_phone === s.phone ? team.player2_name : team.player1_name;
                                  return <span className="text-[#555]">{team.code} — teammate: {mate || "waiting"} ({team.status})</span>;
                                })()}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
              {totalPages > 1 && <Pagination page={page} totalPages={totalPages} listLen={listLen} setPage={setPage} />}
            </div>

          ) : tab === "teams" ? (
            <div className="bg-white rounded shadow-sm">
              <div className="px-4 py-3 border-b border-[#eee] flex items-center justify-between">
                <h3 className="text-[14px] font-semibold text-[#333]">
                  Teams <span className="text-[#999] font-normal ml-2">({filteredTeams.length})</span>
                </h3>
                <div className="flex gap-1.5">
                  {filterBtn("All", null, teamFilter, setTeamFilter)}
                  {filterBtn("Full", "full", teamFilter, setTeamFilter)}
                  {filterBtn("Waiting", "waiting", teamFilter, setTeamFilter)}
                  {filterBtn("Ready", "ready", teamFilter, setTeamFilter)}
                </div>
              </div>
              <table className="w-full">
                <thead><tr>
                  <th className={th}>Code</th>
                  <th className={th}>Player 1</th>
                  <th className={th}>Player 2</th>
                  <th className={th}>Status</th>
                  <th className={th}>Ready</th>
                  <th className={th}>Created</th>
                  <th className={th + " text-right"}>Actions</th>
                </tr></thead>
                <tbody>
                  {slice(filteredTeams).length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-12 text-[#bbb] text-sm">No teams</td></tr>
                  ) : slice(filteredTeams).map(t => (
                    <tr key={t.id} className="hover:bg-[#fafafa]">
                      <td className={td + " font-mono font-semibold text-[#333]"}>{t.code}</td>
                      <td className={td}>
                        <span className="text-[#333]">{t.player1_name}</span>
                        <span className="text-[11px] text-[#bbb] ml-1.5">{t.player1_phone}</span>
                      </td>
                      <td className={td}>
                        {t.player2_name ? (
                          <>
                            <span className="text-[#333]">{t.player2_name}</span>
                            <span className="text-[11px] text-[#bbb] ml-1.5">{t.player2_phone}</span>
                          </>
                        ) : <span className="text-[#ccc]">waiting...</span>}
                      </td>
                      <td className={td}>
                        <span className={`text-[11px] px-2 py-0.5 rounded ${t.status === "full" ? "bg-[#2ecc71]/10 text-[#2ecc71]" : "bg-[#f39c12]/10 text-[#f39c12]"}`}>
                          {t.status}
                        </span>
                      </td>
                      <td className={td}>
                        <span className={`inline-block w-2.5 h-2.5 rounded-full mr-1.5 ${t.player1_ready ? "bg-[#2ecc71]" : "bg-[#ddd]"}`} />
                        <span className={`inline-block w-2.5 h-2.5 rounded-full ${t.player2_ready ? "bg-[#2ecc71]" : "bg-[#ddd]"}`} />
                      </td>
                      <td className={td + " text-[12px] text-[#999]"}>{timeAgo(t.created_at)}</td>
                      <td className={td + " text-right"}>
                        <button onClick={() => removeTeam(t.id)} className="text-[#ddd] hover:text-[#e74c3c] p-1">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {totalPages > 1 && <Pagination page={page} totalPages={totalPages} listLen={listLen} setPage={setPage} />}
            </div>

          ) : tab === "logs" ? (
            <div className="bg-white rounded shadow-sm">
              <div className="px-4 py-3 border-b border-[#eee]">
                <h3 className="text-[14px] font-semibold text-[#333]">
                  Activity Log <span className="text-[#999] font-normal ml-2">({activity.length})</span>
                </h3>
              </div>
              <table className="w-full">
                <thead><tr>
                  <th className={th}>Action</th>
                  <th className={th}>User</th>
                  <th className={th}>Details</th>
                  <th className={th}>Time</th>
                  <th className={th + " text-right"}></th>
                </tr></thead>
                <tbody>
                  {slice(activity).length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-12 text-[#bbb] text-sm">No activity</td></tr>
                  ) : slice(activity).map(a => (
                    <tr key={a.id} className="hover:bg-[#fafafa]">
                      <td className={td}>
                        <span className="text-[11px] px-2 py-0.5 rounded bg-[#ecf0f1] text-[#7f8c8d]">
                          {a.action.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className={td}>
                        {a.actor_name && <span className="font-medium text-[#333]">{a.actor_name}</span>}
                        {a.actor_phone && <span className="text-[11px] text-[#bbb] ml-1.5">{a.actor_phone}</span>}
                      </td>
                      <td className={td + " text-[12px] text-[#999] max-w-xs truncate"}>{a.details || "—"}</td>
                      <td className={td + " text-[12px] text-[#999]"}>{timeAgo(a.created_at)}</td>
                      <td className={td + " text-right"}>
                        <button onClick={() => removeLog(a.id)} className="text-[#ddd] hover:text-[#e74c3c] p-1">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {totalPages > 1 && <Pagination page={page} totalPages={totalPages} listLen={listLen} setPage={setPage} />}
            </div>

          ) : tab === "visits" ? (
            <div className="bg-white rounded shadow-sm">
              <div className="px-4 py-3 border-b border-[#eee] flex items-center justify-between">
                <h3 className="text-[14px] font-semibold text-[#333]">
                  Visits <span className="text-[#999] font-normal ml-2">({filteredVisits.length})</span>
                </h3>
                <div className="flex gap-1.5">
                  {filterBtn("All", null, visitFilter, setVisitFilter)}
                  {filterBtn("1h", "active1h", visitFilter, setVisitFilter)}
                  {filterBtn("Today", "today", visitFilter, setVisitFilter)}
                  {filterBtn("Week", "week", visitFilter, setVisitFilter)}
                </div>
              </div>
              <table className="w-full">
                <thead><tr>
                  <th className={th}>Path</th>
                  <th className={th}>IP</th>
                  <th className={th}>Referrer</th>
                  <th className={th}>Device</th>
                  <th className={th}>Time</th>
                  <th className={th + " text-right"}></th>
                </tr></thead>
                <tbody>
                  {slice(filteredVisits).length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-12 text-[#bbb] text-sm">No visits</td></tr>
                  ) : slice(filteredVisits).map(v => (
                    <tr key={v.id} className="hover:bg-[#fafafa]">
                      <td className={td + " font-medium text-[#333]"}>{v.path || "/"}</td>
                      <td className={td + " font-mono text-[12px] text-[#888]"}>{v.ip || "—"}</td>
                      <td className={td + " text-[12px] text-[#999] max-w-[180px] truncate"}>{v.referrer || "—"}</td>
                      <td className={td + " text-[11px] text-[#bbb] max-w-[200px] truncate"}>{v.user_agent || "—"}</td>
                      <td className={td + " text-[12px] text-[#999]"}>{timeAgo(v.created_at)}</td>
                      <td className={td + " text-right"}>
                        <button onClick={() => removeVisit(v.id)} className="text-[#ddd] hover:text-[#e74c3c] p-1">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {totalPages > 1 && <Pagination page={page} totalPages={totalPages} listLen={listLen} setPage={setPage} />}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Pagination({ page, totalPages, listLen, setPage }: { page: number; totalPages: number; listLen: number; setPage: (p: number | ((p: number) => number)) => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-[#eee] text-[12px] text-[#999]">
      <span>{listLen} total &middot; page {page} of {totalPages}</span>
      <div className="flex items-center gap-0.5">
        <button onClick={() => setPage((p: number) => Math.max(1, p - 1))} disabled={page <= 1}
          className="px-2 py-1 rounded hover:bg-[#ecf0f1] disabled:text-[#ddd]">
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
          let n: number;
          if (totalPages <= 7) n = i + 1;
          else if (page <= 4) n = i + 1;
          else if (page >= totalPages - 3) n = totalPages - 6 + i;
          else n = page - 3 + i;
          return (
            <button key={n} onClick={() => setPage(n)}
              className={`w-7 h-7 rounded text-[11px] ${page === n ? "bg-[#1abc9c] text-white" : "text-[#888] hover:bg-[#ecf0f1]"}`}>
              {n}
            </button>
          );
        })}
        <button onClick={() => setPage((p: number) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
          className="px-2 py-1 rounded hover:bg-[#ecf0f1] disabled:text-[#ddd]">
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
