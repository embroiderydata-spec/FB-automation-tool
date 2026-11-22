"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Scissors,
  Film,
  Upload,
  Play,
  Pause,
  RotateCcw,
  Clock,
  CheckCircle2,
  Download,
  Send,
  Maximize2,
  Trash2,
  Plus,
  Eye,
  AlertCircle,
  Loader2,
  Share2,
  Youtube,
  Layers,
  ChevronRight,
  ChevronDown,
  Bookmark,
  Volume2,
  VolumeX,
  FileVideo,
  Check,
  X,
  Sliders,
  FolderOpen,
  ArrowUpDown,
  Zap,
  Flame,
  Laugh,
  Heart,
  BookOpen,
  HelpCircle,
  ExternalLink,
  RefreshCw,
  Copy,
  SlidersHorizontal,
  Search,
  MessageSquareQuote,
  Layout,
  Type,
  ShieldAlert,
  Sparkle,
  Tv,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SendToQueueModal } from "@/components/clipper/send-to-queue-modal";
import {
  AspectRatio,
  CropPosition,
  ReframingMode,
  Resolution,
  SubtitleStyle,
  ViralCategory,
  ViralCandidateClip,
  VideoAnalysisResult,
  VideoClipRecord,
  TargetPlatform,
  ClipDurationPreset,
  ViralityBreakdown,
  TranscriptCue,
} from "@/lib/clipper/types";

type SortOption =
  | "viral_score"
  | "hook"
  | "funny"
  | "emotional"
  | "educational"
  | "surprising"
  | "chronological";

