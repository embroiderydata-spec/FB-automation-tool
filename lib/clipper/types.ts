export type AspectRatio = "9:16" | "16:9" | "1:1";
export type Resolution = "1080p" | "720p" | "4k";
export type ClipStatus = "draft" | "processing" | "ready" | "failed";

export interface VideoClipRecord {
  id: string;
  user_id: string;
  source_video_url: string;
  source_video_name?: string;
  clip_title: string;
  caption?: string;
  start_time: number;
  end_time: number;
  duration: number;
  aspect_ratio: AspectRatio;
  resolution: Resolution;
  subtitle_text?: string;
  exported_url?: string;
  status: ClipStatus;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface CreateClipInput {
  source_video_url: string;
  source_video_name?: string;
  clip_title: string;
  caption?: string;
  start_time: number;
  end_time: number;
  duration?: number;
  aspect_ratio?: AspectRatio;
  resolution?: Resolution;
  subtitle_text?: string;
  exported_url?: string;
}
