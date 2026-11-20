import { test, describe } from "node:test";
import assert from "node:assert";
import {
  PageNicheSettingsSchema,
  ContentIdeaGenerateSchema,
  HookGenerateSchema,
  ScriptGenerateSchema,
  ScriptUpdateSchema,
  StoryboardSceneUpdateSchema,
  ContentStatusUpdateSchema,
} from "../lib/validations/content";

describe("Content Engine Zod Validations Suite", () => {
  test("PageNicheSettingsSchema accepts valid niche and audience parameters", () => {
    const input = {
      niche: "Fitness & Nutrition",
      sub_niche: "HIIT for Beginners",
      target_audience: "Men and women ages 20-35",
      target_country: "US",
      language: "en",
      ai_tone: "encouraging, high energy",
      content_style: "rapid workout demonstrations",
      topics_to_cover: ["15-minute home workouts", "Protein intake"],
      topics_to_avoid: ["Dangerous extreme diets"],
      preferred_content_format: "reels",
      video_duration_min: 30,
      video_duration_max: 60,
    };

    const parsed = PageNicheSettingsSchema.safeParse(input);
    assert.strictEqual(parsed.success, true);
  });

  test("ContentIdeaGenerateSchema validates page list bounds (1 to 100 pages)", () => {
    // Empty array rejected
    const emptyResult = ContentIdeaGenerateSchema.safeParse({ page_ids: [] });
    assert.strictEqual(emptyResult.success, false);

    // Valid array of pages accepted
    const validResult = ContentIdeaGenerateSchema.safeParse({
      page_ids: ["page-1", "page-2"],
      category: "Tutorial",
      duration_seconds: 45,
    });
    assert.strictEqual(validResult.success, true);
    if (validResult.success) {
      assert.strictEqual(validResult.data.num_ideas_per_page, 3); // default
    }
  });

  test("HookGenerateSchema enforces allowed hook styles and minimum length", () => {
    const valid = HookGenerateSchema.safeParse({
      topic: "Passive Income",
      hook_style: "curiosity",
      num_hooks: 5,
    });
    assert.strictEqual(valid.success, true);

    const invalidStyle = HookGenerateSchema.safeParse({
      topic: "Passive Income",
      hook_style: "invalid_unsupported_style",
    });
    assert.strictEqual(invalidStyle.success, false);
  });

  test("ScriptGenerateSchema requires hook and topic", () => {
    const missingHook = ScriptGenerateSchema.safeParse({
      topic: "Cooking Hacks",
    });
    assert.strictEqual(missingHook.success, false);

    const valid = ScriptGenerateSchema.safeParse({
      hook: "This 10-second kitchen trick will change everything.",
      topic: "Quick onion cutting",
      target_duration_seconds: 45,
    });
    assert.strictEqual(valid.success, true);
  });

  test("StoryboardSceneUpdateSchema validates scene types", () => {
    const validScene = StoryboardSceneUpdateSchema.safeParse({
      scene_number: 1,
      duration: 3.5,
      narration: "Here is what happens first.",
      visual_description: "Chef slices the onion with precision.",
      video_prompt: "Cinematic close-up of knife slicing red onion.",
      scene_type: "opening",
    });
    assert.strictEqual(validScene.success, true);

    const invalidScene = StoryboardSceneUpdateSchema.safeParse({
      scene_type: "unsupported_scene_type",
    });
    assert.strictEqual(invalidScene.success, false);
  });

  test("ContentStatusUpdateSchema validates lifecycle states", () => {
    const states = [
      "draft",
      "hook_generated",
      "script_generated",
      "script_in_review",
      "script_approved",
      "storyboard_generated",
      "storyboard_approved",
      "ready_for_video",
      "rejected",
      "archived",
    ];

    for (const st of states) {
      assert.strictEqual(
        ContentStatusUpdateSchema.safeParse({ status: st }).success,
        true
      );
    }

    assert.strictEqual(
      ContentStatusUpdateSchema.safeParse({ status: "bogus_state" }).success,
      false
    );
  });
});
