import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { createClient } from "@/lib/supabase/server";
import { GrowthSnapshot } from "@/lib/analytics/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/analytics/growth
 * Returns historical daily snapshots for charting follower and reach trajectory over time.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const pageId = searchParams.get("page_id");
    const days = Math.min(Number(searchParams.get("days") || 30), 90);

    const supabase = await createClient();

    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);
    const sinceStr = sinceDate.toISOString().split("T")[0];

    let query = supabase
      .from("page_analytics_snapshots")
      .select("snapshot_date, followers, views, reach, engagement, follows_gained, follows_lost")
      .eq("user_id", user.id)
      .gte("snapshot_date", sinceStr)
      .order("snapshot_date", { ascending: true });

    if (pageId && pageId !== "all") {
      query = query.eq("facebook_page_id", pageId);
    }

    const { data: rows, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const snapshots: GrowthSnapshot[] = (rows || []).map((r) => ({
      snapshot_date: r.snapshot_date,
      followers: Number(r.followers || 0),
      views: Number(r.views || 0),
      reach: Number(r.reach || 0),
      engagement: Number(r.engagement || 0),
      follows_gained: Number(r.follows_gained || 0),
      follows_lost: Number(r.follows_lost || 0),
      net_followers: Number(r.follows_gained || 0) - Number(r.follows_lost || 0),
    }));

    return NextResponse.json({ snapshots });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to fetch growth snapshots." }, { status: 500 });
  }
}
