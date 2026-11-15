-- =========================================================================
-- OZO Production Hardening, Missing Indexes & Idempotency Migration
-- Applied via MCP to Supabase Project: ungxccwdondssatixzlz
-- =========================================================================

-- 1. Create Missing Foreign Key & Lookup Indexes
CREATE INDEX IF NOT EXISTS idx_saved_addresses_user_id ON public.saved_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_user_id ON public.admin_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_products_mart_active ON public.products(mart_id, is_available, category_id);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_user_id ON public.kyc_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON public.error_logs(user_id);

-- 2. Revoke Anon / Public Execution on Sensitive Admin Functions
REVOKE EXECUTE ON FUNCTION public.change_admin_password(text, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.fn_sync_order_items_stock() FROM anon, public;

-- 3. Optimize RLS Policies to use (SELECT auth.uid()) to avoid per-row re-evaluation
ALTER POLICY "Users can select own addresses" ON public.saved_addresses 
USING ((SELECT auth.uid()) = user_id);

ALTER POLICY "Users can insert own addresses" ON public.saved_addresses 
WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER POLICY "Users can update own addresses" ON public.saved_addresses 
USING ((SELECT auth.uid()) = user_id) 
WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER POLICY "Users can delete own addresses" ON public.saved_addresses 
USING ((SELECT auth.uid()) = user_id);

ALTER POLICY "Users can cancel own pending orders" ON public.orders 
USING (
    ((SELECT auth.uid()) = user_id) 
    AND (status::text = ANY (ARRAY['pending'::text, 'placed'::text, 'PLACED_COOLING'::text, 'CONFIRMED_SYSTEM'::text, 'confirmed'::text]))
)
WITH CHECK (
    ((SELECT auth.uid()) = user_id) 
    AND (status::text = ANY (ARRAY['cancelled'::text, 'CANCELLED_BY_USER'::text]))
);

ALTER POLICY "Users can insert own profile" ON public.users 
WITH CHECK ((SELECT auth.uid()) = id);

ALTER POLICY "Users can select own wallet" ON public.user_wallets 
USING ((SELECT auth.uid()) = user_id);

ALTER POLICY "Users can insert own wallet" ON public.user_wallets 
WITH CHECK ((SELECT auth.uid()) = user_id);

-- 4. Payment Webhooks Idempotency Table
CREATE TABLE IF NOT EXISTS public.payment_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gateway_name VARCHAR(50) NOT NULL,
    gateway_event_id VARCHAR(255) NOT NULL UNIQUE,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    payment_id VARCHAR(255),
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    processed_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_webhooks_event_id ON public.payment_webhooks(gateway_event_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_order_id ON public.payment_webhooks(order_id);

ALTER TABLE public.payment_webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on payment_webhooks"
ON public.payment_webhooks FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- 5. Dedicated Atomic Inventory Locking Function
CREATE OR REPLACE FUNCTION public.reserve_product_stock(
    p_mart_id UUID,
    p_product_id UUID,
    p_qty INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_avail_qty INT;
    v_is_avail BOOLEAN;
BEGIN
    IF p_qty <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid quantity');
    END IF;

    IF p_mart_id IS NOT NULL THEN
        SELECT stock_quantity, is_available INTO v_avail_qty, v_is_avail
        FROM public.mart_inventory
        WHERE mart_id = p_mart_id AND product_id = p_product_id
        FOR UPDATE;

        IF NOT FOUND OR NOT v_is_avail OR v_avail_qty < p_qty THEN
            RETURN jsonb_build_object('success', false, 'available_stock', COALESCE(v_avail_qty, 0), 'message', 'Insufficient mart stock');
        END IF;

        UPDATE public.mart_inventory
        SET stock_quantity = stock_quantity - p_qty,
            is_available = CASE WHEN (stock_quantity - p_qty) <= 0 THEN false ELSE true END
        WHERE mart_id = p_mart_id AND product_id = p_product_id;
    ELSE
        SELECT quantity_available, is_available INTO v_avail_qty, v_is_avail
        FROM public.products
        WHERE id = p_product_id
        FOR UPDATE;

        IF NOT FOUND OR NOT v_is_avail OR v_avail_qty < p_qty THEN
            RETURN jsonb_build_object('success', false, 'available_stock', COALESCE(v_avail_qty, 0), 'message', 'Insufficient product stock');
        END IF;

        UPDATE public.products
        SET quantity_available = quantity_available - p_qty,
            is_available = CASE WHEN (quantity_available - p_qty) <= 0 THEN false ELSE true END
        WHERE id = p_product_id;
    END IF;

    RETURN jsonb_build_object('success', true, 'remaining_stock', (v_avail_qty - p_qty));
END;
$$;

GRANT EXECUTE ON FUNCTION public.reserve_product_stock(UUID, UUID, INT) TO authenticated, service_role;
