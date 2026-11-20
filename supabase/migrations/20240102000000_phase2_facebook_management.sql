-- Supabase Schema Migration: Phase 2 Facebook Page Manager & Meta OAuth Integration
-- Enhances facebook_accounts, facebook_pages, and page_settings with full Phase 2 field requirements

-- ==============================================================================
-- 1. Enhance facebook_accounts
-- ==============================================================================
ALTER TABLE public.facebook_accounts
  ADD COLUMN IF NOT EXISTS facebook_user_id TEXT,
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS encrypted_access_token TEXT,
  ADD COLUMN IF NOT EXISTS granted_permissions TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS connection_status TEXT DEFAULT 'connected',
  ADD COLUMN IF NOT EXISTS connected_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ;

-- Backfill / sync existing Phase 1 columns
UPDATE public.facebook_accounts
SET 
  facebook_user_id = COALESCE(facebook_user_id, fb_user_id),
  display_name = COALESCE(display_name, name),
  encrypted_access_token = COALESCE(encrypted_access_token, access_token),
  connection_status = COALESCE(connection_status, status)
WHERE facebook_user_id IS NULL OR display_name IS NULL;

-- Trigger to keep Phase 1 and Phase 2 column names in sync
CREATE OR REPLACE FUNCTION public.sync_facebook_accounts_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.facebook_user_id IS NOT NULL AND NEW.fb_user_id IS NULL THEN
    NEW.fb_user_id = NEW.facebook_user_id;
  ELSIF NEW.fb_user_id IS NOT NULL AND NEW.facebook_user_id IS NULL THEN
    NEW.facebook_user_id = NEW.fb_user_id;
  END IF;

  IF NEW.display_name IS NOT NULL AND NEW.name IS NULL THEN
    NEW.name = NEW.display_name;
  ELSIF NEW.name IS NOT NULL AND NEW.display_name IS NULL THEN
    NEW.display_name = NEW.name;
  END IF;

  IF NEW.encrypted_access_token IS NOT NULL AND NEW.access_token IS NULL THEN
    NEW.access_token = NEW.encrypted_access_token;
  ELSIF NEW.access_token IS NOT NULL AND NEW.encrypted_access_token IS NULL THEN
    NEW.encrypted_access_token = NEW.access_token;
  END IF;

  IF NEW.connection_status IS NOT NULL AND NEW.status IS NULL THEN
    NEW.status = NEW.connection_status;
  ELSIF NEW.status IS NOT NULL AND NEW.connection_status IS NULL THEN
    NEW.connection_status = NEW.status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_facebook_accounts_columns ON public.facebook_accounts;
CREATE TRIGGER trg_sync_facebook_accounts_columns
  BEFORE INSERT OR UPDATE ON public.facebook_accounts
  FOR EACH ROW EXECUTE FUNCTION public.sync_facebook_accounts_columns();

-- ==============================================================================
-- 2. Enhance facebook_pages
-- ==============================================================================
ALTER TABLE public.facebook_pages
  ADD COLUMN IF NOT EXISTS facebook_account_id UUID REFERENCES public.facebook_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS facebook_page_id TEXT,
  ADD COLUMN IF NOT EXISTS page_name TEXT,
  ADD COLUMN IF NOT EXISTS profile_picture_url TEXT,
  ADD COLUMN IF NOT EXISTS encrypted_page_access_token TEXT,
  ADD COLUMN IF NOT EXISTS assigned_tasks TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS connection_status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS automation_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- Backfill / sync existing Phase 1 columns
UPDATE public.facebook_pages
SET 
  facebook_account_id = COALESCE(facebook_account_id, account_id),
  facebook_page_id = COALESCE(facebook_page_id, fb_page_id),
  page_name = COALESCE(page_name, name),
  profile_picture_url = COALESCE(profile_picture_url, picture_url),
  encrypted_page_access_token = COALESCE(encrypted_page_access_token, page_access_token),
  connection_status = COALESCE(connection_status, status)
WHERE facebook_page_id IS NULL OR page_name IS NULL;

-- Trigger to keep Phase 1 and Phase 2 column names in sync
CREATE OR REPLACE FUNCTION public.sync_facebook_pages_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.facebook_account_id IS NOT NULL AND NEW.account_id IS NULL THEN
    NEW.account_id = NEW.facebook_account_id;
  ELSIF NEW.account_id IS NOT NULL AND NEW.facebook_account_id IS NULL THEN
    NEW.facebook_account_id = NEW.account_id;
  END IF;

  IF NEW.facebook_page_id IS NOT NULL AND NEW.fb_page_id IS NULL THEN
    NEW.fb_page_id = NEW.facebook_page_id;
  ELSIF NEW.fb_page_id IS NOT NULL AND NEW.facebook_page_id IS NULL THEN
    NEW.facebook_page_id = NEW.fb_page_id;
  END IF;

  IF NEW.page_name IS NOT NULL AND NEW.name IS NULL THEN
    NEW.name = NEW.page_name;
  ELSIF NEW.name IS NOT NULL AND NEW.page_name IS NULL THEN
    NEW.page_name = NEW.name;
  END IF;

  IF NEW.profile_picture_url IS NOT NULL AND NEW.picture_url IS NULL THEN
    NEW.picture_url = NEW.profile_picture_url;
  ELSIF NEW.picture_url IS NOT NULL AND NEW.profile_picture_url IS NULL THEN
    NEW.profile_picture_url = NEW.picture_url;
  END IF;

  IF NEW.encrypted_page_access_token IS NOT NULL AND NEW.page_access_token IS NULL THEN
    NEW.page_access_token = NEW.encrypted_page_access_token;
  ELSIF NEW.page_access_token IS NOT NULL AND NEW.encrypted_page_access_token IS NULL THEN
    NEW.encrypted_page_access_token = NEW.page_access_token;
  END IF;

  IF NEW.connection_status IS NOT NULL AND NEW.status IS NULL THEN
    NEW.status = NEW.connection_status;
  ELSIF NEW.status IS NOT NULL AND NEW.connection_status IS NULL THEN
    NEW.connection_status = NEW.status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_facebook_pages_columns ON public.facebook_pages;
