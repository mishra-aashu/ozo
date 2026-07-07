-- Create mart_pending_products table
CREATE TABLE IF NOT EXISTS public.mart_pending_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mart_id UUID NOT NULL REFERENCES public.marts(id) ON DELETE CASCADE,
  barcode VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  brand VARCHAR(255),
  unit VARCHAR(100),
  stock_quantity INTEGER DEFAULT 0,
  mart_price NUMERIC,
  mart_mrp NUMERIC,
  raw_csv_data JSONB DEFAULT '{}'::jsonb,
  enrich_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'enriched', 'imported'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.mart_pending_products ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mart_pending_products_mart_id ON public.mart_pending_products(mart_id);
CREATE INDEX IF NOT EXISTS idx_mart_pending_products_barcode ON public.mart_pending_products(barcode);
CREATE INDEX IF NOT EXISTS idx_mart_pending_products_enrich_status ON public.mart_pending_products(enrich_status);

-- Policies

-- SELECT: Admins, Mart Operators, or Mart Owners
CREATE POLICY "Allow select of pending products" ON public.mart_pending_products
    FOR SELECT
    TO authenticated
    USING (
        (SELECT public.is_admin()) OR 
        (SELECT public.is_mart_operator()) OR
        (auth.uid() IN (SELECT owner_id FROM public.marts WHERE id = mart_id))
    );

-- INSERT: Admins, Mart Operators, or Mart Owners
CREATE POLICY "Allow insert of pending products" ON public.mart_pending_products
    FOR INSERT
    TO authenticated
    WITH CHECK (
        (SELECT public.is_admin()) OR 
        (SELECT public.is_mart_operator()) OR
        (auth.uid() IN (SELECT owner_id FROM public.marts WHERE id = mart_id))
    );

-- UPDATE: Admins, Mart Operators, or Mart Owners
CREATE POLICY "Allow update of pending products" ON public.mart_pending_products
    FOR UPDATE
    TO authenticated
    USING (
        (SELECT public.is_admin()) OR 
        (SELECT public.is_mart_operator()) OR
        (auth.uid() IN (SELECT owner_id FROM public.marts WHERE id = mart_id))
    )
    WITH CHECK (
        (SELECT public.is_admin()) OR 
        (SELECT public.is_mart_operator()) OR
        (auth.uid() IN (SELECT owner_id FROM public.marts WHERE id = mart_id))
    );

-- DELETE: Admins, Mart Operators, or Mart Owners
CREATE POLICY "Allow delete of pending products" ON public.mart_pending_products
    FOR DELETE
    TO authenticated
    USING (
        (SELECT public.is_admin()) OR 
        (SELECT public.is_mart_operator()) OR
        (auth.uid() IN (SELECT owner_id FROM public.marts WHERE id = mart_id))
    );
