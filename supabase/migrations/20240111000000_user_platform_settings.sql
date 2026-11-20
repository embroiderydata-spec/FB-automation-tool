-- ==============================================================================
-- Migration: 20240111000000_user_platform_settings.sql
-- Description: Stores persistent user platform preferences, budget limits,
--              default providers, notifications, and scheduling configurations.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.user_platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  timezone TEXT DEFAULT 'UTC',
  daily_budget_limit NUMERIC(10,2) DEFAULT 25.00,
  monthly_budget_limit NUMERIC(10,2) DEFAULT 500.00,
  max_cost_per_video NUMERIC(6,2) DEFAULT 1.50,
  max_posts_per_day_per_page INTEGER DEFAULT 3,
  default_llm_provider TEXT DEFAULT 'openai',
  default_video_provider TEXT DEFAULT 'replicate',
  default_voice_provider TEXT DEFAULT 'elevenlabs',
  auto_publish_default BOOLEAN DEFAULT false,
  require_manual_approval BOOLEAN DEFAULT true,
  notify_on_publish BOOLEAN DEFAULT true,
  notify_on_failure BOOLEAN DEFAULT true,
  emergency_stopped BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE public.user_platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own platform settings" ON public.user_platform_settings;
CREATE POLICY "Users can read own platform settings"
  ON public.user_platform_settings
  FOR SELECT
  USING (auth.uid() = user_id OR auth.role() IN ('anon', 'authenticated', 'service_role'));

DROP POLICY IF EXISTS "Users can insert own platform settings" ON public.user_platform_settings;
CREATE POLICY "Users can insert own platform settings"
  ON public.user_platform_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.role() IN ('anon', 'authenticated', 'service_role'));

DROP POLICY IF EXISTS "Users can update own platform settings" ON public.user_platform_settings;
CREATE POLICY "Users can update own platform settings"
  ON public.user_platform_settings
  FOR UPDATE
  USING (auth.uid() = user_id OR auth.role() IN ('anon', 'authenticated', 'service_role'));

GRANT ALL ON TABLE public.user_platform_settings TO authenticated, anon, service_role;
