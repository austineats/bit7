export type InputFieldType = "text" | "textarea" | "select" | "number";
export type LayoutType = string;
export type OutputFormat = string;
export type VisualArchetype =
  | "marketplace"
  | "health_tracker"
  | "creative_studio"
  | "social_feed"
  | "finance_dashboard"
  | "learning_platform"
  | "productivity_suite"
  | "content_tool";

export type PageStructure = "centered_column" | "bento_grid" | "sidebar_main" | "split_panel" | "full_bleed_sections" | "floating_cards" | "magazine_layout" | "kanban_board";
export type NavigationType = "top_bar_tabs" | "sidebar_nav" | "bottom_tab_bar" | "floating_pill" | "contextual_tabs" | "breadcrumb_header" | "hamburger_drawer" | "segmented_control";
export type VisualMood = "glassmorphism_light" | "glassmorphism_dark" | "neubrutalism" | "soft_minimal" | "dark_premium" | "vibrant_gradient" | "clean_corporate" | "playful_rounded" | "editorial" | "warm_organic" | "neon_dark" | "monochrome_elegant";
export type HeroStyle = "gradient_banner" | "metric_dashboard" | "image_hero" | "minimal_header" | "search_hero" | "profile_hero" | "card_hero" | "none";
export type ContentPattern = "card_grid" | "asymmetric_bento" | "list_feed" | "form_to_results" | "timeline_feed" | "carousel_sections" | "tabbed_panels" | "data_table";

export interface InputField {
  key: string;
  label: string;
  type: InputFieldType;
  placeholder?: string;
  options?: string[];
  required: boolean;
  max_length?: number;
}

export interface AILogic {
  system_prompt: string;
  context_template: string;
  temperature: number;
  max_tokens: number;
}

export interface NavItem {
  id: string;
  label: string;
  icon: string;
}

export interface Screen {
  nav_id: string;
  layout: LayoutType;
  hero: {
    title: string;
    subtitle: string;
    cta_label: string;
  };
  input_fields: InputField[];
  ai_logic: AILogic;
  output_format: OutputFormat;
  output_label: string;
}

export interface AppSpec {
  schema_version: "2";
  name: string;
  tagline: string;
  description: string;
  theme: {
    primary: string;
    style: "light" | "dark" | "vibrant";
    icon: string;
  };
  navigation: NavItem[];
  screens: Screen[];
}

export interface AppRunOutput {
  text: string;
  format: OutputFormat;
}

export interface QualityBreakdown {
  layout_diversity: number;
  visual_uniqueness: number;
  domain_specificity: number;
  navigation_correctness: number;
  interaction_richness: number;
  visual_richness: number;
  form_styling: number;
  content_layout_fit: number;
}

export interface PipelineRunArtifact {
  run_id: string;
  stages: string[];
  ui_blueprint?: UIBlueprint;
  selected_candidate: "A" | "B";
  candidates: Array<{
    id: "A" | "B";
    quality_score: number;
    quality_breakdown: QualityBreakdown;
  }>;
  repaired: boolean;
}

export interface UIBlueprint {
  nav_type?: string;
  layout_skeleton?: string[];
  design_tokens?: {
    primary_color: string;
    radius: string;
    shadow_style: string;
    spacing_scale: string;
  };
  component_tree?: string[];
  interaction_plan?: string[];
  state_design?: {
    empty: string;
    loading: string;
    error: string;
    success: string;
  };
}

export interface AppVersion {
  id: string;
  app_id: string;
  label: string;
  source: "generate" | "refine" | "restore";
  created_at: string;
}

export interface GenerateResult {
  id: string;
  short_id: string;
  name: string;
  tagline: string;
  description: string;
  spec: AppSpec;
  generated_code?: string;
  pipeline_run_id?: string;
  quality_score?: number;
  quality_breakdown?: QualityBreakdown;
  latest_pipeline_summary?: string;
  shareUrl: string;
}

export interface RunResult {
  run_id: string;
  output: AppRunOutput;
  tokens_used: number;
  duration_ms: number;
}

export interface RecentApp {
  id: string;
  short_id: string;
  name: string;
  tagline?: string;
  theme_color?: string;
  run_count: number;
  created_at: string;
}
