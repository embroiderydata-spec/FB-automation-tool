import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { createClient } from "@/lib/supabase/server";
import { processPublishingQueue } from "@/lib/publishing/queue-worker";

export const dynamic = "force-dynamic";

/**
 * POST /api/publishing/worker
 * Triggers a publishing worker pass to process due queue items.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const supabase = await createClient();
    const result = await processPublishingQueue(supabase, `api_${user.id.substring(0, 8)}`);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * GET /api/publishing/worker
 * Query worker status / active jobs.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const supabase = await createClient();
    const { data: activeJobs } = await supabase
      .from("publishing_jobs")
      .select("id, page_id, video_id, status, started_at, attempts")
      .in("status", ["uploading", "processing", "publishing"])
      .eq("user_id", user.id);

    return NextResponse.json({
      is_active: (activeJobs || []).length > 0,
      active_jobs: activeJobs || [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
