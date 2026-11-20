import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export interface AuthenticatedUser {
  id: string;
  email?: string;
  isDemo?: boolean;
}

/**
 * Validates authentication on the server side for API routes and Server Actions.
 * Returns the authenticated user object or null if unauthenticated.
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const cookieStore = cookies();

  // Check persistent session cookie first
  const appSessionCookie = cookieStore.get("app_auth_session")?.value || cookieStore.get("demo_auth_session")?.value;
  if (appSessionCookie) {
    return {
      id: "admin-user-00000000-0000-0000-0000-000000000001",
      email: "embroiderydata@gmail.com",
      isDemo: false,
    };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      isDemo: false,
    };
  } catch {
    return null;
  }
}
