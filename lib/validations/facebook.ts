import { z } from "zod";

export const PageSettingsUpdateSchema = z.object({
  niche: z.string().max(100).optional().nullable(),
  content_category: z.string().max(100).optional().nullable(),
  content_style: z.string().max(100).optional().nullable(),
  target_country: z.string().max(10).optional().nullable(),
  target_audience: z.string().max(255).optional().nullable(),
  language: z.string().max(10).optional().nullable(),
  timezone: z.string().max(100).optional().nullable(),
  posting_days: z.array(z.string()).optional(),
  posting_schedule: z.array(z.string()).or(z.record(z.any())).optional(),
  posts_per_day: z.number().int().min(1).max(24).optional(),
  daily_post_limit: z.number().int().min(1).max(50).optional(),
  video_duration_min: z.number().int().min(5).max(300).optional(),
  video_duration_max: z.number().int().min(10).max(600).optional(),
  aspect_ratio: z.enum(["9:16", "16:9", "1:1"]).optional(),
  voice_preference: z.string().max(100).optional().nullable(),
  require_approval: z.boolean().optional(),
  content_generation_enabled: z.boolean().optional(),
  auto_publish: z.boolean().optional(),
  watermark_text: z.string().max(100).optional().nullable(),
  ai_voice_id: z.string().max(100).optional().nullable(),
  ai_tone: z.string().max(50).optional(),
});

export const PageImportSchema = z.object({
  account_id: z.string().uuid("A valid account ID is required."),
  page_ids: z
    .array(z.string().min(1))
    .min(1, "At least one Page must be selected for import.")
    .max(100, "Maximum 100 Pages per batch import."),
});

export const AutomationToggleSchema = z.object({
  enabled: z.boolean(),
});

export const DisconnectAccountSchema = z.object({
  account_id: z.string().uuid("A valid account ID is required."),
});

export type PageSettingsUpdateInput = z.infer<typeof PageSettingsUpdateSchema>;
export type PageImportInput = z.infer<typeof PageImportSchema>;
export type AutomationToggleInput = z.infer<typeof AutomationToggleSchema>;
