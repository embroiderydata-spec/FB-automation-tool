export type MetricStatus =
  | "available"
  | "zero"
  | "missing"
  | "unsupported"
  | "error";

export interface NormalizedMetricValue {
  name: string;
  rawValue: any;
  numericValue: number | null;
  status: MetricStatus;
  period?: string;
  unit?: string;
}

export interface NormalizedPageInsights {
  impressions: NormalizedMetricValue;
  reach: NormalizedMetricValue;
  engagement: NormalizedMetricValue;
  videoViews: NormalizedMetricValue;
  followersNetChange: NormalizedMetricValue;
  rawPayload: Record<string, any>;
  syncedAt: string;
}

export interface NormalizedVideoInsights {
  views: NormalizedMetricValue;
  reach: NormalizedMetricValue;
  impressions: NormalizedMetricValue;
  totalPlays: NormalizedMetricValue;
  replayCount: NormalizedMetricValue;
  averageWatchTimeSeconds: NormalizedMetricValue;
  totalWatchTimeSeconds: NormalizedMetricValue;
  retentionCurve: Array<{ percent: number; value: number }>;
  rawPayload: Record<string, any>;
  syncedAt: string;
}

/**
 * Safely extracts and normalizes a single metric from Meta Graph API insights payload.
 * Strictly distinguishes between genuine 0 and missing/unsupported/error states.
 */
export function normalizeMetric(
  metricName: string,
  metaDataArray: Array<{ name: string; values?: Array<{ value: any }>; period?: string }> | undefined,
  options: { divisor?: number; defaultValue?: number | null } = {}
): NormalizedMetricValue {
  const { divisor = 1 } = options;

  if (!metaDataArray || !Array.isArray(metaDataArray)) {
    return {
      name: metricName,
      rawValue: null,
      numericValue: null,
      status: "missing",
    };
  }

  const metricObj = metaDataArray.find((m) => m.name === metricName);

  if (!metricObj) {
    return {
      name: metricName,
      rawValue: null,
      numericValue: null,
      status: "unsupported",
    };
  }

  const latestVal = metricObj.values?.[metricObj.values.length - 1]?.value;

  if (latestVal === undefined || latestVal === null) {
    return {
      name: metricName,
      rawValue: null,
      numericValue: null,
      status: "missing",
      period: metricObj.period,
    };
  }

  // Handle number or string numbers
  const num = Number(latestVal);
  if (isNaN(num)) {
    return {
      name: metricName,
      rawValue: latestVal,
      numericValue: null,
      status: "unsupported",
      period: metricObj.period,
    };
  }

  const finalNumeric = num / divisor;

  return {
    name: metricName,
    rawValue: latestVal,
    numericValue: finalNumeric,
    status: finalNumeric === 0 ? "zero" : "available",
    period: metricObj.period,
  };
}

/**
 * Normalizes Page-level Graph API insights
 */
export function normalizePageInsights(apiResponse: any): NormalizedPageInsights {
  const data = apiResponse?.data || [];

  return {
    impressions: normalizeMetric("page_impressions", data),
    reach: normalizeMetric("page_impressions_unique", data),
    engagement: normalizeMetric("page_post_engagements", data),
    videoViews: normalizeMetric("page_video_views", data),
    followersNetChange: normalizeMetric("page_daily_follows_unique", data),
    rawPayload: apiResponse || {},
    syncedAt: new Date().toISOString(),
  };
}

/**
 * Normalizes Video/Reel-level Graph API insights (e.g. `/{video_id}/video_insights`)
 */
export function normalizeVideoInsights(apiResponse: any): NormalizedVideoInsights {
  const data = apiResponse?.data || [];

  // Average watch time from Meta is often reported in milliseconds, normalize to seconds
  const rawAvgTime = normalizeMetric("total_video_avg_time_watched", data);
  const avgWatchSeconds: NormalizedMetricValue = {
    ...rawAvgTime,
    numericValue:
      rawAvgTime.numericValue !== null ? parseFloat((rawAvgTime.numericValue / 1000).toFixed(2)) : null,
  };

  const rawTotalTime = normalizeMetric("total_video_view_time", data);
  const totalWatchSeconds: NormalizedMetricValue = {
    ...rawTotalTime,
    numericValue:
      rawTotalTime.numericValue !== null ? parseFloat((rawTotalTime.numericValue / 1000).toFixed(2)) : null,
  };

  // Extract retention curve if present in Graph API
  const retentionItem = data.find((m: any) => m.name === "total_video_retention_graph_autoplayed");
  const retentionCurve: Array<{ percent: number; value: number }> = [];

  if (retentionItem?.values?.[0]?.value && typeof retentionItem.values[0].value === "object") {
    const rawCurve = retentionItem.values[0].value;
    Object.entries(rawCurve).forEach(([pctKey, val]) => {
      const pct = parseInt(pctKey.replace(/[^\d]/g, ""), 10);
      if (!isNaN(pct)) {
        retentionCurve.push({ percent: pct, value: Number(val) || 0 });
      }
    });
    retentionCurve.sort((a, b) => a.percent - b.percent);
  }

  return {
    views: normalizeMetric("total_video_views", data),
    reach: normalizeMetric("total_video_views_unique", data),
    impressions: normalizeMetric("total_video_impressions", data),
    totalPlays: normalizeMetric("total_video_views_autoplayed", data),
    replayCount: normalizeMetric("total_video_views_clicked_to_play", data),
    averageWatchTimeSeconds: avgWatchSeconds,
    totalWatchTimeSeconds: totalWatchSeconds,
    retentionCurve,
    rawPayload: apiResponse || {},
    syncedAt: new Date().toISOString(),
  };
}
