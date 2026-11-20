"use client";

import React from "react";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { ConnectedPagesPreview } from "@/components/dashboard/connected-pages-preview";
import { QueuePreview } from "@/components/dashboard/queue-preview";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Info, Sparkles, Layers, ArrowUpRight, Zap, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function DashboardOverviewPage() {
  return (
    <div className="space-y-6">
      {/* Welcome & Scale Banner */}
      <div className="flex flex-col gap-4 rounded-2xl border bg-gradient-to-r from-primary/10 via-card to-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Centralized Automation Hub
            </h2>
            <Badge variant="success" className="text-[10px]">
              Foundation Ready
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
            Architected to manage and scale up to 100 Facebook Pages simultaneously.
            Phase 1 provides the core structure, authenticated dashboard, database schemas, and navigation.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link href="/dashboard/pages">
            <Button size="sm" className="h-9 gap-1.5 text-xs font-semibold shadow-xs">
              <Layers className="h-3.5 w-3.5" />
              Manage Pages (3/100)
            </Button>
          </Link>
          <Link href="/dashboard/content">
            <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              AI Studio Preview
            </Button>
          </Link>
        </div>
      </div>

      {/* 1. Statistics Cards */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Key Performance Metrics
          </h3>
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Info className="h-3 w-3" />
            Showing realistic baseline data marked as Demo
          </span>
        </div>
        <StatsCards />
      </section>

      {/* 2. Connected Pages & Publishing Queue (2 columns) */}
      <section className="grid gap-6 lg:grid-cols-2">
        <ConnectedPagesPreview />
        <QueuePreview />
      </section>

      {/* 3. Recent Activity Section */}
      <section>
        <RecentActivity />
      </section>
    </div>
  );
}
