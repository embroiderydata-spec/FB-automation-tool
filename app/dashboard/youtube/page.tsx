"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Youtube,
  Upload,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Trash2,
  RefreshCw,
  Plus,
  Play,
  Pause,
  Film,
  FolderOpen,
  Scissors,
  Share2,
  Clock,
  ShieldCheck,
  Check,
  X,
  Loader2,
  Tag,
  Info,
  SlidersHorizontal,
  ChevronRight,
  Eye,
  FileVideo,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ConnectedChannel {
  id: string;
  channel_id: string;
  channel_title: string;
  channel_custom_url?: string;
  thumbnail_url?: string;
  subscriber_count: number;
  video_count: number;
  is_connected: boolean;
}

interface UploadHistoryItem {
  id: string;
  channel_id: string;
  channel_title?: string;
  youtube_video_id: string;
  video_url: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  privacy_status: "public" | "unlisted" | "private";
  category_id?: string;
  is_short: boolean;
  tags?: string[];
  status: "uploaded" | "processing" | "failed";
  error_message?: string;
  created_at: string;
}

const CATEGORIES = [
  { id: "22", name: "People & Blogs (Default)" },
  { id: "24", name: "Entertainment" },
  { id: "28", name: "Science & Technology" },
  { id: "27", name: "Education" },
  { id: "23", name: "Comedy" },
  { id: "20", name: "Gaming" },
  { id: "26", name: "Howto & Style" },
  { id: "10", name: "Music" },
  { id: "25", name: "News & Politics" },
  { id: "17", name: "Sports" },
];

function YouTubeStudioContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const successParam = searchParams.get("youtube_success");
  const errorParam = searchParams.get("youtube_error");

  // Tab State
  const [activeTab, setActiveTab] = useState<"upload" | "history">("upload");

  // Channel Account State
  const [channels, setChannels] = useState<ConnectedChannel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string>("");
  const [loadingChannels, setLoadingChannels] = useState<boolean>(true);
  const [isOAuthConfigured, setIsOAuthConfigured] = useState<boolean>(false);
  const [authUrl, setAuthUrl] = useState<string | null>(null);

  // Video File & Form State
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [selectedLibraryVideo, setSelectedLibraryVideo] = useState<any | null>(null);

  // Metadata Form Fields
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [tags, setTags] = useState<string>("shorts, viral, reels, youtube");
  const [categoryId, setCategoryId] = useState<string>("22");
  const [privacyStatus, setPrivacyStatus] = useState<"public" | "unlisted" | "private">("public");
  const [madeForKids, setMadeForKids] = useState<boolean>(false);
  const [isShort, setIsShort] = useState<boolean>(true);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

  // Upload Status & Progress
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatusText, setUploadStatusText] = useState<string>("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<{ videoId: string; videoUrl: string } | null>(null);

  // Upload History State
  const [uploadHistory, setUploadHistory] = useState<UploadHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // Library / Clipper Selector Modal
  const [libraryModalOpen, setLibraryModalOpen] = useState<boolean>(false);
  const [libraryVideos, setLibraryVideos] = useState<any[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const thumbnailInputRef = useRef<HTMLInputElement | null>(null);
  const videoPlayerRef = useRef<HTMLVideoElement | null>(null);

  // Load Channels and History on mount
  useEffect(() => {
    loadConnectedChannels();
    loadUploadHistory();
  }, []);

  async function loadConnectedChannels() {
    setLoadingChannels(true);
    try {
      const res = await fetch("/api/youtube/channels");
      const data = await res.json();
      if (data.accounts) {
        setChannels(data.accounts);
        if (data.accounts.length > 0 && !selectedChannelId) {
          setSelectedChannelId(data.accounts[0].channel_id);
        }
      }
      setIsOAuthConfigured(!!data.isConfigured);
      setAuthUrl(data.authUrl);
    } catch (err) {
      console.error("Failed to fetch YouTube accounts:", err);
    } finally {
      setLoadingChannels(false);
    }
  }

  async function loadUploadHistory() {
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/youtube/history");
      const data = await res.json();
      if (data.uploads) {
        setUploadHistory(data.uploads);
      }
    } catch (err) {
      console.error("Failed to fetch YouTube upload history:", err);
    } finally {
      setLoadingHistory(false);
    }
  }

  // Handle Video File Selection
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setVideoFile(file);
    setSelectedLibraryVideo(null);
    const objUrl = URL.createObjectURL(file);
    setVideoPreviewUrl(objUrl);

    // Auto-fill title if empty
    if (!title) {
      const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      setTitle(cleanName.slice(0, 95));
    }

    setUploadError(null);
    setUploadSuccess(null);
  }

  // Handle Video Metadata Loaded
  function handleVideoLoadedMetadata(e: React.SyntheticEvent<HTMLVideoElement>) {
    const vid = e.currentTarget;
    setVideoDuration(vid.duration);
    // If vertical (height > width) or duration <= 60, default isShort to true
    if (vid.videoHeight > vid.videoWidth || vid.duration <= 60) {
      setIsShort(true);
    }
  }

  // Handle Thumbnail Selection
  function handleThumbnailSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setThumbnailFile(file);
    setThumbnailPreview(URL.createObjectURL(file));
  }

  // Open Library Video Selector
  async function openVideoLibrary() {
    setLibraryModalOpen(true);
    setLoadingLibrary(true);
    try {
      const [resVideos, resClips] = await Promise.all([
        fetch("/api/video/library").then((r) => r.json()).catch(() => ({ videos: [] })),
        fetch("/api/clipper").then((r) => r.json()).catch(() => ({ clips: [] })),
      ]);

      const combined = [
        ...(resClips.clips || []).map((c: any) => ({
          id: c.id,
          title: c.clip_title || "Processed Clip",
          video_url: c.exported_url || c.source_video_url,
          duration: c.duration,
          isClip: true,
        })),
        ...(resVideos.videos || []).map((v: any) => ({
          id: v.id,
          title: v.title,
          video_url: v.video_url || v.storage_path,
          duration: v.duration_seconds,
          isClip: false,
        })),
      ];

      setLibraryVideos(combined);
    } catch (err) {
      console.error("Failed to load library videos:", err);
    } finally {
      setLoadingLibrary(false);
    }
  }

  function handleSelectFromLibrary(video: any) {
    setSelectedLibraryVideo(video);
    setVideoFile(null);
    setVideoPreviewUrl(video.video_url);
    if (!title) {
      setTitle(video.title?.slice(0, 95) || "YouTube Video");
    }
    setLibraryModalOpen(false);
  }

  // Disconnect Channel
  async function handleDisconnectChannel(channelId: string) {
    if (!confirm("Are you sure you want to disconnect this YouTube channel?")) return;
    try {
      const res = await fetch(`/api/youtube/channels?channel_id=${channelId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setChannels((prev) => prev.filter((c) => c.channel_id !== channelId));
        if (selectedChannelId === channelId) {
          setSelectedChannelId("");
        }
      }
    } catch (err) {
      console.error("Failed to disconnect YouTube channel:", err);
    }
  }

  // Submit Video Upload
  async function handleUploadToYouTube(e: React.FormEvent) {
    e.preventDefault();

    if (!videoFile && !selectedLibraryVideo) {
      setUploadError("Please select a video file or choose a video from your library.");
      return;
    }

    if (!title.trim()) {
      setUploadError("Please provide a title for the YouTube video.");
      return;
    }

    if (channels.length === 0) {
      setUploadError("Please connect your YouTube channel before uploading.");
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);
    setUploadProgress(15);
    setUploadStatusText("Initializing Google OAuth 2.0 authorization & refreshing token...");

    try {
      const formData = new FormData();
      formData.append("channel_id", selectedChannelId || channels[0].channel_id);
      formData.append("title", title.trim());
      formData.append("description", description.trim());
      formData.append("tags", tags);
      formData.append("category_id", categoryId);
      formData.append("privacy_status", privacyStatus);
      formData.append("made_for_kids", madeForKids ? "true" : "false");
      formData.append("is_short", isShort ? "true" : "false");

      if (videoFile) {
        formData.append("video", videoFile);
      } else if (selectedLibraryVideo) {
        formData.append("video_url", selectedLibraryVideo.video_url);
      }

      if (thumbnailFile) {
        formData.append("thumbnail", thumbnailFile);
      }

      // Progress animation
      setTimeout(() => {
        setUploadProgress(45);
        setUploadStatusText("Uploading video stream via YouTube Data API v3 resumable endpoint...");
      }, 1500);

      setTimeout(() => {
        setUploadProgress(85);
        setUploadStatusText("Confirming video ID with YouTube and setting privacy status...");
      }, 3500);

      const res = await fetch("/api/youtube/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "YouTube upload failed.");
      }

      setUploadProgress(100);
      setUploadStatusText("Upload complete!");
      setUploadSuccess({
        videoId: data.videoId,
        videoUrl: data.videoUrl,
      });

      // Reset form
      setVideoFile(null);
      setThumbnailFile(null);
      setThumbnailPreview(null);
      setSelectedLibraryVideo(null);

      // Refresh upload history
      await loadUploadHistory();
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload video to YouTube.");
    } finally {
      setIsUploading(false);
    }
  }

  // Delete from upload history
  async function handleDeleteHistory(id: string) {
    if (!confirm("Remove this upload record from history?")) return;
    try {
      const res = await fetch(`/api/youtube/history?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setUploadHistory((prev) => prev.filter((item) => item.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete history item:", err);
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Youtube className="h-7 w-7 text-red-600 fill-red-600/10" />
              YouTube Upload Studio
            </h1>
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300 dark:bg-red-950/40 dark:text-red-300">
              Data API v3
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Upload and schedule high-definition videos and vertical Shorts directly to your official YouTube channel.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-muted p-1 rounded-lg">
          <button
            onClick={() => setActiveTab("upload")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === "upload"
                ? "bg-background text-foreground shadow-sm font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Upload className="h-3.5 w-3.5" />
            Upload Video
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === "history"
                ? "bg-background text-foreground shadow-sm font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Upload History</span>
            {uploadHistory.length > 0 && (
              <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                {uploadHistory.length}
              </Badge>
            )}
          </button>
        </div>
      </div>

      {/* Global Notifications */}
      {successParam && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 rounded-lg text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successParam}</span>
        </div>
      )}
      {errorParam && (
        <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300 rounded-lg text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorParam}</span>
        </div>
      )}

      {/* SECTION A: YOUTUBE ACCOUNT CONNECTION */}
      <Card className="shadow-sm border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Youtube className="h-5 w-5 text-red-600" />
              Connected YouTube Channel
            </span>
            {channels.length > 0 && (
              <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-300">
                Connected & Ready
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingChannels ? (
            <div className="py-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-red-600" />
              Checking connected YouTube channels...
            </div>
          ) : channels.length === 0 ? (
            <div className="p-4 border rounded-xl bg-muted/30 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <h3 className="font-bold text-sm">No YouTube Channel Connected</h3>
                <p className="text-xs text-muted-foreground max-w-lg">
                  Connect your Google account using official OAuth 2.0 to upload videos and Shorts directly from PagePulse AI.
                </p>
              </div>

              <div>
                {isOAuthConfigured && authUrl ? (
                  <a href={authUrl}>
                    <Button className="bg-red-600 hover:bg-red-700 text-white font-semibold gap-2 shadow-sm">
                      <Youtube className="h-4 w-4" />
                      Connect YouTube Channel
                    </Button>
                  </a>
                ) : (
                  <a href="/api/youtube/connect?redirect=true">
                    <Button className="bg-red-600 hover:bg-red-700 text-white font-semibold gap-2 shadow-sm">
                      <Youtube className="h-4 w-4" />
                      Connect YouTube Channel
                    </Button>
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {channels.map((chan) => (
                  <div
                    key={chan.channel_id}
                    className={`p-4 border rounded-xl flex items-center justify-between gap-3 transition-all ${
                      selectedChannelId === chan.channel_id
                        ? "border-red-500 bg-red-50/20 dark:bg-red-950/10 shadow-sm"
                        : "bg-card"
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      {chan.thumbnail_url ? (
                        <img
                          src={chan.thumbnail_url}
                          alt={chan.channel_title}
                          className="w-12 h-12 rounded-full border shadow-sm shrink-0 object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950 text-red-600 flex items-center justify-center shrink-0">
                          <Youtube className="h-6 w-6" />
                        </div>
                      )}
                      <div className="overflow-hidden">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-sm truncate">{chan.channel_title}</h4>
                          <Badge variant="secondary" className="text-[10px] py-0 px-1">
                            Active
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {chan.channel_custom_url || chan.channel_id}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                          <span>{chan.subscriber_count.toLocaleString()} subscribers</span>
                          <span>•</span>
                          <span>{chan.video_count.toLocaleString()} videos</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDisconnectChannel(chan.channel_id)}
                        className="text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      >
                        Disconnect
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SECTION B: UPLOAD STUDIO TAB */}
      {activeTab === "upload" && (
        <form onSubmit={handleUploadToYouTube} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Columns: Video File & Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Video File Dropzone */}
              <Card className="shadow-sm border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Film className="h-5 w-5 text-primary" />
                      1. Video File
                    </span>
                    <button
                      type="button"
                      onClick={openVideoLibrary}
                      className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
                    >
                      <FolderOpen className="h-3.5 w-3.5" />
                      Choose from Video Library / Clips
                    </button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/mp4,video/quicktime,video/webm,video/m4v"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  {videoPreviewUrl ? (
                    <div className="space-y-3">
                      <div className="relative rounded-xl overflow-hidden bg-black aspect-video max-h-[380px] flex items-center justify-center">
                        <video
                          ref={videoPlayerRef}
                          src={videoPreviewUrl}
                          controls
                          onLoadedMetadata={handleVideoLoadedMetadata}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs bg-muted/40 p-2.5 rounded-lg border">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          <span className="font-semibold text-foreground">
                            {videoFile ? videoFile.name : selectedLibraryVideo?.title}
                          </span>
                          {videoFile && (
                            <span className="text-muted-foreground">
                              ({(videoFile.size / (1024 * 1024)).toFixed(1)} MB)
                            </span>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setVideoFile(null);
                            setSelectedLibraryVideo(null);
                            setVideoPreviewUrl(null);
                          }}
                          className="h-7 text-xs text-rose-500 hover:text-rose-700"
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all space-y-3"
                    >
                      <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                        <Upload className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold text-sm">
                          Drag and drop your video file here, or browse
                        </p>
                        <p className="text-xs text-muted-foreground">
                          MP4, MOV, or WebM format (up to 1080p / 4K)
                        </p>
                      </div>
                      <Button type="button" variant="outline" size="sm" className="text-xs">
                        Select Video File
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Video Metadata Inputs */}
              <Card className="shadow-sm border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Tag className="h-5 w-5 text-primary" />
                    2. Video Details & Copy
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Title */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <Label htmlFor="video-title" className="font-semibold">
                        Video Title <span className="text-rose-500">*</span>
                      </Label>
                      <span className="text-muted-foreground">{title.length}/100</span>
                    </div>
                    <Input
                      id="video-title"
                      placeholder="Enter a compelling, viral title..."
                      value={title}
                      maxLength={100}
                      onChange={(e) => setTitle(e.target.value)}
                      className="h-10 text-sm"
                      required
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <Label htmlFor="video-description" className="font-semibold">
                        Description
                      </Label>
                      <span className="text-muted-foreground">{description.length}/5000</span>
                    </div>
                    <textarea
                      id="video-description"
                      rows={4}
                      placeholder="Tell viewers what your video is about, add hashtags, links, and keywords..."
                      value={description}
                      maxLength={5000}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full text-sm rounded-lg border bg-background px-3 py-2 outline-none focus:ring-1 focus:ring-primary shadow-sm"
                    />
                  </div>

                  {/* Tags */}
                  <div className="space-y-1.5">
                    <Label htmlFor="video-tags" className="text-xs font-semibold">
                      Tags (Comma Separated)
                    </Label>
                    <Input
                      id="video-tags"
                      placeholder="shorts, viral, tutorial, trending"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>

                  {/* Category Selection */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="category-select" className="text-xs font-semibold">
                        Category
                      </Label>
                      <select
                        id="category-select"
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                        className="w-full text-xs h-9 bg-background border rounded-lg px-2.5 font-medium cursor-pointer"
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* YouTube Shorts Toggle */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Format Optimization</Label>
                      <div className="flex items-center justify-between border rounded-lg p-2 bg-muted/30">
                        <span className="text-xs font-medium">Publish as YouTube Short</span>
                        <input
                          type="checkbox"
                          checked={isShort}
                          onChange={(e) => setIsShort(e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Settings & Publish Action */}
            <div className="space-y-6">
              {/* Privacy & Audience */}
              <Card className="shadow-sm border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <SlidersHorizontal className="h-5 w-5 text-primary" />
                    3. Visibility & Audience
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Privacy Radio */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Privacy Status</Label>
                    <div className="space-y-1.5">
                      {[
                        { id: "public", label: "Public", desc: "Everyone can watch your video" },
                        { id: "unlisted", label: "Unlisted", desc: "Anyone with the link can watch" },
                        { id: "private", label: "Private", desc: "Only you can watch your video" },
                      ].map((p) => (
                        <label
                          key={p.id}
                          className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                            privacyStatus === p.id
                              ? "border-primary bg-primary/5"
                              : "border-border hover:bg-muted/40"
                          }`}
                        >
                          <input
                            type="radio"
                            name="privacy_status"
                            checked={privacyStatus === p.id}
                            onChange={() => setPrivacyStatus(p.id as any)}
                            className="mt-0.5 text-primary focus:ring-primary"
                          />
                          <div>
                            <span className="font-semibold text-xs block">{p.label}</span>
                            <span className="text-[11px] text-muted-foreground">{p.desc}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Made for Kids */}
                  <div className="space-y-2 pt-2 border-t">
                    <Label className="text-xs font-semibold">Made for Kids?</Label>
                    <div className="space-y-1.5 text-xs">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="made_for_kids"
                          checked={!madeForKids}
                          onChange={() => setMadeForKids(false)}
                          className="text-primary focus:ring-primary"
                        />
                        <span>No, it's not made for kids (Default)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="made_for_kids"
                          checked={madeForKids}
                          onChange={() => setMadeForKids(true)}
                          className="text-primary focus:ring-primary"
                        />
                        <span>Yes, it's made for kids</span>
                      </label>
                    </div>
                  </div>

                  {/* Custom Thumbnail Upload */}
                  <div className="space-y-2 pt-2 border-t">
                    <Label className="text-xs font-semibold flex items-center justify-between">
                      <span>Custom Thumbnail</span>
                      <span className="text-[11px] text-muted-foreground font-normal">Optional</span>
                    </Label>
                    <input
                      ref={thumbnailInputRef}
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={handleThumbnailSelect}
                      className="hidden"
                    />
                    {thumbnailPreview ? (
                      <div className="relative rounded-lg overflow-hidden border aspect-video">
                        <img
                          src={thumbnailPreview}
                          alt="Thumbnail preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setThumbnailFile(null);
                            setThumbnailPreview(null);
                          }}
                          className="absolute top-1.5 right-1.5 bg-black/75 text-white p-1 rounded hover:bg-black"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => thumbnailInputRef.current?.click()}
                        className="w-full text-xs gap-1.5 h-8"
                      >
                        <ImageIcon className="h-3.5 w-3.5" />
                        Upload Thumbnail Image
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Progress & Submit */}
              <Card className="shadow-sm border">
                <CardContent className="p-4 space-y-3">
                  {isUploading && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="flex items-center gap-1.5">
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-red-600" />
                          Uploading to YouTube...
                        </span>
                        <span className="font-bold">{uploadProgress}%</span>
                      </div>
                      <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-600 transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground">{uploadStatusText}</p>
                    </div>
                  )}

                  {uploadError && (
                    <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300 rounded-lg text-xs flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold">Upload failed: </span>
                        {uploadError}
                      </div>
                    </div>
                  )}

                  {uploadSuccess && (
                    <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 rounded-lg text-xs space-y-2">
                      <div className="flex items-center gap-2 font-semibold">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>Uploaded to YouTube Successfully!</span>
                      </div>
                      <a
                        href={uploadSuccess.videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-emerald-700 underline font-semibold text-xs"
                      >
                        View video on YouTube <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={isUploading || channels.length === 0 || (!videoFile && !selectedLibraryVideo)}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold h-11 gap-2 shadow-sm text-sm"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Publishing to YouTube...
                      </>
                    ) : (
                      <>
                        <Youtube className="h-4 w-4" />
                        Upload & Publish Video
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      )}

      {/* SECTION C: UPLOAD HISTORY TAB */}
      {activeTab === "history" && (
        <Card className="shadow-sm border">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">YouTube Upload History</CardTitle>
              <CardDescription className="text-xs">
                History of all video files and Shorts published to your YouTube channel.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadUploadHistory}
              disabled={loadingHistory}
              className="text-xs gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingHistory ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            {loadingHistory ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-red-600" />
                <span>Loading YouTube upload records...</span>
              </div>
            ) : uploadHistory.length === 0 ? (
              <div className="py-12 text-center border-2 border-dashed rounded-xl space-y-2 bg-muted/20">
                <Youtube className="h-8 w-8 text-muted-foreground mx-auto" />
                <h4 className="font-bold text-sm">No YouTube Uploads Yet</h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Upload a video in the Upload Studio above to track its YouTube processing and live status.
                </p>
                <Button size="sm" onClick={() => setActiveTab("upload")} className="text-xs">
                  Upload Video Now
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 border-b text-muted-foreground uppercase text-[10px] font-semibold">
                    <tr>
                      <th className="px-4 py-3">Video Title</th>
                      <th className="px-4 py-3">Channel</th>
                      <th className="px-4 py-3">Privacy</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {uploadHistory.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium">
                          <div className="flex items-center gap-2">
                            <Youtube className="h-4 w-4 text-red-600 shrink-0" />
                            <div>
                              <span className="font-bold text-foreground line-clamp-1">
                                {item.title}
                              </span>
                              {item.is_short && (
                                <Badge variant="outline" className="text-[9px] py-0 px-1 border-red-300 text-red-600">
                                  Shorts
                                </Badge>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {item.channel_title || "My Channel"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className="capitalize text-[10px]">
                            {item.privacy_status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                            <CheckCircle2 className="h-3 w-3" />
                            Live on YouTube
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(item.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right space-x-2">
                          {item.video_url && (
                            <a
                              href={item.video_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-red-600 hover:underline font-semibold"
                            >
                              <span>Watch</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                          <button
                            onClick={() => handleDeleteHistory(item.id)}
                            className="text-muted-foreground hover:text-rose-500 transition-colors p-1"
                            title="Delete record"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Select Video from Library Modal */}
      {libraryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-primary" />
                Select Video from Your Library or Clips
              </CardTitle>
              <Button size="sm" variant="ghost" onClick={() => setLibraryModalOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-4 overflow-y-auto flex-1 space-y-3">
              {loadingLibrary ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p>Loading videos and clips...</p>
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
                      onClick={() => handleSelectFromLibrary(v)}
                      className="p-3 border rounded-lg hover:border-red-500 hover:bg-muted/40 cursor-pointer transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <h4 className="font-semibold text-xs line-clamp-1">{v.title}</h4>
                          {v.isClip && (
                            <Badge variant="outline" className="text-[9px] py-0 px-1 border-amber-400 text-amber-600">
                              Clip
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Duration: {v.duration ? `${Math.round(v.duration)}s` : "Unknown"}
                        </p>
                      </div>
                      <Button size="sm" variant="secondary" className="mt-2 text-xs h-7">
                        Select for YouTube Upload
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function YouTubeStudioPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-red-600" />
          <p>Loading YouTube Studio...</p>
        </div>
      }
    >
      <YouTubeStudioContent />
    </Suspense>
  );
}
