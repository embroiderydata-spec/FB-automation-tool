"use client";

import React, { useState } from "react";
import { ArrowUpDown, Award, AlertCircle, Share2, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CrossPageMetric } from "@/lib/analytics/types";

interface CrossPageTableProps {
  pages: CrossPageMetric[];
  onSelectPage?: (pageId: string) => void;
}

export function CrossPageTable({ pages, onSelectPage }: CrossPageTableProps) {
  const [sortField, setSortField] = useState<keyof CrossPageMetric>("views");
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (field: keyof CrossPageMetric) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const sortedPages = [...pages].sort((a, b) => {
    const valA = a[sortField] ?? -1;
    const valB = b[sortField] ?? -1;
    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  if (pages.length === 0) {
    return (
      <div className="p-8 border border-dashed rounded-xl text-center text-xs text-muted-foreground">
        No Facebook Pages connected or synchronized yet. Connect a Page from the Page Manager to view cross-page metrics.
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Cross-Page Portfolio Benchmark</h3>
        </div>
        <span className="text-xs text-muted-foreground">{pages.length} Connected Page(s)</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/30 border-b text-muted-foreground">
            <tr>
              <th className="p-3.5 font-semibold">Page Name</th>
              <th
                className="p-3.5 font-semibold cursor-pointer hover:text-foreground"
                onClick={() => handleSort("followers")}
              >
                <div className="flex items-center gap-1">
                  Followers <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th
                className="p-3.5 font-semibold cursor-pointer hover:text-foreground"
                onClick={() => handleSort("views")}
              >
                <div className="flex items-center gap-1">
                  Video Views <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th
                className="p-3.5 font-semibold cursor-pointer hover:text-foreground"
                onClick={() => handleSort("reach")}
              >
                <div className="flex items-center gap-1">
                  Reach <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th
                className="p-3.5 font-semibold cursor-pointer hover:text-foreground"
                onClick={() => handleSort("engagement")}
              >
                <div className="flex items-center gap-1">
                  Engagements <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th
                className="p-3.5 font-semibold cursor-pointer hover:text-foreground"
                onClick={() => handleSort("engagement_rate")}
              >
                <div className="flex items-center gap-1">
                  Engagement Rate <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th
                className="p-3.5 font-semibold cursor-pointer hover:text-foreground"
                onClick={() => handleSort("avg_watch_time_seconds")}
              >
                <div className="flex items-center gap-1">
                  Avg Watch Time <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="p-3.5 font-semibold">Published</th>
              <th className="p-3.5 font-semibold text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sortedPages.map((p) => (
              <tr
                key={p.page_id}
                onClick={() => onSelectPage && onSelectPage(p.page_id)}
                className="hover:bg-muted/20 cursor-pointer transition-colors"
              >
                <td className="p-3.5">
                  <div className="flex items-center gap-2.5">
                    {p.profile_picture_url ? (
                      <img
                        src={p.profile_picture_url}
                        alt={p.page_name}
                        className="h-7 w-7 rounded-full border object-cover"
                      />
                    ) : (
                      <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                        {p.page_name.slice(0, 1)}
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-foreground flex items-center gap-1.5">
                        {p.page_name}
                        {p.is_highest_performer && (
                          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] gap-1">
                            <Award className="h-3 w-3" /> Top Performer
                          </Badge>
                        )}
                        {p.is_lowest_performer && pages.length > 1 && (
                          <Badge variant="outline" className="text-amber-600 border-amber-500/20 text-[10px]">
                            Needs Attention
                          </Badge>
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono">ID: {p.facebook_page_id}</div>
                    </div>
                  </div>
                </td>

                <td className="p-3.5 font-medium text-foreground">{p.followers.toLocaleString()}</td>
                <td className="p-3.5 font-medium text-foreground">{p.views.toLocaleString()}</td>
                <td className="p-3.5 font-medium text-foreground">{p.reach.toLocaleString()}</td>
                <td className="p-3.5 font-medium text-foreground">{p.engagement.toLocaleString()}</td>
                <td className="p-3.5 font-mono">
                  {p.engagement_rate !== null ? `${p.engagement_rate}%` : <span className="text-muted-foreground">N/A</span>}
                </td>
                <td className="p-3.5 font-mono">
                  {p.avg_watch_time_seconds !== null ? (
                    `${p.avg_watch_time_seconds}s`
                  ) : (
                    <span className="text-muted-foreground">N/A</span>
                  )}
                </td>
                <td className="p-3.5 text-muted-foreground">{p.posts_published} Reels</td>
                <td className="p-3.5 text-right">
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {p.sync_status || "idle"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
