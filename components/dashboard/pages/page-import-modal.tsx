"use client";

import React, { useState, useEffect } from "react";
import {
  Share2,
  Search,
  Check,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Layers,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";

interface DiscoveredPage {
  id: string;
  name: string;
  category: string;
  pictureUrl?: string | null;
  tasks: string[];
  alreadyImported: boolean;
}

interface PageImportModalProps {
  open: boolean;
  accountId?: string | null;
  onClose: () => void;
  onImportComplete: () => void;
}

export function PageImportModal({
  open,
  accountId,
  onClose,
  onImportComplete,
}: PageImportModalProps) {
  const [pages, setPages] = useState<DiscoveredPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchDiscoveredPages();
    } else {
      setSelectedIds(new Set());
      setImportSuccess(null);
      setErrorMsg(null);
    }
  }, [open, accountId]);

  const fetchDiscoveredPages = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const url = accountId
        ? `/api/meta/pages/discover?account_id=${accountId}`
        : `/api/meta/pages/discover`;

      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || "Failed to discover Facebook Pages.");
      }

      setPages(data.pages || []);
      // Pre-select pages that are not already imported
      const initialSelected = new Set<string>();
      (data.pages || []).forEach((p: DiscoveredPage) => {
        if (!p.alreadyImported) {
          initialSelected.add(p.id);
        }
      });
      setSelectedIds(initialSelected);
    } catch (err: any) {
      setErrorMsg(err.message || "Unable to fetch accessible Pages from Meta Graph API.");
    } finally {
      setLoading(false);
    }
  };

  const filteredPages = pages.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.id.includes(searchTerm)
  );

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredPages.map((p) => p.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleImport = async () => {
    if (selectedIds.size === 0) return;
    setImporting(true);
    setErrorMsg(null);
    setImportSuccess(null);

    try {
      const res = await fetch("/api/meta/pages/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: accountId,
          page_ids: Array.from(selectedIds),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || "Failed to import selected Pages.");
      }

      setImportSuccess(data.message || `Successfully imported ${data.importedCount} Facebook Pages!`);
      setTimeout(() => {
        onImportComplete();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred while importing pages.");
    } finally {
      setImporting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <Card className="w-full max-w-2xl border shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/10 text-blue-600 font-bold border border-blue-500/20">
                f
              </div>
              <CardTitle className="text-base font-semibold">
                Select Facebook Pages to Import
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Choose which Pages to manage under your centralized dashboard.
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        {/* Search & Bulk Controls */}
        <div className="border-b bg-muted/20 px-6 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search discovered pages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <Button
              variant="outline"
              size="sm"
              onClick={selectAll}
              className="h-7 text-[11px]"
              disabled={loading || filteredPages.length === 0}
            >
              Select All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={deselectAll}
              className="h-7 text-[11px]"
              disabled={loading || selectedIds.size === 0}
            >
              Deselect All
            </Button>
            <Badge variant="outline" className="text-[11px] h-7 px-2">
              {selectedIds.size} / {filteredPages.length} Selected
            </Badge>
          </div>
        </div>

        {/* Content Body */}
        <CardContent className="flex-1 overflow-y-auto p-6 space-y-3">
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {importSuccess && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{importSuccess}</span>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">
                Querying Meta Graph API for your authorized Facebook Pages...
              </p>
            </div>
          ) : filteredPages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-xs text-muted-foreground">
              <Layers className="h-10 w-10 text-muted-foreground/40 mb-2" />
              <p className="font-semibold text-foreground">No Facebook Pages Found</p>
              <p className="max-w-xs mt-1">
                Make sure your Facebook account has admin access to at least one Facebook Page and that you granted the <code>pages_show_list</code> permission during OAuth.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPages.map((page) => {
                const isSelected = selectedIds.has(page.id);
                return (
                  <div
                    key={page.id}
                    onClick={() => toggleSelect(page.id)}
                    className={`flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-xs"
                        : "border-border hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // handled by parent div
                        className="h-4 w-4 rounded accent-primary cursor-pointer"
                      />

                      {page.pictureUrl ? (
                        <img
                          src={page.pictureUrl}
                          alt={page.name}
                          className="h-9 w-9 rounded-lg object-cover border"
                        />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs">
                          {page.name[0]}
                        </div>
                      )}

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-foreground">
                            {page.name}
                          </span>
                          {page.alreadyImported && (
                            <Badge variant="success" className="text-[9px] px-1.5 py-0">
                              Already Connected
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                          <span>{page.category}</span>
                          <span>&bull;</span>
                          <span className="font-mono">ID: {page.id}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {page.tasks.length} tasks
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>

        {/* Footer */}
        <CardFooter className="flex items-center justify-between border-t p-4 bg-muted/20">
          <Button variant="outline" size="sm" onClick={onClose} disabled={importing} className="text-xs">
            Cancel
          </Button>

          <Button
            size="sm"
            onClick={handleImport}
            disabled={importing || selectedIds.size === 0}
            className="text-xs font-semibold gap-1.5 shadow-xs"
          >
            {importing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Import {selectedIds.size} Selected Page(s)
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
