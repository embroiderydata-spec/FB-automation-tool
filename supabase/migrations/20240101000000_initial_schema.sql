-- Supabase Schema Migration: Phase 1 Foundation
-- Covers 14 core tables with RLS policies, indexes, and triggers

-- ==============================================================================
-- 1. Helper Function: Update timestamp
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 2. profiles table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'editor')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE TRIGGER on_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger to automatically create a profile entry when a new auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 3. facebook_accounts table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.facebook_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  fb_user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  access_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'disconnected', 'error')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_facebook_accounts_user_id ON public.facebook_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_facebook_accounts_fb_user_id ON public.facebook_accounts(fb_user_id);

ALTER TABLE public.facebook_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own facebook accounts"
  ON public.facebook_accounts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER on_facebook_accounts_updated
  BEFORE UPDATE ON public.facebook_accounts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 4. facebook_pages table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.facebook_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.facebook_accounts(id) ON DELETE SET NULL,
  fb_page_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  page_access_token TEXT NOT NULL,
  page_token_expires_at TIMESTAMPTZ,
  picture_url TEXT,
  followers_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'revoked', 'error')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_fb_page UNIQUE (user_id, fb_page_id)
);

CREATE INDEX IF NOT EXISTS idx_facebook_pages_user_id ON public.facebook_pages(user_id);
CREATE INDEX IF NOT EXISTS idx_facebook_pages_status ON public.facebook_pages(status);

ALTER TABLE public.facebook_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own facebook pages"
  ON public.facebook_pages FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER on_facebook_pages_updated
  BEFORE UPDATE ON public.facebook_pages
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 5. page_settings table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.page_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES public.facebook_pages(id) ON DELETE CASCADE UNIQUE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  default_language TEXT DEFAULT 'en',
  niche_category TEXT,
  posting_frequency_per_day INTEGER DEFAULT 1,
  preferred_posting_times TIME[] DEFAULT ARRAY['10:00:00'::TIME, '16:00:00'::TIME, '20:00:00'::TIME],
  auto_publish BOOLEAN DEFAULT false,
  watermark_text TEXT,
  watermark_logo_url TEXT,
  ai_voice_id TEXT,
  ai_tone TEXT DEFAULT 'engaging',
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_page_settings_page_id ON public.page_settings(page_id);
CREATE INDEX IF NOT EXISTS idx_page_settings_user_id ON public.page_settings(user_id);

ALTER TABLE public.page_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own page settings"
  ON public.page_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER on_page_settings_updated
  BEFORE UPDATE ON public.page_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 6. content_ideas table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.content_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  page_id UUID REFERENCES public.facebook_pages(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  prompt TEXT,
  topic TEXT,
  target_audience TEXT,
  generated_script TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'rejected', 'in_production', 'used')),
  source TEXT DEFAULT 'ai' CHECK (source IN ('ai', 'manual', 'trending', 'rss')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_ideas_user_id ON public.content_ideas(user_id);
CREATE INDEX IF NOT EXISTS idx_content_ideas_page_id ON public.content_ideas(page_id);
CREATE INDEX IF NOT EXISTS idx_content_ideas_status ON public.content_ideas(status);

ALTER TABLE public.content_ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own content ideas"
  ON public.content_ideas FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER on_content_ideas_updated
  BEFORE UPDATE ON public.content_ideas
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 7. videos table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  page_id UUID REFERENCES public.facebook_pages(id) ON DELETE SET NULL,
  idea_id UUID REFERENCES public.content_ideas(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generating', 'ready', 'failed', 'scheduled', 'published')),
  video_url TEXT,
  thumbnail_url TEXT,
  duration_seconds NUMERIC(6, 2),
  aspect_ratio TEXT DEFAULT '9:16' CHECK (aspect_ratio IN ('9:16', '16:9', '1:1')),
  resolution TEXT DEFAULT '1080p',
  storage_path TEXT,
  render_engine TEXT DEFAULT 'standard',
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_videos_user_id ON public.videos(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_page_id ON public.videos(page_id);
CREATE INDEX IF NOT EXISTS idx_videos_status ON public.videos(status);

ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own videos"
  ON public.videos FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER on_videos_updated
  BEFORE UPDATE ON public.videos
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 8. video_scenes table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.video_scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  scene_order INTEGER NOT NULL,
  narration_text TEXT,
  visual_prompt TEXT,
  media_type TEXT DEFAULT 'video' CHECK (media_type IN ('video', 'image', 'color_bg')),
  media_url TEXT,
  audio_url TEXT,
  duration_seconds NUMERIC(5, 2) DEFAULT 3.00,
  transition_type TEXT DEFAULT 'fade',
  subtitles_text TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_video_scenes_video_id ON public.video_scenes(video_id);
CREATE INDEX IF NOT EXISTS idx_video_scenes_order ON public.video_scenes(video_id, scene_order);

ALTER TABLE public.video_scenes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage video scenes through video ownership"
  ON public.video_scenes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.videos v
      WHERE v.id = video_scenes.video_id AND v.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.videos v
      WHERE v.id = video_scenes.video_id AND v.user_id = auth.uid()
    )
  );

CREATE TRIGGER on_video_scenes_updated
  BEFORE UPDATE ON public.video_scenes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 9. media_assets table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  asset_name TEXT NOT NULL,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('image', 'video', 'audio', 'voiceover', 'font', 'logo')),
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  file_size_bytes BIGINT,
  mime_type TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_media_assets_user_id ON public.media_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_type ON public.media_assets(asset_type);

ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own media assets"
  ON public.media_assets FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER on_media_assets_updated
  BEFORE UPDATE ON public.media_assets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 10. content_posts table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.content_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  page_id UUID NOT NULL REFERENCES public.facebook_pages(id) ON DELETE CASCADE,
  video_id UUID REFERENCES public.videos(id) ON DELETE SET NULL,
  post_caption TEXT,
  post_type TEXT DEFAULT 'reel' CHECK (post_type IN ('reel', 'video', 'photo', 'text', 'story')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'publishing', 'published', 'failed', 'cancelled')),
  scheduled_publish_time TIMESTAMPTZ,
  actual_published_time TIMESTAMPTZ,
  fb_post_id TEXT,
  permalink_url TEXT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_posts_user_id ON public.content_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_content_posts_page_id ON public.content_posts(page_id);
