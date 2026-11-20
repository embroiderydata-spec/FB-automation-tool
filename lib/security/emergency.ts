import { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "../logger/logger";

export interface GlobalEmergencyState {
  paused: boolean;
  reason: string | null;
  activatedAt: string | null;
  activatedBy: string | null;
}

/**
 * Retrieves the current system-wide emergency pause status.
 */
export async function getGlobalEmergencyStatus(
  supabase: SupabaseClient
): Promise<GlobalEmergencyState> {
  try {
    const { data } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "emergency_stop")
      .maybeSingle();

    if (data?.value) {
      return {
        paused: Boolean(data.value.paused),
        reason: data.value.reason || null,
        activatedAt: data.value.activated_at || null,
        activatedBy: data.value.activated_by || null,
      };
    }
  } catch (err) {
    logger.error("EmergencyStop", "Failed to read emergency stop status", {}, err);
  }

  return { paused: false, reason: null, activatedAt: null, activatedBy: null };
}

/**
 * Activates the platform-wide Emergency Kill-Switch.
 * Immediately pauses all queue dispatchers, publishing workers, AI generation, and workflows.
 */
export async function activateEmergencyStop(
  supabase: SupabaseClient,
  reason: string,
  activatedBy: string
): Promise<GlobalEmergencyState> {
  const state: GlobalEmergencyState = {
    paused: true,
    reason: reason || "Administrative emergency kill-switch activated.",
    activatedAt: new Date().toISOString(),
    activatedBy,
  };

  await supabase
    .from("system_settings")
    .upsert({
      key: "emergency_stop",
      value: {
        paused: true,
        reason: state.reason,
        activated_at: state.activatedAt,
        activated_by: state.activatedBy,
      },
      updated_at: new Date().toISOString(),
    });

  logger.warn("EmergencyStop", `GLOBAL EMERGENCY STOP ACTIVATED: ${state.reason}`, { activatedBy });
  return state;
}

/**
 * Deactivates the platform-wide Emergency Kill-Switch and resumes normal operations.
 */
export async function deactivateEmergencyStop(
  supabase: SupabaseClient,
  deactivatedBy: string
): Promise<GlobalEmergencyState> {
  const state: GlobalEmergencyState = {
    paused: false,
    reason: null,
    activatedAt: null,
    activatedBy: null,
  };

  await supabase
    .from("system_settings")
    .upsert({
      key: "emergency_stop",
      value: {
        paused: false,
        reason: null,
        activated_at: null,
        activated_by: null,
      },
      updated_at: new Date().toISOString(),
    });

  logger.info("EmergencyStop", "Global Emergency Stop cleared. Normal operations resumed.", { deactivatedBy });
  return state;
}
