import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { createClient } from "@/lib/supabase/server";
import { generatePerformanceIntelligence } from "@/lib/analytics/ai-intelligence";
import {
  calculateAverageWatchPercentage,
  calculateEngagementRateByReach,
  calculateEngagementRateByViews,
  calculatePerformanceScore,
} from "@/lib/analytics/metrics";
import { VideoPerformanceItem } from "@/lib/analytics/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/analytics/insights
 * Runs AI Performance Intelligence on synchronized video and hook data.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const pageId = searchParams.get("page_id");

    const supabase = await createClient();

    let query = supabase
      .from("video_analytics")
      .select(
        `
        *,
        facebook_page:facebook_pages(id, page_name),
        video:videos(id, title, duration_seconds)
      `
      )
      .eq("user_id", user.id)
      .order("views", { ascending: false });

    if (pageId && pageId !== "all") {
      query = query.eq("facebook_page_id", pageId);
    }

    const { data: rows, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const videoItems: VideoPerformanceItem[] = (rows || []).map((row: any) => {
      const views = Number(row.views || 0);
      const reach = Number(row.reach || 0);
      const engagements = Number(row.likes || 0) + Number(row.comments || 0) + Number(row.shares || 0);
      const duration = Number(row.video?.duration_seconds || 45);
      const avgWatch = row.average_watch_time !== null ? Number(row.average_watch_time) : null;
      const watchPct = calculateAverageWatchPercentage(avgWatch, duration);
      const engReach = calculateEngagementRateByReach(engagements, reach);
      const engViews = calculateEngagementRateByViews(engagements, views);
      const score = calculatePerformanceScore({ views, reach, engagements, avgWatchPercentage: watchPct });

      return {
        id: row.id,
        meta_video_id: row.meta_video_id,
        video_id: row.video_id,
        title: row.video?.title || `Reel (${row.meta_video_id.slice(-6)})`,
        page_id: row.facebook_page_id,
        page_name: row.facebook_page?.page_name || "Page",
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
        performance_score: score,
        retention_data: row.retention_data || [],
        hook_text: row.raw_metrics?.hook || null,
      };
    });

    const analysis = generatePerformanceIntelligence(videoItems);

    return NextResponse.json(analysis);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to generate AI performance intelligence." }, { status: 500 });
  }
}
