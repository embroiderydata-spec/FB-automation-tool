import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { createClient } from "@/lib/supabase/server";
import { AnalyticsFilterSchema } from "@/lib/validations/analytics";
import { PerformanceOverview } from "@/lib/analytics/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/analytics/overview
 * Returns aggregate performance telemetry from synchronized Facebook Page and Video metrics.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = AnalyticsFilterSchema.safeParse({
      page_id: searchParams.get("page_id") || "all",
      date_range: searchParams.get("date_range") || "last_30d",
      start_date: searchParams.get("start_date") || undefined,
      end_date: searchParams.get("end_date") || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid filters.", details: parsed.error.format() }, { status: 400 });
    }

    const { page_id, date_range } = parsed.data;
    const supabase = await createClient();

    // 1. Determine date threshold
    const now = new Date();
    let daysToSubtract = 30;
    if (date_range === "today") daysToSubtract = 0;
    else if (date_range === "yesterday") daysToSubtract = 1;
    else if (date_range === "last_7d") daysToSubtract = 7;
    else if (date_range === "last_30d") daysToSubtract = 30;
    else if (date_range === "last_90d") daysToSubtract = 90;

    const startDate = new Date();
    startDate.setDate(now.getDate() - daysToSubtract);
    startDate.setUTCHours(0, 0, 0, 0);
    const startDateStr = startDate.toISOString().split("T")[0];

    // 2. Fetch page snapshots
    let snapshotsQuery = supabase
      .from("page_analytics_snapshots")
      .select("*")
      .eq("user_id", user.id)
      .gte("snapshot_date", startDateStr);

    if (page_id && page_id !== "all") {
      snapshotsQuery = snapshotsQuery.eq("facebook_page_id", page_id);
    }

    const { data: snapshots } = await snapshotsQuery;

    // 3. Fetch video analytics
    let videoQuery = supabase
      .from("video_analytics")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", startDateStr);

    if (page_id && page_id !== "all") {
      videoQuery = videoQuery.eq("facebook_page_id", page_id);
    }

    const { data: videoMetrics } = await videoQuery;

    // 4. Fetch latest sync timestamp across pages
    let pageQuery = supabase
      .from("facebook_pages")
      .select("last_analytics_synced_at, followers_count")
      .eq("user_id", user.id);

    if (page_id && page_id !== "all") {
      pageQuery = pageQuery.eq("id", page_id);
    }

    const { data: pageRecords } = await pageQuery;

    // Aggregate values
    const hasData = Boolean((snapshots && snapshots.length > 0) || (videoMetrics && videoMetrics.length > 0));

    const totalFollowers = (pageRecords || []).reduce((sum, p) => sum + (p.followers_count || 0), 0);
    const totalPlays = (videoMetrics || []).reduce((sum, v) => sum + (Number(v.total_plays) || Number(v.views) || 0), 0);
    const totalReach = (snapshots || []).reduce((sum, s) => sum + (Number(s.reach) || 0), 0);
    const totalImpressions = (snapshots || []).reduce((sum, s) => sum + (Number(s.impressions) || 0), 0);
    const totalEngagements = (snapshots || []).reduce((sum, s) => sum + (Number(s.engagement) || 0), 0);
    const followsGained = (snapshots || []).reduce((sum, s) => sum + (Number(s.follows_gained) || 0), 0);
    const followsLost = (snapshots || []).reduce((sum, s) => sum + (Number(s.follows_lost) || 0), 0);

    const watchTimeEntries = (videoMetrics || []).filter((v) => Number(v.average_watch_time) > 0);
    const avgWatchTime =
      watchTimeEntries.length > 0
        ? parseFloat(
            (
              watchTimeEntries.reduce((sum, v) => sum + Number(v.average_watch_time), 0) /
              watchTimeEntries.length
            ).toFixed(1)
          )
        : null;

    const totalWatchTime = (videoMetrics || []).reduce((sum, v) => sum + (Number(v.total_watch_time) || 0), 0);

    const latestSync = (pageRecords || [])
      .map((p) => p.last_analytics_synced_at)
      .filter(Boolean)
      .sort()
      .reverse()[0] || null;

    const overview: PerformanceOverview = {
      total_plays: hasData ? totalPlays : null,
      total_reach: hasData ? totalReach : null,
      total_impressions: hasData ? totalImpressions : null,
      total_engagements: hasData ? totalEngagements : null,
      total_followers: pageRecords && pageRecords.length > 0 ? totalFollowers : null,
      followers_gained: hasData ? followsGained : null,
      followers_lost: hasData ? followsLost : null,
      average_watch_time: avgWatchTime,
      total_watch_time: hasData ? totalWatchTime : null,
      published_videos: videoMetrics ? videoMetrics.length : 0,
      last_synced_at: latestSync,
      is_real_data: hasData,
    };

    return NextResponse.json({ overview });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to fetch analytics overview." }, { status: 500 });
  }
}
