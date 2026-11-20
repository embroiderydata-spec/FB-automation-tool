"use client";

import React from "react";
import {
  X,
  Eye,
  Clock,
  Share2,
  ThumbsUp,
  MessageCircle,
  TrendingUp,
  ShieldCheck,
  Film,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VideoPerformanceItem } from "@/lib/analytics/types";

interface VideoDetailDrawerProps {
  video: VideoPerformanceItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function VideoDetailDrawer({ video, isOpen, onClose }: VideoDetailDrawerProps) {
  if (!isOpen || !video) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl bg-card border rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Film className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground line-clamp-1">{video.title}</h3>
              <p className="text-xs text-muted-foreground">
                {video.page_name} • Published {video.published_date} • Meta ID: {video.meta_video_id}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-lg">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* Key Metric Tiles */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl border bg-muted/20">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <Eye className="h-3.5 w-3.5" /> Total Views
              </div>
              <div className="text-base font-bold text-foreground">{video.views.toLocaleString()}</div>
            </div>

            <div className="p-3.5 rounded-xl border bg-muted/20">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <Share2 className="h-3.5 w-3.5" /> Unique Reach
              </div>
              <div className="text-base font-bold text-foreground">{video.reach.toLocaleString()}</div>
            </div>

            <div className="p-3.5 rounded-xl border bg-muted/20">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <Clock className="h-3.5 w-3.5" /> Avg Watch Time
              </div>
              <div className="text-base font-bold text-foreground">
                {video.avg_watch_time !== null ? `${video.avg_watch_time}s` : "N/A"}
              </div>
            </div>

            <div className="p-3.5 rounded-xl border bg-muted/20">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <TrendingUp className="h-3.5 w-3.5" /> Completion Rate
              </div>
              <div className="text-base font-bold text-foreground">
                {video.avg_watch_percentage !== null ? `${video.avg_watch_percentage}%` : "N/A"}
              </div>
            </div>
          </div>

          {/* Retention Curve Graph */}
          <div className="p-4 rounded-xl border bg-card space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">Audience Retention Graph (Meta Telemetry)</span>
              <span className="text-[11px] text-muted-foreground">Reel Duration: {video.duration_seconds}s</span>
            </div>

            {video.retention_data && video.retention_data.length > 0 ? (
              <div className="space-y-2 pt-2">
                <div className="flex items-end gap-1.5 h-28 border-b pb-1 px-2">
                  {video.retention_data.map((point, idx) => {
                    const heightPercent = Math.max(Math.min(point.value, 100), 5);
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center group relative">
                        <div
                          className="w-full bg-primary/75 group-hover:bg-primary rounded-t transition-all"
                          style={{ height: `${heightPercent}%` }}
                        />
                        <span className="text-[9px] text-muted-foreground mt-1">{point.percent}%</span>
                        <div className="absolute -top-7 hidden group-hover:block bg-popover text-popover-foreground text-[10px] px-1.5 py-0.5 rounded shadow border whitespace-nowrap">
                          {point.value}% retention at {point.percent}% mark
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>0s (Hook Drop-off)</span>
                  <span>Midpoint ({Math.round(video.duration_seconds / 2)}s)</span>
                  <span>End ({video.duration_seconds}s)</span>
                </div>
              </div>
            ) : (
              <div className="p-6 border border-dashed rounded-lg text-center text-muted-foreground">
                Retention curve is awaiting sufficient playback samples from Meta Graph API.
              </div>
            )}
          </div>

          {/* Engagement Breakdown */}
          <div className="p-4 rounded-xl border bg-card space-y-3">
            <span className="font-semibold text-foreground">Engagement Breakdown</span>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg border bg-muted/10 flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <ThumbsUp className="h-3.5 w-3.5 text-blue-500" /> Likes
                </span>
                <span className="font-bold text-foreground">{video.likes.toLocaleString()}</span>
              </div>
              <div className="p-3 rounded-lg border bg-muted/10 flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <MessageCircle className="h-3.5 w-3.5 text-emerald-500" /> Comments
                </span>
                <span className="font-bold text-foreground">{video.comments.toLocaleString()}</span>
              </div>
              <div className="p-3 rounded-lg border bg-muted/10 flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Share2 className="h-3.5 w-3.5 text-purple-500" /> Shares
                </span>
                <span className="font-bold text-foreground">{video.shares.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Hook Information if available */}
          {video.hook_text && (
            <div className="p-3.5 rounded-xl border bg-primary/5 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Associated Opening Hook</span>
              <p className="font-semibold text-foreground">&quot;{video.hook_text}&quot;</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-muted/10 flex justify-end">
          <Button size="sm" variant="ghost" onClick={onClose} className="text-xs">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
