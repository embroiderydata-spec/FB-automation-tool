import {
  VoiceGenerationProvider,
  VoiceJobOptions,
  VoiceJobResult,
  VoiceOption,
} from "../types";
import { getVideoConfig, ELEVENLABS_UNCONFIGURED_MESSAGE } from "../config";

export class ElevenLabsVoiceProvider implements VoiceGenerationProvider {
  name = "ElevenLabs";

  isConfigured(): boolean {
    const config = getVideoConfig();
    return config.isElevenLabsConfigured;
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    const config = getVideoConfig();
    if (!config.isElevenLabsConfigured) {
      return {
        success: false,
        message: ELEVENLABS_UNCONFIGURED_MESSAGE,
      };
    }

    try {
      const res = await fetch("https://api.elevenlabs.io/v1/user", {
        headers: {
          "xi-api-key": config.elevenLabsApiKey,
        },
      });

      if (!res.ok) {
        return {
          success: false,
          message: `ElevenLabs auth failed (${res.status}): Invalid API key.`,
        };
      }

      const data = await res.json();
      const tier = data.subscription?.tier || "Standard";
      const characterCount = data.subscription?.character_count || 0;
      const characterLimit = data.subscription?.character_limit || 0;

      return {
        success: true,
        message: `Connected successfully to ElevenLabs (${tier} tier: ${characterCount}/${characterLimit} chars used).`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Connection error: ${err.message}`,
      };
    }
  }

  async getVoices(): Promise<VoiceOption[]> {
    const config = getVideoConfig();
    if (!config.isElevenLabsConfigured) {
      // Fallback default curated voice list for UI selection before key input
      return [
        { voice_id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", category: "Calm & Natural" },
        { voice_id: "AZnzlk1XvdvUeBnXmlld", name: "Domi", category: "Energetic & Strong" },
        { voice_id: "EXAVITQu4vr4xnSDxMaL", name: "Bella", category: "Warm & Expressive" },
        { voice_id: "ErXwobaYiN019PkySvjV", name: "Antoni", category: "Authoritative" },
        { voice_id: "MF3mGyEYCl7XYWbV9V6O", name: "Elli", category: "Young & Bright" },
        { voice_id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh", category: "Deep & Narrative" },
        { voice_id: "VR6AewLTigWG4xSOukaG", name: "Arnold", category: "Crisp & Engaging" },
      ];
    }

    try {
      const res = await fetch("https://api.elevenlabs.io/v1/voices", {
        headers: {
          "xi-api-key": config.elevenLabsApiKey,
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to load ElevenLabs voices: ${res.statusText}`);
      }

      const data = await res.json();
      return (data.voices || []).map((v: any) => ({
        voice_id: v.voice_id,
        name: v.name,
        category: v.category || v.labels?.accent || "Curated",
        preview_url: v.preview_url,
        description: v.description,
      }));
    } catch {
      return [
        { voice_id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", category: "Calm & Natural" },
        { voice_id: "AZnzlk1XvdvUeBnXmlld", name: "Domi", category: "Energetic & Strong" },
      ];
    }
  }

  /**
   * Synthesizes audio using ElevenLabs text-to-speech API with timestamps.
   */
  async generateSpeech(options: VoiceJobOptions): Promise<VoiceJobResult> {
    const config = getVideoConfig();
    if (!config.isElevenLabsConfigured) {
      throw new Error(ELEVENLABS_UNCONFIGURED_MESSAGE);
    }

    const voiceId = options.voiceId || config.elevenLabsDefaultVoiceId;

    // Call ElevenLabs with-timestamps endpoint to extract word-level timings
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps`,
      {
        method: "POST",
        headers: {
          "xi-api-key": config.elevenLabsApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: options.text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: options.stability ?? 0.5,
            similarity_boost: options.similarityBoost ?? 0.75,
            speed: options.speed ?? 1.0,
          },
        }),
      }
    );

    if (!res.ok) {
      // Fallback to standard MP3 endpoint if with-timestamps is unavailable
      const fallbackRes = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: "POST",
          headers: {
            "xi-api-key": config.elevenLabsApiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: options.text,
            model_id: "eleven_multilingual_v2",
            voice_settings: {
              stability: options.stability ?? 0.5,
              similarity_boost: options.similarityBoost ?? 0.75,
            },
          }),
        }
      );

      if (!fallbackRes.ok) {
        const errorText = await fallbackRes.text();
        throw new Error(`ElevenLabs speech synthesis failed (${fallbackRes.status}): ${errorText.slice(0, 200)}`);
      }

      const arrayBuffer = await fallbackRes.arrayBuffer();
      const audioBuffer = Buffer.from(arrayBuffer);
      const wordCount = options.text.split(/\s+/).filter(Boolean).length;
      const durationSeconds = parseFloat((wordCount / 2.4).toFixed(2));

      return {
        audioBuffer,
        durationSeconds,
        voiceId,
        costUsd: parseFloat(((options.text.length / 1000) * 0.03).toFixed(4)), // $0.30 per 10k chars
      };
    }

    const json = await res.json();
    const audioBase64 = json.audio_base64;
    const audioBuffer = Buffer.from(audioBase64, "base64");

    // Parse alignment timestamps if returned
    const wordTimestamps: Array<{ word: string; start: number; end: number }> = [];
    if (json.alignment && Array.isArray(json.alignment.characters)) {
      const chars = json.alignment.characters;
      const startTimes = json.alignment.character_start_times_seconds || [];
      const endTimes = json.alignment.character_end_times_seconds || [];

      let currentWord = "";
      let wordStart = 0;

      for (let i = 0; i < chars.length; i++) {
        const c = chars[i];
        if (c === " " || i === chars.length - 1) {
          if (i === chars.length - 1 && c !== " ") currentWord += c;
          if (currentWord.trim().length > 0) {
            wordTimestamps.push({
              word: currentWord.trim(),
              start: parseFloat(wordStart.toFixed(2)),
              end: parseFloat((endTimes[i] || wordStart + 0.3).toFixed(2)),
            });
          }
          currentWord = "";
          wordStart = startTimes[i + 1] || 0;
        } else {
          if (currentWord.length === 0) wordStart = startTimes[i] || 0;
          currentWord += c;
        }
      }
    }

    const wordCount = options.text.split(/\s+/).filter(Boolean).length;
    const durationSeconds =
      wordTimestamps.length > 0
        ? wordTimestamps[wordTimestamps.length - 1].end
        : parseFloat((wordCount / 2.4).toFixed(2));

    return {
      audioBuffer,
      durationSeconds,
      voiceId,
      wordTimestamps,
      costUsd: parseFloat(((options.text.length / 1000) * 0.03).toFixed(4)),
    };
  }
}
