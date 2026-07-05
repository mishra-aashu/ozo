-- Allow mart operators to insert new products
DROP POLICY IF EXISTS "Mart operators can insert products" ON public.products;

CREATE POLICY "Mart operators can insert products" ON public.products
  FOR INSERT TO authenticated
  WITH CHECK (public.is_mart_operator());
