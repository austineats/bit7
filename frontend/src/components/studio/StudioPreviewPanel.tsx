import { useState, useRef, useEffect, useCallback } from 'react';
import { Monitor, Smartphone, RefreshCw, ExternalLink, Maximize2, Minimize2, Sparkles, Wifi, Battery, Signal } from 'lucide-react';
import { AppPreview } from '../AppPreview';
import type { GenerateResult } from '../../lib/api';

const DID_YOU_KNOW_TIPS = [
  'StartBox apps are built with production-ready code and modern SaaS styling.',
  'Every generated app includes AI-powered features out of the box.',
  'Apps are built with responsive layouts that work on any screen size.',
  'Our quality pipeline scores each app on 7 different dimensions.',
  'You can refine your app with Build, Visual, and Discuss modes.',
  'Generated apps include pre-populated demo data for instant previewing.',
];

interface StudioPreviewPanelProps {
  generatedApp: GenerateResult | null;
  liveCode: string | null;
  previewRefreshTick: number;
  generating: boolean;
  statusMessage: string;
  currentTipIndex: number;
}

type Viewport = 'desktop' | 'mobile';

// iPhone 15 logical dimensions
const PHONE_SCREEN_W = 375;
const PHONE_SCREEN_H = 812;
const PHONE_BEZEL = 10;
const PHONE_OUTER_W = PHONE_SCREEN_W + PHONE_BEZEL * 2; // 395
const PHONE_OUTER_H = PHONE_SCREEN_H + PHONE_BEZEL * 2; // 832

const VIEWPORT_LABELS: Record<Viewport, string> = {
  desktop: 'Desktop',
  mobile: `iPhone · ${PHONE_SCREEN_W}×${PHONE_SCREEN_H}`,
};

function PhoneStatusBar() {
  const now = new Date();
  const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return (
    <div
      className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6"
      style={{ height: 48, pointerEvents: 'none' }}
    >
      <span className="text-[13px] font-semibold text-black/80">{time}</span>
      <div className="flex items-center gap-1">
        <Signal className="w-[14px] h-[14px] text-black/70" />
        <Wifi className="w-[14px] h-[14px] text-black/70" />
        <Battery className="w-[18px] h-[18px] text-black/70" />
      </div>
    </div>
  );
}

function PhoneDynamicIsland() {
  return (
    <div
      className="absolute top-[10px] left-1/2 -translate-x-1/2 z-30 rounded-full bg-black"
      style={{ width: 120, height: 34 }}
    >
      {/* Camera dot */}
      <div
        className="absolute top-1/2 -translate-y-1/2 rounded-full bg-gray-800 border border-gray-700"
        style={{ width: 10, height: 10, right: 18 }}
      />
    </div>
  );
}

function PhoneHomeIndicator() {
  return (
    <div className="absolute bottom-[6px] left-1/2 -translate-x-1/2 z-20" style={{ pointerEvents: 'none' }}>
      <div className="rounded-full bg-black/20" style={{ width: 134, height: 5 }} />
    </div>
  );
}

