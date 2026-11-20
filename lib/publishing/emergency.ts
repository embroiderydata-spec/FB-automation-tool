import { SupabaseClient } from "@supabase/supabase-js";
import { EmergencyStopConfig } from "./types";

/**
 * Reads global emergency kill-switch state from system_settings.
 */
export async function getEmergencyStopStatus(supabase: SupabaseClient): Promise<EmergencyStopConfig> {
  try {
    const { data } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "emergency_stop")
      .single();

    if (data?.value) {
      return {
        paused: Boolean(data.value.paused),
        reason: data.value.reason || null,
        paused_at: data.value.paused_at || null,
      };
    }
  } catch {
    // Default safe fallback
  }

  return { paused: false };
}

/**
 * Sets global emergency kill-switch state in system_settings.
 */
export async function setEmergencyStopStatus(
  supabase: SupabaseClient,
  paused: boolean,
  reason?: string | null
): Promise<EmergencyStopConfig> {
  const value = {
    paused,
    reason: reason || (paused ? "Emergency Stop triggered by user." : null),
    paused_at: paused ? new Date().toISOString() : null,
  };

  await supabase
    .from("system_settings")
    .upsert({
      key: "emergency_stop",
      value,
      updated_at: new Date().toISOString(),
    });

  return value;
}

/**
 * Checks if a specific Facebook Page queue is paused.
 */
export async function isPageQueuePaused(
  supabase: SupabaseClient,
  pageId: string
): Promise<boolean> {
  try {
    const { data } = await supabase
      .from("page_settings")
      .select("is_queue_paused")
      .eq("facebook_page_id", pageId)
      .single();

    return Boolean(data?.is_queue_paused);
  } catch {
    return false;
  }
}

/**
 * Toggles queue pause status for a specific Facebook Page.
 */
export async function setPageQueuePaused(
  supabase: SupabaseClient,
  pageId: string,
  isPaused: boolean
): Promise<void> {
  await supabase
    .from("page_settings")
    .update({ is_queue_paused: isPaused })
    .eq("facebook_page_id", pageId);
}
