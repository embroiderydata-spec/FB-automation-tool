import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/workflows/[id]
 * Fetches comprehensive workflow details, including storyboards, scenes, scripts, logs, and quality report.
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

    const { id } = params;
    const supabase = await createClient();

    // 1. Fetch workflow
    const { data: workflow, error: wfErr } = await supabase
      .from("automation_workflows")
      .select(
        `
        *,
        content_idea:content_ideas(*),
        script:content_scripts(*),
        storyboard:content_storyboards(*),
        video:videos(*)
      `
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (wfErr || !workflow) {
      return NextResponse.json({ error: "Workflow not found." }, { status: 404 });
    }

    // 2. Fetch storyboard scenes if storyboard exists
    let scenes: any[] = [];
    if (workflow.storyboard_id) {
      const { data: sbScenes } = await supabase
        .from("storyboard_scenes")
        .select(
          `
          *,
          video_scene:video_scenes(*)
        `
        )
        .eq("storyboard_id", workflow.storyboard_id)
        .order("scene_number", { ascending: true });

      scenes = sbScenes || [];
    }

    // 3. Fetch workflow execution logs
    const { data: logs } = await supabase
      .from("workflow_logs")
      .select("*")
      .eq("workflow_id", id)
      .order("created_at", { ascending: false })
      .limit(30);

    // 4. Fetch target Facebook Pages
    const targetPageIds = workflow.configuration?.target_page_ids || [];
    let targetPages: any[] = [];
    if (targetPageIds.length > 0) {
      const { data: pages } = await supabase
        .from("facebook_pages")
        .select("id, page_name, facebook_page_id, profile_picture_url")
        .in("id", targetPageIds);
      targetPages = pages || [];
    }

    return NextResponse.json({
      workflow: {
        ...workflow,
        scenes,
        logs: logs || [],
        target_pages: targetPages,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to fetch workflow." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/workflows/[id]
 * Deletes a workflow.
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

    const { id } = params;
    const supabase = await createClient();

    const { error } = await supabase
      .from("automation_workflows")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Workflow deleted successfully." });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to delete workflow." },
      { status: 500 }
    );
  }
}
