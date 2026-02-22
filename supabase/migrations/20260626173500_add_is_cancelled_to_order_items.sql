-- Add is_cancelled column to order_items
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS is_cancelled BOOLEAN NOT NULL DEFAULT false;
