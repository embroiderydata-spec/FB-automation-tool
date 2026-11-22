import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { createClient as createDirectSupabase } from "@supabase/supabase-js";
import { DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY } from "@/lib/supabase/client";
import {
  VideoAnalysisJob,
  AnalysisJobStatus,
  ViralCandidateClip,
  TranscriptCue,
  DetectedScene,
  ClipDurationPreset,
  TargetPlatform,
} from "./types";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// Ephemeral directory for instant in-process and fast persistence
function getAnalysisCacheDir(): string {
  const d = path.join(os.tmpdir(), "pagepulse-data", "analyses");
  if (!fs.existsSync(d)) {
    try {
      fs.mkdirSync(d, { recursive: true });
    } catch {}
  }
  return d;
}

function getLocalAnalysisFile(id: string): string {
  return path.join(getAnalysisCacheDir(), `${id}.json`);
}

function writeLocalAnalysis(job: VideoAnalysisJob) {
  try {
    fs.writeFileSync(getLocalAnalysisFile(job.id), JSON.stringify(job, null, 2), "utf-8");
  } catch {}
}

function readLocalAnalysis(id: string): VideoAnalysisJob | null {
  try {
    const f = getLocalAnalysisFile(id);
    if (fs.existsSync(f)) {
      return JSON.parse(fs.readFileSync(f, "utf-8"));
    }
  } catch {}
  return null;
}

export interface CreateAnalysisJobInput {
  userId: string;
  videoUrl: string;
  sourceType: "youtube" | "direct_url" | "library" | "upload";
  videoId?: string;
  title: string;
  author?: string;
  duration?: number;
  thumbnailUrl?: string;
  clipCount?: number;
  durationPreset?: ClipDurationPreset;
  targetPlatform?: TargetPlatform;
  language?: string;
  aiInstructions?: string;
  topicQuery?: string;
}

/**
 * Creates a persistent analysis job in Supabase with triple fallback.
 */