CREATE INDEX IF NOT EXISTS idx_content_posts_status ON public.content_posts(status);
CREATE INDEX IF NOT EXISTS idx_content_posts_scheduled ON public.content_posts(scheduled_publish_time);

ALTER TABLE public.content_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own content posts"
  ON public.content_posts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER on_content_posts_updated
  BEFORE UPDATE ON public.content_posts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 11. publishing_jobs table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.publishing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.content_posts(id) ON DELETE CASCADE,
  page_id UUID NOT NULL REFERENCES public.facebook_pages(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'retrying')),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_error TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_publishing_jobs_user_id ON public.publishing_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_publishing_jobs_status ON public.publishing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_publishing_jobs_scheduled_for ON public.publishing_jobs(scheduled_for);

ALTER TABLE public.publishing_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own publishing jobs"
  ON public.publishing_jobs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER on_publishing_jobs_updated
  BEFORE UPDATE ON public.publishing_jobs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 12. ai_jobs table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.ai_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL CHECK (job_type IN ('script_generation', 'voice_synthesis', 'video_render', 'image_generation', 'caption_generation')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  provider TEXT NOT NULL,
  input_params JSONB NOT NULL DEFAULT '{}'::jsonb,
  output_data JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  cost_estimate_cents NUMERIC(10, 4) DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,
  duration_ms INTEGER,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_jobs_user_id ON public.ai_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_status ON public.ai_jobs(status);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_provider ON public.ai_jobs(provider);

ALTER TABLE public.ai_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own ai jobs"
  ON public.ai_jobs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER on_ai_jobs_updated
  BEFORE UPDATE ON public.ai_jobs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 13. analytics_daily table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.analytics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  page_id UUID NOT NULL REFERENCES public.facebook_pages(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  views_count INTEGER DEFAULT 0,
  impressions_count INTEGER DEFAULT 0,
  reach_count INTEGER DEFAULT 0,
  engagements_count INTEGER DEFAULT 0,
  reactions_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  clicks_count INTEGER DEFAULT 0,
  followers_net_change INTEGER DEFAULT 0,
  raw_metrics JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_page_daily_metric UNIQUE (page_id, date)
);

CREATE INDEX IF NOT EXISTS idx_analytics_daily_user_id ON public.analytics_daily(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_page_date ON public.analytics_daily(page_id, date);

ALTER TABLE public.analytics_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own analytics"
  ON public.analytics_daily FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER on_analytics_daily_updated
  BEFORE UPDATE ON public.analytics_daily
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 14. api_usage table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  endpoint TEXT,
  units_consumed NUMERIC(12, 4) DEFAULT 0,
  unit_type TEXT DEFAULT 'tokens',
  cost_usd NUMERIC(10, 4) DEFAULT 0.0000,
  reference_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_usage_user_id ON public.api_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_service ON public.api_usage(service_name);

ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own api usage"
  ON public.api_usage FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- 15. system_logs table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  page_id UUID REFERENCES public.facebook_pages(id) ON DELETE SET NULL,
  level TEXT NOT NULL CHECK (level IN ('info', 'warn', 'error', 'debug')),
  category TEXT NOT NULL,
  message TEXT NOT NULL,
  context JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON public.system_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON public.system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON public.system_logs(created_at DESC);

ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own system logs"
  ON public.system_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
