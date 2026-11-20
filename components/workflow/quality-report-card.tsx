"use client";

import React from "react";
import { CheckCircle2, AlertTriangle, XCircle, ShieldCheck, Video, Music, Subtitles, Layers } from "lucide-react";
import { QualityControlReport } from "@/lib/workflow/types";
import { Badge } from "@/components/ui/badge";

interface QualityReportCardProps {
  report?: QualityControlReport | null;
}

export function QualityReportCard({ report }: QualityReportCardProps) {
  if (!report) {
    return (
      <div className="p-6 border border-dashed rounded-xl text-center text-muted-foreground text-sm">
        Quality control has not been run for this workflow yet. It will run automatically after video composition.
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "passed":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> Passed
          </Badge>
        );
      case "warning":
        return (
          <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20 gap-1">
            <AlertTriangle className="h-3.5 w-3.5" /> Passed with Warnings
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-destructive/15 text-destructive border-destructive/20 gap-1">
            <XCircle className="h-3.5 w-3.5" /> Failed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="flex items-center justify-between p-4 rounded-xl border bg-card shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">Automated Video Quality Control</h4>
            <p className="text-xs text-muted-foreground">{report.summary}</p>
          </div>
        </div>
        <div>{getStatusBadge(report.overall_status)}</div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-lg border bg-muted/20">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <Video className="h-3.5 w-3.5" /> Resolution
          </div>
          <div className="text-sm font-bold text-foreground">
            {report.metrics.resolution || "1080x1920"} ({report.metrics.aspect_ratio || "9:16"})
          </div>
        </div>

        <div className="p-3 rounded-lg border bg-muted/20">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <Layers className="h-3.5 w-3.5" /> Duration
          </div>
          <div className="text-sm font-bold text-foreground">
            {report.metrics.duration_seconds?.toFixed(1) || "45.0"}s
          </div>
        </div>

        <div className="p-3 rounded-lg border bg-muted/20">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <Music className="h-3.5 w-3.5" /> Audio Stream
          </div>
          <div className="text-sm font-bold text-foreground">
            {report.metrics.audio_tracks ? "Voiceover Synced" : "Missing"}
          </div>
        </div>

        <div className="p-3 rounded-lg border bg-muted/20">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <Subtitles className="h-3.5 w-3.5" /> Subtitles
          </div>
          <div className="text-sm font-bold text-foreground">
            {report.metrics.subtitles_synced ? "Active (Safe Zones)" : "None"}
          </div>
        </div>
      </div>

      {/* Detailed Checklist */}
      <div className="rounded-xl border bg-card divide-y">
        {report.checks.map((check) => (
          <div key={check.id} className="p-3.5 flex items-start justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">{check.label}</span>
                {check.value !== undefined && (
                  <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    {String(check.value)}
                  </span>
                )}
              </div>
              <p className="text-muted-foreground">{check.message}</p>
            </div>
            <div>
              {check.status === "passed" && (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> OK
                </span>
              )}
              {check.status === "warning" && (
                <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" /> Notice
                </span>
              )}
              {check.status === "failed" && (
                <span className="text-destructive font-medium flex items-center gap-1">
                  <XCircle className="h-3.5 w-3.5" /> Fail
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-muted-foreground italic text-center">
        Quality control validates technical video encoding, 9:16 frame bounds, audio synchronization, and subtitle burn-in. Subjective creative reception may vary.
      </p>
    </div>
  );
}
