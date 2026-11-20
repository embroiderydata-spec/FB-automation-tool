import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { createClient } from "@/lib/supabase/server";
import { executeAICompletion } from "@/lib/ai/client";
import { buildNicheContext, buildSingleSceneRegenPrompt } from "@/lib/ai/prompts";

export const dynamic = "force-dynamic";

/**
 * POST /api/content/storyboards/[id]/scenes/[sceneId]/regenerate
 * AI regenerates an individual scene's visual description, prompt, and camera directions.
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

    const body = await request.json().catch(() => ({}));
    const userFeedback = body.feedback || "";

    const supabase = await createClient();

    // 1. Fetch storyboard with script and page
    const { data: storyboard } = await supabase
      .from("content_storyboards")
      .select("*, content_scripts(*), facebook_pages(id, page_name, name, category, page_settings(*))")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();

    if (!storyboard) {
      return NextResponse.json({ error: "Storyboard not found." }, { status: 404 });
    }

    // 2. Fetch the target scene
    const { data: scene } = await supabase
      .from("storyboard_scenes")
      .select("*")
      .eq("id", params.sceneId)
      .eq("storyboard_id", params.id)
      .eq("user_id", user.id)
      .single();

    if (!scene) {
      return NextResponse.json({ error: "Scene not found." }, { status: 404 });
    }

    const page = storyboard.facebook_pages;
    const pageContext = buildNicheContext({
      page_name: page?.page_name || page?.name,
      niche: page?.category,
    });

    const { system, user: userPrompt } = buildSingleSceneRegenPrompt(
      pageContext,
      storyboard.content_scripts?.script_title || "Reel",
      scene.scene_number,
      {
        duration: scene.duration,
        narration: scene.narration,
        scene_type: scene.scene_type,
      },
      userFeedback
    );

    const completion = await executeAICompletion<{ scene: any }>({
      supabase,
      userId: user.id,
      pageId: storyboard.facebook_page_id || undefined,
      contentIdeaId: storyboard.content_idea_id || undefined,
      jobType: "video_render",
      systemPrompt: system,
      userPrompt,
      requestMetadata: {
        scene_id: params.sceneId,
        scene_number: scene.scene_number,
      },
    });

    const newSceneData = completion.data?.scene;
    if (!newSceneData) {
      throw new Error("Failed to receive regenerated scene details. Please retry.");
    }

    // 3. Update scene in database
    const updatePayload = {
      visual_description: newSceneData.visual_description || scene.visual_description,
      video_prompt: newSceneData.video_prompt || scene.video_prompt,
      camera_direction: newSceneData.camera_direction || scene.camera_direction,
      motion_description: newSceneData.motion_description || scene.motion_description,
      transition: newSceneData.transition || scene.transition,
      on_screen_text: newSceneData.on_screen_text !== undefined ? newSceneData.on_screen_text : scene.on_screen_text,
      sound_effect: newSceneData.sound_effect !== undefined ? newSceneData.sound_effect : scene.sound_effect,
    };

    const { data: updatedScene, error: updateErr } = await supabase
      .from("storyboard_scenes")
      .update(updatePayload)
      .eq("id", params.sceneId)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      scene: updatedScene,
      usage: completion.usage,
    });
  } catch (err: any) {
    console.error("[POST /api/content/storyboards/.../regenerate] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to regenerate scene." },
      { status: 500 }
    );
  }
}
