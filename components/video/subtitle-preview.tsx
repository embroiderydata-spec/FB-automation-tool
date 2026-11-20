"use client";

import React, { useState, useEffect } from "react";
import {
  Subtitles,
  CheckCircle2,
  Sparkles,
  Sliders,
  Type,
  Palette,
  Play,
  RotateCcw,
  AlignVerticalJustifyCenter,
  MoveVertical,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SUBTITLE_PRESETS } from "@/lib/video/subtitles/engine";
import { SubtitlePresetStyle } from "@/lib/video/types";

interface SubtitlePreviewProps {
  selectedPreset: SubtitlePresetStyle;
  onSelectPreset: (preset: SubtitlePresetStyle) => void;
}

export function SubtitlePreview({
  selectedPreset,
  onSelectPreset,
}: SubtitlePreviewProps) {
  const [samplePhrase, setSamplePhrase] = useState(
    "STOP DOING THIS RIGHT NOW! (99% OF CREATORS GET THIS WRONG)"
  );

  // Customization state initialized from active preset
  const activePresetConfig = SUBTITLE_PRESETS[selectedPreset] || SUBTITLE_PRESETS.bold_viral;

  const [fontFamily, setFontFamily] = useState(activePresetConfig.fontFamily);
  const [textColor, setTextColor] = useState(activePresetConfig.textColor);
  const [highlightColor, setHighlightColor] = useState(activePresetConfig.highlightColor);
  const [position, setPosition] = useState<"top" | "middle" | "bottom">(activePresetConfig.position);
  const [fontSize, setFontSize] = useState(activePresetConfig.fontSize || 48);
  const [backgroundColor, setBackgroundColor] = useState(activePresetConfig.backgroundColor || "transparent");
  const [animation, setAnimation] = useState(activePresetConfig.animation || "pop");
  const [maxChars, setMaxChars] = useState(30);

  // Live animation playback simulation
  const [simulating, setSimulating] = useState(false);
  const [activeWordIndex, setActiveWordIndex] = useState(0);

  // Update customization when user selects a preset card
  useEffect(() => {
    const config = SUBTITLE_PRESETS[selectedPreset] || SUBTITLE_PRESETS.bold_viral;
    setFontFamily(config.fontFamily);
    setTextColor(config.textColor);
    setHighlightColor(config.highlightColor);
    setPosition(config.position);
    setFontSize(config.fontSize || 48);
    setBackgroundColor(config.backgroundColor || "transparent");
    setAnimation(config.animation || "pop");
  }, [selectedPreset]);

  // Animated Karaoke/Pop word ticker
  const words = samplePhrase.split(" ");
  useEffect(() => {
    let interval: any;
    if (simulating) {
      interval = setInterval(() => {
        setActiveWordIndex((prev) => (prev + 1) % words.length);
      }, 350);
    } else {
      setActiveWordIndex(-1);
    }
    return () => clearInterval(interval);
  }, [simulating, words.length]);

  const presets = Object.values(SUBTITLE_PRESETS);

  // Calculate scaled font size for the 180px wide mobile preview (standard 1080p is ~6x larger)
  const previewFontSizePx = Math.max(11, Math.min(18, Math.round((fontSize / 48) * 13)));

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      {/* Preset Selector & Customization Controls */}
      <div className="lg:col-span-7 space-y-6">
        {/* Preset Cards */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Subtitles className="h-4 w-4 text-indigo-500" />
                Reels Subtitle Style Presets
              </CardTitle>
              <Badge variant="outline" className="text-[10px] text-indigo-600 border-indigo-400/30">
                5 Active Presets
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Kinetic high-retention subtitle templates optimized for 9:16 mobile viewports and Facebook algorithms.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              {presets.map((preset) => (
                <div
                  key={preset.id}
                  onClick={() => onSelectPreset(preset.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedPreset === preset.id
                      ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-xs"
                      : "hover:border-indigo-300 dark:hover:border-indigo-800 bg-card"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-foreground">{preset.name}</span>
                    {selectedPreset === preset.id && (
                      <CheckCircle2 className="h-4 w-4 text-indigo-600 shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full border border-black/20"
                      style={{ backgroundColor: preset.textColor }}
                    />
                    <span className="capitalize">{preset.position}</span>
                    <span>•</span>
                    <span className="capitalize">{preset.animation}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">
                Sample Subtitle Phrase
              </Label>
              <Input
                type="text"
                value={samplePhrase}
                onChange={(e) => setSamplePhrase(e.target.value)}
                className="h-8 text-xs bg-background"
                placeholder="Enter sample caption text..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Detailed Configuration */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Sliders className="h-4 w-4 text-indigo-500" />
              Subtitle Typography & Animation Tuning
            </CardTitle>
            <CardDescription className="text-xs">
              Adjust typography, color accents, background containers, and timing parameters for the active preset.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Font Family */}
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <Type className="h-3.5 w-3.5 text-muted-foreground" />
                  Font Family
                </Label>
                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  className="h-8 w-full text-xs rounded-md border border-input bg-background px-2"
                >
                  <option value="Impact, Arial Black, sans-serif">Impact (Viral Reels)</option>
                  <option value="Montserrat, Arial Black, sans-serif">Montserrat Black</option>
                  <option value="Inter, Montserrat, sans-serif">Inter SemiBold</option>
                  <option value="Helvetica Neue, Arial, sans-serif">Helvetica Neue</option>
                  <option value="Roboto, sans-serif">Roboto Clean</option>
                </select>
              </div>

              {/* Subtitle Position */}
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <MoveVertical className="h-3.5 w-3.5 text-muted-foreground" />
                  Placement
                </Label>
                <div className="grid grid-cols-3 gap-1">
                  {(["top", "middle", "bottom"] as const).map((pos) => (
                    <Button
                      key={pos}
                      type="button"
                      variant={position === pos ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPosition(pos)}
                      className={`h-8 text-xs capitalize ${
                        position === pos ? "bg-indigo-600 text-white" : ""
                      }`}
                    >
                      {pos}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {/* Text Primary Color */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-muted-foreground">Primary Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="h-7 w-7 rounded cursor-pointer border p-0.5"
                  />
                  <span className="text-xs font-mono">{textColor}</span>
                </div>
              </div>

              {/* Highlight / Glow Color */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-muted-foreground">Highlight Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={highlightColor}
                    onChange={(e) => setHighlightColor(e.target.value)}
                    className="h-7 w-7 rounded cursor-pointer border p-0.5"
                  />
                  <span className="text-xs font-mono">{highlightColor}</span>
                </div>
              </div>

              {/* Animation Style */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-muted-foreground">Animation</Label>
                <select
                  value={animation}
                  onChange={(e) => setAnimation(e.target.value as any)}
                  className="h-8 w-full text-xs rounded border border-input bg-background px-1.5"
                >
                  <option value="pop">Pop (Bouncy Word)</option>
                  <option value="karaoke">Karaoke Glow</option>
                  <option value="none">Clean Static</option>
                </select>
              </div>
            </div>

            {/* Sliders: Font Size & Max Chars */}
            <div className="grid grid-cols-2 gap-4 pt-1">
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Target Size (1080p):</span>
                  <span className="font-semibold">{fontSize}px</span>
                </div>
                <input
                  type="range"
                  min="28"
                  max="64"
                  step="2"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Max Chars Per Line:</span>
                  <span className="font-semibold">{maxChars}</span>
                </div>
                <input
                  type="range"
                  min="16"
                  max="44"
                  step="2"
                  value={maxChars}
                  onChange={(e) => setMaxChars(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 9:16 Vertical Subtitle Screen Preview (FIXED INVISIBILITY BUG) */}
      <div className="lg:col-span-5 flex flex-col items-center">
        <Card className="w-full flex flex-col items-center p-4 bg-muted/20">
          <div className="w-full flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              9:16 Mobile Subtitle Renderer Preview
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSimulating(!simulating)}
              className="h-6 text-[10px] gap-1 px-2 text-indigo-600 border-indigo-400/40"
            >
              {simulating ? <RotateCcw className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              {simulating ? "Pause" : "Simulate Sync"}
            </Button>
          </div>

          {/* 9:16 Mobile Screen Container */}
          <div className="relative w-52 aspect-[9/16] rounded-3xl border-4 border-slate-900 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 overflow-hidden shadow-2xl flex flex-col justify-between p-3.5 text-white">
            {/* Top Bar Indicator */}
            <div className="flex items-center justify-between text-[8px] text-white/50">
              <span className="font-mono">1080×1920 (9:16)</span>
              <span className="bg-red-500/80 px-1 py-0.2 rounded text-[7px] text-white font-bold">REEL</span>
            </div>

            {/* Subtitle Placement Area */}
            <div
              className={`w-full flex items-center justify-center px-1.5 py-1 text-center transition-all ${
                position === "middle"
                  ? "my-auto"
                  : position === "top"
                  ? "mt-12"
                  : "mb-14"
              }`}
            >
              <div
                style={{
                  fontFamily,
                  fontSize: `${previewFontSizePx}px`,
                  backgroundColor,
                  padding: "4px 8px",
                  borderRadius: "6px",
                  lineHeight: "1.25",
                  fontWeight: "900",
                  textAlign: "center",
                  maxWidth: "96%",
                  wordWrap: "break-word",
                  // CRITICAL FIX: Subtle text shadow without heavy stroke so yellow/white fill is crisp & 100% visible on dark background
                  color: textColor,
                  textShadow:
                    selectedPreset === "karaoke"
                      ? `0px 0px 8px ${highlightColor}, 1px 1px 3px rgba(0,0,0,0.9)`
                      : "1px 1px 2px rgba(0,0,0,0.95), -1px -1px 2px rgba(0,0,0,0.95)",
                  WebkitTextStroke: "0.3px #000000",
                  paintOrder: "stroke fill",
                }}
              >
                {simulating ? (
                  words.map((w, idx) => (
                    <span
                      key={idx}
                      style={{
                        color: idx === activeWordIndex ? highlightColor : textColor,
                        transform: idx === activeWordIndex && animation === "pop" ? "scale(1.15)" : "scale(1)",
                        display: "inline-block",
                        marginRight: "4px",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {w}
                    </span>
                  ))
                ) : (
                  <span>
                    {samplePhrase.slice(0, 24)}{" "}
                    <span style={{ color: highlightColor }}>
                      {samplePhrase.slice(24, 38)}
                    </span>{" "}
                    {samplePhrase.slice(38)}
                  </span>
                )}
              </div>
            </div>

            {/* Bottom Status Tag */}
            <div className="flex items-center justify-between text-[8px] text-white/40 pt-1 border-t border-white/10">
              <span>Preset: <strong className="text-white/80">{activePresetConfig.name.split(" ")[0]}</strong></span>
              <span>{position.toUpperCase()}</span>
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground mt-3 text-center">
            Final render will be compiled with 1080×1920 ASS burned-in subtitles at 30 FPS.
          </p>
        </Card>
      </div>
    </div>
  );
}
