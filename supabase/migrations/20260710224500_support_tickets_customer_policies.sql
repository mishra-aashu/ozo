-- Migration: Add customer RLS policies on support_tickets table
-- Created: 2026-07-10
-- Objective: Allow authenticated users to create support tickets and view their own tickets.

-- Drop existing customer policies if any exist
DROP POLICY IF EXISTS "Users can view own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users can insert own tickets" ON public.support_tickets;

-- Policy 1: Users can view their own support tickets
CREATE POLICY "Users can view own tickets" ON public.support_tickets
    FOR SELECT
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

-- Policy 2: Users can insert their own support tickets
CREATE POLICY "Users can insert own tickets" ON public.support_tickets
    FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);
