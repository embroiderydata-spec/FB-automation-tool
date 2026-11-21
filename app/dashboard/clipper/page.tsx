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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SendToQueueModal } from "@/components/clipper/send-to-queue-modal";
import { AspectRatio, Resolution, VideoClipRecord } from "@/lib/clipper/types";

// High-quality public demo video samples for instant zero-wait testing
const SAMPLE_VIDEOS = [
  {
    name: "Nature Drone Footage (4K Landscape)",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  },
  {
    name: "Tech & City Lights (HD 60fps)",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
  },
  {
    name: "Action & Movement Sample",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  },
];

export default function VideoClipperPage() {
  const [activeTab, setActiveTab] = useState<"clipper" | "my_clips">("clipper");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Source Video State
  const [sourceVideoUrl, setSourceVideoUrl] = useState<string>(SAMPLE_VIDEOS[0].url);
  const [sourceVideoName, setSourceVideoName] = useState<string>(SAMPLE_VIDEOS[0].name);
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);

  // Clipping In/Out Points (in seconds)
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(30);
  const clipDuration = Math.max(0, endTime - startTime);

  // Clip Configuration
  const [clipTitle, setClipTitle] = useState<string>("Viral Hook Reel");
  const [caption, setCaption] = useState<string>("#reels #viral #trending");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("9:16");
  const [resolution, setResolution] = useState<Resolution>("1080p");
  const [subtitleText, setSubtitleText] = useState<string>("WAIT FOR THE SURPRISE 😱");
  const [subtitlePosition, setSubtitlePosition] = useState<"top" | "center" | "bottom">("top");

  // Multi-clip list extracted from this source
  const [clipQueue, setClipQueue] = useState<Array<{
    id: string;
    title: string;
    startTime: number;
    endTime: number;
    duration: number;
    aspectRatio: AspectRatio;
    subtitleText: string;
    caption: string;
  }>>([]);

  // Rendering & Export State
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [renderProgress, setRenderProgress] = useState<number>(0);
  const [exportedBlobUrl, setExportedBlobUrl] = useState<string | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Saved Clips Library State
  const [savedClips, setSavedClips] = useState<VideoClipRecord[]>([]);
  const [loadingClips, setLoadingClips] = useState<boolean>(false);

  // Modal State
  const [queueModalOpen, setQueueModalOpen] = useState<boolean>(false);
  const [activeClipForQueue, setActiveClipForQueue] = useState<any>(null);

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

  // Load Saved Clips on mount
  useEffect(() => {
    fetchSavedClips();
  }, []);

  async function fetchSavedClips() {
    setLoadingClips(true);
    try {
      const res = await fetch("/api/clipper");
      if (res.ok) {
        const data = await res.json();
        setSavedClips(data.clips || []);
      }
    } catch {}
    finally {
      setLoadingClips(false);
    }
  }

  // Handle Video Metadata Loaded
  function handleLoadedMetadata() {
    if (videoRef.current) {
      const vidDur = videoRef.current.duration;
      setDuration(vidDur);
      setStartTime(0);
      setEndTime(Math.min(30, Number(vidDur.toFixed(2))));
    }
  }

  // Handle Time Update
  function handleTimeUpdate() {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  }

  // Toggle Play / Pause
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

  // Seek to specific time
  function seekTo(timeInSeconds: number) {
    if (!videoRef.current) return;
    const clamped = Math.max(0, Math.min(timeInSeconds, duration));
    videoRef.current.currentTime = clamped;
    setCurrentTime(clamped);
  }

  // Set In-Point to current playhead
  function setInPoint() {
    const rounded = Number(currentTime.toFixed(2));
    if (rounded >= endTime) {
      setEndTime(Math.min(duration, rounded + 15));
    }
    setStartTime(rounded);
  }

  // Set Out-Point to current playhead
  function setOutPoint() {
    const rounded = Number(currentTime.toFixed(2));
    if (rounded <= startTime) {
      setStartTime(Math.max(0, rounded - 15));
    }
    setEndTime(rounded);
  }

  // Preview only the clipped region
  function previewClip() {
    if (!videoRef.current) return;
    videoRef.current.currentTime = startTime;
    videoRef.current.play();
    setIsPlaying(true);

    const checkInterval = setInterval(() => {
      if (!videoRef.current) {
        clearInterval(checkInterval);
        return;
      }
      if (videoRef.current.currentTime >= endTime || videoRef.current.paused) {
        videoRef.current.pause();
        setIsPlaying(false);
        clearInterval(checkInterval);
      }
    }, 100);
  }

  // Handle Local File Upload
  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const localUrl = URL.createObjectURL(file);
    setSourceVideoUrl(localUrl);
    setSourceVideoName(file.name);
    setClipTitle(file.name.replace(/\.[^/.]+$/, "") + " - Reel");
    setUploading(false);
  }

  // Add Current Clip to Multi-Clip Queue
  function handleAddClipToQueue() {
    const newClip = {
      id: `clip_${Date.now()}`,
      title: clipTitle || `Clip ${clipQueue.length + 1}`,
      startTime,
      endTime,
      duration: clipDuration,
      aspectRatio,
      subtitleText,
      caption,
    };
    setClipQueue((prev) => [...prev, newClip]);
    setExportNotice(`Added "${newClip.title}" to clip batch!`);
    setTimeout(() => setExportNotice(null), 3000);
  }

  // Client-Side Canvas Trimming & 9:16 Vertical Cropping Pipeline
  async function handleExportClip() {
    const video = videoRef.current;
    if (!video) return;

    setIsRendering(true);
    setRenderProgress(10);
    setExportNotice("Initializing 9:16 vertical render canvas...");

    try {
      // Dimensions according to aspect ratio
      let targetWidth = 1080;
      let targetHeight = 1920;
      if (aspectRatio === "16:9") {
        targetWidth = 1920;
        targetHeight = 1080;
      } else if (aspectRatio === "1:1") {
        targetWidth = 1080;
        targetHeight = 1080;
      }

      if (resolution === "720p") {
        targetWidth = Math.round(targetWidth * 0.667);
        targetHeight = Math.round(targetHeight * 0.667);
      }

      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("Unable to initialize 2D rendering context.");
      }

      // Check MediaRecorder support
      const stream = canvas.captureStream(30); // 30 FPS
      let mimeType = "video/webm;codecs=vp9";
      if (MediaRecorder.isTypeSupported("video/mp4;codecs=avc1")) {
        mimeType = "video/mp4;codecs=avc1";
      } else if (MediaRecorder.isTypeSupported("video/webm;codecs=h264")) {
        mimeType = "video/webm;codecs=h264";
      } else if (MediaRecorder.isTypeSupported("video/webm")) {
        mimeType = "video/webm";
      }

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 5000000, // 5 Mbps
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      // Set playback to start time
      video.currentTime = startTime;
      await new Promise((r) => setTimeout(r, 200));

      recorder.start();
      video.play();
      setIsPlaying(true);

      const totalClipSeconds = endTime - startTime;

      await new Promise<void>((resolve, reject) => {
        const renderFrame = () => {
          if (!video || video.paused || video.currentTime >= endTime) {
            recorder.stop();
            video.pause();
            setIsPlaying(false);
            resolve();
            return;
          }

          const currentElapsed = video.currentTime - startTime;
          const pct = Math.min(95, Math.round((currentElapsed / totalClipSeconds) * 100));
          setRenderProgress(pct);
          setExportNotice(`Encoding ${aspectRatio} Reel frame by frame (${pct}%)...`);

          // Calculate center-crop aspect ratio fit
          const videoAspect = video.videoWidth / video.videoHeight;
          const targetAspect = targetWidth / targetHeight;

          let sx = 0, sy = 0, sWidth = video.videoWidth, sHeight = video.videoHeight;
          if (videoAspect > targetAspect) {
            // Video is wider than target -> crop sides
            sWidth = video.videoHeight * targetAspect;
            sx = (video.videoWidth - sWidth) / 2;
          } else {
            // Video is taller than target -> crop top/bottom
            sHeight = video.videoWidth / targetAspect;
            sy = (video.videoHeight - sHeight) / 2;
          }

          // Draw cropped video frame
          ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);

          // Draw headline / subtitle text overlay
          if (subtitleText.trim()) {
            ctx.save();
            ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
            const textY = subtitlePosition === "top" ? targetHeight * 0.15 : subtitlePosition === "center" ? targetHeight * 0.5 : targetHeight * 0.82;
            const bannerHeight = targetHeight * 0.08;
            ctx.fillRect(0, textY - bannerHeight / 2, targetWidth, bannerHeight);

            ctx.font = `bold ${Math.round(targetWidth * 0.055)}px system-ui, sans-serif`;
            ctx.fillStyle = "#FFDD00"; // Viral yellow
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
            ctx.shadowBlur = 8;
            ctx.fillText(subtitleText.toUpperCase(), targetWidth / 2, textY);
            ctx.restore();
          }

          requestAnimationFrame(renderFrame);
        };

        requestAnimationFrame(renderFrame);
      });

      // Finish recording and create export blob
      await new Promise<void>((resolve) => {
        recorder.onstop = () => {
          const finalBlob = new Blob(chunks, { type: mimeType });
          const blobUrl = URL.createObjectURL(finalBlob);
          setExportedBlobUrl(blobUrl);
          setRenderProgress(100);
          setExportNotice("Export Complete! Video ready for download or publishing.");
          resolve();
        };
      });

      // Save to backend database
      await fetch("/api/clipper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_video_url: sourceVideoUrl,
          source_video_name: sourceVideoName,
          clip_title: clipTitle,
          caption,
          start_time: startTime,
          end_time: endTime,
          duration: clipDuration,
          aspect_ratio: aspectRatio,
          resolution,
          subtitle_text: subtitleText,
          exported_url: sourceVideoUrl,
        }),
      });

      fetchSavedClips();
    } catch (err: any) {
      setExportNotice(`Export failed: ${err.message}`);
    } finally {
      setIsRendering(false);
    }
  }

  // Trigger Immediate Browser Download
  function downloadExportedVideo() {
    if (!exportedBlobUrl) return;
    const a = document.createElement("a");
    a.href = exportedBlobUrl;
    a.download = `${clipTitle.toLowerCase().replace(/[^a-z0-9]/g, "-")}-9x16.mp4`;
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
            <Badge variant="default" className="text-[10px] bg-primary font-semibold">
              9:16 Vertical Engine
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Extract viral short clips, auto-crop into 9:16 vertical Reels/Shorts, add dynamic headline overlays, and publish to Facebook & YouTube in 1 click.
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT 7 COLS: Video Player, Scrubber & Visual In/Out Framing */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="overflow-hidden border shadow-sm">
              <CardHeader className="p-3 bg-muted/40 border-b flex flex-row items-center justify-between">
                <div className="flex items-center gap-2 truncate">
                  <Film className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-xs font-semibold truncate text-foreground">
                    {sourceVideoName}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {formatTimecode(currentTime)} / {formatTimecode(duration)}
                  </Badge>
                </div>
              </CardHeader>

              {/* Video Player Display Container */}
              <div className="relative bg-black flex items-center justify-center min-h-[360px] max-h-[500px] overflow-hidden group">
                <video
                  ref={videoRef}
                  src={sourceVideoUrl}
                  crossOrigin="anonymous"
                  onLoadedMetadata={handleLoadedMetadata}
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={() => setIsPlaying(false)}
                  muted={isMuted}
                  playsInline
                  className="max-h-[500px] w-auto max-w-full object-contain"
                />

                {/* Aspect Ratio Framing Guides */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div
                    className={`border-2 border-dashed border-primary/70 transition-all ${
                      aspectRatio === "9:16"
                        ? "h-full aspect-[9/16] shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"
                        : aspectRatio === "1:1"
                        ? "h-full aspect-square shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"
                        : "w-full aspect-[16/9]"
                    }`}
                  >
                    {/* Live Headline Overlay Preview */}
                    {subtitleText.trim() && (
                      <div
                        className={`absolute left-0 right-0 p-2 bg-black/75 text-center text-xs font-bold text-amber-300 tracking-wider shadow-md ${
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

              {/* Player Scrubber & Timeline Controls */}
              <div className="p-4 space-y-3 bg-card border-t">
                {/* Timeline Range Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                    <span className="text-primary font-semibold">Start: {formatTimecode(startTime)}</span>
                    <span className="text-emerald-500 font-semibold font-mono">
                      Clip Duration: {clipDuration.toFixed(2)}s
                    </span>
                    <span className="text-primary font-semibold">End: {formatTimecode(endTime)}</span>
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    step={0.05}
                    value={currentTime}
                    onChange={(e) => seekTo(parseFloat(e.target.value))}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>

                {/* Transport & In/Out Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
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
                      onClick={previewClip}
                      className="h-8 text-xs font-semibold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Preview Clip
                    </Button>
                  </div>
                </div>

                {/* Duration Presets */}
                <div className="flex items-center gap-2 pt-2 border-t text-xs">
                  <span className="text-[11px] text-muted-foreground font-medium">Quick Durations:</span>
                  {[15, 30, 60, 90].map((sec) => (
                    <Button
                      key={sec}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newEnd = Math.min(duration, startTime + sec);
                        setEndTime(Number(newEnd.toFixed(2)));
                      }}
                      className="h-6 text-[10px] px-2"
                    >
                      +{sec}s
                    </Button>
                  ))}
                </div>
              </div>
            </Card>

            {/* Video Source Switcher */}
            <Card className="border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">Choose Video Source</span>
                <label className="cursor-pointer">
                  <Input
                    type="file"
                    accept="video/mp4,video/quicktime,video/webm"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
                    <Upload className="h-3.5 w-3.5" />
                    Upload Local Video (MP4 / MOV)
                  </div>
                </label>
              </div>

              {/* Sample Videos */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {SAMPLE_VIDEOS.map((sample) => (
                  <button
                    key={sample.name}
                    type="button"
                    onClick={() => {
                      setSourceVideoUrl(sample.url);
                      setSourceVideoName(sample.name);
                    }}
                    className={`p-2 rounded-lg border text-left text-xs transition-all ${
                      sourceVideoUrl === sample.url
                        ? "border-primary bg-primary/10 text-primary font-semibold"
                        : "border-border hover:bg-muted/50 text-muted-foreground"
                    }`}
                  >
                    <span className="block truncate">{sample.name}</span>
                    <span className="text-[10px] opacity-75">Instant Preview</span>
                  </button>
                ))}
              </div>
            </Card>
          </div>

          {/* RIGHT 5 COLS: Formatting, Headline, Export & Publishing */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="border shadow-sm">
              <CardHeader className="p-4 border-b">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Clip Formatting & Production
                </CardTitle>
                <CardDescription className="text-xs">
                  Format for 9:16 vertical Reels & Shorts, add hook headline, and export.
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
                        className={`p-2.5 rounded-lg border text-center transition-all ${
                          aspectRatio === preset.id
                            ? "border-primary bg-primary/10 text-primary font-bold shadow-sm"
                            : "border-border hover:bg-muted/50 text-muted-foreground"
                        }`}
                      >
                        <span className="block text-xs font-semibold">{preset.label}</span>
                        <span className="text-[9px] opacity-80">{preset.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Resolution & Quality */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Resolution</Label>
                    <select
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value as Resolution)}
                      className="w-full h-8 text-xs rounded-md border border-input bg-background px-2"
                    >
                      <option value="1080p">1080p (Full HD)</option>
                      <option value="720p">720p (Fast Render)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Overlay Position</Label>
                    <select
                      value={subtitlePosition}
                      onChange={(e) => setSubtitlePosition(e.target.value as any)}
                      className="w-full h-8 text-xs rounded-md border border-input bg-background px-2"
                    >
                      <option value="top">Top (Recommended)</option>
                      <option value="center">Center</option>
                      <option value="bottom">Bottom</option>
                    </select>
                  </div>
                </div>

                {/* Viral Headline / Hook Text Overlay */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Hook Headline / Subtitle Overlay</Label>
                  <Input
                    value={subtitleText}
                    onChange={(e) => setSubtitleText(e.target.value)}
                    placeholder="E.g. WAIT FOR THE END 😱"
                    className="h-8 text-xs font-medium"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Burned onto the exported video frame to capture scrolling viewer attention.
                  </p>
                </div>

                {/* Clip Title & Caption */}
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

                {/* Render Progress or Export Notice */}
                {exportNotice && (
                  <div className="p-3 rounded-lg border border-primary/20 bg-primary/10 text-primary text-xs flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{exportNotice}</span>
                  </div>
                )}

                {isRendering && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] font-medium">
                      <span>Encoding 9:16 Video</span>
                      <span>{renderProgress}%</span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${renderProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Primary Action Buttons */}
                <div className="space-y-2 pt-2 border-t">
                  <Button
                    onClick={handleExportClip}
                    disabled={isRendering}
                    className="w-full h-9 text-xs font-semibold gap-2 bg-primary text-primary-foreground shadow"
                  >
                    {isRendering ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Rendering Clip ({renderProgress}%)...
                      </>
                    ) : (
                      <>
                        <Scissors className="h-4 w-4" />
                        Render 9:16 Clip ({clipDuration.toFixed(1)}s)
                      </>
                    )}
                  </Button>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddClipToQueue}
                      className="h-8 text-xs gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add to Batch ({clipQueue.length})
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setActiveClipForQueue({
                          id: `clip_${Date.now()}`,
                          title: clipTitle,
                          caption,
                          videoUrl: exportedBlobUrl || sourceVideoUrl,
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

                  {exportedBlobUrl && (
                    <Button
                      variant="secondary"
                      onClick={downloadExportedVideo}
                      className="w-full h-8 text-xs gap-2 font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download Exported MP4
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Extracted Clip Batch Drawer */}
            {clipQueue.length > 0 && (
              <Card className="border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-primary" />
                    Clip Batch ({clipQueue.length})
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setClipQueue([])}
                    className="h-6 text-[10px] text-destructive hover:bg-destructive/10"
                  >
                    Clear All
                  </Button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {clipQueue.map((c, i) => (
                    <div
                      key={c.id}
                      className="p-2.5 rounded-lg border bg-muted/30 text-xs flex items-center justify-between gap-2"
                    >
                      <div className="truncate space-y-0.5">
                        <span className="font-semibold block truncate text-foreground">
                          {i + 1}. {c.title}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {c.startTime.toFixed(1)}s → {c.endTime.toFixed(1)}s ({c.duration.toFixed(1)}s) • {c.aspectRatio}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setActiveClipForQueue({
                              id: c.id,
                              title: c.title,
                              caption: c.caption,
                              videoUrl: sourceVideoUrl,
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
                          onClick={() => setClipQueue((prev) => prev.filter((item) => item.id !== c.id))}
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
      ) : (
        /* TAB 2: MY CLIPS REPOSITORY */
        <Card className="border">
          <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Bookmark className="h-4 w-4 text-primary" />
                Saved Clips Library
              </CardTitle>
              <CardDescription className="text-xs">
                Previously extracted video clips saved in your Supabase workspace.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchSavedClips}
              disabled={loadingClips}
              className="h-8 text-xs gap-1.5"
            >
              {loadingClips ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
              Refresh
            </Button>
          </CardHeader>

          <CardContent className="p-4">
            {loadingClips ? (
              <div className="py-12 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Loading saved clips...
              </div>
            ) : savedClips.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <Scissors className="h-8 w-8 text-muted-foreground/50 mx-auto" />
                <p className="text-xs font-semibold text-foreground">No Clips Generated Yet</p>
                <p className="text-[11px] text-muted-foreground">
                  Use the Studio tab to extract 9:16 vertical clips from your videos.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {savedClips.map((clip) => (
                  <div
                    key={clip.id}
                    className="rounded-xl border bg-card p-3 space-y-3 hover:border-primary/50 transition-colors shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-xs text-foreground truncate block">
                        {clip.clip_title}
                      </span>
                      <Badge variant="outline" className="text-[9px] shrink-0">
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

                    <div className="text-[10px] text-muted-foreground space-y-0.5">
                      <div className="flex justify-between">
                        <span>Duration:</span>
                        <span className="font-mono font-medium text-foreground">{clip.duration}s</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Source:</span>
                        <span className="truncate max-w-[120px]">{clip.source_video_name || "Custom Video"}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t">
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

      {/* Send to Queue Modal */}
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
