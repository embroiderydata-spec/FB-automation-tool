import { createBrowserClient } from "@supabase/ssr";

export const DEFAULT_SUPABASE_URL = "https://cbjjudqdfpunlpcnvsig.supabase.co";
export const DEFAULT_SUPABASE_ANON_KEY = "sb_publishable_U2YTYozFeR3sUN7qLq8ikw_XSUZ1Qjp";

/**
 * Creates a Supabase client for client-side components (browser).
 * Connects directly to the real Supabase project.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

export function isSupabaseConfigured(): boolean {
  return true;
}
