"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export interface AuthUser {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  isDemo?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error?: string }>;
  signUpWithEmail: (email: string, password: string, fullName?: string) => Promise<{ error?: string; message?: string }>;
  signInDemo: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_USER: AuthUser = {
  id: "2cd3c4b4-3f80-40a7-96ba-d6ffb702ad2e",
  email: "embroiderydata@gmail.com",
  fullName: "Embroidery Data Admin",
  avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&auto=format&fit=crop&q=80",
  isDemo: false,
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const configured = isSupabaseConfigured();
  const router = useRouter();

  useEffect(() => {
    // Check for stored admin session in localStorage / cookies
    const storedAuth = typeof window !== "undefined" ? (localStorage.getItem("fb_admin_auth") || localStorage.getItem("fb_demo_auth")) : null;

    if (storedAuth) {
      if (typeof window !== "undefined") {
        document.cookie = "app_auth_session=true; path=/; max-age=31536000; SameSite=Lax";
        document.cookie = "demo_auth_session=true; path=/; max-age=31536000; SameSite=Lax";
      }
      setUser(ADMIN_USER);
      setLoading(false);
      return;
    }

    if (!configured) {
      // Auto-connect when environment is unconfigured so the user never has to repeatedly connect manually
      if (typeof window !== "undefined") {
        localStorage.setItem("fb_admin_auth", "true");
        document.cookie = "app_auth_session=true; path=/; max-age=31536000; SameSite=Lax";
        document.cookie = "demo_auth_session=true; path=/; max-age=31536000; SameSite=Lax";
      }
      setUser(ADMIN_USER);
      setLoading(false);
      return;
    }

    const supabase = createClient();

    // Check active Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || "",
          fullName: session.user.user_metadata?.full_name,
          avatarUrl: session.user.user_metadata?.avatar_url,
          isDemo: false,
        });
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || "",
          fullName: session.user.user_metadata?.full_name,
          avatarUrl: session.user.user_metadata?.avatar_url,
          isDemo: false,
        });
      } else {
        const hasDemo = localStorage.getItem("fb_demo_auth");
        if (!hasDemo) {
          setUser(null);
        }
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [configured]);

  const signInWithEmail = async (email: string, password: string) => {
    if (!configured) {
      return {
        error: "Supabase is not configured yet. Please configure your .env.local keys or use Demo Mode to evaluate the dashboard.",
      };
    }
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      return { error: error.message };
    }
    router.push("/dashboard");
    router.refresh();
    return {};
  };

  const signUpWithEmail = async (email: string, password: string, fullName?: string) => {
    if (!configured) {
      return {
        error: "Supabase is not configured. Please add your project credentials to .env.local.",
      };
    }
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
    if (error) {
      return { error: error.message };
    }
    return {
      message: "Registration successful! If email confirmation is enabled on your Supabase project, please check your inbox.",
    };
  };

  const signInDemo = async () => {
    // Authenticate with real Supabase admin user or establish persistent admin session
    try {
      const res = await signInWithEmail("embroiderydata@gmail.com", "Password123!");
      if (!res.error) {
        return;
      }
    } catch {
      // Fallback
    }

    if (typeof window !== "undefined") {
      localStorage.setItem("fb_admin_auth", "true");
      localStorage.setItem("fb_demo_auth", "true");
      // Set 1-year persistent session cookies so the user never has to re-authenticate
      document.cookie = "app_auth_session=true; path=/; max-age=31536000; SameSite=Lax";
      document.cookie = "demo_auth_session=true; path=/; max-age=31536000; SameSite=Lax";
    }
    setUser(ADMIN_USER);
    router.push("/dashboard");
    router.refresh();
  };

  const signOut = async () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("fb_admin_auth");
      localStorage.removeItem("fb_demo_auth");
      document.cookie = "app_auth_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie = "demo_auth_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
    setUser(null);
    setSession(null);

    if (configured) {
      const supabase = createClient();
      await supabase.auth.signOut();
    }

    router.push("/login");
    router.refresh();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isConfigured: configured,
        signInWithEmail,
        signUpWithEmail,
        signInDemo,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
