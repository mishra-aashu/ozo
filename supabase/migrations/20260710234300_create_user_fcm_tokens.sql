-- Migration: Create user_fcm_tokens table
-- Date: 2026-07-10 23:43:00

CREATE TABLE IF NOT EXISTS public.user_fcm_tokens (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  device_info TEXT, -- Optional: 'Chrome (Android)', 'Safari (iOS)'
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index user_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_fcm_tokens_user_id ON public.user_fcm_tokens(user_id);

-- Enable RLS
ALTER TABLE public.user_fcm_tokens ENABLE ROW LEVEL SECURITY;

-- Allow users to manage their own tokens
CREATE POLICY "Users can insert their own tokens"
  ON public.user_fcm_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can select their own tokens"
  ON public.user_fcm_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own tokens"
  ON public.user_fcm_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tokens"
  ON public.user_fcm_tokens FOR DELETE
  USING (auth.uid() = user_id);
