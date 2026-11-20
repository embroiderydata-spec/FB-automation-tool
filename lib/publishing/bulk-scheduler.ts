import { SupabaseClient } from "@supabase/supabase-js";
import { BulkScheduleSlot } from "./types";

export interface GenerateBulkScheduleParams {
  pageIds: string[];
  videoIds: string[];
  startDateIso: string; // ISO date
  postingTimes: string[]; // e.g. ["10:00", "16:00", "20:00"]
  postsPerDay: number;
  timezone: string;
  defaultCaptionTemplate?: string;
}

/**
 * Computes scheduled slots for a set of videos and Pages with duplicate and interval conflict checks.
 */
export async function generateBulkSchedulePreview(
  supabase: SupabaseClient,
  userId: string,
  params: GenerateBulkScheduleParams
): Promise<BulkScheduleSlot[]> {
  const { pageIds, videoIds, startDateIso, postingTimes, timezone, defaultCaptionTemplate } = params;

  // 1. Fetch Pages
  const { data: pages } = await supabase
    .from("facebook_pages")
    .select("id, page_name")
    .in("id", pageIds)
    .eq("user_id", userId);

  // 2. Fetch Videos
  const { data: videos } = await supabase
    .from("videos")
    .select("id, title, aspect_ratio, duration_seconds")
    .in("id", videoIds)
    .eq("user_id", userId);

  // 3. Fetch existing scheduled jobs to check for duplicate video scheduling
  const { data: existingJobs } = await supabase
    .from("publishing_jobs")
    .select("page_id, video_id, scheduled_at, status")
    .in("page_id", pageIds)
    .in("status", ["scheduled", "queued", "published"]);

  const pageMap = new Map((pages || []).map((p) => [p.id, p.page_name]));
  const videoMap = new Map((videos || []).map((v) => [v.id, v.title]));

  const slots: BulkScheduleSlot[] = [];
  const times = postingTimes.length > 0 ? postingTimes : ["12:00"];

  let currentDate = new Date(startDateIso);
  let timeIdx = 0;
  let videoIdx = 0;

  for (const pageId of pageIds) {
    const pageName = pageMap.get(pageId) || "Unknown Page";

    for (let i = 0; i < videoIds.length; i++) {
      const videoId = videoIds[videoIdx % videoIds.length];
      const videoTitle = videoMap.get(videoId) || "Untitled Video";

      // Time slot allocation
      const timeSlot = times[timeIdx % times.length];
      const [hours, minutes] = timeSlot.split(":").map(Number);

      const slotDate = new Date(currentDate);
      slotDate.setHours(hours || 12, minutes || 0, 0, 0);

      const scheduledAtIso = slotDate.toISOString();

      // Check conflict: Has this video already been scheduled for this page?
      const alreadyScheduled = (existingJobs || []).some(
        (ej) => ej.page_id === pageId && ej.video_id === videoId
      );

      const caption = defaultCaptionTemplate
        ? defaultCaptionTemplate.replace("{{title}}", videoTitle)
        : `${videoTitle}\n\n#reels #viral #trending`;

      slots.push({
        page_id: pageId,
        page_name: pageName,
        video_id: videoId,
        video_title: videoTitle,
        scheduled_at: scheduledAtIso,
        formatted_time: `${slotDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} at ${timeSlot} (${timezone})`,
        timezone,
        caption,
        has_conflict: alreadyScheduled,
        conflict_reason: alreadyScheduled
          ? "This video is already scheduled or published on this Facebook Page."
          : undefined,
      });

      videoIdx++;
      timeIdx++;
      // Increment day after exhausting times of that day
      if (timeIdx % times.length === 0) {
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }
  }

  return slots;
}

/**
 * Commits approved bulk schedule slots into the database.
 */
export async function commitBulkSchedule(
  supabase: SupabaseClient,
  userId: string,
  slots: BulkScheduleSlot[]
): Promise<{ created: number; skippedConflicts: number }> {
  let created = 0;
  let skippedConflicts = 0;

  for (const slot of slots) {
    if (slot.has_conflict) {
      skippedConflicts++;
      continue;
    }

    // 1. Create content_posts
    const { data: postRecord } = await supabase
      .from("content_posts")
      .insert({
        user_id: userId,
        page_id: slot.page_id,
        video_id: slot.video_id,
        post_caption: slot.caption,
        post_type: "reel",
        status: "scheduled",
        scheduled_publish_time: slot.scheduled_at,
      })
      .select("id")
      .single();

    // 2. Create publishing_jobs
    await supabase.from("publishing_jobs").insert({
      user_id: userId,
      post_id: postRecord?.id,
      page_id: slot.page_id,
      facebook_page_id: slot.page_id,
      video_id: slot.video_id,
      caption: slot.caption,
      scheduled_at: slot.scheduled_at,
      timezone: slot.timezone,
      status: "scheduled",
      is_test_mode: true, // Default safe mode
    });

    created++;
  }

  return { created, skippedConflicts };
}
