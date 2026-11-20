"use client";

import React, { useState, useEffect } from "react";
import { StatsCards, DashboardMetrics } from "@/components/dashboard/stats-cards";
import { ConnectedPagesPreview } from "@/components/dashboard/connected-pages-preview";
import { QueuePreview } from "@/components/dashboard/queue-preview";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Layers, RefreshCw, Zap, CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function DashboardOverviewPage() {
  const [data, setData] = useState<{
    metrics: DashboardMetrics;
    connected_pages: any[];
    queue_items: any[];
    recent_activity: any[];
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData(isRefresh = false) {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const res = await fetch("/api/dashboard/overview");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // Ignore background fetch error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const pagesCount = data?.metrics?.connected_pages ?? 0;

  return (
    <div className="space-y-6">
      {/* Welcome & Scale Banner */}
      <div className="flex flex-col gap-4 rounded-2xl border bg-gradient-to-r from-primary/10 via-card to-card p-5 sm:flex-row sm:items-center sm:justify-between shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Centralized Automation Hub
            </h2>
            <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
              Production Active
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
            Scalable multi-page architecture designed to manage up to 100 Facebook Pages simultaneously with autonomous AI content generation, 9:16 video compilation, and Meta publishing.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchDashboardData(true)}
            className="h-9 gap-1.5 text-xs"
            disabled={refreshing}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Link href="/dashboard/pages">
            <Button size="sm" className="h-9 gap-1.5 text-xs font-semibold shadow-xs bg-indigo-600 hover:bg-indigo-700 text-white">
              <Layers className="h-3.5 w-3.5" />
              Manage Pages ({pagesCount}/100)
            </Button>
          </Link>

          <Link href="/dashboard/content">
            <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
              <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
              AI Studio
            </Button>
          </Link>
        </div>
      </div>

      {/* 1. Statistics Cards */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Live Network Telemetry & Performance
          </h3>
          <span className="text-[11px] text-muted-foreground font-mono">
            {pagesCount} Managed Pages Active
          </span>
        </div>
        <StatsCards metrics={data?.metrics} loading={loading} />
      </section>

      {/* 2. Connected Pages & Publishing Queue (2 columns) */}
      <section className="grid gap-6 lg:grid-cols-2">
        <ConnectedPagesPreview pages={data?.connected_pages} loading={loading} />
        <QueuePreview items={data?.queue_items} loading={loading} />
      </section>

      {/* 3. Recent Activity Section */}
      <section>
        <RecentActivity activities={data?.recent_activity} loading={loading} />
      </section>
    </div>
  );
}
