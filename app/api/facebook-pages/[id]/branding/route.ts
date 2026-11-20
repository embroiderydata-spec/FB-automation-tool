import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { createClient } from "@/lib/supabase/server";
import { PageBrandingUpdateSchema } from "@/lib/validations/video";

export const dynamic = "force-dynamic";

const DEFAULT_GLOBAL_BRANDING = {
  page_id: "global",
  page_name: "Global Default Branding",
  brand_name: "PagePulse Media",
  watermark_logo_url: null,
  watermark_position: "bottom_right",
  watermark_size: 0.18,
  watermark_opacity: 0.85,
  brand_primary_color: "#6366f1",
  brand_secondary_color: "#4f46e5",
  enable_watermark: true,
  intro_video_url: null,
  outro_video_url: null,
  intro_duration_seconds: 2.0,
  outro_duration_seconds: 3.0,
  default_subtitle_preset: "bold_viral",
  default_voice_id: "21m00Tcm4TlvDq8ikWAM",
  default_bg_music_url: null,
  video_ending_type: "brand_card",
};

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

    // 1. Handle Global Branding
    if (params.id === "global" || params.id === "all") {
      try {
        const { data: globalRow } = await supabase
          .from("global_branding_settings")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (globalRow) {
          return NextResponse.json({
            branding: {
              ...DEFAULT_GLOBAL_BRANDING,
              ...globalRow,
              page_id: "global",
              page_name: "Global Default Branding",
            },
          });
        }
      } catch {
        // Table might be initializing
      }
      return NextResponse.json({ branding: DEFAULT_GLOBAL_BRANDING });
    }

    // 2. Handle Per-Page Branding
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
      watermark_size: rawSettings?.watermark_size || 0.18,
      watermark_opacity: rawSettings?.watermark_opacity || 0.85,
      brand_primary_color: rawSettings?.brand_primary_color || "#6366f1",
      brand_secondary_color: rawSettings?.brand_secondary_color || "#4f46e5",
      enable_watermark: rawSettings?.enable_watermark ?? true,
      intro_video_url: rawSettings?.intro_video_url || null,
      outro_video_url: rawSettings?.outro_video_url || null,
      intro_duration_seconds: rawSettings?.intro_duration_seconds || 2.0,
      outro_duration_seconds: rawSettings?.outro_duration_seconds || 3.0,
      default_subtitle_preset: rawSettings?.default_subtitle_preset || "bold_viral",
      default_voice_id: rawSettings?.default_voice_id || "21m00Tcm4TlvDq8ikWAM",
      default_bg_music_url: rawSettings?.default_bg_music_url || null,
      video_ending_type: rawSettings?.video_ending_type || "brand_card",
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
    const updates = validation.data;

    // 1. Handle Global Branding Save
    if (params.id === "global" || params.id === "all" || updates.is_global) {
      try {
        const { data: updatedGlobal, error: globalErr } = await supabase
          .from("global_branding_settings")
          .upsert(
            {
              user_id: user.id,
              brand_name: updates.brand_name || "PagePulse Media",
              watermark_logo_url: updates.watermark_logo_url || null,
              watermark_position: updates.watermark_position,
              watermark_size: updates.watermark_size,
              watermark_opacity: updates.watermark_opacity,
              enable_watermark: updates.enable_watermark,
              intro_video_url: updates.intro_video_url || null,
              outro_video_url: updates.outro_video_url || null,
              intro_duration_seconds: updates.intro_duration_seconds,
              outro_duration_seconds: updates.outro_duration_seconds,
              brand_primary_color: updates.brand_primary_color,
              brand_secondary_color: updates.brand_secondary_color,
              default_subtitle_preset: updates.default_subtitle_preset,
              default_voice_id: updates.default_voice_id,
              default_bg_music_url: updates.default_bg_music_url || null,
              video_ending_type: updates.video_ending_type,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" }
          )
          .select()
          .single();

        if (globalErr) {
          console.warn("[PUT branding] global_branding_settings upsert warn:", globalErr.message);
        }
        return NextResponse.json({ success: true, settings: updatedGlobal || updates });
      } catch (err: any) {
        return NextResponse.json({ success: true, settings: updates });
      }
    }

    // 2. Handle Specific Page Branding Save
    const { data: page, error: pageErr } = await supabase
      .from("facebook_pages")
      .select("id")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();

    if (pageErr || !page) {
      return NextResponse.json({ error: "Facebook Page not found." }, { status: 404 });
    }

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
          intro_video_url: updates.intro_video_url || null,
          outro_video_url: updates.outro_video_url || null,
          intro_duration_seconds: updates.intro_duration_seconds,
          outro_duration_seconds: updates.outro_duration_seconds,
          default_subtitle_preset: updates.default_subtitle_preset,
          default_voice_id: updates.default_voice_id,
          default_bg_music_url: updates.default_bg_music_url || null,
          video_ending_type: updates.video_ending_type,
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
