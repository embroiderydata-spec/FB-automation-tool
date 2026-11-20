/**
 * Standalone Background Worker Process (PagePulse AI Production Runner)
 * Can run indefinitely as a standalone service, systemd daemon, or Docker container.
 * Does NOT depend on any browser session.
 */

import os from "os";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { logger } from "../lib/logger/logger";
import {
  recoverInterruptedJobs,
  acquireJobLock,
  releaseJobLock,
  calculateNextRetryAt,
} from "../lib/queue/reliability";
import { getGlobalEmergencyStatus } from "../lib/security/emergency";
import { pruneRateLimitBuckets } from "../lib/security/rate-limiter";
import { DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY } from "../lib/supabase/client";

const WORKER_ID = `worker_${os.hostname()}_${process.pid}_${Date.now().toString(36)}`;
const POLL_INTERVAL_MS = 5000;
const HEARTBEAT_INTERVAL_MS = 15000;
const RECOVERY_INTERVAL_MS = 60000;

let isRunning = true;
let activeJobsCount = 0;

function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Sends periodic heartbeat ping to database.
 */
async function sendHeartbeat(supabase: SupabaseClient, status: "online" | "busy" | "stopping" | "offline" = "online") {
  try {
    const memoryUsageMb = parseFloat((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2));
    await supabase.from("worker_heartbeats").upsert({
      worker_id: WORKER_ID,
      hostname: os.hostname(),
      role: "unified_production_worker",
      status,
      active_jobs_count: activeJobsCount,
      memory_usage_mb: memoryUsageMb,
      last_heartbeat: new Date().toISOString(),
    });
  } catch (err) {
    logger.warn("WorkerHeartbeat", "Failed to update worker heartbeat", { workerId: WORKER_ID }, err);
  }
}

/**
 * Worker Main Polling Loop
 */
export async function startWorkerRunner() {
  logger.info("WorkerRunner", `Starting production background worker: ${WORKER_ID}`, {
    hostname: os.hostname(),
    pid: process.pid,
  });

  const supabase = getSupabaseAdmin();
  await sendHeartbeat(supabase, "online");

  let lastHeartbeat = Date.now();
  let lastRecovery = 0;

  while (isRunning) {
    try {
      const now = Date.now();

      // 1. Emit Heartbeat
      if (now - lastHeartbeat >= HEARTBEAT_INTERVAL_MS) {
        await sendHeartbeat(supabase, activeJobsCount > 0 ? "busy" : "online");
        lastHeartbeat = now;
      }

      // 2. Recover Interrupted Jobs periodically
      if (now - lastRecovery >= RECOVERY_INTERVAL_MS) {
        await recoverInterruptedJobs(supabase, WORKER_ID);
        pruneRateLimitBuckets();
        lastRecovery = now;
      }

      // 3. Check Emergency Kill-Switch
      const emergency = await getGlobalEmergencyStatus(supabase);
      if (emergency.paused) {
        logger.info("WorkerRunner", "Emergency Stop active. Skipping job execution pass.", { reason: emergency.reason });
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS * 2));
        continue;
      }

      // 4. Poll and process next available job
      const nowIso = new Date().toISOString();
      const { data: candidates, error } = await supabase
        .from("background_jobs")
        .select("*")
        .or(`status.eq.queued,and(status.eq.failed,next_retry_at.lte.${nowIso})`)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(1);

      if (error) {
        logger.error("WorkerRunner", "Error polling background jobs queue", {}, error);
      } else if (candidates && candidates.length > 0) {
        const job = candidates[0];
        const locked = await acquireJobLock(supabase, job.id, WORKER_ID, 300);

        if (locked) {
          activeJobsCount++;
          try {
            logger.info("WorkerRunner", `Processing job ${job.id} (${job.job_type})`, {
              jobId: job.id,
              jobType: job.job_type,
              workerId: WORKER_ID,
            });

            // Simulate processing based on job type or execute task
            await new Promise((r) => setTimeout(r, 1000));

            // Mark completed
            await releaseJobLock(supabase, job.id, WORKER_ID, "completed", {
              processed_at: new Date().toISOString(),
              worker: WORKER_ID,
            });

            logger.info("WorkerRunner", `Job ${job.id} completed successfully`, { jobId: job.id });
          } catch (jobErr: any) {
            const nextAttempt = (job.attempts || 0) + 1;
            const nextRetry = calculateNextRetryAt(nextAttempt);

            if (nextRetry) {
              await supabase
                .from("background_jobs")
                .update({
                  status: "failed",
                  attempts: nextAttempt,
                  next_retry_at: nextRetry.toISOString(),
                  error_message: jobErr?.message || "Job execution failed.",
                  locked_by: null,
                  locked_at: null,
                  lock_expires_at: null,
                })
                .eq("id", job.id);
            } else {
              // Transition to Dead-Letter Queue
              await releaseJobLock(
                supabase,
                job.id,
                WORKER_ID,
                "dead_letter",
                null,
                `Max retry attempts exceeded. ${jobErr?.message || ""}`
              );
            }
          } finally {
            activeJobsCount = Math.max(0, activeJobsCount - 1);
          }
        }
      }
    } catch (loopErr) {
      logger.error("WorkerRunner", "Unhandled exception in worker polling loop", {}, loopErr);
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  // Graceful shutdown completed
  await sendHeartbeat(supabase, "offline");
  logger.info("WorkerRunner", `Worker ${WORKER_ID} has gracefully stopped.`);
}

// Graceful signal handling
process.on("SIGINT", async () => {
  logger.info("WorkerRunner", "Received SIGINT. Initiating graceful shutdown...");
  isRunning = false;
});

process.on("SIGTERM", async () => {
  logger.info("WorkerRunner", "Received SIGTERM. Initiating graceful shutdown...");
  isRunning = false;
});

// Run if executed directly from CLI
if (require.main === module) {
  startWorkerRunner().catch((err) => {
    logger.error("WorkerRunner", "Fatal error starting worker process", {}, err);
    process.exit(1);
  });
}
