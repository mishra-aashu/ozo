-- Create functions for listing and revoking active user login sessions
CREATE OR REPLACE FUNCTION public.get_active_sessions()
RETURNS TABLE (
  id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  user_agent text,
  ip text,
  is_current boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.created_at,
    s.updated_at,
    COALESCE(s.user_agent::text, 'Unknown Device'),
    COALESCE(s.ip::text, 'Unknown IP'),
    (s.id = (COALESCE(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb ->> 'session_id')::uuid) AS is_current
  FROM auth.sessions s
  WHERE s.user_id = auth.uid()
  ORDER BY s.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_session(session_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_rows int;
BEGIN
  DELETE FROM auth.sessions
  WHERE id = session_id AND user_id = auth.uid();
  GET DIAGNOSTICS deleted_rows = ROW_COUNT;
  RETURN deleted_rows > 0;
END;
$$;
