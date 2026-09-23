-- Migration: Grant EXECUTE permissions on fuzzy search RPCs
-- Created: 2026-07-28
-- Objective: Fix 42501 permission denied for search_products_fuzzy and get_spelling_suggestion

GRANT EXECUTE ON FUNCTION public.search_products_fuzzy(text, double precision) TO anon, authenticated, public, service_role;
GRANT EXECUTE ON FUNCTION public.get_spelling_suggestion(text) TO anon, authenticated, public, service_role;

ALTER FUNCTION public.search_products_fuzzy(text, double precision) SECURITY DEFINER;
ALTER FUNCTION public.get_spelling_suggestion(text) SECURITY DEFINER;
