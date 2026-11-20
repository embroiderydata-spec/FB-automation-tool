export interface VideoJobOptions {
  prompt: string;
  negativePrompt?: string;
  durationSeconds?: number;
  aspectRatio?: "9:16" | "16:9" | "1:1";
  resolution?: "1080x1920" | "720x1280";
  fps?: number;
  imageReferenceUrl?: string; // Image-to-video input
  cameraMotion?: string;
  seed?: number;
  motionStrength?: number; // 1 to 10
}

export interface VideoJobResult {
  jobId: string;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  videoUrl?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  width?: number;
  height?: number;
  error?: string;
  costUsd?: number;
}

export interface VideoJobStatusResult {
  jobId: string;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  progressPercent?: number;
  videoUrl?: string;
  error?: string;
}

export interface VideoGenerationProvider {
  name: string;
  isConfigured(): boolean;
  generateVideo(options: VideoJobOptions): Promise<VideoJobResult>;
  getJobStatus(jobId: string): Promise<VideoJobStatusResult>;
  getJobResult(jobId: string): Promise<VideoJobResult>;
  cancelJob(jobId: string): Promise<boolean>;
  testConnection(): Promise<{ success: boolean; message: string; latencyMs?: number }>;
}

export interface ImageJobOptions {
  prompt: string;
  aspectRatio?: "9:16" | "1:1" | "16:9";
  quality?: "standard" | "hd";
  style?: "natural" | "vivid" | "cinematic";
}

export interface ImageJobResult {
  imageUrl: string;
  prompt: string;
  width: number;
  height: number;
  costUsd?: number;
}

export interface ImageGenerationProvider {
  name: string;
  isConfigured(): boolean;
  generateImage(options: ImageJobOptions): Promise<ImageJobResult>;
  testConnection(): Promise<{ success: boolean; message: string }>;
}

export interface VoiceOption {
  voice_id: string;
  name: string;
  category?: string;
  preview_url?: string;
  description?: string;
}

export interface VoiceJobOptions {
  text: string;
  voiceId?: string;
  stability?: number;
  similarityBoost?: number;
  speed?: number;
  language?: string;
}

export interface VoiceJobResult {
  audioBuffer: Buffer;
  audioUrl?: string;
  durationSeconds: number;
  voiceId: string;
  wordTimestamps?: Array<{ word: string; start: number; end: number }>;
  costUsd?: number;
}

export interface VoiceGenerationProvider {
  name: string;
  isConfigured(): boolean;
  generateSpeech(options: VoiceJobOptions): Promise<VoiceJobResult>;
  getVoices(): Promise<VoiceOption[]>;
  testConnection(): Promise<{ success: boolean; message: string }>;
}

export type SubtitlePresetStyle =
  | "classic"
  | "bold_viral"
  | "karaoke"
  | "minimal"
  | "highlight_keywords";

export interface SubtitlePresetConfig {
  id: SubtitlePresetStyle;
  name: string;
  fontFamily: string;
  fontSize: number;
  textColor: string;
  highlightColor: string;
  backgroundColor: string;
  outlineColor: string;
  outlineWidth: number;
  shadow: string;
  position: "bottom" | "middle" | "top";
  animation: "none" | "karaoke" | "pop" | "typewriter";
}

export interface PageBrandingConfig {
  brand_name: string;
  watermark_logo_url?: string | null;
  watermark_position: "top_left" | "top_right" | "bottom_left" | "bottom_right";
  watermark_size: number; // e.g. 0.15 for 15% width
  watermark_opacity: number; // 0.1 to 1.0
  brand_primary_color: string;
  brand_secondary_color: string;
  intro_video_path?: string | null;
  outro_video_path?: string | null;
  enable_watermark: boolean;
}
