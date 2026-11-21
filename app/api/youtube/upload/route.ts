import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import {
  getYouTubeAccounts,
  uploadVideoToYouTube,
  saveYouTubeUploadRecord,
} from "@/lib/publishing/youtube";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const formData = await request.formData();

    const channelId = formData.get("channel_id") as string;
    const title = (formData.get("title") as string)?.trim();
    const description = (formData.get("description") as string)?.trim() || "";
    const rawTags = (formData.get("tags") as string)?.trim() || "";
    const categoryId = (formData.get("category_id") as string) || "22";
    const privacyStatus = (formData.get("privacy_status") as "public" | "unlisted" | "private") || "public";
    const madeForKids = formData.get("made_for_kids") === "true";
    const isShort = formData.get("is_short") === "true";
    const videoUrl = formData.get("video_url") as string;
    const videoFile = formData.get("video") as File | null;
    const thumbnailFile = formData.get("thumbnail") as File | null;

    if (!title) {
      return NextResponse.json({ error: "Video title is required." }, { status: 400 });
    }

    if (!videoFile && !videoUrl) {
      return NextResponse.json({ error: "A video file or video URL must be provided." }, { status: 400 });
    }

    // 1. Resolve connected YouTube account
    const accounts = await getYouTubeAccounts(user.id);
    if (!accounts || accounts.length === 0) {
      return NextResponse.json(
        { error: "No connected YouTube account found. Please connect your YouTube channel first." },
        { status: 400 }
      );
    }

    let targetAccount = accounts[0];
    if (channelId) {
      const match = accounts.find((a) => a.channel_id === channelId || a.id === channelId);
      if (match) targetAccount = match;
    }

    // Parse tags array
    let tags: string[] = [];
    if (rawTags) {
      tags = rawTags.split(",").map((t) => t.trim()).filter((t) => t.length > 0);
    }

    // Read video binary buffer if file uploaded
    let videoBuffer: Buffer | undefined;
    if (videoFile && typeof videoFile.arrayBuffer === "function") {
      const arrayBuffer = await videoFile.arrayBuffer();
      videoBuffer = Buffer.from(arrayBuffer);
    }

    // Read thumbnail binary buffer if uploaded
    let thumbnailBuffer: Buffer | undefined;
    let thumbnailMimeType: string | undefined;
    if (thumbnailFile && typeof thumbnailFile.arrayBuffer === "function") {
      const arrayBuffer = await thumbnailFile.arrayBuffer();
      thumbnailBuffer = Buffer.from(arrayBuffer);
      thumbnailMimeType = thumbnailFile.type || "image/jpeg";
    }

    // 2. Perform official YouTube Data API v3 resumable upload
    const uploadResult = await uploadVideoToYouTube(targetAccount, {
      title,
      description,
      tags,
      privacyStatus,
      videoUrl: videoUrl || undefined,
      videoBuffer: videoBuffer || undefined,
      categoryId,
      madeForKids,
      isShort,
      thumbnailBuffer,
      thumbnailMimeType,
    });

    // 3. Save to YouTube upload history
    const record = await saveYouTubeUploadRecord(user.id, {
      channel_id: targetAccount.channel_id,
      channel_title: targetAccount.channel_title,
      youtube_video_id: uploadResult.videoId,
      video_url: uploadResult.videoUrl,
      title,
      description,
      privacy_status: privacyStatus,
      category_id: categoryId,
      is_short: isShort,
      tags,
      status: "uploaded",
    });

    return NextResponse.json({
      success: true,
      videoId: uploadResult.videoId,
      videoUrl: uploadResult.videoUrl,
      record,
    });
  } catch (err: any) {
    console.error("YouTube Upload API error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to upload video to YouTube." },
      { status: 500 }
    );
  }
}
