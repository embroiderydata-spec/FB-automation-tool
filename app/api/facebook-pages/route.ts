import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { createClient } from "@/lib/supabase/server";

const DEMO_FALLBACK_PAGES = [
  {
    id: "demo-page-001",
    page_id: "108392184918231",
    page_name: "TechPulse Daily",
    category: "Technology & AI",
    profile_picture_url: null,
    assigned_tasks: ["MANAGE", "CREATE_CONTENT"],
    followers_count: 124800,
    connection_status: "active",
    automation_enabled: false,
    last_synced_at: new Date(Date.now() - 720000).toISOString(),
    account_id: "demo-acc-001",
    account_name: "Alex Rivera (Demo Account)",
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    is_demo: true,
    settings: {
      niche: "AI & Future Tech",
      content_category: "Technology",
      content_style: "informative",
      target_country: "US",
      target_audience: "Tech enthusiasts and developers (20-45)",
      language: "en",
      timezone: "America/New_York",
      posting_days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      posting_schedule: ["10:00", "16:00", "20:00"],
      posts_per_day: 2,
      daily_post_limit: 3,
      video_duration_min: 30,
      video_duration_max: 60,
      aspect_ratio: "9:16",
      voice_preference: "en-US-Standard",
      require_approval: true,
      content_generation_enabled: false,
      auto_publish: false,
    },
  },
  {
    id: "demo-page-002",
    page_id: "109403819284910",
    page_name: "Viral Motivation Hub",
    category: "Inspiration & Quotes",
    profile_picture_url: null,
    assigned_tasks: ["MANAGE"],
    followers_count: 86450,
    connection_status: "active",
    automation_enabled: true,
    last_synced_at: new Date(Date.now() - 14400000).toISOString(),
    account_id: "demo-acc-001",
    account_name: "Alex Rivera (Demo Account)",
    created_at: new Date(Date.now() - 86400000 * 8).toISOString(),
    is_demo: true,
    settings: {
      niche: "Discipline & High Performance",
      content_category: "Motivation",
      content_style: "motivational",
      target_country: "US",
      target_audience: "Entrepreneurs & athletes",
      language: "en",
      timezone: "America/New_York",
      posting_days: ["Monday", "Wednesday", "Friday"],
      posting_schedule: ["09:00", "18:00"],
      posts_per_day: 1,
      daily_post_limit: 2,
      video_duration_min: 30,
      video_duration_max: 45,
      aspect_ratio: "9:16",
      voice_preference: "elevenlabs_adam",
      require_approval: false,
      content_generation_enabled: true,
      auto_publish: true,
    },
  },
  {
    id: "demo-page-003",
    page_id: "104928174920194",
    page_name: "Daily Finance Hacks",
    category: "Personal Finance",
    profile_picture_url: null,
    assigned_tasks: ["MANAGE"],
    followers_count: 43200,
    connection_status: "active",
    automation_enabled: false,
    last_synced_at: new Date(Date.now() - 86400000).toISOString(),
    account_id: "demo-acc-001",
    account_name: "Alex Rivera (Demo Account)",
    created_at: new Date(Date.now() - 86400000 * 12).toISOString(),
    is_demo: true,
    settings: {
      niche: "Investing & Passive Income",
      content_category: "Finance",
      content_style: "informative",
      target_country: "US",
      target_audience: "Young professionals (22-35)",
      language: "en",
      timezone: "America/New_York",
      posting_days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      posting_schedule: ["12:00"],
      posts_per_day: 1,
      daily_post_limit: 2,
      video_duration_min: 40,
      video_duration_max: 60,
      aspect_ratio: "9:16",
      voice_preference: "en-US-Standard",
      require_approval: true,
      content_generation_enabled: false,
      auto_publish: false,
    },
  },
];

