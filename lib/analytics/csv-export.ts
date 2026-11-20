import { CrossPageMetric, GrowthSnapshot, VideoPerformanceItem } from "./types";

/**
 * Escapes a field value according to RFC 4180 standard
 */
function escapeCsvField(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Exports Cross-Page Analytics to CSV
 */
export function exportPagesToCsv(pages: CrossPageMetric[]): string {
  const headers = [
    "Page Name",
    "Facebook Page ID",
    "Followers",
    "Total Views",
    "Total Reach",
    "Total Engagements",
    "Engagement Rate (%)",
    "Average Watch Time (s)",
    "Posts Published",
    "Last Synced",
  ];

  const rows = pages.map((p) => [
    escapeCsvField(p.page_name),
    escapeCsvField(p.facebook_page_id),
    escapeCsvField(p.followers),
    escapeCsvField(p.views),
    escapeCsvField(p.reach),
    escapeCsvField(p.engagement),
    escapeCsvField(p.engagement_rate !== null ? `${p.engagement_rate}%` : "N/A"),
    escapeCsvField(p.avg_watch_time_seconds !== null ? `${p.avg_watch_time_seconds}s` : "N/A"),
    escapeCsvField(p.posts_published),
    escapeCsvField(p.last_synced_at || "Never"),
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
}

/**
 * Exports Video & Reel Performance Analytics to CSV
 */
export function exportVideosToCsv(videos: VideoPerformanceItem[]): string {
  const headers = [
    "Reel Title",
    "Meta Video ID",
    "Facebook Page",
    "Published Date",
    "Duration (s)",
    "Views",
    "Reach",
    "Impressions",
    "Total Plays",
    "Replay Count",
    "Average Watch Time (s)",
    "Average Watch %",
    "Likes",
    "Comments",
    "Shares",
    "Engagement Rate by Views (%)",
    "Performance Score",
  ];

  const rows = videos.map((v) => [
    escapeCsvField(v.title),
    escapeCsvField(v.meta_video_id),
    escapeCsvField(v.page_name),
    escapeCsvField(v.published_date),
    escapeCsvField(v.duration_seconds),
    escapeCsvField(v.views),
    escapeCsvField(v.reach),
    escapeCsvField(v.impressions),
    escapeCsvField(v.total_plays),
    escapeCsvField(v.replay_count),
    escapeCsvField(v.avg_watch_time !== null ? v.avg_watch_time : "N/A"),
    escapeCsvField(v.avg_watch_percentage !== null ? `${v.avg_watch_percentage}%` : "N/A"),
    escapeCsvField(v.likes),
    escapeCsvField(v.comments),
    escapeCsvField(v.shares),
    escapeCsvField(v.engagement_rate_by_views !== null ? `${v.engagement_rate_by_views}%` : "N/A"),
    escapeCsvField(v.performance_score !== null ? v.performance_score : "N/A"),
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
}

/**
 * Exports Page Growth Snapshots to CSV
 */
export function exportGrowthSnapshotsToCsv(snapshots: GrowthSnapshot[]): string {
  const headers = [
    "Date",
    "Total Followers",
    "Net Followers Added",
    "Follows Gained",
    "Follows Lost",
    "Daily Views",
    "Daily Reach",
    "Daily Engagement",
  ];

  const rows = snapshots.map((s) => [
    escapeCsvField(s.snapshot_date),
    escapeCsvField(s.followers),
    escapeCsvField(s.net_followers),
    escapeCsvField(s.follows_gained),
    escapeCsvField(s.follows_lost),
    escapeCsvField(s.views),
    escapeCsvField(s.reach),
    escapeCsvField(s.engagement),
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
}
