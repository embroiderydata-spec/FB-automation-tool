"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  User,
  Database,
  Shield,
  Sliders,
  Bell,
  Moon,
  Sun,
  DollarSign,
  Save,
  CheckCircle2,
  Loader2,
  Globe,
  Lock,
  Cpu,
  Layers,
  Sparkles,
  AlertTriangle,
  Send,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth/auth-context";
import { useTheme } from "next-themes";
import { SystemMonitor } from "@/components/settings/system-monitor";

export default function SettingsPage() {
  const { user, isConfigured } = useAuth();
  const { theme, setTheme } = useTheme();

  // Settings State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [timezone, setTimezone] = useState("UTC");
  const [dailyBudget, setDailyBudget] = useState(25.0);
  const [monthlyBudget, setMonthlyBudget] = useState(500.0);
  const [maxCostPerVideo, setMaxCostPerVideo] = useState(1.5);
  const [maxPostsPerDay, setMaxPostsPerDay] = useState(3);
  const [defaultLlm, setDefaultLlm] = useState("openai");
  const [defaultVideo, setDefaultVideo] = useState("replicate");
  const [defaultVoice, setDefaultVoice] = useState("elevenlabs");
  const [autoPublish, setAutoPublish] = useState(false);
  const [requireApproval, setRequireApproval] = useState(true);
  const [notifyPublish, setNotifyPublish] = useState(true);
  const [notifyFailure, setNotifyFailure] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          const s = data.settings;
          setTimezone(s.timezone || "UTC");
          setDailyBudget(s.daily_budget_limit || 25.0);
          setMonthlyBudget(s.monthly_budget_limit || 500.0);
          setMaxCostPerVideo(s.max_cost_per_video || 1.5);
          setMaxPostsPerDay(s.max_posts_per_day_per_page || 3);
          setDefaultLlm(s.default_llm_provider || "openai");
          setDefaultVideo(s.default_video_provider || "replicate");
          setDefaultVoice(s.default_voice_provider || "elevenlabs");
          setAutoPublish(s.auto_publish_default ?? false);
          setRequireApproval(s.require_manual_approval ?? true);
          setNotifyPublish(s.notify_on_publish ?? true);
          setNotifyFailure(s.notify_on_failure ?? true);
        }
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      setErrorMessage(null);
      setSavedSuccess(false);

      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timezone,
          daily_budget_limit: Number(dailyBudget),
          monthly_budget_limit: Number(monthlyBudget),
          max_cost_per_video: Number(maxCostPerVideo),
          max_posts_per_day_per_page: Number(maxPostsPerDay),
          default_llm_provider: defaultLlm,
          default_video_provider: defaultVideo,
          default_voice_provider: defaultVoice,
          auto_publish_default: autoPublish,
          require_manual_approval: requireApproval,
          notify_on_publish: notifyPublish,
          notify_on_failure: notifyFailure,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save settings.");

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err: any) {
      setErrorMessage(err.message || "Error saving settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Platform Settings & Architecture
          </h2>
          <Badge variant="outline" className="text-[10px] border-indigo-500/40 text-indigo-600 dark:text-indigo-400">
            Production Active
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Manage system configurations, reliability monitoring, background worker telemetry, and multi-page capacity limits.
        </p>
      </div>

      {/* Production Health & Reliability Monitor */}
      <SystemMonitor />

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {errorMessage && (
          <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-xs">
            {errorMessage}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Automation & Budget Guard Settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-500" />
                AI Budget Guard & Multi-Page Limits
              </CardTitle>
              <CardDescription className="text-xs">
                Hard cost ceilings to prevent unexpected cloud API overages across all managed Pages.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Daily Budget Ceiling ($)</Label>
                  <Input
                    type="number"
                    step="1.0"
                    min="5"
                    max="500"
                    value={dailyBudget}
                    onChange={(e) => setDailyBudget(Number(e.target.value))}
                    className="h-8 text-xs bg-background"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Monthly Budget Ceiling ($)</Label>
                  <Input
                    type="number"
                    step="10.0"
                    min="50"
                    max="5000"
                    value={monthlyBudget}
                    onChange={(e) => setMonthlyBudget(Number(e.target.value))}
                    className="h-8 text-xs bg-background"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Max Cost Per Video ($)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.5"
                    max="10"
                    value={maxCostPerVideo}
                    onChange={(e) => setMaxCostPerVideo(Number(e.target.value))}
                    className="h-8 text-xs bg-background"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Max Posts / Day (Per Page)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={maxPostsPerDay}
                    onChange={(e) => setMaxPostsPerDay(Number(e.target.value))}
                    className="h-8 text-xs bg-background"
                  />
                </div>
              </div>

              <div className="space-y-1 pt-1">
                <Label className="text-xs flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                  Default Scheduling Timezone
                </Label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="h-8 w-full text-xs rounded border border-input bg-background px-2"
                >
                  <option value="UTC">UTC (Universal Time)</option>
                  <option value="America/New_York">EST (New York)</option>
                  <option value="America/Chicago">CST (Chicago)</option>
                  <option value="America/Los_Angeles">PST (Los Angeles)</option>
                  <option value="Europe/London">GMT (London)</option>
                  <option value="Asia/Karachi">PKT (Karachi)</option>
                  <option value="Asia/Dubai">GST (Dubai)</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Default AI Providers & Automation Defaults */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Cpu className="h-4 w-4 text-indigo-500" />
                Default AI Providers & Gates
              </CardTitle>
              <CardDescription className="text-xs">
                Configure primary AI engines and safety gates for autonomous content execution.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">LLM Scripting Engine</Label>
                  <select
                    value={defaultLlm}
                    onChange={(e) => setDefaultLlm(e.target.value)}
                    className="h-8 w-full text-xs rounded border border-input bg-background px-2"
                  >
                    <option value="openai">OpenAI (GPT-4o)</option>
                    <option value="anthropic">Anthropic (Claude 3.5)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Video Generation Engine</Label>
                  <select
                    value={defaultVideo}
                    onChange={(e) => setDefaultVideo(e.target.value)}
                    className="h-8 w-full text-xs rounded border border-input bg-background px-2"
                  >
                    <option value="replicate">Replicate (Minimax / Flux)</option>
                    <option value="runway">Runway (Gen-3 Alpha Turbo)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Voiceover Synthesis</Label>
                <select
                  value={defaultVoice}
                  onChange={(e) => setDefaultVoice(e.target.value)}
                  className="h-8 w-full text-xs rounded border border-input bg-background px-2"
                >
                  <option value="elevenlabs">ElevenLabs (Multilingual v2)</option>
                  <option value="openai">OpenAI TTS</option>
                </select>
              </div>

              <div className="space-y-2 pt-2 border-t">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requireApproval}
                    onChange={(e) => setRequireApproval(e.target.checked)}
                    className="rounded text-indigo-600 border-input"
                  />
                  <span>Require Manual Approval before Publishing</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoPublish}
                    onChange={(e) => setAutoPublish(e.target.checked)}
                    className="rounded text-indigo-600 border-input"
                  />
                  <span>Enable Auto-Publish by default on new Storyboards</span>
                </label>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
          <span className="text-xs text-muted-foreground">
            Settings persist to Supabase PostgreSQL and survive page refreshes.
          </span>
          <Button
            type="submit"
            disabled={saving}
            className="gap-1.5 text-xs h-8 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving...
              </>
            ) : savedSuccess ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
                Settings Saved!
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                Save Platform Preferences
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Profile & Appearance Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Administrator Profile
            </CardTitle>
            <CardDescription className="text-xs">
              Linked to Supabase auth user profile
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Email Address</Label>
              <Input
                value={user?.email || "embroiderydata@gmail.com"}
                readOnly
                className="h-8 text-xs bg-muted/30 font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Admin Name</Label>
              <Input
                value={user?.fullName || "Embroidery Data Admin"}
                readOnly
                className="h-8 text-xs bg-muted/30"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Account Mode</Label>
              <div>
                <Badge variant="success" className="text-xs">
                  Production Supabase Authenticated
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Appearance Settings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Moon className="h-4 w-4 text-primary" />
              Theme & Appearance
            </CardTitle>
            <CardDescription className="text-xs">
              Toggle between modern dark and clean light modes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-foreground">Interface Theme</p>
                <p className="text-[11px] text-muted-foreground">Currently: {theme || "system"}</p>
              </div>
              <div className="flex gap-1.5">
                <Button
                  variant={theme === "light" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("light")}
                  className="h-8 text-xs gap-1"
                >
                  <Sun className="h-3 w-3" /> Light
                </Button>
                <Button
                  variant={theme === "dark" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("dark")}
                  className="h-8 text-xs gap-1"
                >
                  <Moon className="h-3 w-3" /> Dark
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
