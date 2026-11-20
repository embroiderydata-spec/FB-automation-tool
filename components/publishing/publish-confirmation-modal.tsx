"use client";

import React, { useState } from "react";
import {
  Send,
  AlertTriangle,
  CheckCircle2,
  X,
  Play,
  Facebook,
  ShieldCheck,
  Loader2,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CaptionEditor } from "./caption-editor-modal";

interface PublishConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (caption: string, title?: string, isTestMode?: boolean) => Promise<void>;
  video: {
    id: string;
    title: string;
    thumbnailUrl?: string | null;
    durationSeconds?: number | null;
    aspectRatio?: string | null;
  };
  page: {
    id: string;
    name: string;
    pictureUrl?: string | null;
  };
  initialCaption?: string;
  isTestModeDefault?: boolean;
}

export function PublishConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  video,
  page,
  initialCaption = "",
  isTestModeDefault = true,
}: PublishConfirmationModalProps) {
  const [caption, setCaption] = useState(initialCaption || `${video.title}\n\n#reels #viral #trending`);
  const [title, setTitle] = useState(video.title);
  const [isTestMode, setIsTestMode] = useState(isTestModeDefault);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleConfirm() {
    try {
      setSubmitting(true);
      setError(null);
      await onConfirm(caption, title, isTestMode);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to publish Reel.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="relative w-full max-w-xl rounded-xl border bg-background shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4 bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Send className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Confirm Facebook Reel Publishing</h3>
              <p className="text-xs text-muted-foreground">
                Review destination Page, video metadata, and caption before publishing.
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-muted-foreground">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Destination Page Banner */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-600/10 border flex items-center justify-center overflow-hidden">
                {page.pictureUrl ? (
                  <img src={page.pictureUrl} alt={page.name} className="h-full w-full object-cover" />
                ) : (
                  <Facebook className="h-5 w-5 text-blue-600" />
                )}
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  Publishing Destination
                </span>
                <span className="text-sm font-semibold text-foreground">{page.name}</span>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px]">
              Facebook Reels
            </Badge>
          </div>

          {/* Video Metadata Card */}
          <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
            <div className="relative h-16 w-10 bg-black rounded overflow-hidden shrink-0 flex items-center justify-center">
              {video.thumbnailUrl ? (
                <img src={video.thumbnailUrl} alt={video.title} className="h-full w-full object-cover" />
              ) : (
                <Play className="h-4 w-4 text-white/50" />
              )}
              <span className="absolute bottom-0.5 right-0.5 text-[8px] bg-black/80 text-white px-1 rounded">
                9:16
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-semibold text-foreground block truncate">{video.title}</span>
              <span className="text-[11px] text-muted-foreground block">
                Duration: {video.durationSeconds ? `${Math.round(video.durationSeconds)}s` : "30s"} • 1080x1920 Vertical
              </span>
            </div>
          </div>

          {/* Caption Editor */}
          <CaptionEditor
            caption={caption}
            onChange={setCaption}
            title={title}
            onTitleChange={setTitle}
          />

          {/* Mode Switcher Banner */}
          <div
            className={`p-3.5 rounded-lg border transition-colors ${
              isTestMode
                ? "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-200"
                : "bg-blue-500/10 border-blue-500/30 text-blue-800 dark:text-blue-200"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  <span className="text-xs font-bold">
                    {isTestMode ? "TEST MODE ACTIVE — NOT PUBLISHED" : "LIVE META GRAPH API PUBLISHING"}
                  </span>
                </div>
                <p className="text-[11px] opacity-90 leading-relaxed">
                  {isTestMode
                    ? "Validates Page tokens, permissions, video resolution, and creates a simulated job. No content will be made public on Facebook."
                    : "Will send official Graph API calls to publish this video immediately to your public Facebook Page followers."}
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsTestMode(!isTestMode)}
                className="h-7 text-[10px] shrink-0 bg-background"
              >
                Switch to {isTestMode ? "Live Mode" : "Test Mode"}
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-3.5 bg-muted/20 flex justify-end items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={submitting} className="text-xs">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={submitting || !caption.trim()}
            className="text-xs gap-1.5"
          >
            {submitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                Confirm & Publish Reel
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
