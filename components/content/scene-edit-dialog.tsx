"use client";

import React, { useState, useEffect } from "react";
import { Edit3, Plus, Save, X, Clapperboard, Video, Music, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export interface StoryboardSceneItem {
  id?: string;
  scene_number: number;
  start_time: number;
  end_time: number;
  duration: number;
  narration: string;
  visual_description: string;
  video_prompt: string;
  camera_direction?: string | null;
  motion_description?: string | null;
  transition?: string | null;
  on_screen_text?: string | null;
  sound_effect?: string | null;
  scene_type: "opening" | "main_content" | "transition" | "reaction" | "ending";
}

interface SceneEditDialogProps {
  storyboardId: string;
  scene?: StoryboardSceneItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (updatedScene: StoryboardSceneItem) => void;
}

export function SceneEditDialog({
  storyboardId,
  scene,
  isOpen,
  onClose,
  onSaved,
}: SceneEditDialogProps) {
  const isEditing = Boolean(scene?.id);

  const [sceneNumber, setSceneNumber] = useState(1);
  const [sceneType, setSceneType] = useState<StoryboardSceneItem["scene_type"]>("main_content");
  const [duration, setDuration] = useState(3.5);
  const [narration, setNarration] = useState("");
  const [visualDescription, setVisualDescription] = useState("");
  const [videoPrompt, setVideoPrompt] = useState("");
  const [cameraDirection, setCameraDirection] = useState("Medium shot");
  const [motionDescription, setMotionDescription] = useState("Subject movement");
  const [transition, setTransition] = useState("Cut");
  const [onScreenText, setOnScreenText] = useState("");
  const [soundEffect, setSoundEffect] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (scene) {
      setSceneNumber(scene.scene_number || 1);
      setSceneType(scene.scene_type || "main_content");
      setDuration(scene.duration || 3.5);
      setNarration(scene.narration || "");
      setVisualDescription(scene.visual_description || "");
      setVideoPrompt(scene.video_prompt || "");
      setCameraDirection(scene.camera_direction || "Medium shot");
      setMotionDescription(scene.motion_description || "Subject movement");
      setTransition(scene.transition || "Cut");
      setOnScreenText(scene.on_screen_text || "");
      setSoundEffect(scene.sound_effect || "");
    } else {
      setSceneNumber(1);
      setSceneType("main_content");
      setDuration(3.5);
      setNarration("");
      setVisualDescription("");
      setVideoPrompt("");
      setCameraDirection("Medium shot");
      setMotionDescription("Subject movement");
      setTransition("Cut");
      setOnScreenText("");
      setSoundEffect("");
    }
  }, [scene, isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);

      const payload: Partial<StoryboardSceneItem> = {
        scene_number: Number(sceneNumber),
        duration: Number(duration),
        scene_type: sceneType,
        narration,
        visual_description: visualDescription,
        video_prompt: videoPrompt || visualDescription,
        camera_direction: cameraDirection,
        motion_description: motionDescription,
        transition,
        on_screen_text: onScreenText || null,
        sound_effect: soundEffect || null,
      };

      let endpoint = `/api/content/storyboards/${storyboardId}/scenes`;
      let method = "POST";

      if (isEditing && scene?.id) {
        endpoint = `/api/content/storyboards/${storyboardId}/scenes/${scene.id}`;
        method = "PATCH";
      }

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save scene.");
      }

      onSaved(data.scene || { ...scene, ...payload });
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save scene.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <CardHeader className="pb-3 border-b flex flex-row items-center justify-between sticky top-0 bg-card z-10">
          <div>
            <div className="flex items-center gap-2">
              <Clapperboard className="h-4 w-4 text-primary" />
              <CardTitle className="text-base font-bold">
                {isEditing ? `Edit Scene #${sceneNumber}` : "Add Storyboard Scene"}
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Configure 9:16 vertical visual cues, camera directions, and AI video prompt.
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 text-xs">
                {error}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label className="text-xs">Scene Number</Label>
                <Input
                  type="number"
                  value={sceneNumber}
                  onChange={(e) => setSceneNumber(Number(e.target.value))}
                  min={1}
                  required
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div>
                <Label className="text-xs">Scene Type</Label>
                <select
                  value={sceneType}
                  onChange={(e) => setSceneType(e.target.value as any)}
                  className="w-full h-8 mt-1 text-xs rounded-md border border-input bg-background px-2"
                >
                  <option value="opening">Opening</option>
                  <option value="main_content">Main Content</option>
                  <option value="transition">Transition</option>
                  <option value="reaction">Reaction</option>
                  <option value="ending">Ending</option>
                </select>
              </div>

              <div>
                <Label className="text-xs">Duration (seconds)</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  min={1}
                  max={20}
                  required
                  className="h-8 text-xs mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Voiceover Narration</Label>
              <textarea
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                placeholder="The exact line spoken during this scene..."
                rows={2}
                required
                className="w-full mt-1 p-2 text-xs rounded-md border border-input bg-background"
              />
            </div>

            <div>
              <Label className="text-xs">Visual Description</Label>
              <textarea
                value={visualDescription}
                onChange={(e) => setVisualDescription(e.target.value)}
                placeholder="Detailed description of characters, environment, colors, and action..."
                rows={2}
                required
                className="w-full mt-1 p-2 text-xs rounded-md border border-input bg-background"
              />
            </div>

            <div>
              <Label className="text-xs">AI Video Generation Prompt (9:16 Vertical)</Label>
              <textarea
                value={videoPrompt}
                onChange={(e) => setVideoPrompt(e.target.value)}
                placeholder="Prompt for video generation model (cinematic lighting, photorealistic, 8k resolution...)"
                rows={2}
                className="w-full mt-1 p-2 text-xs rounded-md border border-input bg-background"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Camera Direction</Label>
                <Input
                  value={cameraDirection}
                  onChange={(e) => setCameraDirection(e.target.value)}
                  placeholder="e.g. Extreme close-up, push-in"
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div>
                <Label className="text-xs">Motion Description</Label>
                <Input
                  value={motionDescription}
                  onChange={(e) => setMotionDescription(e.target.value)}
                  placeholder="e.g. Fast forward pan, kinetic whip"
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div>
                <Label className="text-xs">Transition</Label>
                <Input
                  value={transition}
                  onChange={(e) => setTransition(e.target.value)}
                  placeholder="e.g. Cut, Whip cut, Fade"
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div>
                <Label className="text-xs">On-Screen Text</Label>
                <Input
                  value={onScreenText}
                  onChange={(e) => setOnScreenText(e.target.value)}
                  placeholder="e.g. WAIT FOR IT..."
                  className="h-8 text-xs mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Sound Effect Suggestion</Label>
              <Input
                value={soundEffect}
                onChange={(e) => setSoundEffect(e.target.value)}
                placeholder="e.g. Deep cinematic riser, whoosh"
                className="h-8 text-xs mt-1"
              />
            </div>

            <div className="pt-3 border-t flex items-center justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={saving} className="gap-1.5">
                <Save className="h-3.5 w-3.5" />
                {saving ? "Saving..." : isEditing ? "Save Scene Changes" : "Add Scene"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
