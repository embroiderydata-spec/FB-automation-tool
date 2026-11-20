import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { createClient } from "@/lib/supabase/server";
import { decryptToken } from "@/lib/crypto/encryption";
import { getManagedPages } from "@/lib/meta/graph";

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const requestedAccountId = searchParams.get("account_id");

  const supabase = await createClient();

  // Query account owned by current user
  let accountQuery = supabase
    .from("facebook_accounts")
    .select("id, name, display_name, fb_user_id, facebook_user_id, access_token, encrypted_access_token, connection_status, status")
    .eq("user_id", user.id);

  if (requestedAccountId) {
    accountQuery = accountQuery.eq("id", requestedAccountId);
  } else {
    accountQuery = accountQuery.order("created_at", { ascending: false }).limit(1);
  }

  const { data: account, error: accountErr } = await accountQuery.maybeSingle();

  if (accountErr || !account) {
    return NextResponse.json(
      { error: "No connected Facebook account found. Please connect your Facebook account first." },
      { status: 404 }
    );
  }

  const encryptedToken = account.encrypted_access_token || account.access_token;
  if (!encryptedToken) {
    return NextResponse.json(
      { error: "Account access token is missing or disconnected. Please reauthorize." },
      { status: 400 }
    );
  }

  try {
    // Decrypt token server-side only
    const userAccessToken = decryptToken(encryptedToken);

    // Call Meta Graph API with pagination
    const discoveredPages = await getManagedPages(userAccessToken);

    // Query existing imported pages for this user to identify already imported ones
    const { data: existingPages } = await supabase
      .from("facebook_pages")
      .select("fb_page_id, facebook_page_id, connection_status, status")
      .eq("user_id", user.id);

    const importedIds = new Set(
      (existingPages || []).map((p) => p.facebook_page_id || p.fb_page_id)
    );

    // Sanitize results: NEVER expose accessToken to the client browser
    const sanitizedPages = discoveredPages.map((page) => ({
      id: page.id,
      name: page.name,
      category: page.category || "General",
      pictureUrl: page.pictureUrl || null,
      tasks: page.tasks || [],
      alreadyImported: importedIds.has(page.id),
    }));

    return NextResponse.json({
      success: true,
      account: {
        id: account.id,
        name: account.display_name || account.name,
        facebook_user_id: account.facebook_user_id || account.fb_user_id,
      },
      pages: sanitizedPages,
      totalDiscovered: sanitizedPages.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: "Failed to discover Facebook Pages.",
        message: err?.message || "An unexpected error occurred during page discovery.",
      },
      { status: 500 }
    );
  }
}
