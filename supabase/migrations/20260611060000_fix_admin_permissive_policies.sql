-- =========================================================================
-- OZO EXPRESS - FIX PERMISSIVE RLS POLICIES & SECURITY LINTS
-- =========================================================================

-- 1. Fix operating_cities policy (was permissive USING(true))
DROP POLICY IF EXISTS "Only admins can insert/update cities" ON public.operating_cities;
CREATE POLICY "Only admins can modify cities" ON public.operating_cities
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 2. Fix product_city_availability policy
DROP POLICY IF EXISTS "Allow admin modify on PCA" ON public.product_city_availability;
CREATE POLICY "Only admins can modify PCA" ON public.product_city_availability
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 3. Fix mart_inventory policy (allow admins and mart operators)
DROP POLICY IF EXISTS "Allow admin modify on mart inventory" ON public.mart_inventory;
CREATE POLICY "Admins can manage mart inventory" ON public.mart_inventory
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Mart operators can manage mart inventory" ON public.mart_inventory
  FOR ALL TO authenticated
  USING (public.is_mart_operator())
  WITH CHECK (public.is_mart_operator());

-- 4. Fix inventory_movements policy (allow admins and mart operators)
DROP POLICY IF EXISTS "Allow admin modify on inventory movements" ON public.inventory_movements;
CREATE POLICY "Admins can manage inventory movements" ON public.inventory_movements
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Mart operators can manage inventory movements" ON public.inventory_movements
  FOR ALL TO authenticated
  USING (public.is_mart_operator())
  WITH CHECK (public.is_mart_operator());

-- 5. Fix brand_city_availability policy
DROP POLICY IF EXISTS "Allow admin modify on brand_city_availability" ON public.brand_city_availability;
CREATE POLICY "Only admins can modify brand city availability" ON public.brand_city_availability
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 6. Add SELECT policy for inventory_logs so admins can audit stock changes
DROP POLICY IF EXISTS "Admins can view inventory logs" ON public.inventory_logs;
CREATE POLICY "Admins can view inventory logs" ON public.inventory_logs
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- 7. Recreate distinct_brands view with security_invoker enabled to respect RLS
DROP VIEW IF EXISTS public.distinct_brands;
CREATE VIEW public.distinct_brands WITH (security_invoker = true) AS
  SELECT DISTINCT brand
  FROM public.products
  WHERE brand IS NOT NULL AND brand <> ''
  ORDER BY brand;
