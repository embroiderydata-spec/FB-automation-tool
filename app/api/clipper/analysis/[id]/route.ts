import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { getAnalysisJob, cancelAnalysisJob } from "@/lib/clipper/analysis-jobs";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: "Job ID is required." }, { status: 400 });
    }

    const job = await getAnalysisJob(id, user.id);
    if (!job) {
      return NextResponse.json({ error: "Analysis job not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      job,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to retrieve analysis job status." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { id } = params;
    await cancelAnalysisJob(id, user.id);

    return NextResponse.json({
      success: true,
      message: "Analysis job cancelled.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to cancel analysis job." },
      { status: 500 }
    );
  }
}
