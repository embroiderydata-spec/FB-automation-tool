import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    // A worker is considered alive if it emitted a heartbeat within the last 60 seconds
    const thresholdIso = new Date(Date.now() - 60 * 1000).toISOString();

    const { data: onlineWorkers, error } = await supabase
      .from("worker_heartbeats")
      .select("*")
      .gte("last_heartbeat", thresholdIso)
      .order("last_heartbeat", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const count = (onlineWorkers || []).length;
    return NextResponse.json({
      status: count > 0 ? "healthy" : "idle",
      onlineWorkersCount: count,
      activeWorkers: onlineWorkers || [],
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to query worker status." },
      { status: 500 }
    );
  }
}
