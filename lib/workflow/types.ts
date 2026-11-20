export type WorkflowStage =
  | "IDEA"
  | "CONTENT_RESEARCH"
  | "HOOK_GENERATION"
  | "SCRIPT_GENERATION"
  | "SCRIPT_APPROVAL"
  | "STORYBOARD_GENERATION"
  | "SCENE_GENERATION"
  | "VOICEOVER_GENERATION"
  | "SUBTITLE_GENERATION"
  | "VIDEO_COMPOSITION"
  | "QUALITY_CONTROL"
  | "FINAL_VIDEO_APPROVAL"
  | "PAGE_SELECTION"
  | "CAPTION_GENERATION"
  | "SCHEDULING"
  | "PUBLISHING_QUEUE";

export type WorkflowStatus =
  | "draft"
  | "queued"
  | "running"
  | "paused"
  | "waiting_for_approval"
  | "completed"
  | "failed"
  | "cancelled";

export type ApprovalMode =
  | "fully_manual"
  | "script_approval"
  | "final_video_approval"
  | "fully_automated";

export type QualityStatus = "passed" | "warning" | "failed";

export const WORKFLOW_STAGES_ORDER: WorkflowStage[] = [
  "IDEA",
  "CONTENT_RESEARCH",
  "HOOK_GENERATION",
  "SCRIPT_GENERATION",
  "SCRIPT_APPROVAL",
  "STORYBOARD_GENERATION",
  "SCENE_GENERATION",
  "VOICEOVER_GENERATION",
  "SUBTITLE_GENERATION",
  "VIDEO_COMPOSITION",
  "QUALITY_CONTROL",
  "FINAL_VIDEO_APPROVAL",
  "PAGE_SELECTION",
  "CAPTION_GENERATION",
  "SCHEDULING",
  "PUBLISHING_QUEUE",
];

export const STAGE_PROGRESS_MAP: Record<WorkflowStage, number> = {
  IDEA: 6,
  CONTENT_RESEARCH: 12,
  HOOK_GENERATION: 18,
  SCRIPT_GENERATION: 25,
  SCRIPT_APPROVAL: 30,
  STORYBOARD_GENERATION: 38,
  SCENE_GENERATION: 50,
  VOICEOVER_GENERATION: 60,
  SUBTITLE_GENERATION: 70,
  VIDEO_COMPOSITION: 80,
  QUALITY_CONTROL: 88,
  FINAL_VIDEO_APPROVAL: 92,
  PAGE_SELECTION: 94,
  CAPTION_GENERATION: 96,
  SCHEDULING: 98,
  PUBLISHING_QUEUE: 100,
};

export const STAGE_LABELS: Record<WorkflowStage, string> = {
  IDEA: "Content Idea",
  CONTENT_RESEARCH: "Trend Research",
  HOOK_GENERATION: "Viral Hooks",
  SCRIPT_GENERATION: "Script Writing",
  SCRIPT_APPROVAL: "Script Approval",
  STORYBOARD_GENERATION: "Scene Storyboard",
  SCENE_GENERATION: "AI Scene Generation",
  VOICEOVER_GENERATION: "Voiceover Synthesis",
  SUBTITLE_GENERATION: "Dynamic Subtitles",
  VIDEO_COMPOSITION: "Video Rendering",
  QUALITY_CONTROL: "Automated QC",
  FINAL_VIDEO_APPROVAL: "Final Video Approval",
  PAGE_SELECTION: "Target Pages",
  CAPTION_GENERATION: "Page Captions",
  SCHEDULING: "Timezone Scheduling",
  PUBLISHING_QUEUE: "Publishing Queue",
};

export interface WorkflowConfiguration {
  // Content Generation
  niche?: string;
  category?: string;
  target_audience?: string;
  target_country?: string;
  language?: string;
  video_format?: "reels_vertical" | "story_vertical" | "square";
  video_duration?: number; // seconds
  num_scenes?: number;
  content_tone?: string;
  creativity_level?: number; // 0.1 to 1.0
  topic?: string;

  // Video Settings
  aspect_ratio?: "9:16" | "16:9" | "1:1";
  resolution?: "1080x1920" | "720x1280";
  video_provider?: "replicate" | "runway" | "mock";
  video_model?: string;
  scene_duration?: number;
  transition_style?: string;
  background_music?: string;
  voice_provider?: "elevenlabs" | "openai" | "mock";
  voice_id?: string;
  subtitle_preset?: "classic" | "bold_viral" | "karaoke" | "minimal" | "highlight_keywords";

  // Branding
  logo_url?: string;
  watermark_text?: string;
  watermark_position?: "top_left" | "top_right" | "bottom_left" | "bottom_right";
  brand_colors?: string[];
  intro_url?: string;
  outro_url?: string;
  page_specific_branding?: boolean;

  // Publishing & Scheduling
  target_page_ids: string[];
  posting_frequency?: number;
  publishing_timezone?: string;
  preferred_posting_time?: string;
  auto_schedule?: boolean;
  approval_mode?: ApprovalMode;

  // Cost & Budget Limits
  max_cost_per_video?: number;
  daily_budget_limit?: number;
}

export interface QualityCheckItem {
  id: string;
  label: string;
  status: QualityStatus;
  message: string;
  value?: string | number | boolean;
  expected?: string | number | boolean;
}

export interface QualityControlReport {
  overall_status: QualityStatus;
  checked_at: string;
  checks: QualityCheckItem[];
  metrics: {
    duration_seconds?: number;
    resolution?: string;
    aspect_ratio?: string;
    file_size_bytes?: number;
    audio_tracks?: number;
    scene_count?: number;
    subtitles_synced?: boolean;
    black_frames_detected?: boolean;
    corrupted_frames?: boolean;
  };
  summary: string;
}

export interface PageVariation {
  page_id: string;
  page_name: string;
  custom_hook: string;
  caption: string;
  hashtags: string[];
  watermark_text?: string;
  similarity_score?: number; // 0.0 to 1.0 vs primary or other pages
  scheduled_at?: string;
  publishing_job_id?: string;
}

export interface AutomationWorkflow {
  id: string;
  user_id: string;
  workflow_name: string;
  configuration: WorkflowConfiguration;
  status: WorkflowStatus;
  current_stage: WorkflowStage;
  progress: number;
  approval_mode: ApprovalMode;
  content_idea_id?: string | null;
  script_id?: string | null;
  storyboard_id?: string | null;
  video_id?: string | null;
  quality_report?: QualityControlReport | null;
  page_variations?: PageVariation[];
  failed_stage?: WorkflowStage | null;
  error_message?: string | null;
  estimated_cost: number;
  actual_cost: number;
  locked_at?: string | null;
  locked_by?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;

  // Joined relations when queried
  content_idea?: {
    id: string;
    title: string;
    description?: string;
    hook?: string;
    viral_potential?: string;
    niche?: string;
  } | null;
  video?: {
    id: string;
    title: string;
    render_status: string;
    final_video_path?: string | null;
    video_url?: string | null;
    duration_seconds?: number;
    aspect_ratio?: string;
    resolution?: string;
  } | null;
  target_pages?: Array<{
    id: string;
    page_name: string;
    facebook_page_id: string;
  }>;
}

export interface WorkflowSummaryMetrics {
  total_workflows: number;
  running_workflows: number;
  waiting_for_approval: number;
  completed_workflows: number;
  failed_workflows: number;
  videos_generated_today: number;
  estimated_ai_cost: number;
  avg_production_time_seconds: number;
}
