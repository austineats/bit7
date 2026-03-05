import { useState } from 'react';
import { ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { StudioChatPanel } from './StudioChatPanel';
import { StudioFileTree } from './StudioFileTree';
import { StudioCodeEditor } from './StudioCodeEditor';
import { StudioPreviewPanel } from './StudioPreviewPanel';
import { DashboardSidebar } from '../dashboard/DashboardSidebar';
import { OverviewSection } from '../dashboard/sections/OverviewSection';
import { AnalyticsSection } from '../dashboard/sections/AnalyticsSection';
import { SettingsSection } from '../dashboard/sections/SettingsSection';
import { PlaceholderSection } from '../dashboard/sections/PlaceholderSection';
import type { GenerateResult, AppRecord } from '../../lib/api';

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

const PLACEHOLDER_INFO: Record<string, { title: string; description: string; icon: string }> = {
  users: { title: 'Users', description: 'Manage user access, roles, and permissions for your application.', icon: 'Users' },
  data: { title: 'Data', description: 'View and manage your application data, entities, and records.', icon: 'Database' },
  domains: { title: 'Domains', description: 'Connect custom domains and manage DNS settings.', icon: 'Globe' },
  integrations: { title: 'Integrations', description: 'Connect third-party services and APIs to your app.', icon: 'Plug' },
  security: { title: 'Security', description: 'Configure authentication, authorization, and security policies.', icon: 'Shield' },
  agents: { title: 'Agents', description: 'Create and manage AI agents that power your application.', icon: 'Bot' },
  automations: { title: 'Automations', description: 'Set up automated workflows and triggers.', icon: 'Zap' },
  logs: { title: 'Logs', description: 'Monitor application logs, errors, and system events.', icon: 'ScrollText' },
  api: { title: 'API', description: 'Access your application API endpoints and documentation.', icon: 'Terminal' },
};

interface StudioLayoutProps {
  chatHistory: ChatMessage[];
  generating: boolean;
  refining: boolean;
  hasApp: boolean;
  statusMessage: string;
  suggestions: string[];
  prompt: string;
  onPromptChange: (value: string) => void;
  onGenerate: (e: React.FormEvent) => void;
  onRefine: (e: React.FormEvent) => void;
  onSuggestionClick: (text: string) => void;
  workbenchMode: 'build' | 'visual_edit' | 'discuss';
  onWorkbenchModeChange: (mode: 'build' | 'visual_edit' | 'discuss') => void;
  isWorking: boolean;
  selectedModel: 'sonnet' | 'opus';
  onModelChange: (model: 'sonnet' | 'opus') => void;
  liveCode: string | null;
  generatedApp: GenerateResult | null;
  previewRefreshTick: number;
  currentTipIndex: number;
  fullApp: AppRecord | null;
  activeSection: string;
  onSectionChange: (section: string) => void;
  onShare: () => void;
  shareCopied: boolean;
  headerView: 'dashboard' | 'preview';
  progressPercent: number;
}

export function StudioLayout(props: StudioLayoutProps) {
  const [leftOpen, setLeftOpen] = useState(true);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const {
    chatHistory, generating, refining, hasApp, statusMessage, suggestions,
    prompt, onPromptChange, onGenerate, onRefine, onSuggestionClick,
    workbenchMode, onWorkbenchModeChange, isWorking,
    liveCode, generatedApp, previewRefreshTick, currentTipIndex,
    fullApp, activeSection, onSectionChange, onShare, shareCopied,
    headerView, progressPercent,
  } = props;

  function renderDashboardSection() {
    if (!fullApp) return null;
    switch (activeSection) {
      case 'overview':
        return <OverviewSection app={fullApp} onShare={onShare} shareCopied={shareCopied} />;
      case 'code':
        return (
          <div className="flex flex-col h-full">
            <div className="px-4 py-2 border-b border-gray-200 bg-white flex-shrink-0">
              <button
                onClick={() => onSectionChange('overview')}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Dashboard
              </button>
            </div>
            <div className="flex-1 flex overflow-hidden">
              <div className="w-64 flex-shrink-0 border-r border-gray-200 overflow-auto bg-white">
                <StudioFileTree
                  code={fullApp.generated_code ?? null}
                  selectedFile={selectedFile}
                  onSelectFile={setSelectedFile}
                />
              </div>
              <div className="flex-1 overflow-hidden">
                <StudioCodeEditor
                  code={fullApp.generated_code ?? null}
                  selectedFile={selectedFile}
                />
              </div>
            </div>
          </div>
        );
      case 'analytics':
        return <AnalyticsSection app={fullApp} />;
      case 'settings':
        return <SettingsSection app={fullApp} />;
      default: {
        const info = PLACEHOLDER_INFO[activeSection];
        if (info) return <PlaceholderSection title={info.title} description={info.description} iconName={info.icon} />;
        return null;
      }
    }
  }

  return (
    <div className="flex-1 flex bg-gray-100 overflow-hidden relative">
      {/* Left Panel — Chat */}
      {leftOpen && (
        <div className="w-80 flex-shrink-0 h-full">
          <StudioChatPanel
            chatHistory={chatHistory}
            generating={generating}
            refining={refining}
            hasApp={hasApp}
            statusMessage={statusMessage}
            suggestions={suggestions}
            prompt={prompt}
            onPromptChange={onPromptChange}
            onSubmit={hasApp ? onRefine : onGenerate}
            onSuggestionClick={onSuggestionClick}
            workbenchMode={workbenchMode}
            onWorkbenchModeChange={onWorkbenchModeChange}
            isWorking={isWorking}
            progressPercent={progressPercent}
          />
        </div>
      )}

      {/* Left toggle */}
      <button
        onClick={() => setLeftOpen(v => !v)}
        className="absolute top-1/2 -translate-y-1/2 z-10 w-6 h-12 bg-white border border-gray-200 rounded-r-lg flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
        style={{ left: leftOpen ? '320px' : '0' }}
      >
        {leftOpen ? <ChevronLeft className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
      </button>

      {/* Main content area — switches between Preview and Dashboard */}
      <div className="flex-1 flex flex-col min-w-0">
        {headerView === 'preview' ? (
          /* Preview fills the entire area */
          <div className="flex-1 overflow-hidden">
            <StudioPreviewPanel
              generatedApp={generatedApp}
              liveCode={liveCode}
              previewRefreshTick={previewRefreshTick}
              generating={generating}
              statusMessage={statusMessage}
              currentTipIndex={currentTipIndex}
              progressPercent={progressPercent}
            />
          </div>
        ) : (
          /* Dashboard: sidebar + content */
          <div className="flex-1 flex overflow-hidden">
            {activeSection !== 'code' && (
              <DashboardSidebar activeSection={activeSection} onSectionChange={onSectionChange} />
            )}
            <div className="flex-1 overflow-auto">
              {fullApp ? renderDashboardSection() : (
                <div className="flex items-center justify-center h-full">
                  <div className="w-6 h-6 border-2 border-gray-300 border-t-indigo-600 rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
