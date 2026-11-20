"use client";

import React, { useState } from "react";
import {
  X,
  Sparkles,
  Film,
  Layers,
  Share2,
  DollarSign,
  ChevronRight,
  ChevronLeft,
  Check,
  Zap,
  Info,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ApprovalMode } from "@/lib/workflow/types";

interface PageOption {
  id: string;
  page_name: string;
  facebook_page_id?: string;
}

interface WorkflowBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  pages: PageOption[];
  onWorkflowCreated: () => void;
}

export function WorkflowBuilderModal({
  isOpen,
  onClose,
  pages,
  onWorkflowCreated,
}: WorkflowBuilderModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [workflowName, setWorkflowName] = useState("Autonomous Reels Campaign #1");
  const [niche, setNiche] = useState("Productivity & Growth");
  const [category, setCategory] = useState("Actionable Insights");
  const [topic, setTopic] = useState("3 Habits of High Performers");
  const [duration, setDuration] = useState(45);
  const [tone, setTone] = useState("engaging, energetic");
  const [numScenes, setNumScenes] = useState(4);

  // Video & Voice
  const [videoProvider, setVideoProvider] = useState<"replicate" | "runway" | "mock">("replicate");
  const [voiceProvider, setVoiceProvider] = useState<"elevenlabs" | "openai" | "mock">("elevenlabs");
  const [subtitlePreset, setSubtitlePreset] = useState("bold_viral");

  // Branding
  const [watermarkText, setWatermarkText] = useState("PagePulse");
  const [watermarkPosition, setWatermarkPosition] = useState<"top_right" | "top_left" | "bottom_right" | "bottom_left">("top_right");

  // Pages & Approval
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>(
    pages.length > 0 ? [pages[0].id] : []
  );
  const [approvalMode, setApprovalMode] = useState<ApprovalMode>("final_video_approval");

  // Budget
  const [maxCostPerVideo, setMaxCostPerVideo] = useState(2.5);
  const [dailyBudget, setDailyBudget] = useState(25.0);

  if (!isOpen) return null;

  const togglePageSelection = (pageId: string) => {
    setSelectedPageIds((prev) =>
      prev.includes(pageId) ? prev.filter((id) => id !== pageId) : [...prev, pageId]
    );
  };

  const applyTemplate = (preset: "viral" | "motivation" | "tech") => {
    if (preset === "viral") {
      setWorkflowName("Viral Explainer Series");
      setNiche("Productivity & Mindset");
      setCategory("Viral Lessons");
      setTopic("The 1% Morning Routine That Changes Everything");
      setDuration(45);
      setTone("authoritative, captivating");
      setSubtitlePreset("bold_viral");
      setApprovalMode("final_video_approval");
    } else if (preset === "motivation") {
      setWorkflowName("Daily Motivation Boost");
      setNiche("Motivation & Discipline");
      setCategory("Inspiring Stories");
      setTopic("Why Discipline Always Beats Motivation");
      setDuration(35);
      setTone("intense, reflective");
      setSubtitlePreset("karaoke");
      setApprovalMode("final_video_approval");
    } else if (preset === "tech") {
      setWorkflowName("AI Tools Showcase");
      setNiche("Artificial Intelligence & Tech");
      setCategory("Software Reviews");
      setTopic("5 Insane AI Tools You Must Try Today");
      setDuration(50);
      setTone("fast-paced, exciting");
      setSubtitlePreset("highlight_keywords");
      setApprovalMode("final_video_approval");
    }
  };

  const handleLaunchWorkflow = async () => {
    if (selectedPageIds.length === 0) {
      setError("Please select at least one connected Facebook Page.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        workflow_name: workflowName,
        approval_mode: approvalMode,
        configuration: {
          niche,
          category,
          topic,
          video_duration: Number(duration),
          num_scenes: Number(numScenes),
          content_tone: tone,
          aspect_ratio: "9:16",
          resolution: "1080x1920",
          video_provider: videoProvider,
          voice_provider: voiceProvider,
          subtitle_preset: subtitlePreset,
          watermark_text: watermarkText,
          watermark_position: watermarkPosition,
          target_page_ids: selectedPageIds,
          approval_mode: approvalMode,
          max_cost_per_video: Number(maxCostPerVideo),
          daily_budget_limit: Number(dailyBudget),
        },
      };

      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to launch workflow.");
      }

      onWorkflowCreated();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl bg-card border rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">AI Automation Workflow Builder</h3>
              <p className="text-xs text-muted-foreground">
                Step {currentStep} of 5:{" "}
                {currentStep === 1
                  ? "Content & Concept"
                  : currentStep === 2
                  ? "AI Video & Voice"
                  : currentStep === 3
                  ? "Branding & Safe Zones"
                  : currentStep === 4
                  ? "Target Pages & Approval"
                  : "Budget & Confirmation"}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-lg">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Wizard Step Indicator */}
        <div className="flex border-b text-xs font-medium">
          {[
            { num: 1, label: "Concept" },
            { num: 2, label: "Video/Voice" },
            { num: 3, label: "Branding" },
            { num: 4, label: "Pages & Gates" },
            { num: 5, label: "Budget" },
          ].map((s) => (
            <button
              key={s.num}
              onClick={() => setCurrentStep(s.num)}
              className={`flex-1 py-2.5 text-center transition-colors border-b-2 ${
                currentStep === s.num
                  ? "border-primary text-primary font-semibold bg-primary/5"
                  : currentStep > s.num
                  ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {s.num}. {s.label}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3.5 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive text-xs flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Concept & Presets */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Load Quick Template Preset</Label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => applyTemplate("viral")}
                    className="p-2.5 rounded-xl border text-left hover:border-primary transition-all text-xs bg-muted/10 hover:bg-muted/30"
                  >
                    <div className="font-semibold text-foreground">Viral Explainer</div>
                    <div className="text-[11px] text-muted-foreground">Curious Hook + 3 Tips</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyTemplate("motivation")}
                    className="p-2.5 rounded-xl border text-left hover:border-primary transition-all text-xs bg-muted/10 hover:bg-muted/30"
                  >
                    <div className="font-semibold text-foreground">Daily Motivation</div>
                    <div className="text-[11px] text-muted-foreground">Deep Pacing + Voice</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyTemplate("tech")}
                    className="p-2.5 rounded-xl border text-left hover:border-primary transition-all text-xs bg-muted/10 hover:bg-muted/30"
                  >
                    <div className="font-semibold text-foreground">Tech & AI Tools</div>
                    <div className="text-[11px] text-muted-foreground">Fast-paced Showcase</div>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Workflow Campaign Name</Label>
                <Input
                  value={workflowName}
                  onChange={(e) => setWorkflowName(e.target.value)}
                  placeholder="e.g. Daily Reels Automation Hub"
                  className="h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Content Niche</Label>
                  <Input
                    value={niche}
                    onChange={(e) => setNiche(e.target.value)}
                    placeholder="e.g. Finance, Tech, Fitness"
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Category</Label>
                  <Input
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Life Hacks, Tutorials"
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Topic / Core Angle</Label>
                <Input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. 3 High-Income Skills You Can Learn in 30 Days"
                  className="h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Duration (Seconds)</Label>
                  <Input
                    type="number"
                    min={15}
                    max={90}
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Storyboard Scenes</Label>
                  <Input
                    type="number"
                    min={2}
                    max={8}
                    value={numScenes}
                    onChange={(e) => setNumScenes(Number(e.target.value))}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Tone</Label>
                  <Input
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Video & Audio */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Video Generation Provider</Label>
                  <select
                    value={videoProvider}
                    onChange={(e: any) => setVideoProvider(e.target.value)}
                    className="w-full h-9 rounded-md border bg-background px-3 text-xs"
                  >
                    <option value="replicate">Replicate (Luma / Ray 9:16)</option>
                    <option value="runway">Runway Gen-3 Alpha</option>
                    <option value="mock">Simulated Dev Provider (Fast / Zero Cost)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Voiceover Provider</Label>
                  <select
                    value={voiceProvider}
                    onChange={(e: any) => setVoiceProvider(e.target.value)}
                    className="w-full h-9 rounded-md border bg-background px-3 text-xs"
                  >
                    <option value="elevenlabs">ElevenLabs Neural Voice</option>
                    <option value="openai">OpenAI TTS-1 (Alloy/Onyx)</option>
                    <option value="mock">Simulated Voice</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Dynamic Subtitle Style</Label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { id: "bold_viral", label: "Bold Viral Yellow", desc: "Yellow #FFE500 with thick black stroke" },
                    { id: "karaoke", label: "Word-by-word Karaoke", desc: "Cyan highlight as each word is spoken" },
                    { id: "highlight_keywords", label: "Keyword Pop", desc: "Bright accent on energetic action words" },
                    { id: "classic", label: "Clean White Modern", desc: "Minimalist bold sans-serif" },
                  ].map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setSubtitlePreset(sub.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        subtitlePreset === sub.id
                          ? "border-primary bg-primary/5 text-foreground font-semibold"
                          : "border-muted bg-muted/10 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <div>{sub.label}</div>
                      <div className="text-[10px] opacity-75">{sub.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl border bg-muted/20 text-xs text-muted-foreground space-y-1">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-primary" /> Meta Reels 9:16 Vertical Safe Zones
                </div>
                <p>
                  Subtitles and watermarks are automatically kept inside safe zones (bottom 250px and top 120px are reserved for Facebook UI overlay).
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: Branding */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Watermark / Page Brand Name</Label>
                <Input
                  value={watermarkText}
                  onChange={(e) => setWatermarkText(e.target.value)}
                  placeholder="e.g. @YourBrandName"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Watermark Overlay Position</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "top_right", label: "Top Right Corner" },
                    { id: "top_left", label: "Top Left Corner" },
                    { id: "bottom_right", label: "Bottom Right Corner" },
                    { id: "bottom_left", label: "Bottom Left Corner" },
                  ].map((pos) => (
                    <button
                      key={pos.id}
                      type="button"
                      onClick={() => setWatermarkPosition(pos.id as any)}
                      className={`p-2.5 rounded-xl border text-xs text-center transition-all ${
                        watermarkPosition === pos.id
                          ? "border-primary bg-primary/5 text-primary font-semibold"
                          : "border-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Target Pages & Approval Gates */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Select Destination Facebook Pages</Label>
                  <span className="text-xs text-muted-foreground">
                    {selectedPageIds.length} of {pages.length} selected
                  </span>
                </div>

                {pages.length === 0 ? (
                  <div className="p-4 border rounded-xl text-center text-xs text-muted-foreground">
                    No connected Facebook Pages found. You can still test in simulated demo mode.
                  </div>
                ) : (
                  <div className="max-h-40 overflow-y-auto space-y-1.5 border rounded-xl p-2 bg-muted/10">
                    {pages.map((p) => {
                      const isSelected = selectedPageIds.includes(p.id);
                      return (
                        <div
                          key={p.id}
                          onClick={() => togglePageSelection(p.id)}
                          className={`p-2 rounded-lg flex items-center justify-between cursor-pointer text-xs transition-colors ${
                            isSelected ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted/40"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`h-4 w-4 rounded border flex items-center justify-center ${isSelected ? "bg-primary text-primary-foreground border-primary" : "border-muted"}`}>
                              {isSelected && <Check className="h-3 w-3" />}
                            </div>
                            <span>{p.page_name}</span>
                          </div>
                          <Badge variant="outline" className="text-[10px]">
                            9:16 Reels
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Approval Gates */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Human Approval Gate Setting</Label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    {
                      id: "final_video_approval",
                      title: "Mode C: Final Video Approval (Default)",
                      desc: "Runs pipeline automatically; waits for your sign-off before scheduling.",
                    },
                    {
                      id: "script_approval",
                      title: "Mode B: Script Approval",
                      desc: "Pauses after script generation. You approve script, then video renders.",
                    },
                    {
                      id: "fully_manual",
                      title: "Mode A: Fully Manual",
                      desc: "Requires manual approval at every step (script, storyboard, final video).",
                    },
                    {
                      id: "fully_automated",
                      title: "Mode D: Fully Autonomous",
                      desc: "Zero pauses. Transforms idea directly into scheduled post if QC passes.",
                    },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setApprovalMode(mode.id as any)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        approvalMode === mode.id
                          ? "border-primary bg-primary/5 text-foreground font-semibold"
                          : "border-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <div className="text-xs">{mode.title}</div>
                      <div className="text-[10px] opacity-75 mt-0.5">{mode.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Budget & Confirmation */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Max Allowed Cost Per Video ($)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="10"
                    value={maxCostPerVideo}
                    onChange={(e) => setMaxCostPerVideo(Number(e.target.value))}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Daily Budget Cap ($)</Label>
                  <Input
                    type="number"
                    step="5"
                    min="5"
                    max="500"
                    value={dailyBudget}
                    onChange={(e) => setDailyBudget(Number(e.target.value))}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              {/* Cost Summary Card */}
              <div className="p-4 rounded-xl border bg-muted/20 space-y-2.5">
                <div className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Estimated AI Production Cost</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                    ~$0.35 - $0.50 USD
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground space-y-1">
                  <div className="flex justify-between">
                    <span>• Script & Viral Hook Synthesis (OpenAI)</span>
                    <span>~$0.007</span>
                  </div>
                  <div className="flex justify-between">
                    <span>• {numScenes} Scenes AI Video Generation ({videoProvider})</span>
                    <span>~${(numScenes * 0.08).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>• ElevenLabs Synchronized Voiceover</span>
                    <span>~$0.02</span>
                  </div>
                  <div className="flex justify-between">
                    <span>• FFmpeg 1080x1920 Composition & Subtitles</span>
                    <span>~$0.01</span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs">
                Ready to transform idea into Facebook Reels for {selectedPageIds.length} connected page(s) with automated Quality Control and duplicate content prevention.
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="p-4 border-t bg-muted/10 flex items-center justify-between">
          <div>
            {currentStep > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentStep((prev) => prev - 1)}
                className="gap-1.5 text-xs"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Back
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
              Cancel
            </Button>

            {currentStep < 5 ? (
              <Button
                size="sm"
                onClick={() => setCurrentStep((prev) => prev + 1)}
                className="gap-1.5 text-xs"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleLaunchWorkflow}
                disabled={loading}
                className="gap-1.5 text-xs bg-primary"
              >
                <Zap className="h-3.5 w-3.5" />
                {loading ? "Launching..." : "Launch Autonomous Pipeline"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
