import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/content/ideas/[id]
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
    const { data: idea, error } = await supabase
      .from("content_ideas")
      .select("*, facebook_pages(id, page_name, name, category)")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();

    if (error || !idea) {
      return NextResponse.json({ error: "Content idea not found." }, { status: 404 });
    }

    return NextResponse.json({ idea });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * PATCH /api/content/ideas/[id]
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
    const supabase = await createClient();

    const allowedUpdates: Record<string, any> = {};
    if (body.title !== undefined) allowedUpdates.title = body.title;
    if (body.description !== undefined) allowedUpdates.description = body.description;
    if (body.hook !== undefined) allowedUpdates.hook = body.hook;
    if (body.status !== undefined) {
      allowedUpdates.status = body.status;
      allowedUpdates.content_status = body.status;
    }
    if (body.content_status !== undefined) {
      allowedUpdates.content_status = body.content_status;
      allowedUpdates.status = body.content_status;
    }
    if (body.viral_potential !== undefined) allowedUpdates.viral_potential = body.viral_potential;
    if (body.originality_notes !== undefined) allowedUpdates.originality_notes = body.originality_notes;

    const { data, error } = await supabase
      .from("content_ideas")
      .update(allowedUpdates)
      .eq("id", params.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, idea: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/content/ideas/[id]
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
      .from("content_ideas")
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