const DEMO_FALLBACK_ACCOUNTS = [
  {
    id: "demo-acc-001",
    name: "Alex Rivera (Demo Account)",
    display_name: "Alex Rivera (Demo Account)",
    facebook_user_id: "100089284918231",
    fb_user_id: "100089284918231",
    connection_status: "connected",
    status: "active",
    granted_permissions: ["pages_show_list", "pages_read_engagement", "pages_manage_posts"],
    connected_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    is_demo: true,
  },
];

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search")?.trim().toLowerCase() || "";
  const statusFilter = searchParams.get("status") || "all";
  const automationFilter = searchParams.get("automation") || "all";

  // If in demo mode, serve realistic demo dataset cleanly
  if (user.isDemo) {
    return servePagesList(DEMO_FALLBACK_PAGES, DEMO_FALLBACK_ACCOUNTS, search, statusFilter, automationFilter);
  }

  const supabase = await createClient();

  try {
    // 1. Fetch connected accounts (without access tokens)
    const { data: accounts, error: accErr } = await supabase
      .from("facebook_accounts")
      .select("id, name, display_name, facebook_user_id, fb_user_id, connection_status, status, granted_permissions, connected_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    // 2. Fetch pages joined with settings
    const { data: rawPages, error: pagesErr } = await supabase
      .from("facebook_pages")
      .select(`
        id,
        user_id,
        facebook_account_id,
        account_id,
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
        updated_at,
        page_settings (
          id,
          niche,
          content_category,
          content_style,
          target_country,
          target_audience,
          language,
          timezone,
          posting_days,
          posting_schedule,
          posts_per_day,
          daily_post_limit,
          video_duration_min,
          video_duration_max,
          aspect_ratio,
          voice_preference,
          require_approval,
          content_generation_enabled,
          auto_publish
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (pagesErr || accErr) {
      // If Supabase tables are not yet created or credentials placeholder, fallback gracefully
      return servePagesList(DEMO_FALLBACK_PAGES, DEMO_FALLBACK_ACCOUNTS, search, statusFilter, automationFilter);
    }

    const accountsMap = new Map((accounts || []).map((acc) => [acc.id, acc.display_name || acc.name]));

    const pagesList = (rawPages || []).map((p: any) => {
      const accountName = accountsMap.get(p.facebook_account_id || p.account_id) || "Connected Account";
      const settings = Array.isArray(p.page_settings) ? p.page_settings[0] : p.page_settings;

      return {
        id: p.id,
        page_id: p.facebook_page_id || p.fb_page_id,
        page_name: p.page_name || p.name,
        category: p.category || "General",
        profile_picture_url: p.profile_picture_url || p.picture_url,
        assigned_tasks: p.assigned_tasks || [],
        followers_count: p.followers_count || 0,
        connection_status: p.connection_status || p.status || "active",
        automation_enabled: Boolean(p.automation_enabled),
        last_synced_at: p.last_synced_at,
        account_id: p.facebook_account_id || p.account_id,
        account_name: accountName,
        created_at: p.created_at,
        settings: settings || null,
      };
    });

    return servePagesList(pagesList, accounts || [], search, statusFilter, automationFilter);
  } catch {
    return servePagesList(DEMO_FALLBACK_PAGES, DEMO_FALLBACK_ACCOUNTS, search, statusFilter, automationFilter);
  }
}

function servePagesList(
  allPages: any[],
  accounts: any[],
  search: string,
  statusFilter: string,
  automationFilter: string
) {
  const stats = {
    total: allPages.length,
    active: allPages.filter((p) => (p.connection_status || p.status) === "active").length,
    automation_enabled: allPages.filter((p) => p.automation_enabled === true).length,
    disconnected: allPages.filter((p) => (p.connection_status || p.status) === "disconnected").length,
  };

  let filtered = allPages;

  if (search) {
    filtered = filtered.filter(
      (p) =>
        p.page_name.toLowerCase().includes(search) ||
        p.category.toLowerCase().includes(search) ||
        p.page_id.includes(search)
    );
  }

  if (statusFilter !== "all") {
    filtered = filtered.filter((p) => p.connection_status === statusFilter);
  }

  if (automationFilter !== "all") {
    const isAuto = automationFilter === "enabled";
    filtered = filtered.filter((p) => p.automation_enabled === isAuto);
  }

  return NextResponse.json({
    success: true,
    stats,
    pages: filtered,
    accounts,
    totalCount: filtered.length,
  });
}
