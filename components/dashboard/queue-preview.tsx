"use client";

import React from "react";
import Link from "next/link";
import { Clock, ArrowRight, Video, Sparkles, Send, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface QueuePreviewItem {
  id: string;
  title?: string;
  caption?: string;
  scheduled_at: string;
  status: string;
  video?: {
    id: string;
    title: string;
  };
  facebook_page?: {
    id: string;
    page_name?: string;
    name?: string;
  };
}

export function QueuePreview({ items = [], loading = false }: { items?: QueuePreviewItem[]; loading?: boolean }) {
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
          <Badge variant="outline" className="text-[10px]">
            {items.length} Pending
          </Badge>
          <Link href="/dashboard/queue">
            <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs">
              View All <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 mx-auto">
              <Calendar className="h-5 w-5" />
            </div>
            <p className="font-medium text-foreground">Queue Is Currently Empty</p>
            <p className="text-[11px] max-w-xs mx-auto">
              Schedule your next batch of Reels or activate AI Workflows for autonomous scheduling.
            </p>
            <Link href="/dashboard/queue">
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Open Publishing Queue
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const postTitle = item.title || item.video?.title || "Facebook Reel";
              const pageName = item.facebook_page?.page_name || item.facebook_page?.name || "Page";
              return (
                <div
                  key={item.id}
                  className="flex flex-col gap-2 rounded-lg border bg-card/60 p-3 text-xs transition-colors hover:border-primary/40 hover:bg-muted/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground truncate max-w-[200px]">
                        {postTitle}
                      </span>
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                        Reel
                      </Badge>
                    </div>
                    <Badge
                      variant={
                        item.status === "ready"
                          ? "success"
                          : item.status === "published"
                          ? "success"
                          : item.status === "failed"
                          ? "destructive"
                          : "outline"
                      }
                      className="text-[10px] capitalize"
                    >
                      {item.status}
                    </Badge>
                  </div>

                  {item.caption && (
                    <p className="line-clamp-1 text-muted-foreground text-[11px]">
                      {item.caption}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                    <span className="truncate max-w-[150px] font-medium">{pageName}</span>
                    <span className="flex items-center gap-1 font-mono text-[10px]">
                      <Clock className="h-3 w-3" />
                      {new Date(item.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
