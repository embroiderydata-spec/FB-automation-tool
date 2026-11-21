import { test, describe } from "node:test";
import assert from "node:assert";
import * as fs from "fs";
import * as path from "path";
import { spawnSync } from "child_process";
import { saveUserClip, getUserClips, deleteUserClip } from "../lib/clipper/storage";
import {
  probeVideoFile,
  renderVideoClip,
  formatBytes,
  getFFmpegPath,
} from "../lib/clipper/ffmpeg-engine";
import {
  getYouTubeAuthUrl,
  getYouTubeRedirectUri,
  saveYouTubeAccount,
  getYouTubeAccounts,
  disconnectYouTubeAccount,
} from "../lib/publishing/youtube";
import { PublishNowSchema, SchedulePostSchema } from "../lib/validations/publishing";

describe("Video Clipper Studio & Multi-Platform Publishing", () => {
  const testUserId = "test-user-clipper-" + Date.now();
  const testDir = path.join(process.cwd(), ".data", "test_suite");
  const testVideoPath = path.join(testDir, "test_input.mp4");

  // Create real test video if ffmpeg available
  test("setup: generates a real 5-second test MP4 for clipping tests", () => {
    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });
    const ffmpeg = getFFmpegPath();
    const res = spawnSync(ffmpeg, [
      "-y",
      "-f", "lavfi", "-i", "testsrc=duration=5:size=1920x1080:rate=30",
      "-f", "lavfi", "-i", "sine=frequency=1000:duration=5",
      "-c:v", "libx264", "-c:a", "aac",
      testVideoPath,
    ]);
    assert.strictEqual(res.status, 0);
    assert.ok(fs.existsSync(testVideoPath));
    assert.ok(fs.statSync(testVideoPath).size > 0);
  });

  describe("1. Real FFmpeg Video Processing & Probing", () => {
    test("probeVideoFile accurately extracts real duration, width, height and resolution", () => {
      const probe = probeVideoFile(testVideoPath);
      assert.ok(probe);
      assert.strictEqual(probe.width, 1920);
      assert.strictEqual(probe.height, 1080);
      assert.strictEqual(probe.resolution, "1920x1080");
      assert.ok(probe.duration >= 4.9 && probe.duration <= 5.1);
    });

    test("renderVideoClip trims exact duration and crops to 9:16 vertical (1080x1920)", async () => {
      const out9x16 = path.join(testDir, "output_9x16.mp4");
      const result = await renderVideoClip({
        inputPath: testVideoPath,
        outputPath: out9x16,
        startTime: 1.0,
        duration: 2.5,
        aspectRatio: "9:16",
        cropPosition: "center",
        resolution: "1080p",
      });

      assert.ok(fs.existsSync(out9x16));
      assert.ok(result.sizeBytes > 0);
      assert.strictEqual(result.duration, 2.5);

      // Verify the rendered video actually has 1080x1920 dimensions
      const probeOut = probeVideoFile(out9x16);
      assert.strictEqual(probeOut.width, 1080);
      assert.strictEqual(probeOut.height, 1920);
      assert.strictEqual(probeOut.resolution, "1080x1920");
      assert.ok(probeOut.duration >= 2.4 && probeOut.duration <= 2.6);
    });

    test("renderVideoClip crops to 1:1 square (1080x1080)", async () => {
      const out1x1 = path.join(testDir, "output_1x1.mp4");
      const result = await renderVideoClip({
        inputPath: testVideoPath,
        outputPath: out1x1,
        startTime: 0.5,
        duration: 2.0,
        aspectRatio: "1:1",
        cropPosition: "center",
        resolution: "1080p",
      });

      assert.ok(fs.existsSync(out1x1));
      assert.ok(result.sizeBytes > 0);

      const probeOut = probeVideoFile(out1x1);
      assert.strictEqual(probeOut.width, 1080);
      assert.strictEqual(probeOut.height, 1080);
    });

    test("formatBytes formats file sizes correctly", () => {
      assert.strictEqual(formatBytes(15728640), "15.0 MB");
      assert.strictEqual(formatBytes(1048576), "1.0 MB");
      assert.strictEqual(formatBytes(0), "0 MB");
    });
  });

  describe("2. Video Clipper Storage & Lifecycle", () => {
    test("should successfully save a new 9:16 vertical video clip", async () => {
      const clip = await saveUserClip(testUserId, {
        source_video_url: "https://example.com/source.mp4",
        source_video_name: "Source Vlog.mp4",
        clip_title: "Viral Hook Scene",
        caption: "#reels #shorts #viral",
        start_time: 10.5,
        end_time: 40.5,
        duration: 30.0,
        aspect_ratio: "9:16",
        crop_position: "center",
        resolution: "1080p",
        subtitle_text: "WAIT TILL THE END 😱",
        file_size: 1542890,
      });

      assert.ok(clip);
      assert.ok(clip.id);
      assert.strictEqual(clip.user_id, testUserId);
      assert.strictEqual(clip.aspect_ratio, "9:16");
      assert.strictEqual(clip.crop_position, "center");
      assert.strictEqual(clip.duration, 30.0);
      assert.strictEqual(clip.subtitle_text, "WAIT TILL THE END 😱");
    });

    test("should retrieve saved clips for the user", async () => {
      const clips = await getUserClips(testUserId);
      assert.ok(Array.isArray(clips));
      assert.ok(clips.length > 0);
      assert.strictEqual(clips[0].clip_title, "Viral Hook Scene");
    });

    test("should allow deleting a saved clip", async () => {
      const clips = await getUserClips(testUserId);
      const clipId = clips[0].id;

      const deleted = await deleteUserClip(testUserId, clipId);
      assert.strictEqual(deleted, true);

      const afterClips = await getUserClips(testUserId);
      assert.strictEqual(afterClips.some((c) => c.id === clipId), false);
    });
  });

  describe("3. YouTube OAuth & Multi-Platform Integration", () => {
    test("should generate a valid Google OAuth consent URL for YouTube scopes", () => {
      const authUrl = getYouTubeAuthUrl("state-123");
      assert.ok(authUrl.includes("accounts.google.com/o/oauth2/v2/auth"));
      assert.ok(authUrl.includes("youtube.upload"));
      assert.ok(authUrl.includes("youtube.readonly"));
    });

    test("should resolve correct YouTube redirect URI", () => {
      const redirectUri = getYouTubeRedirectUri();
      assert.ok(redirectUri.includes("/api/youtube/callback"));
    });

    test("should store and encrypt YouTube channel tokens securely", async () => {
      const account = await saveYouTubeAccount(testUserId, {
        channelId: "UC_TEST_CHANNEL_123",
        channelTitle: "Viral Shorts Daily",
        customUrl: "@viralshortsdaily",
        thumbnailUrl: "https://example.com/yt-thumb.jpg",
        subscriberCount: 54200,
        videoCount: 142,
        accessToken: "ya29.test_access_token_sensitive_12345",
        refreshToken: "1//04test_refresh_token_sensitive_67890",
        expiresIn: 3600,
      });

      assert.ok(account);
      assert.strictEqual(account.channel_id, "UC_TEST_CHANNEL_123");
      assert.strictEqual(account.channel_title, "Viral Shorts Daily");
      assert.notStrictEqual(account.encrypted_access_token, "ya29.test_access_token_sensitive_12345");

      const accounts = await getYouTubeAccounts(testUserId);
      assert.ok(accounts.length > 0);
      assert.strictEqual(accounts[0].channel_id, "UC_TEST_CHANNEL_123");

      // Cleanup
      await disconnectYouTubeAccount(testUserId, "UC_TEST_CHANNEL_123");
      const remaining = await getYouTubeAccounts(testUserId);
      assert.strictEqual(remaining.some((a) => a.channel_id === "UC_TEST_CHANNEL_123"), false);
    });
  });

  describe("4. Unified Multi-Platform Publishing Validation", () => {
    test("should validate Facebook immediate publishing payload", () => {
      const fbPayload = {
        video_id: "vid-123",
        platform: "facebook",
        page_id: "page-facebook-456",
        caption: "Great reel post!",
        is_test_mode: true,
      };

      const result = PublishNowSchema.safeParse(fbPayload);
      assert.strictEqual(result.success, true);
    });

    test("should validate YouTube immediate publishing payload", () => {
      const ytPayload = {
        video_id: "vid-789",
        platform: "youtube",
        youtube_channel_id: "UC_MY_CHANNEL",
        video_title: "Crazy Trickshot #Shorts",
        caption: "Check out this incredible shot! #Shorts",
        tags: ["shorts", "trickshot", "viral"],
        privacy_status: "public",
        is_short: true,
        is_test_mode: false,
      };

      const result = PublishNowSchema.safeParse(ytPayload);
      assert.strictEqual(result.success, true);
    });

    test("should reject YouTube publishing without youtube_channel_id", () => {
      const invalidYt = {
        video_id: "vid-789",
        platform: "youtube",
        caption: "Missing channel id",
      };

      const result = PublishNowSchema.safeParse(invalidYt);
      assert.strictEqual(result.success, false);
    });

    test("should validate scheduled multi-platform publishing", () => {
      const scheduledPayload = {
        video_id: "vid-scheduled-1",
        platform: "facebook",
        page_id: "page-123",
        caption: "Scheduled Reel",
        scheduled_at: new Date(Date.now() + 86400000).toISOString(),
        timezone: "America/New_York",
      };

      const result = SchedulePostSchema.safeParse(scheduledPayload);
      assert.strictEqual(result.success, true);
    });
  });
});
