import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api, type AgentSummary } from "../lib/api";
import {
  MessageSquare,
  Phone,
  ArrowRight,
  Send,
} from "lucide-react";

export function HomePage() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listAgents().then(setAgents).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || creating) return;
    setCreating(true);
    setError(null);
    try {
      const agent = await api.createAgent(prompt.trim());
      navigate(`/agent/${agent.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create agent");
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 nav-blur border-b border-zinc-200">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="text-sm font-medium tracking-tight">bit7</span>
          <nav className="flex items-center gap-5">
            <span className="text-[13px] text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer">Agents</span>
            <span className="text-[13px] text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer">Docs</span>
            <span className="text-[13px] text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer">Pricing</span>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-[13px] text-zinc-400 mb-6">AI-powered SMS agents</p>

          <h1 className="text-4xl sm:text-5xl font-medium leading-[1.15] mb-5 tracking-[-0.02em]">
            Describe an agent.
            <br />
            <span className="text-zinc-400">Get a number. Start texting.</span>
          </h1>

          <p className="text-[15px] text-zinc-500 leading-relaxed max-w-md mx-auto mb-10">
            Create custom AI agents that live on a phone number.
            Text them anything — they respond instantly via SMS.
          </p>

          {/* Create form */}
          <div className="max-w-lg mx-auto">
            <form onSubmit={handleCreate}>
              <div className="border border-zinc-200 bg-white">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. A nutrition AI that analyzes food photos and tracks my daily calories..."
                  rows={3}
                  className="w-full px-4 py-3 text-[14px] text-zinc-900 placeholder-zinc-400 resize-none focus:outline-none"
                  disabled={creating}
                />
                <div className="flex items-center justify-between px-4 pb-3">
                  <span className="text-[11px] text-zinc-400">
                    {prompt.length > 0 ? `${prompt.length} / 2000` : "Describe what your agent should do"}
                  </span>
                  <button
                    type="submit"
                    disabled={!prompt.trim() || creating}
                    className="btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium disabled:opacity-40"
                  >
                    {creating ? (
                      <>
                        <div className="spinner" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        Create Agent
                      </>
                    )}
                  </button>
                </div>
              </div>
              {error && (
                <p className="text-red-500 text-[13px] mt-2">{error}</p>
              )}
            </form>
          </div>
        </div>
      </section>

      {/* Agent List */}
      <section className="px-6 pb-16">
        <div className="max-w-3xl mx-auto">
          <div className="border-t border-zinc-200 pt-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[15px] font-medium">Your Agents</h2>
              {agents.length > 0 && (
                <span className="text-[11px] text-zinc-400">
                  {agents.length} agent{agents.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2 text-zinc-400 text-[13px] py-12">
                <div className="spinner" /> Loading...
              </div>
            ) : agents.length === 0 ? (
              <div className="border border-zinc-200 py-16 text-center">
                <MessageSquare className="w-5 h-5 text-zinc-300 mx-auto mb-3" />
                <p className="text-[13px] text-zinc-400">No agents yet. Create one above.</p>
              </div>
            ) : (
              <div className="border border-zinc-200 divide-y divide-zinc-200">
                {agents.map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => navigate(`/agent/${agent.id}`)}
                    className="flex items-center gap-4 w-full text-left px-4 py-3.5 hover:bg-zinc-50 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-zinc-900">
                          {agent.name}
                        </span>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 ${
                          agent.status === "active"
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-zinc-100 text-zinc-500"
                        }`}>
                          {agent.status}
                        </span>
                      </div>
                      <p className="text-[12px] text-zinc-400 truncate mt-0.5">{agent.description}</p>
                    </div>
                    {agent.phone_number && (
                      <span className="text-[12px] text-zinc-400 flex-shrink-0 font-mono flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {agent.friendly_name ?? agent.phone_number}
                      </span>
                    )}
                    <div className="flex items-center gap-4 text-[11px] text-zinc-400 flex-shrink-0">
                      <span>{agent.conversations} convos</span>
                      <span>{agent.messages} msgs</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-300 group-hover:text-zinc-500 transition-colors flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-6 border-t border-zinc-200">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <span className="text-[12px] text-zinc-400">bit7</span>
          <span className="text-[11px] text-zinc-400">AI-powered SMS agents</span>
        </div>
      </footer>
    </div>
  );
}
