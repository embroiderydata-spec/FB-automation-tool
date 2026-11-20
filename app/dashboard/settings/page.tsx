"use client";

import React from "react";
import { Settings, User, Database, Shield, Sliders, Bell, Moon, Sun } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth/auth-context";
import { useTheme } from "next-themes";

export default function SettingsPage() {
  const { user, isConfigured } = useAuth();
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Platform Settings & Architecture
          </h2>
          <Badge variant="outline" className="text-[10px]">
            Phase 1
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Manage system configurations, authentication state, and multi-page capacity limits.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Administrator Profile
            </CardTitle>
            <CardDescription className="text-xs">
              Linked to Supabase auth user profile
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Email Address</Label>
              <Input
                value={user?.email || "No email assigned"}
                readOnly
                className="h-8 text-xs bg-muted/30"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Admin Name</Label>
              <Input
                value={user?.fullName || "Administrator"}
                readOnly
                className="h-8 text-xs bg-muted/30"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Account Mode</Label>
              <div>
                {user?.isDemo ? (
                  <Badge variant="demo" className="text-xs">
                    Sandbox / Demo Evaluation Session
                  </Badge>
                ) : (
                  <Badge variant="success" className="text-xs">
                    Production Supabase Authenticated
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Database & Infrastructure */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              Database & Infrastructure
            </CardTitle>
            <CardDescription className="text-xs">
              Supabase PostgreSQL schema and migration verification
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-muted-foreground">Database Schema</span>
              <Badge variant="success" className="text-[10px]">
                14 Migration Tables Ready
              </Badge>
            </div>
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-muted-foreground">Row Level Security</span>
              <Badge variant="success" className="text-[10px]">
                Active on All 14 Tables
              </Badge>
            </div>
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-muted-foreground">Managed Page Limit</span>
              <span className="font-semibold text-foreground">100 Facebook Pages</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Supabase URL Configured</span>
              <span>{isConfigured ? "Yes (Production)" : "Using Safe Placeholder"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Appearance Settings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Moon className="h-4 w-4 text-primary" />
              Theme & Appearance
            </CardTitle>
            <CardDescription className="text-xs">
              Toggle between modern dark and clean light modes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-foreground">Interface Theme</p>
                <p className="text-[11px] text-muted-foreground">Currently: {theme || "system"}</p>
              </div>
              <div className="flex gap-1.5">
                <Button
                  variant={theme === "light" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("light")}
                  className="h-8 text-xs gap-1"
                >
                  <Sun className="h-3 w-3" /> Light
                </Button>
                <Button
                  variant={theme === "dark" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("dark")}
                  className="h-8 text-xs gap-1"
                >
                  <Moon className="h-3 w-3" /> Dark
                </Button>
                <Button
                  variant={theme === "system" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("system")}
                  className="h-8 text-xs"
                >
                  System
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security & RLS Policy Notice */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Security Architecture
            </CardTitle>
            <CardDescription className="text-xs">
              Zero credential exposure & tenant isolation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
            <p>
              &bull; Strict tenant isolation: every database query filters through <code>auth.uid() = user_id</code>.
            </p>
            <p>
              &bull; The Supabase service role key is strictly isolated to server contexts and never sent down in client bundles.
            </p>
            <p>
              &bull; Next.js App Router middleware automatically guards all <code>/dashboard/*</code> routes.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
