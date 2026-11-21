"use client";

import React, { useState, useRef, useEffect } from "react";
import {
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
  Sparkles,
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
  Bookmark,
  Volume2,
  VolumeX,
  FileVideo,
  Check,
  X,
  Sliders,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SendToQueueModal } from "@/components/clipper/send-to-queue-modal";
import { AspectRatio, CropPosition, Resolution, VideoClipRecord, UploadedVideoInfo } from "@/lib/clipper/types";

export default function VideoClipperPage() {
  const [activeTab, setActiveTab] = useState<"clipper" | "my_clips">("clipper");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Uploaded Video State (starts null - no fake demo videos)
  const [currentVideo, setCurrentVideo] = useState<UploadedVideoInfo | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Library Video Selector Modal
  const [libraryModalOpen, setLibraryModalOpen] = useState<boolean>(false);
  const [libraryVideos, setLibraryVideos] = useState<any[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState<boolean>(false);

  // Playback State
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isPreviewingClip, setIsPreviewingClip] = useState<boolean>(false);

  // In / Out Timestamp Trimming State (in seconds)
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);
  const clipDuration = Math.max(0, Number((endTime - startTime).toFixed(2)));

  // Clip Formatting Configuration
  const [clipTitle, setClipTitle] = useState<string>("");
  const [caption, setCaption] = useState<string>("#reels #shorts #viral");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("9:16");
  const [cropPosition, setCropPosition] = useState<CropPosition>("center");
  const [resolution, setResolution] = useState<Resolution>("1080p");
  const [subtitleText, setSubtitleText] = useState<string>("");
  const [subtitlePosition, setSubtitlePosition] = useState<"top" | "center" | "bottom">("top");

  // Multi-Clip Batch Queue
  const [clipBatch, setClipBatch] = useState<Array<{
    id: string;
    title: string;
    startTime: number;
    endTime: number;
    duration: number;
    aspectRatio: AspectRatio;
    cropPosition: CropPosition;
    subtitleText: string;
    caption: string;
    status: "queued" | "processing" | "completed" | "failed";
    renderedUrl?: string;
    error?: string;
  }>>([]);

  // Rendering Job State
  const [renderStatus, setRenderStatus] = useState<"idle" | "queued" | "processing" | "uploading" | "completed" | "failed">("idle");
  const [renderError, setRenderError] = useState<string | null>(null);
  const [renderNotice, setRenderNotice] = useState<string | null>(null);
  const [lastRenderedClip, setLastRenderedClip] = useState<{
    id: string;
    title: string;
    url: string;
    duration: number;
    sizeBytes?: number;
  } | null>(null);

  // Saved Clips Library State
  const [savedClips, setSavedClips] = useState<VideoClipRecord[]>([]);
  const [loadingSavedClips, setLoadingSavedClips] = useState<boolean>(false);

  // Publishing Queue Modal State
  const [queueModalOpen, setQueueModalOpen] = useState<boolean>(false);
  const [activeClipForQueue, setActiveClipForQueue] = useState<any>(null);

  // Duration Adjustment Notice
  const [durationNotice, setDurationNotice] = useState<string | null>(null);

  useEffect(() => {
    fetchSavedClips();
  }, []);

  async function fetchSavedClips() {
    setLoadingSavedClips(true);
    try {
      const res = await fetch("/api/clipper");
      if (res.ok) {
        const data = await res.json();
        setSavedClips(data.clips || []);
      }
    } catch {}
    finally {
      setLoadingSavedClips(false);
    }
  }

  // Format seconds to HH:MM:SS.ms
  function formatTimecode(seconds: number): string {
    if (isNaN(seconds) || seconds < 0) return "00:00:00.00";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}.${pad(ms)}`;
  }

  // Parse HH:MM:SS or SS to seconds
  function parseTimeToSeconds(val: string): number {
    const parts = val.split(":").map(Number);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    const num = parseFloat(val);
    return isNaN(num) ? 0 : num;
  }

  // Real Video Upload Handler
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    setUploadProgress(`Uploading ${file.name} to storage...`);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/clipper/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to upload video.");
      }

      const videoInfo: UploadedVideoInfo = data.video;
      setCurrentVideo(videoInfo);
      setClipTitle(`${videoInfo.filename.replace(/\.[^/.]+$/, "")} - Reel`);
      setStartTime(0);
      setEndTime(Math.min(30, videoInfo.duration || 30));
      setUploadProgress(null);
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload video.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // Load Library Videos
  async function openLibrarySelector() {
    setLibraryModalOpen(true);
    setLoadingLibrary(true);
    try {
      const res = await fetch("/api/video/library?category=all");
      if (res.ok) {
        const data = await res.json();
        setLibraryVideos(data.videos || []);
      }
    } catch {}
    finally {
      setLoadingLibrary(false);
    }
  }

  function selectLibraryVideo(v: any) {
    const duration = v.duration_seconds || 30;
    setCurrentVideo({
      id: v.id,
      filename: v.title || "Library Video",
      url: v.video_url,
      duration,
      width: 1920,
      height: 1080,
      resolution: v.resolution || "1920x1080",
      size_bytes: v.file_size_bytes || 0,
      size_formatted: v.file_size_bytes ? `${(v.file_size_bytes / (1024 * 1024)).toFixed(1)} MB` : "Ready",
    });
    setClipTitle(`${v.title || "Video"} - Clip`);
    setStartTime(0);
    setEndTime(Math.min(30, duration));
    setLibraryModalOpen(false);
  }

  // Loaded Metadata from Video element
  function handleLoadedMetadata() {
    if (videoRef.current && currentVideo) {
      const actualDur = Number(videoRef.current.duration.toFixed(2));
      if (actualDur > 0 && (!currentVideo.duration || currentVideo.duration === 0)) {
        setCurrentVideo((prev) => (prev ? { ...prev, duration: actualDur } : prev));
        setEndTime(Math.min(30, actualDur));
      }
    }
  }

  // Transport Controls
  function togglePlay() {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  }

  function seekTo(timeInSeconds: number) {
    if (!videoRef.current || !currentVideo) return;
    const clamped = Math.max(0, Math.min(timeInSeconds, currentVideo.duration));
    videoRef.current.currentTime = clamped;
    setCurrentTime(clamped);
  }

  // Set In-Point from current playback time
  function setInPoint() {
    if (!videoRef.current) return;
    const pos = Number(videoRef.current.currentTime.toFixed(2));
    setStartTime(pos);
    if (pos >= endTime) {
      const newEnd = currentVideo ? Math.min(currentVideo.duration, pos + 15) : pos + 15;
      setEndTime(Number(newEnd.toFixed(2)));
    }
  }

  // Set Out-Point from current playback time
  function setOutPoint() {
    if (!videoRef.current) return;
    const pos = Number(videoRef.current.currentTime.toFixed(2));
    if (pos <= startTime) {
      setStartTime(Math.max(0, Number((pos - 15).toFixed(2))));
    }
    setEndTime(pos);
  }

  // Quick Duration Button (+15s, +30s, +60s, +90s)
  function handleQuickDuration(seconds: number) {
    if (!currentVideo) return;
    setDurationNotice(null);
    const targetEnd = startTime + seconds;

    if (targetEnd > currentVideo.duration) {
      const available = Number((currentVideo.duration - startTime).toFixed(1));
      setEndTime(currentVideo.duration);
      setDurationNotice(`Adjusted to end of video (${available}s available from start)`);
      setTimeout(() => setDurationNotice(null), 3500);
    } else {
      setEndTime(Number(targetEnd.toFixed(2)));
    }
  }

  // Preview Clip section
  function handlePreviewClip() {
    const video = videoRef.current;
    if (!video) return;

    setIsPreviewingClip(true);
    video.currentTime = startTime;
    video.play();
    setIsPlaying(true);

    const interval = setInterval(() => {
      if (!video) {
        clearInterval(interval);
        setIsPreviewingClip(false);
        return;
      }
      if (video.currentTime >= endTime || video.paused) {
        video.pause();
        setIsPlaying(false);
        setIsPreviewingClip(false);
        clearInterval(interval);
      }
    }, 50);
  }

  // Add Clip to Batch Queue
  function handleAddToBatch() {
    if (!currentVideo) return;
    const newBatchItem = {
      id: `batch_${Date.now()}`,
      title: clipTitle || `Clip ${clipBatch.length + 1}`,
      startTime,
      endTime,
      duration: clipDuration,
      aspectRatio,
      cropPosition,
      subtitleText,
      caption,
      status: "queued" as const,
    };
    setClipBatch((prev) => [...prev, newBatchItem]);
    setRenderNotice(`Added "${newBatchItem.title}" (${clipDuration}s) to batch!`);
    setTimeout(() => setRenderNotice(null), 3000);
  }

  // Render Single Clip with Backend FFmpeg Engine
  async function handleRenderSingleClip() {
    if (!currentVideo) return;

    setRenderStatus("queued");
    setRenderError(null);
    setRenderNotice("Job queued. Initializing FFmpeg render engine...");

    try {
      setRenderStatus("processing");
      setRenderNotice(`Trimming ${clipDuration}s & applying ${aspectRatio} (${cropPosition} crop)...`);

      const payload = {
        source_local_path: currentVideo.local_path,
        source_video_url: currentVideo.url,
        source_video_name: currentVideo.filename,
        clip_title: clipTitle || "Viral 9:16 Reel",
        start_time: startTime,
        end_time: endTime,
        aspect_ratio: aspectRatio,
        crop_position: cropPosition,
        resolution,
        subtitle_text: subtitleText,
        subtitle_position: subtitlePosition,
        caption,
      };

      const res = await fetch("/api/clipper/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "FFmpeg video rendering failed.");
      }

      setRenderStatus("completed");
      setRenderNotice("Render Completed! Video encoded and uploaded to Supabase Storage.");
      setLastRenderedClip({
        id: data.clip.id,
        title: data.clip.clip_title,
        url: data.clip.exported_url,
        duration: data.clip.duration,
        sizeBytes: data.clip.file_size,
      });

      fetchSavedClips();
    } catch (err: any) {
      setRenderStatus("failed");
      setRenderError(err.message || "Video rendering failed.");
    }
  }

  // Render All Clips in Batch
  async function handleRenderAllBatch() {
    if (!currentVideo || clipBatch.length === 0) return;

    for (let i = 0; i < clipBatch.length; i++) {
      const item = clipBatch[i];
      if (item.status === "completed") continue;

      // Update status to processing
      setClipBatch((prev) =>
        prev.map((c) => (c.id === item.id ? { ...c, status: "processing" } : c))
      );

      try {
        const res = await fetch("/api/clipper/render", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source_local_path: currentVideo.local_path,
            source_video_url: currentVideo.url,
            source_video_name: currentVideo.filename,
            clip_title: item.title,
            start_time: item.startTime,
            end_time: item.endTime,
            aspect_ratio: item.aspectRatio,
            crop_position: item.cropPosition,
            resolution,
            subtitle_text: item.subtitleText,
            caption: item.caption,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error);

        setClipBatch((prev) =>
          prev.map((c) =>
            c.id === item.id
              ? { ...c, status: "completed", renderedUrl: data.clip.exported_url }
              : c
          )
        );
      } catch (err: any) {
        setClipBatch((prev) =>
          prev.map((c) =>
            c.id === item.id ? { ...c, status: "failed", error: err.message } : c
          )
        );
      }
    }

    fetchSavedClips();
  }

  // Trigger Download of Rendered Video
  function downloadRenderedVideo(url: string, filename: string) {
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename.toLowerCase().replace(/[^a-z0-9]/g, "-")}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl flex items-center gap-2">
              <Scissors className="h-6 w-6 text-primary" />
              Video Clipping Studio
            </h2>
            <Badge variant="outline" className="text-[10px] border-primary/40 text-primary font-semibold">
              FFmpeg H.264 & AAC Pipeline
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Upload your footage, scrub with precision playhead markers, crop to 9:16 vertical, and render real high-converting MP4 Reels with FFmpeg.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center gap-2">
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
            <TabsList className="h-8 p-1">
              <TabsTrigger value="clipper" className="text-xs py-1">
                Studio
              </TabsTrigger>
              <TabsTrigger value="my_clips" className="text-xs py-1">
                My Clips ({savedClips.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {activeTab === "clipper" ? (
        !currentVideo ? (
          /* ========================================================================= */
          /* 1. CLEAN EMPTY STATE: No Fake Demos, Prominent Upload Button               */
          /* ========================================================================= */
          <Card className="border border-dashed border-border shadow-sm p-8 sm:p-12 text-center bg-card">
            <div className="max-w-md mx-auto space-y-4">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-inner">
                <FileVideo className="h-8 w-8" />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-bold text-foreground">
                  Upload a video to start clipping
                </h3>
                <p className="text-xs text-muted-foreground">
                  Select a long-form video (MP4, MOV, or WebM) to scrub through the timeline, crop to 9:16 vertical, and extract viral Reels.
                </p>
              </div>

              {uploadError && (
                <div className="flex items-center justify-center gap-2 p-3 rounded-lg border border-destructive/20 bg-destructive/10 text-destructive text-xs">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {uploadProgress && (
                <div className="flex items-center justify-center gap-2 p-3 rounded-lg border border-primary/20 bg-primary/10 text-primary text-xs">
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  <span>{uploadProgress}</span>
                </div>
              )}

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  size="lg"
                  className="w-full sm:w-auto text-xs font-semibold gap-2 bg-primary text-primary-foreground shadow-md"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading & Probing Video...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Upload Video File (MP4 / MOV)
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={openLibrarySelector}
                  size="lg"
                  className="w-full sm:w-auto text-xs font-semibold gap-2"
                >
                  <FolderOpen className="h-4 w-4 text-primary" />
                  Select from Video Library
                </Button>
              </div>

              <p className="text-[11px] text-muted-foreground pt-2">
                Supported formats: MP4, MOV, WebM • High-definition 1080p / 4K supported
              </p>
            </div>
          </Card>
        ) : (
          /* ========================================================================= */
          /* 2. ACTIVE CLIPPING STUDIO: Real Video, Timeline & FFmpeg Processing        */
          /* ========================================================================= */
          <div className="space-y-6">
            {/* Source Video Telemetry Banner */}
            <div className="p-3 rounded-xl border bg-card flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
              <div className="flex items-center gap-2.5 truncate">
                <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Film className="h-4 w-4" />
                </div>
                <div className="truncate">
                  <span className="font-semibold block truncate text-foreground">{currentVideo.filename}</span>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {formatTimecode(currentVideo.duration)} duration • {currentVideo.resolution} • {currentVideo.size_formatted}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCurrentVideo(null);
                    setLastRenderedClip(null);
                  }}
                  className="h-7 text-[11px] gap-1"
                >
                  <RotateCcw className="h-3 w-3" /> Change Video
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* LEFT 7 COLS: Video Player & Timeline Controls */}
              <div className="lg:col-span-7 space-y-4">
                <Card className="overflow-hidden border shadow-sm">
                  {/* Video Viewport Container */}
                  <div className="relative bg-black flex items-center justify-center min-h-[380px] max-h-[520px] overflow-hidden group">
                    <video
                      ref={videoRef}
                      src={currentVideo.url}
                      onLoadedMetadata={handleLoadedMetadata}
                      onTimeUpdate={() => {
                        if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
                      }}
                      onEnded={() => setIsPlaying(false)}
                      muted={isMuted}
                      playsInline
                      className="max-h-[520px] w-auto max-w-full object-contain"
                    />

                    {/* Visual Crop Framing Guide Overlay */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div
                        className={`border-2 border-dashed border-primary transition-all relative ${
                          aspectRatio === "9:16"
                            ? `h-full aspect-[9/16] shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] ${
                                cropPosition === "top"
                                  ? "self-start"
                                  : cropPosition === "bottom"
                                  ? "self-end"
                                  : "self-center"
                              }`
                            : aspectRatio === "1:1"
                            ? "h-full aspect-square shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]"
                            : "w-full aspect-[16/9]"
                        }`}
                      >
                        {/* Live Headline Overlay Preview */}
                        {subtitleText.trim() && (
                          <div
                            className={`absolute left-0 right-0 p-2 bg-black/80 text-center text-xs font-bold text-amber-300 tracking-wider shadow-md ${
                              subtitlePosition === "top"
                                ? "top-4"
                                : subtitlePosition === "center"
                                ? "top-1/2 -translate-y-1/2"
                                : "bottom-4"
                            }`}
                          >
                            {subtitleText.toUpperCase()}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Floating Play / Pause Overlay Button */}
                    <button
                      type="button"
                      onClick={togglePlay}
                      className="absolute inset-0 m-auto h-14 w-14 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
                    >
                      {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5" />}
                    </button>
                  </div>

                  {/* Timeline Scrubber & In/Out Point Controls */}
                  <div className="p-4 space-y-3 bg-card border-t">
                    {/* Timecode Indicators */}
                    <div className="flex items-center justify-between text-xs font-mono">
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-muted-foreground block">Clip Start:</span>
                        <span className="text-primary font-bold">{formatTimecode(startTime)}</span>
                      </div>

                      <div className="text-center space-y-0.5">
                        <span className="text-[10px] text-muted-foreground block">Playhead:</span>
                        <span className="font-bold text-foreground">{formatTimecode(currentTime)}</span>
                      </div>

                      <div className="text-right space-y-0.5">
                        <span className="text-[10px] text-muted-foreground block">Clip End:</span>
                        <span className="text-primary font-bold">{formatTimecode(endTime)}</span>
                      </div>
                    </div>

                    {/* Playhead Range Slider */}
                    <input
                      type="range"
                      min={0}
                      max={currentVideo.duration || 100}
                      step={0.05}
                      value={currentTime}
                      onChange={(e) => seekTo(parseFloat(e.target.value))}
                      className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                    />

                    {/* Duration Notice Alert if Clamped */}
                    {durationNotice && (
                      <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px] flex items-center gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>{durationNotice}</span>
                      </div>
                    )}

                    {/* Transport & Setting Buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t">
                      <div className="flex items-center gap-1.5">
                        <Button variant="outline" size="sm" onClick={togglePlay} className="h-8 px-2.5 text-xs">
                          {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => seekTo(currentTime - 5)}
                          className="h-8 px-2 text-xs"
                          title="Rewind 5s"
                        >
                          -5s
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => seekTo(currentTime + 5)}
                          className="h-8 px-2 text-xs"
                          title="Forward 5s"
                        >
                          +5s
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsMuted(!isMuted)}
                          className="h-8 px-2 text-xs"
                        >
                          {isMuted ? <VolumeX className="h-3.5 w-3.5 text-destructive" /> : <Volume2 className="h-3.5 w-3.5" />}
                        </Button>
                      </div>

                      {/* Precise In & Out Point Buttons */}
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={setInPoint}
                          className="h-8 text-xs font-semibold gap-1"
                        >
                          [ Set Start ({formatTimecode(currentTime).slice(3, 8)})
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={setOutPoint}
                          className="h-8 text-xs font-semibold gap-1"
                        >
                          Set End ({formatTimecode(currentTime).slice(3, 8)}) ]
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          disabled={isPreviewingClip}
                          onClick={handlePreviewClip}
                          className="h-8 text-xs font-semibold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          {isPreviewingClip ? "Playing..." : "Preview Clip"}
                        </Button>
                      </div>
                    </div>

                    {/* Quick Duration Preset Chips */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-muted-foreground font-medium">Quick Durations:</span>
                        {[15, 30, 60, 90].map((sec) => (
                          <Button
                            key={sec}
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuickDuration(sec)}
                            className="h-6 text-[10px] px-2"
                          >
                            +{sec}s
                          </Button>
                        ))}
                      </div>

                      <Badge variant="outline" className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold border-emerald-500/30 bg-emerald-500/10">
                        Duration: {clipDuration.toFixed(2)}s
                      </Badge>
                    </div>

                    {/* Manual Timestamp Editors */}
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Start Time (Seconds)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          max={currentVideo.duration}
                          value={startTime}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setStartTime(val);
                            seekTo(val);
                          }}
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">End Time (Seconds)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          min="0.1"
                          max={currentVideo.duration}
                          value={endTime}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setEndTime(val);
                          }}
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* RIGHT 5 COLS: Formatting, Cropping, FFmpeg Render & Batch */}
              <div className="lg:col-span-5 space-y-4">
                <Card className="border shadow-sm">
                  <CardHeader className="p-4 border-b">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Sliders className="h-4 w-4 text-primary" />
                      Reel Production Settings
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Configure 9:16 vertical crop position, viral headline, and export quality.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-4 space-y-4">
                    {/* Aspect Ratio Selector */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Aspect Ratio Preset</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: "9:16", label: "9:16 Vertical", desc: "Reels / Shorts" },
                          { id: "16:9", label: "16:9 Wide", desc: "Standard Video" },
                          { id: "1:1", label: "1:1 Square", desc: "Feed Posts" },
                        ].map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => setAspectRatio(preset.id as AspectRatio)}
                            className={`p-2 rounded-lg border text-center transition-all ${
                              aspectRatio === preset.id
                                ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                                : "border-border hover:bg-muted/50 text-muted-foreground"
                            }`}
                          >
                            <span className="block text-xs font-semibold">{preset.label}</span>
                            <span className="text-[9px] opacity-80">{preset.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Vertical Crop Position & Resolution */}
                    <div className="grid grid-cols-2 gap-3">
                      {aspectRatio === "9:16" ? (
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold">Vertical Crop Position</Label>
                          <select
                            value={cropPosition}
                            onChange={(e) => setCropPosition(e.target.value as CropPosition)}
                            className="w-full h-8 text-xs rounded-md border border-input bg-background px-2"
                          >
                            <option value="center">Center (Balanced)</option>
                            <option value="top">Top (Face Focus)</option>
                            <option value="bottom">Bottom (Object Focus)</option>
                          </select>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold">Framing</Label>
                          <div className="h-8 flex items-center px-2 text-xs text-muted-foreground border rounded-md bg-muted/20">
                            Auto Center Fit
                          </div>
                        </div>
                      )}

                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Output Quality</Label>
                        <select
                          value={resolution}
                          onChange={(e) => setResolution(e.target.value as Resolution)}
                          className="w-full h-8 text-xs rounded-md border border-input bg-background px-2"
                        >
                          <option value="1080p">1080p (Full HD)</option>
                          <option value="720p">720p (Fast Render)</option>
                        </select>
                      </div>
                    </div>

                    {/* Viral Hook Headline Text Overlay */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold">Hook Headline (Text Overlay)</Label>
                        <select
                          value={subtitlePosition}
                          onChange={(e: any) => setSubtitlePosition(e.target.value)}
                          className="h-6 text-[10px] rounded border bg-background px-1.5"
                        >
                          <option value="top">Top Banner</option>
                          <option value="center">Center Banner</option>
                          <option value="bottom">Bottom Banner</option>
                        </select>
                      </div>
                      <Input
                        value={subtitleText}
                        onChange={(e) => setSubtitleText(e.target.value)}
                        placeholder="E.g. WAIT FOR THE END 😱"
                        className="h-8 text-xs font-medium"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Burned directly into the video frame by FFmpeg to capture scrolling attention.
                      </p>
                    </div>

                    {/* Title & Caption */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Clip Title</Label>
                      <Input
                        value={clipTitle}
                        onChange={(e) => setClipTitle(e.target.value)}
                        placeholder="Clip Title"
                        className="h-8 text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Post Caption & Hashtags</Label>
                      <textarea
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        rows={2}
                        placeholder="Caption for Facebook & YouTube publishing..."
                        className="w-full rounded-md border border-input bg-background p-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                      />
                    </div>

                    {/* Feedback & Job State Alerts */}
                    {renderError && (
                      <div className="p-3 rounded-lg border border-destructive/20 bg-destructive/10 text-destructive text-xs space-y-1">
                        <div className="flex items-center gap-1.5 font-semibold">
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          <span>Rendering Error</span>
                        </div>
                        <p className="text-[11px]">{renderError}</p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleRenderSingleClip}
                          className="h-6 text-[10px] mt-1 text-destructive"
                        >
                          <RotateCcw className="h-3 w-3 mr-1" /> Retry Render
                        </Button>
                      </div>
                    )}

                    {renderNotice && (
                      <div className="p-3 rounded-lg border border-primary/20 bg-primary/10 text-primary text-xs flex items-start gap-2">
                        {renderStatus === "processing" ? (
                          <Loader2 className="h-4 w-4 animate-spin shrink-0 mt-0.5" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                        )}
                        <span>{renderNotice}</span>
                      </div>
                    )}

                    {/* Primary Action Buttons */}
                    <div className="space-y-2 pt-2 border-t">
                      <Button
                        onClick={handleRenderSingleClip}
                        disabled={renderStatus === "processing" || clipDuration <= 0}
                        className="w-full h-9 text-xs font-semibold gap-2 bg-primary text-primary-foreground shadow"
                      >
                        {renderStatus === "processing" ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Rendering {aspectRatio} Clip with FFmpeg...
                          </>
                        ) : (
                          <>
                            <Scissors className="h-4 w-4" />
                            Render Actual Video Clip ({clipDuration.toFixed(1)}s)
                          </>
                        )}
                      </Button>

                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleAddToBatch}
                          className="h-8 text-xs gap-1"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add to Batch ({clipBatch.length})
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setActiveClipForQueue({
                              id: lastRenderedClip?.id || `clip_${Date.now()}`,
                              title: clipTitle,
                              caption,
                              videoUrl: lastRenderedClip?.url || currentVideo.url,
                              aspectRatio,
                              duration: clipDuration,
                            });
                            setQueueModalOpen(true);
                          }}
                          className="h-8 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10 font-semibold"
                        >
                          <Send className="h-3.5 w-3.5" />
                          Publish / Schedule
                        </Button>
                      </div>

                      {/* Download Section for Finished Clip */}
                      {lastRenderedClip && (
                        <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 space-y-2">
                          <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-300 font-semibold">
                            <span>Ready to Download or Share:</span>
                            <span>{lastRenderedClip.duration.toFixed(1)}s MP4</span>
                          </div>
                          <Button
                            variant="secondary"
                            onClick={() => downloadRenderedVideo(lastRenderedClip.url, lastRenderedClip.title)}
                            className="w-full h-8 text-xs gap-2 font-semibold text-emerald-600 dark:text-emerald-400 bg-background hover:bg-emerald-500/10 border"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Download Rendered MP4
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Batch Clipping Drawer */}
                {clipBatch.length > 0 && (
                  <Card className="border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Layers className="h-4 w-4 text-primary" />
                        Batch Clips ({clipBatch.length})
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          onClick={handleRenderAllBatch}
                          className="h-6 text-[10px] bg-primary font-semibold"
                        >
                          Render All Batch
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setClipBatch([])}
                          className="h-6 text-[10px] text-destructive hover:bg-destructive/10"
                        >
                          Clear
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {clipBatch.map((c, i) => (
                        <div
                          key={c.id}
                          className="p-2.5 rounded-lg border bg-muted/30 text-xs flex items-center justify-between gap-2"
                        >
                          <div className="truncate space-y-0.5">
                            <span className="font-semibold block truncate text-foreground">
                              {i + 1}. {c.title}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {formatTimecode(c.startTime).slice(3, 8)} → {formatTimecode(c.endTime).slice(3, 8)} ({c.duration.toFixed(1)}s) • {c.aspectRatio}
                            </span>
                            {c.status === "completed" && (
                              <Badge variant="outline" className="text-[9px] text-emerald-600 border-emerald-500/30">
                                Completed
                              </Badge>
                            )}
                            {c.status === "processing" && (
                              <span className="text-[9px] text-primary flex items-center gap-1">
                                <Loader2 className="h-2.5 w-2.5 animate-spin" /> Rendering...
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {c.renderedUrl ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => downloadRenderedVideo(c.renderedUrl!, c.title)}
                                className="h-7 px-2 text-[10px] text-emerald-600"
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                            ) : null}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setActiveClipForQueue({
                                  id: c.id,
                                  title: c.title,
                                  caption: c.caption,
                                  videoUrl: c.renderedUrl || currentVideo.url,
                                  aspectRatio: c.aspectRatio,
                                  duration: c.duration,
                                });
                                setQueueModalOpen(true);
                              }}
                              className="h-7 px-2 text-[10px] text-primary"
                            >
                              <Send className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setClipBatch((prev) => prev.filter((item) => item.id !== c.id))}
                              className="h-7 px-1.5 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            </div>
          </div>
        )
      ) : (
        /* ========================================================================= */
        /* 3. MY CLIPS REPOSITORY (SAVED IN SUPABASE STORAGE & DATABASE)             */
        /* ========================================================================= */
        <Card className="border">
          <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Bookmark className="h-4 w-4 text-primary" />
                Saved Clips Library
              </CardTitle>
              <CardDescription className="text-xs">
                Real rendered clips stored in Supabase Storage and registered in your Video Library.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchSavedClips}
              disabled={loadingSavedClips}
              className="h-8 text-xs gap-1.5"
            >
              {loadingSavedClips ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
              Refresh
            </Button>
          </CardHeader>

          <CardContent className="p-4">
            {loadingSavedClips ? (
              <div className="py-12 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Loading saved clips...
              </div>
            ) : savedClips.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <Scissors className="h-8 w-8 text-muted-foreground/50 mx-auto" />
                <p className="text-xs font-semibold text-foreground">No Processed Clips Yet</p>
                <p className="text-[11px] text-muted-foreground">
                  Upload a video in the Studio tab and render your first 9:16 vertical Reel.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {savedClips.map((clip) => (
                  <div
                    key={clip.id}
                    className="rounded-xl border bg-card p-3 space-y-3 hover:border-primary/50 transition-colors shadow-sm flex flex-col justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-xs text-foreground truncate block">
                          {clip.clip_title}
                        </span>
                        <Badge variant="outline" className="text-[9px] shrink-0 font-mono">
                          {clip.aspect_ratio}
                        </Badge>
                      </div>

                      <div className="aspect-[9/16] bg-black rounded-lg overflow-hidden flex items-center justify-center relative">
                        <video
                          src={clip.exported_url || clip.source_video_url}
                          controls
                          className="h-full w-full object-cover"
                        />
                      </div>

                      <div className="text-[10px] text-muted-foreground space-y-0.5 pt-1">
                        <div className="flex justify-between">
                          <span>Duration:</span>
                          <span className="font-mono font-medium text-foreground">{clip.duration}s</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Source:</span>
                          <span className="truncate max-w-[120px]">{clip.source_video_name || "Uploaded Video"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 pt-2 border-t">
                      <Button
                        size="sm"
                        onClick={() => {
                          setActiveClipForQueue({
                            id: clip.id,
                            title: clip.clip_title,
                            caption: clip.caption,
                            videoUrl: clip.exported_url || clip.source_video_url,
                            aspectRatio: clip.aspect_ratio,
                            duration: clip.duration,
                          });
                          setQueueModalOpen(true);
                        }}
                        className="flex-1 h-7 text-[11px] gap-1 bg-primary text-primary-foreground font-semibold"
                      >
                        <Send className="h-3 w-3" />
                        Publish
                      </Button>

                      {clip.exported_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadRenderedVideo(clip.exported_url!, clip.clip_title)}
                          className="h-7 px-2 text-foreground"
                          title="Download MP4"
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          await fetch(`/api/clipper?id=${clip.id}`, { method: "DELETE" });
                          setSavedClips((prev) => prev.filter((c) => c.id !== clip.id));
                        }}
                        className="h-7 px-2 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Select from Video Library Modal */}
      {libraryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="space-y-0.5">
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-primary" />
                  Select Video from Library
                </h3>
                <p className="text-xs text-muted-foreground">
                  Pick an existing video from your library to open in the Video Clipper.
                </p>
              </div>
              <button
                onClick={() => setLibraryModalOpen(false)}
                className="rounded-full p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {loadingLibrary ? (
                <div className="py-12 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" /> Loading videos...
                </div>
              ) : libraryVideos.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No videos found in your library. Please upload a new video.
                </div>
              ) : (
                libraryVideos.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => selectLibraryVideo(v)}
                    className="w-full p-3 rounded-xl border text-left text-xs hover:border-primary/50 transition-all flex items-center justify-between gap-3 bg-muted/20"
                  >
                    <div className="truncate space-y-0.5">
                      <span className="font-semibold block truncate text-foreground">{v.title}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {v.duration_seconds ? `${v.duration_seconds}s` : "30s"} • {v.resolution || "1080p"}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      Open in Clipper
                    </Badge>
                  </button>
                ))
              )}
            </div>

            <div className="pt-2 border-t flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setLibraryModalOpen(false)} className="text-xs">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Send to Publishing Queue Modal */}
      <SendToQueueModal
        isOpen={queueModalOpen}
        onClose={() => setQueueModalOpen(false)}
        clip={activeClipForQueue}
        onSuccess={() => {
          fetchSavedClips();
        }}
      />
    </div>
  );
}
