"use client";

import React, { createContext, useContext, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Layers,
  Sparkles,
  Film,
  Calendar,
  Clock,
  BarChart3,
  Cpu,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Share2,
  Zap,
  Scissors,
  Youtube,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SidebarContextType {
  collapsed: boolean;
  setCollapsed: (val: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (val: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType>({
  collapsed: false,
  setCollapsed: () => {},
  mobileOpen: false,
  setMobileOpen: () => {},
});

export const useSidebar = () => useContext(SidebarContext);

export const navigationItems = [
  {
    title: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
    badge: null,
  },
  {
    title: "Facebook Pages",
    href: "/dashboard/pages",
    icon: Share2,
    badge: "COMING SOON",
  },
  {
    title: "AI Content Studio",
    href: "/dashboard/content",
    icon: Sparkles,
    badge: "COMING SOON",
  },
  {
    title: "AI Workflows",
    href: "/dashboard/workflows",
    icon: Zap,
    badge: "COMING SOON",
  },
  {
    title: "YouTube",
    href: "/dashboard/youtube",
    icon: Youtube,
    badge: "New",
  },
  {
    title: "Video Library",
    href: "/dashboard/videos",
    icon: Film,
    badge: null,
  },
  {
    title: "Video Clipper",
    href: "/dashboard/clipper",
    icon: Scissors,
    badge: "New",
  },
  {
    title: "Content Calendar",
    href: "/dashboard/calendar",
    icon: Calendar,
    badge: null,
  },
  {
    title: "Publishing Queue",
    href: "/dashboard/queue",
    icon: Clock,
    badge: null,
  },
  {
    title: "Analytics",
    href: "/dashboard/analytics",
    icon: BarChart3,
    badge: null,
  },
  {
    title: "AI Providers",
    href: "/dashboard/providers",
    icon: Cpu,
    badge: null,
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    badge: null,
  },
];

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <SidebarContext.Provider
      value={{ collapsed, setCollapsed, mobileOpen, setMobileOpen }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { collapsed, setCollapsed, mobileOpen, setMobileOpen } = useSidebar();

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main Sidebar */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 flex flex-col border-r bg-card text-card-foreground transition-all duration-300 ease-in-out lg:static",
          collapsed ? "w-20" : "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          <Link
            href="/dashboard"
            className={cn(
              "flex items-center gap-3 transition-opacity",
              collapsed ? "justify-center w-full" : "justify-start"
            )}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
              <Zap className="h-5 w-5" />
            </div>
            {!collapsed && (
              <div className="flex flex-col overflow-hidden">
                <span className="font-bold text-sm tracking-tight text-foreground truncate">
                  PagePulse AI
                </span>
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                  Facebook Platform
                </span>
              </div>
            )}
          </Link>

          {/* Close button for mobile */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 lg:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation Section */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {!collapsed && (
            <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Core Modules
            </div>
          )}

          <nav className="space-y-1">
            {navigationItems.map((item) => {
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    collapsed && "justify-center px-2"
                  )}
                  title={collapsed ? item.title : undefined}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 shrink-0 transition-transform group-hover:scale-105",
                      isActive
                        ? "text-primary-foreground"
                        : "text-muted-foreground group-hover:text-foreground"
                    )}
                  />
                  {!collapsed && (
                    <span className="truncate flex-1">{item.title}</span>
                  )}
                  {!collapsed && item.badge && (
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider shrink-0",
                        isActive
                          ? "bg-white/20 text-white"
                          : item.badge === "COMING SOON"
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Capacity / Scale Indicator (if not collapsed) */}
        {!collapsed && (
          <div className="mx-3 mb-3 rounded-xl border bg-muted/40 p-3 text-xs">
            <div className="flex items-center justify-between font-semibold text-foreground mb-1">
              <span>Managed Capacity</span>
              <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                Scale
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mb-2">
              Ready to manage up to 100 pages concurrently.
            </p>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div className="h-full w-[3%] rounded-full bg-primary" />
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
              <span>3 connected</span>
              <span>100 limit</span>
            </div>
          </div>
        )}

        {/* Desktop Collapse Toggle */}
        <div className="hidden lg:flex items-center justify-between border-t p-3">
          {!collapsed && (
            <span className="text-xs text-muted-foreground font-medium pl-1">
              Collapse Sidebar
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className={cn("h-8 w-8 text-muted-foreground hover:text-foreground", collapsed && "mx-auto")}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </aside>
    </>
  );
}
