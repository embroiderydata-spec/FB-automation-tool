import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { createClient } from "@/lib/supabase/server";
import { ExportCsvSchema } from "@/lib/validations/analytics";
import { exportGrowthSnapshotsToCsv, exportPagesToCsv, exportVideosToCsv } from "@/lib/analytics/csv-export";
import { calculateEngagementRateByViews, calculateAverageWatchPercentage, calculateEngagementRateByReach, calculatePerformanceScore } from "@/lib/analytics/metrics";
import { CrossPageMetric, GrowthSnapshot, VideoPerformanceItem } from "@/lib/analytics/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/analytics/export
 * Generates and downloads RFC 4180 CSV export for Pages, Videos, or Growth snapshots.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = ExportCsvSchema.safeParse({
      type: searchParams.get("type") || "pages",
      page_id: searchParams.get("page_id") || "all",
      date_range: searchParams.get("date_range") || "last_30d",
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid export parameters." }, { status: 400 });
    }

    const { type, page_id } = parsed.data;
    const supabase = await createClient();

    let csvContent = "";
    let filename = `analytics_${type}_${Date.now()}.csv`;

    if (type === "pages") {
      const { data: pages } = await supabase
        .from("facebook_pages")
        .select("id, page_name, facebook_page_id, followers_count, last_analytics_synced_at")
        .eq("user_id", user.id);

      const items: CrossPageMetric[] = (pages || []).map((p) => ({
        page_id: p.id,
        facebook_page_id: p.facebook_page_id,
        page_name: p.page_name,
        followers: p.followers_count || 0,
        views: 0,
        reach: 0,
        engagement: 0,
        posts_published: 0,
        avg_watch_time_seconds: null,
        growth_percentage: null,
        engagement_rate: null,
        last_synced_at: p.last_analytics_synced_at,
      }));

      csvContent = exportPagesToCsv(items);
      filename = `cross_page_analytics_${Date.now()}.csv`;
    } else if (type === "videos" || type === "rankings") {
      let vQuery = supabase
        .from("video_analytics")
        .select(
          `
          *,
          facebook_page:facebook_pages(page_name),
          video:videos(title, duration_seconds)
        `
        )
        .eq("user_id", user.id);

      if (page_id && page_id !== "all") {
        vQuery = vQuery.eq("facebook_page_id", page_id);
      }

      const { data: rows } = await vQuery;

      const videoItems: VideoPerformanceItem[] = (rows || []).map((r: any) => {
        const views = Number(r.views || 0);
        const reach = Number(r.reach || 0);
        const engagements = Number(r.likes || 0) + Number(r.comments || 0) + Number(r.shares || 0);
        const duration = Number(r.video?.duration_seconds || 45);
        const avgWatch = r.average_watch_time !== null ? Number(r.average_watch_time) : null;
        const watchPct = calculateAverageWatchPercentage(avgWatch, duration);
        const engReach = calculateEngagementRateByReach(engagements, reach);
        const engViews = calculateEngagementRateByViews(engagements, views);
        const score = calculatePerformanceScore({ views, reach, engagements, avgWatchPercentage: watchPct });

        return {
          id: r.id,
          meta_video_id: r.meta_video_id,
          title: r.video?.title || `Reel (${r.meta_video_id.slice(-6)})`,
          page_id: r.facebook_page_id,
          page_name: r.facebook_page?.page_name || "Page",
          published_date: r.date,
          duration_seconds: duration,
          views,
          reach,
          impressions: Number(r.impressions || 0),
          total_plays: Number(r.total_plays || views),
          replay_count: Number(r.replay_count || 0),
          avg_watch_time: avgWatch,
          avg_watch_percentage: watchPct,
          likes: Number(r.likes || 0),
          comments: Number(r.comments || 0),
          shares: Number(r.shares || 0),
          follows: Number(r.follows || 0),
          engagement_rate_by_reach: engReach,
          engagement_rate_by_views: engViews,
          performance_score: score,
        };
      });

      csvContent = exportVideosToCsv(videoItems);
      filename = `reels_performance_${Date.now()}.csv`;
    } else if (type === "growth") {
      let gQuery = supabase
        .from("page_analytics_snapshots")
        .select("*")
        .eq("user_id", user.id)
        .order("snapshot_date", { ascending: true });

      if (page_id && page_id !== "all") {
        gQuery = gQuery.eq("facebook_page_id", page_id);
      }

      const { data: rows } = await gQuery;

      const growthItems: GrowthSnapshot[] = (rows || []).map((r) => ({
        snapshot_date: r.snapshot_date,
        followers: Number(r.followers || 0),
        views: Number(r.views || 0),
        reach: Number(r.reach || 0),
        engagement: Number(r.engagement || 0),
        follows_gained: Number(r.follows_gained || 0),
        follows_lost: Number(r.follows_lost || 0),
        net_followers: Number(r.follows_gained || 0) - Number(r.follows_lost || 0),
      }));

      csvContent = exportGrowthSnapshotsToCsv(growthItems);
      filename = `page_growth_snapshots_${Date.now()}.csv`;
    }

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "CSV export failed." }, { status: 500 });
  }
}
