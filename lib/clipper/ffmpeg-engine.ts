import { spawn, spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import {
  AspectRatio,
  CropPosition,
  ReframingMode,
  Resolution,
  SubtitleStyle,
} from "./types";

// Resolves path to bundled ffmpeg binary with Linux /tmp execution support for serverless
export function getFFmpegPath(): string {
  // 1. Environment variable override
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH;
  }

  // 2. On Linux (Vercel serverless / container)
  if (process.platform === "linux") {
    const tmpBinary = path.join(os.tmpdir(), "ffmpeg");
    if (fs.existsSync(tmpBinary)) {
      try {
        fs.chmodSync(tmpBinary, 0o755);
        return tmpBinary;
      } catch {}
    }

    try {
      const ffmpegStatic = require("ffmpeg-static");
      if (ffmpegStatic && typeof ffmpegStatic === "string" && fs.existsSync(ffmpegStatic)) {
        try {
          fs.copyFileSync(ffmpegStatic, tmpBinary);
          fs.chmodSync(tmpBinary, 0o755);
          return tmpBinary;
        } catch {
          return ffmpegStatic;
        }
      }
    } catch {}

    return "ffmpeg";
  }

  // 3. On Windows / macOS
  try {
    const ffmpegStatic = require("ffmpeg-static");
    if (ffmpegStatic && typeof ffmpegStatic === "string" && fs.existsSync(ffmpegStatic)) {
      return ffmpegStatic;
    }
  } catch {}

  return "ffmpeg";
}

