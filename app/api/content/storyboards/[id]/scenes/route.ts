import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/content/storyboards/[id]/scenes
 * Adds a new scene to the storyboard.
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
    const supabase = await createClient();

    // Verify storyboard ownership
    const { data: sb } = await supabase
      .from("content_storyboards")
      .select("id")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();

    if (!sb) {
      return NextResponse.json({ error: "Storyboard not found." }, { status: 404 });
    }

    // Get current scene count
    const { count } = await supabase
      .from("storyboard_scenes")
      .select("*", { count: "exact", head: true })
      .eq("storyboard_id", params.id);

    const nextSceneNum = (count || 0) + 1;

    const newScene = {
      storyboard_id: params.id,
      user_id: user.id,
      scene_number: body.scene_number || nextSceneNum,
      start_time: body.start_time || 0,
      end_time: body.end_time || 3.5,
      duration: body.duration || 3.5,
      narration: body.narration || "",
      visual_description: body.visual_description || "New visual scene",
      video_prompt: body.video_prompt || body.visual_description || "9:16 cinematic video",
      camera_direction: body.camera_direction || "Medium shot",
      motion_description: body.motion_description || "Smooth tracking",
      transition: body.transition || "Cut",
      on_screen_text: body.on_screen_text || null,
      sound_effect: body.sound_effect || null,
      scene_type: body.scene_type || "main_content",
    };

    const { data: inserted, error } = await supabase
      .from("storyboard_scenes")
      .insert(newScene)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, scene: inserted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * PATCH /api/content/storyboards/[id]/scenes
 * Batch updates or reorders scenes in a storyboard.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const { scenes } = body;

    if (!Array.isArray(scenes)) {
      return NextResponse.json({ error: "Scenes array is required." }, { status: 400 });
    }

    const supabase = await createClient();

    for (const sc of scenes) {
      if (sc.id) {
        await supabase
          .from("storyboard_scenes")
          .update({
            scene_number: sc.scene_number,
            start_time: sc.start_time,
            end_time: sc.end_time,
            duration: sc.duration,
          })
          .eq("id", sc.id)
          .eq("storyboard_id", params.id)
          .eq("user_id", user.id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
