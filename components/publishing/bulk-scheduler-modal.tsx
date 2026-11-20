"use client";

import React, { useState } from "react";
import {
  Zap,
  Calendar,
  Layers,
  CheckCircle2,
  AlertTriangle,
  X,
  Clock,
  Globe,
  Loader2,
  Film,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { BulkScheduleSlot } from "@/lib/publishing/types";

interface BulkSchedulerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  pages: Array<{ id: string; name: string }>;
  videos: Array<{ id: string; title: string }>;
}

export function BulkSchedulerModal({
  isOpen,
  onClose,
  onSuccess,
  pages,
  videos,
}: BulkSchedulerModalProps) {
  const [selectedPages, setSelectedPages] = useState<string[]>(pages.map((p) => p.id));
  const [selectedVideos, setSelectedVideos] = useState<string[]>(videos.map((v) => v.id));
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [postingTimes, setPostingTimes] = useState<string[]>(["10:00", "16:00", "20:00"]);
  const [postsPerDay, setPostsPerDay] = useState(2);
  const [timezone, setTimezone] = useState("UTC");

  const [step, setStep] = useState<"configure" | "preview">("configure");
  const [previewSlots, setPreviewSlots] = useState<BulkScheduleSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  function togglePage(id: string) {
    setSelectedPages((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  function toggleVideo(id: string) {
    setSelectedVideos((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  }

  async function handleGeneratePreview() {
    if (selectedPages.length === 0) {
      setError("Please select at least one Facebook Page.");
      return;
    }
    if (selectedVideos.length === 0) {
      setError("Please select at least one video.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/publishing/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page_ids: selectedPages,
          video_ids: selectedVideos,
          start_date: startDate,
          posting_times: postingTimes,
          posts_per_day: postsPerDay,
          timezone,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate bulk preview.");

      setPreviewSlots(data.slots || []);
      setStep("preview");
    } catch (err: any) {
      setError(err?.message || "Failed to generate schedule preview.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCommitSchedule() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/publishing/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "commit",
          slots: previewSlots,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to commit schedule.");

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to commit scheduled jobs.");
    } finally {
      setLoading(false);
    }
  }

  const conflictsCount = previewSlots.filter((s) => s.has_conflict).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="relative w-full max-w-2xl rounded-xl border bg-background shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4 bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Bulk Facebook Reels Scheduler</h3>
              <p className="text-xs text-muted-foreground">
                Batch schedule multiple videos across one or more Facebook Pages.
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-muted-foreground">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === "configure" ? (
            <div className="space-y-4">
              {/* Target Pages */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Target Facebook Pages ({selectedPages.length} selected)</Label>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 rounded-lg border bg-muted/20">
                  {pages.map((p) => {
                    const isSelected = selectedPages.includes(p.id);
                    return (
                      <Badge
                        key={p.id}
                        variant={isSelected ? "default" : "outline"}
                        onClick={() => togglePage(p.id)}
                        className="cursor-pointer text-xs"
                      >
                        {p.name}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              {/* Videos */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Approved Videos to Schedule ({selectedVideos.length} selected)</Label>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 rounded-lg border bg-muted/20">
                  {videos.map((v) => {
                    const isSelected = selectedVideos.includes(v.id);
                    return (
                      <Badge
                        key={v.id}
                        variant={isSelected ? "secondary" : "outline"}
                        onClick={() => toggleVideo(v.id)}
                        className="cursor-pointer text-xs max-w-[200px] truncate"
                      >
                        {v.title}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              {/* Cadence Settings */}
              <div className="grid gap-4 sm:grid-cols-3 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Start Date</Label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full text-xs rounded-md border bg-background px-3 py-2"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Posts Per Day</Label>
                  <select
                    value={postsPerDay}
                    onChange={(e) => setPostsPerDay(Number(e.target.value))}
                    className="w-full text-xs rounded-md border bg-background px-3 py-2"
                  >
                    <option value={1}>1 Reel / day</option>
                    <option value={2}>2 Reels / day</option>
                    <option value={3}>3 Reels / day</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Timezone</Label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full text-xs rounded-md border bg-background px-3 py-2"
                  >
                    <option value="UTC">UTC (Coordinated)</option>
                    <option value="America/New_York">America/New_York (EST)</option>
                    <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                    <option value="Asia/Karachi">Asia/Karachi (PKT)</option>
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-foreground">Schedule Preview Matrix</h4>
                  <p className="text-[11px] text-muted-foreground">
                    Review generated time slots and duplicate warnings before committing.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    Total: {previewSlots.length} Slots
                  </Badge>
                  {conflictsCount > 0 && (
                    <Badge variant="destructive" className="text-[10px]">
                      {conflictsCount} Duplicate Conflicts
                    </Badge>
                  )}
                </div>
              </div>

              <div className="border rounded-lg max-h-64 overflow-y-auto divide-y text-xs">
                {previewSlots.map((slot, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 flex items-center justify-between gap-3 ${
                      slot.has_conflict ? "bg-red-500/5 text-red-700 dark:text-red-300" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <span className="font-semibold block truncate">{slot.video_title}</span>
                      <span className="text-[11px] opacity-75 block">
                        {slot.page_name} • {slot.formatted_time}
                      </span>
                      {slot.has_conflict && (
                        <span className="text-[10px] text-red-600 dark:text-red-400 block font-medium mt-0.5">
                          ⚠️ {slot.conflict_reason}
                        </span>
                      )}
                    </div>
                    <Badge variant={slot.has_conflict ? "outline" : "secondary"} className="shrink-0 text-[9px]">
                      {slot.has_conflict ? "Conflict" : "Ready"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-3.5 bg-muted/20 flex justify-between items-center">
          {step === "preview" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep("configure")}
              disabled={loading}
              className="text-xs"
            >
              Back to Configure
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={loading} className="text-xs">
              Cancel
            </Button>
            {step === "configure" ? (
              <Button
                size="sm"
                onClick={handleGeneratePreview}
                disabled={loading}
                className="text-xs gap-1.5"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Calendar className="h-3.5 w-3.5" />}
                Generate Preview Matrix
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleCommitSchedule}
                disabled={loading || previewSlots.length === 0}
                className="text-xs gap-1.5"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                Confirm & Schedule {previewSlots.length - conflictsCount} Reels
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
