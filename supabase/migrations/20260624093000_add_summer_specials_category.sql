-- Migration: Add Summer Specials category and subcategories, and populate them with cold drinks and ice creams.

-- 1. Create categories
INSERT INTO categories (id, name, slug, parent_id, display_order, icon, is_active, description)
VALUES 
  ('87a718c5-920f-488f-9a40-23a778e17001', 'Summer Specials', 'summer-specials', NULL, 1, '☀️', TRUE, 'Stay cool with refreshing cold drinks, ice creams, lassis, and summer essentials!'),
  ('87a718c5-920f-488f-9a40-23a778e17002', 'Cold Drinks', 'cold-drinks', '87a718c5-920f-488f-9a40-23a778e17001', 101, '🥤', TRUE, 'Refreshing soft drinks, sodas, juices, and lassis.'),
  ('87a718c5-920f-488f-9a40-23a778e17003', 'Ice Creams & Desserts', 'ice-creams-desserts', '87a718c5-920f-488f-9a40-23a778e17001', 102, '🍦', TRUE, 'Chilled ice creams, kulfis, and frozen desserts.')
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    parent_id = EXCLUDED.parent_id,
    display_order = EXCLUDED.display_order,
    icon = EXCLUDED.icon,
    is_active = EXCLUDED.is_active,
    description = EXCLUDED.description;

-- 2. Move ice cream and kulfi products to Ice Creams & Desserts subcategory
UPDATE products 
SET category_id = '87a718c5-920f-488f-9a40-23a778e17003'
WHERE name ILIKE '%ice cream%'
   OR name ILIKE '%kulfi%'
   OR category_id IN (SELECT id FROM categories WHERE slug = 'frozen-desserts-ice-cream');

-- 3. Move cold drinks, juices, lassis, and shakes to Cold Drinks subcategory
UPDATE products
SET category_id = '87a718c5-920f-488f-9a40-23a778e17002'
WHERE name ILIKE '%lassi%'
   OR name ILIKE '%milkshake%'
   OR name ILIKE '%milk shake%'
   OR name ILIKE '%maaza%'
   OR name ILIKE '%frooti%'
   OR name ILIKE '%pepsi%'
   OR name ILIKE '%coca-cola%'
   OR name ILIKE '%coke%'
   OR name ILIKE '%sprite%'
   OR name ILIKE '%fanta%'
   OR name ILIKE '%limca%'
   OR name ILIKE '%thums up%'
   OR name ILIKE '%soft drink%'
   OR name ILIKE '%caffeinated drink%'
   OR category_id IN (SELECT id FROM categories WHERE slug IN ('soft-drinks-soda', 'juices-sharbat', 'buttermilk-lassi'));
