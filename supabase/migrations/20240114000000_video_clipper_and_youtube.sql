-- Migration: 20240114000000_video_clipper_and_youtube.sql
-- Description: Schema for Video Clipper studio, YouTube channel integration, and multi-platform publishing.

-- 1. Video Clips Table
CREATE TABLE IF NOT EXISTS public.video_clips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_video_url TEXT NOT NULL,
  source_video_name TEXT,
  clip_title TEXT NOT NULL,
  caption TEXT,
  start_time NUMERIC(10, 3) NOT NULL DEFAULT 0,
  end_time NUMERIC(10, 3) NOT NULL,
  duration NUMERIC(10, 3) NOT NULL,
  aspect_ratio TEXT NOT NULL DEFAULT '9:16' CHECK (aspect_ratio IN ('9:16', '16:9', '1:1')),
  resolution TEXT NOT NULL DEFAULT '1080p' CHECK (resolution IN ('1080p', '720p', '4k')),
  subtitle_text TEXT,
  exported_url TEXT,
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('draft', 'processing', 'ready', 'failed')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index on user_id and created_at
CREATE INDEX IF NOT EXISTS idx_video_clips_user_id ON public.video_clips(user_id);
CREATE INDEX IF NOT EXISTS idx_video_clips_created_at ON public.video_clips(created_at DESC);

-- Enable RLS
ALTER TABLE public.video_clips ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'video_clips' AND policyname = 'Users can manage their own video clips'
  ) THEN
    CREATE POLICY "Users can manage their own video clips"
      ON public.video_clips
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 2. YouTube Accounts Table
CREATE TABLE IF NOT EXISTS public.youtube_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL,
  channel_title TEXT NOT NULL,
  channel_custom_url TEXT,
  thumbnail_url TEXT,
  subscriber_count BIGINT DEFAULT 0,
  video_count INTEGER DEFAULT 0,
  encrypted_access_token TEXT NOT NULL,
  encrypted_refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  is_connected BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_youtube_channel_user UNIQUE (user_id, channel_id)
);

CREATE INDEX IF NOT EXISTS idx_youtube_accounts_user_id ON public.youtube_accounts(user_id);

ALTER TABLE public.youtube_accounts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'youtube_accounts' AND policyname = 'Users can manage their own YouTube accounts'
  ) THEN
    CREATE POLICY "Users can manage their own YouTube accounts"
      ON public.youtube_accounts
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 3. Extend publishing_jobs for multi-platform support
ALTER TABLE public.publishing_jobs
  ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'facebook' CHECK (platform IN ('facebook', 'youtube')),
  ADD COLUMN IF NOT EXISTS youtube_channel_id UUID REFERENCES public.youtube_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS privacy_status TEXT DEFAULT 'public' CHECK (privacy_status IN ('public', 'unlisted', 'private')),
  ADD COLUMN IF NOT EXISTS video_title TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[],
  ADD COLUMN IF NOT EXISTS is_short BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS youtube_video_id TEXT;
