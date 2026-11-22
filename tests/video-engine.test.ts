import { test, describe } from "node:test";
import assert from "node:assert";
import { getVideoConfig } from "../lib/video/config";
import { getVideoProvider, getImageProvider, getVoiceProvider } from "../lib/video/providers";
import {
  generateSRT,
  generateASS,
  buildSubtitleCues,
  formatSrtTime,
  SUBTITLE_PRESETS,
  SubtitleCue,
} from "../lib/video/subtitles/engine";
import { buildFFmpegCommand } from "../lib/video/composer/ffmpeg";
import { buildStoragePath } from "../lib/video/storage";
import {
  VideoSceneGenerateSchema,
  ImageGenerateSchema,
  VoiceGenerateSchema,
  SubtitleGenerateSchema,
  VideoRenderDispatchSchema,
  PageBrandingUpdateSchema,
} from "../lib/validations/video";

describe("Phase 2.3 Video Engine Test Suite", () => {
  describe("Provider Architecture & Config", () => {
    test("getVideoConfig reads active provider and flags without crashing", () => {
      const config = getVideoConfig();
      assert.ok(typeof config.activeProvider === "string");
      assert.ok(typeof config.isReplicateConfigured === "boolean");
      assert.ok(typeof config.isRunwayConfigured === "boolean");
      assert.ok(typeof config.isElevenLabsConfigured === "boolean");
    });

    test("provider factories return providers conforming to expected interface", () => {
      const videoProvider = getVideoProvider("replicate");
      assert.strictEqual(videoProvider.name.toLowerCase(), "replicate");
      assert.ok(typeof videoProvider.generateVideo === "function");
      assert.ok(typeof videoProvider.testConnection === "function");

      const runwayProvider = getVideoProvider("runway");
      assert.strictEqual(runwayProvider.name.toLowerCase(), "runway");
      assert.ok(typeof runwayProvider.generateVideo === "function");

      const voiceProvider = getVoiceProvider("elevenlabs");
      assert.strictEqual(voiceProvider.name.toLowerCase(), "elevenlabs");
      assert.ok(typeof voiceProvider.generateSpeech === "function");

      const imgProvider = getImageProvider("openai");
      assert.ok(imgProvider.name.toLowerCase().includes("openai"));
      assert.ok(typeof imgProvider.generateImage === "function");
    });

    test("testConnection fails gracefully with informative message when token is missing", async () => {
      const runwayProvider = getVideoProvider("runway");
      // Runway key is unset in test env
      const result = await runwayProvider.testConnection();
      assert.strictEqual(result.success, false);
      assert.ok(
        result.message.includes("RUNWAY_API_KEY") ||
        result.message.includes("missing") ||
        result.message.includes("not configured")
      );
    });
  });

  describe("Subtitle Generation & Styling Engine", () => {
    const mockCues: SubtitleCue[] = [
      {
        id: 1,
        startTimeSeconds: 0.0,
        endTimeSeconds: 2.5,
        text: "Never make this mistake again",
      },
      {
        id: 2,
        startTimeSeconds: 2.5,
        endTimeSeconds: 5.0,
        text: "Here is the exact framework to follow",
      },
    ];

    test("formatSrtTime formats milliseconds into 00:00:00,000", () => {
      assert.strictEqual(formatSrtTime(0), "00:00:00,000");
      assert.strictEqual(formatSrtTime(2.5), "00:00:02,500");
      assert.strictEqual(formatSrtTime(65.123), "00:01:05,123");
    });

    test("generateSRT formats correct SubRip timestamps", () => {
      const srt = generateSRT(mockCues);
      assert.ok(srt.includes("1\n00:00:00,000 --> 00:00:02,500\nNever make this mistake again"));
      assert.ok(srt.includes("2\n00:00:02,500 --> 00:00:05,000\nHere is the exact framework to follow"));
    });

    test("generateASS produces valid ASS script with 9:16 resolution and style", () => {
      const ass = generateASS(mockCues, SUBTITLE_PRESETS.bold_viral);
      assert.ok(ass.includes("[Script Info]"));
      assert.ok(ass.includes("PlayResX: 1080"));
      assert.ok(ass.includes("PlayResY: 1920"));
      assert.ok(ass.includes("Format: Layer, Start, End, Style"));
      assert.ok(ass.includes("Dialogue: 0,0:00:00.00,0:00:02.50,Default,,0,0,0,,Never make this mistake again"));
    });

    test("all 5 subtitle presets exist with complete style definitions", () => {
      const presetKeys = ["bold_viral", "karaoke", "classic", "minimal", "highlight_keywords"] as const;
      for (const key of presetKeys) {
        const config = SUBTITLE_PRESETS[key];
        assert.ok(config, `Missing preset: ${key}`);
        assert.ok(config.fontSize > 0);
        assert.ok(config.textColor);
        assert.ok(config.position === "middle" || config.position === "bottom" || config.position === "top");
      }
    });

    test("buildSubtitleCues creates cues from storyboard scenes and word timestamps", () => {
      const scenes = [
        { scene_number: 1, start_time: 0, end_time: 3, narration: "First step is research." },
        { scene_number: 2, start_time: 3, end_time: 6, narration: "Second step is execution." },
      ];
      const sceneCues = buildSubtitleCues(scenes);
      assert.strictEqual(sceneCues.length, 2);
      assert.strictEqual(sceneCues[0].text, "First step is research.");

      const wordTimestamps = [
        { word: "Stop", start: 0.0, end: 0.4 },
        { word: "wasting", start: 0.4, end: 0.8 },
        { word: "your", start: 0.8, end: 1.0 },
        { word: "time", start: 1.0, end: 1.4 },
        { word: "today", start: 1.4, end: 1.8 },
      ];
      const wordCues = buildSubtitleCues([], wordTimestamps);
      assert.ok(wordCues.length >= 2);
      assert.strictEqual(wordCues[0].text, "Stop wasting your time");
    });
  });

  describe("FFmpeg Composition & Command Builder", () => {
    test("buildFFmpegCommand configures 1080x1920 vertical output and H.264 profile", () => {
      const command = buildFFmpegCommand({
        scenes: [{ sceneOrder: 1, videoUrl: "https://example.com/s1.mp4", durationSeconds: 3.5 }],
        outputPath: "/tmp/output_reel.mp4",
        targetResolution: "1080x1920",
        fps: 30,
      });

      assert.ok(command.startsWith("ffmpeg"));
      assert.ok(command.includes("scale=1080:1920"));
      assert.ok(command.includes("-pix_fmt yuv420p"));
      assert.ok(command.includes("-c:v libx264"));
      assert.ok(command.includes("/tmp/output_reel.mp4"));
    });

    test("buildFFmpegCommand adds watermark overlay in requested corner", () => {
      const command = buildFFmpegCommand({
        scenes: [{ sceneOrder: 1, videoUrl: "s1.mp4", durationSeconds: 3.5 }],
        outputPath: "final.mp4",
        branding: {
          brand_name: "Test Brand",
          brand_primary_color: "#1877F2",
          brand_secondary_color: "#FFFFFF",
          enable_watermark: true,
          watermark_logo_url: "logo.png",
          watermark_position: "top_right",
          watermark_opacity: 0.8,
          watermark_size: 0.15,
        },
      });

      assert.ok(command.includes("-i \"logo.png\""));
      assert.ok(command.includes("overlay=W-w-40:80"));
    });

    test("buildFFmpegCommand incorporates hardsub burn-in when subtitle path provided", () => {
      const command = buildFFmpegCommand({
        scenes: [{ sceneOrder: 1, videoUrl: "s1.mp4", durationSeconds: 3.5 }],
        outputPath: "final.mp4",
        subtitlesFilePath: "/tmp/subtitles.ass",
      });

      assert.ok(command.includes("ass="));
      assert.ok(command.includes("subtitles.ass"));
    });
  });

  describe("Storage Path Hierarchy", () => {
    test("buildStoragePath constructs strict isolated directory paths", () => {
      const imagePath = buildStoragePath(
        "usr-123",
        "page-456",
        "content-789",
        "images",
        "scene_1_keyframe.png"
      );
      assert.strictEqual(imagePath, "usr-123/page-456/content-789/images/scene_1_keyframe.png");

      const renderPath = buildStoragePath(
        "usr-123",
        "page-456",
        "content-789",
        "renders",
        "final_1080x1920.mp4"
      );
      assert.strictEqual(renderPath, "usr-123/page-456/content-789/renders/final_1080x1920.mp4");
    });
  });

  describe("Video Engine Zod Validation Schemas", () => {
    test("VideoSceneGenerateSchema validates prompt length and 9:16 aspect ratio", () => {
      const valid = VideoSceneGenerateSchema.safeParse({
        prompt: "Cinematic close-up of hands typing on glowing neon keyboard",
        duration_seconds: 5,
        aspect_ratio: "9:16",
        provider: "replicate",
      });
      assert.strictEqual(valid.success, true);

      const invalid = VideoSceneGenerateSchema.safeParse({
        prompt: "",
        duration_seconds: 99,
      });
      assert.strictEqual(invalid.success, false);
    });

    test("ImageGenerateSchema validates vertical resolution and quality settings", () => {
      const valid = ImageGenerateSchema.safeParse({
        prompt: "Ultra realistic portrait of a founder in modern studio",
        aspect_ratio: "9:16",
        provider: "openai",
        quality: "hd",
      });
      assert.strictEqual(valid.success, true);
    });

    test("VoiceGenerateSchema accepts supported voice presets and script text", () => {
      const valid = VoiceGenerateSchema.safeParse({
        text: "Here is why your morning routine is failing every single day.",
        voice_id: "21m00Tcm4TlvDq8ikWAM",
        speed: 1.05,
      });
      assert.strictEqual(valid.success, true);

      const empty = VoiceGenerateSchema.safeParse({ text: "" });
      assert.strictEqual(empty.success, false);
    });

    test("SubtitleGenerateSchema validates subtitle scenes array", () => {
      const valid = SubtitleGenerateSchema.safeParse({
        preset: "bold_viral",
        scenes: [
          {
            scene_number: 1,
            start_time: 0,
            end_time: 3,
            narration: "Stop scrolling and listen closely.",
          },
        ],
      });
      assert.strictEqual(valid.success, true);
    });

    test("VideoRenderDispatchSchema requires IDs and valid preset", () => {
      const valid = VideoRenderDispatchSchema.safeParse({
        storyboard_id: "sb-123",
        script_id: "sc-456",
        page_id: "page-789",
        subtitle_preset: "bold_viral",
        include_watermark: true,
      });
      assert.strictEqual(valid.success, true);

      const invalid = VideoRenderDispatchSchema.safeParse({
        storyboard_id: "",
        script_id: "",
        page_id: "",
      });
      assert.strictEqual(invalid.success, false);
    });

    test("PageBrandingUpdateSchema validates opacity range and watermark position", () => {
      const valid = PageBrandingUpdateSchema.safeParse({
        brand_name: "Tech Pulse Daily",
        watermark_position: "bottom_right",
        watermark_opacity: 0.8,
        watermark_size: 0.15,
        enable_watermark: true,
      });
      assert.strictEqual(valid.success, true);

      // Opacity > 1.0 should fail
      const invalidOpacity = PageBrandingUpdateSchema.safeParse({
        watermark_opacity: 2.5,
      });
      assert.strictEqual(invalidOpacity.success, false);
    });
  });
});
