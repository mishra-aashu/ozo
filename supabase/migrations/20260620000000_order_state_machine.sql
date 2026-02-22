-- Migration: Order State Machine setup & database triggers
-- Date: 2026-06-20

-- 1. Drop & Recreate the order status check constraint to include new statuses
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check CHECK (
  status = ANY (ARRAY[
    'pending'::text, 
    'placed'::text, 
    'confirmed'::text, 
    'preparing'::text, 
    'packed'::text, 
    'assigned'::text, 
    'picked_up'::text, 
    'dispatched'::text, 
    'delivered'::text, 
    'cancelled'::text, 
    'accepted'::text, 
    'preparing_order'::text, 
    'out_for_delivery'::text,
    'PLACED_COOLING'::text,
    'CONFIRMED_SYSTEM'::text,
    'DELIVERED_VERIFYING'::text,
    'COMPLETED'::text,
    'CANCELLED_BY_USER'::text,
    'RETURN_REQUESTED'::text
  ])
);

-- Set DEFAULT value of status column to 'PLACED_COOLING'
ALTER TABLE public.orders ALTER COLUMN status SET DEFAULT 'PLACED_COOLING';

-- 2. Update secure order placement function to insert status as 'PLACED_COOLING'
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

    -- 8. Insert Order Header record with the status defaulted to 'PLACED_COOLING'
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
        v_calculated_total,
        p_coupon_code,
        'PLACED_COOLING', -- Explicit default starting status for the cooling period
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

GRANT EXECUTE ON FUNCTION public.create_order_secure TO authenticated, anon;

-- 3. Security Trigger: Enforce order state changes (cancellation only in cooling period, etc.)
CREATE OR REPLACE FUNCTION public.check_order_state_transitions_security()
RETURNS TRIGGER AS $$
DECLARE
  v_user_role TEXT;
BEGIN
  -- A. Enforce order cancellation security
  IF (NEW.status IN ('cancelled', 'CANCELLED_BY_USER')) AND (OLD.status NOT IN ('cancelled', 'CANCELLED_BY_USER')) THEN
    IF auth.uid() IS NOT NULL THEN
      SELECT role INTO v_user_role FROM public.users WHERE id = auth.uid();
      -- Customers can only cancel orders in PLACED_COOLING or pending
      IF COALESCE(v_user_role, 'customer') = 'customer' THEN
        IF OLD.status IS DISTINCT FROM 'PLACED_COOLING' AND OLD.status IS DISTINCT FROM 'pending' THEN
          RAISE EXCEPTION 'Order cancellation is only allowed within the 5-minute cooling period (current status: %).', OLD.status;
        END IF;
      END IF;
    END IF;
  END IF;

  -- B. Block manual system-only transitions (PLACED_COOLING -> CONFIRMED_SYSTEM, DELIVERED_VERIFYING -> COMPLETED)
  IF (NEW.status IN ('CONFIRMED_SYSTEM', 'COMPLETED')) AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    IF auth.uid() IS NOT NULL THEN
      SELECT role INTO v_user_role FROM public.users WHERE id = auth.uid();
      IF COALESCE(v_user_role, 'customer') != 'admin' THEN
        RAISE EXCEPTION 'Transition to % is managed automatically by the system cron.', NEW.status;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_order_state_transitions_security ON public.orders;
CREATE TRIGGER enforce_order_state_transitions_security
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.check_order_state_transitions_security();

-- 4. Security Trigger: Validate return request insertions
CREATE OR REPLACE FUNCTION public.check_return_request_security()
RETURNS TRIGGER AS $$
DECLARE
  v_order_status TEXT;
  v_order_user_id UUID;
BEGIN
  -- Get the status and user_id of the corresponding order
  SELECT status, user_id INTO v_order_status, v_order_user_id 
  FROM public.orders 
  WHERE id = NEW.order_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- Verify order status is in DELIVERED_VERIFYING (or delivered for legacy compatibility)
  IF v_order_status IS DISTINCT FROM 'DELIVERED_VERIFYING' AND v_order_status IS DISTINCT FROM 'delivered' THEN
    RAISE EXCEPTION 'Return requests can only be raised for orders in DELIVERED_VERIFYING status (current status: %).', v_order_status;
  END IF;

  -- Verify owner or admin
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM v_order_user_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: You do not own this order';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_return_request_security ON public.return_requests;
CREATE TRIGGER enforce_return_request_security
  BEFORE INSERT ON public.return_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.check_return_request_security();

-- 5. Update the order status change trigger to allocate rider payouts on delivery and restore inventory on cancel
CREATE OR REPLACE FUNCTION public.handle_order_status_change()
RETURNS TRIGGER AS $$
DECLARE
    v_item RECORD;
    v_earnings_inc numeric;
    v_cash_inc numeric := 0;
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

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Update notification trigger lifecycle function to adapt notifications
CREATE OR REPLACE FUNCTION public.handle_order_notification_lifecycle()
RETURNS TRIGGER AS $$
DECLARE
  v_admin_id UUID;
  v_payout NUMERIC;
