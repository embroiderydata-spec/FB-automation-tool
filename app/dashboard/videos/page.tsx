"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Film,
  Video,
  Layers,
  Filter,
  Plus,
  Clock,
  CheckCircle2,
  Sparkles,
  Mic,
  Subtitles,
  Sliders,
  Stamp,
  Activity,
  FolderOpen,
  Download,
  RotateCcw,
  Music,
  ListChecks,
  MonitorPlay,
  Maximize2,
  Trash2,
  Play,
  Pause,
  AlertTriangle,
  ExternalLink,
  Loader2,
  Search,
  Eye,
  RefreshCw,
  Edit2,
  Check,
  X,
  Calendar,
  AlertCircle,
  Volume2,
  Scissors,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VideoPlayerModal } from "@/components/video/video-player-modal";
import { BrandingPreview } from "@/components/video/branding-preview";
import { SubtitlePreview } from "@/components/video/subtitle-preview";
import { VoiceStudio } from "@/components/video/voice-studio";
import { SubtitlePresetStyle } from "@/lib/video/types";

function VideoLibraryContent() {
  const searchParams = useSearchParams();
  const storyboardIdParam = searchParams?.get("storyboard_id");
  const [activeTab, setActiveTab] = useState("studio");

  // Global State
  const [pages, setPages] = useState<any[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string>("all");
  const [providersStatus, setProvidersStatus] = useState<any>(null);

  // Tab 1: Video Production Studio State
  const [storyboards, setStoryboards] = useState<any[]>([]);
  const [selectedStoryboardId, setSelectedStoryboardId] = useState<string>("");
  const [activeStoryboard, setActiveStoryboard] = useState<any>(null);
  const [scenes, setScenes] = useState<any[]>([]);
  const [loadingStoryboard, setLoadingStoryboard] = useState(false);
  const [generatingSceneId, setGeneratingSceneId] = useState<string | null>(null);
  const [generatingImageId, setGeneratingImageId] = useState<string | null>(null);
  const [synthesizingVoice, setSynthesizingVoice] = useState(false);
  const [dispatchingRender, setDispatchingRender] = useState(false);
  const [renderNotice, setRenderNotice] = useState<string | null>(null);
  const [selectedSubtitlePreset, setSelectedSubtitlePreset] = useState<SubtitlePresetStyle>("bold_viral");

  // Tab 2: Video Library State
  const [libraryAssets, setLibraryAssets] = useState<any[]>([]);
  const [libraryVideos, setLibraryVideos] = useState<any[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [assetTypeFilter, setAssetTypeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [librarySearch, setLibrarySearch] = useState("");
  const [assetToDelete, setAssetToDelete] = useState<{ id: string; name: string; isVideo: boolean } | null>(null);
  const [deletingAsset, setDeletingAsset] = useState(false);
  const [previewImageModal, setPreviewImageModal] = useState<{ url: string; title: string } | null>(null);

  // Tab 3: Render Queue State
  const [renderJobs, setRenderJobs] = useState<any[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [cancellingJobId, setCancellingJobId] = useState<string | null>(null);
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null);

  // Tab 6: Provider Testing State
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [providerTestResults, setProviderTestResults] = useState<Record<string, { success: boolean; latencyMs?: number; message?: string }>>({});

  // Video Preview Modal
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewVideo, setPreviewVideo] = useState<{
    url: string;
    title: string;
    duration?: number;
    provider?: string;
  } | null>(null);

  // Initial Data Fetch
  useEffect(() => {
    fetchPages();
    fetchProviders();
    fetchStoryboards(storyboardIdParam || undefined);
    fetchLibrary();
    fetchRenderQueue();
  }, [storyboardIdParam]);

  // Polling for Render Queue when active jobs exist
  useEffect(() => {
    const hasActiveJobs = renderJobs.some((j) =>
      ["pending", "queued", "generating_voice", "generating_scenes", "composing", "rendering"].includes(j.render_status)
    );

    let interval: NodeJS.Timeout | null = null;
    if (hasActiveJobs) {
      interval = setInterval(() => {
        fetchRenderQueue(true);
      }, 4000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [renderJobs]);

  async function fetchPages() {
    try {
      const res = await fetch("/api/facebook-pages");
      const data = await res.json();
      if (res.ok && data.pages) {
        setPages(data.pages);
      }
    } catch {
      // Ignore
    }
  }

  async function fetchProviders() {
    try {
      const res = await fetch("/api/video/providers");
      const data = await res.json();
      if (res.ok && data.providers) {
        setProvidersStatus(data.providers);
      }
    } catch {
      // Ignore
    }
  }

  async function fetchStoryboards(targetId?: string) {
    try {
      const res = await fetch("/api/content/storyboards");
      const data = await res.json();
      if (res.ok && data.storyboards) {
        setStoryboards(data.storyboards);
        const toLoad = targetId || (data.storyboards.length > 0 ? data.storyboards[0].id : null);
        if (toLoad) {
          loadStoryboardScenes(toLoad);
        }
      }
    } catch {
      // Ignore
    }
  }

  async function loadStoryboardScenes(sbId: string) {
    try {
      setSelectedStoryboardId(sbId);
      setLoadingStoryboard(true);
      const res = await fetch(`/api/content/storyboards/${sbId}`);
      const data = await res.json();
      if (res.ok && data.storyboard) {
        setActiveStoryboard(data.storyboard);
        setScenes(data.scenes || []);
      }
    } catch {
      // Ignore
    } finally {
      setLoadingStoryboard(false);
    }
  }

  async function fetchLibrary() {
    try {
      setLoadingLibrary(true);
      const res = await fetch(`/api/video/library?type=${assetTypeFilter}&page_id=${selectedPageId}`);
      const data = await res.json();
      if (res.ok) {
        setLibraryAssets(data.assets || []);
        setLibraryVideos(data.videos || []);
      }
    } catch {
      // Ignore
    } finally {
      setLoadingLibrary(false);
    }
  }

  async function fetchRenderQueue(silent = false) {
    try {
      if (!silent) setLoadingQueue(true);
      const res = await fetch("/api/video/render");
      const data = await res.json();
      if (res.ok && data.jobs) {
        setRenderJobs(data.jobs);
      }
    } catch {
      // Ignore
    } finally {
      if (!silent) setLoadingQueue(false);
    }
  }

  // Generate Video Clip for a Scene
  async function handleGenerateSceneClip(scene: any) {
    try {
      setGeneratingSceneId(scene.id);
      const res = await fetch("/api/video/generate/scene", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scene_id: scene.id,
          prompt: scene.video_prompt || scene.visual_description,
          duration_seconds: scene.duration || 3.5,
          aspect_ratio: "9:16",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to generate video scene.");
      } else {
        alert(`Video generation started via ${data.provider}! Clip saved to Asset Library.`);
        await fetchLibrary();
      }
    } catch (err: any) {
      alert(err.message || "Error generating video scene.");
    } finally {
      setGeneratingSceneId(null);
    }
  }

  // Generate Vertical Keyframe Image for Scene
  async function handleGenerateSceneImage(scene: any) {
    try {
      setGeneratingImageId(scene.id);
      const res = await fetch("/api/video/generate/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: scene.visual_description || scene.video_prompt,
          aspect_ratio: "9:16",
          quality: "standard",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to generate image.");
      } else {
        alert("Vertical 9:16 keyframe image generated and saved to Asset Library!");
        await fetchLibrary();
      }
    } catch (err: any) {
      alert(err.message || "Error generating image.");
    } finally {
      setGeneratingImageId(null);
    }
  }

  // Synthesize Narration Voiceover for Active Storyboard
  async function handleSynthesizeNarration() {
    if (!activeStoryboard?.content_scripts?.narration) {
      alert("No narration text found for this storyboard.");
      return;
    }
    try {
      setSynthesizingVoice(true);
      const res = await fetch("/api/video/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: activeStoryboard.content_scripts.narration,
          speed: 1.0,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to synthesize voiceover.");
      } else {
        alert("Voiceover synthesized successfully and saved to Asset Library!");
        await fetchLibrary();
      }
    } catch (err: any) {
      alert(err.message || "Error synthesizing voiceover.");
    } finally {
      setSynthesizingVoice(false);
    }
  }

  // Dispatch Full Video Render
  async function handleDispatchRender() {
    if (!activeStoryboard?.id || !activeStoryboard.content_script_id) {
      alert("Please select a storyboard with a linked script.");
      return;
    }

    try {
      setDispatchingRender(true);
      setRenderNotice(null);

      const res = await fetch("/api/video/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyboard_id: activeStoryboard.id,
          script_id: activeStoryboard.content_script_id,
          page_id: activeStoryboard.facebook_page_id || pages[0]?.id,
          subtitle_preset: selectedSubtitlePreset,
          include_watermark: true,
          resolution: "1080x1920",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setRenderNotice(`Render dispatch error: ${data.error}`);
      } else {
        setRenderNotice("Render job successfully queued in background dispatcher!");
        await fetchRenderQueue();
        setActiveTab("queue");
      }
    } catch (err: any) {
      setRenderNotice(`Error dispatching render: ${err.message}`);
    } finally {
      setDispatchingRender(false);
    }
  }

  // Cancel In-Flight Render Job
  async function handleCancelJob(jobId: string) {
    try {
      setCancellingJobId(jobId);
      const res = await fetch(`/api/video/render/${jobId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      if (res.ok) {
        await fetchRenderQueue();
      }
    } catch {
      // Ignore
    } finally {
      setCancellingJobId(null);
    }
  }

  // Retry Failed Render Job
  async function handleRetryJob(jobId: string) {
    try {
      setRetryingJobId(jobId);
      const res = await fetch(`/api/video/render/${jobId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry" }),
      });
      if (res.ok) {
        await fetchRenderQueue();
      }
    } catch {
      // Ignore
    } finally {
      setRetryingJobId(null);
    }
  }

  // Delete Render Job from Queue
  async function handleDeleteJob(jobId: string) {
    try {
      const res = await fetch(`/api/video/render/${jobId}`, { method: "DELETE" });
      if (res.ok) {
        setRenderJobs((prev) => prev.filter((j) => j.id !== jobId));
      }
    } catch {
      // Ignore
    }
  }

  // Delete Media Asset or Video with Confirmation
  async function confirmDeleteAsset() {
    if (!assetToDelete) return;
    try {
      setDeletingAsset(true);
      const url = assetToDelete.isVideo
        ? `/api/video/library?id=${assetToDelete.id}&is_video=true`
        : `/api/video/library?id=${assetToDelete.id}`;

      const res = await fetch(url, { method: "DELETE" });
      if (res.ok) {
        if (assetToDelete.isVideo) {
          setLibraryVideos((prev) => prev.filter((v) => v.id !== assetToDelete.id));
        } else {
          setLibraryAssets((prev) => prev.filter((a) => a.id !== assetToDelete.id));
        }
      }
    } catch {
      // Ignore
    } finally {
      setDeletingAsset(false);
      setAssetToDelete(null);
    }
  }

  // Test Provider Live Connection
  async function handleTestProvider(providerKey: string) {
    try {
      setTestingProvider(providerKey);
      const startTime = performance.now();
      const res = await fetch("/api/video/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: providerKey }),
      });
      const data = await res.json();
      const latencyMs = Math.round(performance.now() - startTime);

      setProviderTestResults((prev) => ({
        ...prev,
        [providerKey]: {
          success: data.success ?? (res.ok && !data.error),
          latencyMs,
          message: data.message || (res.ok ? "Handshake Successful" : data.error || "Connection Failed"),
        },
      }));
    } catch (err: any) {
      setProviderTestResults((prev) => ({
        ...prev,
        [providerKey]: {
          success: false,
          message: err.message || "Network Timeout",
        },
      }));
    } finally {
      setTestingProvider(null);
    }
  }

  // Filter Assets by Date
  function filterByDate(itemDateStr: string) {
    if (dateFilter === "all") return true;
    const itemDate = new Date(itemDateStr).getTime();
    const now = Date.now();
    if (dateFilter === "today") return now - itemDate < 24 * 3600 * 1000;
    if (dateFilter === "7days") return now - itemDate < 7 * 24 * 3600 * 1000;
    if (dateFilter === "30days") return now - itemDate < 30 * 24 * 3600 * 1000;
    return true;
  }

  const specBadges = [
    { label: "Aspect Ratio", value: "9:16 Vertical" },
    { label: "Resolution", value: "1080 × 1920 Full HD" },
    { label: "Format", value: "H.264 / AAC MP4" },
    { label: "FPS", value: "30 FPS" },
    {
      label: "AI Video Generation",
      value: "Coming Soon (Use Video Clipper)",
    },
    {
      label: "Voiceover",
      value: providersStatus?.elevenlabs?.is_configured ? "ElevenLabs (Active)" : "OpenAI TTS",
    },
  ];

  // Helper for Queue processing step labels
  function getStepLabel(status: string) {
    switch (status) {
      case "queued":
        return "Step 1/5: Queued in Dispatcher";
      case "generating_voice":
        return "Step 2/5: Synthesizing Voiceover";
      case "generating_scenes":
        return "Step 3/5: Rendering 9:16 Scene Clips";
      case "composing":
        return "Step 4/5: Burning Subtitles & Branding";
      case "rendering":
        return "Step 5/5: Encoding 1080×1920 MP4";
      case "completed":
        return "Completed • Ready for Publishing";
      case "failed":
        return "Failed • Tap Retry";
      case "cancelled":
        return "Cancelled by User";
      default:
        return "Processing Pipeline";
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Video Production Studio & Library
            </h2>
            <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400 text-[10px]">
              AI Video Gen: Coming Soon
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Turn approved storyboards into vertical 9:16 Facebook Reels with AI video clips, ElevenLabs voiceovers, kinetic subtitles, and watermarks.
          </p>
        </div>

        {/* Global Page Selector */}
        <div className="flex items-center gap-2">
          <select
            value={selectedPageId}
            onChange={(e) => {
              setSelectedPageId(e.target.value);
              setTimeout(() => fetchLibrary(), 100);
            }}
            className="h-8 text-xs rounded-md border border-input bg-background px-2.5 font-medium"
          >
            <option value="all">All Pages ({pages.length})</option>
            {pages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.page_name || p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Specifications Bar */}
      <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg border bg-muted/20 text-xs">
        <span className="font-semibold text-foreground mr-1">Reels Standards:</span>
        {specBadges.map((spec) => (
          <Badge key={spec.label} variant="outline" className="text-[11px] py-0.5">
            <span className="text-muted-foreground mr-1">{spec.label}:</span>
            <span className="font-medium text-foreground">{spec.value}</span>
          </Badge>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-3 sm:grid-cols-6 h-auto p-1 bg-muted/50">
          <TabsTrigger value="studio" className="text-xs py-1.5">Production Studio</TabsTrigger>
          <TabsTrigger value="library" className="text-xs py-1.5">Asset Library</TabsTrigger>
          <TabsTrigger value="queue" className="text-xs py-1.5 flex items-center gap-1.5">
            Render Queue
            {renderJobs.some((j) => ["pending", "queued", "generating_voice", "generating_scenes", "composing", "rendering"].includes(j.render_status)) && (
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
            )}
          </TabsTrigger>
          <TabsTrigger value="subtitles" className="text-xs py-1.5">Subtitles & Voice</TabsTrigger>
          <TabsTrigger value="branding" className="text-xs py-1.5">Page Branding</TabsTrigger>
          <TabsTrigger value="settings" className="text-xs py-1.5">Engine Settings</TabsTrigger>
        </TabsList>

        {/* ------------------------------------------------------------------ */}
        {/* TAB 1: PRODUCTION STUDIO */}
        {/* ------------------------------------------------------------------ */}
        <TabsContent value="studio" className="space-y-6">
          <Card>
            <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Film className="h-4 w-4 text-indigo-500" />
                  Storyboard to Video Pipeline
                </CardTitle>
                <CardDescription className="text-xs">
                  Generate video scenes, synthesize voiceover narration, and dispatch full 9:16 vertical compilation.
                </CardDescription>
              </div>

              {/* Storyboard Selector */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedStoryboardId}
                  onChange={(e) => loadStoryboardScenes(e.target.value)}
                  className="h-8 text-xs rounded border border-input bg-background px-2 max-w-xs truncate"
                >
                  <option value="">Select an Approved Storyboard</option>
                  {storyboards.map((sb) => (
                    <option key={sb.id} value={sb.id}>
                      {sb.content_scripts?.script_title || `Storyboard #${sb.id.slice(0, 8)}`}
                    </option>
                  ))}
                </select>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Coming Soon Notice */}
              <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-semibold">
                    <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                    <span>AI Video Scene Generation & Pipelines — Coming Soon</span>
                    <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400 text-[9px]">Coming Soon</Badge>
                  </div>
                  <p className="text-muted-foreground text-[11px]">
                    Automatic AI video scene synthesis (text-to-video / image-to-video) via external AI providers is under active development. For immediate high-converting 9:16 vertical Reel creation from source videos, please use the <strong>Video Clipper Studio</strong>.
                  </p>
                </div>
                <Link href="/dashboard/clipper">
                  <Button size="sm" className="bg-primary text-primary-foreground text-xs gap-1.5 shrink-0">
                    <Scissors className="h-3.5 w-3.5" />
                    Open Video Clipper
                  </Button>
                </Link>
              </div>

              {renderNotice && (
                <div className="p-3 rounded-lg border border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-xs">
                  {renderNotice}
                </div>
              )}

              {!selectedStoryboardId ? (
                <EmptyState
                  icon={Film}
                  title="No Storyboard Selected"
                  description="Choose a storyboard above or approve a script in the AI Content Studio to start producing video scenes."
                  phase="Active Pipeline"
                />
              ) : loadingStoryboard ? (
                <div className="py-12 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  Loading storyboard scenes...
                </div>
              ) : (
                <>
                  {/* Top Dispatch Banner */}
                  <div className="p-3 rounded-lg border bg-muted/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="space-y-0.5">
                      <span className="font-semibold text-xs text-foreground block">
                        Ready to Render Full 9:16 Reel
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {scenes.length} Scenes • Subtitles: <strong>{selectedSubtitlePreset}</strong> • Full HD 1080×1920 • 30 FPS
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {activeStoryboard?.content_scripts?.narration && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={synthesizingVoice}
                          onClick={handleSynthesizeNarration}
                          className="h-8 text-xs gap-1.5"
                        >
                          {synthesizingVoice ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Mic className="h-3 w-3 text-indigo-500" />
                          )}
                          Synthesize Voiceover
                        </Button>
                      )}

                      <Button
                        size="sm"
                        disabled={true}
                        className="gap-1.5 text-xs bg-muted text-muted-foreground cursor-not-allowed shrink-0 h-8 border"
                      >
                        <Clock className="h-3.5 w-3.5 text-amber-500" />
                        Full Video Render (Coming Soon)
                      </Button>
                    </div>
                  </div>

                  {/* Scene-by-Scene Video Clip Pipeline */}
                  <div className="space-y-3">
                    {scenes.map((scene) => (
                      <div
                        key={scene.id}
                        className="rounded-lg border bg-card p-3 flex flex-col md:flex-row md:items-start gap-4 hover:border-indigo-500/40 transition-colors"
                      >
                        <div className="w-24 shrink-0 space-y-1">
                          <span className="font-bold text-sm text-foreground">
                            Scene {scene.scene_number}
                          </span>
                          <Badge variant="outline" className="text-[9px] capitalize block text-center">
                            {scene.scene_type}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground font-mono block text-center">
                            {scene.duration}s duration
                          </span>
                        </div>

                        <div className="flex-1 space-y-1.5 text-xs">
                          <p className="text-muted-foreground font-medium">
                            <strong className="text-foreground">Narration:</strong> "{scene.narration}"
                          </p>
                          <p className="text-muted-foreground">
                            <strong className="text-foreground">Visual Description:</strong> {scene.visual_description}
                          </p>
                          <div className="p-2 rounded bg-indigo-500/5 border border-indigo-500/20 text-[10px] font-mono text-muted-foreground">
                            {scene.video_prompt}
                          </div>
                        </div>

                        {/* Individual Scene Actions */}
                        <div className="flex md:flex-col items-center gap-1.5 shrink-0 pt-2 md:pt-0">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[11px] gap-1 px-2 opacity-60 cursor-not-allowed"
                            disabled={true}
                          >
                            <Clock className="h-3 w-3 text-amber-500" />
                            Keyframe (Coming Soon)
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[11px] gap-1 px-2 opacity-60 cursor-not-allowed"
                            disabled={true}
                          >
                            <Clock className="h-3 w-3 text-amber-500" />
                            AI Clip (Coming Soon)
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------------------------------------------------ */}
        {/* TAB 2: ASSET LIBRARY */}
        {/* ------------------------------------------------------------------ */}
        <TabsContent value="library" className="space-y-6">
          <Card>
            <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-semibold">Video Asset Library</CardTitle>
                <CardDescription className="text-xs">
                  Central repository of generated 9:16 vertical videos, scene clips, voiceover tracks, and keyframe images stored in Supabase.
                </CardDescription>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  value={librarySearch}
                  onChange={(e) => setLibrarySearch(e.target.value)}
                  placeholder="Search assets..."
                  className="h-8 text-xs w-40"
                />

                <select
                  value={assetTypeFilter}
                  onChange={(e) => {
                    setAssetTypeFilter(e.target.value);
                    setTimeout(() => fetchLibrary(), 100);
                  }}
                  className="h-8 text-xs rounded border border-input bg-background px-2"
                >
                  <option value="all">All Types</option>
                  <option value="video">Final Videos</option>
                  <option value="image">Scene Images</option>
                  <option value="voiceover">Voiceovers</option>
                </select>

                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="h-8 text-xs rounded border border-input bg-background px-2"
                >
                  <option value="all">All Dates</option>
                  <option value="today">Today</option>
                  <option value="7days">Last 7 Days</option>
                  <option value="30days">Last 30 Days</option>
                </select>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchLibrary}
                  className="h-8 w-8 p-0"
                  title="Refresh Library"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              {loadingLibrary ? (
                <div className="py-12 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  Loading media library...
                </div>
              ) : libraryVideos.length === 0 && libraryAssets.length === 0 ? (
                <EmptyState
                  icon={FolderOpen}
                  title="No Video Assets Stored"
                  description="Rendered 1080x1920 MP4 Reels, AI scene clips, and voiceovers will appear here automatically for preview and download."
                  phase="Active Storage"
                />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {/* Rendered Final Videos */}
                  {libraryVideos
                    .filter((v) => !librarySearch || v.title?.toLowerCase().includes(librarySearch.toLowerCase()))
                    .filter((v) => filterByDate(v.created_at))
                    .map((vid) => (
                      <div
                        key={vid.id}
                        className="rounded-lg border bg-card overflow-hidden flex flex-col justify-between hover:border-indigo-500/40 transition-colors shadow-2xs"
                      >
                        <div className="aspect-[9/16] bg-slate-950 relative flex items-center justify-center group">
                          {vid.video_url || vid.final_video_path ? (
                            <video
                              src={vid.video_url || vid.final_video_path}
                              className="w-full h-full object-cover"
                              muted
                              playsInline
                            />
                          ) : (
                            <Film className="h-8 w-8 text-slate-700" />
                          )}
                          <div className="absolute top-2 right-2">
                            <Badge
                              variant={vid.render_status === "completed" ? "success" : "outline"}
                              className="text-[9px]"
                            >
                              {vid.render_status}
                            </Badge>
                          </div>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="absolute inset-auto h-8 text-xs gap-1 bg-black/60 hover:bg-black/80 text-white backdrop-blur-xs"
                            onClick={() => {
                              setPreviewVideo({
                                url: vid.video_url || vid.final_video_path,
                                title: vid.title,
                                duration: vid.duration_seconds,
                                provider: vid.generation_provider,
                              });
                              setPreviewModalOpen(true);
                            }}
                          >
                            <Play className="h-3 w-3" /> Preview
                          </Button>
                        </div>

                        <div className="p-3 space-y-1">
                          <h4 className="text-xs font-semibold text-foreground truncate">{vid.title}</h4>
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                            <span>{vid.duration_seconds || 30}s • 1080×1920</span>
                            <span>{new Date(vid.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>

                        <div className="p-2 border-t bg-muted/20 flex items-center justify-between">
                          <a
                            href={vid.video_url || vid.final_video_path}
                            download={`${vid.title || "reel"}.mp4`}
                            className="text-xs"
                          >
                            <Button variant="ghost" size="sm" className="h-6 text-[11px] gap-1 px-1.5">
                              <Download className="h-3 w-3" /> Download MP4
                            </Button>
                          </a>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500"
                            onClick={() => setAssetToDelete({ id: vid.id, name: vid.title, isVideo: true })}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}

                  {/* Media Assets (Images / Audio / Scenes) */}
                  {libraryAssets
                    .filter((a) => !librarySearch || a.asset_name?.toLowerCase().includes(librarySearch.toLowerCase()))
                    .filter((a) => filterByDate(a.created_at))
                    .map((asset) => (
                      <div
                        key={asset.id}
                        className="rounded-lg border bg-card overflow-hidden flex flex-col justify-between hover:border-indigo-500/40 transition-colors shadow-2xs"
                      >
                        <div className="aspect-[9/16] bg-slate-900 relative flex items-center justify-center overflow-hidden">
                          {asset.asset_type === "image" ? (
                            <img
                              src={asset.public_url}
                              alt={asset.asset_name}
                              className="w-full h-full object-cover cursor-pointer"
                              onClick={() => setPreviewImageModal({ url: asset.public_url, title: asset.asset_name })}
                            />
                          ) : asset.asset_type === "voiceover" ? (
                            <div className="p-4 text-center w-full">
                              <Mic className="h-8 w-8 text-indigo-500 mx-auto mb-2" />
                              <audio src={asset.public_url} controls className="w-full h-8" />
                            </div>
                          ) : (
                            <Video className="h-8 w-8 text-slate-700" />
                          )}
                          <Badge variant="outline" className="absolute top-2 right-2 text-[9px] capitalize">
                            {asset.asset_type}
                          </Badge>
                        </div>

                        <div className="p-3 space-y-1">
                          <h4 className="text-xs font-semibold text-foreground truncate">{asset.asset_name}</h4>
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                            <span>{asset.provider || "AI Studio"}</span>
                            <span>{new Date(asset.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>

                        <div className="p-2 border-t bg-muted/20 flex items-center justify-between">
                          <a href={asset.public_url} download className="text-xs">
                            <Button variant="ghost" size="sm" className="h-6 text-[11px] gap-1 px-1.5">
                              <Download className="h-3 w-3" /> Get Asset
                            </Button>
                          </a>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500"
                            onClick={() => setAssetToDelete({ id: asset.id, name: asset.asset_name, isVideo: false })}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------------------------------------------------ */}
        {/* TAB 3: RENDER QUEUE */}
        {/* ------------------------------------------------------------------ */}
        <TabsContent value="queue" className="space-y-6">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-indigo-500" />
                  Render Queue Dispatcher
                </CardTitle>
                <CardDescription className="text-xs">
                  Monitors multi-stage video generation progress, voice synthesis, FFmpeg composition, and retries.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => fetchRenderQueue(false)}
              >
                <RefreshCw className={`h-3 w-3 ${loadingQueue ? "animate-spin" : ""}`} /> Refresh
              </Button>
            </CardHeader>

            <CardContent className="p-0">
              {renderJobs.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No video render jobs in queue. Select a storyboard and click "Dispatch Full Video Render".
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-y bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">Video Title & ID</th>
                        <th className="px-4 py-3">Page</th>
                        <th className="px-4 py-3">Current Processing Step</th>
                        <th className="px-4 py-3">Progress</th>
                        <th className="px-4 py-3">Created</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {renderJobs.map((job) => {
                        const isInFlight = ["pending", "queued", "generating_voice", "generating_scenes", "composing", "rendering"].includes(job.render_status);
                        return (
                          <tr key={job.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3 font-medium text-foreground max-w-xs">
                              <span className="truncate block font-semibold">{job.title}</span>
                              <span className="text-[10px] text-muted-foreground font-mono">#{job.id.slice(0, 8)}</span>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {job.facebook_pages?.page_name || "Page"}
                            </td>
                            <td className="px-4 py-3">
                              <div className="space-y-1">
                                <Badge
                                  variant={
                                    job.render_status === "completed"
                                      ? "success"
                                      : job.render_status === "failed"
                                      ? "destructive"
                                      : isInFlight
                                      ? "default"
                                      : "outline"
                                  }
                                  className="text-[10px] capitalize"
                                >
                                  {job.render_status}
                                </Badge>
                                <span className="block text-[10px] text-muted-foreground">
                                  {getStepLabel(job.render_status)}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 w-40">
                              <div className="flex items-center gap-2">
                                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                                  <div
                                    className={`h-2 rounded-full ${
                                      job.render_status === "failed"
                                        ? "bg-red-500"
                                        : job.render_status === "completed"
                                        ? "bg-emerald-500"
                                        : "bg-indigo-600 transition-all duration-500"
                                    }`}
                                    style={{ width: `${job.render_progress || 0}%` }}
                                  />
                                </div>
                                <span className="text-[10px] font-mono text-muted-foreground w-8 text-right">
                                  {job.render_progress || 0}%
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground text-[11px]">
                              {new Date(job.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </td>
                            <td className="px-4 py-3 text-right space-x-1">
                              {isInFlight && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 text-[10px] gap-1 px-1.5 text-muted-foreground hover:text-red-500"
                                  disabled={cancellingJobId === job.id}
                                  onClick={() => handleCancelJob(job.id)}
                                >
                                  {cancellingJobId === job.id ? (
                                    <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                  ) : (
                                    <X className="h-2.5 w-2.5" />
                                  )}
                                  Cancel
                                </Button>
                              )}

                              {job.render_status === "failed" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 text-[10px] gap-1 px-1.5"
                                  disabled={retryingJobId === job.id}
                                  onClick={() => handleRetryJob(job.id)}
                                >
                                  {retryingJobId === job.id ? (
                                    <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                  ) : (
                                    <RotateCcw className="h-2.5 w-2.5" />
                                  )}
                                  Retry
                                </Button>
                              )}

                              {job.render_status === "completed" && job.final_video_path && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-[10px] gap-1 text-primary px-1.5"
                                  onClick={() => {
                                    setPreviewVideo({
                                      url: job.final_video_path,
                                      title: job.title,
                                      duration: job.duration_seconds,
                                    });
                                    setPreviewModalOpen(true);
                                  }}
                                >
                                  <Play className="h-2.5 w-2.5" /> View
                                </Button>
                              )}

                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500"
                                onClick={() => handleDeleteJob(job.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------------------------------------------------ */}
        {/* TAB 4: SUBTITLES & VOICEOVER */}
        {/* ------------------------------------------------------------------ */}
        <TabsContent value="subtitles" className="space-y-6">
          <SubtitlePreview
            selectedPreset={selectedSubtitlePreset}
            onSelectPreset={setSelectedSubtitlePreset}
          />
          <VoiceStudio onVoiceoverGenerated={() => fetchLibrary()} />
        </TabsContent>

        {/* ------------------------------------------------------------------ */}
        {/* TAB 5: PAGE BRANDING */}
        {/* ------------------------------------------------------------------ */}
        <TabsContent value="branding" className="space-y-6">
          <BrandingPreview
            pageId={selectedPageId !== "all" ? selectedPageId : "global"}
            pageName={
              selectedPageId !== "all"
                ? pages.find((p) => p.id === selectedPageId)?.page_name || "Page"
                : "Global Default Branding"
            }
            pages={pages}
            onPageChange={setSelectedPageId}
          />
        </TabsContent>

        {/* ------------------------------------------------------------------ */}
        {/* TAB 6: SETTINGS & PROVIDER DIAGNOSTICS */}
        {/* ------------------------------------------------------------------ */}
        <TabsContent value="settings" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Video Generation Settings</CardTitle>
                <CardDescription className="text-xs">
                  Server-side provider endpoints, concurrency limit, and resolution parameters.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-2 rounded border bg-muted/20">
                  <span className="text-muted-foreground">Active Video Provider:</span>
                  <Badge variant="outline" className="font-mono">
                    {providersStatus?.replicate?.is_configured ? "Replicate" : "Runway"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded border bg-muted/20">
                  <span className="text-muted-foreground">Target Resolution:</span>
                  <span className="font-bold">1080 × 1920 (9:16 Vertical)</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded border bg-muted/20">
                  <span className="text-muted-foreground">Default Target Framerate:</span>
                  <span className="font-bold">30 FPS</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded border bg-muted/20">
                  <span className="text-muted-foreground">Audio Codec:</span>
                  <span className="font-bold">AAC (48 kHz)</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded border bg-muted/20">
                  <span className="text-muted-foreground">Maximum Concurrent Video Jobs:</span>
                  <span className="font-bold">2 Jobs</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded border bg-muted/20">
                  <span className="text-muted-foreground">Daily Video Budget Ceiling:</span>
                  <span className="font-bold">$25.00 / day</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Provider Health Handshake</CardTitle>
                <CardDescription className="text-xs">
                  Live connection diagnostics. Test API keys with round-trip latency verification.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {[
                  { key: "replicate", name: "Replicate (Video & Image)", status: providersStatus?.replicate?.is_configured },
                  { key: "runway", name: "Runway Gen-3 (Video)", status: providersStatus?.runway?.is_configured },
                  { key: "elevenlabs", name: "ElevenLabs (Voiceover)", status: providersStatus?.elevenlabs?.is_configured },
                  { key: "openai", name: "OpenAI DALL-E 3 (Image)", status: providersStatus?.openai_image?.is_configured },
                ].map((item) => {
                  const testResult = providerTestResults[item.key];
                  return (
                    <div
                      key={item.key}
                      className="p-2.5 rounded-lg border bg-card text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">{item.name}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant={item.status ? "success" : "outline"} className="text-[10px]">
                            {item.status ? "Configured" : "Not Configured (.env.local)"}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 text-[10px] px-2 gap-1"
                            disabled={testingProvider === item.key}
                            onClick={() => handleTestProvider(item.key)}
                          >
                            {testingProvider === item.key ? (
                              <Loader2 className="h-2.5 w-2.5 animate-spin" />
                            ) : (
                              <Activity className="h-2.5 w-2.5" />
                            )}
                            Test
                          </Button>
                        </div>
                      </div>

                      {testResult && (
                        <div className="text-[11px] flex items-center justify-between pt-1 border-t text-muted-foreground">
                          <span className={testResult.success ? "text-emerald-500 font-medium" : "text-amber-500"}>
                            {testResult.message}
                          </span>
                          {testResult.latencyMs && (
                            <span className="font-mono text-[10px]">{testResult.latencyMs}ms</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete Asset Confirmation Modal */}
      {assetToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <Card className="w-full max-w-sm border shadow-xl bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                Confirm Asset Deletion
              </CardTitle>
              <CardDescription className="text-xs">
                Are you sure you want to permanently delete <strong>{assetToDelete.name}</strong>? This action cannot be undone.
              </CardDescription>
            </CardHeader>
            <div className="p-4 pt-0 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                disabled={deletingAsset}
                onClick={() => setAssetToDelete(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="h-8 text-xs gap-1.5"
                disabled={deletingAsset}
                onClick={confirmDeleteAsset}
              >
                {deletingAsset ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                Delete Permanently
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Image Lightbox Modal */}
      {previewImageModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4"
          onClick={() => setPreviewImageModal(null)}
        >
          <div className="relative max-w-sm max-h-[90vh] flex flex-col items-center">
            <img
              src={previewImageModal.url}
              alt={previewImageModal.title}
              className="rounded-xl max-h-[80vh] object-contain shadow-2xl"
            />
            <span className="text-white text-xs mt-2 font-medium">{previewImageModal.title}</span>
          </div>
        </div>
      )}

      {/* Video Preview Modal */}
      {previewVideo && (
        <VideoPlayerModal
          isOpen={previewModalOpen}
          onClose={() => setPreviewModalOpen(false)}
          videoUrl={previewVideo.url}
          title={previewVideo.title}
          duration={previewVideo.duration}
          provider={previewVideo.provider}
        />
      )}
    </div>
  );
}

export default function VideoLibraryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center p-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary mb-2" />
          <p className="text-xs">Loading Video Production Studio...</p>
        </div>
      }
    >
      <VideoLibraryContent />
    </Suspense>
  );
}
