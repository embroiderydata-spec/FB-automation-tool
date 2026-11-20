import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { createClient } from "@/lib/supabase/server";
import { SchedulePostSchema, PublishNowSchema } from "@/lib/validations/publishing";
import { validatePublishingPreflight } from "@/lib/publishing/test-mode";
import { processPublishingQueue } from "@/lib/publishing/queue-worker";

export const dynamic = "force-dynamic";

/**
 * GET /api/publishing/queue
 * Returns publishing jobs with video and page relations.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const pageId = searchParams.get("page_id");
    const limit = Math.min(Number(searchParams.get("limit") || 50), 100);

    const supabase = await createClient();

    let query = supabase
      .from("publishing_jobs")
      .select(
        `
        *,
        video:videos(id, title, thumbnail_url, video_url, duration_seconds, resolution, aspect_ratio),
        facebook_page:facebook_pages(id, page_name, profile_picture_url, facebook_page_id)
      `
      )
      .eq("user_id", user.id)
      .order("scheduled_at", { ascending: true })
      .limit(limit);

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    if (pageId && pageId !== "all") {
      query = query.eq("page_id", pageId);
    }

    const { data: jobs, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ jobs: jobs || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/publishing/queue
 * Schedules or enqueues a new Facebook Reel.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const isImmediate = body.publish_now === true;

    const validation = isImmediate
      ? PublishNowSchema.safeParse(body)
      : SchedulePostSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation error", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { video_id, page_id, caption, is_test_mode } = validation.data;
    const scheduled_at = (validation.data as any).scheduled_at || new Date().toISOString();
    const timezone = (validation.data as any).timezone || "UTC";

    // 1. Run preflight validation
    const preflight = await validatePublishingPreflight(
      supabase,
      user.id,
      page_id,
      video_id,
      caption
    );

    if (!preflight.valid) {
      return NextResponse.json(
        { error: "Publishing preflight check failed", issues: preflight.errors },
        { status: 422 }
      );
    }

    // 2. Create content_posts record
    const { data: post, error: postErr } = await supabase
      .from("content_posts")
      .insert({
        user_id: user.id,
        page_id,
        video_id,
        post_caption: caption,
        post_type: "reel",
        status: isImmediate ? "publishing" : "scheduled",
        scheduled_publish_time: scheduled_at,
      })
      .select()
      .single();

    if (postErr) {
      return NextResponse.json({ error: postErr.message }, { status: 500 });
    }

    // 3. Create publishing_jobs record
    const { data: job, error: jobErr } = await supabase
      .from("publishing_jobs")
      .insert({
        user_id: user.id,
        post_id: post.id,
        page_id,
        facebook_page_id: page_id,
        video_id,
        caption,
        scheduled_at,
        timezone,
        status: isImmediate ? "queued" : "scheduled",
        is_test_mode: is_test_mode ?? true,
      })
      .select(
        `
        *,
        video:videos(id, title, thumbnail_url, video_url, duration_seconds),
        facebook_page:facebook_pages(id, page_name, profile_picture_url)
      `
      )
      .single();

    if (jobErr) {
      return NextResponse.json({ error: jobErr.message }, { status: 500 });
    }

    // If publishing immediately, trigger a worker pass
    if (isImmediate) {
      processPublishingQueue(supabase).catch((err) =>
        console.error("Async queue trigger failed:", err)
      );
    }

    return NextResponse.json({
      success: true,
      job,
      warnings: preflight.warnings,
      message: isImmediate
        ? "Reel enqueued for immediate publishing."
        : "Reel successfully scheduled.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
