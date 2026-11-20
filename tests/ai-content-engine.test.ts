import { test, describe } from "node:test";
import assert from "node:assert";
import { getAIConfig, OPENAI_MISSING_KEY_MESSAGE } from "../lib/ai/config";
import { estimateTokenCost } from "../lib/ai/pricing";
import { checkRateLimit } from "../lib/ai/rate-limiter";
import {
  buildNicheContext,
  buildIdeaGenerationPrompt,
  buildHookGenerationPrompt,
  buildScriptGenerationPrompt,
  buildStoryboardPrompt,
  buildSingleSceneRegenPrompt,
} from "../lib/ai/prompts";

describe("AI Content Engine & Provider Suite", () => {
  test("getAIConfig returns default model and identifies unconfigured state when key is missing", () => {
    const originalKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    const config = getAIConfig();
    assert.strictEqual(config.isConfigured, false);
    assert.strictEqual(config.model, "gpt-4o-mini");
    assert.strictEqual(config.maxRequestsPerMinute, 20);
    assert.strictEqual(config.maxDailyBudget, 10.0);

    if (originalKey) {
      process.env.OPENAI_API_KEY = originalKey;
    }
  });

  test("getAIConfig correctly identifies configured state when valid key is set", () => {
    const originalKey = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = "sk-test-mock-key-1234567890abcdef";

    const config = getAIConfig();
    assert.strictEqual(config.isConfigured, true);
    assert.strictEqual(config.apiKey, "sk-test-mock-key-1234567890abcdef");

    if (originalKey) {
      process.env.OPENAI_API_KEY = originalKey;
    } else {
      delete process.env.OPENAI_API_KEY;
    }
  });

  test("estimateTokenCost accurately computes USD cost based on token usage", () => {
    // For gpt-4o-mini: $0.15/1M input, $0.60/1M output
    // 100,000 input = $0.015, 10,000 output = $0.006 => total = $0.021
    const cost = estimateTokenCost("gpt-4o-mini", 100000, 10000);
    assert.strictEqual(cost, 0.021);

    // Zero tokens cost zero
    assert.strictEqual(estimateTokenCost("gpt-4o-mini", 0, 0), 0);
  });

  test("checkRateLimit allows requests under threshold and blocks when limit is exceeded", () => {
    const key = `test-user-${Date.now()}`;
    const maxRequests = 3;

    // Requests 1, 2, 3 should succeed
    assert.strictEqual(checkRateLimit(key, maxRequests, 60).allowed, true);
    assert.strictEqual(checkRateLimit(key, maxRequests, 60).allowed, true);
    assert.strictEqual(checkRateLimit(key, maxRequests, 60).allowed, true);

    // Request 4 should be rejected
    const fourth = checkRateLimit(key, maxRequests, 60);
    assert.strictEqual(fourth.allowed, false);
    assert.strictEqual(fourth.remaining, 0);
    assert.ok(fourth.resetMs > 0);
  });

  test("buildNicheContext correctly injects all Page niche parameters", () => {
    const context = buildNicheContext({
      page_name: "Funny Animal Moments",
      niche: "Animals & Pets",
      sub_niche: "Rescue Puppies & Humor",
      target_audience: "US Dog Owners (25-45)",
      target_country: "US",
      language: "en",
      ai_tone: "hilarious, warm, family-friendly",
      content_style: "rapid-fire vertical skits",
      page_description: "Daily funny animal videos that make your day brighter.",
      topics_to_cover: ["Puppy training bloopers", "Golden retrievers"],
      topics_to_avoid: ["Animal distress", "Political jokes"],
      preferred_content_format: "reels",
      video_duration_min: 30,
      video_duration_max: 45,
    });

    assert.ok(context.includes("Funny Animal Moments"));
    assert.ok(context.includes("Rescue Puppies & Humor"));
    assert.ok(context.includes("hilarious, warm, family-friendly"));
    assert.ok(context.includes("STRICTLY AVOID: Animal distress, Political jokes"));
    assert.ok(context.includes("30 to 45 seconds"));
  });

  test("buildIdeaGenerationPrompt requires structured JSON output with all necessary fields", () => {
    const { system, user } = buildIdeaGenerationPrompt("TEST CONTEXT", {
      topic: "Smart Home Gadgets",
      category: "Life Hack",
      numIdeas: 3,
    });

    assert.ok(system.includes("JSON"));
    assert.ok(user.includes("Generate 3 distinct"));
    assert.ok(user.includes("Smart Home Gadgets"));
    assert.ok(user.includes("viral_potential"));
    assert.ok(user.includes("suggested_hook"));
    assert.ok(user.includes("originality_notes"));
  });

  test("buildHookGenerationPrompt enforces hook styles and anti-clickbait constraints", () => {
    const { system, user } = buildHookGenerationPrompt("TEST CONTEXT", {
      topic: "Personal Finance",
      hookStyle: "shock",
      numHooks: 5,
    });

    assert.ok(system.includes("Never fabricate false facts"));
    assert.ok(system.includes("SHOCK"));
    assert.ok(user.includes("at least 5 unique"));
    assert.ok(user.includes("angle_explanation"));
  });

  test("buildScriptGenerationPrompt formats Reels script structure with hook, narrative, and CTA", () => {
    const { system, user } = buildScriptGenerationPrompt("TEST CONTEXT", {
      title: "How to Double Your Savings",
      hook: "Stop putting your savings in a traditional bank account.",
      topic: "High-yield savings accounts",
      targetDurationSeconds: 45,
    });

    assert.ok(system.includes("1. Opening Hook"));
    assert.ok(system.includes("3. Main Content"));
    assert.ok(system.includes("5. Payoff & Ending"));
    assert.ok(user.includes("Stop putting your savings"));
    assert.ok(user.includes("scenes_breakdown"));
  });

  test("buildStoryboardPrompt breaks narration into vertical 9:16 scenes with camera directions", () => {
    const { system, user } = buildStoryboardPrompt("TEST CONTEXT", {
      title: "Crypto Explained in 30 Seconds",
      hook: "Think Bitcoin is confusing? Watch this.",
      full_narration: "Here is what blockchain really does in simple terms. First, imagine a ledger...",
      estimated_duration_seconds: 30,
    });

    assert.ok(system.includes("9:16 vertical"));
    assert.ok(user.includes("Crypto Explained in 30 Seconds"));
    assert.ok(user.includes("camera_direction"));
    assert.ok(user.includes("motion_description"));
    assert.ok(user.includes("video_prompt"));
  });
});
