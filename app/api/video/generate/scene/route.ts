import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { createClient } from "@/lib/supabase/server";
import { VideoSceneGenerateSchema } from "@/lib/validations/video";
import { getVideoProvider } from "@/lib/video/providers";
import { VIDEO_PROVIDER_UNCONFIGURED_MESSAGE } from "@/lib/video/config";

export const dynamic = "force-dynamic";

/**
 * POST /api/video/generate/scene
 * Generates an individual scene video clip via Replicate or Runway.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const validation = VideoSceneGenerateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed.", details: validation.error.format() },
        { status: 400 }
      );
    }

    const {
      scene_id,
      prompt,
      negative_prompt,
      duration_seconds,
      aspect_ratio,
      image_reference_url,
      provider: requestedProvider,
      motion_strength,
    } = validation.data;

    const provider = getVideoProvider(requestedProvider);

    if (!provider.isConfigured()) {
      return NextResponse.json(
        { error: VIDEO_PROVIDER_UNCONFIGURED_MESSAGE },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Trigger video generation on the selected provider
    const jobResult = await provider.generateVideo({
      prompt,
      negativePrompt: negative_prompt,
      durationSeconds: duration_seconds,
      aspectRatio: aspect_ratio,
      imageReferenceUrl: image_reference_url || undefined,
      motionStrength: motion_strength,
    });

    // Update scene row if scene_id is supplied
    if (scene_id) {
      try {
        await supabase
          .from("storyboard_scenes")
          .update({
            video_prompt: prompt,
            metadata: {
              video_job_id: jobResult.jobId,
              provider: provider.name,
              video_url: jobResult.videoUrl || null,
            },
          })
          .eq("id", scene_id);
      } catch (err) {
        console.warn("[POST /api/video/generate/scene] Could not update storyboard scene:", err);
      }
    }

    return NextResponse.json({
      success: true,
      job: jobResult,
      provider: provider.name,
    });
  } catch (err: any) {
    console.error("[POST /api/video/generate/scene] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to generate video scene." },
      { status: 500 }
    );
  }
}
