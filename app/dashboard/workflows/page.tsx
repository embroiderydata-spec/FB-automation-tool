"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Zap,
  Play,
  Pause,
  RotateCcw,
  Plus,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Film,
  Layers,
  Share2,
  DollarSign,
  TrendingUp,
  Cpu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { WorkflowBuilderModal } from "@/components/workflow/workflow-builder-modal";
import { WorkflowDetailModal } from "@/components/workflow/workflow-detail-modal";
import {
  AutomationWorkflow,
  WorkflowSummaryMetrics,
  STAGE_LABELS,
} from "@/lib/workflow/types";

export default function WorkflowsDashboardPage() {
  const [workflows, setWorkflows] = useState<AutomationWorkflow[]>([]);
  const [metrics, setMetrics] = useState<WorkflowSummaryMetrics>({
    total_workflows: 0,
    running_workflows: 0,
    waiting_for_approval: 0,
    completed_workflows: 0,
    failed_workflows: 0,
    videos_generated_today: 0,
    estimated_ai_cost: 0,
    avg_production_time_seconds: 42,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modals
  const [builderOpen, setBuilderOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<any | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Pages state for builder
  const [connectedPages, setConnectedPages] = useState<any[]>([]);

  const fetchWorkflows = useCallback(async () => {
    try {
      const url = new URL("/api/workflows", window.location.origin);
      if (statusFilter !== "all") url.searchParams.set("status", statusFilter);
      if (search) url.searchParams.set("search", search);

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setWorkflows(data.workflows || []);
        if (data.metrics) setMetrics(data.metrics);
      }
    } catch (err) {
      console.error("Failed to load workflows:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  const fetchConnectedPages = async () => {
    try {
      const res = await fetch("/api/facebook-pages");
      if (res.ok) {
        const data = await res.json();
        setConnectedPages(data.pages || []);
      }
    } catch (err) {
      console.error("Failed to fetch pages:", err);
    }
  };

  useEffect(() => {
    fetchWorkflows();
    fetchConnectedPages();
  }, [fetchWorkflows]);

  const handleOpenDetail = async (workflowId: string) => {
    try {
      const res = await fetch(`/api/workflows/${workflowId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedWorkflow(data.workflow);
        setDetailOpen(true);
      }
    } catch (err) {
      console.error("Failed to fetch workflow detail:", err);
    }
  };

  const handleRunWorkerPass = async () => {
    try {
      await fetch("/api/workflows/worker", { method: "POST" });
      fetchWorkflows();
    } catch (err) {
      console.error("Failed to run worker pass:", err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "running":
      case "queued":
        return (
          <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20 gap-1">
            <RefreshCw className="h-3 w-3 animate-spin" /> In Progress
          </Badge>
        );
      case "waiting_for_approval":
        return (
          <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20 gap-1">
            <Clock className="h-3 w-3" /> Waiting Approval
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 gap-1">
            <CheckCircle2 className="h-3 w-3" /> Completed
          </Badge>
        );
      case "paused":
        return (
          <Badge variant="outline" className="text-muted-foreground gap-1">
            <Pause className="h-3 w-3" /> Paused
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-destructive/15 text-destructive border-destructive/20 gap-1">
            <XCircle className="h-3 w-3" /> Failed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              AI Automation Workflows
            </h1>
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
              Phase 2.5
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            End-to-end autonomous content production pipeline: from idea to viral Reels across 100 Facebook Pages.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRunWorkerPass}
            className="text-xs gap-1.5"
            title="Trigger background worker tick to advance queued steps"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Worker Pass
          </Button>

          <Button
            size="sm"
            onClick={() => setBuilderOpen(true)}
            className="text-xs gap-1.5 bg-primary shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" /> New Automation Workflow
          </Button>
        </div>
      </div>

      {/* 8 Telemetry Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="p-3.5 rounded-xl border bg-card shadow-sm">
          <div className="text-[11px] text-muted-foreground">Total Workflows</div>
          <div className="text-xl font-bold text-foreground mt-0.5">{metrics.total_workflows}</div>
        </div>

        <div className="p-3.5 rounded-xl border bg-card shadow-sm">
          <div className="text-[11px] text-muted-foreground">Running</div>
          <div className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-0.5">
            {metrics.running_workflows}
          </div>
        </div>

        <div className="p-3.5 rounded-xl border bg-card shadow-sm">
          <div className="text-[11px] text-muted-foreground">Needs Approval</div>
          <div className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">
            {metrics.waiting_for_approval}
          </div>
        </div>

        <div className="p-3.5 rounded-xl border bg-card shadow-sm">
          <div className="text-[11px] text-muted-foreground">Completed</div>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
            {metrics.completed_workflows}
          </div>
        </div>

        <div className="p-3.5 rounded-xl border bg-card shadow-sm">
          <div className="text-[11px] text-muted-foreground">Failed</div>
          <div className="text-xl font-bold text-destructive mt-0.5">{metrics.failed_workflows}</div>
        </div>

        <div className="p-3.5 rounded-xl border bg-card shadow-sm">
          <div className="text-[11px] text-muted-foreground">Videos Today</div>
          <div className="text-xl font-bold text-foreground mt-0.5">
            {metrics.videos_generated_today}
          </div>
        </div>

        <div className="p-3.5 rounded-xl border bg-card shadow-sm">
          <div className="text-[11px] text-muted-foreground">Total AI Cost</div>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">
            ${metrics.estimated_ai_cost.toFixed(2)}
          </div>
        </div>

        <div className="p-3.5 rounded-xl border bg-card shadow-sm">
          <div className="text-[11px] text-muted-foreground">Avg Time</div>
          <div className="text-xl font-bold text-foreground mt-0.5">
            {metrics.avg_production_time_seconds}s
          </div>
        </div>
      </div>

      {/* Toolbar: Search and Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b pb-4">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {[
            { id: "all", label: "All Workflows" },
            { id: "running", label: "In Progress" },
            { id: "waiting_for_approval", label: "Needs Approval" },
            { id: "completed", label: "Completed" },
            { id: "failed", label: "Failed" },
            { id: "paused", label: "Paused" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === tab.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/40 text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search workflows..."
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      {/* Workflows List Table / Cards */}
      {loading ? (
        <div className="p-12 text-center text-xs text-muted-foreground">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
          Loading automation workflows...
        </div>
      ) : workflows.length === 0 ? (
        <div className="p-12 border border-dashed rounded-2xl text-center space-y-3 bg-muted/10">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center">
            <Zap className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-foreground">No Automation Workflows Found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Launch your first end-to-end pipeline to automatically transform an idea into 9:16 vertical Facebook Reels.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setBuilderOpen(true)}
            className="text-xs gap-1.5 bg-primary"
          >
            <Plus className="h-3.5 w-3.5" /> Create Your First Workflow
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/30 border-b text-muted-foreground">
                <tr>
                  <th className="p-3.5 font-semibold">Workflow Campaign</th>
                  <th className="p-3.5 font-semibold">Stage & Progress</th>
                  <th className="p-3.5 font-semibold">Pages</th>
                  <th className="p-3.5 font-semibold">Approval Gate</th>
                  <th className="p-3.5 font-semibold">AI Cost</th>
                  <th className="p-3.5 font-semibold">Status</th>
                  <th className="p-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {workflows.map((wf) => (
                  <tr key={wf.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-3.5 font-medium text-foreground">
                      <div className="font-semibold">{wf.workflow_name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {wf.configuration?.niche || "General"} • {wf.configuration?.video_duration || 45}s Reel
                      </div>
                    </td>

                    <td className="p-3.5">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-foreground">
                          {STAGE_LABELS[wf.current_stage]}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {wf.progress}%
                        </span>
                      </div>
                      <div className="w-36 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${wf.progress}%` }}
                        />
                      </div>
                    </td>

                    <td className="p-3.5 text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        {wf.configuration?.target_page_ids?.length || 1}
                      </span>{" "}
                      Pages
                    </td>

                    <td className="p-3.5">
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {wf.approval_mode.replace(/_/g, " ")}
                      </Badge>
                    </td>

                    <td className="p-3.5 font-mono text-muted-foreground">
                      ${(wf.actual_cost || 0).toFixed(4)}
                    </td>

                    <td className="p-3.5">{getStatusBadge(wf.status)}</td>

                    <td className="p-3.5 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenDetail(wf.id)}
                        className="text-xs h-8"
                      >
                        Inspect
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Workflow Builder Modal */}
      <WorkflowBuilderModal
        isOpen={builderOpen}
        onClose={() => setBuilderOpen(false)}
        pages={connectedPages}
        onWorkflowCreated={fetchWorkflows}
      />

      {/* Workflow Detail Modal */}
      {selectedWorkflow && (
        <WorkflowDetailModal
          isOpen={detailOpen}
          workflow={selectedWorkflow}
          onClose={() => {
            setDetailOpen(false);
            setSelectedWorkflow(null);
          }}
          onRefresh={() => {
            if (selectedWorkflow) handleOpenDetail(selectedWorkflow.id);
            fetchWorkflows();
          }}
        />
      )}
    </div>
  );
}