export function StudioPreviewPanel({
  generatedApp,
  liveCode,
  previewRefreshTick,
  generating,
  statusMessage,
  currentTipIndex,
}: StudioPreviewPanelProps) {
  const [viewport, setViewport] = useState<Viewport>('desktop');
  const [refreshKey, setRefreshKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [phoneScale, setPhoneScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scale the phone to fit available space
  const computeScale = useCallback(() => {
    if (!containerRef.current || viewport !== 'mobile') return;
    const rect = containerRef.current.getBoundingClientRect();
    const availH = rect.height - 32; // 16px padding top+bottom
    const availW = rect.width - 32;
    const scaleH = availH / PHONE_OUTER_H;
    const scaleW = availW / PHONE_OUTER_W;
    const s = Math.min(scaleH, scaleW, 1); // never scale up
    setPhoneScale(Math.max(s, 0.4)); // minimum 40% scale
  }, [viewport]);

  useEffect(() => {
    computeScale();
    window.addEventListener('resize', computeScale);
    return () => window.removeEventListener('resize', computeScale);
  }, [computeScale]);

  const hasApp = !!generatedApp;

  // Loading state during generation
  if (generating && !hasApp) {
    return (
      <div className="flex flex-col h-full bg-gray-50">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center px-8">
            <div className="relative w-16 h-16 mx-auto mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <div className="absolute inset-0 rounded-2xl border-2 border-indigo-300 animate-ping opacity-20" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Building your idea...</h3>
            <p className="text-sm text-indigo-600 mb-6">{statusMessage}</p>
            <div className="w-48 h-1.5 bg-gray-200 rounded-full mx-auto overflow-hidden mb-6">
              <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full animate-pulse" style={{ width: '60%' }} />
            </div>
            <div className="bg-indigo-50 rounded-lg px-4 py-3 max-w-xs mx-auto">
              <div className="text-[10px] font-medium text-indigo-400 uppercase tracking-wider mb-1">Did you know?</div>
              <div className="text-xs text-indigo-700">{DID_YOU_KNOW_TIPS[currentTipIndex]}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No app — empty state
  if (!hasApp || !liveCode) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-100 text-gray-400">
        <div className="w-20 h-20 rounded-2xl bg-gray-200 flex items-center justify-center mb-4">
          <Monitor className="w-10 h-10" />
        </div>
        <p className="text-lg font-medium text-gray-600">No app to preview</p>
        <p className="text-sm mt-1 text-center max-w-xs">Generate an app using the chat to see a live preview here</p>
      </div>
    );
  }

  const isMobile = viewport === 'mobile';

  return (
    <div className="flex flex-col h-full bg-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white flex-shrink-0">
        {/* Device switcher */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {([
            { id: 'desktop' as const, icon: Monitor, label: 'Desktop view' },
            { id: 'mobile' as const, icon: Smartphone, label: 'Mobile view' },
          ]).map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setViewport(id)}
              title={label}
              className={`p-2 rounded-md transition-colors ${
                viewport === id
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>

        {/* App name */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 truncate max-w-[200px]">{generatedApp.name}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            title="Refresh preview"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              const url = `/share/${generatedApp.short_id}`;
              window.open(url, '_blank');
            }}
            className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            title="Open in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsFullscreen(v => !v)}
            className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            title="Toggle fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Preview area */}
      <div ref={containerRef} className="flex-1 overflow-hidden flex items-center justify-center p-4">
        {isMobile ? (
          /* ── iPhone device frame ── */
          <div
            style={{
              transform: `scale(${phoneScale})`,
              transformOrigin: 'center center',
              width: PHONE_OUTER_W,
              height: PHONE_OUTER_H,
              flexShrink: 0,
            }}
          >
            {/* Outer bezel */}
            <div
              className="relative bg-[#1a1a1a] shadow-2xl"
              style={{
                width: PHONE_OUTER_W,
                height: PHONE_OUTER_H,
                borderRadius: 48,
                padding: PHONE_BEZEL,
                boxShadow: '0 25px 60px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.08) inset',
              }}
            >
              {/* Side buttons */}
              <div
                className="absolute bg-[#2a2a2a] rounded-r"
                style={{ width: 3, height: 28, top: 120, left: -1 }}
              />
              <div
                className="absolute bg-[#2a2a2a] rounded-r"
                style={{ width: 3, height: 52, top: 170, left: -1 }}
              />
              <div
                className="absolute bg-[#2a2a2a] rounded-r"
                style={{ width: 3, height: 52, top: 230, left: -1 }}
              />
              <div
                className="absolute bg-[#2a2a2a] rounded-l"
                style={{ width: 3, height: 80, top: 180, right: -1 }}
              />

              {/* Inner screen area */}
              <div
                className="relative overflow-hidden bg-white"
                style={{
                  width: PHONE_SCREEN_W,
                  height: PHONE_SCREEN_H,
                  borderRadius: 38,
                }}
              >
                {/* Dynamic Island */}
                <PhoneDynamicIsland />

                {/* Status bar */}
                <PhoneStatusBar />

                {/* Home indicator */}
                <PhoneHomeIndicator />

                {/* App iframe */}
                <AppPreview
                  key={`${generatedApp.id}:${previewRefreshTick}:${refreshKey}`}
                  code={liveCode}
                  appId={generatedApp.id}
                  height="100%"
                  mobile={true}
                />
              </div>
            </div>
          </div>
        ) : (
          /* ── Desktop preview ── */
          <div
            className="relative bg-white rounded-lg shadow-lg overflow-hidden transition-all duration-300"
            style={{
              width: '100%',
              height: '100%',
              minHeight: '500px',
            }}
          >
            <AppPreview
              key={`${generatedApp.id}:${previewRefreshTick}:${refreshKey}`}
              code={liveCode}
              appId={generatedApp.id}
              height="100%"
              mobile={false}
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 bg-white text-xs text-gray-500 flex-shrink-0">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            Live Preview
          </span>
          <span>{VIEWPORT_LABELS[viewport]}</span>
        </div>
      </div>
    </div>
  );
}
