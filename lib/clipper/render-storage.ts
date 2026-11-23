import * as fs from "fs";
import * as path from "path";
import * as os from "os";

/**
 * Returns the base temporary directory for PagePulse video rendering.
 * Always resolves to a writable OS temporary path (e.g. /tmp on Linux/Vercel).
 * NEVER returns /var/task or project root.
 */
export function getRenderBaseDir(): string {
  const baseDir = path.join(os.tmpdir(), "pagepulse-renders");
  if (!fs.existsSync(baseDir)) {
    try {
      fs.mkdirSync(baseDir, { recursive: true });
    } catch (err: any) {
      console.warn("[RenderStorage] Could not create base render dir:", err.message);
    }
  }
  return baseDir;
}

/**
 * Creates an isolated, unique temporary directory for a specific render job.
 */
export function createJobTempDir(jobId: string): string {
  const safeId = jobId.replace(/[^a-zA-Z0-9_-]/g, "");
  const jobDir = path.join(getRenderBaseDir(), safeId);
  if (!fs.existsSync(jobDir)) {
    fs.mkdirSync(jobDir, { recursive: true });
  }
  return jobDir;
}

/**
 * Safely cleans up and deletes all temporary files in a job directory.
 */
export async function cleanupJobTempDir(jobIdOrPath: string): Promise<void> {
  try {
    let targetPath = jobIdOrPath;
    if (!path.isAbsolute(jobIdOrPath)) {
      targetPath = path.join(getRenderBaseDir(), jobIdOrPath.replace(/[^a-zA-Z0-9_-]/g, ""));
    }

    if (fs.existsSync(targetPath)) {
      fs.rmSync(targetPath, { recursive: true, force: true });
    }
  } catch (err: any) {
    console.warn(`[RenderStorage] Safe cleanup warning for ${jobIdOrPath}:`, err.message);
  }
}

/**
 * Cleans up abandoned render directories older than maxAgeMs (default: 1 hour).
 */
export async function cleanAbandonedTempDirs(maxAgeMs: number = 3600000): Promise<void> {
  try {
    const baseDir = getRenderBaseDir();
    if (!fs.existsSync(baseDir)) return;

    const entries = fs.readdirSync(baseDir, { withFileTypes: true });
    const now = Date.now();

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const dirPath = path.join(baseDir, entry.name);
        try {
          const stats = fs.statSync(dirPath);
          if (now - stats.mtimeMs > maxAgeMs) {
            fs.rmSync(dirPath, { recursive: true, force: true });
          }
        } catch {}
      }
    }
  } catch (err: any) {
    console.warn("[RenderStorage] Abandoned temp cleanup warning:", err.message);
  }
}

import { spawnSync } from "child_process";
import { getFFmpegPath, probeVideoFile, VideoProbeResult } from "./ffmpeg-engine";

/**
 * Downloads a remote video into a target temporary file with timeout, format validation,
 * and automatic YouTube stream resolution.
 */
