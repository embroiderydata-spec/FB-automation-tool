import { SupabaseClient } from "@supabase/supabase-js";
import { getVideoConfig } from "../config";
import { getVideoProvider, getVoiceProvider, getImageProvider } from "../providers";
import { composeVideo } from "../composer/ffmpeg";
import { buildSubtitleCues, generateASS, generateSRT, SUBTITLE_PRESETS } from "../subtitles/engine";
import { buildStoragePath } from "../storage";
import { SubtitlePresetStyle } from "../types";

export interface RenderDispatchOptions {
  supabase: SupabaseClient;
  userId: string;
  videoId: string;
  storyboardId: string;
  scriptId: string;
  pageId: string;
  subtitlePreset?: SubtitlePresetStyle;
  voiceId?: string;
  includeWatermark?: boolean;
}

/**
 * Dispatches and coordinates the complete video rendering pipeline.
 * Steps:
 * 1. Checks concurrent job limit
 * 2. Fetches storyboard scenes and script narration
 * 3. Generates voiceover audio (ElevenLabs)
 * 4. Generates scene video clips (Replicate/Runway)
 * 5. Assembles subtitles and branding
 * 6. Executes FFmpeg composition
 * 7. Updates status and records completed MP4 asset
 */
export async function dispatchVideoRender(options: RenderDispatchOptions): Promise<{
  success: boolean;
  status: string;
  progress: number;
  error?: string;
}> {
  const {
    supabase,
    userId,
    videoId,
    storyboardId,
    scriptId,
    pageId,
    subtitlePreset = "bold_viral",
    voiceId,
    includeWatermark = true,
  } = options;

  const config = getVideoConfig();

  // 1. Check concurrent rendering jobs
  const { count: activeJobsCount } = await supabase
    .from("videos")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("render_status", ["processing", "generating_scenes", "generating_voice", "composing", "rendering"]);

  if ((activeJobsCount || 0) >= config.maxConcurrentVideoJobs) {
    throw new Error(
      `Maximum concurrent render jobs limit (${config.maxConcurrentVideoJobs}) reached. Please wait for current jobs to finish.`
    );
  }

  // 2. Transition state to 'queued' (10%)
  await supabase
    .from("videos")
    .update({
      render_status: "queued",
      render_progress: 10,
      generation_provider: config.activeProvider,
    })
    .eq("id", videoId);

  try {
    // 3. Fetch script and storyboard scenes
    const [scriptRes, scenesRes, pageRes] = await Promise.all([
      supabase.from("content_scripts").select("*").eq("id", scriptId).single(),
      supabase
        .from("storyboard_scenes")
        .select("*")
        .eq("storyboard_id", storyboardId)
        .order("scene_number", { ascending: true }),
      supabase.from("facebook_pages").select("*, page_settings(*)").eq("id", pageId).single(),
    ]);

    const script = scriptRes.data;
    const scenes = scenesRes.data || [];
    const page = pageRes.data;
    const rawSettings = Array.isArray(page?.page_settings)
      ? page?.page_settings[0]
      : page?.page_settings;

    if (!script) throw new Error("Linked script not found for rendering.");
    if (scenes.length === 0) throw new Error("No storyboard scenes found to render.");

    // 4. State: 'generating_voice' (25%)
    await supabase
      .from("videos")
      .update({ render_status: "generating_voice", render_progress: 25 })
      .eq("id", videoId);

    const voiceProvider = getVoiceProvider();
    let wordTimestamps: any[] | undefined = undefined;

    if (voiceProvider.isConfigured() && script.narration) {
      try {
        const speechRes = await voiceProvider.generateSpeech({
          text: script.narration,
          voiceId: voiceId || rawSettings?.ai_voice_id || config.elevenLabsDefaultVoiceId,
        });
        wordTimestamps = speechRes.wordTimestamps;
      } catch (voiceErr: any) {
        console.warn("[RenderDispatcher] Voiceover generation warning:", voiceErr.message);
      }
    }

    // 5. State: 'generating_scenes' (55%)
    await supabase
      .from("videos")
      .update({ render_status: "generating_scenes", render_progress: 55 })
      .eq("id", videoId);

    const videoProvider = getVideoProvider();
    const sceneInputs: any[] = [];

    // Synthesize clips for each scene
    for (const sc of scenes) {
      let clipUrl: string | null = sc.generated_video_path || null;

      if (!clipUrl && videoProvider.isConfigured()) {
        try {
          const genRes = await videoProvider.generateVideo({
            prompt: sc.video_prompt || sc.visual_description,
            durationSeconds: sc.duration || 3.5,
            aspectRatio: "9:16",
          });
          clipUrl = genRes.videoUrl || null;
        } catch (genErr: any) {
          console.warn(`[RenderDispatcher] Scene ${sc.scene_number} gen error:`, genErr.message);
        }
      }

      sceneInputs.push({
        sceneOrder: sc.scene_number,
        videoUrl: clipUrl || `/assets/placeholder-scene-${sc.scene_number}.mp4`,
        durationSeconds: sc.duration || 3.5,
      });
    }

    // 6. State: 'composing' (80%)
    await supabase
      .from("videos")
      .update({ render_status: "composing", render_progress: 80 })
      .eq("id", videoId);

    // Build subtitle cues & ASS file
    const cues = buildSubtitleCues(scenes, wordTimestamps);
    const presetConfig = SUBTITLE_PRESETS[subtitlePreset] || SUBTITLE_PRESETS.bold_viral;
    const assContent = generateASS(cues, presetConfig);

    const outputStoragePath = buildStoragePath(
      userId,
      pageId,
      videoId,
      "renders",
      `reel_${Date.now()}.mp4`
    );

    // 7. Execute FFmpeg Composition (95%)
    await supabase
      .from("videos")
      .update({ render_status: "rendering", render_progress: 95 })
      .eq("id", videoId);

    const brandingConfig = includeWatermark
      ? {
          brand_name: rawSettings?.brand_name || page?.page_name || page?.name || "Brand",
          watermark_logo_url: rawSettings?.watermark_logo_url || null,
          watermark_position: rawSettings?.watermark_position || "bottom_right",
          watermark_size: rawSettings?.watermark_size || 0.15,
          watermark_opacity: rawSettings?.watermark_opacity || 0.85,
          brand_primary_color: rawSettings?.brand_primary_color || "#3b82f6",
          brand_secondary_color: rawSettings?.brand_secondary_color || "#1d4ed8",
          enable_watermark: rawSettings?.enable_watermark ?? true,
        }
      : null;

    const compRes = await composeVideo({
      scenes: sceneInputs,
      outputPath: outputStoragePath,
      branding: brandingConfig,
      targetResolution: "1080x1920",
      fps: 30,
    });

    // 8. State: 'completed' (100%)
    const completedAt = new Date().toISOString();
    const finalUrl = compRes.outputPath;

    await supabase
      .from("videos")
      .update({
        render_status: "completed",
        render_progress: 100,
        status: "ready",
        final_video_path: finalUrl,
        video_url: finalUrl,
        duration_seconds: compRes.durationSeconds,
        resolution: "1080x1920",
        completed_at: completedAt,
      })
      .eq("id", videoId);

    // Record into media_assets library
    await supabase.from("media_assets").insert({
      user_id: userId,
      facebook_page_id: pageId,
      video_id: videoId,
      asset_name: `${script.script_title || "Reel"} (Final MP4)`,
      asset_type: "video",
      storage_path: finalUrl,
      public_url: finalUrl,
      duration_seconds: compRes.durationSeconds,
      width: 1080,
      height: 1920,
      provider: config.activeProvider,
      metadata: {
        subtitle_preset: subtitlePreset,
        scenes_count: scenes.length,
        ffmpeg_available: compRes.ffmpegAvailable,
      },
    });

    return {
      success: true,
      status: "completed",
      progress: 100,
    };
  } catch (err: any) {
    const errorMsg = err.message || "Video render failed.";
    await supabase
      .from("videos")
      .update({
        render_status: "failed",
        status: "failed",
        error_message: errorMsg,
      })
      .eq("id", videoId);

    return {
      success: false,
      status: "failed",
      progress: 0,
      error: errorMsg,
    };
  }
}
