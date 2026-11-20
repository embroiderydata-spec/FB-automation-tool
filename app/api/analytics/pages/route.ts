import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { createClient } from "@/lib/supabase/server";
import { calculateEngagementRateByViews, identifyPagePerformers } from "@/lib/analytics/metrics";
import { CrossPageMetric } from "@/lib/analytics/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/analytics/pages
 * Returns cross-page performance metrics for all connected Facebook Pages.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const supabase = await createClient();

    // 1. Fetch connected pages
    const { data: pages, error: pageErr } = await supabase
      .from("facebook_pages")
      .select("id, page_name, facebook_page_id, profile_picture_url, followers_count, last_analytics_synced_at, analytics_sync_status")
      .eq("user_id", user.id)
      .order("page_name", { ascending: true });

    if (pageErr) {
      return NextResponse.json({ error: pageErr.message }, { status: 500 });
    }

    if (!pages || pages.length === 0) {
      return NextResponse.json({ pages: [] });
    }

    const pageMetrics: CrossPageMetric[] = [];

    for (const page of pages) {
      // Fetch latest 30-day snapshot aggregations
      const { data: snapshots } = await supabase
        .from("page_analytics_snapshots")
        .select("views, reach, engagement, followers")
        .eq("facebook_page_id", page.id)
        .order("snapshot_date", { ascending: false })
        .limit(30);

      // Fetch video metrics
      const { data: videoMetrics } = await supabase
        .from("video_analytics")
        .select("average_watch_time, views")
        .eq("facebook_page_id", page.id);

      const totalViews = (snapshots || []).reduce((acc, s) => acc + Number(s.views || 0), 0);
      const totalReach = (snapshots || []).reduce((acc, s) => acc + Number(s.reach || 0), 0);
      const totalEngagement = (snapshots || []).reduce((acc, s) => acc + Number(s.engagement || 0), 0);
      const postsCount = videoMetrics ? videoMetrics.length : 0;

      const watchItems = (videoMetrics || []).filter((v) => Number(v.average_watch_time) > 0);
      const avgWatch =
        watchItems.length > 0
          ? parseFloat(
              (
                watchItems.reduce((acc, v) => acc + Number(v.average_watch_time), 0) /
                watchItems.length
              ).toFixed(1)
            )
          : null;

      const engRate = calculateEngagementRateByViews(totalEngagement, totalViews);

      pageMetrics.push({
        page_id: page.id,
        facebook_page_id: page.facebook_page_id,
        page_name: page.page_name,
        profile_picture_url: page.profile_picture_url,
        followers: page.followers_count || 0,
        views: totalViews,
        reach: totalReach,
        engagement: totalEngagement,
        posts_published: postsCount,
        avg_watch_time_seconds: avgWatch,
        growth_percentage: null,
        engagement_rate: engRate,
        last_synced_at: page.last_analytics_synced_at,
        sync_status: page.analytics_sync_status || "idle",
      });
    }

    // Identify highest and lowest performer flags
    const { highestIndex, lowestIndex } = identifyPagePerformers(pageMetrics);
    if (highestIndex !== null) pageMetrics[highestIndex].is_highest_performer = true;
    if (lowestIndex !== null && lowestIndex !== highestIndex) {
      pageMetrics[lowestIndex].is_lowest_performer = true;
    }

    return NextResponse.json({ pages: pageMetrics });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to fetch page analytics." }, { status: 500 });
  }
}
