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
  TrendingDown,
  Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface DashboardStatItem {
  id: string;
  title: string;
  value: string;
  subtext: string;
  icon: React.ElementType;
  trend?: {
    value: string;
    positive: boolean;
  };
  highlightColor: string;
  isDemo?: boolean;
}

export const DEMO_STATS: DashboardStatItem[] = [
  {
    id: "connected_pages",
    title: "Connected Facebook Pages",
    value: "3 / 100",
    subtext: "Pages actively syncing",
    icon: Share2,
    trend: { value: "+1 this week", positive: true },
    highlightColor: "text-blue-500 bg-blue-500/10",
    isDemo: true,
  },
  {
    id: "videos_generated",
    title: "Videos Generated",
    value: "148",
    subtext: "Reels & shorts rendered",
    icon: Film,
    trend: { value: "+24 today", positive: true },
    highlightColor: "text-indigo-500 bg-indigo-500/10",
    isDemo: true,
  },
  {
    id: "posts_published",
    title: "Posts Published",
    value: "1,240",
    subtext: "Total published lifetime",
    icon: Send,
    trend: { value: "+18% vs last month", positive: true },
    highlightColor: "text-emerald-500 bg-emerald-500/10",
    isDemo: true,
  },
  {
    id: "posts_scheduled",
    title: "Posts Scheduled",
    value: "36",
    subtext: "In active publishing queue",
    icon: Calendar,
    trend: { value: "Next at 16:00", positive: true },
    highlightColor: "text-amber-500 bg-amber-500/10",
    isDemo: true,
  },
  {
    id: "failed_jobs",
    title: "Failed Jobs",
    value: "0",
    subtext: "Zero unresolved errors",
    icon: AlertTriangle,
    trend: { value: "100% success rate", positive: true },
    highlightColor: "text-rose-500 bg-rose-500/10",
    isDemo: true,
  },
  {
    id: "ai_usage_cost",
    title: "AI Usage / Est. Cost",
    value: "$42.80",
    subtext: "OpenAI & ElevenLabs mtd",
    icon: DollarSign,
    trend: { value: "$0.029 / video avg", positive: true },
    highlightColor: "text-purple-500 bg-purple-500/10",
    isDemo: true,
  },
];

export function StatsCards({ stats = DEMO_STATS }: { stats?: DashboardStatItem[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.id} className="relative overflow-hidden border transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {stat.title}
              </CardTitle>
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${stat.highlightColor}`}>
                <Icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <div className="text-2xl font-bold tracking-tight text-foreground">
                  {stat.value}
                </div>
                {stat.isDemo && (
                  <Badge variant="demo" className="text-[9px] px-1.5 py-0 font-normal">
                    Demo Data
                  </Badge>
                )}
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span className="truncate">{stat.subtext}</span>
                {stat.trend && (
                  <span
                    className={`ml-2 inline-flex shrink-0 items-center font-medium ${
                      stat.trend.positive ? "text-emerald-500" : "text-rose-500"
                    }`}
                  >
                    {stat.trend.value}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
