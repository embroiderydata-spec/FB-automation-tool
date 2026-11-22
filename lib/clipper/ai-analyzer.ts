import { probeVideoFile, getFFmpegPath } from "./ffmpeg-engine";
import {
  VideoAnalysisResult,
  ViralCandidateClip,
  ViralCategory,
  SubtitleStyle,
  ReframingMode,
  TargetPlatform,
  ClipDurationPreset,
  ViralityBreakdown,
  TranscriptCue,
} from "./types";
import { getProviderApiKey } from "@/lib/ai/provider-keys";
import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";
import { spawn } from "child_process";

export interface ParsedVideoUrl {
  isValid: boolean;
  type: "youtube" | "direct_url" | "library" | "upload" | "unknown";
  url: string;
  videoId?: string;
  error?: string;
}

/**
 * Parses and validates video URLs (YouTube, direct MP4/MOV, or web videos).
 */
export function parseVideoUrl(inputUrl: string): ParsedVideoUrl {
  if (!inputUrl || typeof inputUrl !== "string") {
    return {
      isValid: false,
      type: "unknown",
      url: "",
      error: "Please enter a valid video link.",
    };
  }

  const trimmed = inputUrl.trim();

  // 1. YouTube Detection
  const ytMatch = trimmed.match(
    /(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (ytMatch && ytMatch[1]) {
    return {
      isValid: true,
      type: "youtube",
      url: trimmed,
      videoId: ytMatch[1],
    };
  }

  // 2. Direct Video Files (MP4, MOV, WebM, M4V) or Cloud Storage
  try {
    const parsed = new URL(trimmed);
    const pathname = parsed.pathname.toLowerCase();
    const isDirectVideo =
      pathname.endsWith(".mp4") ||
      pathname.endsWith(".mov") ||
      pathname.endsWith(".webm") ||
      pathname.endsWith(".m4v") ||
      parsed.hostname.includes("supabase.co") ||
      parsed.searchParams.get("mime")?.includes("video") ||
      parsed.hostname.includes("storage.googleapis.com") ||
      parsed.hostname.includes("amazonaws.com");

    if (isDirectVideo || parsed.protocol.startsWith("http")) {
      return {
        isValid: true,
        type: isDirectVideo ? "direct_url" : "direct_url",
        url: trimmed,
      };
    }
  } catch {
    // Not a valid URL
  }

  return {
    isValid: false,
    type: "unknown",
    url: trimmed,
    error: "Invalid URL format. Please paste a YouTube link or direct video URL.",
  };
}

export function formatTimestamp(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `00:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function parseTimestamp(ts: string): number {
  const parts = ts.trim().split(":").map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return Number(ts) || 0;
}

interface YouTubeMetadata {
  title: string;
  author: string;
  thumbnail: string;
  durationSeconds?: number;
  transcript?: Array<{ start: number; duration: number; text: string }>;
}

/**
 * Fetches YouTube metadata and public transcript without third-party scrapers.
 */
export async function fetchYouTubeMetadata(videoId: string): Promise<YouTubeMetadata> {
  let title = `YouTube Video (${videoId})`;
  let author = "YouTube Creator";
  let thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  let durationSeconds = 300; // default fallback
  let transcript: Array<{ start: number; duration: number; text: string }> = [];

  // 1. Fetch official oEmbed for exact title and author
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json();
      if (data.title) title = data.title;
      if (data.author_name) author = data.author_name;
      if (data.thumbnail_url) thumbnail = data.thumbnail_url;
    }
  } catch {}

  // 2. Fetch watch page to extract exact duration and caption tracks
  try {
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(7000),
    });
    if (pageRes.ok) {
      const html = await pageRes.text();

      // Extract duration
      const lenMatch = html.match(/"lengthSeconds":"(\d+)"/);
      if (lenMatch && lenMatch[1]) {
        durationSeconds = parseInt(lenMatch[1], 10);
      }

      // Check for captionTracks
      const captionMatch = html.match(/"captionTracks":(\[.*?\])/);
      if (captionMatch && captionMatch[1]) {
        try {
          const tracks = JSON.parse(captionMatch[1]);
          if (Array.isArray(tracks) && tracks.length > 0) {
            const track =
              tracks.find((t: any) => t.languageCode?.startsWith("en")) || tracks[0];
            if (track?.baseUrl) {
              const subRes = await fetch(track.baseUrl, {
                headers: {
                  "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                },
                signal: AbortSignal.timeout(6000),
              });
              if (subRes.ok) {
                const xml = await subRes.text();
                const regex = /<text\s+start="([\d.]+)"(?:\s+dur="([\d.]+)")?[^>]*>(.*?)<\/text>/g;
                let m;
                while ((m = regex.exec(xml)) !== null) {
                  const s = parseFloat(m[1]);
                  const d = m[2] ? parseFloat(m[2]) : 3.0;
                  const rawText = m[3]
                    .replace(/&amp;/g, "&")
                    .replace(/&lt;/g, "<")
                    .replace(/&gt;/g, ">")
                    .replace(/&#39;/g, "'")
                    .replace(/&quot;/g, '"')
                    .replace(/<[^>]+>/g, "")
                    .trim();
                  if (rawText) {
                    transcript.push({ start: s, duration: d, text: rawText });
                  }
                }
              }
            }
          }
        } catch {}
      }
    }
  } catch {}

  return {
    title,
    author,
    thumbnail,
    durationSeconds: Math.max(15, durationSeconds),
    transcript: transcript.length > 0 ? transcript : undefined,
  };
}

export interface AnalyzeVideoOptions {
  videoUrl: string;
  sourceType: "youtube" | "direct_url" | "library" | "upload";
  videoId?: string;
  title: string;
  author?: string;
  duration: number;
  resolution?: string;
  thumbnailUrl?: string;
  transcript?: Array<{ start: number; duration: number; text: string }>;
  userId?: string;
  clipCount?: number;
  durationPreset?: ClipDurationPreset;
  targetPlatform?: TargetPlatform;
  language?: string;
  aiInstructions?: string;
  topicQuery?: string;
}

/**
 * Generates OpusClip-style viral candidate clips using AI (or heuristic analysis if AI key unavailable).
 */
export async function analyzeVideoViralMoments(
  params: AnalyzeVideoOptions
): Promise<VideoAnalysisResult> {
  const {
    videoUrl,
    sourceType,
    videoId,
    title,
    author,
    duration,
    resolution = "1080x1920",
    thumbnailUrl,
    transcript = [],
    userId = "default-user",
    clipCount = 5,
    durationPreset = "30-60",
    targetPlatform = "both",
    language = "auto",
    aiInstructions,
    topicQuery,
  } = params;

  const durationFormatted = formatTimestamp(duration);
  const transcriptAvailable = transcript && transcript.length > 0;

  // Convert raw transcript to structured cues
  const transcriptCues: TranscriptCue[] = transcript.map((t) => ({
    start: Number(t.start.toFixed(2)),
    end: Number((t.start + t.duration).toFixed(2)),
    text: t.text,
  }));

  // Format transcript summary covering the ENTIRE video duration without cutting off after first 2 minutes
  let transcriptSnippet = "";
  if (transcriptAvailable) {
    if (transcript.length <= 150) {
      transcriptSnippet = transcript
        .map((t) => `[${formatTimestamp(t.start)}] ${t.text}`)
        .join("\n");
    } else {
      const step = transcript.length / 120;
      const sampled: string[] = [];
      for (let i = 0; i < 120; i++) {
        const idx = Math.min(transcript.length - 1, Math.floor(i * step));
        const t = transcript[idx];
        sampled.push(`[${formatTimestamp(t.start)}] ${t.text}`);
      }
      transcriptSnippet = sampled.join("\n");
    }
  }

  // Duration range bounds based on preset
  let minClipDur = 30;
  let maxClipDur = 60;
  if (durationPreset === "15-30") {
    minClipDur = 15;
    maxClipDur = 30;
  } else if (durationPreset === "60-90") {
    minClipDur = 60;
    maxClipDur = 90;
  } else if (durationPreset === "90-180") {
    minClipDur = 90;
    maxClipDur = 180;
  } else if (durationPreset === "custom") {
    minClipDur = 15;
    maxClipDur = 120;
  }

  // Clamp max clip duration to total duration
  if (maxClipDur > duration) {
    maxClipDur = Math.max(15, Math.floor(duration));
    minClipDur = Math.min(minClipDur, Math.floor(maxClipDur * 0.5));
  }

  const requestedCount = Math.min(15, Math.max(1, clipCount));
  let candidateClips: ViralCandidateClip[] = [];

  // 1. Try OpenAI / Configured LLM Provider
  try {
    let apiKey = process.env.OPENAI_API_KEY;
    if (userId) {
      try {
        const userKeyInfo = await getProviderApiKey("openai", userId);
        if (userKeyInfo.apiKey) apiKey = userKeyInfo.apiKey;
      } catch {}
    }

    if (apiKey && apiKey.length > 10 && !apiKey.includes("placeholder")) {
      const openai = new OpenAI({ apiKey });

      const prompt = `You are a world-class viral video strategist and AI clipping intelligence engine (like OpusClip for YouTube Shorts and Facebook Reels).
Analyze the video content below and identify exactly ${requestedCount} of the HIGHEST VIRAL POTENTIAL moments.

Video Details:
- Title: "${title}"
- Creator/Author: "${author || "Unknown"}"
- Total Duration: ${durationFormatted} (${duration} seconds)
- Preferred Duration Window: Between ${minClipDur} and ${maxClipDur} seconds per clip
- Target Platform: ${targetPlatform === "both" ? "Facebook Reels & YouTube Shorts" : targetPlatform === "youtube_shorts" ? "YouTube Shorts" : "Facebook Reels"}
${language && language !== "auto" ? `- Preferred Language: ${language}` : ""}
${aiInstructions ? `- Custom User Instructions: "${aiInstructions}"` : `- Focus: Find the most interesting, funny, emotional, educational, controversial, or surprising moments.`}
${topicQuery ? `- Priority Search Topic: Find moments specifically addressing: "${topicQuery}"` : ""}
${transcriptSnippet ? `- Spoken Transcript Excerpt:\n${transcriptSnippet}` : "- No transcript available. Generate realistic viral moment windows based on standard narrative peaks in a video of this length."}

CRITICAL RULES:
1. Every candidate clip must have start_time and end_time strictly between 0 and ${duration}.
2. Duration (end_time - start_time) must be between ${minClipDur} and ${maxClipDur} seconds.
3. Clips MUST start at the beginning of a complete thought/sentence and end on a satisfying punchline or resolution (no abrupt cuts mid-word).
4. Evaluate and generate:
   - Overall viral_score (0-100)
   - Diagnostic virality breakdown (each 0-100):
     * hook: Opening 3s impact & curiosity
     * emotional: Emotional intensity / humor / shock
     * value: Actionable advice / learning payoff
     * retention: Story rhythm & speech continuity
     * quality: Visual & narrative completeness
   - category: 'funny' | 'emotional' | 'educational' | 'surprising' | 'hook' | 'high_retention' | 'controversial' | 'storytelling'
   - reason: Clear explanation of why this moment will go viral (e.g. "Strong opening question, clear context, surprising conclusion and high emotional engagement.")
   - 5 viral title variants (punchy, high CTR)
   - 3 hook opening overlay variants
   - 3 caption options with relevant hashtags

Output strictly valid JSON with no markdown wrapping:
{
  "clips": [
    {
      "clip_number": 1,
      "title": "Title of the clip",
      "start_time": 25,
      "end_time": 65,
      "viral_score": 96,
      "virality_breakdown": {
        "hook": 98,
        "emotional": 92,
        "value": 95,
        "retention": 94,
        "quality": 96
      },
      "category": "surprising",
      "hook": "Opening hook phrase in first 3s",
      "reason": "Strong opening question, clear context, surprising conclusion and high emotional engagement.",
      "caption": "Recommended high-engagement caption",
      "hashtags": ["#Shorts", "#Viral", "#FYP", "#Trending"],
      "title_options": ["Title 1", "Title 2", "Title 3", "Title 4", "Title 5"],
      "hook_options": ["Hook 1", "Hook 2", "Hook 3"],
      "caption_options": ["Caption 1", "Caption 2", "Caption 3"]
    }
  ]
}`;

      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      const responseText = completion.choices[0]?.message?.content;
      if (responseText) {
        const parsed = JSON.parse(responseText);
        if (parsed.clips && Array.isArray(parsed.clips) && parsed.clips.length > 0) {
          candidateClips = parsed.clips.map((c: any, index: number) => {
            const start = Math.max(0, Math.min(duration - 15, Number(c.start_time) || 0));
            const end = Math.min(duration, Math.max(start + 15, Number(c.end_time) || start + 30));
            const clipDur = Math.round(end - start);

            const breakdown: ViralityBreakdown = {
              hook: Math.min(99, Math.max(65, Number(c.virality_breakdown?.hook) || 90)),
              emotional: Math.min(99, Math.max(65, Number(c.virality_breakdown?.emotional) || 88)),
              value: Math.min(99, Math.max(65, Number(c.virality_breakdown?.value) || 89)),
              retention: Math.min(99, Math.max(65, Number(c.virality_breakdown?.retention) || 91)),
              quality: Math.min(99, Math.max(65, Number(c.virality_breakdown?.quality) || 92)),
            };

            const computedScore = Math.round(
              breakdown.hook * 0.25 +
              breakdown.emotional * 0.2 +
              breakdown.value * 0.2 +
              breakdown.retention * 0.2 +
              breakdown.quality * 0.15
            );

            // Filter relevant transcript cues for this clip window
            const cues = transcriptCues.filter(
              (cue) => cue.start >= start - 1 && cue.end <= end + 1
            );

            return {
              clip_number: index + 1,
              title: c.title || `Viral Moment #${index + 1}`,
              start_time: start,
              end_time: end,
              start_formatted: formatTimestamp(start),
              end_formatted: formatTimestamp(end),
              duration: clipDur,
              viral_score: Math.min(99, Math.max(70, Number(c.viral_score) || computedScore)),
              virality_breakdown: breakdown,
              category: (c.category as ViralCategory) || "high_retention",
              hook: c.hook || "Instant curiosity hook in the opening seconds",
              reason:
                c.reason ||
                "Strong opening hook, complete narrative context, and high audience retention potential.",
              caption: c.caption || `${c.title || title} #Shorts #Viral #Reels`,
              hashtags:
                Array.isArray(c.hashtags) && c.hashtags.length > 0
                  ? c.hashtags
                  : ["#Shorts", "#Viral", "#Reels", "#Trending"],
              title_options:
                Array.isArray(c.title_options) && c.title_options.length === 5
                  ? c.title_options
                  : [
                      c.title,
                      `Must Watch: ${c.title}`,
                      `Wait for it...`,
                      `The Craziest Part`,
                      `Unbelievable Moment`,
                    ],
              hook_options:
                Array.isArray(c.hook_options) && c.hook_options.length === 3
                  ? c.hook_options
                  : [
                      c.hook,
                      `You won't believe what happens next`,
                      `Watch until the end`,
                    ],
              caption_options:
                Array.isArray(c.caption_options) && c.caption_options.length === 3
                  ? c.caption_options
                  : [
                      c.caption,
                      `Did you expect this? Let me know below!`,
                      `Drop a 🔥 if this blew your mind`,
                    ],
              transcript_cues: cues.length > 0 ? cues : undefined,
              selected: index < Math.min(3, requestedCount),
              aspect_ratio: "9:16",
              reframing_mode: "blurred_backdrop",
              subtitle_style: "hormozi",
              target_platforms: targetPlatform,
              status: "candidate",
            };
          });
        }
      }
    }
  } catch (err: any) {
    console.warn("AI generation failed or fell back to heuristics:", err.message);
  }

  // 2. Fallback Heuristic Generator if API keys are unconfigured or AI returned empty
  if (candidateClips.length === 0) {
    candidateClips = generateHeuristicViralClips({
      title,
      duration,
      transcript,
      requestedCount,
      minClipDur,
      maxClipDur,
      targetPlatform,
      aiInstructions,
    });
  }

  return {
    video_url: videoUrl,
    source_type: sourceType,
    video_id: videoId,
    title,
    author,
    duration,
    duration_formatted: durationFormatted,
    resolution,
    thumbnail_url: thumbnailUrl,
    transcript_available: transcriptAvailable,
    transcript_text: transcriptSnippet.slice(0, 1000),
    transcript_cues: transcriptCues,
    candidate_clips: candidateClips,
    analyzed_at: new Date().toISOString(),
    preferences: {
      clip_count: requestedCount,
      duration_preset: durationPreset,
      target_platform: targetPlatform,
      language,
      ai_instructions: aiInstructions,
    },
  };
}

