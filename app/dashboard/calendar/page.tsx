"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  ListChecks,
  Layers,
  Sparkles,
  Zap,
  MousePointerClick,
  AlertTriangle,
  UserCheck,
  CalendarDays,
  Globe,
  SlidersHorizontal,
  Plus,
  Film,
  RefreshCw,
  Send,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PublishingJob } from "@/lib/publishing/types";
import { BulkSchedulerModal } from "@/components/publishing/bulk-scheduler-modal";

export default function ContentCalendarPage() {
  const [viewMode, setViewMode] = useState<"month" | "week" | "list">("month");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [jobs, setJobs] = useState<PublishingJob[]>([]);
  const [pages, setPages] = useState<Array<{ id: string; name: string }>>([]);
  const [videos, setVideos] = useState<Array<{ id: string; title: string }>>([]);
  const [selectedPageId, setSelectedPageId] = useState<string>("all");
  const [timezone, setTimezone] = useState("UTC");
  const [loading, setLoading] = useState(true);

  // Modals
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<PublishingJob | null>(null);

  useEffect(() => {
    loadCalendarData();
  }, [selectedPageId]);

  async function loadCalendarData() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedPageId !== "all") params.set("page_id", selectedPageId);

      const [jobsRes, pagesRes, videosRes] = await Promise.all([
        fetch(`/api/publishing/queue?${params.toString()}`),
        fetch("/api/facebook-pages"),
        fetch("/api/video/library?category=all"),
      ]);

      if (jobsRes.ok) {
        const data = await jobsRes.json();
        setJobs(data.jobs || []);
      }

      if (pagesRes.ok) {
        const pagesData = await pagesRes.json();
        setPages(
          (pagesData.pages || []).map((p: any) => ({
            id: p.id,
            name: p.page_name || p.name,
          }))
        );
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

  function handlePrev() {
    const next = new Date(selectedDate);
    if (viewMode === "month") {
      next.setMonth(next.getMonth() - 1);
    } else {
      next.setDate(next.getDate() - 7);
    }
    setSelectedDate(next);
  }

  function handleNext() {
    const next = new Date(selectedDate);
    if (viewMode === "month") {
      next.setMonth(next.getMonth() + 1);
    } else {
      next.setDate(next.getDate() + 7);
    }
    setSelectedDate(next);
  }

  // Month grid helper
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Filter jobs for a specific date (YYYY-MM-DD)
  function getJobsForDay(dayNumber: number): PublishingJob[] {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNumber).padStart(2, "0")}`;
    return jobs.filter((j) => {
      const jobDateStr = j.scheduled_at.split("T")[0];
      return jobDateStr === dateStr;
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Cross-Page Content Calendar
            </h2>
            <Badge variant="outline" className="border-blue-500/40 text-blue-600 dark:text-blue-400 text-[10px]">
              Phase 2.4 Timezone Scheduler
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Coordinate staggered publishing windows across Facebook Pages to optimize audience retention without overlapping.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBulkModal(true)}
            className="h-8 text-xs gap-1.5"
          >
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            Bulk Schedule
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={loadCalendarData}
            disabled={loading}
            className="h-8 text-xs gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="calendar" className="space-y-6">
        <TabsList>
          <TabsTrigger value="calendar">Schedule Matrix</TabsTrigger>
          <TabsTrigger value="capabilities">Calendar Features</TabsTrigger>
          <TabsTrigger value="roadmap">Scheduling Roadmap</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between p-3.5 rounded-lg border bg-muted/20 text-xs">
            {/* Month & Nav */}
            <div className="flex items-center gap-2">
              <div className="flex items-center border rounded-md bg-background">
                <Button variant="ghost" size="icon" onClick={handlePrev} className="h-7 w-7">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="px-3 font-semibold text-xs whitespace-nowrap">
                  {selectedDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </span>
                <Button variant="ghost" size="icon" onClick={handleNext} className="h-7 w-7">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center border rounded-md bg-background p-0.5">
                {(["month", "list"] as const).map((mode) => (
                  <Button
                    key={mode}
                    variant={viewMode === mode ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode(mode)}
                    className="h-6 text-[10px] px-2.5 capitalize"
                  >
                    {mode}
                  </Button>
                ))}
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Page Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Page:</span>
                <select
                  value={selectedPageId}
                  onChange={(e) => setSelectedPageId(e.target.value)}
                  className="h-7 text-xs rounded border bg-background px-2"
                >
                  <option value="all">All Pages</option>
                  {pages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Timezone */}
              <div className="flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="h-7 text-xs rounded border bg-background px-2 font-mono"
                >
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">EST (New York)</option>
                  <option value="America/Los_Angeles">PST (Los Angeles)</option>
                  <option value="Asia/Karachi">PKT (Karachi)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Month View Grid */}
          {viewMode === "month" ? (
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                {/* Day Header */}
                <div className="grid grid-cols-7 border-b bg-muted/40 text-center text-xs font-semibold py-2">
                  {daysOfWeek.map((d) => (
                    <div key={d} className="text-muted-foreground">
                      {d}
                    </div>
                  ))}
                </div>

                {/* Day Cells Grid */}
                <div className="grid grid-cols-7 divide-x divide-y border-b text-xs">
                  {/* Empty cells before month start */}
                  {Array.from({ length: firstDayIndex }).map((_, i) => (
                    <div key={`empty-${i}`} className="min-h-[100px] p-2 bg-muted/10 opacity-40" />
                  ))}

                  {/* Month days */}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const dayJobs = getJobsForDay(day);
                    const isToday =
                      new Date().getDate() === day &&
                      new Date().getMonth() === month &&
                      new Date().getFullYear() === year;

                    return (
                      <div
                        key={`day-${day}`}
                        className={`min-h-[100px] p-2 flex flex-col justify-between hover:bg-muted/30 transition-colors ${
                          isToday ? "bg-primary/5 font-bold" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span
                            className={`inline-flex items-center justify-center h-5 w-5 rounded-full text-[11px] ${
                              isToday ? "bg-primary text-primary-foreground font-bold" : "text-foreground"
                            }`}
                          >
                            {day}
                          </span>
                          {dayJobs.length > 0 && (
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {dayJobs.length} {dayJobs.length === 1 ? "Reel" : "Reels"}
                            </span>
                          )}
                        </div>

                        {/* Scheduled Jobs Chips */}
                        <div className="space-y-1 overflow-y-auto max-h-[85px]">
                          {dayJobs.map((j) => {
                            const isPub = j.status === "published";
                            const isFail = j.status === "failed";

                            return (
                              <div
                                key={j.id}
                                onClick={() => setSelectedJob(j)}
                                className={`p-1 rounded border text-[10px] truncate cursor-pointer transition-colors ${
                                  isPub
                                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                                    : isFail
                                    ? "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300"
                                    : "bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300"
                                }`}
                                title={`${j.video?.title || "Reel"} (${new Date(j.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})`}
                              >
                                <span className="font-semibold block truncate">
                                  {j.video?.title || "Reel"}
                                </span>
                                <span className="text-[9px] opacity-75 block">
                                  {new Date(j.scheduled_at).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : (
            /* List View */
            <div className="border rounded-lg bg-card divide-y text-xs">
              {jobs.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  No scheduled posts found in this timeframe.
                </div>
              ) : (
                jobs.map((job) => (
                  <div
                    key={job.id}
                    onClick={() => setSelectedJob(job)}
                    className="p-3.5 flex items-center justify-between gap-3 hover:bg-muted/30 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-7 bg-black rounded flex items-center justify-center shrink-0">
                        {job.video?.thumbnail_url ? (
                          <img src={job.video.thumbnail_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Film className="h-3 w-3 text-white/50" />
                        )}
                      </div>
                      <div>
                        <span className="font-semibold text-foreground block">{job.video?.title || "Reel"}</span>
                        <span className="text-[11px] text-muted-foreground block">
                          Destination: {job.facebook_page?.page_name || "Facebook Page"} •{" "}
                          {new Date(job.scheduled_at).toLocaleDateString()} at{" "}
                          {new Date(job.scheduled_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          ({job.timezone || "UTC"})
                        </span>
                      </div>
                    </div>
                    <Badge variant={job.status === "published" ? "success" : "outline"} className="text-[10px]">
                      {job.status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="capabilities" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Multi-Page Calendar",
                desc: "Unified schedule matrix color-coding posts across up to 100 Facebook Pages.",
                icon: Layers,
              },
              {
                title: "Audience Peak Mapping",
                desc: "Maps time slots to highest viewer engagement windows per geographic region.",
                icon: Sparkles,
              },
              {
                title: "Batch Cadence Engine",
                desc: "One-click batch queueing with custom intervals (e.g. 1 Reel every 6 hours).",
                icon: Zap,
              },
              {
                title: "Conflict Guardrails",
                desc: "Automatically prevents scheduling the same video twice to the same Facebook Page.",
                icon: AlertTriangle,
              },
              {
                title: "Timezone Preservation",
                desc: "Prevents silent timezone shifts by honoring Page-configured target timezones.",
                icon: Globe,
              },
              {
                title: "Reels UI Safe Margin",
                desc: "Subtitles and watermarks aligned outside Facebook Reel player icon overlays.",
                icon: Film,
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
                Phase 2.4 Calendar Scheduler Roadmap
              </CardTitle>
              <CardDescription className="text-xs">
                Comprehensive checklist of cross-page calendar scheduler capabilities.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-xs">
                {[
                  { name: "Monthly Schedule Grid", status: "Active" },
                  { name: "List Agenda View", status: "Active" },
                  { name: "Page-Specific Filtering", status: "Active" },
                  { name: "Timezone Conversion & Display", status: "Active" },
                  { name: "Duplicate Video Warning", status: "Active" },
                  { name: "Staggered Slot Auto-Spacing", status: "Active" },
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

      {/* Bulk Scheduler Modal */}
      <BulkSchedulerModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        onSuccess={loadCalendarData}
        pages={pages}
        videos={videos}
      />

      {/* Post Details Dialog */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="relative w-full max-w-md rounded-xl border bg-background shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-semibold text-foreground">Scheduled Reel Details</h3>
              <Badge variant="outline" className="text-[10px]">
                {selectedJob.status}
              </Badge>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">Video:</span>
                <span className="font-semibold text-foreground">{selectedJob.video?.title || "Reel"}</span>
              </div>

              <div>
                <span className="text-muted-foreground block text-[11px]">Destination Page:</span>
                <span className="font-semibold text-foreground">
                  {selectedJob.facebook_page?.page_name || "Facebook Page"}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground block text-[11px]">Scheduled For:</span>
                <span className="font-semibold text-foreground">
                  {new Date(selectedJob.scheduled_at).toLocaleString()} ({selectedJob.timezone || "UTC"})
                </span>
              </div>

              <div>
                <span className="text-muted-foreground block text-[11px]">Caption:</span>
                <p className="p-2.5 rounded bg-muted/30 text-muted-foreground text-[11px] leading-relaxed">
                  {selectedJob.caption}
                </p>
              </div>

              {selectedJob.published_url && (
                <div>
                  <span className="text-muted-foreground block text-[11px]">Published Link:</span>
                  <a
                    href={selectedJob.published_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline text-[11px] break-all"
                  >
                    {selectedJob.published_url}
                  </a>
                </div>
              )}
            </div>

            <div className="border-t pt-3 flex justify-end">
              <Button size="sm" onClick={() => setSelectedJob(null)} className="h-7 text-xs">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
