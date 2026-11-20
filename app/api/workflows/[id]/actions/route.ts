import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { createClient } from "@/lib/supabase/server";
import { WorkflowActionSchema } from "@/lib/validations/workflow";
import { executeWorkflowStage, retryWorkflowFromStage } from "@/lib/workflow/pipeline";
import { AutomationWorkflow, STAGE_PROGRESS_MAP } from "@/lib/workflow/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/workflows/[id]/actions
 * Controls workflow execution (pause, resume, cancel, retry, approvals, single-step).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const parsed = WorkflowActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid action payload.", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { action, target_stage, feedback } = parsed.data;
    const supabase = await createClient();

    // Fetch existing workflow
    const { data: workflow, error: fetchErr } = await supabase
      .from("automation_workflows")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchErr || !workflow) {
      return NextResponse.json({ error: "Workflow not found." }, { status: 404 });
    }

    const wf = workflow as AutomationWorkflow;

    switch (action) {
      case "pause": {
        await supabase
          .from("automation_workflows")
          .update({ status: "paused" })
          .eq("id", id);
        return NextResponse.json({ message: "Workflow paused.", status: "paused" });
      }

      case "resume":
      case "start": {
        await supabase
          .from("automation_workflows")
          .update({ status: "queued", error_message: null })
          .eq("id", id);

        // Run next step
        const stepResult = await executeWorkflowStage(supabase, {
          ...wf,
          status: "running",
        });

        return NextResponse.json({
          message: "Workflow resumed.",
          stepResult,
        });
      }

      case "cancel": {
        await supabase
          .from("automation_workflows")
          .update({ status: "cancelled" })
          .eq("id", id);
        return NextResponse.json({ message: "Workflow cancelled.", status: "cancelled" });
      }

      case "retry": {
        const stageToRetry = target_stage || wf.failed_stage || wf.current_stage;
        await retryWorkflowFromStage(supabase, id, stageToRetry);

        // Fetch fresh copy and advance
        const { data: freshWf } = await supabase
          .from("automation_workflows")
          .select("*")
          .eq("id", id)
          .single();

        const stepResult = await executeWorkflowStage(supabase, freshWf as AutomationWorkflow);

        return NextResponse.json({
          message: `Retrying from stage: ${stageToRetry}`,
          stepResult,
        });
      }

      case "approve_script": {
        if (wf.script_id) {
          await supabase
            .from("content_scripts")
            .update({ status: "approved" })
            .eq("id", wf.script_id);
        }

        // Advance past SCRIPT_APPROVAL to STORYBOARD_GENERATION
        await supabase
          .from("automation_workflows")
          .update({
            current_stage: "STORYBOARD_GENERATION",
            status: "queued",
            progress: STAGE_PROGRESS_MAP.STORYBOARD_GENERATION,
          })
          .eq("id", id);

        const { data: updatedWf } = await supabase
          .from("automation_workflows")
          .select("*")
          .eq("id", id)
          .single();

        const stepResult = await executeWorkflowStage(supabase, updatedWf as AutomationWorkflow);

        return NextResponse.json({
          message: "Script approved. Advanced to storyboard generation.",
          stepResult,
        });
      }

      case "approve_video": {
        // Advance past FINAL_VIDEO_APPROVAL to PAGE_SELECTION
        await supabase
          .from("automation_workflows")
          .update({
            current_stage: "PAGE_SELECTION",
            status: "queued",
            progress: STAGE_PROGRESS_MAP.PAGE_SELECTION,
          })
          .eq("id", id);

        const { data: updatedWf } = await supabase
          .from("automation_workflows")
          .select("*")
          .eq("id", id)
          .single();

        const stepResult = await executeWorkflowStage(supabase, updatedWf as AutomationWorkflow);

        return NextResponse.json({
          message: "Video approved. Proceeding to page variations and scheduling.",
          stepResult,
        });
      }

      case "step": {
        // Synchronously execute next stage
        const stepResult = await executeWorkflowStage(supabase, wf);
        return NextResponse.json({
          message: `Executed stage ${wf.current_stage}.`,
          stepResult,
        });
      }

      default:
        return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to execute workflow action." },
      { status: 500 }
    );
  }
}
