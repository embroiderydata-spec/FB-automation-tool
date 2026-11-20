import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();

    // Query counts by status from background_jobs
    const { data: jobs, error } = await supabase
      .from("background_jobs")
      .select("status");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const counts: Record<string, number> = {
      queued: 0,
      locked: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      dead_letter: 0,
      cancelled: 0,
    };

    (jobs || []).forEach((j) => {
      if (counts[j.status] !== undefined) {
        counts[j.status]++;
      }
    });

    return NextResponse.json({
      status: "healthy",
      queueSize: counts.queued + counts.locked + counts.processing,
      breakdown: counts,
      deadLetterCount: counts.dead_letter,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to query queue status." },
      { status: 500 }
    );
  }
}
