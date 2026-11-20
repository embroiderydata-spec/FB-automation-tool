"use client";

import React from "react";
import Link from "next/link";
import { Share2, ArrowRight, CheckCircle2, Plus, Users, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface ConnectedPageItem {
  id: string;
  name: string;
  fbPageId: string;
  category: string;
  followers: number;
  status: "active" | "syncing" | "paused";
  postingFrequency: string;
  lastPublished: string;
  isDemo?: boolean;
}

export const DEMO_PAGES: ConnectedPageItem[] = [
  {
    id: "page-1",
    name: "TechPulse Daily",
    fbPageId: "108392184918231",
    category: "Technology & AI",
    followers: 124800,
    status: "active",
    postingFrequency: "2 reels / day",
    lastPublished: "12m ago",
    isDemo: true,
  },
  {
    id: "page-2",
    name: "Viral Motivation Hub",
    fbPageId: "109403819284910",
    category: "Inspiration & Quotes",
    followers: 86450,
    status: "active",
    postingFrequency: "3 reels / day",
    lastPublished: "4h ago",
    isDemo: true,
  },
  {
    id: "page-3",
    name: "Daily Finance Hacks",
    fbPageId: "104928174920194",
    category: "Personal Finance",
    followers: 43200,
    status: "active",
    postingFrequency: "1 reel / day",
    lastPublished: "1d ago",
    isDemo: true,
  },
];

export function ConnectedPagesPreview({ pages = DEMO_PAGES }: { pages?: ConnectedPageItem[] }) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base font-semibold">Connected Facebook Pages</CardTitle>
          <CardDescription className="text-xs">
            Manage up to 100 pages from a single centralized hub
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="demo" className="text-[10px]">
            3 / 100 Pages
          </Badge>
          <Link href="/dashboard/pages">
            <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs">
              Manage All <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {pages.map((page) => (
            <div
              key={page.id}
              className="flex items-center justify-between rounded-lg border bg-card/60 p-3 transition-colors hover:border-primary/40 hover:bg-muted/40"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 font-bold text-sm shadow-xs border border-blue-500/20">
                  f
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-foreground">
                      {page.name}
                    </span>
                    <Badge variant="success" className="text-[9px] px-1.5 py-0">
                      Active
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                    <span>{page.category}</span>
                    <span>&bull;</span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {page.followers.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-[11px] font-medium text-foreground">
                  {page.postingFrequency}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  Last: {page.lastPublished}
                </div>
              </div>
            </div>
          ))}

          {/* Quick Connect CTA (Phase 2 Preview) */}
          <Link href="/dashboard/pages">
            <div className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-dashed border-border/70 p-2.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground hover:bg-accent/30 cursor-pointer">
              <Plus className="h-3.5 w-3.5 text-primary" />
              <span>Connect another page (97 slots available)</span>
            </div>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
