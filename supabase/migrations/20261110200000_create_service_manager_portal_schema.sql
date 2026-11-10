-- Migration: Create Service Manager Portal Schema & Dynamic Service Tables
-- Date: 2026-11-10

-- 1. Extend user role check to include 'service_manager' and 'service_technician'
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (
  (role)::text = ANY (ARRAY[
    'customer'::character varying, 
    'admin'::character varying, 
    'captain'::character varying, 
    'mart_operator'::character varying,
    'city_manager'::character varying,
    'service_manager'::character varying,
    'service_technician'::character varying
  ]::text[])
);

-- 2. Enhance service_providers table
ALTER TABLE public.service_providers 
  ADD COLUMN IF NOT EXISTS owner_name TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS serviceable_cities TEXT[] DEFAULT ARRAY['Patna']::TEXT[],
  ADD COLUMN IF NOT EXISTS serviceable_pincodes TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS operating_categories TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS visiting_fee_override NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS total_jobs_completed INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_percentage NUMERIC(5, 2) DEFAULT 15.00,
  ADD COLUMN IF NOT EXISTS bank_details JSONB DEFAULT '{"account_number": "", "ifsc_code": "", "beneficiary_name": "", "upi_id": ""}'::JSONB,
  ADD COLUMN IF NOT EXISTS kyc_documents JSONB DEFAULT '{"aadhar": null, "pan": null, "trade_license": null}'::JSONB,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Create service_technicians table
CREATE TABLE IF NOT EXISTS public.service_technicians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name VARCHAR(150) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  skills TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  duty_status VARCHAR(50) DEFAULT 'available' CHECK (duty_status IN ('available', 'assigned', 'on_job', 'offline')),
  current_lat DOUBLE PRECISION,
  current_lng DOUBLE PRECISION,
  last_location_update TIMESTAMPTZ,
  rating NUMERIC(3, 2) DEFAULT 5.00,
  total_jobs_completed INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enhance services_catalog
ALTER TABLE public.services_catalog
  ADD COLUMN IF NOT EXISTS category_slug VARCHAR(100),
  ADD COLUMN IF NOT EXISTS original_price NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS tag VARCHAR(100),
  ADD COLUMN IF NOT EXISTS badge VARCHAR(100),
  ADD COLUMN IF NOT EXISTS rating NUMERIC(3, 2) DEFAULT 4.80,
  ADD COLUMN IF NOT EXISTS reviews_count INT DEFAULT 120;

-- 5. Enhance service_bookings
ALTER TABLE public.service_bookings 
  ALTER COLUMN service_id DROP NOT NULL;

ALTER TABLE public.service_bookings DROP CONSTRAINT IF EXISTS service_bookings_status_check;
ALTER TABLE public.service_bookings ADD CONSTRAINT service_bookings_status_check CHECK (
  status IN (
    'pending',
    'accepted',
    'assigned',
    'en_route',
    'arrived',
    'inspection',
    'quote_shared',
    'quote_approved',
    'in_progress',
    'work_completed',
    'completed',
    'cancelled'
  )
);

