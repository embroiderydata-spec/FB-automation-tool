"use client";

import React from "react";
import {
  Share2,
  Film,
  Send,
  Calendar,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface DashboardMetrics {
  connected_pages: number;
  max_pages: number;
  total_videos: number;
  published_posts: number;
  scheduled_posts: number;
  failed_jobs: number;
  estimated_cost: string;
}

interface StatsCardsProps {
  metrics?: DashboardMetrics;
  loading?: boolean;
}

export function StatsCards({ metrics, loading = false }: StatsCardsProps) {
  const cards = [
    {
      id: "connected_pages",
      title: "Connected Facebook Pages",
      value: loading ? "..." : `${metrics?.connected_pages ?? 0} / ${metrics?.max_pages ?? 100}`,
      subtext: "Pages actively managed",
      icon: Share2,
      trend: {
        value: `${(metrics?.connected_pages ?? 0) > 0 ? "Active Network" : "Awaiting Pages"}`,
        positive: (metrics?.connected_pages ?? 0) > 0,
      },
      highlightColor: "text-blue-500 bg-blue-500/10",
    },
    {
      id: "videos_generated",
      title: "Videos Generated",
      value: loading ? "..." : `${metrics?.total_videos ?? 0}`,
      subtext: "9:16 vertical Reels compiled",
      icon: Film,
      trend: {
        value: `${metrics?.total_videos ?? 0} total produced`,
        positive: true,
      },
      highlightColor: "text-indigo-500 bg-indigo-500/10",
    },
    {
      id: "posts_published",
      title: "Posts Published",
      value: loading ? "..." : `${metrics?.published_posts ?? 0}`,
      subtext: "Confirmed on Facebook Graph API",
      icon: Send,
      trend: {
        value: (metrics?.published_posts ?? 0) > 0 ? "Live on Facebook" : "Ready to schedule",
        positive: true,
      },
      highlightColor: "text-emerald-500 bg-emerald-500/10",
    },
    {
      id: "posts_scheduled",
      title: "Posts Scheduled",
      value: loading ? "..." : `${metrics?.scheduled_posts ?? 0}`,
      subtext: "In active publishing queue",
      icon: Calendar,
      trend: {
        value: (metrics?.scheduled_posts ?? 0) > 0 ? "Queue active" : "Queue empty",
        positive: (metrics?.scheduled_posts ?? 0) > 0,
      },
      highlightColor: "text-amber-500 bg-amber-500/10",
    },
    {
      id: "failed_jobs",
      title: "Failed Jobs",
      value: loading ? "..." : `${metrics?.failed_jobs ?? 0}`,
      subtext: (metrics?.failed_jobs ?? 0) === 0 ? "Zero unresolved errors" : "Attention required",
      icon: AlertTriangle,
      trend: {
        value: (metrics?.failed_jobs ?? 0) === 0 ? "100% healthy" : "Requires retry",
        positive: (metrics?.failed_jobs ?? 0) === 0,
      },
      highlightColor: (metrics?.failed_jobs ?? 0) > 0 ? "text-rose-500 bg-rose-500/10" : "text-emerald-500 bg-emerald-500/10",
    },
    {
      id: "ai_usage_cost",
      title: "AI Usage / Est. Cost",
      value: loading ? "..." : `${metrics?.estimated_cost ?? "$0.00"}`,
      subtext: "OpenAI, ElevenLabs & Replicate",
      icon: DollarSign,
      trend: {
        value: "Real-time cost guard active",
        positive: true,
      },
      highlightColor: "text-purple-500 bg-purple-500/10",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card
            key={stat.id}
            className="relative overflow-hidden transition-all hover:border-primary/50 hover:shadow-xs"
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${stat.highlightColor}`}
              >
                <Icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                  {stat.value}
                </span>
                {loading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-muted-foreground">{stat.subtext}</span>
                <span
                  className={`text-[11px] font-medium ${
                    stat.trend.positive ? "text-emerald-500" : "text-amber-500"
                  }`}
                >
                  {stat.trend.value}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
