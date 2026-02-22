-- Migration: Referral System setup
-- Date: 2026-06-21

-- 1. Add referral columns to public.users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(15) UNIQUE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referred_by_id UUID REFERENCES public.users(id);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS free_delivery_orders_left INT DEFAULT 0 CHECK (free_delivery_orders_left >= 0);

-- Create index on referral_code for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON public.users(referral_code);

-- 2. Create referrals table to log relationships and status
CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    referred_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    referral_code_used VARCHAR(15) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
    created_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    CONSTRAINT chk_different_users CHECK (referrer_id != referred_id)
);

-- Enable RLS on referrals table
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Drop policy if exists and recreate
DROP POLICY IF EXISTS "Users can view their own referrals" ON public.referrals;
CREATE POLICY "Users can view their own referrals" ON public.referrals
    FOR SELECT
    TO authenticated
    USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- 3. Auto-Generate Unique Referral Code on Signup
CREATE OR REPLACE FUNCTION public.generate_unique_referral_code()
RETURNS TRIGGER AS $$
DECLARE
  v_code VARCHAR(15);
  v_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate code: OZO + 5 random alphanumeric characters
    v_code := 'OZO' || upper(substring(md5(random()::text) from 1 for 5));
    SELECT EXISTS(SELECT 1 FROM public.users WHERE referral_code = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  NEW.referral_code := v_code;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind generator trigger
DROP TRIGGER IF EXISTS tr_generate_user_referral_code ON public.users;
CREATE TRIGGER tr_generate_user_referral_code
  BEFORE INSERT ON public.users
  FOR EACH ROW
  WHEN (NEW.referral_code IS NULL)
  EXECUTE FUNCTION public.generate_unique_referral_code();

-- Generate referral codes for existing users that don't have one
DO $$
DECLARE
  r RECORD;
  v_code VARCHAR(15);
  v_exists BOOLEAN;
BEGIN
  FOR r IN SELECT id FROM public.users WHERE referral_code IS NULL
  LOOP
    LOOP
      v_code := 'OZO' || upper(substring(md5(random()::text) from 1 for 5));
      SELECT EXISTS(SELECT 1 FROM public.users WHERE referral_code = v_code) INTO v_exists;
      EXIT WHEN NOT v_exists;
    END LOOP;
    UPDATE public.users SET referral_code = v_code WHERE id = r.id;
  END LOOP;
END;
$$;

-- 4. Apply Referral Code RPC (Invitee Step)
CREATE OR REPLACE FUNCTION public.apply_referral_code(p_referral_code VARCHAR)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_referrer_id UUID;
  v_has_orders BOOLEAN;
  v_already_referred BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- 1. Check if user already applied a code
  SELECT EXISTS(SELECT 1 FROM public.users WHERE id = v_user_id AND referred_by_id IS NOT NULL) INTO v_already_referred;
  IF v_already_referred THEN
    RAISE EXCEPTION 'You have already applied a referral code.';
  END IF;

  -- 2. Check if user is new (has 0 orders)
  SELECT EXISTS(SELECT 1 FROM public.orders WHERE user_id = v_user_id AND status != 'cancelled' AND status != 'CANCELLED_BY_USER') INTO v_has_orders;
  IF v_has_orders THEN
    RAISE EXCEPTION 'Referral codes can only be applied before placing your first order.';
  END IF;

  -- 3. Lookup referral code
  SELECT id INTO v_referrer_id FROM public.users WHERE upper(referral_code) = upper(p_referral_code);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid referral code.';
  END IF;

  -- 4. Prevent self-referral
  IF v_referrer_id = v_user_id THEN
    RAISE EXCEPTION 'You cannot refer yourself.';
  END IF;

  -- 5. Link the referral
  UPDATE public.users 
  SET referred_by_id = v_referrer_id, 
      free_delivery_orders_left = 3 
  WHERE id = v_user_id;

  INSERT INTO public.referrals (referrer_id, referred_id, referral_code_used, status)
  VALUES (v_referrer_id, v_user_id, upper(p_referral_code), 'pending');

  RETURN jsonb_build_object('success', true, 'message', 'Referral code applied! You received 3 Free Deliveries.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.apply_referral_code TO authenticated;

-- 5. Update handle_order_status_change trigger function to reward referrer
CREATE OR REPLACE FUNCTION public.handle_order_status_change()
RETURNS TRIGGER AS $$
DECLARE
    v_item RECORD;
    v_earnings_inc numeric;
    v_cash_inc numeric := 0;
    v_order_count INT;
    v_referrer_id UUID;
BEGIN
    -- Restore stock if cancelled or cancelled by user
    IF (NEW.status IN ('cancelled', 'CANCELLED_BY_USER')) AND (OLD.status NOT IN ('cancelled', 'CANCELLED_BY_USER')) THEN
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

    -- Secure payout allocation when order is marked delivered or delivered_verifying (inspection stage)
    IF (NEW.status IN ('delivered', 'DELIVERED_VERIFYING')) AND (OLD.status NOT IN ('delivered', 'DELIVERED_VERIFYING')) AND NEW.rider_id IS NOT NULL THEN
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

    -- Reward referrer when referred user completes their first order
    IF (NEW.status IN ('delivered', 'COMPLETED')) AND (OLD.status NOT IN ('delivered', 'COMPLETED')) THEN
        -- Check if this was the customer's first completed order
        SELECT COUNT(*) INTO v_order_count 
        FROM public.orders 
        WHERE user_id = NEW.user_id 
          AND status IN ('delivered', 'COMPLETED') 
          AND id != NEW.id;
          
        IF v_order_count = 0 THEN
            -- It is their first completed order! Find the referrer
            SELECT referrer_id INTO v_referrer_id 
            FROM public.referrals 
            WHERE referred_id = NEW.user_id AND status = 'pending';
            
            IF FOUND THEN
                -- Mark referral as completed
                UPDATE public.referrals 
                SET status = 'completed', completed_at = now() 
                WHERE referred_id = NEW.user_id AND status = 'pending';
                
                -- Give referrer 3 free deliveries
                UPDATE public.users 
                SET free_delivery_orders_left = free_delivery_orders_left + 3 
                WHERE id = v_referrer_id;
                
                -- Notify the referrer
                INSERT INTO public.notifications (user_id, title, message, type, data)
                VALUES (
                  v_referrer_id,
                  '🎁 Referral Reward Unlocked!',
                  'Your friend completed their first order! You have earned 3 Free Delivery orders.',
                  'referral_reward',
                  jsonb_build_object('referred_friend_id', NEW.user_id)
                );
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Modify public.create_order_secure to support and decrement referral free delivery credits
CREATE OR REPLACE FUNCTION public.create_order_secure(
    p_address_id UUID,
    p_subtotal NUMERIC,
    p_delivery_fee NUMERIC,
    p_discount NUMERIC,
    p_total NUMERIC,
    p_coupon_code TEXT,
    p_payment_method TEXT,
    p_payment_status TEXT,
    p_delivery_instructions TEXT,
    p_estimated_delivery TIMESTAMPTZ,
    p_transaction_id TEXT,
    p_latitude NUMERIC,
    p_longitude NUMERIC,
    p_items JSONB,
    p_order_for VARCHAR DEFAULT 'myself',
    p_recipient_name VARCHAR DEFAULT NULL,
    p_recipient_phone VARCHAR DEFAULT NULL,
    p_house_no VARCHAR DEFAULT NULL,
    p_street_gali VARCHAR DEFAULT NULL,
    p_landmark VARCHAR DEFAULT NULL,
    p_delivery_city VARCHAR DEFAULT 'Aurangabad',
    p_google_maps_url TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_order_id UUID;
    v_order_number TEXT;
    v_item JSONB;
    v_product_id UUID;
    v_qty INT;
    v_price NUMERIC;
    v_avail_qty INT;
    v_product_name TEXT;
    v_product_image TEXT;
    v_is_available BOOLEAN;
    v_max_qty INT;
    v_min_qty INT;
    v_mart_id UUID;
    v_result JSONB;
    
    -- Calculation/Verification variables
    v_calculated_subtotal NUMERIC := 0.00;
    v_calculated_discount NUMERIC := 0.00;
    v_calculated_total NUMERIC := 0.00;
    v_discount_type TEXT;
    v_discount_value NUMERIC;
    v_min_order_value NUMERIC;
    v_max_discount NUMERIC;

    -- Delivery Config variables
    v_delivery_config JSONB;
    v_free_above NUMERIC := 199.00;
    v_base_fee NUMERIC := 40.00;
BEGIN
    -- 1. Get current authenticated user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: User session not found';
    END IF;

    -- 2. Validate input items
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Invalid order: Cart is empty';
    END IF;

    -- 3. Loop through items to perform atomic stock check (FOR UPDATE lock) and calculate server-side subtotal
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_qty := (v_item->>'quantity')::INT;

        IF v_qty <= 0 THEN
            RAISE EXCEPTION 'Invalid quantity % for product ID %', v_qty, v_product_id;
        END IF;

        -- Lock product row to prevent race conditions and read price
        SELECT quantity_available, is_available, name, max_order_qty, min_order_qty, price
        INTO v_avail_qty, v_is_available, v_product_name, v_max_qty, v_min_qty, v_price
        FROM public.products
        WHERE id = v_product_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Product not found in database.';
        END IF;

        IF NOT v_is_available THEN
            RAISE EXCEPTION 'Product "%" is currently unavailable.', v_product_name;
        END IF;

        IF v_avail_qty IS NOT NULL AND v_avail_qty < v_qty THEN
            RAISE EXCEPTION 'Only % units of "%" are available.', v_avail_qty, v_product_name;
        END IF;

        IF v_max_qty IS NOT NULL AND v_qty > v_max_qty THEN
            RAISE EXCEPTION 'Maximum allowed order quantity for "%" is %.', v_product_name, v_max_qty;
        END IF;

        IF v_min_qty IS NOT NULL AND v_qty < v_min_qty THEN
            RAISE EXCEPTION 'Minimum allowed order quantity for "%" is %.', v_product_name, v_min_qty;
        END IF;

        -- Accumulate subtotal using database-locked price
        v_calculated_subtotal := v_calculated_subtotal + (v_price * v_qty);
    END LOOP;

    -- 4. Calculate coupon discount server-side if coupon code is provided
    IF p_coupon_code IS NOT NULL AND p_coupon_code != '' THEN
        SELECT discount_type, discount_value, min_order_value, max_discount
        INTO v_discount_type, v_discount_value, v_min_order_value, v_max_discount
        FROM public.offers
        WHERE upper(coupon_code) = upper(p_coupon_code) 
          AND is_active = true 
          AND (start_date IS NULL OR start_date <= now()) 
          AND (end_date IS NULL OR end_date >= now());
          
        IF FOUND THEN
            IF v_calculated_subtotal >= v_min_order_value THEN
                IF v_discount_type = 'percentage' THEN
                    v_calculated_discount := (v_calculated_subtotal * v_discount_value / 100.0);
                    IF v_max_discount IS NOT NULL AND v_calculated_discount > v_max_discount THEN
                        v_calculated_discount := v_max_discount;
                    END IF;
                ELSE -- 'flat'
                    v_calculated_discount := v_discount_value;
                END IF;
                -- Cap discount at subtotal
                IF v_calculated_discount > v_calculated_subtotal THEN
                    v_calculated_discount := v_calculated_subtotal;
                END IF;
            ELSE
                RAISE EXCEPTION 'Coupon code "%" requires a minimum order value of Rs. %', p_coupon_code, v_min_order_value;
            END IF;
        ELSE
            RAISE EXCEPTION 'Coupon code "%" is invalid or expired', p_coupon_code;
        END IF;
    END IF;

    -- 4.5 Check Referral Free Delivery Credits and adjust/validate delivery fee
    SELECT value INTO v_delivery_config FROM public.app_settings WHERE key = 'delivery_config';
    IF FOUND THEN
        v_free_above := COALESCE((v_delivery_config->>'free_above')::NUMERIC, 199.00);
        v_base_fee := COALESCE((v_delivery_config->>'base_fee')::NUMERIC, 40.00);
    END IF;

    -- If delivery fee is 0 but order subtotal is below the free delivery threshold
    IF p_delivery_fee = 0 AND v_calculated_subtotal < v_free_above THEN
        -- User is claiming referral free delivery. Enforce safety checks.
        IF v_calculated_subtotal < 99.00 THEN
            RAISE EXCEPTION 'Minimum order value of Rs. 99 is required to claim Free Delivery credits.';
        END IF;

        -- Check if user has free delivery credits left
        IF EXISTS (SELECT 1 FROM public.users WHERE id = v_user_id AND free_delivery_orders_left > 0) THEN
            -- Decrement credit
            UPDATE public.users 
            SET free_delivery_orders_left = free_delivery_orders_left - 1 
            WHERE id = v_user_id;
        ELSE
            RAISE EXCEPTION 'Unauthorized: You do not have any Free Delivery credits left.';
        END IF;
    END IF;

    -- 5. Calculate and verify total
    v_calculated_discount := round(v_calculated_discount, 2);
    v_calculated_subtotal := round(v_calculated_subtotal, 2);
    v_calculated_total := round(v_calculated_subtotal + p_delivery_fee - v_calculated_discount, 2);

    IF round(p_subtotal, 2) != v_calculated_subtotal THEN
        RAISE EXCEPTION 'Invalid order subtotal: expected %, got %', v_calculated_subtotal, p_subtotal;
    END IF;
    IF round(p_discount, 2) != v_calculated_discount THEN
        RAISE EXCEPTION 'Invalid order discount: expected %, got %', v_calculated_discount, p_discount;
    END IF;
    IF round(p_total, 2) != v_calculated_total THEN
        RAISE EXCEPTION 'Invalid order total: expected %, got %', v_calculated_total, p_total;
    END IF;

    -- 6. Get mart_id from the first product in the list if available
    SELECT mart_id INTO v_mart_id
    FROM public.products
    WHERE id = ((p_items->0)->>'product_id')::UUID;

    -- 7. Generate unique order number (OZO-######)
    v_order_number := 'OZO-' || floor(random() * 900000 + 100000)::TEXT;
    WHILE EXISTS (SELECT 1 FROM public.orders WHERE order_number = v_order_number) LOOP
        v_order_number := 'OZO-' || floor(random() * 900000 + 100000)::TEXT;
    END LOOP;

    -- 8. Insert Order Header record
    INSERT INTO public.orders (
        order_number,
        user_id,
        address_id,
        subtotal,
        delivery_fee,
        discount,
        total,
        coupon_code,
        status,
        payment_method,
        payment_status,
        delivery_instructions,
        estimated_delivery,
        transaction_id,
        latitude,
        longitude,
        mart_id,
        order_for,
        recipient_name,
        recipient_phone,
        house_no,
        street_gali,
        landmark,
        delivery_city,
        google_maps_url
    ) VALUES (
        v_order_number,
        v_user_id,
        p_address_id,
        v_calculated_subtotal,
        p_delivery_fee,
        v_calculated_discount,
        p_coupon_code,
        'PLACED_COOLING',
        p_payment_method,
        p_payment_status,
        p_delivery_instructions,
        p_estimated_delivery,
        p_transaction_id,
        p_latitude,
        p_longitude,
        v_mart_id,
        p_order_for,
        p_recipient_name,
        p_recipient_phone,
        p_house_no,
        p_street_gali,
        p_landmark,
        p_delivery_city,
        p_google_maps_url
    )
    RETURNING id INTO v_order_id;

    -- 9. Insert Order Items and decrement stock
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_qty := (v_item->>'quantity')::INT;

        SELECT name, image_url, price INTO v_product_name, v_product_image, v_price
        FROM public.products
        WHERE id = v_product_id;

        -- Insert order item
        INSERT INTO public.order_items (
            order_id,
            product_id,
            product_name,
            product_image,
            quantity,
            unit_price,
            total_price
        ) VALUES (
            v_order_id,
            v_product_id,
            v_product_name,
            v_product_image,
            v_qty,
            v_price,
            v_price * v_qty
        );

        -- Decrement stock and toggle availability if out of stock
        UPDATE public.products
        SET quantity_available = CASE 
                WHEN quantity_available IS NOT NULL THEN quantity_available - v_qty 
                ELSE quantity_available 
            END,
            is_available = CASE 
                WHEN quantity_available IS NOT NULL AND (quantity_available - v_qty) <= 0 THEN false 
                ELSE is_available 
            END
        WHERE id = v_product_id;

        -- Log inventory transaction
        INSERT INTO public.inventory_logs (
            product_id,
            quantity_change,
            reason,
            reference_id
        ) VALUES (
            v_product_id,
            -v_qty,
            'Order Placement',
            v_order_id
        );
    END LOOP;

    v_result := jsonb_build_object(
        'id', v_order_id,
        'order_number', v_order_number
    );
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
