import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/content/storyboards/[id]
 * Retrieves a single storyboard with all its ordered scenes.
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

    const { data: storyboard, error } = await supabase
      .from("content_storyboards")
      .select("*, content_scripts(*), facebook_pages(id, page_name, name)")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();

    if (error || !storyboard) {
      return NextResponse.json({ error: "Storyboard not found." }, { status: 404 });
    }

    // Fetch ordered scenes
    const { data: scenes } = await supabase
      .from("storyboard_scenes")
      .select("*")
      .eq("storyboard_id", params.id)
      .order("scene_number", { ascending: true });

    return NextResponse.json({
      storyboard,
      scenes: scenes || [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * PATCH /api/content/storyboards/[id]
 * Updates status (draft -> in_review -> approved -> ready_for_video / rejected).
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
    const { status, rejection_reason } = body;

    const validStatuses = ["draft", "in_review", "approved", "rejected", "ready_for_video"];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status value." }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: existingSb } = await supabase
      .from("content_storyboards")
      .select("id, content_idea_id, content_script_id")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();

    if (!existingSb) {
      return NextResponse.json({ error: "Storyboard not found." }, { status: 404 });
    }

    const updatePayload: Record<string, any> = {};
    if (status) {
      updatePayload.status = status === "ready_for_video" ? "approved" : status;
    }
    if (rejection_reason) {
      updatePayload.metadata = { rejection_reason };
    }

    const { data: updatedSb, error: sbErr } = await supabase
      .from("content_storyboards")
      .update(updatePayload)
      .eq("id", params.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (sbErr) {
      return NextResponse.json({ error: sbErr.message }, { status: 400 });
    }

    // Sync status to content_ideas
    if (status && existingSb.content_idea_id) {
      let ideaStatus = "draft";
      if (status === "approved") {
        ideaStatus = "storyboard_approved";
      } else if (status === "ready_for_video") {
        ideaStatus = "ready_for_video";
      } else if (status === "rejected") {
        ideaStatus = "rejected";
      }

      await supabase
        .from("content_ideas")
        .update({ content_status: ideaStatus })
        .eq("id", existingSb.content_idea_id);
    }

    return NextResponse.json({ success: true, storyboard: updatedSb });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/content/storyboards/[id]
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
      .from("content_storyboards")
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