CREATE TRIGGER trg_sync_facebook_pages_columns
  BEFORE INSERT OR UPDATE ON public.facebook_pages
  FOR EACH ROW EXECUTE FUNCTION public.sync_facebook_pages_columns();

-- Add index on connection_status and automation_enabled
CREATE INDEX IF NOT EXISTS idx_facebook_pages_conn_status ON public.facebook_pages(connection_status);
CREATE INDEX IF NOT EXISTS idx_facebook_pages_automation ON public.facebook_pages(automation_enabled);
CREATE INDEX IF NOT EXISTS idx_facebook_pages_fb_page_id ON public.facebook_pages(facebook_page_id);

-- ==============================================================================
-- 3. Enhance page_settings
-- ==============================================================================
ALTER TABLE public.page_settings
  ADD COLUMN IF NOT EXISTS facebook_page_id UUID REFERENCES public.facebook_pages(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS niche TEXT,
  ADD COLUMN IF NOT EXISTS content_category TEXT,
  ADD COLUMN IF NOT EXISTS content_style TEXT DEFAULT 'informative',
  ADD COLUMN IF NOT EXISTS target_country TEXT DEFAULT 'US',
  ADD COLUMN IF NOT EXISTS target_audience TEXT DEFAULT 'General Audience',
  ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York',
  ADD COLUMN IF NOT EXISTS posting_days TEXT[] DEFAULT ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']::TEXT[],
  ADD COLUMN IF NOT EXISTS posting_schedule JSONB DEFAULT '["10:00", "16:00", "20:00"]'::jsonb,
  ADD COLUMN IF NOT EXISTS posts_per_day INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS daily_post_limit INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS video_duration_min INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS video_duration_max INTEGER DEFAULT 60,
  ADD COLUMN IF NOT EXISTS aspect_ratio TEXT DEFAULT '9:16',
  ADD COLUMN IF NOT EXISTS voice_preference TEXT DEFAULT 'en-US-Standard',
  ADD COLUMN IF NOT EXISTS require_approval BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS content_generation_enabled BOOLEAN DEFAULT false;

-- Backfill / sync existing Phase 1 columns
UPDATE public.page_settings
SET
  facebook_page_id = COALESCE(facebook_page_id, page_id),
  niche = COALESCE(niche, niche_category),
  language = COALESCE(language, default_language),
  posts_per_day = COALESCE(posts_per_day, posting_frequency_per_day)
WHERE facebook_page_id IS NULL;

-- Trigger to keep Phase 1 and Phase 2 column names in sync
CREATE OR REPLACE FUNCTION public.sync_page_settings_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.facebook_page_id IS NOT NULL AND NEW.page_id IS NULL THEN
    NEW.page_id = NEW.facebook_page_id;
  ELSIF NEW.page_id IS NOT NULL AND NEW.facebook_page_id IS NULL THEN
    NEW.facebook_page_id = NEW.page_id;
  END IF;

  IF NEW.niche IS NOT NULL AND NEW.niche_category IS NULL THEN
    NEW.niche_category = NEW.niche;
  ELSIF NEW.niche_category IS NOT NULL AND NEW.niche IS NULL THEN
    NEW.niche = NEW.niche_category;
  END IF;

  IF NEW.language IS NOT NULL AND NEW.default_language IS NULL THEN
    NEW.default_language = NEW.language;
  ELSIF NEW.default_language IS NOT NULL AND NEW.language IS NULL THEN
    NEW.language = NEW.default_language;
  END IF;

  IF NEW.posts_per_day IS NOT NULL AND NEW.posting_frequency_per_day IS NULL THEN
    NEW.posting_frequency_per_day = NEW.posts_per_day;
  ELSIF NEW.posting_frequency_per_day IS NOT NULL AND NEW.posts_per_day IS NULL THEN
    NEW.posts_per_day = NEW.posting_frequency_per_day;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_page_settings_columns ON public.page_settings;
CREATE TRIGGER trg_sync_page_settings_columns
  BEFORE INSERT OR UPDATE ON public.page_settings
  FOR EACH ROW EXECUTE FUNCTION public.sync_page_settings_columns();
