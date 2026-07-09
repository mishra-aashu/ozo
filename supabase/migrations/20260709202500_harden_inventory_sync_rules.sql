-- Migration: Harden Inventory Synchronization Rules and Fix Data Anomalies
-- Description: 
-- 1. Prevents double-decrement of stock by skipping trigger decrement on initial order placement.
-- 2. Refactors handle_order_status_change() to conditionally compute is_available based on resulting stock.
-- 3. Refactors find_optimal_mart() to remove the unsafe fallback, returning NULL if no mart has stock.
-- 4. Redefines handle_return_request_approval() to restore inventory stock on return request approval.
-- 5. Runs a clean data repair query and adds a BEFORE trigger on mart_inventory to guarantee consistency.

-- 1. Redefine find_optimal_mart to remove unsafe fallback
CREATE OR REPLACE FUNCTION public.find_optimal_mart(
    p_latitude NUMERIC,
    p_longitude NUMERIC,
    p_items JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_optimal_mart_id UUID;
    v_item JSONB;
    v_product_id UUID;
    v_qty INT;
    v_all_items_in_stock BOOLEAN;
    v_mart_row RECORD;
    v_min_distance NUMERIC := 999999.99;
    v_distance NUMERIC;
BEGIN
    -- If no items, return NULL
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RETURN NULL;
    END IF;

    -- Loop through active marts
    FOR v_mart_row IN 
        SELECT id, latitude, longitude
        FROM public.marts
        WHERE is_active = true
    LOOP
        -- Check if this mart has sufficient stock for all items
        v_all_items_in_stock := true;
        
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
        LOOP
            v_product_id := (v_item->>'product_id')::UUID;
            v_qty := (v_item->>'quantity')::INT;
            
            -- Check mart_inventory for stock
            IF NOT EXISTS (
                SELECT 1 
                FROM public.mart_inventory 
                WHERE mart_id = v_mart_row.id 
                  AND product_id = v_product_id 
                  AND stock_quantity >= v_qty 
                  AND is_available = true
            ) THEN
                v_all_items_in_stock := false;
                EXIT; -- exit inner loop, check next mart
            END IF;
        END LOOP;
        
        -- If all items are in stock at this mart, calculate distance
        IF v_all_items_in_stock THEN
            IF p_latitude IS NOT NULL AND p_longitude IS NOT NULL AND v_mart_row.latitude IS NOT NULL AND v_mart_row.longitude IS NOT NULL THEN
                -- Distance using simplified flat-surface approximation
                v_distance := sqrt(
                    power((v_mart_row.latitude - p_latitude) * 111, 2) + 
                    power((v_mart_row.longitude - p_longitude) * 111 * cos(radians(p_latitude)), 2)
                );
            ELSE
                -- Default/fallback distance if coordinates are not available
                v_distance := 0; 
            END IF;
            
            -- Keep the closest mart
            IF v_distance < v_min_distance THEN
                v_min_distance := v_distance;
                v_optimal_mart_id := v_mart_row.id;
            END IF;
        END IF;
    END LOOP;
    
    -- If no mart has all items in stock and is active, fallback to the mart that has the first item in stock
    IF v_optimal_mart_id IS NULL THEN
        SELECT mart_id INTO v_optimal_mart_id
        FROM public.mart_inventory
        WHERE product_id = ((p_items->0)->>'product_id')::UUID
          AND stock_quantity >= ((p_items->0)->>'quantity')::INT
          AND is_available = true
        LIMIT 1;
    END IF;

    -- Absolute fallback block is removed to avoid forcing checkout on random out-of-stock marts.
    -- If v_optimal_mart_id is NULL, create_order_secure will fall back to products check.

    RETURN v_optimal_mart_id;
END;
$$;


-- 2. Redefine create_order_secure to set transaction local configuration variable to prevent double-decrement
CREATE OR REPLACE FUNCTION public.create_order_secure(
    p_address_id UUID,
    p_subtotal NUMERIC,
    p_delivery_fee NUMERIC,
    p_discount NUMERIC,
    p_total NUMERIC,
    p_coupon_code TEXT DEFAULT NULL,
    p_payment_method TEXT DEFAULT 'cod',
    p_payment_status TEXT DEFAULT 'pending',
    p_delivery_instructions TEXT DEFAULT NULL,
    p_estimated_delivery TIMESTAMPTZ DEFAULT NULL,
    p_transaction_id TEXT DEFAULT NULL,
    p_latitude NUMERIC DEFAULT NULL,
    p_longitude NUMERIC DEFAULT NULL,
    p_items JSONB DEFAULT '[]'::jsonb,
    p_order_for VARCHAR DEFAULT 'myself',
    p_recipient_name VARCHAR DEFAULT NULL,
    p_recipient_phone VARCHAR DEFAULT NULL,
    p_house_no VARCHAR DEFAULT NULL,
    p_street_gali VARCHAR DEFAULT NULL,
    p_landmark VARCHAR DEFAULT NULL,
    p_delivery_city VARCHAR DEFAULT 'Aurangabad',
    p_google_maps_url TEXT DEFAULT NULL,
    p_mart_id UUID DEFAULT NULL,
    p_platform_fee NUMERIC DEFAULT 0.00,
    p_distance NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
    
    v_city_slug TEXT;
    v_original_mart_price NUMERIC;
    v_base_mrp NUMERIC;
    v_base_ozo_price NUMERIC;
    
    v_city_is_available BOOLEAN;
    v_city_price NUMERIC;
    v_city_mrp NUMERIC;
    v_city_ozo_price NUMERIC;

    -- Delivery Config variables
    v_delivery_config JSONB;
    v_free_above NUMERIC := 199.00;
    v_base_fee NUMERIC := 40.00;

    -- Platform Config variables
    v_platform_config JSONB;
    v_platform_fee_setting NUMERIC := 0.00;

    -- Mart-specific overrides
    v_mi_mart_price NUMERIC;
    v_mi_mrp NUMERIC;
    v_mi_customer_price NUMERIC;
    v_mi_is_available BOOLEAN;
    
    -- Financial Tracking variables
    v_calculated_mart_payout NUMERIC := 0.00;
    v_calculated_admin_profit NUMERIC := 0.00;
BEGIN
    -- Set local variable to indicate order placement session.
    -- The third argument 'true' makes it local to the transaction.
    PERFORM set_config('app.is_secure_order_creation', 'true', true);

    -- 1. Validate caller authentication
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: User authentication required.';
    END IF;

    -- Basic input validation
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Invalid request: Cart items cannot be empty.';
    END IF;

    -- 2. Determine City and Mart Context
    SELECT slug INTO v_city_slug
    FROM public.operating_cities
    WHERE lower(slug) = lower(p_delivery_city)
       OR lower(name) LIKE '%' || lower(p_delivery_city) || '%'
       OR lower(p_delivery_city) LIKE '%' || lower(name) || '%'
    LIMIT 1;
    
    IF v_city_slug IS NULL THEN
        v_city_slug := 'aurangabad-bihar';
    END IF;

    -- Resolve v_mart_id using proximity and stock availability routing
    IF p_mart_id IS NOT NULL THEN
        v_mart_id := p_mart_id;
    ELSE
        v_mart_id := public.find_optimal_mart(p_latitude, p_longitude, p_items);
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
        IF v_mart_id IS NOT NULL THEN
            -- Check mart inventory
            SELECT stock_quantity, is_available, mart_price, customer_price
            INTO v_avail_qty, v_is_available, v_mi_mart_price, v_mi_customer_price
            FROM public.mart_inventory
            WHERE mart_id = v_mart_id AND product_id = v_product_id
            FOR UPDATE;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'Product % is not available in the selected mart.', v_product_id;
            END IF;

            IF NOT v_is_available OR v_avail_qty < v_qty THEN
                RAISE EXCEPTION 'Insufficient stock for product % in mart. Available: %, Requested: %', v_product_id, COALESCE(v_avail_qty, 0), v_qty;
            END IF;

            -- Calculate unit price
            IF v_mi_customer_price IS NOT NULL AND v_mi_customer_price > 0 THEN
                v_price := v_mi_customer_price;
            ELSE
                v_price := public.calculate_customer_price(v_mi_mart_price, v_product_id);
            END IF;
            
            -- Mart payout is based on the original mart price
            v_calculated_mart_payout := v_calculated_mart_payout + (v_mi_mart_price * v_qty);
        ELSE
            -- Global fallback (when no mart is assigned/found)
            SELECT quantity_available, is_available, price, ozo_price
            INTO v_avail_qty, v_is_available, v_original_mart_price, v_base_ozo_price
            FROM public.products
            WHERE id = v_product_id
            FOR UPDATE;

            IF NOT v_is_available OR v_avail_qty < v_qty THEN
                RAISE EXCEPTION 'Insufficient stock for product %. Available: %, Requested: %', v_product_id, COALESCE(v_avail_qty, 0), v_qty;
            END IF;

            -- Check city overrides
            SELECT is_available, city_price, city_mrp, city_ozo_price
            INTO v_city_is_available, v_city_price, v_city_mrp, v_city_ozo_price
            FROM public.product_city_availability
            WHERE product_id = v_product_id AND city_slug = v_city_slug;

            IF FOUND THEN
                IF v_city_price IS NOT NULL THEN
                    v_original_mart_price := v_city_price;
                END IF;
                IF v_city_ozo_price IS NOT NULL THEN
                    v_base_ozo_price := v_city_ozo_price;
                END IF;
            END IF;

            IF v_base_ozo_price IS NOT NULL AND v_base_ozo_price > 0 THEN
                v_price := v_base_ozo_price;
            ELSE
                v_price := v_original_mart_price;
            END IF;
            
            v_calculated_mart_payout := v_calculated_mart_payout + (v_price * v_qty);
        END IF;

        v_calculated_subtotal := v_calculated_subtotal + (v_price * v_qty);
    END LOOP;

    -- 4. Coupon validation and discount application
    IF p_coupon_code IS NOT NULL AND p_coupon_code != '' THEN
        SELECT discount_type, value, min_order_value, max_discount
        INTO v_discount_type, v_discount_value, v_min_order_value, v_max_discount
        FROM public.coupons
        WHERE code = p_coupon_code 
          AND is_active = true 
          AND (valid_from IS NULL OR valid_from <= now())
          AND (valid_until IS NULL OR valid_until >= now());

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Invalid coupon code % or coupon is expired.', p_coupon_code;
        END IF;

        IF v_calculated_subtotal < COALESCE(v_min_order_value, 0) THEN
            RAISE EXCEPTION 'Coupon requires a minimum order value of Rs. %', v_min_order_value;
        END IF;

        IF v_discount_type = 'percentage' THEN
            v_calculated_discount := v_calculated_subtotal * (v_discount_value / 100.0);
            IF v_max_discount IS NOT NULL AND v_calculated_discount > v_max_discount THEN
                v_calculated_discount := v_max_discount;
            END IF;
        ELSE
            v_calculated_discount := v_discount_value;
        END IF;
        
        -- Cap discount at subtotal
        IF v_calculated_discount > v_calculated_subtotal THEN
            v_calculated_discount := v_calculated_subtotal;
        END IF;
    END IF;

    -- Delivery Credit Validation (for referral/free delivery orders)
    IF p_delivery_fee = 0 AND p_subtotal < v_free_above THEN
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

    -- Fetch platform config settings
    SELECT value INTO v_platform_config FROM public.app_settings WHERE key = 'platform_config';
    IF FOUND THEN
        v_platform_fee_setting := COALESCE((v_platform_config->>'platform_fee')::NUMERIC, 0.00);
    END IF;

    -- 5. Calculate and verify total
    v_calculated_discount := round(v_calculated_discount, 2);
    v_calculated_subtotal := round(v_calculated_subtotal, 2);
    
    -- platform fee safety check
    IF round(p_platform_fee, 2) != round(v_platform_fee_setting, 2) THEN
        RAISE EXCEPTION 'Invalid platform fee: expected %, got %', v_platform_fee_setting, p_platform_fee;
    END IF;

    v_calculated_total := round(v_calculated_subtotal + p_delivery_fee + p_platform_fee - v_calculated_discount, 2);

    IF round(p_subtotal, 2) != v_calculated_subtotal THEN
        RAISE EXCEPTION 'Invalid order subtotal: expected %, got %', v_calculated_subtotal, p_subtotal;
    END IF;
    IF round(p_discount, 2) != v_calculated_discount THEN
        RAISE EXCEPTION 'Invalid order discount: expected %, got %', v_calculated_discount, p_discount;
    END IF;
    IF round(p_total, 2) != v_calculated_total THEN
        RAISE EXCEPTION 'Invalid order total: expected %, got %', v_calculated_total, p_total;
    END IF;

    -- Admin profit logic
    v_calculated_mart_payout := round(v_calculated_mart_payout, 2);
    v_calculated_admin_profit := round(v_calculated_subtotal - v_calculated_mart_payout, 2);

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
        platform_fee,
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
        google_maps_url,
        distance,
        mart_payout,
        admin_profit
    ) VALUES (
        v_order_number,
        v_user_id,
        p_address_id,
        v_calculated_subtotal,
        p_delivery_fee,
        p_platform_fee,
        v_calculated_discount,
        v_calculated_total,
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
        p_google_maps_url,
        p_distance,
        v_calculated_mart_payout,
        v_calculated_admin_profit
    )
    RETURNING id INTO v_order_id;

    -- 9. Insert Order Items and decrement stock
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_qty := (v_item->>'quantity')::INT;

        SELECT name, image_url, price, ozo_price INTO v_product_name, v_product_image, v_original_mart_price, v_base_ozo_price
        FROM public.products
        WHERE id = v_product_id;

        -- Re-fetch mart/city prices to get the correct item-level unit prices
        v_mi_mart_price := NULL;
        v_mi_customer_price := NULL;
        
        IF v_mart_id IS NOT NULL THEN
            SELECT mart_price, customer_price
            INTO v_mi_mart_price, v_mi_customer_price
            FROM public.mart_inventory
            WHERE mart_id = v_mart_id AND product_id = v_product_id;
        END IF;

        IF v_mi_mart_price IS NOT NULL THEN
            v_original_mart_price := v_mi_mart_price;
            IF v_mi_customer_price IS NOT NULL AND v_mi_customer_price > 0 THEN
                v_price := v_mi_customer_price;
            ELSE
                v_price := public.calculate_customer_price(v_mi_mart_price, v_product_id);
            END IF;
        ELSE
            SELECT is_available, city_price, city_mrp, city_ozo_price
            INTO v_city_is_available, v_city_price, v_city_mrp, v_city_ozo_price
            FROM public.product_city_availability
            WHERE product_id = v_product_id AND city_slug = v_city_slug;

            IF FOUND THEN
                IF v_city_price IS NOT NULL THEN
                    v_original_mart_price := v_city_price;
                END IF;
                IF v_city_ozo_price IS NOT NULL THEN
                    v_base_ozo_price := v_city_ozo_price;
                END IF;
            END IF;

            IF v_base_ozo_price IS NOT NULL AND v_base_ozo_price > 0 THEN
                v_price := v_base_ozo_price;
            ELSE
                v_price := v_original_mart_price;
            END IF;
            
            v_original_mart_price := v_price;
        END IF;

        -- Insert order item (triggers trg_sync_order_items_stock but configuration suppresses trigger stock changes)
        INSERT INTO public.order_items (
            order_id,
            product_id,
            product_name,
            product_image,
            quantity,
            unit_price,
            total_price,
            mart_unit_price
        ) VALUES (
            v_order_id,
            v_product_id,
            v_product_name,
            v_product_image,
            v_qty,
            v_price,
            v_price * v_qty,
            v_original_mart_price
        );

        -- Decrement stock manually (this is the single source of truth for stock decrement)
        IF v_mart_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.mart_inventory WHERE mart_id = v_mart_id AND product_id = v_product_id) THEN
            UPDATE public.mart_inventory
            SET stock_quantity = CASE 
                    WHEN stock_quantity IS NOT NULL THEN stock_quantity - v_qty 
                    ELSE stock_quantity 
                END,
                is_available = CASE 
                    WHEN stock_quantity IS NOT NULL AND (stock_quantity - v_qty) <= 0 THEN false 
                    ELSE is_available 
                END
            WHERE mart_id = v_mart_id AND product_id = v_product_id;
        ELSE
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
        END IF;

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
$$;


