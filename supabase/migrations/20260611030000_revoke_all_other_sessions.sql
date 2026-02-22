CREATE OR REPLACE FUNCTION public.revoke_all_other_sessions()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_sess_id uuid;
  deleted_rows int;
BEGIN
  -- Extract current session ID from JWT request claims
  current_sess_id := (COALESCE(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb ->> 'session_id')::uuid;
  
  DELETE FROM auth.sessions
  WHERE user_id = auth.uid() AND (id != current_sess_id OR current_sess_id IS NULL);
  
  GET DIAGNOSTICS deleted_rows = ROW_COUNT;
  RETURN deleted_rows;
END;
$$;
