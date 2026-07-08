-- =========================================================================
-- OZO MART - MIGRATION 20260708170000: ALLOW BLINKIT & BIGBASKET ENRICHMENT SOURCES
-- =========================================================================

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS check_enrichment_source;
ALTER TABLE public.products ADD CONSTRAINT check_enrichment_source CHECK (
  enrichment_source IN ('imported', 'off', 'amazon', 'jiomart', 'merchant_upload', 'placeholder', 'merchant_webcam', 'merchant_phone', 'bigbasket', 'blinkit')
);