ALTER TABLE public.service_bookings
  ADD COLUMN IF NOT EXISTS technician_id UUID REFERENCES public.service_technicians(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS category_slug VARCHAR(100),
  ADD COLUMN IF NOT EXISTS service_title VARCHAR(255),
  ADD COLUMN IF NOT EXISTS scheduled_date DATE,
  ADD COLUMN IF NOT EXISTS scheduled_slot VARCHAR(100),
  ADD COLUMN IF NOT EXISTS arrived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS visiting_fee NUMERIC(10, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS labor_fee NUMERIC(10, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS parts_fee NUMERIC(10, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS platform_fee NUMERIC(10, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS taxes_amount NUMERIC(10, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(50) DEFAULT 'cod',
  ADD COLUMN IF NOT EXISTS customer_name VARCHAR(150),
  ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS service_specific_data JSONB DEFAULT '{}'::JSONB,
  ADD COLUMN IF NOT EXISTS completion_otp VARCHAR(6),
  ADD COLUMN IF NOT EXISTS otp_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS customer_notes TEXT,
  ADD COLUMN IF NOT EXISTS technician_notes TEXT,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 6. Create service_job_estimates
CREATE TABLE IF NOT EXISTS public.service_job_estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.service_bookings(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
  technician_id UUID REFERENCES public.service_technicians(id) ON DELETE SET NULL,
  estimate_number VARCHAR(50) UNIQUE NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::JSONB,
  subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  tax_amount NUMERIC(10, 2) DEFAULT 0.00,
  total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  status VARCHAR(50) DEFAULT 'sent' CHECK (status IN ('draft', 'sent', 'approved', 'rejected')),
  customer_response_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Create service_spare_parts
CREATE TABLE IF NOT EXISTS public.service_spare_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES public.service_providers(id) ON DELETE CASCADE,
  category_slug VARCHAR(100) NOT NULL,
  part_name VARCHAR(255) NOT NULL,
  part_code VARCHAR(100),
  compatible_appliances TEXT[] DEFAULT ARRAY[]::TEXT[],
  cost_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  selling_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  stock_quantity INT DEFAULT 0,
  warranty_days INT DEFAULT 90,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Create service_job_media
CREATE TABLE IF NOT EXISTS public.service_job_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.service_bookings(id) ON DELETE CASCADE,
  media_type VARCHAR(50) NOT NULL CHECK (media_type IN ('before_work', 'after_work', 'inspection_proof', 'damaged_part', 'receipt', 'warranty_card')),
  media_url TEXT NOT NULL,
  caption TEXT,
  uploaded_by VARCHAR(50) DEFAULT 'technician',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Create service_payouts
CREATE TABLE IF NOT EXISTS public.service_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  gross_earnings NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  platform_commission NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  net_payout NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  utr_reference VARCHAR(100),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Enable RLS
ALTER TABLE public.service_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_job_estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_spare_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_job_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_payouts ENABLE ROW LEVEL SECURITY;

-- 11. Policies for service_providers
DROP POLICY IF EXISTS "Providers viewable by owner or admin" ON public.service_providers;
CREATE POLICY "Providers viewable by owner or admin" ON public.service_providers
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('admin', 'city_manager')
  ));

DROP POLICY IF EXISTS "Providers manage own profile" ON public.service_providers;
CREATE POLICY "Providers manage own profile" ON public.service_providers
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 12. Policies for service_technicians
DROP POLICY IF EXISTS "Technicians accessible by provider or admin" ON public.service_technicians;
CREATE POLICY "Technicians accessible by provider or admin" ON public.service_technicians
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.service_providers sp WHERE sp.id = service_technicians.provider_id AND sp.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- 13. Policies for service_bookings
DROP POLICY IF EXISTS "Providers can view relevant bookings" ON public.service_bookings;
CREATE POLICY "Providers can view relevant bookings" ON public.service_bookings
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.service_providers sp WHERE sp.id = service_bookings.provider_id AND sp.user_id = auth.uid())
    OR (service_bookings.provider_id IS NULL AND EXISTS (SELECT 1 FROM public.service_providers sp WHERE sp.user_id = auth.uid() AND sp.is_online = true))
    OR EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('admin', 'city_manager'))
  );

DROP POLICY IF EXISTS "Providers can update assigned bookings" ON public.service_bookings;
CREATE POLICY "Providers can update assigned bookings" ON public.service_bookings
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.service_providers sp WHERE sp.id = service_bookings.provider_id AND sp.user_id = auth.uid())
    OR (service_bookings.provider_id IS NULL AND EXISTS (SELECT 1 FROM public.service_providers sp WHERE sp.user_id = auth.uid()))
    OR EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- 14. Policies for estimates, spare parts, media and payouts
DROP POLICY IF EXISTS "Estimates provider access" ON public.service_job_estimates;
CREATE POLICY "Estimates provider access" ON public.service_job_estimates
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.service_providers sp WHERE sp.id = service_job_estimates.provider_id AND sp.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.service_bookings sb WHERE sb.id = service_job_estimates.booking_id AND sb.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

DROP POLICY IF EXISTS "Spare parts provider access" ON public.service_spare_parts;
CREATE POLICY "Spare parts provider access" ON public.service_spare_parts
  FOR ALL TO authenticated
  USING (
    provider_id IS NULL
    OR EXISTS (SELECT 1 FROM public.service_providers sp WHERE sp.id = service_spare_parts.provider_id AND sp.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

DROP POLICY IF EXISTS "Media access for job" ON public.service_job_media;
CREATE POLICY "Media access for job" ON public.service_job_media
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.service_bookings sb WHERE sb.id = service_job_media.booking_id AND (
      sb.user_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.service_providers sp WHERE sp.id = sb.provider_id AND sp.user_id = auth.uid())
    ))
    OR EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

DROP POLICY IF EXISTS "Payouts provider access" ON public.service_payouts;
CREATE POLICY "Payouts provider access" ON public.service_payouts
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.service_providers sp WHERE sp.id = service_payouts.provider_id AND sp.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- 15. Enable Supabase Realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'service_bookings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.service_bookings;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'service_technicians'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.service_technicians;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'service_job_estimates'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.service_job_estimates;
  END IF;
END $$;
