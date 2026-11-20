import { SupabaseClient } from "@supabase/supabase-js";

export interface BudgetStatus {
  canProceed: boolean;
  reason?: string;
  dailySpentUsd: number;
  dailyBudgetLimitUsd: number;
  monthlySpentUsd: number;
  workflowSpentUsd: number;
  maxCostPerVideoUsd: number;
}

export interface StageCostBreakdown {
  scriptCost: number;
  voiceoverCost: number;
  sceneGenCost: number;
  imageGenCost: number;
  renderingCost: number;
  totalCost: number;
}

/**
 * Standard estimated costs per operation for short-form Reels (USD)
 */
export const UNIT_COST_ESTIMATES = {
  script_generation: 0.005, // GPT-4o-mini prompt + completion
  hook_generation: 0.002,
  storyboard_generation: 0.008,
  voiceover_per_minute: 0.03, // ElevenLabs standard tier (~1000 characters)
  scene_video_generation: 0.08, // Replicate Luma/Ray per 3-5s clip
  scene_image_generation: 0.02, // DALL-E 3 / Flux image
  rendering_per_video: 0.01, // Compute cost
};

/**
 * Checks if the user has exceeded their daily budget or single-video cost limits.
 */
export async function checkBudgetConstraints(
  supabase: SupabaseClient,
  userId: string,
  limits: {
    dailyBudgetLimit?: number;
    maxCostPerVideo?: number;
    currentWorkflowCost?: number;
  }
): Promise<BudgetStatus> {
  const dailyLimit = limits.dailyBudgetLimit || 25.0;
  const videoLimit = limits.maxCostPerVideo || 3.0;
  const currentWorkflowCost = limits.currentWorkflowCost || 0;

  // Single video cost check
  if (currentWorkflowCost > videoLimit) {
    return {
      canProceed: false,
      reason: `Workflow cost ($${currentWorkflowCost.toFixed(2)}) exceeded maximum allowed cost per video ($${videoLimit.toFixed(2)}).`,
      dailySpentUsd: 0,
      dailyBudgetLimitUsd: dailyLimit,
      monthlySpentUsd: 0,
      workflowSpentUsd: currentWorkflowCost,
      maxCostPerVideoUsd: videoLimit,
    };
  }

  // Calculate daily spend from automation_workflows and api_usage
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const { data: workflowsToday } = await supabase
    .from("automation_workflows")
    .select("actual_cost")
    .eq("user_id", userId)
    .gte("created_at", todayStart.toISOString());

  const dailySpent = (workflowsToday || []).reduce(
    (sum, w) => sum + (Number(w.actual_cost) || 0),
    0
  );

  if (dailySpent >= dailyLimit) {
    return {
      canProceed: false,
      reason: `Daily AI generation budget limit reached ($${dailySpent.toFixed(2)} / $${dailyLimit.toFixed(2)}). New generation is paused to prevent unexpected costs.`,
      dailySpentUsd: dailySpent,
      dailyBudgetLimitUsd: dailyLimit,
      monthlySpentUsd: dailySpent,
      workflowSpentUsd: currentWorkflowCost,
      maxCostPerVideoUsd: videoLimit,
    };
  }

  return {
    canProceed: true,
    dailySpentUsd: dailySpent,
    dailyBudgetLimitUsd: dailyLimit,
    monthlySpentUsd: dailySpent,
    workflowSpentUsd: currentWorkflowCost,
    maxCostPerVideoUsd: videoLimit,
  };
}

/**
 * Estimates end-to-end production cost for a workflow before execution.
 */
export function estimateWorkflowCost(config: {
  num_scenes?: number;
  video_duration?: number;
  video_provider?: string;
  voice_provider?: string;
}): number {
  const scenes = config.num_scenes || 4;
  const duration = config.video_duration || 45;

  const scriptCost =
    UNIT_COST_ESTIMATES.script_generation +
    UNIT_COST_ESTIMATES.hook_generation +
    UNIT_COST_ESTIMATES.storyboard_generation;

  const voiceCost = (duration / 60) * UNIT_COST_ESTIMATES.voiceover_per_minute;
  const videoCost = scenes * UNIT_COST_ESTIMATES.scene_video_generation;
  const renderCost = UNIT_COST_ESTIMATES.rendering_per_video;

  const total = scriptCost + voiceCost + videoCost + renderCost;
  return parseFloat(total.toFixed(4));
}
