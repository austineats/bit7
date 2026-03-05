import { useEffect, useRef } from 'react';
import { Sparkles, Send, Loader2, LayoutDashboard, Palette, Code2 } from 'lucide-react';

type ChatRole = 'user' | 'ai';
type ChatType = 'message' | 'error' | 'narrative' | 'plan' | 'building' | 'writing' | 'created' | 'quality';

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  type: ChatType;
  timestamp: number;
  data?: Record<string, unknown>;
}

const SUGGESTED_PROMPTS = [
  { icon: LayoutDashboard, text: 'Create a dashboard with stats and charts' },
  { icon: Palette, text: 'Build a landing page for my SaaS product' },
  { icon: Code2, text: 'Make a task management app with auth' },
];

interface StudioChatPanelProps {
  chatHistory: ChatMessage[];
  generating: boolean;
  refining: boolean;
  hasApp: boolean;
  statusMessage: string;
  suggestions: string[];
  prompt: string;
  onPromptChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onSuggestionClick: (text: string) => void;
  workbenchMode: 'build' | 'visual_edit' | 'discuss';
  onWorkbenchModeChange: (mode: 'build' | 'visual_edit' | 'discuss') => void;
  isWorking: boolean;
  progressPercent: number;
}

export function StudioChatPanel({
  chatHistory,
  generating,
  hasApp,
  statusMessage,
  suggestions,
  prompt,
  onPromptChange,
  onSubmit,
  onSuggestionClick,
  workbenchMode,
  onWorkbenchModeChange,
  isWorking,
  progressPercent,
}: StudioChatPanelProps) {
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, suggestions]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e as unknown as React.FormEvent);
    }
  }

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-gray-900">AI Builder</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Welcome message */}
        {chatHistory.length === 0 && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-gray-100 text-gray-900">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
                <span className="text-xs font-medium text-gray-500">AI Builder</span>
              </div>
              <p className="text-sm whitespace-pre-wrap">
                Hi! I'm your AI app builder. Describe what you want to create, and I'll generate a fully functional app for you. Try prompts like "Create a dashboard" or "Build a landing page"!
              </p>
            </div>
          </div>
        )}

        {chatHistory.map(msg => {
          const isUser = msg.role === 'user';

          if (msg.type === 'building') {
            return (
              <div key={msg.id} className="flex items-start gap-2 px-2 py-0.5">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-indigo-500" />
                <span className="text-sm text-indigo-700">{msg.content}</span>
              </div>
            );
          }

          if (msg.type === 'writing') {
            return (
              <div key={msg.id} className="flex items-center gap-2 px-3 py-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                {msg.data?.milestone ? (
                  <span className="text-xs font-medium text-indigo-600">{msg.content}</span>
                ) : (
                  <span className="text-xs text-gray-400">
                    <span className="text-gray-500">Wrote</span>{' '}
                    <span className="font-mono">{msg.content}</span>
                  </span>
                )}
              </div>
            );
          }

          if (msg.type === 'created') {
            return (
              <div key={msg.id} className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg border border-green-100">
                <span className="text-green-600 font-medium text-sm">&#10003;</span>
                <span className="text-sm text-green-700">Components created</span>
              </div>
            );
          }

          if (msg.type === 'quality') return null;

          if (msg.type === 'plan') {
            const lines = msg.content.split('\n');
            return (
              <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-indigo-50 border border-indigo-100 text-gray-900">
                  {lines.map((line, i) => {
                    if (!line.trim()) return <div key={i} className="h-1.5" />;
                    if (line.startsWith('**') && line.endsWith('**'))
                      return <div key={i} className="font-bold text-gray-900 text-base">{line.slice(2, -2)}</div>;
                    if (/^\d+\.\s/.test(line)) {
                      const [num, ...rest] = line.split('. ');
                      const text = rest.join('. ');
                      const [name, desc] = text.includes(' — ') ? text.split(' — ') : [text, ''];
                      return (
                        <div key={i} className="flex gap-2 text-sm mt-1">
                          <span className="text-indigo-500 font-medium">{num}.</span>
                          <span><strong>{name}</strong>{desc ? ` — ${desc}` : ''}</span>
                        </div>
                      );
                    }
                    if (line.startsWith('Key Features:'))
                      return <div key={i} className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-2 mb-1">{line}</div>;
                    if (line.startsWith('Pages:'))
                      return <div key={i} className="text-xs text-indigo-600 mt-2">{line}</div>;
                    return <div key={i} className="text-sm text-gray-600">{line}</div>;
                  })}
                </div>
              </div>
            );
          }

          return (
            <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  isUser
                    ? 'bg-gray-900 text-white'
                    : msg.type === 'error'
                      ? 'bg-red-50 text-red-700 border border-red-100'
                      : 'bg-gray-100 text-gray-900'
                }`}
              >
                {!isUser && (
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                      <Sparkles className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-xs font-medium text-gray-500">AI Builder</span>
                  </div>
                )}
                <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
              </div>
            </div>
          );
        })}

        {/* Generation progress */}
        {generating && statusMessage && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-indigo-50 border border-indigo-100">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                <div className="flex-1">
                  <p className="text-sm text-indigo-900">{statusMessage}</p>
                  <div className="mt-2 h-1.5 bg-indigo-200 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-600 rounded-full transition-all duration-700 ease-out" style={{ width: `${progressPercent}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Suggested prompts (when few messages) */}
        {chatHistory.length < 3 && !hasApp && !generating && (
          <div className="px-0 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-2">Try these prompts:</p>
            <div className="space-y-2">
              {SUGGESTED_PROMPTS.map(sp => {
                const Icon = sp.icon;
                return (
                  <button
                    key={sp.text}
                    onClick={() => onSuggestionClick(sp.text)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                  >
                    <Icon className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700">{sp.text}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Refinement suggestion chips */}
        {hasApp && suggestions.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">Suggestions</div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map(s => (
                <button
                  key={s}
                  onClick={() => onSuggestionClick(s)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-indigo-200 hover:text-indigo-600 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input area */}
      <div className="p-4 border-t border-gray-200 bg-white flex-shrink-0">
        {hasApp && (
          <div className="flex items-center gap-1 mb-3">
            {(['build', 'visual_edit', 'discuss'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => onWorkbenchModeChange(mode)}
                disabled={isWorking}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  workbenchMode === mode
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-500 hover:bg-gray-100'
                } disabled:opacity-50`}
              >
                {mode === 'build' ? 'Build' : mode === 'visual_edit' ? 'Visual' : 'Discuss'}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={onSubmit} className="relative">
          <textarea
            value={prompt}
            onChange={e => onPromptChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              hasApp
                ? workbenchMode === 'visual_edit'
                  ? 'Polish visual style: spacing, typography, shadows...'
                  : workbenchMode === 'discuss'
                    ? 'Ask for strategy feedback...'
                    : 'Request changes: features, tabs, flows...'
                : 'Describe your app...'
            }
            rows={3}
            disabled={isWorking}
            className="w-full min-h-[92px] px-4 py-3.5 pr-14 pb-12 rounded-xl border border-gray-300 bg-white text-sm text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 transition-all"
          />
          <button
            type="submit"
            disabled={isWorking || !prompt.trim()}
            className="absolute right-3 bottom-3 w-9 h-9 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {isWorking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
        <p className="mt-2 text-xs text-gray-500 text-center">Press Enter to send, Shift+Enter for new line</p>
      </div>
    </div>
  );
}
