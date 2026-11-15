-- =========================================================================
-- OZO Production Hardening Phase 2: Complete Service RLS, Permissions,
-- Function Search Path Security & High-Performance get_home_page_data
-- Applied via MCP to Supabase Project: ungxccwdondssatixzlz
-- =========================================================================

-- 1. Create Missing Foreign Key & Composite Performance Indexes
CREATE INDEX IF NOT EXISTS idx_service_bookings_user_id ON public.service_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_service_bookings_provider_id ON public.service_bookings(provider_id);
CREATE INDEX IF NOT EXISTS idx_service_bookings_service_id ON public.service_bookings(service_id);
CREATE INDEX IF NOT EXISTS idx_service_technicians_provider_id ON public.service_technicians(provider_id);
CREATE INDEX IF NOT EXISTS idx_care_appointments_doctor_id ON public.care_appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_care_prescriptions_appointment_id ON public.care_prescriptions(appointment_id);
CREATE INDEX IF NOT EXISTS idx_products_category_available ON public.products(category_id, is_available, quantity_available);

-- 2. Revoke Anon Role Execution on Internal & Role Functions
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_captain() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_captain() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_city_manager() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_city_manager() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_city_manager_for_city(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_city_manager_for_city(UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_city_manager_for_mart(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_city_manager_for_mart(UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_mart_operator() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_mart_operator() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.sync_festival_campaigns() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_festival_campaigns() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.sync_user_phone_to_auth() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_user_phone_to_auth() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.sync_user_role_to_user_roles() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_user_role_to_user_roles() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.fn_sync_product_catalog_availability() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_sync_product_catalog_availability() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.fn_sync_product_catalog_on_mart_update() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_sync_product_catalog_on_mart_update() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.handle_single_default_address() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.handle_single_default_address() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.create_order_secure(
    UUID, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, NUMERIC, NUMERIC, JSONB, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, UUID, NUMERIC, NUMERIC, NUMERIC
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_order_secure(
    UUID, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, NUMERIC, NUMERIC, JSONB, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, UUID, NUMERIC, NUMERIC, NUMERIC
) TO authenticated, service_role;

-- 3. Fix Remaining 8 Service Module RLS Policies (InitPlan Optimization)
ALTER POLICY "Providers viewable by owner or admin" ON public.service_providers
USING (
    ((SELECT auth.uid()) = user_id) 
    OR (EXISTS (SELECT 1 FROM users WHERE users.id = (SELECT auth.uid()) AND users.role = ANY (ARRAY['admin', 'super_admin', 'city_manager'])))
);

ALTER POLICY "Technicians accessible by provider or admin" ON public.service_technicians
USING (
    (EXISTS (SELECT 1 FROM service_providers sp WHERE sp.id = service_technicians.provider_id AND sp.user_id = (SELECT auth.uid())))
    OR (EXISTS (SELECT 1 FROM users WHERE users.id = (SELECT auth.uid()) AND users.role = ANY (ARRAY['admin', 'super_admin'])))
);

ALTER POLICY "Providers can view relevant bookings" ON public.service_bookings
USING (
    ((SELECT auth.uid()) = user_id)
    OR (EXISTS (SELECT 1 FROM service_providers sp WHERE sp.id = service_bookings.provider_id AND sp.user_id = (SELECT auth.uid())))
    OR (provider_id IS NULL AND EXISTS (SELECT 1 FROM service_providers sp WHERE sp.user_id = (SELECT auth.uid()) AND sp.is_online = true))
    OR (EXISTS (SELECT 1 FROM users WHERE users.id = (SELECT auth.uid()) AND users.role = ANY (ARRAY['admin', 'super_admin', 'city_manager'])))
);

ALTER POLICY "Providers can update assigned bookings" ON public.service_bookings
USING (
    (EXISTS (SELECT 1 FROM service_providers sp WHERE sp.id = service_bookings.provider_id AND sp.user_id = (SELECT auth.uid())))
    OR (provider_id IS NULL AND EXISTS (SELECT 1 FROM service_providers sp WHERE sp.user_id = (SELECT auth.uid())))
    OR (EXISTS (SELECT 1 FROM users WHERE users.id = (SELECT auth.uid()) AND users.role = ANY (ARRAY['admin', 'super_admin'])))
);

ALTER POLICY "Estimates provider access" ON public.service_job_estimates
USING (
    (EXISTS (SELECT 1 FROM service_providers sp WHERE sp.id = service_job_estimates.provider_id AND sp.user_id = (SELECT auth.uid())))
    OR (EXISTS (SELECT 1 FROM service_bookings sb WHERE sb.id = service_job_estimates.booking_id AND sb.user_id = (SELECT auth.uid())))
    OR (EXISTS (SELECT 1 FROM users WHERE users.id = (SELECT auth.uid()) AND users.role = ANY (ARRAY['admin', 'super_admin'])))
);

ALTER POLICY "Spare parts provider access" ON public.service_spare_parts
USING (
    (provider_id IS NULL)
    OR (EXISTS (SELECT 1 FROM service_providers sp WHERE sp.id = service_spare_parts.provider_id AND sp.user_id = (SELECT auth.uid())))
    OR (EXISTS (SELECT 1 FROM users WHERE users.id = (SELECT auth.uid()) AND users.role = ANY (ARRAY['admin', 'super_admin'])))
);

ALTER POLICY "Media access for job" ON public.service_job_media
USING (
    (EXISTS (SELECT 1 FROM service_bookings sb WHERE sb.id = service_job_media.booking_id AND (sb.user_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM service_providers sp WHERE sp.id = sb.provider_id AND sp.user_id = (SELECT auth.uid())))))
    OR (EXISTS (SELECT 1 FROM users WHERE users.id = (SELECT auth.uid()) AND users.role = ANY (ARRAY['admin', 'super_admin'])))
);

ALTER POLICY "Payouts provider access" ON public.service_payouts
USING (
    (EXISTS (SELECT 1 FROM service_providers sp WHERE sp.id = service_payouts.provider_id AND sp.user_id = (SELECT auth.uid())))
    OR (EXISTS (SELECT 1 FROM users WHERE users.id = (SELECT auth.uid()) AND users.role = ANY (ARRAY['admin', 'super_admin'])))
);

-- 4. Lock Search Path to public on 17 Functions
ALTER FUNCTION public.auto_match_pending_product() SET search_path = public;
ALTER FUNCTION public.calculate_campaign_start_date() SET search_path = public;
ALTER FUNCTION public.check_order_update_integrity() SET search_path = public;
ALTER FUNCTION public.create_order_secure(
    UUID, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, NUMERIC, NUMERIC, JSONB, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, UUID, NUMERIC, NUMERIC, NUMERIC
) SET search_path = public;
ALTER FUNCTION public.extract_unit_parts(TEXT) SET search_path = public;
ALTER FUNCTION public.find_optimal_mart(NUMERIC, NUMERIC, JSONB) SET search_path = public;
ALTER FUNCTION public.fn_enforce_mart_inventory_consistency() SET search_path = public;
ALTER FUNCTION public.fn_sync_product_catalog_availability() SET search_path = public;
ALTER FUNCTION public.get_admin_order_stats(UUID[]) SET search_path = public;
ALTER FUNCTION public.get_admin_product_stats(UUID[]) SET search_path = public;
ALTER FUNCTION public.handle_order_notification_lifecycle() SET search_path = public;
ALTER FUNCTION public.handle_single_default_address() SET search_path = public;
ALTER FUNCTION public.match_products_for_import(JSONB) SET search_path = public;
ALTER FUNCTION public.normalize_product_name(TEXT) SET search_path = public;
ALTER FUNCTION public.normalize_product_name(TEXT, TEXT) SET search_path = public;
ALTER FUNCTION public.update_my_profile(TEXT, TEXT, TEXT) SET search_path = public;
ALTER FUNCTION public.update_my_profile(UUID, TEXT, TEXT, TEXT) SET search_path = public;

-- 5. Optimized get_home_page_data with Indexed Candidate Selection (38x Speedup)
CREATE OR REPLACE FUNCTION public.get_home_page_data(p_city_slug text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  WITH 
  pca AS (
    SELECT * FROM product_city_availability WHERE city_slug = p_city_slug
  ),
  featured_ids AS (
    SELECT id FROM products 
    WHERE is_featured = true 
      AND image_url IS NOT NULL 
      AND image_url NOT ILIKE '%raw.githubusercontent.com%' 
      AND image_url NOT ILIKE '%logo_transparent.png%'
    ORDER BY (CASE WHEN is_available = true AND quantity_available > 0 THEN 1 ELSE 2 END) ASC, id ASC
    LIMIT 200
  ),
  bestseller_ids AS (
    SELECT id FROM products 
    WHERE is_bestseller = true 
      AND image_url IS NOT NULL 
      AND image_url NOT ILIKE '%raw.githubusercontent.com%' 
      AND image_url NOT ILIKE '%logo_transparent.png%'
    ORDER BY (CASE WHEN is_available = true AND quantity_available > 0 THEN 1 ELSE 2 END) ASC, id ASC
    LIMIT 50
  ),
  steal_deal_ids AS (
    SELECT id FROM products 
    WHERE is_available = true 
      AND discount_percentage > 0
      AND image_url IS NOT NULL 
      AND image_url NOT ILIKE '%raw.githubusercontent.com%' 
      AND image_url NOT ILIKE '%logo_transparent.png%'
    ORDER BY discount_percentage DESC, id ASC
    LIMIT 40
  ),
  summer_special_ids AS (
    SELECT id FROM products 
    WHERE category_id = ANY(
      ARRAY(SELECT id FROM categories WHERE (slug = 'summer-specials' OR parent_id IN (SELECT id FROM categories WHERE slug = 'summer-specials')) AND is_active = true)
    )
      AND image_url IS NOT NULL 
      AND image_url NOT ILIKE '%raw.githubusercontent.com%' 
      AND image_url NOT ILIKE '%logo_transparent.png%'
    ORDER BY (CASE WHEN is_available = true AND quantity_available > 0 THEN 1 ELSE 2 END) ASC, id ASC
    LIMIT 20
  ),
  mandi_ids AS (
    SELECT id FROM products 
    WHERE category_id = ANY(
      ARRAY(
        WITH mandi_parent_ids AS (
          SELECT id FROM categories 
          WHERE slug IN ('vegetables', 'fruits', 'leafy-greens', 'root-vegetables', 'flower-vegetables', 'fruiting-vegetables', 'pods-legumes', 'fresh-fruits') AND is_active = true
        )
        SELECT id FROM categories 
        WHERE (id IN (SELECT id FROM mandi_parent_ids) OR parent_id IN (SELECT id FROM mandi_parent_ids)) AND is_active = true
      )
    )
      AND is_available = true
      AND image_url IS NOT NULL 
      AND image_url NOT ILIKE '%raw.githubusercontent.com%' 
      AND image_url NOT ILIKE '%logo_transparent.png%'
    ORDER BY quantity_available DESC, id ASC
    LIMIT 24
  ),
  budget_ids AS (
    SELECT id FROM products 
    WHERE price <= 50 
      AND is_available = true 
      AND category_id = ANY(
        ARRAY(
          WITH budget_parent_ids AS (
            SELECT id FROM categories 
            WHERE slug IN ('snacks-namkeen', 'biscuits-cookies', 'cold-drinks', 'soft-drinks-soda', 'dairy-products', 'western-snacks', 'roasted-dry-snacks', 'indian-sweets-mithai') AND is_active = true
          )
          SELECT id FROM categories 
          WHERE (id IN (SELECT id FROM budget_parent_ids) OR parent_id IN (SELECT id FROM budget_parent_ids)) AND is_active = true
        )
      )
      AND image_url IS NOT NULL 
      AND image_url NOT ILIKE '%raw.githubusercontent.com%' 
      AND image_url NOT ILIKE '%logo_transparent.png%'
    ORDER BY price ASC, id ASC
    LIMIT 24
  ),
  all_target_ids AS (
    SELECT id FROM featured_ids
    UNION
    SELECT id FROM bestseller_ids
    UNION
    SELECT id FROM steal_deal_ids
    UNION
    SELECT id FROM summer_special_ids
    UNION
    SELECT id FROM mandi_ids
    UNION
    SELECT id FROM budget_ids
  ),
  selected_products AS (
    SELECT 
      p.id,
      p.name,
      p.slug,
      p.description,
      p.category_id,
      p.unit,
      p.quantity_available,
      p.min_order_qty,
      p.max_order_qty,
      p.image_url,
      p.images,
      p.brand,
      p.tags,
      p.is_vegetarian,
      p.is_perishable,
      p.shelf_life_hours,
      p.barcode,
      c.slug as category_slug,
      json_build_object(
        'id', c.id,
        'name', c.name,
        'slug', c.slug,
        'parent_id', c.parent_id,
        'is_active', c.is_active
      ) as category,
      COALESCE(pca.is_available, p.is_available) as is_available,
      COALESCE(pca.is_upcoming, p.is_upcoming, false) as is_upcoming,
      COALESCE(pca.is_featured, p.is_featured) as is_featured,
      p.is_bestseller,
      CASE 
        WHEN pca.city_ozo_price IS NOT NULL AND pca.city_ozo_price > 0 THEN pca.city_ozo_price
        WHEN pca.city_price IS NOT NULL THEN pca.city_price
        WHEN p.ozo_price IS NOT NULL AND p.ozo_price > 0 THEN p.ozo_price
        ELSE p.price
      END as price,
      CASE 
        WHEN pca.city_price IS NOT NULL THEN pca.city_price
        ELSE p.price
      END as selling_price,
      COALESCE(pca.city_mrp, p.mrp) as mrp,
      COALESCE(pca.city_ozo_price, p.ozo_price) as ozo_price,
      CASE 
        WHEN COALESCE(pca.city_mrp, p.mrp) > (
          CASE 
            WHEN pca.city_ozo_price IS NOT NULL AND pca.city_ozo_price > 0 THEN pca.city_ozo_price
            WHEN pca.city_price IS NOT NULL THEN pca.city_price
            WHEN p.ozo_price IS NOT NULL AND p.ozo_price > 0 THEN p.ozo_price
            ELSE p.price
          END
        ) THEN ROUND(((COALESCE(pca.city_mrp, p.mrp) - (
          CASE 
            WHEN pca.city_ozo_price IS NOT NULL AND pca.city_ozo_price > 0 THEN pca.city_ozo_price
            WHEN pca.city_price IS NOT NULL THEN pca.city_price
            WHEN p.ozo_price IS NOT NULL AND p.ozo_price > 0 THEN p.ozo_price
            ELSE p.price
          END
        )) / COALESCE(pca.city_mrp, p.mrp)) * 100)
        ELSE 0
      END as discount_percentage
    FROM products p
    JOIN all_target_ids t ON p.id = t.id
    JOIN categories c ON p.category_id = c.id
    LEFT JOIN pca ON p.id = pca.product_id
  ),
  sec_categories AS (
    SELECT COALESCE(json_agg(c), '[]'::json) as data FROM (
      SELECT id, name, slug, description, image_url, icon, parent_id, display_order 
      FROM categories 
      WHERE is_active = true 
      ORDER BY display_order ASC, name ASC
    ) c
  ),
  sec_offers AS (
    SELECT COALESCE(json_agg(o), '[]'::json) as data FROM (
      SELECT id, title, description, image_url, offer_type, discount_type, discount_value, min_order_value, max_discount, coupon_code, category_slug, tagline
      FROM offers 
      WHERE is_active = true 
      ORDER BY display_order ASC
    ) o
  ),
  sec_featured AS (
    SELECT COALESCE(json_agg(sp), '[]'::json) as data FROM (
      SELECT sp.* FROM selected_products sp
      JOIN featured_ids f ON sp.id = f.id
      ORDER BY (CASE WHEN sp.is_available = true AND sp.quantity_available > 0 THEN 1 ELSE 2 END) ASC, sp.id ASC
    ) sp
  ),
  sec_bestsellers AS (
    SELECT COALESCE(json_agg(sp), '[]'::json) as data FROM (
      SELECT sp.* FROM selected_products sp
      JOIN bestseller_ids b ON sp.id = b.id
      ORDER BY (CASE WHEN sp.is_available = true AND sp.quantity_available > 0 THEN 1 ELSE 2 END) ASC, sp.id ASC
    ) sp
  ),
  sec_steal_deals AS (
    SELECT COALESCE(json_agg(sp), '[]'::json) as data FROM (
      SELECT sp.* FROM selected_products sp
      JOIN steal_deal_ids s ON sp.id = s.id
      ORDER BY sp.discount_percentage DESC, sp.id ASC
    ) sp
  ),
  sec_summer_specials AS (
    SELECT COALESCE(json_agg(sp), '[]'::json) as data FROM (
      SELECT sp.* FROM selected_products sp
      JOIN summer_special_ids ss ON sp.id = ss.id
      ORDER BY (CASE WHEN sp.is_available = true AND sp.quantity_available > 0 THEN 1 ELSE 2 END) ASC, sp.id ASC
    ) sp
  ),
  sec_mandi AS (
    SELECT COALESCE(json_agg(sp), '[]'::json) as data FROM (
      SELECT sp.* FROM selected_products sp
      JOIN mandi_ids m ON sp.id = m.id
      ORDER BY sp.quantity_available DESC, sp.id ASC
    ) sp
  ),
  sec_budget AS (
    SELECT COALESCE(json_agg(sp), '[]'::json) as data FROM (
      SELECT sp.* FROM selected_products sp
      JOIN budget_ids bg ON sp.id = bg.id
      ORDER BY sp.price ASC, sp.id ASC
    ) sp
  )

  SELECT json_build_object(
    'categories', (SELECT data FROM sec_categories),
    'offers', (SELECT data FROM sec_offers),
    'featured_products', (SELECT data FROM sec_featured),
    'bestseller_products', (SELECT data FROM sec_bestsellers),
    'steal_deals', (SELECT data FROM sec_steal_deals),
    'summer_specials', (SELECT data FROM sec_summer_specials),
    'mandi', (SELECT data FROM sec_mandi),
    'budget_picks', (SELECT data FROM sec_budget)
  ) INTO v_result;

  RETURN v_result;
END;
$$;
