import { getGraphApiBaseUrl } from "../meta/config";
import { MetaReelStartResponse, MetaReelFinishResponse } from "./types";

export interface ReelPublishOptions {
  pageId: string;
  pageAccessToken: string;
  videoBuffer: Buffer | Uint8Array;
  fileSizeBytes: number;
  caption: string;
  scheduledPublishTimeUnix?: number | null; // Must be 10m to 75d in the future if scheduled
  title?: string | null;
}

/**
 * Executes Phase 1 of Facebook Reels upload:
 * POST /{page_id}/video_reels?upload_phase=start
 */
export async function initiateReelUpload(
  pageId: string,
  pageAccessToken: string
): Promise<MetaReelStartResponse> {
  const url = `${getGraphApiBaseUrl()}/${pageId}/video_reels`;

  const params = new URLSearchParams({
    upload_phase: "start",
    access_token: pageAccessToken,
  });

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    const err = data.error;
    throw {
      code: err?.code || response.status,
      message: err?.message || "Failed to initiate Facebook Reels upload session.",
      type: err?.type,
    };
  }

  if (!data.video_id || !data.upload_url) {
    throw new Error("Meta Graph API did not return video_id or upload_url.");
  }

  return {
    video_id: data.video_id,
    upload_url: data.upload_url,
  };
}

/**
 * Executes Phase 2 of Facebook Reels upload:
 * Binary transfer of MP4 bytes to Meta's secure upload URL via chunked/stream protocol.
 */
export async function uploadReelBinary(
  uploadUrl: string,
  pageAccessToken: string,
  videoBuffer: Buffer | Uint8Array,
  fileSizeBytes: number
): Promise<{ success: boolean }> {
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `OAuth ${pageAccessToken}`,
      offset: "0",
      file_size: String(fileSizeBytes),
      "Content-Type": "application/octet-stream",
    },
    body: new Uint8Array(videoBuffer) as unknown as BodyInit,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || (data && data.success === false)) {
    throw {
      code: response.status,
      message: data?.error?.message || `Binary video transfer to Meta failed (${response.statusText}).`,
    };
  }

  return { success: true };
}

/**
 * Executes Phase 3 of Facebook Reels upload:
 * POST /{page_id}/video_reels?upload_phase=finish&video_state=PUBLISHED
 */
export async function finishReelPublish(
  pageId: string,
  pageAccessToken: string,
  videoId: string,
  caption: string,
  scheduledPublishTimeUnix?: number | null,
  title?: string | null
): Promise<MetaReelFinishResponse> {
  const url = `${getGraphApiBaseUrl()}/${pageId}/video_reels`;

  const isScheduled = Boolean(
    scheduledPublishTimeUnix && scheduledPublishTimeUnix > Math.floor(Date.now() / 1000) + 600
  );

  const params = new URLSearchParams({
    upload_phase: "finish",
    access_token: pageAccessToken,
    video_id: videoId,
    video_state: isScheduled ? "SCHEDULED" : "PUBLISHED",
    description: caption,
  });

  if (title) {
    params.set("title", title);
  }

  if (isScheduled && scheduledPublishTimeUnix) {
    params.set("scheduled_publish_time", String(scheduledPublishTimeUnix));
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    const err = data.error;
    throw {
      code: err?.code || response.status,
      message: err?.message || "Failed to finalize Facebook Reel publishing.",
      type: err?.type,
    };
  }

  return {
    success: Boolean(data.success),
    post_id: data.post_id || `${pageId}_${videoId}`,
  };
}

/**
 * Checks video processing status on Meta servers (`GET /{video_id}?fields=status`).
 */
export async function checkReelStatus(
  videoId: string,
  pageAccessToken: string
): Promise<{
  id: string;
  status?: {
    video_status?: string;
    uploading_phase?: { status?: string };
    processing_phase?: { status?: string };
    publishing_phase?: { status?: string };
  };
}> {
  const url = `${getGraphApiBaseUrl()}/${videoId}?fields=status&access_token=${encodeURIComponent(pageAccessToken)}`;

  const response = await fetch(url, { method: "GET" });
  const data = await response.json();

  if (!response.ok || data.error) {
    throw {
      code: data.error?.code || response.status,
      message: data.error?.message || "Failed to check Reel status.",
    };
  }

  return data;
}

/**
 * Reconciles an in-doubt publication before retrying.
 * Queries Meta to verify if a Reel with the given video_id has already been published.
 */
export async function reconcileReelState(
  videoId: string,
  pageAccessToken: string
): Promise<{ exists: boolean; isPublished: boolean; postId?: string }> {
  try {
    const statusData = await checkReelStatus(videoId, pageAccessToken);
    const pubStatus = statusData.status?.publishing_phase?.status || statusData.status?.video_status;
    const isPublished = pubStatus === "complete" || pubStatus === "ready" || pubStatus === "published";
    return {
      exists: true,
      isPublished,
      postId: statusData.id,
    };
  } catch {
    return { exists: false, isPublished: false };
  }
}
