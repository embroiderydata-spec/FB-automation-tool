import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { createClient } from "@/lib/supabase/server";
import { PageSettingsUpdateSchema } from "@/lib/validations/facebook";

interface RouteParams {
  params: {
    id: string;
  };
}

// 1. GET /api/facebook-pages/[id]
export async function GET(request: NextRequest, { params }: RouteParams) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
  }

  const { id } = params;
  const supabase = await createClient();

  const { data: page, error } = await supabase
    .from("facebook_pages")
    .select(`
      id,
      facebook_page_id,
      fb_page_id,
      name,
      page_name,
      category,
      picture_url,
      profile_picture_url,
      assigned_tasks,
      followers_count,
      connection_status,
      status,
      automation_enabled,
      last_synced_at,
      created_at,
      page_settings (*)
    `)
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !page) {
    return NextResponse.json({ error: "Facebook Page not found or access denied." }, { status: 404 });
  }

  const settings = Array.isArray(page.page_settings) ? page.page_settings[0] : page.page_settings;

  return NextResponse.json({
    success: true,
    page: {
      id: page.id,
      page_id: page.facebook_page_id || page.fb_page_id,
      page_name: page.page_name || page.name,
      category: page.category,
      profile_picture_url: page.profile_picture_url || page.picture_url,
      assigned_tasks: page.assigned_tasks || [],
      followers_count: page.followers_count || 0,
      connection_status: page.connection_status || page.status,
      automation_enabled: Boolean(page.automation_enabled),
      last_synced_at: page.last_synced_at,
      settings: settings || null,
    },
  });
}

// 2. PATCH /api/facebook-pages/[id] - Update Settings
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
  }

  const { id } = params;
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parseResult = PageSettingsUpdateSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Validation error.", details: parseResult.error.format() },
      { status: 400 }
    );
  }

  const updates = parseResult.data;
  const supabase = await createClient();

  // Verify page ownership
  const { data: page, error: pageErr } = await supabase
    .from("facebook_pages")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (pageErr || !page) {
    return NextResponse.json({ error: "Page not found or unauthorized." }, { status: 404 });
  }

  // Update or insert page_settings
  const { data: existingSettings } = await supabase
    .from("page_settings")
    .select("id")
    .eq("page_id", id)
    .maybeSingle();

  const settingsPayload = {
    ...updates,
    facebook_page_id: id,
    page_id: id,
    user_id: user.id,
    updated_at: new Date().toISOString(),
  };

  if (existingSettings) {
    const { data: updated, error: updateErr } = await supabase
      .from("page_settings")
      .update(settingsPayload)
      .eq("id", existingSettings.id)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: "Failed to update settings.", details: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, settings: updated });
  } else {
    const { data: inserted, error: insertErr } = await supabase
      .from("page_settings")
      .insert(settingsPayload)
      .select()
      .single();

    if (insertErr) {
      return NextResponse.json({ error: "Failed to save settings.", details: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, settings: inserted });
  }
}

// 3. DELETE /api/facebook-pages/[id] - Disconnect Individual Page
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
  }

  const { id } = params;
  const supabase = await createClient();

  // 1. Verify ownership
  const { data: page, error: pageErr } = await supabase
    .from("facebook_pages")
    .select("id, name, page_name")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (pageErr || !page) {
    return NextResponse.json({ error: "Page not found or unauthorized." }, { status: 404 });
  }

  // 2. Mark as disconnected, disable automation, clear page access token, preserve historical records
  const { error: disconnectErr } = await supabase
    .from("facebook_pages")
    .update({
      connection_status: "disconnected",
      status: "disconnected",
      automation_enabled: false,
      page_access_token: "",
      encrypted_page_access_token: "",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (disconnectErr) {
    return NextResponse.json({ error: "Failed to disconnect Page.", details: disconnectErr.message }, { status: 500 });
  }

  // 3. Disable automation in page_settings
  await supabase
    .from("page_settings")
    .update({
      auto_publish: false,
      content_generation_enabled: false,
      updated_at: new Date().toISOString(),
    })
    .eq("page_id", id);

  // 4. Cancel any queued publishing jobs for this page
  await supabase
    .from("publishing_jobs")
    .update({
      status: "failed",
      last_error: "Job cancelled: Facebook Page was disconnected by administrator.",
      updated_at: new Date().toISOString(),
    })
    .eq("page_id", id)
    .eq("status", "queued");

  return NextResponse.json({
    success: true,
    message: `Page '${page.page_name || page.name}' has been disconnected safely. Automation disabled and queued jobs cancelled. Historical analytics preserved.`,
  });
}
