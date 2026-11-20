import { createBrowserClient } from "@supabase/ssr";

/**
 * Creates a Supabase client for client-side components (browser).
 * If environment variables are missing or placeholders, it provides
 * safe fallback configuration to prevent runtime crashes.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
    key &&
    !url.includes("your-project-id") &&
    !url.includes("placeholder-project") &&
    !key.includes("your-anon-key") &&
    !key.includes("placeholder-anon-key")
  );
}
