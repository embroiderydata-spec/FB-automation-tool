/**
 * Calculates Engagement Rate by Reach:
 * Formula: (Total Engagements / Reach) * 100
 * Returns null if reach <= 0 or unavailable.
 */
export function calculateEngagementRateByReach(
  totalEngagements: number | null | undefined,
  reach: number | null | undefined
): number | null {
  if (
    totalEngagements === undefined ||
    totalEngagements === null ||
    reach === undefined ||
    reach === null ||
    reach <= 0
  ) {
    return null;
  }
  return parseFloat(((totalEngagements / reach) * 100).toFixed(2));
}

/**
 * Calculates Engagement Rate by Views:
 * Formula: (Total Engagements / Video Views) * 100
 * Returns null if views <= 0 or unavailable.
 */
export function calculateEngagementRateByViews(
  totalEngagements: number | null | undefined,
  views: number | null | undefined
): number | null {
  if (
    totalEngagements === undefined ||
    totalEngagements === null ||
    views === undefined ||
    views === null ||
    views <= 0
  ) {
    return null;
  }
  return parseFloat(((totalEngagements / views) * 100).toFixed(2));
}

/**
 * Calculates Average Watch Percentage:
 * Formula: (Average Watch Time Seconds / Video Duration Seconds) * 100
 * Returns null if duration <= 0 or average watch time is null.
 */
export function calculateAverageWatchPercentage(
  avgWatchTimeSeconds: number | null | undefined,
  videoDurationSeconds: number | null | undefined
): number | null {
  if (
    avgWatchTimeSeconds === undefined ||
    avgWatchTimeSeconds === null ||
    videoDurationSeconds === undefined ||
    videoDurationSeconds === null ||
    videoDurationSeconds <= 0
  ) {
    return null;
  }
  const pct = (avgWatchTimeSeconds / videoDurationSeconds) * 100;
  return parseFloat(Math.min(pct, 100).toFixed(1));
}

/**
 * Calculates a composite Content Performance Score (0 to 100).
 * Blends:
 * - Retention / Completion rate (40% weight)
 * - Engagement rate (35% weight)
 * - Volume / Reach factor (25% weight)
 */
export function calculatePerformanceScore(metrics: {
  views: number;
  reach: number;
  engagements: number;
  avgWatchPercentage: number | null;
}): number | null {
  const { views, reach, engagements, avgWatchPercentage } = metrics;
  if (views === 0 && reach === 0 && engagements === 0) return null;

  // Retention component (0 to 40 pts)
  const retentionScore = avgWatchPercentage ? (avgWatchPercentage / 100) * 40 : 15;

  // Engagement component (0 to 35 pts)
  const engRate = calculateEngagementRateByViews(engagements, views) || 0;
  // An engagement rate of 10%+ is exceptional short-form performance
  const engScore = Math.min((engRate / 10) * 35, 35);

  // Reach component (0 to 25 pts)
  const reachScore = Math.min(Math.log10(Math.max(views, 1) + 1) * 6.25, 25);

  const total = retentionScore + engScore + reachScore;
  return parseFloat(Math.min(Math.max(total, 0), 100).toFixed(1));
}

/**
 * Identifies the highest-performing and lowest-performing Pages in a multi-page cohort.
 */
export function identifyPagePerformers<T extends { views: number; engagement: number; followers: number }>(
  pages: T[]
): { highestIndex: number | null; lowestIndex: number | null } {
  if (!pages || pages.length === 0) {
    return { highestIndex: null, lowestIndex: null };
  }
  if (pages.length === 1) {
    return { highestIndex: 0, lowestIndex: 0 };
  }

  let highestIdx = 0;
  let lowestIdx = 0;
  let highestScore = -1;
  let lowestScore = Infinity;

  pages.forEach((p, idx) => {
    // Composite metric: Views * 0.5 + Engagement * 2.0 + Followers * 0.1
    const score = p.views * 0.5 + p.engagement * 2.0 + p.followers * 0.1;

    if (score > highestScore) {
      highestScore = score;
      highestIdx = idx;
    }
    if (score < lowestScore) {
      lowestScore = score;
      lowestIdx = idx;
    }
  });

  return {
    highestIndex: highestIdx,
    lowestIndex: lowestIdx,
  };
}
