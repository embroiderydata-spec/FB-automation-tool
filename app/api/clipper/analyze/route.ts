import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { parseVideoUrl, fetchYouTubeMetadata } from "@/lib/clipper/ai-analyzer";
import { probeVideoFile } from "@/lib/clipper/ffmpeg-engine";
import { createAnalysisJob } from "@/lib/clipper/analysis-jobs";
import { executeFullVideoAnalysis } from "@/lib/clipper/full-video-analyzer";
import { TargetPlatform, ClipDurationPreset } from "@/lib/clipper/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const {
      url,
      clip_count = 5,
      duration_range = "30-60",
      target_platform = "both",
      language = "auto",
      ai_instructions,
      topic_query,
    } = body;

    const isSync = request.nextUrl.searchParams.get("sync") === "true";

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "A valid video URL is required." },
        { status: 400 }
      );
    }

    const parsed = parseVideoUrl(url);
    if (!parsed.isValid) {
      return NextResponse.json(
        {
          error:
            parsed.error ||
            "Invalid video URL. Supported sources include YouTube and direct video links (MP4, MOV, WebM).",
        },
        { status: 400 }
      );
    }

    // Determine initial metadata
    let title = "Direct Video";
    let author = "Creator";
    let duration = 60;
    let thumbnailUrl: string | undefined;

    if (parsed.type === "youtube" && parsed.videoId) {
      const meta = await fetchYouTubeMetadata(parsed.videoId);
      title = meta.title || `YouTube Video (${parsed.videoId})`;
      author = meta.author || "YouTube Creator";
      duration = meta.durationSeconds || 300;
      thumbnailUrl = meta.thumbnail;
    } else {
      try {
        const probed = probeVideoFile(parsed.url);
        if (probed && probed.duration > 0) {
          duration = probed.duration;
        }
      } catch {}

      try {
        const urlObj = new URL(parsed.url);
        const fileName = urlObj.pathname.split("/").pop() || "Video";
        title = decodeURIComponent(fileName)
          .replace(/\.[^/.]+$/, "")
          .replace(/[-_]/g, " ");
      } catch {}
    }

    // Create persistent analysis job
    const job = await createAnalysisJob({
      userId: user.id,
      videoUrl: parsed.url,
      sourceType: parsed.type as any,
      videoId: parsed.videoId,
      title,
      author,
      duration,
      thumbnailUrl,
      clipCount: Number(clip_count) || 5,
      durationPreset: (duration_range as ClipDurationPreset) || "30-60",
      targetPlatform: (target_platform as TargetPlatform) || "both",
      language: language || "auto",
      aiInstructions: ai_instructions,
      topicQuery: topic_query,
    });

    const runAnalysisPromise = executeFullVideoAnalysis(job.id, {
      videoUrl: parsed.url,
      userId: user.id,
      sourceType: parsed.type as any,
      title,
      duration,
      clipCount: Number(clip_count) || 5,
      durationPreset: (duration_range as ClipDurationPreset) || "30-60",
      targetPlatform: (target_platform as TargetPlatform) || "both",
      language: language || "auto",
      aiInstructions: ai_instructions,
      topicQuery: topic_query,
    });

    // If sync requested (e.g. for deterministic automated testing), await completion
    if (isSync) {
      const completedJob = await runAnalysisPromise;
      return NextResponse.json({
        success: true,
        jobId: job.id,
        job: completedJob,
        analysis: {
          video_url: completedJob.video_url,
          source_type: completedJob.source_type,
          video_id: completedJob.video_id,
          title: completedJob.title,
          author: completedJob.author,
          duration: completedJob.duration,
          duration_formatted: `${Math.floor(completedJob.duration / 60)}:${Math.floor(completedJob.duration % 60).toString().padStart(2, "0")}`,
          resolution: "1920x1080",
          thumbnail_url: completedJob.thumbnail_url,
          transcript_available: (completedJob.transcript_cues || []).length > 0,
          transcript_cues: completedJob.transcript_cues,
          candidate_clips: completedJob.candidate_clips,
          analyzed_at: completedJob.created_at,
        },
      });
    }

    // Run in background and return job ID immediately for live progress tracking
    runAnalysisPromise.catch((err) => {
      console.error(`Background analysis error for job ${job.id}:`, err);
    });

    return NextResponse.json({
      success: true,
      jobId: job.id,
      status: job.status,
      current_stage: job.current_stage,
      stage_label: job.stage_label,
      progress: job.progress,
      job,
    });
  } catch (error: any) {
    console.error("Video analysis error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to initialize video analysis." },
      { status: 500 }
    );
  }
}
