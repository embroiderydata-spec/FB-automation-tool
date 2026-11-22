import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { createClipRenderJob } from "@/lib/clipper/render-jobs";
import { executeRenderJob } from "@/lib/clipper/render-manager";
import { sanitizeErrorMessage } from "@/lib/clipper/render-storage";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const {
      source_local_path,
      source_video_url,
      source_video_name,
      clip_title,
      start_time,
      end_time,
      aspect_ratio = "9:16",
      reframing_mode = "blurred_backdrop",
      crop_position = "center",
      resolution = "1080p",
      subtitle_text,
      subtitle_style = "hormozi",
      hook_text,
      watermark_text,
      watermark_position = "top_right",
      watermark_opacity = 0.7,
      viral_score,
      virality_breakdown,
      category,
      caption,
    } = body;

    const source = source_local_path || source_video_url;
    if (!source) {
      return NextResponse.json(
        { error: "Source video path or URL is required." },
        { status: 400 }
      );
    }

    if (start_time === undefined || end_time === undefined) {
      return NextResponse.json(
        { error: "Start time and end time are required." },
        { status: 400 }
      );
    }

    const start = Number(start_time);
    const end = Number(end_time);
    if (end <= start) {
      return NextResponse.json(
        { error: "End time must be greater than start time." },
        { status: 400 }
      );
    }

    const clipDuration = Number((end - start).toFixed(2));

    // 1. Create a persistent render job record
    const job = await createClipRenderJob({
      user_id: user.id,
      source_video_url: source,
      source_video_name: source_video_name || "Source Video",
      clip_title: clip_title || "Processed 9:16 Reel",
      start_time: start,
      end_time: end,
      duration: clipDuration,
      aspect_ratio,
      reframing_mode,
      crop_position,
      resolution,
      subtitle_style,
      subtitle_text: subtitle_text || clip_title,
      hook_text,
      watermark_text,
      watermark_position,
      watermark_opacity: Number(watermark_opacity) || 0.7,
      metadata: {
        caption,
        viral_score,
        virality_breakdown,
        category,
      },
    });

    // 2. Execute rendering pipeline with safe temporary storage in os.tmpdir()
    const result = await executeRenderJob(job);

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || "Rendering failed.",
          job: result.job,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      job: result.job,
      clip: result.clipRecord,
    });
  } catch (err: any) {
    console.error("[ClipperRenderAPI] Unexpected error:", err);
    return NextResponse.json(
      { error: sanitizeErrorMessage(err?.message || "Failed to render video clip.") },
      { status: 500 }
    );
  }
}
