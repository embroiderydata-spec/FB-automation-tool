import { SupabaseClient } from "@supabase/supabase-js";
import { decryptToken } from "../crypto/encryption";
import {
  fetchMetaPageFollowers,
  fetchMetaPageInsights,
  fetchMetaPublishedVideos,
  fetchMetaVideoInsights,
} from "./meta-insights";
import { SyncResult } from "./types";

/**
 * Synchronizes real Facebook analytics data for a single connected Page.
 */
export async function syncPageAnalytics(
  supabase: SupabaseClient,
  pageId: string,
  userId: string
): Promise<{ success: boolean; videosSynced: number; message?: string }> {
  // 1. Fetch Page and decrypted token
  const { data: page, error: pageErr } = await supabase
    .from("facebook_pages")
    .select("id, page_name, facebook_page_id, encrypted_page_access_token, connection_status")
    .eq("id", pageId)
    .eq("user_id", userId)
    .single();

  if (pageErr || !page) {
    throw new Error("Facebook Page not found or unauthorized.");
  }

  // Update status to syncing
  await supabase
    .from("facebook_pages")
    .update({ analytics_sync_status: "syncing" })
    .eq("id", pageId);

  try {
    let pageAccessToken = "";
    if (page.encrypted_page_access_token) {
      try {
        pageAccessToken = decryptToken(page.encrypted_page_access_token);
      } catch {
        // Token decryption failed or mock token in dev
      }
    }

    const todayDate = new Date().toISOString().split("T")[0];
    let followersCount = 0;
    let pageViews = 0;
    let pageReach = 0;
    let pageImpressions = 0;
    let pageEngagement = 0;
    let videosSyncedCount = 0;

    // If real access token is available, query official Meta Graph API
    if (pageAccessToken && !pageAccessToken.startsWith("mock_")) {
      // A. Fetch Page Followers
      const followerStats = await fetchMetaPageFollowers(page.facebook_page_id, pageAccessToken);
      followersCount = followerStats.followersCount;

      // B. Fetch Page-Level Insights
      const pageInsights = await fetchMetaPageInsights(page.facebook_page_id, pageAccessToken);
      pageViews = pageInsights.videoViews.numericValue || 0;
      pageReach = pageInsights.reach.numericValue || 0;
      pageImpressions = pageInsights.impressions.numericValue || 0;
      pageEngagement = pageInsights.engagement.numericValue || 0;

      // C. Record Page Snapshot
      await supabase.from("page_analytics_snapshots").upsert(
        {
          user_id: userId,
          facebook_page_id: page.id,
          snapshot_date: todayDate,
          followers: followersCount,
          views: pageViews,
          reach: pageReach,
          impressions: pageImpressions,
          engagement: pageEngagement,
          raw_metrics: pageInsights.rawPayload,
          synced_at: new Date().toISOString(),
        },
        { onConflict: "facebook_page_id,snapshot_date" }
      );

      // D. Record Daily Metrics
      await supabase.from("analytics_daily").upsert(
        {
          user_id: userId,
          page_id: page.id,
          date: todayDate,
          views_count: pageViews,
          reach_count: pageReach,
          impressions_count: pageImpressions,
          engagements_count: pageEngagement,
          raw_metrics: pageInsights.rawPayload,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "page_id,date" }
      );

      // E. Fetch Published Reels & Video Insights
      const publishedVideos = await fetchMetaPublishedVideos(page.facebook_page_id, pageAccessToken, 25);

      for (const item of publishedVideos) {
        try {
          const videoInsights = await fetchMetaVideoInsights(item.id, pageAccessToken);

          await supabase.from("video_analytics").upsert(
            {
              user_id: userId,
              facebook_page_id: page.id,
              meta_video_id: item.id,
              date: todayDate,
              views: videoInsights.views.numericValue || item.views || 0,
              reach: videoInsights.reach.numericValue || 0,
              impressions: videoInsights.impressions.numericValue || 0,
              total_plays: videoInsights.totalPlays.numericValue || 0,
              replay_count: videoInsights.replayCount.numericValue || 0,
              average_watch_time: videoInsights.averageWatchTimeSeconds.numericValue || 0,
              total_watch_time: videoInsights.totalWatchTimeSeconds.numericValue || 0,
              likes: item.likesCount,
              comments: item.commentsCount,
              shares: item.sharesCount,
              retention_data: videoInsights.retentionCurve,
              raw_metrics: videoInsights.rawPayload,
              synced_at: new Date().toISOString(),
            },
            { onConflict: "facebook_page_id,meta_video_id,date" }
          );

          videosSyncedCount++;
        } catch (vidErr) {
          console.warn(`Could not sync video ${item.id}:`, vidErr);
        }
      }
    } else {
      // In development / demo environment without live token, record zero-baseline or existing posts
      await supabase.from("page_analytics_snapshots").upsert(
        {
          user_id: userId,
          facebook_page_id: page.id,
          snapshot_date: todayDate,
          followers: 0,
          views: 0,
          reach: 0,
          impressions: 0,
          engagement: 0,
          raw_metrics: { notice: "Waiting for Meta OAuth connection." },
          synced_at: new Date().toISOString(),
        },
        { onConflict: "facebook_page_id,snapshot_date" }
      );
    }

    // Mark Page sync status as success
    await supabase
      .from("facebook_pages")
      .update({
        last_analytics_synced_at: new Date().toISOString(),
        analytics_sync_status: "success",
        analytics_error_message: null,
      })
      .eq("id", pageId);

    return {
      success: true,
      videosSynced: videosSyncedCount,
      message: `Successfully synchronized analytics for ${page.page_name}.`,
    };
  } catch (err: any) {
    const errorMsg = err?.message || "Synchronization failed";

    await supabase
      .from("facebook_pages")
      .update({
        analytics_sync_status: "error",
        analytics_error_message: errorMsg,
      })
      .eq("id", pageId);

    throw err;
  }
}

/**
 * Synchronizes all connected Facebook Pages for a user.
 */
export async function syncAllPagesAnalytics(
  supabase: SupabaseClient,
  userId: string
): Promise<SyncResult> {
  const result: SyncResult = {
    pages_synced: 0,
    videos_synced: 0,
    errors: [],
    status: "success",
    timestamp: new Date().toISOString(),
  };

  const { data: pages } = await supabase
    .from("facebook_pages")
    .select("id, page_name")
    .eq("user_id", userId);

  if (!pages || pages.length === 0) {
    return result;
  }

  for (const p of pages) {
    try {
      const pageRes = await syncPageAnalytics(supabase, p.id, userId);
      result.pages_synced++;
      result.videos_synced += pageRes.videosSynced;
    } catch (err: any) {
      result.errors.push({
        page_name: p.page_name,
        message: err?.message || "Page synchronization failure",
      });
    }
  }

  if (result.errors.length > 0) {
    result.status = result.pages_synced > 0 ? "partial" : "failed";
  }

  return result;
}
