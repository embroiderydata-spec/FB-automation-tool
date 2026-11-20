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
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface ActivityItem {
  id: string;
  event_type?: string;
  message?: string;
  status?: string;
  created_at: string;
  job?: {
    id: string;
    caption?: string;
    facebook_page?: {
      page_name?: string;
      name?: string;
    };
  };
}

export function RecentActivity({ activities = [], loading = false }: { activities?: ActivityItem[]; loading?: boolean }) {
  const getIcon = (eventType?: string) => {
    switch (eventType) {
      case "published":
      case "publish_success":
        return <Send className="h-4 w-4 text-emerald-500" />;
      case "video_render":
      case "video_ready":
        return <Film className="h-4 w-4 text-indigo-500" />;
      case "scheduled":
        return <Clock className="h-4 w-4 text-amber-500" />;
      case "failed":
      case "error":
        return <AlertCircle className="h-4 w-4 text-rose-500" />;
      default:
        return <Sparkles className="h-4 w-4 text-primary" />;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base font-semibold">System Audit & Publishing Trail</CardTitle>
          <CardDescription className="text-xs">
            Live chronological telemetry of AI generation, rendering, and Meta API actions
          </CardDescription>
        </div>
        <Badge variant="outline" className="text-[10px]">
          Live Event Log
        </Badge>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground space-y-2">
            <Activity className="h-6 w-6 text-muted-foreground mx-auto" />
            <p className="font-medium text-foreground">No Activity Events Recorded Yet</p>
            <p className="text-[11px] max-w-sm mx-auto">
              As AI workflows, video rendering jobs, and scheduled posts run, their exact timestamps and statuses will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((act) => {
              const pageName = act.job?.facebook_page?.page_name || act.job?.facebook_page?.name || "System Pipeline";
              return (
                <div
                  key={act.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border bg-card/60 p-3 text-xs transition-colors hover:border-primary/40 hover:bg-muted/40"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border bg-muted/30">
                      {getIcon(act.event_type || act.status)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">
                          {act.message || "System Pipeline Event"}
                        </span>
                        <Badge
                          variant={act.status === "failed" ? "destructive" : "success"}
                          className="text-[9px] px-1.5 py-0 capitalize"
                        >
                          {act.status || "Completed"}
                        </Badge>
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        <span>Target: <strong>{pageName}</strong></span>
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                    {new Date(act.created_at).toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
