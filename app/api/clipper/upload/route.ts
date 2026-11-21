import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { createClient as createDirectSupabase } from "@supabase/supabase-js";
import { DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY } from "@/lib/supabase/client";
import { probeVideoFile, formatBytes } from "@/lib/clipper/ffmpeg-engine";
import { UploadedVideoInfo } from "@/lib/clipper/types";
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

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No video file provided." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.byteLength === 0) {
      return NextResponse.json({ error: "Uploaded video file is empty." }, { status: 400 });
    }

    // 1. Save locally for zero-latency FFmpeg processing
    const uploadsDir = path.join(process.cwd(), ".data", "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const videoId = crypto.randomUUID();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
    const localFilename = `${Date.now()}_${sanitizedName}`;
    const localFilePath = path.join(uploadsDir, localFilename);
    fs.writeFileSync(localFilePath, buffer);

    // 2. Probe real video metadata using FFmpeg
    const probe = probeVideoFile(localFilePath);
    const sizeBytes = buffer.byteLength;
    const sizeFormatted = formatBytes(sizeBytes);

    // 3. Upload to Supabase Storage 'videos' bucket
    const supabase = getServiceSupabase();
    const storagePath = `source_videos/${user.id}/${videoId}_${sanitizedName}`;
    let publicUrl = "";

    try {
      const { error: uploadErr } = await supabase.storage
        .from("videos")
        .upload(storagePath, buffer, {
          contentType: file.type || "video/mp4",
          upsert: true,
        });

      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from("videos").getPublicUrl(storagePath);
        publicUrl = urlData.publicUrl;
      }
    } catch (e: any) {
      console.warn("Supabase storage upload warning:", e.message);
    }

    // Fallback URL if cloud storage isn't available
    if (!publicUrl) {
      publicUrl = `/storage/uploads/${localFilename}`;
    }

    // 4. Save video record in Supabase database
    try {
      await supabase.from("videos").insert({
        id: videoId,
        user_id: user.id,
        title: file.name.replace(/\.[^/.]+$/, ""),
        video_url: publicUrl,
        duration_seconds: probe.duration,
        resolution: probe.resolution,
        aspect_ratio: probe.width > probe.height ? "16:9" : probe.width < probe.height ? "9:16" : "1:1",
        status: "ready",
        file_size_bytes: sizeBytes,
      });
    } catch {}

    const videoInfo: UploadedVideoInfo = {
      id: videoId,
      filename: file.name,
      url: publicUrl,
      local_path: localFilePath,
      duration: probe.duration,
      width: probe.width,
      height: probe.height,
      resolution: probe.resolution,
      size_bytes: sizeBytes,
      size_formatted: sizeFormatted,
    };

    return NextResponse.json({
      success: true,
      video: videoInfo,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to process video upload." }, { status: 500 });
  }
}
