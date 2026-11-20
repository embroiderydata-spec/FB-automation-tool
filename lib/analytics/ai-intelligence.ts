import { AIPerformanceInsight, VideoPerformanceItem } from "./types";

export interface HookCategoryStats {
  category: "Curiosity" | "Question" | "Shock" | "Story" | "Problem/Solution" | "Unexpected Fact";
  count: number;
  avgViews: number;
  avgWatchPercentage: number;
  avgEngagementRate: number;
  sampleHooks: string[];
}

export interface PublishingTimePattern {
  dayOfWeek: string;
  hourOfDay: number;
  sampleSize: number;
  avgViews: number;
  avgEngagementRate: number;
  avgWatchTimeSeconds: number;
}

export interface IntelligenceAnalysisResult {
  hasSufficientData: boolean;
  statusMessage: string;
  insights: AIPerformanceInsight[];
  hookCategories: HookCategoryStats[];
  publishingTimePatterns: PublishingTimePattern[];
  durationInsight: {
    optimalRange: string;
    avgCompletionRate: number;
    comparedRange: string;
    comparedCompletionRate: number;
  } | null;
}

/**
 * Classifies a raw hook string into a recognized psychological viral category.
 */
export function classifyHookCategory(
  hookText?: string | null
): "Curiosity" | "Question" | "Shock" | "Story" | "Problem/Solution" | "Unexpected Fact" {
  if (!hookText) return "Curiosity";
  const lower = hookText.toLowerCase();

  if (lower.startsWith("why") || lower.startsWith("how") || lower.includes("?")) {
    return "Question";
  }
  if (lower.includes("secret") || lower.includes("nobody tells you") || lower.includes("hidden") || lower.includes("truth")) {
    return "Curiosity";
  }
  if (lower.includes("mistake") || lower.includes("stop") || lower.includes("warning") || lower.includes("never")) {
    return "Problem/Solution";
  }
  if (lower.includes("insane") || lower.includes("unbelievable") || lower.includes("shocking") || lower.includes("crazy")) {
    return "Shock";
  }
  if (lower.includes("when i") || lower.includes("years ago") || lower.includes("my journey") || lower.includes("story")) {
    return "Story";
  }
  return "Unexpected Fact";
}

/**
 * Generates autonomous AI Performance Intelligence and Content Strategy Recommendations
 * derived strictly from actual synchronized Facebook Reel telemetry.
 */
