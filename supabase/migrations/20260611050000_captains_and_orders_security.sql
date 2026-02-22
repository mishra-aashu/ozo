-- =========================================================================
-- OZO EXPRESS - CAPTAINS AND ORDERS SECURITY & WORKFLOW AUDIT
-- =========================================================================

-- 1. Helper function to check if the current user is a mart operator
CREATE OR REPLACE FUNCTION public.is_mart_operator()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'mart_operator'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Helper function to check if the current user is a captain
CREATE OR REPLACE FUNCTION public.is_captain()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'captain'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Function to calculate rider earnings securely in the database
CREATE OR REPLACE FUNCTION public.calculate_rider_earnings(
  p_latitude numeric,
  p_longitude numeric,
  p_delivery_fee numeric
) RETURNS numeric AS $$
DECLARE
  v_rider_config json;
  v_geofence_config json;
  v_base_payout numeric;
  v_distance_bonus numeric;
  v_wh_lat numeric;
  v_wh_lng numeric;
  v_distance numeric;
  v_rad_lat1 numeric;
  v_rad_lat2 numeric;
  v_rad_lon_diff numeric;
  v_a numeric;
  v_c numeric;
  v_payout numeric;
BEGIN
  -- Load configurations from app_settings
  SELECT value INTO v_rider_config FROM public.app_settings WHERE key = 'rider_config';
  SELECT value INTO v_geofence_config FROM public.app_settings WHERE key = 'geofence_config';

  v_base_payout := COALESCE((v_rider_config->>'base_payout')::numeric, 10.0);
  v_distance_bonus := COALESCE((v_rider_config->>'distance_bonus_per_km')::numeric, 5.0);
  v_wh_lat := COALESCE((v_geofence_config->>'warehouse_lat')::numeric, 24.745736);
  v_wh_lng := COALESCE((v_geofence_config->>'warehouse_lng')::numeric, 84.390014);

  IF p_latitude IS NOT NULL AND p_longitude IS NOT NULL THEN
    -- Haversine distance formula
    v_rad_lat1 := v_wh_lat * pi() / 180.0;
    v_rad_lat2 := p_latitude * pi() / 180.0;
    v_rad_lon_diff := (p_longitude - v_wh_lng) * pi() / 180.0;
    
    v_a := sin((v_rad_lat2 - v_rad_lat1) / 2.0) ^ 2.0 +
           cos(v_rad_lat1) * cos(v_rad_lat2) * sin(v_rad_lon_diff / 2.0) ^ 2.0;
    v_c := 2.0 * atan2(sqrt(v_a), sqrt(1.0 - v_a));
    v_distance := 6371.0 * v_c;
    
    v_payout := v_base_payout + (v_distance * v_distance_bonus);
  ELSE
    v_payout := COALESCE(p_delivery_fee, 0.0) + 15.0;
  END IF;

  RETURN round(v_payout, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Update the order status change trigger to allocate rider payouts on delivery
CREATE OR REPLACE FUNCTION public.handle_order_status_change()
RETURNS TRIGGER AS $$
DECLARE
    v_item RECORD;
    v_earnings_inc numeric;
    v_cash_inc numeric := 0;
BEGIN
    -- Restore stock if cancelled
    IF NEW.status = 'cancelled' AND (OLD.status IS DISTINCT FROM 'cancelled') THEN
        FOR v_item IN SELECT * FROM public.order_items WHERE order_id = NEW.id
        LOOP
            IF EXISTS (
                SELECT 1 FROM public.products 
                WHERE id = v_item.product_id AND quantity_available IS NOT NULL
            ) THEN
                UPDATE public.products
                SET quantity_available = quantity_available + v_item.quantity,
                    is_available = true
                WHERE id = v_item.product_id;
            ELSE
                UPDATE public.products
                SET is_available = true
                WHERE id = v_item.product_id;
            END IF;

            INSERT INTO public.inventory_logs (
                product_id,
                quantity_change,
                reason,
                reference_id
            ) VALUES (
                v_item.product_id,
                v_item.quantity,
                'Order Cancelled',
                NEW.id
            );
        END LOOP;
    END IF;

    -- Secure payout allocation when order is marked delivered
    IF NEW.status = 'delivered' AND (OLD.status IS DISTINCT FROM 'delivered') AND NEW.rider_id IS NOT NULL THEN
        -- Calculate payout server-side using locked settings
        v_earnings_inc := public.calculate_rider_earnings(NEW.latitude, NEW.longitude, NEW.delivery_fee);
        
        IF NEW.payment_method = 'cod' THEN
            v_cash_inc := NEW.total;
        END IF;

        -- Update captain database profile securely
        UPDATE public.captains
        SET earnings = earnings + v_earnings_inc,
            cash_in_hand = cash_in_hand + v_cash_inc,
            status = 'online'
        WHERE id = NEW.rider_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create trigger to secure captain profile properties (status, earnings, cash_in_hand, rating)
CREATE OR REPLACE FUNCTION public.check_captain_profile_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Restrict non-admins from modifying financial or credential variables
  IF NOT public.is_admin() THEN
    IF NEW.earnings IS DISTINCT FROM OLD.earnings THEN
      RAISE EXCEPTION 'Captains cannot modify their own earnings';
    END IF;
    
    IF NEW.cash_in_hand IS DISTINCT FROM OLD.cash_in_hand THEN
      RAISE EXCEPTION 'Captains cannot modify their own cash in hand';
    END IF;

    IF NEW.rating IS DISTINCT FROM OLD.rating THEN
      RAISE EXCEPTION 'Captains cannot modify their own rating';
    END IF;

    -- Enforce onboarding / approval workflow status changes
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF OLD.status IN ('pending_verification', 'rejected') AND NEW.status NOT IN ('pending_verification', 'rejected') THEN
        RAISE EXCEPTION 'Only administrators can verify and approve captain accounts';
      END IF;
      
      IF NEW.status = 'approved' THEN
        RAISE EXCEPTION 'Only administrators can approve captain accounts';
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS enforce_captain_profile_update ON public.captains;

-- Attach trigger
CREATE TRIGGER enforce_captain_profile_update
  BEFORE UPDATE ON public.captains
  FOR EACH ROW
  EXECUTE FUNCTION public.check_captain_profile_update();

-- 6. Setup RLS Policies for orders
DROP POLICY IF EXISTS "Mart operators can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Captains can view assigned and pickup orders" ON public.orders;
DROP POLICY IF EXISTS "Mart operators can update orders" ON public.orders;
DROP POLICY IF EXISTS "Captains can update assigned and pickup orders" ON public.orders;

CREATE POLICY "Mart operators can view all orders" ON public.orders
  FOR SELECT TO authenticated
  USING (public.is_mart_operator());

CREATE POLICY "Captains can view assigned and pickup orders" ON public.orders
  FOR SELECT TO authenticated
  USING (public.is_captain() AND (status = 'packed' OR rider_id = auth.uid()));

CREATE POLICY "Mart operators can update orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (public.is_mart_operator())
  WITH CHECK (public.is_mart_operator());

CREATE POLICY "Captains can update assigned and pickup orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (public.is_captain() AND ((status = 'packed' AND rider_id IS NULL) OR rider_id = auth.uid()))
  WITH CHECK (public.is_captain() AND rider_id = auth.uid());

-- 7. Setup RLS Policies for order_items
DROP POLICY IF EXISTS "Mart operators can view order items" ON public.order_items;
DROP POLICY IF EXISTS "Captains can view order items" ON public.order_items;

CREATE POLICY "Mart operators can view order items" ON public.order_items
  FOR SELECT TO authenticated
  USING (public.is_mart_operator());

CREATE POLICY "Captains can view order items" ON public.order_items
  FOR SELECT TO authenticated
  USING (public.is_captain() AND EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_items.order_id 
      AND (orders.status = 'packed' OR orders.rider_id = auth.uid())
  ));

-- 8. Setup RLS Policies for products
DROP POLICY IF EXISTS "Mart operators can update products" ON public.products;

CREATE POLICY "Mart operators can update products" ON public.products
  FOR UPDATE TO authenticated
  USING (public.is_mart_operator())
  WITH CHECK (public.is_mart_operator());
