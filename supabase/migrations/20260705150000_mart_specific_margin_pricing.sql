-- Migration: Mart-Specific Margin Pricing, Margin Rules, Payout and Profit Tracking
-- Created: 2026-07-05

-- 1. Create margin_rules table
CREATE TABLE IF NOT EXISTS public.margin_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    brand TEXT,
    margin_percentage NUMERIC NOT NULL DEFAULT 10.00, -- e.g. 10.00 = 10% markup
    min_markup_rs NUMERIC DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on margin_rules
ALTER TABLE public.margin_rules ENABLE ROW LEVEL SECURITY;

-- Allow read access for authenticated and anonymous users
CREATE POLICY "Allow public read access to margin rules"
    ON public.margin_rules FOR SELECT TO anon, authenticated USING (true);

-- Allow full access to admins only
CREATE POLICY "Allow admin full access to margin rules"
    ON public.margin_rules FOR ALL TO authenticated
    USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Insert default margin rule if none exists
INSERT INTO public.margin_rules (margin_percentage, min_markup_rs)
SELECT 10.00, 0.00
WHERE NOT EXISTS (
    SELECT 1 FROM public.margin_rules WHERE category_id IS NULL AND brand IS NULL
);

-- 2. Add customer_price to mart_inventory
ALTER TABLE public.mart_inventory ADD COLUMN IF NOT EXISTS customer_price NUMERIC;

-- 3. Add mart_payout and admin_profit to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS mart_payout NUMERIC DEFAULT 0.00;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS admin_profit NUMERIC DEFAULT 0.00;

-- 4. Create function to calculate customer price dynamically based on margin rules
CREATE OR REPLACE FUNCTION public.calculate_customer_price(
    p_mart_price NUMERIC,
    p_product_id UUID
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_category_id UUID;
    v_brand TEXT;
    v_margin_pct NUMERIC := 10.00; -- Default fallback margin of 10%
    v_min_markup NUMERIC := 0.00;
    v_customer_price NUMERIC;
BEGIN
    IF p_mart_price IS NULL OR p_mart_price <= 0 THEN
        RETURN 0.00;
    END IF;

    -- Fetch category and brand for the product
    SELECT category_id, brand INTO v_category_id, v_brand
    FROM public.products
    WHERE id = p_product_id;

    -- Look up margin rules in priority order:
    -- 1. Specific brand and category match
    -- 2. Brand match only
    -- 3. Category match only
    -- 4. Default fallback (both NULL)
    SELECT margin_percentage, min_markup_rs INTO v_margin_pct, v_min_markup
    FROM public.margin_rules
    WHERE (category_id = v_category_id AND brand = v_brand)
       OR (category_id IS NULL AND brand = v_brand)
       OR (category_id = v_category_id AND brand IS NULL)
       OR (category_id IS NULL AND brand IS NULL)
    ORDER BY
        (category_id = v_category_id AND brand = v_brand) DESC,
        (brand = v_brand) DESC,
        (category_id = v_category_id) DESC
    LIMIT 1;

    -- Apply margin calculation (margin_pct is added to the mart_price)
    v_customer_price := p_mart_price * (1 + COALESCE(v_margin_pct, 10.00) / 100.0);
    IF v_min_markup > 0 AND (v_customer_price - p_mart_price) < v_min_markup THEN
        v_customer_price := p_mart_price + v_min_markup;
    END IF;

    -- Return rounded price
    RETURN round(v_customer_price, 2);
END;
$$;

-- 5. Create function to calculate customer price by barcode
CREATE OR REPLACE FUNCTION public.calculate_customer_price_by_barcode(
    p_mart_price NUMERIC,
    p_barcode TEXT
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_product_id UUID;
BEGIN
    SELECT id INTO v_product_id
    FROM public.products
    WHERE barcode = p_barcode;

    IF v_product_id IS NOT NULL THEN
        RETURN public.calculate_customer_price(p_mart_price, v_product_id);
    ELSE
        -- Fallback 10% if product doesn't exist in catalog yet
        RETURN round(p_mart_price * 1.10, 2);
    END IF;
END;
$$;

-- 6. Recreate public.create_order_secure with mart-specific pricing, stock decrement, payout, and profit tracking
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
    v_mi_stock_qty INT;
    v_calculated_mart_payout NUMERIC := 0.00;
    v_calculated_admin_profit NUMERIC := 0.00;
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

    -- Get city slug from p_delivery_city (support substring and exact matches)
    SELECT slug INTO v_city_slug
    FROM public.operating_cities
    WHERE lower(name) = lower(p_delivery_city)
       OR lower(slug) = lower(p_delivery_city)
       OR lower(name) LIKE '%' || lower(p_delivery_city) || '%'
       OR lower(p_delivery_city) LIKE '%' || lower(name) || '%'
    LIMIT 1;
    
    IF v_city_slug IS NULL THEN
        v_city_slug := 'aurangabad-bihar';
    END IF;

    -- Resolve v_mart_id first to know which mart overrides to apply
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

        -- Initialize/Reset Mart Override Variables
        v_mi_mart_price := NULL;
        v_mi_mrp := NULL;
        v_mi_customer_price := NULL;
        v_mi_is_available := NULL;
        v_mi_stock_qty := NULL;

        -- Check mart_inventory overrides
        IF v_mart_id IS NOT NULL THEN
            SELECT mart_price, mart_mrp, customer_price, is_available, stock_quantity
            INTO v_mi_mart_price, v_mi_mrp, v_mi_customer_price, v_mi_is_available, v_mi_stock_qty
            FROM public.mart_inventory
            WHERE mart_id = v_mart_id AND product_id = v_product_id
            FOR UPDATE;
        END IF;

        IF v_mi_mart_price IS NOT NULL THEN
            -- Mart Specific Pricing override
            v_original_mart_price := v_mi_mart_price;
            
            -- Selling price (customer pays)
            IF v_mi_customer_price IS NOT NULL AND v_mi_customer_price > 0 THEN
                v_price := v_mi_customer_price;
            ELSE
                v_price := public.calculate_customer_price(v_mi_mart_price, v_product_id);
            END IF;

            IF v_mi_mrp IS NOT NULL THEN
                v_base_mrp := v_mi_mrp;
            END IF;

            IF v_mi_is_available IS NOT NULL THEN
                v_is_available := v_mi_is_available;
            END IF;

            IF v_mi_stock_qty IS NOT NULL THEN
                v_avail_qty := v_mi_stock_qty;
            END IF;
        ELSE
            -- Fall back to city overrides
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

            -- Customer price
            IF v_base_ozo_price IS NOT NULL AND v_base_ozo_price > 0 THEN
                v_price := v_base_ozo_price;
            ELSE
                v_price := v_original_mart_price;
            END IF;

            -- If not in mart inventory, payout price defaults to customer price
            v_mi_mart_price := v_price;
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

        -- Accumulate subtotal and payouts
        v_calculated_subtotal := v_calculated_subtotal + (v_price * v_qty);
        v_calculated_mart_payout := v_calculated_mart_payout + (v_mi_mart_price * v_qty);
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

    -- Admin profit logic: difference between customer paid subtotal and mart payout amount
    v_calculated_mart_payout := round(v_calculated_mart_payout, 2);
    v_calculated_admin_profit := round(v_calculated_subtotal - v_calculated_mart_payout, 2);

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
            
            -- Set mart payout same as original mart price
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

        -- Decrement stock in mart_inventory or products
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.create_order_secure(
    UUID, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, NUMERIC, NUMERIC, JSONB, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, UUID, NUMERIC, NUMERIC
) TO authenticated, anon;
