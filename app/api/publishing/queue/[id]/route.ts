import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { createClient } from "@/lib/supabase/server";
import { JobActionSchema } from "@/lib/validations/publishing";
import { processPublishingQueue } from "@/lib/publishing/queue-worker";

export const dynamic = "force-dynamic";

/**
 * GET /api/publishing/queue/[id]
 * Returns job details and chronological audit logs.
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

    const { data: job, error: jobErr } = await supabase
      .from("publishing_jobs")
      .select(
        `
        *,
        video:videos(id, title, thumbnail_url, video_url, duration_seconds, resolution, aspect_ratio),
        facebook_page:facebook_pages(id, page_name, profile_picture_url, facebook_page_id)
      `
      )
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();

    if (jobErr || !job) {
      return NextResponse.json({ error: "Publishing job not found." }, { status: 404 });
    }

    const { data: logs } = await supabase
      .from("publishing_logs")
      .select("*")
      .eq("job_id", params.id)
      .order("created_at", { ascending: true });

    return NextResponse.json({ job, logs: logs || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/publishing/queue/[id]
 * Executes job actions: retry, cancel, reschedule, publish_now.
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
    const validation = JobActionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Invalid action parameters." }, { status: 400 });
    }

    const { action, scheduled_at } = validation.data;
    const supabase = await createClient();

    const { data: job, error: jobErr } = await supabase
      .from("publishing_jobs")
      .select("id, status, attempts")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();

    if (jobErr || !job) {
      return NextResponse.json({ error: "Job not found." }, { status: 404 });
    }

    if (action === "cancel") {
      if (job.status === "uploading" || job.status === "publishing") {
        return NextResponse.json(
          { error: "Cannot cancel a job currently being uploaded or published." },
          { status: 400 }
        );
      }

      await supabase
        .from("publishing_jobs")
        .update({ status: "cancelled", locked_at: null, locked_by: null })
        .eq("id", params.id);

      return NextResponse.json({ success: true, message: "Job cancelled successfully." });
    }

    if (action === "retry") {
      await supabase
        .from("publishing_jobs")
        .update({
          status: "queued",
          scheduled_at: new Date().toISOString(),
          next_retry_at: null,
          error_message: null,
          error_code: null,
          locked_at: null,
          locked_by: null,
        })
        .eq("id", params.id);

      // Trigger immediate queue cycle
      processPublishingQueue(supabase).catch(() => {});

      return NextResponse.json({ success: true, message: "Job re-queued for publishing." });
    }

    if (action === "publish_now") {
      await supabase
        .from("publishing_jobs")
        .update({
          status: "queued",
          scheduled_at: new Date().toISOString(),
          locked_at: null,
          locked_by: null,
        })
        .eq("id", params.id);

      processPublishingQueue(supabase).catch(() => {});

      return NextResponse.json({ success: true, message: "Job moved to front of queue." });
    }

    if (action === "reschedule") {
      if (!scheduled_at) {
        return NextResponse.json({ error: "scheduled_at is required for rescheduling." }, { status: 400 });
      }

      await supabase
        .from("publishing_jobs")
        .update({
          status: "scheduled",
          scheduled_at,
          locked_at: null,
          locked_by: null,
        })
        .eq("id", params.id);

      return NextResponse.json({ success: true, message: "Job rescheduled successfully." });
    }

    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/publishing/queue/[id]
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
      .from("publishing_jobs")
      .delete()
      .eq("id", params.id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
