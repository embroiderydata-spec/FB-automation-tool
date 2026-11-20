import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { type NextRequest } from "next/server";

export interface AuthenticatedUser {
  id: string;
  email?: string;
  isDemo?: boolean;
}

export const REAL_ADMIN_UUID = "2cd3c4b4-3f80-40a7-96ba-d6ffb702ad2e";
export const REAL_ADMIN_EMAIL = "embroiderydata@gmail.com";

/**
 * Validates authentication on the server side for API routes and Server Actions.
 * Returns the authenticated user object or null if unauthenticated.
 */
export async function getAuthenticatedUser(request?: NextRequest): Promise<AuthenticatedUser | null> {
  // 1. Try active Supabase Auth session first
  try {
    const supabase = await createClient(request);
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (user && !error) {
      return {
        id: user.id,
        email: user.email,
        isDemo: false,
      };
    }
  } catch {
    // Continue to session cookie
  }

  // 2. Check persistent admin session cookie
  let appSessionCookie: string | undefined;
  if (request) {
    appSessionCookie = request.cookies.get("app_auth_session")?.value || request.cookies.get("demo_auth_session")?.value;
  }
  if (!appSessionCookie) {
    try {
      const cookieStore = cookies();
      appSessionCookie = cookieStore.get("app_auth_session")?.value || cookieStore.get("demo_auth_session")?.value;
    } catch {
      // Outside Next.js request context
    }
  }

  if (appSessionCookie) {
    return {
      id: REAL_ADMIN_UUID,
      email: REAL_ADMIN_EMAIL,
      isDemo: false,
    };
  }

  return null;
}
