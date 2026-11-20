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
  RotateCcw,
  X,
  Play,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
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

  // Modals & Action State
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<PublishingJob | null>(null);
  const [rescheduleInput, setRescheduleInput] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

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
    } else if (viewMode === "week") {
      next.setDate(next.getDate() - 7);
    } else {
      next.setDate(next.getDate() - 14);
    }
    setSelectedDate(next);
  }

  function handleNext() {
    const next = new Date(selectedDate);
    if (viewMode === "month") {
      next.setMonth(next.getMonth() + 1);
    } else if (viewMode === "week") {
      next.setDate(next.getDate() + 7);
    } else {
      next.setDate(next.getDate() + 14);
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
      const jobDateStr = j.scheduled_at ? j.scheduled_at.split("T")[0] : "";
      return jobDateStr === dateStr;
    });
  }

  // Week View Days calculation
  const startOfWeek = new Date(selectedDate);
  startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());
  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });

  // Handle Job Actions directly from Calendar Dialog
  async function handleJobAction(action: "reschedule" | "cancel" | "publish_now") {
    if (!selectedJob) return;
    try {
      setActionLoading(true);
      setActionNotice(null);

      const payload: any = { action };
      if (action === "reschedule") {
        if (!rescheduleInput) {
          setActionNotice("Please select a new date and time.");
          setActionLoading(false);
          return;
        }
        payload.scheduled_at = new Date(rescheduleInput).toISOString();
      }

      const res = await fetch(`/api/publishing/queue/${selectedJob.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setActionNotice(data.error || "Action failed.");
      } else {
        setActionNotice(`Success! Job ${action} executed.`);
        await loadCalendarData();
        setTimeout(() => {
          setSelectedJob(null);
          setActionNotice(null);
        }, 1200);
      }
    } catch (err: any) {
      setActionNotice(err.message || "Network error.");
    } finally {
      setActionLoading(false);
    }
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
              Multi-Timezone Scheduler
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
          <TabsTrigger value="summary">Network Queue Summary</TabsTrigger>
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
                {(["month", "week", "list"] as const).map((mode) => (
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
                  <option value="all">All Pages ({pages.length})</option>
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
          {viewMode === "month" && (
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
                                onClick={() => {
                                  setSelectedJob(j);
                                  setRescheduleInput(j.scheduled_at ? j.scheduled_at.slice(0, 16) : "");
                                }}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-medium truncate cursor-pointer transition-all ${
                                  isPub
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                    : isFail
                                    ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                                    : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 hover:bg-blue-500/20"
                                }`}
                                title={`${j.video?.title || "Reel"} (${j.status})`}
                              >
                                {j.video?.title || "Reel"}
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
          )}

          {/* Week View */}
          {viewMode === "week" && (
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="grid grid-cols-7 border-b bg-muted/40 text-center text-xs font-semibold py-2">
                  {weekDays.map((date, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <span className="text-muted-foreground text-[11px] block">{daysOfWeek[date.getDay()]}</span>
                      <span className="text-foreground font-bold">{date.getDate()}</span>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 divide-x text-xs min-h-[300px]">
                  {weekDays.map((date, idx) => {
                    const dateStr = date.toISOString().split("T")[0];
                    const dayJobs = jobs.filter((j) => j.scheduled_at && j.scheduled_at.split("T")[0] === dateStr);
                    return (
                      <div key={idx} className="p-2 space-y-1.5 bg-card hover:bg-muted/20">
                        {dayJobs.map((j) => (
                          <div
                            key={j.id}
                            onClick={() => {
                              setSelectedJob(j);
                              setRescheduleInput(j.scheduled_at ? j.scheduled_at.slice(0, 16) : "");
                            }}
                            className="p-1.5 rounded border text-[11px] cursor-pointer hover:border-primary/50 bg-background space-y-1"
                          >
                            <span className="font-semibold block truncate">{j.video?.title || "Reel"}</span>
                            <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                              <span>{new Date(j.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                              <Badge variant="outline" className="text-[8px] py-0 px-1 capitalize">
                                {j.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* List View */}
          {viewMode === "list" && (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b bg-muted/40 text-muted-foreground text-[11px] uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="px-4 py-3">Scheduled Time</th>
                        <th className="px-4 py-3">Video Title</th>
                        <th className="px-4 py-3">Facebook Page</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {jobs.map((j) => (
                        <tr key={j.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-mono text-muted-foreground whitespace-nowrap">
                            {new Date(j.scheduled_at).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 font-semibold text-foreground max-w-xs truncate">
                            {j.video?.title || "Facebook Reel"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {j.facebook_page?.page_name || "Page"}
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={
                                j.status === "published"
                                  ? "success"
                                  : j.status === "failed"
                                  ? "destructive"
                                  : "outline"
                              }
                              className="text-[10px] capitalize"
                            >
                              {j.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs text-primary"
                              onClick={() => {
                                setSelectedJob(j);
                                setRescheduleInput(j.scheduled_at ? j.scheduled_at.slice(0, 16) : "");
                              }}
                            >
                              Manage
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Network Queue Summary Tab */}
        <TabsContent value="summary" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="p-4 space-y-1">
              <span className="text-xs text-muted-foreground">Total Scheduled Posts</span>
              <p className="text-2xl font-bold font-mono">{jobs.filter((j) => j.status === "scheduled" || j.status === "queued").length}</p>
            </Card>
            <Card className="p-4 space-y-1">
              <span className="text-xs text-muted-foreground">Total Published Lifetime</span>
              <p className="text-2xl font-bold font-mono text-emerald-500">{jobs.filter((j) => j.status === "published").length}</p>
            </Card>
            <Card className="p-4 space-y-1">
              <span className="text-xs text-muted-foreground">Failed Deliveries</span>
              <p className="text-2xl font-bold font-mono text-rose-500">{jobs.filter((j) => j.status === "failed").length}</p>
            </Card>
          </div>
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

      {/* Post Details & Reschedule Dialog */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="relative w-full max-w-md rounded-xl border bg-card shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-semibold text-foreground">Scheduled Reel Details</h3>
              <Badge variant="outline" className="text-[10px] capitalize">
                {selectedJob.status}
              </Badge>
            </div>

            {actionNotice && (
              <div className="p-2.5 rounded bg-primary/10 border border-primary/20 text-primary text-xs">
                {actionNotice}
              </div>
            )}

            <div className="space-y-2">
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
                <span className="text-muted-foreground block text-[11px]">Current Slot:</span>
                <span className="font-semibold text-foreground">
                  {new Date(selectedJob.scheduled_at).toLocaleString()} ({selectedJob.timezone || "UTC"})
                </span>
              </div>

              {selectedJob.caption && (
                <div>
                  <span className="text-muted-foreground block text-[11px]">Caption:</span>
                  <p className="p-2 rounded bg-muted/30 text-muted-foreground text-[11px] leading-relaxed">
                    {selectedJob.caption}
                  </p>
                </div>
              )}

              {/* Reschedule Input */}
              <div className="pt-2 border-t space-y-1.5">
                <span className="text-muted-foreground font-semibold block text-[11px]">Reschedule Publishing Window:</span>
                <div className="flex items-center gap-2">
                  <Input
                    type="datetime-local"
                    value={rescheduleInput}
                    onChange={(e) => setRescheduleInput(e.target.value)}
                    className="h-8 text-xs bg-background"
                  />
                  <Button
                    size="sm"
                    disabled={actionLoading}
                    onClick={() => handleJobAction("reschedule")}
                    className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
                  >
                    Reschedule
                  </Button>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="border-t pt-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {selectedJob.status !== "published" && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={actionLoading}
                    onClick={() => handleJobAction("cancel")}
                    className="h-7 text-xs text-rose-500 hover:text-rose-600"
                  >
                    Cancel Post
                  </Button>
                )}

                {selectedJob.status !== "published" && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={actionLoading}
                    onClick={() => handleJobAction("publish_now")}
                    className="h-7 text-xs text-emerald-600 hover:text-emerald-700"
                  >
                    Publish Now
                  </Button>
                )}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedJob(null)}
                className="h-7 text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
