import type { ReasonedIntent } from "../reasoner.js";
import type { AppContextBrief } from "../contextResearch.js";
import type { QualityBreakdown, PipelineRunArtifact, GenerateResult } from "../../types/index.js";
import type { ProgressCallback } from "../progressEmitter.js";
import type { UIComponentResult } from "../twentyFirstDevSearch.js";

/* ------------------------------------------------------------------ */
/*  Pipeline States                                                     */
/* ------------------------------------------------------------------ */

export type PipelineState =
  | "INTAKE"
  | "RESEARCHING"
  | "REASONING"
  | "PLANNING"
  | "GENERATING"
  | "VALIDATING"
  | "REPAIRING"
  | "FINALIZING"
  | "COMPLETE"
  | "FAILED";

/* ------------------------------------------------------------------ */
/*  Pipeline Context — accumulated artifacts across states              */
/* ------------------------------------------------------------------ */

export interface StateEntry {
  state: PipelineState;
  entered_at: number;
  duration_ms?: number;
}

export interface PipelineContext {
  // Identity
  runId: string;
  prompt: string;
  model: "kimi";

  // Current state
  state: PipelineState;
  stateHistory: StateEntry[];

  // Figma template (optional — pre-cached design tokens)
  figmaTemplateKey: string | null;

  // Artifacts accumulated across states
  contextBrief: AppContextBrief | null;
  competitorVisuals: unknown[] | null;

  // Web search context — discovered product info for "like X" references
  webSearchContext: string | null;
  intent: ReasonedIntent | null;
  spec: import("../../types/index.js").AppSpec | null;

  // Live search results (Figma Community + 21st.dev)
  twentyFirstDevComponents: UIComponentResult[] | null;
  // Extracted HTML structure from template pages (Webflow/Vercel/Netlify)
  templateHtmlStructure: string | null;

  // Design planning artifacts
  designBlueprint: unknown | null;
  contentMap: unknown | null;

  // Code generation artifacts
  generatedCode: string | null;
  appName: string | null;
  tagline: string | null;
  themeColor: string | null;
  pages: string[];

  // Quality artifacts
  qualityScore: number | null;
  qualityBreakdown: QualityBreakdown | null;
  pipelineArtifact: PipelineRunArtifact | null;
  pipelineSummary: string | null;

  // Degraded flag — set when LLM reasoner fails and fallback intent is used
  degraded: boolean;

  // Repair tracking
  repairCount: number;
  maxRepairs: number;

  // Error tracking
  errors: Array<{ state: PipelineState; message: string; timestamp: number }>;

  // Callbacks
  onProgress?: ProgressCallback;

  // Cancellation
  signal?: AbortSignal;

  // Final result
  result: GenerateResult | null;
}

/* ------------------------------------------------------------------ */
/*  State Handler interface                                             */
/* ------------------------------------------------------------------ */

export interface StateTransition {
  nextState: PipelineState;
}

export type StateHandler = (ctx: PipelineContext) => Promise<StateTransition>;

/* ------------------------------------------------------------------ */
/*  Score thresholds                                                     */
/* ------------------------------------------------------------------ */

export const SCORE_THRESHOLDS = {
  SHIP: 85,       // score >= 85 → FINALIZING (ship it)
  REPAIR: 55,     // score 55-84 → REPAIRING (fixable)
  FAIL: 55,       // score < 55 → FAILED (needs human)
  MAX_REPAIRS: 3, // max repair iterations
} as const;
