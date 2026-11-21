import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import {
  exchangeYouTubeCode,
  fetchYouTubeChannelInfo,
  saveYouTubeAccount,
  getYouTubeRedirectUri,
} from "@/lib/publishing/youtube";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const state = url.searchParams.get("state");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (error) {
    return NextResponse.redirect(
      `${baseUrl}/dashboard/youtube?youtube_error=${encodeURIComponent(error)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${baseUrl}/dashboard/youtube?youtube_error=${encodeURIComponent("No authorization code provided.")}`
    );
  }

  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.redirect(`${baseUrl}/login?redirect=/dashboard/youtube`);
    }

    const redirectUri = getYouTubeRedirectUri();
    const tokenData = await exchangeYouTubeCode(code, redirectUri);
    const channelInfo = await fetchYouTubeChannelInfo(tokenData.accessToken);

    await saveYouTubeAccount(user.id, {
      channelId: channelInfo.channelId,
      channelTitle: channelInfo.channelTitle,
      customUrl: channelInfo.customUrl,
      thumbnailUrl: channelInfo.thumbnailUrl,
      subscriberCount: channelInfo.subscriberCount,
      videoCount: channelInfo.videoCount,
      accessToken: tokenData.accessToken,
      refreshToken: tokenData.refreshToken,
      expiresIn: tokenData.expiresIn,
    });

    return NextResponse.redirect(
      `${baseUrl}/dashboard/youtube?youtube_success=${encodeURIComponent(
        `Successfully connected YouTube channel "${channelInfo.channelTitle}"!`
      )}`
    );
  } catch (err: any) {
    return NextResponse.redirect(
      `${baseUrl}/dashboard/youtube?youtube_error=${encodeURIComponent(err.message || "Failed to connect YouTube account.")}`
    );
  }
}
