export type DateRangePreset =
  | "today"
  | "yesterday"
  | "last_7d"
  | "last_30d"
  | "last_90d"
  | "custom";

export interface PerformanceOverview {
  total_plays: number | null;
  total_reach: number | null;
  total_impressions: number | null;
  total_engagements: number | null;
  total_followers: number | null;
  followers_gained: number | null;
  followers_lost: number | null;
  average_watch_time: number | null;
  total_watch_time: number | null;
  published_videos: number;
  last_synced_at: string | null;
  is_real_data: boolean;
}

export interface CrossPageMetric {
  page_id: string;
  facebook_page_id: string;
  page_name: string;
  profile_picture_url?: string | null;
  followers: number;
  views: number;
  reach: number;
  engagement: number;
  posts_published: number;
  avg_watch_time_seconds: number | null;
  growth_percentage: number | null;
  engagement_rate: number | null;
  last_synced_at?: string | null;
  sync_status?: string;
  is_highest_performer?: boolean;
  is_lowest_performer?: boolean;
}

export interface VideoPerformanceItem {
  id: string;
  meta_video_id: string;
  video_id?: string | null;
  title: string;
  thumbnail_url?: string | null;
  page_id: string;
  page_name: string;
  published_date: string;
  duration_seconds: number;
  views: number;
  reach: number;
  impressions: number;
  total_plays: number;
  replay_count: number;
  avg_watch_time: number | null;
  avg_watch_percentage: number | null;
  likes: number;
  comments: number;
  shares: number;
  follows: number;
  engagement_rate_by_reach: number | null;
  engagement_rate_by_views: number | null;
  performance_score: number | null;
  retention_data?: Array<{ percent: number; value: number }>;
  hook_text?: string | null;
}

export interface AIPerformanceInsight {
  id: string;
  page_id?: string | null;
  page_name?: string | null;
  insight_type:
    | "hook_retention"
    | "video_duration"
    | "publishing_time"
    | "niche_growth"
    | "content_recommendation"
    | "cross_page_benchmark";
  title: string;
  recommendation: string;
  supporting_data: Record<string, any>;
  confidence_level: "high" | "moderate" | "low" | "insufficient_data";
  suggested_experiment?: string;
  created_at: string;
}

export interface GrowthSnapshot {
  snapshot_date: string;
  followers: number;
  views: number;
  reach: number;
  engagement: number;
  follows_gained: number;
  follows_lost: number;
  net_followers: number;
}

export interface SyncResult {
  pages_synced: number;
  videos_synced: number;
  errors: Array<{ page_name?: string; message: string }>;
  status: "success" | "partial" | "failed";
  timestamp: string;
}
