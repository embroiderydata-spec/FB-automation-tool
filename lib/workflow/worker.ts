import { SupabaseClient } from "@supabase/supabase-js";
import { executeWorkflowStage } from "./pipeline";
import { AutomationWorkflow } from "./types";

export interface WorkflowWorkerResult {
  processed: number;
  advanced: number;
  paused: number;
  failed: number;
  waitingForApproval: number;
  details: Array<{ workflowId: string; stage: string; status: string; message?: string }>;
}

/**
 * Background worker for processing automation workflows.
 * Fetches queued or running workflows, acquires atomic row lock, and executes the active stage.
 */
export async function processWorkflowQueue(
  supabase: SupabaseClient,
  workerId: string = `wf_worker_${Date.now()}`
): Promise<WorkflowWorkerResult> {
  const result: WorkflowWorkerResult = {
    processed: 0,
    advanced: 0,
    paused: 0,
    failed: 0,
    waitingForApproval: 0,
    details: [],
  };

  const lockTimeoutIso = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  // Find candidate workflows ready for processing
  const { data: workflows, error: fetchErr } = await supabase
    .from("automation_workflows")
    .select("*")
    .in("status", ["queued", "running"])
    .or(`locked_at.is.null,locked_at.lte.${lockTimeoutIso}`)
    .order("created_at", { ascending: true })
    .limit(5);

  if (fetchErr || !workflows || workflows.length === 0) {
    return result;
  }

  for (const wf of workflows as AutomationWorkflow[]) {
    // Acquire atomic lock
    const { data: locked, error: lockErr } = await supabase
      .from("automation_workflows")
      .update({
        locked_at: new Date().toISOString(),
        locked_by: workerId,
        status: "running",
      })
      .eq("id", wf.id)
      .or(`locked_at.is.null,locked_at.lte.${lockTimeoutIso}`)
      .select("id")
      .maybeSingle();

    if (lockErr || !locked) {
      // Lock contention: another worker picked it up
      continue;
    }

    result.processed++;

    try {
      // Execute the current stage
      const stepResult = await executeWorkflowStage(supabase, wf);

      if (stepResult.status === "completed" || stepResult.success) {
        result.advanced++;
      } else if (stepResult.status === "waiting_for_approval") {
        result.waitingForApproval++;
      } else if (stepResult.status === "paused") {
        result.paused++;
      } else if (stepResult.status === "failed") {
        result.failed++;
      }

      result.details.push({
        workflowId: wf.id,
        stage: stepResult.stage,
        status: stepResult.status,
        message: stepResult.errorMessage || `Advanced from ${stepResult.stage}`,
      });
    } catch (err: any) {
      result.failed++;
      result.details.push({
        workflowId: wf.id,
        stage: wf.current_stage,
        status: "failed",
        message: err?.message || "Worker execution failure",
      });
    } finally {
      // Release atomic lock
      await supabase
        .from("automation_workflows")
        .update({
          locked_at: null,
          locked_by: null,
        })
        .eq("id", wf.id);
    }
  }

  return result;
}
