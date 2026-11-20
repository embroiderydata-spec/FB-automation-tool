import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import {
  getAllProviderStatuses,
  saveUserProviderKey,
  deleteUserProviderKey,
  getProviderApiKey,
  testLiveProviderConnection,
  updateProviderTestStatus,
  SUPPORTED_PROVIDERS,
} from "@/lib/ai/provider-keys";

export const dynamic = "force-dynamic";

/**
 * GET /api/ai/providers/keys
 * Returns public configuration status for all supported providers.
 * Masked keys only — plaintext keys are NEVER exposed.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const statuses = await getAllProviderStatuses(user.id, user.email);
    return NextResponse.json({
      success: true,
      providers: statuses,
      definitions: SUPPORTED_PROVIDERS,
    });
  } catch (err: any) {
    console.error("[GET /api/ai/providers/keys] Error:", err?.message);
    return NextResponse.json({ error: err?.message || "Failed to retrieve provider keys." }, { status: 500 });
  }
}

/**
 * POST /api/ai/providers/keys
 * Saves or updates an encrypted API key for a provider.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const body = await request.json();
    const { provider, api_key, base_url, default_model } = body;

    if (!provider || !api_key) {
      return NextResponse.json({ error: "Provider and API Key are required." }, { status: 400 });
    }

    const saved = await saveUserProviderKey(
      user.id,
      user.email,
      provider,
      api_key,
      base_url,
      default_model
    );

    return NextResponse.json({
      success: true,
      message: `API Key for ${provider} saved securely.`,
      provider: saved,
    });
  } catch (err: any) {
    console.error("[POST /api/ai/providers/keys] Error:", err?.message);
    return NextResponse.json({ error: err?.message || "Failed to save API key." }, { status: 500 });
  }
}

/**
 * DELETE /api/ai/providers/keys
 * Removes the stored API key for a provider.
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const provider = searchParams.get("provider");

    if (!provider) {
      return NextResponse.json({ error: "Provider parameter is required." }, { status: 400 });
    }

    await deleteUserProviderKey(user.id, user.email, provider);

    return NextResponse.json({
      success: true,
      message: `API key for ${provider} removed.`,
    });
  } catch (err: any) {
    console.error("[DELETE /api/ai/providers/keys] Error:", err?.message);
    return NextResponse.json({ error: err?.message || "Failed to delete API key." }, { status: 500 });
  }
}
