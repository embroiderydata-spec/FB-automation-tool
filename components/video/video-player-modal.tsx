"use client";

import React from "react";
import { X, Download, Film, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface VideoPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  title: string;
  duration?: number;
  resolution?: string;
  provider?: string;
}

export function VideoPlayerModal({
  isOpen,
  onClose,
  videoUrl,
  title,
  duration,
  resolution = "1080x1920 (9:16)",
  provider,
}: VideoPlayerModalProps) {
  if (!isOpen || !videoUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-sm rounded-xl overflow-hidden bg-card border shadow-2xl flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b bg-muted/40">
          <div className="truncate pr-2">
            <h4 className="text-xs font-bold text-foreground truncate">{title}</h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono">
                {resolution}
              </Badge>
              {duration && (
                <span className="text-[10px] text-muted-foreground">{duration}s</span>
              )}
              {provider && (
                <Badge variant="outline" className="text-[9px] py-0 px-1">
                  {provider}
                </Badge>
              )}
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* 9:16 Video Viewport */}
        <div className="relative aspect-[9/16] w-full bg-black flex items-center justify-center overflow-hidden">
          <video
            src={videoUrl}
            controls
            autoPlay
            loop
            playsInline
            className="w-full h-full object-contain"
          />
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t bg-muted/20 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => window.open(videoUrl, "_blank")}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open Fullscreen
          </Button>

          <a href={videoUrl} download={title ? `${title.replace(/\s+/g, "_")}.mp4` : "reel.mp4"}>
            <Button size="sm" className="h-8 text-xs gap-1.5">
              <Download className="h-3.5 w-3.5" />
              Download MP4
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}
