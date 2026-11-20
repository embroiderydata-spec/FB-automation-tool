"use client";

import React, { useState } from "react";
import { Subtitles, CheckCircle2, Sparkles, Sliders } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
    "STOP DOING THIS RIGHT NOW! (99% OF PEOPLE GET THIS WRONG)"
  );

  const presets = Object.values(SUBTITLE_PRESETS);
  const activeConfig = SUBTITLE_PRESETS[selectedPreset] || SUBTITLE_PRESETS.bold_viral;

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      {/* Preset Selector */}
      <Card className="lg:col-span-7">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Subtitles className="h-4 w-4 text-primary" />
            Reels Subtitle Style Presets
          </CardTitle>
          <CardDescription className="text-xs">
            Kinetic animated subtitles formatted for high retention and readability on mobile viewports.
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
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "hover:border-primary/40 bg-card"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-foreground">{preset.name}</span>
                  {selectedPreset === preset.id && (
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span>Font: {preset.fontFamily.split(",")[0]}</span>
                  <span>•</span>
                  <span>Position: {preset.position}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <label className="text-xs font-semibold text-muted-foreground block mb-1">
              Sample Subtitle Text
            </label>
            <input
              type="text"
              value={samplePhrase}
              onChange={(e) => setSamplePhrase(e.target.value)}
              className="w-full h-8 text-xs px-2.5 rounded border border-input bg-background"
            />
          </div>
        </CardContent>
      </Card>

      {/* 9:16 Vertical Subtitle Screen Preview */}
      <Card className="lg:col-span-5 flex flex-col items-center justify-center p-4 bg-muted/10">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          9:16 Mobile Subtitle Renderer Preview
        </span>

        <div className="relative w-48 aspect-[9/16] rounded-2xl border-4 border-slate-800 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 overflow-hidden shadow-2xl flex flex-col justify-between p-3 text-white">
          <div className="text-[8px] text-white/50 text-right">9:16 • 1080×1920</div>

          {/* Subtitle Placement Area */}
          <div
            className={`w-full flex items-center justify-center px-2 py-1 text-center transition-all ${
              activeConfig.position === "middle"
                ? "my-auto"
                : activeConfig.position === "top"
                ? "mt-12"
                : "mb-16"
            }`}
          >
            <span
              style={{
                fontFamily: activeConfig.fontFamily,
                fontSize: "12px",
                color: activeConfig.textColor,
                textShadow: activeConfig.shadow,
                WebkitTextStroke: `${activeConfig.outlineWidth / 2}px ${activeConfig.outlineColor}`,
                backgroundColor: activeConfig.backgroundColor,
                padding: "2px 6px",
                borderRadius: "4px",
                lineHeight: "1.2",
                fontWeight: "900",
                display: "inline-block",
                textAlign: "center",
              }}
            >
              {samplePhrase}
            </span>
          </div>

          <div className="text-[8px] text-white/50 text-center">
            Preset: <strong>{activeConfig.name}</strong>
          </div>
        </div>
      </Card>
    </div>
  );
}
