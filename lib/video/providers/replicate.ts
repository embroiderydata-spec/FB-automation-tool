import {
  VideoGenerationProvider,
  VideoJobOptions,
  VideoJobResult,
  VideoJobStatusResult,
  ImageGenerationProvider,
  ImageJobOptions,
  ImageJobResult,
} from "../types";
import { getVideoConfig } from "../config";

export class ReplicateVideoProvider
  implements VideoGenerationProvider, ImageGenerationProvider
{
  name = "Replicate";

  isConfigured(): boolean {
    const config = getVideoConfig();
    return config.isReplicateConfigured;
  }

  /**
   * Tests connection to Replicate API using the configured token.
   */
  async testConnection(): Promise<{ success: boolean; message: string; latencyMs?: number }> {
    const config = getVideoConfig();
    if (!config.isReplicateConfigured) {
      return {
        success: false,
        message: "REPLICATE_API_TOKEN is not configured in .env.local.",
      };
    }

    const start = Date.now();
    try {
      const res = await fetch("https://api.replicate.com/v1/account", {
        headers: {
          Authorization: `Bearer ${config.replicateToken}`,
        },
      });

      const latencyMs = Date.now() - start;

      if (!res.ok) {
        const errorText = await res.text();
        return {
          success: false,
          message: `Replicate auth failed (${res.status}): ${errorText.slice(0, 150)}`,
          latencyMs,
        };
      }

      const data = await res.json();
      return {
        success: true,
        message: `Connected successfully to Replicate (Account: ${data.username || "Active"}).`,
        latencyMs,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Connection error: ${err.message}`,
        latencyMs: Date.now() - start,
      };
    }
  }

  /**
   * Generates a video scene via Replicate predictions API.
   * Supports both text-to-video and image-to-video (when imageReferenceUrl is supplied).
   */
  async generateVideo(options: VideoJobOptions): Promise<VideoJobResult> {
    const config = getVideoConfig();
    if (!config.isReplicateConfigured) {
      throw new Error("REPLICATE_API_TOKEN is not configured.");
    }

    const isImageToVideo = Boolean(options.imageReferenceUrl);

    // Default to minimax/video-01 or stable-video-diffusion
    const version = isImageToVideo
      ? "3f0457e4619da8151802e93e2617705192a014164bc77470be026bc755b8886b" // SVD
      : "0e0f319c5c04b46210f0f51950e33454749cb376e1a491ef8ee6cc9bc0ffb2a0"; // AnimateDiff / Minimax

    const inputPayload: Record<string, any> = {
      prompt: options.prompt,
      aspect_ratio: options.aspectRatio || "9:16",
      fps: options.fps || 24,
    };

    if (isImageToVideo && options.imageReferenceUrl) {
      inputPayload.input_image = options.imageReferenceUrl;
    }

    if (options.motionStrength) {
      inputPayload.motion_bucket_id = Math.round(options.motionStrength * 12);
    }

    const res = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.replicateToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version,
        input: inputPayload,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Replicate API error (${res.status}): ${errText.slice(0, 200)}`);
    }

    const data = await res.json();

    return {
      jobId: data.id,
      status: this.mapStatus(data.status),
      videoUrl: Array.isArray(data.output) ? data.output[0] : data.output,
      durationSeconds: options.durationSeconds || 3.5,
      costUsd: 0.05, // Estimated standard Replicate GPU generation cost
    };
  }

  /**
   * Polls prediction status
   */
  async getJobStatus(jobId: string): Promise<VideoJobStatusResult> {
    const config = getVideoConfig();
    const res = await fetch(`https://api.replicate.com/v1/predictions/${jobId}`, {
      headers: {
        Authorization: `Bearer ${config.replicateToken}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to check Replicate job status: ${res.statusText}`);
    }

    const data = await res.json();
    const status = this.mapStatus(data.status);

    let progress = 0;
    if (status === "completed") progress = 100;
    else if (status === "processing") progress = 50;
    else if (status === "pending") progress = 10;

    const videoUrl = Array.isArray(data.output) ? data.output[0] : data.output;

    return {
      jobId: data.id,
      status,
      progressPercent: progress,
      videoUrl,
      error: data.error,
    };
  }

  async getJobResult(jobId: string): Promise<VideoJobResult> {
    const statusResult = await this.getJobStatus(jobId);
    return {
      jobId,
      status: statusResult.status,
      videoUrl: statusResult.videoUrl,
      error: statusResult.error,
      costUsd: 0.05,
    };
  }

  async cancelJob(jobId: string): Promise<boolean> {
    const config = getVideoConfig();
    try {
      const res = await fetch(`https://api.replicate.com/v1/predictions/${jobId}/cancel`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.replicateToken}`,
        },
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Generates a 9:16 vertical keyframe image using Flux.1 Schnell / SDXL on Replicate.
   */
  async generateImage(options: ImageJobOptions): Promise<ImageJobResult> {
    const config = getVideoConfig();
    if (!config.isReplicateConfigured) {
      throw new Error("REPLICATE_API_TOKEN is not configured.");
    }

    // Flux Schnell model
    const res = await fetch(
      "https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.replicateToken}`,
          "Content-Type": "application/json",
          Prefer: "wait",
        },
        body: JSON.stringify({
          input: {
            prompt: options.prompt,
            aspect_ratio: options.aspectRatio === "9:16" ? "9:16" : "9:16",
            output_format: "webp",
            output_quality: 90,
          },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Replicate Image error (${res.status}): ${err.slice(0, 200)}`);
    }

    const data = await res.json();
    const outputUrl = Array.isArray(data.output) ? data.output[0] : data.output;

    if (!outputUrl) {
      throw new Error("No image output returned by Replicate.");
    }

    return {
      imageUrl: outputUrl,
      prompt: options.prompt,
      width: 768,
      height: 1344,
      costUsd: 0.003, // Flux Schnell cost per image
    };
  }

  private mapStatus(
    replicateStatus: string
  ): "pending" | "processing" | "completed" | "failed" | "cancelled" {
    switch (replicateStatus) {
      case "starting":
        return "pending";
      case "processing":
        return "processing";
      case "succeeded":
        return "completed";
      case "failed":
        return "failed";
      case "canceled":
        return "cancelled";
      default:
        return "processing";
    }
  }
}
