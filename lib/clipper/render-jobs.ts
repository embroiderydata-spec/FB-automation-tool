import { createClient as createDirectSupabase } from "@supabase/supabase-js";
import { DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY } from "@/lib/supabase/client";
import { ClipRenderJob, RenderJobStatus } from "./types";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import crypto from "crypto";

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    DEFAULT_SUPABASE_ANON_KEY;
  return createDirectSupabase(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function getLocalJobsPath(userId: string): string {
  const dataDir = path.join(os.tmpdir(), "pagepulse-data");
  if (!fs.existsSync(dataDir)) {
    try {
      fs.mkdirSync(dataDir, { recursive: true });
    } catch {}
  }
  return path.join(dataDir, `render-jobs-${userId}.json`);
}

function readLocalJobs(userId: string): ClipRenderJob[] {
  try {
    const p = getLocalJobsPath(userId);
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, "utf-8"));
    }
  } catch {}
  return [];
}

function writeLocalJobs(userId: string, jobs: ClipRenderJob[]) {
  try {
    const p = getLocalJobsPath(userId);
    fs.writeFileSync(p, JSON.stringify(jobs, null, 2), "utf-8");
  } catch {}
}

export async function createClipRenderJob(
  params: Omit<ClipRenderJob, "id" | "status" | "progress" | "created_at" | "updated_at"> & {
    id?: string;
  }
): Promise<ClipRenderJob> {
  const jobId = params.id || crypto.randomUUID();
  const now = new Date().toISOString();
  const duration =
    params.duration ?? Math.max(0.5, Number((params.end_time - params.start_time).toFixed(2)));

  const job: ClipRenderJob = {
    id: jobId,
    user_id: params.user_id,
    clip_id: params.clip_id,
    status: "queued",
    progress: 0,
    source_video_url: params.source_video_url,
    source_video_name: params.source_video_name || "Source Video",
    clip_title: params.clip_title || "Untitled Clip",
    start_time: params.start_time,
    end_time: params.end_time,
    duration,
    aspect_ratio: params.aspect_ratio || "9:16",
    reframing_mode: params.reframing_mode || "blurred_backdrop",
    crop_position: params.crop_position || "center",
    resolution: params.resolution || "1080p",
    subtitle_style: params.subtitle_style || "hormozi",
    subtitle_text: params.subtitle_text || params.clip_title,
    hook_text: params.hook_text,
    watermark_text: params.watermark_text,
    watermark_position: params.watermark_position || "top_right",
    watermark_opacity: params.watermark_opacity ?? 0.7,
    exported_url: undefined,
    storage_path: undefined,
    file_size: undefined,
    error_message: undefined,
    metadata: params.metadata || {},
    created_at: now,
    updated_at: now,
  };

  const service = getServiceSupabase();

  // 1. Try public.clip_render_jobs table
  try {
    await service.from("clip_render_jobs").insert(job);
  } catch (err: any) {
    console.warn("[RenderJobs] Insert to clip_render_jobs table fallback:", err.message);
  }

  // 2. Try Supabase Auth user metadata
  try {
    const existing = await getUserClipRenderJobs(params.user_id);
    const updated = [job, ...existing.filter((j) => j.id !== jobId)];
    await service.auth.admin.updateUserById(params.user_id, {
      user_metadata: { clip_render_jobs: updated },
    });
  } catch {}

  // 3. Update local cache in os.tmpdir()
  const localList = readLocalJobs(params.user_id);
  const updatedLocal = [job, ...localList.filter((j) => j.id !== jobId)];
  writeLocalJobs(params.user_id, updatedLocal);

  return job;
}

export async function updateClipRenderJob(
  jobId: string,
  userId: string,
  updates: Partial<ClipRenderJob>
): Promise<ClipRenderJob | null> {
  const now = new Date().toISOString();
  const service = getServiceSupabase();

  const patch: Partial<ClipRenderJob> = {
    ...updates,
    updated_at: now,
  };
  if (updates.status === "completed" || updates.status === "failed") {
    patch.completed_at = now;
  }

  // 1. Update in table
  try {
    await service.from("clip_render_jobs").update(patch).eq("id", jobId);
  } catch {}

  // 2. Update in user metadata
  try {
    const existing = await getUserClipRenderJobs(userId);
    const updated = existing.map((j) => (j.id === jobId ? { ...j, ...patch } : j));
    await service.auth.admin.updateUserById(userId, {
      user_metadata: { clip_render_jobs: updated },
    });
  } catch {}

  // 3. Update local cache
  const localList = readLocalJobs(userId);
  let updatedJob: ClipRenderJob | null = null;
  const updatedLocal = localList.map((j) => {
    if (j.id === jobId) {
      updatedJob = { ...j, ...patch };
      return updatedJob;
    }
    return j;
  });
  writeLocalJobs(userId, updatedLocal);

  if (!updatedJob) {
    // If not in local cache, read from DB
    return getClipRenderJob(jobId, userId);
  }

  return updatedJob;
}

export async function getClipRenderJob(
  jobId: string,
  userId: string
): Promise<ClipRenderJob | null> {
  const service = getServiceSupabase();

  // 1. Try public.clip_render_jobs table
  try {
    const { data, error } = await service
      .from("clip_render_jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (!error && data) {
      return data as ClipRenderJob;
    }
  } catch {}

  // 2. Try Supabase Auth user metadata
  try {
    const { data: userData } = await service.auth.admin.getUserById(userId);
    const metaJobs: ClipRenderJob[] = userData?.user?.user_metadata?.clip_render_jobs;
    if (Array.isArray(metaJobs)) {
      const found = metaJobs.find((j) => j.id === jobId);
      if (found) return found;
    }
  } catch {}

  // 3. Try local cache
  const localList = readLocalJobs(userId);
  return localList.find((j) => j.id === jobId) || null;
}

export async function getUserClipRenderJobs(userId: string): Promise<ClipRenderJob[]> {
  const service = getServiceSupabase();

  // 1. Try public.clip_render_jobs table
  try {
    const { data, error } = await service
      .from("clip_render_jobs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      writeLocalJobs(userId, data);
      return data as ClipRenderJob[];
    }
  } catch {}

  // 2. Try user metadata
  try {
    const { data: userData } = await service.auth.admin.getUserById(userId);
    const metaJobs = userData?.user?.user_metadata?.clip_render_jobs;
    if (Array.isArray(metaJobs) && metaJobs.length > 0) {
      writeLocalJobs(userId, metaJobs);
      return metaJobs;
    }
  } catch {}

  // 3. Fallback to local cache
  return readLocalJobs(userId);
}

export async function cancelClipRenderJob(jobId: string, userId: string): Promise<boolean> {
  const updated = await updateClipRenderJob(jobId, userId, {
    status: "cancelled",
    error_message: "Job cancelled by user.",
  });
  return !!updated;
}
