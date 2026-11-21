import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import {
  parseVideoUrl,
  fetchYouTubeMetadata,
  analyzeVideoViralMoments,
} from "@/lib/clipper/ai-analyzer";
import { probeVideoFile } from "@/lib/clipper/ffmpeg-engine";
import { VideoAnalysisResult } from "@/lib/clipper/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const { url, auto_clip = false, max_clips = 3 } = body;

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

    let analysis: VideoAnalysisResult;

    if (parsed.type === "youtube" && parsed.videoId) {
      // 1. YouTube Video Analysis
      const meta = await fetchYouTubeMetadata(parsed.videoId);

      analysis = await analyzeVideoViralMoments({
        videoUrl: parsed.url,
        sourceType: "youtube",
        videoId: parsed.videoId,
        title: meta.title,
        author: meta.author,
        duration: meta.durationSeconds || 300,
        resolution: "1920x1080",
        thumbnailUrl: meta.thumbnail,
        transcript: meta.transcript,
        userId: user.id,
      });
    } else {
      // 2. Direct Video URL or Storage Video Analysis
      let duration = 60;
      let resolution = "1920x1080";
      let title = "Direct Video";

      try {
        const probed = probeVideoFile(parsed.url);
        if (probed && probed.duration > 0) {
          duration = probed.duration;
          resolution = probed.resolution;
        }
      } catch {}

      try {
        const urlObj = new URL(parsed.url);
        const fileName = urlObj.pathname.split("/").pop() || "Video";
        title = decodeURIComponent(fileName)
          .replace(/\.[^/.]+$/, "")
          .replace(/[-_]/g, " ");
      } catch {}

      analysis = await analyzeVideoViralMoments({
        videoUrl: parsed.url,
        sourceType: "direct_url",
        title: title || "Direct Video Stream",
        duration: Math.max(15, duration),
        resolution,
        thumbnailUrl: undefined,
        userId: user.id,
      });
    }

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error: any) {
    console.error("Video analysis error:", error);
    return NextResponse.json(
      {
        error:
          error?.message ||
          "Failed to analyze video. Please verify the link is accessible or upload the video directly.",
      },
      { status: 500 }
    );
  }
}
