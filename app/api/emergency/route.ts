import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { createClient } from "@/lib/supabase/server";
import {
  getGlobalEmergencyStatus,
  activateEmergencyStop,
  deactivateEmergencyStop,
} from "@/lib/security/emergency";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const status = await getGlobalEmergencyStatus(supabase);
    return NextResponse.json({ status });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to fetch emergency status." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const { action, reason, confirmation } = body;

    const supabase = await createClient();

    if (action === "pause") {
      if (confirmation !== "CONFIRM_EMERGENCY_STOP") {
        return NextResponse.json(
          { error: "Confirmation token 'CONFIRM_EMERGENCY_STOP' required to pause platform operations." },
          { status: 400 }
        );
      }
      const updated = await activateEmergencyStop(supabase, reason, user.email || user.id);
      return NextResponse.json({ success: true, status: updated });
    }

    if (action === "resume") {
      if (confirmation !== "CONFIRM_RESUME") {
        return NextResponse.json(
          { error: "Confirmation token 'CONFIRM_RESUME' required to resume platform operations." },
          { status: 400 }
        );
      }
      const updated = await deactivateEmergencyStop(supabase, user.email || user.id);
      return NextResponse.json({ success: true, status: updated });
    }

    return NextResponse.json({ error: "Invalid action. Supported: 'pause', 'resume'." }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Emergency action failed." },
      { status: 500 }
    );
  }
}
