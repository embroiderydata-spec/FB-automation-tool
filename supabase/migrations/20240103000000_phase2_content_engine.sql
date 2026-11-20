-- Supabase Schema Migration: Phase 2.2 AI Content Engine & Content Studio
-- Adds content_scripts, content_storyboards, storyboard_scenes, and enhances page_settings, content_ideas, ai_jobs, and api_usage

-- ==============================================================================
-- 1. Enhance page_settings for Rich Page Niche Configuration
-- ==============================================================================
ALTER TABLE public.page_settings
  ADD COLUMN IF NOT EXISTS sub_niche TEXT,
  ADD COLUMN IF NOT EXISTS page_description TEXT,
  ADD COLUMN IF NOT EXISTS topics_to_cover TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS topics_to_avoid TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS preferred_content_format TEXT DEFAULT 'reels',
  ADD COLUMN IF NOT EXISTS originality_guidelines TEXT;

-- ==============================================================================
-- 2. Enhance content_ideas table
-- ==============================================================================
ALTER TABLE public.content_ideas
  ADD COLUMN IF NOT EXISTS facebook_page_id UUID REFERENCES public.facebook_pages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS hook TEXT,
  ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS tone TEXT DEFAULT 'engaging',
  ADD COLUMN IF NOT EXISTS duration_seconds INTEGER DEFAULT 45,
  ADD COLUMN IF NOT EXISTS content_status TEXT DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS viral_potential TEXT,
  ADD COLUMN IF NOT EXISTS originality_notes TEXT,
  ADD COLUMN IF NOT EXISTS generation_metadata JSONB DEFAULT '{}'::jsonb;

-- Sync facebook_page_id with page_id
UPDATE public.content_ideas
SET facebook_page_id = COALESCE(facebook_page_id, page_id)
WHERE facebook_page_id IS NULL AND page_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.sync_content_ideas_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.facebook_page_id IS NOT NULL AND NEW.page_id IS NULL THEN
    NEW.page_id = NEW.facebook_page_id;
  ELSIF NEW.page_id IS NOT NULL AND NEW.facebook_page_id IS NULL THEN
    NEW.facebook_page_id = NEW.page_id;
  END IF;

  IF NEW.content_status IS NOT NULL AND NEW.status IS NULL THEN
    NEW.status = NEW.content_status;
  ELSIF NEW.status IS NOT NULL AND NEW.content_status IS NULL THEN
    NEW.content_status = NEW.status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_content_ideas_columns ON public.content_ideas;
CREATE TRIGGER trg_sync_content_ideas_columns
  BEFORE INSERT OR UPDATE ON public.content_ideas
  FOR EACH ROW EXECUTE FUNCTION public.sync_content_ideas_columns();

CREATE INDEX IF NOT EXISTS idx_content_ideas_fb_page ON public.content_ideas(facebook_page_id);
CREATE INDEX IF NOT EXISTS idx_content_ideas_content_status ON public.content_ideas(content_status);

-- ==============================================================================
-- 3. Create content_scripts table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.content_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_idea_id UUID NOT NULL REFERENCES public.content_ideas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  facebook_page_id UUID REFERENCES public.facebook_pages(id) ON DELETE SET NULL,
  script_title TEXT NOT NULL,
  hook TEXT NOT NULL,
  narration TEXT NOT NULL,
  caption TEXT,
  hashtags TEXT[] DEFAULT ARRAY[]::TEXT[],
  estimated_duration_seconds INTEGER DEFAULT 45,
  word_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_review', 'approved', 'rejected')),
  version INTEGER NOT NULL DEFAULT 1,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_scripts_idea_id ON public.content_scripts(content_idea_id);
CREATE INDEX IF NOT EXISTS idx_content_scripts_user_id ON public.content_scripts(user_id);
CREATE INDEX IF NOT EXISTS idx_content_scripts_page_id ON public.content_scripts(facebook_page_id);
CREATE INDEX IF NOT EXISTS idx_content_scripts_status ON public.content_scripts(status);

ALTER TABLE public.content_scripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own content scripts"
  ON public.content_scripts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER on_content_scripts_updated
  BEFORE UPDATE ON public.content_scripts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 4. Create content_storyboards table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.content_storyboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_script_id UUID NOT NULL REFERENCES public.content_scripts(id) ON DELETE CASCADE,
  content_idea_id UUID REFERENCES public.content_ideas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  facebook_page_id UUID REFERENCES public.facebook_pages(id) ON DELETE SET NULL,
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_review', 'approved', 'rejected')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_storyboards_script_id ON public.content_storyboards(content_script_id);
CREATE INDEX IF NOT EXISTS idx_content_storyboards_user_id ON public.content_storyboards(user_id);
CREATE INDEX IF NOT EXISTS idx_content_storyboards_status ON public.content_storyboards(status);

ALTER TABLE public.content_storyboards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own content storyboards"
  ON public.content_storyboards FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER on_content_storyboards_updated
  BEFORE UPDATE ON public.content_storyboards
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 5. Create storyboard_scenes table (Detailed 9:16 vertical scenes)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.storyboard_scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storyboard_id UUID NOT NULL REFERENCES public.content_storyboards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scene_number INTEGER NOT NULL,
  start_time NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
  end_time NUMERIC(6, 2) NOT NULL DEFAULT 3.00,
  duration NUMERIC(6, 2) NOT NULL DEFAULT 3.00,
  narration TEXT NOT NULL,
  visual_description TEXT NOT NULL,
  video_prompt TEXT NOT NULL,
  camera_direction TEXT,
  motion_description TEXT,
  transition TEXT DEFAULT 'fade',
  on_screen_text TEXT,
  sound_effect TEXT,
  scene_type TEXT NOT NULL DEFAULT 'main_content' CHECK (scene_type IN ('opening', 'main_content', 'transition', 'reaction', 'ending')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_storyboard_scenes_storyboard_id ON public.storyboard_scenes(storyboard_id);
CREATE INDEX IF NOT EXISTS idx_storyboard_scenes_order ON public.storyboard_scenes(storyboard_id, scene_number);

ALTER TABLE public.storyboard_scenes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own storyboard scenes"
  ON public.storyboard_scenes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER on_storyboard_scenes_updated
  BEFORE UPDATE ON public.storyboard_scenes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 6. Enhance ai_jobs table
-- ==============================================================================
ALTER TABLE public.ai_jobs
  ADD COLUMN IF NOT EXISTS facebook_page_id UUID REFERENCES public.facebook_pages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS content_idea_id UUID REFERENCES public.content_ideas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS model TEXT,
  ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS request_metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS response_metadata JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_ai_jobs_page_id ON public.ai_jobs(facebook_page_id);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_content_idea_id ON public.ai_jobs(content_idea_id);

-- ==============================================================================
-- 7. Enhance api_usage table
-- ==============================================================================
ALTER TABLE public.api_usage
  ADD COLUMN IF NOT EXISTS facebook_page_id UUID REFERENCES public.facebook_pages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS model TEXT,
  ADD COLUMN IF NOT EXISTS input_tokens INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS output_tokens INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_tokens INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS generation_type TEXT,
  ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES public.ai_jobs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_api_usage_page_id ON public.api_usage(facebook_page_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_date ON public.api_usage(created_at);
