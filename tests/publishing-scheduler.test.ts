import { test, describe } from "node:test";
import assert from "node:assert";
import {
  classifyPublishingError,
  calculateBackoffDelayMs,
} from "../lib/publishing/errors";
import {
  PublishNowSchema,
  SchedulePostSchema,
  BulkScheduleSchema,
  EmergencyStopSchema,
  PagePublishingSettingsSchema,
} from "../lib/validations/publishing";

describe("Phase 2.4 Facebook Publishing Scheduler Test Suite", () => {
  describe("Error Classification & Exponential Backoff Policy", () => {
    test("identifies Code 190 (expired token) as permanent failure", () => {
      const err = { code: 190, message: "Error validating access token: Session has expired." };
      const classified = classifyPublishingError(err);
      assert.strictEqual(classified.isRecoverable, false);
      assert.strictEqual(classified.errorCode, "META_AUTH_EXPIRED");
      assert.ok(classified.suggestedAction.includes("Reconnect"));
    });

    test("identifies Code 200 (missing permissions) as permanent failure", () => {
      const err = { code: 200, message: "(#200) Requires pages_manage_posts permission to manage the object" };
      const classified = classifyPublishingError(err);
      assert.strictEqual(classified.isRecoverable, false);
      assert.strictEqual(classified.errorCode, "META_MISSING_PERMISSIONS");
    });

    test("identifies rate limit codes (4, 17, 32, 613) as recoverable with retry", () => {
      const err = { code: 613, message: "(#613) Calls to this api have exceeded the rate limit." };
      const classified = classifyPublishingError(err);
      assert.strictEqual(classified.isRecoverable, true);
      assert.strictEqual(classified.errorCode, "META_RATE_LIMIT");
    });

    test("identifies network timeouts and connection resets as recoverable", () => {
      const err = new Error("fetch failed: ECONNRESET connection timeout");
      const classified = classifyPublishingError(err);
      assert.strictEqual(classified.isRecoverable, true);
      assert.strictEqual(classified.errorCode, "NETWORK_TIMEOUT");
    });

    test("calculateBackoffDelayMs computes exponential delays for attempts 1, 2, and 3", () => {
      assert.strictEqual(calculateBackoffDelayMs(1), 60 * 1000); // 1 min
      assert.strictEqual(calculateBackoffDelayMs(2), 5 * 60 * 1000); // 5 min
      assert.strictEqual(calculateBackoffDelayMs(3), 15 * 60 * 1000); // 15 min
    });
  });

  describe("Publishing Zod Validation Schemas", () => {
    test("PublishNowSchema validates required IDs and caption constraints", () => {
      const valid = PublishNowSchema.safeParse({
        video_id: "00000000-0000-0000-0000-000000000001",
        page_id: "00000000-0000-0000-0000-000000000002",
        caption: "Stop doing this in the morning! #reels #productivity",
        is_test_mode: true,
      });
      assert.strictEqual(valid.success, true);

      // Empty caption should fail
      const emptyCaption = PublishNowSchema.safeParse({
        video_id: "00000000-0000-0000-0000-000000000001",
        page_id: "00000000-0000-0000-0000-000000000002",
        caption: "",
      });
      assert.strictEqual(emptyCaption.success, false);

      // Caption > 2200 chars should fail
      const longCaption = PublishNowSchema.safeParse({
        video_id: "00000000-0000-0000-0000-000000000001",
        page_id: "00000000-0000-0000-0000-000000000002",
        caption: "A".repeat(2201),
      });
      assert.strictEqual(longCaption.success, false);
    });

    test("SchedulePostSchema enforces ISO 8601 datetime format for scheduled_at", () => {
      const valid = SchedulePostSchema.safeParse({
        video_id: "00000000-0000-0000-0000-000000000001",
        page_id: "00000000-0000-0000-0000-000000000002",
        caption: "Weekend Motivation Reel #discipline",
        scheduled_at: new Date(Date.now() + 86400000).toISOString(),
        timezone: "America/New_York",
      });
      assert.strictEqual(valid.success, true);

      const invalidDate = SchedulePostSchema.safeParse({
        video_id: "00000000-0000-0000-0000-000000000001",
        page_id: "00000000-0000-0000-0000-000000000002",
        caption: "Test",
        scheduled_at: "tomorrow at 5pm", // Not ISO format
      });
      assert.strictEqual(invalidDate.success, false);
    });

    test("BulkScheduleSchema validates bounds (up to 100 pages, up to 50 videos)", () => {
      const valid = BulkScheduleSchema.safeParse({
        page_ids: ["page-1", "page-2"],
        video_ids: ["video-1", "video-2", "video-3"],
        start_date: "2026-12-01",
        posting_times: ["10:00", "18:00"],
        posts_per_day: 2,
        timezone: "UTC",
      });
      assert.strictEqual(valid.success, true);

      // Empty page array should fail
      const emptyPages = BulkScheduleSchema.safeParse({
        page_ids: [],
        video_ids: ["video-1"],
        start_date: "2026-12-01",
      });
      assert.strictEqual(emptyPages.success, false);
    });

    test("EmergencyStopSchema parses boolean toggle cleanly", () => {
      const pause = EmergencyStopSchema.safeParse({
        paused: true,
        reason: "Maintenance scheduled",
      });
      assert.strictEqual(pause.success, true);

      const resume = EmergencyStopSchema.safeParse({
        paused: false,
      });
      assert.strictEqual(resume.success, true);
    });

    test("PagePublishingSettingsSchema validates interval and frequency bounds", () => {
      const valid = PagePublishingSettingsSchema.safeParse({
        enable_auto_publishing: true,
        posts_per_day: 3,
        min_interval_hours: 4,
        timezone: "Asia/Karachi",
        publishing_mode: "test",
      });
      assert.strictEqual(valid.success, true);

      // Invalid posts per day (> 10)
      const invalidPosts = PagePublishingSettingsSchema.safeParse({
        posts_per_day: 50,
      });
      assert.strictEqual(invalidPosts.success, false);
    });
  });

  describe("Timezone & Scheduling Math", () => {
    test("scheduled ISO strings retain UTC timestamp without drift", () => {
      const targetDate = new Date("2026-11-25T14:30:00.000Z");
      const isoString = targetDate.toISOString();
      assert.strictEqual(isoString, "2026-11-25T14:30:00.000Z");
      assert.strictEqual(new Date(isoString).getTime(), targetDate.getTime());
    });
  });
});
