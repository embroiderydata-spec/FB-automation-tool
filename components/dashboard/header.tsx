"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useAuth } from "@/lib/auth/auth-context";
import { useSidebar, navigationItems } from "./sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sun,
  Moon,
  Menu,
  LogOut,
  User,
  ShieldCheck,
  AlertCircle,
  Database,
  ExternalLink,
} from "lucide-react";

export function Header() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { user, isConfigured, signOut } = useAuth();
  const { setMobileOpen } = useSidebar();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Determine current section title
  const currentItem = navigationItems.find((item) =>
    item.href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(item.href)
  );

  const title = currentItem ? currentItem.title : "Dashboard";

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-card/80 px-4 backdrop-blur-md transition-colors lg:px-6">
      {/* Left section: Mobile toggle and Page Title */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(true)}
          className="h-9 w-9 lg:hidden text-muted-foreground hover:text-foreground"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
              {title}
            </h1>
            {user?.isDemo && (
              <Badge variant="demo" className="hidden sm:inline-flex text-[10px]">
                Demo Mode
              </Badge>
            )}
          </div>
          <span className="hidden text-[11px] text-muted-foreground sm:inline-block">
            Facebook Page Automation Platform &bull; Phase 1 Foundation
          </span>
        </div>
      </div>

      {/* Right section: System Status, Theme Toggle, User Menu */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Backend / Auth Status Badge */}
        <div className="hidden md:flex items-center">
          {isConfigured ? (
            <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-600 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <Database className="h-3.5 w-3.5" />
              <span>Supabase Connected</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-1 text-xs text-purple-600 dark:text-purple-400">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
              <span>Preview Session</span>
            </div>
          )}
        </div>

        {/* Theme Toggle Button */}
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 text-muted-foreground hover:text-foreground"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        {/* User Menu Dropdown */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 rounded-full border p-1 pl-2 pr-3 hover:bg-accent transition-colors"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-xs uppercase">
              {user?.fullName ? user.fullName[0] : user?.email ? user.email[0] : "U"}
            </div>
            <div className="hidden flex-col text-left text-xs lg:flex">
              <span className="font-medium text-foreground truncate max-w-[120px]">
                {user?.fullName || user?.email || "Account"}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {user?.isDemo ? "Demo User" : "Admin"}
              </span>
            </div>
          </button>

          {/* User Dropdown Popup */}
          {userMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setUserMenuOpen(false)}
              />
              <div className="absolute right-0 top-12 z-50 w-64 rounded-xl border bg-popover p-2 text-popover-foreground shadow-lg animate-in fade-in-50 zoom-in-95">
                <div className="border-b px-3 py-2.5 mb-1">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {user?.fullName || "Authenticated User"}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {user?.email}
                  </p>
                  {user?.isDemo && (
                    <Badge variant="demo" className="mt-1 text-[9px] px-1.5 py-0">
                      Sandbox / Demo Mode
                    </Badge>
                  )}
                </div>

                <div className="space-y-0.5">
                  <div className="px-3 py-2 text-[11px] text-muted-foreground">
                    <p className="font-medium text-foreground mb-0.5">Scale Architecture</p>
                    <p>Designed to scale up to 100 pages per dashboard.</p>
                  </div>

                  <div className="border-t my-1" />

                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => {
                      setUserMenuOpen(false);
                      signOut();
                    }}
                  >
                    <LogOut className="mr-2 h-3.5 w-3.5" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
