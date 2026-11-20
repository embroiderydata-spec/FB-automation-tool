import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { type NextRequest } from "next/server";
import { DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY } from "./client";

/**
 * Creates a Supabase client for Server Components, API routes, and Server Actions.
 */
export async function createClient(request?: NextRequest) {
  let cookieStore: any;
  try {
    cookieStore = cookies();
  } catch {
    // Outside request context / test runner
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        if (request) {
          return request.cookies.get(name)?.value;
        }
        return cookieStore?.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          if (cookieStore) {
            cookieStore.set({ name, value, ...options });
          }
        } catch {
          // Ignored if called from Server Component
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          if (cookieStore) {
            cookieStore.set({ name, value: "", ...options });
          }
        } catch {
          // Ignored if called from Server Component
        }
      },
    },
  });
}
