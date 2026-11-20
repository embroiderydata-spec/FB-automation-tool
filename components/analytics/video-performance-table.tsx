"use client";

import React from "react";
import { Film, Eye, Clock, Share2, ThumbsUp, ArrowUpDown, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VideoPerformanceItem } from "@/lib/analytics/types";

interface VideoPerformanceTableProps {
  videos: VideoPerformanceItem[];
  onSelectVideo: (video: VideoPerformanceItem) => void;
}

export function VideoPerformanceTable({ videos, onSelectVideo }: VideoPerformanceTableProps) {
  if (videos.length === 0) {
    return (
      <div className="p-8 border border-dashed rounded-xl text-center text-xs text-muted-foreground">
        No published Reels or video insights recorded yet. Once videos are published and viewed on Facebook, synchronized telemetry will appear here.
      </div>
    );
  }

  const getScoreBadge = (score: number | null) => {
    if (score === null) return <span className="text-muted-foreground">N/A</span>;
    if (score >= 80) {
      return (
        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">
          {score} / 100
        </Badge>
      );
    }
    if (score >= 50) {
      return (
        <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20 text-[10px]">
          {score} / 100
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-[10px]">
        {score} / 100
      </Badge>
    );
  };

  return (
    <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Film className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Reels Performance Telemetry</h3>
        </div>
        <span className="text-xs text-muted-foreground">{videos.length} Reel(s) Analyzed</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/30 border-b text-muted-foreground">
            <tr>
              <th className="p-3.5 font-semibold">Reel Title & Page</th>
              <th className="p-3.5 font-semibold">Published</th>
              <th className="p-3.5 font-semibold">Views</th>
              <th className="p-3.5 font-semibold">Reach</th>
              <th className="p-3.5 font-semibold">Avg Watch</th>
              <th className="p-3.5 font-semibold">Retention %</th>
              <th className="p-3.5 font-semibold">Engagement</th>
              <th className="p-3.5 font-semibold">Shares</th>
              <th className="p-3.5 font-semibold">Score</th>
              <th className="p-3.5 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {videos.map((v) => (
              <tr key={v.id} className="hover:bg-muted/20 transition-colors">
                <td className="p-3.5">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-7 rounded border bg-muted/40 flex items-center justify-center shrink-0 overflow-hidden">
                      {v.thumbnail_url ? (
                        <img src={v.thumbnail_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Film className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-foreground line-clamp-1">{v.title}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {v.page_name} • {v.duration_seconds}s
                      </div>
                    </div>
                  </div>
                </td>

                <td className="p-3.5 text-muted-foreground">{v.published_date}</td>
                <td className="p-3.5 font-medium text-foreground">{v.views.toLocaleString()}</td>
                <td className="p-3.5 font-medium text-foreground">{v.reach.toLocaleString()}</td>
                <td className="p-3.5 font-mono">
                  {v.avg_watch_time !== null ? `${v.avg_watch_time}s` : <span className="text-muted-foreground">N/A</span>}
                </td>
                <td className="p-3.5 font-mono">
                  {v.avg_watch_percentage !== null ? (
                    `${v.avg_watch_percentage}%`
                  ) : (
                    <span className="text-muted-foreground">N/A</span>
                  )}
                </td>
                <td className="p-3.5">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <ThumbsUp className="h-3 w-3" /> {v.likes}
                    </span>
                    <span className="font-mono text-foreground">
                      {v.engagement_rate_by_views !== null ? `${v.engagement_rate_by_views}%` : ""}
                    </span>
                  </div>
                </td>
                <td className="p-3.5 text-muted-foreground">{v.shares}</td>
                <td className="p-3.5">{getScoreBadge(v.performance_score)}</td>
                <td className="p-3.5 text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px]"
                    onClick={() => onSelectVideo(v)}
                  >
                    Inspect
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