export function verifyFFmpegAvailable(): {
  available: boolean;
  path: string;
  version?: string;
  error?: string;
} {
  const binaryPath = getFFmpegPath();
  try {
    const res = spawnSync(binaryPath, ["-version"], {
      encoding: "utf-8",
      maxBuffer: 1024 * 1024,
      timeout: 5000,
    });
    if (res.status === 0) {
      const firstLine = (res.stdout || "").split("\n")[0] || "ffmpeg available";
      return { available: true, path: binaryPath, version: firstLine };
    }
    return { available: false, path: binaryPath, error: res.stderr || `Exit code ${res.status}` };
  } catch (err: any) {
    return { available: false, path: binaryPath, error: err.message };
  }
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

  if (reframing === "blurred_backdrop" && (options.aspectRatio === "9:16" || options.aspectRatio === "1:1")) {
    // OpusClip signature blurred background with sharp centered video
    filterChain = `split[main][bg];[bg]scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=increase,crop=${targetWidth}:${targetHeight},boxblur=25:5[bgblur];[main]scale=${targetWidth}:-2:force_original_aspect_ratio=decrease[fg];[bgblur][fg]overlay=(W-w)/2:(H-h)/2`;
  } else if (reframing === "split_screen" && options.aspectRatio === "9:16") {
    const halfH = Math.floor(targetHeight / 2);
    filterChain = `split[top][bot];[top]scale=${targetWidth}:${halfH}:force_original_aspect_ratio=increase,crop=${targetWidth}:${halfH}[t];[bot]scale=${targetWidth}:${halfH}:force_original_aspect_ratio=increase,crop=${targetWidth}:${halfH},boxblur=15:3[b];[t][b]vstack`;
  } else if (reframing === "fit_contain") {
    // Original video fit with letterbox / pillarbox black bars
    filterChain = `scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease,pad=${targetWidth}:${targetHeight}:(ow-iw)/2:(oh-ih)/2:black`;
  } else if (options.aspectRatio === "16:9") {
    // Landscape standard crop or scale
    filterChain = `scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=increase,crop=${targetWidth}:${targetHeight}:(in_w-${targetWidth})/2:(in_h-${targetHeight})/2`;
  } else {
    // Smart center or directional crop (center / top / bottom)
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

/**
 * Extracts a lightweight, mono 16kHz audio track from a video file for speech-to-text transcription.
 */
export async function extractAudioFromVideo(
  inputPath: string,
  outputPath: string
): Promise<string> {
  const ffmpeg = getFFmpegPath();

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input source video file not found at: ${inputPath}`);
  }

  const outDir = path.dirname(outputPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  return new Promise((resolve, reject) => {
    // 16kHz mono MP3 is ideal for Whisper and fast transfer
    const args = [
      "-y",
      "-i",
      inputPath,
      "-vn",
      "-acodec",
      "libmp3lame",
      "-ar",
      "16000",
      "-ac",
      "1",
      "-b:a",
      "64k",
      outputPath,
    ];

    const proc = spawn(ffmpeg, args);
    let stderr = "";

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      if (code === 0 && fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
        return resolve(outputPath);
      }

      // Fallback to PCM 16-bit WAV if mp3 encoder is unavailable
      const wavPath = outputPath.replace(/\.[^/.]+$/, "") + ".wav";
      const wavArgs = [
        "-y",
        "-i",
        inputPath,
        "-vn",
        "-acodec",
        "pcm_s16le",
        "-ar",
        "16000",
        "-ac",
        "1",
        wavPath,
      ];

      const wavProc = spawn(ffmpeg, wavArgs);
      wavProc.on("close", (wavCode) => {
        if (wavCode === 0 && fs.existsSync(wavPath) && fs.statSync(wavPath).size > 0) {
          return resolve(wavPath);
        }
        reject(
          new Error(
            `Failed to extract audio track from video (code ${code}): ${stderr.slice(-300)}`
          )
        );
      });
      wavProc.on("error", (wavErr) => {
        reject(new Error(`Audio extraction error: ${wavErr.message}`));
      });
    });

    proc.on("error", (err) => {
      reject(new Error(`Failed to spawn FFmpeg for audio extraction: ${err.message}`));
    });
  });
}

/**
 * Detects visual scene changes and camera cuts throughout the video using FFmpeg.
 */
export async function detectVideoSceneCuts(
  inputPath: string,
  threshold = 0.35,
  maxScenes = 60
): Promise<Array<{ timestamp: number; score: number }>> {
  const ffmpeg = getFFmpegPath();

  if (!fs.existsSync(inputPath)) {
    return [];
  }

  return new Promise((resolve) => {
    // Uses FFmpeg scene filter: gt(scene, 0.35)
    const args = [
      "-i",
      inputPath,
      "-vf",
      `select='gt(scene,${threshold})',metadata=print:file=-`,
      "-f",
      "null",
      "-",
    ];

    const proc = spawn(ffmpeg, args);
    let output = "";

    proc.stdout.on("data", (d) => {
      output += d.toString();
    });
    proc.stderr.on("data", (d) => {
      output += d.toString();
    });

    proc.on("close", () => {
      const sceneResults: Array<{ timestamp: number; score: number }> = [];
      const lines = output.split("\n");
      let currentPts = -1;

      for (const line of lines) {
        const ptsMatch = line.match(/pts_time:([0-9.]+)/);
        if (ptsMatch && ptsMatch[1]) {
          currentPts = parseFloat(ptsMatch[1]);
        }

        const scoreMatch = line.match(/lavfi\.scene_score=([0-9.]+)/);
        if (scoreMatch && scoreMatch[1] && currentPts >= 0) {
          const score = parseFloat(scoreMatch[1]);
          if (
            !sceneResults.some((s) => Math.abs(s.timestamp - currentPts) < 1.0)
          ) {
            sceneResults.push({
              timestamp: Number(currentPts.toFixed(2)),
              score: Number(score.toFixed(3)),
            });
          }
          currentPts = -1;
          if (sceneResults.length >= maxScenes) break;
        }
      }

      // If scene filter found fewer than 2 cuts, generate smooth visual anchor intervals
      if (sceneResults.length === 0) {
        try {
          const probed = probeVideoFile(inputPath);
          const dur = Math.max(1, probed.duration || 60);
          const step = Math.max(1.0, Number((dur / 4).toFixed(1)));
          for (let t = step; t < dur; t += step) {
            sceneResults.push({
              timestamp: Number(t.toFixed(1)),
              score: 0.5,
            });
          }
          if (sceneResults.length === 0) {
            sceneResults.push({
              timestamp: Number((dur * 0.5).toFixed(1)),
              score: 0.5,
            });
          }
        } catch {}
      }

      sceneResults.sort((a, b) => a.timestamp - b.timestamp);
      resolve(sceneResults.slice(0, maxScenes));
    });

    proc.on("error", () => {
      resolve([]);
    });
  });
}

