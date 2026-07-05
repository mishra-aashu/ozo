-- =========================================================================
-- OZO MART - MIGRATION 20260705185000: WEBCAM AND PHONE ENRICHMENT SOURCES
-- =========================================================================

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS check_enrichment_source;
ALTER TABLE public.products ADD CONSTRAINT check_enrichment_source CHECK (
  enrichment_source IN ('imported', 'off', 'amazon', 'jiomart', 'merchant_upload', 'placeholder', 'merchant_webcam', 'merchant_phone')
);
