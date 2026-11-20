"use client";

import React, { useState, useEffect } from "react";
import { Stamp, Save, CheckCircle2, Image, Sliders, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface BrandingPreviewProps {
  pageId: string;
  pageName: string;
}

export function BrandingPreview({ pageId, pageName }: BrandingPreviewProps) {
  const [brandName, setBrandName] = useState(pageName);
  const [logoUrl, setLogoUrl] = useState("");
  const [position, setPosition] = useState<
    "top_left" | "top_right" | "bottom_left" | "bottom_right"
  >("bottom_right");
  const [size, setSize] = useState(0.18);
  const [opacity, setOpacity] = useState(0.85);
  const [enableWatermark, setEnableWatermark] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (pageId && pageId !== "all") {
      loadBranding();
    }
  }, [pageId]);

  async function loadBranding() {
    try {
      const res = await fetch(`/api/facebook-pages/${pageId}/branding`);
      const data = await res.json();
      if (res.ok && data.branding) {
        setBrandName(data.branding.brand_name || pageName);
        setLogoUrl(data.branding.watermark_logo_url || "");
        setPosition(data.branding.watermark_position || "bottom_right");
        setSize(data.branding.watermark_size || 0.18);
        setOpacity(data.branding.watermark_opacity || 0.85);
        setEnableWatermark(data.branding.enable_watermark ?? true);
      }
    } catch {
      // Ignore
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!pageId || pageId === "all") return;
    try {
      setSaving(true);
      setError(null);
      setSaved(false);

      const res = await fetch(`/api/facebook-pages/${pageId}/branding`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand_name: brandName,
          watermark_logo_url: logoUrl || null,
          watermark_position: position,
          watermark_size: Number(size),
          watermark_opacity: Number(opacity),
          enable_watermark: enableWatermark,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save branding.");

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
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
      <Card className="lg:col-span-7">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Stamp className="h-4 w-4 text-indigo-500" />
              <CardTitle className="text-sm font-semibold">Page Branding Settings</CardTitle>
            </div>
            <Badge variant="outline" className="text-[10px]">
              {pageName}
            </Badge>
          </div>
          <CardDescription className="text-xs">
            Configure logo overlays and copyright watermarks isolated specifically for this Facebook Page.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            {error && (
              <div className="p-2.5 rounded border border-red-500/30 bg-red-500/10 text-red-600 text-xs">
                {error}
              </div>
            )}
            {saved && (
              <div className="p-2.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 text-xs flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                Branding settings saved for {pageName}!
              </div>
            )}

            <div>
              <Label className="text-xs">Brand Display Name</Label>
              <Input
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="e.g. Daily TechPulse"
                className="h-8 text-xs mt-1"
              />
            </div>

            <div>
              <Label className="text-xs">Watermark Logo URL (PNG with Transparency)</Label>
              <Input
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://yourdomain.com/brand-watermark.png"
                className="h-8 text-xs mt-1"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Watermark Placement</Label>
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value as any)}
                  className="w-full h-8 mt-1 text-xs rounded-md border border-input bg-background px-2"
                >
                  <option value="bottom_right">Bottom Right (Recommended for Reels)</option>
                  <option value="bottom_left">Bottom Left</option>
                  <option value="top_right">Top Right</option>
                  <option value="top_left">Top Left</option>
                </select>
              </div>

              <div>
                <Label className="text-xs">Opacity ({Math.round(opacity * 100)}%)</Label>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={opacity}
                  onChange={(e) => setOpacity(parseFloat(e.target.value))}
                  className="w-full mt-2"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="enableWatermark"
                checked={enableWatermark}
                onChange={(e) => setEnableWatermark(e.target.checked)}
                className="rounded border-input text-primary"
              />
              <label htmlFor="enableWatermark" className="text-xs text-foreground cursor-pointer">
                Burn watermark onto final 9:16 vertical videos during FFmpeg composition
              </label>
            </div>

            <div className="pt-3 border-t flex justify-end">
              <Button type="submit" size="sm" disabled={saving} className="gap-1.5 text-xs">
                <Save className="h-3.5 w-3.5" />
                {saving ? "Saving..." : "Save Branding"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Live 9:16 Vertical Phone Mockup Preview */}
      <Card className="lg:col-span-5 flex flex-col items-center justify-center p-4 bg-muted/10">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Eye className="h-3.5 w-3.5" />
          9:16 Mobile Reels Watermark Preview
        </span>

        <div className="relative w-48 aspect-[9/16] rounded-2xl border-4 border-slate-800 bg-slate-950 overflow-hidden shadow-2xl flex flex-col justify-between p-3 text-white">
          {/* Top Reels Meta */}
          <div className="flex items-center justify-between text-[8px] text-white/70">
            <span>● LIVE REELS</span>
            <span>1080×1920</span>
          </div>

          {/* Watermark Overlay Preview */}
          {enableWatermark && (
            <div
              className={`absolute ${positionClasses[position]} flex items-center gap-1 bg-black/40 px-1.5 py-0.5 rounded backdrop-blur-xs`}
              style={{ opacity }}
            >
              {logoUrl ? (
                <img src={logoUrl} alt="Watermark" className="h-4 w-4 object-contain" />
              ) : (
                <Stamp className="h-3 w-3 text-white" />
              )}
              <span className="text-[8px] font-bold text-white tracking-wider">
                @{brandName || "Brand"}
              </span>
            </div>
          )}

          {/* Bottom Reel Caption Simulation */}
          <div className="space-y-1">
            <span className="text-[9px] font-bold text-white block">@{brandName || "page"}</span>
            <p className="text-[7px] text-white/80 line-clamp-2">
              Viral Facebook Reels hook simulation with automatic kinetic subtitles and watermark protection.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
