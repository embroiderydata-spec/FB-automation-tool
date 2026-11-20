import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { createClient } from "@/lib/supabase/server";
import { BulkScheduleSchema } from "@/lib/validations/publishing";
import {
  generateBulkSchedulePreview,
  commitBulkSchedule,
} from "@/lib/publishing/bulk-scheduler";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();

    // Branch 1: Commit pre-approved slots
    if (body.action === "commit" && Array.isArray(body.slots)) {
      const supabase = await createClient();
      const result = await commitBulkSchedule(supabase, user.id, body.slots);
      return NextResponse.json({
        success: true,
        created: result.created,
        skipped_conflicts: result.skippedConflicts,
        message: `Successfully scheduled ${result.created} Facebook Reels.`,
      });
    }

    // Branch 2: Generate preview slots matrix
    const validation = BulkScheduleSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      page_ids,
      video_ids,
      start_date,
      posting_times,
      posts_per_day,
      timezone,
      default_caption_template,
    } = validation.data;

    const slots = await generateBulkSchedulePreview(supabase, user.id, {
      pageIds: page_ids,
      videoIds: video_ids,
      startDateIso: start_date,
      postingTimes: posting_times,
      postsPerDay: posts_per_day,
      timezone,
      defaultCaptionTemplate: default_caption_template,
    });

    const conflictsCount = slots.filter((s) => s.has_conflict).length;

    return NextResponse.json({
      success: true,
      total_slots: slots.length,
      conflicts_count: conflictsCount,
      slots,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
