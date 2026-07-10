-- Enable trigram extension for fuzzy name matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Function: match_products_for_import
-- Input: JSON array of objects [{ barcode, name }]
-- Output: JSON with matched, unmatched, and confidence scores
CREATE OR REPLACE FUNCTION public.match_products_for_import(
  import_data jsonb  -- e.g. '[{"barcode":"123","name":"Milk"}, ...]'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  item jsonb;
  matched_items jsonb := '[]'::jsonb;
  unmatched_items jsonb := '[]'::jsonb;
  product record;
  product_json jsonb;
  confidence text;
  max_similarity real;
  best_product_id UUID;
BEGIN
  -- Iterate over each item in the JSON array
  FOR item IN SELECT * FROM jsonb_array_elements(import_data) AS elem
  LOOP
    confidence := 'none';
    product := NULL;
    best_product_id := NULL;

    -- 1. Try exact barcode match first
    IF item->>'barcode' IS NOT NULL AND item->>'barcode' != '' THEN
      SELECT * INTO product
      FROM public.products
      WHERE barcode = item->>'barcode'
      LIMIT 1;

      IF FOUND THEN
        confidence := 'high';
      END IF;
    END IF;

    -- 2. If not matched, try name match using trigram similarity
    IF confidence = 'none' AND item->>'name' IS NOT NULL AND item->>'name' != '' THEN
      SELECT p.id, similarity(p.name, item->>'name') INTO best_product_id, max_similarity
      FROM public.products p
      WHERE similarity(p.name, item->>'name') > 0.4
      ORDER BY similarity(p.name, item->>'name') DESC
      LIMIT 1;

      IF best_product_id IS NOT NULL THEN
        SELECT * INTO product FROM public.products WHERE id = best_product_id;
        
        IF max_similarity >= 0.7 THEN
          confidence := 'high';
        ELSIF max_similarity >= 0.5 THEN
          confidence := 'medium';
        ELSE
          confidence := 'low';
        END IF;
      END IF;
    END IF;

    -- Build result object
    IF confidence != 'none' THEN
      product_json := jsonb_build_object(
        'id', product.id,
        'name', product.name,
        'slug', product.slug,
        'brand', product.brand,
        'barcode', product.barcode,
        'unit', product.unit,
        'image_url', product.image_url,
        'mrp', product.mrp,
        'price', product.price
      );
      matched_items := matched_items || jsonb_build_object(
        'csv_data', item,
        'product', product_json,
        'match_confidence', confidence
      );
    ELSE
      unmatched_items := unmatched_items || item;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'matched', matched_items,
    'unmatched', unmatched_items,
    'total', jsonb_array_length(import_data::jsonb)
  );
END;
$$;

-- Create trigram index on products.name for performance optimization
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON public.products USING GIN (name gin_trgm_ops);
