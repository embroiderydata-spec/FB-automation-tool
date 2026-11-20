import { z } from "zod";

/**
 * Validation schema for updating a Facebook Page's content niche profile
 */
export const PageNicheSettingsSchema = z.object({
  niche: z.string().max(100).optional().nullable(),
  sub_niche: z.string().max(100).optional().nullable(),
  target_audience: z.string().max(255).optional().nullable(),
  target_country: z.string().max(10).optional().nullable(),
  language: z.string().max(10).optional().nullable(),
  ai_tone: z.string().max(50).optional().nullable(),
  content_style: z.string().max(100).optional().nullable(),
  page_description: z.string().max(1000).optional().nullable(),
  topics_to_cover: z.array(z.string().max(100)).max(20).optional(),
  topics_to_avoid: z.array(z.string().max(100)).max(20).optional(),
  preferred_content_format: z.string().max(50).optional().nullable(),
  originality_guidelines: z.string().max(500).optional().nullable(),
  video_duration_min: z.number().int().min(5).max(300).optional(),
  video_duration_max: z.number().int().min(10).max(600).optional(),
});

/**
 * Validation schema for triggering AI content idea generation
 */
export const ContentIdeaGenerateSchema = z.object({
  page_ids: z
    .array(z.string())
    .min(1, "Select at least one Facebook Page.")
    .max(100, "Maximum 100 Pages per batch."),
  topic: z.string().max(250).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  target_audience: z.string().max(255).optional().nullable(),
  duration_seconds: z.number().int().min(15).max(180).optional(),
  tone: z.string().max(50).optional().nullable(),
  language: z.string().max(10).optional().nullable(),
  num_ideas_per_page: z.number().int().min(1).max(5).default(3),
});

/**
 * Validation schema for generating viral hooks
 */
export const HookGenerateSchema = z.object({
  page_id: z.string().optional().nullable(),
  content_idea_id: z.string().optional().nullable(),
  topic: z.string().min(2, "Topic or angle is required.").max(250),
  idea_title: z.string().max(250).optional().nullable(),
  hook_style: z
    .enum([
      "curiosity",
      "shock",
      "question",
      "unexpected_fact",
      "story_opening",
      "emotional",
      "humor",
      "challenge",
      "mystery",
    ])
    .default("curiosity"),
  num_hooks: z.number().int().min(3).max(10).default(5),
});

/**
 * Validation schema for generating a short-form video script
 */
export const ScriptGenerateSchema = z.object({
  page_id: z.string().optional().nullable(),
  content_idea_id: z.string().optional().nullable(),
  title: z.string().max(250).optional().nullable(),
  hook: z.string().min(3, "Opening hook is required.").max(300),
  topic: z.string().min(2, "Topic is required.").max(250),
  target_duration_seconds: z.number().int().min(15).max(120).default(45),
  tone: z.string().max(50).optional().nullable(),
  language: z.string().max(10).optional().nullable(),
  content_style: z.string().max(100).optional().nullable(),
});

/**
 * Validation schema for updating/saving a script
 */
export const ScriptUpdateSchema = z.object({
  script_title: z.string().min(1).max(250).optional(),
  hook: z.string().min(1).max(300).optional(),
  narration: z.string().min(10).optional(),
  caption: z.string().max(2000).optional().nullable(),
  hashtags: z.array(z.string().max(50)).optional(),
  status: z.enum(["draft", "in_review", "approved", "rejected"]).optional(),
});

/**
 * Validation schema for generating a scene-by-scene storyboard
 */
export const StoryboardGenerateSchema = z.object({
  script_id: z.string().min(1, "Script ID is required."),
});

/**
 * Validation schema for updating a storyboard scene
 */
export const StoryboardSceneUpdateSchema = z.object({
  scene_number: z.number().int().min(1).optional(),
  start_time: z.number().min(0).optional(),
  end_time: z.number().min(0).optional(),
  duration: z.number().min(0.5).max(30).optional(),
  narration: z.string().min(1).optional(),
  visual_description: z.string().min(1).optional(),
  video_prompt: z.string().min(1).optional(),
  camera_direction: z.string().max(200).optional().nullable(),
  motion_description: z.string().max(200).optional().nullable(),
  transition: z.string().max(50).optional().nullable(),
  on_screen_text: z.string().max(150).optional().nullable(),
  sound_effect: z.string().max(150).optional().nullable(),
  scene_type: z
    .enum(["opening", "main_content", "transition", "reaction", "ending"])
    .optional(),
});

/**
 * Validation schema for updating content workflow status
 */
export const ContentStatusUpdateSchema = z.object({
  status: z.enum([
    "draft",
    "hook_generated",
    "script_generated",
    "script_in_review",
    "script_approved",
    "storyboard_generated",
    "storyboard_approved",
    "ready_for_video",
    "rejected",
    "archived",
  ]),
  rejection_reason: z.string().max(500).optional(),
});

export type PageNicheSettingsInput = z.infer<typeof PageNicheSettingsSchema>;
export type ContentIdeaGenerateInput = z.infer<typeof ContentIdeaGenerateSchema>;
export type HookGenerateInput = z.infer<typeof HookGenerateSchema>;
export type ScriptGenerateInput = z.infer<typeof ScriptGenerateSchema>;
export type ScriptUpdateInput = z.infer<typeof ScriptUpdateSchema>;
export type StoryboardGenerateInput = z.infer<typeof StoryboardGenerateSchema>;
export type StoryboardSceneUpdateInput = z.infer<typeof StoryboardSceneUpdateSchema>;
export type ContentStatusUpdateInput = z.infer<typeof ContentStatusUpdateSchema>;
