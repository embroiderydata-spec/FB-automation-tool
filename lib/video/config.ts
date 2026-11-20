export interface VideoEngineConfig {
  activeProvider: "replicate" | "runway" | "mock";
  replicateToken: string;
  runwayApiKey: string;
  elevenLabsApiKey: string;
  elevenLabsDefaultVoiceId: string;
  maxConcurrentVideoJobs: number;
  dailyVideoBudget: number;
  isReplicateConfigured: boolean;
  isRunwayConfigured: boolean;
  isElevenLabsConfigured: boolean;
}

export const VIDEO_PROVIDER_UNCONFIGURED_MESSAGE =
  "Video generation provider is not configured. Add REPLICATE_API_TOKEN or RUNWAY_API_KEY in environment settings.";

export const ELEVENLABS_UNCONFIGURED_MESSAGE =
  "ElevenLabs is not configured. Add ELEVENLABS_API_KEY in environment settings to enable realistic AI voiceovers.";

/**
 * Returns centralized video & audio generation configuration from server environment.
 * Keys are strictly read server-side only.
 */
export function getVideoConfig(): VideoEngineConfig {
  const activeProvider = (process.env.VIDEO_PROVIDER?.toLowerCase() || "replicate") as
    | "replicate"
    | "runway"
    | "mock";

  const replicateToken = process.env.REPLICATE_API_TOKEN?.trim() || "";
  const runwayApiKey = process.env.RUNWAY_API_KEY?.trim() || "";
  const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY?.trim() || "";
  const elevenLabsDefaultVoiceId =
    process.env.ELEVENLABS_DEFAULT_VOICE_ID?.trim() || "21m00Tcm4TlvDq8ikWAM"; // Rachel

  const maxConcurrentVideoJobs = parseInt(
    process.env.MAX_CONCURRENT_VIDEO_JOBS || "2",
    10
  );
  const dailyVideoBudget = parseFloat(process.env.DAILY_VIDEO_BUDGET || "25.00");

  return {
    activeProvider,
    replicateToken,
    runwayApiKey,
    elevenLabsApiKey,
    elevenLabsDefaultVoiceId,
    maxConcurrentVideoJobs:
      isNaN(maxConcurrentVideoJobs) || maxConcurrentVideoJobs <= 0
        ? 2
        : maxConcurrentVideoJobs,
    dailyVideoBudget:
      isNaN(dailyVideoBudget) || dailyVideoBudget <= 0 ? 25.0 : dailyVideoBudget,
    isReplicateConfigured:
      replicateToken.length > 0 && !replicateToken.includes("placeholder"),
    isRunwayConfigured:
      runwayApiKey.length > 0 && !runwayApiKey.includes("placeholder"),
    isElevenLabsConfigured:
      elevenLabsApiKey.length > 0 && !elevenLabsApiKey.includes("placeholder"),
  };
}
