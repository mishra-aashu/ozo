-- Migration: Fix Order Cancellation and Order Item Updates Stock Synchronization
-- Description: Updates handle_order_status_change() to restore stock in mart_inventory instead of public.products when a mart context is available.
-- Adds a trigger on order_items to automatically restore stock if an individual item is cancelled or updated.

-- 1. Redefine handle_order_status_change() to properly restore stock in mart_inventory
CREATE OR REPLACE FUNCTION public.handle_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
                IF NEW.mart_id IS NOT NULL AND EXISTS (
                    SELECT 1 FROM public.mart_inventory 
                    WHERE mart_id = NEW.mart_id AND product_id = v_item.product_id
                ) THEN
                    UPDATE public.mart_inventory
                    SET stock_quantity = COALESCE(stock_quantity, 0) + v_item.quantity,
                        is_available = true
                    WHERE mart_id = NEW.mart_id AND product_id = v_item.product_id;
                ELSE
                    IF EXISTS (
                        SELECT 1 FROM public.products 
                        WHERE id = v_item.product_id AND quantity_available IS NOT NULL
                    ) THEN
                        UPDATE public.products
                        SET quantity_available = COALESCE(quantity_available, 0) + v_item.quantity,
                            is_available = true
                        WHERE id = v_item.product_id;
                    ELSE
                        UPDATE public.products
                        SET is_available = true
                        WHERE id = v_item.product_id;
                    END IF;
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
$$;


-- 2. Create the trigger function for order_items updates and deletions
CREATE OR REPLACE FUNCTION public.fn_sync_order_items_stock()
RETURNS TRIGGER AS $$
DECLARE
    v_order_status TEXT;
    v_mart_id UUID;
    v_qty_diff INT;
    v_product_id UUID;
BEGIN
    -- Get order status and mart context
    IF TG_OP = 'DELETE' THEN
        SELECT status, mart_id INTO v_order_status, v_mart_id 
        FROM public.orders 
        WHERE id = OLD.order_id;
        v_product_id := OLD.product_id;
    ELSE
        SELECT status, mart_id INTO v_order_status, v_mart_id 
        FROM public.orders 
        WHERE id = NEW.order_id;
        v_product_id := NEW.product_id;
    END IF;

    -- If the order itself is already cancelled, stock is already restored/handled at order level
    IF v_order_status IN ('cancelled', 'CANCELLED_BY_USER', 'CANCELLED_BY_MART') THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    v_qty_diff := 0;

    IF TG_OP = 'DELETE' THEN
        -- If an item is deleted, we restore the quantity (if it wasn't already cancelled)
        IF NOT COALESCE(OLD.is_cancelled, false) THEN
            v_qty_diff := OLD.quantity;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Case 1: Item is newly cancelled
        IF NOT COALESCE(OLD.is_cancelled, false) AND COALESCE(NEW.is_cancelled, false) THEN
            v_qty_diff := OLD.quantity;
        -- Case 2: Item is un-cancelled
        ELSIF COALESCE(OLD.is_cancelled, false) AND NOT COALESCE(NEW.is_cancelled, false) THEN
            v_qty_diff := -NEW.quantity;
        -- Case 3: Quantity changed on an active item
        ELSIF NOT COALESCE(OLD.is_cancelled, false) AND NOT COALESCE(NEW.is_cancelled, false) THEN
            v_qty_diff := OLD.quantity - NEW.quantity;
        END IF;
    ELSIF TG_OP = 'INSERT' THEN
        -- If an item is inserted post-order placement, we decrement stock
        IF NOT COALESCE(NEW.is_cancelled, false) THEN
            v_qty_diff := -NEW.quantity;
        END IF;
    END IF;

    -- If there's a stock change to apply
    IF v_qty_diff <> 0 THEN
        IF v_mart_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.mart_inventory 
            WHERE mart_id = v_mart_id AND product_id = v_product_id
        ) THEN
            UPDATE public.mart_inventory
            SET stock_quantity = COALESCE(stock_quantity, 0) + v_qty_diff,
                is_available = CASE 
                    WHEN COALESCE(stock_quantity, 0) + v_qty_diff <= 0 THEN false 
                    ELSE true 
                END
            WHERE mart_id = v_mart_id AND product_id = v_product_id;
        ELSE
            IF EXISTS (
                SELECT 1 FROM public.products 
                WHERE id = v_product_id AND quantity_available IS NOT NULL
            ) THEN
                UPDATE public.products
                SET quantity_available = COALESCE(quantity_available, 0) + v_qty_diff,
                    is_available = CASE 
                        WHEN COALESCE(quantity_available, 0) + v_qty_diff <= 0 THEN false 
                        ELSE true 
                    END
                WHERE id = v_product_id;
            ELSE
                UPDATE public.products
                SET is_available = CASE 
                        WHEN v_qty_diff < 0 THEN false 
                        ELSE true 
                    END
                WHERE id = v_product_id;
            END IF;
        END IF;

        -- Log to inventory_logs
        INSERT INTO public.inventory_logs (
            product_id,
            quantity_change,
            reason,
            reference_id
        ) VALUES (
            v_product_id,
            v_qty_diff,
            'Order Item Edit (' || TG_OP || ')',
            COALESCE(NEW.order_id, OLD.order_id)
        );
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trg_sync_order_items_stock ON public.order_items;

-- Create trigger on order_items
CREATE TRIGGER trg_sync_order_items_stock
AFTER INSERT OR UPDATE OR DELETE ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_order_items_stock();
