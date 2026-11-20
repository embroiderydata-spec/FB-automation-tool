"use client";

import React, { useState, useEffect } from "react";
import {
  Clock,
  RefreshCw,
  Send,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  OctagonAlert,
  ShieldAlert,
  Server,
  RotateCcw,
  Activity,
  KeyRound,
  ListChecks,
  Sliders,
  ExternalLink,
  Film,
  Zap,
  MoreVertical,
  XCircle,
  Eye,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PublishingJob, PublishingJobStatus } from "@/lib/publishing/types";
import { JobLogsDrawer } from "@/components/publishing/job-logs-drawer";
import { BulkSchedulerModal } from "@/components/publishing/bulk-scheduler-modal";
import { PublishConfirmationModal } from "@/components/publishing/publish-confirmation-modal";

export default function PublishingQueuePage() {
  const [jobs, setJobs] = useState<PublishingJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedPageId, setSelectedPageId] = useState<string>("all");
  const [pages, setPages] = useState<Array<{ id: string; name: string }>>([]);
  const [videos, setVideos] = useState<Array<{ id: string; title: string; video_url?: string; thumbnail_url?: string }>>([]);

  // Emergency stop state
  const [emergencyPaused, setEmergencyPaused] = useState(false);
  const [togglingEmergency, setTogglingEmergency] = useState(false);

  // Worker trigger state
  const [runningWorker, setRunningWorker] = useState(false);

  // Selected job for logs drawer
  const [logJobId, setLogJobId] = useState<string | null>(null);

  // Modals
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [publishModalJob, setPublishModalJob] = useState<PublishingJob | null>(null);

  useEffect(() => {
    loadData();
    loadEmergencyStatus();
  }, [selectedStatus, selectedPageId]);

  async function loadData() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedStatus !== "all") params.set("status", selectedStatus);
      if (selectedPageId !== "all") params.set("page_id", selectedPageId);

      const [jobsRes, pagesRes, videosRes] = await Promise.all([
        fetch(`/api/publishing/queue?${params.toString()}`),
        fetch("/api/facebook-pages"),
        fetch("/api/video/library?category=all"),
      ]);

      if (jobsRes.ok) {
        const jobsData = await jobsRes.json();
        setJobs(jobsData.jobs || []);
      }

      if (pagesRes.ok) {
        const pagesData = await pagesRes.json();
        const pList = (pagesData.pages || []).map((p: any) => ({
          id: p.id,
          name: p.page_name || p.name,
        }));
        setPages(pList);
      }

      if (videosRes.ok) {
        const videosData = await videosRes.json();
        setVideos(videosData.videos || []);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }

  async function loadEmergencyStatus() {
    try {
      const res = await fetch("/api/publishing/emergency");
      if (res.ok) {
        const data = await res.json();
        setEmergencyPaused(Boolean(data.paused));
      }
    } catch {
      // Ignore
    }
  }

  async function toggleEmergencyStop() {
    try {
      setTogglingEmergency(true);
      const nextState = !emergencyPaused;
      const res = await fetch("/api/publishing/emergency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paused: nextState }),
      });
      if (res.ok) {
        setEmergencyPaused(nextState);
      }
    } catch {
      // Ignore
    } finally {
      setTogglingEmergency(false);
    }
  }

  async function handleTriggerWorker() {
    try {
      setRunningWorker(true);
      const res = await fetch("/api/publishing/worker", { method: "POST" });
      if (res.ok) {
        await loadData();
      }
    } catch {
      // Ignore
    } finally {
      setRunningWorker(false);
    }
  }

  async function handleJobAction(jobId: string, action: "retry" | "cancel" | "publish_now") {
    try {
      await fetch(`/api/publishing/queue/${jobId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      loadData();
    } catch {
      // Ignore
    }
  }

  const statusBadges: Record<
    PublishingJobStatus,
    { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" }
  > = {
    draft: { label: "Draft", variant: "outline" },
    pending_approval: { label: "Pending Approval", variant: "outline" },
    approved: { label: "Approved", variant: "secondary" },
    scheduled: { label: "Scheduled", variant: "default" },
    queued: { label: "Queued", variant: "secondary" },
    uploading: { label: "Uploading", variant: "secondary" },
    processing: { label: "Processing", variant: "secondary" },
    publishing: { label: "Publishing", variant: "secondary" },
    published: { label: "Published", variant: "success" },
    completed: { label: "Completed", variant: "success" },
    failed: { label: "Failed", variant: "destructive" },
    cancelled: { label: "Cancelled", variant: "outline" },
    retrying: { label: "Retrying", variant: "secondary" },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Publishing Queue & Dispatcher
            </h2>
            <Badge variant="outline" className="border-blue-500/40 text-blue-600 dark:text-blue-400 text-[10px]">
              Phase 2.4 Auto-Publisher
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitors real-time Reels upload states, exponential backoff retries, and official Meta Graph API dispatching.
          </p>
        </div>

        {/* Global Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant={emergencyPaused ? "destructive" : "outline"}
            size="sm"
            onClick={toggleEmergencyStop}
            disabled={togglingEmergency}
            className="h-8 text-xs gap-1.5"
          >
            {togglingEmergency ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : emergencyPaused ? (
              <>
                <Play className="h-3.5 w-3.5 text-white" />
                Resume All Queues
              </>
            ) : (
              <>
                <Pause className="h-3.5 w-3.5 text-amber-500" />
                Pause All Queues
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBulkModal(true)}
            className="h-8 text-xs gap-1.5"
          >
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            Bulk Scheduler
          </Button>

          <Button
            size="sm"
            onClick={handleTriggerWorker}
            disabled={runningWorker}
            className="h-8 text-xs gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${runningWorker ? "animate-spin" : ""}`} />
            Run Worker Pass
          </Button>
        </div>
      </div>

      {/* Emergency Stop Alert Banner */}
      {emergencyPaused && (
        <Card className="border-red-500/40 bg-red-500/10">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-xs text-red-700 dark:text-red-300">
              <OctagonAlert className="h-4 w-4 shrink-0 text-red-600" />
              <span className="font-semibold">
                EMERGENCY STOP ACTIVE — All background publishing workers are paused.
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={toggleEmergencyStop}
              className="h-7 text-xs bg-background"
            >
              Resume Dispatching
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Main Tabs Container */}
      <Tabs defaultValue="queue" className="space-y-6">
        <TabsList>
          <TabsTrigger value="queue">Active Queue ({jobs.length})</TabsTrigger>
          <TabsTrigger value="capabilities">Queue Capabilities</TabsTrigger>
          <TabsTrigger value="roadmap">Publishing Roadmap</TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between p-3 rounded-lg border bg-muted/20 text-xs">
            {/* Status Filter Buttons */}
            <div className="flex flex-wrap gap-1">
              {[
                { id: "all", label: "All" },
                { id: "scheduled", label: "Scheduled" },
                { id: "queued", label: "Queued" },
                { id: "published", label: "Published" },
                { id: "failed", label: "Failed" },
                { id: "cancelled", label: "Cancelled" },
              ].map((filter) => (
                <Button
                  key={filter.id}
                  variant={selectedStatus === filter.id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedStatus(filter.id)}
                  className="h-7 text-[11px] px-2.5"
                >
                  {filter.label}
                </Button>
              ))}
            </div>

            {/* Page Selector */}
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground whitespace-nowrap">Filter Page:</span>
              <select
                value={selectedPageId}
                onChange={(e) => setSelectedPageId(e.target.value)}
                className="h-7 text-xs rounded border bg-background px-2"
              >
                <option value="all">All Connected Pages</option>
                {pages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Jobs Table */}
          <div className="rounded-lg border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/40 text-muted-foreground">
                    <th className="py-2.5 px-4 text-left font-semibold">Video</th>
                    <th className="py-2.5 px-4 text-left font-semibold">Facebook Page</th>
                    <th className="py-2.5 px-4 text-left font-semibold">Caption</th>
                    <th className="py-2.5 px-4 text-left font-semibold">Scheduled Date / Time</th>
                    <th className="py-2.5 px-4 text-left font-semibold">Status</th>
                    <th className="py-2.5 px-4 text-left font-semibold">Attempts</th>
                    <th className="py-2.5 px-4 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted-foreground">
                        <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                        Loading queue telemetry...
                      </td>
                    </tr>
                  ) : jobs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted-foreground">
                        <Clock className="h-6 w-6 mx-auto mb-2 opacity-40" />
                        No publishing jobs found for this filter.
                      </td>
                    </tr>
                  ) : (
                    jobs.map((job) => {
                      const badgeInfo = statusBadges[job.status] || {
                        label: job.status,
                        variant: "outline",
                      };

                      return (
                        <tr key={job.id} className="hover:bg-muted/30 transition-colors">
                          {/* Video */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2 max-w-[220px]">
                              <div className="h-10 w-7 bg-black rounded overflow-hidden shrink-0 flex items-center justify-center">
                                {job.video?.thumbnail_url ? (
                                  <img
                                    src={job.video.thumbnail_url}
                                    alt=""
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <Film className="h-3 w-3 text-white/50" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <span className="font-semibold block truncate">
                                  {job.video?.title || "Reel Video"}
                                </span>
                                <span className="text-[10px] text-muted-foreground block">
                                  {job.video?.duration_seconds
                                    ? `${Math.round(job.video.duration_seconds)}s`
                                    : "30s"} • 9:16
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Facebook Page */}
                          <td className="py-3 px-4 font-medium text-foreground">
                            {job.facebook_page?.page_name || "Connected Page"}
                          </td>

                          {/* Caption */}
                          <td className="py-3 px-4 max-w-[200px]">
                            <p className="line-clamp-2 text-muted-foreground text-[11px]">
                              {job.caption}
                            </p>
                          </td>

                          {/* Scheduled Date/Time */}
                          <td className="py-3 px-4 text-muted-foreground">
                            <div className="flex flex-col">
                              <span>
                                {new Date(job.scheduled_at).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                              <span className="text-[10px] opacity-75">
                                {new Date(job.scheduled_at).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}{" "}
                                ({job.timezone || "UTC"})
                              </span>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4">
                            <Badge variant={badgeInfo.variant} className="text-[10px]">
                              {badgeInfo.label}
                            </Badge>
                            {job.is_test_mode && (
                              <span className="block text-[9px] text-amber-600 dark:text-amber-400 font-mono mt-0.5">
                                [TEST MODE]
                              </span>
                            )}
                            {job.error_message && (
                              <span className="block text-[9px] text-red-500 font-mono truncate max-w-[120px] mt-0.5" title={job.error_message}>
                                {job.error_message}
                              </span>
                            )}
                          </td>

                          {/* Attempts */}
                          <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground">
                            {job.attempts} / {job.max_attempts}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {job.status === "failed" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleJobAction(job.id, "retry")}
                                  className="h-6 text-[10px] px-2 text-blue-600"
                                >
                                  <RotateCcw className="h-3 w-3 mr-1" /> Retry
                                </Button>
                              )}

                              {(job.status === "scheduled" || job.status === "approved") && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleJobAction(job.id, "publish_now")}
                                  className="h-6 text-[10px] px-2 text-emerald-600"
                                >
                                  Publish Now
                                </Button>
                              )}

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setLogJobId(job.id)}
                                className="h-6 text-[10px] px-2 text-muted-foreground"
                              >
                                Logs
                              </Button>

                              {job.status !== "published" && job.status !== "cancelled" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleJobAction(job.id, "cancel")}
                                  className="h-6 text-[10px] px-1.5 text-red-500"
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="capabilities" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Official Reels Publisher",
                desc: "Direct chunked upload protocol using Meta Graph API v21.0 POST /{page_id}/video_reels.",
                icon: Send,
              },
              {
                title: "Exponential Backoff",
                desc: "Recovers from rate limits and network drops with delays of 1m, 5m, and 15m.",
                icon: RotateCcw,
              },
              {
                title: "Reconciliation Engine",
                desc: "Prevents accidental duplicate Reels by checking Meta server state before retrying uncertain jobs.",
                icon: ShieldCheck,
              },
              {
                title: "Emergency Kill-Switch",
                desc: "Instantly suspends all publishing globally across all 100 Pages with persistent database state.",
                icon: OctagonAlert,
              },
              {
                title: "Test Mode Simulation",
                desc: "Validates credentials, permissions, and 9:16 aspect ratios safely without public postings.",
                icon: ShieldAlert,
              },
              {
                title: "Timezone-Aware Dispatching",
                desc: "Dispatches posts according to Page audience peak activity hours and custom cadences.",
                icon: Clock,
              },
            ].map((card, idx) => {
              const Icon = card.icon;
              return (
                <Card key={idx}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                      <CardTitle className="text-sm font-semibold">{card.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground leading-relaxed">{card.desc}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="roadmap" className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-primary" />
                Phase 2.4 Publishing Capabilities
              </CardTitle>
              <CardDescription className="text-xs">
                Checklist of active auto-publishing, scheduler, and error reconciliation systems.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-xs">
                {[
                  { name: "Official Reels 3-Phase Upload", status: "Active" },
                  { name: "Test Mode Simulation Engine", status: "Active" },
                  { name: "Manual 'Publish Now' Workflow", status: "Active" },
                  { name: "Bulk Scheduling Matrix", status: "Active" },
                  { name: "Exponential Backoff (1m/5m/15m)", status: "Active" },
                  { name: "Duplicate Conflict Detection", status: "Active" },
                  { name: "Emergency Stop Kill-Switch", status: "Active" },
                  { name: "Publishing Audit Logs", status: "Active" },
                  { name: "Timezone-Preserved Scheduling", status: "Active" },
                ].map((item, idx) => (
                  <div key={idx} className="p-2.5 rounded border bg-muted/20 flex items-center justify-between">
                    <span className="font-medium text-foreground">{item.name}</span>
                    <Badge variant="success" className="text-[9px]">
                      {item.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Logs Drawer */}
      <JobLogsDrawer
        jobId={logJobId}
        isOpen={Boolean(logJobId)}
        onClose={() => setLogJobId(null)}
      />

      {/* Bulk Scheduler Modal */}
      <BulkSchedulerModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        onSuccess={loadData}
        pages={pages}
        videos={videos}
      />
    </div>
  );
}
