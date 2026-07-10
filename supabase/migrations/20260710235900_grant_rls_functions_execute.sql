-- Migration: Grant EXECUTE permissions on RLS helper functions to PUBLIC
-- Created: 2026-07-10
-- Objective: Resolve database-wide 42501 (insufficient_privilege) / 401 Unauthorized errors
-- when anonymous users query tables that have RLS policies invoking is_admin(), is_mart_operator(), or is_captain().

GRANT EXECUTE ON FUNCTION public.is_admin() TO public;
GRANT EXECUTE ON FUNCTION public.is_mart_operator() TO public;
GRANT EXECUTE ON FUNCTION public.is_captain() TO public;
