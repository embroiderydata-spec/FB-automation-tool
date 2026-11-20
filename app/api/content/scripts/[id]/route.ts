import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { createClient } from "@/lib/supabase/server";
import { ScriptUpdateSchema } from "@/lib/validations/content";

export const dynamic = "force-dynamic";

/**
 * GET /api/content/scripts/[id]
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
    const { data: script, error } = await supabase
      .from("content_scripts")
      .select("*, facebook_pages(id, page_name, name, category), content_ideas(*)")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();

    if (error || !script) {
      return NextResponse.json({ error: "Script not found." }, { status: 404 });
    }

    return NextResponse.json({ script });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * PATCH /api/content/scripts/[id]
 * Updates script content or workflow status (draft -> in_review -> approved / rejected).
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
    const validation = ScriptUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed.", details: validation.error.format() },
        { status: 400 }
      );
    }

    const updates = validation.data;
    const supabase = await createClient();

    // 1. Fetch current script to get linked content_idea_id
    const { data: existingScript } = await supabase
      .from("content_scripts")
      .select("id, content_idea_id, version")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();

    if (!existingScript) {
      return NextResponse.json({ error: "Script not found." }, { status: 404 });
    }

    // 2. Perform update
    const updatePayload: Record<string, any> = { ...updates };
    if (updates.narration) {
      updatePayload.word_count = updates.narration.split(/\s+/).length;
      updatePayload.version = (existingScript.version || 1) + 1;
    }

    const { data: updatedScript, error: updateErr } = await supabase
      .from("content_scripts")
      .update(updatePayload)
      .eq("id", params.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 });
    }

    // 3. Sync lifecycle status to linked content_ideas
    if (updates.status && existingScript.content_idea_id) {
      let ideaStatus = "draft";
      if (updates.status === "approved") {
        ideaStatus = "script_approved";
      } else if (updates.status === "rejected") {
        ideaStatus = "rejected";
      } else if (updates.status === "in_review") {
        ideaStatus = "script_in_review";
      }

      await supabase
        .from("content_ideas")
        .update({ content_status: ideaStatus })
        .eq("id", existingScript.content_idea_id);
    }

    return NextResponse.json({ success: true, script: updatedScript });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/content/scripts/[id]
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
      .from("content_scripts")
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
