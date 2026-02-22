-- Migration to add allow_invoice column to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS allow_invoice BOOLEAN DEFAULT true;
