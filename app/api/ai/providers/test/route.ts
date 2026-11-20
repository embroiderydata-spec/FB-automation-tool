import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import {
  getProviderApiKey,
  testLiveProviderConnection,
  updateProviderTestStatus,
} from "@/lib/ai/provider-keys";

export const dynamic = "force-dynamic";

/**
 * POST /api/ai/providers/test
 * Tests the live connection to an AI provider.
 * Uses either the provided API key or the securely stored encrypted key.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const body = await request.json();
    const provider = body.provider?.toLowerCase();

    if (!provider) {
      return NextResponse.json({ error: "Provider is required." }, { status: 400 });
    }

    let apiKey = body.api_key;
    let baseUrl = body.base_url;
    let model = body.default_model;

    // If key not sent in request body, retrieve securely stored key
    if (!apiKey) {
      const stored = await getProviderApiKey(provider, user.id, user.email);
      apiKey = stored.apiKey;
      if (!baseUrl) baseUrl = stored.baseUrl;
      if (!model) model = stored.model;
    }

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          message: `No API key configured for ${provider}. Please enter a valid API key.`,
          latencyMs: 0,
        },
        { status: 400 }
      );
    }

    const testResult = await testLiveProviderConnection(provider, apiKey, baseUrl, model);

    // Update test status in database
    await updateProviderTestStatus(
      user.id,
      user.email,
      provider,
      testResult.success ? "connected" : "invalid_key",
      testResult.success ? undefined : testResult.message
    );

    return NextResponse.json(testResult);
  } catch (err: any) {
    console.error("[POST /api/ai/providers/test] Error:", err?.message);
    return NextResponse.json(
      {
        success: false,
        message: err?.message || "Connection test encountered an internal error.",
        latencyMs: 0,
      },
      { status: 500 }
    );
  }
}
