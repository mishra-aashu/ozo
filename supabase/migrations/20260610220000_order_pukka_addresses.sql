-- =========================================================================
-- OZO EXPRESS - ADDRESS & DELIVERY INFORMATION SYSTEM
-- =========================================================================

-- 1. Alter orders table to support pukka addresses and recipient details
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS order_for VARCHAR DEFAULT 'myself', -- 'myself' ya 'other'
ADD COLUMN IF NOT EXISTS recipient_name VARCHAR,
ADD COLUMN IF NOT EXISTS recipient_phone VARCHAR,
ADD COLUMN IF NOT EXISTS house_no VARCHAR,
ADD COLUMN IF NOT EXISTS street_gali VARCHAR,
ADD COLUMN IF NOT EXISTS landmark VARCHAR,
ADD COLUMN IF NOT EXISTS delivery_city VARCHAR DEFAULT 'Aurangabad',
ADD COLUMN IF NOT EXISTS google_maps_url TEXT;

-- Drop the old version of the function first to avoid duplicate signature errors
DROP FUNCTION IF EXISTS public.create_order_secure(
    UUID,
    NUMERIC,
    NUMERIC,
    NUMERIC,
    NUMERIC,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TIMESTAMPTZ,
    TEXT,
    NUMERIC,
    NUMERIC,
    JSONB
);

-- 2. Update secure order placement function to support the new columns
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

    -- 8. Insert Order Header record with the new address/recipient fields
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
        'pending',
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

-- Grant EXECUTE permission to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION public.create_order_secure TO authenticated, anon;
