-- Supabase Schema Migration: Phase 2.8 Production Reliability, Security & Background Worker
-- Adds system_settings, unified background_jobs queue, worker_heartbeats, and reliability indexes

-- ==============================================================================
-- 1. System Settings Table (Global Configuration & Kill Switches)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default global settings
INSERT INTO public.system_settings (key, value, description)
VALUES 
  ('emergency_stop', '{"paused": false, "reason": null, "activated_at": null, "activated_by": null}'::jsonb, 'Global Emergency Kill-Switch for pausing publishing, AI generation, and workflows'),
  ('cost_limits', '{"daily_budget_usd": 25.00, "monthly_budget_usd": 250.00, "per_user_daily_limit_usd": 10.00, "enforce_hard_stop": true}'::jsonb, 'Database-backed spending caps and budget protection'),
  ('worker_concurrency', '{"max_video_renders": 2, "max_ai_jobs": 5, "max_publishing_jobs": 3, "render_timeout_seconds": 600}'::jsonb, 'Concurrency and resource limits for worker execution')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read system settings"
  ON public.system_settings FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users update system settings"
  ON public.system_settings FOR ALL
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- ==============================================================================
-- 2. Unified Background Jobs Queue Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.background_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  page_id UUID REFERENCES public.facebook_pages(id) ON DELETE SET NULL,
  job_type TEXT NOT NULL CHECK (job_type IN (
    'ai_script_generation',
    'ai_video_generation',
    'voice_generation',
    'video_rendering',
    'subtitle_generation',
    'facebook_publishing',
    'analytics_sync',
    'workflow_execution',
    'scheduled_distribution'
  )),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN (
    'queued',
    'locked',
    'processing',
    'completed',
    'failed',
    'dead_letter',
    'cancelled'
  )),
  priority INTEGER NOT NULL DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB DEFAULT '{}'::jsonb,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 4,
  next_retry_at TIMESTAMPTZ,
  idempotency_key TEXT UNIQUE,
  locked_by TEXT,
  locked_at TIMESTAMPTZ,
  lock_expires_at TIMESTAMPTZ,
  error_code TEXT,
  error_message TEXT,
  error_details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_background_jobs_polling 
  ON public.background_jobs(status, priority DESC, next_retry_at, created_at)
  WHERE status IN ('queued', 'failed');

CREATE INDEX IF NOT EXISTS idx_background_jobs_user_status 
  ON public.background_jobs(user_id, status);

CREATE INDEX IF NOT EXISTS idx_background_jobs_type_status 
  ON public.background_jobs(job_type, status);

CREATE INDEX IF NOT EXISTS idx_background_jobs_lock_timeout 
  ON public.background_jobs(status, lock_expires_at)
  WHERE status = 'locked' OR status = 'processing';

ALTER TABLE public.background_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own background jobs"
  ON public.background_jobs FOR ALL
  USING (auth.uid() = user_id OR auth.role() = 'service_role')
  WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE TRIGGER on_background_jobs_updated
  BEFORE UPDATE ON public.background_jobs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 3. Worker Heartbeats Table (Worker Instance Tracking & Telemetry)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.worker_heartbeats (
  worker_id TEXT PRIMARY KEY,
  hostname TEXT,
  role TEXT NOT NULL DEFAULT 'unified_worker',
  status TEXT NOT NULL DEFAULT 'online' CHECK (status IN ('online', 'busy', 'stopping', 'offline')),
  active_jobs_count INTEGER NOT NULL DEFAULT 0,
  memory_usage_mb NUMERIC(10,2),
  last_heartbeat TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_worker_heartbeats_alive 
  ON public.worker_heartbeats(last_heartbeat DESC);

ALTER TABLE public.worker_heartbeats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read worker heartbeats"
  ON public.worker_heartbeats FOR SELECT
  USING (true);

CREATE POLICY "Manage worker heartbeats"
  ON public.worker_heartbeats FOR ALL
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- ==============================================================================
-- 4. Ensure Full Permissions For Supabase Roles
-- ==============================================================================
GRANT ALL ON TABLE public.system_settings TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.background_jobs TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.worker_heartbeats TO postgres, anon, authenticated, service_role;
