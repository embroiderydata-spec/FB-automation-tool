import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { createClient } from "@/lib/supabase/server";
import { WorkflowTemplateSchema } from "@/lib/validations/workflow";

export const dynamic = "force-dynamic";

const DEFAULT_TEMPLATES = [
  {
    id: "tpl_viral_explainer",
    name: "Viral Explainer (9:16)",
    description: "High-retention curious hook followed by 3 actionable insights and a strong comment CTA.",
    niche: "Education & Productivity",
    configuration: {
      niche: "Productivity & Self Growth",
      category: "Actionable Insights",
      target_audience: "Young Professionals & Entrepreneurs",
      video_duration: 45,
      num_scenes: 4,
      content_tone: "authoritative, engaging",
      aspect_ratio: "9:16",
      resolution: "1080x1920",
      video_provider: "replicate",
      voice_provider: "elevenlabs",
      subtitle_preset: "bold_viral",
      approval_mode: "final_video_approval",
      max_cost_per_video: 2.5,
      daily_budget_limit: 25.0,
    },
    is_default: true,
  },
  {
    id: "tpl_daily_motivation",
    name: "Daily Motivation & Mindset",
    description: "Inspiring narrative pacing with dark cinematic aesthetics and deep voiceover.",
    niche: "Mindset & Motivation",
    configuration: {
      niche: "Motivation & Discipline",
      category: "Daily Inspiration",
      target_audience: "Broad Reels Audience",
      video_duration: 35,
      num_scenes: 4,
      content_tone: "intense, inspiring, reflective",
      aspect_ratio: "9:16",
      resolution: "1080x1920",
      video_provider: "replicate",
      voice_provider: "elevenlabs",
      subtitle_preset: "karaoke",
      approval_mode: "final_video_approval",
      max_cost_per_video: 3.0,
      daily_budget_limit: 30.0,
    },
    is_default: true,
  },
  {
    id: "tpl_tech_breakdown",
    name: "Tech & AI Tools Breakdown",
    description: "Fast-paced showcase of AI tools and practical digital workflows for maximum shares.",
    niche: "Technology & Software",
    configuration: {
      niche: "AI Tools & Future Tech",
      category: "Tech Tutorials",
      target_audience: "Tech Enthusiasts & Creators",
      video_duration: 50,
      num_scenes: 5,
      content_tone: "fast-paced, exciting, concise",
      aspect_ratio: "9:16",
      resolution: "1080x1920",
      video_provider: "replicate",
      voice_provider: "elevenlabs",
      subtitle_preset: "highlight_keywords",
      approval_mode: "final_video_approval",
      max_cost_per_video: 3.5,
      daily_budget_limit: 40.0,
    },
    is_default: true,
  },
];

/**
 * GET /api/workflows/templates
 * Fetches user custom templates plus pre-configured default workflow presets.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const supabase = await createClient();
    const { data: userTemplates } = await supabase
      .from("workflow_templates")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    return NextResponse.json({
      templates: [...(userTemplates || []), ...DEFAULT_TEMPLATES],
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to fetch workflow templates." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workflows/templates
 * Saves a new custom workflow configuration template.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const parsed = WorkflowTemplateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed.", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { name, description, niche, configuration, is_default } = parsed.data;
    const supabase = await createClient();

    const { data: newTemplate, error } = await supabase
      .from("workflow_templates")
      .insert({
        user_id: user.id,
        name,
        description,
        niche,
        configuration,
        is_default: is_default || false,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { message: "Template saved successfully.", template: newTemplate },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to save workflow template." },
      { status: 500 }
    );
  }
}