export function generatePerformanceIntelligence(
  videos: VideoPerformanceItem[]
): IntelligenceAnalysisResult {
  // Guard: If fewer than 2 videos have real synchronized views, flag as insufficient data
  const videosWithData = videos.filter((v) => v.views > 0);

  if (videosWithData.length < 2) {
    return {
      hasSufficientData: false,
      statusMessage: "Insufficient performance data for reliable recommendations. Synchronize at least 2 published Reels with real Facebook views to unlock AI intelligence.",
      insights: [
        {
          id: "insufficient_data",
          insight_type: "content_recommendation",
          title: "Waiting for Facebook Performance Telemetry",
          recommendation: "Insufficient performance data for reliable recommendations.",
          supporting_data: {
            published_videos_found: videos.length,
            videos_with_metrics: videosWithData.length,
            minimum_required: 2,
          },
          confidence_level: "insufficient_data",
          suggested_experiment: "Publish 2-3 Reels and sync analytics after 24 hours of organic algorithm distribution.",
          created_at: new Date().toISOString(),
        },
      ],
      hookCategories: [],
      publishingTimePatterns: [],
      durationInsight: null,
    };
  }

  const insights: AIPerformanceInsight[] = [];

  // 1. Duration Analysis
  const shortVideos = videosWithData.filter((v) => v.duration_seconds <= 35);
  const longVideos = videosWithData.filter((v) => v.duration_seconds > 35);

  const avgCompletionShort =
    shortVideos.length > 0
      ? shortVideos.reduce((acc, v) => acc + (v.avg_watch_percentage || 0), 0) / shortVideos.length
      : 0;

  const avgCompletionLong =
    longVideos.length > 0
      ? longVideos.reduce((acc, v) => acc + (v.avg_watch_percentage || 0), 0) / longVideos.length
      : 0;

  let durationInsight: IntelligenceAnalysisResult["durationInsight"] = null;

  if (shortVideos.length > 0 && longVideos.length > 0) {
    const isShortBetter = avgCompletionShort >= avgCompletionLong;
    durationInsight = {
      optimalRange: isShortBetter ? "20–35s Short Form" : "40–60s Extended Form",
      avgCompletionRate: parseFloat((isShortBetter ? avgCompletionShort : avgCompletionLong).toFixed(1)),
      comparedRange: isShortBetter ? "40–60s Extended Form" : "20–35s Short Form",
      comparedCompletionRate: parseFloat((isShortBetter ? avgCompletionLong : avgCompletionShort).toFixed(1)),
    };

    insights.push({
      id: "insight_duration",
      insight_type: "video_duration",
      title: isShortBetter ? "Shorter Videos Driving Higher Retention" : "Extended Storytelling Driving Longer Watch Time",
      recommendation: isShortBetter
        ? "Videos between 20–35 seconds had a higher average completion rate than longer clips."
        : "Extended narrative Reels (40–60s) captured higher cumulative watch minutes.",
      supporting_data: {
        short_avg_completion: `${avgCompletionShort.toFixed(1)}%`,
        long_avg_completion: `${avgCompletionLong.toFixed(1)}%`,
        sample_short: shortVideos.length,
        sample_long: longVideos.length,
      },
      confidence_level: videosWithData.length >= 5 ? "high" : "moderate",
      suggested_experiment: `Test 3 new Reels specifically scripted for the ${durationInsight.optimalRange} window.`,
      created_at: new Date().toISOString(),
    });
  }

  // 2. Hook Pattern Clustering
  const categoryMap: Record<string, VideoPerformanceItem[]> = {
    Curiosity: [],
    Question: [],
    Shock: [],
    Story: [],
    "Problem/Solution": [],
    "Unexpected Fact": [],
  };

  videosWithData.forEach((v) => {
    const cat = classifyHookCategory(v.hook_text || v.title);
    categoryMap[cat].push(v);
  });

  const hookCategories: HookCategoryStats[] = [];

  Object.entries(categoryMap).forEach(([cat, list]) => {
    if (list.length > 0) {
      const totalViews = list.reduce((sum, item) => sum + item.views, 0);
      const totalRetention = list.reduce((sum, item) => sum + (item.avg_watch_percentage || 0), 0);
      const totalEng = list.reduce((sum, item) => sum + (item.engagement_rate_by_views || 0), 0);

      hookCategories.push({
        category: cat as any,
        count: list.length,
        avgViews: Math.round(totalViews / list.length),
        avgWatchPercentage: parseFloat((totalRetention / list.length).toFixed(1)),
        avgEngagementRate: parseFloat((totalEng / list.length).toFixed(2)),
        sampleHooks: list.slice(0, 3).map((item) => item.hook_text || item.title),
      });
    }
  });

  hookCategories.sort((a, b) => b.avgWatchPercentage - a.avgWatchPercentage);

  if (hookCategories.length > 0) {
    const topCategory = hookCategories[0];
    insights.push({
      id: "insight_hooks",
      insight_type: "hook_retention",
      title: `${topCategory.category} Hooks Deliver Highest Retention`,
      recommendation: `Hooks classified under '${topCategory.category}' achieved an average completion rate of ${topCategory.avgWatchPercentage}% across ${topCategory.count} post(s).`,
      supporting_data: {
        top_category: topCategory.category,
        avg_completion: `${topCategory.avgWatchPercentage}%`,
        avg_views: topCategory.avgViews,
        sample_size: topCategory.count,
      },
      confidence_level: topCategory.count >= 3 ? "high" : "moderate",
      suggested_experiment: `Generate 2 new scripts using opening lines structured as '${topCategory.category}'.`,
      created_at: new Date().toISOString(),
    });
  }

  // 3. Publishing Time Pattern Correlation
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const timeBuckets: Record<string, VideoPerformanceItem[]> = {};

  videosWithData.forEach((v) => {
    const date = new Date(v.published_date);
    if (!isNaN(date.getTime())) {
      const dayName = days[date.getUTCDay()];
      const hour = date.getUTCHours();
      const key = `${dayName}_${hour}`;
      if (!timeBuckets[key]) timeBuckets[key] = [];
      timeBuckets[key].push(v);
    }
  });

  const publishingTimePatterns: PublishingTimePattern[] = [];

  Object.entries(timeBuckets).forEach(([key, bucket]) => {
    const [dayName, hourStr] = key.split("_");
    const totalViews = bucket.reduce((sum, item) => sum + item.views, 0);
    const totalEng = bucket.reduce((sum, item) => sum + (item.engagement_rate_by_views || 0), 0);
    const totalWatch = bucket.reduce((sum, item) => sum + (item.avg_watch_time || 0), 0);

    publishingTimePatterns.push({
      dayOfWeek: dayName,
      hourOfDay: parseInt(hourStr, 10),
      sampleSize: bucket.length,
      avgViews: Math.round(totalViews / bucket.length),
      avgEngagementRate: parseFloat((totalEng / bucket.length).toFixed(2)),
      avgWatchTimeSeconds: parseFloat((totalWatch / bucket.length).toFixed(1)),
    });
  });

  publishingTimePatterns.sort((a, b) => b.avgViews - a.avgViews);

  if (publishingTimePatterns.length > 0) {
    const bestWindow = publishingTimePatterns[0];
    insights.push({
      id: "insight_time",
      insight_type: "publishing_time",
      title: `Peak Engagement Window: ${bestWindow.dayOfWeek} at ${bestWindow.hourOfDay}:00 UTC`,
      recommendation: `Historical observation: Reels published on ${bestWindow.dayOfWeek} around ${bestWindow.hourOfDay}:00 UTC averaged ${bestWindow.avgViews} views (sample size: ${bestWindow.sampleSize}). Note: correlation does not guarantee algorithm distribution.`,
      supporting_data: {
        day: bestWindow.dayOfWeek,
        hour: `${bestWindow.hourOfDay}:00 UTC`,
        sample_size: bestWindow.sampleSize,
        avg_views: bestWindow.avgViews,
      },
      confidence_level: bestWindow.sampleSize >= 3 ? "moderate" : "low",
      suggested_experiment: `Schedule your next batch to drop 30 minutes before ${bestWindow.hourOfDay}:00 UTC on ${bestWindow.dayOfWeek}.`,
      created_at: new Date().toISOString(),
    });
  }

  return {
    hasSufficientData: true,
    statusMessage: `AI analyzed ${videosWithData.length} published Reels and generated ${insights.length} data-driven recommendations.`,
    insights,
    hookCategories,
    publishingTimePatterns,
    durationInsight,
  };
}
