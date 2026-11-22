import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import {
  getClipRenderJob,
  cancelClipRenderJob,
  updateClipRenderJob,
} from "@/lib/clipper/render-jobs";
import { executeRenderJob } from "@/lib/clipper/render-manager";

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

    const job = await getClipRenderJob(params.id, user.id);
    if (!job) {
      return NextResponse.json({ error: "Render job not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      job,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to fetch render job status." },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const action = body.action || "cancel";

    if (action === "cancel") {
      const ok = await cancelClipRenderJob(params.id, user.id);
      return NextResponse.json({ success: ok, message: "Job cancelled." });
    }

    if (action === "retry") {
      const existingJob = await getClipRenderJob(params.id, user.id);
      if (!existingJob) {
        return NextResponse.json({ error: "Render job not found." }, { status: 404 });
      }

      await updateClipRenderJob(params.id, user.id, {
        status: "queued",
        progress: 0,
        error_message: undefined,
      });

      // Execute retry
      const result = await executeRenderJob({
        ...existingJob,
        status: "queued",
        progress: 0,
      });

      return NextResponse.json({
        success: result.success,
        job: result.job,
        error: result.error,
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to process job action." },
      { status: 500 }
    );
  }
}
