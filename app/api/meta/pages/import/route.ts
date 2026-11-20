import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { createClient } from "@/lib/supabase/server";
import { PageImportSchema } from "@/lib/validations/facebook";
import { decryptToken, encryptToken } from "@/lib/crypto/encryption";
import { getManagedPages } from "@/lib/meta/graph";

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  const parseResult = PageImportSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Validation failed.", details: parseResult.error.format() },
      { status: 400 }
    );
  }

  const { account_id, page_ids } = parseResult.data;
  const supabase = await createClient();

  // Verify that the account exists and belongs to the authenticated user
  const { data: account, error: accountErr } = await supabase
    .from("facebook_accounts")
    .select("id, encrypted_access_token, access_token")
    .eq("id", account_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (accountErr || !account) {
    return NextResponse.json(
      { error: "Authorized Facebook account not found or access denied." },
      { status: 404 }
    );
  }

  const encryptedToken = account.encrypted_access_token || account.access_token;
  if (!encryptedToken) {
    return NextResponse.json(
      { error: "Missing account access token. Please reauthorize your account." },
      { status: 400 }
    );
  }

  try {
    // Decrypt account token and fetch live accessible pages from Meta Graph API
    const userAccessToken = decryptToken(encryptedToken);
    const discoveredPages = await getManagedPages(userAccessToken);

    const selectedPagesMap = new Map(
      discoveredPages
        .filter((p) => page_ids.includes(p.id))
        .map((p) => [p.id, p])
    );

    if (selectedPagesMap.size === 0) {
      return NextResponse.json(
        { error: "None of the selected Pages were found in your authorized Meta account." },
        { status: 400 }
      );
    }

    const importedResults: string[] = [];

    for (const pageId of page_ids) {
      const page = selectedPagesMap.get(pageId);
      if (!page) continue;

      // Encrypt page access token if available
      const encryptedPageToken = page.accessToken ? encryptToken(page.accessToken) : "";

      // Check if page already exists for this user
      const { data: existingPage } = await supabase
        .from("facebook_pages")
        .select("id")
        .eq("user_id", user.id)
        .eq("fb_page_id", page.id)
        .maybeSingle();

      let savedPageId: string;

      if (existingPage) {
        // Update existing page metadata without breaking existing settings
        const { data: updated, error: updateErr } = await supabase
          .from("facebook_pages")
          .update({
            name: page.name,
            page_name: page.name,
            category: page.category || "General",
            picture_url: page.pictureUrl || null,
            profile_picture_url: page.pictureUrl || null,
            page_access_token: encryptedPageToken || undefined,
            encrypted_page_access_token: encryptedPageToken || undefined,
            assigned_tasks: page.tasks || [],
            status: "active",
            connection_status: "active",
            last_synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingPage.id)
          .select("id")
          .single();

        if (updateErr) {
          throw new Error(`Failed to update page ${page.name}: ${updateErr.message}`);
        }
        savedPageId = updated.id;
      } else {
        // Insert new page
        const { data: inserted, error: insertErr } = await supabase
          .from("facebook_pages")
          .insert({
            user_id: user.id,
            account_id: account.id,
            facebook_account_id: account.id,
            fb_page_id: page.id,
            facebook_page_id: page.id,
            name: page.name,
            page_name: page.name,
            category: page.category || "General",
            picture_url: page.pictureUrl || null,
            profile_picture_url: page.pictureUrl || null,
            page_access_token: encryptedPageToken,
            encrypted_page_access_token: encryptedPageToken,
            assigned_tasks: page.tasks || [],
            status: "active",
            connection_status: "active",
            automation_enabled: false, // strictly default to OFF
            last_synced_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (insertErr) {
          throw new Error(`Failed to insert page ${page.name}: ${insertErr.message}`);
        }
        savedPageId = inserted.id;

        // Initialize default page_settings for newly imported page
        await supabase.from("page_settings").insert({
          page_id: savedPageId,
          facebook_page_id: savedPageId,
          user_id: user.id,
          niche: "General Content",
          niche_category: "General Content",
          content_category: page.category || "General",
          content_style: "informative",
          target_country: "US",
          target_audience: "General Audience",
          language: "en",
          default_language: "en",
          timezone: "America/New_York",
          posting_days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
          posting_schedule: ["10:00", "16:00", "20:00"],
          posts_per_day: 1,
          posting_frequency_per_day: 1,
          daily_post_limit: 3,
          video_duration_min: 30,
          video_duration_max: 60,
          aspect_ratio: "9:16",
          voice_preference: "en-US-Standard",
          require_approval: true,
          content_generation_enabled: false,
          auto_publish: false, // strictly default to OFF
        });
      }

      importedResults.push(savedPageId);
    }

    return NextResponse.json({
      success: true,
      importedCount: importedResults.length,
      pageIds: importedResults,
      message: `Successfully imported ${importedResults.length} Facebook Page(s). Automation is disabled by default.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: "Failed to import selected Pages.",
        message: err?.message || "An unexpected error occurred during page import.",
      },
      { status: 500 }
    );
  }
}
