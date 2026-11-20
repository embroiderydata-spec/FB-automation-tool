import { z } from "zod";

export const AnalyticsFilterSchema = z.object({
  page_id: z.string().optional().default("all"),
  date_range: z
    .enum(["today", "yesterday", "last_7d", "last_30d", "last_90d", "custom"])
    .default("last_30d"),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

export const VideoAnalyticsQuerySchema = z.object({
  page_id: z.string().optional().default("all"),
  search: z.string().max(100).optional(),
  sort_by: z
    .enum([
      "views",
      "reach",
      "engagement",
      "avg_watch_time",
      "shares",
      "follows",
      "published_date",
      "performance_score",
    ])
    .default("views"),
  sort_order: z.enum(["asc", "desc"]).default("desc"),
  limit: z.coerce.number().min(1).max(100).default(25),
  page: z.coerce.number().min(1).default(1),
  date_range: z
    .enum(["today", "yesterday", "last_7d", "last_30d", "last_90d", "custom"])
    .default("last_30d"),
});

export const SyncAnalyticsSchema = z.object({
  page_id: z.string().optional(),
  video_id: z.string().optional(),
  meta_video_id: z.string().optional(),
  force: z.boolean().default(false),
});

export const ExportCsvSchema = z.object({
  type: z.enum(["pages", "videos", "rankings", "growth"]),
  page_id: z.string().optional().default("all"),
  date_range: z
    .enum(["today", "yesterday", "last_7d", "last_30d", "last_90d", "custom"])
    .default("last_30d"),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});
