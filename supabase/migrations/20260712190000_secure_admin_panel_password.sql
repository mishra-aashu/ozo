-- SQL migration to set up secure admin panel password check
-- Migration: 20260712190000_secure_admin_panel_password.sql

-- 1. Create admin_secrets table to store the master hashed admin password
CREATE TABLE IF NOT EXISTS public.admin_secrets (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  password_hash text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- Seed with a default password 'OzoAdmin@2026'
-- Crypt function uses pgcrypto. Extensions schema holds pgcrypto in this project.
INSERT INTO public.admin_secrets (id, password_hash)
VALUES (1, extensions.crypt('OzoAdmin@2026', extensions.gen_salt('bf', 8)))
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security to block direct CRUD from public/users
ALTER TABLE public.admin_secrets ENABLE ROW LEVEL SECURITY;

-- 2. Create admin_sessions table to track active admin panel logins
CREATE TABLE IF NOT EXISTS public.admin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

-- Enable RLS on admin_sessions
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;

-- Drop policy if exists
DROP POLICY IF EXISTS "Users can delete own sessions" ON public.admin_sessions;

-- Allow users to delete their own sessions
CREATE POLICY "Users can delete own sessions" ON public.admin_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- 3. Create or replace the is_admin() function to require a valid session token
CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_role text;
  v_headers text;
  v_token text;
BEGIN
  -- First, get user role
  SELECT role INTO v_role 
  FROM public.users
  WHERE id = auth.uid();
  
  -- If not an admin, immediately return false
  IF v_role IS DISTINCT FROM 'admin' THEN
    RETURN FALSE;
  END IF;

  -- Get x-admin-token from request.headers safely
  BEGIN
    v_headers := current_setting('request.headers', true);
    IF v_headers IS NOT NULL AND v_headers <> '' THEN
      v_token := (v_headers::jsonb)->>'x-admin-token';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_token := NULL;
  END;

  IF v_token IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.admin_sessions
    WHERE user_id = auth.uid() 
      AND token = v_token 
      AND expires_at > now()
  );
END;
$$;

-- 4. Create the verify_admin_login RPC
CREATE OR REPLACE FUNCTION public.verify_admin_login(p_password text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_hash text;
  v_role text;
  v_token text;
BEGIN
  -- Check if the user is authenticated and has admin role in public.users
  SELECT role INTO v_role 
  FROM public.users
  WHERE id = auth.uid();

  IF v_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Access Denied: You do not have the admin role.';
  END IF;

  -- Fetch the current hashed admin password
  SELECT password_hash INTO v_hash 
  FROM public.admin_secrets 
  WHERE id = 1;

  -- Verify the password using crypt
  IF v_hash IS DISTINCT FROM extensions.crypt(p_password, v_hash) THEN
    RAISE EXCEPTION 'Invalid admin panel password.';
  END IF;

  -- Generate a secure random token
  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  -- Delete any existing sessions for this user (to keep it clean)
  DELETE FROM public.admin_sessions WHERE user_id = auth.uid();

  -- Insert new session (expires in 2 hours)
  INSERT INTO public.admin_sessions (user_id, token, expires_at)
  VALUES (auth.uid(), v_token, now() + interval '2 hours');

  RETURN v_token;
END;
$$;

-- 5. Create change_admin_password RPC
CREATE OR REPLACE FUNCTION public.change_admin_password(current_password text, new_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_hash text;
BEGIN
  -- Only authenticated admins can change the password
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Invalid admin session';
  END IF;

  SELECT password_hash INTO v_hash FROM public.admin_secrets WHERE id = 1;

  -- Verify current password
  IF v_hash IS DISTINCT FROM extensions.crypt(current_password, v_hash) THEN
    RAISE EXCEPTION 'Incorrect current password';
  END IF;

  -- Update with new password
  UPDATE public.admin_secrets
  SET password_hash = extensions.crypt(new_password, extensions.gen_salt('bf', 8)),
      updated_at = now()
  WHERE id = 1;

  RETURN TRUE;
END;
$$;
