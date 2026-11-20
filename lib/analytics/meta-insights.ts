import { getGraphApiBaseUrl } from "../meta/config";
import { normalizePageInsights, normalizeVideoInsights, NormalizedPageInsights, NormalizedVideoInsights } from "./normalization";

export interface MetaPageFollowerStats {
  followersCount: number;
  fanCount: number;
}

export interface MetaPublishedVideoItem {
  id: string; // Meta Video ID
  title?: string;
  description?: string;
  created_time: string;
  length?: number; // duration in seconds
  picture?: string; // thumbnail
  views?: number;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
}

/**
 * Fetches Page-level insights from Meta Graph API.
 * Uses official metrics: page_impressions, page_impressions_unique, page_post_engagements, page_video_views.
 */
export async function fetchMetaPageInsights(
  pageId: string,
  pageAccessToken: string,
  options: { since?: number; until?: number } = {}
): Promise<NormalizedPageInsights> {
  const metrics = "page_impressions,page_impressions_unique,page_post_engagements,page_video_views,page_daily_follows_unique";
  let url = `${getGraphApiBaseUrl()}/${pageId}/insights?metric=${metrics}&period=day&access_token=${encodeURIComponent(pageAccessToken)}`;

  if (options.since) url += `&since=${options.since}`;
  if (options.until) url += `&until=${options.until}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      handleMetaApiError(data.error, "Page Insights");
    }

    return normalizePageInsights(data);
  } catch (err: any) {
    throw new Error(`Failed to fetch Meta Page Insights: ${err?.message || "Unknown error"}`);
  }
}

/**
 * Fetches live Page follower numbers directly from Graph API.
 */
export async function fetchMetaPageFollowers(
  pageId: string,
  pageAccessToken: string
): Promise<MetaPageFollowerStats> {
  const url = `${getGraphApiBaseUrl()}/${pageId}?fields=followers_count,fan_count&access_token=${encodeURIComponent(pageAccessToken)}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    const data = await response.json();

    if (!response.ok || data.error) {
      handleMetaApiError(data.error, "Page Followers");
    }

    return {
      followersCount: data.followers_count || 0,
      fanCount: data.fan_count || 0,
    };
  } catch (err: any) {
    throw new Error(`Failed to fetch Meta Page Followers: ${err?.message || "Unknown error"}`);
  }
}

/**
 * Fetches published videos and Reels for a Facebook Page (`GET /{page-id}/videos`).
 */
export async function fetchMetaPublishedVideos(
  pageId: string,
  pageAccessToken: string,
  limit: number = 25
): Promise<MetaPublishedVideoItem[]> {
  const fields = "id,title,description,created_time,length,picture,views,likes.summary(true),comments.summary(true),shares";
  const url = `${getGraphApiBaseUrl()}/${pageId}/videos?fields=${fields}&limit=${limit}&access_token=${encodeURIComponent(pageAccessToken)}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    const data = await response.json();

    if (!response.ok || data.error) {
      handleMetaApiError(data.error, "Published Videos");
    }

    const items = data.data || [];
    return items.map((item: any) => ({
      id: item.id,
      title: item.title || item.description?.substring(0, 50) || "Facebook Reel",
      description: item.description,
      created_time: item.created_time,
      length: item.length ? Math.round(item.length) : 45,
      picture: item.picture,
      views: item.views || 0,
      likesCount: item.likes?.summary?.total_count || 0,
      commentsCount: item.comments?.summary?.total_count || 0,
      sharesCount: item.shares?.count || 0,
    }));
  } catch (err: any) {
    throw new Error(`Failed to fetch Meta Published Videos: ${err?.message || "Unknown error"}`);
  }
}

/**
 * Fetches granular Reel/Video Insights (`GET /{video-id}/video_insights`).
 */
export async function fetchMetaVideoInsights(
  metaVideoId: string,
  pageAccessToken: string
): Promise<NormalizedVideoInsights> {
  const metrics =
    "total_video_views,total_video_views_unique,total_video_impressions,total_video_views_autoplayed,total_video_views_clicked_to_play,total_video_avg_time_watched,total_video_view_time,total_video_retention_graph_autoplayed";
  const url = `${getGraphApiBaseUrl()}/${metaVideoId}/video_insights?metric=${metrics}&access_token=${encodeURIComponent(pageAccessToken)}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    const data = await response.json();

    if (!response.ok || data.error) {
      handleMetaApiError(data.error, "Video Insights");
    }

    return normalizeVideoInsights(data);
  } catch (err: any) {
    throw new Error(`Failed to fetch Meta Video Insights: ${err?.message || "Unknown error"}`);
  }
}

/**
 * Standardized Meta Graph API error classifier
 */
function handleMetaApiError(errorObj: any, context: string) {
  const code = errorObj?.code;
  const message = errorObj?.message || "Meta API error occurred.";

  if (code === 190) {
    throw new Error(`Meta session expired (Code 190): Reconnect Facebook account to refresh analytics access.`);
  }
  if (code === 200 || code === 10) {
    throw new Error(`Meta permission missing (${context}): Ensure 'read_insights' and 'pages_read_engagement' permissions are approved.`);
  }
  if ([4, 17, 32, 613].includes(code || 0)) {
    throw new Error(`Meta API rate limit reached. Synchronization will retry in the next interval.`);
  }

  throw new Error(`Meta API ${context} Error (${code || "unknown"}): ${message}`);
}