-- 3. Redefine fn_sync_order_items_stock trigger to respect app.is_secure_order_creation config setting
CREATE OR REPLACE FUNCTION public.fn_sync_order_items_stock()
RETURNS TRIGGER AS $$
DECLARE
    v_order_status TEXT;
    v_mart_id UUID;
    v_qty_diff INT;
    v_product_id UUID;
BEGIN
    -- If this is an insert during create_order_secure, skip trigger-based stock change
    -- since create_order_secure already decrements stock.
    IF TG_OP = 'INSERT' AND current_setting('app.is_secure_order_creation', true) = 'true' THEN
        RETURN NEW;
    END IF;

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


-- 4. Redefine handle_order_status_change to set is_available conditionally on stock restoration
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
                        is_available = CASE WHEN COALESCE(stock_quantity, 0) + v_item.quantity > 0 THEN true ELSE false END
                    WHERE mart_id = NEW.mart_id AND product_id = v_item.product_id;
                ELSE
                    IF EXISTS (
                        SELECT 1 FROM public.products 
                        WHERE id = v_item.product_id AND quantity_available IS NOT NULL
                    ) THEN
                        UPDATE public.products
                        SET quantity_available = COALESCE(quantity_available, 0) + v_item.quantity,
                            is_available = CASE WHEN COALESCE(quantity_available, 0) + v_item.quantity > 0 THEN true ELSE false END
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


