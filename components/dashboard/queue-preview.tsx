"use client";

import React from "react";
import Link from "next/link";
import { Clock, ArrowRight, Video, Sparkles, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface QueueItem {
  id: string;
  title: string;
  pageName: string;
  type: "Reel" | "Video" | "Post";
  scheduledTime: string;
  status: "queued" | "ready" | "processing";
  captionPreview: string;
  isDemo?: boolean;
}

export const DEMO_QUEUE: QueueItem[] = [
  {
    id: "q-1",
    title: "5 AI Productivity Secrets Top CEOs Use Daily",
    pageName: "TechPulse Daily",
    type: "Reel",
    scheduledTime: "Today at 16:00 EST",
    status: "ready",
    captionPreview: "Stop wasting 15+ hours a week on manual spreadsheets. Here is the AI stack...",
    isDemo: true,
  },
  {
    id: "q-2",
    title: "The 1% Mindset Shift That Changes Everything",
    pageName: "Viral Motivation Hub",
    type: "Reel",
    scheduledTime: "Today at 19:30 EST",
    status: "queued",
    captionPreview: "Discipline will always outlast motivation when the excitement fades away...",
    isDemo: true,
  },
  {
    id: "q-3",
    title: "3 Simple Index Funds That Can Make You Financially Free",
    pageName: "Daily Finance Hacks",
    type: "Reel",
    scheduledTime: "Tomorrow at 09:00 EST",
    status: "queued",
    captionPreview: "Compound interest is the 8th wonder of the world. Start building passive wealth...",
    isDemo: true,
  },
];

export function QueuePreview({ items = DEMO_QUEUE }: { items?: QueueItem[] }) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base font-semibold">Publishing Queue</CardTitle>
          <CardDescription className="text-xs">
            Upcoming automated posts across your page network
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="demo" className="text-[10px]">
            Demo Queue
          </Badge>
          <Link href="/dashboard/queue">
            <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs">
              View All <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-2 rounded-lg border bg-card/60 p-3 text-xs transition-colors hover:border-primary/40 hover:bg-muted/40"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground truncate max-w-[220px]">
                    {item.title}
                  </span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {item.type}
                  </Badge>
                </div>
                <Badge
                  variant={item.status === "ready" ? "success" : "info"}
                  className="text-[10px]"
                >
                  {item.status === "ready" ? "Ready to Post" : "Queued"}
                </Badge>
              </div>

              <p className="line-clamp-1 text-muted-foreground text-[11px]">
                {item.captionPreview}
              </p>

              <div className="flex items-center justify-between border-t border-border/50 pt-2 text-[11px] text-muted-foreground">
                <span className="font-medium text-foreground/80">{item.pageName}</span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  {item.scheduledTime}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
