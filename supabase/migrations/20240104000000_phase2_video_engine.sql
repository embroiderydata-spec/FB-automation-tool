-- Supabase Schema Migration: Phase 2.3 AI Video Production Engine & Video Library
-- Enhances videos, video_scenes, media_assets, and page_settings for 9:16 vertical video production

-- ==============================================================================
-- 1. Enhance videos table
-- ==============================================================================
ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS facebook_page_id UUID REFERENCES public.facebook_pages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS storyboard_id UUID REFERENCES public.content_storyboards(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS script_id UUID REFERENCES public.content_scripts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS generation_provider TEXT DEFAULT 'replicate',
  ADD COLUMN IF NOT EXISTS generation_model TEXT DEFAULT 'luma/ray' ,
  ADD COLUMN IF NOT EXISTS render_status TEXT DEFAULT 'pending' CHECK (render_status IN ('pending', 'queued', 'processing', 'generating_scenes', 'generating_voice', 'composing', 'rendering', 'uploading', 'completed', 'failed', 'cancelled')),
  ADD COLUMN IF NOT EXISTS render_progress INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS final_video_path TEXT,
  ADD COLUMN IF NOT EXISTS thumbnail_path TEXT,
  ADD COLUMN IF NOT EXISTS fps INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

-- Sync facebook_page_id and page_id
UPDATE public.videos
SET facebook_page_id = COALESCE(facebook_page_id, page_id)
WHERE facebook_page_id IS NULL AND page_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.sync_videos_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.facebook_page_id IS NOT NULL AND NEW.page_id IS NULL THEN
    NEW.page_id = NEW.facebook_page_id;
  ELSIF NEW.page_id IS NOT NULL AND NEW.facebook_page_id IS NULL THEN
    NEW.facebook_page_id = NEW.page_id;
  END IF;

  IF NEW.render_status IS NOT NULL AND NEW.status IS NULL THEN
    NEW.status = CASE
      WHEN NEW.render_status IN ('pending', 'queued') THEN 'draft'
      WHEN NEW.render_status IN ('generating_scenes', 'generating_voice', 'composing', 'rendering') THEN 'generating'
      WHEN NEW.render_status = 'completed' THEN 'ready'
      WHEN NEW.render_status = 'failed' THEN 'failed'
      ELSE 'draft'
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_videos_columns ON public.videos;
CREATE TRIGGER trg_sync_videos_columns
  BEFORE INSERT OR UPDATE ON public.videos
  FOR EACH ROW EXECUTE FUNCTION public.sync_videos_columns();

CREATE INDEX IF NOT EXISTS idx_videos_fb_page_id ON public.videos(facebook_page_id);
CREATE INDEX IF NOT EXISTS idx_videos_render_status ON public.videos(render_status);
CREATE INDEX IF NOT EXISTS idx_videos_storyboard_id ON public.videos(storyboard_id);

-- ==============================================================================
-- 2. Enhance video_scenes table
-- ==============================================================================
ALTER TABLE public.video_scenes
  ADD COLUMN IF NOT EXISTS storyboard_scene_id UUID REFERENCES public.storyboard_scenes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS generation_provider TEXT DEFAULT 'replicate',
  ADD COLUMN IF NOT EXISTS generation_model TEXT,
  ADD COLUMN IF NOT EXISTS generation_status TEXT DEFAULT 'pending' CHECK (generation_status IN ('pending', 'processing', 'completed', 'failed')),
  ADD COLUMN IF NOT EXISTS generation_job_id TEXT,
  ADD COLUMN IF NOT EXISTS generated_video_path TEXT,
  ADD COLUMN IF NOT EXISTS generated_image_path TEXT,
  ADD COLUMN IF NOT EXISTS audio_path TEXT,
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_video_scenes_sb_scene_id ON public.video_scenes(storyboard_scene_id);
CREATE INDEX IF NOT EXISTS idx_video_scenes_gen_status ON public.video_scenes(generation_status);

-- ==============================================================================
-- 3. Enhance media_assets table
-- ==============================================================================
ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS facebook_page_id UUID REFERENCES public.facebook_pages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS video_id UUID REFERENCES public.videos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS scene_id UUID REFERENCES public.video_scenes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS duration_seconds NUMERIC(6, 2),
  ADD COLUMN IF NOT EXISTS width INTEGER DEFAULT 1080,
  ADD COLUMN IF NOT EXISTS height INTEGER DEFAULT 1920,
  ADD COLUMN IF NOT EXISTS provider TEXT;

CREATE INDEX IF NOT EXISTS idx_media_assets_page_id ON public.media_assets(facebook_page_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_video_id ON public.media_assets(video_id);

-- ==============================================================================
-- 4. Enhance page_settings table for Page-Specific Branding & Watermarking
-- ==============================================================================
ALTER TABLE public.page_settings
  ADD COLUMN IF NOT EXISTS brand_name TEXT,
  ADD COLUMN IF NOT EXISTS watermark_position TEXT DEFAULT 'bottom_right',
  ADD COLUMN IF NOT EXISTS watermark_size NUMERIC(4, 2) DEFAULT 0.15,
  ADD COLUMN IF NOT EXISTS watermark_opacity NUMERIC(3, 2) DEFAULT 0.85,
  ADD COLUMN IF NOT EXISTS brand_primary_color TEXT DEFAULT '#3b82f6',
  ADD COLUMN IF NOT EXISTS brand_secondary_color TEXT DEFAULT '#1d4ed8',
  ADD COLUMN IF NOT EXISTS intro_video_path TEXT,
  ADD COLUMN IF NOT EXISTS outro_video_path TEXT,
  ADD COLUMN IF NOT EXISTS enable_watermark BOOLEAN DEFAULT true;