-- 5. Redefine handle_return_request_approval trigger function to support stock restoration on approval
CREATE OR REPLACE FUNCTION public.handle_return_request_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_total numeric;
  order_number_val text;
  order_user_id uuid;
  order_payment_status text;
  v_item RECORD;
  v_mart_id_temp UUID;
BEGIN
  -- Trigger on approval
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    -- Fetch details
    SELECT total, order_number, user_id, payment_status, mart_id
    INTO order_total, order_number_val, order_user_id, order_payment_status, v_mart_id_temp
    FROM public.orders
    WHERE id = NEW.order_id;

    IF order_payment_status = 'refunded' THEN
      RAISE EXCEPTION 'This order has already been refunded';
    END IF;

    -- Update order payment status to refunded
    UPDATE public.orders
    SET payment_status = 'refunded',
        updated_at = now()
    WHERE id = NEW.order_id;

    -- Ensure wallet exists
    INSERT INTO public.wallets (user_id, balance, updated_at)
    VALUES (order_user_id, 0.00, now())
    ON CONFLICT (user_id) DO NOTHING;

    -- Add credit to balance
    UPDATE public.wallets
    SET balance = balance + order_total,
        updated_at = now()
    WHERE user_id = order_user_id;

    -- Log transaction
    INSERT INTO public.wallet_transactions (
      wallet_id,
      amount,
      type,
      transaction_type,
      reference_id,
      description,
      created_at
    ) VALUES (
      order_user_id,
      order_total,
      'credit',
      'refund',
      NEW.order_id,
      'Refund for returned order #' || COALESCE(order_number_val, NEW.order_id::text),
      now()
    );

    -- Restore stock for returned order items
    FOR v_item IN SELECT * FROM public.order_items WHERE order_id = NEW.order_id
    LOOP
        IF NOT COALESCE(v_item.is_cancelled, false) THEN
            IF v_mart_id_temp IS NOT NULL AND EXISTS (
                SELECT 1 FROM public.mart_inventory 
                WHERE mart_id = v_mart_id_temp AND product_id = v_item.product_id
            ) THEN
                UPDATE public.mart_inventory
                SET stock_quantity = COALESCE(stock_quantity, 0) + v_item.quantity,
                    is_available = CASE WHEN COALESCE(stock_quantity, 0) + v_item.quantity > 0 THEN true ELSE false END
                WHERE mart_id = v_mart_id_temp AND product_id = v_item.product_id;
            ELSE
                IF EXISTS (
                    SELECT 1 FROM public.products 
                    WHERE id = v_item.product_id AND quantity_available IS NOT NULL
                ) THEN
                    UPDATE public.products
                    SET quantity_available = COALESCE(quantity_available, 0) + v_item.quantity,
                        is_available = CASE WHEN COALESCE(quantity_available, 0) + v_item.quantity > 0 THEN true ELSE false END
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
                'Order Returned (Return Approved)',
                NEW.order_id
            );
        END IF;
    END LOOP;

    -- Notify customer
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type,
      data,
      created_at
    ) VALUES (
      order_user_id,
      'Return Approved & Refunded',
      'Your return request for order #' || COALESCE(order_number_val, NEW.order_id::text) || ' has been approved. ₹' || order_total || ' has been credited to your OZO wallet.',
      'wallet',
      jsonb_build_object('order_id', NEW.order_id),
      now()
    );

  -- Trigger on rejection
  ELSIF NEW.status = 'rejected' AND OLD.status = 'pending' THEN
    -- Notify customer
    SELECT user_id, order_number INTO order_user_id, order_number_val
    FROM public.orders
    WHERE id = NEW.order_id;

    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type,
      data,
      created_at
    ) VALUES (
      order_user_id,
      'Return Request Rejected',
      'Your return request for order #' || COALESCE(order_number_val, NEW.order_id::text) || ' has been rejected after verification.',
      'order',
      jsonb_build_object('order_id', NEW.order_id),
      now()
    );
  END IF;

  RETURN NEW;
