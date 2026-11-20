"use client";

import React from "react";
import Link from "next/link";
import { Share2, ArrowRight, CheckCircle2, Plus, Users, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface ConnectedPageItem {
  id: string;
  name?: string;
  page_name?: string;
  category?: string;
  followers_count?: number;
  connection_status?: string;
  automation_enabled?: boolean;
  picture_url?: string;
  profile_picture_url?: string;
  last_synced_at?: string;
}

export function ConnectedPagesPreview({ pages = [], loading = false }: { pages?: ConnectedPageItem[]; loading?: boolean }) {
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
          <Badge variant="outline" className="text-[10px]">
            {pages.length} / 100 Pages
          </Badge>
          <Link href="/dashboard/pages">
            <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs">
              Manage All <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {pages.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 mx-auto">
              <Share2 className="h-5 w-5" />
            </div>
            <p className="font-medium text-foreground">No Facebook Pages Connected</p>
            <p className="text-[11px] max-w-xs mx-auto">
              Connect your Facebook account to import authorized pages and activate automation.
            </p>
            <Link href="/dashboard/pages">
              <Button size="sm" className="h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="h-3.5 w-3.5" /> Connect First Page
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {pages.map((page) => {
              const displayName = page.page_name || page.name || "Facebook Page";
              const avatar = page.picture_url || page.profile_picture_url;
              return (
                <div
                  key={page.id}
                  className="flex items-center justify-between rounded-lg border bg-card/60 p-3 transition-colors hover:border-primary/40 hover:bg-muted/40"
                >
                  <div className="flex items-center gap-3">
                    {avatar ? (
                      <img src={avatar} alt={displayName} className="h-10 w-10 rounded-xl object-cover border" />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 font-bold text-sm shadow-xs border border-blue-500/20">
                        f
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-foreground truncate max-w-[160px]">
                          {displayName}
                        </span>
                        <Badge
                          variant={page.automation_enabled ? "success" : "outline"}
                          className="text-[9px] px-1.5 py-0"
                        >
                          {page.automation_enabled ? "Automated" : "Manual"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                        <span>{page.category || "General"}</span>
                        <span>&bull;</span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {(page.followers_count || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Link href={`/dashboard/pages`}>
                    <Button variant="outline" size="sm" className="h-7 text-xs px-2.5">
                      Configure
                    </Button>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
