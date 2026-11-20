import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { createClient } from "@/lib/supabase/server";
import { DisconnectAccountSchema } from "@/lib/validations/facebook";
import { decryptToken } from "@/lib/crypto/encryption";
import { revokeAppPermissions } from "@/lib/meta/graph";

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parseResult = DisconnectAccountSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json({ error: "Validation failed.", details: parseResult.error.format() }, { status: 400 });
  }

  const { account_id } = parseResult.data;
  const supabase = await createClient();

  // 1. Verify account ownership
  const { data: account, error: accountErr } = await supabase
    .from("facebook_accounts")
    .select("id, name, display_name, facebook_user_id, fb_user_id, encrypted_access_token, access_token")
    .eq("id", account_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (accountErr || !account) {
    return NextResponse.json({ error: "Facebook account not found or access denied." }, { status: 404 });
  }

  const encryptedToken = account.encrypted_access_token || account.access_token;
  const fbUserId = account.facebook_user_id || account.fb_user_id;

  // 2. Attempt to revoke permissions via Meta Graph API if token is valid
  if (encryptedToken && fbUserId) {
    try {
      const decryptedToken = decryptToken(encryptedToken);
      await revokeAppPermissions(decryptedToken, fbUserId);
    } catch {
      // Continue disconnecting locally even if Meta API call fails
    }
  }

  // 3. Mark account disconnected and clear access token
  await supabase
    .from("facebook_accounts")
    .update({
      connection_status: "disconnected",
      status: "disconnected",
      access_token: "",
      encrypted_access_token: "",
      updated_at: new Date().toISOString(),
    })
    .eq("id", account_id);

  // 4. Mark all associated Facebook Pages as disconnected and disable automation
  const { data: associatedPages } = await supabase
    .from("facebook_pages")
    .select("id")
    .eq("user_id", user.id)
    .or(`account_id.eq.${account_id},facebook_account_id.eq.${account_id}`);

  const pageIds = (associatedPages || []).map((p) => p.id);

  if (pageIds.length > 0) {
    await supabase
      .from("facebook_pages")
      .update({
        connection_status: "disconnected",
        status: "disconnected",
        automation_enabled: false,
        page_access_token: "",
        encrypted_page_access_token: "",
        updated_at: new Date().toISOString(),
      })
      .in("id", pageIds);

    // Disable auto_publish in page_settings
    await supabase
      .from("page_settings")
      .update({
        auto_publish: false,
        content_generation_enabled: false,
        updated_at: new Date().toISOString(),
      })
      .in("page_id", pageIds);

    // Cancel pending jobs
    await supabase
      .from("publishing_jobs")
      .update({
        status: "failed",
        last_error: "Job cancelled: Parent Facebook account was disconnected.",
        updated_at: new Date().toISOString(),
      })
      .in("page_id", pageIds)
      .eq("status", "queued");
  }

  return NextResponse.json({
    success: true,
    message: `Account '${account.display_name || account.name}' disconnected. ${pageIds.length} associated Page(s) set to disconnected. Historical analytics and content records preserved.`,
  });
}
