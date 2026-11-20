import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { createClient } from "@/lib/supabase/server";
import { HookGenerateSchema } from "@/lib/validations/content";
import { executeAICompletion } from "@/lib/ai/client";
import { buildNicheContext, buildHookGenerationPrompt } from "@/lib/ai/prompts";

export const dynamic = "force-dynamic";

/**
 * POST /api/content/hooks
 * Generates at least 5 viral opening hooks for a topic/idea adapted to a Facebook Page's niche.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const validation = HookGenerateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed.", details: validation.error.format() },
        { status: 400 }
      );
    }

    const { page_id, content_idea_id, topic, idea_title, hook_style, num_hooks } =
      validation.data;

    const supabase = await createClient();

    // 1. Fetch Page and niche settings if page_id is provided
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
          language: rawSettings?.language,
          ai_tone: rawSettings?.ai_tone,
          content_style: rawSettings?.content_style,
          page_description: rawSettings?.page_description,
          topics_to_cover: rawSettings?.topics_to_cover,
          topics_to_avoid: rawSettings?.topics_to_avoid,
        });
      }
    }

    // 2. Build prompt and execute completion
    const { system, user: userPrompt } = buildHookGenerationPrompt(pageContext, {
      topic,
      ideaTitle: idea_title || undefined,
      hookStyle: hook_style,
      numHooks: num_hooks,
    });

    const completion = await executeAICompletion<{ hooks: any[] }>({
      supabase,
      userId: user.id,
      pageId: page_id || undefined,
      contentIdeaId: content_idea_id || undefined,
      jobType: "caption_generation",
      systemPrompt: system,
      userPrompt,
      requestMetadata: {
        topic,
        idea_title,
        hook_style,
        page_name: pageName,
      },
    });

    const hooks = completion.data?.hooks || [];

    // 3. If tied to an existing idea, optionally update its status to 'hook_generated'
    if (content_idea_id) {
      try {
        await supabase
          .from("content_ideas")
          .update({
            content_status: "hook_generated",
            status: "draft",
          })
          .eq("id", content_idea_id)
          .eq("user_id", user.id);
      } catch (err) {
        console.warn("[POST /api/content/hooks] Could not update idea status:", err);
      }
    }

    return NextResponse.json({
      success: true,
      hooks,
      model: completion.model,
      usage: completion.usage,
    });
  } catch (err: any) {
    console.error("[POST /api/content/hooks] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to generate viral hooks." },
      { status: 500 }
    );
  }
}
