-- Update database rate limiting functions to support explicit IP address arguments (needed for Deno edge functions)
-- while preserving backwards compatibility with database triggers.

-- 1. Create or replace the 4-parameter core function in the security schema
CREATE OR REPLACE FUNCTION security.check_db_rate_limit(
    p_action VARCHAR,
    p_max_requests INT,
    p_window_interval INTERVAL,
    p_ip_address TEXT
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

    -- 2. Extract Client IP Address
    IF p_ip_address IS NOT NULL AND p_ip_address <> '' THEN
        v_ip_address := p_ip_address;
    ELSE
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
    END IF;

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

-- 2. Create/update the 3-parameter overload to maintain trigger compatibility
CREATE OR REPLACE FUNCTION security.check_db_rate_limit(
    p_action VARCHAR,
    p_max_requests INT,
    p_window_interval INTERVAL
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN security.check_db_rate_limit(p_action, p_max_requests, p_window_interval, NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create a public wrapper function callable via RPC from Deno Edge Functions
CREATE OR REPLACE FUNCTION public.check_db_rate_limit(
    p_action VARCHAR,
    p_max_requests INT,
    p_window_interval INTERVAL,
    p_ip_address TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN security.check_db_rate_limit(p_action, p_max_requests, p_window_interval, p_ip_address);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution to authenticated/anonymous users so edge functions can call it via client RPC
GRANT EXECUTE ON FUNCTION public.check_db_rate_limit(VARCHAR, INT, INTERVAL, TEXT) TO authenticated, anon;