export default function VideoClipperPage() {
  const [activeTab, setActiveTab] = useState<"create" | "moments" | "editor" | "library">("create");

  // Input Wizard State
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [clipCount, setClipCount] = useState<number>(5);
  const [customClipCount, setCustomClipCount] = useState<string>("");
  const [durationPreset, setDurationPreset] = useState<ClipDurationPreset>("30-60");
  const [targetPlatform, setTargetPlatform] = useState<TargetPlatform>("both");
  const [language, setLanguage] = useState<string>("auto");
  const [aiInstructions, setAiInstructions] = useState<string>(
    "Find the most interesting, funny, emotional, educational, controversial, or surprising moments."
  );

  // Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisStep, setAnalysisStep] = useState<string>("");
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Analysis Result
  const [analysis, setAnalysis] = useState<VideoAnalysisResult | null>(null);
  const [candidateClips, setCandidateClips] = useState<ViralCandidateClip[]>([]);

  // Sorting & Filtering in Moments
  const [sortBy, setSortBy] = useState<SortOption>("viral_score");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Topic Search State
  const [topicQuery, setTopicQuery] = useState<string>("");
  const [isSearchingTopic, setIsSearchingTopic] = useState<boolean>(false);
  const [topicSearchError, setTopicSearchError] = useState<string | null>(null);

  // Local File Upload / Fallback
  const [showUploadFallback, setShowUploadFallback] = useState<boolean>(false);
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    path: string;
    url: string;
    duration: number;
    sizeFormatted: string;
  } | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Video Library Selector Modal
  const [libraryModalOpen, setLibraryModalOpen] = useState<boolean>(false);
  const [libraryVideos, setLibraryVideos] = useState<any[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState<boolean>(false);

  // Batch Generation State
  const [isGeneratingBatch, setIsGeneratingBatch] = useState<boolean>(false);
  const [generationProgress, setGenerationProgress] = useState<{
    current: number;
    total: number;
    statusText: string;
  } | null>(null);
  const [batchNotice, setBatchNotice] = useState<string | null>(null);

  // Active Clip in Editor
  const [activeEditorClip, setActiveEditorClip] = useState<ViralCandidateClip | null>(null);
  const [editorPlaying, setEditorPlaying] = useState<boolean>(false);
  const [editorCurrentTime, setEditorCurrentTime] = useState<number>(0);
  const editorVideoRef = useRef<HTMLVideoElement | null>(null);
  const [isRenderingEditorClip, setIsRenderingEditorClip] = useState<boolean>(false);
  const [editorRenderSuccess, setEditorRenderSuccess] = useState<string | null>(null);
  const [editorRenderError, setEditorRenderError] = useState<string | null>(null);

  // Previewing a specific candidate in moments tab
  const [previewingClip, setPreviewingClip] = useState<ViralCandidateClip | null>(null);
  const [expandedClipOptions, setExpandedClipOptions] = useState<number | null>(null);

  // My Clips Library State
  const [myClips, setMyClips] = useState<VideoClipRecord[]>([]);
  const [loadingMyClips, setLoadingMyClips] = useState<boolean>(false);
  const [clipFilter, setClipFilter] = useState<"all" | "ready" | "processing" | "failed">("all");

  // Publishing Modal
  const [queueModalOpen, setQueueModalOpen] = useState<boolean>(false);
  const [selectedClipForQueue, setSelectedClipForQueue] = useState<VideoClipRecord | null>(null);

  // Load clips on initial mount
  useEffect(() => {
    loadUserClips();
  }, []);

  async function loadUserClips() {
    setLoadingMyClips(true);
    try {
      const res = await fetch("/api/clipper");
      if (res.ok) {
        const data = await res.json();
        setMyClips(data.clips || []);
      }
    } catch {}
    finally {
      setLoadingMyClips(false);
    }
  }

  // 1. Ingest Video & Trigger AI Analysis
  async function handleAnalyzeVideo(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setAnalysisError(null);
    setTopicSearchError(null);

    const targetUrl = uploadedFile?.url || videoUrl.trim();
    if (!targetUrl) {
      setAnalysisError("Please paste a video URL or upload a video file.");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisStep("1/5: Ingesting video telemetry & duration...");

    const effectiveClipCount =
      customClipCount && Number(customClipCount) > 0 ? Number(customClipCount) : clipCount;

    try {
      setTimeout(() => {
        setAnalysisStep("2/5: Extracting audio track & speech transcription...");
      }, 1500);

      setTimeout(() => {
        setAnalysisStep("3/5: Detecting sentence boundaries & visual scene peaks...");
      }, 3500);

      setTimeout(() => {
        setAnalysisStep("4/5: Computing virality scores (Hook, Emotional, Value)...");
      }, 5500);

      const res = await fetch("/api/clipper/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: targetUrl,
          clip_count: effectiveClipCount,
          duration_range: durationPreset,
          target_platform: targetPlatform,
          language,
          ai_instructions: aiInstructions,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to analyze video.");
      }

      setAnalysisStep("5/5: Finalizing candidate moments ranking...");
      setAnalysis(data.analysis);
      const clips: ViralCandidateClip[] = data.analysis.candidate_clips || [];
      setCandidateClips(clips);

      if (clips.length > 0) {
        setActiveEditorClip(clips[0]);
      }

      // Switch to Moments tab automatically
      setActiveTab("moments");
    } catch (err: any) {
      console.error("Analysis error:", err);
      setAnalysisError(
        err.message ||
          "Analysis failed. If this is a restricted URL, try uploading the MP4/MOV file directly."
      );
    } finally {
      setIsAnalyzing(false);
      setAnalysisStep("");
    }
  }

  // 2. Direct Video File Upload
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/clipper/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Video upload failed.");
      }

      const info = data.video;
      setUploadedFile({
        name: info.filename,
        path: info.local_path || "",
        url: info.url,
        duration: info.duration,
        sizeFormatted: info.size_formatted,
      });
      setVideoUrl(info.url);
    } catch (err: any) {
      console.error("File upload error:", err);
      setUploadError(err.message || "Failed to upload video file.");
    } finally {
      setIsUploading(false);
    }
  }

  // 3. Select From Video Library
  async function openVideoLibrary() {
    setLibraryModalOpen(true);
    setLoadingLibrary(true);
    try {
      const res = await fetch("/api/video/library");
      if (res.ok) {
        const data = await res.json();
        setLibraryVideos(data.videos || []);
      }
    } catch {}
    finally {
      setLoadingLibrary(false);
    }
  }

  function handleSelectLibraryVideo(v: any) {
    setVideoUrl(v.video_url);
    setUploadedFile({
      name: v.title || "Library Video",
      path: "",
      url: v.video_url,
      duration: v.duration_seconds || 60,
      sizeFormatted: v.file_size_bytes ? `${(v.file_size_bytes / (1024 * 1024)).toFixed(1)} MB` : "N/A",
    });
    setLibraryModalOpen(false);
  }

  // 4. Topic Search (Find specific moment)
  async function handleSearchTopic(e: React.FormEvent) {
    e.preventDefault();
    if (!topicQuery.trim() || !analysis) return;

    setIsSearchingTopic(true);
    setTopicSearchError(null);

    try {
      const res = await fetch("/api/clipper/topic-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic_query: topicQuery.trim(),
          transcript: analysis.transcript_cues || [],
          video_duration: analysis.duration,
          video_title: analysis.title,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Topic search failed.");
      }

      if (data.clip) {
        const newClip: ViralCandidateClip = {
          ...data.clip,
          clip_number: candidateClips.length + 1,
          selected: true,
        };
        setCandidateClips([newClip, ...candidateClips]);
        setPreviewingClip(newClip);
        setActiveEditorClip(newClip);
        setTopicQuery("");
      }
    } catch (err: any) {
      setTopicSearchError(err.message || "Failed to find moment matching topic.");
    } finally {
      setIsSearchingTopic(false);
    }
  }

  // 5. Candidate Clips Selection & Nudges
  function toggleClipSelection(clipNum: number) {
    setCandidateClips((prev) =>
      prev.map((c) => (c.clip_number === clipNum ? { ...c, selected: !c.selected } : c))
    );
  }

  function selectAllClips(val: boolean) {
    setCandidateClips((prev) => prev.map((c) => ({ ...c, selected: val })));
  }

  function adjustClipTime(clipNum: number, startDelta: number, endDelta: number) {
    setCandidateClips((prev) =>
      prev.map((c) => {
        if (c.clip_number !== clipNum) return c;
        const totalMax = analysis?.duration || 300;
        const newStart = Math.max(0, Math.min(totalMax - 10, c.start_time + startDelta));
        const newEnd = Math.min(totalMax, Math.max(newStart + 10, c.end_time + endDelta));
        return {
          ...c,
          start_time: newStart,
          end_time: newEnd,
          start_formatted: `${Math.floor(newStart / 60)}:${Math.floor(newStart % 60)
            .toString()
            .padStart(2, "0")}`,
          end_formatted: `${Math.floor(newEnd / 60)}:${Math.floor(newEnd % 60)
            .toString()
            .padStart(2, "0")}`,
          duration: Math.round(newEnd - newStart),
        };
      })
    );
  }

  function updateClipSettings(
    clipNum: number,
    aspectRatio?: AspectRatio,
    subtitleStyle?: SubtitleStyle,
    reframingMode?: ReframingMode
  ) {
    setCandidateClips((prev) =>
      prev.map((c) => {
        if (c.clip_number !== clipNum) return c;
        return {
          ...c,
          aspect_ratio: aspectRatio ?? c.aspect_ratio,
          subtitle_style: subtitleStyle ?? c.subtitle_style,
          reframing_mode: reframingMode ?? c.reframing_mode,
        };
      })
    );
  }

  function updateClipTitle(clipNum: number, newTitle: string) {
    setCandidateClips((prev) =>
      prev.map((c) => (c.clip_number === clipNum ? { ...c, title: newTitle } : c))
    );
  }

  // 6. Open Clip in Dedicated Editor
  function openInEditor(clip: ViralCandidateClip) {
    setActiveEditorClip(clip);
    setActiveTab("editor");
  }

  // 7. Render Individual Clip from Editor
  async function handleRenderEditorClip() {
    if (!activeEditorClip) return;

    setIsRenderingEditorClip(true);
    setEditorRenderSuccess(null);
    setEditorRenderError(null);

    const targetUrl = uploadedFile?.url || analysis?.video_url || videoUrl;
    const localPath = uploadedFile?.path;

    try {
      const res = await fetch("/api/clipper/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_video_url: targetUrl,
          source_local_path: localPath,
          source_video_name: analysis?.title || "Source Video",
          clip_title: activeEditorClip.title,
          start_time: activeEditorClip.start_time,
          end_time: activeEditorClip.end_time,
          aspect_ratio: activeEditorClip.aspect_ratio || "9:16",
          reframing_mode: activeEditorClip.reframing_mode || "blurred_backdrop",
          subtitle_style: activeEditorClip.subtitle_style || "hormozi",
          subtitle_text: activeEditorClip.title,
          hook_text: activeEditorClip.hook,
          viral_score: activeEditorClip.viral_score,
          virality_breakdown: activeEditorClip.virality_breakdown,
          category: activeEditorClip.category,
          caption: activeEditorClip.caption,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Rendering failed.");
      }

      setEditorRenderSuccess("Clip rendered successfully and saved to your library!");
      loadUserClips();
    } catch (err: any) {
      setEditorRenderError(err.message || "Failed to render clip.");
    } finally {
      setIsRenderingEditorClip(false);
    }
  }

  // 8. Batch Render Selected Clips
  async function handleGenerateBatch() {
    const selected = candidateClips.filter((c) => c.selected);
    if (selected.length === 0) return;

    setIsGeneratingBatch(true);
    setGenerationProgress({
      current: 0,
      total: selected.length,
      statusText: `Initializing FFmpeg batch rendering for ${selected.length} clips...`,
    });
    setBatchNotice(null);

    const targetUrl = uploadedFile?.url || analysis?.video_url || videoUrl;
    const localPath = uploadedFile?.path;

    try {
      const batchItems = selected.map((c) => ({
        clip_number: c.clip_number,
        title: c.title,
        start_time: c.start_time,
        end_time: c.end_time,
        duration: c.duration,
        aspect_ratio: c.aspect_ratio || "9:16",
        reframing_mode: c.reframing_mode || "blurred_backdrop",
        subtitle_style: c.subtitle_style || "hormozi",
        subtitle_text: c.title,
        hook_text: c.hook,
        hook: c.hook,
        caption: c.caption,
        viral_score: c.viral_score,
        virality_breakdown: c.virality_breakdown,
        category: c.category,
      }));

      const res = await fetch("/api/clipper/generate-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_video_url: targetUrl,
          source_local_path: localPath,
          source_video_name: analysis?.title || "Source Video",
          clips: batchItems,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Batch generation failed.");
      }

      setBatchNotice(
        `Batch complete! Successfully rendered and saved ${data.success_count} clips into your Video Library.`
      );
      loadUserClips();
      setActiveTab("library");
    } catch (err: any) {
      console.error("Batch error:", err);
      setBatchNotice(`Batch error: ${err.message}`);
    } finally {
      setIsGeneratingBatch(false);
      setGenerationProgress(null);
    }
  }

  // 9. Delete Clip from Library
  async function handleDeleteClip(clipId: string) {
    if (!confirm("Are you sure you want to delete this clip?")) return;
    try {
      const res = await fetch(`/api/clipper?id=${clipId}`, { method: "DELETE" });
      if (res.ok) {
        setMyClips((prev) => prev.filter((c) => c.id !== clipId));
      }
    } catch {}
  }

  // Filter & Sort Clips in Moments Tab
  const filteredClips = [...candidateClips]
    .filter((clip) => {
      if (categoryFilter === "all") return true;
      return clip.category === categoryFilter;
    })
    .sort((a, b) => {
      if (sortBy === "viral_score") return b.viral_score - a.viral_score;
      if (sortBy === "hook") return (b.virality_breakdown?.hook || 0) - (a.virality_breakdown?.hook || 0);
      if (sortBy === "surprising") return (b.category === "surprising" ? 1 : 0) - (a.category === "surprising" ? 1 : 0);
      if (sortBy === "funny") return (b.category === "funny" ? 1 : 0) - (a.category === "funny" ? 1 : 0);
      if (sortBy === "emotional") return (b.category === "emotional" ? 1 : 0) - (a.category === "emotional" ? 1 : 0);
      if (sortBy === "educational") return (b.category === "educational" ? 1 : 0) - (a.category === "educational" ? 1 : 0);
      return a.start_time - b.start_time;
    });

  const selectedCount = candidateClips.filter((c) => c.selected).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Studio Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Scissors className="h-6 w-6 text-primary" />
              OpusClip AI Video Studio
            </h1>
            <Badge className="bg-primary text-primary-foreground font-semibold text-xs">
              AI VIRAL CLIPS
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Turn long video URLs or uploads into high-retention Facebook Reels & YouTube Shorts with AI captions and smart reframing.
          </p>
        </div>

        {/* Global Tab Navigation */}
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border">
          <Button
            size="sm"
            variant={activeTab === "create" ? "default" : "ghost"}
            onClick={() => setActiveTab("create")}
            className="text-xs font-semibold gap-1.5 h-8"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Create Clips
          </Button>

          <Button
            size="sm"
            variant={activeTab === "moments" ? "default" : "ghost"}
            onClick={() => setActiveTab("moments")}
            className="text-xs font-semibold gap-1.5 h-8 relative"
          >
            <Layers className="h-3.5 w-3.5" />
            AI Moments
            {candidateClips.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-primary-foreground text-primary font-bold">
                {candidateClips.length}
              </span>
            )}
          </Button>

          <Button
            size="sm"
            variant={activeTab === "editor" ? "default" : "ghost"}
            onClick={() => setActiveTab("editor")}
            className="text-xs font-semibold gap-1.5 h-8"
            disabled={!activeEditorClip}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Clip Editor
          </Button>

          <Button
            size="sm"
            variant={activeTab === "library" ? "default" : "ghost"}
            onClick={() => {
              setActiveTab("library");
              loadUserClips();
            }}
            className="text-xs font-semibold gap-1.5 h-8"
          >
            <Film className="h-3.5 w-3.5" />
            My Clips
            {myClips.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-muted-foreground/20 font-bold">
                {myClips.length}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* =========================================================================
          TAB 1: CREATE CLIPS (OPUSCLIP INPUT WIZARD)
         ========================================================================= */}
      {activeTab === "create" && (
        <div className="space-y-6">
          <Card className="shadow-md border-primary/20">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  1. Video Ingestion & Input
                </span>
                <span className="text-xs font-normal text-muted-foreground">
                  YouTube links, Direct MP4/MOV, or Local Video Upload
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* URL Input Bar */}
              <form onSubmit={handleAnalyzeVideo} className="space-y-3">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Video URL or YouTube Link
                </Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Input
                      type="text"
                      placeholder="Paste your video link here (e.g. https://www.youtube.com/watch?v=... or direct MP4)..."
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      className="h-12 pl-4 pr-10 text-sm shadow-inner rounded-xl"
                      disabled={isAnalyzing}
                    />
                    {videoUrl && (
                      <button
                        type="button"
                        onClick={() => setVideoUrl("")}
                        className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={isAnalyzing || (!videoUrl.trim() && !uploadedFile)}
                    className="h-12 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold flex items-center gap-2 shadow-md rounded-xl"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Analyzing Video...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5" />
                        Analyze Video & Find Viral Clips
                      </>
                    )}
                  </Button>
                </div>
              </form>

              {/* Upload Dropzone & Quick Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-foreground">Or Import From:</span>
                  <button
                    type="button"
                    onClick={openVideoLibrary}
                    className="text-primary hover:underline flex items-center gap-1 font-semibold"
                  >
                    <FolderOpen className="h-3.5 w-3.5" />
                    Select from Video Library
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => setShowUploadFallback(!showUploadFallback)}
                    className="text-primary hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {showUploadFallback ? "Hide Local Upload" : "Upload Local Video (MP4 / MOV)"}
                  </button>
                </div>

                {uploadedFile && (
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    Loaded: {uploadedFile.name} ({uploadedFile.sizeFormatted})
                  </Badge>
                )}
              </div>

              {/* Upload Dropzone */}
              {showUploadFallback && (
                <div className="p-6 border-2 border-dashed rounded-xl bg-muted/30 text-center space-y-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/mp4,video/quicktime,video/webm"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Upload className="h-8 w-8 text-primary animate-bounce" />
                    <p className="text-sm font-semibold">
                      Drag and drop your video file here, or{" "}
                      <span
                        onClick={() => fileInputRef.current?.click()}
                        className="text-primary underline cursor-pointer hover:text-primary/80"
                      >
                        browse files
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      MP4, MOV, or WebM up to 500MB
                    </p>
                  </div>
                  {isUploading && (
                    <div className="flex items-center justify-center gap-2 text-xs text-primary font-medium">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading and probing video telemetry...
                    </div>
                  )}
                  {uploadError && (
                    <p className="text-xs text-rose-500 font-semibold">{uploadError}</p>
                  )}
                </div>
              )}

              {/* OPUSCLIP INTELLIGENT CLIP PREFERENCES */}
              <div className="border-t pt-5 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-primary" />
                  2. AI Clipping Preferences
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Number of Clips */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Number of Clips</Label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[5, 10, 15].map((count) => (
                        <button
                          key={count}
                          type="button"
                          onClick={() => {
                            setClipCount(count);
                            setCustomClipCount("");
                          }}
                          className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                            clipCount === count && !customClipCount
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "bg-background hover:bg-muted text-muted-foreground"
                          }`}
                        >
                          {count} Clips
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setCustomClipCount(customClipCount || "8");
                        }}
                        className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                          customClipCount
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-background hover:bg-muted text-muted-foreground"
                        }`}
                      >
                        Custom
                      </button>
                    </div>
                    {customClipCount && (
                      <Input
                        type="number"
                        min="1"
                        max="20"
                        placeholder="Enter clip count (1-20)"
                        value={customClipCount}
                        onChange={(e) => setCustomClipCount(e.target.value)}
                        className="h-8 text-xs mt-1"
                      />
                    )}
                  </div>

                  {/* Preferred Clip Duration */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Clip Duration</Label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: "30-60", label: "30–60s" },
                        { id: "60-90", label: "60–90s" },
                        { id: "90-180", label: "90–180s" },
                      ].map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setDurationPreset(preset.id as ClipDurationPreset)}
                          className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                            durationPreset === preset.id
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "bg-background hover:bg-muted text-muted-foreground"
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Target Platform */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Target Platform</Label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: "facebook_reels", label: "FB Reels" },
                        { id: "youtube_shorts", label: "YT Shorts" },
                        { id: "both", label: "Both" },
                      ].map((plat) => (
                        <button
                          key={plat.id}
                          type="button"
                          onClick={() => setTargetPlatform(plat.id as TargetPlatform)}
                          className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                            targetPlatform === plat.id
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "bg-background hover:bg-muted text-muted-foreground"
                          }`}
                        >
                          {plat.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* AI Instructions Prompt */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">AI Instructions / Focus</Label>
                    <div className="flex items-center gap-1.5">
                      {[
                        { label: "🔥 Hooks", text: "Focus heavily on explosive opening hooks and curiosity gaps." },
                        { label: "😂 Funny", text: "Find the funniest, most comedic and entertaining highlights." },
                        { label: "💡 Educational", text: "Find clear, actionable advice and educational insights." },
                        { label: "😲 Surprising", text: "Find shocking plot twists, debates, and surprising revelations." },
                      ].map((pill, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setAiInstructions(pill.text)}
                          className="text-[10px] px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-muted-foreground font-medium"
                        >
                          {pill.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Input
                    type="text"
                    value={aiInstructions}
                    onChange={(e) => setAiInstructions(e.target.value)}
                    className="h-10 text-xs shadow-inner"
                    placeholder="e.g. Find the moment where the speaker explains the biggest mistake beginners make."
                  />
                </div>
              </div>

              {/* Analysis Stepper Card */}
              {isAnalyzing && (
                <Card className="border border-amber-300 bg-amber-50/70 dark:bg-amber-950/20 shadow-sm animate-pulse">
                  <CardContent className="py-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-6 w-6 text-amber-600 animate-spin" />
                      <div>
                        <h3 className="text-sm font-bold text-foreground">
                          AI Video Analysis in Progress...
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {analysisStep || "Scanning video for viral moments..."}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="border-amber-400 text-amber-700 dark:text-amber-300 font-bold text-xs">
                      OpusClip AI Engine
                    </Badge>
                  </CardContent>
                </Card>
              )}

              {/* Error Notice */}
              {analysisError && (
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300 rounded-xl text-xs flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
                  <div>
                    <span className="font-bold">Analysis Notice: </span>
                    {analysisError}
                    <button
                      type="button"
                      onClick={() => setShowUploadFallback(true)}
                      className="ml-2 underline font-semibold hover:text-rose-900"
                    >
                      Upload the video file directly.
                    </button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* =========================================================================
          TAB 2: AI MOMENTS & RANKING
         ========================================================================= */}
      {activeTab === "moments" && (
        <div className="space-y-6">
          {/* Video Overview Header */}
          {analysis ? (
            <Card className="shadow-sm border">
              <CardContent className="p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    {analysis.thumbnail_url ? (
                      <img
                        src={analysis.thumbnail_url}
                        alt={analysis.title}
                        className="w-28 h-20 object-cover rounded-lg shadow-sm border shrink-0"
                      />
                    ) : (
                      <div className="w-28 h-20 bg-muted rounded-lg flex items-center justify-center shrink-0">
                        <Film className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-lg font-bold line-clamp-1">{analysis.title}</h2>
                        <Badge variant="secondary" className="text-xs">
                          {analysis.source_type === "youtube" ? "YouTube" : "Direct Video"}
                        </Badge>
                        {analysis.transcript_available && (
                          <Badge variant="outline" className="text-[11px] bg-emerald-50 text-emerald-700 border-emerald-300">
                            Transcript Analyzed
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Creator: <span className="font-semibold text-foreground">{analysis.author || "Unknown"}</span> • Total Length: <span className="font-semibold text-foreground">{analysis.duration_formatted}</span>
                      </p>
                      <p className="text-xs text-emerald-600 font-semibold mt-1">
                        ✨ OpusClip AI generated {candidateClips.length} ranked moments with virality scores.
                      </p>
                    </div>
                  </div>

                  {/* Batch Action Buttons */}
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handleGenerateBatch}
                      disabled={isGeneratingBatch || selectedCount === 0}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 px-5 shadow-sm rounded-xl"
                    >
                      {isGeneratingBatch ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Rendering Selected...
                        </>
                      ) : (
                        <>
                          <Zap className="h-4 w-4 fill-white mr-1.5" />
                          Generate Selected ({selectedCount})
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="p-8 text-center text-muted-foreground">
              <Sparkles className="h-8 w-8 mx-auto text-primary mb-2 opacity-50" />
              <p className="text-sm">No video analyzed yet. Start by pasting a link in the Create Clips tab.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab("create")}
                className="mt-3"
              >
                Go to Create Clips
              </Button>
            </Card>
          )}

          {/* TOPIC SEARCH BAR (OPUSCLIP MOMENT FINDER) */}
          {analysis && (
            <Card className="border border-primary/20 bg-primary/[0.02]">
              <CardContent className="p-4">
                <form onSubmit={handleSearchTopic} className="flex flex-col sm:flex-row gap-2 items-center">
                  <div className="relative flex-1 w-full">
                    <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Find a specific moment or topic (e.g. 'biggest mistake beginners make', 'explain pricing')..."
                      value={topicQuery}
                      onChange={(e) => setTopicQuery(e.target.value)}
                      className="h-10 pl-9 text-xs rounded-lg"
                      disabled={isSearchingTopic}
                    />
                  </div>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSearchingTopic || !topicQuery.trim()}
                    className="h-10 px-4 text-xs font-semibold gap-1.5 shrink-0"
                  >
                    {isSearchingTopic ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Searching Transcript...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5" />
                        Find Specific Moment
                      </>
                    )}
                  </Button>
                </form>

                {topicSearchError && (
                  <p className="text-xs text-rose-500 font-medium mt-2">{topicSearchError}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* SORT & FILTER TOOLBAR */}
          {analysis && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/40 p-3 rounded-xl border">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <ArrowUpDown className="h-3.5 w-3.5" /> Sort:
                </span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="text-xs bg-background border rounded px-2.5 py-1.5 font-medium cursor-pointer"
                >
                  <option value="viral_score">Highest Viral Score (Default)</option>
                  <option value="hook">Best Hook Impact</option>
                  <option value="surprising">Most Surprising</option>
                  <option value="funny">Funny Highlights</option>
                  <option value="emotional">Emotional Resonance</option>
                  <option value="educational">Educational Value</option>
                  <option value="chronological">Chronological (Video Order)</option>
                </select>

                <div className="h-4 w-px bg-border mx-1" />

                {/* Category Filter Chips */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                  {[
                    { id: "all", label: "All Clips" },
                    { id: "hook", label: "⚡ Hooks" },
                    { id: "surprising", label: "😲 Surprising" },
                    { id: "funny", label: "😂 Funny" },
                    { id: "emotional", label: "❤️ Emotional" },
                    { id: "educational", label: "💡 Educational" },
                    { id: "storytelling", label: "📖 Story" },
                  ].map((chip) => (
                    <button
                      key={chip.id}
                      onClick={() => setCategoryFilter(chip.id)}
                      className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-all ${
                        categoryFilter === chip.id
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "bg-background hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={() => selectAllClips(true)}
                  className="text-primary hover:underline font-semibold"
                >
                  Select All
                </button>
                <span>•</span>
                <button
                  onClick={() => selectAllClips(false)}
                  className="text-muted-foreground hover:underline"
                >
                  Deselect All
                </button>
              </div>
            </div>
          )}

          {/* CANDIDATE MOMENTS RANKED GRID */}
          {analysis && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredClips.map((clip) => {
                const isSelected = !!clip.selected;
                const isPreviewing = previewingClip?.clip_number === clip.clip_number;
                const isOptionsExpanded = expandedClipOptions === clip.clip_number;
                const breakdown = clip.virality_breakdown;

                return (
                  <Card
                    key={clip.clip_number}
                    className={`transition-all shadow-sm flex flex-col justify-between border-2 rounded-2xl ${
                      isSelected
                        ? "border-primary bg-primary/[0.015]"
                        : "border-border hover:border-muted-foreground/30"
                    }`}
                  >
                    <CardHeader className="p-4 pb-2">
                      {/* Top Header Bar */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleClipSelection(clip.clip_number)}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                          />
                          <Badge variant="outline" className="font-bold text-xs bg-background">
                            Moment #{clip.clip_number}
                          </Badge>
                        </div>

                        {/* Viral Score Gauge */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold">
                            Virality
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-black tracking-wide ${
                              clip.viral_score >= 90
                                ? "bg-emerald-500 text-white"
                                : clip.viral_score >= 80
                                ? "bg-blue-600 text-white"
                                : "bg-amber-500 text-white"
                            }`}
                          >
                            🔥 {clip.viral_score}/100
                          </span>
                        </div>
                      </div>

                      {/* Diagnostic Virality Sub-Score Breakdown */}
                      {breakdown && (
                        <div className="grid grid-cols-5 gap-1 py-1.5 px-2 bg-muted/40 rounded-lg text-[9px] text-center font-medium">
                          <div>
                            <span className="text-muted-foreground block">Hook</span>
                            <span className="font-bold text-foreground">{breakdown.hook}%</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Emotion</span>
                            <span className="font-bold text-foreground">{breakdown.emotional}%</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Value</span>
                            <span className="font-bold text-foreground">{breakdown.value}%</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Retention</span>
                            <span className="font-bold text-foreground">{breakdown.retention}%</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Quality</span>
                            <span className="font-bold text-foreground">{breakdown.quality}%</span>
                          </div>
                        </div>
                      )}

                      {/* Title & Category */}
                      <div className="mt-2">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Badge variant="secondary" className="text-[10px] uppercase font-bold">
                            {clip.category}
                          </Badge>
                          <span className="text-xs text-muted-foreground font-medium">
                            {clip.duration}s ({clip.start_formatted} – {clip.end_formatted})
                          </span>
                        </div>
                        <h3 className="font-bold text-sm text-foreground line-clamp-2">
                          {clip.title}
                        </h3>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 pt-1 space-y-3 flex-1 flex flex-col justify-between">
                      <div className="space-y-2">
                        {/* AI Hook Highlight Card */}
                        <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs space-y-1">
                          <span className="font-bold text-amber-800 dark:text-amber-300 text-[10px] uppercase flex items-center gap-1">
                            <Zap className="h-3 w-3 fill-amber-500 text-amber-500" />
                            Opening Hook:
                          </span>
                          <p className="font-medium text-foreground italic">
                            "{clip.hook}"
                          </p>
                        </div>

                        {/* AI Reason for selection */}
                        <p className="text-[11px] text-muted-foreground line-clamp-2 bg-muted/30 p-2 rounded">
                          💡 <span className="font-semibold text-foreground">Why it works:</span> {clip.reason}
                        </p>

                        {/* Video Player Preview for this candidate */}
                        {isPreviewing ? (
                          <div className="relative aspect-[9/16] max-h-56 w-full bg-black rounded-lg overflow-hidden border">
                            <video
                              src={`${analysis.video_url}#t=${clip.start_time},${clip.end_time}`}
                              controls
                              autoPlay
                              loop
                              playsInline
                              className="w-full h-full object-contain"
                            />
                            <button
                              onClick={() => setPreviewingClip(null)}
                              className="absolute top-2 right-2 bg-black/70 text-white rounded-full p-1"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setPreviewingClip(clip)}
                            className="w-full py-2 bg-muted/60 hover:bg-muted text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors border"
                          >
                            <Play className="h-3.5 w-3.5 fill-current" />
                            Preview Moment Interval
                          </button>
                        )}

                        {/* Timestamp Nudge Controls */}
                        <div className="p-2 bg-muted/20 rounded-lg border text-xs space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold uppercase">
                            <span>Adjust Start ({clip.start_formatted})</span>
                            <span>Adjust End ({clip.end_formatted})</span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => adjustClipTime(clip.clip_number, -2, 0)}
                                className="px-2 py-1 text-[11px] bg-background border rounded font-semibold hover:bg-muted"
                                title="Start 2s earlier"
                              >
                                -2s
                              </button>
                              <button
                                onClick={() => adjustClipTime(clip.clip_number, 2, 0)}
                                className="px-2 py-1 text-[11px] bg-background border rounded font-semibold hover:bg-muted"
                                title="Start 2s later"
                              >
                                +2s
                              </button>
                            </div>
                            <span className="text-[11px] font-bold text-foreground">
                              {clip.duration}s
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => adjustClipTime(clip.clip_number, 0, -2)}
                                className="px-2 py-1 text-[11px] bg-background border rounded font-semibold hover:bg-muted"
                                title="End 2s earlier"
                              >
                                -2s
                              </button>
                              <button
                                onClick={() => adjustClipTime(clip.clip_number, 0, 2)}
                                className="px-2 py-1 text-[11px] bg-background border rounded font-semibold hover:bg-muted"
                                title="End 2s later"
                              >
                                +2s
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Alternative AI Titles Accordion */}
                        <div className="border rounded-lg overflow-hidden text-xs">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedClipOptions(isOptionsExpanded ? null : clip.clip_number)
                            }
                            className="w-full flex items-center justify-between p-2 bg-muted/40 hover:bg-muted font-medium text-muted-foreground hover:text-foreground"
                          >
                            <span className="flex items-center gap-1.5">
                              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                              View 5 Viral Titles & Hooks
                            </span>
                            {isOptionsExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>

                          {isOptionsExpanded && (
                            <div className="p-3 space-y-2.5 bg-background border-t">
                              <div>
                                <span className="font-semibold text-foreground text-[11px] block mb-1">
                                  Alternative Viral Titles (Click to Apply):
                                </span>
                                <div className="space-y-1">
                                  {clip.title_options.map((t, idx) => (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={() => updateClipTitle(clip.clip_number, t)}
                                      className={`w-full text-left text-xs p-1.5 rounded transition-all flex items-center justify-between ${
                                        clip.title === t
                                          ? "bg-primary/10 text-primary font-semibold border border-primary/30"
                                          : "hover:bg-muted"
                                      }`}
                                    >
                                      <span className="line-clamp-1">{t}</span>
                                      {clip.title === t && <Check className="h-3.5 w-3.5 shrink-0" />}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Primary Actions on Card */}
                      <div className="pt-3 border-t grid grid-cols-2 gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openInEditor(clip)}
                          className="w-full text-xs font-semibold gap-1"
                        >
                          <SlidersHorizontal className="h-3.5 w-3.5" />
                          Open Editor
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => {
                            openInEditor(clip);
                            handleRenderEditorClip();
                          }}
                          className="w-full text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1"
                        >
                          <Zap className="h-3.5 w-3.5 fill-current" />
                          Render Clip
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 3: OPUSCLIP DEDICATED CLIP EDITOR & CAPTION STUDIO
         ========================================================================= */}
      {activeTab === "editor" && activeEditorClip && (
        <div className="space-y-6">
          <Card className="shadow-md border-primary/20">
            <CardHeader className="p-4 border-b bg-muted/20 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <SlidersHorizontal className="h-5 w-5 text-primary" />
                  Editing Clip: {activeEditorClip.title}
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Interval: {activeEditorClip.start_formatted} – {activeEditorClip.end_formatted} ({activeEditorClip.duration}s) • Virality: {activeEditorClip.viral_score}/100
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleRenderEditorClip}
                  disabled={isRenderingEditorClip}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 px-4 gap-1.5 rounded-lg shadow-sm"
                >
                  {isRenderingEditorClip ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Rendering...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 fill-white" />
                      Render Final MP4
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left 5 Cols: Video Player Preview */}
                <div className="lg:col-span-5 flex flex-col items-center">
                  <div className="relative w-full aspect-[9/16] max-h-[520px] bg-black rounded-2xl overflow-hidden shadow-xl border flex items-center justify-center">
                    <video
                      ref={editorVideoRef}
                      src={`${analysis?.video_url || uploadedFile?.url || videoUrl}#t=${activeEditorClip.start_time},${activeEditorClip.end_time}`}
                      controls
                      playsInline
                      className="w-full h-full object-contain"
                    />

                    {/* Simulated Overlays Preview */}
                    {activeEditorClip.hook && (
                      <div className="absolute top-8 px-3 py-1 bg-black/80 border border-yellow-400 text-yellow-300 font-extrabold text-xs text-center rounded shadow-lg max-w-[85%] uppercase">
                        {activeEditorClip.hook}
                      </div>
                    )}

                    {activeEditorClip.subtitle_style !== "none" && (
                      <div
                        className={`absolute bottom-12 px-4 py-1.5 text-center font-black tracking-wide max-w-[90%] rounded ${
                          activeEditorClip.subtitle_style === "hormozi"
                            ? "bg-black/80 text-yellow-400 border-2 border-yellow-400 text-sm uppercase shadow-2xl"
                            : activeEditorClip.subtitle_style === "karaoke"
                            ? "bg-black/70 text-cyan-400 text-xs shadow-lg"
                            : activeEditorClip.subtitle_style === "clean_minimal"
                            ? "bg-black/75 text-white text-xs"
                            : "bg-black/70 text-yellow-300 text-xs"
                        }`}
                      >
                        {activeEditorClip.title}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right 7 Cols: Customization Controls */}
                <div className="lg:col-span-7 space-y-5">
                  {/* Status Banner */}
                  {editorRenderSuccess && (
                    <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-semibold">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        {editorRenderSuccess}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setActiveTab("library")}
                        className="h-7 text-xs bg-white"
                      >
                        View in My Clips →
                      </Button>
                    </div>
                  )}

                  {editorRenderError && (
                    <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 rounded-xl text-xs flex items-center gap-2 font-semibold">
                      <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                      {editorRenderError}
                    </div>
                  )}

                  {/* Reframing Layout Selector */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Layout className="h-3.5 w-3.5 text-primary" />
                      Automatic Vertical Reframing Mode
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        {
                          id: "blurred_backdrop",
                          label: "Blurred Backdrop",
                          sub: "OpusClip Signature",
                        },
                        {
                          id: "auto_center",
                          label: "Smart Center Crop",
                          sub: "Active Speaker Focus",
                        },
                        {
                          id: "split_screen",
                          label: "Split Screen",
                          sub: "Top / Bottom View",
                        },
                        {
                          id: "top_crop",
                          label: "Top Focus",
                          sub: "Focus on Top Third",
                        },
                      ].map((mode) => (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() =>
                            setActiveEditorClip({
                              ...activeEditorClip,
                              reframing_mode: mode.id as ReframingMode,
                            })
                          }
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            activeEditorClip.reframing_mode === mode.id
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "bg-background hover:bg-muted text-muted-foreground"
                          }`}
                        >
                          <span className="font-bold text-xs block">{mode.label}</span>
                          <span className="text-[10px] opacity-80 block">{mode.sub}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* AI Animated Captions Presets */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Type className="h-3.5 w-3.5 text-primary" />
                      AI Animated Caption Presets
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: "hormozi", label: "Hormozi Style", color: "text-amber-500" },
                        { id: "viral_bold", label: "Viral Bold", color: "text-yellow-400" },
                        { id: "clean_minimal", label: "Clean Minimal", color: "text-zinc-200" },
                        { id: "modern_podcast", label: "Modern Podcast", color: "text-blue-400" },
                        { id: "karaoke", label: "Karaoke Glow", color: "text-cyan-400" },
                        { id: "highlight_words", label: "Word Highlight", color: "text-emerald-400" },
                        { id: "professional", label: "Professional", color: "text-zinc-300" },
                        { id: "none", label: "No Subtitles", color: "text-muted-foreground" },
                      ].map((st) => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() =>
                            setActiveEditorClip({
                              ...activeEditorClip,
                              subtitle_style: st.id as SubtitleStyle,
                            })
                          }
                          className={`p-2.5 rounded-xl border text-center transition-all ${
                            activeEditorClip.subtitle_style === st.id
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "bg-background hover:bg-muted text-muted-foreground"
                          }`}
                        >
                          <span className="font-bold text-xs block">{st.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Hook Headline Overlay Text */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Hook Headline Banner (Top of Video)
                    </Label>
                    <Input
                      type="text"
                      value={activeEditorClip.hook || ""}
                      onChange={(e) =>
                        setActiveEditorClip({
                          ...activeEditorClip,
                          hook: e.target.value,
                        })
                      }
                      className="h-10 text-xs shadow-inner"
                      placeholder="e.g. Wait until you see the ending... 🔥"
                    />
                  </div>

                  {/* Title & Caption */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground">Clip Title</Label>
                      <Input
                        type="text"
                        value={activeEditorClip.title}
                        onChange={(e) =>
                          setActiveEditorClip({
                            ...activeEditorClip,
                            title: e.target.value,
                          })
                        }
                        className="h-9 text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground">Social Caption</Label>
                      <Input
                        type="text"
                        value={activeEditorClip.caption || ""}
                        onChange={(e) =>
                          setActiveEditorClip({
                            ...activeEditorClip,
                            caption: e.target.value,
                          })
                        }
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>

                  {/* Start / End Timestamp Fine-Tuning */}
                  <div className="p-3 bg-muted/30 rounded-xl border space-y-2">
                    <Label className="text-xs font-bold text-foreground">Timeline Trimming</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[11px] text-muted-foreground block mb-1">
                          Start Time (seconds):
                        </span>
                        <Input
                          type="number"
                          step="0.5"
                          value={activeEditorClip.start_time}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setActiveEditorClip({
                              ...activeEditorClip,
                              start_time: val,
                              duration: Math.round(activeEditorClip.end_time - val),
                            });
                          }}
                          className="h-8 text-xs font-semibold"
                        />
                      </div>
                      <div>
                        <span className="text-[11px] text-muted-foreground block mb-1">
                          End Time (seconds):
                        </span>
                        <Input
                          type="number"
                          step="0.5"
                          value={activeEditorClip.end_time}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setActiveEditorClip({
                              ...activeEditorClip,
                              end_time: val,
                              duration: Math.round(val - activeEditorClip.start_time),
                            });
                          }}
                          className="h-8 text-xs font-semibold"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* =========================================================================
          TAB 4: MY CLIPS LIBRARY
         ========================================================================= */}
      {activeTab === "library" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Film className="h-5 w-5 text-primary" />
                Rendered Clips Library
              </h2>
              <p className="text-xs text-muted-foreground">
                All rendered video clips saved permanently in Supabase Storage and PostgreSQL.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={loadUserClips}
                className="text-xs font-semibold gap-1.5 h-8"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh Library
              </Button>
            </div>
          </div>

          {loadingMyClips ? (
            <div className="py-16 text-center text-muted-foreground flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs font-medium">Loading saved clips...</p>
            </div>
          ) : myClips.length === 0 ? (
            <Card className="py-16 text-center text-muted-foreground space-y-3">
              <Scissors className="h-10 w-10 mx-auto text-primary opacity-40" />
              <div className="space-y-1">
                <h3 className="font-bold text-foreground text-sm">No Video Clips Generated Yet</h3>
                <p className="text-xs max-w-sm mx-auto">
                  Paste a video link or upload a video file to generate your first set of viral clips!
                </p>
              </div>
              <Button size="sm" onClick={() => setActiveTab("create")} className="font-semibold text-xs">
                Create First Clip
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {myClips.map((clip) => (
                <Card
                  key={clip.id}
                  className="shadow-sm border rounded-2xl overflow-hidden flex flex-col justify-between"
                >
                  <div className="relative aspect-[9/16] max-h-72 bg-black flex items-center justify-center">
                    <video
                      src={clip.exported_url || clip.source_video_url}
                      controls
                      playsInline
                      preload="metadata"
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute top-2 right-2 flex items-center gap-1">
                      <Badge className="bg-black/80 text-white text-[10px]">
                        {clip.aspect_ratio || "9:16"}
                      </Badge>
                      {clip.viral_score && (
                        <Badge className="bg-amber-500 text-white text-[10px] font-bold">
                          🔥 {clip.viral_score}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <CardContent className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-sm line-clamp-1">{clip.clip_title}</h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <span>{clip.duration?.toFixed(1)}s</span>
                        <span>•</span>
                        <span>{clip.resolution || "1080p"}</span>
                        <span>•</span>
                        <span>
                          {clip.created_at ? new Date(clip.created_at).toLocaleDateString() : "Ready"}
                        </span>
                      </div>
                      {clip.caption && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-2 bg-muted/40 p-2 rounded">
                          {clip.caption}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2 pt-2 border-t">
                      {/* Publishing Actions */}
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedClipForQueue(clip);
                            setQueueModalOpen(true);
                          }}
                          className="w-full text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <Share2 className="h-3.5 w-3.5 mr-1" />
                          Publish Post
                        </Button>

                        <a
                          href={clip.exported_url || clip.source_video_url}
                          download={`clip-${clip.clip_title || "video"}.mp4`}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full"
                        >
                          <Button size="sm" variant="outline" className="w-full text-xs font-semibold">
                            <Download className="h-3.5 w-3.5 mr-1" />
                            Download
                          </Button>
                        </a>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Ready in Library
                        </span>
                        <button
                          onClick={() => handleDeleteClip(clip.id)}
                          className="text-xs text-rose-500 hover:text-rose-700 hover:underline flex items-center gap-1"
                        >
                          <Trash2 className="h-3 w-3" /> Delete
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Select From Video Library Modal */}
      {libraryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-primary" />
                Select Video from Your Library
              </CardTitle>
              <Button size="sm" variant="ghost" onClick={() => setLibraryModalOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-4 overflow-y-auto flex-1 space-y-3">
              {loadingLibrary ? (
                <div className="py-12 text-center text-muted-foreground flex flex-col items-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p className="text-xs">Fetching library videos...</p>
                </div>
              ) : libraryVideos.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <p className="text-sm">No videos found in your library.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {libraryVideos.map((v) => (
                    <div
                      key={v.id}
                      onClick={() => handleSelectLibraryVideo(v)}
                      className="p-3 border rounded-xl hover:border-primary hover:bg-muted/40 cursor-pointer transition-all flex flex-col justify-between"
                    >
                      <div>
                        <h4 className="font-semibold text-xs line-clamp-1">{v.title}</h4>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Duration: {v.duration_seconds || "Unknown"}s • {v.resolution || "1080p"}
                        </p>
                      </div>
                      <Button size="sm" variant="secondary" className="mt-2 text-xs h-7">
                        Analyze This Video
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 1-Click Send to Queue / Publish Modal */}
      {queueModalOpen && selectedClipForQueue && (
        <SendToQueueModal
          isOpen={queueModalOpen}
          onClose={() => {
            setQueueModalOpen(false);
            setSelectedClipForQueue(null);
          }}
          clip={{
            id: selectedClipForQueue.id,
            title: selectedClipForQueue.clip_title,
            caption: selectedClipForQueue.caption,
            videoUrl: selectedClipForQueue.exported_url || selectedClipForQueue.source_video_url,
            aspectRatio: selectedClipForQueue.aspect_ratio,
            duration: selectedClipForQueue.duration,
          }}
          onSuccess={() => {
            setQueueModalOpen(false);
            setSelectedClipForQueue(null);
            loadUserClips();
          }}
        />
      )}
    </div>
  );
}
