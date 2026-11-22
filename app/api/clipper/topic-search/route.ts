import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { searchTranscriptForTopic } from "@/lib/clipper/ai-analyzer";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const { topic_query, transcript = [], video_duration = 300, video_title = "Video" } = body;

    if (!topic_query || typeof topic_query !== "string" || !topic_query.trim()) {
      return NextResponse.json(
        { error: "A valid topic or question query is required." },
        { status: 400 }
      );
    }

    const matchedClip = await searchTranscriptForTopic({
      topicQuery: topic_query,
      transcript,
      videoDuration: Number(video_duration) || 300,
      videoTitle: video_title || "Video",
      userId: user.id,
    });

    if (!matchedClip) {
      return NextResponse.json(
        {
          success: false,
          error: `No specific moment found matching: "${topic_query}". Try different keywords or browse candidate clips.`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      clip: matchedClip,
    });
  } catch (error: any) {
    console.error("Topic search error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to search topic." },
      { status: 500 }
    );
  }
}
