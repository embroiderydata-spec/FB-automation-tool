import { SupabaseClient } from "@supabase/supabase-js";
import { PublishingJob, PublishingJobStatus } from "./types";
import { getEmergencyStopStatus, isPageQueuePaused } from "./emergency";
import { validatePublishingPreflight, executeTestModeSimulation } from "./test-mode";
import { initiateReelUpload, uploadReelBinary, finishReelPublish, reconcileReelState } from "./meta-reels";
import { classifyPublishingError, calculateBackoffDelayMs } from "./errors";
import { decryptToken } from "../crypto/encryption";

export interface WorkerProcessResult {
  processed: number;
  succeeded: number;
  failed: number;
  retried: number;
  skipped: number;
  details: Array<{ jobId: string; status: string; message: string }>;
}

/**
 * Main publishing queue worker dispatcher.
 * Finds due publishing jobs, acquires locks, processes either in Test Mode or Live Mode,
 * and handles retries or notifications.
 */
export async function processPublishingQueue(
  supabase: SupabaseClient,
  workerId: string = `worker_${Date.now()}`
): Promise<WorkerProcessResult> {
  const result: WorkerProcessResult = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    retried: 0,
    skipped: 0,
    details: [],
  };

  // 1. Check global Emergency Kill-Switch
  const emergencyStatus = await getEmergencyStopStatus(supabase);
  if (emergencyStatus.paused) {
    result.details.push({
      jobId: "all",
      status: "skipped",
      message: `Emergency Stop active: ${emergencyStatus.reason || "All publishing paused."}`,
    });
    return result;
  }

  // 2. Query for due jobs (scheduled_at <= now() or queued, plus retrying jobs whose backoff expired)
  const nowIso = new Date().toISOString();

  const { data: candidateJobs, error: fetchErr } = await supabase
    .from("publishing_jobs")
    .select(
      `
      *,
      video:videos(id, title, status, render_status, final_video_path, video_url, duration_seconds, aspect_ratio, resolution),
      facebook_page:facebook_pages(id, page_name, facebook_page_id, connection_status, encrypted_page_access_token)
    `
    )
    .or(
      `status.eq.queued,and(status.eq.scheduled,scheduled_at.lte.${nowIso}),and(status.eq.retrying,next_retry_at.lte.${nowIso})`
    )
    .order("scheduled_at", { ascending: true })
    .limit(5);

  if (fetchErr || !candidateJobs || candidateJobs.length === 0) {
    return result;
  }

  // Enforce concurrency limit: 1 job at a time per worker cycle
  const jobToProcess = candidateJobs[0] as PublishingJob;
  result.processed = 1;

  const pageId = jobToProcess.facebook_page_id || jobToProcess.page_id || "";

  // 3. Check if specific Page is paused
  if (pageId && (await isPageQueuePaused(supabase, pageId))) {
    result.skipped++;
    result.details.push({
      jobId: jobToProcess.id,
      status: "skipped",
      message: `Page queue is paused for page ${pageId}.`,
    });
    return result;
  }

  // 4. Acquire atomic job lock
  const { data: lockedJob, error: lockErr } = await supabase
    .from("publishing_jobs")
    .update({
      status: "uploading",
      started_at: nowIso,
      locked_at: nowIso,
      locked_by: workerId,
    })
    .eq("id", jobToProcess.id)
    .select()
    .single();

  if (lockErr || !lockedJob) {
    result.details.push({
      jobId: jobToProcess.id,
      status: "skipped",
      message: "Could not acquire lock (job may have been claimed by another worker).",
    });
    return result;
  }

  try {
    // 5. Preflight validation
    const preflight = await validatePublishingPreflight(
      supabase,
      jobToProcess.user_id,
      pageId,
      jobToProcess.video_id,
      jobToProcess.caption
    );

    if (!preflight.valid) {
      throw new Error(preflight.errors.join(" | "));
    }

    // Determine if test mode is enabled (either on job, page settings, or default)
    let isTest = jobToProcess.is_test_mode ?? true;
    const { data: pageSettings } = await supabase
      .from("page_settings")
      .select("publishing_mode")
      .eq("facebook_page_id", pageId)
      .single();

    if (pageSettings?.publishing_mode === "test") {
      isTest = true;
    }

    // 6. Branch: Test Mode Simulation vs. Official Meta Reels Flow
    if (isTest) {
      const simResult = await executeTestModeSimulation(supabase, jobToProcess, jobToProcess.user_id);

      await supabase
        .from("publishing_jobs")
        .update({
          status: "published",
          completed_at: new Date().toISOString(),
          meta_video_id: simResult.metaVideoId,
          meta_post_id: simResult.metaPostId,
          published_url: simResult.publishedUrl,
          error_message: null,
          locked_at: null,
          locked_by: null,
        })
        .eq("id", jobToProcess.id);

      // Update content_posts record if exists
      if (jobToProcess.post_id) {
        await supabase
          .from("content_posts")
          .update({
            status: "published",
            actual_published_time: new Date().toISOString(),
            fb_post_id: simResult.metaPostId,
            permalink_url: simResult.publishedUrl,
          })
          .eq("id", jobToProcess.post_id);
      }

      // Record success notification
      await supabase.from("notifications").insert({
        user_id: jobToProcess.user_id,
        title: "Reel Published (Test Mode)",
        message: `Reel successfully simulated for ${preflight.page?.page_name || "Facebook Page"}.`,
        type: "info",
        link_url: "/dashboard/queue",
      });

      result.succeeded++;
      result.details.push({
        jobId: jobToProcess.id,
        status: "published",
        message: "Simulated publishing succeeded in Test Mode.",
      });
      return result;
    }

    // 7. Live Mode: Real Official Meta Reels Flow
    const encryptedToken = preflight.page?.encrypted_page_access_token;
    if (!encryptedToken) {
      throw new Error("Page has no access token. Please reconnect the Facebook Page.");
    }

    const pageAccessToken = decryptToken(encryptedToken);

    // Fetch video binary from storage or public URL
    const videoUrl = preflight.video?.final_video_path || preflight.video?.video_url;
    if (!videoUrl) {
      throw new Error("Video file URL is missing.");
    }

    // Check for reconciliation in case of previous uncertain timeout
    if (jobToProcess.meta_video_id) {
      const reconciliation = await reconcileReelState(jobToProcess.meta_video_id, pageAccessToken);
      if (reconciliation.isPublished) {
        await supabase
          .from("publishing_jobs")
          .update({
            status: "published",
            completed_at: new Date().toISOString(),
            locked_at: null,
            locked_by: null,
          })
          .eq("id", jobToProcess.id);

        result.succeeded++;
        result.details.push({
          jobId: jobToProcess.id,
          status: "published",
          message: "Reconciled with Meta: Reel was already published.",
        });
        return result;
      }
    }

    // Phase 1: Start upload session
    const session = await initiateReelUpload(preflight.page.facebook_page_id, pageAccessToken);

    await supabase
      .from("publishing_jobs")
      .update({ meta_video_id: session.video_id, status: "processing" })
      .eq("id", jobToProcess.id);

    // Fetch video bytes
    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok) {
      throw new Error(`Failed to fetch video file bytes from storage: ${videoRes.statusText}`);
    }
    const arrayBuffer = await videoRes.arrayBuffer();
    const videoBuffer = Buffer.from(arrayBuffer);

    // Phase 2: Binary transfer
    await uploadReelBinary(session.upload_url, pageAccessToken, videoBuffer, videoBuffer.length);

    // Phase 3: Publish finish
    const finish = await finishReelPublish(
      preflight.page.facebook_page_id,
      pageAccessToken,
      session.video_id,
      jobToProcess.caption,
      null, // Publish immediately
      preflight.video.title
    );

    const publishedUrl = `https://www.facebook.com/reel/${session.video_id}`;

    // Update job to published
    await supabase
      .from("publishing_jobs")
      .update({
        status: "published",
        completed_at: new Date().toISOString(),
        meta_post_id: finish.post_id,
        published_url: publishedUrl,
        error_message: null,
        locked_at: null,
        locked_by: null,
      })
      .eq("id", jobToProcess.id);

    // Update video record
    await supabase
      .from("videos")
      .update({ status: "published" })
      .eq("id", jobToProcess.video_id);

    // Log to publishing_logs
    await supabase.from("publishing_logs").insert({
      user_id: jobToProcess.user_id,
      job_id: jobToProcess.id,
      page_id: pageId,
      video_id: jobToProcess.video_id,
      operation: "meta_reel_published",
      endpoint: `POST /${preflight.page.facebook_page_id}/video_reels`,
      attempt: jobToProcess.attempts + 1,
      status: "success",
      meta_response: { post_id: finish.post_id, video_id: session.video_id },
    });

    // Notify user
    await supabase.from("notifications").insert({
      user_id: jobToProcess.user_id,
      title: "Facebook Reel Published!",
      message: `Reel '${preflight.video.title}' successfully published to ${preflight.page.page_name}.`,
      type: "success",
      link_url: publishedUrl,
    });

    result.succeeded++;
    result.details.push({
      jobId: jobToProcess.id,
      status: "published",
      message: `Reel live on Facebook: ${finish.post_id}`,
    });
  } catch (err: any) {
    // 8. Error handling & Exponential Backoff Retry Policy
    const classification = classifyPublishingError(err);
    const nextAttempt = (jobToProcess.attempts || 0) + 1;
    const maxAttempts = jobToProcess.max_attempts || 3;

    if (classification.isRecoverable && nextAttempt < maxAttempts) {
      const delayMs = calculateBackoffDelayMs(nextAttempt);
      const nextRetryAt = new Date(Date.now() + delayMs).toISOString();

      await supabase
        .from("publishing_jobs")
        .update({
          status: "retrying",
          attempts: nextAttempt,
          next_retry_at: nextRetryAt,
          error_code: classification.errorCode,
          error_message: `${classification.userMessage} (${classification.suggestedAction})`,
          locked_at: null,
          locked_by: null,
        })
        .eq("id", jobToProcess.id);

      await supabase.from("publishing_logs").insert({
        user_id: jobToProcess.user_id,
        job_id: jobToProcess.id,
        page_id: pageId,
        video_id: jobToProcess.video_id,
        operation: "retry_scheduled",
        attempt: nextAttempt,
        status: "warning",
        error_message: classification.userMessage,
      });

      result.retried++;
      result.details.push({
        jobId: jobToProcess.id,
        status: "retrying",
        message: `Retry scheduled for ${nextRetryAt}: ${classification.userMessage}`,
      });
    } else {
      // Permanent failure or max attempts exhausted
      await supabase
        .from("publishing_jobs")
        .update({
          status: "failed",
          attempts: nextAttempt,
          error_code: classification.errorCode,
          error_message: `${classification.userMessage} (${classification.suggestedAction})`,
          locked_at: null,
          locked_by: null,
          completed_at: new Date().toISOString(),
        })
        .eq("id", jobToProcess.id);

      await supabase.from("publishing_logs").insert({
        user_id: jobToProcess.user_id,
        job_id: jobToProcess.id,
        page_id: pageId,
        video_id: jobToProcess.video_id,
        operation: "job_failed",
        attempt: nextAttempt,
        status: "error",
        error_message: classification.userMessage,
      });

      await supabase.from("notifications").insert({
        user_id: jobToProcess.user_id,
        title: "Reel Publishing Failed",
        message: `${classification.userMessage} — ${classification.suggestedAction}`,
        type: "error",
        link_url: "/dashboard/queue",
      });

      result.failed++;
      result.details.push({
        jobId: jobToProcess.id,
        status: "failed",
        message: classification.userMessage,
      });
    }
  }

  return result;
}
