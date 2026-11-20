import { NextResponse } from "next/server";
import { getOAuthDialogUrl, isMetaConfigured } from "@/lib/meta/config";
import { generateOAuthState } from "@/lib/meta/oauth";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";

export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    const url = new URL("/login", request.url);
    url.searchParams.set("error", "unauthorized");
    return NextResponse.redirect(url);
  }

  if (!isMetaConfigured()) {
    const url = new URL("/dashboard/pages", request.url);
    url.searchParams.set(
      "error",
      "meta_credentials_missing"
    );
    return NextResponse.redirect(url);
  }

  const state = generateOAuthState();
  const authUrl = getOAuthDialogUrl(state);

  const response = NextResponse.redirect(authUrl);

  // Set secure HTTP-only state cookie valid for 10 minutes (600s)
  response.cookies.set("meta_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  return response;
}
