"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Brain,
  Wand2,
  Lightbulb,
  FileText,
  Flame,
  Clapperboard,
  Layers,
  ShieldCheck,
  CheckCircle2,
  CopyCheck,
  Search,
  Hash,
  MessageSquare,
  Clock,
  ArrowRight,
  ListChecks,
  Plus,
  RefreshCw,
  Copy,
  Check,
  Trash2,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  Sliders,
  DollarSign,
  TrendingUp,
  ExternalLink,
  ChevronRight,
  Loader2,
  Film,
  FolderOpen,
  Eye,
  Settings,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageNicheDialog } from "@/components/content/page-niche-dialog";
import { SceneEditDialog, StoryboardSceneItem } from "@/components/content/scene-edit-dialog";
import { ComingSoonView } from "@/components/dashboard/coming-soon-view";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AIContentStudioPage() {
  // Temporary Coming Soon Gate (preserves all existing code intact)
  const IS_COMING_SOON = true;
  if (IS_COMING_SOON) {
    return (
      <ComingSoonView
        moduleName="AI Content Studio"
        badgeText="Coming Soon"
        icon={Sparkles}
        description="The AI Content Studio is currently under active development as we fine-tune multi-model script engines, anti-clickbait safety guards, and vertical storyboard generators."
        features={[
          {
            title: "Viral Hook Lab",
            description: "High-converting hook generator tailored to specific audience niches and retention targets.",
          },
          {
            title: "9:16 Script & Storyboard Engine",
            description: "Automated shot-by-shot visual scene planning with exact speech pacing and camera directions.",
          },
          {
            title: "Budget & Rate Limiter Guards",
            description: "Hard cost ceilings and token optimization across OpenAI, Anthropic, and Groq providers.",
          },
        ]}
      />
    );
  }

  const [activeTab, setActiveTab] = useState("overview");

  // Global State
  const [pages, setPages] = useState<any[]>([]);
  const [loadingPages, setLoadingPages] = useState(false);
  const [usageData, setUsageData] = useState<any>(null);
  const [selectedPageId, setSelectedPageId] = useState<string>("all");

  // Niche Dialog
  const [nicheDialogOpen, setNicheDialogOpen] = useState(false);
  const [nicheDialogPage, setNicheDialogPage] = useState<{ id: string; name: string } | null>(null);

  // Tab 2: Content Ideas State
  const [ideas, setIdeas] = useState<any[]>([]);
  const [loadingIdeas, setLoadingIdeas] = useState(false);
  const [generatingIdeas, setGeneratingIdeas] = useState(false);
  const [ideasFilterStatus, setIdeasFilterStatus] = useState("all");
  const [ideaTopic, setIdeaTopic] = useState("");
  const [ideaCategory, setIdeaCategory] = useState("Life Hack");
  const [ideaDuration, setIdeaDuration] = useState(45);
  const [ideaError, setIdeaError] = useState<string | null>(null);

  // Tab 3: Hook Generator State
  const [hookTopic, setHookTopic] = useState("");
  const [hookStyle, setHookStyle] = useState("curiosity");
  const [hookPageId, setHookPageId] = useState<string>("");
  const [hookIdeaId, setHookIdeaId] = useState<string>("");
  const [generatedHooks, setGeneratedHooks] = useState<any[]>([]);
  const [generatingHooks, setGeneratingHooks] = useState(false);
  const [hookError, setHookError] = useState<string | null>(null);
  const [copiedHookIndex, setCopiedHookIndex] = useState<number | null>(null);

  // Tab 4: Script Generator State
  const [scripts, setScripts] = useState<any[]>([]);
  const [loadingScripts, setLoadingScripts] = useState(false);
  const [generatingScript, setGeneratingScript] = useState(false);
  const [scriptTitle, setScriptTitle] = useState("");
  const [scriptHook, setScriptHook] = useState("");
  const [scriptTopic, setScriptTopic] = useState("");
  const [scriptDuration, setScriptDuration] = useState(45);
  const [scriptPageId, setScriptPageId] = useState<string>("");
  const [scriptIdeaId, setScriptIdeaId] = useState<string>("");
  const [selectedScript, setSelectedScript] = useState<any>(null);
  const [scriptNarration, setScriptNarration] = useState("");
  const [scriptCaption, setScriptCaption] = useState("");
  const [scriptHashtags, setScriptHashtags] = useState<string[]>([]);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [savingScript, setSavingScript] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  // Tab 5: Storyboard State
  const [storyboards, setStoryboards] = useState<any[]>([]);
  const [loadingStoryboards, setLoadingStoryboards] = useState(false);
  const [generatingStoryboard, setGeneratingStoryboard] = useState(false);
  const [selectedStoryboard, setSelectedStoryboard] = useState<any>(null);
  const [storyboardScenes, setStoryboardScenes] = useState<StoryboardSceneItem[]>([]);
  const [storyboardError, setStoryboardError] = useState<string | null>(null);
  const [editingScene, setEditingScene] = useState<StoryboardSceneItem | null>(null);
  const [sceneDialogOpen, setSceneDialogOpen] = useState(false);
  const [regeneratingSceneId, setRegeneratingSceneId] = useState<string | null>(null);

  // Tab 6: History State
  const [historySearch, setHistorySearch] = useState("");
  const [historyPageFilter, setHistoryPageFilter] = useState("all");
  const [historyTypeFilter, setHistoryTypeFilter] = useState("all");

  // Initial Load
  useEffect(() => {
    fetchPages();
    fetchUsage();
    fetchIdeas();
    fetchScripts();
    fetchStoryboards();
  }, []);

  async function fetchPages() {
    try {
      setLoadingPages(true);
      const res = await fetch("/api/facebook-pages");
      const data = await res.json();
      if (res.ok && data.pages) {
        setPages(data.pages);
        if (data.pages.length > 0) {
          setHookPageId(data.pages[0].id);
          setScriptPageId(data.pages[0].id);
        }
      }
    } catch {
      // Ignore
    } finally {
      setLoadingPages(false);
    }
  }

  async function fetchUsage() {
    try {
      const res = await fetch("/api/content/usage");
      const data = await res.json();
      if (res.ok) {
        setUsageData(data);
      }
    } catch {
      // Ignore
    }
  }

  async function fetchIdeas() {
    try {
      setLoadingIdeas(true);
      const res = await fetch("/api/content/ideas");
      const data = await res.json();
      if (res.ok && data.ideas) {
        setIdeas(data.ideas);
      }
    } catch {
      // Ignore
    } finally {
      setLoadingIdeas(false);
    }
  }

  async function fetchScripts() {
    try {
      setLoadingScripts(true);
      const res = await fetch("/api/content/scripts");
      const data = await res.json();
      if (res.ok && data.scripts) {
        setScripts(data.scripts);
        if (!selectedScript && data.scripts.length > 0) {
          loadScriptIntoEditor(data.scripts[0]);
        }
      }
    } catch {
      // Ignore
    } finally {
      setLoadingScripts(false);
    }
  }

  async function fetchStoryboards() {
    try {
      setLoadingStoryboards(true);
      const res = await fetch("/api/content/storyboards");
      const data = await res.json();
      if (res.ok && data.storyboards) {
        setStoryboards(data.storyboards);
        if (!selectedStoryboard && data.storyboards.length > 0) {
          loadStoryboard(data.storyboards[0].id);
        }
      }
    } catch {
      // Ignore
    } finally {
      setLoadingStoryboards(false);
    }
  }

  // Handle Idea Generation
  async function handleGenerateIdeas(e: React.FormEvent) {
    e.preventDefault();
    try {
      setGeneratingIdeas(true);
      setIdeaError(null);

      const targetPageIds =
        selectedPageId === "all"
          ? pages.map((p) => p.id)
          : [selectedPageId];

      if (targetPageIds.length === 0) {
        throw new Error("No Facebook Pages available. Please connect a Page first.");
      }

      const res = await fetch("/api/content/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page_ids: targetPageIds,
          topic: ideaTopic || undefined,
          category: ideaCategory,
          duration_seconds: ideaDuration,
          num_ideas_per_page: 3,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate ideas.");
      }

      await fetchIdeas();
      await fetchUsage();
      setIdeaTopic("");
    } catch (err: any) {
      setIdeaError(err.message || "Failed to generate ideas.");
    } finally {
      setGeneratingIdeas(false);
    }
  }

  // Handle Hook Generation
  async function handleGenerateHooks(e: React.FormEvent) {
    e.preventDefault();
    try {
      setGeneratingHooks(true);
      setHookError(null);

      const res = await fetch("/api/content/hooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page_id: hookPageId || undefined,
          content_idea_id: hookIdeaId || undefined,
          topic: hookTopic,
          hook_style: hookStyle,
          num_hooks: 5,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate hooks.");
      }

      setGeneratedHooks(data.hooks || []);
      await fetchUsage();
    } catch (err: any) {
      setHookError(err.message || "Failed to generate hooks.");
    } finally {
      setGeneratingHooks(false);
    }
  }

  // Handle Script Generation
  async function handleGenerateScript(e: React.FormEvent) {
    e.preventDefault();
    try {
      setGeneratingScript(true);
      setScriptError(null);

      const res = await fetch("/api/content/scripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page_id: scriptPageId || undefined,
          content_idea_id: scriptIdeaId || undefined,
          title: scriptTitle || undefined,
          hook: scriptHook,
          topic: scriptTopic || scriptHook,
          target_duration_seconds: scriptDuration,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate script.");
      }

      await fetchScripts();
      await fetchUsage();
      if (data.script) {
        loadScriptIntoEditor(data.script);
      }
    } catch (err: any) {
      setScriptError(err.message || "Failed to generate script.");
    } finally {
      setGeneratingScript(false);
    }
  }

  function loadScriptIntoEditor(script: any) {
    setSelectedScript(script);
    setScriptTitle(script.script_title || "");
    setScriptHook(script.hook || "");
    setScriptNarration(script.narration || "");
    setScriptCaption(script.caption || "");
    setScriptHashtags(Array.isArray(script.hashtags) ? script.hashtags : []);
  }

  // Save Script Changes or Status Update
  async function handleUpdateScript(status?: "draft" | "in_review" | "approved" | "rejected") {
    if (!selectedScript?.id) return;
    try {
      setSavingScript(true);
      const res = await fetch(`/api/content/scripts/${selectedScript.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script_title: scriptTitle,
          hook: scriptHook,
          narration: scriptNarration,
          caption: scriptCaption,
          hashtags: scriptHashtags,
          status: status || selectedScript.status,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update script.");
      }

      await fetchScripts();
      if (data.script) {
        setSelectedScript(data.script);
      }
    } catch (err: any) {
      setScriptError(err.message || "Failed to update script.");
    } finally {
      setSavingScript(false);
    }
  }

  // Load Storyboard
  async function loadStoryboard(id: string) {
    try {
      const res = await fetch(`/api/content/storyboards/${id}`);
      const data = await res.json();
      if (res.ok && data.storyboard) {
        setSelectedStoryboard(data.storyboard);
        setStoryboardScenes(data.scenes || []);
      }
    } catch {
      // Ignore
    }
  }

  // Generate Storyboard from current script
  async function handleGenerateStoryboard() {
    if (!selectedScript?.id) return;
    try {
      setGeneratingStoryboard(true);
      setStoryboardError(null);

      const res = await fetch("/api/content/storyboards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script_id: selectedScript.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate storyboard.");
      }

      await fetchStoryboards();
      await fetchUsage();
      if (data.storyboard?.id) {
        await loadStoryboard(data.storyboard.id);
        setActiveTab("storyboard");
      }
    } catch (err: any) {
      setStoryboardError(err.message || "Failed to generate storyboard.");
    } finally {
      setGeneratingStoryboard(false);
    }
  }

  // Update Storyboard Status (Approve / Reject)
  async function handleUpdateStoryboardStatus(status: "approved" | "rejected" | "ready_for_video") {
    if (!selectedStoryboard?.id) return;
    try {
      const res = await fetch(`/api/content/storyboards/${selectedStoryboard.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (res.ok && data.storyboard) {
        setSelectedStoryboard(data.storyboard);
        await fetchStoryboards();
      }
    } catch (err: any) {
      setStoryboardError(err.message || "Failed to update storyboard status.");
    }
  }

  // Regenerate single scene
  async function handleRegenerateScene(sceneId: string) {
    if (!selectedStoryboard?.id) return;
    try {
      setRegeneratingSceneId(sceneId);
      const res = await fetch(
        `/api/content/storyboards/${selectedStoryboard.id}/scenes/${sceneId}/regenerate`,
        { method: "POST" }
      );
      const data = await res.json();
      if (res.ok && data.scene) {
        setStoryboardScenes((prev) =>
          prev.map((s) => (s.id === sceneId ? { ...s, ...data.scene } : s))
        );
        await fetchUsage();
      }
    } catch {
      // Ignore
    } finally {
      setRegeneratingSceneId(null);
    }
  }

  // Delete scene
  async function handleDeleteScene(sceneId: string) {
    if (!selectedStoryboard?.id) return;
    try {
      const res = await fetch(
        `/api/content/storyboards/${selectedStoryboard.id}/scenes/${sceneId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setStoryboardScenes((prev) => prev.filter((s) => s.id !== sceneId));
      }
    } catch {
      // Ignore
    }
  }

  const isConfigured = usageData?.config?.is_configured ?? false;

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              AI Content Studio
            </h2>
            <Badge variant="outline" className="border-purple-500/40 text-purple-600 dark:text-purple-400 text-[10px]">
              Phase 2.2 Content Engine
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Autonomous idea research, viral hooks, script builder, and 9:16 vertical storyboards for connected Facebook Pages.
          </p>
        </div>

        {/* Global Page Selector */}
        <div className="flex items-center gap-2">
          <select
            value={selectedPageId}
            onChange={(e) => setSelectedPageId(e.target.value)}
            className="h-8 text-xs rounded-md border border-input bg-background px-2.5 font-medium"
          >
            <option value="all">All Connected Pages ({pages.length})</option>
            {pages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.page_name || p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* OpenAI Configuration Warning if Key Missing */}
      {!isConfigured && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4 flex items-start gap-3 text-xs">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-foreground">
                OpenAI is not configured. Add your API key in environment settings to enable AI generation.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Add <code>OPENAI_API_KEY</code> and optional <code>OPENAI_MODEL</code> in <code>.env.local</code>. Once configured, you can generate fresh ideas, viral hooks, and vertical 9:16 storyboards with server-side rate-limiting and budget controls.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-3 sm:grid-cols-6 h-auto p-1 bg-muted/50">
          <TabsTrigger value="overview" className="text-xs py-1.5">Overview</TabsTrigger>
          <TabsTrigger value="ideas" className="text-xs py-1.5">Content Ideas</TabsTrigger>
          <TabsTrigger value="hooks" className="text-xs py-1.5">Hook Generator</TabsTrigger>
          <TabsTrigger value="scripts" className="text-xs py-1.5">Script Generator</TabsTrigger>
          <TabsTrigger value="storyboard" className="text-xs py-1.5">Storyboard Builder</TabsTrigger>
          <TabsTrigger value="history" className="text-xs py-1.5">Content History</TabsTrigger>
        </TabsList>

        {/* ------------------------------------------------------------------ */}
        {/* TAB 1: OVERVIEW */}
        {/* ------------------------------------------------------------------ */}
        <TabsContent value="overview" className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                  Content Ideas
                </CardTitle>
                <Lightbulb className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{ideas.length}</div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Researched & clustered across Pages
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                  Scripts in Pipeline
                </CardTitle>
                <FileText className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{scripts.length}</div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {scripts.filter((s) => s.status === "approved").length} approved for video
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                  Storyboards Built
                </CardTitle>
                <Clapperboard className="h-4 w-4 text-indigo-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{storyboards.length}</div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  9:16 vertical scene breakdowns
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                  Daily AI Budget
                </CardTitle>
                <DollarSign className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${usageData?.summary?.daily_spend_usd?.toFixed(2) || "0.00"}
                  <span className="text-xs font-normal text-muted-foreground">
                    {" "}
                    / ${usageData?.summary?.daily_budget_limit?.toFixed(2) || "10.00"}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5 mt-2 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-1.5 rounded-full"
                    style={{ width: `${usageData?.summary?.budget_used_percent || 0}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Content Lifecycle Flow */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Wand2 className="h-4 w-4 text-primary" />
                Autonomous Content Engine Lifecycle
              </CardTitle>
              <CardDescription className="text-xs">
                Every generated piece of content moves through strict human-in-the-loop validation stages before entering production.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg border bg-muted/20 text-xs">
                {[
                  { step: "1. Idea", desc: "Niche Trend Researched" },
                  { step: "2. Hook", desc: "5+ Viral Angles" },
                  { step: "3. Script", desc: "Short-Form Reel" },
                  { step: "4. Review", desc: "Human Editing" },
                  { step: "5. Approved", desc: "Script Approval" },
                  { step: "6. Storyboard", desc: "9:16 Scene Breakdown" },
                  { step: "7. Approved", desc: "Director Signoff" },
                  { step: "8. Ready", desc: "Ready for Video" },
                ].map((s, idx, arr) => (
                  <React.Fragment key={s.step}>
                    <div className="text-center">
                      <span className="font-semibold text-foreground block">{s.step}</span>
                      <span className="text-[10px] text-muted-foreground">{s.desc}</span>
                    </div>
                    {idx < arr.length - 1 && (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 hidden md:block" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Connected Pages Niche Configuration Drawer */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Page Niche & Content Profiles</CardTitle>
                <CardDescription className="text-xs">
                  AI prompts automatically adapt to each Page's unique tone, sub-niche, and audience constraints.
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {pages.length} Pages Configured
              </Badge>
            </CardHeader>
            <CardContent>
              {pages.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  No Facebook Pages connected yet. Connect a Page in the Facebook Pages Manager.
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {pages.map((p) => {
                    const settings = Array.isArray(p.page_settings)
                      ? p.page_settings[0]
                      : p.page_settings;

                    return (
                      <div
                        key={p.id}
                        className="rounded-lg border bg-card p-3 flex flex-col justify-between hover:border-primary/40 transition-colors"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-semibold text-xs text-foreground truncate max-w-[160px]">
                              {p.page_name || p.name}
                            </span>
                            <Badge variant="outline" className="text-[9px]">
                              {settings?.niche || p.category || "General"}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground line-clamp-2">
                            {settings?.page_description ||
                              `Target: ${settings?.target_audience || "General Audience"} • Tone: ${settings?.ai_tone || "Engaging"}`}
                          </p>
                        </div>

                        <div className="pt-2 mt-2 border-t flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {settings?.video_duration_min || 30}-{settings?.video_duration_max || 60}s Reels
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[11px] gap-1 px-2 text-primary"
                            onClick={() => {
                              setNicheDialogPage({ id: p.id, name: p.page_name || p.name });
                              setNicheDialogOpen(true);
                            }}
                          >
                            <Settings className="h-3 w-3" />
                            Edit Profile
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------------------------------------------------ */}
        {/* TAB 2: CONTENT IDEAS */}
        {/* ------------------------------------------------------------------ */}
        <TabsContent value="ideas" className="space-y-6">
          {/* Generation Controls */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-purple-500" />
                AI Niche Trend & Idea Generator
              </CardTitle>
              <CardDescription className="text-xs">
                Researches viral topics tailored to each selected Page's audience, niche, and safety guidelines.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGenerateIdeas} className="space-y-4">
                {ideaError && (
                  <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 text-xs">
                    {ideaError}
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="sm:col-span-2">
                    <Label className="text-xs">Theme or Focus Keyword (Optional)</Label>
                    <Input
                      value={ideaTopic}
                      onChange={(e) => setIdeaTopic(e.target.value)}
                      placeholder="e.g. 5 hidden smartphone tricks, morning routines..."
                      className="h-8 text-xs mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Category</Label>
                    <select
                      value={ideaCategory}
                      onChange={(e) => setIdeaCategory(e.target.value)}
                      className="w-full h-8 mt-1 text-xs rounded-md border border-input bg-background px-2"
                    >
                      <option value="Life Hack">Life Hack</option>
                      <option value="Storytime">Storytime</option>
                      <option value="Tutorial">Tutorial</option>
                      <option value="Curated Trivia">Curated Trivia</option>
                      <option value="Comedy Skit">Comedy Skit</option>
                      <option value="Motivation">Motivation</option>
                    </select>
                  </div>

                  <div>
                    <Label className="text-xs">Target Duration</Label>
                    <select
                      value={ideaDuration}
                      onChange={(e) => setIdeaDuration(Number(e.target.value))}
                      className="w-full h-8 mt-1 text-xs rounded-md border border-input bg-background px-2"
                    >
                      <option value={30}>30 seconds</option>
                      <option value={45}>45 seconds</option>
                      <option value={60}>60 seconds</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-[11px] text-muted-foreground">
                    Targeting: <strong>{selectedPageId === "all" ? "All Connected Pages" : "Selected Page"}</strong>
                  </span>
                  <Button type="submit" size="sm" disabled={generatingIdeas} className="gap-1.5">
                    {generatingIdeas ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Researching & Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5" />
                        Generate Content Ideas
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Ideas List */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Researched Content Ideas</CardTitle>
                <CardDescription className="text-xs">
                  Review generated video concepts, hooks, and originality notes.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={ideasFilterStatus}
                  onChange={(e) => setIdeasFilterStatus(e.target.value)}
                  className="h-7 text-xs rounded border border-input bg-background px-2"
                >
                  <option value="all">All Statuses</option>
                  <option value="draft">Drafts</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </CardHeader>
            <CardContent>
              {loadingIdeas ? (
                <div className="py-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  Loading ideas...
                </div>
              ) : ideas.length === 0 ? (
                <EmptyState
                  icon={Lightbulb}
                  title="No Content Ideas Generated Yet"
                  description="Use the generator above to discover high-retention video concepts tailored to your Facebook Page audience."
                  phase="Phase 2.2 Active"
                />
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {ideas
                    .filter((idea) =>
                      ideasFilterStatus === "all"
                        ? true
                        : (idea.content_status || idea.status) === ideasFilterStatus
                    )
                    .map((idea) => (
                      <div
                        key={idea.id}
                        className="rounded-lg border bg-card p-3 flex flex-col justify-between hover:border-primary/40 transition-colors"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-[10px] font-mono text-muted-foreground uppercase">
                              {idea.category || "Reels"} • {idea.duration_seconds || 45}s
                            </span>
                            <Badge
                              variant={
                                idea.content_status === "approved" || idea.content_status === "script_approved"
                                  ? "success"
                                  : idea.content_status === "rejected"
                                  ? "destructive"
                                  : "outline"
                              }
                              className="text-[9px]"
                            >
                              {idea.content_status || idea.status || "draft"}
                            </Badge>
                          </div>

                          <h4 className="text-sm font-semibold text-foreground leading-snug">
                            {idea.title}
                          </h4>

                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {idea.description}
                          </p>

                          {idea.hook && (
                            <div className="rounded bg-muted/40 p-2 text-[11px] border border-border/50">
                              <span className="font-semibold text-primary block text-[10px]">Opening Hook:</span>
                              "{idea.hook}"
                            </div>
                          )}

                          {idea.viral_potential && (
                            <p className="text-[10px] text-muted-foreground/80 italic">
                              <strong>Why Viral:</strong> {idea.viral_potential}
                            </p>
                          )}
                        </div>

                        <div className="pt-3 mt-3 border-t flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-[11px] gap-1"
                              onClick={() => {
                                setHookTopic(idea.title);
                                setHookIdeaId(idea.id);
                                if (idea.facebook_page_id || idea.page_id) {
                                  setHookPageId(idea.facebook_page_id || idea.page_id);
                                }
                                setActiveTab("hooks");
                              }}
                            >
                              <Flame className="h-3 w-3 text-amber-500" />
                              Generate Hooks
                            </Button>

                            <Button
                              variant="default"
                              size="sm"
                              className="h-7 text-[11px] gap-1"
                              onClick={() => {
                                setScriptTitle(idea.title);
                                setScriptHook(idea.hook || idea.title);
                                setScriptTopic(idea.topic || idea.title);
                                setScriptIdeaId(idea.id);
                                if (idea.facebook_page_id || idea.page_id) {
                                  setScriptPageId(idea.facebook_page_id || idea.page_id);
                                }
                                setActiveTab("scripts");
                              }}
                            >
                              <FileText className="h-3 w-3" />
                              Draft Script
                            </Button>
                          </div>

                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
                              onClick={async () => {
                                await fetch(`/api/content/ideas/${idea.id}`, { method: "DELETE" });
                                setIdeas((prev) => prev.filter((i) => i.id !== idea.id));
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------------------------------------------------ */}
        {/* TAB 3: HOOK GENERATOR */}
        {/* ------------------------------------------------------------------ */}
        <TabsContent value="hooks" className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Flame className="h-4 w-4 text-amber-500" />
                Viral First-3-Seconds Hook Generator
              </CardTitle>
              <CardDescription className="text-xs">
                Crafts 5+ high-converting hook variants designed to stop the thumb scroll without deceptive clickbait.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGenerateHooks} className="space-y-4">
                {hookError && (
                  <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 text-xs">
                    {hookError}
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <Label className="text-xs">Target Page (for Niche Tone)</Label>
                    <select
                      value={hookPageId}
                      onChange={(e) => setHookPageId(e.target.value)}
                      className="w-full h-8 mt-1 text-xs rounded-md border border-input bg-background px-2"
                    >
                      {pages.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.page_name || p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label className="text-xs">Hook Psychological Angle / Style</Label>
                    <select
                      value={hookStyle}
                      onChange={(e) => setHookStyle(e.target.value)}
                      className="w-full h-8 mt-1 text-xs rounded-md border border-input bg-background px-2 capitalize"
                    >
                      <option value="curiosity">Curiosity Gap ("The secret behind...")</option>
                      <option value="shock">Shock / Pattern Interrupt ("Stop doing this...")</option>
                      <option value="question">Direct Question ("Have you ever wondered...?")</option>
                      <option value="unexpected_fact">Unexpected Fact ("99% get this wrong...")</option>
                      <option value="story_opening">Story Opening ("Last week this happened...")</option>
                      <option value="emotional">Emotional ("This will hit home...")</option>
                      <option value="humor">Humor / Irony ("Nobody prepared me for...")</option>
                      <option value="challenge">Challenge ("Try not to do this...")</option>
                      <option value="mystery">Mystery ("There's something hidden...")</option>
                    </select>
                  </div>

                  <div>
                    <Label className="text-xs">Video Topic or Angle *</Label>
                    <Input
                      value={hookTopic}
                      onChange={(e) => setHookTopic(e.target.value)}
                      placeholder="e.g. Budgeting hacks, dog training secrets"
                      required
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t">
                  <Button type="submit" size="sm" disabled={generatingHooks} className="gap-1.5">
                    {generatingHooks ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Synthesizing Hooks...
                      </>
                    ) : (
                      <>
                        <Flame className="h-3.5 w-3.5 text-amber-400" />
                        Generate 5+ Viral Hooks
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Hooks Results */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">Generated Hook Variations</CardTitle>
                  <CardDescription className="text-xs">
                    Select your preferred hook to automatically populate the AI Script Generator.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {generatedHooks.length} Hooks Available
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {generatedHooks.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No hooks generated yet. Enter a topic above to produce 5+ hooks in your chosen style.
                </div>
              ) : (
                <div className="space-y-3">
                  {generatedHooks.map((h, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border bg-card p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:border-primary/40 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[9px] capitalize border-amber-500/30 text-amber-600 dark:text-amber-400">
                            {h.style}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">~{h.estimated_seconds || 3}s</span>
                        </div>
                        <p className="text-sm font-medium text-foreground">
                          "{h.hook_text}"
                        </p>
                        {h.angle_explanation && (
                          <p className="text-[11px] text-muted-foreground italic">
                            {h.angle_explanation}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-[11px] gap-1"
                          onClick={() => {
                            navigator.clipboard.writeText(h.hook_text);
                            setCopiedHookIndex(idx);
                            setTimeout(() => setCopiedHookIndex(null), 1500);
                          }}
                        >
                          {copiedHookIndex === idx ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-500" /> Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" /> Copy
                            </>
                          )}
                        </Button>

                        <Button
                          variant="default"
                          size="sm"
                          className="h-7 text-[11px] gap-1"
                          onClick={() => {
                            setScriptHook(h.hook_text);
                            setScriptTopic(hookTopic);
                            setScriptPageId(hookPageId);
                            setScriptIdeaId(hookIdeaId);
                            setActiveTab("scripts");
                          }}
                        >
                          <FileText className="h-3 w-3" />
                          Use in Script
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------------------------------------------------ */}
        {/* TAB 4: SCRIPT GENERATOR */}
        {/* ------------------------------------------------------------------ */}
        <TabsContent value="scripts" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left: Script Configuration Form */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Script Inputs
                </CardTitle>
                <CardDescription className="text-xs">
                  Generate complete short-form narration tailored for Facebook Reels.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleGenerateScript} className="space-y-3">
                  {scriptError && (
                    <div className="p-2.5 rounded border border-red-500/30 bg-red-500/10 text-red-600 text-xs">
                      {scriptError}
                    </div>
                  )}

                  <div>
                    <Label className="text-xs">Facebook Page</Label>
                    <select
                      value={scriptPageId}
                      onChange={(e) => setScriptPageId(e.target.value)}
                      className="w-full h-8 mt-1 text-xs rounded-md border border-input bg-background px-2"
                    >
                      {pages.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.page_name || p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label className="text-xs">Working Title (Optional)</Label>
                    <Input
                      value={scriptTitle}
                      onChange={(e) => setScriptTitle(e.target.value)}
                      placeholder="e.g. 3 Morning Hacks for High Energy"
                      className="h-8 text-xs mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Opening Hook *</Label>
                    <textarea
                      value={scriptHook}
                      onChange={(e) => setScriptHook(e.target.value)}
                      placeholder="The first 3 seconds spoken words..."
                      rows={2}
                      required
                      className="w-full mt-1 p-2 text-xs rounded-md border border-input bg-background"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Core Topic / Angle *</Label>
                    <Input
                      value={scriptTopic}
                      onChange={(e) => setScriptTopic(e.target.value)}
                      placeholder="What is this video explaining?"
                      required
                      className="h-8 text-xs mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Target Duration</Label>
                    <select
                      value={scriptDuration}
                      onChange={(e) => setScriptDuration(Number(e.target.value))}
                      className="w-full h-8 mt-1 text-xs rounded-md border border-input bg-background px-2"
                    >
                      <option value={30}>30s (~72 words)</option>
                      <option value={45}>45s (~108 words)</option>
                      <option value={60}>60s (~144 words)</option>
                      <option value={90}>90s (~216 words)</option>
                    </select>
                  </div>

                  <Button type="submit" size="sm" disabled={generatingScript} className="w-full gap-1.5 mt-2">
                    {generatingScript ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Writing Script...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5" />
                        Generate Complete Script
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Right: Interactive Script Editor & Scene Breakdown */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base font-semibold">
                      {selectedScript ? selectedScript.script_title : "Script Editor"}
                    </CardTitle>
                    {selectedScript && (
                      <Badge
                        variant={
                          selectedScript.status === "approved"
                            ? "success"
                            : selectedScript.status === "rejected"
                            ? "destructive"
                            : "outline"
                        }
                        className="text-[10px] capitalize"
                      >
                        {selectedScript.status}
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-xs">
                    Review narration, word pacing, captions, and hashtags. Manual approval required before storyboard generation.
                  </CardDescription>
                </div>

                {selectedScript && (
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => {
                        navigator.clipboard.writeText(scriptNarration);
                        setCopiedScript(true);
                        setTimeout(() => setCopiedScript(false), 1500);
                      }}
                    >
                      {copiedScript ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                      Copy
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1 text-emerald-600 dark:text-emerald-400"
                      disabled={savingScript}
                      onClick={() => handleUpdateScript("approved")}
                    >
                      <ThumbsUp className="h-3 w-3" />
                      Approve
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1 text-red-500"
                      disabled={savingScript}
                      onClick={() => handleUpdateScript("rejected")}
                    >
                      <ThumbsDown className="h-3 w-3" />
                      Reject
                    </Button>
                  </div>
                )}
              </CardHeader>

              <CardContent className="space-y-4">
                {!selectedScript ? (
                  <div className="py-12 text-center text-xs text-muted-foreground">
                    No script selected. Generate a script on the left or select one from the history tab.
                  </div>
                ) : (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs">Video Title</Label>
                      <Input
                        value={scriptTitle}
                        onChange={(e) => setScriptTitle(e.target.value)}
                        className="h-8 text-xs font-semibold"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-primary">Full Voiceover Narration</Label>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {scriptNarration.split(/\s+/).filter(Boolean).length} words • ~
                          {Math.round(scriptNarration.split(/\s+/).filter(Boolean).length / 2.4)}s duration
                        </span>
                      </div>
                      <textarea
                        value={scriptNarration}
                        onChange={(e) => setScriptNarration(e.target.value)}
                        rows={7}
                        className="w-full p-2.5 text-xs rounded-md border border-input bg-background font-sans leading-relaxed"
                      />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Facebook Post Caption</Label>
                        <textarea
                          value={scriptCaption}
                          onChange={(e) => setScriptCaption(e.target.value)}
                          rows={3}
                          className="w-full p-2 text-xs rounded-md border border-input bg-background"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Hashtags</Label>
                        <Input
                          value={scriptHashtags.join(" ")}
                          onChange={(e) => setScriptHashtags(e.target.value.split(" ").filter(Boolean))}
                          placeholder="#Reels #Viral #Niche"
                          className="h-8 text-xs font-mono"
                        />
                        <p className="text-[10px] text-muted-foreground">
                          Recommended: 3 to 5 targeted hashtags for Facebook Reels distribution.
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t flex items-center justify-between">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={savingScript}
                        onClick={() => handleUpdateScript()}
                        className="text-xs"
                      >
                        Save Changes
                      </Button>

                      <Button
                        variant="default"
                        size="sm"
                        disabled={generatingStoryboard}
                        onClick={handleGenerateStoryboard}
                        className="gap-1.5 text-xs"
                      >
                        {generatingStoryboard ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Building Storyboard...
                          </>
                        ) : (
                          <>
                            <Clapperboard className="h-3.5 w-3.5" />
                            Convert to 9:16 Storyboard
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ------------------------------------------------------------------ */}
        {/* TAB 5: STORYBOARD BUILDER */}
        {/* ------------------------------------------------------------------ */}
        <TabsContent value="storyboard" className="space-y-6">
          <Card>
            <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Clapperboard className="h-4 w-4 text-indigo-500" />
                  <CardTitle className="text-sm font-semibold">
                    Vertical 9:16 Storyboard Scenes
                  </CardTitle>
                  {selectedStoryboard && (
                    <Badge
                      variant={
                        selectedStoryboard.status === "approved"
                          ? "success"
                          : selectedStoryboard.status === "rejected"
                          ? "destructive"
                          : "outline"
                      }
                      className="text-[10px] capitalize"
                    >
                      {selectedStoryboard.status}
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-xs">
                  Scene-by-scene AI generation prompts, camera directions, motion cues, on-screen text, and sound effects.
                </CardDescription>
              </div>

              {selectedStoryboard && (
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => {
                      setEditingScene(null);
                      setSceneDialogOpen(true);
                    }}
                  >
                    <Plus className="h-3 w-3" />
                    Add Scene
                  </Button>

                  <Button
                    variant="default"
                    size="sm"
                    className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => handleUpdateStoryboardStatus("approved")}
                  >
                    <ThumbsUp className="h-3 w-3" />
                    Approve Storyboard
                  </Button>

                  <Link href={`/dashboard/videos?storyboard_id=${selectedStoryboard.id}`}>
                    <Button
                      size="sm"
                      className="h-7 text-xs gap-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                    >
                      <Film className="h-3 w-3" />
                      Produce Video in Studio
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>

                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1 text-red-500"
                    onClick={() => handleUpdateStoryboardStatus("rejected")}
                  >
                    <ThumbsDown className="h-3 w-3" />
                    Reject
                  </Button>
                </div>
              )}
            </CardHeader>

            <CardContent>
              {storyboardError && (
                <div className="mb-4 p-3 rounded border border-red-500/30 bg-red-500/10 text-red-600 text-xs">
                  {storyboardError}
                </div>
              )}

              {loadingStoryboards ? (
                <div className="py-12 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  Loading storyboard...
                </div>
              ) : storyboardScenes.length === 0 ? (
                <EmptyState
                  icon={Clapperboard}
                  title="No Storyboard Scenes Active"
                  description="Generate a script in the Script Generator tab and click 'Convert to 9:16 Storyboard' to produce sequential AI video prompts."
                  phase="Active Storyboard Engine"
                />
              ) : (
                <div className="space-y-3">
                  {storyboardScenes.map((scene, idx) => (
                    <div
                      key={scene.id || idx}
                      className="rounded-lg border bg-card p-3 flex flex-col md:flex-row md:items-start gap-4 hover:border-indigo-500/40 transition-colors"
                    >
                      {/* Scene Index & Timing */}
                      <div className="w-24 shrink-0 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-foreground">
                            Scene {scene.scene_number}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-[9px] capitalize">
                          {scene.scene_type}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground font-mono block">
                          {scene.duration}s duration
                        </span>
                      </div>

                      {/* Content & Visual Directives */}
                      <div className="flex-1 space-y-2 text-xs">
                        <div className="p-2 rounded bg-muted/30 border text-[11px]">
                          <strong className="text-primary block text-[10px] uppercase tracking-wider">
                            Narration Line:
                          </strong>
                          "{scene.narration}"
                        </div>

                        <div>
                          <strong className="text-foreground block text-[11px] mb-0.5">
                            Visual Description:
                          </strong>
                          <p className="text-muted-foreground">{scene.visual_description}</p>
                        </div>

                        <div className="p-2 rounded bg-indigo-500/5 border border-indigo-500/20 text-[11px]">
                          <strong className="text-indigo-600 dark:text-indigo-400 block text-[10px] uppercase tracking-wider">
                            AI Video Generation Prompt (9:16 Vertical):
                          </strong>
                          <p className="font-mono text-muted-foreground text-[10px] mt-0.5">
                            {scene.video_prompt}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground pt-1">
                          {scene.camera_direction && (
                            <span className="bg-muted px-1.5 py-0.5 rounded">
                              <strong>Camera:</strong> {scene.camera_direction}
                            </span>
                          )}
                          {scene.motion_description && (
                            <span className="bg-muted px-1.5 py-0.5 rounded">
                              <strong>Motion:</strong> {scene.motion_description}
                            </span>
                          )}
                          {scene.transition && (
                            <span className="bg-muted px-1.5 py-0.5 rounded">
                              <strong>Transition:</strong> {scene.transition}
                            </span>
                          )}
                          {scene.on_screen_text && (
                            <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded font-semibold">
                              <strong>Text Overlay:</strong> "{scene.on_screen_text}"
                            </span>
                          )}
                          {scene.sound_effect && (
                            <span className="bg-purple-500/10 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded font-semibold">
                              <strong>SFX:</strong> {scene.sound_effect}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Scene Controls */}
                      <div className="flex md:flex-col items-center gap-1 shrink-0 pt-2 md:pt-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-[11px] px-2 text-primary"
                          onClick={() => {
                            setEditingScene(scene);
                            setSceneDialogOpen(true);
                          }}
                        >
                          Edit
                        </Button>

                        {scene.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[11px] px-2"
                            disabled={regeneratingSceneId === scene.id}
                            onClick={() => handleRegenerateScene(scene.id!)}
                          >
                            {regeneratingSceneId === scene.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              "Regen AI"
                            )}
                          </Button>
                        )}

                        {scene.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
                            onClick={() => handleDeleteScene(scene.id!)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------------------------------------------------ */}
        {/* TAB 6: CONTENT HISTORY */}
        {/* ------------------------------------------------------------------ */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-semibold">Content Generation History & Audit</CardTitle>
                <CardDescription className="text-xs">
                  Complete searchable ledger of ideas, scripts, storyboards, and token expenditures.
                </CardDescription>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Input
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Search history..."
                  className="h-8 text-xs w-48"
                />

                <select
                  value={historyPageFilter}
                  onChange={(e) => setHistoryPageFilter(e.target.value)}
                  className="h-8 text-xs rounded border border-input bg-background px-2"
                >
                  <option value="all">All Pages</option>
                  {pages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.page_name || p.name}
                    </option>
                  ))}
                </select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-y bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Content Title</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Facebook Page</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Created</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {/* Render Scripts in History */}
                    {scripts
                      .filter((s) => {
                        const matchesSearch =
                          !historySearch ||
                          s.script_title?.toLowerCase().includes(historySearch.toLowerCase());
                        const matchesPage =
                          historyPageFilter === "all" || s.facebook_page_id === historyPageFilter;
                        return matchesSearch && matchesPage;
                      })
                      .map((s) => (
                        <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-medium text-foreground max-w-xs truncate">
                            {s.script_title}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="text-[10px]">
                              Script
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {s.facebook_pages?.page_name || "General Page"}
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={
                                s.status === "approved"
                                  ? "success"
                                  : s.status === "rejected"
                                  ? "destructive"
                                  : "outline"
                              }
                              className="text-[10px] capitalize"
                            >
                              {s.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-[11px]">
                            {new Date(s.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs text-primary"
                              onClick={() => {
                                loadScriptIntoEditor(s);
                                setActiveTab("scripts");
                              }}
                            >
                              Open Script
                            </Button>
                          </td>
                        </tr>
                      ))}

                    {/* Render Ideas in History */}
                    {ideas
                      .filter((i) => {
                        const matchesSearch =
                          !historySearch ||
                          i.title?.toLowerCase().includes(historySearch.toLowerCase());
                        const matchesPage =
                          historyPageFilter === "all" ||
                          i.facebook_page_id === historyPageFilter ||
                          i.page_id === historyPageFilter;
                        return matchesSearch && matchesPage;
                      })
                      .map((i) => (
                        <tr key={i.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-medium text-foreground max-w-xs truncate">
                            {i.title}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="text-[10px] border-purple-500/30 text-purple-600 dark:text-purple-400">
                              Idea
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {i.facebook_pages?.page_name || "General Page"}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="text-[10px] capitalize">
                              {i.content_status || i.status || "draft"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-[11px]">
                            {new Date(i.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs text-primary"
                              onClick={() => {
                                setScriptTitle(i.title);
                                setScriptHook(i.hook || i.title);
                                setScriptTopic(i.topic || i.title);
                                setScriptIdeaId(i.id);
                                if (i.facebook_page_id || i.page_id) {
                                  setScriptPageId(i.facebook_page_id || i.page_id);
                                }
                                setActiveTab("scripts");
                              }}
                            >
                              Draft Script
                            </Button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Page Niche Configuration Dialog */}
      {nicheDialogPage && (
        <PageNicheDialog
          pageId={nicheDialogPage.id}
          pageName={nicheDialogPage.name}
          isOpen={nicheDialogOpen}
          onClose={() => setNicheDialogOpen(false)}
          onSaved={() => fetchPages()}
        />
      )}

      {/* Storyboard Scene Edit Dialog */}
      {selectedStoryboard && (
        <SceneEditDialog
          storyboardId={selectedStoryboard.id}
          scene={editingScene}
          isOpen={sceneDialogOpen}
          onClose={() => setSceneDialogOpen(false)}
          onSaved={(saved) => {
            if (editingScene) {
              setStoryboardScenes((prev) =>
                prev.map((sc) => (sc.id === saved.id ? saved : sc))
              );
            } else {
              setStoryboardScenes((prev) => [...prev, saved]);
            }
          }}
        />
      )}
    </div>
  );
}
