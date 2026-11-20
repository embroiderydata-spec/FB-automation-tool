import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { createClient } from "@/lib/supabase/server";
import { dispatchVideoRender } from "@/lib/video/queue/dispatcher";

export const dynamic = "force-dynamic";

/**
 * GET /api/video/render/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const supabase = await createClient();

    const { data: job, error } = await supabase
      .from("videos")
      .select("*, facebook_pages(id, page_name, name), content_scripts(script_title)")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();

    if (error || !job) {
      return NextResponse.json({ error: "Render job not found." }, { status: 404 });
    }

    return NextResponse.json({ job });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/video/render/[id]
 * Retries a failed render job or cancels an in-flight job.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const action = body.action || "retry";

    const supabase = await createClient();

    const { data: job, error } = await supabase
      .from("videos")
      .select("*")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();

    if (error || !job) {
      return NextResponse.json({ error: "Render job not found." }, { status: 404 });
    }

    if (action === "cancel") {
      await supabase
        .from("videos")
        .update({
          render_status: "cancelled",
          error_message: "Job cancelled by user.",
        })
        .eq("id", params.id);

      return NextResponse.json({ success: true, message: "Job cancelled." });
    }

    if (action === "retry") {
      if (!job.storyboard_id || !job.script_id) {
        return NextResponse.json(
          { error: "Cannot retry job without linked storyboard and script." },
          { status: 400 }
        );
      }

      await supabase
        .from("videos")
        .update({
          render_status: "pending",
          render_progress: 0,
          error_message: null,
          retry_count: (job.retry_count || 0) + 1,
        })
        .eq("id", params.id);

      // Re-dispatch render in background
      dispatchVideoRender({
        supabase,
        userId: user.id,
        videoId: job.id,
        storyboardId: job.storyboard_id,
        scriptId: job.script_id,
        pageId: job.facebook_page_id || job.page_id,
      }).catch((err) => console.error("[RenderRetry] Error:", err));

      return NextResponse.json({ success: true, message: "Job re-queued for rendering." });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/video/render/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from("videos")
      .delete()
      .eq("id", params.id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
