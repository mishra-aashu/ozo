-- Recreate serviceable_streets view with security_invoker = true to fix SECURITY DEFINER view issue.

DROP VIEW IF EXISTS public.serviceable_streets;

CREATE VIEW public.serviceable_streets WITH (security_invoker = true) AS
 SELECT localities.id,
    localities.name,
    localities.name_hi,
    'locality'::text AS type,
    localities.latitude,
    localities.longitude,
    true AS is_active,
    localities.created_at,
    localities.pincode,
    localities.radius,
    NULL::numeric AS length
   FROM public.localities
UNION ALL
 SELECT landmarks.id,
    landmarks.name,
    landmarks.name_hi,
    'landmark'::text AS type,
    landmarks.latitude,
    landmarks.longitude,
    true AS is_active,
    landmarks.created_at,
    '824101'::character varying AS pincode,
    NULL::numeric AS radius,
    NULL::numeric AS length
   FROM public.landmarks
UNION ALL
 SELECT galis_apartments.id,
    galis_apartments.name,
    galis_apartments.name_hi,
    galis_apartments.type,
    galis_apartments.latitude,
    galis_apartments.longitude,
    true AS is_active,
    galis_apartments.created_at,
    galis_apartments.pincode,
    galis_apartments.radius,
    galis_apartments.length
   FROM public.galis_apartments;

-- Ensure standard privileges are granted
GRANT SELECT ON public.serviceable_streets TO anon, authenticated, service_role;
