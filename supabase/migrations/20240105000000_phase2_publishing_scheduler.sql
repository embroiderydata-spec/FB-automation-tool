-- Supabase Schema Migration: Phase 2.4 Publishing Scheduler & Facebook Reels Auto-Publishing
-- Enhances publishing_jobs, page_settings, content_posts, and introduces publishing_logs, system_settings, notifications

-- ==============================================================================
-- 1. system_settings (For persistent emergency kill-switch & global controls)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users view system settings"
  ON public.system_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users update system settings"
  ON public.system_settings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Initialize default emergency kill-switch (active = false)
INSERT INTO public.system_settings (key, value)
VALUES 
  ('emergency_stop', '{"paused": false, "reason": null, "paused_at": null}'::jsonb),
  ('publishing_concurrency', '{"max_concurrent_jobs": 1}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ==============================================================================
-- 2. Enhance page_settings with Phase 2.4 publishing controls
-- ==============================================================================
ALTER TABLE public.page_settings
  ADD COLUMN IF NOT EXISTS enable_auto_publishing BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS min_interval_hours INTEGER DEFAULT 4,
  ADD COLUMN IF NOT EXISTS max_scheduled_posts INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS default_caption_template TEXT,
  ADD COLUMN IF NOT EXISTS default_hashtags TEXT[] DEFAULT ARRAY['#reels', '#viral']::TEXT[],
  ADD COLUMN IF NOT EXISTS publishing_mode TEXT DEFAULT 'test',
  ADD COLUMN IF NOT EXISTS is_queue_paused BOOLEAN DEFAULT false;

-- ==============================================================================
-- 3. Enhance publishing_jobs
-- ==============================================================================
ALTER TABLE public.publishing_jobs DROP CONSTRAINT IF EXISTS publishing_jobs_status_check;

ALTER TABLE public.publishing_jobs
  ADD COLUMN IF NOT EXISTS video_id UUID REFERENCES public.videos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS facebook_page_id UUID REFERENCES public.facebook_pages(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS caption TEXT,
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS is_test_mode BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS meta_video_id TEXT,
  ADD COLUMN IF NOT EXISTS meta_post_id TEXT,
  ADD COLUMN IF NOT EXISTS published_url TEXT,
  ADD COLUMN IF NOT EXISTS error_code TEXT,
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS locked_by TEXT;

-- Sync columns if older names were used
UPDATE public.publishing_jobs
SET 
  facebook_page_id = COALESCE(facebook_page_id, page_id),
  scheduled_at = COALESCE(scheduled_at, scheduled_for),
  error_message = COALESCE(error_message, last_error)
WHERE facebook_page_id IS NULL OR scheduled_at IS NULL;

-- Add updated check constraint for all Phase 2.4 statuses
ALTER TABLE public.publishing_jobs
  ADD CONSTRAINT publishing_jobs_status_check
  CHECK (status IN (
    'draft',
    'pending_approval',
    'approved',
    'scheduled',
    'queued',
    'uploading',
    'processing',
    'publishing',
    'published',
    'completed',
    'failed',
    'cancelled',
    'retrying'
  ));

CREATE INDEX IF NOT EXISTS idx_publishing_jobs_page_status ON public.publishing_jobs(page_id, status);
CREATE INDEX IF NOT EXISTS idx_publishing_jobs_scheduled_at ON public.publishing_jobs(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_publishing_jobs_next_retry ON public.publishing_jobs(next_retry_at);

-- Trigger to keep page_id / facebook_page_id and scheduled_for / scheduled_at in sync
CREATE OR REPLACE FUNCTION public.sync_publishing_jobs_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.facebook_page_id IS NOT NULL AND NEW.page_id IS NULL THEN
    NEW.page_id = NEW.facebook_page_id;
  ELSIF NEW.page_id IS NOT NULL AND NEW.facebook_page_id IS NULL THEN
    NEW.facebook_page_id = NEW.page_id;
  END IF;

  IF NEW.scheduled_at IS NOT NULL AND NEW.scheduled_for IS NULL THEN
    NEW.scheduled_for = NEW.scheduled_at;
  ELSIF NEW.scheduled_for IS NOT NULL AND NEW.scheduled_at IS NULL THEN
    NEW.scheduled_at = NEW.scheduled_for;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_publishing_jobs_columns ON public.publishing_jobs;
CREATE TRIGGER trg_sync_publishing_jobs_columns
  BEFORE INSERT OR UPDATE ON public.publishing_jobs
  FOR EACH ROW EXECUTE FUNCTION public.sync_publishing_jobs_columns();

-- ==============================================================================
-- 4. publishing_logs (Audit logs for Meta Graph API calls & job operations)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.publishing_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.publishing_jobs(id) ON DELETE CASCADE,
  page_id UUID REFERENCES public.facebook_pages(id) ON DELETE CASCADE,
  video_id UUID REFERENCES public.videos(id) ON DELETE SET NULL,
  operation TEXT NOT NULL,
  endpoint TEXT,
  attempt INTEGER DEFAULT 1,
  status TEXT NOT NULL CHECK (status IN ('info', 'success', 'warning', 'error')),
  meta_response JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_publishing_logs_job_id ON public.publishing_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_publishing_logs_page_id ON public.publishing_logs(page_id);
CREATE INDEX IF NOT EXISTS idx_publishing_logs_user_id ON public.publishing_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_publishing_logs_created_at ON public.publishing_logs(created_at DESC);

ALTER TABLE public.publishing_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own publishing logs"
  ON public.publishing_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- 5. notifications table (Dashboard alerts for successes, failures, expirations)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('success', 'warning', 'error', 'info')),
  link_url TEXT,
  is_read BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own notifications"
  ON public.notifications FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
