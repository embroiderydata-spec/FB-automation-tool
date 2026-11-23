/**
 * Standalone Video Clipper Persistent Render Worker
 *
 * Runs indefinitely as a background worker process outside Vercel's serverless limits.
 * Polls queued video render jobs, downloads source video, extracts FFprobe telemetry,
 * executes FFmpeg reframing/cropping/subtitles, uploads final MP4 to Supabase Storage,
 * and updates job progress in real time.
 *
 * Usage:
 *   npx tsx scripts/render-worker.ts
 */

import os from "os";
import { createClient } from "@supabase/supabase-js";
import { DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY } from "../lib/supabase/client";
import { executeRenderJob } from "../lib/clipper/render-manager";
import { ClipRenderJob } from "../lib/clipper/types";
import { runFFmpegDiagnostics } from "../lib/clipper/ffmpeg-engine";

const POLL_INTERVAL_MS = parseInt(process.env.WORKER_POLL_INTERVAL_MS || "3000", 10);
const WORKER_ID = `render_worker_${os.hostname()}_${process.pid}_${Date.now().toString(36)}`;

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    DEFAULT_SUPABASE_ANON_KEY;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function startRenderWorker() {
  console.log("=================================================");
  console.log(`[PagePulse Render Worker] Starting worker: ${WORKER_ID}`);
  console.log(`[PagePulse Render Worker] Host: ${os.hostname()} (PID: ${process.pid})`);
  console.log("=================================================");

  // 1. Run diagnostics
  const diag = runFFmpegDiagnostics();
  console.log("[Diagnostics] FFmpeg available:", diag.ffmpeg.available, `(${diag.ffmpeg.version || "n/a"})`);
  console.log("[Diagnostics] FFprobe available:", diag.ffprobe.available, `(${diag.ffprobe.version || "n/a"})`);
  console.log("[Diagnostics] Temp directory writable:", diag.tempDir.writable, `(${diag.tempDir.path})`);

  if (!diag.ready) {
    console.error("[Diagnostics WARNING] One or more diagnostic checks failed. Check binaries and permissions.");
  } else {
    console.log("[Diagnostics] Engine environment verified 100% operational.");
  }

  const supabase = getSupabase();
  let isRunning = true;

  process.on("SIGINT", () => {
    console.log("\n[Render Worker] Received SIGINT. Gracefully shutting down...");
    isRunning = false;
  });

  process.on("SIGTERM", () => {
    console.log("\n[Render Worker] Received SIGTERM. Gracefully shutting down...");
    isRunning = false;
  });

  console.log(`[Render Worker] Polling for queued render jobs every ${POLL_INTERVAL_MS / 1000}s...\n`);

  while (isRunning) {
    try {
      // Fetch oldest queued job
      const { data: jobs, error } = await supabase
        .from("clip_render_jobs")
        .select("*")
        .eq("status", "queued")
        .order("created_at", { ascending: true })
        .limit(1);

      if (error) {
        // Table may not exist or network glitch
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        continue;
      }

      if (jobs && jobs.length > 0) {
        const job = jobs[0] as ClipRenderJob;
        console.log(`\n-------------------------------------------------`);
        console.log(`[Render Worker] Claimed Job ${job.id}`);
        console.log(`  Title: "${job.clip_title}"`);
        console.log(`  Source: ${job.source_video_url}`);
        console.log(`  Aspect Ratio: ${job.aspect_ratio || "9:16"} | Reframing: ${job.reframing_mode || "blurred_backdrop"}`);
        console.log(`  Interval: ${job.start_time}s - ${job.end_time}s (${job.duration}s)`);
        console.log(`-------------------------------------------------`);

        const startTime = Date.now();
        const result = await executeRenderJob(job);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

        if (result.success) {
          console.log(`✅ [Render Worker] Job ${job.id} SUCCEEDED in ${elapsed}s!`);
          console.log(`   Exported URL: ${result.job.exported_url}`);
        } else {
          console.error(`❌ [Render Worker] Job ${job.id} FAILED after ${elapsed}s: ${result.error}`);
        }
      }
    } catch (pollErr: any) {
      console.error("[Render Worker] Polling error:", pollErr.message);
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  console.log("[Render Worker] Stopped.");
}

startRenderWorker().catch((err) => {
  console.error("[Render Worker] Fatal error:", err);
  process.exit(1);
});
