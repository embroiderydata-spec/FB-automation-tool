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
  videoUrl?: string;
  videoBuffer?: Buffer | ArrayBuffer;
  categoryId?: string;
  madeForKids?: boolean;
  isShort?: boolean;
  thumbnailBuffer?: Buffer | ArrayBuffer;
  thumbnailMimeType?: string;
}

export interface YouTubeUploadRecord {
  id: string;
  user_id: string;
  channel_id: string;
  channel_title?: string;
  youtube_video_id: string;
  video_url: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  privacy_status: "public" | "unlisted" | "private";
  category_id?: string;
  is_short: boolean;
  tags?: string[];
  status: "uploaded" | "processing" | "failed";
  error_message?: string;
  created_at: string;
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
          categoryId: options.categoryId || "22", // Default: People & Blogs
        },
        status: {
          privacyStatus: options.privacyStatus || "public",
          selfDeclaredMadeForKids: options.madeForKids ?? false,
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

  // 2. Obtain video binary buffer (either directly provided or fetched from videoUrl)
  let videoBuffer: ArrayBuffer | Buffer;
  if (options.videoBuffer) {
    videoBuffer = options.videoBuffer;
  } else if (options.videoUrl) {
    const videoBlobResponse = await fetch(options.videoUrl);
    if (!videoBlobResponse.ok) {
      throw new Error(`Failed to download video binary from ${options.videoUrl}`);
    }
    videoBuffer = await videoBlobResponse.arrayBuffer();
  } else {
    throw new Error("No video buffer or video URL provided for YouTube upload.");
  }

  // 3. Upload binary to YouTube resumable session
  const uploadResponse = await fetch(uploadLocation, {
    method: "PUT",
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": videoBuffer.byteLength.toString(),
    },
    body: videoBuffer as any,
  });

  const uploadResult = await uploadResponse.json();
  if (!uploadResponse.ok || !uploadResult.id) {
    throw new Error(uploadResult.error?.message || "YouTube upload stream failed.");
  }

  const videoId = uploadResult.id as string;
  const videoUrl = options.isShort
    ? `https://youtube.com/shorts/${videoId}`
    : `https://www.youtube.com/watch?v=${videoId}`;

  // 4. Optional custom thumbnail upload
  if (options.thumbnailBuffer) {
    try {
      await fetch(
        `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${videoId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": options.thumbnailMimeType || "image/jpeg",
          },
          body: options.thumbnailBuffer as any,
        }
      );
    } catch (thumbErr) {
      console.warn("Custom thumbnail upload failed:", thumbErr);
    }
  }

  return { videoId, videoUrl };
}

function getLocalUploadHistoryPath(userId: string): string {
  const dataDir = path.join(process.cwd(), ".data");
  if (!fs.existsSync(dataDir)) {
    try {
      fs.mkdirSync(dataDir, { recursive: true });
    } catch {}
  }
  return path.join(dataDir, `youtube-uploads-${userId}.json`);
}

function readLocalUploadHistory(userId: string): YouTubeUploadRecord[] {
  try {
    const p = getLocalUploadHistoryPath(userId);
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, "utf-8"));
    }
  } catch {}
  return [];
}

function writeLocalUploadHistory(userId: string, records: YouTubeUploadRecord[]) {
  try {
    const p = getLocalUploadHistoryPath(userId);
    fs.writeFileSync(p, JSON.stringify(records, null, 2), "utf-8");
  } catch {}
}

export async function saveYouTubeUploadRecord(
  userId: string,
  recordData: Omit<YouTubeUploadRecord, "id" | "user_id" | "created_at"> & { id?: string; user_id?: string; created_at?: string }
): Promise<YouTubeUploadRecord> {
  const id = recordData.id || crypto.randomUUID();
  const now = recordData.created_at || new Date().toISOString();

  const record: YouTubeUploadRecord = {
    ...recordData,
    id,
    user_id: userId,
    created_at: now,
  };

  const service = getServiceSupabase();

  // 1. Try public.publishing_jobs table
  try {
    await service.from("publishing_jobs").insert({
      id,
      user_id: userId,
      platform: "youtube",
      video_title: record.title,
      caption: record.description || record.title,
      privacy_status: record.privacy_status,
      is_short: record.is_short,
      youtube_video_id: record.youtube_video_id,
      status: record.status === "failed" ? "failed" : "published",
      published_at: now,
      metadata: {
        youtube_url: record.video_url,
        channel_id: record.channel_id,
        channel_title: record.channel_title,
        tags: record.tags,
        category_id: record.category_id,
      },
    });
  } catch {}

  // 2. Try Supabase Auth user metadata
  try {
    const existing = await getYouTubeUploadHistory(userId);
    const updated = [record, ...existing.filter((u) => u.id !== id)];
    await service.auth.admin.updateUserById(userId, {
      user_metadata: {
        youtube_uploads: updated,
      },
    });
  } catch {}

  // 3. Update local cache
  const localList = readLocalUploadHistory(userId);
  const updatedLocal = [record, ...localList.filter((u) => u.id !== id)];
  writeLocalUploadHistory(userId, updatedLocal);

  return record;
}

export async function getYouTubeUploadHistory(userId: string): Promise<YouTubeUploadRecord[]> {
  const service = getServiceSupabase();

  // 1. Try public.publishing_jobs where platform = 'youtube'
  try {
    const { data, error } = await service
      .from("publishing_jobs")
      .select("*")
      .eq("user_id", userId)
      .eq("platform", "youtube")
      .order("created_at", { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      const records: YouTubeUploadRecord[] = data.map((job) => ({
        id: job.id,
        user_id: job.user_id,
        channel_id: job.metadata?.channel_id || job.youtube_channel_id || "",
        channel_title: job.metadata?.channel_title || "YouTube Channel",
        youtube_video_id: job.youtube_video_id || "",
        video_url: job.metadata?.youtube_url || (job.youtube_video_id ? `https://youtube.com/watch?v=${job.youtube_video_id}` : ""),
        title: job.video_title || "Untitled Video",
        description: job.caption,
        privacy_status: job.privacy_status || "public",
        category_id: job.metadata?.category_id,
        is_short: !!job.is_short,
        tags: job.tags,
        status: job.status === "failed" ? "failed" : "uploaded",
        error_message: job.error_message,
        created_at: job.published_at || job.created_at,
      }));
      writeLocalUploadHistory(userId, records);
      return records;
    }
  } catch {}

  // 2. Try Supabase Auth user metadata
  try {
    const { data: userData, error: userError } = await service.auth.admin.getUserById(userId);
    if (!userError && userData?.user?.user_metadata?.youtube_uploads) {
      const metaUploads = userData.user.user_metadata.youtube_uploads;
      if (Array.isArray(metaUploads) && metaUploads.length > 0) {
        writeLocalUploadHistory(userId, metaUploads);
        return metaUploads;
      }
    }
  } catch {}

  // 3. Fallback to local cache
  return readLocalUploadHistory(userId);
}

export async function deleteYouTubeUploadRecord(userId: string, uploadId: string): Promise<boolean> {
  const service = getServiceSupabase();

  try {
    await service.from("publishing_jobs").delete().eq("id", uploadId).eq("user_id", userId);
  } catch {}

  try {
    const existing = await getYouTubeUploadHistory(userId);
    const filtered = existing.filter((u) => u.id !== uploadId);
    await service.auth.admin.updateUserById(userId, {
      user_metadata: {
        youtube_uploads: filtered,
      },
    });
  } catch {}

  const localList = readLocalUploadHistory(userId);
  const updatedLocal = localList.filter((u) => u.id !== uploadId);
  writeLocalUploadHistory(userId, updatedLocal);

  return true;
}
