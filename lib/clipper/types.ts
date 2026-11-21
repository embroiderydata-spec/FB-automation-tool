export type AspectRatio = "9:16" | "16:9" | "1:1";
export type CropPosition = "center" | "top" | "bottom";
export type Resolution = "1080p" | "720p" | "4k";
export type ClipStatus = "draft" | "queued" | "processing" | "uploading" | "ready" | "failed";
export type ViralCategory = "funny" | "emotional" | "educational" | "surprising" | "hook" | "high_retention";
export type SubtitleStyle = "viral_bold" | "clean_minimal" | "karaoke" | "highlight_keywords" | "none";

export interface ViralCandidateClip {
  clip_number: number;
  title: string;
  start_time: number;
  end_time: number;
  start_formatted: string;
  end_formatted: string;
  duration: number;
  viral_score: number;
  category: ViralCategory;
  hook: string;
  reason: string;
  caption: string;
  hashtags: string[];
  title_options: string[];
  hook_options: string[];
  caption_options: string[];
  selected?: boolean;
  aspect_ratio?: AspectRatio;
  subtitle_style?: SubtitleStyle;
  status?: "candidate" | "queued" | "rendering" | "ready" | "failed";
  rendered_clip_id?: string;
  rendered_url?: string;
  error?: string;
}

export interface VideoAnalysisResult {
  video_url: string;
  source_type: "youtube" | "direct_url" | "library" | "upload";
  video_id?: string;
  title: string;
  author?: string;
  duration: number;
  duration_formatted: string;
  resolution: string;
  thumbnail_url?: string;
  transcript_available: boolean;
  transcript_text?: string;
  candidate_clips: ViralCandidateClip[];
  analyzed_at: string;
  local_path?: string;
}

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
  subtitle_style?: SubtitleStyle;
  exported_url?: string;
  file_size?: number;
  status: ClipStatus;
  viral_score?: number;
  category?: ViralCategory;
  hook?: string;
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
  subtitle_style?: SubtitleStyle;
  exported_url?: string;
  file_size?: number;
  status?: ClipStatus;
  viral_score?: number;
  category?: ViralCategory;
  hook?: string;
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

export interface BatchClipRequestItem {
  clip_number?: number;
  title: string;
  start_time: number;
  end_time: number;
  duration?: number;
  aspect_ratio?: AspectRatio;
  crop_position?: CropPosition;
  resolution?: Resolution;
  subtitle_style?: SubtitleStyle;
  subtitle_text?: string;
  hook_text?: string;
  hook?: string;
  caption?: string;
  tags?: string[];
  viral_score?: number;
  category?: ViralCategory;
}
