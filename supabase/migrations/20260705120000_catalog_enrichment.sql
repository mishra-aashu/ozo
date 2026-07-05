-- =========================================================================
-- OZO MART - MIGRATION 20260705120000: CATALOG ENRICHMENT SYSTEM
-- =========================================================================

-- 1. Add enrichment columns to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS enrichment_status TEXT DEFAULT 'enriched';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS enrichment_source TEXT DEFAULT 'imported';

-- 2. Add constraints to prevent invalid statuses/sources
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS check_enrichment_status;
ALTER TABLE public.products ADD CONSTRAINT check_enrichment_status CHECK (
  enrichment_status IN ('enriched', 'pending_enrichment', 'pending_photo', 'merchant_upload')
);

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS check_enrichment_source;
ALTER TABLE public.products ADD CONSTRAINT check_enrichment_source CHECK (
  enrichment_source IN ('imported', 'off', 'amazon', 'jiomart', 'merchant_upload', 'placeholder')
);

-- 3. Create indexes for quick barcode query & status checks
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_enrichment_status ON public.products(enrichment_status);

-- 4. Set default value for existing products
UPDATE public.products 
SET enrichment_status = 'enriched', enrichment_source = 'imported' 
WHERE enrichment_status IS NULL;

-- 5. Create storage bucket for merchant uploads if it does not exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('mart-assets', 'mart-assets', true) 
ON CONFLICT (id) DO NOTHING;

-- 6. Storage Security Policies for 'mart-assets'
-- Enable public SELECT access to all objects in 'mart-assets'
DROP POLICY IF EXISTS "Public read access to mart-assets objects" ON storage.objects;
CREATE POLICY "Public read access to mart-assets objects" ON storage.objects
  FOR SELECT USING (bucket_id = 'mart-assets');

-- Enable authenticated users to insert/upload objects into 'mart-assets'
DROP POLICY IF EXISTS "Authenticated users can upload to mart-assets" ON storage.objects;
CREATE POLICY "Authenticated users can upload to mart-assets" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'mart-assets'
  );

-- Enable authenticated users to update/delete objects they uploaded
DROP POLICY IF EXISTS "Authenticated users can update mart-assets" ON storage.objects;
CREATE POLICY "Authenticated users can update mart-assets" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'mart-assets'
  );
