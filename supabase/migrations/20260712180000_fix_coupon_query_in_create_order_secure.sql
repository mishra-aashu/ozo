-- Migration: Fix Coupon Query in public.create_order_secure
-- Created: 2026-07-12

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

    -- 4. Coupon validation and discount application (fixed query target to public.offers)
    IF p_coupon_code IS NOT NULL AND p_coupon_code != '' THEN
        SELECT discount_type, discount_value, min_order_value, max_discount
        INTO v_discount_type, v_discount_value, v_min_order_value, v_max_discount
        FROM public.offers
        WHERE upper(coupon_code) = upper(p_coupon_code) 
          AND is_active = true 
          AND (start_date IS NULL OR start_date <= now())
          AND (end_date IS NULL OR end_date >= now());

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

        -- Insert order item
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

        -- Decrement stock manually
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

GRANT EXECUTE ON FUNCTION public.create_order_secure(
    UUID, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, NUMERIC, NUMERIC, JSONB, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, UUID, NUMERIC, NUMERIC
) TO authenticated, anon;
