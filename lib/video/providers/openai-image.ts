import OpenAI from "openai";
import { ImageGenerationProvider, ImageJobOptions, ImageJobResult } from "../types";
import { getAIConfig } from "@/lib/ai/config";

export class OpenAIImageProvider implements ImageGenerationProvider {
  name = "OpenAI DALL-E 3";

  isConfigured(): boolean {
    const config = getAIConfig();
    return config.isConfigured;
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    const config = getAIConfig();
    if (!config.isConfigured) {
      return {
        success: false,
        message: "OPENAI_API_KEY is not configured.",
      };
    }
    return {
      success: true,
      message: "OpenAI DALL-E 3 client ready for vertical 9:16 image generation.",
    };
  }

  async generateImage(options: ImageJobOptions): Promise<ImageJobResult> {
    const config = getAIConfig();
    if (!config.isConfigured) {
      throw new Error("OPENAI_API_KEY is not configured in .env.local.");
    }

    const openai = new OpenAI({ apiKey: config.apiKey });

    // DALL-E 3 vertical 1024x1792 standard quality
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: `Vertical 9:16 video scene keyframe, photorealistic, cinematic composition: ${options.prompt}`,
      n: 1,
      size: "1024x1792",
      quality: options.quality === "hd" ? "hd" : "standard",
      style: options.style === "natural" ? "natural" : "vivid",
    });

    const url = response.data?.[0]?.url;
    if (!url) {
      throw new Error("No image URL returned from DALL-E 3.");
    }

    return {
      imageUrl: url,
      prompt: options.prompt,
      width: 1024,
      height: 1792,
      costUsd: options.quality === "hd" ? 0.08 : 0.04, // DALL-E 3 standard vertical rate
    };
  }
}
