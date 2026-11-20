"use client";

import React, { useState, useEffect } from "react";
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
import { SubtitlePresetStyle } from "@/lib/video/types";

export default function VideoLibraryPage() {
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
  const [dispatchingRender, setDispatchingRender] = useState(false);
  const [renderNotice, setRenderNotice] = useState<string | null>(null);
  const [selectedSubtitlePreset, setSelectedSubtitlePreset] = useState<SubtitlePresetStyle>("bold_viral");

  // Tab 2: Video Library State
  const [libraryAssets, setLibraryAssets] = useState<any[]>([]);
  const [libraryVideos, setLibraryVideos] = useState<any[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [assetTypeFilter, setAssetTypeFilter] = useState("all");
  const [librarySearch, setLibrarySearch] = useState("");

  // Tab 3: Render Queue State
  const [renderJobs, setRenderJobs] = useState<any[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(false);

  // Video Preview Modal
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewVideo, setPreviewVideo] = useState<{
    url: string;
    title: string;
    duration?: number;
    provider?: string;
  } | null>(null);

  // Initial Fetch
  useEffect(() => {
    fetchPages();
    fetchProviders();
    fetchStoryboards();
    fetchLibrary();
    fetchRenderQueue();
  }, []);

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

  async function fetchStoryboards() {
    try {
      const res = await fetch("/api/content/storyboards");
      const data = await res.json();
      if (res.ok && data.storyboards) {
        setStoryboards(data.storyboards);
        if (data.storyboards.length > 0 && !selectedStoryboardId) {
          loadStoryboardScenes(data.storyboards[0].id);
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

  async function fetchRenderQueue() {
    try {
      setLoadingQueue(true);
      const res = await fetch("/api/video/render");
      const data = await res.json();
      if (res.ok && data.jobs) {
        setRenderJobs(data.jobs);
      }
    } catch {
      // Ignore
    } finally {
      setLoadingQueue(false);
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
        alert(`Video generation job started via ${data.provider}!`);
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

  // Retry Render Job
  async function handleRetryJob(jobId: string) {
    try {
      const res = await fetch(`/api/video/render/${jobId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry" }),
      });
      if (res.ok) {
        fetchRenderQueue();
      }
    } catch {
      // Ignore
    }
  }

  // Delete Render Job
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

  const specBadges = [
    { label: "Aspect Ratio", value: "9:16 Vertical" },
    { label: "Resolution", value: "1080 × 1920 Full HD" },
    { label: "Format", value: "H.264 / AAC MP4" },
    { label: "FPS", value: "30 FPS" },
    {
      label: "Active Provider",
      value: providersStatus?.replicate?.is_configured
        ? "Replicate (Active)"
        : providersStatus?.runway?.is_configured
        ? "Runway (Active)"
        : "Not Configured",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Video Production Studio & Library
            </h2>
            <Badge variant="outline" className="border-indigo-500/40 text-indigo-600 dark:text-indigo-400 text-[10px]">
              Phase 2.3 Active Engine
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Turn approved storyboards into vertical 9:16 Facebook Reels with AI video clips, ElevenLabs voiceovers, subtitles, and watermarks.
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
          <TabsTrigger value="queue" className="text-xs py-1.5">Render Queue</TabsTrigger>
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
              {renderNotice && (
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/10 text-primary text-xs">
                  {renderNotice}
                </div>
              )}

              {!selectedStoryboardId ? (
                <EmptyState
                  icon={Film}
                  title="No Storyboard Selected"
                  description="Choose a storyboard above or approve a script in the AI Content Studio to start producing video scenes."
                  phase="Phase 2.3 Ready"
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
                        {scenes.length} Scenes • Subtitles: <strong>{selectedSubtitlePreset}</strong> • Full HD 1080×1920
                      </span>
                    </div>

                    <Button
                      size="sm"
                      disabled={dispatchingRender}
                      onClick={handleDispatchRender}
                      className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
                    >
                      {dispatchingRender ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Dispatching Render...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5" />
                          Dispatch Full Video Render
                        </>
                      )}
                    </Button>
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
                            <strong className="text-foreground">Visual Cue:</strong> {scene.visual_description}
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
                            className="h-7 text-[11px] gap-1 px-2"
                            disabled={generatingImageId === scene.id}
                            onClick={() => handleGenerateSceneImage(scene)}
                          >
                            {generatingImageId === scene.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Eye className="h-3 w-3" />
                            )}
                            9:16 Keyframe
                          </Button>

                          <Button
                            variant="default"
                            size="sm"
                            className="h-7 text-[11px] gap-1 px-2"
                            disabled={generatingSceneId === scene.id}
                            onClick={() => handleGenerateSceneClip(scene)}
                          >
                            {generatingSceneId === scene.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Video className="h-3 w-3" />
                            )}
                            AI Video Clip
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
                  Central repository of generated 9:16 vertical videos, scene clips, voiceover tracks, and keyframe images.
                </CardDescription>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  value={librarySearch}
                  onChange={(e) => setLibrarySearch(e.target.value)}
                  placeholder="Search assets..."
                  className="h-8 text-xs w-44"
                />

                <select
                  value={assetTypeFilter}
                  onChange={(e) => {
                    setAssetTypeFilter(e.target.value);
                    setTimeout(() => fetchLibrary(), 100);
                  }}
                  className="h-8 text-xs rounded border border-input bg-background px-2"
                >
                  <option value="all">All Asset Types</option>
                  <option value="video">Final Videos</option>
                  <option value="image">Scene Images</option>
                  <option value="voiceover">Voiceovers</option>
                </select>
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
                  description="Rendered 1080x1920 MP4 Reels and generated video clips will appear here automatically for preview and download."
                  phase="Phase 2.3 Ready"
                />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {/* Rendered Videos */}
                  {libraryVideos
                    .filter((v) => !librarySearch || v.title?.toLowerCase().includes(librarySearch.toLowerCase()))
                    .map((vid) => (
                      <div
                        key={vid.id}
                        className="rounded-lg border bg-card overflow-hidden flex flex-col justify-between hover:border-indigo-500/40 transition-colors"
                      >
                        <div className="aspect-[9/16] bg-slate-950 relative flex items-center justify-center">
                          {vid.video_url ? (
                            <video
                              src={vid.video_url}
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
                              <Download className="h-3 w-3" /> Download
                            </Button>
                          </a>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500"
                            onClick={async () => {
                              await fetch(`/api/video/library?id=${vid.id}&is_video=true`, { method: "DELETE" });
                              setLibraryVideos((prev) => prev.filter((v) => v.id !== vid.id));
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}

                  {/* Media Assets (Images / Audio / Scenes) */}
                  {libraryAssets
                    .filter((a) => !librarySearch || a.asset_name?.toLowerCase().includes(librarySearch.toLowerCase()))
                    .map((asset) => (
                      <div
                        key={asset.id}
                        className="rounded-lg border bg-card overflow-hidden flex flex-col justify-between hover:border-primary/40 transition-colors"
                      >
                        <div className="aspect-[9/16] bg-slate-900 relative flex items-center justify-center overflow-hidden">
                          {asset.asset_type === "image" ? (
                            <img src={asset.public_url} alt={asset.asset_name} className="w-full h-full object-cover" />
                          ) : asset.asset_type === "voiceover" ? (
                            <div className="p-4 text-center">
                              <Mic className="h-8 w-8 text-primary mx-auto mb-2" />
                              <audio src={asset.public_url} controls className="w-36 h-6" />
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
                            <span>{asset.provider || "AI"}</span>
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
                            onClick={async () => {
                              await fetch(`/api/video/library?id=${asset.id}`, { method: "DELETE" });
                              setLibraryAssets((prev) => prev.filter((a) => a.id !== asset.id));
                            }}
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
                onClick={fetchRenderQueue}
              >
                <RefreshCw className="h-3 w-3" /> Refresh
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
                        <th className="px-4 py-3">Video Title</th>
                        <th className="px-4 py-3">Page</th>
                        <th className="px-4 py-3">Render State</th>
                        <th className="px-4 py-3">Progress</th>
                        <th className="px-4 py-3">Created</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {renderJobs.map((job) => (
                        <tr key={job.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-medium text-foreground max-w-xs truncate">
                            {job.title}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {job.facebook_pages?.page_name || "General Page"}
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={
                                job.render_status === "completed"
                                  ? "success"
                                  : job.render_status === "failed"
                                  ? "destructive"
                                  : "outline"
                              }
                              className="text-[10px] capitalize"
                            >
                              {job.render_status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 w-36">
                            <div className="flex items-center gap-2">
                              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-1.5 rounded-full ${
                                    job.render_status === "failed"
                                      ? "bg-red-500"
                                      : "bg-indigo-500 transition-all duration-500"
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
                            {job.render_status === "failed" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 text-[10px] gap-1 px-1.5"
                                onClick={() => handleRetryJob(job.id)}
                              >
                                <RotateCcw className="h-2.5 w-2.5" /> Retry
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
                      ))}
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
        </TabsContent>

        {/* ------------------------------------------------------------------ */}
        {/* TAB 5: PAGE BRANDING */}
        {/* ------------------------------------------------------------------ */}
        <TabsContent value="branding" className="space-y-6">
          <BrandingPreview
            pageId={selectedPageId !== "all" ? selectedPageId : pages[0]?.id || ""}
            pageName={
              selectedPageId !== "all"
                ? pages.find((p) => p.id === selectedPageId)?.page_name || "Page"
                : pages[0]?.page_name || "Default Brand"
            }
          />
        </TabsContent>

        {/* ------------------------------------------------------------------ */}
        {/* TAB 6: SETTINGS & ROADMAP */}
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
                  Live connection diagnostics. Status only displays "Connected" when real credentials pass API validation.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {[
                  { name: "Replicate (Video & Image)", status: providersStatus?.replicate?.is_configured },
                  { name: "Runway Gen-3 (Video)", status: providersStatus?.runway?.is_configured },
                  { name: "ElevenLabs (Voiceover)", status: providersStatus?.elevenlabs?.is_configured },
                  { name: "OpenAI DALL-E 3 (Image)", status: providersStatus?.openai_image?.is_configured },
                ].map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between p-2.5 rounded-lg border bg-card text-xs"
                  >
                    <span className="font-medium text-foreground">{item.name}</span>
                    <Badge variant={item.status ? "success" : "outline"} className="text-[10px]">
                      {item.status ? "Connected" : "Not Configured (.env.local)"}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

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
