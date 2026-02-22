-- Create security schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS security;

-- Create rate limit tracking table
CREATE TABLE IF NOT EXISTS security.rate_limits (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID,                     -- Null for anonymous requests
    -- Stored generated column to resolve NULL uniqueness in PostgreSQL
    user_id_fixed UUID GENERATED ALWAYS AS (COALESCE(user_id, '00000000-0000-0000-0000-000000000000')) STORED,
    ip_address TEXT NOT NULL,         -- Client IP address
    action VARCHAR(100) NOT NULL,     -- Action name (e.g., 'create_order', 'add_review')
    bucket_start TIMESTAMP WITH TIME ZONE NOT NULL, -- Current window time bucket
    request_count INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Unique index to handle upserts properly across authenticated & anonymous requests
CREATE UNIQUE INDEX IF NOT EXISTS unique_rate_limit_bucket 
ON security.rate_limits (user_id_fixed, ip_address, action, bucket_start);

-- Core Rate Limiter Function
CREATE OR REPLACE FUNCTION security.check_db_rate_limit(
    p_action VARCHAR,
    p_max_requests INT,
    p_window_interval INTERVAL
) RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID;
    v_ip_address TEXT;
    v_bucket_start TIMESTAMP WITH TIME ZONE;
    v_current_count INT;
    v_headers TEXT;
BEGIN
    -- 1. Extract Authenticated User ID (if logged in)
    BEGIN
        v_user_id := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        v_user_id := NULL;
    END;

    -- 2. Extract Client IP Address from PostgREST headers
    BEGIN
        v_headers := current_setting('request.headers', true);
        IF v_headers IS NOT NULL AND v_headers <> '' THEN
            v_ip_address := v_headers::json->>'x-forwarded-for';
            -- Split in case of comma-separated proxy IPs
            IF v_ip_address IS NOT NULL THEN
                v_ip_address := split_part(v_ip_address, ',', 1);
            END IF;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_ip_address := NULL;
    END;

    -- Fallback to local/unknown if IP extraction fails
    IF v_ip_address IS NULL OR v_ip_address = '' THEN
        v_ip_address := '127.0.0.1';
    END IF;

    -- 3. Calculate the start of the window bucket
    v_bucket_start := date_trunc('second', now()) - (
        EXTRACT(epoch FROM date_trunc('second', now()))::bigint % 
        EXTRACT(epoch FROM p_window_interval)::bigint
    ) * INTERVAL '1 second';

    -- 4. Upsert request log using the fixed user ID column and unique index
    INSERT INTO security.rate_limits (user_id, ip_address, action, bucket_start, request_count)
    VALUES (v_user_id, v_ip_address, p_action, v_bucket_start, 1)
    ON CONFLICT (user_id_fixed, ip_address, action, bucket_start)
    DO UPDATE SET request_count = security.rate_limits.request_count + 1
    RETURNING request_count INTO v_current_count;

    -- 5. Self-cleaning logic (1% chance to delete records older than 2 hours to prevent table bloat)
    IF random() < 0.01 THEN
        DELETE FROM security.rate_limits WHERE bucket_start < now() - INTERVAL '2 hours';
    END IF;

    -- 6. Throw exception if limit exceeded
    IF v_current_count > p_max_requests THEN
        RAISE EXCEPTION 'Rate limit exceeded for action: %. Maximum of % requests allowed per %.', 
            p_action, p_max_requests, p_window_interval
            USING ERRCODE = 'raise_exception';
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on rate_limits table
ALTER TABLE security.rate_limits ENABLE ROW LEVEL SECURITY;

-- Database Triggers for Vulnerable Tables

-- A. Orders Trigger
CREATE OR REPLACE FUNCTION public.trg_enforce_order_rate_limit()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM security.check_db_rate_limit('create_order', 5, INTERVAL '10 minutes');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_order_rate_limit_trigger ON public.orders;
CREATE TRIGGER enforce_order_rate_limit_trigger
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.trg_enforce_order_rate_limit();

-- B. Reviews Trigger
CREATE OR REPLACE FUNCTION public.trg_enforce_review_rate_limit()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM security.check_db_rate_limit('add_review', 3, INTERVAL '5 minutes');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_review_rate_limit_trigger ON public.reviews;
CREATE TRIGGER enforce_review_rate_limit_trigger
BEFORE INSERT OR UPDATE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.trg_enforce_review_rate_limit();

-- C. Contact Messages Trigger
CREATE OR REPLACE FUNCTION public.trg_enforce_contact_rate_limit()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM security.check_db_rate_limit('submit_contact', 3, INTERVAL '10 minutes');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_contact_rate_limit_trigger ON public.contact_messages;
CREATE TRIGGER enforce_contact_rate_limit_trigger
BEFORE INSERT ON public.contact_messages
FOR EACH ROW
EXECUTE FUNCTION public.trg_enforce_contact_rate_limit();

-- D. Support Tickets Trigger
CREATE OR REPLACE FUNCTION public.trg_enforce_ticket_rate_limit()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM security.check_db_rate_limit('create_ticket', 3, INTERVAL '10 minutes');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_ticket_rate_limit_trigger ON public.support_tickets;
CREATE TRIGGER enforce_ticket_rate_limit_trigger
BEFORE INSERT ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.trg_enforce_ticket_rate_limit();
