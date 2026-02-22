-- 1. Add platform_fee column to orders table if not present
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS platform_fee NUMERIC DEFAULT 0.00;

-- 2. Drop existing overloads of create_order_secure function to avoid resolution conflicts
DROP FUNCTION IF EXISTS public.create_order_secure(
    UUID, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, NUMERIC, NUMERIC, JSONB, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT
);
DROP FUNCTION IF EXISTS public.create_order_secure(
    UUID, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, NUMERIC, NUMERIC, JSONB, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, UUID
);
DROP FUNCTION IF EXISTS public.create_order_secure(
    UUID, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, NUMERIC, NUMERIC, JSONB, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, UUID, NUMERIC
);

-- 3. Create unified create_order_secure function supporting p_platform_fee and p_mart_id
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
    p_platform_fee NUMERIC DEFAULT 0.00
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

    -- Get city slug from p_delivery_city
    SELECT slug INTO v_city_slug
    FROM public.operating_cities
    WHERE lower(name) = lower(p_delivery_city)
    LIMIT 1;
    
    IF v_city_slug IS NULL THEN
        v_city_slug := 'aurangabad';
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
        SELECT quantity_available, is_available, name, max_order_qty, min_order_qty, price, mrp, ozo_price
        INTO v_avail_qty, v_is_available, v_product_name, v_max_qty, v_min_qty, v_original_mart_price, v_base_mrp, v_base_ozo_price
        FROM public.products
        WHERE id = v_product_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Product not found in database.';
        END IF;

        -- Get city specific details if they exist
        SELECT is_available, city_price, city_mrp, city_ozo_price
        INTO v_city_is_available, v_city_price, v_city_mrp, v_city_ozo_price
        FROM public.product_city_availability
        WHERE product_id = v_product_id AND city_slug = v_city_slug;

        IF FOUND THEN
            IF v_city_is_available IS NOT NULL THEN
                v_is_available := v_city_is_available;
            END IF;
            IF v_city_price IS NOT NULL THEN
                v_original_mart_price := v_city_price;
            END IF;
            IF v_city_mrp IS NOT NULL THEN
                v_base_mrp := v_city_mrp;
            END IF;
            IF v_city_ozo_price IS NOT NULL THEN
                v_base_ozo_price := v_city_ozo_price;
            END IF;
        END IF;

        -- Customer price v_price is ozo_price if set (not null and > 0), otherwise original mart price
        IF v_base_ozo_price IS NOT NULL AND v_base_ozo_price > 0 THEN
            v_price := v_base_ozo_price;
        ELSE
            v_price := v_original_mart_price;
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

    -- 6. Get mart_id
    IF p_mart_id IS NOT NULL THEN
        v_mart_id := p_mart_id;
    ELSE
        SELECT mart_id INTO v_mart_id
        FROM public.products
        WHERE id = ((p_items->0)->>'product_id')::UUID;
        
        IF v_mart_id IS NULL THEN
            SELECT mart_id INTO v_mart_id
            FROM public.mart_inventory
            WHERE product_id = ((p_items->0)->>'product_id')::UUID
            LIMIT 1;
        END IF;
    END IF;

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
        google_maps_url
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

        SELECT name, image_url, price, ozo_price INTO v_product_name, v_product_image, v_original_mart_price, v_base_ozo_price
        FROM public.products
        WHERE id = v_product_id;

        -- Get city specific details if they exist to fetch names and images if overridden
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
$$;

-- 4. Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_order_secure(
    UUID, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, NUMERIC, NUMERIC, JSONB, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, UUID, NUMERIC
) TO authenticated, anon;
