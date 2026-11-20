import { SupabaseClient } from "@supabase/supabase-js";

interface RateLimitEntry {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Checks in-memory sliding window rate limits for AI generation requests.
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number = 60
): { allowed: boolean; remaining: number; resetMs: number } {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const entry = rateLimitStore.get(key) || { timestamps: [] };

  // Filter timestamps within current window
  const validTimestamps = entry.timestamps.filter((ts) => now - ts < windowMs);

  if (validTimestamps.length >= maxRequests) {
    const oldestTimestamp = validTimestamps[0];
    const resetMs = Math.max(0, oldestTimestamp + windowMs - now);
    rateLimitStore.set(key, { timestamps: validTimestamps });
    return {
      allowed: false,
      remaining: 0,
      resetMs,
    };
  }

  validTimestamps.push(now);
  rateLimitStore.set(key, { timestamps: validTimestamps });

  return {
    allowed: true,
    remaining: maxRequests - validTimestamps.length,
    resetMs: windowMs,
  };
}

/**
 * Checks whether the user has exceeded their configured daily AI budget in USD.
 * Queries api_usage for today's UTC spend.
 */
export async function checkDailyBudget(
  supabase: SupabaseClient,
  userId: string,
  maxDailyBudget: number
): Promise<{ allowed: boolean; currentSpend: number; maxBudget: number }> {
  try {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const todayIso = today.toISOString();

    const { data, error } = await supabase
      .from("api_usage")
      .select("cost_usd")
      .eq("user_id", userId)
      .gte("created_at", todayIso);

    if (error) {
      console.error("[RateLimiter] Error querying api_usage daily budget:", error);
      // Fail-open for transient DB errors so users aren't erroneously blocked, but log warning
      return { allowed: true, currentSpend: 0, maxBudget: maxDailyBudget };
    }

    const currentSpend = (data || []).reduce(
      (sum, row) => sum + (parseFloat(row.cost_usd) || 0),
      0
    );

    const roundedSpend = parseFloat(currentSpend.toFixed(4));

    return {
      allowed: roundedSpend < maxDailyBudget,
      currentSpend: roundedSpend,
      maxBudget: maxDailyBudget,
    };
  } catch (err) {
    console.error("[RateLimiter] Unexpected error in checkDailyBudget:", err);
    return { allowed: true, currentSpend: 0, maxBudget: maxDailyBudget };
  }
}
