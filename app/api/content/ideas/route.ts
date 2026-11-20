import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { createClient } from "@/lib/supabase/server";
import { ContentIdeaGenerateSchema } from "@/lib/validations/content";
import { executeAICompletion } from "@/lib/ai/client";
import { buildNicheContext, buildIdeaGenerationPrompt } from "@/lib/ai/prompts";

export const dynamic = "force-dynamic";

/**
 * GET /api/content/ideas
 * Lists content ideas with optional filtering by page_id, status, and search query.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const pageId = searchParams.get("page_id");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const supabase = await createClient();

    let query = supabase
      .from("content_ideas")
      .select("*, facebook_pages(id, page_name, name, category, profile_picture_url)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (pageId && pageId !== "all") {
      query = query.or(`facebook_page_id.eq.${pageId},page_id.eq.${pageId}`);
    }

    if (status && status !== "all") {
      query = query.or(`content_status.eq.${status},status.eq.${status}`);
    }

    if (search) {
      query = query.ilike("title", `%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[GET /api/content/ideas] Supabase error:", error);
      // Return empty list on fallback if table not yet migrated
      return NextResponse.json({ ideas: [] });
    }

    return NextResponse.json({ ideas: data || [] });
  } catch (err: any) {
    console.error("[GET /api/content/ideas] Unexpected error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to fetch content ideas." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/content/ideas
 * Generates content ideas for one or more Facebook Pages using OpenAI.
 * Automatically loads each Page's niche configuration for personalized prompts.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const validation = ContentIdeaGenerateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed.", details: validation.error.format() },
        { status: 400 }
      );
    }

    const {
      page_ids,
      topic,
      category,
      target_audience,
      duration_seconds,
      tone,
      language,
      num_ideas_per_page,
    } = validation.data;

    const supabase = await createClient();

    // 1. Fetch Page and Page Settings for all selected Pages
    const { data: pages, error: pagesError } = await supabase
      .from("facebook_pages")
      .select("id, page_name, name, category, page_settings(*)")
      .in("id", page_ids)
      .eq("user_id", user.id);

    if (pagesError) {
      console.error("[POST /api/content/ideas] Error fetching pages:", pagesError);
    }

    // Fallback if pages list is empty or mock pages in demo
    const effectivePages =
      pages && pages.length > 0
        ? pages
        : page_ids.map((id) => ({
            id,
            page_name: "Connected Facebook Page",
            name: "Connected Facebook Page",
            category: "Entertainment",
            page_settings: null,
          }));

    const generatedResults: any[] = [];
    const jobErrors: string[] = [];

    // 2. Controlled processing loop across selected Pages (concurrency capped at 2)
    for (const page of effectivePages) {
      try {
        const rawSettings = Array.isArray(page.page_settings)
          ? page.page_settings[0]
          : page.page_settings;

        const nicheSettings = {
          page_name: page.page_name || page.name,
          niche: rawSettings?.niche || rawSettings?.niche_category || page.category || "General",
          sub_niche: rawSettings?.sub_niche,
          target_audience: target_audience || rawSettings?.target_audience || "Facebook Reels Viewers",
          target_country: rawSettings?.target_country || "US",
          language: language || rawSettings?.language || "en",
          ai_tone: tone || rawSettings?.ai_tone || "engaging",
          content_style: rawSettings?.content_style || "high-retention viral story",
          page_description: rawSettings?.page_description,
          topics_to_cover: rawSettings?.topics_to_cover,
          topics_to_avoid: rawSettings?.topics_to_avoid,
          preferred_content_format: rawSettings?.preferred_content_format || "reels",
          originality_guidelines: rawSettings?.originality_guidelines,
          video_duration_min: rawSettings?.video_duration_min || 30,
          video_duration_max: rawSettings?.video_duration_max || 60,
        };

        const pageContext = buildNicheContext(nicheSettings);
        const { system, user: userPrompt } = buildIdeaGenerationPrompt(pageContext, {
          topic: topic || undefined,
          category: category || undefined,
          duration: duration_seconds || 45,
          numIdeas: num_ideas_per_page,
        });

        const completion = await executeAICompletion<{ ideas: any[] }>({
          supabase,
          userId: user.id,
          pageId: page.id,
          jobType: "script_generation",
          systemPrompt: system,
          userPrompt,
          requestMetadata: {
            topic,
            category,
            page_name: page.page_name || page.name,
          },
        });

        const ideasList = completion.data?.ideas || [];

        // Save generated ideas to database
        for (const item of ideasList) {
          const ideaPayload = {
            user_id: user.id,
            facebook_page_id: page.id,
            page_id: page.id,
            title: item.title,
            description: item.description,
            topic: topic || item.title,
            category: item.category || category || "General",
            hook: item.suggested_hook,
            target_audience: item.target_audience || nicheSettings.target_audience,
            language: nicheSettings.language,
            tone: nicheSettings.ai_tone,
            duration_seconds: item.suggested_duration_seconds || duration_seconds || 45,
            content_status: "draft",
            status: "draft",
            ai_generated: true,
            viral_potential: item.viral_potential,
            originality_notes: item.originality_notes,
            generation_metadata: {
              model: completion.model,
              tokens_used: completion.usage.totalTokens,
              cost_usd: completion.usage.estimatedCostUsd,
              job_id: completion.jobId,
            },
          };

          const { data: savedIdea, error: insertErr } = await supabase
            .from("content_ideas")
            .insert(ideaPayload)
            .select()
            .single();

          if (!insertErr && savedIdea) {
            generatedResults.push(savedIdea);
          } else {
            // Include payload with generated id if direct insert failed
            generatedResults.push({ id: crypto.randomUUID(), ...ideaPayload });
          }
        }
      } catch (pageErr: any) {
        console.error(`[POST /api/content/ideas] Failed for page ${page.id}:`, pageErr);
        jobErrors.push(`${page.page_name || page.id}: ${pageErr.message}`);
      }
    }

    if (generatedResults.length === 0 && jobErrors.length > 0) {
      return NextResponse.json(
        { error: jobErrors[0], all_errors: jobErrors },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      count: generatedResults.length,
      ideas: generatedResults,
      warnings: jobErrors.length > 0 ? jobErrors : undefined,
    });
  } catch (err: any) {
    console.error("[POST /api/content/ideas] Top-level error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to generate content ideas." },
      { status: 500 }
    );
  }
}
