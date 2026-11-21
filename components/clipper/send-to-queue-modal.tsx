"use client";

import React, { useState, useEffect } from "react";
import { X, Clock, Send, AlertCircle, CheckCircle2, Share2, Youtube, Loader2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SendToQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  clip: {
    id?: string;
    title: string;
    caption?: string;
    videoUrl: string;
    aspectRatio?: string;
    duration?: number;
  } | null;
  onSuccess?: () => void;
}

export function SendToQueueModal({ isOpen, onClose, clip, onSuccess }: SendToQueueModalProps) {
  const [platform, setPlatform] = useState<"facebook" | "youtube">("facebook");
  const [pages, setPages] = useState<any[]>([]);
  const [youtubeChannels, setYoutubeChannels] = useState<any[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string>("");
  const [selectedChannelId, setSelectedChannelId] = useState<string>("");
  const [caption, setCaption] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [tags, setTags] = useState("shorts, reels, viral");
  const [privacyStatus, setPrivacyStatus] = useState<"public" | "unlisted" | "private">("public");
  const [publishMode, setPublishMode] = useState<"now" | "schedule">("now");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("12:00");
  const [loading, setLoading] = useState(false);
  const [fetchingDestinations, setFetchingDestinations] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (clip) {
      setCaption(clip.caption || clip.title || "");
      setVideoTitle(clip.title || "");
    }
  }, [clip]);

  useEffect(() => {
    if (isOpen) {
      loadDestinations();
      // Set default schedule time to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setScheduledDate(tomorrow.toISOString().slice(0, 10));
    }
  }, [isOpen]);

  async function loadDestinations() {
    setFetchingDestinations(true);
    try {
      // 1. Load Facebook Pages
      const fbRes = await fetch("/api/facebook-pages");
      if (fbRes.ok) {
        const fbData = await fbRes.json();
        const activePages = fbData.pages || fbData || [];
        setPages(activePages);
        if (activePages.length > 0 && !selectedPageId) {
          setSelectedPageId(activePages[0].id);
        }
      }

      // 2. Load YouTube Channels
      const ytRes = await fetch("/api/youtube/channels");
      if (ytRes.ok) {
        const ytData = await ytRes.json();
        const accounts = ytData.accounts || [];
        setYoutubeChannels(accounts);
        if (accounts.length > 0 && !selectedChannelId) {
          setSelectedChannelId(accounts[0].id);
        }
      }
    } catch {}
    finally {
      setFetchingDestinations(false);
    }
  }

  if (!isOpen || !clip) return null;

  async function handlePublish() {
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      let scheduledAt: string | undefined = undefined;
      if (publishMode === "schedule") {
        if (!scheduledDate || !scheduledTime) {
          throw new Error("Please specify both a scheduled date and time.");
        }
        scheduledAt = new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString();
      }

      const body: any = {
        video_id: clip?.id || "temp-clip-id",
        platform,
        caption,
        video_title: videoTitle,
        is_short: clip?.aspectRatio === "9:16" || (clip?.duration ? clip.duration <= 60 : true),
        is_test_mode: false,
        publish_now: publishMode === "now",
      };

      if (platform === "facebook") {
        if (!selectedPageId) {
          throw new Error("Please select a target Facebook Page.");
        }
        body.page_id = selectedPageId;
      } else {
        if (!selectedChannelId) {
          throw new Error("Please select a target YouTube Channel.");
        }
        body.youtube_channel_id = selectedChannelId;
        body.tags = tags.split(",").map((t) => t.trim()).filter(Boolean);
        body.privacy_status = privacyStatus;
      }

      if (publishMode === "schedule" && scheduledAt) {
        body.scheduled_at = scheduledAt;
      }

      const res = await fetch("/api/publishing/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to enqueue publishing job.");
      }

      setSuccess(data.message || (publishMode === "now" ? "Published successfully!" : "Scheduled successfully!"));
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="space-y-0.5">
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Send className="h-4 w-4 text-primary" />
              Publish Video Clip
            </h3>
            <p className="text-xs text-muted-foreground">
              Send this 9:16 vertical clip directly to Facebook Pages or YouTube Channels.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        {/* Platform Selection */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold">Select Destination Platform</Label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPlatform("facebook")}
              className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-medium transition-all ${
                platform === "facebook"
                  ? "border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "border-border hover:bg-muted/50 text-muted-foreground"
              }`}
            >
              <div className="h-7 w-7 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                <Share2 className="h-4 w-4" />
              </div>
              <div className="text-left">
                <span className="block font-semibold">Facebook Page</span>
                <span className="text-[10px] opacity-80">Reel / Video Post</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setPlatform("youtube")}
              className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-medium transition-all ${
                platform === "youtube"
                  ? "border-red-500 bg-red-500/10 text-red-600 dark:text-red-400 shadow-sm"
                  : "border-border hover:bg-muted/50 text-muted-foreground"
              }`}
            >
              <div className="h-7 w-7 rounded-lg bg-red-600 text-white flex items-center justify-center">
                <Youtube className="h-4 w-4" />
              </div>
              <div className="text-left">
                <span className="block font-semibold">YouTube Channel</span>
                <span className="text-[10px] opacity-80">Shorts / Video</span>
              </div>
            </button>
          </div>
        </div>

        {/* Destination Account Selection */}
        {platform === "facebook" ? (
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Target Facebook Page</Label>
            {fetchingDestinations ? (
              <div className="h-9 flex items-center text-xs text-muted-foreground gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading connected pages...
              </div>
            ) : pages.length === 0 ? (
              <div className="p-2.5 rounded-lg border bg-amber-500/10 text-amber-600 text-xs">
                No Facebook pages connected. Connect a page in the <strong>Facebook Pages</strong> section.
              </div>
            ) : (
              <select
                value={selectedPageId}
                onChange={(e) => setSelectedPageId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
              >
                {pages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.page_name || p.name} ({p.facebook_page_id || "Connected"})
                  </option>
                ))}
              </select>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Target YouTube Channel</Label>
            {fetchingDestinations ? (
              <div className="h-9 flex items-center text-xs text-muted-foreground gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading YouTube channels...
              </div>
            ) : youtubeChannels.length === 0 ? (
              <div className="p-3 rounded-lg border bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs space-y-1">
                <p className="font-semibold">No YouTube Channel Connected</p>
                <p className="text-[11px] text-muted-foreground">
                  Connect your YouTube channel in <strong>Facebook Pages & Channels</strong> to publish directly to YouTube Shorts.
                </p>
              </div>
            ) : (
              <select
                value={selectedChannelId}
                onChange={(e) => setSelectedChannelId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
              >
                {youtubeChannels.map((yt) => (
                  <option key={yt.id} value={yt.id}>
                    {yt.channel_title} ({yt.subscriber_count} subscribers)
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Video Title (YouTube) or Caption */}
        {platform === "youtube" && (
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">YouTube Video Title</Label>
            <Input
              value={videoTitle}
              onChange={(e) => setVideoTitle(e.target.value)}
              placeholder="Catchy Video Title #Shorts"
              maxLength={100}
              className="h-9 text-xs"
            />
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-xs font-medium">
            {platform === "youtube" ? "Video Description & Hashtags" : "Post Caption"}
          </Label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={3}
            placeholder="Write a caption or hashtags for this clip..."
            className="w-full rounded-md border border-input bg-background p-2.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          />
        </div>

        {platform === "youtube" && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Privacy Status</Label>
              <select
                value={privacyStatus}
                onChange={(e: any) => setPrivacyStatus(e.target.value)}
                className="w-full h-8 text-xs rounded-md border border-input bg-background px-2.5"
              >
                <option value="public">Public</option>
                <option value="unlisted">Unlisted</option>
                <option value="private">Private</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Tags (Comma-separated)</Label>
              <Input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="reels, viral, clips"
                className="h-8 text-xs"
              />
            </div>
          </div>
        )}

        {/* Publish Mode: Now or Scheduled */}
        <div className="space-y-2 pt-1 border-t">
          <Label className="text-xs font-semibold">Publishing Schedule</Label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPublishMode("now")}
              className={`p-2.5 rounded-lg border text-xs font-medium transition-all ${
                publishMode === "now"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted/50"
              }`}
            >
              Publish Immediately
            </button>
            <button
              type="button"
              onClick={() => setPublishMode("schedule")}
              className={`p-2.5 rounded-lg border text-xs font-medium transition-all ${
                publishMode === "schedule"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted/50"
              }`}
            >
              Schedule for Later
            </button>
          </div>

          {publishMode === "schedule" && (
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Date</Label>
                <Input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Time</Label>
                <Input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t">
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading} className="text-xs h-8">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handlePublish}
            disabled={loading}
            className="text-xs h-8 gap-1.5 bg-primary font-medium"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Processing...
              </>
            ) : publishMode === "now" ? (
              <>
                <Send className="h-3.5 w-3.5" />
                Publish Now
              </>
            ) : (
              <>
                <Calendar className="h-3.5 w-3.5" />
                Schedule Post
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
