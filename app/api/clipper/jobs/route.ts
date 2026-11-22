import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { getUserClipRenderJobs } from "@/lib/clipper/render-jobs";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const jobs = await getUserClipRenderJobs(user.id);
    return NextResponse.json({
      success: true,
      jobs,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to load render jobs." },
      { status: 500 }
    );
  }
}