export async function downloadSourceVideo(
  url: string,
  targetPath: string,
  timeoutMs: number = 60000
): Promise<string> {
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // 1. Check if the URL is a YouTube Video (OpusClip flow)
  const isYouTube = /(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i.test(
    url.trim()
  );

  if (isYouTube) {
    try {
      const { Ytdl } = require("@distube/ytdl-core");
      const ytdl = new Ytdl();
      const info = await ytdl.getInfo(url);

      if (!info || !info.formats || info.formats.length === 0) {
        throw new Error("No media stream formats returned from YouTube.");
      }

      // Pick best video format (prefer mp4 container, high resolution)
      const v =
        info.formats.find(
          (f: any) => f.hasVideo && f.url && (f.container === "mp4" || (f.mimeType && f.mimeType.includes("mp4")))
        ) || info.formats.find((f: any) => f.hasVideo && f.url);

      // Pick best audio format
      const a =
        info.formats.find(
          (f: any) =>
            f.hasAudio &&
            f.url &&
            (f.container === "mp4" || (f.mimeType && (f.mimeType.includes("mp4") || f.mimeType.includes("audio/mp4"))))
        ) || info.formats.find((f: any) => f.hasAudio && f.url);

      if (!v || !v.url) {
        throw new Error("Could not extract a valid video stream URL from YouTube.");
      }

      const ffmpeg = getFFmpegPath();
      const ffmpegArgs: string[] = ["-y", "-i", v.url];

      if (a && a.url) {
        ffmpegArgs.push("-i", a.url, "-c:v", "copy", "-c:a", "aac", "-shortest", targetPath);
      } else {
        ffmpegArgs.push("-c:v", "copy", targetPath);
      }

      const res = spawnSync(ffmpeg, ffmpegArgs, {
        timeout: timeoutMs,
        maxBuffer: 10 * 1024 * 1024,
      });

      if (res.status === 0 && fs.existsSync(targetPath) && fs.statSync(targetPath).size > 1000) {
        return targetPath;
      }

      const errText = res.stderr ? res.stderr.toString() : `Exit code ${res.status}`;
      throw new Error(`FFmpeg stream download failed: ${errText.slice(0, 200)}`);
    } catch (ytErr: any) {
      console.warn("[RenderStorage] YouTube stream ingestion error:", ytErr.message);
      throw new Error(
        `Unable to ingest YouTube video stream directly (${ytErr.message}). YouTube cloud stream protection may be active. Please upload the video file directly via the 'Upload Video' tab, or use a direct MP4 link.`
      );
    }
  }

  // 2. Direct HTTP / HTTPS Video Stream Download
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 PagePulseAI/2.8",
        Accept: "*/*",
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Source video download failed with status ${res.status}: ${res.statusText}`);
    }

    const contentType = (res.headers.get("content-type") || "").toLowerCase();
    if (
      contentType.includes("text/html") ||
      contentType.includes("application/json") ||
      contentType.includes("application/xml")
    ) {
      throw new Error(
        `Remote URL returned an HTML web page or document (${contentType}) instead of a playable video stream. Please ensure the link points directly to a video file (.mp4, .mov, .webm) or upload the file directly.`
      );
    }

    const arrayBuffer = await res.arrayBuffer();
    if (arrayBuffer.byteLength === 0) {
      throw new Error("Downloaded source video file is empty (0 bytes).");
    }

    if (arrayBuffer.byteLength < 500) {
      const textPreview = Buffer.from(arrayBuffer).toString("utf-8");
      if (textPreview.includes("<!DOCTYPE") || textPreview.includes("<html") || textPreview.includes("{\"error\"")) {
        throw new Error("The source URL returned an error page or HTML document instead of a valid video stream.");
      }
    }

    fs.writeFileSync(targetPath, Buffer.from(arrayBuffer));
    return targetPath;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Validates that a video file on disk is an authentic, playable video container.
 */
export function validateVideoFile(filePath: string): {
  valid: boolean;
  probe: VideoProbeResult;
  error?: string;
} {
  if (!filePath || !fs.existsSync(filePath)) {
    return {
      valid: false,
      probe: {
        duration: 0,
        width: 1920,
        height: 1080,
        resolution: "1920x1080",
        aspectRatio: "16:9",
        hasAudio: false,
      },
      error: "Source video file does not exist on disk.",
    };
  }

  const stat = fs.statSync(filePath);
  if (stat.size < 1000) {
    return {
      valid: false,
      probe: {
        duration: 0,
        width: 1920,
        height: 1080,
        resolution: "1920x1080",
        aspectRatio: "16:9",
        hasAudio: false,
      },
      error: `Source video file is too small (${stat.size} bytes) to be a valid video stream.`,
    };
  }

  // Probe with FFprobe
  const probe = probeVideoFile(filePath);
  if (probe.duration <= 0) {
    return {
      valid: false,
      probe,
      error:
        "Failed to read video stream telemetry from source file. File may be corrupted, an invalid container, or a web page.",
    };
  }

  return {
    valid: true,
    probe,
  };
}

/**
 * Scrubs raw server filesystem paths from error messages so customers never see internal server details.
 */
export function sanitizeErrorMessage(rawMessage: string): string {
  if (!rawMessage) return "An unexpected error occurred during video rendering.";
  return rawMessage
    .replace(/\/var\/task[^\s:]*/gi, "[server-task]")
    .replace(/[a-zA-Z]:\\[^\s:]*/gi, "[server-path]")
    .replace(/\/tmp\/[^\s:]*/gi, "[temp-storage]")
    .replace(/ENOENT: no such file or directory/gi, "Temporary file system resource unavailable")
    .replace(/spawn\s+[^\s]+\s+ENOENT/gi, "Rendering binary could not be started");
}
