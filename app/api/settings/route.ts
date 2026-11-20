import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { getPlatformSettings, savePlatformSettings, DEFAULT_PLATFORM_SETTINGS } from "@/lib/settings/persistence";

export const dynamic = "force-dynamic";

/**
 * GET /api/settings
 * Retrieves user's genuine persisted platform settings.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const settings = await getPlatformSettings(user.id, user.email);
    return NextResponse.json({ success: true, settings });
  } catch (err: any) {
    console.error("[GET /api/settings] Error:", err?.message);
    return NextResponse.json({ error: err?.message || "Failed to retrieve settings." }, { status: 500 });
  }
}

/**
 * PUT /api/settings
 * Persists user's platform preferences across Supabase database and cloud user metadata.
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const body = await request.json();

    // Validation
    const dailyBudget = Number(body.daily_budget_limit);
    const monthlyBudget = Number(body.monthly_budget_limit);
    const maxCostPerVideo = Number(body.max_cost_per_video);
    const maxPostsPerDay = Number(body.max_posts_per_day_per_page);

    if (isNaN(dailyBudget) || dailyBudget <= 0) {
      return NextResponse.json({ error: "Daily budget limit must be a positive number." }, { status: 400 });
    }
    if (isNaN(monthlyBudget) || monthlyBudget <= 0) {
      return NextResponse.json({ error: "Monthly budget limit must be a positive number." }, { status: 400 });
    }
    if (isNaN(maxCostPerVideo) || maxCostPerVideo <= 0) {
      return NextResponse.json({ error: "Max cost per video must be a positive number." }, { status: 400 });
    }
    if (isNaN(maxPostsPerDay) || maxPostsPerDay <= 0) {
      return NextResponse.json({ error: "Max posts per day must be a positive integer." }, { status: 400 });
    }

    const savedSettings = await savePlatformSettings(user.id, user.email, {
      timezone: body.timezone,
      daily_budget_limit: dailyBudget,
      monthly_budget_limit: monthlyBudget,
      max_cost_per_video: maxCostPerVideo,
      max_posts_per_day_per_page: maxPostsPerDay,
      default_llm_provider: body.default_llm_provider,
      default_video_provider: body.default_video_provider,
      default_voice_provider: body.default_voice_provider,
      auto_publish_default: body.auto_publish_default,
      require_manual_approval: body.require_manual_approval,
      notify_on_publish: body.notify_on_publish,
      notify_on_failure: body.notify_on_failure,
      emergency_stopped: body.emergency_stopped,
    });

    return NextResponse.json({
      success: true,
      message: "Platform preferences persisted successfully.",
      settings: savedSettings,
    });
  } catch (err: any) {
    console.error("[PUT /api/settings] Error:", err?.message);
    return NextResponse.json({ error: err?.message || "Failed to persist platform settings." }, { status: 500 });
  }
}
