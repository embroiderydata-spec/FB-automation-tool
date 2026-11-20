import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("job_id");
    const pageId = searchParams.get("page_id");
    const limit = Math.min(Number(searchParams.get("limit") || 50), 100);

    const supabase = await createClient();

    let query = supabase
      .from("publishing_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (jobId) {
      query = query.eq("job_id", jobId);
    }
    if (pageId && pageId !== "all") {
      query = query.eq("page_id", pageId);
    }

    const { data: logs, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ logs: logs || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
