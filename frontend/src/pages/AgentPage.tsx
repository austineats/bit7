import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  api,
  type AgentDetail,
  type ConversationSummary,
  type MessageItem,
} from "../lib/api";
import {
  ArrowLeft,
  Phone,
  MessageSquare,
  Copy,
  Check,
  Settings,
  Trash2,
  User,
  Activity,
  ChevronRight,
} from "lucide-react";

type Tab = "overview" | "conversations" | "settings";

export function AgentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");
  const [copied, setCopied] = useState(false);

  const [convos, setConvos] = useState<ConversationSummary[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.getAgent(id).then(setAgent).catch(() => navigate("/")).finally(() => setLoading(false));
  }, [id, navigate]);

  useEffect(() => {
    if (!id || tab !== "conversations") return;
    api.getConversations(id).then(setConvos).catch(() => {});
  }, [id, tab]);

  useEffect(() => {
    if (!id || !selectedConvo) return;
    setLoadingMessages(true);
    api.getMessages(id, selectedConvo).then(setMessages).catch(() => {}).finally(() => setLoadingMessages(false));
  }, [id, selectedConvo]);

  function copyNumber() {
    if (!agent?.phone_number) return;
    navigator.clipboard.writeText(agent.phone_number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleDelete() {
    if (!id || !confirm("Archive this agent and release its phone number?")) return;
    await api.deleteAgent(id);
    navigate("/");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="spinner-lg" />
      </div>
    );
  }

  if (!agent) return null;

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "overview", label: "Overview", icon: <Activity className="w-3.5 h-3.5" /> },
    { key: "conversations", label: "Conversations", icon: <MessageSquare className="w-3.5 h-3.5" /> },
    { key: "settings", label: "Settings", icon: <Settings className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 nav-blur border-b border-zinc-200">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center gap-3">
          <button onClick={() => navigate("/")} className="p-1.5 -ml-1.5 hover:bg-zinc-100 transition-colors">
            <ArrowLeft className="w-4 h-4 text-zinc-400" />
          </button>
          <div className="w-px h-4 bg-zinc-200" />
          <span className="text-sm font-medium">bubl.</span>
          <ChevronRight className="w-3 h-3 text-zinc-300" />
          <span className="text-[13px] text-zinc-500 truncate">{agent.name}</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 pt-24 pb-16">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2.5 mb-1.5">
            <h1 className="text-xl font-medium">{agent.name}</h1>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 ${
              agent.status === "active"
                ? "bg-emerald-50 text-emerald-600"
                : "bg-zinc-100 text-zinc-500"
            }`}>
              {agent.status}
            </span>
          </div>
          <p className="text-[13px] text-zinc-500">{agent.description}</p>
        </div>

        {/* Phone Number */}
        {agent.phone_number && (
          <div className="border border-zinc-200 px-4 py-3.5 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-zinc-400" />
              <div>
                <p className="text-[11px] text-zinc-400">Text this number</p>
                <p className="text-[15px] font-medium font-mono">{agent.friendly_name ?? agent.phone_number}</p>
              </div>
            </div>
            <button
              onClick={copyNumber}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-zinc-500 hover:bg-zinc-50 border border-zinc-200 transition-colors"
            >
              {copied ? <><Check className="w-3.5 h-3.5 text-emerald-500" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-px bg-zinc-200 border border-zinc-200 mb-8">
          {[
            { label: "Conversations", value: agent.conversations },
            { label: "Messages", value: agent.messages },
            { label: "Capabilities", value: (agent.capabilities as string[]).length },
          ].map((stat) => (
            <div key={stat.label} className="bg-white px-4 py-3 text-center">
              <p className="text-lg font-medium">{stat.value}</p>
              <p className="text-[11px] text-zinc-400">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-px border-b border-zinc-200 mb-6">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-[13px] transition-colors border-b-2 -mb-px ${
                tab === t.key
                  ? "border-zinc-900 text-zinc-900 font-medium"
                  : "border-transparent text-zinc-400 hover:text-zinc-600"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === "overview" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-[13px] font-medium text-zinc-500 mb-2">Capabilities</h3>
              <div className="flex flex-wrap gap-1.5">
                {(agent.capabilities as string[]).map((cap) => (
                  <span key={cap} className="px-2.5 py-1 bg-zinc-100 text-[12px] text-zinc-600">
                    {cap}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-[13px] font-medium text-zinc-500 mb-2">System Prompt</h3>
              <div className="border border-zinc-200 p-4">
                <pre className="text-[13px] text-zinc-700 whitespace-pre-wrap font-mono leading-relaxed max-h-72 overflow-y-auto">
                  {agent.system_prompt}
                </pre>
              </div>
            </div>

            {agent.personality && (
              <div>
                <h3 className="text-[13px] font-medium text-zinc-500 mb-2">Personality</h3>
                <div className="grid grid-cols-3 gap-px bg-zinc-200 border border-zinc-200">
                  {[
                    { label: "Tone", value: agent.personality.tone },
                    { label: "Style", value: agent.personality.style },
                    { label: "Emoji", value: agent.personality.emoji_usage },
                  ].map((p) => (
                    <div key={p.label} className="bg-white px-4 py-3">
                      <p className="text-[11px] text-zinc-400 mb-0.5">{p.label}</p>
                      <p className="text-[13px] font-medium capitalize">{p.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "conversations" && (
          <div>
            {selectedConvo ? (
              <div>
                <button
                  onClick={() => { setSelectedConvo(null); setMessages([]); }}
                  className="flex items-center gap-1.5 text-[13px] text-zinc-400 hover:text-zinc-900 mb-4 transition-colors"
                >
                  <ArrowLeft className="w-3 h-3" /> Back
                </button>

                {loadingMessages ? (
                  <div className="flex items-center justify-center gap-2 text-zinc-400 text-[13px] py-8">
                    <div className="spinner" /> Loading...
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                    {messages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] px-3.5 py-2.5 ${
                          msg.direction === "outbound"
                            ? "bg-zinc-900 text-white"
                            : "bg-zinc-100 text-zinc-900"
                        }`}>
                          <p className="text-[13px] whitespace-pre-wrap leading-relaxed">{msg.body}</p>
                          <p className={`text-[10px] mt-1 ${msg.direction === "outbound" ? "text-zinc-400" : "text-zinc-400"}`}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : convos.length === 0 ? (
              <div className="border border-zinc-200 py-16 text-center">
                <MessageSquare className="w-5 h-5 text-zinc-300 mx-auto mb-3" />
                <p className="text-[13px] text-zinc-400">
                  No conversations yet. Text {agent.friendly_name ?? agent.phone_number} to start one.
                </p>
              </div>
            ) : (
              <div className="border border-zinc-200 divide-y divide-zinc-200">
                {convos.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedConvo(c.id)}
                    className="flex items-center gap-3 w-full text-left px-4 py-3 hover:bg-zinc-50 transition-colors group"
                  >
                    <User className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium font-mono">{c.from_number}</p>
                      <p className="text-[11px] text-zinc-400">{c.message_count} messages</p>
                    </div>
                    <span className="text-[11px] text-zinc-400">{new Date(c.last_message_at).toLocaleDateString()}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-300 flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "settings" && (
          <div className="max-w-md space-y-6">
            <div>
              <h3 className="text-[13px] font-medium text-zinc-500 mb-2">Model</h3>
              <div className="border border-zinc-200 px-3.5 py-2.5">
                <p className="text-[13px] font-mono text-zinc-700">{agent.model}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <h3 className="text-[13px] font-medium text-zinc-500 mb-2">Temperature</h3>
                <div className="border border-zinc-200 px-3.5 py-2.5">
                  <p className="text-[13px] font-mono text-zinc-700">{agent.temperature}</p>
                </div>
              </div>
              <div>
                <h3 className="text-[13px] font-medium text-zinc-500 mb-2">Max Tokens</h3>
                <div className="border border-zinc-200 px-3.5 py-2.5">
                  <p className="text-[13px] font-mono text-zinc-700">{agent.max_tokens}</p>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-[13px] font-medium text-zinc-500 mb-2">Original Prompt</h3>
              <div className="border border-zinc-200 px-3.5 py-2.5">
                <p className="text-[13px] text-zinc-500 italic">"{agent.original_prompt}"</p>
              </div>
            </div>

            <div className="border border-red-200 bg-red-50 p-4 mt-8">
              <h3 className="text-[13px] font-medium text-red-600 flex items-center gap-1.5 mb-1.5">
                <Trash2 className="w-3.5 h-3.5" /> Danger Zone
              </h3>
              <p className="text-[12px] text-zinc-500 mb-3">
                Archive this agent and release its phone number. Cannot be undone.
              </p>
              <button
                onClick={handleDelete}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-[13px] font-medium transition-colors"
              >
                Archive Agent
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
