-- =========================================================================
-- OZO EXPRESS - IN-APP DELIVERY CONFIRMATION OTP SCHEMA & TRIGGERS
-- =========================================================================

-- 1. Add delivery_otp and delivery_proof_type columns to public.orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS delivery_otp VARCHAR(6);

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS delivery_proof_type VARCHAR(20) DEFAULT 'in_app_otp';

-- 2. Trigger function to auto-generate 4-digit numeric OTP on order insert if not provided
CREATE OR REPLACE FUNCTION public.generate_order_delivery_otp()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.delivery_otp IS NULL OR length(trim(NEW.delivery_otp)) < 4 THEN
        -- Generate random 4-digit PIN between 1000 and 9999
        NEW.delivery_otp := LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Bind trigger to public.orders table
DROP TRIGGER IF EXISTS trg_generate_delivery_otp ON public.orders;

CREATE TRIGGER trg_generate_delivery_otp
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.generate_order_delivery_otp();

-- 4. Backfill existing orders that do not have a delivery_otp
UPDATE public.orders 
SET delivery_otp = LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0')
WHERE delivery_otp IS NULL;

-- 5. Add index for faster query lookup
CREATE INDEX IF NOT EXISTS idx_orders_delivery_otp ON public.orders(delivery_otp);
