import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { createClient } from "@/lib/supabase/server";
import { VideoRenderDispatchSchema } from "@/lib/validations/video";
import { dispatchVideoRender } from "@/lib/video/queue/dispatcher";

export const dynamic = "force-dynamic";

/**
 * GET /api/video/render
 * Returns all active and historical video rendering queue jobs.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const supabase = await createClient();

    const { data: jobs, error } = await supabase
      .from("videos")
      .select("*, facebook_pages(id, page_name, name), content_scripts(script_title), content_storyboards(id)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[GET /api/video/render] DB error:", error);
      return NextResponse.json({ jobs: [] });
    }

    return NextResponse.json({ jobs: jobs || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/video/render
 * Dispatches a full video composition and rendering pipeline.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const validation = VideoRenderDispatchSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed.", details: validation.error.format() },
        { status: 400 }
      );
    }

    const {
      storyboard_id,
      script_id,
      page_id,
      subtitle_preset,
      voice_id,
      include_watermark,
      resolution,
    } = validation.data;

    const supabase = await createClient();

    // 1. Fetch script for title
    const { data: script } = await supabase
      .from("content_scripts")
      .select("script_title, content_idea_id")
      .eq("id", script_id)
      .single();

    const videoTitle = script?.script_title || "New Facebook Reel";

    // 2. Create pending record in videos table
    const { data: videoRecord, error: insertErr } = await supabase
      .from("videos")
      .insert({
        user_id: user.id,
        facebook_page_id: page_id,
        page_id,
        storyboard_id,
        script_id,
        idea_id: script?.content_idea_id || null,
        title: videoTitle,
        aspect_ratio: "9:16",
        resolution,
        render_status: "pending",
        render_progress: 0,
        status: "draft",
      })
      .select()
      .single();

    if (insertErr || !videoRecord) {
      throw new Error(`Failed to initialize video record: ${insertErr?.message}`);
    }

    // 3. Dispatch rendering pipeline (runs synchronously to update progress, backgrounded for long jobs)
    const renderPromise = dispatchVideoRender({
      supabase,
      userId: user.id,
      videoId: videoRecord.id,
      storyboardId: storyboard_id,
      scriptId: script_id,
      pageId: page_id,
      subtitlePreset: subtitle_preset,
      voiceId: voice_id,
      includeWatermark: include_watermark,
    });

    // Wait initial 2 seconds to capture immediate startup errors or quick renders
    const quickResult = await Promise.race([
      renderPromise,
      new Promise((resolve) => setTimeout(() => resolve("backgrounded"), 2500)),
    ]);

    return NextResponse.json({
      success: true,
      job_id: videoRecord.id,
      video: videoRecord,
      initial_status: quickResult === "backgrounded" ? "queued" : (quickResult as any)?.status,
    });
  } catch (err: any) {
    console.error("[POST /api/video/render] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to dispatch render job." },
      { status: 500 }
    );
  }
}
