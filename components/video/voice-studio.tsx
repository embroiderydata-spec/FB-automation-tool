"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  Volume2,
  Play,
  Pause,
  Sparkles,
  Sliders,
  CheckCircle2,
  Loader2,
  Download,
  Music,
  Languages,
  Check,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface VoiceOption {
  id: string;
  name: string;
  category: string;
  provider: "ElevenLabs" | "OpenAI" | "Browser";
  gender: "female" | "male";
  accent: string;
}

const VOICES: VoiceOption[] = [
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel (Calm & Professional)", category: "ElevenLabs", provider: "ElevenLabs", gender: "female", accent: "American" },
  { id: "AZnzlk1XvdvUeBnXmlld", name: "Domi (Energetic & Dynamic)", category: "ElevenLabs", provider: "ElevenLabs", gender: "female", accent: "American" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella (Warm & Engaging)", category: "ElevenLabs", provider: "ElevenLabs", gender: "female", accent: "American" },
  { id: "ErXwobaYiN019PkySvjV", name: "Antoni (Authoritative & Deep)", category: "ElevenLabs", provider: "ElevenLabs", gender: "male", accent: "American" },
  { id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh (Deep & Punchy Narrator)", category: "ElevenLabs", provider: "ElevenLabs", gender: "male", accent: "American" },
  { id: "alloy", name: "Alloy (Neutral & Balanced)", category: "OpenAI TTS", provider: "OpenAI", gender: "female", accent: "Neutral" },
  { id: "echo", name: "Echo (Warm & Crisp)", category: "OpenAI TTS", provider: "OpenAI", gender: "male", accent: "American" },
  { id: "nova", name: "Nova (Youthful & Energetic)", category: "OpenAI TTS", provider: "OpenAI", gender: "female", accent: "American" },
  { id: "onyx", name: "Onyx (Deep Dramatic Narrator)", category: "OpenAI TTS", provider: "OpenAI", gender: "male", accent: "British" },
];

export function VoiceStudio({ onVoiceoverGenerated }: { onVoiceoverGenerated?: () => void }) {
  const [selectedVoiceId, setSelectedVoiceId] = useState("21m00Tcm4TlvDq8ikWAM");
  const [provider, setProvider] = useState<"ElevenLabs" | "OpenAI">("ElevenLabs");
  const [scriptText, setScriptText] = useState(
    "Here is the secret reason why most Facebook Reels fail to get views, and the exact 3 steps you can take today to double your engagement."
  );
  const [speed, setSpeed] = useState(1.0);
  const [pitch, setPitch] = useState(1.0);
  const [volume, setVolume] = useState(1.0);
  const [language, setLanguage] = useState("en-US");

  // State
  const [generating, setGenerating] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [generatedDuration, setGeneratedDuration] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [recentVoiceovers, setRecentVoiceovers] = useState<any[]>([]);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Filter voices by provider
  const filteredVoices = VOICES.filter((v) =>
    provider === "ElevenLabs" ? v.provider === "ElevenLabs" : v.provider === "OpenAI"
  );

  const selectedVoice = VOICES.find((v) => v.id === selectedVoiceId) || VOICES[0];

  // Live in-browser Speech Preview
  const handlePreviewSpeech = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("Speech synthesis is not supported in this browser.");
      return;
    }

    if (previewing) {
      window.speechSynthesis.cancel();
      setPreviewing(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(scriptText.slice(0, 120));
    utterance.rate = speed;
    utterance.pitch = pitch;
    utterance.volume = volume;
    utterance.lang = language;

    utterance.onend = () => setPreviewing(false);
    utterance.onerror = () => setPreviewing(false);

    setPreviewing(true);
    window.speechSynthesis.speak(utterance);
  };

  // Generate & Save Voiceover Audio via Server API
  const handleGenerateVoiceover = async () => {
    if (!scriptText.trim()) {
      setNotice({ type: "error", text: "Please enter text for narration." });
      return;
    }

    try {
      setGenerating(true);
      setNotice(null);

      const res = await fetch("/api/video/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: scriptText,
          voice_id: selectedVoiceId,
          speed: Number(speed),
          stability: 0.5,
          similarity_boost: 0.75,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // If ElevenLabs is unconfigured in test/dev environment, fall back gracefully to synthetic web voice simulation
        const fallbackAudio = `data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==`;
        setNotice({
          type: "error",
          text: data.error || "Failed to generate speech. Please configure ELEVENLABS_API_KEY in settings.",
        });
      } else {
        setGeneratedAudioUrl(data.audio_url);
        setGeneratedDuration(data.duration_seconds || 8.5);
        setNotice({
          type: "success",
          text: `Voiceover successfully synthesized and saved to Media Library (${data.duration_seconds || 8.5}s)!`,
        });

        // Add to recent list
        setRecentVoiceovers((prev) => [
          {
            id: `vo_${Date.now()}`,
            name: `${selectedVoice.name.split(" ")[0]} - ${scriptText.slice(0, 32)}...`,
            url: data.audio_url,
            duration: data.duration_seconds || 8.5,
            date: new Date().toLocaleTimeString(),
          },
          ...prev,
        ]);

        if (onVoiceoverGenerated) {
          onVoiceoverGenerated();
        }
      }
    } catch (err: any) {
      setNotice({ type: "error", text: err.message || "Network error generating voiceover." });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Mic className="h-4 w-4 text-indigo-500" />
              AI Voiceover Studio & Speech Synthesis
            </CardTitle>
            <CardDescription className="text-xs">
              Synthesize realistic human voiceovers for Facebook Reels with emotion control, pitch tuning, and multi-language support.
            </CardDescription>
          </div>

          {/* Provider Toggle */}
          <div className="flex items-center gap-1.5 p-1 bg-muted rounded-lg border text-xs">
            <button
              type="button"
              onClick={() => {
                setProvider("ElevenLabs");
                setSelectedVoiceId(VOICES[0].id);
              }}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                provider === "ElevenLabs"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              ElevenLabs (v2)
            </button>
            <button
              type="button"
              onClick={() => {
                setProvider("OpenAI");
                setSelectedVoiceId("alloy");
              }}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                provider === "OpenAI"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              OpenAI TTS
            </button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {notice && (
            <div
              className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                notice.type === "success"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "border-destructive/30 bg-destructive/10 text-destructive"
              }`}
            >
              {notice.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
              <span>{notice.text}</span>
            </div>
          )}

          {/* Voice Model Selector Grid */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Select Voice Model</Label>
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
              {filteredVoices.map((voice) => (
                <div
                  key={voice.id}
                  onClick={() => setSelectedVoiceId(voice.id)}
                  className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                    selectedVoiceId === voice.id
                      ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-xs"
                      : "hover:border-indigo-300 dark:hover:border-indigo-800 bg-card"
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-bold text-foreground truncate">{voice.name}</span>
                    {selectedVoiceId === voice.id && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <Badge variant="outline" className="text-[9px] py-0 px-1 capitalize">
                      {voice.gender}
                    </Badge>
                    <span>{voice.accent}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Narration Script Textarea */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-muted-foreground">Narration Script</Label>
              <span className="text-[10px] text-muted-foreground font-mono">
                {scriptText.length} characters • ~{Math.round(scriptText.split(/\s+/).length / 2.5)}s estimated
              </span>
            </div>
            <textarea
              value={scriptText}
              onChange={(e) => setScriptText(e.target.value)}
              rows={3}
              className="w-full text-xs p-2.5 rounded-md border border-input bg-background resize-none focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              placeholder="Paste narration script for this scene or entire reel..."
            />
          </div>

          {/* Audio Tuning Sliders */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-3 rounded-lg border bg-muted/20">
            {/* Speed */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">Speed:</span>
                <span className="font-semibold font-mono">{speed}x</span>
              </div>
              <input
                type="range"
                min="0.7"
                max="1.5"
                step="0.05"
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            {/* Pitch */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">Pitch:</span>
                <span className="font-semibold font-mono">{pitch}x</span>
              </div>
              <input
                type="range"
                min="0.8"
                max="1.3"
                step="0.05"
                value={pitch}
                onChange={(e) => setPitch(Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            {/* Volume */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">Volume:</span>
                <span className="font-semibold font-mono">{Math.round(volume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.3"
                max="1.0"
                step="0.05"
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            {/* Language */}
            <div className="space-y-1">
              <span className="text-[11px] text-muted-foreground block">Language:</span>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="h-7 w-full text-xs rounded border border-input bg-background px-1.5"
              >
                <option value="en-US">English (US)</option>
                <option value="en-GB">English (UK)</option>
                <option value="es-ES">Spanish</option>
                <option value="hi-IN">Hindi</option>
                <option value="fr-FR">French</option>
                <option value="de-DE">German</option>
                <option value="ur-PK">Urdu</option>
                <option value="ar-SA">Arabic</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePreviewSpeech}
              className="gap-1.5 text-xs h-8"
            >
              {previewing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {previewing ? "Stop Preview" : "Instant Audio Audition"}
            </Button>

            <Button
              type="button"
              disabled={generating}
              onClick={handleGenerateVoiceover}
              className="gap-1.5 text-xs h-8 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {generating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Synthesizing with {provider}...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  Generate & Save Voiceover MP3
                </>
              )}
            </Button>
          </div>

          {/* Active Audio Player */}
          {generatedAudioUrl && (
            <div className="p-3 rounded-lg border bg-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2">
                <Music className="h-4 w-4 text-indigo-500" />
                <div>
                  <span className="text-xs font-semibold block text-foreground">Generated Voiceover Audio</span>
                  <span className="text-[10px] text-muted-foreground">
                    Duration: ~{generatedDuration}s • Saved to Asset Library
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <audio ref={audioRef} controls src={generatedAudioUrl} className="h-8 max-w-xs" />
                <a
                  href={generatedAudioUrl}
                  download="voiceover.mp3"
                  className="p-1.5 rounded-md border hover:bg-muted text-muted-foreground hover:text-foreground"
                  title="Download Voiceover MP3"
                >
                  <Download className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
