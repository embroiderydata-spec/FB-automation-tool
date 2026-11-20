import {
  VideoGenerationProvider,
  VideoJobOptions,
  VideoJobResult,
  VideoJobStatusResult,
} from "../types";
import { getVideoConfig } from "../config";

export class RunwayVideoProvider implements VideoGenerationProvider {
  name = "Runway";

  isConfigured(): boolean {
    const config = getVideoConfig();
    return config.isRunwayConfigured;
  }

  async testConnection(): Promise<{ success: boolean; message: string; latencyMs?: number }> {
    const config = getVideoConfig();
    if (!config.isRunwayConfigured) {
      return {
        success: false,
        message: "RUNWAY_API_KEY is not configured in .env.local.",
      };
    }

    const start = Date.now();
    try {
      // Runway auth check endpoint
      const res = await fetch("https://api.dev.runwayml.com/v1/tasks", {
        headers: {
          Authorization: `Bearer ${config.runwayApiKey}`,
          "X-Runway-Version": "2024-09-13",
        },
      });

      const latencyMs = Date.now() - start;

      if (!res.ok && res.status !== 404) {
        const text = await res.text();
        return {
          success: false,
          message: `Runway auth failed (${res.status}): ${text.slice(0, 150)}`,
          latencyMs,
        };
      }

      return {
        success: true,
        message: "Connected successfully to Runway Gen-3 API.",
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

  async generateVideo(options: VideoJobOptions): Promise<VideoJobResult> {
    const config = getVideoConfig();
    if (!config.isRunwayConfigured) {
      throw new Error("RUNWAY_API_KEY is not configured.");
    }

    // Runway Gen-3 Alpha Turbo image_to_video or text_to_video
    const res = await fetch("https://api.dev.runwayml.com/v1/image_to_video", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.runwayApiKey}`,
        "Content-Type": "application/json",
        "X-Runway-Version": "2024-09-13",
      },
      body: JSON.stringify({
        promptImage: options.imageReferenceUrl,
        promptText: options.prompt,
        model: "gen3a_turbo",
        duration: options.durationSeconds && options.durationSeconds >= 10 ? 10 : 5,
        ratio: options.aspectRatio === "9:16" ? "768:1280" : "1280:768",
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Runway API error (${res.status}): ${err.slice(0, 200)}`);
    }

    const data = await res.json();

    return {
      jobId: data.id,
      status: "processing",
      durationSeconds: options.durationSeconds || 5,
      costUsd: 0.25, // Gen-3 Alpha standard 5s generation cost
    };
  }

  async getJobStatus(jobId: string): Promise<VideoJobStatusResult> {
    const config = getVideoConfig();
    const res = await fetch(`https://api.dev.runwayml.com/v1/tasks/${jobId}`, {
      headers: {
        Authorization: `Bearer ${config.runwayApiKey}`,
        "X-Runway-Version": "2024-09-13",
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to check Runway task status: ${res.statusText}`);
    }

    const data = await res.json();
    let status: "pending" | "processing" | "completed" | "failed" = "processing";

    if (data.status === "SUCCEEDED") status = "completed";
    else if (data.status === "FAILED") status = "failed";
    else if (data.status === "PENDING") status = "pending";

    return {
      jobId,
      status,
      progressPercent: data.progress ? Math.round(data.progress * 100) : 0,
      videoUrl: Array.isArray(data.output) ? data.output[0] : undefined,
      error: data.failure,
    };
  }

  async getJobResult(jobId: string): Promise<VideoJobResult> {
    const statusResult = await this.getJobStatus(jobId);
    return {
      jobId,
      status: statusResult.status,
      videoUrl: statusResult.videoUrl,
      error: statusResult.error,
      costUsd: 0.25,
    };
  }

  async cancelJob(jobId: string): Promise<boolean> {
    const config = getVideoConfig();
    try {
      const res = await fetch(`https://api.dev.runwayml.com/v1/tasks/${jobId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${config.runwayApiKey}`,
          "X-Runway-Version": "2024-09-13",
        },
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
