import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { createClient } from "@/lib/supabase/server";
import { CreateWorkflowSchema } from "@/lib/validations/workflow";
import { estimateWorkflowCost } from "@/lib/workflow/budget";
import { executeWorkflowStage } from "@/lib/workflow/pipeline";
import { AutomationWorkflow, WorkflowSummaryMetrics } from "@/lib/workflow/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/workflows
 * Lists workflows with optional filtering (status, search) and summary metrics.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const limit = Math.min(Number(searchParams.get("limit") || 50), 100);

    const supabase = await createClient();

    let query = supabase
      .from("automation_workflows")
      .select(
        `
        *,
        content_idea:content_ideas(id, title, description, hook, viral_potential),
        video:videos(id, title, render_status, final_video_path, video_url, duration_seconds, aspect_ratio, resolution)
      `
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    if (search) {
      query = query.ilike("workflow_name", `%${search}%`);
    }

    const { data: workflows, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Calculate aggregated metrics
    const { data: allUserWorkflows } = await supabase
      .from("automation_workflows")
      .select("status, actual_cost, completed_at, created_at")
      .eq("user_id", user.id);

    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const allWfs = allUserWorkflows || [];
    const total_workflows = allWfs.length;
    const running_workflows = allWfs.filter((w) => w.status === "running" || w.status === "queued").length;
    const waiting_for_approval = allWfs.filter((w) => w.status === "waiting_for_approval").length;
    const completed_workflows = allWfs.filter((w) => w.status === "completed").length;
    const failed_workflows = allWfs.filter((w) => w.status === "failed").length;
    const estimated_ai_cost = parseFloat(
      allWfs.reduce((acc, w) => acc + (Number(w.actual_cost) || 0), 0).toFixed(4)
    );
    const videos_generated_today = allWfs.filter(
      (w) => w.status === "completed" && new Date(w.completed_at || w.created_at) >= todayStart
    ).length;

    const metrics: WorkflowSummaryMetrics = {
      total_workflows,
      running_workflows,
      waiting_for_approval,
      completed_workflows,
      failed_workflows,
      videos_generated_today,
      estimated_ai_cost,
      avg_production_time_seconds: 42,
    };

    return NextResponse.json({
      workflows: workflows || [],
      metrics,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to fetch workflows." }, { status: 500 });
  }
}

/**
 * POST /api/workflows
 * Creates a new automation workflow and optionally triggers stage 1 execution.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const parsed = CreateWorkflowSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed.", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { workflow_name, configuration, approval_mode } = parsed.data;
    const estimatedCost = estimateWorkflowCost({
      num_scenes: configuration.num_scenes,
      video_duration: configuration.video_duration,
      video_provider: configuration.video_provider,
      voice_provider: configuration.voice_provider,
    });

    const supabase = await createClient();

    const { data: newWorkflow, error: insertErr } = await supabase
      .from("automation_workflows")
      .insert({
        user_id: user.id,
        workflow_name,
        configuration,
        approval_mode: approval_mode || configuration.approval_mode,
        status: "queued",
        current_stage: "IDEA",
        progress: 6,
        estimated_cost: estimatedCost,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertErr || !newWorkflow) {
      return NextResponse.json(
        { error: insertErr?.message || "Failed to create workflow." },
        { status: 500 }
      );
    }

    // Execute first stage synchronously for fast user feedback
    const stepResult = await executeWorkflowStage(supabase, newWorkflow as AutomationWorkflow);

    return NextResponse.json(
      {
        message: "Workflow created and launched successfully.",
        workflow: newWorkflow,
        stepResult,
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to create workflow." }, { status: 500 });
  }
}
