import { test, describe } from "node:test";
import assert from "node:assert";
import {
  normalizeMetric,
  normalizePageInsights,
  normalizeVideoInsights,
} from "../lib/analytics/normalization";
import {
  calculateEngagementRateByReach,
  calculateEngagementRateByViews,
  calculateAverageWatchPercentage,
  calculatePerformanceScore,
  identifyPagePerformers,
} from "../lib/analytics/metrics";
import {
  classifyHookCategory,
  generatePerformanceIntelligence,
} from "../lib/analytics/ai-intelligence";
import {
  exportPagesToCsv,
  exportVideosToCsv,
  exportGrowthSnapshotsToCsv,
} from "../lib/analytics/csv-export";
import {
  AnalyticsFilterSchema,
  VideoAnalyticsQuerySchema,
  SyncAnalyticsSchema,
  ExportCsvSchema,
} from "../lib/validations/analytics";
import { VideoPerformanceItem } from "../lib/analytics/types";

describe("Phase 2.6 Real Facebook Analytics & Intelligence Suite", () => {
  describe("Metric Normalization & State Differentiation", () => {
    test("normalizes present metric into available numeric value", () => {
      const mockData = [
        { name: "page_impressions", values: [{ value: 12500 }], period: "day" },
      ];
      const result = normalizeMetric("page_impressions", mockData);
      assert.strictEqual(result.status, "available");
      assert.strictEqual(result.numericValue, 12500);
    });

    test("strictly distinguishes genuine zero from missing data", () => {
      const mockData = [
        { name: "page_video_views", values: [{ value: 0 }], period: "day" },
      ];
      const result = normalizeMetric("page_video_views", mockData);
      assert.strictEqual(result.status, "zero");
      assert.strictEqual(result.numericValue, 0);
    });

    test("returns missing status when metric exists in array but values array is empty", () => {
      const mockData = [{ name: "page_impressions", values: [] }];
      const result = normalizeMetric("page_impressions", mockData);
      assert.strictEqual(result.status, "missing");
      assert.strictEqual(result.numericValue, null);
    });

    test("returns unsupported status when metric name is absent from payload", () => {
      const mockData = [{ name: "other_metric", values: [{ value: 50 }] }];
      const result = normalizeMetric("page_impressions", mockData);
      assert.strictEqual(result.status, "unsupported");
      assert.strictEqual(result.numericValue, null);
    });

    test("normalizes watch time milliseconds into seconds accurately", () => {
      const mockData = [
        { name: "total_video_avg_time_watched", values: [{ value: 14250 }] },
      ];
      const res = normalizeVideoInsights({ data: mockData });
      assert.strictEqual(res.averageWatchTimeSeconds.numericValue, 14.25);
    });

    test("parses retention curve object into sorted percentage array", () => {
      const mockData = [
        {
          name: "total_video_retention_graph_autoplayed",
          values: [
            {
              value: {
                "0%": 100,
                "50%": 68,
                "100%": 42,
                "25%": 85,
              },
            },
          ],
        },
      ];
      const res = normalizeVideoInsights({ data: mockData });
      assert.strictEqual(res.retentionCurve.length, 4);
      assert.strictEqual(res.retentionCurve[0].percent, 0);
      assert.strictEqual(res.retentionCurve[1].percent, 25);
      assert.strictEqual(res.retentionCurve[2].percent, 50);
      assert.strictEqual(res.retentionCurve[3].percent, 100);
    });
  });

  describe("Engagement Rate & Performance Calculations", () => {
    test("calculates Engagement Rate by Reach with valid figures", () => {
      const rate = calculateEngagementRateByReach(250, 5000);
      assert.strictEqual(rate, 5.0); // (250 / 5000) * 100 = 5.0%
    });

    test("returns null for Engagement Rate by Reach when reach is zero or missing", () => {
      assert.strictEqual(calculateEngagementRateByReach(50, 0), null);
      assert.strictEqual(calculateEngagementRateByReach(50, null), null);
      assert.strictEqual(calculateEngagementRateByReach(null, 5000), null);
    });

    test("calculates Engagement Rate by Views correctly", () => {
      const rate = calculateEngagementRateByViews(120, 1500);
      assert.strictEqual(rate, 8.0); // (120 / 1500) * 100 = 8.0%
    });

    test("returns null for Engagement Rate by Views when views is zero or missing", () => {
      assert.strictEqual(calculateEngagementRateByViews(120, 0), null);
      assert.strictEqual(calculateEngagementRateByViews(null, 1500), null);
    });

    test("calculates Average Watch Percentage bounded at 100%", () => {
      const pct = calculateAverageWatchPercentage(30, 45);
      assert.strictEqual(pct, 66.7); // (30 / 45) * 100 = 66.7%

      // When watch time exceeds length due to replays, caps at 100%
      const capped = calculateAverageWatchPercentage(55, 45);
      assert.strictEqual(capped, 100.0);
    });

    test("returns null for Average Watch Percentage when duration <= 0", () => {
      assert.strictEqual(calculateAverageWatchPercentage(20, 0), null);
      assert.strictEqual(calculateAverageWatchPercentage(null, 45), null);
    });

    test("calculatePerformanceScore outputs score on 0 to 100 scale", () => {
      const score = calculatePerformanceScore({
        views: 10000,
        reach: 8500,
        engagements: 850,
        avgWatchPercentage: 75.0,
      });
      assert.ok(score !== null);
      assert.ok(score >= 0 && score <= 100);
      assert.ok(score > 50); // Strong metrics yield score above 50
    });

    test("identifyPagePerformers flags top and bottom pages in multi-page cohort", () => {
      const cohort = [
        { views: 50000, engagement: 4200, followers: 12000 }, // High
        { views: 1200, engagement: 50, followers: 400 }, // Low
        { views: 15000, engagement: 1200, followers: 3500 }, // Mid
      ];
      const { highestIndex, lowestIndex } = identifyPagePerformers(cohort);
      assert.strictEqual(highestIndex, 0);
      assert.strictEqual(lowestIndex, 1);
    });
  });

  describe("AI Performance Intelligence & Hook Analysis", () => {
    test("classifies hook categories accurately based on linguistic patterns", () => {
      assert.strictEqual(classifyHookCategory("Why 99% of creators fail in the first 30 days"), "Question");
      assert.strictEqual(classifyHookCategory("Stop making this fatal automation mistake"), "Problem/Solution");
      assert.strictEqual(classifyHookCategory("The hidden secret top agencies never share"), "Curiosity");
      assert.strictEqual(classifyHookCategory("This insane tool generates full videos in seconds"), "Shock");
      assert.strictEqual(classifyHookCategory("Years ago when I started with zero followers"), "Story");
      assert.strictEqual(classifyHookCategory("Most smartphones hold more power than NASA in 1969"), "Unexpected Fact");
    });

    test("returns insufficient_data status when fewer than 2 videos have view telemetry", () => {
      const emptyVideos: VideoPerformanceItem[] = [
        {
          id: "v1",
          meta_video_id: "m1",
          title: "Test Reel",
          page_id: "p1",
          page_name: "Page A",
          published_date: "2026-11-20",
          duration_seconds: 45,
          views: 0,
          reach: 0,
          impressions: 0,
          total_plays: 0,
          replay_count: 0,
          avg_watch_time: null,
          avg_watch_percentage: null,
          likes: 0,
          comments: 0,
          shares: 0,
          follows: 0,
          engagement_rate_by_reach: null,
          engagement_rate_by_views: null,
          performance_score: null,
        },
      ];

      const res = generatePerformanceIntelligence(emptyVideos);
      assert.strictEqual(res.hasSufficientData, false);
      assert.ok(res.statusMessage.includes("Insufficient performance data"));
      assert.strictEqual(res.insights[0].confidence_level, "insufficient_data");
    });

    test("generates duration and hook insights when sufficient video telemetry is provided", () => {
      const sampleVideos: VideoPerformanceItem[] = [
        {
          id: "v1",
          meta_video_id: "m1",
          title: "Why nobody talks about this habit?",
          page_id: "p1",
          page_name: "TechPulse",
          published_date: "2026-11-18T14:00:00Z",
          duration_seconds: 28, // short
          views: 12000,
          reach: 9500,
          impressions: 14000,
          total_plays: 13000,
          replay_count: 1000,
          avg_watch_time: 24.5,
          avg_watch_percentage: 87.5,
          likes: 850,
          comments: 120,
          shares: 340,
          follows: 45,
          engagement_rate_by_reach: 13.7,
          engagement_rate_by_views: 10.9,
          performance_score: 84.5,
          hook_text: "Why nobody talks about this habit?",
        },
        {
          id: "v2",
          meta_video_id: "m2",
          title: "Stop making this financial mistake",
          page_id: "p1",
          page_name: "TechPulse",
          published_date: "2026-11-15T18:00:00Z",
          duration_seconds: 55, // long
          views: 4500,
          reach: 3800,
          impressions: 5200,
          total_plays: 4600,
          replay_count: 200,
          avg_watch_time: 22.0,
          avg_watch_percentage: 40.0,
          likes: 210,
          comments: 35,
          shares: 45,
          follows: 12,
          engagement_rate_by_reach: 7.6,
          engagement_rate_by_views: 6.4,
          performance_score: 52.0,
          hook_text: "Stop making this financial mistake",
        },
      ];

      const res = generatePerformanceIntelligence(sampleVideos);
      assert.strictEqual(res.hasSufficientData, true);
      assert.ok(res.insights.length >= 2);
      assert.ok(res.durationInsight !== null);
      assert.strictEqual(res.durationInsight?.optimalRange, "20–35s Short Form");
    });
  });

  describe("CSV Export Formatting", () => {
    test("exportPagesToCsv generates RFC 4180 compliant CSV string", () => {
      const pages = [
        {
          page_id: "p1",
          facebook_page_id: "1002345678",
          page_name: 'Tech & AI "Insights"',
          followers: 15400,
          views: 89000,
          reach: 65000,
          engagement: 7400,
          posts_published: 12,
          avg_watch_time_seconds: 18.5,
          growth_percentage: null,
          engagement_rate: 8.31,
          last_synced_at: "2026-11-20T10:00:00Z",
        },
      ];

      const csv = exportPagesToCsv(pages);
      assert.ok(csv.includes("Page Name,Facebook Page ID"));
      assert.ok(csv.includes('"Tech & AI ""Insights"""')); // escaped quotes
      assert.ok(csv.includes("15400"));
      assert.ok(csv.includes("8.31%"));
    });

    test("exportVideosToCsv properly formats Reel metrics", () => {
      const videos: VideoPerformanceItem[] = [
        {
          id: "v1",
          meta_video_id: "meta_123",
          title: "Top 3 Secrets, Revealed",
          page_id: "p1",
          page_name: "PagePulse",
          published_date: "2026-11-20",
          duration_seconds: 45,
          views: 12000,
          reach: 9000,
          impressions: 15000,
          total_plays: 13000,
          replay_count: 500,
          avg_watch_time: 25.0,
          avg_watch_percentage: 55.6,
          likes: 400,
          comments: 50,
          shares: 80,
          follows: 20,
          engagement_rate_by_reach: 5.89,
          engagement_rate_by_views: 4.42,
          performance_score: 72.5,
        },
      ];

      const csv = exportVideosToCsv(videos);
      assert.ok(csv.includes("Reel Title,Meta Video ID"));
      assert.ok(csv.includes('"Top 3 Secrets, Revealed"')); // escaped comma
      assert.ok(csv.includes("12000"));
      assert.ok(csv.includes("72.5"));
    });
  });

  describe("Analytics Zod Validation Schemas", () => {
    test("AnalyticsFilterSchema accepts valid presets", () => {
      assert.ok(AnalyticsFilterSchema.safeParse({ date_range: "last_7d" }).success);
      assert.ok(AnalyticsFilterSchema.safeParse({ page_id: "page_123", date_range: "last_90d" }).success);
    });

    test("VideoAnalyticsQuerySchema enforces pagination bounds", () => {
      const valid = VideoAnalyticsQuerySchema.safeParse({ limit: 50, page: 2, sort_by: "reach" });
      assert.ok(valid.success);

      const invalid = VideoAnalyticsQuerySchema.safeParse({ limit: 500 }); // Exceeds max 100
      assert.strictEqual(invalid.success, false);
    });

    test("SyncAnalyticsSchema validates payload", () => {
      assert.ok(SyncAnalyticsSchema.safeParse({}).success);
      assert.ok(SyncAnalyticsSchema.safeParse({ page_id: "page_xyz", force: true }).success);
    });

    test("ExportCsvSchema accepts supported types", () => {
      assert.ok(ExportCsvSchema.safeParse({ type: "pages" }).success);
      assert.ok(ExportCsvSchema.safeParse({ type: "videos" }).success);
      assert.ok(ExportCsvSchema.safeParse({ type: "growth" }).success);
    });
  });
});
