import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { createClient } from "@/lib/supabase/server";
import {
  calculateAverageWatchPercentage,
  calculateEngagementRateByReach,
  calculateEngagementRateByViews,
  calculatePerformanceScore,
} from "@/lib/analytics/metrics";

export const dynamic = "force-dynamic";

/**
 * GET /api/analytics/videos/[id]
 * Fetches granular analytics for a single Reel (retention curve, metrics breakdown).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { id } = params;
    const supabase = await createClient();

    // Fetch video analytics record by ID or meta_video_id
    const { data: record, error } = await supabase
      .from("video_analytics")
      .select(
        `
        *,
        facebook_page:facebook_pages(id, page_name, facebook_page_id),
        video:videos(id, title, duration_seconds, final_video_path, thumbnail_path, aspect_ratio, resolution)
      `
      )
      .eq("user_id", user.id)
      .or(`id.eq.${id},meta_video_id.eq.${id}`)
      .single();

    if (error || !record) {
      return NextResponse.json({ error: "Video analytics not found." }, { status: 404 });
    }

    const views = Number(record.views || 0);
    const reach = Number(record.reach || 0);
    const engagements = Number(record.likes || 0) + Number(record.comments || 0) + Number(record.shares || 0);
    const duration = Number(record.video?.duration_seconds || 45);
    const avgWatch = record.average_watch_time !== null ? Number(record.average_watch_time) : null;
    const watchPct = calculateAverageWatchPercentage(avgWatch, duration);
    const engReach = calculateEngagementRateByReach(engagements, reach);
    const engViews = calculateEngagementRateByViews(engagements, views);
    const score = calculatePerformanceScore({ views, reach, engagements, avgWatchPercentage: watchPct });

    return NextResponse.json({
      video_analytics: {
        ...record,
        views,
        reach,
        engagements,
        duration_seconds: duration,
        avg_watch_time: avgWatch,
        avg_watch_percentage: watchPct,
        engagement_rate_by_reach: engReach,
        engagement_rate_by_views: engViews,
        performance_score: score,
        retention_data: record.retention_data || [],
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to fetch video details." },
      { status: 500 }
    );
  }
}
