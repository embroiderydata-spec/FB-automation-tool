import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getPlatformSettings,
  savePlatformSettings,
  DEFAULT_PLATFORM_SETTINGS,
  PlatformSettings,
} from "../lib/settings/persistence";

describe("Platform Settings Persistence & Regression Suite", () => {
  const TEST_USER_ID = "2cd3c4b4-3f80-40a7-96ba-d6ffb702ad2e";
  const TEST_EMAIL = "embroiderydata@gmail.com";
  const SECONDARY_USER_ID = "e0000000-0000-0000-0000-000000000002";

  it("returns default settings when a user has no prior saved settings", async () => {
    const freshUserId = "99999999-9999-4999-9999-999999999999";
    const settings = await getPlatformSettings(freshUserId);

    assert.equal(settings.timezone, "UTC");
    assert.equal(settings.daily_budget_limit, 25.0);
    assert.equal(settings.monthly_budget_limit, 500.0);
    assert.equal(settings.max_cost_per_video, 1.5);
    assert.equal(settings.max_posts_per_day_per_page, 3);
    assert.equal(settings.default_llm_provider, "openai");
    assert.equal(settings.default_video_provider, "replicate");
    assert.equal(settings.default_voice_provider, "elevenlabs");
    assert.equal(settings.auto_publish_default, false);
    assert.equal(settings.require_manual_approval, true);
  });

  it("Test A: Changes Daily Budget Ceiling from 25 to 40 and persists across refresh", async () => {
    await savePlatformSettings(TEST_USER_ID, TEST_EMAIL, {
      daily_budget_limit: 40.0,
    });

    // Simulate page refresh (fresh GET)
    const refreshed = await getPlatformSettings(TEST_USER_ID, TEST_EMAIL);
    assert.equal(refreshed.daily_budget_limit, 40.0);
  });

  it("Test B: Changes Monthly Budget Ceiling from 500 to 750 and persists across refresh", async () => {
    await savePlatformSettings(TEST_USER_ID, TEST_EMAIL, {
      monthly_budget_limit: 750.0,
    });

    const refreshed = await getPlatformSettings(TEST_USER_ID, TEST_EMAIL);
    assert.equal(refreshed.monthly_budget_limit, 750.0);
  });

  it("Test C: Changes Max Cost Per Video and persists across refresh", async () => {
    await savePlatformSettings(TEST_USER_ID, TEST_EMAIL, {
      max_cost_per_video: 3.25,
    });

    const refreshed = await getPlatformSettings(TEST_USER_ID, TEST_EMAIL);
    assert.equal(refreshed.max_cost_per_video, 3.25);
  });

  it("Test D: Changes Max Posts Per Day and persists across refresh", async () => {
    await savePlatformSettings(TEST_USER_ID, TEST_EMAIL, {
      max_posts_per_day_per_page: 6,
    });

    const refreshed = await getPlatformSettings(TEST_USER_ID, TEST_EMAIL);
    assert.equal(refreshed.max_posts_per_day_per_page, 6);
  });

  it("Test E: Changes Timezone to Asia/Karachi and Europe/London and persists across refresh", async () => {
    await savePlatformSettings(TEST_USER_ID, TEST_EMAIL, {
      timezone: "Asia/Karachi",
    });

    let refreshed = await getPlatformSettings(TEST_USER_ID, TEST_EMAIL);
    assert.equal(refreshed.timezone, "Asia/Karachi");

    await savePlatformSettings(TEST_USER_ID, TEST_EMAIL, {
      timezone: "Europe/London",
    });

    refreshed = await getPlatformSettings(TEST_USER_ID, TEST_EMAIL);
    assert.equal(refreshed.timezone, "Europe/London");
  });

  it("Test F: Changes all three AI providers (Anthropic, Runway, OpenAI TTS) and persists across refresh", async () => {
    await savePlatformSettings(TEST_USER_ID, TEST_EMAIL, {
      default_llm_provider: "anthropic",
      default_video_provider: "runway",
      default_voice_provider: "openai",
    });

    const refreshed = await getPlatformSettings(TEST_USER_ID, TEST_EMAIL);
    assert.equal(refreshed.default_llm_provider, "anthropic");
    assert.equal(refreshed.default_video_provider, "runway");
    assert.equal(refreshed.default_voice_provider, "openai");
  });

  it("Test G: Toggles Require Manual Approval (true -> false -> true) and persists across refresh", async () => {
    await savePlatformSettings(TEST_USER_ID, TEST_EMAIL, {
      require_manual_approval: false,
    });

    let refreshed = await getPlatformSettings(TEST_USER_ID, TEST_EMAIL);
    assert.equal(refreshed.require_manual_approval, false);

    await savePlatformSettings(TEST_USER_ID, TEST_EMAIL, {
      require_manual_approval: true,
    });

    refreshed = await getPlatformSettings(TEST_USER_ID, TEST_EMAIL);
    assert.equal(refreshed.require_manual_approval, true);
  });

  it("Test H: Toggles Enable Auto-Publish (false -> true -> false) and persists across refresh", async () => {
    await savePlatformSettings(TEST_USER_ID, TEST_EMAIL, {
      auto_publish_default: true,
    });

    let refreshed = await getPlatformSettings(TEST_USER_ID, TEST_EMAIL);
    assert.equal(refreshed.auto_publish_default, true);

    await savePlatformSettings(TEST_USER_ID, TEST_EMAIL, {
      auto_publish_default: false,
    });

    refreshed = await getPlatformSettings(TEST_USER_ID, TEST_EMAIL);
    assert.equal(refreshed.auto_publish_default, false);
  });

  it("maintains strict user isolation between different accounts", async () => {
    await savePlatformSettings(TEST_USER_ID, TEST_EMAIL, {
      daily_budget_limit: 88.0,
      timezone: "Asia/Dubai",
    });

    await savePlatformSettings(SECONDARY_USER_ID, undefined, {
      daily_budget_limit: 15.0,
      timezone: "America/Chicago",
    });

    const user1Settings = await getPlatformSettings(TEST_USER_ID, TEST_EMAIL);
    const user2Settings = await getPlatformSettings(SECONDARY_USER_ID);

    assert.equal(user1Settings.daily_budget_limit, 88.0);
    assert.equal(user1Settings.timezone, "Asia/Dubai");

    assert.equal(user2Settings.daily_budget_limit, 15.0);
    assert.equal(user2Settings.timezone, "America/Chicago");
  });

  it("Test I: Simulates full logout, fresh login, and verifies settings persist for the account", async () => {
    // Save specific signature settings
    const signatureSettings: Partial<PlatformSettings> = {
      daily_budget_limit: 45.0,
      monthly_budget_limit: 800.0,
      max_cost_per_video: 2.2,
      max_posts_per_day_per_page: 4,
      timezone: "America/New_York",
      default_llm_provider: "openai",
      default_video_provider: "replicate",
      default_voice_provider: "elevenlabs",
      auto_publish_default: true,
      require_manual_approval: false,
      notify_on_publish: true,
      notify_on_failure: true,
    };

    await savePlatformSettings(TEST_USER_ID, TEST_EMAIL, signatureSettings);

    // Simulate logout: memory wiped, re-authenticating as embroiderydata@gmail.com
    const reloadedSettings = await getPlatformSettings(TEST_USER_ID, TEST_EMAIL);

    assert.equal(reloadedSettings.daily_budget_limit, 45.0);
    assert.equal(reloadedSettings.monthly_budget_limit, 800.0);
    assert.equal(reloadedSettings.max_cost_per_video, 2.2);
    assert.equal(reloadedSettings.max_posts_per_day_per_page, 4);
    assert.equal(reloadedSettings.timezone, "America/New_York");
    assert.equal(reloadedSettings.default_llm_provider, "openai");
    assert.equal(reloadedSettings.default_video_provider, "replicate");
    assert.equal(reloadedSettings.default_voice_provider, "elevenlabs");
    assert.equal(reloadedSettings.auto_publish_default, true);
    assert.equal(reloadedSettings.require_manual_approval, false);
    assert.equal(reloadedSettings.notify_on_publish, true);
    assert.equal(reloadedSettings.notify_on_failure, true);
  });
});
