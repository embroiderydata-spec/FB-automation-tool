import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { createClient } from "@/lib/supabase/server";
import { AutomationToggleSchema } from "@/lib/validations/facebook";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

  const parseResult = AutomationToggleSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json({ error: "Invalid request payload.", details: parseResult.error.format() }, { status: 400 });
  }

  const { enabled } = parseResult.data;
  const supabase = await createClient();

  // Verify ownership
  const { data: page, error: pageErr } = await supabase
    .from("facebook_pages")
    .select("id, name, page_name, connection_status, status")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (pageErr || !page) {
    return NextResponse.json({ error: "Page not found or unauthorized." }, { status: 404 });
  }

  const status = page.connection_status || page.status;
  if (enabled && status !== "active") {
    return NextResponse.json(
      { error: "Cannot enable automation on a disconnected or error state Page. Reconnect the Page first." },
      { status: 400 }
    );
  }

  // Update page table
  const { error: updateErr } = await supabase
    .from("facebook_pages")
    .update({
      automation_enabled: enabled,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateErr) {
    return NextResponse.json({ error: "Failed to update page automation state.", details: updateErr.message }, { status: 500 });
  }

  // Update page_settings table
  await supabase
    .from("page_settings")
    .update({
      auto_publish: enabled,
      content_generation_enabled: enabled,
      updated_at: new Date().toISOString(),
    })
    .eq("page_id", id);

  return NextResponse.json({
    success: true,
    automation_enabled: enabled,
    message: enabled
      ? `Automation enabled for '${page.page_name || page.name}'.`
      : `Automation paused for '${page.page_name || page.name}'.`,
  });
}
