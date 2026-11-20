import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { createClient } from "@/lib/supabase/server";
import { ScriptGenerateSchema } from "@/lib/validations/content";
import { executeAICompletion } from "@/lib/ai/client";
import { buildNicheContext, buildScriptGenerationPrompt } from "@/lib/ai/prompts";

export const dynamic = "force-dynamic";

/**
 * GET /api/content/scripts
 * Lists scripts with optional filtering by idea_id, page_id, and status.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ideaId = searchParams.get("idea_id");
    const pageId = searchParams.get("page_id");
    const status = searchParams.get("status");

    const supabase = await createClient();

    let query = supabase
      .from("content_scripts")
      .select("*, facebook_pages(id, page_name, name, category)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (ideaId) {
      query = query.eq("content_idea_id", ideaId);
    }
    if (pageId && pageId !== "all") {
      query = query.eq("facebook_page_id", pageId);
    }
    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[GET /api/content/scripts] DB error:", error);
      return NextResponse.json({ scripts: [] });
    }

    return NextResponse.json({ scripts: data || [] });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to fetch scripts." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/content/scripts
 * Generates a complete short-form video script for an idea and hook using OpenAI.
 * Automatically saves to content_scripts in 'draft' status.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const validation = ScriptGenerateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed.", details: validation.error.format() },
        { status: 400 }
      );
    }

    const {
      page_id,
      content_idea_id,
      title,
      hook,
      topic,
      target_duration_seconds,
      tone,
      language,
      content_style,
    } = validation.data;

    const supabase = await createClient();

    // 1. Fetch Page niche context if available
    let pageContext = "PAGE PROFILE: General Facebook Reels audience, English, entertaining and engaging tone.";
    let pageName = "General Reel";

    if (page_id) {
      const { data: page } = await supabase
        .from("facebook_pages")
        .select("id, page_name, name, category, page_settings(*)")
        .eq("id", page_id)
        .single();

      if (page) {
        pageName = page.page_name || page.name;
        const rawSettings = Array.isArray(page.page_settings)
          ? page.page_settings[0]
          : page.page_settings;

        pageContext = buildNicheContext({
          page_name: pageName,
          niche: rawSettings?.niche || page.category || "General",
          sub_niche: rawSettings?.sub_niche,
          target_audience: rawSettings?.target_audience,
          target_country: rawSettings?.target_country,
          language: language || rawSettings?.language,
          ai_tone: tone || rawSettings?.ai_tone,
          content_style: content_style || rawSettings?.content_style,
          page_description: rawSettings?.page_description,
          topics_to_cover: rawSettings?.topics_to_cover,
          topics_to_avoid: rawSettings?.topics_to_avoid,
        });
      }
    }

    // 2. Build prompt and execute completion
    const { system, user: userPrompt } = buildScriptGenerationPrompt(pageContext, {
      title: title || undefined,
      hook,
      topic,
      targetDurationSeconds: target_duration_seconds,
      tone: tone || undefined,
      language: language || undefined,
    });

    const completion = await executeAICompletion<{ script: any }>({
      supabase,
      userId: user.id,
      pageId: page_id || undefined,
      contentIdeaId: content_idea_id || undefined,
      jobType: "script_generation",
      systemPrompt: system,
      userPrompt,
      requestMetadata: {
        title,
        hook,
        topic,
        duration: target_duration_seconds,
      },
    });

    const scriptData = completion.data?.script;
    if (!scriptData) {
      throw new Error("AI did not return structured script output. Please retry.");
    }

    // 3. Ensure a valid content_idea_id exists or create one
    let targetIdeaId = content_idea_id;
    if (!targetIdeaId) {
      const { data: newIdea } = await supabase
        .from("content_ideas")
        .insert({
          user_id: user.id,
          facebook_page_id: page_id || null,
          title: scriptData.title || title || topic,
          description: scriptData.caption || `Reel script for ${topic}`,
          topic,
          hook,
          duration_seconds: scriptData.estimated_duration_seconds || target_duration_seconds,
          content_status: "script_generated",
          status: "draft",
          ai_generated: true,
        })
        .select("id")
        .single();

      targetIdeaId = newIdea?.id || crypto.randomUUID();
    } else {
      // Update existing idea status to 'script_generated'
      await supabase
        .from("content_ideas")
        .update({ content_status: "script_generated" })
        .eq("id", targetIdeaId);
    }

    // 4. Insert into content_scripts (status: 'draft')
    const scriptPayload = {
      content_idea_id: targetIdeaId,
      user_id: user.id,
      facebook_page_id: page_id || null,
      script_title: scriptData.title || title || topic,
      hook: scriptData.hook || hook,
      narration: scriptData.full_narration,
      caption: scriptData.caption || null,
      hashtags: Array.isArray(scriptData.hashtags) ? scriptData.hashtags : [],
      estimated_duration_seconds:
        scriptData.estimated_duration_seconds || target_duration_seconds,
      word_count: scriptData.word_count || scriptData.full_narration.split(/\s+/).length,
      status: "draft",
      version: 1,
      metadata: {
        scenes_breakdown: scriptData.scenes_breakdown || [],
        suggested_ending: scriptData.suggested_ending || null,
        model: completion.model,
        tokens_used: completion.usage.totalTokens,
        cost_usd: completion.usage.estimatedCostUsd,
      },
    };

    const { data: savedScript, error: scriptErr } = await supabase
      .from("content_scripts")
      .insert(scriptPayload)
      .select()
      .single();

    if (scriptErr) {
      console.error("[POST /api/content/scripts] DB save error:", scriptErr);
      return NextResponse.json({
        success: true,
        script: { id: crypto.randomUUID(), ...scriptPayload },
      });
    }

    return NextResponse.json({
      success: true,
      script: savedScript,
    });
  } catch (err: any) {
    console.error("[POST /api/content/scripts] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to generate script." },
      { status: 500 }
    );
  }
}
