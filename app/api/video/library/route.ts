import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/video/library
 * Fetches media assets and videos with filtering by type, page, and search query.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "all";
    const pageId = searchParams.get("page_id");
    const search = searchParams.get("search");

    const supabase = await createClient();

    let query = supabase
      .from("media_assets")
      .select("*, facebook_pages(id, page_name, name)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (type !== "all" && type !== "failed") {
      query = query.eq("asset_type", type);
    }

    if (pageId && pageId !== "all") {
      query = query.eq("facebook_page_id", pageId);
    }

    if (search) {
      query = query.ilike("asset_name", `%${search}%`);
    }

    const { data: assets, error: assetsErr } = await query;

    if (assetsErr) {
      console.error("[GET /api/video/library] Error fetching assets:", assetsErr);
    }

    // Also fetch rendered videos from videos table
    let videosQuery = supabase
      .from("videos")
      .select("*, facebook_pages(id, page_name, name)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (pageId && pageId !== "all") {
      videosQuery = videosQuery.eq("facebook_page_id", pageId);
    }

    if (type === "failed") {
      videosQuery = videosQuery.eq("render_status", "failed");
    }

    const { data: videosList, error: videosErr } = await videosQuery;

    return NextResponse.json({
      assets: assets || [],
      videos: videosList || [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * PATCH /api/video/library
 * Renames an asset.
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const { asset_id, new_name, is_video } = body;

    if (!asset_id || !new_name) {
      return NextResponse.json({ error: "Asset ID and new name are required." }, { status: 400 });
    }

    const supabase = await createClient();

    if (is_video) {
      const { data, error } = await supabase
        .from("videos")
        .update({ title: new_name })
        .eq("id", asset_id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true, item: data });
    }

    const { data, error } = await supabase
      .from("media_assets")
      .update({ asset_name: new_name })
      .eq("id", asset_id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true, item: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/video/library
 * Deletes an asset.
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const assetId = searchParams.get("id");
    const isVideo = searchParams.get("is_video") === "true";

    if (!assetId) {
      return NextResponse.json({ error: "Asset ID is required." }, { status: 400 });
    }

    const supabase = await createClient();

    if (isVideo) {
      const { error } = await supabase
        .from("videos")
        .delete()
        .eq("id", assetId)
        .eq("user_id", user.id);

      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    const { error } = await supabase
      .from("media_assets")
      .delete()
      .eq("id", assetId)
      .eq("user_id", user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
