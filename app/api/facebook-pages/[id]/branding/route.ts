import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { createClient } from "@/lib/supabase/server";
import { PageBrandingUpdateSchema } from "@/lib/validations/video";

export const dynamic = "force-dynamic";

/**
 * GET /api/facebook-pages/[id]/branding
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

    const { data: page, error: pageErr } = await supabase
      .from("facebook_pages")
      .select("id, page_name, name, page_settings(*)")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();

    if (pageErr || !page) {
      return NextResponse.json({ error: "Facebook Page not found." }, { status: 404 });
    }

    const rawSettings = Array.isArray(page.page_settings)
      ? page.page_settings[0]
      : page.page_settings;

    const branding = {
      page_id: page.id,
      page_name: page.page_name || page.name,
      brand_name: rawSettings?.brand_name || page.page_name || page.name,
      watermark_logo_url: rawSettings?.watermark_logo_url || null,
      watermark_position: rawSettings?.watermark_position || "bottom_right",
      watermark_size: rawSettings?.watermark_size || 0.15,
      watermark_opacity: rawSettings?.watermark_opacity || 0.85,
      brand_primary_color: rawSettings?.brand_primary_color || "#3b82f6",
      brand_secondary_color: rawSettings?.brand_secondary_color || "#1d4ed8",
      enable_watermark: rawSettings?.enable_watermark ?? true,
    };

    return NextResponse.json({ branding });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * PUT /api/facebook-pages/[id]/branding
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
    const validation = PageBrandingUpdateSchema.safeParse(body);

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

    const { data: updated, error: upsertErr } = await supabase
      .from("page_settings")
      .upsert(
        {
          facebook_page_id: params.id,
          page_id: params.id,
          user_id: user.id,
          brand_name: updates.brand_name,
          watermark_logo_url: updates.watermark_logo_url || null,
          watermark_position: updates.watermark_position,
          watermark_size: updates.watermark_size,
          watermark_opacity: updates.watermark_opacity,
          brand_primary_color: updates.brand_primary_color,
          brand_secondary_color: updates.brand_secondary_color,
          enable_watermark: updates.enable_watermark,
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
