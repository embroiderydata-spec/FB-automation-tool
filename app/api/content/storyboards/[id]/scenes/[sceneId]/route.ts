import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { createClient } from "@/lib/supabase/server";
import { StoryboardSceneUpdateSchema } from "@/lib/validations/content";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/content/storyboards/[id]/scenes/[sceneId]
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; sceneId: string } }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const validation = StoryboardSceneUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed.", details: validation.error.format() },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: updatedScene, error } = await supabase
      .from("storyboard_scenes")
      .update(validation.data)
      .eq("id", params.sceneId)
      .eq("storyboard_id", params.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, scene: updatedScene });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/content/storyboards/[id]/scenes/[sceneId]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; sceneId: string } }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from("storyboard_scenes")
      .delete()
      .eq("id", params.sceneId)
      .eq("storyboard_id", params.id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Renumber remaining scenes
    const { data: remaining } = await supabase
      .from("storyboard_scenes")
      .select("id")
      .eq("storyboard_id", params.id)
      .order("scene_number", { ascending: true });

    if (remaining) {
      for (let i = 0; i < remaining.length; i++) {
        await supabase
          .from("storyboard_scenes")
          .update({ scene_number: i + 1 })
          .eq("id", remaining[i].id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
