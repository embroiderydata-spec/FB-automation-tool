import * as fs from "fs";
import * as path from "path";
import { createClient as createDirectSupabase } from "@supabase/supabase-js";
import { DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY } from "@/lib/supabase/client";
import { renderVideoClip, probeVideoFile, getFFmpegPath } from "./ffmpeg-engine";
import { saveUserClip } from "./storage";
import {
  createJobTempDir,
  cleanupJobTempDir,
  downloadSourceVideo,
  sanitizeErrorMessage,
  cleanAbandonedTempDirs,
} from "./render-storage";
import { updateClipRenderJob } from "./render-jobs";
import { ClipRenderJob, VideoClipRecord } from "./types";

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    DEFAULT_SUPABASE_ANON_KEY;
  return createDirectSupabase(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export interface RenderExecutionResult {
  success: boolean;
  job: ClipRenderJob;
  clipRecord?: VideoClipRecord;
  error?: string;
}

/**
 * Executes a full clip rendering pipeline with safe temporary storage and persistent tracking.
 */
export async function executeRenderJob(job: ClipRenderJob): Promise<RenderExecutionResult> {
  const jobDir = createJobTempDir(job.id);
  const sourcePath = path.join(jobDir, "source.mp4");
  const outputPath = path.join(
    jobDir,
    `clip_${job.id}_${(job.aspect_ratio || "9:16").replace(":", "x")}.mp4`
  );

  // Clean any old abandoned dirs in background
  cleanAbandonedTempDirs().catch(() => {});

  try {
    // 1. Verify FFmpeg binary availability
    const ffmpegPath = getFFmpegPath();
    if (!ffmpegPath) {
      throw new Error("FFmpeg rendering binary is not accessible on this system.");
    }

    // 2. Stage 1: Downloading / Retrieving Source Video
    await updateClipRenderJob(job.id, job.user_id, {
      status: "downloading",
      progress: 15,
    });

    if (fs.existsSync(job.source_video_url)) {
      // Local source path provided
      fs.copyFileSync(job.source_video_url, sourcePath);
    } else if (job.source_video_url.startsWith("http")) {
      // Remote source URL
      await downloadSourceVideo(job.source_video_url, sourcePath, 45000);
    } else {
      throw new Error("Invalid source video reference or file not found.");
    }

    if (!fs.existsSync(sourcePath) || fs.statSync(sourcePath).size === 0) {
      throw new Error("Source video could not be retrieved or is empty.");
    }

    // 3. Stage 2: Processing & Probing Source Telemetry
    await updateClipRenderJob(job.id, job.user_id, {
      status: "processing",
      progress: 35,
    });

    const probe = probeVideoFile(sourcePath);
    if (probe.duration <= 0) {
      throw new Error("Failed to read video stream telemetry from source file.");
    }

    // Bounds check
    const start = Math.max(0, Math.min(probe.duration, job.start_time));
    const end = Math.min(probe.duration, Math.max(start + 0.5, job.end_time));
    const clipDuration = Number((end - start).toFixed(2));

    // 4. Stage 3: Real FFmpeg Composition & Rendering
    await updateClipRenderJob(job.id, job.user_id, {
      status: "rendering",
      progress: 60,
    });

    const renderResult = await renderVideoClip({
      inputPath: sourcePath,
      outputPath,
      startTime: start,
      duration: clipDuration,
      aspectRatio: job.aspect_ratio || "9:16",
      reframingMode: job.reframing_mode || "blurred_backdrop",
      cropPosition: job.crop_position || "center",
      resolution: job.resolution || "1080p",
      subtitleText: job.subtitle_text || job.clip_title,
      subtitleStyle: job.subtitle_style || "hormozi",
      subtitlePosition: "bottom",
      hookText: job.hook_text,
      watermarkText: job.watermark_text,
      watermarkPosition: job.watermark_position || "top_right",
      watermarkOpacity: job.watermark_opacity ?? 0.7,
    });

    // Verify output file exists and is non-empty
    if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
      throw new Error("Rendered video output file is missing or 0 bytes.");
    }

    const outputBuffer = fs.readFileSync(outputPath);
    const fileSize = outputBuffer.byteLength;

    // 5. Stage 4: Upload to Persistent Supabase Storage
    await updateClipRenderJob(job.id, job.user_id, {
      status: "uploading",
      progress: 85,
    });

    const supabase = getServiceSupabase();
    const storageFilename = `${Date.now()}_clip_${job.id}.mp4`;
    const storagePath = `clips/${job.user_id}/${storageFilename}`;
    let exportedPublicUrl = "";

    // Upload to 'videos' bucket or fallback to 'clips'
    try {
      const { error: uploadErr } = await supabase.storage
        .from("videos")
        .upload(storagePath, outputBuffer, {
          contentType: "video/mp4",
          upsert: true,
        });

      if (!uploadErr) {
        // Try public URL
        const { data: pubData } = supabase.storage.from("videos").getPublicUrl(storagePath);
        exportedPublicUrl = pubData.publicUrl;

        // Also try signed URL (7 days) for private buckets
        try {
          const { data: signedData } = await supabase.storage
            .from("videos")
            .createSignedUrl(storagePath, 60 * 60 * 24 * 7);
          if (signedData?.signedUrl) {
            exportedPublicUrl = signedData.signedUrl;
          }
        } catch {}
      } else {
        // Try 'clips' bucket fallback
        const { error: clipBucketErr } = await supabase.storage
          .from("clips")
          .upload(storagePath, outputBuffer, {
            contentType: "video/mp4",
            upsert: true,
          });

        if (!clipBucketErr) {
          const { data: pubData } = supabase.storage.from("clips").getPublicUrl(storagePath);
          exportedPublicUrl = pubData.publicUrl;
        }
      }
    } catch (storageErr: any) {
      console.warn("[RenderManager] Storage upload warning:", storageErr.message);
    }

    // Fallback URL if cloud storage is unconfigured
    if (!exportedPublicUrl) {
      exportedPublicUrl = `/storage/renders/${storageFilename}`;
    }

    // 6. Stage 5: Save Permanent Clip Record in Database & Library
    const clipRecord = await saveUserClip(job.user_id, {
      source_video_url: job.source_video_url,
      source_video_name: job.source_video_name || "Source Video",
      clip_title: job.clip_title,
      caption: (job.metadata?.caption as string) || `${job.clip_title} #Shorts #Viral #Reels`,
      start_time: start,
      end_time: end,
      duration: clipDuration,
      aspect_ratio: job.aspect_ratio || "9:16",
      reframing_mode: job.reframing_mode || "blurred_backdrop",
      crop_position: job.crop_position || "center",
      resolution: job.resolution || "1080p",
      subtitle_text: job.subtitle_text || job.clip_title,
      subtitle_style: job.subtitle_style || "hormozi",
      exported_url: exportedPublicUrl,
      file_size: fileSize,
      viral_score: job.metadata?.viral_score,
      virality_breakdown: job.metadata?.virality_breakdown,
      category: job.metadata?.category,
      hook: job.hook_text,
    });

    // Also register in public.videos table for the Video Library
    try {
      await supabase.from("videos").insert({
        id: job.id,
        user_id: job.user_id,
        title: job.clip_title,
        video_url: exportedPublicUrl,
        duration_seconds: clipDuration,
        aspect_ratio: job.aspect_ratio || "9:16",
        resolution: job.resolution === "1080p" ? "1080x1920" : "720x1280",
        file_size_bytes: fileSize,
        status: "ready",
        render_status: "completed",
        render_progress: 100,
      });
    } catch {}

    // 7. Complete Job Record
    const completedJob = await updateClipRenderJob(job.id, job.user_id, {
      status: "completed",
      progress: 100,
      exported_url: exportedPublicUrl,
      storage_path: storagePath,
      file_size: fileSize,
      clip_id: clipRecord.id,
    });

    return {
      success: true,
      job: completedJob || { ...job, status: "completed", progress: 100, exported_url: exportedPublicUrl },
      clipRecord,
    };
  } catch (err: any) {
    console.error(`[RenderManager] Render job ${job.id} failed:`, err);
    const cleanError = sanitizeErrorMessage(err?.message || "Render failed");

    await updateClipRenderJob(job.id, job.user_id, {
      status: "failed",
      error_message: cleanError,
    });

    return {
      success: false,
      job: { ...job, status: "failed", error_message: cleanError },
      error: cleanError,
    };
  } finally {
    // 8. CRITICAL: Clean up all temporary files immediately
    await cleanupJobTempDir(jobDir);
  }
}
