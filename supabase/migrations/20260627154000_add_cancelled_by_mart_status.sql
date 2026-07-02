-- Migration: Add CANCELLED_BY_MART status and handle stock and notifications
-- Date: 2026-06-27

-- 1. Add cancellation_reason column to public.orders table if not exists
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- 2. Drop constraint and recreate to include CANCELLED_BY_MART
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
    'RETURN_REQUESTED'::text,
    'CANCELLED_BY_MART'::text
  ])
);

-- 3. Redefine handle_order_status_change trigger function to support CANCELLED_BY_MART
CREATE OR REPLACE FUNCTION public.handle_order_status_change()
RETURNS TRIGGER AS $$
DECLARE
    v_item RECORD;
    v_earnings_inc numeric;
    v_cash_inc numeric := 0;
    v_order_count INT;
    v_referrer_id UUID;
BEGIN
    -- Restore stock if cancelled or cancelled by user or cancelled by mart
    IF (NEW.status IN ('cancelled', 'CANCELLED_BY_USER', 'CANCELLED_BY_MART')) AND (OLD.status NOT IN ('cancelled', 'CANCELLED_BY_USER', 'CANCELLED_BY_MART')) THEN
        FOR v_item IN SELECT * FROM public.order_items WHERE order_id = NEW.id
        LOOP
            -- Check if this order item itself was NOT cancelled before (if it was, its stock is already restored)
            IF NOT COALESCE(v_item.is_cancelled, false) THEN
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
                    'Order Cancelled (' || NEW.status || ')',
                    NEW.id
                );
            END IF;
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

-- 4. Redefine handle_order_notification_lifecycle to handle CANCELLED_BY_MART status
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

    -- Customer Cancelled (Admin or User triggered)
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

    -- Customer Cancelled by Mart
    IF NEW.status = 'CANCELLED_BY_MART' AND OLD.status IS DISTINCT FROM 'CANCELLED_BY_MART' THEN
      INSERT INTO public.notifications (user_id, title, message, type, data)
      VALUES (
        NEW.user_id,
        'Order Cancelled by Store',
        'We are sorry, your order #' || NEW.order_number || ' was cancelled by the store: ' || COALESCE(NEW.cancellation_reason, 'Store is unable to prepare this order.'),
        'order_status',
        jsonb_build_object('order_id', NEW.id, 'order_number', NEW.order_number)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
