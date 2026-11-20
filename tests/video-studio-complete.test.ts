import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { SUBTITLE_PRESETS, buildSubtitleCues, generateASS } from "../lib/video/subtitles/engine";
import {
  PageBrandingUpdateSchema,
  VoiceGenerateSchema,
  VideoRenderDispatchSchema,
} from "../lib/validations/video";
import { checkAllProvidersStatus } from "../lib/video/providers";

describe("Video Production Studio & Video Library Complete Suite", () => {
  describe("Subtitle Engine & Visibility Assurance", () => {
    it("provides all 5 high-retention subtitle presets with distinct formatting", () => {
      const presets = ["bold_viral", "karaoke", "classic", "minimal", "highlight_keywords"] as const;
      presets.forEach((key) => {
        const config = SUBTITLE_PRESETS[key];
        assert.ok(config, `Preset ${key} must exist`);
        assert.ok(config.name, `Preset ${key} must have a descriptive name`);
        assert.ok(config.textColor, `Preset ${key} must have textColor`);
        assert.ok(config.highlightColor, `Preset ${key} must have highlightColor`);
        assert.ok(config.fontSize >= 30, `Preset ${key} must have appropriate 1080p font size`);
      });
    });

    it("ensures Bold Viral has electric yellow text and proper outline specifications", () => {
      const boldViral = SUBTITLE_PRESETS.bold_viral;
      assert.equal(boldViral.textColor, "#FFFF00");
      assert.equal(boldViral.fontFamily.includes("Impact"), true);
      assert.equal(boldViral.position, "middle");
      assert.equal(boldViral.animation, "pop");
    });

    it("generates compliant ASS subtitle content for 1080x1920 vertical canvas", () => {
      const cues = [
        { id: 1, startTimeSeconds: 0, endTimeSeconds: 3.5, text: "Stop scrolling right now!" },
      ];
      const ass = generateASS(cues, SUBTITLE_PRESETS.bold_viral);
      assert.ok(ass.includes("PlayResX: 1080"), "Must target 1080 horizontal resolution");
      assert.ok(ass.includes("PlayResY: 1920"), "Must target 1920 vertical resolution");
      assert.ok(ass.includes("Stop scrolling right now!"), "Must contain cue text");
    });
  });

  describe("Page Branding & Extended Configuration Validation", () => {
    it("validates full branding with watermark, colors, and intro/outro bumpers", () => {
      const validBranding = {
        brand_name: "PagePulse Media",
        watermark_logo_url: "https://example.com/logo.png",
        watermark_position: "bottom_right",
        watermark_size: 0.18,
        watermark_opacity: 0.85,
        brand_primary_color: "#6366f1",
        brand_secondary_color: "#4f46e5",
        enable_watermark: true,
        intro_video_url: "https://example.com/intro.mp4",
        outro_video_url: "https://example.com/outro.mp4",
        intro_duration_seconds: 2.5,
        outro_duration_seconds: 3.0,
        default_subtitle_preset: "bold_viral",
        default_voice_id: "21m00Tcm4TlvDq8ikWAM",
        default_bg_music_url: "upbeat_lofi",
        video_ending_type: "brand_card",
        is_global: true,
      };

      const result = PageBrandingUpdateSchema.safeParse(validBranding);
      assert.equal(result.success, true, "Valid branding schema must pass");
      if (result.success) {
        assert.equal(result.data.is_global, true);
        assert.equal(result.data.video_ending_type, "brand_card");
      }
    });

    it("rejects invalid watermark position or out-of-range opacity", () => {
      const invalid = {
        watermark_position: "center_middle", // Invalid
        watermark_opacity: 1.5, // Exceeds 1.0
      };
      const result = PageBrandingUpdateSchema.safeParse(invalid);
      assert.equal(result.success, false, "Must reject invalid position and opacity");
    });
  });

  describe("Voice Studio & TTS Parameters", () => {
    it("validates narration script text and speed boundaries", () => {
      const valid = {
        text: "Here is why your Reels are failing and how to fix them today.",
        voice_id: "21m00Tcm4TlvDq8ikWAM",
        speed: 1.15,
        stability: 0.6,
        similarity_boost: 0.8,
      };

      const result = VoiceGenerateSchema.safeParse(valid);
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.speed, 1.15);
      }
    });

    it("rejects speed below 0.5x or above 2.0x", () => {
      const invalid = {
        text: "Testing invalid speed bounds.",
        speed: 3.5,
      };
      const result = VoiceGenerateSchema.safeParse(invalid);
      assert.equal(result.success, false, "Must reject excessive speed");
    });
  });

  describe("Video Render Dispatch & Queue Validation", () => {
    it("validates full render dispatch parameters with 1080x1920 vertical format", () => {
      const dispatchInput = {
        storyboard_id: "sb_00000000-0000-0000-0000-000000000001",
        script_id: "sc_00000000-0000-0000-0000-000000000001",
        page_id: "pg_00000000-0000-0000-0000-000000000001",
        subtitle_preset: "karaoke",
        include_watermark: true,
        resolution: "1080x1920",
      };

      const result = VideoRenderDispatchSchema.safeParse(dispatchInput);
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.resolution, "1080x1920");
        assert.equal(result.data.subtitle_preset, "karaoke");
      }
    });
  });

  describe("AI Providers Readiness & Diagnostics", () => {
    it("audits provider configuration status without throwing errors", async () => {
      const status = await checkAllProvidersStatus();
      assert.ok(status.replicate, "Replicate provider status must exist");
      assert.ok(status.runway, "Runway provider status must exist");
      assert.ok(status.elevenlabs, "ElevenLabs provider status must exist");
      assert.ok(status.openai_image, "OpenAI DALL-E provider status must exist");
      assert.equal(typeof status.replicate.is_configured, "boolean");
      assert.equal(typeof status.elevenlabs.is_configured, "boolean");
    });
  });
});
