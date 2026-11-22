import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { createClient as createDirectSupabase } from "@supabase/supabase-js";
import { DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY } from "@/lib/supabase/client";
import { renderVideoClip, probeVideoFile } from "@/lib/clipper/ffmpeg-engine";
import { saveUserClip } from "@/lib/clipper/storage";
import { downloadRemoteVideo, parseVideoUrl } from "@/lib/clipper/ai-analyzer";
import { BatchClipRequestItem, VideoClipRecord } from "@/lib/clipper/types";
import * as fs from "fs";
import * as path from "path";
import crypto from "crypto";

export const dynamic = "force-dynamic";

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    DEFAULT_SUPABASE_ANON_KEY;
  return createDirectSupabase(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const {
      source_video_url,
      source_local_path,
      source_video_name = "Source Video",
      clips,
    } = body;

    if (!clips || !Array.isArray(clips) || clips.length === 0) {
      return NextResponse.json(
        { error: "At least one clip must be selected for generation." },
        { status: 400 }
      );
    }

    // 1. Resolve source video file locally for FFmpeg processing
    let localSource = source_local_path;

    if (!localSource || !fs.existsSync(localSource)) {
      if (!source_video_url) {
        return NextResponse.json(
          { error: "Source video URL or local file path is required." },
          { status: 400 }
        );
      }

      const parsed = parseVideoUrl(source_video_url);

      if (parsed.type === "youtube") {
        return NextResponse.json(
          {
            error:
              "Direct YouTube video streaming requires downloading permissions. Please provide a direct video URL or upload the video file directly to render clips.",
            requires_upload: true,
          },
          { status: 400 }
        );
      }

      // Download direct video URL to temp directory
      const tempDir = path.join(process.cwd(), "tmp", "sources");
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      const hash = crypto.createHash("md5").update(source_video_url).digest("hex");
      localSource = path.join(tempDir, `source-${hash}.mp4`);

      if (!fs.existsSync(localSource)) {
        try {
          await downloadRemoteVideo(source_video_url, localSource);
        } catch (downloadErr: any) {
          return NextResponse.json(
            {
              error: `Unable to access source video at ${source_video_url}: ${downloadErr.message}. Please upload the video file directly.`,
              requires_upload: true,
            },
            { status: 400 }
          );
        }
      }
    }

    // Verify source video file
    if (!fs.existsSync(localSource)) {
      return NextResponse.json(
        { error: "Source video file could not be located on the server." },
        { status: 404 }
      );
    }

    const service = getServiceSupabase();
    const outDir = path.join(process.cwd(), "tmp", "rendered-clips");
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    const results: Array<{
      clip_number?: number;
      title: string;
      status: "ready" | "failed";
      record?: VideoClipRecord;
      error?: string;
    }> = [];

    // 2. Process each clip sequentially with real FFmpeg rendering
    for (let i = 0; i < clips.length; i++) {
      const item: BatchClipRequestItem = clips[i];
      const clipId = crypto.randomUUID();
      const outputPath = path.join(outDir, `clip-${clipId}.mp4`);
      const duration = Math.max(0.5, Number((item.end_time - item.start_time).toFixed(2)));

      try {
        // Execute real FFmpeg trimming, 9:16 scaling, reframing, subtitles and encoding
        await renderVideoClip({
          inputPath: localSource,
          outputPath,
          startTime: item.start_time,
          duration,
          aspectRatio: item.aspect_ratio || "9:16",
          reframingMode: item.reframing_mode || "blurred_backdrop",
          cropPosition: item.crop_position || "center",
          resolution: item.resolution || "1080p",
          subtitleText: item.subtitle_text || item.title,
          subtitleStyle: item.subtitle_style || "hormozi",
          hookText: item.hook_text || item.hook,
          watermarkText: item.watermark_text,
          watermarkPosition: item.watermark_position || "top_right",
          watermarkOpacity: item.watermark_opacity ?? 0.7,
        });

        // Read rendered file buffer
        const fileBuffer = fs.readFileSync(outputPath);
        const storagePath = `${user.id}/${Date.now()}-clip-${clipId}.mp4`;

        // Upload to Supabase Storage 'clips' bucket
        const { error: uploadError } = await service.storage
          .from("clips")
          .upload(storagePath, fileBuffer, {
            contentType: "video/mp4",
            upsert: true,
          });

        let publicUrl = "";
        if (!uploadError) {
          const { data: pubData } = service.storage.from("clips").getPublicUrl(storagePath);
          publicUrl = pubData.publicUrl;
        } else {
          publicUrl = `/api/clipper/download?id=${clipId}`;
        }

        // Save in video_clips & videos library
        const record = await saveUserClip(user.id, {
          source_video_url: source_video_url || localSource,
          source_video_name,
          clip_title: item.title,
          caption: item.caption || `${item.title} #Shorts #Viral #Reels`,
          start_time: item.start_time,
          end_time: item.end_time,
          duration,
          aspect_ratio: item.aspect_ratio || "9:16",
          reframing_mode: item.reframing_mode || "blurred_backdrop",
          crop_position: item.crop_position || "center",
          resolution: item.resolution || "1080p",
          subtitle_text: item.subtitle_text || item.title,
          subtitle_style: item.subtitle_style || "hormozi",
          exported_url: publicUrl,
          file_size: fileBuffer.length,
          viral_score: item.viral_score,
          virality_breakdown: item.virality_breakdown,
          category: item.category,
          hook: item.hook_text || item.hook,
        });

        results.push({
          clip_number: item.clip_number || i + 1,
          title: item.title,
          status: "ready",
          record,
        });

        // Clean up rendered temp file
        try {
          fs.unlinkSync(outputPath);
        } catch {}
      } catch (clipErr: any) {
        console.error(`Error rendering clip ${item.title}:`, clipErr);
        results.push({
          clip_number: item.clip_number || i + 1,
          title: item.title,
          status: "failed",
          error: clipErr.message || "FFmpeg rendering failed",
        });
      }
    }

    const successCount = results.filter((r) => r.status === "ready").length;

    return NextResponse.json({
      success: true,
      total_requested: clips.length,
      success_count: successCount,
      failed_count: clips.length - successCount,
      results,
    });
  } catch (error: any) {
    console.error("Batch clip generation error:", error);
    return NextResponse.json(
      { error: error?.message || "Batch clip generation failed." },
      { status: 500 }
    );
  }
}
