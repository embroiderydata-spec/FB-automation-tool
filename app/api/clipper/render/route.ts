import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { createClient as createDirectSupabase } from "@supabase/supabase-js";
import { DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY } from "@/lib/supabase/client";
import { renderVideoClip, probeVideoFile } from "@/lib/clipper/ffmpeg-engine";
import { saveUserClip } from "@/lib/clipper/storage";
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
      source_local_path,
      source_video_url,
      source_video_name,
      clip_title,
      start_time,
      end_time,
      aspect_ratio = "9:16",
      crop_position = "center",
      resolution = "1080p",
      subtitle_text,
      subtitle_position = "top",
      caption,
    } = body;

    if (start_time === undefined || end_time === undefined) {
      return NextResponse.json(
        { error: "Start time and end time are required." },
        { status: 400 }
      );
    }

    const start = Number(start_time);
    const end = Number(end_time);
    if (end <= start) {
      return NextResponse.json(
        { error: "End time must be greater than start time." },
        { status: 400 }
      );
    }

    const clipDuration = Number((end - start).toFixed(2));

    // Resolve local input path
    let inputPath = source_local_path;
    const tempDir = path.join(process.cwd(), ".data", "renders");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // If local file path is not given or doesn't exist, download from source_video_url
    if (!inputPath || !fs.existsSync(inputPath)) {
      if (!source_video_url) {
        return NextResponse.json(
          { error: "Source video path or URL not found." },
          { status: 400 }
        );
      }

      const tempInput = path.join(tempDir, `input_${crypto.randomUUID()}.mp4`);
      const resp = await fetch(source_video_url);
      if (!resp.ok) {
        return NextResponse.json(
          { error: `Failed to download source video from ${source_video_url}` },
          { status: 502 }
        );
      }
      const arrBuf = await resp.arrayBuffer();
      fs.writeFileSync(tempInput, Buffer.from(arrBuf));
      inputPath = tempInput;
    }

    // Create unique output file
    const clipId = crypto.randomUUID();
    const outputFilename = `clip_${clipId}_${aspect_ratio.replace(":", "x")}.mp4`;
    const outputPath = path.join(tempDir, outputFilename);

    // 1. Run actual FFmpeg processing
    const renderResult = await renderVideoClip({
      inputPath,
      outputPath,
      startTime: start,
      duration: clipDuration,
      aspectRatio: aspect_ratio,
      cropPosition: crop_position,
      resolution,
      subtitleText: subtitle_text,
      subtitlePosition: subtitle_position,
    });

    const outputBuffer = fs.readFileSync(outputPath);

    // 2. Upload resulting MP4 to Supabase Storage
    const supabase = getServiceSupabase();
    const storagePath = `clips/${user.id}/${outputFilename}`;
    let exportedPublicUrl = "";

    try {
      const { error: uploadErr } = await supabase.storage
        .from("videos")
        .upload(storagePath, outputBuffer, {
          contentType: "video/mp4",
          upsert: true,
        });

      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from("videos").getPublicUrl(storagePath);
        exportedPublicUrl = urlData.publicUrl;
      }
    } catch (e: any) {
      console.warn("Clip upload warning:", e.message);
    }

    // Fallback URL if cloud storage is unconfigured
    if (!exportedPublicUrl) {
      exportedPublicUrl = `/storage/renders/${outputFilename}`;
    }

    // 3. Save clip metadata in database & multi-layer persistence
    const savedRecord = await saveUserClip(user.id, {
      source_video_url: source_video_url || inputPath,
      source_video_name: source_video_name || "Source Video",
      clip_title: clip_title || "Processed 9:16 Reel",
      caption: caption || "",
      start_time: start,
      end_time: end,
      duration: clipDuration,
      aspect_ratio,
      crop_position,
      resolution,
      subtitle_text,
      exported_url: exportedPublicUrl,
      file_size: renderResult.sizeBytes,
    });

    // 4. Also register into 'videos' table so it appears in the Video Library
    try {
      await supabase.from("videos").insert({
        id: clipId,
        user_id: user.id,
        title: clip_title || "Processed 9:16 Reel",
        video_url: exportedPublicUrl,
        duration_seconds: clipDuration,
        aspect_ratio,
        resolution: resolution === "1080p" ? "1080x1920" : "720x1280",
        file_size_bytes: renderResult.sizeBytes,
        status: "ready",
      });
    } catch {}

    return NextResponse.json({
      success: true,
      clip: {
        ...savedRecord,
        id: clipId,
        exported_url: exportedPublicUrl,
        file_size: renderResult.sizeBytes,
        status: "ready",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to render video clip with FFmpeg." },
      { status: 500 }
    );
  }
}
