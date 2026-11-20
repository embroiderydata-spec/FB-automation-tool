import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { SubtitleGenerateSchema } from "@/lib/validations/video";
import {
  SUBTITLE_PRESETS,
  buildSubtitleCues,
  generateSRT,
  generateASS,
} from "@/lib/video/subtitles/engine";

export const dynamic = "force-dynamic";

/**
 * POST /api/video/subtitles
 * Formats scene narration into accurate SRT and ASS subtitles styled for 9:16 mobile Reels.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const validation = SubtitleGenerateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed.", details: validation.error.format() },
        { status: 400 }
      );
    }

    const { preset, scenes } = validation.data;
    const presetConfig = SUBTITLE_PRESETS[preset] || SUBTITLE_PRESETS.bold_viral;

    const cues = buildSubtitleCues(scenes);
    const srtText = generateSRT(cues);
    const assText = generateASS(cues, presetConfig);

    return NextResponse.json({
      success: true,
      preset: presetConfig,
      cues,
      srt: srtText,
      ass: assText,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
