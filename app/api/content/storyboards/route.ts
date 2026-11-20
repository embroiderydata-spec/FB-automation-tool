import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { createClient } from "@/lib/supabase/server";
import { StoryboardGenerateSchema } from "@/lib/validations/content";
import { executeAICompletion } from "@/lib/ai/client";
import { buildNicheContext, buildStoryboardPrompt } from "@/lib/ai/prompts";

export const dynamic = "force-dynamic";

/**
 * GET /api/content/storyboards
 * Lists storyboards with optional script_id or page_id filter.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const scriptId = searchParams.get("script_id");
    const pageId = searchParams.get("page_id");

    const supabase = await createClient();

    let query = supabase
      .from("content_storyboards")
      .select("*, content_scripts(*), storyboard_scenes(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (scriptId) {
      query = query.eq("content_script_id", scriptId);
    }
    if (pageId && pageId !== "all") {
      query = query.eq("facebook_page_id", pageId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[GET /api/content/storyboards] DB error:", error);
      return NextResponse.json({ storyboards: [] });
    }

    return NextResponse.json({ storyboards: data || [] });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to fetch storyboards." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/content/storyboards
 * Converts an approved script into a vertical 9:16 scene-by-scene storyboard.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const validation = StoryboardGenerateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed.", details: validation.error.format() },
        { status: 400 }
      );
    }

    const { script_id } = validation.data;
    const supabase = await createClient();

    // 1. Fetch script and linked Page
    const { data: script, error: scriptErr } = await supabase
      .from("content_scripts")
      .select("*, facebook_pages(id, page_name, name, category, page_settings(*))")
      .eq("id", script_id)
      .eq("user_id", user.id)
      .single();

    if (scriptErr || !script) {
      return NextResponse.json({ error: "Script not found." }, { status: 404 });
    }

    const page = script.facebook_pages;
    const rawSettings = Array.isArray(page?.page_settings)
      ? page?.page_settings[0]
      : page?.page_settings;

    const pageContext = buildNicheContext({
      page_name: page?.page_name || page?.name || "Facebook Reel",
      niche: rawSettings?.niche || page?.category || "General",
      sub_niche: rawSettings?.sub_niche,
      target_audience: rawSettings?.target_audience,
      language: rawSettings?.language,
      ai_tone: rawSettings?.ai_tone,
      content_style: rawSettings?.content_style,
    });

    // 2. Build prompt and execute completion
    const { system, user: userPrompt } = buildStoryboardPrompt(pageContext, {
      title: script.script_title,
      hook: script.hook,
      full_narration: script.narration,
      estimated_duration_seconds: script.estimated_duration_seconds || 45,
    });

    const completion = await executeAICompletion<{ storyboard: { scenes: any[] } }>({
      supabase,
      userId: user.id,
      pageId: script.facebook_page_id || undefined,
      contentIdeaId: script.content_idea_id || undefined,
      jobType: "video_render",
      systemPrompt: system,
      userPrompt,
      requestMetadata: {
        script_id,
        script_title: script.script_title,
      },
    });

    const scenesData = completion.data?.storyboard?.scenes || [];
    if (scenesData.length === 0) {
      throw new Error("AI did not return valid scenes for the storyboard. Please retry.");
    }

    // 3. Create content_storyboards record (status: 'draft')
    const { data: storyboard, error: sbErr } = await supabase
      .from("content_storyboards")
      .insert({
        content_script_id: script.id,
        content_idea_id: script.content_idea_id,
        user_id: user.id,
        facebook_page_id: script.facebook_page_id,
        version: 1,
        status: "draft",
        metadata: {
          model: completion.model,
          tokens_used: completion.usage.totalTokens,
          cost_usd: completion.usage.estimatedCostUsd,
          total_scenes: scenesData.length,
        },
      })
      .select()
      .single();

    const storyboardId = storyboard?.id || crypto.randomUUID();

    // 4. Insert each scene into storyboard_scenes
    const scenesToInsert = scenesData.map((sc, index) => {
      const validTypes = ["opening", "main_content", "transition", "reaction", "ending"];
      const sceneType = validTypes.includes(sc.scene_type?.toLowerCase())
        ? sc.scene_type.toLowerCase()
        : index === 0
        ? "opening"
        : index === scenesData.length - 1
        ? "ending"
        : "main_content";

      return {
        storyboard_id: storyboardId,
        user_id: user.id,
        scene_number: sc.scene_number || index + 1,
        start_time: typeof sc.start_time === "number" ? sc.start_time : index * 3.5,
        end_time: typeof sc.end_time === "number" ? sc.end_time : (index + 1) * 3.5,
        duration: typeof sc.duration === "number" ? sc.duration : 3.5,
        narration: sc.narration || "",
        visual_description: sc.visual_description || "",
        video_prompt: sc.video_prompt || sc.visual_description || "",
        camera_direction: sc.camera_direction || "Eye-level medium shot",
        motion_description: sc.motion_description || "Steady subject tracking",
        transition: sc.transition || "Cut",
        on_screen_text: sc.on_screen_text || null,
        sound_effect: sc.sound_effect || null,
        scene_type: sceneType,
      };
    });

    const { data: insertedScenes, error: scenesErr } = await supabase
      .from("storyboard_scenes")
      .insert(scenesToInsert)
      .select();

    if (scenesErr) {
      console.error("[POST /api/content/storyboards] Scenes save error:", scenesErr);
    }

    // 5. Update linked idea status to 'storyboard_generated'
    if (script.content_idea_id) {
      await supabase
        .from("content_ideas")
        .update({ content_status: "storyboard_generated" })
        .eq("id", script.content_idea_id);
    }

    return NextResponse.json({
      success: true,
      storyboard: storyboard || { id: storyboardId, status: "draft" },
      scenes: insertedScenes || scenesToInsert,
    });
  } catch (err: any) {
    console.error("[POST /api/content/storyboards] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to generate storyboard." },
      { status: 500 }
    );
  }
}
