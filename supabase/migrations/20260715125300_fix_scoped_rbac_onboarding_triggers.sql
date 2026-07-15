-- Fix Scoped RBAC Onboarding and Scoping Policies & Triggers

-- 1. Correct the RLS Policy for user_roles to allow City Managers to manage riders with NULL city_id
DROP POLICY IF EXISTS "City managers can manage roles in their city" ON public.user_roles;
CREATE POLICY "City managers can manage roles in their city" ON public.user_roles
    FOR ALL
    USING (
        (role = 'rider'::public.app_role AND (city_id IS NULL OR is_city_manager_for_city(city_id))) OR
        (role = 'mart_owner'::public.app_role AND is_city_manager_for_mart(mart_id))
    )
    WITH CHECK (
        (role = 'rider'::public.app_role AND is_city_manager_for_city(city_id)) OR
        (role = 'mart_owner'::public.app_role AND is_city_manager_for_mart(mart_id))
    );

-- 2. Correct the RLS Policies for captains to allow City Managers to view and update riders with NULL city_id
DROP POLICY IF EXISTS "City managers can view city captains" ON public.captains;
CREATE POLICY "City managers can view city captains" ON public.captains
    FOR SELECT
    USING (
        is_city_manager() AND EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = public.captains.id
            AND ur.role = 'rider'::public.app_role
            AND (ur.city_id IS NULL OR is_city_manager_for_city(ur.city_id))
        )
    );

DROP POLICY IF EXISTS "City managers can update city captains" ON public.captains;
CREATE POLICY "City managers can update city captains" ON public.captains
    FOR UPDATE
    USING (
        is_city_manager() AND EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = public.captains.id
            AND ur.role = 'rider'::public.app_role
            AND (ur.city_id IS NULL OR is_city_manager_for_city(ur.city_id))
        )
    )
    WITH CHECK (
        is_city_manager() AND EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = public.captains.id
            AND ur.role = 'rider'::public.app_role
            AND (ur.city_id IS NULL OR is_city_manager_for_city(ur.city_id))
        )
    );

-- 3. Create role sync function and trigger from users to user_roles
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

CREATE OR REPLACE TRIGGER tr_sync_user_role
AFTER INSERT OR UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.sync_user_role_to_user_roles();

-- 4. Re-seed any users who might not have roles in user_roles yet
INSERT INTO public.user_roles (user_id, role, city_id, mart_id)
SELECT id, 
       CASE 
         WHEN role = 'admin' THEN 'super_admin'::public.app_role
         WHEN role = 'mart_operator' THEN 'mart_owner'::public.app_role
         WHEN role = 'captain' THEN 'rider'::public.app_role
         ELSE 'customer'::public.app_role
       END,
       NULL,
       NULL
FROM public.users u
WHERE NOT EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.user_id = u.id
)
ON CONFLICT DO NOTHING;
