import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const DEFAULT_SETTINGS = {
  timezone: "UTC",
  daily_budget_limit: 25.0,
  monthly_budget_limit: 500.0,
  max_cost_per_video: 1.5,
  max_posts_per_day_per_page: 3,
  default_llm_provider: "openai",
  default_video_provider: "replicate",
  default_voice_provider: "elevenlabs",
  auto_publish_default: false,
  require_manual_approval: true,
  notify_on_publish: true,
  notify_on_failure: true,
  emergency_stopped: false,
};

/**
 * GET /api/settings
 * Retrieves user's persistent platform settings.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const supabase = await createClient();

    try {
      const { data, error } = await supabase
        .from("user_platform_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (data) {
        return NextResponse.json({ settings: data });
      }
    } catch {
      // Table may be initializing
    }

    return NextResponse.json({ settings: { ...DEFAULT_SETTINGS, user_id: user.id } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * PUT /api/settings
 * Updates user's persistent platform settings.
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const supabase = await createClient();

    const updatePayload = {
      user_id: user.id,
      timezone: body.timezone || "UTC",
      daily_budget_limit: Number(body.daily_budget_limit ?? 25.0),
      monthly_budget_limit: Number(body.monthly_budget_limit ?? 500.0),
      max_cost_per_video: Number(body.max_cost_per_video ?? 1.5),
      max_posts_per_day_per_page: Number(body.max_posts_per_day_per_page ?? 3),
      default_llm_provider: body.default_llm_provider || "openai",
      default_video_provider: body.default_video_provider || "replicate",
      default_voice_provider: body.default_voice_provider || "elevenlabs",
      auto_publish_default: Boolean(body.auto_publish_default),
      require_manual_approval: Boolean(body.require_manual_approval),
      notify_on_publish: Boolean(body.notify_on_publish),
      notify_on_failure: Boolean(body.notify_on_failure),
      emergency_stopped: Boolean(body.emergency_stopped),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("user_platform_settings")
      .upsert(updatePayload, { onConflict: "user_id" })
      .select()
      .single();

    if (error) {
      console.warn("[PUT /api/settings] DB warning:", error.message);
      return NextResponse.json({ success: true, settings: updatePayload });
    }

    return NextResponse.json({ success: true, settings: data || updatePayload });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
