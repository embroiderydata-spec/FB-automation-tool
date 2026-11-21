"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Share2,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Users,
  Settings,
  MoreVertical,
  RefreshCw,
  Zap,
  Power,
  Trash2,
  Sliders,
  Loader2,
  Shield,
  Layers,
  ArrowUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageImportModal } from "@/components/dashboard/pages/page-import-modal";
import { PageSettingsDrawer } from "@/components/dashboard/pages/page-settings-drawer";
import { DisconnectDialog } from "@/components/dashboard/pages/disconnect-dialog";
import { ComingSoonView } from "@/components/dashboard/coming-soon-view";

function FacebookPagesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Temporary Coming Soon Gate (preserves all existing code intact)
  const IS_COMING_SOON = true;
  if (IS_COMING_SOON) {
    return (
      <ComingSoonView
        moduleName="Facebook Pages Manager"
        badgeText="Coming Soon"
        icon={Share2}
        description="The Facebook Page multi-account manager is temporarily under development while Meta Graph API permissions, token rotation security, and multi-page publishing reliability are being enhanced."
        features={[
          {
            title: "Scale Up to 100 Pages",
            description: "Centralized multi-page management with isolated page token encryption and quota guards.",
          },
          {
            title: "Automated Reels Publishing",
            description: "Autonomous scheduling and staggered publishing windows across all connected pages.",
          },
          {
            title: "Audience & Niche Tuning",
            description: "Individual tone of voice, branding watermarks, and niche adaptation for each page.",
          },
        ]}
      />
    );
  }

  // URL state
  const oauthParam = searchParams.get("oauth");
  const accountIdParam = searchParams.get("account_id");
  const errorParam = searchParams.get("error");
  const errorDetails = searchParams.get("details") || searchParams.get("message");

  // Local state
  const [pages, setPages] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    automation_enabled: 0,
    disconnected: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [automationFilter, setAutomationFilter] = useState("all");

  // Modals & Drawers state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const [settingsPage, setSettingsPage] = useState<any | null>(null);
  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState(false);

  // Disconnect Dialog state
  const [disconnectDialog, setDisconnectDialog] = useState<{
    open: boolean;
    title: string;
    targetName: string;
    isAccount: boolean;
    id: string;
  }>({
    open: false,
    title: "",
    targetName: "",
    isAccount: false,
    id: "",
  });
  const [disconnecting, setDisconnecting] = useState(false);

  // Bulk Selection
  const [selectedPageIds, setSelectedPageIds] = useState<Set<string>>(new Set());

  // Notification Toast / Banner
  const [alertBanner, setAlertBanner] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  useEffect(() => {
    fetchPagesData();
  }, []);

  useEffect(() => {
    if (oauthParam === "success") {
      setAlertBanner({
        type: "success",
        message: "Facebook account authorized successfully! Select the Pages you want to import below.",
      });
      setSelectedAccountId(accountIdParam || null);
      setImportModalOpen(true);
    } else if (errorParam) {
      setAlertBanner({
        type: "error",
        message: errorDetails
          ? `Meta OAuth Notice: ${errorDetails}`
          : "Meta authorization was cancelled or failed. Please check your credentials in .env.local.",
      });
    }
  }, [oauthParam, accountIdParam, errorParam, errorDetails]);

  const fetchPagesData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/facebook-pages");
      const data = await res.json();
      if (res.ok) {
        setPages(data.pages || []);
        setAccounts(data.accounts || []);
        if (data.stats) setStats(data.stats);
      }
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPagesData();
    setRefreshing(false);
    setAlertBanner({
      type: "info",
      message: "Facebook Pages and account connections refreshed.",
    });
  };

  const handleConnectFacebook = () => {
    window.location.href = "/api/meta/connect";
  };

  const handleOpenDiscovery = (accId?: string) => {
    setSelectedAccountId(accId || accounts[0]?.id || null);
    setImportModalOpen(true);
  };

  const handleToggleAutomation = async (pageId: string, currentEnabled: boolean) => {
    try {
      const res = await fetch(`/api/facebook-pages/${pageId}/automation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !currentEnabled }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update automation.");
      }
      setAlertBanner({
        type: "success",
        message: data.message || "Automation state updated.",
      });
      fetchPagesData();
    } catch (err: any) {
      setAlertBanner({
        type: "error",
        message: err.message,
      });
    }
  };

  const handleSyncPage = async (pageId: string) => {
    try {
      const res = await fetch(`/api/facebook-pages/${pageId}/sync`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || "Sync failed.");
      }
      setAlertBanner({
        type: "success",
        message: data.message || "Page metadata synchronized.",
      });
      fetchPagesData();
    } catch (err: any) {
      setAlertBanner({
        type: "error",
        message: err.message,
      });
    }
  };

  const openDisconnectPageModal = (page: any) => {
    setDisconnectDialog({
      open: true,
      title: "Disconnect Facebook Page",
      targetName: page.page_name,
      isAccount: false,
      id: page.id,
    });
  };

  const openDisconnectAccountModal = (acc: any) => {
    setDisconnectDialog({
      open: true,
      title: "Disconnect Facebook Account",
      targetName: acc.display_name || acc.name,
      isAccount: true,
      id: acc.id,
    });
  };

  const confirmDisconnect = async () => {
    setDisconnecting(true);
    try {
      if (disconnectDialog.isAccount) {
        const res = await fetch("/api/meta/disconnect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ account_id: disconnectDialog.id }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to disconnect account.");
        setAlertBanner({ type: "success", message: data.message });
      } else {
        const res = await fetch(`/api/facebook-pages/${disconnectDialog.id}`, {
          method: "DELETE",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to disconnect page.");
        setAlertBanner({ type: "success", message: data.message });
      }
      setDisconnectDialog({ ...disconnectDialog, open: false });
      fetchPagesData();
    } catch (err: any) {
      setAlertBanner({ type: "error", message: err.message });
    } finally {
      setDisconnecting(false);
    }
  };

  // Filtered pages
  const filteredPages = pages.filter((p) => {
    const matchesSearch =
      !searchTerm ||
      p.page_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.page_id.includes(searchTerm);

    const matchesStatus = statusFilter === "all" || p.connection_status === statusFilter;

    const matchesAutomation =
      automationFilter === "all" ||
      (automationFilter === "enabled" && p.automation_enabled) ||
      (automationFilter === "disabled" && !p.automation_enabled);

    return matchesSearch && matchesStatus && matchesAutomation;
  });

  const toggleSelectPage = (id: string) => {
    const next = new Set(selectedPageIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedPageIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedPageIds.size === filteredPages.length) {
      setSelectedPageIds(new Set());
    } else {
      setSelectedPageIds(new Set(filteredPages.map((p) => p.id)));
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert Banner */}
      {alertBanner && (
        <div
          className={`flex items-start justify-between gap-3 rounded-xl border p-4 text-xs transition-all ${
            alertBanner.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : alertBanner.type === "error"
              ? "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
              : "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {alertBanner.type === "success" && <CheckCircle2 className="h-4 w-4 shrink-0" />}
            {alertBanner.type === "error" && <AlertCircle className="h-4 w-4 shrink-0" />}
            {alertBanner.type === "info" && <Shield className="h-4 w-4 shrink-0" />}
            <span>{alertBanner.message}</span>
          </div>
          <button
            onClick={() => setAlertBanner(null)}
            className="text-muted-foreground hover:text-foreground font-bold ml-2"
          >
            &times;
          </button>
        </div>
      )}

      {/* 1. Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Facebook Pages
            </h2>
            <Badge variant="outline" className="border-blue-500/30 text-blue-600 dark:text-blue-400 text-[10px]">
              Meta Graph API v21.0
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your connected Facebook Pages and configure content automation. Scalable to 100 Pages.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="h-9 gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh Pages
          </Button>

          <Button
            size="sm"
            onClick={handleConnectFacebook}
            className="h-9 gap-1.5 text-xs font-semibold shadow-xs"
          >
            <Share2 className="h-3.5 w-3.5" />
            Connect Facebook Account
          </Button>
        </div>
      </div>

      {/* 2. Statistics Grid (Actual Database Values) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Connected Pages
            </CardTitle>
            <Layers className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{stats.total} / 100</div>
            <p className="text-xs text-muted-foreground mt-1">
              {100 - stats.total} network slots remaining
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Active Pages
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {stats.active}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Healthy token & access status</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Automation Enabled
            </CardTitle>
            <Zap className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-purple-600 dark:text-purple-400">
              {stats.automation_enabled}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Autonomous publishing pipeline</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Disconnected Pages
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
              {stats.disconnected}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Paused or revoked authorization</p>
          </CardContent>
        </Card>
      </div>

      {/* 3. Connected Facebook Accounts Bar */}
      {accounts.length > 0 && (
        <Card className="border bg-card/60">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-sm shadow-xs">
                f
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-foreground">
                    {accounts[0].display_name || accounts[0].name}
                  </span>
                  <Badge variant="success" className="text-[10px]">
                    {accounts[0].connection_status || "connected"}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground font-mono">
                  Facebook User ID: {accounts[0].facebook_user_id || accounts[0].fb_user_id}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenDiscovery(accounts[0].id)}
                className="h-8 text-xs gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Import More Pages
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openDisconnectAccountModal(accounts[0])}
                className="h-8 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                Disconnect Account
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 4. Filter, Search & Bulk Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-1 items-center gap-2 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search pages by name, category, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 pl-8 text-xs"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="disconnected">Disconnected Only</option>
          </select>

          {/* Automation filter */}
          <select
            value={automationFilter}
            onChange={(e) => setAutomationFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="all">All Automation</option>
            <option value="enabled">Automation Enabled</option>
            <option value="disabled">Automation Paused</option>
          </select>

          {selectedPageIds.size > 0 && (
            <Badge variant="outline" className="text-xs h-9 px-3">
              {selectedPageIds.size} Selected
            </Badge>
          )}
        </div>
      </div>

      {/* 5. Main Pages Table */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Managed Facebook Pages</CardTitle>
              <CardDescription className="text-xs">
                Showing {filteredPages.length} of {pages.length} configured Facebook Pages
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Loading connected Facebook Pages...</p>
            </div>
          ) : filteredPages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-xs text-muted-foreground space-y-3 p-6">
              <Share2 className="h-12 w-12 text-muted-foreground/30" />
              <div className="space-y-1">
                <p className="font-semibold text-foreground text-sm">No Facebook Pages Connected</p>
                <p className="max-w-md">
                  Connect your Facebook account using official Meta OAuth to discover and manage up to 100 Pages from this dashboard.
                </p>
              </div>
              <Button
                size="sm"
                onClick={handleConnectFacebook}
                className="text-xs font-semibold gap-1.5 shadow-xs mt-2"
              >
                <Plus className="h-3.5 w-3.5" />
                Connect Facebook Account
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b bg-muted/30 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 w-8">
                      <input
                        type="checkbox"
                        checked={selectedPageIds.size === filteredPages.length && filteredPages.length > 0}
                        onChange={toggleSelectAll}
                        className="h-3.5 w-3.5 rounded accent-primary cursor-pointer"
                      />
                    </th>
                    <th className="px-4 py-3">Page Name</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Connected Account</th>
                    <th className="px-4 py-3">Followers</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Automation</th>
                    <th className="px-4 py-3">Last Sync</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredPages.map((page) => {
                    const isSelected = selectedPageIds.has(page.id);
                    return (
                      <tr
                        key={page.id}
                        className={`hover:bg-muted/30 transition-colors ${
                          isSelected ? "bg-primary/5" : ""
                        }`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectPage(page.id)}
                            className="h-3.5 w-3.5 rounded accent-primary cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            {page.profile_picture_url ? (
                              <img
                                src={page.profile_picture_url}
                                alt={page.page_name}
                                className="h-8 w-8 rounded-lg object-cover border"
                              />
                            ) : (
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600/10 text-blue-600 font-bold text-xs border border-blue-500/20">
                                f
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-foreground leading-snug">
                                {page.page_name}
                              </p>
                              <p className="text-[10px] text-muted-foreground font-mono">
                                ID: {page.page_id}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{page.category}</td>
                        <td className="px-4 py-3 text-muted-foreground">{page.account_name}</td>
                        <td className="px-4 py-3 font-medium text-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            {page.followers_count ? page.followers_count.toLocaleString() : "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={page.connection_status === "active" ? "success" : "destructive"}
                            className="text-[10px]"
                          >
                            {page.connection_status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => handleToggleAutomation(page.id, page.automation_enabled)}
                            title="Click to toggle automation"
                            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors cursor-pointer ${
                              page.automation_enabled
                                ? "bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 hover:bg-purple-500/25"
                                : "bg-muted text-muted-foreground border border-border hover:bg-muted/80"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                page.automation_enabled ? "bg-purple-500 animate-pulse" : "bg-muted-foreground"
                              }`}
                            />
                            {page.automation_enabled ? "Enabled" : "Paused"}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-[11px]">
                          {page.last_synced_at
                            ? new Date(page.last_synced_at).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })
                            : "Never"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                              title="Sync Live Metadata"
                              onClick={() => handleSyncPage(page.id)}
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                              title="Page Details & Settings"
                              onClick={() => {
                                setSettingsPage(page);
                                setSettingsDrawerOpen(true);
                              }}
                            >
                              <Sliders className="h-3.5 w-3.5 mr-1" />
                              Settings
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                              title="Disconnect Page"
                              onClick={() => openDisconnectPageModal(page)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 6. Modals & Drawers */}
      <PageImportModal
        open={importModalOpen}
        accountId={selectedAccountId}
        onClose={() => {
          setImportModalOpen(false);
          router.replace("/dashboard/pages");
        }}
        onImportComplete={() => {
          setImportModalOpen(false);
          router.replace("/dashboard/pages");
          fetchPagesData();
          setAlertBanner({
            type: "success",
            message: "Selected Facebook Pages successfully imported and ready for configuration!",
          });
        }}
      />

      <PageSettingsDrawer
        page={settingsPage}
        open={settingsDrawerOpen}
        onClose={() => {
          setSettingsDrawerOpen(false);
          setSettingsPage(null);
        }}
        onSaved={() => {
          setSettingsDrawerOpen(false);
          setSettingsPage(null);
          fetchPagesData();
          setAlertBanner({
            type: "success",
            message: "Page settings saved to Supabase.",
          });
        }}
      />

      <DisconnectDialog
        open={disconnectDialog.open}
        title={disconnectDialog.title}
        targetName={disconnectDialog.targetName}
        isAccount={disconnectDialog.isAccount}
        loading={disconnecting}
        onConfirm={confirmDisconnect}
        onCancel={() => setDisconnectDialog({ ...disconnectDialog, open: false })}
      />
    </div>
  );
}

export default function FacebookPagesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">Loading Facebook Pages...</p>
        </div>
      }
    >
      <FacebookPagesContent />
    </Suspense>
  );
}
