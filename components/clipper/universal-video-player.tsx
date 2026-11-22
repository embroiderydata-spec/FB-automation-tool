"use client";

import React, { useRef, useState, useEffect } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { AspectRatio, ReframingMode, SubtitleStyle } from "@/lib/clipper/types";

export interface UniversalVideoPlayerProps {
  videoUrl: string;
  startTime: number;
  endTime: number;
  aspectRatio?: AspectRatio;
  reframingMode?: ReframingMode;
  hookText?: string;
  subtitleText?: string;
  subtitleStyle?: SubtitleStyle;
  watermarkText?: string;
  watermarkPosition?: "top_left" | "top_right" | "bottom_left" | "bottom_right";
  watermarkOpacity?: number;
  autoPlay?: boolean;
  loop?: boolean;
  showCustomControls?: boolean;
  className?: string;
}

/**
 * Extracts YouTube video ID if URL is from YouTube.
 */
function extractYouTubeId(url: string): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  const match = trimmed.match(
    /(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match && match[1] ? match[1] : null;
}

export function UniversalVideoPlayer({
  videoUrl,
  startTime,
  endTime,
  aspectRatio = "9:16",
  reframingMode = "blurred_backdrop",
  hookText,
  subtitleText,
  subtitleStyle = "hormozi",
  watermarkText,
  watermarkPosition = "top_right",
  watermarkOpacity = 0.7,
  autoPlay = true,
  loop = true,
  showCustomControls = true,
  className = "",
}: UniversalVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const bgVideoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(startTime);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const youtubeId = extractYouTubeId(videoUrl);
  const isYouTube = !!youtubeId;
  const clipDuration = Math.max(0.1, Number((endTime - startTime).toFixed(2)));

  // 1. Direct HTML5 Video Interval Tracking
  useEffect(() => {
    if (isYouTube) return;
    const video = videoRef.current;
    if (!video) return;

    setLoadError(null);
    setIsLoading(true);

    const handleLoadedMetadata = () => {
      setIsLoading(false);
      video.currentTime = startTime;
      setCurrentTime(startTime);
      if (autoPlay) {
        video.play().catch(() => {
          // Autoplay policy might require user gesture or muted
          video.muted = true;
          setIsMuted(true);
          video.play().catch(() => {});
        });
      }
    };

    const handleTimeUpdate = () => {
      const current = video.currentTime;
      setCurrentTime(current);

      // Stop or loop when interval end is reached
      if (current >= endTime) {
        if (loop) {
          video.currentTime = startTime;
          video.play().catch(() => {});
        } else {
          video.pause();
          setIsPlaying(false);
        }
      } else if (current < startTime) {
        video.currentTime = startTime;
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleError = () => {
      setIsLoading(false);
      setLoadError("Failed to load video stream. Please ensure the URL is accessible.");
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("error", handleError);

    // Initial seek if already loaded
    if (video.readyState >= 1) {
      handleLoadedMetadata();
    }

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("error", handleError);
    };
  }, [videoUrl, startTime, endTime, loop, autoPlay, isYouTube]);

  // Sync background video if blurred backdrop is active on HTML5 video
  useEffect(() => {
    if (isYouTube) return;
    const bg = bgVideoRef.current;
    const fg = videoRef.current;
    if (!bg || !fg || reframingMode !== "blurred_backdrop") return;

    const syncTime = () => {
      if (Math.abs(bg.currentTime - fg.currentTime) > 0.3) {
        bg.currentTime = fg.currentTime;
      }
    };

    fg.addEventListener("timeupdate", syncTime);
    return () => fg.removeEventListener("timeupdate", syncTime);
  }, [reframingMode, isYouTube]);

  // Toggle Play / Pause
  const togglePlay = () => {
    if (isYouTube) return;
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      if (video.currentTime >= endTime || video.currentTime < startTime) {
        video.currentTime = startTime;
      }
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  };

  // Toggle Mute
  const toggleMute = () => {
    if (isYouTube) return;
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  // Seek Within Clip Interval
  const handleScrubberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isYouTube) return;
    const video = videoRef.current;
    if (!video) return;
    const newProgress = parseFloat(e.target.value); // 0 to 1
    const targetTime = startTime + newProgress * clipDuration;
    video.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  // Reset to Clip Start
  const handleRestartInterval = () => {
    if (isYouTube) return;
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = startTime;
    video.play().catch(() => {});
  };

  // Toggle Fullscreen
  const handleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Compute Scrubber Progress
  const intervalProgress = Math.max(
    0,
    Math.min(1, (currentTime - startTime) / clipDuration)
  );

  // Aspect ratio styling classes
  const aspectClass =
    aspectRatio === "16:9"
      ? "aspect-video"
      : aspectRatio === "1:1"
      ? "aspect-square"
      : "aspect-[9/16]";

  // Watermark Positioning
  const watermarkPosClass =
    watermarkPosition === "top_left"
      ? "top-3 left-3"
      : watermarkPosition === "bottom_left"
      ? "bottom-14 left-3"
      : watermarkPosition === "bottom_right"
      ? "bottom-14 right-3"
      : "top-3 right-3";

  return (
    <div
      ref={containerRef}
      className={`relative group bg-black rounded-2xl overflow-hidden shadow-2xl border flex items-center justify-center select-none ${aspectClass} ${className}`}
    >
      {/* -----------------------------------------------------------
          CASE 1: YOUTUBE VIDEO IFRAME EMBED (Exact Timestamp Interval)
         ----------------------------------------------------------- */}
      {isYouTube && youtubeId ? (
        <div className="relative w-full h-full">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${youtubeId}?start=${Math.floor(
              startTime
            )}&end=${Math.ceil(
              endTime
            )}&autoplay=${autoPlay ? 1 : 0}&controls=1&rel=0&modestbranding=1&enablejsapi=1`}
            title="Clip Moment Preview"
            className="w-full h-full border-0 absolute inset-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        /* -----------------------------------------------------------
            CASE 2: DIRECT VIDEO (MP4, MOV, WebM, Supabase Storage)
           ----------------------------------------------------------- */
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
          {/* Blurred Background Layer for 9:16 or 1:1 if enabled */}
          {reframingMode === "blurred_backdrop" &&
            (aspectRatio === "9:16" || aspectRatio === "1:1") && (
              <video
                ref={bgVideoRef}
                src={videoUrl}
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover scale-125 filter blur-xl opacity-40 pointer-events-none"
              />
            )}

          {/* Main Sharp Video Layer */}
          <video
            ref={videoRef}
            src={videoUrl}
            playsInline
            muted={isMuted}
            onClick={togglePlay}
            className={`relative z-10 w-full h-full cursor-pointer ${
              reframingMode === "auto_center" || reframingMode === "top_crop" || reframingMode === "bottom_crop"
                ? "object-cover"
                : "object-contain"
            }`}
          />

          {/* Loading Indicator */}
          {isLoading && !loadError && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/50 backdrop-blur-xs text-white gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-[11px] font-semibold tracking-wide">Buffering Clip...</span>
            </div>
          )}

          {/* Load Error Notice */}
          {loadError && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-zinc-950 p-4 text-center text-rose-300 gap-2">
              <AlertCircle className="h-8 w-8 text-rose-500" />
              <p className="text-xs font-semibold">{loadError}</p>
            </div>
          )}
        </div>
      )}

      {/* -----------------------------------------------------------
          OVERLAYS PREVIEW: Hook Headline, Subtitles, Watermark
         ----------------------------------------------------------- */}
      {/* 1. Hook Headline Overlay */}
      {hookText && hookText.trim().length > 0 && (
        <div className="absolute top-4 left-3 right-3 z-20 flex justify-center pointer-events-none">
          <div className="px-3 py-1 bg-black/85 border border-yellow-400 text-yellow-300 font-black text-xs text-center rounded-lg shadow-xl uppercase tracking-wider max-w-[90%]">
            {hookText}
          </div>
        </div>
      )}

      {/* 2. Watermark / Logo Text Overlay */}
      {watermarkText && watermarkText.trim().length > 0 && (
        <div
          className={`absolute z-20 pointer-events-none font-bold text-[11px] tracking-wide text-white drop-shadow-md px-2 py-0.5 rounded bg-black/40 ${watermarkPosClass}`}
          style={{ opacity: watermarkOpacity }}
        >
          {watermarkText}
        </div>
      )}

      {/* 3. Subtitles Overlay */}
      {subtitleText && subtitleText.trim().length > 0 && subtitleStyle !== "none" && (
        <div className="absolute bottom-12 left-2 right-2 z-20 flex justify-center pointer-events-none">
          <div
            className={`px-3 py-1 text-center font-black tracking-wide max-w-[92%] rounded-lg transition-all ${
              subtitleStyle === "hormozi"
                ? "bg-black/85 text-yellow-400 border-2 border-yellow-400 text-sm uppercase shadow-2xl"
                : subtitleStyle === "viral_bold"
                ? "bg-black/80 text-yellow-300 border border-yellow-400/80 text-xs font-black shadow-xl"
                : subtitleStyle === "karaoke"
                ? "bg-black/75 text-cyan-300 border border-cyan-400 text-xs shadow-lg"
                : subtitleStyle === "highlight_words"
                ? "bg-black/80 text-emerald-300 border border-emerald-400 text-xs shadow-lg"
                : subtitleStyle === "modern_podcast"
                ? "bg-black/80 text-blue-300 border border-blue-400 text-xs"
                : subtitleStyle === "clean_minimal"
                ? "bg-black/70 text-white text-xs border border-white/20"
                : "bg-black/75 text-zinc-200 text-xs"
            }`}
          >
            {subtitleText}
          </div>
        </div>
      )}

      {/* -----------------------------------------------------------
          CUSTOM PLAYBACK CONTROLS (For Direct Videos)
         ----------------------------------------------------------- */}
      {!isYouTube && showCustomControls && (
        <div className="absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-2.5 pt-6 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {/* Interval Scrubber Bar */}
          <div className="relative flex items-center mb-1.5">
            <input
              type="range"
              min="0"
              max="1"
              step="0.005"
              value={intervalProgress}
              onChange={handleScrubberChange}
              className="w-full h-1.5 bg-white/25 rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>

          {/* Action Buttons & Time Telemetry */}
          <div className="flex items-center justify-between text-white text-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={togglePlay}
                className="p-1 hover:text-primary transition-colors"
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
              </button>

              <button
                type="button"
                onClick={handleRestartInterval}
                className="p-1 hover:text-primary transition-colors text-white/80"
                title="Replay from clip start"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={toggleMute}
                className="p-1 hover:text-primary transition-colors text-white/80"
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>

              {/* Timestamp Counter */}
              <span className="text-[10px] text-white/80 font-mono ml-1">
                {Math.max(0, currentTime - startTime).toFixed(1)}s / {clipDuration.toFixed(1)}s
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[9px] uppercase tracking-wider bg-white/20 px-1.5 py-0.5 rounded font-bold">
                {aspectRatio}
              </span>
              <button
                type="button"
                onClick={handleFullscreen}
                className="p-1 hover:text-primary transition-colors text-white/80"
                title="Fullscreen"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
