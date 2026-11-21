export type AspectRatio = "9:16" | "16:9" | "1:1";
export type CropPosition = "center" | "top" | "bottom";
export type Resolution = "1080p" | "720p" | "4k";
export type ClipStatus = "draft" | "queued" | "processing" | "uploading" | "ready" | "failed";

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
  crop_position?: CropPosition;
  resolution: Resolution;
  subtitle_text?: string;
  exported_url?: string;
  file_size?: number;
  status: ClipStatus;
  error_message?: string;
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
  crop_position?: CropPosition;
  resolution?: Resolution;
  subtitle_text?: string;
  exported_url?: string;
  file_size?: number;
  status?: ClipStatus;
  error_message?: string;
}

export interface UploadedVideoInfo {
  id: string;
  filename: string;
  url: string;
  local_path?: string;
  duration: number;
  width: number;
  height: number;
  resolution: string;
  size_bytes: number;
  size_formatted: string;
}
