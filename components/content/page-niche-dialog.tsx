"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  Sparkles,
  Save,
  Globe,
  Tag,
  ShieldAlert,
  Sliders,
  CheckCircle2,
  X,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface PageNicheDialogProps {
  pageId: string;
  pageName: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function PageNicheDialog({
  pageId,
  pageName,
  isOpen,
  onClose,
  onSaved,
}: PageNicheDialogProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [niche, setNiche] = useState("");
  const [subNiche, setSubNiche] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [targetCountry, setTargetCountry] = useState("US");
  const [language, setLanguage] = useState("en");
  const [aiTone, setAiTone] = useState("engaging, lively");
  const [contentStyle, setContentStyle] = useState("short-form storytelling");
  const [pageDescription, setPageDescription] = useState("");
  const [topicsToCover, setTopicsToCover] = useState("");
  const [topicsToAvoid, setTopicsToAvoid] = useState("");
  const [preferredFormat, setPreferredFormat] = useState("reels");
  const [originalityGuidelines, setOriginalityGuidelines] = useState("");
  const [durationMin, setDurationMin] = useState(30);
  const [durationMax, setDurationMax] = useState(60);

  useEffect(() => {
    if (isOpen && pageId) {
      loadSettings();
    }
  }, [isOpen, pageId]);

  async function loadSettings() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/facebook-pages/${pageId}/niche`);
      const data = await res.json();
      if (res.ok && data.settings) {
        const s = data.settings;
        setNiche(s.niche || s.niche_category || "");
        setSubNiche(s.sub_niche || "");
        setTargetAudience(s.target_audience || "Facebook Reels Viewers");
        setTargetCountry(s.target_country || "US");
        setLanguage(s.language || "en");
        setAiTone(s.ai_tone || "engaging, lively");
        setContentStyle(s.content_style || "short-form storytelling");
        setPageDescription(s.page_description || "");
        setTopicsToCover(Array.isArray(s.topics_to_cover) ? s.topics_to_cover.join(", ") : "");
        setTopicsToAvoid(Array.isArray(s.topics_to_avoid) ? s.topics_to_avoid.join(", ") : "");
        setPreferredFormat(s.preferred_content_format || "reels");
        setOriginalityGuidelines(s.originality_guidelines || "");
        setDurationMin(s.video_duration_min || 30);
        setDurationMax(s.video_duration_max || 60);
      }
    } catch (err: any) {
      setError("Failed to load page niche settings.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const coverArray = topicsToCover
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const avoidArray = topicsToAvoid
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await fetch(`/api/facebook-pages/${pageId}/niche`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niche,
          sub_niche: subNiche,
          target_audience: targetAudience,
          target_country: targetCountry,
          language,
          ai_tone: aiTone,
          content_style: contentStyle,
          page_description: pageDescription,
          topics_to_cover: coverArray,
          topics_to_avoid: avoidArray,
          preferred_content_format: preferredFormat,
          originality_guidelines: originalityGuidelines,
          video_duration_min: Number(durationMin),
          video_duration_max: Number(durationMax),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save settings.");
      }

      setSuccess(true);
      setTimeout(() => {
        onSaved?.();
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <CardHeader className="pb-3 border-b flex flex-row items-center justify-between sticky top-0 bg-card z-10">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-bold">Page Niche & Content Profile</CardTitle>
              <Badge variant="outline" className="text-[10px]">
                {pageName}
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Configures the tone, audience, and constraints that drive personalized AI generation for this Page.
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="pt-4">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              Loading Page niche profile...
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 text-xs">
                  {error}
                </div>
              )}
              {success && (
                <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Niche profile saved successfully!
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs">Primary Niche *</Label>
                  <Input
                    value={niche}
                    onChange={(e) => setNiche(e.target.value)}
                    placeholder="e.g. Finance & Wealth"
                    required
                    className="h-8 text-xs mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs">Sub-Niche</Label>
                  <Input
                    value={subNiche}
                    onChange={(e) => setSubNiche(e.target.value)}
                    placeholder="e.g. Side Hustles & Crypto"
                    className="h-8 text-xs mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs">Target Audience</Label>
                  <Input
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    placeholder="e.g. Young professionals (18-35)"
                    className="h-8 text-xs mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs">Target Country</Label>
                  <Input
                    value={targetCountry}
                    onChange={(e) => setTargetCountry(e.target.value)}
                    placeholder="e.g. US, UK, CA"
                    className="h-8 text-xs mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs">Language</Label>
                  <Input
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    placeholder="e.g. en, es, fr"
                    className="h-8 text-xs mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs">Content Tone</Label>
                  <Input
                    value={aiTone}
                    onChange={(e) => setAiTone(e.target.value)}
                    placeholder="e.g. Energetic, authoritative, witty"
                    className="h-8 text-xs mt-1"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">Page / Brand Description</Label>
                <textarea
                  value={pageDescription}
                  onChange={(e) => setPageDescription(e.target.value)}
                  placeholder="Describe the page's mission, themes, and community vibe..."
                  rows={2}
                  className="w-full mt-1 p-2 text-xs rounded-md border border-input bg-background"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs">Priority Topics to Cover (comma-separated)</Label>
                  <Input
                    value={topicsToCover}
                    onChange={(e) => setTopicsToCover(e.target.value)}
                    placeholder="e.g. Passive income, Real estate, AI tools"
                    className="h-8 text-xs mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs">Topics to Strictly Avoid (comma-separated)</Label>
                  <Input
                    value={topicsToAvoid}
                    onChange={(e) => setTopicsToAvoid(e.target.value)}
                    placeholder="e.g. Politics, get-rich-quick scams, drama"
                    className="h-8 text-xs mt-1"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <Label className="text-xs">Preferred Format</Label>
                  <Input
                    value={preferredFormat}
                    onChange={(e) => setPreferredFormat(e.target.value)}
                    placeholder="reels"
                    className="h-8 text-xs mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs">Min Duration (seconds)</Label>
                  <Input
                    type="number"
                    value={durationMin}
                    onChange={(e) => setDurationMin(Number(e.target.value))}
                    min={15}
                    max={180}
                    className="h-8 text-xs mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs">Max Duration (seconds)</Label>
                  <Input
                    type="number"
                    value={durationMax}
                    onChange={(e) => setDurationMax(Number(e.target.value))}
                    min={15}
                    max={180}
                    className="h-8 text-xs mt-1"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">Originality & Content Safety Guidelines</Label>
                <Input
                  value={originalityGuidelines}
                  onChange={(e) => setOriginalityGuidelines(e.target.value)}
                  placeholder="e.g. 100% original angles, no generic cliches, emphasize data points."
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div className="pt-3 border-t flex items-center justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={saving} className="gap-1.5">
                  {saving ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      Save Niche Profile
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
