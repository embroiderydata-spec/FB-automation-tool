-- Migration: 20240116000000_full_video_analysis_pipeline.sql
-- Description: Persistent tables for Source Videos, Full Video AI Analysis Jobs, and Viral Clip Detection

-- 1. Source Videos Table
CREATE TABLE IF NOT EXISTS public.source_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_url TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'url' CHECK (source_type IN ('youtube', 'direct_url', 'library', 'upload')),
  video_id TEXT,
  title TEXT NOT NULL,
  author TEXT,
  duration NUMERIC(10, 3) NOT NULL DEFAULT 0,
  resolution TEXT DEFAULT '1920x1080',
  thumbnail_url TEXT,
  storage_path TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_source_videos_user_id ON public.source_videos(user_id);
CREATE INDEX IF NOT EXISTS idx_source_videos_created_at ON public.source_videos(created_at DESC);

ALTER TABLE public.source_videos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'source_videos' AND policyname = 'Users can manage their own source videos'
  ) THEN
    CREATE POLICY "Users can manage their own source videos"
      ON public.source_videos
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 2. Video Analysis Jobs Table
CREATE TABLE IF NOT EXISTS public.video_analysis_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_video_id UUID REFERENCES public.source_videos(id) ON DELETE SET NULL,
  video_url TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'direct_url' CHECK (source_type IN ('youtube', 'direct_url', 'library', 'upload')),
  video_id TEXT,
  title TEXT NOT NULL,
  author TEXT,
  duration NUMERIC(10, 3) NOT NULL DEFAULT 0,
  thumbnail_url TEXT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (
    status IN (
      'queued',
      'fetching',
      'extracting_audio',
      'transcribing',
      'detecting_scenes',
      'analyzing_visuals',
      'finding_moments',
      'ranking_clips',
      'completed',
      'failed',
      'cancelled'
    )
  ),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  current_stage TEXT NOT NULL DEFAULT 'queued',
  stage_label TEXT DEFAULT 'Queued for analysis...',
  estimated_seconds_remaining INTEGER DEFAULT 30,
  clip_count INTEGER DEFAULT 5,
  duration_preset TEXT DEFAULT '30-60',
  target_platform TEXT DEFAULT 'both',
  language TEXT DEFAULT 'auto',
  ai_instructions TEXT,
  topic_query TEXT,
  transcript_cues JSONB DEFAULT '[]'::jsonb,
  detected_scenes JSONB DEFAULT '[]'::jsonb,
  candidate_clips JSONB DEFAULT '[]'::jsonb,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_video_analysis_jobs_user_id ON public.video_analysis_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_video_analysis_jobs_status ON public.video_analysis_jobs(status);
CREATE INDEX IF NOT EXISTS idx_video_analysis_jobs_created_at ON public.video_analysis_jobs(created_at DESC);

ALTER TABLE public.video_analysis_jobs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'video_analysis_jobs' AND policyname = 'Users can manage their own video analysis jobs'
  ) THEN
    CREATE POLICY "Users can manage their own video analysis jobs"
      ON public.video_analysis_jobs
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
