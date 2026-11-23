import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { runFFmpegDiagnostics } from "@/lib/clipper/ffmpeg-engine";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const diag = runFFmpegDiagnostics();

    return NextResponse.json({
      success: true,
      diagnostics: diag,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to run engine diagnostics." },
      { status: 500 }
    );
  }
}
