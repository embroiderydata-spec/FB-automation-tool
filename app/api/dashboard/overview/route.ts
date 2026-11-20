import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/dashboard/overview
 * Returns real, aggregated database statistics and recent activity for the Overview Dashboard.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const supabase = await createClient();

    // Run parallel queries across database tables for user data
    const [
      pagesRes,
      videosRes,
      publishedJobsRes,
      scheduledJobsRes,
      failedJobsRes,
      queueRes,
      recentLogsRes,
    ] = await Promise.all([
      // 1. Pages count
      supabase
        .from("facebook_pages")
        .select("id, page_name, name, category, followers_count, connection_status, automation_enabled, last_synced_at, picture_url, profile_picture_url", { count: "exact" })
        .eq("user_id", user.id),

      // 2. Videos count
      supabase
        .from("videos")
        .select("id, title, render_status, duration_seconds, final_video_path, created_at", { count: "exact" })
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5),

      // 3. Published posts
      supabase
        .from("publishing_jobs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "published"),

      // 4. Scheduled posts
      supabase
        .from("publishing_jobs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .in("status", ["scheduled", "queued"]),

      // 5. Failed jobs
      supabase
        .from("publishing_jobs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "failed"),

      // 6. Upcoming queue items
      supabase
        .from("publishing_jobs")
        .select("id, scheduled_at, status, caption, title, video:videos(id, title), facebook_page:facebook_pages(id, page_name, name)")
        .eq("user_id", user.id)
        .order("scheduled_at", { ascending: true })
        .limit(5),

      // 7. Recent activity logs
      supabase
        .from("publishing_logs")
        .select("id, event_type, message, status, created_at, job:publishing_jobs(id, caption, facebook_page:facebook_pages(page_name, name))")
        .order("created_at", { ascending: false })
        .limit(6),
    ]);

    const connectedPages = pagesRes.data || [];
    const pagesCount = pagesRes.count || connectedPages.length;
    const totalVideos = videosRes.count || 0;
    const publishedCount = publishedJobsRes.count || 0;
    const scheduledCount = scheduledJobsRes.count || 0;
    const failedCount = failedJobsRes.count || 0;

    // Calculate realistic AI usage cost based on recorded videos and scripts
    const estimatedCost = (totalVideos * 0.14 + publishedCount * 0.05).toFixed(2);

    return NextResponse.json({
      metrics: {
        connected_pages: pagesCount,
        max_pages: 100,
        total_videos: totalVideos,
        published_posts: publishedCount,
        scheduled_posts: scheduledCount,
        failed_jobs: failedCount,
        estimated_cost: `$${estimatedCost}`,
      },
      connected_pages: connectedPages.slice(0, 5),
      queue_items: queueRes.data || [],
      recent_activity: recentLogsRes.data || [],
      recent_videos: videosRes.data || [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
