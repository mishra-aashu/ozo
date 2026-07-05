-- Migration: Sync product catalog availability based on mart inventory stock and status
-- Description: Creates triggers and functions to automatically synchronize products.is_available and products.quantity_available with active mart stock levels.

-- 1. Trigger function for mart_inventory changes
CREATE OR REPLACE FUNCTION public.fn_sync_product_catalog_availability()
RETURNS TRIGGER AS $$
DECLARE
    v_product_id UUID;
    v_total_stock INT;
    v_is_available BOOLEAN;
BEGIN
    -- Determine which product_id we are updating
    IF TG_OP = 'DELETE' THEN
        v_product_id := OLD.product_id;
    ELSE
        v_product_id := NEW.product_id;
    END IF;

    IF v_product_id IS NOT NULL THEN
        -- Calculate total stock and availability across all active/live marts
        SELECT 
            COALESCE(SUM(mi.stock_quantity), 0),
            COALESCE(BOOL_OR(mi.is_available = true AND mi.stock_quantity > 0 AND m.is_active = true), false)
        INTO 
            v_total_stock,
            v_is_available
        FROM public.mart_inventory mi
        JOIN public.marts m ON m.id = mi.mart_id
        WHERE mi.product_id = v_product_id;

        -- Update products table
        UPDATE public.products
        SET 
            quantity_available = v_total_stock,
            is_available = v_is_available,
            updated_at = NOW()
        WHERE id = v_product_id;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trg_sync_product_catalog_availability ON public.mart_inventory;

-- Create trigger on mart_inventory
CREATE TRIGGER trg_sync_product_catalog_availability
AFTER INSERT OR UPDATE OR DELETE ON public.mart_inventory
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_product_catalog_availability();


-- 2. Trigger function for mart status changes (is_active)
CREATE OR REPLACE FUNCTION public.fn_sync_product_catalog_on_mart_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger if is_active status of the mart changes
    IF OLD.is_active IS DISTINCT FROM NEW.is_active THEN
        -- Recalculate and update catalog values for all products in this mart's inventory
        UPDATE public.products p
        SET 
            quantity_available = sub.total_stock,
            is_available = sub.is_available,
            updated_at = NOW()
        FROM (
            SELECT 
                mi.product_id,
                COALESCE(SUM(mi2.stock_quantity), 0) as total_stock,
                COALESCE(BOOL_OR(mi2.is_available = true AND mi2.stock_quantity > 0 AND m.is_active = true), false) as is_available
            FROM public.mart_inventory mi
            JOIN public.mart_inventory mi2 ON mi2.product_id = mi.product_id
            JOIN public.marts m ON m.id = mi2.mart_id
            WHERE mi.mart_id = NEW.id
            GROUP BY mi.product_id
        ) sub
        WHERE p.id = sub.product_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trg_sync_product_catalog_on_mart_update ON public.marts;

-- Create trigger on marts
CREATE TRIGGER trg_sync_product_catalog_on_mart_update
AFTER UPDATE OF is_active ON public.marts
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_product_catalog_on_mart_update();


-- 3. One-time batch sync to align the entire products catalog with current inventory and mart states
UPDATE public.products p
SET 
    quantity_available = COALESCE(sub.total_stock, 0),
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
