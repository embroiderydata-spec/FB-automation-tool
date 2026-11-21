import { encryptToken, decryptToken } from "@/lib/crypto/encryption";
import { createClient as createDirectSupabase } from "@supabase/supabase-js";
import { DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY } from "@/lib/supabase/client";
import * as fs from "fs";
import * as path from "path";
import crypto from "crypto";

export interface YouTubeAccountRecord {
  id: string;
  user_id: string;
  channel_id: string;
  channel_title: string;
  channel_custom_url?: string;
  thumbnail_url?: string;
  subscriber_count: number;
  video_count: number;
  encrypted_access_token: string;
  encrypted_refresh_token?: string;
  token_expires_at?: string;
  is_connected: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface YouTubeUploadOptions {
  title: string;
  description?: string;
  tags?: string[];
  privacyStatus: "public" | "unlisted" | "private";
  videoUrl: string;
  isShort?: boolean;
}

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
  return createDirectSupabase(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function getLocalYouTubePath(userId: string): string {
  const dataDir = path.join(process.cwd(), ".data");
  if (!fs.existsSync(dataDir)) {
    try {
      fs.mkdirSync(dataDir, { recursive: true });
    } catch {}
  }
  return path.join(dataDir, `youtube-accounts-${userId}.json`);
}

function readLocalYouTube(userId: string): YouTubeAccountRecord[] {
  try {
    const p = getLocalYouTubePath(userId);
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, "utf-8"));
    }
  } catch {}
  return [];
}

function writeLocalYouTube(userId: string, accounts: YouTubeAccountRecord[]) {
  try {
    const p = getLocalYouTubePath(userId);
    fs.writeFileSync(p, JSON.stringify(accounts, null, 2), "utf-8");
  } catch {}
}

export function getYouTubeOAuthClientId(): string {
  return process.env.GOOGLE_CLIENT_ID || process.env.YOUTUBE_CLIENT_ID || "";
}

export function getYouTubeOAuthClientSecret(): string {
  return process.env.GOOGLE_CLIENT_SECRET || process.env.YOUTUBE_CLIENT_SECRET || "";
}

export function getYouTubeRedirectUri(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return process.env.YOUTUBE_REDIRECT_URI || `${appUrl}/api/youtube/callback`;
}

