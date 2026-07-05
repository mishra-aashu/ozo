-- Migration: OZO Security Hardening and Index Optimization
-- Created: 2026-07-05
-- Objective: Fix mutable search_path warnings, secure critical functions, add missing indexes, and optimize RLS policies.

-- ==========================================
-- Part 1: Fix Mutable Search Path Warnings
-- ==========================================

ALTER FUNCTION public.handle_order_notification_lifecycle() SET search_path = public;
ALTER FUNCTION public.handle_order_status_change() SET search_path = public;
ALTER FUNCTION public.verify_order_otp(uuid, text) SET search_path = public;
ALTER FUNCTION public.check_order_update_integrity() SET search_path = public;
ALTER FUNCTION public.sync_mart_inventory_customer_price_trigger() SET search_path = public;
ALTER FUNCTION public.recalculate_mart_inventory_customer_prices() SET search_path = public;
ALTER FUNCTION public.calculate_customer_price(numeric, uuid) SET search_path = public;
ALTER FUNCTION public.calculate_customer_price_by_barcode(numeric, text) SET search_path = public;
ALTER FUNCTION public.find_optimal_mart(numeric, numeric, jsonb) SET search_path = public;
ALTER FUNCTION public.fn_sync_mart_inventory_customer_price() SET search_path = public;
ALTER FUNCTION public.fn_sync_mart_inventory_on_margin_rule_change() SET search_path = public;

ALTER FUNCTION public.create_order_secure(
    uuid, numeric, numeric, numeric, numeric, text, text, text, text, timestamp with time zone, 
    text, numeric, numeric, jsonb, character varying, character varying, character varying, 
    character varying, character varying, character varying, character varying, text, uuid, numeric, numeric
) SET search_path = public;


-- ==========================================
-- Part 2: Revoke/Grant Function Executions
-- ==========================================