export async function createAnalysisJob(
  input: CreateAnalysisJobInput
): Promise<VideoAnalysisJob> {
  const id = `analysis_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const now = new Date().toISOString();

  const job: VideoAnalysisJob = {
    id,
    user_id: input.userId,
    video_url: input.videoUrl,
    source_type: input.sourceType,
    video_id: input.videoId,
    title: input.title,
    author: input.author,
    duration: input.duration || 0,
    thumbnail_url: input.thumbnailUrl,
    status: "queued",
    progress: 5,
    current_stage: "fetching",
    stage_label: "1/8: Ingesting & validating source video...",
    estimated_seconds_remaining: 35,
    clip_count: input.clipCount || 5,
    duration_preset: input.durationPreset || "30-60",
    target_platform: input.targetPlatform || "both",
    language: input.language || "auto",
    ai_instructions: input.aiInstructions,
    topic_query: input.topicQuery,
    transcript_cues: [],
    detected_scenes: [],
    candidate_clips: [],
    created_at: now,
    updated_at: now,
  };

  // 1. Write to local /tmp cache immediately
  writeLocalAnalysis(job);

  // 2. Insert into Supabase video_analysis_jobs
  try {
    let supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from("video_analysis_jobs")
      .insert({
        id: job.id,
        user_id: job.user_id,
        video_url: job.video_url,
        source_type: job.source_type,
        video_id: job.video_id,
        title: job.title,
        author: job.author,
        duration: job.duration,
        thumbnail_url: job.thumbnail_url,
        status: job.status,
        progress: job.progress,
        current_stage: job.current_stage,
        stage_label: job.stage_label,
        estimated_seconds_remaining: job.estimated_seconds_remaining,
        clip_count: job.clip_count,
        duration_preset: job.duration_preset,
        target_platform: job.target_platform,
        language: job.language,
        ai_instructions: job.ai_instructions,
        topic_query: job.topic_query,
        transcript_cues: job.transcript_cues,
        detected_scenes: job.detected_scenes,
        candidate_clips: job.candidate_clips,
        created_at: job.created_at,
        updated_at: job.updated_at,
      })
      .select()
      .single();

    if (!error && data) {
      return data as VideoAnalysisJob;
    }
  } catch {}

  // 3. Fallback: Save to Supabase user_metadata
  try {
    const supabase = await createServerSupabase();
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      const existing = userData.user.user_metadata?.video_analysis_jobs || [];
      const updated = [job, ...existing.filter((j: any) => j.id !== job.id)].slice(0, 10);
      await supabase.auth.updateUser({
        data: { video_analysis_jobs: updated },
      });
    }
  } catch {}

  return job;
}

/**
 * Updates an analysis job with stage progress, transcript cues, scenes, or candidate clips.
 */
export async function updateAnalysisJob(
  id: string,
  updates: Partial<VideoAnalysisJob>
): Promise<VideoAnalysisJob | null> {
  const existing = readLocalAnalysis(id);
  const now = new Date().toISOString();

  const updatedJob: VideoAnalysisJob = {
    ...(existing || ({} as any)),
    ...updates,
    id,
    updated_at: now,
  };

  if (updates.status === "completed" || updates.status === "failed") {
    updatedJob.completed_at = now;
  }

  // 1. Update local cache
  writeLocalAnalysis(updatedJob);

  // 2. Update Supabase table
  try {
    const supabase = await createServerSupabase();
    await supabase
      .from("video_analysis_jobs")
      .update({
        ...updates,
        updated_at: now,
        ...(updates.status === "completed" || updates.status === "failed"
          ? { completed_at: now }
          : {}),
      })
      .eq("id", id);
  } catch {}

  // 3. Update user_metadata
  try {
    const supabase = await createServerSupabase();
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      const existingList = userData.user.user_metadata?.video_analysis_jobs || [];
      const updatedList = existingList.map((j: any) => (j.id === id ? updatedJob : j));
      await supabase.auth.updateUser({
        data: { video_analysis_jobs: updatedList },
      });
    }
  } catch {}

  return updatedJob;
}

/**
 * Retrieves a specific analysis job by ID.
 */
export async function getAnalysisJob(
  id: string,
  userId?: string
): Promise<VideoAnalysisJob | null> {
  // 1. Check local cache
  const local = readLocalAnalysis(id);
  if (local) return local;

  // 2. Query Supabase
  try {
    const supabase = await createServerSupabase();
    let query = supabase.from("video_analysis_jobs").select("*").eq("id", id);
    if (userId) query = query.eq("user_id", userId);
    const { data } = await query.single();
    if (data) {
      writeLocalAnalysis(data as VideoAnalysisJob);
      return data as VideoAnalysisJob;
    }
  } catch {}

  // 3. Check user_metadata
  try {
    const supabase = await createServerSupabase();
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user?.user_metadata?.video_analysis_jobs) {
      const found = userData.user.user_metadata.video_analysis_jobs.find(
        (j: any) => j.id === id
      );
      if (found) {
        writeLocalAnalysis(found);
        return found;
      }
    }
  } catch {}

  return null;
}

/**
 * Retrieves recent analysis jobs for a user.
 */
export async function getUserAnalysisJobs(
  userId: string,
  limit = 10
): Promise<VideoAnalysisJob[]> {
  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from("video_analysis_jobs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (!error && data && data.length > 0) {
      return data as VideoAnalysisJob[];
    }
  } catch {}

  // Fallback: check user metadata
  try {
    const supabase = await createServerSupabase();
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user?.user_metadata?.video_analysis_jobs) {
      return userData.user.user_metadata.video_analysis_jobs.slice(0, limit);
    }
  } catch {}

  // Fallback: scan local cache directory
  try {
    const d = getAnalysisCacheDir();
    if (fs.existsSync(d)) {
      const files = fs.readdirSync(d).filter((f) => f.endsWith(".json"));
      const jobs: VideoAnalysisJob[] = [];
      for (const f of files) {
        try {
          const content = JSON.parse(fs.readFileSync(path.join(d, f), "utf-8"));
          if (!userId || content.user_id === userId) {
            jobs.push(content);
          }
        } catch {}
      }
      return jobs.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || "")).slice(0, limit);
    }
  } catch {}

  return [];
}

/**
 * Retrieves the latest active or completed analysis for the user so refreshing the page restores state.
 */
export async function getLatestUserAnalysis(userId: string): Promise<VideoAnalysisJob | null> {
  const jobs = await getUserAnalysisJobs(userId, 5);
  if (jobs.length > 0) {
    // Return latest completed or active job
    return jobs[0];
  }
  return null;
}

/**
 * Cancels an active analysis job.
 */
export async function cancelAnalysisJob(id: string, userId: string): Promise<boolean> {
  await updateAnalysisJob(id, {
    status: "cancelled",
    stage_label: "Analysis cancelled by user.",
    error_message: "User cancelled analysis.",
  });
  return true;
}
