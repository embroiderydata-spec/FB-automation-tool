"use client";

import React, { useEffect, useState } from "react";
import {
  Activity,
  Server,
  Database,
  Cpu,
  AlertTriangle,
  Play,
  Pause,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Layers,
  DollarSign,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface HealthData {
  status: string;
  environment: string;
  version: string;
  uptimeSeconds: number;
  latencyMs: number;
}

interface DatabaseHealth {
  status: string;
  database: string;
  latencyMs?: number;
}

interface WorkerHealth {
  status: string;
  onlineWorkersCount: number;
}

interface QueueHealth {
  status: string;
  queueSize: number;
  deadLetterCount: number;
  breakdown: Record<string, number>;
}

interface EmergencyData {
  paused: boolean;
  reason: string | null;
  activatedAt: string | null;
  activatedBy: string | null;
}

export function SystemMonitor() {
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [dbHealth, setDbHealth] = useState<DatabaseHealth | null>(null);
  const [workerHealth, setWorkerHealth] = useState<WorkerHealth | null>(null);
  const [queueHealth, setQueueHealth] = useState<QueueHealth | null>(null);
  const [emergency, setEmergency] = useState<EmergencyData | null>(null);

  // Emergency action states
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [emergencyReason, setEmergencyReason] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState<"pause" | "resume" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchTelemetry = async () => {
    setLoading(true);
    try {
      const [hRes, dbRes, wRes, qRes, emRes] = await Promise.all([
        fetch("/api/health").then((r) => r.json()).catch(() => null),
        fetch("/api/health/database").then((r) => r.json()).catch(() => null),
        fetch("/api/health/worker").then((r) => r.json()).catch(() => null),
        fetch("/api/health/queue").then((r) => r.json()).catch(() => null),
        fetch("/api/emergency").then((r) => r.json()).catch(() => null),
      ]);

      if (hRes) setHealth(hRes);
      if (dbRes) setDbHealth(dbRes);
      if (wRes) setWorkerHealth(wRes);
      if (qRes) setQueueHealth(qRes);
      if (emRes?.status) setEmergency(emRes.status);
    } catch {
      // transient telemetry fetch error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleEmergencyAction = async (action: "pause" | "resume") => {
    setActionError(null);
    setActionLoading(true);

    try {
      const requiredToken = action === "pause" ? "CONFIRM_EMERGENCY_STOP" : "CONFIRM_RESUME";
      if (confirmInput.trim() !== requiredToken) {
        setActionError(`Please type "${requiredToken}" exactly to proceed.`);
        setActionLoading(false);
        return;
      }

      const res = await fetch("/api/emergency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          reason: emergencyReason || undefined,
          confirmation: confirmInput.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setActionError(data.error || "Action failed.");
      } else {
        setShowConfirmModal(null);
        setConfirmInput("");
        setEmergencyReason("");
        await fetchTelemetry();
      }
    } catch (err: any) {
      setActionError(err?.message || "Failed to execute emergency action.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Emergency Alert Banner if active */}
      {emergency?.paused && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-600 dark:text-red-400">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <ShieldAlert className="h-5 w-5 animate-pulse text-red-500" />
              GLOBAL EMERGENCY KILL-SWITCH ACTIVE
            </div>
            <Button
              size="sm"
              variant="destructive"
              className="h-7 text-xs gap-1 bg-red-600 hover:bg-red-700 text-white"
              onClick={() => setShowConfirmModal("resume")}
            >
              <Play className="h-3 w-3" /> Resume Platform Operations
            </Button>
          </div>
          <p className="mt-1 text-xs opacity-90">
            All AI generation, automated video rendering, and Facebook publishing are paused. Reason:{" "}
            <span className="font-medium">{emergency.reason || "Manual administrative emergency pause"}</span>
          </p>
        </div>
      )}

      {/* Overview Telemetry Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Core Web App */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Application Core</span>
            <Server className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-lg font-bold">
              {health ? health.status.toUpperCase() : "CHECKING"}
            </span>
            <Badge
              variant="outline"
              className={
                health?.status === "healthy"
                  ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/20 text-[10px]"
                  : "bg-amber-500/15 text-amber-600 border-amber-500/20 text-[10px]"
              }
            >
              v{health?.version || "2.8.0"}
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Env: <span className="capitalize font-medium">{health?.environment || "production"}</span>
          </p>
        </Card>

        {/* PostgreSQL Database */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">PostgreSQL Database</span>
            <Database className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-lg font-bold">
              {dbHealth?.status === "healthy" ? "CONNECTED" : "DEGRADED"}
            </span>
            {dbHealth?.latencyMs !== undefined && (
              <Badge variant="outline" className="text-[10px]">
                {dbHealth.latencyMs} ms
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Connection pooling active via Supabase
          </p>
        </Card>

        {/* Background Workers */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Background Workers</span>
            <Cpu className="h-4 w-4 text-purple-500" />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-lg font-bold">
              {workerHealth?.onlineWorkersCount ? `${workerHealth.onlineWorkersCount} ONLINE` : "IDLE / CRON"}
            </span>
            <Badge
              variant="outline"
              className={
                (workerHealth?.onlineWorkersCount || 0) > 0
                  ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/20 text-[10px]"
                  : "bg-muted text-muted-foreground text-[10px]"
              }
            >
              Lease: 300s
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Autonomous polling & lock reclamation
          </p>
        </Card>

        {/* Job Queue */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Job Queue Backlog</span>
            <Layers className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-lg font-bold">{queueHealth?.queueSize || 0} JOBS</span>
            <Badge
              variant="outline"
              className={
                (queueHealth?.deadLetterCount || 0) > 0
                  ? "bg-red-500/15 text-red-600 border-red-500/20 text-[10px]"
                  : "text-[10px]"
              }
            >
              DLQ: {queueHealth?.deadLetterCount || 0}
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Exponential backoff (10s → 30s → 2m → 5m)
          </p>
        </Card>
      </div>

      {/* Global Reliability Controls */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Production Reliability & Emergency Controls
            </CardTitle>
            <CardDescription className="text-xs">
              Monitor active services, audit health status, and manage the platform kill-switch.
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={fetchTelemetry}
            disabled={loading}
            className="h-8 text-xs gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-3 rounded-lg border bg-muted/20">
            <div>
              <p className="text-xs font-semibold text-foreground">Global Emergency Kill-Switch</p>
              <p className="text-[11px] text-muted-foreground">
                Instantly freeze all outbound Facebook API calls, scheduled video renders, and AI pipelines without terminating existing data.
              </p>
            </div>
            <div>
              {emergency?.paused ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                  onClick={() => setShowConfirmModal("resume")}
                >
                  <Play className="h-3.5 w-3.5" /> Resume Operations
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-8 text-xs gap-1.5 bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => setShowConfirmModal("pause")}
                >
                  <Pause className="h-3.5 w-3.5" /> Emergency Stop
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal Confirmation */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl bg-card border p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              {showConfirmModal === "pause"
                ? "Confirm Global Emergency Stop"
                : "Confirm Operation Resumption"}
            </div>
            <p className="text-xs text-muted-foreground">
              {showConfirmModal === "pause"
                ? "This will halt all active queues, rendering jobs, and scheduled Facebook Reels across all 100 managed pages immediately."
                : "This will resume normal publishing, AI generation, and background job processing across all pages."}
            </p>

            {showConfirmModal === "pause" && (
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-foreground">
                  Reason for Pause (Optional)
                </label>
                <Input
                  placeholder="e.g. Meta Graph API outage or budget audit"
                  value={emergencyReason}
                  onChange={(e) => setEmergencyReason(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-foreground">
                Type{" "}
                <span className="font-mono text-red-500 font-bold">
                  {showConfirmModal === "pause" ? "CONFIRM_EMERGENCY_STOP" : "CONFIRM_RESUME"}
                </span>{" "}
                to confirm:
              </label>
              <Input
                placeholder={showConfirmModal === "pause" ? "CONFIRM_EMERGENCY_STOP" : "CONFIRM_RESUME"}
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>

            {actionError && <p className="text-xs text-red-500">{actionError}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowConfirmModal(null);
                  setConfirmInput("");
                  setActionError(null);
                }}
                disabled={actionLoading}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button
                variant={showConfirmModal === "pause" ? "destructive" : "default"}
                size="sm"
                onClick={() => handleEmergencyAction(showConfirmModal)}
                disabled={actionLoading}
                className="h-8 text-xs"
              >
                {actionLoading ? "Processing..." : "Confirm Action"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