-- Revoke default public execution from critical functions
REVOKE EXECUTE ON FUNCTION public.create_order_secure(
    uuid, numeric, numeric, numeric, numeric, text, text, text, text, timestamp with time zone, 
    text, numeric, numeric, jsonb, character varying, character varying, character varying, 
    character varying, character varying, character varying, character varying, text, uuid, numeric, numeric
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_order_secure(
    uuid, numeric, numeric, numeric, numeric, text, text, text, text, timestamp with time zone, 
    text, numeric, numeric, jsonb, character varying, character varying, character varying, 
    character varying, character varying, character varying, character varying, text, uuid, numeric, numeric
) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.verify_order_otp(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_order_otp(uuid, text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.bulk_update_product_prices(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bulk_update_product_prices(jsonb) TO service_role;

REVOKE EXECUTE ON FUNCTION public.recalculate_mart_inventory_customer_prices() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_mart_inventory_customer_prices() TO service_role;

REVOKE EXECUTE ON FUNCTION public.fn_sync_mart_inventory_customer_price() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_sync_mart_inventory_customer_price() TO service_role;

REVOKE EXECUTE ON FUNCTION public.fn_sync_mart_inventory_on_margin_rule_change() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_sync_mart_inventory_on_margin_rule_change() TO service_role;

REVOKE EXECUTE ON FUNCTION public.sync_mart_inventory_customer_price_trigger() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_mart_inventory_customer_price_trigger() TO service_role;

REVOKE EXECUTE ON FUNCTION public.exec_sql(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.apply_referral_code(character varying) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_referral_code(character varying) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_active_sessions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_active_sessions() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.revoke_all_other_sessions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_all_other_sessions() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.revoke_session(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_session(uuid) TO authenticated, service_role;


-- ==========================================
-- Part 3: Add Covering Indexes on Foreign Keys
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON public.cart_items (product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items (product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_mart_inventory_product_id ON public.mart_inventory (product_id);
CREATE INDEX IF NOT EXISTS idx_orders_mart_id ON public.orders (mart_id);
CREATE INDEX IF NOT EXISTS idx_orders_rider_id ON public.orders (rider_id);
CREATE INDEX IF NOT EXISTS idx_orders_address_id ON public.orders (address_id);
CREATE INDEX IF NOT EXISTS idx_margin_rules_product_id ON public.margin_rules (product_id);
CREATE INDEX IF NOT EXISTS idx_margin_rules_category_id ON public.margin_rules (category_id);
CREATE INDEX IF NOT EXISTS idx_brand_city_availability_city_slug ON public.brand_city_availability (city_slug);
CREATE INDEX IF NOT EXISTS idx_capture_sessions_mart_id ON public.capture_sessions (mart_id);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON public.categories (parent_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_product_id ON public.inventory_logs (product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_mart_id ON public.inventory_movements (mart_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_id ON public.inventory_movements (product_id);
CREATE INDEX IF NOT EXISTS idx_marts_city_id ON public.marts (city_id);
CREATE INDEX IF NOT EXISTS idx_marts_owner_id ON public.marts (owner_id);
CREATE INDEX IF NOT EXISTS idx_marts_city_slug ON public.marts (city_slug);
CREATE INDEX IF NOT EXISTS idx_product_requests_user_id ON public.product_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_products_mart_id ON public.products (mart_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON public.referrals (referrer_id);
CREATE INDEX IF NOT EXISTS idx_return_requests_user_id ON public.return_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON public.reviews (product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_order_id ON public.reviews (order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON public.reviews (user_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_sender_id ON public.support_ticket_messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_ticket_id ON public.support_ticket_messages (ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_order_id ON public.support_tickets (order_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets (user_id);
CREATE INDEX IF NOT EXISTS idx_user_coupons_offer_id ON public.user_coupons (offer_id);
CREATE INDEX IF NOT EXISTS idx_user_coupons_order_id ON public.user_coupons (order_id);
CREATE INDEX IF NOT EXISTS idx_users_referred_by_id ON public.users (referred_by_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id ON public.wallet_transactions (wallet_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_product_id ON public.wishlist (product_id);


-- ==========================================
-- Part 4: Harden RLS Policies
-- ==========================================

-- Capture Sessions: Only admins, mart operators, or owners of the mart should select/update
DROP POLICY IF EXISTS "Allow public select of capture sessions" ON public.capture_sessions;
CREATE POLICY "Allow authenticated select of capture sessions" ON public.capture_sessions
    FOR SELECT
    TO authenticated
    USING (
        (SELECT public.is_admin()) OR 
        (SELECT public.is_mart_operator()) OR
        (auth.uid() IN (SELECT owner_id FROM public.marts WHERE id = mart_id))
    );

DROP POLICY IF EXISTS "Allow public update of capture sessions" ON public.capture_sessions;
CREATE POLICY "Allow authenticated update of capture sessions" ON public.capture_sessions
    FOR UPDATE
    TO authenticated
    USING (
        (SELECT public.is_admin()) OR 
        (SELECT public.is_mart_operator()) OR
        (auth.uid() IN (SELECT owner_id FROM public.marts WHERE id = mart_id))
    );

-- Contact Messages: Optimize selects/deletes with subqueries
DROP POLICY IF EXISTS "Enable read for admin users" ON public.contact_messages;
CREATE POLICY "Enable read for admin users" ON public.contact_messages
    FOR SELECT
    TO authenticated
    USING ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "Enable delete for admin users" ON public.contact_messages;
CREATE POLICY "Enable delete for admin users" ON public.contact_messages
    FOR DELETE
    TO authenticated
    USING ((SELECT public.is_admin()));

-- Product Requests: Impersonation protection
DROP POLICY IF EXISTS "Anyone can create a product request" ON public.product_requests;
CREATE POLICY "Users can create product requests for themselves" ON public.product_requests
    FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view their own product requests" ON public.product_requests;
CREATE POLICY "Users can view their own product requests" ON public.product_requests
    FOR SELECT
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);


-- ==========================================
-- Part 5: Optimize Performance of Core Policies
-- ==========================================

-- Cart Items
DROP POLICY IF EXISTS "Users can manage own cart" ON public.cart_items;
CREATE POLICY "Users can manage own cart" ON public.cart_items
    FOR ALL
    TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

-- Addresses
DROP POLICY IF EXISTS "Users can manage own addresses" ON public.addresses;
CREATE POLICY "Users can manage own addresses" ON public.addresses
    FOR ALL
    TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

-- Orders
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
CREATE POLICY "Users can view own orders" ON public.orders
    FOR SELECT
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can create orders" ON public.orders;
CREATE POLICY "Users can create orders" ON public.orders
    FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can cancel own pending orders" ON public.orders;
CREATE POLICY "Users can cancel own pending orders" ON public.orders
    FOR UPDATE
    TO authenticated
    USING (((SELECT auth.uid()) = user_id) AND (status::text = ANY (ARRAY['pending'::text, 'placed'::text])))
    WITH CHECK (((SELECT auth.uid()) = user_id) AND (status::text = 'cancelled'::text));

-- Order Items
DROP POLICY IF EXISTS "Users can view own order items" ON public.order_items;
CREATE POLICY "Users can view own order items" ON public.order_items
    FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.orders
        WHERE orders.id = order_items.order_id 
          AND orders.user_id = (SELECT auth.uid())
    ));

-- Users Profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT
    TO authenticated
    USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE
    TO authenticated
    USING ((SELECT auth.uid()) = id)
    WITH CHECK ((SELECT auth.uid()) = id);
