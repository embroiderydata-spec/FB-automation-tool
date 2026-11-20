import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "./client";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const pathname = request.nextUrl.pathname;
  const isProtectedPath = pathname.startsWith("/dashboard");
  const isAuthPath = pathname.startsWith("/login");

  // If Supabase credentials are not configured in environment, check for demo session cookie
  if (!isSupabaseConfigured()) {
    const demoSession = request.cookies.get("demo_auth_session")?.value;
    if (isProtectedPath && !demoSession) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    if (isAuthPath && demoSession) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
    return response;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({
          name,
          value,
          ...options,
        });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({
          name,
          value,
          ...options,
        });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({
          name,
          value: "",
          ...options,
        });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({
          name,
          value: "",
          ...options,
        });
      },
    },
  });

  // Check Supabase session
  const { data: { user } } = await supabase.auth.getUser();

  // Redirect unauthenticated users from protected dashboard routes to /login
  if (isProtectedPath && !user) {
    // Check if demo session cookie exists
    const demoSession = request.cookies.get("demo_auth_session")?.value;
    if (!demoSession) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }

  // Redirect authenticated users from /login to /dashboard
  if (isAuthPath && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}
