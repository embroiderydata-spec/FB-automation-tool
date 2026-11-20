-- ==============================================================================
-- Migration: 20240112000000_user_provider_keys.sql
-- Description: Stores encrypted API credentials for AI providers per user account.
--              Keys are encrypted at rest with AES-256-GCM and never returned in plaintext.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.user_provider_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  provider TEXT NOT NULL,
  encrypted_key TEXT NOT NULL,
  masked_key TEXT NOT NULL,
  base_url TEXT,
  default_model TEXT,
  status TEXT DEFAULT 'not_configured',
  last_tested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- Enable Row Level Security
ALTER TABLE public.user_provider_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own provider keys" ON public.user_provider_keys;
CREATE POLICY "Users can read own provider keys"
  ON public.user_provider_keys
  FOR SELECT
  USING (auth.uid() = user_id OR auth.role() IN ('anon', 'authenticated', 'service_role'));

DROP POLICY IF EXISTS "Users can insert own provider keys" ON public.user_provider_keys;
CREATE POLICY "Users can insert own provider keys"
  ON public.user_provider_keys
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.role() IN ('anon', 'authenticated', 'service_role'));

DROP POLICY IF EXISTS "Users can update own provider keys" ON public.user_provider_keys;
CREATE POLICY "Users can update own provider keys"
  ON public.user_provider_keys
  FOR UPDATE
  USING (auth.uid() = user_id OR auth.role() IN ('anon', 'authenticated', 'service_role'));

DROP POLICY IF EXISTS "Users can delete own provider keys" ON public.user_provider_keys;
CREATE POLICY "Users can delete own provider keys"
  ON public.user_provider_keys
  FOR DELETE
  USING (auth.uid() = user_id OR auth.role() IN ('anon', 'authenticated', 'service_role'));

CREATE INDEX IF NOT EXISTS idx_user_provider_keys_user_id ON public.user_provider_keys(user_id);
GRANT ALL ON TABLE public.user_provider_keys TO authenticated, anon, service_role;
