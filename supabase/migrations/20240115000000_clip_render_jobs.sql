-- Migration: 20240115000000_clip_render_jobs.sql
-- Description: Persistent render job tracking for OpusClip AI Video Clipping Studio

CREATE TABLE IF NOT EXISTS public.clip_render_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clip_id UUID,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (
    status IN ('queued', 'downloading', 'processing', 'rendering', 'uploading', 'completed', 'failed', 'cancelled')
  ),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  source_video_url TEXT NOT NULL,
  source_video_name TEXT,
  clip_title TEXT NOT NULL,
  start_time NUMERIC(10, 3) NOT NULL,
  end_time NUMERIC(10, 3) NOT NULL,
  duration NUMERIC(10, 3) NOT NULL,
  aspect_ratio TEXT NOT NULL DEFAULT '9:16' CHECK (aspect_ratio IN ('9:16', '16:9', '1:1')),
  reframing_mode TEXT DEFAULT 'blurred_backdrop' CHECK (
    reframing_mode IN ('auto_center', 'blurred_backdrop', 'split_screen', 'top_crop', 'bottom_crop')
  ),
  crop_position TEXT DEFAULT 'center' CHECK (crop_position IN ('center', 'top', 'bottom')),
  resolution TEXT DEFAULT '1080p' CHECK (resolution IN ('1080p', '720p', '4k')),
  subtitle_style TEXT DEFAULT 'hormozi' CHECK (
    subtitle_style IN ('hormozi', 'viral_bold', 'clean_minimal', 'modern_podcast', 'karaoke', 'highlight_words', 'professional', 'none')
  ),
  subtitle_text TEXT,
  hook_text TEXT,
  watermark_text TEXT,
  watermark_position TEXT DEFAULT 'top_right' CHECK (
    watermark_position IN ('top_left', 'top_right', 'bottom_left', 'bottom_right')
  ),
  watermark_opacity NUMERIC(3, 2) DEFAULT 0.70,
  exported_url TEXT,
  storage_path TEXT,
  file_size BIGINT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_clip_render_jobs_user_id ON public.clip_render_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_clip_render_jobs_status ON public.clip_render_jobs(status);
CREATE INDEX IF NOT EXISTS idx_clip_render_jobs_created_at ON public.clip_render_jobs(created_at DESC);

-- Row Level Security
ALTER TABLE public.clip_render_jobs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'clip_render_jobs' AND policyname = 'Users can manage their own clip render jobs'
  ) THEN
    CREATE POLICY "Users can manage their own clip render jobs"
      ON public.clip_render_jobs
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
