-- Create verified_payments table
CREATE TABLE IF NOT EXISTS public.verified_payments (
    id TEXT PRIMARY KEY,
    amount NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) for verified_payments
ALTER TABLE public.verified_payments ENABLE ROW LEVEL SECURITY;

-- Drop policy if exists and create select policy
DROP POLICY IF EXISTS "Allow read access to all" ON public.verified_payments;
CREATE POLICY "Allow read access to all" ON public.verified_payments
    FOR SELECT USING (true);

-- Ensure orders table has unique transaction_id constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'public.orders'::regclass AND conname = 'unique_transaction_id'
    ) THEN
        ALTER TABLE public.orders ADD CONSTRAINT unique_transaction_id UNIQUE (transaction_id);
    END IF;
END $$;

-- Create or update the check_order_payment trigger function
CREATE OR REPLACE FUNCTION public.check_order_payment()
RETURNS TRIGGER AS $$
BEGIN
  -- If it's an online payment, it must be paid and verified
  IF NEW.payment_method = 'online' THEN
    IF NEW.payment_status IS DISTINCT FROM 'paid' THEN
      RAISE EXCEPTION 'Online orders must have paid status';
    END IF;

    IF NEW.transaction_id IS NULL THEN
      RAISE EXCEPTION 'Transaction ID is required for paid online orders';
    END IF;

    -- Check if transaction_id exists in verified_payments and amount matches
    IF NOT EXISTS (
      SELECT 1 FROM public.verified_payments
      WHERE id = NEW.transaction_id AND amount = NEW.total
    ) THEN
      RAISE EXCEPTION 'Payment verification failed. Invalid or mismatching transaction ID or amount.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger on orders table
DROP TRIGGER IF EXISTS enforce_order_payment_verification ON public.orders;
CREATE TRIGGER enforce_order_payment_verification
BEFORE INSERT OR UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.check_order_payment();
