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

  // Check demo session cookie first
  const demoCookie = cookieStore.get("demo_auth_session")?.value;
  if (demoCookie) {
    return {
      id: "demo-user-00000000-0000-0000-0000-000000000001",
      email: "demo.agency@facebookautomation.internal",
      isDemo: true,
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