/**
 * Searches the transcript or video for a specific user topic or query (e.g. "biggest mistake beginners make").
 */
export async function searchTranscriptForTopic(params: {
  topicQuery: string;
  transcript: Array<{ start: number; duration: number; text: string }>;
  videoDuration: number;
  videoTitle: string;
  userId?: string;
}): Promise<ViralCandidateClip | null> {
  const { topicQuery, transcript, videoDuration, videoTitle, userId } = params;

  if (!topicQuery || !topicQuery.trim()) return null;
  const query = topicQuery.trim().toLowerCase();

  // 1. First search via LLM if available for semantic matching
  try {
    let apiKey = process.env.OPENAI_API_KEY;
    if (userId) {
      try {
        const userKeyInfo = await getProviderApiKey("openai", userId);
        if (userKeyInfo.apiKey) apiKey = userKeyInfo.apiKey;
      } catch {}
    }

    if (apiKey && apiKey.length > 10 && transcript.length > 0) {
      const openai = new OpenAI({ apiKey });
      const transcriptFormatted = transcript
        .slice(0, 200)
        .map((t) => `[${formatTimestamp(t.start)}] ${t.text}`)
        .join("\n");

      const prompt = `Search this transcript for the moment where the speaker discusses: "${topicQuery}".
Transcript:
${transcriptFormatted}

Find the exact start and end seconds that capture this moment fully (30-60s length).
Output strictly valid JSON:
{
  "found": true,
  "start_time": 42,
  "end_time": 85,
  "title": "Title for this moment",
  "hook": "Opening hook",
  "reason": "Why this matches the topic"
}`;

      const res = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const parsed = JSON.parse(res.choices[0]?.message?.content || "{}");
      if (parsed.found && parsed.start_time !== undefined) {
        const start = Math.max(0, Number(parsed.start_time));
        const end = Math.min(videoDuration, Math.max(start + 20, Number(parsed.end_time) || start + 45));
        const dur = end - start;

        return {
          clip_number: 99,
          title: parsed.title || `Topic: ${topicQuery.slice(0, 30)}`,
          start_time: start,
          end_time: end,
          start_formatted: formatTimestamp(start),
          end_formatted: formatTimestamp(end),
          duration: dur,
          viral_score: 95,
          virality_breakdown: { hook: 96, emotional: 90, value: 98, retention: 94, quality: 95 },
          category: "educational",
          hook: parsed.hook || `Here is what you need to know about ${topicQuery}`,
          reason: parsed.reason || `Directly addresses topic: "${topicQuery}" with high clarity.`,
          caption: `Must watch: ${topicQuery} 🔥 #Shorts #Viral #Reels`,
          hashtags: ["#Shorts", "#Viral", "#Education", "#Tips"],
          title_options: [
            parsed.title || `Topic: ${topicQuery}`,
            `The Truth About ${topicQuery}`,
            `Watch This Before You ${topicQuery}`,
            `Why ${topicQuery} Matters`,
            `The Secret Behind ${topicQuery}`,
          ],
          hook_options: [
            `Pay attention to this right here`,
            `The biggest mistake people make...`,
            `Here is the exact truth`,
          ],
          caption_options: [
            `Did you know this? Let me know below!`,
            `Save this video for reference 📌`,
            `Share with someone who needs this! 🔥`,
          ],
          selected: true,
          aspect_ratio: "9:16",
          reframing_mode: "blurred_backdrop",
          subtitle_style: "hormozi",
          status: "candidate",
        };
      }
    }
  } catch {}

  // 2. Keyword fallback search in transcript
  if (transcript && transcript.length > 0) {
    const queryTokens = query.split(/\s+/).filter((w) => w.length > 3);
    let bestIndex = -1;
    let maxMatches = 0;

    transcript.forEach((line, idx) => {
      const lineText = line.text.toLowerCase();
      let matches = 0;
      queryTokens.forEach((token) => {
        if (lineText.includes(token)) matches++;
      });
      if (matches > maxMatches) {
        maxMatches = matches;
        bestIndex = idx;
      }
    });

    if (bestIndex !== -1) {
      const targetLine = transcript[bestIndex];
      const start = Math.max(0, Math.floor(targetLine.start - 2));
      const end = Math.min(videoDuration, start + 45);

      return {
        clip_number: 99,
        title: `Topic: ${topicQuery.slice(0, 30)}`,
        start_time: start,
        end_time: end,
        start_formatted: formatTimestamp(start),
        end_formatted: formatTimestamp(end),
        duration: end - start,
        viral_score: 93,
        virality_breakdown: { hook: 92, emotional: 88, value: 96, retention: 91, quality: 92 },
        category: "educational",
        hook: `Look at what the speaker says about ${topicQuery.slice(0, 25)}`,
        reason: `Matched transcript segment discussing: "${topicQuery}".`,
        caption: `Important insight on ${topicQuery} #Shorts #Viral #Reels`,
        hashtags: ["#Shorts", "#Viral", "#Reels", "#Learning"],
        title_options: [
          `Topic: ${topicQuery}`,
          `Everything You Need To Know About ${topicQuery}`,
          `Key Takeaway: ${topicQuery}`,
          `Don't Miss This Part!`,
          `Essential Highlight: ${topicQuery}`,
        ],
        hook_options: [
          `Stop scrolling and listen to this`,
          `This explains everything`,
          `The most important lesson right here`,
        ],
        caption_options: [
          `What do you think about this?`,
          `Drop your questions in the comments!`,
          `Follow for more daily highlights!`,
        ],
        selected: true,
        aspect_ratio: "9:16",
        reframing_mode: "blurred_backdrop",
        subtitle_style: "hormozi",
        status: "candidate",
      };
    }
  }

  return null;
}

