-- Migration: Adjust Capture Sessions RLS for Anonymous Phone Upload Flow
-- Created: 2026-07-05
-- Objective: Ensure phone upload flow works anonymously using the sessionId token without blocking dashboard access.

-- Drop old strict authenticated-only policies
DROP POLICY IF EXISTS "Allow authenticated select of capture sessions" ON public.capture_sessions;
DROP POLICY IF EXISTS "Allow authenticated update of capture sessions" ON public.capture_sessions;
DROP POLICY IF EXISTS "Allow public select of capture sessions" ON public.capture_sessions;
DROP POLICY IF EXISTS "Allow public update of capture sessions" ON public.capture_sessions;

-- Create hardened public policies that allow anonymous access ONLY if the session is unexpired
CREATE POLICY "Allow select of capture sessions" ON public.capture_sessions
    FOR SELECT
    TO public
    USING (
        (SELECT public.is_admin()) OR 
        (SELECT public.is_mart_operator()) OR
        ((SELECT auth.uid()) IN (SELECT owner_id FROM public.marts WHERE id = mart_id)) OR
        (expires_at > now()) -- Allows anonymous phone flow to read active sessions by sessionId
    );

CREATE POLICY "Allow update of capture sessions" ON public.capture_sessions
    FOR UPDATE
    TO public
    USING (
        (SELECT public.is_admin()) OR 
        (SELECT public.is_mart_operator()) OR
        ((SELECT auth.uid()) IN (SELECT owner_id FROM public.marts WHERE id = mart_id)) OR
        (expires_at > now() AND status = 'pending')
    )
    WITH CHECK (
        (SELECT public.is_admin()) OR 
        (SELECT public.is_mart_operator()) OR
        ((SELECT auth.uid()) IN (SELECT owner_id FROM public.marts WHERE id = mart_id)) OR
        (status = 'completed')
    );
