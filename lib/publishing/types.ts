/**
 * Phase 2.4 Facebook Publishing Scheduler & Auto-Publishing Types
 */

export type PublishingJobStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "scheduled"
  | "queued"
  | "uploading"
  | "processing"
  | "publishing"
  | "published"
  | "completed"
  | "failed"
  | "cancelled"
  | "retrying";

export type PublishingMode = "test" | "live";

export interface PublishingJob {
  id: string;
  user_id: string;
  platform?: "facebook" | "youtube";
  youtube_channel_id?: string | null;
  video_title?: string | null;
  tags?: string[] | null;
  privacy_status?: "public" | "unlisted" | "private";
  is_short?: boolean;
  youtube_video_id?: string | null;
  post_id?: string;
  page_id?: string;
  facebook_page_id?: string;
  video_id: string;
  caption: string;
  scheduled_at: string;
  timezone: string;
  status: PublishingJobStatus;
  attempts: number;
  max_attempts: number;
  is_test_mode: boolean;
  next_retry_at?: string | null;
  meta_video_id?: string | null;
  meta_post_id?: string | null;
  published_url?: string | null;
  error_code?: string | null;
  error_message?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
  // Joined relation fields for dashboard UI
  video?: {
    id: string;
    title: string;
    thumbnail_url?: string | null;
    video_url?: string | null;
    duration_seconds?: number | null;
    resolution?: string | null;
    aspect_ratio?: string | null;
  } | null;
  facebook_page?: {
    id: string;
    page_name: string;
    profile_picture_url?: string | null;
    facebook_page_id: string;
  } | null;
}

export interface MetaReelStartResponse {
  video_id: string;
  upload_url: string;
}

export interface MetaReelFinishResponse {
  success: boolean;
  post_id?: string;
  error?: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
  };
}

export interface EmergencyStopConfig {
  paused: boolean;
  reason?: string | null;
  paused_at?: string | null;
}

export interface BulkScheduleSlot {
  page_id: string;
  page_name: string;
  video_id: string;
  video_title: string;
  scheduled_at: string; // ISO 8601
  formatted_time: string;
  timezone: string;
  caption: string;
  has_conflict?: boolean;
  conflict_reason?: string;
}

export interface PublishingLogEntry {
  id: string;
  job_id?: string;
  page_id: string;
  video_id?: string;
  operation: string;
  endpoint?: string;
  attempt: number;
  status: "info" | "success" | "warning" | "error";
  meta_response?: Record<string, any>;
  error_message?: string;
  created_at: string;
}

export interface PublishingSettings {
  enable_auto_publishing: boolean;
  posts_per_day: number;
  min_interval_hours: number;
  preferred_publishing_times: string[];
  preferred_days: string[];
  timezone: string;
  max_scheduled_posts: number;
  require_manual_approval: boolean;
  default_caption_template?: string;
  default_hashtags: string[];
  publishing_mode: PublishingMode;
  is_queue_paused: boolean;
}
