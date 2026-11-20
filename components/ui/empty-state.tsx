import * as React from "react";
import { LucideIcon } from "lucide-react";
import { Button } from "./button";
import { Badge } from "./badge";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  phase?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  phase = "Phase 2 Feature",
  actionLabel,
  onAction,
  className,
  children,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-card/50 p-12 text-center",
        className
      )}
    >
      <div className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm ring-8 ring-primary/5">
        <Icon className="h-7 w-7" />
      </div>

      <div className="mb-2 flex items-center justify-center gap-2">
        <h3 className="text-lg font-semibold tracking-tight text-foreground">{title}</h3>
        {phase && (
          <Badge variant="outline" className="border-primary/30 text-primary text-[10px] uppercase font-bold tracking-wider">
            {phase}
          </Badge>
        )}
      </div>

      <p className="max-w-md text-sm text-muted-foreground leading-relaxed">
        {description}
      </p>

      {children && <div className="mt-4 w-full max-w-md">{children}</div>}

      {actionLabel && (
        <div className="mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={onAction}
            className="gap-2 text-xs"
          >
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
