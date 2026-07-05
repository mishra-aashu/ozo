-- =========================================================================
-- OZO MART - MIGRATION 20260705185500: ADD PRODUCT ID TO CAPTURE SESSIONS
-- =========================================================================

ALTER TABLE public.capture_sessions ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id) ON DELETE SET NULL;
