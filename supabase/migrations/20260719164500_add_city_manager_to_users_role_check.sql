-- Update users.role check constraint and trigger to support 'city_manager' properly

-- 1. Drop existing users_role_check constraint on public.users
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

-- 2. Create updated constraint including 'city_manager'
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (
  (role)::text = ANY (ARRAY[
    'customer'::character varying, 
    'admin'::character varying, 
    'captain'::character varying, 
    'mart_operator'::character varying,
    'city_manager'::character varying
  ]::text[])
);

-- 3. Update sync_user_role_to_user_roles trigger function to map 'city_manager' to public.user_roles
CREATE OR REPLACE FUNCTION public.sync_user_role_to_user_roles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_new_role public.app_role;
  v_old_role public.app_role;
BEGIN
  -- Map users.role to public.app_role
  v_new_role := CASE 
    WHEN NEW.role = 'admin' THEN 'super_admin'::public.app_role
    WHEN NEW.role = 'mart_operator' THEN 'mart_owner'::public.app_role
    WHEN NEW.role = 'captain' THEN 'rider'::public.app_role
    WHEN NEW.role = 'city_manager' THEN 'city_manager'::public.app_role
    ELSE 'customer'::public.app_role
  END;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, v_new_role)
    ON CONFLICT DO NOTHING;
  ELSIF TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role THEN
    v_old_role := CASE 
      WHEN OLD.role = 'admin' THEN 'super_admin'::public.app_role
      WHEN OLD.role = 'mart_operator' THEN 'mart_owner'::public.app_role
      WHEN OLD.role = 'captain' THEN 'rider'::public.app_role
      WHEN OLD.role = 'city_manager' THEN 'city_manager'::public.app_role
      ELSE 'customer'::public.app_role
    END;

    -- Check if they have the old role in user_roles
    IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.id AND role = v_old_role) THEN
      UPDATE public.user_roles 
      SET role = v_new_role
      WHERE user_id = NEW.id AND role = v_old_role;
    ELSE
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, v_new_role)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
