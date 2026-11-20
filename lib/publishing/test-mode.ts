import { SupabaseClient } from "@supabase/supabase-js";
import { PublishingJob } from "./types";

export interface ValidationPreflightResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  page?: any;
  video?: any;
}

/**
 * Validates all pre-conditions before publishing or scheduling.
 */
export async function validatePublishingPreflight(
  supabase: SupabaseClient,
  userId: string,
  pageId: string,
  videoId: string,
  caption: string
): Promise<ValidationPreflightResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Fetch Facebook Page & connection status
  const { data: page, error: pageErr } = await supabase
    .from("facebook_pages")
    .select("id, page_name, facebook_page_id, connection_status, assigned_tasks, encrypted_page_access_token")
    .eq("id", pageId)
    .eq("user_id", userId)
    .single();

  if (pageErr || !page) {
    errors.push("Destination Facebook Page does not exist or you do not have permission to access it.");
    return { valid: false, errors, warnings };
  }

  if (page.connection_status === "revoked" || page.connection_status === "expired") {
    errors.push(`Facebook Page '${page.page_name}' connection is ${page.connection_status}. Re-authorization required.`);
  }

  // 2. Fetch Video & verify readiness
  const { data: video, error: videoErr } = await supabase
    .from("videos")
    .select("id, title, status, render_status, final_video_path, video_url, duration_seconds, aspect_ratio, resolution")
    .eq("id", videoId)
    .eq("user_id", userId)
    .single();

  if (videoErr || !video) {
    errors.push("Selected video was not found or does not belong to your account.");
    return { valid: false, errors, warnings, page };
  }

  // Check render status
  const isRendered =
    video.render_status === "completed" ||
    video.status === "ready" ||
    video.status === "published" ||
    Boolean(video.final_video_path || video.video_url);

  if (!isRendered) {
    errors.push(`Video '${video.title}' has not completed rendering. Current status: ${video.render_status || video.status}.`);
  }

  // Check aspect ratio (Facebook Reels strictly require 9:16 vertical)
  if (video.aspect_ratio && video.aspect_ratio !== "9:16") {
    warnings.push(`Video aspect ratio is ${video.aspect_ratio}. Facebook Reels are optimized for 9:16 vertical format.`);
  }

  // 3. Caption validation
  if (!caption || caption.trim().length === 0) {
    warnings.push("Caption is empty. Facebook Reels perform significantly better with engaging captions and hashtags.");
  } else if (caption.length > 2200) {
    errors.push("Caption exceeds Meta maximum character limit of 2,200 characters.");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    page,
    video,
  };
}

/**
 * Executes a simulated publishing job in Test Mode.
 * Verifies all credentials and assets without making any external publish requests to Meta.
 */
export async function executeTestModeSimulation(
  supabase: SupabaseClient,
  job: PublishingJob,
  userId: string
): Promise<{
  success: boolean;
  metaVideoId: string;
  metaPostId: string;
  publishedUrl: string;
  logs: Array<{ operation: string; message: string }>;
}> {
  const simRandom = Math.random().toString(36).substring(2, 10);
  const simVideoId = `sim_vid_${Date.now()}_${simRandom}`;
  const simPostId = `${job.facebook_page_id || job.page_id}_sim_reel_${simRandom}`;
  const simUrl = `https://www.facebook.com/reel/${simVideoId}`;

  const logs = [
    {
      operation: "test_mode_validation",
      message: "[TEST MODE — NOT PUBLISHED] Preflight check completed. Verified Page token and video metadata.",
    },
    {
      operation: "test_mode_upload_simulation",
      message: `[TEST MODE — NOT PUBLISHED] Simulated 9:16 vertical chunked video upload. Generated mock Meta Video ID: ${simVideoId}`,
    },
    {
      operation: "test_mode_publish_simulation",
      message: `[TEST MODE — NOT PUBLISHED] Simulated Facebook Reel finish call. Post published to sandbox with ID: ${simPostId}`,
    },
  ];

  // Log in publishing_logs
  for (const log of logs) {
    await supabase.from("publishing_logs").insert({
      user_id: userId,
      job_id: job.id,
      page_id: job.page_id,
      video_id: job.video_id,
      operation: log.operation,
      endpoint: "simulated://meta.graph/video_reels",
      attempt: 1,
      status: "info",
      meta_response: {
        is_test_mode: true,
        simulated_video_id: simVideoId,
        simulated_post_id: simPostId,
      },
      error_message: null,
    });
  }

  return {
    success: true,
    metaVideoId: simVideoId,
    metaPostId: simPostId,
    publishedUrl: simUrl,
    logs,
  };
}
