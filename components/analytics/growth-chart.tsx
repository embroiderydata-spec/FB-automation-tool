"use client";

import React from "react";
import { TrendingUp, Users, Eye, LineChart } from "lucide-react";
import { GrowthSnapshot } from "@/lib/analytics/types";

interface GrowthChartProps {
  snapshots: GrowthSnapshot[];
}

export function GrowthChart({ snapshots }: GrowthChartProps) {
  if (snapshots.length === 0) {
    return (
      <div className="p-8 border border-dashed rounded-xl text-center text-xs text-muted-foreground">
        No historical growth snapshots collected yet. Daily snapshots are captured during analytics synchronization.
      </div>
    );
  }

  const maxViews = Math.max(...snapshots.map((s) => s.views), 10);
  const maxFollowers = Math.max(...snapshots.map((s) => s.followers), 10);

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4 shadow-sm text-xs">
      <div className="flex items-center justify-between border-b pb-3">
        <div className="flex items-center gap-2">
          <LineChart className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Follower & View Growth Trajectory</h3>
        </div>
        <span className="text-xs text-muted-foreground">{snapshots.length} Snapshot Days</span>
      </div>

      {/* Bar/Line visualization */}
      <div className="pt-2">
        <div className="flex items-end gap-1.5 h-32 border-b pb-1 px-1">
          {snapshots.map((s, idx) => {
            const heightPercent = Math.max(Math.round((s.views / maxViews) * 100), 4);
            return (
              <div key={idx} className="flex-1 flex flex-col items-center group relative">
                <div
                  className="w-full bg-primary/70 group-hover:bg-primary rounded-t transition-all"
                  style={{ height: `${heightPercent}%` }}
                />
                <div className="absolute -top-8 hidden group-hover:block bg-popover text-popover-foreground text-[10px] px-2 py-1 rounded shadow border whitespace-nowrap z-10">
                  {s.snapshot_date}: {s.views.toLocaleString()} views • {s.followers.toLocaleString()} followers
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5">
          <span>{snapshots[0]?.snapshot_date}</span>
          <span>{snapshots[Math.floor(snapshots.length / 2)]?.snapshot_date}</span>
          <span>{snapshots[snapshots.length - 1]?.snapshot_date}</span>
        </div>
      </div>
    </div>
  );
}
