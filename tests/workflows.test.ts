import { test, describe } from "node:test";
import assert from "node:assert";
import {
  WORKFLOW_STAGES_ORDER,
  STAGE_PROGRESS_MAP,
  STAGE_LABELS,
  WorkflowStage,
} from "../lib/workflow/types";
import {
  runQualityControl,
  QualityControlInputs,
} from "../lib/workflow/quality-control";
import {
  calculateTextSimilarity,
  generatePageVariations,
  validateDuplicateContentMatrix,
} from "../lib/workflow/page-variations";
import {
  estimateWorkflowCost,
  UNIT_COST_ESTIMATES,
  checkBudgetConstraints,
} from "../lib/workflow/budget";
import {
  CreateWorkflowSchema,
  WorkflowActionSchema,
  RegenerateSceneSchema,
  WorkflowConfigurationSchema,
} from "../lib/validations/workflow";

describe("Phase 2.5 AI Automation Workflow Suite", () => {
  describe("16-Stage Pipeline Structure & Progression", () => {
    test("defines all 16 consecutive stages in correct business order", () => {
      assert.strictEqual(WORKFLOW_STAGES_ORDER.length, 16);
      assert.strictEqual(WORKFLOW_STAGES_ORDER[0], "IDEA");
      assert.strictEqual(WORKFLOW_STAGES_ORDER[3], "SCRIPT_GENERATION");
      assert.strictEqual(WORKFLOW_STAGES_ORDER[4], "SCRIPT_APPROVAL");
      assert.strictEqual(WORKFLOW_STAGES_ORDER[5], "STORYBOARD_GENERATION");
      assert.strictEqual(WORKFLOW_STAGES_ORDER[6], "SCENE_GENERATION");
      assert.strictEqual(WORKFLOW_STAGES_ORDER[9], "VIDEO_COMPOSITION");
      assert.strictEqual(WORKFLOW_STAGES_ORDER[10], "QUALITY_CONTROL");
      assert.strictEqual(WORKFLOW_STAGES_ORDER[11], "FINAL_VIDEO_APPROVAL");
      assert.strictEqual(WORKFLOW_STAGES_ORDER[12], "PAGE_SELECTION");
      assert.strictEqual(WORKFLOW_STAGES_ORDER[13], "CAPTION_GENERATION");
      assert.strictEqual(WORKFLOW_STAGES_ORDER[14], "SCHEDULING");
      assert.strictEqual(WORKFLOW_STAGES_ORDER[15], "PUBLISHING_QUEUE");
    });

    test("progress percentages monotonically increase to 100%", () => {
      let prev = 0;
      for (const stage of WORKFLOW_STAGES_ORDER) {
        const p = STAGE_PROGRESS_MAP[stage];
        assert.ok(p > prev, `Stage ${stage} progress (${p}) should be greater than previous (${prev})`);
        prev = p;
      }
      assert.strictEqual(STAGE_PROGRESS_MAP.PUBLISHING_QUEUE, 100);
    });

    test("human-readable labels exist for all 16 stages", () => {
      for (const stage of WORKFLOW_STAGES_ORDER) {
        assert.ok(STAGE_LABELS[stage], `Missing label for stage ${stage}`);
      }
    });
  });

  describe("Automated Video Quality Control Engine", () => {
    test("passes fully compliant 9:16 vertical video asset", () => {
      const inputs: QualityControlInputs = {
        videoExists: true,
        videoPath: "videos/user1/test_reel.mp4",
        durationSeconds: 45,
        expectedDuration: 45,
        resolution: "1080x1920",
        aspectRatio: "9:16",
        fileSizeBytes: 18_000_000,
        audioExists: true,
        audioDurationSeconds: 44.5,
        subtitleFileExists: true,
        actualSceneCount: 4,
        expectedSceneCount: 4,
        missingScenesCount: 0,
      };

      const report = runQualityControl(inputs);
      assert.strictEqual(report.overall_status, "passed");
      assert.ok(report.checks.length >= 8);
      assert.ok(report.summary.includes("Passed"));
    });

    test("fails if video file is missing or 0 bytes", () => {
      const inputs: QualityControlInputs = {
        videoExists: false,
        durationSeconds: 0,
        resolution: "1080x1920",
        aspectRatio: "9:16",
        audioExists: false,
        subtitleFileExists: false,
      };

      const report = runQualityControl(inputs);
      assert.strictEqual(report.overall_status, "failed");
      const videoCheck = report.checks.find((c) => c.id === "video_existence");
      assert.strictEqual(videoCheck?.status, "failed");
    });

    test("fails if aspect ratio is non-vertical (e.g. 16:9)", () => {
      const inputs: QualityControlInputs = {
        videoExists: true,
        videoPath: "videos/user1/horizontal.mp4",
        durationSeconds: 30,
        resolution: "1920x1080",
        aspectRatio: "16:9",
        audioExists: true,
        subtitleFileExists: true,
        fileSizeBytes: 10_000_000,
      };

      const report = runQualityControl(inputs);
      assert.strictEqual(report.overall_status, "failed");
      const arCheck = report.checks.find((c) => c.id === "aspect_ratio");
      assert.strictEqual(arCheck?.status, "failed");
    });

    test("fails if video duration is less than 10 seconds", () => {
      const inputs: QualityControlInputs = {
        videoExists: true,
        videoPath: "videos/user1/too_short.mp4",
        durationSeconds: 5.2,
        resolution: "1080x1920",
        aspectRatio: "9:16",
        audioExists: true,
        subtitleFileExists: true,
        fileSizeBytes: 2_000_000,
      };

      const report = runQualityControl(inputs);
      assert.strictEqual(report.overall_status, "failed");
      const durationCheck = report.checks.find((c) => c.id === "duration");
      assert.strictEqual(durationCheck?.status, "failed");
    });

    test("warns if audio drift exceeds tolerance without outright failing video", () => {
      const inputs: QualityControlInputs = {
        videoExists: true,
        videoPath: "videos/user1/drift.mp4",
        durationSeconds: 40,
        expectedDuration: 40,
        resolution: "1080x1920",
        aspectRatio: "9:16",
        fileSizeBytes: 15_000_000,
        audioExists: true,
        audioDurationSeconds: 36.0, // 4.0s drift > 2.5s tolerance
        subtitleFileExists: true,
        actualSceneCount: 4,
        expectedSceneCount: 4,
        missingScenesCount: 0,
      };

      const report = runQualityControl(inputs);
      assert.strictEqual(report.overall_status, "warning");
      const syncCheck = report.checks.find((c) => c.id === "audio_sync");
      assert.strictEqual(syncCheck?.status, "warning");
    });
  });

  describe("Page-Specific Variations & Duplicate Content Guard", () => {
    test("calculates accurate Jaccard token similarity", () => {
      const str1 = "The secret habit to scale your business fast";
      const str2 = "The secret habit to scale your business fast";
      const str3 = "Stop scrolling if you want to grow rapidly today";

      assert.strictEqual(calculateTextSimilarity(str1, str2), 1.0);
      assert.ok(calculateTextSimilarity(str1, str3) < 0.3);
      assert.strictEqual(calculateTextSimilarity("", str1), 0);
    });

    test("generates customized variations across multiple target pages", () => {
      const pages = [
        { id: "page_1", page_name: "TechPulse Daily" },
        { id: "page_2", page_name: "Mindset Champions" },
        { id: "page_3", page_name: "Finance Hacks" },
      ];

      const variations = generatePageVariations({
        baseTitle: "Growth Framework",
        baseHook: "Most people waste hours guessing what works.",
        baseNarration: "Here are 3 habits to scale 10x faster.",
        baseHashtags: ["#reels", "#growth"],
        pages,
      });

      assert.strictEqual(variations.length, 3);
      assert.notStrictEqual(variations[0].custom_hook, variations[1].custom_hook);
      assert.notStrictEqual(variations[1].custom_hook, variations[2].custom_hook);
      assert.ok(variations[0].caption.includes("#techpulsedaily"));
      assert.ok(variations[1].caption.includes("#mindsetchampions"));
    });

    test("detects duplicate content risk when similarity > 0.75", () => {
      const identicalVariations = [
        {
          page_id: "p1",
          page_name: "Page A",
          custom_hook: "Stop scrolling right now",
          caption: "This exact same text repeated on page A for tests and checks",
          hashtags: ["#reels"],
        },
        {
          page_id: "p2",
          page_name: "Page B",
          custom_hook: "Stop scrolling right now",
          caption: "This exact same text repeated on page A for tests and checks",
          hashtags: ["#reels"],
        },
      ];

      const check = validateDuplicateContentMatrix(identicalVariations);
      assert.strictEqual(check.isSafe, false);
      assert.strictEqual(check.warnings.length, 1);
      assert.ok(check.warnings[0].similarity > 0.75);
    });
  });

  describe("Budget Management & Cost Forecasting", () => {
    test("estimateWorkflowCost aggregates script, voice, scene, and render costs", () => {
      const cost = estimateWorkflowCost({
        num_scenes: 4,
        video_duration: 45,
        video_provider: "replicate",
        voice_provider: "elevenlabs",
      });

      // 4 scenes * 0.08 = 0.32, voice ~0.0225, script ~0.015, render ~0.01 -> ~0.36
      assert.ok(cost > 0.3);
      assert.ok(cost < 1.0);
    });

    test("blocks execution when single video cost exceeds user limit", async () => {
      const mockSupabase: any = {
        from: () => ({
          select: () => ({
            eq: () => ({
              gte: () => Promise.resolve({ data: [] }),
            }),
          }),
        }),
      };

      const status = await checkBudgetConstraints(mockSupabase, "user_123", {
        dailyBudgetLimit: 50,
        maxCostPerVideo: 2.0,
        currentWorkflowCost: 2.8, // Exceeds 2.0
      });

      assert.strictEqual(status.canProceed, false);
      assert.ok(status.reason?.includes("exceeded maximum allowed cost"));
    });

    test("blocks execution when daily user spend exceeds daily budget cap", async () => {
      const mockSupabase: any = {
        from: () => ({
          select: () => ({
            eq: () => ({
              gte: () =>
                Promise.resolve({
                  data: [{ actual_cost: 15.0 }, { actual_cost: 12.0 }],
                }),
            }),
          }),
        }),
      };

      const status = await checkBudgetConstraints(mockSupabase, "user_123", {
        dailyBudgetLimit: 25.0, // Total spend 27.0 > 25.0
        maxCostPerVideo: 3.0,
        currentWorkflowCost: 0.5,
      });

      assert.strictEqual(status.canProceed, false);
      assert.ok(status.reason?.includes("Daily AI generation budget limit reached"));
    });
  });

  describe("Zod Validation Schemas", () => {
    test("CreateWorkflowSchema validates valid payload", () => {
      const validPayload = {
        workflow_name: "Daily Motivation Blitz",
        approval_mode: "final_video_approval",
        configuration: {
          niche: "Fitness & Motivation",
          category: "Workouts",
          video_duration: 45,
          num_scenes: 4,
          aspect_ratio: "9:16",
          resolution: "1080x1920",
          video_provider: "replicate",
          voice_provider: "elevenlabs",
          subtitle_preset: "bold_viral",
          target_page_ids: ["page_1", "page_2"],
          approval_mode: "final_video_approval",
          max_cost_per_video: 3.0,
          daily_budget_limit: 30.0,
        },
      };

      const parsed = CreateWorkflowSchema.safeParse(validPayload);
      assert.ok(parsed.success);
    });

    test("CreateWorkflowSchema rejects empty target pages", () => {
      const invalidPayload = {
        workflow_name: "Empty Pages Test",
        configuration: {
          target_page_ids: [],
        },
      };

      const parsed = CreateWorkflowSchema.safeParse(invalidPayload);
      assert.strictEqual(parsed.success, false);
    });

    test("WorkflowActionSchema accepts valid actions and stages", () => {
      const validActions = [
        { action: "start" },
        { action: "pause" },
        { action: "resume" },
        { action: "approve_script" },
        { action: "approve_video" },
        { action: "retry", target_stage: "SCENE_GENERATION" },
      ];

      for (const act of validActions) {
        const parsed = WorkflowActionSchema.safeParse(act);
        assert.ok(parsed.success);
      }
    });

    test("RegenerateSceneSchema requires scene_id and valid prompt", () => {
      const valid = { scene_id: "scene_abc", prompt: "Cinematic glowing particles" };
      assert.ok(RegenerateSceneSchema.safeParse(valid).success);

      const invalid = { scene_id: "", prompt: "Hi" };
      assert.strictEqual(RegenerateSceneSchema.safeParse(invalid).success, false);
    });
  });
});
