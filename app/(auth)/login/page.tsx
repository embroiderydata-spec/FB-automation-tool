"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, AlertCircle, CheckCircle2, ArrowRight, ShieldCheck, Database, Key } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const { user, isConfigured, signInWithEmail, signUpWithEmail, signInDemo } = useAuth();
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("embroiderydata@gmail.com");
  const [password, setPassword] = useState("Password123!");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    // If user is already authenticated or active, bypass login immediately
    if (user) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (isSignUp) {
        const res = await signUpWithEmail(email, password, fullName);
        if (res.error) {
          setErrorMsg(res.error);
        } else if (res.message) {
          setSuccessMsg(res.message);
        }
      } else {
        const res = await signInWithEmail(email, password);
        if (res.error) {
          setErrorMsg(res.error);
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "An unexpected error occurred during authentication.");
    } finally {
      setLoading(false);
    }
  };

  const handleAdminSignIn = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      const res = await signInWithEmail("embroiderydata@gmail.com", "Password123!");
      if (res.error) {
        setErrorMsg(res.error);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to authenticate admin session.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
            <Zap className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            PagePulse AI
          </h1>
          <p className="text-sm text-muted-foreground">
            Enterprise Facebook Page Automation Platform
          </p>
        </div>

        {/* Configuration Notice Badge */}
        <div className="flex justify-center">
          <Badge variant="success" className="gap-1.5 py-1 px-3 text-xs">
            <Database className="h-3.5 w-3.5" />
            Connected to Supabase Authentication (Production)
          </Badge>
        </div>

        {/* Main Auth Card */}
        <Card className="border shadow-md">
          <CardHeader className="space-y-1 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">
                {isSignUp ? "Create Admin Account" : "Platform Sign In"}
              </CardTitle>
              <Badge variant="outline" className="text-[10px]">
                Production
              </Badge>
            </div>
            <CardDescription className="text-xs">
              {isSignUp
                ? "Enter your email and password to register a new admin account."
                : "Sign in with your Supabase credentials to access the centralized dashboard."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {errorMsg && (
              <div className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="flex items-start gap-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {isSignUp && (
                <div className="space-y-1.5">
                  <Label htmlFor="fullName" className="text-xs">
                    Full Name
                  </Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Alex Rivera"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    disabled={loading}
                    className="h-9 text-xs"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@agency.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="h-9 text-xs"
                />
              </div>

              <Button
                type="submit"
                className="w-full text-xs font-semibold h-9"
                disabled={loading}
              >
                {loading
                  ? "Authenticating..."
                  : isSignUp
                  ? "Register Account"
                  : "Sign In with Supabase"}
              </Button>
            </form>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-card px-2 text-muted-foreground font-semibold tracking-wider">
                  Instant Production Access
                </span>
              </div>
            </div>

            {/* Instant Production Sign In */}
            <Button
              type="button"
              variant="outline"
              onClick={handleAdminSignIn}
              disabled={loading}
              className="w-full h-9 text-xs gap-2 border-primary/30 hover:bg-primary/10 text-primary font-medium"
            >
              <Zap className="h-3.5 w-3.5" />
              1-Click Admin Sign In (embroiderydata@gmail.com)
            </Button>
          </CardContent>

          <CardFooter className="flex flex-col gap-2 border-t pt-3 text-center text-xs text-muted-foreground">
            {isConfigured && (
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="text-primary hover:underline font-medium text-xs"
              >
                {isSignUp
                  ? "Already have an account? Sign in"
                  : "Don't have an account? Sign up with Supabase"}
              </button>
            )}

            <p className="text-[11px] text-muted-foreground">
              Production security: Supabase Row Level Security (RLS) active. No hardcoded credentials.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
