import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { createClient as createDirectSupabase } from "@supabase/supabase-js";
import { DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY } from "@/lib/supabase/client";
import { VideoClipRecord, CreateClipInput } from "./types";
import * as fs from "fs";
import * as path from "path";
import crypto from "crypto";

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
  return createDirectSupabase(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function getLocalClipsPath(userId: string): string {
  const dataDir = path.join(process.cwd(), ".data");
  if (!fs.existsSync(dataDir)) {
    try {
      fs.mkdirSync(dataDir, { recursive: true });
    } catch {}
  }
  return path.join(dataDir, `video-clips-${userId}.json`);
}

function readLocalClips(userId: string): VideoClipRecord[] {
  try {
    const p = getLocalClipsPath(userId);
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, "utf-8"));
    }
  } catch {}
  return [];
}

function writeLocalClips(userId: string, clips: VideoClipRecord[]) {
  try {
    const p = getLocalClipsPath(userId);
    fs.writeFileSync(p, JSON.stringify(clips, null, 2), "utf-8");
  } catch {}
}

export async function getUserClips(userId: string): Promise<VideoClipRecord[]> {
  const service = getServiceSupabase();

  // 1. Try public.video_clips table
  try {
    const { data, error } = await service
      .from("video_clips")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      writeLocalClips(userId, data);
      return data;
    }
  } catch {}

  // 2. Try Supabase Auth metadata
  try {
    const { data: userData, error: userError } = await service.auth.admin.getUserById(userId);
    if (!userError && userData?.user?.user_metadata?.video_clips) {
      const metaClips = userData.user.user_metadata.video_clips;
      if (Array.isArray(metaClips) && metaClips.length > 0) {
        writeLocalClips(userId, metaClips);
        return metaClips;
      }
    }
  } catch {}

  // 3. Fallback to local cache
  return readLocalClips(userId);
}

export async function saveUserClip(userId: string, input: CreateClipInput): Promise<VideoClipRecord> {
  const clipId = crypto.randomUUID();
  const now = new Date().toISOString();
  const duration = input.duration ?? Math.max(0.1, Number((input.end_time - input.start_time).toFixed(3)));

  const clipRecord: VideoClipRecord = {
    id: clipId,
    user_id: userId,
    source_video_url: input.source_video_url,
    source_video_name: input.source_video_name || "Source Video",
    clip_title: input.clip_title || `Clip ${now.slice(0, 10)}`,
    caption: input.caption || "",
    start_time: input.start_time,
    end_time: input.end_time,
    duration,
    aspect_ratio: input.aspect_ratio || "9:16",
    crop_position: input.crop_position || "center",
    resolution: input.resolution || "1080p",
    subtitle_text: input.subtitle_text || "",
    subtitle_style: input.subtitle_style || "viral_bold",
    exported_url: input.exported_url || input.source_video_url,
    file_size: input.file_size,
    status: "ready",
    viral_score: input.viral_score,
    category: input.category,
    hook: input.hook,
    created_at: now,
    updated_at: now,
  };

  const service = getServiceSupabase();

  // 1. Try to insert into public.video_clips table
  try {
    await service.from("video_clips").insert(clipRecord);
  } catch {}

  // 2. Update Supabase Auth metadata
  try {
    const existing = await getUserClips(userId);
    const updated = [clipRecord, ...existing.filter((c) => c.id !== clipId)];
    await service.auth.admin.updateUserById(userId, {
      user_metadata: {
        video_clips: updated,
      },
    });
  } catch {}

  // 3. Update local cache
  const localList = readLocalClips(userId);
  const updatedLocal = [clipRecord, ...localList.filter((c) => c.id !== clipId)];
  writeLocalClips(userId, updatedLocal);

  return clipRecord;
}

export async function deleteUserClip(userId: string, clipId: string): Promise<boolean> {
  const service = getServiceSupabase();

  try {
    await service.from("video_clips").delete().eq("id", clipId).eq("user_id", userId);
  } catch {}

  try {
    const existing = await getUserClips(userId);
    const filtered = existing.filter((c) => c.id !== clipId);
    await service.auth.admin.updateUserById(userId, {
      user_metadata: {
        video_clips: filtered,
      },
    });
  } catch {}

  const localList = readLocalClips(userId);
  const updatedLocal = localList.filter((c) => c.id !== clipId);
  writeLocalClips(userId, updatedLocal);

  return true;
}
