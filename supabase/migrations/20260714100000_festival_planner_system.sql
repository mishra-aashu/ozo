-- Migration: 20260714100000_festival_planner_system.sql
-- Description: Create festival_planner table and triggers/functions for automatic campaign sync and admin notifications.

CREATE TABLE IF NOT EXISTS public.festival_planner (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    festival_name VARCHAR(255) NOT NULL,
    actual_date DATE NOT NULL,
    buffer_days INTEGER NOT NULL DEFAULT 7,
    campaign_start_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Upcoming' CHECK (status IN ('Upcoming', 'Active', 'Completed')),
    banner_url TEXT,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    tagline VARCHAR(255),
    custom_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.festival_planner ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Admins can manage festival planner" ON public.festival_planner;
DROP POLICY IF EXISTS "Public can view active festival planner" ON public.festival_planner;

-- Admins can do anything
CREATE POLICY "Admins can manage festival planner" ON public.festival_planner
    FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Public can read
CREATE POLICY "Public can view active festival planner" ON public.festival_planner
    FOR SELECT
    USING (true);

-- Trigger function to calculate campaign_start_date and initial status on insert/update
CREATE OR REPLACE FUNCTION public.calculate_campaign_start_date()
RETURNS TRIGGER AS $$
BEGIN
  NEW.campaign_start_date := NEW.actual_date - NEW.buffer_days;
  -- Calculate status
  NEW.status := CASE 
    WHEN CURRENT_DATE < (NEW.actual_date - NEW.buffer_days) THEN 'Upcoming'
    WHEN CURRENT_DATE <= NEW.actual_date THEN 'Active'
    ELSE 'Completed'
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_calculate_campaign_start_date ON public.festival_planner;

CREATE TRIGGER trigger_calculate_campaign_start_date
BEFORE INSERT OR UPDATE ON public.festival_planner
FOR EACH ROW
EXECUTE FUNCTION public.calculate_campaign_start_date();

-- Function to sync festival campaigns, activate/deactivate categories and notify admins
CREATE OR REPLACE FUNCTION public.sync_festival_campaigns()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r RECORD;
  v_new_status VARCHAR(50);
  v_admin_id UUID;
  v_notified_count INTEGER := 0;
  v_updated_count INTEGER := 0;
  v_result JSONB;
BEGIN
  -- Loop through all campaigns
  FOR r IN 
    SELECT * FROM public.festival_planner 
  LOOP
    -- Calculate correct status
    v_new_status := CASE 
      WHEN CURRENT_DATE < r.campaign_start_date THEN 'Upcoming'
      WHEN CURRENT_DATE <= r.actual_date THEN 'Active'
      ELSE 'Completed'
    END;

    -- If status changed, update it and run automation
    IF v_new_status <> r.status THEN
      -- Update status in database
      UPDATE public.festival_planner 
      SET status = v_new_status,
          updated_at = now()
      WHERE id = r.id;

      v_updated_count := v_updated_count + 1;

      -- Activate or deactivate associated category
      IF r.category_id IS NOT NULL THEN
        IF v_new_status = 'Active' THEN
          UPDATE public.categories 
          SET is_active = true 
          WHERE id = r.category_id;
        ELSIF v_new_status = 'Completed' THEN
          UPDATE public.categories 
          SET is_active = false 
          WHERE id = r.category_id;
        END IF;
      END IF;

      -- Send notification to all admins
      FOR v_admin_id IN 
        SELECT id FROM public.users WHERE role = 'admin'
      LOOP
        IF v_new_status = 'Active' THEN
          -- Admin warning for inventory check
          INSERT INTO public.notifications (user_id, title, message, type, is_read, data)
          VALUES (
            v_admin_id,
            '🔔 ' || r.festival_name || ' Live Now!',
            r.festival_name || ' campaign is now live on the app. Stock check kar lein for related items (Ghee, Diya, Sweets, Puja items, Gifts)!',
            'promo',
            false,
            jsonb_build_object('festival_id', r.id, 'type', 'festival_live')
          );
          v_notified_count := v_notified_count + 1;
        ELSIF v_new_status = 'Completed' THEN
          -- Campaign ended notification
          INSERT INTO public.notifications (user_id, title, message, type, is_read, data)
          VALUES (
            v_admin_id,
            '⚪ ' || r.festival_name || ' Campaign Ended',
            r.festival_name || ' campaign has ended. Associated categories/banners have been auto-deactivated.',
            'info',
            false,
            jsonb_build_object('festival_id', r.id, 'type', 'festival_ended')
          );
          v_notified_count := v_notified_count + 1;
        END IF;
      END LOOP;
    END IF;
  END LOOP;

  v_result := jsonb_build_object(
    'success', true,
    'updated_campaigns', v_updated_count,
    'notifications_sent', v_notified_count
  );
  
  RETURN v_result;
END;
$$;
