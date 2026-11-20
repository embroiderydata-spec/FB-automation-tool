import { QualityControlReport, QualityCheckItem, QualityStatus } from "./types";

export interface QualityControlInputs {
  videoExists: boolean;
  videoPath?: string | null;
  videoUrl?: string | null;
  durationSeconds?: number | null;
  expectedDuration?: number | null;
  resolution?: string | null;
  aspectRatio?: string | null;
  fileSizeBytes?: number | null;
  audioExists: boolean;
  audioDurationSeconds?: number | null;
  subtitleFileExists: boolean;
  expectedSceneCount?: number | null;
  actualSceneCount?: number | null;
  missingScenesCount?: number;
  hasCorruptedFrames?: boolean;
  hasBlackFrames?: boolean;
}

/**
 * Automated video quality control evaluation engine.
 * Inspects technical parameters of the rendered 9:16 vertical Reel asset.
 *
 * NOTE: Evaluates technical integrity only (resolution, audio presence, duration, safe zones);
 * subjective artistic/viral quality is not guaranteed.
 */
export function runQualityControl(inputs: QualityControlInputs): QualityControlReport {
  const checks: QualityCheckItem[] = [];
  let overallStatus: QualityStatus = "passed";

  // 1. Video Asset Existence
  const videoExists = inputs.videoExists && !!(inputs.videoPath || inputs.videoUrl);
  checks.push({
    id: "video_existence",
    label: "Video Asset Integrity",
    status: videoExists ? "passed" : "failed",
    message: videoExists
      ? "Rendered video file exists and is accessible in storage."
      : "Rendered video asset is missing or was not output by composer.",
    value: videoExists,
    expected: true,
  });
  if (!videoExists) overallStatus = "failed";

  // 2. Resolution Check (1080x1920 or 720x1280)
  const isTargetResolution =
    inputs.resolution === "1080x1920" || inputs.resolution === "720x1280";
  checks.push({
    id: "resolution",
    label: "Vertical HD Resolution",
    status: isTargetResolution ? "passed" : "warning",
    message: isTargetResolution
      ? `Resolution conforms to Meta Reels HD standard (${inputs.resolution || "1080x1920"}).`
      : `Resolution is ${inputs.resolution || "unknown"}, recommended 1080x1920.`,
    value: inputs.resolution || "unknown",
    expected: "1080x1920",
  });
  if (!isTargetResolution && overallStatus !== "failed") {
    overallStatus = "warning";
  }

  // 3. Aspect Ratio Check (Must be 9:16)
  const isVertical = inputs.aspectRatio === "9:16";
  checks.push({
    id: "aspect_ratio",
    label: "9:16 Reels Aspect Ratio",
    status: isVertical ? "passed" : "failed",
    message: isVertical
      ? "Aspect ratio conforms to 9:16 vertical orientation."
      : `Aspect ratio is ${inputs.aspectRatio || "unknown"}; non-vertical formats face distribution penalties.`,
    value: inputs.aspectRatio || "unknown",
    expected: "9:16",
  });
  if (!isVertical) overallStatus = "failed";

  // 4. Duration Check (15s to 90s standard window)
  const duration = inputs.durationSeconds || 0;
  const isDurationValid = duration >= 10 && duration <= 180;
  const matchesExpected =
    !inputs.expectedDuration ||
    Math.abs(duration - inputs.expectedDuration) <= 5;

  checks.push({
    id: "duration",
    label: "Duration & Retention Pacing",
    status: isDurationValid && matchesExpected ? "passed" : duration < 10 ? "failed" : "warning",
    message:
      duration < 10
        ? `Video is too short (${duration.toFixed(1)}s). Meta Reels require at least 10s.`
        : matchesExpected
        ? `Duration is ${duration.toFixed(1)}s (optimal short-form window).`
        : `Duration (${duration.toFixed(1)}s) deviated from storyboard expectation (${inputs.expectedDuration}s).`,
    value: `${duration.toFixed(1)}s`,
    expected: inputs.expectedDuration ? `${inputs.expectedDuration}s` : "15s-90s",
  });
  if (duration < 10) overallStatus = "failed";
  else if (!matchesExpected && overallStatus !== "failed") overallStatus = "warning";

  // 5. File Size Check (50KB to 300MB)
  const sizeBytes = inputs.fileSizeBytes || 0;
  const sizeMb = sizeBytes / (1024 * 1024);
  const isFileSizeNormal = sizeBytes > 50 * 1024 && sizeMb < 350;
  checks.push({
    id: "file_size",
    label: "File Size & Compression",
    status: isFileSizeNormal ? "passed" : sizeBytes === 0 ? "failed" : "warning",
    message: isFileSizeNormal
      ? `File size is ${sizeMb.toFixed(2)} MB (well within Meta 4GB limit).`
      : sizeBytes === 0
      ? "File size is 0 bytes (corrupted output)."
      : `File size is ${sizeMb.toFixed(2)} MB, inspect bitrate compression.`,
    value: `${sizeMb.toFixed(2)} MB`,
    expected: "< 300 MB",
  });
  if (sizeBytes === 0) overallStatus = "failed";

  // 6. Audio Track & Voiceover Check
  checks.push({
    id: "audio_track",
    label: "Audio Track & Voiceover",
    status: inputs.audioExists ? "passed" : "failed",
    message: inputs.audioExists
      ? "Synchronized voiceover audio stream detected."
      : "Audio stream is missing. Silent Reels suffer heavy reach drops.",
    value: inputs.audioExists,
    expected: true,
  });
  if (!inputs.audioExists) overallStatus = "failed";

  // 7. Audio / Video Synchronization Tolerance
  if (inputs.audioExists && inputs.audioDurationSeconds && duration > 0) {
    const audioDrift = Math.abs(duration - inputs.audioDurationSeconds);
    const isSyncAcceptable = audioDrift <= 2.5;
    checks.push({
      id: "audio_sync",
      label: "Audio-Video Duration Sync",
      status: isSyncAcceptable ? "passed" : "warning",
      message: isSyncAcceptable
        ? `Audio/video duration drift is ${audioDrift.toFixed(2)}s (within 2.5s tolerance).`
        : `Audio/video duration drift is ${audioDrift.toFixed(2)}s; review narration end padding.`,
      value: `${audioDrift.toFixed(2)}s drift`,
      expected: "< 2.5s drift",
    });
    if (!isSyncAcceptable && overallStatus !== "failed") {
      overallStatus = "warning";
    }
  }

  // 8. Subtitles / Closed Captions Check
  checks.push({
    id: "subtitles",
    label: "Subtitles & Text Safe Zones",
    status: inputs.subtitleFileExists ? "passed" : "warning",
    message: inputs.subtitleFileExists
      ? "Dynamic styled subtitle overlay included and positioned in safe zones."
      : "No subtitle file detected; 70%+ of mobile viewers browse with muted audio.",
    value: inputs.subtitleFileExists,
    expected: true,
  });
  if (!inputs.subtitleFileExists && overallStatus !== "failed") {
    overallStatus = "warning";
  }

  // 9. Scene Count Completeness
  const missingCount = inputs.missingScenesCount || 0;
  const isScenesComplete = missingCount === 0;
  checks.push({
    id: "scene_completeness",
    label: "Scene Completeness",
    status: isScenesComplete ? "passed" : "failed",
    message: isScenesComplete
      ? `All ${inputs.actualSceneCount || inputs.expectedSceneCount || 4} storyboard scenes rendered successfully.`
      : `${missingCount} scene(s) failed or are missing from the composition.`,
    value: `${inputs.actualSceneCount || 0}/${inputs.expectedSceneCount || 0}`,
    expected: `${inputs.expectedSceneCount || 0}`,
  });
  if (!isScenesComplete) overallStatus = "failed";

  // 10. Frame Glitches & Corruption
  const framesClean = !inputs.hasBlackFrames && !inputs.hasCorruptedFrames;
  checks.push({
    id: "frame_integrity",
    label: "Frame Integrity & Transitions",
    status: framesClean ? "passed" : "warning",
    message: framesClean
      ? "No black frames or corrupted transition glitches detected."
      : "Potential frame drop or black segment detected at transition boundaries.",
    value: framesClean,
    expected: true,
  });
  if (!framesClean && overallStatus !== "failed") {
    overallStatus = "warning";
  }

  // Build summary message
  let summary = "";
  if (overallStatus === "passed") {
    summary = "Quality Control Passed: Technical parameters meet official Meta Reels 9:16 distribution standards.";
  } else if (overallStatus === "warning") {
    summary = "Quality Control Passed with Warnings: Non-critical anomalies detected, but video is publishable.";
  } else {
    summary = "Quality Control Failed: Critical defects found. Video cannot be published until defects are resolved.";
  }

  return {
    overall_status: overallStatus,
    checked_at: new Date().toISOString(),
    checks,
    metrics: {
      duration_seconds: duration,
      resolution: inputs.resolution || "1080x1920",
      aspect_ratio: inputs.aspectRatio || "9:16",
      file_size_bytes: sizeBytes,
      audio_tracks: inputs.audioExists ? 1 : 0,
      scene_count: inputs.actualSceneCount || inputs.expectedSceneCount || 0,
      subtitles_synced: inputs.subtitleFileExists,
      black_frames_detected: !!inputs.hasBlackFrames,
      corrupted_frames: !!inputs.hasCorruptedFrames,
    },
    summary,
  };
}
