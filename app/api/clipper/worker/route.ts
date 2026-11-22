import { NextRequest, NextResponse } from "next/server";
import { createClient as createDirectSupabase } from "@supabase/supabase-js";
import { DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY } from "@/lib/supabase/client";
import { executeRenderJob } from "@/lib/clipper/render-manager";
import { ClipRenderJob } from "@/lib/clipper/types";

export const dynamic = "force-dynamic";

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    DEFAULT_SUPABASE_ANON_KEY;
  return createDirectSupabase(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Background worker endpoint for clip rendering.
 * Compatible with external containers (Railway, Cloud Run, Fly.io) or scheduled cron workers.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate worker via secret token or service key
    const authHeader = request.headers.get("authorization") || "";
    const workerSecret = process.env.WORKER_SECRET || process.env.CRON_SECRET;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const isAuthorized =
      (workerSecret && token === workerSecret) ||
      (serviceKey && token === serviceKey) ||
      process.env.NODE_ENV === "development";

    if (!isAuthorized && workerSecret) {
      return NextResponse.json({ error: "Unauthorized worker request." }, { status: 401 });
    }

    const supabase = getServiceSupabase();

    // 2. Fetch up to 3 queued render jobs
    const { data: queuedJobs, error: fetchError } = await supabase
      .from("clip_render_jobs")
      .select("*")
      .eq("status", "queued")
      .order("created_at", { ascending: true })
      .limit(3);

    if (fetchError || !queuedJobs || queuedJobs.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No queued render jobs to process.",
        processed: 0,
      });
    }

    const results: Array<{ jobId: string; success: boolean; error?: string }> = [];

    // 3. Process jobs sequentially
    for (const rawJob of queuedJobs) {
      const job = rawJob as ClipRenderJob;
      try {
        const renderResult = await executeRenderJob(job);
        results.push({
          jobId: job.id,
          success: renderResult.success,
          error: renderResult.error,
        });
      } catch (jobErr: any) {
        results.push({
          jobId: job.id,
          success: false,
          error: jobErr.message,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;

    return NextResponse.json({
      success: true,
      processed: queuedJobs.length,
      successful: successCount,
      failed: queuedJobs.length - successCount,
      results,
    });
  } catch (err: any) {
    console.error("[ClipperWorker] Error processing queue:", err);
    return NextResponse.json(
      { error: err?.message || "Worker execution failed." },
      { status: 500 }
    );
  }
}
