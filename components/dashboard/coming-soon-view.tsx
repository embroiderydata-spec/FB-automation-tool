"use client";

import React from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowLeft,
  Clock,
  Layers,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Film,
  Scissors,
  Youtube,
  Construction,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface ComingSoonViewProps {
  moduleName: string;
  badgeText?: string;
  icon: React.ElementType;
  description: string;
  features: Array<{
    title: string;
    description: string;
  }>;
}

export function ComingSoonView({
  moduleName,
  badgeText = "Coming Soon",
  icon: Icon,
  description,
  features,
}: ComingSoonViewProps) {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 space-y-8 animate-in fade-in duration-500">
      {/* Top Banner / Badge */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-semibold shadow-sm">
          <Clock className="h-3.5 w-3.5" />
          <span>{badgeText}</span>
        </div>

        {/* Hero Icon with Ambient Glow */}
        <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
          <div className="absolute inset-0 rounded-3xl bg-primary/20 blur-xl animate-pulse" />
          <div className="relative flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/10 via-card to-muted border-2 border-primary/30 shadow-lg text-primary">
            <Icon className="h-10 w-10" />
          </div>
        </div>

        {/* Title & Subtitle */}
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            {moduleName}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
            {description}
          </p>
        </div>

        {/* Back to Dashboard and Active Modules Navigation */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link href="/dashboard">
            <Button variant="default" className="gap-2 shadow-sm">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          <Link href="/dashboard/youtube">
            <Button variant="outline" className="gap-2 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400">
              <Youtube className="h-4 w-4 text-red-600" />
              Open YouTube Studio
            </Button>
          </Link>
          <Link href="/dashboard/clipper">
            <Button variant="outline" className="gap-2">
              <Scissors className="h-4 w-4 text-amber-500" />
              AI Video Clipper
            </Button>
          </Link>
        </div>
      </div>

      {/* Feature Preview Cards */}
      <div className="space-y-3">
        <div className="text-center">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            What's Being Built in This Module
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {features.map((feat, idx) => (
            <Card key={idx} className="border bg-card/60 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                    {idx + 1}
                  </div>
                  <h3 className="font-semibold text-sm line-clamp-1">{feat.title}</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {feat.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Production Notice */}
      <Card className="border-dashed bg-muted/30">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground text-center sm:text-left">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>
              This module is temporarily paused for security hardening and API rate-limit optimization. All underlying data and configurations remain safe.
            </span>
          </div>
          <Link href="/dashboard/settings" className="text-primary hover:underline font-medium shrink-0">
            Platform Settings &rarr;
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
