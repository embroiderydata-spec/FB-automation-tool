import { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "../logger/logger";

export interface BudgetLimits {
  dailyCapUsd: number;
  monthlyCapUsd: number;
  perUserDailyCapUsd: number;
  enforceHardStop: boolean;
}

export interface BudgetStatus {
  allowed: boolean;
  currentDailySpend: number;
  dailyCapUsd: number;
  currentMonthlySpend: number;
  monthlyCapUsd: number;
  userDailySpend?: number;
  userDailyCapUsd?: number;
  reason?: string;
}

export const DEFAULT_BUDGET_LIMITS: BudgetLimits = {
  dailyCapUsd: parseFloat(process.env.AI_MAX_DAILY_BUDGET || "25.00"),
  monthlyCapUsd: parseFloat(process.env.AI_MAX_MONTHLY_BUDGET || "250.00"),
  perUserDailyCapUsd: 10.00,
  enforceHardStop: true,
};

/**
 * Checks if the system or specific user has exceeded financial spending caps.
 * Queries actual recorded costs from `public.api_usage`.
 */
export async function checkBudgetGuard(
  supabase: SupabaseClient,
  userId?: string,
  estimatedJobCostUsd: number = 0.05
): Promise<BudgetStatus> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  try {
    // 1. Fetch system settings overrides if configured
    let limits = { ...DEFAULT_BUDGET_LIMITS };
    const { data: settingRecord } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "cost_limits")
      .maybeSingle();

    if (settingRecord?.value) {
      limits = {
        ...limits,
        dailyCapUsd: settingRecord.value.daily_budget_usd ?? limits.dailyCapUsd,
        monthlyCapUsd: settingRecord.value.monthly_budget_usd ?? limits.monthlyCapUsd,
        perUserDailyCapUsd: settingRecord.value.per_user_daily_limit_usd ?? limits.perUserDailyCapUsd,
        enforceHardStop: settingRecord.value.enforce_hard_stop ?? limits.enforceHardStop,
      };
    }

    // 2. Query total daily spend across platform
    const { data: dailyRecords } = await supabase
      .from("api_usage")
      .select("estimated_cost")
      .gte("created_at", startOfDay);

    const currentDailySpend = (dailyRecords || []).reduce(
      (sum, r) => sum + (parseFloat(r.estimated_cost) || 0),
      0
    );

    // 3. Query total monthly spend across platform
    const { data: monthlyRecords } = await supabase
      .from("api_usage")
      .select("estimated_cost")
      .gte("created_at", startOfMonth);

    const currentMonthlySpend = (monthlyRecords || []).reduce(
      (sum, r) => sum + (parseFloat(r.estimated_cost) || 0),
      0
    );

    // 4. Query user daily spend if userId provided
    let userDailySpend = 0;
    if (userId) {
      const { data: userRecords } = await supabase
        .from("api_usage")
        .select("estimated_cost")
        .eq("user_id", userId)
        .gte("created_at", startOfDay);

      userDailySpend = (userRecords || []).reduce(
        (sum, r) => sum + (parseFloat(r.estimated_cost) || 0),
        0
      );
    }

    // Evaluate budget caps
    if (limits.enforceHardStop) {
      if (currentDailySpend + estimatedJobCostUsd > limits.dailyCapUsd) {
        const reason = `Global daily AI spending limit exceeded ($${currentDailySpend.toFixed(2)} / $${limits.dailyCapUsd.toFixed(2)}).`;
        logger.warn("CostGuard", reason, { currentDailySpend, dailyCapUsd: limits.dailyCapUsd });
        return {
          allowed: false,
          currentDailySpend,
          dailyCapUsd: limits.dailyCapUsd,
          currentMonthlySpend,
          monthlyCapUsd: limits.monthlyCapUsd,
          userDailySpend,
          userDailyCapUsd: limits.perUserDailyCapUsd,
          reason,
        };
      }

      if (currentMonthlySpend + estimatedJobCostUsd > limits.monthlyCapUsd) {
        const reason = `Global monthly AI spending limit exceeded ($${currentMonthlySpend.toFixed(2)} / $${limits.monthlyCapUsd.toFixed(2)}).`;
        logger.warn("CostGuard", reason, { currentMonthlySpend, monthlyCapUsd: limits.monthlyCapUsd });
        return {
          allowed: false,
          currentDailySpend,
          dailyCapUsd: limits.dailyCapUsd,
          currentMonthlySpend,
          monthlyCapUsd: limits.monthlyCapUsd,
          userDailySpend,
          userDailyCapUsd: limits.perUserDailyCapUsd,
          reason,
        };
      }

      if (userId && userDailySpend + estimatedJobCostUsd > limits.perUserDailyCapUsd) {
        const reason = `User daily spending quota exceeded ($${userDailySpend.toFixed(2)} / $${limits.perUserDailyCapUsd.toFixed(2)}).`;
        logger.warn("CostGuard", reason, { userId, userDailySpend, perUserDailyCapUsd: limits.perUserDailyCapUsd });
        return {
          allowed: false,
          currentDailySpend,
          dailyCapUsd: limits.dailyCapUsd,
          currentMonthlySpend,
          monthlyCapUsd: limits.monthlyCapUsd,
          userDailySpend,
          userDailyCapUsd: limits.perUserDailyCapUsd,
          reason,
        };
      }
    }

    return {
      allowed: true,
      currentDailySpend,
      dailyCapUsd: limits.dailyCapUsd,
      currentMonthlySpend,
      monthlyCapUsd: limits.monthlyCapUsd,
      userDailySpend,
      userDailyCapUsd: limits.perUserDailyCapUsd,
    };
  } catch (err: any) {
    logger.error("CostGuard", "Failed to compute cost guard check", {}, err);
    // Allow operation to proceed if accounting service experiences transient issue, but log error
    return {
      allowed: true,
      currentDailySpend: 0,
      dailyCapUsd: DEFAULT_BUDGET_LIMITS.dailyCapUsd,
      currentMonthlySpend: 0,
      monthlyCapUsd: DEFAULT_BUDGET_LIMITS.monthlyCapUsd,
    };
  }
}
