CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create Trigger Function to invoke send-push-notification edge function asynchronously
CREATE OR REPLACE FUNCTION public.handle_notification_insert()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  request_id BIGINT;
  payload JSONB;
  supabase_url TEXT;
  webhook_secret TEXT;
BEGIN
  -- Build the JSON payload to send to the Edge Function
  payload := jsonb_build_object(
    'record', jsonb_build_object(
      'id', NEW.id,
      'user_id', NEW.user_id,
      'title', NEW.title,
      'message', NEW.message,
      'type', NEW.type,
      'data', NEW.data
    )
  );

  -- Fetch database settings or fallback to defaults
  supabase_url := coalesce(
    nullif(current_setting('app.settings.supabase_url', true), ''),
    'https://ungxccwdondssatixzlz.supabase.co'
  );
  webhook_secret := coalesce(
    nullif(current_setting('app.settings.webhook_secret', true), ''),
    'OzoSecret123!'
  );

  -- Use pg_net extension to asynchronously send a POST request
  -- This ensures the DB transaction isn't blocked by network latencies to the Edge Function
  SELECT net.http_post(
    url := supabase_url || '/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Webhook-Secret', webhook_secret
    ),
    body := payload
  ) INTO request_id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log a warning to postgres log, but do not block the INSERT from succeeding
    RAISE WARNING 'Failed to schedule push notification webhook: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Bind Trigger to public.notifications table
CREATE OR REPLACE TRIGGER on_notification_created
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_notification_insert();
