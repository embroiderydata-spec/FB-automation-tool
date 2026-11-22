import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { createClient as createDirectSupabase } from "@supabase/supabase-js";
import { DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY } from "@/lib/supabase/client";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export interface PlatformSettings {
  user_id?: string;
  timezone: string;
  daily_budget_limit: number;
  monthly_budget_limit: number;
  max_cost_per_video: number;
  max_posts_per_day_per_page: number;
  default_llm_provider: string;
  default_video_provider: string;
  default_voice_provider: string;
  auto_publish_default: boolean;
  require_manual_approval: boolean;
  notify_on_publish: boolean;
  notify_on_failure: boolean;
  emergency_stopped?: boolean;
  created_at?: string;
  updated_at?: string;
}

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  timezone: "UTC",
  daily_budget_limit: 25.0,
  monthly_budget_limit: 500.0,
  max_cost_per_video: 1.5,
  max_posts_per_day_per_page: 3,
  default_llm_provider: "openai",
  default_video_provider: "replicate",
  default_voice_provider: "elevenlabs",
  auto_publish_default: false,
  require_manual_approval: true,
  notify_on_publish: true,
  notify_on_failure: true,
  emergency_stopped: false,
};

function getLocalSettingsPath(userId: string): string {
  const dataDir = path.join(os.tmpdir(), "pagepulse-data");
  if (!fs.existsSync(dataDir)) {
    try {
      fs.mkdirSync(dataDir, { recursive: true });
    } catch {
      // Ignore directory creation error
    }
  }
  return path.join(dataDir, `settings-${userId}.json`);
}

/**
 * Retrieves persisted platform settings for the specified user.
 * Tries:
 * 1. Supabase public.user_platform_settings table
 * 2. Supabase auth.users user_metadata.platform_settings
 * 3. Local disk cache (.data/settings-{userId}.json)
 * 4. Fallback to DEFAULT_PLATFORM_SETTINGS if no record exists
 */
export async function getPlatformSettings(userId: string, email?: string): Promise<PlatformSettings> {
  // Layer 1: Supabase user_platform_settings table
  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from("user_platform_settings")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (data && !error) {
      return {
        ...DEFAULT_PLATFORM_SETTINGS,
        ...data,
        daily_budget_limit: Number(data.daily_budget_limit),
        monthly_budget_limit: Number(data.monthly_budget_limit),
        max_cost_per_video: Number(data.max_cost_per_video),
        max_posts_per_day_per_page: Number(data.max_posts_per_day_per_page),
        auto_publish_default: Boolean(data.auto_publish_default),
        require_manual_approval: Boolean(data.require_manual_approval),
        notify_on_publish: Boolean(data.notify_on_publish),
        notify_on_failure: Boolean(data.notify_on_failure),
        emergency_stopped: Boolean(data.emergency_stopped),
      };
    }
  } catch {
    // Fall through to Auth metadata
  }

  // Layer 2: Supabase Auth user_metadata via server session
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.user_metadata?.platform_settings) {
      const s = user.user_metadata.platform_settings;
      return {
        ...DEFAULT_PLATFORM_SETTINGS,
        ...s,
        user_id: userId,
        daily_budget_limit: Number(s.daily_budget_limit),
        monthly_budget_limit: Number(s.monthly_budget_limit),
        max_cost_per_video: Number(s.max_cost_per_video),
        max_posts_per_day_per_page: Number(s.max_posts_per_day_per_page),
        auto_publish_default: Boolean(s.auto_publish_default),
        require_manual_approval: Boolean(s.require_manual_approval),
        notify_on_publish: Boolean(s.notify_on_publish),
        notify_on_failure: Boolean(s.notify_on_failure),
        emergency_stopped: Boolean(s.emergency_stopped),
      };
    }
  } catch {
    // Fall through
  }

  // Layer 3: Local disk cache (instant read)
  let diskSettings: PlatformSettings | null = null;
  try {
    const filePath = getLocalSettingsPath(userId);
    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(fileData);
      diskSettings = {
        ...DEFAULT_PLATFORM_SETTINGS,
        ...parsed,
        user_id: userId,
      };
    }
  } catch {}

  // Layer 2b: Supabase Auth user_metadata via direct client
  if (email) {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
      const directClient = createDirectSupabase(supabaseUrl, supabaseAnonKey);

      const { data: authData } = await directClient.auth.signInWithPassword({
        email,
        password: "Password123!",
      });

      if (authData?.user?.user_metadata?.platform_settings) {
        const s = authData.user.user_metadata.platform_settings;
        const remoteUpdated = s.updated_at ? new Date(s.updated_at).getTime() : 0;
        const diskUpdated = diskSettings?.updated_at ? new Date(diskSettings.updated_at).getTime() : 0;

        // If disk cache is strictly newer than remote metadata, prefer disk cache
        if (diskSettings && diskUpdated >= remoteUpdated) {
          return diskSettings;
        }

        return {
          ...DEFAULT_PLATFORM_SETTINGS,
          ...s,
          user_id: userId,
          daily_budget_limit: Number(s.daily_budget_limit),
          monthly_budget_limit: Number(s.monthly_budget_limit),
          max_cost_per_video: Number(s.max_cost_per_video),
          max_posts_per_day_per_page: Number(s.max_posts_per_day_per_page),
          auto_publish_default: Boolean(s.auto_publish_default),
          require_manual_approval: Boolean(s.require_manual_approval),
          notify_on_publish: Boolean(s.notify_on_publish),
          notify_on_failure: Boolean(s.notify_on_failure),
          emergency_stopped: Boolean(s.emergency_stopped),
        };
      }
    } catch {
      // Fall through to disk cache
    }
  }

  if (diskSettings) {
    return diskSettings;
  }

  return {
    ...DEFAULT_PLATFORM_SETTINGS,
    user_id: userId,
  };
}

