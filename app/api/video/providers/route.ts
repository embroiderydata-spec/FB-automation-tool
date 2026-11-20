import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { checkAllProvidersStatus } from "@/lib/video/providers";
import {
  getProviderApiKey,
  testLiveProviderConnection,
  updateProviderTestStatus,
  getAllProviderStatuses,
} from "@/lib/ai/provider-keys";

export const dynamic = "force-dynamic";

/**
 * GET /api/video/providers
 * Returns configuration and readiness status across all AI providers.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const videoStatuses = await checkAllProvidersStatus();
    const allStatuses = await getAllProviderStatuses(user.id, user.email);

    // Merge status data
    const mergedProviders = {
      ...videoStatuses,
      openai: {
        name: "OpenAI",
        is_configured: allStatuses.openai?.is_configured ?? false,
        capabilities: ["LLM Scripting", "Viral Hooks", "DALL-E 3 Keyframes"],
        default_model: allStatuses.openai?.default_model || "gpt-4o",
        masked_key: allStatuses.openai?.masked_key,
      },
      anthropic: {
        name: "Anthropic",
        is_configured: allStatuses.anthropic?.is_configured ?? false,
        capabilities: ["Claude 3.5 Sonnet", "Script Adaptation", "Creative Prompts"],
        default_model: allStatuses.anthropic?.default_model || "claude-3-5-sonnet-20241022",
        masked_key: allStatuses.anthropic?.masked_key,
      },
      groq: {
        name: "Groq",
        is_configured: allStatuses.groq?.is_configured ?? false,
        capabilities: ["LPU Ultra-Fast Inference", "Llama 3.3 70B", "Real-time Rewriting"],
        default_model: allStatuses.groq?.default_model || "llama-3.3-70b-versatile",
        masked_key: allStatuses.groq?.masked_key,
      },
      google: {
        name: "Google AI / Gemini",
        is_configured: allStatuses.google?.is_configured ?? false,
        capabilities: ["Gemini 1.5 Pro", "Multimodal Video Reasoning"],
        default_model: allStatuses.google?.default_model || "gemini-1.5-pro",
        masked_key: allStatuses.google?.masked_key,
      },
    };

    return NextResponse.json({ providers: mergedProviders, allProviders: allStatuses });
  } catch (err: any) {
    console.error("[GET /api/video/providers] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/video/providers
 * Tests live connection for a specified provider.
 * Only returns success: true when an actual successful API handshake occurred.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const providerName = (body.provider || "openai").toLowerCase();

    // Check if key sent in body or fetch stored key
    let apiKey = body.api_key;
    let baseUrl = body.base_url;
    let model = body.default_model;

    if (!apiKey) {
      const stored = await getProviderApiKey(providerName, user.id, user.email);
      apiKey = stored.apiKey;
      if (!baseUrl) baseUrl = stored.baseUrl;
      if (!model) model = stored.model;
    }

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        message: `No API key configured for ${providerName}. Please enter and save an API key.`,
      });
    }

    const testResult = await testLiveProviderConnection(providerName, apiKey, baseUrl, model);

    await updateProviderTestStatus(
      user.id,
      user.email,
      providerName,
      testResult.success ? "connected" : "invalid_key",
      testResult.success ? undefined : testResult.message
    );

    return NextResponse.json(testResult);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || "Connection test failed." },
      { status: 500 }
    );
  }
}
