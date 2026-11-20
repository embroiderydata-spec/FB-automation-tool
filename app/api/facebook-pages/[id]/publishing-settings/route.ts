import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { createClient } from "@/lib/supabase/server";
import { PagePublishingSettingsSchema } from "@/lib/validations/publishing";

export const dynamic = "force-dynamic";

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

    const { data: page } = await supabase
      .from("facebook_pages")
      .select("id, page_name")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();

    if (!page) {
      return NextResponse.json({ error: "Page not found." }, { status: 404 });
    }

    const { data: settings } = await supabase
      .from("page_settings")
      .select(
        `
        enable_auto_publishing,
        posts_per_day,
        min_interval_hours,
        preferred_posting_times,
        posting_days,
        timezone,
        max_scheduled_posts,
        require_approval,
        require_manual_approval,
        default_caption_template,
        default_hashtags,
        publishing_mode,
        is_queue_paused
      `
      )
      .eq("facebook_page_id", params.id)
      .single();

    return NextResponse.json({
      settings: settings || {
        enable_auto_publishing: false,
        posts_per_day: 1,
        min_interval_hours: 4,
        preferred_posting_times: ["10:00:00", "16:00:00", "20:00:00"],
        posting_days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        timezone: "UTC",
        max_scheduled_posts: 30,
        require_manual_approval: true,
        publishing_mode: "test",
        is_queue_paused: false,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

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
    const validation = PagePublishingSettingsSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Validation failed", details: validation.error.flatten() }, { status: 400 });
    }

    const supabase = await createClient();

    const updatePayload: Record<string, any> = {
      ...validation.data,
      updated_at: new Date().toISOString(),
    };

    if (validation.data.require_manual_approval !== undefined) {
      updatePayload.require_approval = validation.data.require_manual_approval;
    }

    const { data: updated, error } = await supabase
      .from("page_settings")
      .update(updatePayload)
      .eq("facebook_page_id", params.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, settings: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