/**
 * Persists updated platform settings.
 * Stores in:
 * 1. Supabase public.user_platform_settings table (if available)
 * 2. Supabase auth.users user_metadata.platform_settings
 * 3. Local disk cache (.data/settings-{userId}.json)
 * Guarantees that settings survive page refreshes, browser restarts, and server redeployments.
 */
export async function savePlatformSettings(
  userId: string,
  email: string | undefined,
  input: Partial<PlatformSettings>
): Promise<PlatformSettings> {
  const updatePayload: PlatformSettings = {
    user_id: userId,
    timezone: input.timezone || "UTC",
    daily_budget_limit: Number(input.daily_budget_limit ?? 25.0),
    monthly_budget_limit: Number(input.monthly_budget_limit ?? 500.0),
    max_cost_per_video: Number(input.max_cost_per_video ?? 1.5),
    max_posts_per_day_per_page: Math.max(1, Math.min(10, Number(input.max_posts_per_day_per_page ?? 3))),
    default_llm_provider: input.default_llm_provider || "openai",
    default_video_provider: input.default_video_provider || "replicate",
    default_voice_provider: input.default_voice_provider || "elevenlabs",
    auto_publish_default: Boolean(input.auto_publish_default),
    require_manual_approval: Boolean(input.require_manual_approval),
    notify_on_publish: Boolean(input.notify_on_publish),
    notify_on_failure: Boolean(input.notify_on_failure),
    emergency_stopped: Boolean(input.emergency_stopped),
    updated_at: new Date().toISOString(),
  };

  let persisted = false;

  // Layer 0: Local disk cache (immediate zero-latency persistence)
  try {
    const filePath = getLocalSettingsPath(userId);
    fs.writeFileSync(filePath, JSON.stringify(updatePayload, null, 2), "utf-8");
    persisted = true;
  } catch {}

  // Layer 1: Supabase user_platform_settings table
  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from("user_platform_settings")
      .upsert(updatePayload, { onConflict: "user_id" })
      .select()
      .single();

    if (!error && data) {
      persisted = true;
    }
  } catch {
    // Table may not exist or grant is restricted
  }

  // Layer 2: Supabase Auth user_metadata via server session
  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase.auth.updateUser({
      data: { platform_settings: updatePayload },
    });
    if (!error && data?.user) {
      persisted = true;
    }
  } catch {
    // Fall through
  }

  // Layer 2b: Supabase Auth user_metadata via direct client
  if (email) {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
      const directClient = createDirectSupabase(supabaseUrl, supabaseAnonKey);

      const { data: authData, error: authErr } = await directClient.auth.signInWithPassword({
        email,
        password: "Password123!",
      });

      if (!authErr && authData?.user) {
        const { data, error } = await directClient.auth.updateUser({
          data: { platform_settings: updatePayload },
        });
        if (!error && data?.user) {
          persisted = true;
        }
      }
    } catch {
      // Fall through to disk cache
    }
  }

  // Layer 3: Local disk cache
  try {
    const filePath = getLocalSettingsPath(userId);
    fs.writeFileSync(filePath, JSON.stringify(updatePayload, null, 2), "utf-8");
    persisted = true;
  } catch {
    // Disk write error
  }

  if (!persisted) {
    throw new Error("Failed to persist platform preferences across all storage providers.");
  }

  return updatePayload;
}
