"use client";

import React, { useState } from "react";
import { Sparkles, Hash, Copy, Check, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

interface CaptionEditorProps {
  caption: string;
  onChange: (caption: string) => void;
  title?: string;
  onTitleChange?: (title: string) => void;
  suggestedHashtags?: string[];
}

export function CaptionEditor({
  caption,
  onChange,
  title,
  onTitleChange,
  suggestedHashtags = ["#reels", "#viral", "#trending", "#fyp", "#contentcreator"],
}: CaptionEditorProps) {
  const [copied, setCopied] = useState(false);
  const maxLength = 2200;
  const currentLength = caption.length;
  const isOverLimit = currentLength > maxLength;

  function addHashtag(tag: string) {
    if (!caption.includes(tag)) {
      const newCaption = caption ? `${caption} ${tag}` : tag;
      onChange(newCaption);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(caption);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      {onTitleChange && (
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Reel Title (Optional)</Label>
          <input
            type="text"
            value={title || ""}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="e.g. 5 Productivity Habits Top CEOs Swear By"
            className="w-full text-xs rounded-md border bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
            maxLength={100}
          />
        </div>
      )}

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5 text-primary" />
            Reel Caption & Description
          </Label>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-6 text-[10px] gap-1 px-2 text-muted-foreground"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copied" : "Copy"}
            </Button>
            <span
              className={`text-[10px] font-mono ${
                isOverLimit ? "text-red-500 font-bold" : "text-muted-foreground"
              }`}
            >
              {currentLength} / {maxLength}
            </span>
          </div>
        </div>

        <textarea
          rows={5}
          value={caption}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Write an engaging opening hook, brief context, and a clear call to action..."
          className={`w-full text-xs rounded-md border bg-background p-3 focus:outline-none focus:ring-1 ${
            isOverLimit ? "border-red-500 focus:ring-red-500" : "focus:ring-primary"
          }`}
        />
      </div>

      {/* Suggested Hashtags */}
      <div className="space-y-1.5">
        <Label className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Hash className="h-3 w-3" />
          Suggested High-Retention Hashtags (Click to add):
        </Label>
        <div className="flex flex-wrap gap-1.5">
          {suggestedHashtags.map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              onClick={() => addHashtag(tag)}
              className="cursor-pointer text-[10px] hover:bg-primary/10 hover:border-primary transition-colors py-0.5 px-2"
            >
              + {tag}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
