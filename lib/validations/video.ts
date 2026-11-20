import { z } from "zod";

export const VideoSceneGenerateSchema = z.object({
  scene_id: z.string().optional(),
  prompt: z.string().min(3, "Prompt is required.").max(500),
  negative_prompt: z.string().max(300).optional(),
  duration_seconds: z.number().min(2).max(15).default(3.5),
  aspect_ratio: z.enum(["9:16", "16:9", "1:1"]).default("9:16"),
  image_reference_url: z.string().url().optional().nullable(),
  provider: z.enum(["replicate", "runway"]).default("replicate"),
  motion_strength: z.number().min(1).max(10).default(5),
});

export const ImageGenerateSchema = z.object({
  prompt: z.string().min(3, "Image prompt is required.").max(500),
  aspect_ratio: z.enum(["9:16", "1:1", "16:9"]).default("9:16"),
  quality: z.enum(["standard", "hd"]).default("standard"),
  provider: z.enum(["openai", "replicate"]).default("openai"),
});

export const VoiceGenerateSchema = z.object({
  text: z.string().min(2, "Narration text is required.").max(5000),
  voice_id: z.string().optional(),
  stability: z.number().min(0).max(1).default(0.5),
  similarity_boost: z.number().min(0).max(1).default(0.75),
  speed: z.number().min(0.5).max(2.0).default(1.0),
});

export const SubtitleGenerateSchema = z.object({
  preset: z
    .enum(["classic", "bold_viral", "karaoke", "minimal", "highlight_keywords"])
    .default("bold_viral"),
  scenes: z.array(
    z.object({
      scene_number: z.number(),
      start_time: z.number(),
      end_time: z.number(),
      narration: z.string(),
      on_screen_text: z.string().optional().nullable(),
    })
  ),
});

export const VideoRenderDispatchSchema = z.object({
  storyboard_id: z.string().min(1, "Storyboard ID is required."),
  script_id: z.string().min(1, "Script ID is required."),
  page_id: z.string().min(1, "Facebook Page ID is required."),
  subtitle_preset: z
    .enum(["classic", "bold_viral", "karaoke", "minimal", "highlight_keywords"])
    .default("bold_viral"),
  voice_id: z.string().optional(),
  include_watermark: z.boolean().default(true),
  resolution: z.enum(["1080x1920", "720x1280"]).default("1080x1920"),
});

export const PageBrandingUpdateSchema = z.object({
  brand_name: z.string().max(100).optional().nullable(),
  watermark_logo_url: z.string().url().optional().nullable().or(z.literal("")),
  watermark_position: z
    .enum(["top_left", "top_right", "bottom_left", "bottom_right"])
    .default("bottom_right"),
  watermark_size: z.number().min(0.05).max(0.5).default(0.15),
  watermark_opacity: z.number().min(0.1).max(1.0).default(0.85),
  brand_primary_color: z.string().max(20).default("#3b82f6"),
  brand_secondary_color: z.string().max(20).default("#1d4ed8"),
  enable_watermark: z.boolean().default(true),
});

export type VideoSceneGenerateInput = z.infer<typeof VideoSceneGenerateSchema>;
export type ImageGenerateInput = z.infer<typeof ImageGenerateSchema>;
export type VoiceGenerateInput = z.infer<typeof VoiceGenerateSchema>;
export type SubtitleGenerateInput = z.infer<typeof SubtitleGenerateSchema>;
export type VideoRenderDispatchInput = z.infer<typeof VideoRenderDispatchSchema>;
export type PageBrandingUpdateInput = z.infer<typeof PageBrandingUpdateSchema>;
