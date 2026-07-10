-- Migration: Harden rate limiter triggers to be SECURITY DEFINER
-- Created: 2026-07-10
-- Objective: Fix "permission denied for schema security" error when authenticated/anonymous users invoke database triggers that query security.check_db_rate_limit.

-- 1. Recreate trg_enforce_order_rate_limit with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.trg_enforce_order_rate_limit()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM security.check_db_rate_limit('create_order', 5, INTERVAL '10 minutes');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Recreate trg_enforce_review_rate_limit with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.trg_enforce_review_rate_limit()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM security.check_db_rate_limit('add_review', 3, INTERVAL '5 minutes');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Recreate trg_enforce_contact_rate_limit with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.trg_enforce_contact_rate_limit()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM security.check_db_rate_limit('submit_contact', 3, INTERVAL '10 minutes');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Recreate trg_enforce_ticket_rate_limit with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.trg_enforce_ticket_rate_limit()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM security.check_db_rate_limit('create_ticket', 3, INTERVAL '10 minutes');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
