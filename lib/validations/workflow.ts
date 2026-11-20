import { z } from "zod";

export const WorkflowConfigurationSchema = z.object({
  niche: z.string().max(100).optional().default("General"),
  category: z.string().max(100).optional().default("Viral Tips & Insights"),
  target_audience: z.string().max(255).optional().default("Broad Reels Audience"),
  target_country: z.string().max(10).optional().default("US"),
  language: z.string().max(10).optional().default("en"),
  video_format: z.enum(["reels_vertical", "story_vertical", "square"]).default("reels_vertical"),
  video_duration: z.number().int().min(15).max(180).default(45),
  num_scenes: z.number().int().min(2).max(12).default(4),
  content_tone: z.string().max(50).optional().default("engaging, energetic"),
  creativity_level: z.number().min(0.1).max(1.0).default(0.7),
  topic: z.string().max(250).optional(),

  // Video Settings
  aspect_ratio: z.enum(["9:16", "16:9", "1:1"]).default("9:16"),
  resolution: z.enum(["1080x1920", "720x1280"]).default("1080x1920"),
  video_provider: z.enum(["replicate", "runway", "mock"]).default("replicate"),
  video_model: z.string().optional().default("luma/ray"),
  scene_duration: z.number().min(2).max(15).default(3.5),
  transition_style: z.string().optional().default("crossfade"),
  background_music: z.string().optional(),
  voice_provider: z.enum(["elevenlabs", "openai", "mock"]).default("elevenlabs"),
  voice_id: z.string().optional().default("21m00Tcm4TlvDq8ikWAM"),
  subtitle_preset: z
    .enum(["classic", "bold_viral", "karaoke", "minimal", "highlight_keywords"])
    .default("bold_viral"),

  // Branding
  logo_url: z.string().url().optional().nullable(),
  watermark_text: z.string().max(50).optional().nullable(),
  watermark_position: z
    .enum(["top_left", "top_right", "bottom_left", "bottom_right"])
    .default("top_right"),
  brand_colors: z.array(z.string()).optional(),
  intro_url: z.string().url().optional().nullable(),
  outro_url: z.string().url().optional().nullable(),
  page_specific_branding: z.boolean().default(true),

  // Publishing
  target_page_ids: z
    .array(z.string())
    .min(1, "Select at least one Facebook Page.")
    .max(100, "Maximum 100 Pages per workflow."),
  posting_frequency: z.number().min(1).max(10).default(1),
  publishing_timezone: z.string().default("UTC"),
  preferred_posting_time: z.string().default("18:00"),
  auto_schedule: z.boolean().default(true),
  approval_mode: z
    .enum(["fully_manual", "script_approval", "final_video_approval", "fully_automated"])
    .default("final_video_approval"),

  // Budget
  max_cost_per_video: z.number().min(0.01).max(50).default(3.0),
  daily_budget_limit: z.number().min(0.1).max(500).default(25.0),
});

export const CreateWorkflowSchema = z.object({
  workflow_name: z.string().min(2, "Workflow name must be at least 2 characters.").max(150),
  template_id: z.string().optional(),
  approval_mode: z
    .enum(["fully_manual", "script_approval", "final_video_approval", "fully_automated"])
    .default("final_video_approval"),
  configuration: WorkflowConfigurationSchema,
});

export const WorkflowActionSchema = z.object({
  action: z.enum([
    "start",
    "pause",
    "resume",
    "cancel",
    "retry",
    "approve_script",
    "approve_video",
    "step",
  ]),
  target_stage: z
    .enum([
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
    ])
    .optional(),
  feedback: z.string().max(500).optional(),
});

export const RegenerateSceneSchema = z.object({
  scene_id: z.string().min(1, "Scene ID is required."),
  prompt: z.string().min(3, "Prompt must be at least 3 characters.").max(500),
  image_reference_url: z.string().url().optional().nullable(),
});

export const WorkflowTemplateSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  niche: z.string().max(100).optional(),
  configuration: WorkflowConfigurationSchema,
  is_default: z.boolean().default(false),
});
