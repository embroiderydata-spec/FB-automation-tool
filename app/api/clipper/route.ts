import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server-auth";
import { getUserClips, saveUserClip, deleteUserClip } from "@/lib/clipper/storage";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const clips = await getUserClips(user.id);
    return NextResponse.json({ clips });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    if (!body.source_video_url) {
      return NextResponse.json({ error: "source_video_url is required." }, { status: 400 });
    }

    if (body.start_time === undefined || body.end_time === undefined) {
      return NextResponse.json({ error: "start_time and end_time are required." }, { status: 400 });
    }

    if (Number(body.end_time) <= Number(body.start_time)) {
      return NextResponse.json({ error: "end_time must be greater than start_time." }, { status: 400 });
    }

    const clip = await saveUserClip(user.id, {
      source_video_url: body.source_video_url,
      source_video_name: body.source_video_name,
      clip_title: body.clip_title || "Untitled Clip",
      caption: body.caption,
      start_time: Number(body.start_time),
      end_time: Number(body.end_time),
      duration: Number(body.duration) || (Number(body.end_time) - Number(body.start_time)),
      aspect_ratio: body.aspect_ratio || "9:16",
      resolution: body.resolution || "1080p",
      subtitle_text: body.subtitle_text,
      exported_url: body.exported_url,
    });

    return NextResponse.json({ success: true, clip });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clipId = searchParams.get("id");

    if (!clipId) {
      return NextResponse.json({ error: "clip id is required." }, { status: 400 });
    }

    await deleteUserClip(user.id, clipId);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
