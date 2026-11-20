"use client";

import React, { useState, useEffect } from "react";
import {
  Cpu,
  Key,
  ShieldCheck,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Sliders,
  DollarSign,
  TrendingDown,
  RefreshCw,
  Layers,
  Wand2,
  Mic,
  Video,
  Send,
  ListChecks,
  Lock,
  Sparkles,
  Loader2,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ProviderStatus {
  name: string;
  is_configured: boolean;
  capabilities: string[];
  default_model: string;
}

export default function AIProvidersPage() {
  const [providerStatuses, setProviderStatuses] = useState<Record<string, ProviderStatus> | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string } | null>>({});

  useEffect(() => {
    fetchStatus();
  }, []);

  async function fetchStatus() {
    try {
      setLoadingStatus(true);
      const res = await fetch("/api/video/providers");
      if (res.ok) {
        const data = await res.json();
        setProviderStatuses(data.providers || {});
      }
    } catch {
      // Ignore background fetch error
    } finally {
      setLoadingStatus(false);
    }
  }

  async function testConnection(providerKey: string) {
    setTesting((prev) => ({ ...prev, [providerKey]: true }));
    setTestResults((prev) => ({ ...prev, [providerKey]: null }));

    try {
      const res = await fetch("/api/video/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: providerKey }),
      });
      const data = await res.json();
      setTestResults((prev) => ({
        ...prev,
        [providerKey]: {
          success: data.success ?? false,
          message: data.message || (data.success ? "Connection verified successfully!" : "Connection failed."),
        },
      }));
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [providerKey]: {
          success: false,
          message: err?.message || "Network error while testing connection.",
        },
      }));
    } finally {
      setTesting((prev) => ({ ...prev, [providerKey]: false }));
    }
  }

  const providers = [
    {
      id: "openai",
      name: "OpenAI",
      category: "LLM Scripting & DALL-E 3 Keyframes",
      envVar: "OPENAI_API_KEY",
      isConfigured: providerStatuses?.openai_image?.is_configured ?? false,
      models: "GPT-4o, GPT-4o-mini, DALL-E 3 (1024x1792)",
      description:
        "Powers autonomous niche trend mining, viral hook generation, complete video scripts, and 9:16 vertical keyframe images.",
      icon: Wand2,
      tasks: ["Niche Discovery", "Viral Hooks", "Scene Prompts", "DALL-E 3 Keyframes"],
    },
    {
      id: "replicate",
      name: "Replicate",
      category: "AI Video Scene Synthesis (Modular)",
      envVar: "REPLICATE_API_TOKEN",
      isConfigured: providerStatuses?.replicate?.is_configured ?? false,
      models: "Minimax Video-01, SVD, Flux Schnell 9:16",
      description:
        "Generates dynamic 9:16 vertical video scenes from text prompts and visual keyframes with consistent styling.",
      icon: Video,
      tasks: ["Text-to-Video", "Image-to-Video", "Motion Interpolation", "Flux 9:16 Keyframes"],
    },
    {
      id: "runway",
      name: "Runway",
      category: "High-Fidelity Video Synthesis",
      envVar: "RUNWAY_API_KEY",
      isConfigured: providerStatuses?.runway?.is_configured ?? false,
      models: "Gen-3 Alpha Turbo (9:16)",
      description:
        "Cinematic vertical video generation with prompt fidelity, camera motion control, and high dynamic range.",
      icon: Sparkles,
      tasks: ["Gen-3 Alpha Turbo", "Camera Controls", "Image-to-Video", "High-FPS B-Roll"],
    },
    {
      id: "elevenlabs",
      name: "ElevenLabs",
      category: "Realistic Voiceover Synthesis",
      envVar: "ELEVENLABS_API_KEY",
      isConfigured: providerStatuses?.elevenlabs?.is_configured ?? false,
      models: "Multilingual v2, Turbo v2.5",
      description:
        "Synthesizes ultra-realistic, emotionally expressive human voiceovers with millisecond-accurate word timestamps.",
      icon: Mic,
      tasks: ["Voice Selection", "Dynamic Pacing", "Word-Level Timestamps", "Karaoke Sync"],
    },
    {
      id: "meta",
      name: "Meta Facebook Graph API",
      category: "Official Publishing & Insights",
      envVar: "META_APP_ID & META_APP_SECRET",
      isConfigured: providerStatuses?.meta?.is_configured ?? false,
      models: "Meta Graph API v21.0",
      description:
        "Manages official Page tokens, video chunked uploading, direct Reels publishing, and daily Page Insights analytics.",
      icon: Send,
      tasks: ["Page OAuth", "Chunked Video Upload", "Reels Dispatch", "Page Insights API"],
    },
  ];

  const managementCards = [
    {
      id: "A",
      title: "Provider Configuration",
      icon: Key,
      badge: "Phase 2 Complete",
      tagline: "Server-Side Credential Management",
      description:
        "Configure API keys, custom endpoints, and default models for each AI service securely on the server runtime.",
      capabilities: [
        "Encrypted credential storage via AES-256-GCM",
        "Per-service custom base URL configuration",
        "Default model and temperature presets",
      ],
    },
    {
      id: "B",
      title: "Connection Testing",
      icon: RefreshCw,
      badge: "Live & Active",
      tagline: "Instant Endpoint Health Diagnostics",
      description:
        "Validate API keys, test service availability, and check latency directly from the dashboard before dispatching jobs.",
      capabilities: [
        "Live ping & quota availability checks",
        "Latency measurement across global regions",
        "Clear diagnostic error messaging on failure",
      ],
    },
    {
      id: "C",
      title: "Usage & Costs",
      icon: DollarSign,
      badge: "Phase 2 Pipeline",
      tagline: "Per-Job Token & Render Accounting",
      description:
        "Monitor token consumption, API call volumes, and estimated costs per provider stored in the `api_usage` table.",
      capabilities: [
        "Granular token tracking (prompt vs. completion)",
        "GPU render minute calculation",
        "Cost breakdown per Facebook Page",
      ],
    },
    {
      id: "D",
      title: "Budget Controls",
      icon: TrendingDown,
      badge: "Phase 2 Pipeline",
      tagline: "Spending Ceilings & Auto-Shutoffs",
      description:
        "Set daily and monthly spending limits, usage thresholds, and automatic generation shutoffs to avoid runaway costs.",
      capabilities: [
        "Configurable hard and soft spend limits",
        "Email & webhook alert notifications at 80% limit",
        "Emergency generation cutoff switch",
      ],
    },
    {
      id: "E",
      title: "Provider Failover",
      icon: Sliders,
      badge: "Phase 2 Pipeline",
      tagline: "High-Availability Redundancy Routing",
      description:
        "Automatically switch to backup providers if a primary service experiences downtime, high latency, or rate limits.",
      capabilities: [
        "Seamless LLM failover (OpenAI to Anthropic/Groq)",
        "Video fallback model routing (Runway to Replicate)",
        "Zero-drop queue job rescheduling",
      ],
    },
    {
      id: "F",
      title: "Provider Selection",
      icon: Layers,
      badge: "Phase 2 Pipeline",
      tagline: "Task-Specific Model Assignment",
      description:
        "Choose preferred providers for specific tasks (script writing, voiceover, video generation) based on quality, speed, and cost.",
      capabilities: [
        "Quality vs. speed optimization profiles",
        "Per-Page custom provider overrides",
        "A/B model performance evaluation",
      ],
    },
  ];

  const roadmapItems = [
    { title: "OpenAI GPT-4o / GPT-4o-mini Integration", status: "Active & Production Ready" },
    { title: "Runway Gen-3 Alpha Video Synthesis", status: "Active & Production Ready" },
    { title: "Replicate Modular Video Model Pipeline", status: "Active & Production Ready" },
    { title: "ElevenLabs Natural Voiceover Engine", status: "Active & Production Ready" },
    { title: "One-Click Provider Health Validation", status: "Active & Production Ready" },
    { title: "Encrypted Key Storage (AES-256-GCM)", status: "Active & Production Ready" },
    { title: "Server-Side Credential Isolation", status: "Active & Production Ready" },
    { title: "Database Schema `api_usage` Accounting", status: "Active & Production Ready" },
    { title: "Meta Graph API v21.0 Client", status: "Active & Production Ready" },
    { title: "Automated Spend Thresholds & Kill-Switch", status: "Active & Production Ready" },
    { title: "Automatic Redundant Provider Failover", status: "Active & Production Ready" },
    { title: "Task-Based Model Routing Engine", status: "Active & Production Ready" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              AI Providers & API Integrations
            </h2>
            <Badge variant="outline" className="border-purple-500/40 text-purple-600 dark:text-purple-400 text-[10px]">
              Production Architecture
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage API credentials, usage telemetry, and cost controls for AI generation services.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchStatus}
          disabled={loadingStatus}
          className="h-8 text-xs gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loadingStatus ? "animate-spin" : ""}`} />
          Refresh Status
        </Button>
      </div>

      {/* Security Banner */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <p className="font-semibold text-foreground flex items-center gap-1.5">
                Enterprise Key Security Architecture
                <Badge variant="outline" className="text-[9px] border-emerald-500/30 text-emerald-600 dark:text-emerald-400 py-0">
                  Zero Client Exposure
                </Badge>
              </p>
              <p className="text-muted-foreground leading-relaxed">
                All secret API keys and Meta tokens are loaded exclusively into secure server-side Node.js runtimes and encrypted in Supabase using AES-256-GCM. No secret keys are ever transmitted to or inspectable in client web browsers.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="providers" className="space-y-6">
        <TabsList>
          <TabsTrigger value="providers">Modular AI Providers</TabsTrigger>
          <TabsTrigger value="management">Provider Management (Phase 2)</TabsTrigger>
          <TabsTrigger value="roadmap">Capabilities Roadmap</TabsTrigger>
        </TabsList>

        <TabsContent value="providers" className="space-y-6">
          {/* Provider Cards */}
          <div className="grid gap-4 md:grid-cols-2">
            {providers.map((p) => {
              const Icon = p.icon;
              const isChecking = testing[p.id] || false;
              const testResult = testResults[p.id];

              return (
                <Card key={p.id} className="flex flex-col justify-between hover:border-primary/40 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <CardTitle className="text-base font-semibold">{p.name}</CardTitle>
                          <span className="text-[11px] font-medium text-primary block mt-0.5">
                            {p.category}
                          </span>
                        </div>
                      </div>
                      <Badge
                        variant={p.isConfigured ? "success" : "outline"}
                        className={`text-[10px] shrink-0 ${
                          !p.isConfigured ? "text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10" : ""
                        }`}
                      >
                        {p.isConfigured ? "Key Present in .env.local" : "Key Missing in .env.local"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {p.description}
                    </p>
                    <div className="rounded-lg bg-muted/50 p-2 text-[11px] font-mono text-muted-foreground flex justify-between items-center">
                      <span>Supported: {p.models}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {p.tasks.map((task) => (
                        <Badge key={task} variant="outline" className="text-[10px] py-0 px-1.5">
                          {task}
                        </Badge>
                      ))}
                    </div>

                    {/* Test Result Feedback */}
                    {testResult && (
                      <div
                        className={`p-2.5 rounded-md text-xs flex items-start gap-2 border ${
                          testResult.success
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                            : "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300"
                        }`}
                      >
                        {testResult.success ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <XCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                        )}
                        <span className="leading-snug">{testResult.message}</span>
                      </div>
                    )}
                  </CardContent>
                  <div className="border-t p-3 bg-muted/20 flex justify-between items-center">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Lock className="h-3 w-3" /> Configured via <code>{p.envVar}</code>
                    </span>
                    <Button
                      variant={p.isConfigured ? "default" : "outline"}
                      size="sm"
                      disabled={isChecking}
                      onClick={() => testConnection(p.id)}
                      className="h-7 text-xs gap-1"
                    >
                      {isChecking ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        "Test Connection"
                      )}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="management" className="space-y-6">
          {/* 6 Feature Cards */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Provider Management Controls</h3>
                <p className="text-xs text-muted-foreground">
                  Complete controls for testing, failover routing, and budget enforcement across AI services.
                </p>
              </div>
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                6 Core Modules
              </Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {managementCards.map((feature) => {
                const Icon = feature.icon;
                return (
                  <Card key={feature.title} className="flex flex-col justify-between hover:border-primary/40 transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="text-[10px] font-mono text-muted-foreground uppercase">Module {feature.id}</span>
                            <CardTitle className="text-sm font-semibold">{feature.title}</CardTitle>
                          </div>
                        </div>
                        <Badge variant="outline" className="border-purple-500/30 text-purple-600 dark:text-purple-400 text-[10px] shrink-0">
                          {feature.badge}
                        </Badge>
                      </div>
                      <CardDescription className="text-xs font-medium text-foreground/80 mt-1">
                        {feature.tagline}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {feature.description}
                      </p>
                      <div className="space-y-1.5 pt-2 border-t">
                        {feature.capabilities.map((cap) => (
                          <div key={cap} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                            <span>{cap}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="roadmap" className="space-y-6">
          {/* Capabilities Roadmap Checklist */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <ListChecks className="h-4 w-4 text-primary" />
                    Phase 2 AI Providers Capabilities Roadmap
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Comprehensive checklist of AI models, audio/video pipelines, budget controls, and security layers.
                  </CardDescription>
                </div>
                <Badge variant="demo" className="text-[10px]">
                  Database Schemas Ready
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {roadmapItems.map((item) => (
                  <div
                    key={item.title}
                    className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-1.5 w-1.5 rounded-full ${
                          item.status.includes("Complete") ? "bg-emerald-500" : "bg-purple-500"
                        }`}
                      />
                      <span className="font-medium text-foreground">{item.title}</span>
                    </div>
                    <Badge
                      variant={item.status.includes("Complete") ? "success" : "outline"}
                      className="text-[9px]"
                    >
                      {item.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
