import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { getLatestUserAnalysis } from "@/lib/clipper/analysis-jobs";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const latest = await getLatestUserAnalysis(user.id);

    return NextResponse.json({
      success: true,
      job: latest,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to retrieve latest analysis." },
      { status: 500 }
    );
  }
}
