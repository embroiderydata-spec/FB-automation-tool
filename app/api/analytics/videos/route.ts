import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { createClient } from "@/lib/supabase/server";
import { VideoAnalyticsQuerySchema } from "@/lib/validations/analytics";
import {
  calculateAverageWatchPercentage,
  calculateEngagementRateByReach,
  calculateEngagementRateByViews,
  calculatePerformanceScore,
} from "@/lib/analytics/metrics";
import { VideoPerformanceItem } from "@/lib/analytics/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/analytics/videos
 * Returns paginated, sortable video performance metrics for published Reels.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = VideoAnalyticsQuerySchema.safeParse({
      page_id: searchParams.get("page_id") || "all",
      search: searchParams.get("search") || undefined,
      sort_by: searchParams.get("sort_by") || "views",
      sort_order: searchParams.get("sort_order") || "desc",
      limit: searchParams.get("limit") || 25,
      page: searchParams.get("page") || 1,
      date_range: searchParams.get("date_range") || "last_30d",
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid video query parameters.", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { page_id, search, sort_by, sort_order, limit, page } = parsed.data;
    const supabase = await createClient();

    let query = supabase
      .from("video_analytics")
      .select(
        `
        *,
        facebook_page:facebook_pages(id, page_name),
        video:videos(id, title, thumbnail_path, duration_seconds)
      `,
        { count: "exact" }
      )
      .eq("user_id", user.id);

    if (page_id && page_id !== "all") {
      query = query.eq("facebook_page_id", page_id);
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Apply sorting
    const dbSortCol =
      sort_by === "reach"
        ? "reach"
        : sort_by === "avg_watch_time"
        ? "average_watch_time"
        : sort_by === "shares"
        ? "shares"
        : sort_by === "published_date"
        ? "date"
        : "views";

    query = query.order(dbSortCol, { ascending: sort_order === "asc" }).range(from, to);

    const { data: rows, count, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const items: VideoPerformanceItem[] = (rows || []).map((row: any) => {
      const views = Number(row.views || 0);
      const reach = Number(row.reach || 0);
      const engagements = Number(row.likes || 0) + Number(row.comments || 0) + Number(row.shares || 0);
      const duration = Number(row.video?.duration_seconds || 45);
      const avgWatch = row.average_watch_time !== null ? Number(row.average_watch_time) : null;
      const watchPct = calculateAverageWatchPercentage(avgWatch, duration);
      const engReach = calculateEngagementRateByReach(engagements, reach);
      const engViews = calculateEngagementRateByViews(engagements, views);
      const perfScore = calculatePerformanceScore({
        views,
        reach,
        engagements,
        avgWatchPercentage: watchPct,
      });

      return {
        id: row.id,
        meta_video_id: row.meta_video_id,
        video_id: row.video_id,
        title: row.video?.title || `Facebook Reel (${row.meta_video_id.slice(-6)})`,
        thumbnail_url: row.video?.thumbnail_path || null,
        page_id: row.facebook_page_id,
        page_name: row.facebook_page?.page_name || "Facebook Page",
        published_date: row.date,
        duration_seconds: duration,
        views,
        reach,
        impressions: Number(row.impressions || 0),
        total_plays: Number(row.total_plays || views),
        replay_count: Number(row.replay_count || 0),
        avg_watch_time: avgWatch,
        avg_watch_percentage: watchPct,
        likes: Number(row.likes || 0),
        comments: Number(row.comments || 0),
        shares: Number(row.shares || 0),
        follows: Number(row.follows || 0),
        engagement_rate_by_reach: engReach,
        engagement_rate_by_views: engViews,
        performance_score: perfScore,
        retention_data: row.retention_data || [],
        hook_text: row.raw_metrics?.hook || null,
      };
    });

    return NextResponse.json({
      videos: items,
      total: count || 0,
      page,
      limit,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to fetch video analytics." }, { status: 500 });
  }
}
