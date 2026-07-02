-- Migration: Add product barcode and seed new marts
-- Path: supabase/migrations/20260620013000_add_product_barcode.sql

-- 1. Add barcode column to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS barcode VARCHAR(100) NULL UNIQUE;

-- 2. Create index on barcode column
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode);

-- 3. Insert or update the two new Rasoi Marts
INSERT INTO public.marts (id, name, slug, address, city_id, city_slug, is_active, owner_id)
VALUES 
  ('8a816e8e-6e28-4b36-9d40-72e05be84f7a', 'Rasoi Mart 1', 'rasoi-mart-1', 'Karma Road', 'c457037b-6e60-4483-ac2b-8c0aeadff371', 'aurangabad-bihar', true, NULL),
  ('8a816e8e-6e28-4b36-9d40-72e05be84f7b', 'Rasoi Mart 2', 'rasoi-mart-2', 'Satyendra Block', 'c457037b-6e60-4483-ac2b-8c0aeadff371', 'aurangabad-bihar', true, NULL)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  city_id = EXCLUDED.city_id,
  city_slug = EXCLUDED.city_slug;

-- 4. Update fuzzy search RPC to prioritize barcode exact match and bypass spelling correction for numeric codes
CREATE OR REPLACE FUNCTION public.search_products_fuzzy(search_term text, similarity_threshold double precision DEFAULT 0.3)
 RETURNS SETOF products
 LANGUAGE plpgsql
AS $function$
DECLARE
  corrected_term text;
  max_match int;
  min_required_match int;
BEGIN
  -- If the search term is a numeric barcode (only digits and length >= 6), we do not run spelling correction.
  IF search_term ~ '^\d+$' AND length(search_term) >= 6 THEN
    corrected_term := search_term;
  ELSE
    -- Try to get spelling suggestion
    SELECT get_spelling_suggestion(search_term) INTO corrected_term;
    
    -- If we got a suggestion, use it as the search term, otherwise use the original
    IF corrected_term IS NULL THEN
      corrected_term := search_term;
    END IF;
  END IF;

  RETURN QUERY
  WITH candidates AS (
    SELECT p.*
    FROM products p
    WHERE 
      p.is_available = true
      AND (
        -- Exact barcode match
        (p.barcode IS NOT NULL AND p.barcode = search_term)
        -- Full-text search match
        OR (p.search_vector @@ websearch_to_tsquery('english', corrected_term))
        -- Or word similarity on name
        OR (word_similarity(corrected_term, p.name) >= similarity_threshold)
        -- Or word similarity on brand
        OR (p.brand IS NOT NULL AND word_similarity(corrected_term, p.brand) >= similarity_threshold)
        -- Or word similarity on tags
        OR EXISTS (
          SELECT 1 FROM unnest(p.tags) tag 
          WHERE word_similarity(corrected_term, tag) >= similarity_threshold
        )
      )
  ),
  query_words AS (
    SELECT DISTINCT unnest(regexp_split_to_array(lower(corrected_term), '\s+')) AS word
  ),
  scored_products AS (
    SELECT 
      c.id,
      (
        SELECT count(distinct qw.word)
        FROM query_words qw
        LEFT JOIN categories cat ON c.category_id = cat.id
        WHERE 
          word_similarity(qw.word, c.name) >= 0.4
          OR (c.brand IS NOT NULL AND word_similarity(qw.word, c.brand) >= 0.4)
          OR EXISTS (SELECT 1 FROM unnest(c.tags) t WHERE word_similarity(qw.word, t) >= 0.4)
          OR (cat.name IS NOT NULL AND word_similarity(qw.word, cat.name) >= 0.4)
      ) as word_match_count
    FROM candidates c
  ),
  max_score AS (
    SELECT COALESCE(max(word_match_count), 0) as max_val FROM scored_products
  )
  SELECT p.*
  FROM candidates p
  JOIN scored_products ps ON p.id = ps.id
  CROSS JOIN max_score ms
  WHERE 
    (p.barcode IS NOT NULL AND p.barcode = search_term) -- Bypass scoring filter for exact barcode match
    OR ps.word_match_count >= (
      CASE 
        WHEN ms.max_val >= 2 THEN 2
        ELSE 1
      END
    )
  ORDER BY 
    (p.barcode IS NOT NULL AND p.barcode = search_term) DESC,
    ps.word_match_count DESC,
    (p.name ILIKE corrected_term) DESC,
    (p.search_vector @@ websearch_to_tsquery('english', corrected_term)) DESC,
    p.is_bestseller DESC,
    p.name ASC;
END;
$function$;
