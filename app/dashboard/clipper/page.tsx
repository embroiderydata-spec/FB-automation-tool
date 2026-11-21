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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SendToQueueModal } from "@/components/clipper/send-to-queue-modal";
import {
  AspectRatio,
  CropPosition,
  Resolution,
  SubtitleStyle,
  ViralCategory,
  ViralCandidateClip,
  VideoAnalysisResult,
  VideoClipRecord,
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
  const [activeTab, setActiveTab] = useState<"finder" | "my_clips">("finder");

  // Step 1: Input URL State
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisStep, setAnalysisStep] = useState<string>("");
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Analysis Result
  const [analysis, setAnalysis] = useState<VideoAnalysisResult | null>(null);
  const [candidateClips, setCandidateClips] = useState<ViralCandidateClip[]>([]);

  // Sorting & Filtering
  const [sortBy, setSortBy] = useState<SortOption>("viral_score");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

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

  // Previewing a specific candidate
  const [previewingClip, setPreviewingClip] = useState<ViralCandidateClip | null>(null);
  const [expandedClipOptions, setExpandedClipOptions] = useState<number | null>(null);

  // Automation Mode
  const [automationMode, setAutomationMode] = useState<boolean>(false);
  const [autoClipCount, setAutoClipCount] = useState<number>(3);
  const [emergencyStopped, setEmergencyStopped] = useState<boolean>(false);

  // My Clips State
  const [myClips, setMyClips] = useState<VideoClipRecord[]>([]);
  const [loadingClips, setLoadingClips] = useState<boolean>(false);

  // Publishing Modal
  const [queueModalOpen, setQueueModalOpen] = useState<boolean>(false);
  const [selectedClipForQueue, setSelectedClipForQueue] = useState<VideoClipRecord | null>(null);

  // Load user clips on mount
  useEffect(() => {
    loadUserClips();
  }, []);

  async function loadUserClips() {
    setLoadingClips(true);
    try {
      const res = await fetch("/api/clipper");
      const data = await res.json();
      if (data.clips) {
        setMyClips(data.clips);
      }
    } catch (err) {
      console.error("Failed to load clips:", err);
    } finally {
      setLoadingClips(false);
    }
  }

  // Analyze Video URL Handler
  async function handleAnalyzeVideo(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!videoUrl.trim()) {
      setAnalysisError("Please paste a valid video link (e.g. YouTube or direct video URL).");
      return;
    }

    setAnalysisError(null);
    setIsAnalyzing(true);
    setAnalysisStep("Validating video source and fetching metadata...");
    setPreviewingClip(null);

    try {
      // Step simulation for transparency
      setTimeout(() => setAnalysisStep("Extracting transcript and dialogue cues..."), 1200);
      setTimeout(() => setAnalysisStep("AI analyzing hooks, emotional peaks & audience retention..."), 2600);
      setTimeout(() => setAnalysisStep("Scoring viral potential and formulating viral shorts..."), 4200);

      const res = await fetch("/api/clipper/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: videoUrl.trim(),
          auto_clip: automationMode,
          max_clips: autoClipCount,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to analyze video.");
      }

      setAnalysis(data.analysis);
      setCandidateClips(data.analysis.candidate_clips || []);

      // If automation mode was on, trigger batch generation automatically
      if (automationMode && !emergencyStopped && data.analysis.candidate_clips?.length > 0) {
        const topClips = data.analysis.candidate_clips.slice(0, autoClipCount);
        handleGenerateBatch(topClips);
      }
    } catch (err: any) {
      setAnalysisError(err.message || "Could not analyze this video URL.");
    } finally {
      setIsAnalyzing(false);
      setAnalysisStep("");
    }
  }

  // Handle Local File Upload
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/clipper/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "File upload failed.");
      }

      setUploadedFile({
        name: data.video.filename,
        path: data.video.local_path,
        url: data.video.url,
        duration: data.video.duration,
        sizeFormatted: data.video.size_formatted,
      });

      setVideoUrl(data.video.url);

      // Automatically trigger analysis on uploaded file
      setIsAnalyzing(true);
      setAnalysisStep("Analyzing uploaded video file...");

      const analyzeRes = await fetch("/api/clipper/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: data.video.url }),
      });
      const analyzeData = await analyzeRes.json();
      if (analyzeData.success) {
        setAnalysis(analyzeData.analysis);
        setCandidateClips(analyzeData.analysis.candidate_clips || []);
      }
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload video.");
    } finally {
      setIsUploading(false);
      setIsAnalyzing(false);
      setAnalysisStep("");
    }
  }

  // Open Video Library Modal
  async function openVideoLibrary() {
    setLibraryModalOpen(true);
    setLoadingLibrary(true);
    try {
      const res = await fetch("/api/video/library");
      const data = await res.json();
      if (data.videos) {
        setLibraryVideos(data.videos);
      }
    } catch (err) {
      console.error("Failed to load library videos:", err);
    } finally {
      setLoadingLibrary(false);
    }
  }

  function handleSelectLibraryVideo(v: any) {
    setVideoUrl(v.video_url || v.storage_path);
    setLibraryModalOpen(false);
    // Auto analyze
    setTimeout(() => {
      handleAnalyzeVideo();
    }, 100);
  }

  // Toggle selection for a candidate clip
  function toggleClipSelection(clipNumber: number) {
    setCandidateClips((prev) =>
      prev.map((c) =>
        c.clip_number === clipNumber ? { ...c, selected: !c.selected } : c
      )
    );
  }

  // Select all / Deselect all
  function selectAllClips(selectAll: boolean) {
    setCandidateClips((prev) => prev.map((c) => ({ ...c, selected: selectAll })));
  }

  // Change title on candidate clip
  function updateClipTitle(clipNumber: number, newTitle: string) {
    setCandidateClips((prev) =>
      prev.map((c) =>
        c.clip_number === clipNumber ? { ...c, title: newTitle } : c
      )
    );
  }

  // Change aspect ratio or subtitle style per clip
  function updateClipSettings(
    clipNumber: number,
    aspectRatio?: AspectRatio,
    subtitleStyle?: SubtitleStyle
  ) {
    setCandidateClips((prev) =>
      prev.map((c) => {
        if (c.clip_number === clipNumber) {
          return {
            ...c,
            aspect_ratio: aspectRatio ?? c.aspect_ratio,
            subtitle_style: subtitleStyle ?? c.subtitle_style,
          };
        }
        return c;
      })
    );
  }

  // Batch Generation Execution
  async function handleGenerateBatch(clipsToGenerate?: ViralCandidateClip[]) {
    const targetClips =
      clipsToGenerate || candidateClips.filter((c) => c.selected);

    if (targetClips.length === 0) {
      alert("Please select at least one candidate clip to generate.");
      return;
    }

    setIsGeneratingBatch(true);
    setBatchNotice(null);
    setGenerationProgress({
      current: 0,
      total: targetClips.length,
      statusText: `Preparing to process ${targetClips.length} viral clips with FFmpeg...`,
    });

    try {
      const res = await fetch("/api/clipper/generate-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_video_url: analysis?.video_url || videoUrl,
          source_local_path: uploadedFile?.path,
          source_video_name: analysis?.title || "Source Video",
          clips: targetClips.map((c) => ({
            clip_number: c.clip_number,
            title: c.title,
            start_time: c.start_time,
            end_time: c.end_time,
            duration: c.duration,
            aspect_ratio: c.aspect_ratio || "9:16",
            subtitle_style: c.subtitle_style || "viral_bold",
            subtitle_text: c.hook || c.title,
            hook_text: c.hook,
            caption: c.caption,
            viral_score: c.viral_score,
            category: c.category,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.requires_upload) {
          setShowUploadFallback(true);
        }
        throw new Error(data.error || "Batch generation failed.");
      }

      setBatchNotice(
        `Successfully generated ${data.success_count} / ${data.total_requested} clips! Added to Video Library and My Clips.`
      );

      // Refresh clips list
      await loadUserClips();
    } catch (err: any) {
      setBatchNotice(`Generation notice: ${err.message}`);
    } finally {
      setIsGeneratingBatch(false);
      setGenerationProgress(null);
    }
  }

  // Single Clip Generation
  async function handleGenerateSingle(clip: ViralCandidateClip) {
    handleGenerateBatch([clip]);
  }

  // Delete clip from My Clips
  async function handleDeleteClip(clipId: string) {
    if (!confirm("Are you sure you want to delete this clip?")) return;
    try {
      const res = await fetch(`/api/clipper?id=${clipId}`, { method: "DELETE" });
      if (res.ok) {
        setMyClips((prev) => prev.filter((c) => c.id !== clipId));
      }
    } catch (err) {
      console.error("Failed to delete clip:", err);
    }
  }

  // Filter & Sort Candidate Clips
  const filteredClips = candidateClips
    .filter((clip) => {
      if (categoryFilter === "all") return true;
      return clip.category === categoryFilter;
    })
    .sort((a, b) => {
      if (sortBy === "viral_score") return b.viral_score - a.viral_score;
      if (sortBy === "hook") return a.title.localeCompare(b.title);
      if (sortBy === "chronological") return a.start_time - b.start_time;
      if (sortBy === "surprising") return (b.category === "surprising" ? 1 : 0) - (a.category === "surprising" ? 1 : 0);
      if (sortBy === "funny") return (b.category === "funny" ? 1 : 0) - (a.category === "funny" ? 1 : 0);
      if (sortBy === "emotional") return (b.category === "emotional" ? 1 : 0) - (a.category === "emotional" ? 1 : 0);
      if (sortBy === "educational") return (b.category === "educational" ? 1 : 0) - (a.category === "educational" ? 1 : 0);
      return 0;
    });

  const selectedCount = candidateClips.filter((c) => c.selected).length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-amber-500" />
              AI Viral Clip Finder & Shorts Generator
            </h1>
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300">
              AI Powered
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Paste any video link to automatically find the highest-retention moments, add viral subtitles, reframe into 9:16 vertical Shorts, and publish in 1 click.
          </p>
        </div>

        {/* Tab & Automation Controls */}
        <div className="flex items-center gap-3">
          {/* Automation Mode Toggle */}
          <div className="flex items-center gap-2 bg-muted/60 px-3 py-1.5 rounded-lg border text-xs">
            <Zap className={`h-4 w-4 ${automationMode ? "text-amber-500 fill-amber-500" : "text-muted-foreground"}`} />
            <span className="font-medium">Auto-Clip Mode</span>
            <input
              type="checkbox"
              checked={automationMode}
              onChange={(e) => setAutomationMode(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
            />
          </div>

          <div className="flex bg-muted p-1 rounded-lg">
            <button
              onClick={() => setActiveTab("finder")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === "finder"
                  ? "bg-background text-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              AI Clip Finder
            </button>
            <button
              onClick={() => setActiveTab("my_clips")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                activeTab === "my_clips"
                  ? "bg-background text-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>My Clips</span>
              {myClips.length > 0 && (
                <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-bold">
                  {myClips.length}
                </Badge>
              )}
            </button>
          </div>
        </div>
      </div>

      {activeTab === "finder" ? (
        <div className="space-y-6">
          {/* STEP 1: HERO URL INPUT */}
          <Card className="border-2 border-primary/20 shadow-md overflow-hidden bg-gradient-to-b from-card to-muted/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Film className="h-5 w-5 text-primary" />
                  Step 1: Paste Video Link
                </span>
                <span className="text-xs font-normal text-muted-foreground">
                  Supports YouTube, direct MP4, MOV, WebM, & Cloud Storage
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleAnalyzeVideo} className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Input
                    type="text"
                    placeholder="Paste your video link here (e.g. https://www.youtube.com/watch?v=... or direct MP4)..."
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    className="h-12 pl-4 pr-10 text-sm shadow-inner rounded-lg"
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
                  disabled={isAnalyzing || !videoUrl.trim()}
                  className="h-12 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center gap-2 shadow-sm rounded-lg"
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
              </form>

              {/* Quick Source Actions & Local Fallback Toggle */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-foreground">Quick Options:</span>
                  <button
                    type="button"
                    onClick={openVideoLibrary}
                    className="text-primary hover:underline flex items-center gap-1 font-medium"
                  >
                    <FolderOpen className="h-3.5 w-3.5" />
                    Select from Video Library
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => setShowUploadFallback(!showUploadFallback)}
                    className="text-primary hover:underline flex items-center gap-1 font-medium"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {showUploadFallback ? "Hide File Upload" : "Upload Video File Directly"}
                  </button>
                </div>

                {automationMode && (
                  <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                    <Zap className="h-3.5 w-3.5 fill-current" />
                    Auto-Clip will generate top {autoClipCount} moments upon analysis
                  </div>
                )}
              </div>

              {/* Upload Dropzone Fallback (if user toggles or needed) */}
              {showUploadFallback && (
                <div className="mt-3 p-4 border-2 border-dashed rounded-lg bg-muted/40 text-center space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/mp4,video/quicktime,video/webm"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="flex flex-col items-center justify-center gap-1">
                    <Upload className="h-8 w-8 text-muted-foreground animate-bounce" />
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
                  {uploadedFile && (
                    <div className="flex items-center justify-center gap-2 text-xs text-emerald-600 font-medium">
                      <CheckCircle2 className="h-4 w-4" />
                      Loaded: {uploadedFile.name} ({uploadedFile.sizeFormatted})
                    </div>
                  )}
                  {uploadError && (
                    <p className="text-xs text-rose-500 font-medium">{uploadError}</p>
                  )}
                </div>
              )}

              {/* Error Alert */}
              {analysisError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300 rounded-lg text-xs flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Analysis Notice: </span>
                    {analysisError}
                    <button
                      type="button"
                      onClick={() => setShowUploadFallback(true)}
                      className="ml-2 underline font-medium hover:text-rose-900"
                    >
                      Try uploading the video file instead.
                    </button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* STEP 2: REAL-TIME ANALYSIS STEPPER */}
          {isAnalyzing && (
            <Card className="border border-amber-300 bg-amber-50/60 dark:bg-amber-950/20 shadow-sm animate-pulse">
              <CardContent className="py-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-6 w-6 text-amber-600 animate-spin" />
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      AI Video Analysis in Progress...
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {analysisStep || "Scanning video for viral moments..."}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="border-amber-400 text-amber-700 dark:text-amber-300">
                  Real AI Processing
                </Badge>
              </CardContent>
            </Card>
          )}

          {/* STEP 3 & 4: VIRAL CANDIDATES DASHBOARD */}
          {analysis && !isAnalyzing && (
            <div className="space-y-6">
              {/* Video Overview Header */}
              <Card className="shadow-sm">
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
                          Creator: <span className="font-medium text-foreground">{analysis.author || "Unknown"}</span> • Total Length: <span className="font-medium text-foreground">{analysis.duration_formatted}</span>
                        </p>
                        <p className="text-xs text-emerald-600 font-semibold mt-1">
                          ✨ AI detected {candidateClips.length} high-potential moments ready for Shorts & Reels
                        </p>
                      </div>
                    </div>

                    {/* Batch Generation Primary Button */}
                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                      <Button
                        onClick={() => handleGenerateBatch()}
                        disabled={isGeneratingBatch || selectedCount === 0}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 px-5 shadow-sm"
                      >
                        {isGeneratingBatch ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Rendering Selected...
                          </>
                        ) : (
                          <>
                            <Zap className="h-4 w-4 fill-white mr-1.5" />
                            Generate Selected Clips ({selectedCount})
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Batch Generation Notice & Progress */}
              {isGeneratingBatch && generationProgress && (
                <Card className="border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20">
                  <CardContent className="py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-5 w-5 text-emerald-600 animate-spin" />
                      <div>
                        <span className="text-sm font-semibold">Processing Clips with FFmpeg Engine...</span>
                        <p className="text-xs text-muted-foreground">{generationProgress.statusText}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {batchNotice && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-lg text-xs flex items-center justify-between">
                  <span>{batchNotice}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveTab("my_clips")}
                    className="h-7 text-xs bg-white"
                  >
                    View in My Clips →
                  </Button>
                </div>
              )}

              {/* SORT & FILTER TOOLBAR */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/40 p-3 rounded-lg border">
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
                    <option value="hook">Best Hook Potential</option>
                    <option value="surprising">Most Surprising</option>
                    <option value="funny">Funny Moments</option>
                    <option value="emotional">Emotional Impact</option>
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
                    className="text-primary hover:underline font-medium"
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

              {/* CANDIDATE CARDS GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredClips.map((clip) => {
                  const isSelected = !!clip.selected;
                  const isPreviewing = previewingClip?.clip_number === clip.clip_number;
                  const isOptionsExpanded = expandedClipOptions === clip.clip_number;

                  return (
                    <Card
                      key={clip.clip_number}
                      className={`transition-all shadow-sm flex flex-col justify-between border-2 ${
                        isSelected
                          ? "border-primary bg-primary/[0.02]"
                          : "border-border hover:border-muted-foreground/30"
                      }`}
                    >
                      <CardHeader className="p-4 pb-2">
                        {/* Top Metadata Bar */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleClipSelection(clip.clip_number)}
                              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                            />
                            <Badge variant="outline" className="font-bold text-xs bg-background">
                              Clip #{clip.clip_number}
                            </Badge>
                            <Badge
                              variant="secondary"
                              className={`text-[11px] capitalize ${
                                clip.category === "surprising"
                                  ? "bg-purple-100 text-purple-800"
                                  : clip.category === "funny"
                                  ? "bg-amber-100 text-amber-800"
                                  : clip.category === "emotional"
                                  ? "bg-rose-100 text-rose-800"
                                  : clip.category === "educational"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              {clip.category}
                            </Badge>
                          </div>

                          {/* Viral Score Badge */}
                          <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full text-xs font-black">
                            <Flame className="h-3.5 w-3.5 fill-current" />
                            <span>{clip.viral_score}/100</span>
                          </div>
                        </div>

                        {/* Title (Editable or select from options) */}
                        <div className="space-y-1">
                          <input
                            type="text"
                            value={clip.title}
                            onChange={(e) => updateClipTitle(clip.clip_number, e.target.value)}
                            className="font-bold text-sm w-full bg-transparent hover:bg-muted/50 focus:bg-background border-b border-transparent focus:border-primary px-1 py-0.5 rounded outline-none transition-all"
                            title="Click to edit title"
                          />
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <span className="font-semibold text-foreground bg-muted px-1.5 py-0.5 rounded">
                              {clip.start_formatted} - {clip.end_formatted}
                            </span>
                            <span>•</span>
                            <span>{clip.duration} seconds</span>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="p-4 pt-1 space-y-3 flex-1 flex flex-col justify-between">
                        {/* Video Preview Player (YouTube or HTML5) */}
                        <div className="rounded-lg overflow-hidden bg-black aspect-video relative group">
                          {analysis.source_type === "youtube" && analysis.video_id ? (
                            isPreviewing ? (
                              <iframe
                                src={`https://www.youtube.com/embed/${analysis.video_id}?start=${clip.start_time}&end=${clip.end_time}&autoplay=1`}
                                title={clip.title}
                                className="w-full h-full border-0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            ) : (
                              <div
                                onClick={() => setPreviewingClip(clip)}
                                className="w-full h-full relative cursor-pointer"
                              >
                                <img
                                  src={analysis.thumbnail_url || `https://i.ytimg.com/vi/${analysis.video_id}/hqdefault.jpg`}
                                  alt={clip.title}
                                  className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="bg-primary/90 text-primary-foreground p-3 rounded-full shadow-lg group-hover:scale-110 transition-transform">
                                    <Play className="h-5 w-5 fill-current ml-0.5" />
                                  </div>
                                </div>
                                <div className="absolute bottom-2 left-2 bg-black/75 text-white px-2 py-0.5 rounded text-[10px] font-mono">
                                  Preview {clip.start_formatted} - {clip.end_formatted}
                                </div>
                              </div>
                            )
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-2 text-center">
                              <video
                                src={`${videoUrl}#t=${clip.start_time},${clip.end_time}`}
                                controls
                                className="w-full h-full object-contain"
                              />
                            </div>
                          )}
                        </div>

                        {/* Rationale & Hook */}
                        <div className="text-xs space-y-1.5 bg-muted/30 p-2.5 rounded-lg border">
                          <p className="text-muted-foreground">
                            <span className="font-semibold text-foreground">Hook: </span>
                            "{clip.hook}"
                          </p>
                          <p className="text-muted-foreground line-clamp-2">
                            <span className="font-semibold text-foreground">Why Viral: </span>
                            {clip.reason}
                          </p>
                        </div>

                        {/* Output Settings (Format & Subtitles) */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <label className="text-[10px] text-muted-foreground uppercase font-semibold">
                              Aspect Ratio
                            </label>
                            <select
                              value={clip.aspect_ratio || "9:16"}
                              onChange={(e) =>
                                updateClipSettings(clip.clip_number, e.target.value as AspectRatio)
                              }
                              className="w-full mt-0.5 text-xs bg-background border rounded px-2 py-1 font-medium"
                            >
                              <option value="9:16">9:16 (Shorts/Reels)</option>
                              <option value="16:9">16:9 (Landscape)</option>
                              <option value="1:1">1:1 (Square)</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[10px] text-muted-foreground uppercase font-semibold">
                              Subtitle Style
                            </label>
                            <select
                              value={clip.subtitle_style || "viral_bold"}
                              onChange={(e) =>
                                updateClipSettings(
                                  clip.clip_number,
                                  undefined,
                                  e.target.value as SubtitleStyle
                                )
                              }
                              className="w-full mt-0.5 text-xs bg-background border rounded px-2 py-1 font-medium"
                            >
                              <option value="viral_bold">Viral Bold (Yellow)</option>
                              <option value="clean_minimal">Clean Minimal</option>
                              <option value="karaoke">Karaoke (Cyan)</option>
                              <option value="none">No Subtitles</option>
                            </select>
                          </div>
                        </div>

                        {/* Expandable AI Title & Hook Options Accordion */}
                        <div className="border rounded-lg overflow-hidden text-xs">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedClipOptions(
                                isOptionsExpanded ? null : clip.clip_number
                              )
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
                            <div className="p-3 space-y-3 bg-background border-t">
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

                              <div>
                                <span className="font-semibold text-foreground text-[11px] block mb-1">
                                  Opening Hook Options:
                                </span>
                                <ul className="list-disc list-inside space-y-1 text-muted-foreground text-[11px]">
                                  {clip.hook_options.map((h, idx) => (
                                    <li key={idx} className="line-clamp-1">
                                      {h}
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              <div>
                                <span className="font-semibold text-foreground text-[11px] block mb-1">
                                  Hashtags:
                                </span>
                                <div className="flex flex-wrap gap-1">
                                  {clip.hashtags.map((tag, idx) => (
                                    <Badge key={idx} variant="outline" className="text-[10px]">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Card Actions */}
                        <div className="pt-2 flex items-center gap-2">
                          <Button
                            size="sm"
                            variant={isSelected ? "default" : "outline"}
                            onClick={() => toggleClipSelection(clip.clip_number)}
                            className="flex-1 text-xs font-semibold"
                          >
                            {isSelected ? (
                              <>
                                <Check className="h-3.5 w-3.5 mr-1" />
                                Selected
                              </>
                            ) : (
                              "Select Clip"
                            )}
                          </Button>

                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleGenerateSingle(clip)}
                            disabled={isGeneratingBatch}
                            className="text-xs font-semibold"
                          >
                            <Zap className="h-3.5 w-3.5 mr-1 text-amber-500" />
                            Generate
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* TAB 2: MY CLIPS & PUBLISHING STUDIO */
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h2 className="text-lg font-bold">My Processed Clips</h2>
              <p className="text-xs text-muted-foreground">
                All extracted vertical clips ready for instant publishing to Facebook Reels and YouTube Shorts.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadUserClips}
              disabled={loadingClips}
              className="text-xs gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingClips ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {loadingClips ? (
            <div className="py-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm">Loading your clips library...</p>
            </div>
          ) : myClips.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed rounded-xl space-y-3 bg-muted/20">
              <Scissors className="h-10 w-10 mx-auto text-muted-foreground" />
              <h3 className="text-base font-bold">No clips generated yet</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Paste any video URL in the AI Clip Finder to detect viral moments and generate vertical Shorts.
              </p>
              <Button onClick={() => setActiveTab("finder")} className="text-xs font-semibold">
                Go to AI Clip Finder
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {myClips.map((clip) => (
                <Card key={clip.id} className="overflow-hidden shadow-sm flex flex-col justify-between">
                  <div className="relative aspect-[9/16] bg-black max-h-[360px] overflow-hidden">
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
                        <span>{clip.created_at ? new Date(clip.created_at).toLocaleDateString() : "Ready"}</span>
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
          <Card className="w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
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
                      className="p-3 border rounded-lg hover:border-primary hover:bg-muted/40 cursor-pointer transition-all flex flex-col justify-between"
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
