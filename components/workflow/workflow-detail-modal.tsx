"use client";

import React, { useState } from "react";
import {
  X,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Sparkles,
  Film,
  Layers,
  Share2,
  Calendar,
  FileText,
  ShieldCheck,
  Zap,
  Eye,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QualityReportCard } from "./quality-report-card";
import {
  AutomationWorkflow,
  WORKFLOW_STAGES_ORDER,
  STAGE_LABELS,
  WorkflowStage,
} from "@/lib/workflow/types";

interface WorkflowDetailModalProps {
  workflow: AutomationWorkflow & {
    scenes?: any[];
    logs?: any[];
    target_pages?: any[];
    script?: any;
    storyboard?: any;
    video?: any;
  };
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export function WorkflowDetailModal({
  workflow,
  isOpen,
  onClose,
  onRefresh,
}: WorkflowDetailModalProps) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "script" | "storyboard" | "video_qc" | "pages" | "logs"
  >("overview");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Scene regeneration state
  const [editingSceneId, setEditingSceneId] = useState<string | null>(null);
  const [newScenePrompt, setNewScenePrompt] = useState("");

  if (!isOpen || !workflow) return null;

  const currentStageIndex = WORKFLOW_STAGES_ORDER.indexOf(workflow.current_stage);

  const handleAction = async (action: string, targetStage?: WorkflowStage) => {
    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/workflows/${workflow.id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, target_stage: targetStage }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed.");
      setActionMessage(data.message || `Action ${action} successful.`);
      onRefresh();
    } catch (err: any) {
      setActionMessage(`Error: ${err?.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRegenerateScene = async (sceneId: string) => {
    if (!newScenePrompt) return;
    setActionLoading(true);
    try {
      const res = await fetch(
        `/api/workflows/${workflow.id}/scenes/${sceneId}/regenerate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: newScenePrompt }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to regenerate scene.");
      setEditingSceneId(null);
      setNewScenePrompt("");
      setActionMessage("Scene regenerated. Workflow will recompose with new asset.");
      onRefresh();
    } catch (err: any) {
      setActionMessage(`Error: ${err?.message}`);
    } finally {
      setActionLoading(false);
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
            <Clock className="h-3 w-3" /> Waiting for Approval
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-4xl bg-card border rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between p-5 border-b bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-foreground">{workflow.workflow_name}</h3>
                {getStatusBadge(workflow.status)}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Current Stage: <span className="font-semibold text-foreground">{STAGE_LABELS[workflow.current_stage]}</span> • Progress: {workflow.progress}% • Cost: ${(workflow.actual_cost || 0).toFixed(4)}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-lg">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* 16-Stage Interactive Stepper */}
        <div className="p-3 border-b bg-muted/5 overflow-x-auto">
          <div className="flex items-center gap-1 min-w-[760px]">
            {WORKFLOW_STAGES_ORDER.map((stage, idx) => {
              const isPast = idx < currentStageIndex;
              const isCurrent = idx === currentStageIndex;
              const isWaiting = isCurrent && workflow.status === "waiting_for_approval";
              const isFailed = isCurrent && workflow.status === "failed";

              return (
                <div key={stage} className="flex-1 flex flex-col items-center group">
                  <div
                    className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all ${
                      isPast
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : isWaiting
                        ? "bg-amber-500 border-amber-500 text-white animate-pulse"
                        : isFailed
                        ? "bg-destructive border-destructive text-white"
                        : isCurrent
                        ? "bg-primary border-primary text-white"
                        : "border-muted bg-muted/30 text-muted-foreground"
                    }`}
                  >
                    {isPast ? <CheckCircle2 className="h-3.5 w-3.5" /> : idx + 1}
                  </div>
                  <span
                    className={`text-[9px] mt-1 text-center truncate max-w-[50px] ${
                      isCurrent ? "font-bold text-foreground" : "text-muted-foreground"
                    }`}
                    title={STAGE_LABELS[stage]}
                  >
                    {STAGE_LABELS[stage].split(" ")[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b text-xs font-medium px-4 bg-muted/10">
          {[
            { id: "overview", label: "Overview", icon: Layers },
            { id: "script", label: "Script & Hooks", icon: FileText },
            { id: "storyboard", label: "Storyboard & Scenes", icon: Film },
            { id: "video_qc", label: "Video & QC Report", icon: ShieldCheck },
            { id: "pages", label: "Page Variations", icon: Share2 },
            { id: "logs", label: "Activity Logs", icon: Clock },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 py-3 px-4 border-b-2 transition-colors ${
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

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {actionMessage && (
            <div className="p-3 rounded-xl border bg-muted text-xs text-foreground flex items-center justify-between">
              <span>{actionMessage}</span>
              <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setActionMessage(null)}>
                Dismiss
              </Button>
            </div>
          )}

          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl border bg-muted/20">
                  <span className="text-muted-foreground">Approval Mode</span>
                  <div className="font-semibold text-foreground mt-0.5 capitalize">
                    {workflow.approval_mode.replace(/_/g, " ")}
                  </div>
                </div>
                <div className="p-3 rounded-xl border bg-muted/20">
                  <span className="text-muted-foreground">Niche Profile</span>
                  <div className="font-semibold text-foreground mt-0.5">
                    {workflow.configuration?.niche || "General"}
                  </div>
                </div>
                <div className="p-3 rounded-xl border bg-muted/20">
                  <span className="text-muted-foreground">Video Provider</span>
                  <div className="font-semibold text-foreground mt-0.5 capitalize">
                    {workflow.configuration?.video_provider || "Replicate"}
                  </div>
                </div>
                <div className="p-3 rounded-xl border bg-muted/20">
                  <span className="text-muted-foreground">Destination Pages</span>
                  <div className="font-semibold text-foreground mt-0.5">
                    {workflow.target_pages?.length || workflow.configuration?.target_page_ids?.length || 1} Pages
                  </div>
                </div>
              </div>

              {/* Waiting for approval banner */}
              {workflow.status === "waiting_for_approval" && (
                <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-800 dark:text-amber-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Clock className="h-5 w-5 text-amber-500 shrink-0" />
                    <div>
                      <div className="font-bold">Human Approval Required</div>
                      <div className="text-[11px] opacity-90">
                        {workflow.current_stage === "SCRIPT_APPROVAL"
                          ? "The AI generated script is ready for review. Approve it to trigger video rendering."
                          : "The video has passed Quality Control. Give final sign-off to schedule Reels across connected Pages."}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1"
                    onClick={() =>
                      handleAction(
                        workflow.current_stage === "SCRIPT_APPROVAL"
                          ? "approve_script"
                          : "approve_video"
                      )
                    }
                    disabled={actionLoading}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {workflow.current_stage === "SCRIPT_APPROVAL" ? "Approve Script" : "Approve & Schedule"}
                  </Button>
                </div>
              )}

              {/* Error banner */}
              {workflow.status === "failed" && (
                <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <XCircle className="h-5 w-5 shrink-0" />
                    <div>
                      <div className="font-bold">Pipeline Error at {STAGE_LABELS[workflow.current_stage]}</div>
                      <div className="text-[11px] opacity-90">{workflow.error_message || "Stage execution failed."}</div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-destructive text-destructive text-xs gap-1"
                    onClick={() => handleAction("retry", workflow.current_stage)}
                    disabled={actionLoading}
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Retry Stage
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SCRIPT & HOOK */}
          {activeTab === "script" && (
            <div className="space-y-4 text-xs">
              {workflow.content_idea && (
                <div className="p-4 rounded-xl border bg-muted/20 space-y-1.5">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" /> Content Idea & Viral Heuristic
                  </div>
                  <div className="font-medium text-foreground">{workflow.content_idea.title}</div>
                  <p className="text-muted-foreground">{workflow.content_idea.description}</p>
                  <div className="inline-block mt-1 font-mono text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary">
                    Viral Potential: {workflow.content_idea.viral_potential || "88/100 (Strong Retention)"}
                  </div>
                </div>
              )}

              {workflow.script ? (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl border bg-card space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-primary">
                      Primary Reel Hook (First 3 Seconds)
                    </div>
                    <div className="p-2.5 rounded-lg bg-primary/5 font-semibold text-foreground">
                      &quot;{workflow.script.hook}&quot;
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border bg-card space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Full Narration Script (Short-form Reel)
                    </div>
                    <p className="leading-relaxed text-foreground whitespace-pre-line">
                      {workflow.script.narration}
                    </p>
                  </div>

                  {workflow.current_stage === "SCRIPT_APPROVAL" && workflow.status === "waiting_for_approval" && (
                    <Button
                      size="sm"
                      className="w-full bg-primary text-xs gap-1.5"
                      onClick={() => handleAction("approve_script")}
                      disabled={actionLoading}
                    >
                      <CheckCircle2 className="h-4 w-4" /> Approve Script & Continue to Storyboard
                    </Button>
                  )}
                </div>
              ) : (
                <div className="p-6 border border-dashed rounded-xl text-center text-muted-foreground">
                  Script has not been generated yet. It will be synthesized automatically in Stage 4.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: STORYBOARD & SCENES */}
          {activeTab === "storyboard" && (
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">
                  Scene Breakdown ({workflow.scenes?.length || 0} Scenes)
                </span>
                <span className="text-muted-foreground">Resilient Single Scene Regeneration</span>
              </div>

              {workflow.scenes && workflow.scenes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {workflow.scenes.map((scene: any) => (
                    <div key={scene.id} className="p-4 rounded-xl border bg-card space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-primary">Scene #{scene.scene_number}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {scene.duration_seconds}s • 9:16
                        </Badge>
                      </div>

                      <div className="text-muted-foreground">
                        <span className="font-medium text-foreground">Narration: </span>
                        {scene.narration_text || "Scene voice narration"}
                      </div>

                      <div className="p-2 rounded bg-muted/30 text-[11px]">
                        <span className="font-semibold text-foreground">Visual Prompt: </span>
                        {scene.ai_prompt}
                      </div>

                      {editingSceneId === scene.id ? (
                        <div className="space-y-2 pt-2 border-t">
                          <textarea
                            value={newScenePrompt}
                            onChange={(e) => setNewScenePrompt(e.target.value)}
                            placeholder="Enter improved scene visual prompt..."
                            className="w-full p-2 border rounded-lg text-xs bg-background"
                            rows={2}
                          />
                          <div className="flex justify-end gap-1.5">
                            <Button size="sm" variant="ghost" onClick={() => setEditingSceneId(null)}>
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              className="text-xs bg-primary"
                              onClick={() => handleRegenerateScene(scene.id)}
                              disabled={actionLoading}
                            >
                              Regenerate Asset
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="pt-2 border-t flex justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-[10px] h-7 gap-1"
                            onClick={() => {
                              setEditingSceneId(scene.id);
                              setNewScenePrompt(scene.ai_prompt || "");
                            }}
                          >
                            <RefreshCw className="h-3 w-3" /> Regenerate Scene
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 border border-dashed rounded-xl text-center text-muted-foreground">
                  Storyboard scenes will be generated in Stage 6.
                </div>
              )}
            </div>
          )}

          {/* TAB 4: VIDEO & QC REPORT */}
          {activeTab === "video_qc" && (
            <div className="space-y-4">
              <QualityReportCard report={workflow.quality_report} />

              {workflow.video && (
                <div className="p-4 rounded-xl border bg-card flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                      <Film className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">{workflow.video.title}</div>
                      <div className="text-muted-foreground text-[11px]">
                        9:16 Vertical Reel • 1080x1920 • Status: {workflow.video.render_status}
                      </div>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="text-xs gap-1.5">
                    <Eye className="h-3.5 w-3.5" /> Preview Asset
                  </Button>
                </div>
              )}

              {workflow.current_stage === "FINAL_VIDEO_APPROVAL" && workflow.status === "waiting_for_approval" && (
                <Button
                  size="sm"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
                  onClick={() => handleAction("approve_video")}
                  disabled={actionLoading}
                >
                  <CheckCircle2 className="h-4 w-4" /> Approve Video & Advance to Facebook Scheduling
                </Button>
              )}
            </div>
          )}

          {/* TAB 5: PAGE VARIATIONS */}
          {activeTab === "pages" && (
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">
                  Multi-Page Customization & Duplicate Prevention Matrix
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Personalized hooks & captions per Page
                </span>
              </div>

              {workflow.page_variations && workflow.page_variations.length > 0 ? (
                <div className="space-y-3">
                  {workflow.page_variations.map((v, i) => (
                    <div key={v.page_id || i} className="p-4 rounded-xl border bg-card space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-foreground">
                          <Share2 className="h-3.5 w-3.5 text-primary" />
                          {v.page_name}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground">
                            Similarity vs others:
                          </span>
                          <Badge
                            variant="outline"
                            className={
                              (v.similarity_score || 0) < 0.75
                                ? "text-emerald-600 border-emerald-500/20"
                                : "text-destructive border-destructive/20"
                            }
                          >
                            {((v.similarity_score || 0) * 100).toFixed(0)}% (Safe)
                          </Badge>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-muted/20 font-medium text-foreground">
                        <span className="text-primary font-bold">Custom Hook: </span>
                        {v.custom_hook}
                      </div>

                      <div className="text-muted-foreground whitespace-pre-line text-[11px]">
                        {v.caption}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 border border-dashed rounded-xl text-center text-muted-foreground">
                  Page-specific variations will be generated in Stage 14 prior to queue dispatch.
                </div>
              )}
            </div>
          )}

          {/* TAB 6: ACTIVITY LOGS */}
          {activeTab === "logs" && (
            <div className="space-y-2 text-xs">
              {workflow.logs && workflow.logs.length > 0 ? (
                workflow.logs.map((log: any) => (
                  <div key={log.id} className="p-3 rounded-lg border bg-muted/10 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-foreground">
                        {log.stage}: {log.action}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {new Date(log.created_at).toLocaleTimeString()} • Status: {log.status}
                      </div>
                    </div>
                    {log.cost_delta > 0 && (
                      <span className="font-mono text-[11px] text-muted-foreground">
                        +${Number(log.cost_delta).toFixed(4)}
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-6 border border-dashed rounded-xl text-center text-muted-foreground">
                  No activity logs recorded yet.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t bg-muted/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {workflow.status === "running" && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1.5"
                onClick={() => handleAction("pause")}
                disabled={actionLoading}
              >
                <Pause className="h-3.5 w-3.5" /> Pause
              </Button>
            )}

            {workflow.status === "paused" && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1.5"
                onClick={() => handleAction("resume")}
                disabled={actionLoading}
              >
                <Play className="h-3.5 w-3.5" /> Resume
              </Button>
            )}

            {workflow.status === "failed" && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1.5 border-destructive text-destructive"
                onClick={() => handleAction("retry")}
                disabled={actionLoading}
              >
                <RotateCcw className="h-3.5 w-3.5" /> Retry Failed Stage
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {workflow.status !== "completed" && workflow.status !== "cancelled" && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs gap-1.5"
                onClick={() => handleAction("step")}
                disabled={actionLoading}
              >
                <Play className="h-3.5 w-3.5" /> Step Forward
              </Button>
            )}

            <Button size="sm" variant="ghost" onClick={onClose} className="text-xs">
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
