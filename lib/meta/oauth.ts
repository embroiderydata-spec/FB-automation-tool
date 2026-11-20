import crypto from "crypto";
import { META_CONFIG, getGraphApiBaseUrl } from "./config";

export interface MetaTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

export interface MetaUserInfo {
  id: string;
  name: string;
  email?: string;
}

/**
 * Generates a cryptographically secure random state parameter for CSRF mitigation in OAuth.
 */
export function generateOAuthState(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Validates the OAuth callback state against the state cookie.
 */
export function validateOAuthState(stateParam: string | null, stateCookie: string | null): boolean {
  if (!stateParam || !stateCookie) return false;
  return crypto.timingSafeEqual(Buffer.from(stateParam), Buffer.from(stateCookie));
}

/**
 * Exchanges the temporary authorization code received in the callback for a short-lived user access token.
 */
export async function exchangeCodeForToken(code: string): Promise<MetaTokenResponse> {
  const url = `${getGraphApiBaseUrl()}/oauth/access_token`;
  const params = new URLSearchParams({
    client_id: META_CONFIG.appId,
    client_secret: META_CONFIG.appSecret,
    redirect_uri: META_CONFIG.redirectUri,
    code,
  });

  const response = await fetch(`${url}?${params.toString()}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    const errorMsg = data.error?.message || "Failed to exchange authorization code for Meta access token.";
    throw new Error(`Meta OAuth Exchange Error: ${errorMsg}`);
  }

  return data as MetaTokenResponse;
}

/**
 * Exchanges a short-lived user token (~1-2 hours) for a long-lived 60-day user token.
 */
export async function exchangeForLongLivedToken(shortLivedToken: string): Promise<MetaTokenResponse> {
  const url = `${getGraphApiBaseUrl()}/oauth/access_token`;
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: META_CONFIG.appId,
    client_secret: META_CONFIG.appSecret,
    fb_exchange_token: shortLivedToken,
  });

  const response = await fetch(`${url}?${params.toString()}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    // If long-lived exchange fails, return short-lived token as fallback
    return {
      access_token: shortLivedToken,
      token_type: "bearer",
    };
  }

  return data as MetaTokenResponse;
}

/**
 * Retrieves the basic profile info of the authenticated Facebook user.
 */
export async function getFacebookUserInfo(accessToken: string): Promise<MetaUserInfo> {
  const url = `${getGraphApiBaseUrl()}/me?fields=id,name,email&access_token=${encodeURIComponent(accessToken)}`;

  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(`Failed to fetch Meta user profile: ${data.error?.message || "Unknown error"}`);
  }

  return data as MetaUserInfo;
}
