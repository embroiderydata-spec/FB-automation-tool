"use client";

import React from "react";
import {
  CheckCircle2,
  Clock,
  Film,
  Send,
  Sparkles,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface ActivityItem {
  id: string;
  type: "video_generated" | "post_published" | "post_scheduled" | "page_synced" | "ai_script";
  title: string;
  targetPage: string;
  timestamp: string;
  status: "completed" | "scheduled" | "processing" | "failed";
  details?: string;
  isDemo?: boolean;
}

export const DEMO_ACTIVITIES: ActivityItem[] = [
  {
    id: "act-1",
    type: "post_published",
    title: "Reel published successfully",
    targetPage: "TechPulse Daily (124K Followers)",
    timestamp: "12 minutes ago",
    status: "completed",
    details: "Reached 1,420 views in first 10 minutes",
    isDemo: true,
  },
  {
    id: "act-2",
    type: "video_generated",
    title: "AI Video rendered in 9:16 vertical format",
    targetPage: "Viral Motivation Hub",
    timestamp: "38 minutes ago",
    status: "completed",
    details: "Duration: 42s &bull; ElevenLabs Voice: Adam",
    isDemo: true,
  },
  {
    id: "act-3",
    type: "post_scheduled",
    title: "Batch queue scheduled for peak engagement",
    targetPage: "Daily Finance Hacks",
    timestamp: "1 hour ago",
    status: "scheduled",
    details: "Slot: 16:00 EST today",
    isDemo: true,
  },
  {
    id: "act-4",
    type: "ai_script",
    title: "3 Viral script variations generated",
    targetPage: "TechPulse Daily",
    timestamp: "3 hours ago",
    status: "completed",
    details: "Topic: Quantum Computing Breakthroughs",
    isDemo: true,
  },
  {
    id: "act-5",
    type: "page_synced",
    title: "Page tokens and insights synchronized",
    targetPage: "Viral Motivation Hub",
    timestamp: "5 hours ago",
    status: "completed",
    details: "Token healthy &bull; Expires in 58 days",
    isDemo: true,
  },
];

export function RecentActivity({ activities = DEMO_ACTIVITIES }: { activities?: ActivityItem[] }) {
  const getIcon = (type: ActivityItem["type"]) => {
    switch (type) {
      case "post_published":
        return <Send className="h-4 w-4 text-emerald-500" />;
      case "video_generated":
        return <Film className="h-4 w-4 text-indigo-500" />;
      case "post_scheduled":
        return <Clock className="h-4 w-4 text-amber-500" />;
      case "ai_script":
        return <Sparkles className="h-4 w-4 text-purple-500" />;
      default:
        return <CheckCircle2 className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusBadge = (status: ActivityItem["status"]) => {
    switch (status) {
      case "completed":
        return <Badge variant="success">Completed</Badge>;
      case "scheduled":
        return <Badge variant="warning">Scheduled</Badge>;
      case "processing":
        return <Badge variant="info">In Queue</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
          <CardDescription className="text-xs">
            Live pipeline operations across all connected pages
          </CardDescription>
        </div>
        <Badge variant="demo" className="text-[10px]">
          Demo Feed
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((act) => (
            <div
              key={act.id}
              className="group flex items-start gap-3 rounded-lg p-2.5 transition-colors hover:bg-muted/50"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-background shadow-xs">
                {getIcon(act.type)}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-foreground leading-snug">
                    {act.title}
                  </p>
                  {getStatusBadge(act.status)}
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="font-medium text-foreground/80">{act.targetPage}</span>
                  <span>{act.timestamp}</span>
                </div>
                {act.details && (
                  <p
                    className="text-[11px] text-muted-foreground/80"
                    dangerouslySetInnerHTML={{ __html: act.details }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
