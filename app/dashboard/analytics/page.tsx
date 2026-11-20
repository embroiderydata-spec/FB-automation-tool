"use client";

import React from "react";
import {
  BarChart3,
  TrendingUp,
  Users,
  Eye,
  MessageCircle,
  Share2,
  CheckCircle2,
  ListChecks,
  LineChart,
  BrainCircuit,
  FileDown,
  Sparkles,
  PieChart,
  Layers,
  Video,
  Award,
  Clock,
  ArrowUpRight,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AnalyticsPage() {
  const metricHighlights = [
    { label: "Aggregate Views", value: "2.4M", subtext: "+14.2% this month", icon: Eye },
    { label: "Total Reach", value: "890K", subtext: "Across 3 connected pages", icon: Share2 },
    { label: "Engagements", value: "142.5K", subtext: "Comments, shares, reactions", icon: MessageCircle },
    { label: "Net Followers Added", value: "+8,420", subtext: "Organic algorithm growth", icon: Users },
  ];

  const featureCards = [
    {
      id: "A",
      title: "Cross-Page Analytics",
      icon: Layers,
      badge: "Phase 2 Planned",
      tagline: "Portfolio-Wide Performance Dashboard",
      description:
        "Monitor performance metrics across all connected Facebook Pages from a single centralized dashboard.",
      capabilities: [
        "Aggregate & per-Page views, reach, and impressions",
        "Niche-by-niche comparison benchmarks",
        "Cross-page engagement rate ranking",
      ],
    },
    {
      id: "B",
      title: "Video Performance",
      icon: Video,
      badge: "Phase 2 Planned",
      tagline: "Granular Retention & Watch-Time Telemetry",
      description:
        "Track views, average watch time, 3-second hook retention, and engagement drop-off for each published Reel.",
      capabilities: [
        "First-3-second retention curve analysis",
        "Average percentage watched metrics",
        "Post-level likes, comments, shares, and saves",
      ],
    },
    {
      id: "C",
      title: "Growth Tracking",
      icon: TrendingUp,
      badge: "Phase 2 Planned",
      tagline: "Follower & Audience Demographic Trends",
      description:
        "Monitor follower growth, reach expansion, and audience demographic trends over time.",
      capabilities: [
        "Daily, weekly, and monthly follower velocity",
        "Audience geography & language distribution",
        "Organic vs. viral distribution telemetry",
      ],
    },
    {
      id: "D",
      title: "Content Intelligence",
      icon: Award,
      badge: "Phase 2 Planned",
      tagline: "Winner / Loser Content Pattern Mining",
      description:
        "Identify top-performing topics, hooks, and formats to guide future content generation and double down on winners.",
      capabilities: [
        "Automated top 10% vs bottom 10% classification",
        "Hook-to-retention correlation mapping",
        "Format comparisons (30s vs 60s Reels)",
      ],
    },
    {
      id: "E",
      title: "AI Insights",
      icon: BrainCircuit,
      badge: "Phase 2 Planned",
      tagline: "Automated Strategy Recommendations",
      description:
        "Receive automated AI recommendations on optimal posting schedules, content improvements, and niche opportunities.",
      capabilities: [
        "AI-generated weekly executive summaries",
        "Best posting times analysis per Page timezone",
        "Suggested script angle improvements",
      ],
    },
    {
      id: "F",
      title: "Reports & Export",
      icon: FileDown,
      badge: "Phase 2 Planned",
      tagline: "Automated CSV & PDF Performance Exports",
      description:
        "Generate and export comprehensive performance reports for individual Pages or the entire portfolio.",
      capabilities: [
        "One-click CSV raw data exports",
        "Executive PDF summary reports",
        "Scheduled email report delivery",
      ],
    },
  ];

  const roadmapItems = [
    { title: "Facebook Page Insights API Integration", status: "Planned Phase 2" },
    { title: "Video Views & Watch-Time Tracking", status: "Planned Phase 2" },
    { title: "Reach & Impressions Measurement", status: "Planned Phase 2" },
    { title: "Engagement Metrics (Likes, Comments, Shares)", status: "Planned Phase 2" },
    { title: "Follower Growth Tracking Over Time", status: "Planned Phase 2" },
    { title: "Audience Retention & 3s Drop-off Curves", status: "Planned Phase 2" },
    { title: "Top-Performing Content Identification", status: "Planned Phase 2" },
    { title: "Low-Performing Content Identification", status: "Planned Phase 2" },
    { title: "Cross-Page Performance Comparison", status: "Planned Phase 2" },
    { title: "Performance by Niche and Category", status: "Planned Phase 2" },
    { title: "Best Posting Times Empirical Analysis", status: "Planned Phase 2" },
    { title: "Daily, Weekly, and Monthly Reports", status: "Planned Phase 2" },
    { title: "Performance Export (CSV & PDF)", status: "Planned Phase 2" },
    { title: "AI Performance Summaries & Recommendations", status: "Planned Phase 2" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Cross-Page Analytics & Insights
            </h2>
            <Badge variant="demo" className="text-[10px]">
              Demo Aggregation
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Centralized telemetry tracking reach, viral coefficient, and engagement trends stored in <code>analytics_daily</code>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" disabled>
            <FileDown className="h-3.5 w-3.5" />
            Export CSV (Phase 2)
          </Button>
        </div>
      </div>

      {/* Demo Notice Banner */}
      <div className="flex items-center justify-between p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-xs">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="text-foreground">
            <strong>Telemetry Engine Status:</strong> Showing sample demonstration figures. Database table <code>analytics_daily</code> is indexed on <code>(page_id, date)</code> ready for Phase 2 Meta Insights API ingestion.
          </span>
        </div>
        <Badge variant="outline" className="text-[10px] shrink-0 border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
          Sample Data
        </Badge>
      </div>

      {/* Top Aggregation Cards (Sample Data) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metricHighlights.map((m) => {
          const Icon = m.icon;
          return (
            <Card key={m.label} className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {m.label}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight">{m.value}</div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                  {m.subtext}
                </p>
                <span className="text-[9px] text-muted-foreground/60 italic block mt-1">
                  Demo Sample Telemetry
                </span>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="roadmap" className="space-y-6">
        <TabsList>
          <TabsTrigger value="roadmap">Phase 2 Architecture & Roadmap</TabsTrigger>
          <TabsTrigger value="charts">Telemetry Dashboard (Demo Preview)</TabsTrigger>
        </TabsList>

        <TabsContent value="roadmap" className="space-y-6">
          {/* Phase 2 Feature Cards Grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Phase 2 Analytics Engine Architecture</h3>
                <p className="text-xs text-muted-foreground">
                  Official Facebook Page Insights synchronization, audience drop-off modeling, and AI content diagnostics.
                </p>
              </div>
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                6 Core Modules
              </Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {featureCards.map((feature) => {
                const Icon = feature.icon;
                return (
                  <Card key={feature.title} className="flex flex-col justify-between hover:border-emerald-500/40 transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="text-[10px] font-mono text-muted-foreground uppercase">Module {feature.id}</span>
                            <CardTitle className="text-sm font-semibold">{feature.title}</CardTitle>
                          </div>
                        </div>
                        <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] shrink-0">
                          {feature.badge}
                        </Badge>
                      </div>
                      <CardDescription className="text-xs font-medium text-foreground/80 mt-1">
                        {feature.tagline}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {feature.description}
                      </p>
                      <div className="space-y-1.5 pt-2 border-t">
                        {feature.capabilities.map((cap) => (
                          <div key={cap} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                            <span>{cap}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Capabilities Roadmap Checklist */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <ListChecks className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    Phase 2 Analytics Capabilities Roadmap
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Comprehensive checklist of telemetry, content intelligence, and reporting features planned for implementation.
                  </CardDescription>
                </div>
                <Badge variant="demo" className="text-[10px]">
                  Database Schemas Ready
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {roadmapItems.map((item) => (
                  <div
                    key={item.title}
                    className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <span className="font-medium text-foreground">{item.title}</span>
                    </div>
                    <Badge variant="outline" className="text-[9px] border-muted-foreground/30 text-muted-foreground">
                      {item.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="charts" className="space-y-6">
          <EmptyState
            icon={BarChart3}
            title="Automated Facebook Insights Webhook Sync"
            description="The table `analytics_daily` is fully structured with indexes and constraints on (page_id, date). In Phase 2, daily synchronizers will pull official Facebook Page Insights API metrics directly into this dashboard."
            phase="Phase 2 Telemetry"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
