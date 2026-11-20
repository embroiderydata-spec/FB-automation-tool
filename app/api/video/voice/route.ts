import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { createClient } from "@/lib/supabase/server";
import { VoiceGenerateSchema } from "@/lib/validations/video";
import { getVoiceProvider } from "@/lib/video/providers";
import { ELEVENLABS_UNCONFIGURED_MESSAGE } from "@/lib/video/config";

export const dynamic = "force-dynamic";

/**
 * GET /api/video/voice
 * Returns list of available voice models for ElevenLabs synthesis.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const provider = getVoiceProvider();
    const voices = await provider.getVoices();

    return NextResponse.json({
      is_configured: provider.isConfigured(),
      voices,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/video/voice
 * Synthesizes voiceover narration audio using ElevenLabs.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const validation = VoiceGenerateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed.", details: validation.error.format() },
        { status: 400 }
      );
    }

    const { text, voice_id, stability, similarity_boost, speed } = validation.data;
    const provider = getVoiceProvider();

    if (!provider.isConfigured()) {
      return NextResponse.json(
        { error: ELEVENLABS_UNCONFIGURED_MESSAGE },
        { status: 400 }
      );
    }

    const result = await provider.generateSpeech({
      text,
      voiceId: voice_id,
      stability,
      similarityBoost: similarity_boost,
      speed,
    });

    const supabase = await createClient();
    const base64Audio = result.audioBuffer.toString("base64");
    const audioDataUrl = `data:audio/mp3;base64,${base64Audio}`;

    // Record voiceover asset in media_assets
    try {
      await supabase.from("media_assets").insert({
        user_id: user.id,
        asset_name: `Voiceover: ${text.slice(0, 30)}...`,
        asset_type: "voiceover",
        storage_path: `voiceovers/vo_${Date.now()}.mp3`,
        public_url: audioDataUrl,
        duration_seconds: result.durationSeconds,
        provider: "ElevenLabs",
        metadata: {
          voice_id: result.voiceId,
          word_count: text.split(/\s+/).length,
          cost_usd: result.costUsd || 0.01,
        },
      });
    } catch (saveErr) {
      console.warn("[POST /api/video/voice] Could not save to media_assets:", saveErr);
    }

    return NextResponse.json({
      success: true,
      audio_url: audioDataUrl,
      duration_seconds: result.durationSeconds,
      word_timestamps: result.wordTimestamps || [],
      cost_usd: result.costUsd,
    });
  } catch (err: any) {
    console.error("[POST /api/video/voice] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to generate voiceover." },
      { status: 500 }
    );
  }
}
