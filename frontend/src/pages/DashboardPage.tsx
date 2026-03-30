import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { api, type AgentSummary } from "../lib/api";
import {
  Plus,
  MessageSquare,
  Phone,
  Users,
  Activity,
  ArrowUpRight,
  TrendingUp,
  Search,
  Bell,
  Settings,
  LogOut,
  DollarSign,
  BarChart3,
  Headphones,
} from "lucide-react";

const MOCK_ACTIVITY = [
  { id: 1, type: "message" as const, agent: "Fitness Coach", text: "New conversation started", time: "2 min ago" },
  { id: 2, type: "message" as const, agent: "Meeting Assistant", text: "Responded to calendar query", time: "8 min ago" },
  { id: 3, type: "created" as const, agent: "Study Buddy", text: "Agent created and deployed", time: "1 hr ago" },
  { id: 4, type: "message" as const, agent: "Fitness Coach", text: "Sent training plan update", time: "3 hrs ago" },
  { id: 5, type: "message" as const, agent: "Restaurant Concierge", text: "Booking confirmed at Sushi Roku", time: "5 hrs ago" },
];

type SidebarTab = "dashboard" | "agents" | "conversations" | "analytics" | "settings";

export function DashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const hash = location.hash.replace("#", "") as SidebarTab;
  const [tab, setTab] = useState<SidebarTab>(hash || "dashboard");

  function switchTab(t: SidebarTab) {
    setTab(t);
    navigate(`/app#${t}`, { replace: true });
  }

  useEffect(() => {
    api.listAgents().then(setAgents).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const totalConversations = agents.reduce((s, a) => s + a.conversations, 0);
  const totalMessages = agents.reduce((s, a) => s + a.messages, 0);
  const activeAgents = agents.filter((a) => a.status === "active").length;

  const NAV_ITEMS: { key: SidebarTab; icon: React.ReactNode; label: string }[] = [
    { key: "dashboard", icon: <Activity className="w-4 h-4" />, label: "Dashboard" },
    { key: "agents", icon: <MessageSquare className="w-4 h-4" />, label: "Agents" },
    { key: "conversations", icon: <Users className="w-4 h-4" />, label: "Conversations" },
    { key: "analytics", icon: <TrendingUp className="w-4 h-4" />, label: "Analytics" },
    { key: "settings", icon: <Settings className="w-4 h-4" />, label: "Settings" },
  ];

  return (
    <div className="min-h-screen bg-[#e8eeea] text-zinc-900 p-3">
      <div className="min-h-[calc(100vh-24px)] bg-white rounded-3xl border border-zinc-200/60 overflow-hidden flex">
        {/* Sidebar */}
        <aside className="w-[200px] flex flex-col flex-shrink-0 border-r border-zinc-100">
          <div className="px-6 h-16 flex items-center">
            <Link to="/" className="text-[16px] font-semibold tracking-tight text-zinc-900">bubl.</Link>
          </div>

          <nav className="flex-1 px-3 py-2 space-y-0.5">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.key}
                onClick={() => switchTab(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] transition-all ${
                  tab === item.key
                    ? "text-zinc-900 font-semibold bg-[#e8eeea]/60 border-l-[3px] border-blue-500 pl-[9px]"
                    : "text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="px-3 py-5">
            <Link to="/" className="flex items-center gap-2 px-3 py-2 text-[13px] text-zinc-400 hover:text-zinc-600 transition-colors">
              <LogOut className="w-4 h-4" />
              Sign out
            </Link>
            <button className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[#e8eeea] text-[13px] font-medium text-zinc-700 hover:bg-[#dde5df] transition-colors">
              <Headphones className="w-4 h-4" />
              Support
            </button>
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <header className="h-16 flex items-center justify-between px-8 border-b border-zinc-100">
            <div className="relative">
              <input
                type="text"
                placeholder="Search"
                className="pl-4 pr-10 py-2 text-[13px] text-zinc-900 placeholder-zinc-400 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-zinc-300 w-[260px] transition-colors"
              />
              <Search className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2" />
            </div>
            <div className="flex items-center gap-4">
              <button className="p-2 rounded-xl hover:bg-zinc-50 transition-colors relative">
                <Bell className="w-[18px] h-[18px] text-zinc-400" />
              </button>
              <div className="flex items-center gap-2.5">
                <span className="text-[13px] text-zinc-600">Austin</span>
                <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-[12px] font-semibold text-blue-600">
                  A
                </div>
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 overflow-y-auto px-8 py-7">
            {tab === "dashboard" && (
              <DashboardTab
                agents={agents} loading={loading} activeAgents={activeAgents}
                totalConversations={totalConversations} totalMessages={totalMessages} navigate={navigate}
              />
            )}
            {tab === "agents" && <AgentsTab agents={agents} loading={loading} navigate={navigate} />}
            {tab === "conversations" && <ConversationsTab />}
            {tab === "analytics" && (
              <AnalyticsTab activeAgents={activeAgents} totalConversations={totalConversations} totalMessages={totalMessages} />
            )}
            {tab === "settings" && <SettingsTab />}
          </main>
        </div>
      </div>
    </div>
  );
}

/* ── Dashboard Tab ── */
function DashboardTab({
  agents, loading, activeAgents, totalConversations, totalMessages, navigate,
}: {
  agents: AgentSummary[]; loading: boolean; activeAgents: number;
  totalConversations: number; totalMessages: number; navigate: (path: string) => void;
}) {
  return (
    <>
      {/* Header row */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="text-[20px] font-semibold mb-0.5">Agent Overview</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-[#f0f5f1] rounded-2xl">
            <DollarSign className="w-4 h-4 text-zinc-500" />
            <div>
              <p className="text-[11px] text-zinc-400 leading-none">API costs</p>
              <p className="text-[18px] font-semibold text-zinc-900 leading-tight">$3.40 <span className="text-[11px] font-normal text-zinc-400">this week</span></p>
            </div>
          </div>
          <Link
            to="/create"
            className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl text-[13px] font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Agent
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-5 gap-4 mb-8">
        {[
          { label: "Active Agents", value: activeAgents, change: "+5%", up: true, accent: "border-t-blue-400" },
          { label: "Conversations", value: totalConversations, change: "+12%", up: true, accent: "border-t-emerald-400" },
          { label: "Messages", value: totalMessages, change: "+8%", up: true, accent: "border-t-purple-400" },
          { label: "Active Users", value: 24, change: "+14%", up: true, accent: "border-t-orange-400" },
          { label: "Avg Response", value: "1.2s", change: "-10%", up: false, accent: "border-t-rose-400" },
        ].map((stat) => (
          <div key={stat.label} className={`bg-white border border-zinc-100 rounded-2xl p-5 border-t-[3px] ${stat.accent}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[12px] font-medium text-zinc-900">{stat.label}</span>
              <span className={`text-[11px] font-medium ${stat.up ? "text-emerald-500" : "text-rose-500"}`}>
                ↑ {stat.change}
              </span>
            </div>
            <p className="text-[32px] font-semibold text-zinc-900 tracking-tight leading-tight mt-2">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-6">
        {/* Agents list — 3 cols */}
        <div className="col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-semibold">Your Agents</h2>
            <Link to="/create" className="text-[12px] text-blue-600 hover:text-blue-500 transition-colors flex items-center gap-1">
              Create new <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          {loading ? (
            <div className="border border-zinc-100 rounded-2xl bg-white p-12 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-zinc-200 border-t-zinc-900 rounded-full animate-spin" />
            </div>
          ) : agents.length === 0 ? (
            <div className="border border-zinc-100 rounded-2xl bg-white p-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#e8eeea] flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-5 h-5 text-zinc-400" />
              </div>
              <p className="text-[14px] font-medium text-zinc-700 mb-1">No agents yet</p>
              <p className="text-[12px] text-zinc-400 mb-5">Create your first AI SMS agent to get started.</p>
              <Link
                to="/create"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl text-[13px] font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Agent
              </Link>
            </div>
          ) : (
            <div className="border border-zinc-100 rounded-2xl bg-white divide-y divide-zinc-50">
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => navigate(`/agent/${agent.id}`)}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-zinc-50/50 transition-all text-left"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#e8eeea] flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-4 h-4 text-zinc-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[13px] font-medium">{agent.name}</span>
                    <p className="text-[11px] text-zinc-400 truncate">{agent.description}</p>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    agent.status === "active"
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-zinc-100 text-zinc-500"
                  }`}>{agent.status}</span>
                  {agent.phone_number && (
                    <span className="text-[11px] text-zinc-400 font-mono flex items-center gap-1">
                      <Phone className="w-3 h-3" />{agent.friendly_name ?? agent.phone_number}
                    </span>
                  )}
                  <div className="text-[11px] text-zinc-400 flex-shrink-0">{agent.messages} msgs</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Activity feed — 2 cols */}
        <div className="col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-semibold">Recent Activity</h2>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[11px] text-zinc-400">Live</span>
            </div>
          </div>

          <div className="border border-zinc-100 rounded-2xl bg-white divide-y divide-zinc-50">
            {MOCK_ACTIVITY.map((item) => (
              <div key={item.id} className="px-5 py-3.5 flex gap-3 hover:bg-zinc-50/50 transition-colors">
                <div className="mt-1 flex-shrink-0">
                  <div className={`w-2 h-2 rounded-full ${item.type === "created" ? "bg-blue-400" : "bg-emerald-400"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-zinc-500">
                    <span className="text-zinc-900 font-medium">{item.agent}</span>
                    {" — "}{item.text}
                  </p>
                  <p className="text-[11px] text-zinc-300 mt-0.5">{item.time}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Weekly summary */}
          <div className="mt-4 border border-zinc-100 rounded-2xl bg-[#f0f5f1] p-5">
            <p className="text-[12px] font-medium text-zinc-500 mb-3">This week</p>
            <div className="space-y-2.5">
              {[
                { label: "New conversations", value: "+12" },
                { label: "Messages processed", value: "347" },
                { label: "Avg response time", value: "1.2s" },
                { label: "API spend", value: "$3.40" },
              ].map((s) => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-[13px] text-zinc-500">{s.label}</span>
                  <span className="text-[13px] font-semibold text-zinc-900">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Agents Tab ── */
function AgentsTab({ agents, loading, navigate }: { agents: AgentSummary[]; loading: boolean; navigate: (p: string) => void }) {
  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[20px] font-semibold">Agents</h1>
        <Link to="/create" className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl text-[13px] font-medium transition-colors">
          <Plus className="w-4 h-4" /> New Agent
        </Link>
      </div>

      {loading ? (
        <div className="border border-zinc-100 rounded-2xl bg-white p-16 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-zinc-200 border-t-zinc-900 rounded-full animate-spin" />
        </div>
      ) : agents.length === 0 ? (
        <div className="border border-zinc-100 rounded-2xl bg-white p-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#e8eeea] flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-6 h-6 text-zinc-400" />
          </div>
          <p className="text-[15px] font-medium text-zinc-700 mb-1">No agents yet</p>
          <p className="text-[13px] text-zinc-400 mb-6">Create your first AI SMS agent to get started.</p>
          <Link to="/create" className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl text-[13px] font-medium transition-colors">
            <Plus className="w-4 h-4" /> Create Agent
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <button
              key={agent.id}
              onClick={() => navigate(`/agent/${agent.id}`)}
              className="p-5 rounded-2xl border border-zinc-100 bg-white hover:shadow-sm transition-all text-left"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#e8eeea] flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-zinc-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium truncate">{agent.name}</p>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    agent.status === "active" ? "bg-emerald-50 text-emerald-600" : "bg-zinc-100 text-zinc-500"
                  }`}>{agent.status}</span>
                </div>
              </div>
              <p className="text-[12px] text-zinc-400 line-clamp-2 mb-3">{agent.description}</p>
              <div className="flex items-center gap-4 text-[11px] text-zinc-400">
                {agent.phone_number && (
                  <span className="flex items-center gap-1 font-mono"><Phone className="w-3 h-3" />{agent.friendly_name ?? agent.phone_number}</span>
                )}
                <span>{agent.conversations} convos</span>
                <span>{agent.messages} msgs</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

/* ── Conversations Tab ── */
function ConversationsTab() {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-[20px] font-semibold mb-1">Conversations</h1>
        <p className="text-[14px] text-zinc-500">View all SMS conversations across your agents.</p>
      </div>
      <div className="border border-zinc-100 rounded-2xl bg-white p-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#e8eeea] flex items-center justify-center mx-auto mb-4">
          <Users className="w-6 h-6 text-zinc-400" />
        </div>
        <p className="text-[15px] font-medium text-zinc-700 mb-1">No conversations yet</p>
        <p className="text-[13px] text-zinc-400">Conversations will appear here once users text your agents.</p>
      </div>
    </>
  );
}

/* ── Analytics Tab ── */
function AnalyticsTab({ activeAgents, totalConversations, totalMessages }: { activeAgents: number; totalConversations: number; totalMessages: number }) {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-[20px] font-semibold mb-1">Analytics</h1>
        <p className="text-[14px] text-zinc-500">Usage metrics, costs, and performance insights.</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "Active Agents", value: activeAgents, change: "+2", accent: "border-t-blue-400" },
          { label: "Total Conversations", value: totalConversations, change: "+12", accent: "border-t-emerald-400" },
          { label: "Active Users", value: "24", change: "+6", accent: "border-t-orange-400" },
          { label: "Total Messages", value: totalMessages, change: "+347", accent: "border-t-purple-400" },
        ].map((stat) => (
          <div key={stat.label} className={`border border-zinc-100 rounded-2xl bg-white p-5 border-t-[3px] ${stat.accent}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[12px] font-medium text-zinc-900">{stat.label}</span>
              <span className="text-[11px] font-medium text-emerald-500">↑ {stat.change}</span>
            </div>
            <p className="text-[28px] font-semibold text-zinc-900 tracking-tight mt-2">{stat.value}</p>
            <p className="text-[11px] text-zinc-400 mt-1">this week</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* API Costs */}
        <div className="border border-zinc-100 rounded-2xl bg-white p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-[15px] font-semibold flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-rose-500" /> API Costs
            </h3>
            <span className="text-[11px] text-zinc-400">Last 30 days</span>
          </div>
          <div className="space-y-4">
            {[
              { label: "Claude API", value: "$2.18", pct: 64 },
              { label: "Twilio SMS", value: "$0.87", pct: 26 },
              { label: "Other", value: "$0.35", pct: 10 },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[13px] text-zinc-600">{item.label}</span>
                  <span className="text-[13px] font-semibold">{item.value}</span>
                </div>
                <div className="h-2 bg-[#e8eeea] rounded-full overflow-hidden">
                  <div className="h-full bg-blue-400 rounded-full" style={{ width: `${item.pct}%` }} />
                </div>
              </div>
            ))}
            <div className="pt-3 border-t border-zinc-100 flex items-center justify-between">
              <span className="text-[13px] text-zinc-500">Total</span>
              <span className="text-[16px] font-semibold">$3.40</span>
            </div>
          </div>
        </div>

        {/* Performance */}
        <div className="border border-zinc-100 rounded-2xl bg-white p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-[15px] font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-500" /> Performance
            </h3>
            <span className="text-[11px] text-zinc-400">Last 7 days</span>
          </div>
          <div className="space-y-5">
            {[
              { label: "Avg response time", value: "1.2s", target: "< 2s" },
              { label: "Success rate", value: "99.1%", target: "> 98%" },
              { label: "Uptime", value: "99.9%", target: "> 99%" },
              { label: "Error rate", value: "0.3%", target: "< 2%" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] text-zinc-600">{item.label}</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Target: {item.target}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-semibold">{item.value}</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Usage */}
        <div className="col-span-2 border border-zinc-100 rounded-2xl bg-white p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-[15px] font-semibold">Daily Usage</h3>
            <span className="text-[11px] text-zinc-400">Last 7 days</span>
          </div>
          <div className="grid grid-cols-7 gap-3">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => {
              const msgs = [42, 58, 73, 61, 89, 34, 22][i];
              const cost = [0.48, 0.62, 0.81, 0.55, 0.94, 0.28, 0.18][i];
              const max = 89;
              return (
                <div key={day} className="text-center">
                  <div className="h-24 flex items-end justify-center mb-2">
                    <div
                      className="w-8 bg-[#c5e6c8] rounded-lg hover:bg-[#a8d9ac] transition-colors"
                      style={{ height: `${(msgs / max) * 100}%` }}
                    />
                  </div>
                  <p className="text-[12px] font-medium text-zinc-600">{day}</p>
                  <p className="text-[11px] text-zinc-400">{msgs} msgs</p>
                  <p className="text-[10px] text-zinc-300">${cost.toFixed(2)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Settings Tab ── */
function SettingsTab() {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-[20px] font-semibold mb-1">Settings</h1>
        <p className="text-[14px] text-zinc-500">Manage your account and preferences.</p>
      </div>

      <div className="max-w-xl space-y-5">
        <div className="border border-zinc-100 rounded-2xl bg-white p-6">
          <h3 className="text-[14px] font-semibold mb-4">Profile</h3>
          <div className="space-y-4">
            <div>
              <label className="text-[12px] text-zinc-500 mb-1.5 block">Name</label>
              <input type="text" defaultValue="Austin" className="w-full px-4 py-2.5 text-[13px] text-zinc-900 bg-[#f0f5f1] border border-zinc-200 rounded-xl focus:outline-none focus:border-zinc-300" />
            </div>
            <div>
              <label className="text-[12px] text-zinc-500 mb-1.5 block">Email</label>
              <input type="email" defaultValue="austin@bubl.buzz" className="w-full px-4 py-2.5 text-[13px] text-zinc-900 bg-[#f0f5f1] border border-zinc-200 rounded-xl focus:outline-none focus:border-zinc-300" />
            </div>
          </div>
        </div>

        <div className="border border-zinc-100 rounded-2xl bg-white p-6">
          <h3 className="text-[14px] font-semibold mb-4">API Keys</h3>
          <div className="flex items-center justify-between px-4 py-3 bg-[#f0f5f1] border border-zinc-200 rounded-xl">
            <div>
              <p className="text-[13px] font-medium">Production key</p>
              <p className="text-[12px] text-zinc-400 font-mono">sk-bubl-••••••••••••k4Qm</p>
            </div>
            <button className="text-[12px] text-blue-600 hover:text-blue-500 transition-colors font-medium">Copy</button>
          </div>
        </div>

        <div className="border border-zinc-100 rounded-2xl bg-white p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[14px] font-semibold">Plan</h3>
            <span className="text-[11px] text-blue-600 font-semibold px-2.5 py-1 bg-blue-50 rounded-full">Free</span>
          </div>
          <p className="text-[13px] text-zinc-500 mb-4">Upgrade for more agents, higher limits, and priority support.</p>
          <button className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl text-[13px] font-medium transition-colors">
            Upgrade Plan
          </button>
        </div>

        <div className="border border-red-100 bg-red-50/50 rounded-2xl p-6">
          <h3 className="text-[14px] font-semibold text-red-600 mb-2">Danger Zone</h3>
          <p className="text-[13px] text-zinc-500 mb-4">Permanently delete your account and all agents. This cannot be undone.</p>
          <button className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-2xl text-[13px] font-medium transition-colors">
            Delete Account
          </button>
        </div>
      </div>
    </>
  );
}
