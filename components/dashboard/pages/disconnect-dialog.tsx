"use client";

import React from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";

interface DisconnectDialogProps {
  open: boolean;
  title: string;
  targetName: string;
  isAccount?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DisconnectDialog({
  open,
  title,
  targetName,
  isAccount = false,
  loading = false,
  onConfirm,
  onCancel,
}: DisconnectDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <Card className="w-full max-w-md border-destructive/30 shadow-2xl">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">{title}</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Safe disconnect operation
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-xs text-muted-foreground">
          <p>
            Are you sure you want to disconnect{" "}
            <span className="font-semibold text-foreground">"{targetName}"</span>?
          </p>
          <div className="rounded-lg border bg-muted/40 p-3 space-y-1.5 text-[11px]">
            <p className="font-medium text-foreground">Consequences of disconnection:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Autonomous scheduled publishing will be halted immediately.</li>
              <li>Stored encrypted access tokens will be removed.</li>
              {isAccount ? (
                <li>All Facebook Pages linked to this account will be marked as disconnected.</li>
              ) : (
                <li>Any queued publishing jobs for this Page will be safely cancelled.</li>
              )}
              <li className="text-emerald-600 dark:text-emerald-400 font-medium">
                All historical post records and performance analytics are preserved.
              </li>
            </ul>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2 border-t pt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={loading}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={onConfirm}
            disabled={loading}
            className="text-xs gap-1.5"
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Confirm Disconnect
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
