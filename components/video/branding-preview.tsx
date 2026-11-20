"use client";

import React, { useState, useEffect } from "react";
import {
  Stamp,
  Save,
  CheckCircle2,
  Image as ImageIcon,
  Sliders,
  Eye,
  Film,
  Music,
  Palette,
  Mic,
  Subtitles,
  Loader2,
  Globe,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SUBTITLE_PRESETS } from "@/lib/video/subtitles/engine";

interface BrandingPreviewProps {
  pageId: string;
  pageName: string;
  pages?: any[];
  onPageChange?: (newPageId: string) => void;
}

export function BrandingPreview({
  pageId,
  pageName,
  pages = [],
  onPageChange,
}: BrandingPreviewProps) {
  const isGlobal = pageId === "global" || pageId === "all";

  // Form State
  const [brandName, setBrandName] = useState(isGlobal ? "PagePulse Media" : pageName);
  const [logoUrl, setLogoUrl] = useState("");
  const [position, setPosition] = useState<
    "top_left" | "top_right" | "bottom_left" | "bottom_right"
  >("bottom_right");
  const [size, setSize] = useState(0.18);
  const [opacity, setOpacity] = useState(0.85);
  const [enableWatermark, setEnableWatermark] = useState(true);

  // Extended Branding (Intro/Outro, Colors, Presets)
  const [introUrl, setIntroUrl] = useState("");
  const [outroUrl, setOutroUrl] = useState("");
  const [introDuration, setIntroDuration] = useState(2.0);
  const [outroDuration, setOutroDuration] = useState(3.0);
  const [primaryColor, setPrimaryColor] = useState("#6366f1");
  const [secondaryColor, setSecondaryColor] = useState("#4f46e5");
  const [defaultSubtitlePreset, setDefaultSubtitlePreset] = useState("bold_viral");
  const [defaultVoiceId, setDefaultVoiceId] = useState("21m00Tcm4TlvDq8ikWAM");
  const [defaultBgMusic, setDefaultBgMusic] = useState("upbeat_lofi");
  const [videoEndingType, setVideoEndingType] = useState<"fade_to_black" | "brand_card" | "seamless_loop">("brand_card");

  // Interaction State
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load branding on page change
  useEffect(() => {
    loadBranding();
  }, [pageId]);

  async function loadBranding() {
    try {
      const endpoint = isGlobal
        ? `/api/facebook-pages/global/branding`
        : `/api/facebook-pages/${pageId}/branding`;

      const res = await fetch(endpoint);
      const data = await res.json();
      if (res.ok && data.branding) {
        const b = data.branding;
        setBrandName(b.brand_name || (isGlobal ? "PagePulse Media" : pageName));
        setLogoUrl(b.watermark_logo_url || "");
        setPosition(b.watermark_position || "bottom_right");
        setSize(b.watermark_size || 0.18);
        setOpacity(b.watermark_opacity || 0.85);
        setEnableWatermark(b.enable_watermark ?? true);

        setIntroUrl(b.intro_video_url || "");
        setOutroUrl(b.outro_video_url || "");
        setIntroDuration(b.intro_duration_seconds || 2.0);
        setOutroDuration(b.outro_duration_seconds || 3.0);
        setPrimaryColor(b.brand_primary_color || "#6366f1");
        setSecondaryColor(b.brand_secondary_color || "#4f46e5");
        setDefaultSubtitlePreset(b.default_subtitle_preset || "bold_viral");
        setDefaultVoiceId(b.default_voice_id || "21m00Tcm4TlvDq8ikWAM");
        setDefaultBgMusic(b.default_bg_music_url || "upbeat_lofi");
        setVideoEndingType(b.video_ending_type || "brand_card");
      }
    } catch {
      // Ignore
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSaved(false);

      const endpoint = isGlobal
        ? `/api/facebook-pages/global/branding`
        : `/api/facebook-pages/${pageId}/branding`;

      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand_name: brandName,
          watermark_logo_url: logoUrl || null,
          watermark_position: position,
          watermark_size: Number(size),
          watermark_opacity: Number(opacity),
          enable_watermark: enableWatermark,
          intro_video_url: introUrl || null,
          outro_video_url: outroUrl || null,
          intro_duration_seconds: Number(introDuration),
          outro_duration_seconds: Number(outroDuration),
          brand_primary_color: primaryColor,
          brand_secondary_color: secondaryColor,
          default_subtitle_preset: defaultSubtitlePreset,
          default_voice_id: defaultVoiceId,
          default_bg_music_url: defaultBgMusic,
          video_ending_type: videoEndingType,
          is_global: isGlobal,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save branding.");

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setError(err.message || "Failed to save branding.");
    } finally {
      setSaving(false);
    }
  }

  // Calculate position classes inside 9:16 container
  const positionClasses = {
    top_left: "top-4 left-4",
    top_right: "top-4 right-4",
    bottom_left: "bottom-8 left-4",
    bottom_right: "bottom-8 right-4",
  };

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      {/* Controls Form */}
      <div className="lg:col-span-7 space-y-6">
        <Card>
          <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Stamp className="h-4 w-4 text-indigo-500" />
                <CardTitle className="text-sm font-semibold">
                  {isGlobal ? "Global Default Branding" : `Page Branding: ${pageName}`}
                </CardTitle>
              </div>
              <CardDescription className="text-xs">
                Configure watermarks, brand color schemes, intro/outro bumpers, default subtitles, and background audio.
              </CardDescription>
            </div>

            {/* Scope Switcher */}
            {pages.length > 0 && onPageChange && (
              <select
                value={pageId}
                onChange={(e) => onPageChange(e.target.value)}
                className="h-8 text-xs rounded border border-input bg-background px-2"
              >
                <option value="global">🌐 Global Defaults</option>
                {pages.map((p) => (
                  <option key={p.id} value={p.id}>
                    📄 {p.page_name || p.name}
                  </option>
                ))}
              </select>
            )}
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-xs">
                  {error}
                </div>
              )}

              {/* Watermark Section */}
              <div className="space-y-3 p-3 rounded-lg border bg-muted/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <ImageIcon className="h-3.5 w-3.5 text-indigo-500" />
                    Watermark & Channel Overlay
                  </span>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableWatermark}
                      onChange={(e) => setEnableWatermark(e.target.checked)}
                      className="rounded border-input text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Enable Watermark</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Brand Display Name</Label>
                    <Input
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                      placeholder="e.g. PagePulse Media"
                      className="h-8 text-xs bg-background"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Logo / Watermark Image URL</Label>
                    <Input
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="https://.../logo.png"
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                </div>

                {/* Watermark Placement & Sliders */}
                <div className="grid grid-cols-3 gap-3 pt-1">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Placement</Label>
                    <select
                      value={position}
                      onChange={(e) => setPosition(e.target.value as any)}
                      className="h-7 w-full text-xs rounded border border-input bg-background px-1.5"
                    >
                      <option value="top_left">Top Left</option>
                      <option value="top_right">Top Right</option>
                      <option value="bottom_left">Bottom Left</option>
                      <option value="bottom_right">Bottom Right</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">Scale:</span>
                      <span className="font-semibold">{Math.round(size * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.08"
                      max="0.35"
                      step="0.01"
                      value={size}
                      onChange={(e) => setSize(Number(e.target.value))}
                      className="w-full accent-indigo-600 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">Opacity:</span>
                      <span className="font-semibold">{Math.round(opacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="1.0"
                      step="0.05"
                      value={opacity}
                      onChange={(e) => setOpacity(Number(e.target.value))}
                      className="w-full accent-indigo-600 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Brand Colors & Visual Accents */}
              <div className="space-y-3 p-3 rounded-lg border bg-muted/20">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Palette className="h-3.5 w-3.5 text-indigo-500" />
                  Brand Identity Colors & Accent Bars
                </span>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="h-7 w-7 rounded cursor-pointer border p-0.5"
                    />
                    <div>
                      <Label className="text-xs block">Primary Brand Color</Label>
                      <span className="text-[10px] text-muted-foreground font-mono">{primaryColor}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="h-7 w-7 rounded cursor-pointer border p-0.5"
                    />
                    <div>
                      <Label className="text-xs block">Secondary Accent Color</Label>
                      <span className="text-[10px] text-muted-foreground font-mono">{secondaryColor}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Intro & Outro Settings */}
              <div className="space-y-3 p-3 rounded-lg border bg-muted/20">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Film className="h-3.5 w-3.5 text-indigo-500" />
                  Intro & Outro Bumpers (Optional)
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <Label className="text-xs">Intro Bumper URL</Label>
                      <span className="text-[10px] text-muted-foreground font-mono">{introDuration}s</span>
                    </div>
                    <Input
                      value={introUrl}
                      onChange={(e) => setIntroUrl(e.target.value)}
                      placeholder="https://.../intro.mp4"
                      className="h-8 text-xs bg-background"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <Label className="text-xs">Outro Call-to-Action URL</Label>
                      <span className="text-[10px] text-muted-foreground font-mono">{outroDuration}s</span>
                    </div>
                    <Input
                      value={outroUrl}
                      onChange={(e) => setOutroUrl(e.target.value)}
                      placeholder="https://.../outro.mp4"
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                </div>

                <div className="space-y-1 pt-1">
                  <Label className="text-xs">Video Ending Style</Label>
                  <select
                    value={videoEndingType}
                    onChange={(e) => setVideoEndingType(e.target.value as any)}
                    className="h-8 w-full text-xs rounded border border-input bg-background px-2"
                  >
                    <option value="brand_card">Branded End-Card (Follow & Like CTA)</option>
                    <option value="fade_to_black">Cinematic Fade to Black</option>
                    <option value="seamless_loop">Seamless Loop (First Frame Transition)</option>
                  </select>
                </div>
              </div>

              {/* Default Presets for Content Pipeline */}
              <div className="space-y-3 p-3 rounded-lg border bg-muted/20">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-indigo-500" />
                  Default Pipeline Presets
                </span>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Default Subtitles</Label>
                    <select
                      value={defaultSubtitlePreset}
                      onChange={(e) => setDefaultSubtitlePreset(e.target.value)}
                      className="h-7 w-full text-xs rounded border border-input bg-background px-1.5"
                    >
                      <option value="bold_viral">Bold Viral</option>
                      <option value="karaoke">Karaoke Glow</option>
                      <option value="classic">Classic Clean</option>
                      <option value="minimal">Minimalist</option>
                      <option value="highlight_keywords">Highlight Keywords</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Default Voice</Label>
                    <select
                      value={defaultVoiceId}
                      onChange={(e) => setDefaultVoiceId(e.target.value)}
                      className="h-7 w-full text-xs rounded border border-input bg-background px-1.5"
                    >
                      <option value="21m00Tcm4TlvDq8ikWAM">Rachel (Calm)</option>
                      <option value="AZnzlk1XvdvUeBnXmlld">Domi (Energetic)</option>
                      <option value="EXAVITQu4vr4xnSDxMaL">Bella (Warm)</option>
                      <option value="TxGEqnHWrfWFTfGW9XjX">Josh (Deep)</option>
                      <option value="alloy">OpenAI Alloy</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Background Music</Label>
                    <select
                      value={defaultBgMusic}
                      onChange={(e) => setDefaultBgMusic(e.target.value)}
                      className="h-7 w-full text-xs rounded border border-input bg-background px-1.5"
                    >
                      <option value="upbeat_lofi">Upbeat Lo-Fi Chill</option>
                      <option value="energetic_drill">Energetic Electronic</option>
                      <option value="cinematic_ambient">Cinematic Ambient</option>
                      <option value="corporate_tech">Corporate Modern</option>
                      <option value="none">No Background Music</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="submit"
                  disabled={saving}
                  className="gap-1.5 text-xs h-8 bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : saved ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
                      Saved Successfully!
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      Save Branding Settings
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* 9:16 Vertical Screen Live Watermark & Branding Preview */}
      <div className="lg:col-span-5 flex flex-col items-center">
        <Card className="w-full flex flex-col items-center p-4 bg-muted/20">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            9:16 Video Canvas Branding Preview
          </span>

          <div className="relative w-52 aspect-[9/16] rounded-3xl border-4 border-slate-900 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 overflow-hidden shadow-2xl flex flex-col justify-between p-3.5 text-white">
            {/* Top Brand Accent Bar */}
            <div
              className="w-full h-1 rounded-full shadow-xs"
              style={{ backgroundColor: primaryColor }}
            />

            {/* Top Bar Details */}
            <div className="flex items-center justify-between text-[8px] text-white/50 pt-1">
              <span>9:16 Full HD</span>
              <span>30 FPS</span>
            </div>

            {/* Dynamic Watermark Positioned Inside Canvas */}
            {enableWatermark && (
              <div
                className={`absolute ${positionClasses[position]} flex items-center gap-1.5 px-2 py-1 rounded-md backdrop-blur-xs transition-all`}
                style={{
                  opacity,
                  backgroundColor: "rgba(0,0,0,0.45)",
                  border: `1px solid ${primaryColor}40`,
                }}
              >
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Logo"
                    className="h-4 w-4 object-contain rounded-xs"
                    onError={(e) => {
                      (e.target as any).style.display = "none";
                    }}
                  />
                ) : (
                  <div
                    className="h-3.5 w-3.5 rounded-full flex items-center justify-center text-[7px] font-bold text-white shadow-xs"
                    style={{ backgroundColor: primaryColor }}
                  >
                    ★
                  </div>
                )}
                <span className="text-[9px] font-bold tracking-tight text-white drop-shadow-xs">
                  {brandName}
                </span>
              </div>
            )}

            {/* Center Reel Content Simulation */}
            <div className="my-auto text-center px-2 space-y-1">
              <span className="text-[9px] text-white/40 uppercase tracking-widest block font-mono">
                AI REEL FOOTAGE
              </span>
              <div className="w-16 h-1 bg-white/10 mx-auto rounded-full" />
            </div>

            {/* Ending CTA Simulation */}
            {videoEndingType === "brand_card" && (
              <div
                className="p-1.5 rounded-lg border text-center space-y-0.5"
                style={{
                  borderColor: `${secondaryColor}50`,
                  backgroundColor: "rgba(15, 23, 42, 0.75)",
                }}
              >
                <span className="text-[8px] font-bold text-white block">FOLLOW FOR DAILY TIPS</span>
                <span className="text-[7px] text-white/60">@{brandName.toLowerCase().replace(/\s+/g, "")}</span>
              </div>
            )}

            {/* Bottom Brand Accent Bar */}
            <div
              className="w-full h-1 rounded-full shadow-xs"
              style={{ backgroundColor: secondaryColor }}
            />
          </div>

          <p className="text-[10px] text-muted-foreground mt-3 text-center">
            Branding elements and watermarks are burned into the final 1080×1920 MP4 via FFmpeg.
          </p>
        </Card>
      </div>
    </div>
  );
}
