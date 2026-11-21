import { spawn, spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { AspectRatio, CropPosition, Resolution } from "./types";

// Resolves path to bundled ffmpeg binary
export function getFFmpegPath(): string {
  try {
    const ffmpegStatic = require("ffmpeg-static");
    if (ffmpegStatic && typeof ffmpegStatic === "string" && fs.existsSync(ffmpegStatic)) {
      return ffmpegStatic;
    }
  } catch {}
  return "ffmpeg";
}

export interface VideoProbeResult {
  duration: number;
  width: number;
  height: number;
  resolution: string;
}

export function probeVideoFile(filePath: string): VideoProbeResult {
  const ffmpeg = getFFmpegPath();
  try {
    const res = spawnSync(ffmpeg, ["-i", filePath], {
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024,
    });
    const output = (res.stderr || "") + (res.stdout || "");

    // Parse Duration: 00:01:23.45
    const durMatch = output.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
    let duration = 0;
    if (durMatch) {
      duration =
        parseInt(durMatch[1], 10) * 3600 +
        parseInt(durMatch[2], 10) * 60 +
        parseFloat(durMatch[3]);
    }

    // Parse Stream ... Video: ... 1920x1080
    const resMatch = output.match(/Stream.*Video:.*,\s*(\d{2,5})x(\d{2,5})/);
    let width = 1920;
    let height = 1080;
    if (resMatch) {
      width = parseInt(resMatch[1], 10);
      height = parseInt(resMatch[2], 10);
    }

    return {
      duration: Number(duration.toFixed(2)),
      width,
      height,
      resolution: `${width}x${height}`,
    };
  } catch {
    return {
      duration: 0,
      width: 1920,
      height: 1080,
      resolution: "1920x1080",
    };
  }
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 MB";
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

export interface RenderClipOptions {
  inputPath: string;
  outputPath: string;
  startTime: number;
  duration: number;
  aspectRatio: AspectRatio;
  cropPosition?: CropPosition;
  resolution?: Resolution;
  subtitleText?: string;
  subtitlePosition?: "top" | "center" | "bottom";
}

export async function renderVideoClip(
  options: RenderClipOptions
): Promise<{ outputPath: string; duration: number; sizeBytes: number }> {
  const ffmpeg = getFFmpegPath();

  if (!fs.existsSync(options.inputPath)) {
    throw new Error(`Input source video file not found at: ${options.inputPath}`);
  }

  // Ensure output directory exists
  const outDir = path.dirname(options.outputPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // Target Dimensions
  let targetWidth = 1080;
  let targetHeight = 1920;
  if (options.aspectRatio === "16:9") {
    targetWidth = 1920;
    targetHeight = 1080;
  } else if (options.aspectRatio === "1:1") {
    targetWidth = 1080;
    targetHeight = 1080;
  }

  if (options.resolution === "720p") {
    targetWidth = Math.round(targetWidth * 0.667);
    targetHeight = Math.round(targetHeight * 0.667);
  }

  // Ensure even dimensions for H.264
  targetWidth = targetWidth % 2 === 0 ? targetWidth : targetWidth - 1;
  targetHeight = targetHeight % 2 === 0 ? targetHeight : targetHeight - 1;

  // Build Filter: Scale and Crop
  const cropPos = options.cropPosition || "center";
  let cropY = `(in_h-${targetHeight})/2`;
  if (cropPos === "top") {
    cropY = "0";
  } else if (cropPos === "bottom") {
    cropY = `in_h-${targetHeight}`;
  }

  let filterChain = `scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=increase,crop=${targetWidth}:${targetHeight}:(in_w-${targetWidth})/2:${cropY}`;

  // Optional Hook Text Overlay
  if (options.subtitleText && options.subtitleText.trim().length > 0) {
    const cleanText = options.subtitleText.trim().replace(/['"\\]/g, "");
    const subPos = options.subtitlePosition || "top";
    let textY = "(h*0.15)";
    if (subPos === "center") textY = "(h*0.5)-(text_h/2)";
    else if (subPos === "bottom") textY = "(h*0.82)";

    const fontSize = Math.round(targetWidth * 0.05);
    filterChain += `,drawtext=text='${cleanText}':fontcolor=yellow:fontsize=${fontSize}:box=1:boxcolor=black@0.65:boxborderw=10:x=(w-text_w)/2:y=${textY}`;
  }

  const args: string[] = [
    "-y",
    "-ss",
    options.startTime.toString(),
    "-i",
    options.inputPath,
    "-t",
    options.duration.toString(),
    "-vf",
    filterChain,
    "-c:v",
    "libx264",
    "-preset",
    "fast",
    "-crf",
    "22",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-movflags",
    "+faststart",
    options.outputPath,
  ];

  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpeg, args);
    let stderr = "";

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      if (code === 0 && fs.existsSync(options.outputPath)) {
        const stats = fs.statSync(options.outputPath);
        if (stats.size > 0) {
          return resolve({
            outputPath: options.outputPath,
            duration: options.duration,
            sizeBytes: stats.size,
          });
        }
      }

      // If drawtext failed due to font issues, retry once with base scaling and cropping
      if (stderr.includes("drawtext") || stderr.includes("Fontconfig")) {
        const fallbackArgs = [
          "-y",
          "-ss",
          options.startTime.toString(),
          "-i",
          options.inputPath,
          "-t",
          options.duration.toString(),
          "-vf",
          `scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=increase,crop=${targetWidth}:${targetHeight}:(in_w-${targetWidth})/2:${cropY}`,
          "-c:v",
          "libx264",
          "-preset",
          "fast",
          "-crf",
          "22",
          "-pix_fmt",
          "yuv420p",
          "-c:a",
          "aac",
          "-b:a",
          "192k",
          "-movflags",
          "+faststart",
          options.outputPath,
        ];
        const retryProc = spawn(ffmpeg, fallbackArgs);
        retryProc.on("close", (retryCode) => {
          if (retryCode === 0 && fs.existsSync(options.outputPath)) {
            const stats = fs.statSync(options.outputPath);
            return resolve({
              outputPath: options.outputPath,
              duration: options.duration,
              sizeBytes: stats.size,
            });
          }
          reject(new Error(`FFmpeg clipping failed with code ${retryCode}: ${stderr.slice(-500)}`));
        });
      } else {
        reject(new Error(`FFmpeg clipping failed with code ${code}: ${stderr.slice(-500)}`));
      }
    });

    proc.on("error", (err) => {
      reject(new Error(`Failed to start FFmpeg process: ${err.message}`));
    });
  });
}