export function getYouTubeAuthUrl(state: string = ""): string {
  const clientId = getYouTubeOAuthClientId();
  const redirectUri = encodeURIComponent(getYouTubeRedirectUri());
  const scope = encodeURIComponent(
    "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/userinfo.profile"
  );
  return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent&state=${encodeURIComponent(
    state
  )}`;
}

export async function exchangeYouTubeCode(code: string, redirectUri: string) {
  const clientId = getYouTubeOAuthClientId();
  const clientSecret = getYouTubeOAuthClientSecret();

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(data.error_description || data.error || "Failed to exchange authorization code for tokens.");
  }

  return {
    accessToken: data.access_token as string,
    refreshToken: data.refresh_token as string | undefined,
    expiresIn: data.expires_in as number,
  };
}

export async function fetchYouTubeChannelInfo(accessToken: string) {
  const response = await fetch(
    "https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails,statistics&mine=true",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    }
  );

  const data = await response.json();
  if (!response.ok || !data.items || data.items.length === 0) {
    throw new Error(data.error?.message || "No YouTube channel found for the authenticated Google account.");
  }

  const channel = data.items[0];
  return {
    channelId: channel.id as string,
    channelTitle: channel.snippet?.title || "My YouTube Channel",
    customUrl: channel.snippet?.customUrl || "",
    thumbnailUrl: channel.snippet?.thumbnails?.default?.url || "",
    subscriberCount: Number(channel.statistics?.subscriberCount || 0),
    videoCount: Number(channel.statistics?.videoCount || 0),
  };
}

export async function saveYouTubeAccount(
  userId: string,
  accountInfo: {
    channelId: string;
    channelTitle: string;
    customUrl?: string;
    thumbnailUrl?: string;
    subscriberCount?: number;
    videoCount?: number;
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
  }
): Promise<YouTubeAccountRecord> {
  const now = new Date();
  const expiresAt = accountInfo.expiresIn
    ? new Date(now.getTime() + accountInfo.expiresIn * 1000).toISOString()
    : undefined;

  const record: YouTubeAccountRecord = {
    id: crypto.randomUUID(),
    user_id: userId,
    channel_id: accountInfo.channelId,
    channel_title: accountInfo.channelTitle,
    channel_custom_url: accountInfo.customUrl,
    thumbnail_url: accountInfo.thumbnailUrl,
    subscriber_count: accountInfo.subscriberCount || 0,
    video_count: accountInfo.videoCount || 0,
    encrypted_access_token: encryptToken(accountInfo.accessToken),
    encrypted_refresh_token: accountInfo.refreshToken ? encryptToken(accountInfo.refreshToken) : undefined,
    token_expires_at: expiresAt,
    is_connected: true,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };

  const service = getServiceSupabase();

  // 1. Try public.youtube_accounts table
  try {
    await service.from("youtube_accounts").upsert(
      {
        ...record,
      },
      { onConflict: "user_id, channel_id" }
    );
  } catch {}

  // 2. Try Supabase Auth user metadata
  try {
    const existing = await getYouTubeAccounts(userId);
    const updated = [record, ...existing.filter((a) => a.channel_id !== accountInfo.channelId)];
    await service.auth.admin.updateUserById(userId, {
      user_metadata: {
        youtube_accounts: updated,
      },
    });
  } catch {}

  // 3. Update local cache
  const localList = readLocalYouTube(userId);
  const updatedLocal = [record, ...localList.filter((a) => a.channel_id !== accountInfo.channelId)];
  writeLocalYouTube(userId, updatedLocal);

  return record;
}

export async function getYouTubeAccounts(userId: string): Promise<YouTubeAccountRecord[]> {
  const service = getServiceSupabase();

  // 1. Try public.youtube_accounts
  try {
    const { data, error } = await service
      .from("youtube_accounts")
      .select("*")
      .eq("user_id", userId)
      .eq("is_connected", true);

    if (!error && Array.isArray(data) && data.length > 0) {
      writeLocalYouTube(userId, data);
      return data;
    }
  } catch {}

  // 2. Try Supabase Auth metadata
  try {
    const { data: userData, error: userError } = await service.auth.admin.getUserById(userId);
    if (!userError && userData?.user?.user_metadata?.youtube_accounts) {
      const metaAccounts = userData.user.user_metadata.youtube_accounts;
      if (Array.isArray(metaAccounts) && metaAccounts.length > 0) {
        writeLocalYouTube(userId, metaAccounts);
        return metaAccounts;
      }
    }
  } catch {}

  // 3. Fallback to local cache
  return readLocalYouTube(userId);
}

export async function disconnectYouTubeAccount(userId: string, channelId: string): Promise<boolean> {
  const service = getServiceSupabase();

  try {
    await service.from("youtube_accounts").delete().eq("user_id", userId).eq("channel_id", channelId);
  } catch {}

  try {
    const existing = await getYouTubeAccounts(userId);
    const filtered = existing.filter((a) => a.channel_id !== channelId);
    await service.auth.admin.updateUserById(userId, {
      user_metadata: {
        youtube_accounts: filtered,
      },
    });
  } catch {}

  const localList = readLocalYouTube(userId);
  const updatedLocal = localList.filter((a) => a.channel_id !== channelId);
  writeLocalYouTube(userId, updatedLocal);

  return true;
}

export async function refreshYouTubeAccessToken(account: YouTubeAccountRecord): Promise<string> {
  if (!account.encrypted_refresh_token) {
    return decryptToken(account.encrypted_access_token);
  }

  const refreshToken = decryptToken(account.encrypted_refresh_token);
  const clientId = getYouTubeOAuthClientId();
  const clientSecret = getYouTubeOAuthClientSecret();

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await response.json();
  if (!response.ok || data.error) {
    // If refresh fails, return decrypted existing access token
    return decryptToken(account.encrypted_access_token);
  }

  const newAccessToken = data.access_token as string;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + (data.expires_in || 3600) * 1000).toISOString();

  // Update in background
  const service = getServiceSupabase();
  const updatedEncrypted = encryptToken(newAccessToken);
  try {
    await service
      .from("youtube_accounts")
      .update({
        encrypted_access_token: updatedEncrypted,
        token_expires_at: expiresAt,
        updated_at: now.toISOString(),
      })
      .eq("id", account.id);
  } catch {}

  return newAccessToken;
}

export async function uploadVideoToYouTube(
  account: YouTubeAccountRecord,
  options: YouTubeUploadOptions
): Promise<{ videoId: string; videoUrl: string }> {
  const accessToken = await refreshYouTubeAccessToken(account);

  const titleWithShorts =
    options.isShort && !options.title.toLowerCase().includes("#shorts")
      ? `${options.title} #Shorts`
      : options.title;

  const descriptionWithShorts =
    options.isShort && !options.description?.toLowerCase().includes("#shorts")
      ? `${options.description || ""}\n\n#Shorts #Reels`
      : options.description || "";

  // 1. Initialize Resumable Upload Session
  const initResponse = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": "video/mp4",
      },
      body: JSON.stringify({
        snippet: {
          title: titleWithShorts.slice(0, 100),
          description: descriptionWithShorts.slice(0, 5000),
          tags: options.tags || ["automation", "shorts", "reels"],
          categoryId: "22", // People & Blogs
        },
        status: {
          privacyStatus: options.privacyStatus || "public",
          selfDeclaredMadeForKids: false,
        },
      }),
    }
  );

  if (!initResponse.ok) {
    const errText = await initResponse.text();
    throw new Error(`YouTube API upload initialization failed: ${errText}`);
  }

  const uploadLocation = initResponse.headers.get("Location");
  if (!uploadLocation) {
    throw new Error("YouTube API did not return a resumable upload location URL.");
  }

  // 2. Fetch video binary from source URL
  const videoBlobResponse = await fetch(options.videoUrl);
  if (!videoBlobResponse.ok) {
    throw new Error(`Failed to download video binary from ${options.videoUrl}`);
  }
  const videoBuffer = await videoBlobResponse.arrayBuffer();

  // 3. Upload binary to YouTube resumable session
  const uploadResponse = await fetch(uploadLocation, {
    method: "PUT",
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": videoBuffer.byteLength.toString(),
    },
    body: videoBuffer,
  });

  const uploadResult = await uploadResponse.json();
  if (!uploadResponse.ok || !uploadResult.id) {
    throw new Error(uploadResult.error?.message || "YouTube upload stream failed.");
  }

  const videoId = uploadResult.id as string;
  const videoUrl = options.isShort
    ? `https://youtube.com/shorts/${videoId}`
    : `https://www.youtube.com/watch?v=${videoId}`;

  return { videoId, videoUrl };
}
