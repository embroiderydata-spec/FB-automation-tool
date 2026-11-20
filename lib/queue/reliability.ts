import crypto from "crypto";
import { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "../logger/logger";

export interface RetryPolicy {
  attemptDelaysMs: number[];
  maxAttempts: number;
}

// Configurable exponential backoff intervals: 10s, 30s, 2m (120s), 5m (300s)
export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  attemptDelaysMs: [
    10 * 1000,      // Attempt 1 -> 10s
    30 * 1000,      // Attempt 2 -> 30s
    120 * 1000,     // Attempt 3 -> 2 mins
    300 * 1000,     // Attempt 4 -> 5 mins
  ],
  maxAttempts: 4,
};

/**
 * Calculates next retry timestamp using exponential backoff with jitter.
 */
export function calculateNextRetryAt(
  attempt: number,
  policy: RetryPolicy = DEFAULT_RETRY_POLICY
): Date | null {
  if (attempt >= policy.maxAttempts) {
    return null; // Exceeded maximum retry attempts; transition to dead-letter queue
  }

  const delayMs = policy.attemptDelaysMs[attempt] || policy.attemptDelaysMs[policy.attemptDelaysMs.length - 1];
  // Add 10% jitter to prevent thundering herd problem
  const jitter = Math.floor(Math.random() * (delayMs * 0.1));
  return new Date(Date.now() + delayMs + jitter);
}

/**
 * Generates a SHA-256 idempotency key to prevent duplicate job processing.
 */
export function generateIdempotencyKey(jobType: string, ...identifiers: (string | number)[]): string {
  const hash = crypto.createHash("sha256");
  hash.update(`${jobType}:${identifiers.join(":")}`);
  return hash.digest("hex");
}

/**
 * Distributed Job Lock Manager using Supabase PostgreSQL.
 * Ensures two workers cannot process the same job concurrently.
 */
export async function acquireJobLock(
  supabase: SupabaseClient,
  jobId: string,
  workerId: string,
  leaseSeconds: number = 300
): Promise<boolean> {
  const now = new Date();
  const leaseExpires = new Date(now.getTime() + leaseSeconds * 1000);

  // Optimistic lock acquisition: update only if currently queued or if existing lock has expired
  const { data, error } = await supabase
    .from("background_jobs")
    .update({
      status: "locked",
      locked_by: workerId,
      locked_at: now.toISOString(),
      lock_expires_at: leaseExpires.toISOString(),
    })
    .eq("id", jobId)
    .or(`status.eq.queued,and(status.eq.locked,lock_expires_at.lt.${now.toISOString()})`)
    .select("id")
    .maybeSingle();

  if (error) {
    logger.error("JobLock", `Failed to acquire lock for job ${jobId}`, { jobId, workerId }, error);
    return false;
  }

  return Boolean(data);
}

/**
 * Releases a previously acquired job lock upon completion or controlled cancellation.
 */
export async function releaseJobLock(
  supabase: SupabaseClient,
  jobId: string,
  workerId: string,
  finalStatus: "completed" | "failed" | "dead_letter" | "queued" = "completed",
  result?: any,
  errorMessage?: string
): Promise<void> {
  const updates: Record<string, any> = {
    status: finalStatus,
    locked_by: null,
    locked_at: null,
    lock_expires_at: null,
    updated_at: new Date().toISOString(),
  };

  if (finalStatus === "completed") {
    updates.progress = 100;
    updates.completed_at = new Date().toISOString();
    if (result) updates.result = result;
  } else if (finalStatus === "failed" || finalStatus === "dead_letter") {
    if (errorMessage) updates.error_message = errorMessage;
  }

  await supabase.from("background_jobs").update(updates).eq("id", jobId);
}

/**
 * Reclaims jobs whose worker locks expired (due to worker node restart, crash, or memory kill).
 * Moves them back to 'queued' so other active workers can resume processing.
 */
export async function recoverInterruptedJobs(
  supabase: SupabaseClient,
  workerId: string
): Promise<number> {
  const nowIso = new Date().toISOString();

  const { data: reclaimed, error } = await supabase
    .from("background_jobs")
    .update({
      status: "queued",
      locked_by: null,
      locked_at: null,
      lock_expires_at: null,
      error_message: "Reclaimed from expired or interrupted worker lease.",
    })
    .in("status", ["locked", "processing"])
    .lt("lock_expires_at", nowIso)
    .select("id");

  if (error) {
    logger.error("JobLock", "Error reclaiming interrupted jobs", { workerId }, error);
    return 0;
  }

  const count = (reclaimed || []).length;
  if (count > 0) {
    logger.warn("JobLock", `Recovered ${count} interrupted background jobs`, { count, workerId });
  }

  return count;
}
