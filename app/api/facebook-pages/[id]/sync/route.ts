import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { createClient } from "@/lib/supabase/server";
import { decryptToken } from "@/lib/crypto/encryption";
import { getPageDetails } from "@/lib/meta/graph";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
  }

  const { id } = params;
  const supabase = await createClient();

  // Retrieve page and joined account
  const { data: page, error: pageErr } = await supabase
    .from("facebook_pages")
    .select(`
      id,
      facebook_page_id,
      fb_page_id,
      encrypted_page_access_token,
      page_access_token,
      account_id,
      facebook_account_id,
      facebook_accounts (
        encrypted_access_token,
        access_token
      )
    `)
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (pageErr || !page) {
    return NextResponse.json({ error: "Page not found or unauthorized." }, { status: 404 });
  }

  const fbPageId = page.facebook_page_id || page.fb_page_id;
  const encryptedPageToken = page.encrypted_page_access_token || page.page_access_token;
  const account = Array.isArray(page.facebook_accounts) ? page.facebook_accounts[0] : page.facebook_accounts;
  const encryptedAccountToken = account?.encrypted_access_token || account?.access_token;

  const tokenToDecrypt = encryptedPageToken || encryptedAccountToken;
  if (!tokenToDecrypt) {
    return NextResponse.json({ error: "Missing Page access token to perform synchronization." }, { status: 400 });
  }

  try {
    const decryptedToken = decryptToken(tokenToDecrypt);
    const details = await getPageDetails(fbPageId, decryptedToken);

    // Update Supabase record with fresh metadata
    const { data: updated, error: updateErr } = await supabase
      .from("facebook_pages")
      .update({
        name: details.name,
        page_name: details.name,
        category: details.category || "General",
        picture_url: details.pictureUrl || null,
        profile_picture_url: details.pictureUrl || null,
        followers_count: details.followersCount,
        assigned_tasks: details.tasks || [],
        connection_status: "active",
        status: "active",
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id, name, page_name, category, followers_count, last_synced_at")
      .single();

    if (updateErr) {
      return NextResponse.json({ error: "Failed to persist synced metadata.", details: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      page: updated,
      message: `Page '${details.name}' successfully synchronized with Meta Graph API.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: "Failed to synchronize Page with Meta Graph API.",
        message: err?.message || "An unexpected error occurred during sync.",
      },
      { status: 500 }
    );
  }
}
