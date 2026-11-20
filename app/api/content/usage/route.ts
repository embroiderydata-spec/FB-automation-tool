import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { createClient } from "@/lib/supabase/server";
import { getAIConfig } from "@/lib/ai/config";

export const dynamic = "force-dynamic";

/**
 * GET /api/content/usage
 * Returns daily, monthly, per-page, and per-type AI generation and cost metrics.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const config = getAIConfig();
    const supabase = await createClient();

    const now = new Date();
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

    // 1. Fetch usage logs for current month
    const { data: usageLogs, error } = await supabase
      .from("api_usage")
      .select("*, facebook_pages(id, page_name, name)")
      .eq("user_id", user.id)
      .gte("created_at", startOfMonth)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[GET /api/content/usage] DB error:", error);
    }

    const logs = usageLogs || [];

    // 2. Aggregate metrics
    let dailySpend = 0;
    let monthlySpend = 0;
    let dailyTokens = 0;
    let monthlyTokens = 0;
    const byPage: Record<string, { page_name: string; cost: number; tokens: number; count: number }> = {};
    const byType: Record<string, { cost: number; tokens: number; count: number }> = {};

    for (const log of logs) {
      const cost = parseFloat(log.cost_usd) || 0;
      const tokens = log.total_tokens || log.units_consumed || 0;
      const createdAt = log.created_at;

      monthlySpend += cost;
      monthlyTokens += tokens;

      if (createdAt >= startOfToday) {
        dailySpend += cost;
        dailyTokens += tokens;
      }

      // Group by Page
      const pageKey = log.facebook_page_id || "unassigned";
      const pageName = log.facebook_pages?.page_name || log.facebook_pages?.name || "General Generation";
      if (!byPage[pageKey]) {
        byPage[pageKey] = { page_name: pageName, cost: 0, tokens: 0, count: 0 };
      }
      byPage[pageKey].cost += cost;
      byPage[pageKey].tokens += tokens;
      byPage[pageKey].count += 1;

      // Group by generation type
      const genType = log.generation_type || "script_generation";
      if (!byType[genType]) {
        byType[genType] = { cost: 0, tokens: 0, count: 0 };
      }
      byType[genType].cost += cost;
      byType[genType].tokens += tokens;
      byType[genType].count += 1;
    }

    // 3. Fetch recent ai_jobs
    const { data: recentJobs } = await supabase
      .from("ai_jobs")
      .select("*, facebook_pages(id, page_name, name)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    return NextResponse.json({
      config: {
        is_configured: config.isConfigured,
        model: config.model,
        max_requests_per_minute: config.maxRequestsPerMinute,
        max_daily_budget: config.maxDailyBudget,
      },
      summary: {
        daily_spend_usd: parseFloat(dailySpend.toFixed(4)),
        monthly_spend_usd: parseFloat(monthlySpend.toFixed(4)),
        daily_tokens: dailyTokens,
        monthly_tokens: monthlyTokens,
        daily_budget_limit: config.maxDailyBudget,
        budget_used_percent: Math.min(100, Math.round((dailySpend / config.maxDailyBudget) * 100)),
        is_budget_exceeded: dailySpend >= config.maxDailyBudget,
      },
      by_page: Object.values(byPage),
      by_type: byType,
      recent_jobs: recentJobs || [],
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to fetch usage metrics." },
      { status: 500 }
    );
  }
}