BEGIN
  -- A. ADMIN & CUSTOMER ALERT ON PLACE:
  IF TG_OP = 'INSERT' THEN
    IF NEW.status IN ('pending', 'placed') THEN
      FOR v_admin_id IN SELECT id FROM public.users WHERE role = 'admin' LOOP
        INSERT INTO public.notifications (user_id, title, message, type, data)
        VALUES (
          v_admin_id,
          '📦 New Order Received!',
          'Order #' || NEW.order_number || ' total ₹' || NEW.total || ' is waiting in the dispatch queue. Assign a rider immediately.',
          'admin_order_alert',
          jsonb_build_object('order_id', NEW.id, 'order_number', NEW.order_number)
        );
      END LOOP;
    ELSIF NEW.status = 'PLACED_COOLING' THEN
      INSERT INTO public.notifications (user_id, title, message, type, data)
      VALUES (
        NEW.user_id,
        'Order Placed (Cooling Period)',
        'Your order #' || NEW.order_number || ' has been placed. You have strictly 5 minutes to cancel it if needed.',
        'order_status',
        jsonb_build_object('order_id', NEW.id, 'order_number', NEW.order_number)
      );
    END IF;
  END IF;

  -- B. UPDATE EVENTS
  IF TG_OP = 'UPDATE' THEN
    -- Admin & Customer notifications when order transitions from PLACED_COOLING to CONFIRMED_SYSTEM
    IF NEW.status = 'CONFIRMED_SYSTEM' AND OLD.status IS DISTINCT FROM 'CONFIRMED_SYSTEM' THEN
      -- Alert admins
      FOR v_admin_id IN SELECT id FROM public.users WHERE role = 'admin' LOOP
        INSERT INTO public.notifications (user_id, title, message, type, data)
        VALUES (
          v_admin_id,
          '📦 New Order Confirmed!',
          'Order #' || NEW.order_number || ' total ₹' || NEW.total || ' has passed the cooling period and is ready for dispatch.',
          'admin_order_alert',
          jsonb_build_object('order_id', NEW.id, 'order_number', NEW.order_number)
        );
      END LOOP;
      
      -- Notify customer
      INSERT INTO public.notifications (user_id, title, message, type, data)
      VALUES (
        NEW.user_id,
        'Order Confirmed',
        'Your order #' || NEW.order_number || ' has been accepted by the store.',
        'order_status',
        jsonb_build_object('order_id', NEW.id, 'order_number', NEW.order_number)
      );
    END IF;

    -- Rider Assignment Notification
    IF NEW.rider_id IS NOT NULL AND (
      ((OLD.rider_id IS NULL OR OLD.rider_id IS DISTINCT FROM NEW.rider_id) AND NEW.status IN ('accepted', 'assigned'))
      OR
      (NEW.status IN ('accepted', 'assigned') AND OLD.status NOT IN ('accepted', 'assigned'))
    ) THEN
      v_payout := public.calculate_rider_earnings(NEW.latitude, NEW.longitude, NEW.delivery_fee);
      
      INSERT INTO public.notifications (user_id, title, message, type, data)
      VALUES (
        NEW.rider_id,
        '🚨 New Order Assigned!',
        'Order #' || NEW.order_number || ' with a payout of ₹' || v_payout || ' is waiting for you. Open your app and start packing now!',
        'rider_assignment',
        jsonb_build_object('order_id', NEW.id, 'order_number', NEW.order_number, 'payout', v_payout)
      );
    END IF;

    -- Customer Confirmation (Legacy confirmed status fallback)
    IF NEW.status = 'confirmed' AND OLD.status IS DISTINCT FROM 'confirmed' THEN
      INSERT INTO public.notifications (user_id, title, message, type, data)
      VALUES (
        NEW.user_id,
        'Order Confirmed',
        'Your order #' || NEW.order_number || ' has been accepted by the store.',
        'order_status',
        jsonb_build_object('order_id', NEW.id, 'order_number', NEW.order_number)
      );
    END IF;

    -- Customer Preparing / Chef Mode
    IF NEW.status IN ('preparing', 'preparing_order') AND OLD.status NOT IN ('preparing', 'preparing_order') THEN
      INSERT INTO public.notifications (user_id, title, message, type, data)
      VALUES (
        NEW.user_id,
        'Chef Mode On! 👨‍🍳',
        'OZO Mart is packing your fresh items with hygiene checks. We are on track!',
        'order_status',
        jsonb_build_object('order_id', NEW.id, 'order_number', NEW.order_number)
      );
    END IF;

    -- Customer Packed
    IF NEW.status = 'packed' AND OLD.status IS DISTINCT FROM 'packed' THEN
      INSERT INTO public.notifications (user_id, title, message, type, data)
      VALUES (
        NEW.user_id,
        'Order Packed',
        'Your order #' || NEW.order_number || ' is packed and ready for delivery.',
        'order_status',
        jsonb_build_object('order_id', NEW.id, 'order_number', NEW.order_number)
      );
    END IF;

    -- Customer Captain Info
    IF NEW.rider_id IS NOT NULL 
       AND (OLD.rider_id IS NULL OR OLD.rider_id IS DISTINCT FROM NEW.rider_id) 
       AND NEW.status IN ('accepted', 'assigned') THEN
      INSERT INTO public.notifications (user_id, title, message, type, data)
      VALUES (
        NEW.user_id,
        'Captain Assigned',
        'A delivery rider has been assigned for your order #' || NEW.order_number || '.',
        'order_status',
        jsonb_build_object('order_id', NEW.id, 'order_number', NEW.order_number)
      );
    END IF;

    -- Customer Out for Delivery
    IF NEW.status IN ('dispatched', 'out_for_delivery') AND OLD.status NOT IN ('dispatched', 'out_for_delivery') THEN
      INSERT INTO public.notifications (user_id, title, message, type, data)
      VALUES (
        NEW.user_id,
        'Rider is Rushing! 🛵',
        'Your OZO delivery partner is on their way with your order. Keep your phone ready.',
        'order_status',
        jsonb_build_object('order_id', NEW.id, 'order_number', NEW.order_number)
      );
    END IF;

    -- Customer Delivered / DELIVERED_VERIFYING
    IF (NEW.status IN ('delivered', 'DELIVERED_VERIFYING')) AND OLD.status NOT IN ('delivered', 'DELIVERED_VERIFYING') THEN
      INSERT INTO public.notifications (user_id, title, message, type, data)
      VALUES (
        NEW.user_id,
        'Delivered! 🎉',
        'Your order has been safely delivered. Note: You have strictly 5 minutes to report any issues with live photos!',
        'order_status',
        jsonb_build_object('order_id', NEW.id, 'order_number', NEW.order_number)
      );
    END IF;

    -- Customer Completed
    IF NEW.status = 'COMPLETED' AND OLD.status IS DISTINCT FROM 'COMPLETED' THEN
      INSERT INTO public.notifications (user_id, title, message, type, data)
      VALUES (
        NEW.user_id,
        'Order Completed',
        'Thank you for shopping with OZO! Your order #' || NEW.order_number || ' is now completed.',
        'order_status',
        jsonb_build_object('order_id', NEW.id, 'order_number', NEW.order_number)
      );
    END IF;

    -- Customer Cancelled
    IF (NEW.status IN ('cancelled', 'CANCELLED_BY_USER')) AND OLD.status NOT IN ('cancelled', 'CANCELLED_BY_USER') THEN
      INSERT INTO public.notifications (user_id, title, message, type, data)
      VALUES (
        NEW.user_id,
        'Order Cancelled',
        'Your order #' || NEW.order_number || ' was cancelled.',
        'order_status',
        jsonb_build_object('order_id', NEW.id, 'order_number', NEW.order_number)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-bind the notification trigger
DROP TRIGGER IF EXISTS on_order_notification_lifecycle ON public.orders;
CREATE TRIGGER on_order_notification_lifecycle
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_order_notification_lifecycle();

-- 7. Create transition function process_order_state_transitions for the cron job
CREATE OR REPLACE FUNCTION public.process_order_state_transitions()
RETURNS JSONB AS $$
DECLARE
  v_cooling_confirmed INT := 0;
  v_verifying_completed INT := 0;
  v_result JSONB;
BEGIN
  -- Transition orders from PLACED_COOLING to CONFIRMED_SYSTEM after 5 minutes
  WITH updated_cooling AS (
    UPDATE public.orders
    SET status = 'CONFIRMED_SYSTEM', updated_at = NOW()
    WHERE status = 'PLACED_COOLING'
      AND created_at <= NOW() - INTERVAL '5 minutes'
    RETURNING id
  )
  SELECT COUNT(*) INTO v_cooling_confirmed FROM updated_cooling;

  -- Transition orders from DELIVERED_VERIFYING to COMPLETED after 5 minutes
  WITH updated_verifying AS (
    UPDATE public.orders
    SET status = 'COMPLETED', updated_at = NOW()
    WHERE status = 'DELIVERED_VERIFYING'
      AND delivered_at <= NOW() - INTERVAL '5 minutes'
    RETURNING id
  )
  SELECT COUNT(*) INTO v_verifying_completed FROM updated_verifying;

  v_result := jsonb_build_object(
    'cooling_confirmed', v_cooling_confirmed,
    'verifying_completed', v_verifying_completed
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
