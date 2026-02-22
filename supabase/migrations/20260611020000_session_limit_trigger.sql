-- Insert default session limit configuration
INSERT INTO public.app_settings (key, value, description) 
VALUES (
  'security_config', 
  '{"max_sessions_per_user": 2}'::jsonb, 
  'Security and session limit configurations'
) 
ON CONFLICT (key) DO NOTHING;

-- Create trigger function in public schema to enforce session limits by evicting oldest sessions
CREATE OR REPLACE FUNCTION public.enforce_max_sessions()
RETURNS TRIGGER AS $$
DECLARE
  max_sessions int := 2;
  current_sessions int;
  allowed_sessions_json jsonb;
  excess_count int;
BEGIN
  -- Fetch max_sessions from public.app_settings if it exists
  SELECT value INTO allowed_sessions_json FROM public.app_settings WHERE key = 'security_config';
  IF allowed_sessions_json IS NOT NULL AND (allowed_sessions_json->>'max_sessions_per_user') IS NOT NULL THEN
    max_sessions := (allowed_sessions_json->>'max_sessions_per_user')::int;
  END IF;

  -- Count existing active sessions for this user
  SELECT COUNT(*) INTO current_sessions FROM auth.sessions WHERE user_id = NEW.user_id;

  -- Evict the oldest sessions if we exceed the limit
  IF current_sessions >= max_sessions THEN
    excess_count := current_sessions - max_sessions + 1;
    DELETE FROM auth.sessions
    WHERE id IN (
      SELECT id FROM auth.sessions
      WHERE user_id = NEW.user_id
      ORDER BY created_at ASC
      LIMIT excess_count
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- Attach trigger to auth.sessions
DROP TRIGGER IF EXISTS enforce_max_sessions_trigger ON auth.sessions;
CREATE TRIGGER enforce_max_sessions_trigger
  BEFORE INSERT ON auth.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_max_sessions();
