import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, generateStream, type AppRecord, type GenerateResult, type ProgressEvent } from '../lib/api';
import { StudioHeader } from '../components/studio/StudioHeader';
import { StudioLayout } from '../components/studio/StudioLayout';
import { StudioLandingView } from '../components/studio/StudioLandingView';

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

interface PlanData {
  app_name: string;
  domain: string;
  design: string;
  features: string[];
  feature_details: Array<{ name: string; description: string }>;
  tabs: string[];
}

const DID_YOU_KNOW_TIPS = [
  'StartBox apps are built with production-ready code and modern SaaS styling.',
  'Every generated app includes AI-powered features out of the box.',
  'Apps are built with responsive layouts that work on any screen size.',
  'Our quality pipeline scores each app on 7 different dimensions.',
  'You can refine your app with Build, Visual, and Discuss modes.',
  'Generated apps include pre-populated demo data for instant previewing.',
];

let msgCounter = 0;
function newId() { return String(++msgCounter); }

// ── sessionStorage helpers ──
const SS_KEY = 'sb_gen_state';

interface PersistedState {
  generatedApp: GenerateResult | null;
  liveCode: string | null;
  chatHistory: ChatMessage[];
  selectedModel: 'sonnet' | 'opus';
  workbenchMode: 'build' | 'visual_edit' | 'discuss';
  headerView?: 'dashboard' | 'preview';
}

