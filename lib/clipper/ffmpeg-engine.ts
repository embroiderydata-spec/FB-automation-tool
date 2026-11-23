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

// Resolves path to bundled ffprobe binary with Linux /tmp execution support for serverless
export function getFFprobePath(): string {
  // 1. Environment variable override
  if (process.env.FFPROBE_PATH && fs.existsSync(process.env.FFPROBE_PATH)) {
    return process.env.FFPROBE_PATH;
  }

  // 2. On Linux (Vercel serverless / container)
  if (process.platform === "linux") {
    const tmpBinary = path.join(os.tmpdir(), "ffprobe");
    if (fs.existsSync(tmpBinary)) {
      try {
        fs.chmodSync(tmpBinary, 0o755);
        return tmpBinary;
      } catch {}
    }

    try {
      const ffprobeStatic = require("ffprobe-static");
      const staticPath = ffprobeStatic?.path || ffprobeStatic;
      if (staticPath && typeof staticPath === "string" && fs.existsSync(staticPath)) {
        try {
          fs.copyFileSync(staticPath, tmpBinary);
          fs.chmodSync(tmpBinary, 0o755);
          return tmpBinary;
        } catch {
          return staticPath;
        }
      }
    } catch {}

    return "ffprobe";
  }

  // 3. On Windows / macOS
  try {
    const ffprobeStatic = require("ffprobe-static");
    const staticPath = ffprobeStatic?.path || ffprobeStatic;
    if (staticPath && typeof staticPath === "string" && fs.existsSync(staticPath)) {
      return staticPath;
    }
  } catch {}

  return "ffprobe";
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

export function verifyFFprobeAvailable(): {
  available: boolean;
  path: string;
  version?: string;
  error?: string;
} {
  const binaryPath = getFFprobePath();
  try {
    const res = spawnSync(binaryPath, ["-version"], {
      encoding: "utf-8",
      maxBuffer: 1024 * 1024,
      timeout: 5000,
    });
    if (res.status === 0) {
      const firstLine = (res.stdout || "").split("\n")[0] || "ffprobe available";
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
  aspectRatio: "16:9" | "9:16" | "1:1";
  videoCodec?: string;
  audioCodec?: string;
  frameRate?: number;
  hasAudio: boolean;
  audioChannels?: number;
  audioSampleRate?: number;
  bitrate?: number;
  sizeBytes?: number;
  formatName?: string;
}

/**
 * Robust video telemetry inspection using real FFprobe JSON output.
 * Validates real video container streams, codecs, and durations.
 */
export function probeVideoFile(filePath: string): VideoProbeResult {
  const defaultEmptyResult: VideoProbeResult = {
    duration: 0,
    width: 1920,
    height: 1080,
    resolution: "1920x1080",
    aspectRatio: "16:9",
    hasAudio: false,
  };

  if (!filePath || !fs.existsSync(filePath)) {
    return defaultEmptyResult;
  }

  let fileSize = 0;
  try {
    const st = fs.statSync(filePath);
    fileSize = st.size;
    if (fileSize < 100) return defaultEmptyResult;

    // Check header for non-media text/HTML files (e.g. error web pages)
    const fd = fs.openSync(filePath, "r");
    const buf = Buffer.alloc(Math.min(1024, fileSize));
    fs.readSync(fd, buf, 0, buf.length, 0);
    fs.closeSync(fd);

    const header = buf.toString("utf-8").toLowerCase();
    if (
      header.includes("<!doctype html") ||
      header.includes("<html") ||
      header.includes("{\"error\"") ||
      header.includes("<error>")
    ) {
      return defaultEmptyResult;
    }
  } catch {
    return defaultEmptyResult;
  }

  // 1. Try real FFprobe JSON extraction first
  try {
    const ffprobe = getFFprobePath();
    const probeArgs = [
      "-v",
      "error",
      "-show_format",
      "-show_streams",
      "-of",
      "json",
      filePath,
    ];

    const probeRes = spawnSync(ffprobe, probeArgs, {
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024,
      timeout: 15000,
    });

    if (probeRes.status === 0 && probeRes.stdout) {
      const data = JSON.parse(probeRes.stdout);
      const streams: any[] = Array.isArray(data.streams) ? data.streams : [];
      const format = data.format || {};

      const vStream = streams.find((s) => s.codec_type === "video");
      const aStream = streams.find((s) => s.codec_type === "audio");

      // Verify valid video stream (filter out pseudo-video like ascii/tty or image covers)
      const validCodecs = [
        "h264", "hevc", "h265", "vp8", "vp9", "av1",
        "mpeg4", "mjpeg", "prores", "theora", "flv1", "wmv3", "vc1",
      ];
      const vCodec = vStream?.codec_name?.toLowerCase();
      const isValidVideo = vCodec && (validCodecs.includes(vCodec) || !["ansi", "tty"].includes(vCodec));

      if (vStream && isValidVideo) {
        let dur = 0;
        if (vStream.duration && !isNaN(parseFloat(vStream.duration))) {
          dur = parseFloat(vStream.duration);
        } else if (format.duration && !isNaN(parseFloat(format.duration))) {
          dur = parseFloat(format.duration);
        }

        const width = parseInt(vStream.width, 10) || 1920;
        const height = parseInt(vStream.height, 10) || 1080;

        let frameRate = 30;
        if (vStream.r_frame_rate) {
          const [num, den] = vStream.r_frame_rate.split("/").map(Number);
          if (den && den > 0) frameRate = Number((num / den).toFixed(2));
        }

        let computedAspectRatio: "16:9" | "9:16" | "1:1" = "16:9";
        const ratio = width / height;
        if (ratio < 0.75) {
          computedAspectRatio = "9:16";
        } else if (ratio >= 0.75 && ratio <= 1.25) {
          computedAspectRatio = "1:1";
        }

        return {
          duration: Number(dur.toFixed(2)),
          width,
          height,
          resolution: `${width}x${height}`,
          aspectRatio: computedAspectRatio,
          videoCodec: vStream.codec_name,
          audioCodec: aStream?.codec_name,
          frameRate,
          hasAudio: !!aStream,
          audioChannels: aStream?.channels ? parseInt(aStream.channels, 10) : undefined,
          audioSampleRate: aStream?.sample_rate ? parseInt(aStream.sample_rate, 10) : undefined,
          bitrate: format.bit_rate ? parseInt(format.bit_rate, 10) : undefined,
          sizeBytes: fileSize,
          formatName: format.format_name,
        };
      }
    }
  } catch {}

  // 2. Fallback: Parse ffmpeg -i stderr output
  try {
    const ffmpeg = getFFmpegPath();
    const res = spawnSync(ffmpeg, ["-i", filePath], {
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024,
      timeout: 10000,
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

    const hasAudio = /Stream.*Audio:/.test(output);

    let fallbackRatio: "16:9" | "9:16" | "1:1" = "16:9";
    const r = width / height;
    if (r < 0.75) fallbackRatio = "9:16";
    else if (r >= 0.75 && r <= 1.25) fallbackRatio = "1:1";

    return {
      duration: Number(duration.toFixed(2)),
      width,
      height,
      resolution: `${width}x${height}`,
      aspectRatio: fallbackRatio,
      hasAudio,
      sizeBytes: fileSize,
    };
  } catch {
    return defaultEmptyResult;
  }
}

/**
 * Full rendering engine diagnostics.
 */
export function runFFmpegDiagnostics() {
  const ffmpegStatus = verifyFFmpegAvailable();
  const ffprobeStatus = verifyFFprobeAvailable();
  const tempDir = path.join(os.tmpdir(), "pagepulse-diagnostics");

  let tempDirWritable = false;
  try {
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    const testFile = path.join(tempDir, "write-test.tmp");
    fs.writeFileSync(testFile, "ok");
    fs.unlinkSync(testFile);
    tempDirWritable = true;
  } catch {}

  const mem = process.memoryUsage();

  return {
    ready: ffmpegStatus.available && ffprobeStatus.available && tempDirWritable,
    ffmpeg: ffmpegStatus,
    ffprobe: ffprobeStatus,
    tempDir: {
      path: os.tmpdir(),
      writable: tempDirWritable,
    },
    platform: {
      os: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
    },
    memoryMb: {
      heapUsed: Number((mem.heapUsed / 1024 / 1024).toFixed(1)),
      heapTotal: Number((mem.heapTotal / 1024 / 1024).toFixed(1)),
      rss: Number((mem.rss / 1024 / 1024).toFixed(1)),
    },
  };
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
        let fallbackFilter = "";
        if (reframing === "blurred_backdrop" && (options.aspectRatio === "9:16" || options.aspectRatio === "1:1")) {
          fallbackFilter = `split[main][bg];[bg]scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=increase,crop=${targetWidth}:${targetHeight},boxblur=25:5[bgblur];[main]scale=${targetWidth}:-2:force_original_aspect_ratio=decrease[fg];[bgblur][fg]overlay=(W-w)/2:(H-h)/2`;
        } else if (reframing === "fit_contain") {
          fallbackFilter = `scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease,pad=${targetWidth}:${targetHeight}:(ow-iw)/2:(oh-ih)/2:black`;
        } else if (options.aspectRatio === "16:9") {
          fallbackFilter = `scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=increase,crop=${targetWidth}:${targetHeight}:(in_w-${targetWidth})/2:(in_h-${targetHeight})/2`;
        } else {
          fallbackFilter = `scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=increase,crop=${targetWidth}:${targetHeight}:(in_w-${targetWidth})/2:${cropY}`;
        }

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

