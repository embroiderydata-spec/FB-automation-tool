import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { getYouTubeAuthUrl, getYouTubeOAuthClientId } from "@/lib/publishing/youtube";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const clientId = getYouTubeOAuthClientId();
    if (!clientId) {
      return NextResponse.json(
        {
          error: "Google/YouTube OAuth credentials not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local or platform settings.",
        },
        { status: 400 }
      );
    }

    const state = JSON.stringify({ userId: user.id, timestamp: Date.now() });
    const authUrl = getYouTubeAuthUrl(state);

    const { searchParams } = new URL(request.url);
    if (searchParams.get("redirect") === "true") {
      return NextResponse.redirect(authUrl);
    }

    return NextResponse.json({ authUrl });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