END;
$$;


-- 6. Enforce consistency constraint: AFTER/BEFORE triggers to prevent is_available = true when stock <= 0
CREATE OR REPLACE FUNCTION public.fn_enforce_mart_inventory_consistency()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.stock_quantity IS NOT NULL AND NEW.stock_quantity <= 0 THEN
        NEW.is_available := false;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_mart_inventory_consistency ON public.mart_inventory;
CREATE TRIGGER trg_enforce_mart_inventory_consistency
BEFORE INSERT OR UPDATE ON public.mart_inventory
FOR EACH ROW
EXECUTE FUNCTION public.fn_enforce_mart_inventory_consistency();


-- 7. Immediate Data Repair & Reconciliation
-- CRIT-1: Fix inconsistent mart_inventory records
UPDATE public.mart_inventory
SET is_available = false
WHERE stock_quantity <= 0 AND is_available = true;

-- CRIT-2: Sync and fix the global products catalog availability with the new clean mart inventory
UPDATE public.products p
SET quantity_available = COALESCE(sub.total_stock, 0),
    is_available = COALESCE(sub.is_available, false),
    updated_at = NOW()
FROM (
    SELECT 
        p.id as product_id,
        COALESCE(SUM(mi.stock_quantity), 0) as total_stock,
        COALESCE(BOOL_OR(mi.is_available = true AND mi.stock_quantity > 0 AND m.is_active = true), false) as is_available
    FROM public.products p
    LEFT JOIN public.mart_inventory mi ON mi.product_id = p.id
    LEFT JOIN public.marts m ON m.id = mi.mart_id
    GROUP BY p.id
) sub
WHERE p.id = sub.product_id;
