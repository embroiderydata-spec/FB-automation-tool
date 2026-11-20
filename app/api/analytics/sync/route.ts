import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { createClient } from "@/lib/supabase/server";
import { SyncAnalyticsSchema } from "@/lib/validations/analytics";
import { syncAllPagesAnalytics, syncPageAnalytics } from "@/lib/analytics/sync-engine";

export const dynamic = "force-dynamic";

/**
 * POST /api/analytics/sync
 * Triggers on-demand synchronization of Facebook Page and Reel Insights.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = SyncAnalyticsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid sync request.", details: parsed.error.format() }, { status: 400 });
    }

    const { page_id } = parsed.data;
    const supabase = await createClient();

    if (page_id && page_id !== "all") {
      const result = await syncPageAnalytics(supabase, page_id, user.id);
      return NextResponse.json({
        message: result.message || "Page analytics synchronized.",
        result,
      });
    }

    const allResults = await syncAllPagesAnalytics(supabase, user.id);
    return NextResponse.json({
      message: `Synchronized ${allResults.pages_synced} page(s) and ${allResults.videos_synced} video(s).`,
      result: allResults,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Analytics synchronization failed." }, { status: 500 });
  }
}
