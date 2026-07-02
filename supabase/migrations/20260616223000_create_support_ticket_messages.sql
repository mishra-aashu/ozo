-- Create support_ticket_messages table
CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.users(id),
    sender_role VARCHAR(50) NOT NULL CHECK (sender_role IN ('user', 'agent', 'system', 'bot')),
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Users can view messages for their own tickets" ON public.support_ticket_messages;
DROP POLICY IF EXISTS "Users can insert messages for their own tickets" ON public.support_ticket_messages;
DROP POLICY IF EXISTS "Admins/Agents can view and insert messages" ON public.support_ticket_messages;

-- Policy 1: Users can view messages for their own tickets
CREATE POLICY "Users can view messages for their own tickets" ON public.support_ticket_messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.support_tickets
            WHERE public.support_tickets.id = ticket_id
            AND public.support_tickets.user_id = auth.uid()
        )
    );

-- Policy 2: Users can insert messages for their own tickets
CREATE POLICY "Users can insert messages for their own tickets" ON public.support_ticket_messages
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.support_tickets
            WHERE public.support_tickets.id = ticket_id
            AND public.support_tickets.user_id = auth.uid()
        )
        AND (sender_id = auth.uid() OR sender_id IS NULL)
    );

-- Policy 3: Admins/Agents can view and manage all messages
CREATE POLICY "Admins/Agents can view and insert messages" ON public.support_ticket_messages
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE public.users.id = auth.uid()
            AND public.users.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE public.users.id = auth.uid()
            AND public.users.role = 'admin'
        )
    );

-- Update RLS policies on support_tickets table to allow admin access
DROP POLICY IF EXISTS "Admins can manage all tickets" ON public.support_tickets;

CREATE POLICY "Admins can manage all tickets" ON public.support_tickets
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE public.users.id = auth.uid()
            AND public.users.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE public.users.id = auth.uid()
            AND public.users.role = 'admin'
        )
    );
