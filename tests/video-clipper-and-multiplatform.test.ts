import { test, describe } from "node:test";
import assert from "node:assert";
import { saveUserClip, getUserClips, deleteUserClip } from "../lib/clipper/storage";
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

  describe("1. Video Clipper Storage & Lifecycle", () => {
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
        resolution: "1080p",
        subtitle_text: "WAIT TILL THE END 😱",
      });

      assert.ok(clip);
      assert.ok(clip.id);
      assert.strictEqual(clip.user_id, testUserId);
      assert.strictEqual(clip.aspect_ratio, "9:16");
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

  describe("2. YouTube OAuth & Multi-Platform Integration", () => {
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
      // Access token must be encrypted
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

  describe("3. Unified Multi-Platform Publishing Validation", () => {
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
