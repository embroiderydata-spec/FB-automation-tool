-- Supabase Schema Migration: Phase 2.6 Real Facebook Analytics & AI Performance Intelligence
-- Creates video_analytics, page_analytics_snapshots, ai_performance_insights, and enhances facebook_pages

-- ==============================================================================
-- 1. Enhance facebook_pages table for Analytics Synchronization
-- ==============================================================================
ALTER TABLE public.facebook_pages
  ADD COLUMN IF NOT EXISTS last_analytics_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS analytics_sync_status TEXT DEFAULT 'idle' CHECK (analytics_sync_status IN ('idle', 'syncing', 'success', 'error')),
  ADD COLUMN IF NOT EXISTS analytics_error_message TEXT;

-- ==============================================================================
-- 2. Create video_analytics table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.video_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  facebook_page_id UUID NOT NULL REFERENCES public.facebook_pages(id) ON DELETE CASCADE,
  video_id UUID REFERENCES public.videos(id) ON DELETE SET NULL,
  meta_video_id TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  views BIGINT DEFAULT 0,
  reach BIGINT DEFAULT 0,
  impressions BIGINT DEFAULT 0,
  total_plays BIGINT DEFAULT 0,
  replay_count BIGINT DEFAULT 0,
  average_watch_time NUMERIC(8, 2) DEFAULT 0.00,
  total_watch_time NUMERIC(10, 2) DEFAULT 0.00,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  follows INTEGER DEFAULT 0,
  retention_data JSONB DEFAULT '[]'::jsonb,
  raw_metrics JSONB DEFAULT '{}'::jsonb,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_video_analytics_page_meta_date UNIQUE (facebook_page_id, meta_video_id, date)
);

CREATE INDEX IF NOT EXISTS idx_video_analytics_user_id ON public.video_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_video_analytics_page_id ON public.video_analytics(facebook_page_id);
CREATE INDEX IF NOT EXISTS idx_video_analytics_video_id ON public.video_analytics(video_id);
CREATE INDEX IF NOT EXISTS idx_video_analytics_meta_video ON public.video_analytics(meta_video_id);
CREATE INDEX IF NOT EXISTS idx_video_analytics_date ON public.video_analytics(date);

ALTER TABLE public.video_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own video analytics"
  ON public.video_analytics FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- 3. Create page_analytics_snapshots table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.page_analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  facebook_page_id UUID NOT NULL REFERENCES public.facebook_pages(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  followers BIGINT DEFAULT 0,
  views BIGINT DEFAULT 0,
  reach BIGINT DEFAULT 0,
  impressions BIGINT DEFAULT 0,
  engagement BIGINT DEFAULT 0,
  follows_gained INTEGER DEFAULT 0,
  follows_lost INTEGER DEFAULT 0,
  raw_metrics JSONB DEFAULT '{}'::jsonb,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_page_analytics_snapshot_page_date UNIQUE (facebook_page_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_page_analytics_snapshots_user ON public.page_analytics_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_page_analytics_snapshots_page ON public.page_analytics_snapshots(facebook_page_id);
CREATE INDEX IF NOT EXISTS idx_page_analytics_snapshots_date ON public.page_analytics_snapshots(snapshot_date);

ALTER TABLE public.page_analytics_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own page analytics snapshots"
  ON public.page_analytics_snapshots FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- 4. Create ai_performance_insights table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.ai_performance_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  facebook_page_id UUID REFERENCES public.facebook_pages(id) ON DELETE SET NULL,
  insight_type TEXT NOT NULL CHECK (insight_type IN (
    'hook_retention',
    'video_duration',
    'publishing_time',
    'niche_growth',
    'content_recommendation',
    'cross_page_benchmark'
  )),
  title TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  supporting_data JSONB DEFAULT '{}'::jsonb,
  confidence_level TEXT NOT NULL DEFAULT 'moderate' CHECK (confidence_level IN (
    'high',
    'moderate',
    'low',
    'insufficient_data'
  )),
  suggested_experiment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_insights_user ON public.ai_performance_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_page ON public.ai_performance_insights(facebook_page_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_type ON public.ai_performance_insights(insight_type);

ALTER TABLE public.ai_performance_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own ai performance insights"
  ON public.ai_performance_insights FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
