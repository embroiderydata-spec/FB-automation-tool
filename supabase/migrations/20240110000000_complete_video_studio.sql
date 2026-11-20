-- ==============================================================================
-- PHASE 2: COMPLETE VIDEO PRODUCTION STUDIO & VIDEO LIBRARY
-- Migration: 20240110000000_complete_video_studio.sql
-- ==============================================================================

-- 1. Extend videos table for background queue progress tracking & cancel support
ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS processing_step TEXT DEFAULT 'Idle',
  ADD COLUMN IF NOT EXISTS cancel_requested BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

-- 2. Extend page_settings table for rich branding, intro/outro & audio presets
ALTER TABLE public.page_settings
  ADD COLUMN IF NOT EXISTS intro_video_url TEXT,
  ADD COLUMN IF NOT EXISTS outro_video_url TEXT,
  ADD COLUMN IF NOT EXISTS intro_duration_seconds NUMERIC(4,1) DEFAULT 2.0,
  ADD COLUMN IF NOT EXISTS outro_duration_seconds NUMERIC(4,1) DEFAULT 3.0,
  ADD COLUMN IF NOT EXISTS brand_primary_color TEXT DEFAULT '#6366f1',
  ADD COLUMN IF NOT EXISTS brand_secondary_color TEXT DEFAULT '#4f46e5',
  ADD COLUMN IF NOT EXISTS default_subtitle_preset TEXT DEFAULT 'bold_viral',
  ADD COLUMN IF NOT EXISTS default_voice_id TEXT DEFAULT '21m00Tcm4TlvDq8ikWAM',
  ADD COLUMN IF NOT EXISTS default_bg_music_url TEXT,
  ADD COLUMN IF NOT EXISTS video_ending_type TEXT DEFAULT 'brand_card';

-- 3. Create global_branding_settings table for account-wide default branding
CREATE TABLE IF NOT EXISTS public.global_branding_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  brand_name TEXT DEFAULT 'PagePulse Media',
  watermark_logo_url TEXT,
  watermark_position TEXT DEFAULT 'bottom_right',
  watermark_size NUMERIC(3,2) DEFAULT 0.18,
  watermark_opacity NUMERIC(3,2) DEFAULT 0.85,
  enable_watermark BOOLEAN DEFAULT true,
  intro_video_url TEXT,
  outro_video_url TEXT,
  intro_duration_seconds NUMERIC(4,1) DEFAULT 2.0,
  outro_duration_seconds NUMERIC(4,1) DEFAULT 3.0,
  brand_primary_color TEXT DEFAULT '#6366f1',
  brand_secondary_color TEXT DEFAULT '#4f46e5',
  default_subtitle_preset TEXT DEFAULT 'bold_viral',
  default_voice_id TEXT DEFAULT '21m00Tcm4TlvDq8ikWAM',
  default_bg_music_url TEXT,
  video_ending_type TEXT DEFAULT 'brand_card',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.global_branding_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for global_branding_settings
DROP POLICY IF EXISTS "Users can view own global branding" ON public.global_branding_settings;
CREATE POLICY "Users can view own global branding"
  ON public.global_branding_settings
  FOR SELECT
  USING (auth.uid() = user_id OR auth.role() IN ('anon', 'authenticated', 'service_role'));

DROP POLICY IF EXISTS "Users can insert own global branding" ON public.global_branding_settings;
CREATE POLICY "Users can insert own global branding"
  ON public.global_branding_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.role() IN ('anon', 'authenticated', 'service_role'));

DROP POLICY IF EXISTS "Users can update own global branding" ON public.global_branding_settings;
CREATE POLICY "Users can update own global branding"
  ON public.global_branding_settings
  FOR UPDATE
  USING (auth.uid() = user_id OR auth.role() IN ('anon', 'authenticated', 'service_role'));

-- 4. Grant table permissions
GRANT ALL ON TABLE public.global_branding_settings TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.videos TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.media_assets TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.page_settings TO authenticated, anon, service_role;
