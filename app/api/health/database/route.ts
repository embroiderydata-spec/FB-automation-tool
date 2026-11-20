import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const start = Date.now();
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("system_settings")
      .select("key")
      .limit(1);

    const latencyMs = Date.now() - start;

    if (error) {
      return NextResponse.json(
        {
          status: "unhealthy",
          database: "postgresql",
          latencyMs,
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      status: "healthy",
      database: "postgresql",
      latencyMs,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        status: "down",
        database: "postgresql",
        error: err?.message || "Failed to reach database.",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
