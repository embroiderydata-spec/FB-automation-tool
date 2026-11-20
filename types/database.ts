// Types representing database tables and domain entities for the AI Facebook Page Automation Platform

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "user" | "admin" | "editor";
export type AccountConnectionStatus = "connected" | "expired" | "disconnected" | "error" | "reauthorization_required";
export type PageConnectionStatus = "active" | "paused" | "disconnected" | "revoked" | "error";
export type ContentIdeaStatus = "draft" | "approved" | "rejected" | "in_production" | "used";
export type VideoStatus = "draft" | "generating" | "ready" | "failed" | "scheduled" | "published";
export type PostStatus = "draft" | "scheduled" | "publishing" | "published" | "failed" | "cancelled";
export type PublishingJobStatus = "queued" | "processing" | "completed" | "failed" | "retrying";
export type AIJobStatus = "queued" | "processing" | "completed" | "failed";
export type LogLevel = "info" | "warn" | "error" | "debug";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface FacebookAccount {
  id: string;
  user_id: string;
  facebook_user_id: string;
  fb_user_id?: string;
  display_name: string;
  name?: string;
  email?: string | null;
  encrypted_access_token?: string;
  access_token?: string;
  token_expires_at?: string | null;
  granted_permissions: string[];
  connection_status: AccountConnectionStatus;
  status?: string;
  connected_at: string;
  last_verified_at?: string | null;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface FacebookPage {
  id: string;
  user_id: string;
  facebook_account_id?: string | null;
  account_id?: string | null;
  facebook_page_id: string;
  fb_page_id?: string;
  page_name: string;
  name?: string;
  category?: string | null;
  profile_picture_url?: string | null;
  picture_url?: string | null;
  encrypted_page_access_token?: string;
  page_access_token?: string;
  page_token_expires_at?: string | null;
  assigned_tasks: string[];
  followers_count?: number;
  connection_status: PageConnectionStatus;
  status?: string;
  automation_enabled: boolean;
  last_synced_at?: string | null;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;

  // Joined relations (optional in queries)
  settings?: PageSettings | null;
  account?: FacebookAccount | null;
}

export interface PageSettings {
  id: string;
  facebook_page_id: string;
  page_id?: string;
  user_id?: string;
  niche?: string | null;
  content_category?: string | null;
  content_style?: string;
  target_country?: string;
  target_audience?: string | null;
  language?: string;
  timezone?: string;
  posting_days?: string[];
  posting_schedule?: string[] | Record<string, any>;
  posts_per_day?: number;
  daily_post_limit?: number;
  video_duration_min?: number;
  video_duration_max?: number;
  aspect_ratio?: string;
  voice_preference?: string | null;
  require_approval?: boolean;
  content_generation_enabled?: boolean;
  auto_publish?: boolean;
  watermark_text?: string | null;
  watermark_logo_url?: string | null;
  ai_voice_id?: string | null;
  ai_tone?: string;
  settings?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ContentIdea {
  id: string;
  user_id: string;
  page_id: string | null;
  title: string;
  prompt: string | null;
  topic: string | null;
  target_audience: string | null;
  generated_script: string | null;
  status: ContentIdeaStatus;
  source: "ai" | "manual" | "trending" | "rss";
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Video {
  id: string;
  user_id: string;
  page_id: string | null;
  idea_id: string | null;
  title: string;
  description: string | null;
  status: VideoStatus;
  video_url: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  aspect_ratio: "9:16" | "16:9" | "1:1";
  resolution: string;
  storage_path: string | null;
  render_engine: string;
  error_message: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface VideoScene {
  id: string;
  video_id: string;
  scene_order: number;
  narration_text: string | null;
  visual_prompt: string | null;
  media_type: "video" | "image" | "color_bg";
  media_url: string | null;
  audio_url: string | null;
  duration_seconds: number;
  transition_type: string;
  subtitles_text: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface MediaAsset {
  id: string;
  user_id: string;
  asset_name: string;
  asset_type: "image" | "video" | "audio" | "voiceover" | "font" | "logo";
  storage_path: string;
  public_url: string;
  file_size_bytes: number | null;
  mime_type: string | null;
  tags: string[];
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ContentPost {
  id: string;
  user_id: string;
  page_id: string;
  video_id: string | null;
  post_caption: string | null;
  post_type: "reel" | "video" | "photo" | "text" | "story";
  status: PostStatus;
  scheduled_publish_time: string | null;
  actual_published_time: string | null;
  fb_post_id: string | null;
  permalink_url: string | null;
  error_message: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface PublishingJob {
  id: string;
  user_id: string;
  post_id: string;
  page_id: string;
  status: PublishingJobStatus;
  attempts: number;
  max_attempts: number;
  scheduled_for: string;
  started_at: string | null;
  completed_at: string | null;
  last_error: string | null;
  payload: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface AIJob {
  id: string;
  user_id: string;
  job_type: "script_generation" | "voice_synthesis" | "video_render" | "image_generation" | "caption_generation";
  status: AIJobStatus;
  provider: string;
  input_params: Record<string, any>;
  output_data: Record<string, any>;
  error_message: string | null;
  cost_estimate_cents: number;
  tokens_used: number;
  duration_ms: number | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsDaily {
  id: string;
  user_id: string;
  page_id: string;
  date: string;
  views_count: number;
  impressions_count: number;
  reach_count: number;
  engagements_count: number;
  reactions_count: number;
  comments_count: number;
  shares_count: number;
  clicks_count: number;
  followers_net_change: number;
  raw_metrics: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ApiUsage {
  id: string;
  user_id: string;
  service_name: string;
  endpoint: string | null;
  units_consumed: number;
  unit_type: string;
  cost_usd: number;
  reference_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

export interface SystemLog {
  id: string;
  user_id: string | null;
  page_id: string | null;
  level: LogLevel;
  category: string;
  message: string;
  context: Record<string, any>;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      facebook_accounts: { Row: FacebookAccount; Insert: Partial<FacebookAccount>; Update: Partial<FacebookAccount> };
      facebook_pages: { Row: FacebookPage; Insert: Partial<FacebookPage>; Update: Partial<FacebookPage> };
      page_settings: { Row: PageSettings; Insert: Partial<PageSettings>; Update: Partial<PageSettings> };
      content_ideas: { Row: ContentIdea; Insert: Partial<ContentIdea>; Update: Partial<ContentIdea> };
      videos: { Row: Video; Insert: Partial<Video>; Update: Partial<Video> };
      video_scenes: { Row: VideoScene; Insert: Partial<VideoScene>; Update: Partial<VideoScene> };
      media_assets: { Row: MediaAsset; Insert: Partial<MediaAsset>; Update: Partial<MediaAsset> };
      content_posts: { Row: ContentPost; Insert: Partial<ContentPost>; Update: Partial<ContentPost> };
      publishing_jobs: { Row: PublishingJob; Insert: Partial<PublishingJob>; Update: Partial<PublishingJob> };
      ai_jobs: { Row: AIJob; Insert: Partial<AIJob>; Update: Partial<AIJob> };
      analytics_daily: { Row: AnalyticsDaily; Insert: Partial<AnalyticsDaily>; Update: Partial<AnalyticsDaily> };
      api_usage: { Row: ApiUsage; Insert: Partial<ApiUsage>; Update: Partial<ApiUsage> };
      system_logs: { Row: SystemLog; Insert: Partial<SystemLog>; Update: Partial<SystemLog> };
    };
  };
}
