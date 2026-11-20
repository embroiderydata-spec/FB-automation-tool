import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { createClient } from "@/lib/supabase/server";
import { RegenerateSceneSchema } from "@/lib/validations/workflow";
import { getVideoProvider } from "@/lib/video/providers";

export const dynamic = "force-dynamic";

/**
 * POST /api/workflows/[id]/scenes/[sceneId]/regenerate
 * Regenerates a single scene's media asset without resetting or discarding other scenes.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; sceneId: string } }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { id: workflowId, sceneId } = params;
    const body = await request.json();
    const parsed = RegenerateSceneSchema.safeParse({ ...body, scene_id: sceneId });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed.", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { prompt, image_reference_url } = parsed.data;
    const supabase = await createClient();

    // Verify workflow ownership
    const { data: workflow, error: wfErr } = await supabase
      .from("automation_workflows")
      .select("id, configuration, storyboard_id, current_stage")
      .eq("id", workflowId)
      .eq("user_id", user.id)
      .single();

    if (wfErr || !workflow) {
      return NextResponse.json({ error: "Workflow not found." }, { status: 404 });
    }

    // Update prompt on storyboard scene
    await supabase
      .from("storyboard_scenes")
      .update({ ai_prompt: prompt })
      .eq("id", sceneId);

    // Call video provider for single scene regeneration
    const provider = getVideoProvider(workflow.configuration?.video_provider);
    const result = await provider.generateVideo({
      prompt,
      aspectRatio: "9:16",
      durationSeconds: 4,
      imageReferenceUrl: image_reference_url || undefined,
    });

    // Upsert video_scenes asset
    const { data: updatedScene, error: sceneErr } = await supabase
      .from("video_scenes")
      .upsert({
        storyboard_scene_id: sceneId,
        user_id: user.id,
        generation_provider: workflow.configuration?.video_provider || "replicate",
        generation_status: "completed",
        generated_video_path: result.videoUrl || `simulated://videos/scene_regen_${sceneId.slice(0, 6)}.mp4`,
      })
      .select()
      .single();

    // If workflow was already composed or in QC, set it to re-render with the new clip
    if (
      workflow.current_stage === "QUALITY_CONTROL" ||
      workflow.current_stage === "FINAL_VIDEO_APPROVAL"
    ) {
      await supabase
        .from("automation_workflows")
        .update({
          current_stage: "VIDEO_COMPOSITION",
          status: "queued",
          progress: 80,
          quality_report: null,
        })
        .eq("id", workflowId);
    }

    // Log the single scene replacement
    await supabase.from("workflow_logs").insert({
      workflow_id: workflowId,
      stage: "SCENE_GENERATION",
      action: "scene_regenerated",
      status: "completed",
      details: { scene_id: sceneId, new_prompt: prompt },
    });

    return NextResponse.json({
      message: "Scene regenerated successfully. Ready for composition re-render.",
      scene: updatedScene,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to regenerate scene." },
      { status: 500 }
    );
  }
}
