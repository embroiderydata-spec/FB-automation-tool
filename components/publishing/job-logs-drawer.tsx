"use client";

import React, { useState, useEffect } from "react";
import { X, Activity, RefreshCw, CheckCircle2, AlertTriangle, XCircle, Info, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PublishingLog {
  id: string;
  operation: string;
  endpoint?: string | null;
  attempt: number;
  status: "info" | "success" | "warning" | "error";
  meta_response?: Record<string, any> | null;
  error_message?: string | null;
  created_at: string;
}

interface JobLogsDrawerProps {
  jobId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function JobLogsDrawer({ jobId, isOpen, onClose }: JobLogsDrawerProps) {
  const [logs, setLogs] = useState<PublishingLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && jobId) {
      loadLogs();
    }
  }, [isOpen, jobId]);

  async function loadLogs() {
    if (!jobId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/publishing/queue/${jobId}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen || !jobId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm p-0 animate-in fade-in">
      <div className="relative w-full max-w-lg h-full bg-background border-l shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4 bg-muted/20">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <div>
              <h3 className="text-sm font-semibold">Publishing Job Audit Logs</h3>
              <p className="text-[11px] font-mono text-muted-foreground truncate max-w-[280px]">
                Job: {jobId}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={loadLogs}
              disabled={loading}
              className="h-7 w-7 text-muted-foreground"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 text-muted-foreground">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Logs list */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {loading ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
              Loading chronological logs...
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No audit logs recorded for this job yet.
            </div>
          ) : (
            logs.map((log) => {
              const Icon =
                log.status === "success"
                  ? CheckCircle2
                  : log.status === "error"
                  ? XCircle
                  : log.status === "warning"
                  ? AlertTriangle
                  : Info;

              const colorClass =
                log.status === "success"
                  ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/5"
                  : log.status === "error"
                  ? "text-red-500 border-red-500/20 bg-red-500/5"
                  : log.status === "warning"
                  ? "text-amber-500 border-amber-500/20 bg-amber-500/5"
                  : "text-blue-500 border-blue-500/20 bg-blue-500/5";

              return (
                <div key={log.id} className={`p-3 rounded-lg border text-xs space-y-1.5 ${colorClass}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="capitalize">{log.operation.replace(/_/g, " ")}</span>
                    </div>
                    <span className="text-[10px] opacity-75 font-mono">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </span>
                  </div>

                  {log.endpoint && (
                    <div className="text-[10px] font-mono opacity-80 truncate">
                      Endpoint: {log.endpoint}
                    </div>
                  )}

                  {log.error_message && (
                    <div className="p-2 rounded bg-black/10 text-red-600 dark:text-red-400 font-mono text-[11px]">
                      {log.error_message}
                    </div>
                  )}

                  {log.meta_response && Object.keys(log.meta_response).length > 0 && (
                    <pre className="p-2 rounded bg-black/10 text-[10px] font-mono overflow-x-auto text-foreground/80">
                      {JSON.stringify(log.meta_response, null, 2)}
                    </pre>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-5 py-3 bg-muted/20 flex justify-between items-center text-[11px] text-muted-foreground">
          <span>Total events: {logs.length}</span>
          <Button variant="outline" size="sm" onClick={onClose} className="h-7 text-xs">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
