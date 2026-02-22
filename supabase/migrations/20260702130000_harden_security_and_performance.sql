-- =========================================================================
-- OZO MART - MIGRATION 20260702130000: SECURITY HARDENING & BATCH WRITES
-- =========================================================================

-- 1. Tighten verified_payments RLS SELECT policy
DROP POLICY IF EXISTS "Allow read access to all" ON public.verified_payments;
CREATE POLICY "Admins can view verified payments" ON public.verified_payments
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- 2. Tighten mart operator order SELECT policy
DROP POLICY IF EXISTS "Mart operators can view all orders" ON public.orders;
CREATE POLICY "Mart operators can view own orders" ON public.orders
  FOR SELECT TO authenticated
  USING (
    is_mart_operator() AND EXISTS (
      SELECT 1 FROM public.marts
      WHERE marts.id = orders.mart_id AND marts.owner_id = auth.uid()
    )
  );

-- 3. Tighten mart operator order UPDATE policy
DROP POLICY IF EXISTS "Mart operators can update orders" ON public.orders;
CREATE POLICY "Mart operators can update own orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (
    is_mart_operator() AND EXISTS (
      SELECT 1 FROM public.marts
      WHERE marts.id = orders.mart_id AND marts.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    is_mart_operator() AND EXISTS (
      SELECT 1 FROM public.marts
      WHERE marts.id = orders.mart_id AND marts.owner_id = auth.uid()
    )
  );

-- 4. Create batch product update helper to resolve Mandi-Sync N+1 write storm
CREATE OR REPLACE FUNCTION public.bulk_update_product_prices(p_updates jsonb)
RETURNS void AS $$
DECLARE
  v_update jsonb;
BEGIN
  FOR v_update IN SELECT * FROM jsonb_array_elements(p_updates)
  LOOP
    UPDATE public.products
    SET 
      price = (v_update->>'price')::numeric,
      mrp = (v_update->>'mrp')::numeric,
      base_price = (v_update->>'base_price')::numeric,
      base_mrp = (v_update->>'base_mrp')::numeric,
      last_price_updated = (v_update->>'last_price_updated')::timestamp with time zone
    WHERE id = (v_update->>'id')::uuid;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';
