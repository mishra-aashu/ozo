-- Update verify_admin_login to support both super_admin and city_manager roles checking user_roles table
CREATE OR REPLACE FUNCTION public.verify_admin_login(p_password text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_hash text;
  v_role_exists boolean;
  v_token text;
BEGIN
  -- Check if the user is authenticated and has super_admin or city_manager role in user_roles
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('super_admin', 'city_manager')
  ) INTO v_role_exists;

  IF NOT v_role_exists THEN
    RAISE EXCEPTION 'Access Denied: You do not have an admin or city manager role.';
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
