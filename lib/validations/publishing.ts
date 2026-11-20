import { z } from "zod";

export const PublishNowSchema = z.object({
  video_id: z.string().min(1, "Video ID is required."),
  page_id: z.string().min(1, "Facebook Page ID is required."),
  caption: z.string().min(1, "Caption is required.").max(2200, "Caption exceeds 2,200 character limit."),
  is_test_mode: z.boolean().default(true),
});

export const SchedulePostSchema = z.object({
  video_id: z.string().min(1, "Video ID is required."),
  page_id: z.string().min(1, "Facebook Page ID is required."),
  caption: z.string().min(1, "Caption is required.").max(2200, "Caption exceeds 2,200 character limit."),
  scheduled_at: z.string().datetime({ message: "Valid ISO 8601 scheduled datetime is required." }),
  timezone: z.string().default("UTC"),
  is_test_mode: z.boolean().default(true),
});

export const BulkScheduleSchema = z.object({
  page_ids: z.array(z.string()).min(1, "At least one Facebook Page must be selected.").max(100),
  video_ids: z.array(z.string()).min(1, "At least one video must be selected.").max(50),
  start_date: z.string().min(1, "Start date is required."),
  posting_times: z.array(z.string()).default(["10:00", "16:00", "20:00"]),
  posts_per_day: z.number().min(1).max(5).default(1),
  timezone: z.string().default("UTC"),
  default_caption_template: z.string().optional(),
});

export const JobActionSchema = z.object({
  action: z.enum(["retry", "cancel", "reschedule", "publish_now"]),
  scheduled_at: z.string().datetime().optional(),
});

export const EmergencyStopSchema = z.object({
  paused: z.boolean(),
  reason: z.string().max(200).optional(),
});

export const PagePublishingSettingsSchema = z.object({
  enable_auto_publishing: z.boolean().optional(),
  posts_per_day: z.number().min(1).max(10).optional(),
  min_interval_hours: z.number().min(1).max(24).optional(),
  preferred_publishing_times: z.array(z.string()).optional(),
  preferred_days: z.array(z.string()).optional(),
  timezone: z.string().optional(),
  max_scheduled_posts: z.number().min(1).max(100).optional(),
  require_manual_approval: z.boolean().optional(),
  default_caption_template: z.string().max(1000).optional().nullable(),
  default_hashtags: z.array(z.string()).optional(),
  publishing_mode: z.enum(["test", "live"]).optional(),
  is_queue_paused: z.boolean().optional(),
});

export type PublishNowInput = z.infer<typeof PublishNowSchema>;
export type SchedulePostInput = z.infer<typeof SchedulePostSchema>;
export type BulkScheduleInput = z.infer<typeof BulkScheduleSchema>;
export type JobActionInput = z.infer<typeof JobActionSchema>;
export type EmergencyStopInput = z.infer<typeof EmergencyStopSchema>;
export type PagePublishingSettingsInput = z.infer<typeof PagePublishingSettingsSchema>;
