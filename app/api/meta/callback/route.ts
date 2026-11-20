import { NextRequest, NextResponse } from "next/server";
import {
  validateOAuthState,
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  getFacebookUserInfo,
} from "@/lib/meta/oauth";
import { encryptToken } from "@/lib/crypto/encryption";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { createClient } from "@/lib/supabase/server";
import { META_CONFIG } from "@/lib/meta/config";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");
  const errorParam = searchParams.get("error");
  const errorReason = searchParams.get("error_reason");
  const errorDescription = searchParams.get("error_description");

  const stateCookie = request.cookies.get("meta_oauth_state")?.value || null;

  const redirectBase = new URL("/dashboard/pages", request.url);

  // 1. Handle user cancellation or denial
  if (errorParam || errorReason) {
    redirectBase.searchParams.set("error", "meta_auth_denied");
    redirectBase.searchParams.set("details", errorDescription || "User denied application permissions.");
    return NextResponse.redirect(redirectBase);
  }

  // 2. Validate state to prevent CSRF attacks
  if (!validateOAuthState(stateParam, stateCookie)) {
    redirectBase.searchParams.set("error", "invalid_oauth_state");
    return NextResponse.redirect(redirectBase);
  }

  // 3. Ensure authorization code was provided
  if (!code) {
    redirectBase.searchParams.set("error", "missing_authorization_code");
    return NextResponse.redirect(redirectBase);
  }

  // 4. Verify user session
  const user = await getAuthenticatedUser();
  if (!user) {
    const loginRedirect = new URL("/login", request.url);
    loginRedirect.searchParams.set("error", "session_expired");
    return NextResponse.redirect(loginRedirect);
  }

  try {
    // 5. Exchange code for short-lived token, then upgrade to long-lived (60 days)
    const shortLived = await exchangeCodeForToken(code);
    const longLived = await exchangeForLongLivedToken(shortLived.access_token);

    const tokenToSave = longLived.access_token || shortLived.access_token;
    const encryptedToken = encryptToken(tokenToSave);

    // 6. Fetch user profile from Meta Graph API
    const fbProfile = await getFacebookUserInfo(tokenToSave);

    const expiresAt = longLived.expires_in
      ? new Date(Date.now() + longLived.expires_in * 1000).toISOString()
      : null;

    // 7. Upsert into Supabase facebook_accounts table
    const supabase = await createClient();

    // Check if account already exists for this user and facebook_user_id
    const { data: existingAccount } = await supabase
      .from("facebook_accounts")
      .select("id")
      .eq("user_id", user.id)
      .eq("fb_user_id", fbProfile.id)
      .maybeSingle();

    let accountId = existingAccount?.id;

    if (existingAccount) {
      const { data: updated, error: updateError } = await supabase
        .from("facebook_accounts")
        .update({
          name: fbProfile.name,
          display_name: fbProfile.name,
          email: fbProfile.email || null,
          access_token: encryptedToken,
          encrypted_access_token: encryptedToken,
          token_expires_at: expiresAt,
          granted_permissions: META_CONFIG.scopes,
          status: "active",
          connection_status: "connected",
          last_verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingAccount.id)
        .select("id")
        .single();

      if (updateError) {
        throw new Error(`Failed to update Facebook account record: ${updateError.message}`);
      }
      accountId = updated?.id || existingAccount.id;
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from("facebook_accounts")
        .insert({
          user_id: user.id,
          fb_user_id: fbProfile.id,
          facebook_user_id: fbProfile.id,
          name: fbProfile.name,
          display_name: fbProfile.name,
          email: fbProfile.email || null,
          access_token: encryptedToken,
          encrypted_access_token: encryptedToken,
          token_expires_at: expiresAt,
          granted_permissions: META_CONFIG.scopes,
          status: "active",
          connection_status: "connected",
          connected_at: new Date().toISOString(),
          last_verified_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (insertError) {
        throw new Error(`Failed to save Facebook account record: ${insertError.message}`);
      }
      accountId = inserted?.id;
    }

    // 8. Redirect back to Pages Dashboard with success and account_id to trigger Page selection
    redirectBase.searchParams.set("oauth", "success");
    if (accountId) {
      redirectBase.searchParams.set("account_id", accountId);
    }

    const response = NextResponse.redirect(redirectBase);
    // Clear state cookie
    response.cookies.delete("meta_oauth_state");

    return response;
  } catch (err: any) {
    redirectBase.searchParams.set("error", "oauth_callback_failed");
    redirectBase.searchParams.set("message", err?.message || "Unknown OAuth error");
    const response = NextResponse.redirect(redirectBase);
    response.cookies.delete("meta_oauth_state");
    return response;
  }
}