/**
 * Heuristic viral clip analyzer when API keys are unconfigured.
 */
function generateHeuristicViralClips(params: {
  title: string;
  duration: number;
  transcript?: Array<{ start: number; duration: number; text: string }>;
  requestedCount: number;
  minClipDur: number;
  maxClipDur: number;
  targetPlatform: TargetPlatform;
  aiInstructions?: string;
}): ViralCandidateClip[] {
  const {
    title,
    duration,
    transcript,
    requestedCount,
    minClipDur,
    maxClipDur,
    targetPlatform,
  } = params;

  const clips: ViralCandidateClip[] = [];

  const archetypes: Array<{
    cat: ViralCategory;
    titlePrefix: string;
    score: number;
    breakdown: ViralityBreakdown;
    reason: string;
  }> = [
    {
      cat: "hook",
      titlePrefix: "Opening Hook & First Impression",
      score: 96,
      breakdown: { hook: 98, emotional: 90, value: 94, retention: 96, quality: 95 },
      reason: "Immediate curiosity driver that captures viewer attention within the first 3 seconds.",
    },
    {
      cat: "surprising",
      titlePrefix: "The Most Unexpected Moment",
      score: 94,
      breakdown: { hook: 94, emotional: 96, value: 90, retention: 95, quality: 93 },
      reason: "Mid-video plot twist and high-retention energy spike that keeps viewers glued to the screen.",
    },
    {
      cat: "educational",
      titlePrefix: "The Core Insight & Takeaway",
      score: 92,
      breakdown: { hook: 91, emotional: 86, value: 99, retention: 93, quality: 94 },
      reason: "High-value, actionable takeaway with exceptional shareability across social platforms.",
    },
    {
      cat: "emotional",
      titlePrefix: "Emotional Climax",
      score: 95,
      breakdown: { hook: 93, emotional: 99, value: 88, retention: 95, quality: 96 },
      reason: "Peak emotional resonance with dramatic buildup and memorable realization.",
    },
    {
      cat: "funny",
      titlePrefix: "The Funniest Highlight",
      score: 91,
      breakdown: { hook: 92, emotional: 95, value: 84, retention: 93, quality: 91 },
      reason: "Spontaneous entertainment peak designed for re-watches and viral comment engagement.",
    },
    {
      cat: "controversial",
      titlePrefix: "The Most Heated Debate",
      score: 93,
      breakdown: { hook: 96, emotional: 94, value: 91, retention: 92, quality: 93 },
      reason: "Provocative statement that naturally drives comments, debates, and shares.",
    },
    {
      cat: "storytelling",
      titlePrefix: "The Compelling Story Arc",
      score: 95,
      breakdown: { hook: 94, emotional: 93, value: 95, retention: 97, quality: 96 },
      reason: "Complete narrative arc with suspense, conflict, and satisfying climax.",
    },
  ];

  // If transcript is available, use sentence clusters
  if (transcript && transcript.length >= 4) {
    const candidateWindows: Array<{
      start: number;
      end: number;
      text: string;
      score: number;
      cat: ViralCategory;
      breakdown: ViralityBreakdown;
      cues: TranscriptCue[];
    }> = [];

    for (let i = 0; i < transcript.length - 2; i += 2) {
      const line1 = transcript[i];
      const endLine = transcript[Math.min(transcript.length - 1, i + 6)];
      const startTime = Math.floor(line1.start);
      const endTime = Math.min(duration, Math.ceil(endLine.start + endLine.duration));
      const dur = endTime - startTime;

      if (dur >= minClipDur && dur <= maxClipDur) {
        const combinedText = transcript.slice(i, i + 7).map((t) => t.text).join(" ");
        let score = 88;
        let cat: ViralCategory = "high_retention";

        if (combinedText.includes("?") || combinedText.toLowerCase().includes("why") || combinedText.toLowerCase().includes("how")) {
          score += 6;
          cat = "educational";
        }
        if (combinedText.includes("!") || combinedText.toLowerCase().includes("crazy") || combinedText.toLowerCase().includes("never")) {
          score += 5;
          cat = "surprising";
        }
        if (combinedText.toLowerCase().includes("laugh") || combinedText.toLowerCase().includes("funny") || combinedText.toLowerCase().includes("joke")) {
          score += 4;
          cat = "funny";
        }
        if (startTime < 45) {
          score += 3;
          cat = "hook";
        }

        const cues: TranscriptCue[] = transcript.slice(i, i + 7).map((t) => ({
          start: Number(t.start.toFixed(2)),
          end: Number((t.start + t.duration).toFixed(2)),
          text: t.text,
        }));

        candidateWindows.push({
          start: startTime,
          end: endTime,
          text: combinedText,
          score: Math.min(98, score),
          cat,
          breakdown: {
            hook: Math.min(99, score + 2),
            emotional: Math.min(99, score - 2),
            value: Math.min(99, score + 1),
            retention: Math.min(99, score),
            quality: 94,
          },
          cues,
        });
      }
    }

    // Sort by score and pick top requestedCount non-overlapping
    candidateWindows.sort((a, b) => b.score - a.score);
    const selectedWindows: typeof candidateWindows = [];

    for (const win of candidateWindows) {
      const overlaps = selectedWindows.some(
        (sw) => Math.max(sw.start, win.start) < Math.min(sw.end, win.end)
      );
      if (!overlaps && selectedWindows.length < requestedCount) {
        selectedWindows.push(win);
      }
    }

    selectedWindows.sort((a, b) => a.start - b.start);

    selectedWindows.forEach((win, idx) => {
      const clipNumber = idx + 1;
      const cleanTitle = win.text.slice(0, 40).replace(/["'\\]/g, "") + "...";

      clips.push({
        clip_number: clipNumber,
        title: cleanTitle.length > 5 ? cleanTitle : `${title} - Part ${clipNumber}`,
        start_time: win.start,
        end_time: win.end,
        start_formatted: formatTimestamp(win.start),
        end_formatted: formatTimestamp(win.end),
        duration: win.end - win.start,
        viral_score: win.score,
        virality_breakdown: win.breakdown,
        category: win.cat,
        hook: `Look at this: "${win.text.slice(0, 35)}..."`,
        reason: "Strong hook identified from spoken dialogue with rapid pacing and standalone context.",
        caption: `Wait for it... 🔥 ${win.text.slice(0, 60)} #Shorts #Viral #Trending`,
        hashtags: ["#Shorts", "#Viral", "#Reels", "#Trending", "#FYP"],
        title_options: [
          cleanTitle,
          `The Craziest Part of "${title}"`,
          `You Won't Believe This Moment`,
          `Nobody Expected This to Happen`,
          `Wait Till The End...`,
        ],
        hook_options: [
          `You have to see this right now`,
          `Watch what happens in 3, 2, 1...`,
          `This completely caught me off guard`,
        ],
        caption_options: [
          `Did you expect this? Drop your thoughts below! 👇`,
          `Share this with someone who needs to see this! 🔥`,
          `Save this video for later 📌`,
        ],
        transcript_cues: win.cues,
        selected: idx < Math.min(3, requestedCount),
        aspect_ratio: "9:16",
        reframing_mode: "blurred_backdrop",
        subtitle_style: "hormozi",
        target_platforms: targetPlatform,
        status: "candidate",
      });
    });
  }

  // Fallback: Partition video length uniformly
  if (clips.length === 0) {
    const totalDur = Math.max(30, duration);
    const count = Math.min(requestedCount, Math.max(2, Math.floor(totalDur / 45)));
    const segDur = Math.min(maxClipDur, Math.max(minClipDur, Math.floor(totalDur / count)));

    for (let i = 0; i < count; i++) {
      const start = Math.floor(i * (totalDur / count));
      const end = Math.min(totalDur, start + segDur);
      const arch = archetypes[i % archetypes.length];

      clips.push({
        clip_number: i + 1,
        title: `${arch.titlePrefix}: ${title.slice(0, 30)}`,
        start_time: start,
        end_time: end,
        start_formatted: formatTimestamp(start),
        end_formatted: formatTimestamp(end),
        duration: end - start,
        viral_score: arch.score,
        virality_breakdown: arch.breakdown,
        category: arch.cat,
        hook: `You won't believe what happens in this clip`,
        reason: arch.reason,
        caption: `Wait for it... 🔥 Watch until the end! #Shorts #Viral #Reels`,
        hashtags: ["#Shorts", "#Viral", "#Reels", "#Trending", "#ForYou"],
        title_options: [
          `${arch.titlePrefix}: ${title.slice(0, 25)}`,
          `This Moment Blew Everyone Away!`,
          `The Best Part of ${title.slice(0, 20)}`,
          `Nobody Expected This!`,
          `Watch What Happens Next...`,
        ],
        hook_options: [
          `Stop scrolling! You need to see this.`,
          `I still cannot believe this happened.`,
          `Watch closely right here...`,
        ],
        caption_options: [
          `Did you see that coming? Let me know in the comments! 👇`,
          `Tag a friend who needs to see this right now! 😂`,
          `Like and follow for more insane moments! 🔥`,
        ],
        selected: i < Math.min(3, count),
        aspect_ratio: "9:16",
        reframing_mode: "blurred_backdrop",
        subtitle_style: "hormozi",
        target_platforms: targetPlatform,
        status: "candidate",
      });
    }
  }

  return clips;
}

/**
 * Downloads a remote video file (from direct MP4 URL or storage) to a local temp file.
 */
export async function downloadRemoteVideo(
  url: string,
  targetPath: string
): Promise<string> {
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)",
    },
    signal: AbortSignal.timeout(60000), // 60s timeout
  });

  if (!res.ok) {
    throw new Error(
      `Failed to download video from URL: ${res.status} ${res.statusText}`
    );
  }

  const arrayBuffer = await res.arrayBuffer();
  fs.writeFileSync(targetPath, Buffer.from(arrayBuffer));
  return targetPath;
}
