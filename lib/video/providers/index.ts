import {
  VideoGenerationProvider,
  ImageGenerationProvider,
  VoiceGenerationProvider,
} from "../types";
import { getVideoConfig } from "../config";
import { ReplicateVideoProvider } from "./replicate";
import { RunwayVideoProvider } from "./runway";
import { ElevenLabsVoiceProvider } from "./elevenlabs";
import { OpenAIImageProvider } from "./openai-image";

const replicateProvider = new ReplicateVideoProvider();
const runwayProvider = new RunwayVideoProvider();
const elevenLabsProvider = new ElevenLabsVoiceProvider();
const openAIImageProvider = new OpenAIImageProvider();

export function getVideoProvider(providerName?: string): VideoGenerationProvider {
  const config = getVideoConfig();
  const selected = (providerName || config.activeProvider || "replicate").toLowerCase();

  if (selected.includes("runway")) {
    return runwayProvider;
  }
  return replicateProvider;
}

export function getImageProvider(providerName?: string): ImageGenerationProvider {
  const selected = (providerName || "openai").toLowerCase();
  if (selected.includes("replicate")) {
    return replicateProvider;
  }
  return openAIImageProvider;
}

export function getVoiceProvider(providerName?: string): VoiceGenerationProvider {
  return elevenLabsProvider;
}

export async function checkAllProvidersStatus() {
  const config = getVideoConfig();

  return {
    replicate: {
      name: "Replicate",
      is_configured: config.isReplicateConfigured,
      capabilities: ["Text-to-Video", "Image-to-Video", "SDXL/Flux 9:16"],
      default_model: "minimax/video-01",
    },
    runway: {
      name: "Runway",
      is_configured: config.isRunwayConfigured,
      capabilities: ["Gen-3 Alpha Turbo", "Text-to-Video", "Image-to-Video"],
      default_model: "gen3a_turbo",
    },
    elevenlabs: {
      name: "ElevenLabs",
      is_configured: config.isElevenLabsConfigured,
      capabilities: ["Text-to-Speech", "Word-Level Timestamps", "Multilingual v2"],
      default_model: "eleven_multilingual_v2",
    },
    openai_image: {
      name: "OpenAI DALL-E 3",
      is_configured: Boolean(process.env.OPENAI_API_KEY),
      capabilities: ["Vertical 1024x1792 Image Generation"],
      default_model: "dall-e-3",
    },
  };
}
