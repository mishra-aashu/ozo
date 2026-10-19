-- Trigger to ensure only a single default address exists per user
-- Atomically resets other addresses when a new or updated address is set as default

CREATE OR REPLACE FUNCTION public.handle_single_default_address()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true AND NEW.user_id IS NOT NULL THEN
    UPDATE public.addresses
    SET is_default = false
    WHERE user_id = NEW.user_id 
      AND id IS DISTINCT FROM NEW.id 
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_single_default_address'
  ) THEN
    CREATE TRIGGER trg_single_default_address
    BEFORE INSERT OR UPDATE OF is_default ON public.addresses
    FOR EACH ROW
    WHEN (NEW.is_default = true)
    EXECUTE FUNCTION public.handle_single_default_address();
  END IF;
END $$;
