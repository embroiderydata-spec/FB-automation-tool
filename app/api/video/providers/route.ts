import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { checkAllProvidersStatus, getVideoProvider, getVoiceProvider, getImageProvider } from "@/lib/video/providers";

export const dynamic = "force-dynamic";

/**
 * GET /api/video/providers
 * Returns configuration and readiness status for Replicate, Runway, ElevenLabs, and DALL-E.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const providers = await checkAllProvidersStatus();
    return NextResponse.json({ providers });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/video/providers
 * Tests live connection for a specified provider.
 * Only returns connected: true when an actual successful API handshake occurred.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const providerName = (body.provider || "replicate").toLowerCase();

    let result = { success: false, message: "Unknown provider" };

    if (providerName.includes("replicate")) {
      const provider = getVideoProvider("replicate");
      result = await provider.testConnection();
    } else if (providerName.includes("runway")) {
      const provider = getVideoProvider("runway");
      result = await provider.testConnection();
    } else if (providerName.includes("elevenlabs")) {
      const provider = getVoiceProvider("elevenlabs");
      result = await provider.testConnection();
    } else if (providerName.includes("openai")) {
      const provider = getImageProvider("openai");
      result = await provider.testConnection();
    } else if (providerName.includes("meta")) {
      const appId = process.env.META_APP_ID;
      const appSecret = process.env.META_APP_SECRET;
      if (!appId || !appSecret) {
        result = {
          success: false,
          message: "META_APP_ID and META_APP_SECRET not configured in .env.local",
        };
      } else {
        try {
          const testRes = await fetch(
            `https://graph.facebook.com/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&grant_type=client_credentials`
          );
          const data = await testRes.json();
          if (data.access_token) {
            result = { success: true, message: "Meta Graph API v21.0 Handshake Verified" };
          } else {
            result = {
              success: false,
              message: data.error?.message || "Invalid Meta App Credentials",
            };
          }
        } catch (mErr: any) {
          result = { success: false, message: mErr.message || "Meta API connection failed" };
        }
      }
    }

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || "Connection test failed." },
      { status: 500 }
    );
  }
}
