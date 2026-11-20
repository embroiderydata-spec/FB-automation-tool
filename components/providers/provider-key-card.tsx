"use client";

import React, { useState } from "react";
import {
  Eye,
  EyeOff,
  Clipboard,
  Check,
  Save,
  Trash2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  Lock,
  Loader2,
  Sliders,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProviderDefinition, UserProviderKeyRecord } from "@/lib/ai/provider-definitions";

interface ProviderKeyCardProps {
  definition: ProviderDefinition;
  record?: UserProviderKeyRecord;
  icon: React.ComponentType<{ className?: string }>;
  onKeySaved: () => void;
}

export function ProviderKeyCard({
  definition,
  record,
  icon: Icon,
  onKeySaved,
}: ProviderKeyCardProps) {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [baseUrl, setBaseUrl] = useState(record?.base_url || definition.defaultBaseUrl || "");
  const [model, setModel] = useState(record?.default_model || definition.defaultModel || "");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copiedPaste, setCopiedPaste] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ success: boolean; text: string } | null>(null);

  const isConfigured = Boolean(record?.is_configured || record?.masked_key);

  const handlePaste = async () => {
    try {
      if (navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setApiKey(text.trim());
          setCopiedPaste(true);
          setTimeout(() => setCopiedPaste(false), 2000);
        }
      }
    } catch {
      // Clipboard permissions denied
    }
  };

  const handleSave = async () => {
    if (!apiKey.trim() && !isConfigured) {
      setActionMessage({ success: false, text: "Please enter an API key to save." });
      return;
    }

    try {
      setSaving(true);
      setActionMessage(null);

      const res = await fetch("/api/ai/providers/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: definition.id,
          api_key: apiKey.trim() || undefined,
          base_url: baseUrl.trim() || undefined,
          default_model: model || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save API key.");

      setApiKey(""); // Clear raw key from frontend memory immediately
      setActionMessage({ success: true, text: "API Key encrypted with AES-256-GCM and saved successfully!" });
      onKeySaved();
      setTimeout(() => setActionMessage(null), 3500);
    } catch (err: any) {
      setActionMessage({ success: false, text: err?.message || "Failed to save API key." });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    try {
      setTesting(true);
      setActionMessage(null);

      const res = await fetch("/api/ai/providers/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: definition.id,
          api_key: apiKey.trim() || undefined,
          base_url: baseUrl.trim() || undefined,
          default_model: model || undefined,
        }),
      });

      const data = await res.json();
      setActionMessage({
        success: data.success,
        text: data.message || (data.success ? "Connection verified!" : "Handshake failed."),
      });
      onKeySaved();
    } catch (err: any) {
      setActionMessage({
        success: false,
        text: err?.message || "Network error while running handshake test.",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to remove the stored API credentials for ${definition.name}?`)) {
      return;
    }

    try {
      setDeleting(true);
      setActionMessage(null);

      const res = await fetch(`/api/ai/providers/keys?provider=${definition.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to remove key.");

      setApiKey("");
      setActionMessage({ success: true, text: `API key for ${definition.name} removed.` });
      onKeySaved();
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err: any) {
      setActionMessage({ success: false, text: err?.message || "Failed to remove key." });
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadge = () => {
    if (!isConfigured) {
      return (
        <Badge variant="outline" className="text-[10px] text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10">
          Not Configured
        </Badge>
      );
    }

    if (record?.status === "invalid_key") {
      return (
        <Badge variant="destructive" className="text-[10px]">
          Invalid Key
        </Badge>
      );
    }

    return (
      <Badge variant="success" className="text-[10px]">
        Connected
      </Badge>
    );
  };

  return (
    <Card className="flex flex-col justify-between hover:border-primary/40 transition-colors shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <CardTitle className="text-base font-semibold">{definition.name}</CardTitle>
                <a
                  href={definition.docUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                  title="View Official API Documentation"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <span className="text-[11px] font-medium text-primary block mt-0.5">
                {definition.category}
              </span>
            </div>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>

      <CardContent className="space-y-3.5">
        {/* Capability Tags */}
        <div className="flex flex-wrap gap-1">
          {definition.tasks.map((task) => (
            <Badge key={task} variant="outline" className="text-[9px] py-0 px-1.5 font-normal">
              {task}
            </Badge>
          ))}
        </div>

        {/* Saved Key Status Display */}
        {isConfigured && (
          <div className="rounded-lg bg-muted/40 border p-2 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground font-mono">
              <Lock className="h-3.5 w-3.5 text-emerald-500" />
              <span>Current Key:</span>
              <span className="text-foreground font-semibold">
                {record?.masked_key || "••••••••••••••••"}
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
              className="h-6 text-[11px] text-destructive hover:bg-destructive/10 px-2 gap-1"
            >
              <Trash2 className="h-3 w-3" />
              Remove
            </Button>
          </div>
        )}

        {/* API Key Input Form */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold">
              {isConfigured ? "Update API Key" : "Enter API Key"}
            </Label>
            <span className="text-[10px] text-muted-foreground">
              Env: <code>{definition.envVar}</code>
            </span>
          </div>

          <div className="relative flex items-center">
            <Input
              type={showKey ? "text" : "password"}
              placeholder={isConfigured ? "Paste new key to replace existing" : "Paste secret API key (e.g. sk-...)"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="h-8 text-xs font-mono pr-16 bg-background"
            />
            <div className="absolute right-1 flex items-center gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowKey(!showKey)}
                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                title={showKey ? "Hide API Key" : "Show API Key"}
              >
                {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handlePaste}
                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                title="Paste from Clipboard"
              >
                {copiedPaste ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Clipboard className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Toggle Advanced Base URL & Model */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-[11px] text-primary hover:underline flex items-center gap-1 font-medium"
          >
            <Sliders className="h-3 w-3" />
            {showAdvanced ? "Hide Endpoint & Model Settings" : "Custom Base URL & Model Settings"}
          </button>

          {showAdvanced && (
            <div className="mt-2 p-2.5 rounded-lg border bg-muted/20 space-y-2 text-xs">
              <div className="space-y-1">
                <Label className="text-[11px]">API Base URL (Optional)</Label>
                <Input
                  type="text"
                  placeholder={definition.defaultBaseUrl || "https://api.provider.com/v1"}
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  className="h-7 text-xs bg-background font-mono"
                />
              </div>

              {definition.availableModels.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-[11px]">Default Model</Label>
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="h-7 w-full text-xs rounded border border-input bg-background px-2 font-mono"
                  >
                    {definition.availableModels.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Timestamp & Diagnostics */}
        {record?.last_tested_at && (
          <p className="text-[10px] text-muted-foreground">
            Last verified: {new Date(record.last_tested_at).toLocaleString()}
          </p>
        )}

        {/* Action Message Feedback */}
        {actionMessage && (
          <div
            className={`p-2.5 rounded-md text-xs flex items-start gap-2 border ${
              actionMessage.success
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                : "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300"
            }`}
          >
            {actionMessage.success ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <XCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
            )}
            <span className="leading-snug">{actionMessage.text}</span>
          </div>
        )}
      </CardContent>

      {/* Card Action Footer */}
      <div className="border-t p-3 bg-muted/20 flex justify-between items-center gap-2">
        <span className="text-[10px] text-muted-foreground flex items-center gap-1 truncate">
          <Lock className="h-3 w-3 text-emerald-500 shrink-0" />
          <span>Encrypted with AES-256-GCM</span>
        </span>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={testing || (!apiKey.trim() && !isConfigured)}
            onClick={handleTest}
            className="h-7 text-xs gap-1"
          >
            {testing ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <RefreshCw className="h-3 w-3" />
                Test Connection
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={saving || !apiKey.trim()}
            onClick={handleSave}
            className="h-7 text-xs gap-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
          >
            {saving ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-3 w-3" />
                Save Key
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
