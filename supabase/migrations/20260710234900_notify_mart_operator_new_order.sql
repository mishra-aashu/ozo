-- Migration: Notify mart operator on new order insertion
-- Date: 2026-07-10 23:49:00

CREATE OR REPLACE FUNCTION public.handle_order_notification_lifecycle()
RETURNS TRIGGER AS $$
DECLARE
  v_admin_id UUID;
  v_payout NUMERIC;
BEGIN
  -- 1. ADMIN & MART OPERATOR ALERT: Customer places a new order (INSERT on orders table with status = 'pending')
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
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

    -- Notify the mart operator (owner of the mart)
    INSERT INTO public.notifications (user_id, title, message, type, data)
    SELECT owner_id, '📦 New Order for Your Mart!', 'Order #' || NEW.order_number || ' total ₹' || NEW.total || ' has been placed. Please prepare it immediately.', 'mart_order_alert', jsonb_build_object('order_id', NEW.id, 'order_number', NEW.order_number)
    FROM public.marts
    WHERE id = NEW.mart_id AND owner_id IS NOT NULL;
  END IF;

  -- 2. UPDATE EVENTS
  IF TG_OP = 'UPDATE' THEN
    -- A. FOR RIDERS: Admin assigns a rider to an order (rider_id is updated and status = 'accepted' or 'assigned')
    IF NEW.rider_id IS NOT NULL AND (
      ((OLD.rider_id IS NULL OR OLD.rider_id IS DISTINCT FROM NEW.rider_id) AND NEW.status IN ('accepted', 'assigned'))
      OR
      (NEW.status IN ('accepted', 'assigned') AND OLD.status NOT IN ('accepted', 'assigned'))
    ) THEN
      
      -- Calculate payout
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

    -- B. FOR CUSTOMERS: Order Confirmed
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

    -- C. FOR CUSTOMERS: Chef Mode On / Preparing
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

    -- D. FOR CUSTOMERS: Order Packed
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

    -- E. FOR CUSTOMERS: Captain Assigned (for customer info)
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

    -- F. FOR CUSTOMERS: Rider is Rushing / Out for Delivery
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

    -- G. FOR CUSTOMERS: Delivered
    IF NEW.status = 'delivered' AND OLD.status IS DISTINCT FROM 'delivered' THEN
      INSERT INTO public.notifications (user_id, title, message, type, data)
      VALUES (
        NEW.user_id,
        'Delivered! 🎉',
        'Your order has been safely delivered. Note: You have strictly 15 minutes to report any issues with live photos!',
        'order_status',
        jsonb_build_object('order_id', NEW.id, 'order_number', NEW.order_number)
      );
    END IF;

    -- H. FOR CUSTOMERS: Order Cancelled
    IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
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
