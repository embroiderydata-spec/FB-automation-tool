"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Save,
  Loader2,
  Sliders,
  Film,
  Calendar,
  Zap,
  CheckCircle2,
  AlertCircle,
  Globe,
  Clock,
  Shield,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";

interface PageSettingsDrawerProps {
  page: any | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function PageSettingsDrawer({
  page,
  open,
  onClose,
  onSaved,
}: PageSettingsDrawerProps) {
  const [activeTab, setActiveTab] = useState("content");
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [niche, setNiche] = useState("");
  const [contentCategory, setContentCategory] = useState("");
  const [contentStyle, setContentStyle] = useState("informative");
  const [targetAudience, setTargetAudience] = useState("");
  const [targetCountry, setTargetCountry] = useState("US");
  const [language, setLanguage] = useState("en");

  // Video Preferences
  const [durationMin, setDurationMin] = useState(30);
  const [durationMax, setDurationMax] = useState(60);
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "16:9" | "1:1">("9:16");
  const [voicePreference, setVoicePreference] = useState("en-US-Standard");
  const [watermarkText, setWatermarkText] = useState("");

  // Publishing Preferences
  const [timezone, setTimezone] = useState("America/New_York");
  const [postingDays, setPostingDays] = useState<string[]>([
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ]);
  const [postsPerDay, setPostsPerDay] = useState(1);
  const [dailyPostLimit, setDailyPostLimit] = useState(3);

  // Automation Flags
  const [automationEnabled, setAutomationEnabled] = useState(false);
  const [requireApproval, setRequireApproval] = useState(true);
  const [contentGenerationEnabled, setContentGenerationEnabled] = useState(false);

  useEffect(() => {
    if (page) {
      const s = page.settings || {};
      setNiche(s.niche || s.niche_category || "Technology & AI");
      setContentCategory(s.content_category || page.category || "General");
      setContentStyle(s.content_style || "informative");
      setTargetAudience(s.target_audience || "Tech professionals and enthusiasts (20-45)");
      setTargetCountry(s.target_country || "US");
      setLanguage(s.language || s.default_language || "en");

      setDurationMin(s.video_duration_min ?? 30);
      setDurationMax(s.video_duration_max ?? 60);
      setAspectRatio((s.aspect_ratio as any) || "9:16");
      setVoicePreference(s.voice_preference || "en-US-Standard");
      setWatermarkText(s.watermark_text || "");

      setTimezone(s.timezone || "America/New_York");
      setPostingDays(
        s.posting_days || [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ]
      );
      setPostsPerDay(s.posts_per_day ?? s.posting_frequency_per_day ?? 1);
      setDailyPostLimit(s.daily_post_limit ?? 3);

      setAutomationEnabled(Boolean(page.automation_enabled));
      setRequireApproval(s.require_approval !== false); // default true
      setContentGenerationEnabled(Boolean(s.content_generation_enabled));

      setErrorMsg(null);
      setSaveSuccess(false);
    }
  }, [page]);

  if (!open || !page) return null;

  const togglePostingDay = (day: string) => {
    setPostingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSave = async () => {
    setLoading(true);
    setErrorMsg(null);
    setSaveSuccess(false);

    try {
      const res = await fetch(`/api/facebook-pages/${page.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niche,
          content_category: contentCategory,
          content_style: contentStyle,
          target_audience: targetAudience,
          target_country: targetCountry,
          language,
          timezone,
          posting_days: postingDays,
          posts_per_day: Number(postsPerDay),
          daily_post_limit: Number(dailyPostLimit),
          video_duration_min: Number(durationMin),
          video_duration_max: Number(durationMax),
          aspect_ratio: aspectRatio,
          voice_preference: voicePreference,
          watermark_text: watermarkText,
          require_approval: requireApproval,
          content_generation_enabled: contentGenerationEnabled,
          auto_publish: automationEnabled,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update page settings.");
      }

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onSaved();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save settings.");
    } finally {
      setLoading(false);
    }
  };

  const allDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="flex h-full w-full max-w-2xl flex-col bg-card border-l shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-3">
            {page.profile_picture_url ? (
              <img
                src={page.profile_picture_url}
                alt={page.page_name}
                className="h-10 w-10 rounded-xl object-cover border"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-base">
                {page.page_name[0]}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-base text-foreground leading-snug">
                  {page.page_name}
                </h3>
                <Badge
                  variant={page.connection_status === "active" ? "success" : "destructive"}
                  className="text-[10px]"
                >
                  {page.connection_status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground font-mono">
                Page ID: {page.page_id} &bull; {page.category}
              </p>
            </div>
          </div>

          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {saveSuccess && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Settings updated successfully in Supabase!</span>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="content" className="text-xs gap-1.5">
                <Sliders className="h-3.5 w-3.5" /> Content
              </TabsTrigger>
              <TabsTrigger value="video" className="text-xs gap-1.5">
                <Film className="h-3.5 w-3.5" /> Video Prefs
              </TabsTrigger>
              <TabsTrigger value="publishing" className="text-xs gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> Schedule
              </TabsTrigger>
              <TabsTrigger value="automation" className="text-xs gap-1.5">
                <Zap className="h-3.5 w-3.5" /> Automation
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: Content Configuration */}
            <TabsContent value="content" className="space-y-4 pt-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Page Niche</Label>
                  <Input
                    value={niche}
                    onChange={(e) => setNiche(e.target.value)}
                    placeholder="e.g. AI Technology, Daily Hustle"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Content Category</Label>
                  <Input
                    value={contentCategory}
                    onChange={(e) => setContentCategory(e.target.value)}
                    placeholder="e.g. Science & Tech"
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Content Tone / Style</Label>
                <select
                  value={contentStyle}
                  onChange={(e) => setContentStyle(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="informative">Informative & Educational</option>
                  <option value="high_energy">High Energy & Viral</option>
                  <option value="storytelling">Narrative & Storytelling</option>
                  <option value="motivational">Inspirational & Motivational</option>
                  <option value="humorous">Humorous & Entertaining</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Target Audience Profile</Label>
                <Input
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="e.g. Entrepreneurs, Students, Tech Enthusiasts"
                  className="h-9 text-xs"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Target Country</Label>
                  <Input
                    value={targetCountry}
                    onChange={(e) => setTargetCountry(e.target.value)}
                    placeholder="US, CA, UK, etc."
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Primary Language</Label>
                  <Input
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    placeholder="en, es, etc."
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: Video Preferences */}
            <TabsContent value="video" className="space-y-4 pt-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Min Duration (Seconds)</Label>
                  <Input
                    type="number"
                    min={5}
                    max={300}
                    value={durationMin}
                    onChange={(e) => setDurationMin(Number(e.target.value))}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Max Duration (Seconds)</Label>
                  <Input
                    type="number"
                    min={10}
                    max={600}
                    value={durationMax}
                    onChange={(e) => setDurationMax(Number(e.target.value))}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Aspect Ratio</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(["9:16", "16:9", "1:1"] as const).map((ratio) => (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => setAspectRatio(ratio)}
                      className={`flex flex-col items-center justify-center rounded-lg border p-3 text-xs transition-colors ${
                        aspectRatio === ratio
                          ? "border-primary bg-primary/10 text-primary font-semibold"
                          : "border-border text-muted-foreground hover:bg-muted/50"
                      }`}
                    >
                      <span className="text-sm font-bold">{ratio}</span>
                      <span className="text-[10px]">
                        {ratio === "9:16" ? "Reels / Shorts" : ratio === "16:9" ? "Landscape" : "Square"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Voiceover Synthesis Profile</Label>
                <select
                  value={voicePreference}
                  onChange={(e) => setVoicePreference(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="en-US-Standard">Standard English (Neutral)</option>
                  <option value="elevenlabs_adam">ElevenLabs - Adam (Deep / Authoritative)</option>
                  <option value="elevenlabs_rachel">ElevenLabs - Rachel (Warm / Professional)</option>
                  <option value="elevenlabs_antoni">ElevenLabs - Antoni (Energetic)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Watermark Logo Text (Optional)</Label>
                <Input
                  value={watermarkText}
                  onChange={(e) => setWatermarkText(e.target.value)}
                  placeholder="e.g. @TechPulseDaily"
                  className="h-9 text-xs"
                />
              </div>
            </TabsContent>

            {/* TAB 3: Publishing Schedule */}
            <TabsContent value="publishing" className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Target Timezone</Label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="America/New_York">Eastern Time (US & Canada) - EST</option>
                  <option value="America/Chicago">Central Time (US & Canada) - CST</option>
                  <option value="America/Denver">Mountain Time (US & Canada) - MST</option>
                  <option value="America/Los_Angeles">Pacific Time (US & Canada) - PST</option>
                  <option value="UTC">Coordinated Universal Time (UTC)</option>
                  <option value="Europe/London">London (GMT/BST)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Active Posting Days</Label>
                <div className="flex flex-wrap gap-1.5">
                  {allDays.map((day) => {
                    const isChecked = postingDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => togglePostingDay(day)}
                        className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                          isChecked
                            ? "border-primary bg-primary text-primary-foreground font-semibold"
                            : "border-border text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {day.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Target Posts per Day</Label>
                  <Input
                    type="number"
                    min={1}
                    max={24}
                    value={postsPerDay}
                    onChange={(e) => setPostsPerDay(Number(e.target.value))}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Strict Daily Post Limit</Label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={dailyPostLimit}
                    onChange={(e) => setDailyPostLimit(Number(e.target.value))}
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            </TabsContent>

            {/* TAB 4: Automation Control */}
            <TabsContent value="automation" className="space-y-4 pt-4">
              <Card className="border-amber-500/20 bg-amber-500/5">
                <CardContent className="p-4 space-y-1 text-xs">
                  <div className="flex items-center gap-2 font-semibold text-foreground">
                    <Shield className="h-4 w-4 text-amber-500" />
                    Safety & Guardrails Principle
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    All automation switches default strictly to <strong>OFF</strong>. No content will ever be generated or published to Facebook without explicit administrator approval.
                  </p>
                </CardContent>
              </Card>

              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-foreground">Auto-Publish to Facebook</div>
                    <p className="text-[11px] text-muted-foreground">
                      Allows scheduled video jobs to post directly to your Facebook Page without manual click.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={automationEnabled}
                    onChange={(e) => setAutomationEnabled(e.target.checked)}
                    className="h-4 w-4 rounded accent-primary cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-foreground">Require Manual Review</div>
                    <p className="text-[11px] text-muted-foreground">
                      Holds generated videos in the approval queue until an admin inspects them.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={requireApproval}
                    onChange={(e) => setRequireApproval(e.target.checked)}
                    className="h-4 w-4 rounded accent-primary cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-foreground">Autonomous Content Generation</div>
                    <p className="text-[11px] text-muted-foreground">
                      Permits AI agent to synthesize scripts and queue video renderings based on posting days.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={contentGenerationEnabled}
                    onChange={(e) => setContentGenerationEnabled(e.target.checked)}
                    className="h-4 w-4 rounded accent-primary cursor-pointer"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Drawer Footer */}
        <div className="flex items-center justify-between border-t px-6 py-3.5 bg-muted/20">
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading} className="text-xs">
            Close
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={loading}
            className="text-xs font-semibold gap-1.5 shadow-xs"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
