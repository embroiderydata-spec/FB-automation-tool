"use client";

import React, { useState, useEffect } from "react";
import {
  Wand2,
  Cpu,
  Zap,
  Video,
  Sparkles,
  Mic,
  Globe,
  Send,
  RefreshCw,
  ShieldCheck,
  Key,
  Sliders,
  DollarSign,
  TrendingDown,
  Layers,
  ListChecks,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProviderKeyCard } from "@/components/providers/provider-key-card";
import {
  SUPPORTED_PROVIDERS,
  UserProviderKeyRecord,
} from "@/lib/ai/provider-definitions";

const PROVIDER_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  openai: Wand2,
  anthropic: Cpu,
  groq: Zap,
  replicate: Video,
  runway: Sparkles,
  elevenlabs: Mic,
  google: Globe,
  meta: Send,
};

export default function AIProvidersPage() {
  const [providerStatuses, setProviderStatuses] = useState<Record<string, UserProviderKeyRecord>>({});
  const [loadingStatus, setLoadingStatus] = useState(true);

  useEffect(() => {
    fetchStatus();
  }, []);

  async function fetchStatus() {
    try {
      setLoadingStatus(true);
      const res = await fetch("/api/ai/providers/keys");
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

  const managementCards = [
    {
      id: "A",
      title: "Provider Configuration",
      icon: Key,
      badge: "Production Active",
      tagline: "Server-Side AES-256-GCM Credential Management",
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
      badge: "Production Active",
      tagline: "Live Handshake Validation",
      description:
        "Test live API connectivity and latency with dedicated endpoints to confirm operational readiness before initiating generation tasks.",
      capabilities: [
        "Direct provider API ping with latency measurement",
        "Detailed error diagnostics (invalid key, rate limit, quota)",
        "Zero mock testing: verified against official provider backends",
      ],
    },
    {
      id: "C",
      title: "Cost & Usage Tracking",
      icon: DollarSign,
      badge: "Production Active",
      tagline: "Real-Time Spend Monitoring",
      description:
        "Monitor accumulated API costs across all configured services with per-model pricing calculations and historical usage graphs.",
      capabilities: [
        "Per-job and cumulative token cost calculation",
        "Cost estimation based on official provider rate cards",
        "Spend breakdown by provider (OpenAI, Replicate, Runway, ElevenLabs)",
      ],
    },
    {
      id: "D",
      title: "Spend Limits & Kill-Switch",
      icon: TrendingDown,
      badge: "Production Active",
      tagline: "Budget Enforcement Engine",
      description:
        "Set strict daily and monthly budget caps with automated task halting when spending limits are reached.",
      capabilities: [
        "Configurable daily and monthly spend thresholds",
        "Automated emergency stop trigger on budget breach",
        "Configured in Platform Settings",
      ],
    },
    {
      id: "E",
      title: "Failover & Redundancy",
      icon: Layers,
      badge: "Production Active",
      tagline: "Automatic Provider Failover",
      description:
        "Define fallback providers for critical tasks so that temporary service outages or rate limits do not disrupt automated workflows.",
      capabilities: [
        "Primary/secondary provider routing for video and voice",
        "Automatic retry on transient errors with exponential backoff",
        "Graceful degradation when primary model is unavailable",
      ],
    },
    {
      id: "F",
      title: "Model & Parameter Overrides",
      icon: Sliders,
      badge: "Production Active",
      tagline: "Granular Model Customization",
      description:
        "Override default models, temperature, max tokens, and resolution settings per-page or globally.",
      capabilities: [
        "Custom model selection per generation type",
        "Voice stability and similarity boost tuning",
        "Resolution and aspect ratio presets (1080x1920 vertical default)",
      ],
    },
  ];

  const roadmapItems = [
    { title: "OpenAI GPT-4o / GPT-4o-mini Integration", status: "Active & Production Ready" },
    { title: "Anthropic Claude 3.5 Sonnet Integration", status: "Active & Production Ready" },
    { title: "Groq LPU Ultra-Fast Inference", status: "Active & Production Ready" },
    { title: "Google Gemini 1.5 Pro / Flash Integration", status: "Active & Production Ready" },
    { title: "Runway Gen-3 Alpha Video Synthesis", status: "Active & Production Ready" },
    { title: "Replicate Modular Video Model Pipeline", status: "Active & Production Ready" },
    { title: "ElevenLabs Natural Voiceover Engine", status: "Active & Production Ready" },
    { title: "Encrypted Key Storage (AES-256-GCM)", status: "Active & Production Ready" },
    { title: "Server-Side Credential Isolation", status: "Active & Production Ready" },
    { title: "Meta Graph API v21.0 Client", status: "Active & Production Ready" },
    { title: "Automated Spend Thresholds & Kill-Switch", status: "Active & Production Ready" },
    { title: "Automatic Redundant Provider Failover", status: "Active & Production Ready" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              AI Providers & API Key Management
            </h2>
            <Badge variant="outline" className="border-purple-500/40 text-purple-600 dark:text-purple-400 text-[10px]">
              Production Architecture
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage AES-256-GCM encrypted API keys, custom endpoints, model defaults, and connection diagnostics.
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
          Refresh All Statuses
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
                All secret API keys are encrypted at rest using authenticated <strong>AES-256-GCM</strong> encryption with unique 12-byte initialization vectors (IV). Decrypted keys are strictly isolated in server-side runtimes during live API calls and are <strong>never</strong> transmitted to client web browsers or exposed in client bundles.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="providers" className="space-y-6">
        <TabsList>
          <TabsTrigger value="providers">Supported AI Providers ({SUPPORTED_PROVIDERS.length})</TabsTrigger>
          <TabsTrigger value="management">Provider Management Controls</TabsTrigger>
          <TabsTrigger value="roadmap">Capabilities Roadmap</TabsTrigger>
        </TabsList>

        <TabsContent value="providers" className="space-y-6">
          {/* Provider Key Cards Grid */}
          <div className="grid gap-4 md:grid-cols-2">
            {SUPPORTED_PROVIDERS.map((def) => {
              const Icon = PROVIDER_ICONS[def.id] || Sparkles;
              const record = providerStatuses[def.id];

              return (
                <ProviderKeyCard
                  key={def.id}
                  definition={def}
                  record={record}
                  icon={Icon}
                  onKeySaved={fetchStatus}
                />
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
                    AI Providers Capabilities Matrix
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Status of all AI models, audio/video pipelines, budget controls, and security layers.
                  </CardDescription>
                </div>
                <Badge variant="success" className="text-[10px]">
                  Production Active
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
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <span className="font-medium text-foreground">{item.title}</span>
                    </div>
                    <Badge variant="success" className="text-[9px]">
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
