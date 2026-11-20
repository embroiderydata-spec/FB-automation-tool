import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { createClient } from "@/lib/supabase/server";
import { ImageGenerateSchema } from "@/lib/validations/video";
import { getImageProvider } from "@/lib/video/providers";

export const dynamic = "force-dynamic";

/**
 * POST /api/video/generate/image
 * Generates a vertical 9:16 keyframe image using DALL-E 3 or Replicate Flux.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const validation = ImageGenerateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed.", details: validation.error.format() },
        { status: 400 }
      );
    }

    const { prompt, aspect_ratio, quality, provider: requestedProvider } =
      validation.data;

    const provider = getImageProvider(requestedProvider);

    if (!provider.isConfigured()) {
      return NextResponse.json(
        {
          error:
            "Image generation provider is not configured. Add OPENAI_API_KEY or REPLICATE_API_TOKEN in environment settings.",
        },
        { status: 400 }
      );
    }

    const imageResult = await provider.generateImage({
      prompt,
      aspectRatio: aspect_ratio,
      quality,
    });

    const supabase = await createClient();

    // Save generated image to media_assets
    try {
      await supabase.from("media_assets").insert({
        user_id: user.id,
        asset_name: `Keyframe: ${prompt.slice(0, 40)}`,
        asset_type: "image",
        storage_path: imageResult.imageUrl,
        public_url: imageResult.imageUrl,
        width: imageResult.width,
        height: imageResult.height,
        provider: provider.name,
        metadata: {
          prompt,
          cost_usd: imageResult.costUsd || 0.04,
        },
      });
    } catch (saveErr) {
      console.warn("[POST /api/video/generate/image] Could not save to media_assets:", saveErr);
    }

    return NextResponse.json({
      success: true,
      image: imageResult,
      provider: provider.name,
    });
  } catch (err: any) {
    console.error("[POST /api/video/generate/image] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to generate image." },
      { status: 500 }
    );
  }
}
