import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { createClient } from "@/lib/supabase/server";
import { PageNicheSettingsSchema } from "@/lib/validations/content";

export const dynamic = "force-dynamic";

/**
 * GET /api/facebook-pages/[id]/niche
 * Fetches the Page's niche configuration.
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

    // Verify Page ownership
    const { data: page, error: pageErr } = await supabase
      .from("facebook_pages")
      .select("id, page_name, name, category, page_settings(*)")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();

    if (pageErr || !page) {
      return NextResponse.json({ error: "Facebook Page not found." }, { status: 404 });
    }

    const rawSettings = Array.isArray(page.page_settings)
      ? page.page_settings[0]
      : page.page_settings;

    return NextResponse.json({
      page_id: page.id,
      page_name: page.page_name || page.name,
      category: page.category,
      settings: rawSettings || {
        niche: page.category || "General",
        sub_niche: "",
        target_audience: "Facebook Reels Viewers",
        target_country: "US",
        language: "en",
        ai_tone: "engaging",
        content_style: "high-retention viral story",
        page_description: "",
        topics_to_cover: [],
        topics_to_avoid: [],
        preferred_content_format: "reels",
        originality_guidelines: "100% unique angles, high retention hook in first 3 seconds.",
        video_duration_min: 30,
        video_duration_max: 60,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * PUT /api/facebook-pages/[id]/niche
 * Updates the Page's niche profile in page_settings.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const validation = PageNicheSettingsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed.", details: validation.error.format() },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Verify Page ownership
    const { data: page, error: pageErr } = await supabase
      .from("facebook_pages")
      .select("id")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();

    if (pageErr || !page) {
      return NextResponse.json({ error: "Facebook Page not found." }, { status: 404 });
    }

    const updates = validation.data;

    // Upsert into page_settings
    const { data: updated, error: upsertErr } = await supabase
      .from("page_settings")
      .upsert(
        {
          facebook_page_id: params.id,
          page_id: params.id,
          user_id: user.id,
          ...updates,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "page_id" }
      )
      .select()
      .single();

    if (upsertErr) {
      return NextResponse.json({ error: upsertErr.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, settings: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
