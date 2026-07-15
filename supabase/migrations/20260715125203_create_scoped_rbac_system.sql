-- 1. Create enum public.app_role if it doesn't exist
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('super_admin', 'city_manager', 'mart_owner', 'rider', 'customer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create public.user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    city_id uuid,
    mart_id uuid,
    assigned_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT user_roles_pkey PRIMARY KEY (id),
    CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT user_roles_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id) ON DELETE SET NULL,
    CONSTRAINT user_roles_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.operating_cities(id) ON DELETE CASCADE,
    CONSTRAINT user_roles_mart_id_fkey FOREIGN KEY (mart_id) REFERENCES public.marts(id) ON DELETE CASCADE
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Functions for RBAC and scoping
CREATE OR REPLACE FUNCTION public.is_super_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN public.is_admin() AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_city_manager()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN public.is_admin() AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'city_manager'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_city_manager_for_city(p_city_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'city_manager' AND city_id = p_city_id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_city_manager_for_mart(p_mart_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.marts m ON m.id = p_mart_id
    WHERE ur.user_id = auth.uid() AND ur.role = 'city_manager' AND ur.city_id = m.city_id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_captain()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'rider'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_mart_operator()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'mart_owner'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role_exists boolean;
  v_headers text;
  v_token text;
BEGIN
  -- First, check if user has super_admin or city_manager role in user_roles
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('super_admin', 'city_manager')
  ) INTO v_role_exists;
  
  IF NOT v_role_exists THEN
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
$function$;

CREATE OR REPLACE FUNCTION public.check_user_role_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- Allow direct database updates (migrations, background scripts, direct SQL where auth.uid() is null)
    -- and allow edits made by an admin. Reject only if a non-admin authenticated user attempts it.
    IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
      RAISE EXCEPTION 'Only admins can modify user roles';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Trigger for users role column checks
CREATE OR REPLACE TRIGGER enforce_user_role_update
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.check_user_role_update();

-- 4. Seed user_roles based on existing roles in public.users table
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
FROM public.users
ON CONFLICT DO NOTHING;

-- Map owners to their marts in user_roles
INSERT INTO public.user_roles (user_id, role, mart_id)
SELECT owner_id, 'mart_owner'::public.app_role, id
FROM public.marts
WHERE owner_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 5. Create RLS Policies for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles
    FOR SELECT USING (user_id = auth.uid() OR is_super_admin() OR is_city_manager());

CREATE POLICY "Super admins can manage roles" ON public.user_roles
    FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE POLICY "City managers can manage roles in their city" ON public.user_roles
    FOR ALL
    USING (
        (role = 'rider'::public.app_role AND is_city_manager_for_city(city_id)) OR
        (role = 'mart_owner'::public.app_role AND is_city_manager_for_mart(mart_id))
    )
    WITH CHECK (
        (role = 'rider'::public.app_role AND is_city_manager_for_city(city_id)) OR
        (role = 'mart_owner'::public.app_role AND is_city_manager_for_mart(mart_id))
    );

-- 6. Apply scoped RLS policies on marts, orders, products
-- marts policies
CREATE POLICY "Super admins can manage all marts" ON public.marts
    FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE POLICY "City managers can manage city marts" ON public.marts
    FOR ALL USING (is_city_manager_for_city(city_id)) WITH CHECK (is_city_manager_for_city(city_id));

-- orders policies
CREATE POLICY "Super admins can view all orders" ON public.orders
    FOR SELECT USING (is_super_admin());

CREATE POLICY "Super admins can update all orders" ON public.orders
    FOR UPDATE USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE POLICY "City managers can view city orders" ON public.orders
    FOR SELECT USING (is_city_manager() AND EXISTS (
        SELECT 1 FROM public.marts m
        WHERE m.id = orders.mart_id AND is_city_manager_for_city(m.city_id)
    ));

CREATE POLICY "City managers can update city orders" ON public.orders
    FOR UPDATE USING (is_city_manager() AND EXISTS (
        SELECT 1 FROM public.marts m
        WHERE m.id = orders.mart_id AND is_city_manager_for_city(m.city_id)
    )) WITH CHECK (is_city_manager() AND EXISTS (
        SELECT 1 FROM public.marts m
        WHERE m.id = orders.mart_id AND is_city_manager_for_city(m.city_id)
    ));

-- products policies
CREATE POLICY "Super admins can manage all products" ON public.products
    FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE POLICY "City managers can manage city products" ON public.products
    FOR ALL USING (is_city_manager() AND EXISTS (
        SELECT 1 FROM public.marts m
        WHERE m.id = products.mart_id AND is_city_manager_for_city(m.city_id)
    )) WITH CHECK (is_city_manager() AND EXISTS (
        SELECT 1 FROM public.marts m
        WHERE m.id = products.mart_id AND is_city_manager_for_city(m.city_id)
    ));
