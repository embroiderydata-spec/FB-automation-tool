import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { processWorkflowQueue } from "@/lib/workflow/worker";

export const dynamic = "force-dynamic";

/**
 * POST /api/workflows/worker
 * Background worker tick to process active and queued automation workflows.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const workerId = `worker_${Date.now()}`;
    const result = await processWorkflowQueue(supabase, workerId);

    return NextResponse.json({
      workerId,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Workflow worker failed." },
      { status: 500 }
    );
  }
}

/**
 * GET /api/workflows/worker
 * Worker health status check.
 */
export async function GET() {
  return NextResponse.json({
    status: "healthy",
    role: "Automation Workflow Processor",
    concurrencyCap: 3,
    timestamp: new Date().toISOString(),
  });
}
