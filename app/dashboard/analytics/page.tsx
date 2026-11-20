"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  BarChart3,
  TrendingUp,
  Users,
  Eye,
  MessageCircle,
  Share2,
  CheckCircle2,
  RefreshCw,
  FileDown,
  Layers,
  Film,
  BrainCircuit,
  Calendar,
  AlertCircle,
  Clock,
  Sparkles,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CrossPageTable } from "@/components/analytics/cross-page-table";
import { VideoPerformanceTable } from "@/components/analytics/video-performance-table";
import { VideoDetailDrawer } from "@/components/analytics/video-detail-drawer";
import { AIInsightsCard } from "@/components/analytics/ai-insights-card";
import { GrowthChart } from "@/components/analytics/growth-chart";
import {
  PerformanceOverview,
  CrossPageMetric,
  VideoPerformanceItem,
  GrowthSnapshot,
  DateRangePreset,
} from "@/lib/analytics/types";
import { IntelligenceAnalysisResult } from "@/lib/analytics/ai-intelligence";

export default function AnalyticsDashboardPage() {
  const [selectedPageId, setSelectedPageId] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRangePreset>("last_30d");
  const [activeTab, setActiveTab] = useState<"overview" | "videos" | "insights" | "growth">("overview");

  // Telemetry States
  const [overview, setOverview] = useState<PerformanceOverview>({
    total_plays: null,
    total_reach: null,
    total_impressions: null,
    total_engagements: null,
    total_followers: null,
    followers_gained: null,
    followers_lost: null,
    average_watch_time: null,
    total_watch_time: null,
    published_videos: 0,
    last_synced_at: null,
    is_real_data: false,
  });

  const [pages, setPages] = useState<CrossPageMetric[]>([]);
  const [videos, setVideos] = useState<VideoPerformanceItem[]>([]);
  const [growthSnapshots, setGrowthSnapshots] = useState<GrowthSnapshot[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<IntelligenceAnalysisResult | null>(null);

  // UI state
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<VideoPerformanceItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Fetch Overview Data
  const fetchOverview = useCallback(async () => {
    try {
      const url = new URL("/api/analytics/overview", window.location.origin);
      if (selectedPageId !== "all") url.searchParams.set("page_id", selectedPageId);
      url.searchParams.set("date_range", dateRange);

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        if (data.overview) setOverview(data.overview);
      }
    } catch (err) {
      console.error("Failed to fetch analytics overview:", err);
    }
  }, [selectedPageId, dateRange]);

  // Fetch Cross-Page Metrics
  const fetchPages = useCallback(async () => {
    try {
      const res = await fetch("/api/analytics/pages");
      if (res.ok) {
        const data = await res.json();
        setPages(data.pages || []);
      }
    } catch (err) {
      console.error("Failed to fetch cross-page metrics:", err);
    }
  }, []);

  // Fetch Video Metrics
  const fetchVideos = useCallback(async () => {
    try {
      const url = new URL("/api/analytics/videos", window.location.origin);
      if (selectedPageId !== "all") url.searchParams.set("page_id", selectedPageId);
      url.searchParams.set("date_range", dateRange);

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setVideos(data.videos || []);
      }
    } catch (err) {
      console.error("Failed to fetch video analytics:", err);
    }
  }, [selectedPageId, dateRange]);

  // Fetch Growth Snapshots
  const fetchGrowth = useCallback(async () => {
    try {
      const url = new URL("/api/analytics/growth", window.location.origin);
      if (selectedPageId !== "all") url.searchParams.set("page_id", selectedPageId);

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setGrowthSnapshots(data.snapshots || []);
      }
    } catch (err) {
      console.error("Failed to fetch growth snapshots:", err);
    }
  }, [selectedPageId]);

  // Fetch AI Insights
  const fetchInsights = useCallback(async () => {
    try {
      const url = new URL("/api/analytics/insights", window.location.origin);
      if (selectedPageId !== "all") url.searchParams.set("page_id", selectedPageId);

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setAiAnalysis(data);
      }
    } catch (err) {
      console.error("Failed to fetch AI insights:", err);
    }
  }, [selectedPageId]);

  // Load all data
  const loadAllAnalytics = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchOverview(), fetchPages(), fetchVideos(), fetchGrowth(), fetchInsights()]);
    setLoading(false);
  }, [fetchOverview, fetchPages, fetchVideos, fetchGrowth, fetchInsights]);

  useEffect(() => {
    loadAllAnalytics();
  }, [loadAllAnalytics]);

  // Handle Manual Sync
  const handleTriggerSync = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/analytics/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page_id: selectedPageId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sync failed.");
      setSyncMessage(data.message || "Analytics synchronized successfully.");
      loadAllAnalytics();
    } catch (err: any) {
      setSyncMessage(`Sync Notice: ${err?.message}`);
    } finally {
      setSyncing(false);
    }
  };

  // Handle CSV Export
  const handleExportCsv = (type: "pages" | "videos" | "growth") => {
    const url = `/api/analytics/export?type=${type}&page_id=${selectedPageId}&date_range=${dateRange}`;
    window.open(url, "_blank");
  };

  const handleInspectVideo = (video: VideoPerformanceItem) => {
    setSelectedVideo(video);
    setDetailOpen(true);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Facebook Analytics & AI Intelligence
            </h1>
            <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
              Official Meta v21.0
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Real Facebook Page Insights, Reels retention telemetry, cross-page rankings, and AI-driven content strategy.
          </p>
        </div>

        {/* Global Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Page Switcher */}
          <select
            value={selectedPageId}
            onChange={(e) => setSelectedPageId(e.target.value)}
            className="h-8 rounded-lg border bg-background px-3 text-xs"
          >
            <option value="all">All Connected Pages ({pages.length})</option>
            {pages.map((p) => (
              <option key={p.page_id} value={p.page_id}>
                {p.page_name}
              </option>
            ))}
          </select>

          {/* Date Range Picker */}
          <select
            value={dateRange}
            onChange={(e: any) => setDateRange(e.target.value)}
            className="h-8 rounded-lg border bg-background px-3 text-xs"
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="last_7d">Last 7 Days</option>
            <option value="last_30d">Last 30 Days</option>
            <option value="last_90d">Last 90 Days</option>
          </select>

          {/* Sync Button */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleTriggerSync}
            disabled={syncing}
            className="h-8 text-xs gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Sync Analytics"}
          </Button>

          {/* CSV Export Button */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleExportCsv(activeTab === "videos" ? "videos" : "pages")}
            className="h-8 text-xs gap-1.5"
          >
            <FileDown className="h-3.5 w-3.5" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Sync Status Alert */}
      {syncMessage && (
        <div className="p-3 rounded-xl border bg-muted/40 text-xs text-foreground flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
            <span>{syncMessage}</span>
          </div>
          <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setSyncMessage(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {/* Real Data Banner or Waiting for Data Banner */}
      {!overview.is_real_data && (
        <div className="p-4 rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5 text-amber-900 dark:text-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
            <div>
              <div className="font-semibold">No Real Facebook Data Synchronized Yet</div>
              <div className="text-[11px] opacity-85">
                Connect your Facebook Page with Meta OAuth and click &quot;Sync Analytics&quot; to fetch official Graph API metrics.
              </div>
            </div>
          </div>
          <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white text-xs shrink-0" onClick={handleTriggerSync}>
            Sync Facebook Now
          </Button>
        </div>
      )}

      {/* 10 Performance Overview Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-xl border bg-card shadow-sm space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Eye className="h-3.5 w-3.5 text-blue-500" /> Total Plays
          </div>
          <div className="text-xl font-bold text-foreground">
            {overview.total_plays !== null ? overview.total_plays.toLocaleString() : "N/A"}
          </div>
          <div className="text-[10px] text-muted-foreground">Reels playback events</div>
        </div>

        <div className="p-3.5 rounded-xl border bg-card shadow-sm space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Share2 className="h-3.5 w-3.5 text-emerald-500" /> Total Reach
          </div>
          <div className="text-xl font-bold text-foreground">
            {overview.total_reach !== null ? overview.total_reach.toLocaleString() : "N/A"}
          </div>
          <div className="text-[10px] text-muted-foreground">Unique viewer accounts</div>
        </div>

        <div className="p-3.5 rounded-xl border bg-card shadow-sm space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <BarChart3 className="h-3.5 w-3.5 text-purple-500" /> Impressions
          </div>
          <div className="text-xl font-bold text-foreground">
            {overview.total_impressions !== null ? overview.total_impressions.toLocaleString() : "N/A"}
          </div>
          <div className="text-[10px] text-muted-foreground">Total screen feeds</div>
        </div>

        <div className="p-3.5 rounded-xl border bg-card shadow-sm space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <MessageCircle className="h-3.5 w-3.5 text-amber-500" /> Engagements
          </div>
          <div className="text-xl font-bold text-foreground">
            {overview.total_engagements !== null ? overview.total_engagements.toLocaleString() : "N/A"}
          </div>
          <div className="text-[10px] text-muted-foreground">Reactions, comments, shares</div>
        </div>

        <div className="p-3.5 rounded-xl border bg-card shadow-sm space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Users className="h-3.5 w-3.5 text-primary" /> Total Followers
          </div>
          <div className="text-xl font-bold text-foreground">
            {overview.total_followers !== null ? overview.total_followers.toLocaleString() : "N/A"}
          </div>
          <div className="text-[10px] text-muted-foreground">Across connected pages</div>
        </div>

        <div className="p-3.5 rounded-xl border bg-card shadow-sm space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" /> Net Follows Added
          </div>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {overview.followers_gained !== null
              ? `+${(overview.followers_gained - (overview.followers_lost || 0)).toLocaleString()}`
              : "N/A"}
          </div>
          <div className="text-[10px] text-muted-foreground">In selected date range</div>
        </div>

        <div className="p-3.5 rounded-xl border bg-card shadow-sm space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Clock className="h-3.5 w-3.5 text-blue-500" /> Avg Watch Time
          </div>
          <div className="text-xl font-bold text-foreground">
            {overview.average_watch_time !== null ? `${overview.average_watch_time}s` : "N/A"}
          </div>
          <div className="text-[10px] text-muted-foreground">Per playback session</div>
        </div>

        <div className="p-3.5 rounded-xl border bg-card shadow-sm space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Clock className="h-3.5 w-3.5 text-purple-500" /> Total Watch Time
          </div>
          <div className="text-xl font-bold text-foreground">
            {overview.total_watch_time !== null ? `${Math.round(overview.total_watch_time / 60)}m` : "N/A"}
          </div>
          <div className="text-[10px] text-muted-foreground">Cumulative watch minutes</div>
        </div>

        <div className="p-3.5 rounded-xl border bg-card shadow-sm space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Film className="h-3.5 w-3.5 text-primary" /> Published Reels
          </div>
          <div className="text-xl font-bold text-foreground">{overview.published_videos}</div>
          <div className="text-[10px] text-muted-foreground">Synchronized video assets</div>
        </div>

        <div className="p-3.5 rounded-xl border bg-card shadow-sm space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" /> Last Synchronized
          </div>
          <div className="text-xs font-semibold text-foreground truncate">
            {overview.last_synced_at ? new Date(overview.last_synced_at).toLocaleTimeString() : "Never"}
          </div>
          <div className="text-[10px] text-muted-foreground truncate">
            {overview.last_synced_at ? new Date(overview.last_synced_at).toLocaleDateString() : "Waiting for sync"}
          </div>
        </div>
      </div>

      {/* Module Navigation Tabs */}
      <div className="flex border-b text-xs font-medium gap-2">
        {[
          { id: "overview", label: "Cross-Page Portfolio", icon: Layers },
          { id: "videos", label: "Video Performance", icon: Film },
          { id: "insights", label: "AI Performance Intelligence", icon: BrainCircuit },
          { id: "growth", label: "Page Growth Tracking", icon: TrendingUp },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 py-2.5 px-4 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-primary text-primary font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: CROSS-PAGE PORTFOLIO BENCHMARK */}
      {activeTab === "overview" && (
        <CrossPageTable
          pages={pages}
          onSelectPage={(pageId) => {
            setSelectedPageId(pageId);
            setActiveTab("videos");
          }}
        />
      )}

      {/* TAB 2: VIDEO PERFORMANCE TABLE */}
      {activeTab === "videos" && (
        <VideoPerformanceTable videos={videos} onSelectVideo={handleInspectVideo} />
      )}

      {/* TAB 3: AI PERFORMANCE INTELLIGENCE */}
      {activeTab === "insights" && <AIInsightsCard analysis={aiAnalysis} />}

      {/* TAB 4: GROWTH TRACKING */}
      {activeTab === "growth" && <GrowthChart snapshots={growthSnapshots} />}

      {/* Detailed Video Analytics Drawer */}
      <VideoDetailDrawer
        video={selectedVideo}
        isOpen={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setSelectedVideo(null);
        }}
      />
    </div>
  );
}
