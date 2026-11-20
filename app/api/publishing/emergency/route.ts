import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { createClient } from "@/lib/supabase/server";
import { EmergencyStopSchema } from "@/lib/validations/publishing";
import { getEmergencyStopStatus, setEmergencyStopStatus } from "@/lib/publishing/emergency";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const supabase = await createClient();
    const status = await getEmergencyStopStatus(supabase);

    return NextResponse.json(status);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const validation = EmergencyStopSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Invalid emergency stop parameters." }, { status: 400 });
    }

    const supabase = await createClient();
    const updated = await setEmergencyStopStatus(
      supabase,
      validation.data.paused,
      validation.data.reason
    );

    // If pausing, cancel all non-in-flight queued jobs or flag in system logs
    if (validation.data.paused) {
      await supabase.from("system_logs").insert({
        user_id: user.id,
        level: "warn",
        category: "publishing_emergency",
        message: `Global Emergency Stop activated: ${validation.data.reason || "Manual pause triggered by user."}`,
      });
    }

    return NextResponse.json({
      success: true,
      status: updated,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
