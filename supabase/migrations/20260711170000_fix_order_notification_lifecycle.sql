-- Migration: Fix handle_order_notification_lifecycle to restore missing status transitions and notify mart operators
-- Date: 2026-07-11 17:00:00

CREATE OR REPLACE FUNCTION public.handle_order_notification_lifecycle()
RETURNS TRIGGER AS $$
DECLARE
  v_admin_id UUID;
  v_payout NUMERIC;
BEGIN
  -- A. ADMIN, MART OPERATOR, AND CUSTOMER ALERT ON PLACE:
  IF TG_OP = 'INSERT' THEN
    -- 1. If placed normally (pending or placed)
    IF NEW.status IN ('pending', 'placed') THEN
      -- Notify admins
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

      -- Notify the mart operator
      INSERT INTO public.notifications (user_id, title, message, type, data)
      SELECT owner_id, '📦 New Order for Your Mart!', 'Order #' || NEW.order_number || ' total ₹' || NEW.total || ' has been placed. Please prepare it immediately.', 'mart_order_alert', jsonb_build_object('order_id', NEW.id, 'order_number', NEW.order_number)
      FROM public.marts
      WHERE id = NEW.mart_id AND owner_id IS NOT NULL;

    -- 2. If placed in Cooling Period (PLACED_COOLING)
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
    -- 1. Transitions from PLACED_COOLING to CONFIRMED_SYSTEM (Cooling Period ends)
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

      -- Notify mart operator
      INSERT INTO public.notifications (user_id, title, message, type, data)
      SELECT owner_id, '📦 New Order for Your Mart!', 'Order #' || NEW.order_number || ' total ₹' || NEW.total || ' has been placed. Please prepare it immediately.', 'mart_order_alert', jsonb_build_object('order_id', NEW.id, 'order_number', NEW.order_number)
      FROM public.marts
      WHERE id = NEW.mart_id AND owner_id IS NOT NULL;
    END IF;

    -- 2. Rider Assignment Notification
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

    -- 3. Legacy confirmed status fallback
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

    -- 4. Customer Preparing / Chef Mode
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

    -- 5. Customer Packed
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

    -- 6. Customer Captain Assigned info
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

    -- 7. Customer Out for Delivery
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

    -- 8. Customer Delivered / DELIVERED_VERIFYING
    IF (NEW.status IN ('delivered', 'DELIVERED_VERIFYING')) AND OLD.status NOT IN ('delivered', 'DELIVERED_VERIFYING') THEN
      INSERT INTO public.notifications (user_id, title, message, type, data)
      VALUES (
        NEW.user_id,
        'Delivered! 🎉',
        'Your order has been safely delivered. Note: You have strictly 15 minutes to report any issues with live photos!',
        'order_status',
        jsonb_build_object('order_id', NEW.id, 'order_number', NEW.order_number)
      );
    END IF;

    -- 9. Customer Completed
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

    -- 10. Customer Cancelled (Admin or User triggered)
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

    -- 11. Customer Cancelled by Mart
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
