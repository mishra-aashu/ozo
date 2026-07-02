-- Add columns to order_items
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS is_packed BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS packed_quantity INTEGER NOT NULL DEFAULT 0;

-- Enable update policy for mart operators on order_items
CREATE POLICY "Mart operators can update order items" ON order_items
  FOR UPDATE
  TO authenticated
  USING (is_mart_operator())
  WITH CHECK (is_mart_operator());