function saveState(s: PersistedState) {
  try { sessionStorage.setItem(SS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

function loadState(): PersistedState | null {
  try {
    const raw = sessionStorage.getItem(SS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PersistedState;
      if (parsed.chatHistory.length > 0) {
        const maxId = Math.max(...parsed.chatHistory.map((m) => Number(m.id) || 0));
        msgCounter = maxId;
      }
      return parsed;
    }
  } catch { /* ignore */ }
  return null;
}

export function GeneratorPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const restored = useRef(loadState());
  const [prompt, setPrompt] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(restored.current?.chatHistory ?? []);
  const [generating, setGenerating] = useState(false);
  const [refining, setRefining] = useState(false);
  const [generatedApp, setGeneratedApp] = useState<GenerateResult | null>(restored.current?.generatedApp ?? null);
  const [liveCode, setLiveCode] = useState<string | null>(restored.current?.liveCode ?? null);
  const [selectedModel, setSelectedModel] = useState<'sonnet' | 'opus'>(restored.current?.selectedModel ?? 'sonnet');
  const [shareCopied, setShareCopied] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');
  const [fullApp, setFullApp] = useState<AppRecord | null>(null);
  const [workbenchMode, setWorkbenchMode] = useState<'build' | 'visual_edit' | 'discuss'>(restored.current?.workbenchMode ?? 'build');
  const [headerView, setHeaderView] = useState<'dashboard' | 'preview'>(restored.current?.headerView ?? 'preview');
  const [previewRefreshTick, setPreviewRefreshTick] = useState(0);
  const abortRef = useRef<(() => void) | null>(null);
  const mountedRef = useRef(true);

  // ── Builder mode toggle ──
  // Start in builder mode if we have a restored app
  const [isBuilderMode, setIsBuilderMode] = useState(!!restored.current?.generatedApp);

  // ── Streaming state (transient only — events go into chatHistory) ──
  const [statusMessage, setStatusMessage] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [genStartTime, setGenStartTime] = useState<number | null>(null);
  const planRef = useRef<PlanData | null>(null);

  // ── Event queue for anti-batching ──
  const eventQueueRef = useRef<ProgressEvent[]>([]);
  const processingRef = useRef(false);

  // Persist state on change
  useEffect(() => {
    saveState({ generatedApp, liveCode, chatHistory, selectedModel, workbenchMode, headerView });
  }, [generatedApp, liveCode, chatHistory, selectedModel, workbenchMode, headerView]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Rotate tips during generation
  useEffect(() => {
    if (!generating) return;
    const interval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % DID_YOU_KNOW_TIPS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [generating]);

  async function refreshAppData(appId: string) {
    try {
      const app = await api.getApp(appId);
      setFullApp(app);
    } catch { /* best effort */ }
  }

  useEffect(() => {
    if (generatedApp?.id) {
      void refreshAppData(generatedApp.id);
    }
  }, [generatedApp?.id]);

  // Load app from gallery via ?app= query param
  useEffect(() => {
    const appId = searchParams.get('app');
    if (!appId) return;
    setSearchParams({}, { replace: true });
    if (generatedApp?.id === appId) return;
    (async () => {
      try {
        const app = await api.getApp(appId);
        if (!app || !mountedRef.current) return;
        setGeneratedApp({
          id: app.id,
          short_id: app.short_id,
          name: app.name,
          tagline: app.tagline ?? '',
          description: app.description,
          spec: app.spec,
          generated_code: app.generated_code,
          shareUrl: `${window.location.origin}/share/${app.short_id}`,
        });
        setLiveCode(app.generated_code ?? null);
        setFullApp(app);
        setIsBuilderMode(true);
        setChatHistory([{
          id: newId(),
          role: 'ai',
          content: `Loaded **${app.name}**${app.tagline ? ` — ${app.tagline}` : ''}. You can refine it using the chat below.`,
          type: 'message',
          timestamp: Date.now(),
        }]);
      } catch (e) {
        console.error('Failed to load app from gallery:', e);
      }
    })();
  }, [searchParams]);

  function addMessage(role: ChatRole, content: string, type: ChatType = 'message') {
    setChatHistory((prev) => [...prev, { id: newId(), role, content, type, timestamp: Date.now() }]);
  }

  // ── Event queue processor — events become persistent chat messages ──
  function processNext() {
    if (!mountedRef.current) { processingRef.current = false; return; }
    const event = eventQueueRef.current.shift();
    if (!event) { processingRef.current = false; return; }

    let delay = 0;
    switch (event.type) {
      case 'status':
        setStatusMessage(event.message);
        delay = 0;
        break;
      case 'narrative':
        setChatHistory((prev) => [
          ...prev,
          { id: newId(), role: 'ai', content: event.message, type: 'narrative', timestamp: Date.now(), data: event.data },
        ]);
        delay = 400;
        break;
      case 'plan': {
        const plan = event.data as unknown as PlanData;
        planRef.current = plan;
        const featureDetails = plan.feature_details ?? [];
        const features = featureDetails.length > 0
          ? featureDetails.map((f, i) => `${i + 1}. ${f.name} — ${f.description}`).join('\n')
          : (plan.features ?? []).map((f, i) => `${i + 1}. ${f}`).join('\n');
        const planText = [
          `**${plan.app_name}**`,
          `${plan.domain}${plan.design ? ' · ' + plan.design : ''}`,
          '',
          'Key Features:',
          features,
          '',
          `Pages: ${(plan.tabs ?? []).join(', ')}`,
        ].join('\n');
        setChatHistory((prev) => [
          ...prev,
          { id: newId(), role: 'ai', content: planText, type: 'plan', timestamp: Date.now(), data: event.data },
        ]);
        delay = 300;
        break;
      }
      case 'writing':
        setChatHistory((prev) => {
          const isMilestone = !!(event.data?.milestone);
          const content = isMilestone ? event.message : ((event.data?.path as string) ?? (event.data?.component as string) ?? event.message);
          if (prev.some((m) => m.type === 'writing' && m.content === content)) return prev;
          return [...prev, { id: newId(), role: 'ai', content, type: 'writing', timestamp: Date.now(), data: event.data }];
        });
        delay = event.data?.milestone ? 250 : 180;
        break;
      case 'created':
        setChatHistory((prev) => [
          ...prev,
          { id: newId(), role: 'ai', content: 'Created', type: 'created', timestamp: Date.now() },
        ]);
        delay = 100;
        break;
      case 'quality':
        delay = 0;
        break;
      case 'done': {
        const result = event.data as unknown as GenerateResult;
        handleStreamDone(result);
        delay = 0;
        break;
      }
      case 'error':
        handleStreamError(event.message);
        delay = 0;
        break;
    }
    setTimeout(processNext, delay);
  }

  function onStreamEvent(event: ProgressEvent) {
    eventQueueRef.current.push(event);
    if (!processingRef.current) {
      processingRef.current = true;
      processNext();
    }
  }

  function handleStreamDone(result: GenerateResult) {
    setGenerating(false);
    setGeneratedApp(result);
    setLiveCode(result.generated_code ?? null);

    if (!result.generated_code) {
      addMessage('ai', 'Generation completed but no code was produced. This can happen due to a timeout or API issue. Please try again.', 'error');
      return;
    }

    const elapsed = genStartTime ? Math.round((Date.now() - genStartTime) / 1000) : null;
    const featureCount = planRef.current?.features?.length ?? 0;
    const tabCount = planRef.current?.tabs?.length ?? 0;
    const summary = `${result.name} is ready! ` +
      (featureCount > 0 ? `Built with ${featureCount} features across ${tabCount} pages. ` : '') +
      (elapsed ? `Generated in ${elapsed}s. ` : '') +
      'You can refine it using Build, Visual, or Discuss modes below.';
    addMessage('ai', summary);

    const features = planRef.current?.features ?? [];
    setSuggestions(
      features.slice(0, 3).map((f) => `Enhance the ${f.toLowerCase()}`)
    );
  }

  function handleStreamError(msg: string) {
    setGenerating(false);
    addMessage('ai', msg, 'error');
  }

  // ── Handlers ──
  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed || generating) return;

    // Switch to builder mode when generating starts
    setIsBuilderMode(true);

    setPrompt('');
    addMessage('user', trimmed);
    setGenerating(true);
    setGeneratedApp(null);
    setLiveCode(null);
    setFullApp(null);

    setStatusMessage('Analyzing your idea...');
    setSuggestions([]);
    setCurrentTipIndex(0);
    setGenStartTime(Date.now());
    planRef.current = null;
    eventQueueRef.current = [];
    processingRef.current = false;

    try {
      const { promise, abort } = generateStream(trimmed, selectedModel, onStreamEvent);
      abortRef.current = abort;
      await promise;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : 'Generation failed. Please try again.';
      handleStreamError(msg);
    } finally {
      abortRef.current = null;
    }
  }

  async function handleRefine(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed || refining || !generatedApp) return;

    setPrompt('');
    addMessage('user', trimmed);
    setRefining(true);

    try {
      const result = await api.refineApp(generatedApp.id, trimmed, workbenchMode);
      if (result.mode === 'discuss') {
        setChatHistory((prev) => [
          ...prev,
          { id: newId(), role: 'ai', content: result.advisory ?? 'No advisory output.', type: 'message', timestamp: Date.now() },
        ]);
      } else {
        setLiveCode(result.updated_code ?? null);
        setPreviewRefreshTick((v) => v + 1);
        setChatHistory((prev) => [
          ...prev,
          {
            id: newId(),
            role: 'ai',
            content: workbenchMode === 'visual_edit' ? 'Visual polish applied.' : 'Changes applied.',
            type: 'message',
            timestamp: Date.now(),
          },
        ]);
      }
      await refreshAppData(generatedApp.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Refinement failed.';
      setChatHistory((prev) => [...prev, { id: newId(), role: 'ai', content: msg, type: 'error', timestamp: Date.now() }]);
    } finally {
      setRefining(false);
    }
  }

  function handleShare() {
    if (!generatedApp) return;
    const url = `${window.location.origin}/share/${generatedApp.short_id}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  }

  function handleNew() {
    setGeneratedApp(null);
    setLiveCode(null);
    setChatHistory([]);
    setPrompt('');
    setSuggestions([]);
    setFullApp(null);
    setActiveSection('overview');
    planRef.current = null;
    setIsBuilderMode(false);
    try { sessionStorage.removeItem(SS_KEY); } catch {}
  }

  function handleBack() {
    // Go back to landing — full reset (same as New)
    if (!generating) {
      setGeneratedApp(null);
      setLiveCode(null);
      setChatHistory([]);
      setPrompt('');
      setSuggestions([]);
      setFullApp(null);
      setActiveSection('overview');
      planRef.current = null;
      setIsBuilderMode(false);
      try { sessionStorage.removeItem(SS_KEY); } catch {}
    }
  }

  const hasApp = !!generatedApp;
  const isWorking = generating || refining;
  const showBuilder = isBuilderMode || generating || hasApp;

  // ── Render ──
  if (!showBuilder) {
    return (
      <StudioLandingView
        prompt={prompt}
        onPromptChange={setPrompt}
        onGenerate={handleGenerate}
        onStartBuilding={() => setIsBuilderMode(true)}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        isWorking={isWorking}
      />
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <StudioHeader
        appName={generatedApp?.name ?? null}
        hasApp={hasApp}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        onNew={handleNew}
        onShare={handleShare}
        shareCopied={shareCopied}
        onBack={handleBack}
        headerView={headerView}
        onHeaderViewChange={setHeaderView}
      />

      <StudioLayout
        chatHistory={chatHistory}
        generating={generating}
        refining={refining}
        hasApp={hasApp}
        statusMessage={statusMessage}
        suggestions={suggestions}
        prompt={prompt}
        onPromptChange={setPrompt}
        onGenerate={handleGenerate}
        onRefine={handleRefine}
        onSuggestionClick={setPrompt}
        workbenchMode={workbenchMode}
        onWorkbenchModeChange={setWorkbenchMode}
        isWorking={isWorking}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        liveCode={liveCode}
        generatedApp={generatedApp}
        previewRefreshTick={previewRefreshTick}
        currentTipIndex={currentTipIndex}
        fullApp={fullApp}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        onShare={handleShare}
        shareCopied={shareCopied}
        headerView={headerView}
      />
    </div>
  );
}
