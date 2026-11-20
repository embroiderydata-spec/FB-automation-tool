import { SubtitlePresetConfig, SubtitlePresetStyle } from "../types";

export const SUBTITLE_PRESETS: Record<SubtitlePresetStyle, SubtitlePresetConfig> = {
  bold_viral: {
    id: "bold_viral",
    name: "Bold Viral (High-Retention Reels)",
    fontFamily: "Impact, Arial Black, sans-serif",
    fontSize: 48,
    textColor: "#FFFF00", // Electric Yellow
    highlightColor: "#00FFCC",
    backgroundColor: "transparent",
    outlineColor: "#000000",
    outlineWidth: 4,
    shadow: "2px 2px 4px rgba(0,0,0,0.8)",
    position: "middle",
    animation: "pop",
  },
  karaoke: {
    id: "karaoke",
    name: "Karaoke Dynamic Glow",
    fontFamily: "Inter, Montserrat, sans-serif",
    fontSize: 42,
    textColor: "#FFFFFF",
    highlightColor: "#38BDF8", // Neon Cyan
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    outlineColor: "#000000",
    outlineWidth: 2,
    shadow: "0px 0px 8px #38BDF8",
    position: "bottom",
    animation: "karaoke",
  },
  classic: {
    id: "classic",
    name: "Classic Clean",
    fontFamily: "Helvetica Neue, Arial, sans-serif",
    fontSize: 36,
    textColor: "#FFFFFF",
    highlightColor: "#FFFFFF",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    outlineColor: "#000000",
    outlineWidth: 1,
    shadow: "none",
    position: "bottom",
    animation: "none",
  },
  minimal: {
    id: "minimal",
    name: "Minimalist Modern",
    fontFamily: "Inter, Roboto, sans-serif",
    fontSize: 32,
    textColor: "#F1F5F9",
    highlightColor: "#94A3B8",
    backgroundColor: "transparent",
    outlineColor: "rgba(0,0,0,0.5)",
    outlineWidth: 2,
    shadow: "1px 1px 2px rgba(0,0,0,0.6)",
    position: "bottom",
    animation: "none",
  },
  highlight_keywords: {
    id: "highlight_keywords",
    name: "Highlight Keywords (Action Words)",
    fontFamily: "Montserrat, Arial Black, sans-serif",
    fontSize: 44,
    textColor: "#FFFFFF",
    highlightColor: "#F43F5E", // Vivid Rose
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    outlineColor: "#000000",
    outlineWidth: 3,
    shadow: "2px 2px 0px #000000",
    position: "middle",
    animation: "pop",
  },
};

export interface SubtitleCue {
  id: number;
  startTimeSeconds: number;
  endTimeSeconds: number;
  text: string;
}

/**
 * Formats seconds into standard SRT timestamp (00:00:00,000)
 */
export function formatSrtTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

/**
 * Generates valid SubRip (.srt) subtitle string from cues.
 */
export function generateSRT(cues: SubtitleCue[]): string {
  return cues
    .map((cue, index) => {
      const start = formatSrtTime(cue.startTimeSeconds);
      const end = formatSrtTime(cue.endTimeSeconds);
      return `${index + 1}\n${start} --> ${end}\n${cue.text.trim()}\n`;
    })
    .join("\n");
}

/**
 * Generates Advanced SubStation Alpha (.ass) format for styled FFmpeg hardsub burning.
 */
export function generateASS(
  cues: SubtitleCue[],
  preset: SubtitlePresetConfig,
  videoWidth: number = 1080,
  videoHeight: number = 1920
): string {
  // Alignment: 2 = Bottom-Center, 5 = Middle-Center, 8 = Top-Center
  const alignment = preset.position === "middle" ? 5 : preset.position === "top" ? 8 : 2;

  // Convert Hex to BGR for ASS format
  const primaryColorBGR = hexToAssColor(preset.textColor);
  const outlineColorBGR = hexToAssColor(preset.outlineColor);
  const backColorBGR = hexToAssColor(preset.backgroundColor);

  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: ${videoWidth}
PlayResY: ${videoHeight}
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${preset.fontFamily.split(",")[0]},${preset.fontSize},${primaryColorBGR},&H000000FF,${outlineColorBGR},${backColorBGR},-1,0,0,0,100,100,0,0,1,${preset.outlineWidth},2,${alignment},40,40,${alignment === 2 ? 180 : 80},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const events = cues
    .map((c) => {
      const start = formatAssTime(c.startTimeSeconds);
      const end = formatAssTime(c.endTimeSeconds);
      return `Dialogue: 0,${start},${end},Default,,0,0,0,,${c.text.trim()}`;
    })
    .join("\n");

  return header + events;
}

function hexToAssColor(hex: string): string {
  if (!hex || hex === "transparent") return "&HFF000000";
  const clean = hex.replace("#", "");
  if (clean.length === 6) {
    const r = clean.substring(0, 2);
    const g = clean.substring(2, 4);
    const b = clean.substring(4, 6);
    return `&H00${b}${g}${r}&`;
  }
  return "&H00FFFFFF&";
}

function formatAssTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const cs = Math.floor((seconds % 1) * 100);

  return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

/**
 * Builds subtitle cues from storyboard scenes or word timestamps.
 */
export function buildSubtitleCues(
  scenes: Array<{
    scene_number: number;
    start_time: number;
    end_time: number;
    narration: string;
    on_screen_text?: string | null;
  }>,
  wordTimestamps?: Array<{ word: string; start: number; end: number }>
): SubtitleCue[] {
  // If high-resolution word timestamps exist, chunk them into 3-5 word bursts (Karaoke / Reels style)
  if (wordTimestamps && wordTimestamps.length > 0) {
    const cues: SubtitleCue[] = [];
    const burstSize = 4;

    for (let i = 0; i < wordTimestamps.length; i += burstSize) {
      const slice = wordTimestamps.slice(i, i + burstSize);
      if (slice.length > 0) {
        cues.push({
          id: cues.length + 1,
          startTimeSeconds: slice[0].start,
          endTimeSeconds: slice[slice.length - 1].end,
          text: slice.map((s) => s.word).join(" "),
        });
      }
    }
    return cues;
  }

  // Fallback to scene-level narration cues
  return scenes
    .filter((s) => s.narration && s.narration.trim().length > 0)
    .map((s, idx) => ({
      id: idx + 1,
      startTimeSeconds: Number(s.start_time),
      endTimeSeconds: Number(s.end_time),
      text: s.on_screen_text ? `${s.on_screen_text} — ${s.narration}` : s.narration,
    }));
}
