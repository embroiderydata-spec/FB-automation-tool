import { spawn, spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import {
  AspectRatio,
  CropPosition,
  ReframingMode,
  Resolution,
  SubtitleStyle,
} from "./types";

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
  reframingMode?: ReframingMode;
  cropPosition?: CropPosition;
  resolution?: Resolution;
  subtitleText?: string;
  subtitleStyle?: SubtitleStyle;
  subtitlePosition?: "top" | "center" | "bottom";
  hookText?: string;
  watermarkText?: string;
  watermarkPosition?: "top_left" | "top_right" | "bottom_left" | "bottom_right";
  watermarkOpacity?: number;
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

  // Build Video Filter Chain
  const reframing = options.reframingMode || "auto_center";
  const cropPos = options.cropPosition || (reframing === "top_crop" ? "top" : reframing === "bottom_crop" ? "bottom" : "center");

  let cropY = `(in_h-${targetHeight})/2`;
  if (cropPos === "top") {
    cropY = "0";
  } else if (cropPos === "bottom") {
    cropY = `in_h-${targetHeight}`;
  }

  let filterChain = "";

  if (reframing === "blurred_backdrop" && options.aspectRatio === "9:16") {
    // OpusClip signature blurred background with sharp centered video
    filterChain = `split[main][bg];[bg]scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=increase,crop=${targetWidth}:${targetHeight},boxblur=25:5[bgblur];[main]scale=${targetWidth}:-2:force_original_aspect_ratio=decrease[fg];[bgblur][fg]overlay=(W-w)/2:(H-h)/2`;
  } else if (reframing === "split_screen" && options.aspectRatio === "9:16") {
    const halfH = Math.floor(targetHeight / 2);
    filterChain = `split[top][bot];[top]scale=${targetWidth}:${halfH}:force_original_aspect_ratio=increase,crop=${targetWidth}:${halfH}[t];[bot]scale=${targetWidth}:${halfH}:force_original_aspect_ratio=increase,crop=${targetWidth}:${halfH},boxblur=15:3[b];[t][b]vstack`;
  } else {
    // Smart center or directional crop
    filterChain = `scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=increase,crop=${targetWidth}:${targetHeight}:(in_w-${targetWidth})/2:${cropY}`;
  }

  // Optional Hook Headline Overlay (Top)
  if (options.hookText && options.hookText.trim().length > 0) {
    const cleanHook = options.hookText.trim().replace(/['"\\]/g, "");
    const hookFontSize = Math.round(targetWidth * 0.052);
    filterChain += `,drawtext=text='${cleanHook}':fontcolor=yellow:fontsize=${hookFontSize}:box=1:boxcolor=black@0.7:boxborderw=10:x=(w-text_w)/2:y=(h*0.12)`;
  }

  // Optional Watermark / Logo Text
  if (options.watermarkText && options.watermarkText.trim().length > 0) {
    const cleanWatermark = options.watermarkText.trim().replace(/['"\\]/g, "");
    const wmSize = Math.round(targetWidth * 0.028);
    const wmOpacity = options.watermarkOpacity ?? 0.7;
    const wmPos = options.watermarkPosition || "top_right";

    let wmX = `w-text_w-24`;
    let wmY = `32`;
    if (wmPos === "top_left") {
      wmX = `24`;
      wmY = `32`;
    } else if (wmPos === "bottom_left") {
      wmX = `24`;
      wmY = `h-text_h-36`;
    } else if (wmPos === "bottom_right") {
      wmX = `w-text_w-24`;
      wmY = `h-text_h-36`;
    }

    filterChain += `,drawtext=text='${cleanWatermark}':fontcolor=white@${wmOpacity}:fontsize=${wmSize}:x=${wmX}:y=${wmY}`;
  }

  // Optional Subtitle / Caption Overlay with OpusClip Style Presets
  if (options.subtitleText && options.subtitleText.trim().length > 0 && options.subtitleStyle !== "none") {
    const cleanText = options.subtitleText.trim().replace(/['"\\]/g, "");
    const subPos = options.subtitlePosition || "bottom";
    let textY = "(h*0.82)";
    if (subPos === "center") textY = "(h*0.5)-(text_h/2)";
    else if (subPos === "top") textY = "(h*0.22)";

    const fontSize = Math.round(targetWidth * 0.050);
    const style = options.subtitleStyle || "hormozi";

    if (style === "hormozi") {
      // Alex Hormozi signature: Bold yellow/green uppercase with heavy black stroke
      const upperText = cleanText.toUpperCase();
      filterChain += `,drawtext=text='${upperText}':fontcolor=yellow:fontsize=${Math.round(fontSize * 1.1)}:borderw=5:bordercolor=black:box=1:boxcolor=black@0.75:boxborderw=10:x=(w-text_w)/2:y=${textY}`;
    } else if (style === "viral_bold") {
      filterChain += `,drawtext=text='${cleanText}':fontcolor=yellow:fontsize=${fontSize}:borderw=4:bordercolor=black:box=1:boxcolor=black@0.7:boxborderw=8:x=(w-text_w)/2:y=${textY}`;
    } else if (style === "clean_minimal") {
      filterChain += `,drawtext=text='${cleanText}':fontcolor=white:fontsize=${fontSize}:box=1:boxcolor=black@0.75:boxborderw=10:x=(w-text_w)/2:y=${textY}`;
    } else if (style === "modern_podcast") {
      filterChain += `,drawtext=text='${cleanText}':fontcolor=white:fontsize=${Math.round(fontSize * 0.95)}:shadowcolor=black@0.8:shadowx=2:shadowy=2:box=1:boxcolor=black@0.5:boxborderw=6:x=(w-text_w)/2:y=${textY}`;
    } else if (style === "karaoke") {
      filterChain += `,drawtext=text='${cleanText}':fontcolor=cyan:fontsize=${fontSize}:borderw=4:bordercolor=black:box=1:boxcolor=black@0.6:boxborderw=8:x=(w-text_w)/2:y=${textY}`;
    } else if (style === "highlight_words") {
      filterChain += `,drawtext=text='${cleanText}':fontcolor=0x00FF88:fontsize=${fontSize}:borderw=4:bordercolor=black:box=1:boxcolor=black@0.7:boxborderw=8:x=(w-text_w)/2:y=${textY}`;
    } else if (style === "professional") {
      filterChain += `,drawtext=text='${cleanText}':fontcolor=white:fontsize=${fontSize}:shadowcolor=black@0.6:shadowx=3:shadowy=3:x=(w-text_w)/2:y=${textY}`;
    } else {
      filterChain += `,drawtext=text='${cleanText}':fontcolor=yellow:fontsize=${fontSize}:box=1:boxcolor=black@0.65:boxborderw=10:x=(w-text_w)/2:y=${textY}`;
    }
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

      // If drawtext failed due to font issues, retry with base scaling & reframing
      if (stderr.includes("drawtext") || stderr.includes("Fontconfig") || stderr.includes("filter")) {
        const fallbackFilter =
          reframing === "blurred_backdrop" && options.aspectRatio === "9:16"
            ? `split[main][bg];[bg]scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=increase,crop=${targetWidth}:${targetHeight},boxblur=25:5[bgblur];[main]scale=${targetWidth}:-2:force_original_aspect_ratio=decrease[fg];[bgblur][fg]overlay=(W-w)/2:(H-h)/2`
            : `scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=increase,crop=${targetWidth}:${targetHeight}:(in_w-${targetWidth})/2:${cropY}`;

        const fallbackArgs = [
          "-y",
          "-ss",
          options.startTime.toString(),
          "-i",
          options.inputPath,
          "-t",
          options.duration.toString(),
          "-vf",
          fallbackFilter,
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
