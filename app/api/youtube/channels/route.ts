import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import {
  getYouTubeAccounts,
  disconnectYouTubeAccount,
  getYouTubeAuthUrl,
  getYouTubeOAuthClientId,
} from "@/lib/publishing/youtube";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const accounts = await getYouTubeAccounts(user.id);
    const clientId = getYouTubeOAuthClientId();

    // Mask sensitive tokens for client consumption
    const safeAccounts = accounts.map((acc) => ({
      id: acc.id,
      channel_id: acc.channel_id,
      channel_title: acc.channel_title,
      channel_custom_url: acc.channel_custom_url,
      thumbnail_url: acc.thumbnail_url,
      subscriber_count: acc.subscriber_count,
      video_count: acc.video_count,
      is_connected: acc.is_connected,
      created_at: acc.created_at,
    }));

    return NextResponse.json({
      accounts: safeAccounts,
      isConfigured: Boolean(clientId),
      authUrl: clientId ? getYouTubeAuthUrl(JSON.stringify({ userId: user.id })) : null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get("channel_id");

    if (!channelId) {
      return NextResponse.json({ error: "channel_id parameter is required." }, { status: 400 });
    }

    await disconnectYouTubeAccount(user.id, channelId);
    return NextResponse.json({ success: true, message: "YouTube channel disconnected successfully." });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
