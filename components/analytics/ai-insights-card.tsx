"use client";

import React from "react";
import {
  BrainCircuit,
  Sparkles,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  FlaskConical,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { IntelligenceAnalysisResult } from "@/lib/analytics/ai-intelligence";

interface AIInsightsCardProps {
  analysis: IntelligenceAnalysisResult | null;
}

export function AIInsightsCard({ analysis }: AIInsightsCardProps) {
  if (!analysis) return null;

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case "high":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">
            High Confidence
          </Badge>
        );
      case "moderate":
        return (
          <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20 text-[10px]">
            Moderate Confidence
          </Badge>
        );
      case "insufficient_data":
        return (
          <Badge variant="outline" className="text-amber-600 border-amber-500/20 text-[10px]">
            Insufficient Data
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-[10px]">
            Low Confidence
          </Badge>
        );
    }
  };

  return (
    <div className="rounded-xl border bg-card p-5 space-y-5 shadow-sm text-xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <BrainCircuit className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">AI Performance Intelligence</h3>
            <p className="text-[11px] text-muted-foreground">{analysis.statusMessage}</p>
          </div>
        </div>
        <Badge variant="outline" className="gap-1 text-[10px] bg-primary/5 text-primary border-primary/20">
          <Sparkles className="h-3 w-3" /> Autonomous Meta Engine
        </Badge>
      </div>

      {!analysis.hasSufficientData ? (
        <div className="p-6 border border-dashed rounded-xl text-center space-y-2 bg-muted/10">
          <HelpCircle className="h-7 w-7 text-amber-500 mx-auto" />
          <div className="font-semibold text-foreground">Waiting for Performance Telemetry</div>
          <p className="text-muted-foreground max-w-md mx-auto text-[11px]">
            {analysis.statusMessage}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Strategy Recommendations */}
          <div className="space-y-3">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-primary" /> Data-Driven Content Strategy Recommendations
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {analysis.insights.map((ins) => (
                <div key={ins.id} className="p-4 rounded-xl border bg-muted/10 space-y-2.5 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground text-xs">{ins.title}</span>
                      {getConfidenceBadge(ins.confidence_level)}
                    </div>
                    <p className="text-muted-foreground text-[11px] leading-relaxed">{ins.recommendation}</p>
                  </div>

                  {ins.suggested_experiment && (
                    <div className="p-2 rounded-lg bg-primary/5 border border-primary/15 text-[11px] flex items-start gap-1.5 text-foreground">
                      <FlaskConical className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                      <span>
                        <span className="font-semibold">Suggested Experiment: </span>
                        {ins.suggested_experiment}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Hook Category Retention Breakdown */}
          {analysis.hookCategories.length > 0 && (
            <div className="space-y-2.5 pt-2 border-t">
              <span className="font-semibold text-foreground">Hook Category Performance Breakdown</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {analysis.hookCategories.map((cat) => (
                  <div key={cat.category} className="p-2.5 rounded-lg border bg-card text-center space-y-1">
                    <div className="font-semibold text-foreground text-[11px] truncate">{cat.category}</div>
                    <div className="text-sm font-bold text-primary font-mono">{cat.avgWatchPercentage}%</div>
                    <div className="text-[10px] text-muted-foreground">
                      {cat.avgViews.toLocaleString()} avg views ({cat.count})
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Best Publishing Windows */}
          {analysis.publishingTimePatterns.length > 0 && (
            <div className="p-3 rounded-lg border bg-muted/20 flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">
                  Optimal Publishing Slot based on history:{" "}
                  <span className="font-semibold text-foreground">
                    {analysis.publishingTimePatterns[0].dayOfWeek}s at {analysis.publishingTimePatterns[0].hourOfDay}:00 UTC
                  </span>{" "}
                  (averaging {analysis.publishingTimePatterns[0].avgViews.toLocaleString()} views).
                </span>
              </div>
              <span className="text-muted-foreground italic text-[10px]">
                Historical correlation, not algorithmic guarantee.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
