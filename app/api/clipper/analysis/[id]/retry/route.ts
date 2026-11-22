import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { getAnalysisJob, updateAnalysisJob } from "@/lib/clipper/analysis-jobs";
import { executeFullVideoAnalysis } from "@/lib/clipper/full-video-analyzer";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { id } = params;
    const existing = await getAnalysisJob(id, user.id);
    if (!existing) {
      return NextResponse.json({ error: "Analysis job not found." }, { status: 404 });
    }

    await updateAnalysisJob(id, {
      status: "queued",
      progress: 5,
      current_stage: "fetching",
      stage_label: "Retrying full video analysis...",
      error_message: undefined,
    });

    executeFullVideoAnalysis(id, {
      videoUrl: existing.video_url,
      userId: user.id,
      sourceType: existing.source_type,
      title: existing.title,
      duration: existing.duration,
      clipCount: existing.clip_count,
      durationPreset: existing.duration_preset,
      targetPlatform: existing.target_platform,
      language: existing.language,
      aiInstructions: existing.ai_instructions,
      topicQuery: existing.topic_query,
    }).catch((err) => {
      console.error(`Retry analysis failed for job ${id}:`, err);
    });

    return NextResponse.json({
      success: true,
      message: "Analysis retry started.",
      jobId: id,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to retry analysis job." },
      { status: 500 }
    );
  }
}
