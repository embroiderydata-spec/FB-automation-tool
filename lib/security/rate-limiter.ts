/**
 * In-Memory Token Bucket Rate Limiter with Sliding Window Tracking
 * Protects expensive AI, Video Render, and Publishing endpoints from runaway abuse.
 */

interface RateLimitBucket {
  tokens: number;
  lastRefill: number;
}

const memoryStore = new Map<string, RateLimitBucket>();

export interface RateLimitConfig {
  maxRequests: number; // Maximum requests allowed within window
  windowSeconds: number; // Time window in seconds
}

export const RATE_LIMIT_PROFILES: Record<string, RateLimitConfig> = {
  auth: { maxRequests: 10, windowSeconds: 60 },          // 10 req/min for auth
  ai_generation: { maxRequests: 20, windowSeconds: 60 }, // 20 req/min for AI generation
  video_rendering: { maxRequests: 5, windowSeconds: 60 }, // 5 renders/min
  facebook_publish: { maxRequests: 10, windowSeconds: 60 }, // 10 publishes/min
  analytics_sync: { maxRequests: 15, windowSeconds: 60 }, // 15 syncs/min
  standard_api: { maxRequests: 100, windowSeconds: 60 }, // 100 req/min general APIs
};

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetInSeconds: number;
}

/**
 * Checks and decrements available rate limit quota for a given identifier (User ID or Client IP).
 */
export function checkRateLimit(
  identifier: string,
  profileKey: keyof typeof RATE_LIMIT_PROFILES = "standard_api"
): RateLimitResult {
  const config = RATE_LIMIT_PROFILES[profileKey] || RATE_LIMIT_PROFILES.standard_api;
  const now = Date.now();
  const key = `${profileKey}:${identifier}`;

  let bucket = memoryStore.get(key);

  if (!bucket) {
    bucket = { tokens: config.maxRequests, lastRefill: now };
    memoryStore.set(key, bucket);
  } else {
    // Refill tokens based on elapsed time
    const elapsedSeconds = (now - bucket.lastRefill) / 1000;
    const tokensToAdd = elapsedSeconds * (config.maxRequests / config.windowSeconds);
    bucket.tokens = Math.min(config.maxRequests, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;
  }

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    const remaining = Math.floor(bucket.tokens);
    return {
      allowed: true,
      limit: config.maxRequests,
      remaining,
      resetInSeconds: Math.ceil((config.maxRequests - bucket.tokens) * (config.windowSeconds / config.maxRequests)),
    };
  }

  const resetInSeconds = Math.ceil((1 - bucket.tokens) * (config.windowSeconds / config.maxRequests));
  return {
    allowed: false,
    limit: config.maxRequests,
    remaining: 0,
    resetInSeconds: Math.max(1, resetInSeconds),
  };
}

/**
 * Clears old buckets periodically to prevent memory leaks.
 */
export function pruneRateLimitBuckets(): void {
  const now = Date.now();
  memoryStore.forEach((bucket, key) => {
    if (now - bucket.lastRefill > 300 * 1000) {
      memoryStore.delete(key);
    }
  });
}
