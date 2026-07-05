-- Migration: Margin Rule and Mart Inventory Sync Triggers
-- Created: 2026-07-05

-- 1. Create or replace the helper function to calculate customer_price on insert/update of mart_inventory
CREATE OR REPLACE FUNCTION public.fn_sync_mart_inventory_customer_price()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- If custom price is disabled or customer price is null/invalid, automatically calculate it via the 5-tier logic
    IF NEW.is_custom_price = false OR NEW.customer_price IS NULL OR NEW.customer_price <= 0 THEN
        NEW.customer_price := public.calculate_customer_price(NEW.mart_price, NEW.product_id);
    END IF;
    RETURN NEW;
END;
$$;

-- 2. Drop trigger if exists and create it on mart_inventory
DROP TRIGGER IF EXISTS trg_sync_mart_inventory_customer_price ON public.mart_inventory;
CREATE TRIGGER trg_sync_mart_inventory_customer_price
    BEFORE INSERT OR UPDATE ON public.mart_inventory
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_sync_mart_inventory_customer_price();

-- 3. Create function to handle changes in margin_rules and update affected mart_inventory records
CREATE OR REPLACE FUNCTION public.fn_sync_mart_inventory_on_margin_rule_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        -- Update products in old rule's scope
        IF OLD.product_id IS NOT NULL THEN
            UPDATE public.mart_inventory 
            SET customer_price = public.calculate_customer_price(mart_price, product_id)
            WHERE product_id = OLD.product_id AND is_custom_price = false;
        ELSIF OLD.category_id IS NOT NULL AND OLD.brand IS NOT NULL AND OLD.brand <> '' THEN
            UPDATE public.mart_inventory 
            SET customer_price = public.calculate_customer_price(mart_price, product_id)
            WHERE is_custom_price = false 
              AND product_id IN (SELECT id FROM public.products WHERE category_id = OLD.category_id AND lower(brand) = lower(OLD.brand));
        ELSIF OLD.brand IS NOT NULL AND OLD.brand <> '' THEN
            UPDATE public.mart_inventory 
            SET customer_price = public.calculate_customer_price(mart_price, product_id)
            WHERE is_custom_price = false 
              AND product_id IN (SELECT id FROM public.products WHERE lower(brand) = lower(OLD.brand));
        ELSIF OLD.category_id IS NOT NULL THEN
            UPDATE public.mart_inventory 
            SET customer_price = public.calculate_customer_price(mart_price, product_id)
            WHERE is_custom_price = false 
              AND product_id IN (SELECT id FROM public.products WHERE category_id = OLD.category_id);
        ELSE
            -- Default rule updated/deleted: update all
            UPDATE public.mart_inventory 
            SET customer_price = public.calculate_customer_price(mart_price, product_id)
            WHERE is_custom_price = false;
        END IF;
    ELSE
        -- INSERT or UPDATE
        -- Update products in new rule's scope
        IF NEW.product_id IS NOT NULL THEN
            UPDATE public.mart_inventory 
            SET customer_price = public.calculate_customer_price(mart_price, product_id)
            WHERE product_id = NEW.product_id AND is_custom_price = false;
        ELSIF NEW.category_id IS NOT NULL AND NEW.brand IS NOT NULL AND NEW.brand <> '' THEN
            UPDATE public.mart_inventory 
            SET customer_price = public.calculate_customer_price(mart_price, product_id)
            WHERE is_custom_price = false 
              AND product_id IN (SELECT id FROM public.products WHERE category_id = NEW.category_id AND lower(brand) = lower(NEW.brand));
        ELSIF NEW.brand IS NOT NULL AND NEW.brand <> '' THEN
            UPDATE public.mart_inventory 
            SET customer_price = public.calculate_customer_price(mart_price, product_id)
            WHERE is_custom_price = false 
              AND product_id IN (SELECT id FROM public.products WHERE lower(brand) = lower(NEW.brand));
        ELSIF NEW.category_id IS NOT NULL THEN
            UPDATE public.mart_inventory 
            SET customer_price = public.calculate_customer_price(mart_price, product_id)
            WHERE is_custom_price = false 
              AND product_id IN (SELECT id FROM public.products WHERE category_id = NEW.category_id);
        ELSE
            -- Default rule: update all
            UPDATE public.mart_inventory 
            SET customer_price = public.calculate_customer_price(mart_price, product_id)
            WHERE is_custom_price = false;
        END IF;

        -- If UPDATE and the scope changed, revert old scope products as well
        IF TG_OP = 'UPDATE' THEN
            IF OLD.product_id IS NOT NULL AND (NEW.product_id IS NULL OR NEW.product_id <> OLD.product_id) THEN
                UPDATE public.mart_inventory 
                SET customer_price = public.calculate_customer_price(mart_price, product_id)
                WHERE product_id = OLD.product_id AND is_custom_price = false;
            ELSIF OLD.category_id IS NOT NULL AND (NEW.category_id IS NULL OR NEW.category_id <> OLD.category_id) THEN
                UPDATE public.mart_inventory 
                SET customer_price = public.calculate_customer_price(mart_price, product_id)
                WHERE is_custom_price = false 
                  AND product_id IN (SELECT id FROM public.products WHERE category_id = OLD.category_id);
            END IF;
        END IF;
    END IF;

    RETURN NULL;
END;
$$;

-- 4. Drop trigger if exists and create it on margin_rules
DROP TRIGGER IF EXISTS trg_margin_rules_sync_inventory ON public.margin_rules;
CREATE TRIGGER trg_margin_rules_sync_inventory
    AFTER INSERT OR UPDATE OR DELETE ON public.margin_rules
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_sync_mart_inventory_on_margin_rule_change();

-- 5. Force initial calculation for all active inventory matching the rules
UPDATE public.mart_inventory 
SET customer_price = public.calculate_customer_price(mart_price, product_id)
WHERE is_custom_price = false OR customer_price IS NULL;
