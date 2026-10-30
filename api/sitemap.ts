import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, getActiveCities } from './_supabase.js';
import { checkRateLimit, setRateLimitHeaders } from './_ratelimit.js';

const DOMAIN = 'https://www.ozomart.store';
const CHUNK_SIZE = 35000;

/**
 * Escapes characters that violate XML syntax.
 */
export function xmlEscape(str: string | number | null | undefined): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Converts date to strict W3C Datetime format (YYYY-MM-DD).
 */
export function formatDate(date?: string | Date | null): string {
  if (!date) return '2026-10-25';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '2026-10-25';
    return d.toISOString().split('T')[0];
  } catch {
    return '2026-10-25';
  }
}

/**
 * Normalizes database slugs to the public canonical city slug.
 * 'aurangabad-bihar' -> 'aurangabad'
 */
export function toCanonicalCitySlug(rawSlug: string): string {
  const clean = String(rawSlug || '').toLowerCase().trim();
  if (clean === 'aurangabad-bihar' || clean === 'aurangabad') {
    return 'aurangabad';
  }
  return clean;
}

/**
 * Maps public canonical city slug back to database operational slug.
 * 'aurangabad' -> 'aurangabad-bihar'
 */
export function toDbCitySlug(canonicalSlug: string): string {
  const clean = String(canonicalSlug || '').toLowerCase().trim();
  if (clean === 'aurangabad') {
    return 'aurangabad-bihar';
  }
  return clean;
}

/**
 * 1. Child Static Sitemap: Low-volatility brand & legal routes.
 * Strips <priority> and <changefreq>. Uses stable content modification dates.
 */
export function getStaticSitemapXml(): { xml: string; latestMod: string } {
  const staticPages = [
    { loc: `${DOMAIN}/`, lastmod: '2026-10-25' },
    { loc: `${DOMAIN}/products`, lastmod: '2026-10-25' },
    { loc: `${DOMAIN}/categories`, lastmod: '2026-10-25' },
    { loc: `${DOMAIN}/offers`, lastmod: '2026-10-25' },
    { loc: `${DOMAIN}/services`, lastmod: '2026-10-25' },
    { loc: `${DOMAIN}/about`, lastmod: '2026-10-20' },
    { loc: `${DOMAIN}/help`, lastmod: '2026-10-20' },
    { loc: `${DOMAIN}/contact`, lastmod: '2026-10-20' },
    { loc: `${DOMAIN}/careers`, lastmod: '2026-10-15' },
    { loc: `${DOMAIN}/blog`, lastmod: '2026-10-28' },
    { loc: `${DOMAIN}/press`, lastmod: '2026-10-15' },
    { loc: `${DOMAIN}/developer`, lastmod: '2026-10-15' },
    { loc: `${DOMAIN}/privacy`, lastmod: '2026-10-10' },
    { loc: `${DOMAIN}/terms`, lastmod: '2026-10-10' },
    { loc: `${DOMAIN}/cookies`, lastmod: '2026-10-10' },
    { loc: `${DOMAIN}/shipping`, lastmod: '2026-10-10' },
    { loc: `${DOMAIN}/refund-policy`, lastmod: '2026-10-10' },
  ];

  let latestMod = '2026-10-25';
  const urls = staticPages.map(page => {
    if (page.lastmod > latestMod) latestMod = page.lastmod;
    return `  <url>
    <loc>${xmlEscape(page.loc)}</loc>
    <lastmod>${page.lastmod}</lastmod>
  </url>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`.trim();

  return { xml, latestMod };
}

/**
 * 2. Child Categories Sitemap: Taxonomy & sub-categories.
 */
export async function getCategoriesSitemapXml(): Promise<{ xml: string; latestMod: string }> {
  let categories: { slug: string; created_at?: string }[] = [];
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('slug, created_at')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (!error && data) {
      categories = data;
    }
  } catch (err) {
    console.error('[Sitemap] Error fetching categories:', err);
  }

  let latestMod = '2026-10-25';
  const categoryEntries = categories.map(cat => {
    const mod = formatDate(cat.created_at);
    if (mod > latestMod) latestMod = mod;
    return `  <url>
    <loc>${DOMAIN}/category/${xmlEscape(cat.slug)}</loc>
    <lastmod>${mod}</lastmod>
  </url>`;
  });

  const rootEntry = `  <url>
    <loc>${DOMAIN}/categories</loc>
    <lastmod>${latestMod}</lastmod>
  </url>`;

  const urls = [rootEntry, ...categoryEntries].join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`.trim();

  return { xml, latestMod };
}

/**
 * Helper to fetch available products for a city using ultra-lean projections
 * and parallel batching to avoid Vercel serverless function timeouts.
 */
async function fetchCityProducts(
  dbCitySlug: string,
  rangeFrom: number = 0,
  rangeLimit: number = CHUNK_SIZE
): Promise<{ products: { slug: string; updated_at?: string; last_price_updated?: string; created_at?: string }[]; totalCount: number; maxDate: string }> {
  // 1. Fetch any specific products disabled for this city
  let disabledProductIds = new Set<string>();
  try {
    const { data: disabledData } = await supabase
      .from('product_city_availability')
      .select('product_id')
      .eq('city_slug', dbCitySlug)
      .eq('is_available', false);

    if (disabledData) {
      disabledProductIds = new Set(disabledData.map(d => d.product_id));
    }
  } catch (err) {
    console.warn('[Sitemap] Failed to fetch disabled product overrides:', err);
  }

  // 2. Count total available products
  let totalCount = 0;
  try {
    const { count } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('is_available', true);
    totalCount = count || 0;
  } catch (err) {
    console.error('[Sitemap] Error counting products:', err);
  }

  // 3. Paginate in parallel batches of 1,000 rows
  const BATCH_SIZE = 1000;
  const targetEnd = Math.min(rangeFrom + rangeLimit, totalCount);
  const batchPromises: Promise<any>[] = [];

  for (let offset = rangeFrom; offset < targetEnd; offset += BATCH_SIZE) {
    const to = Math.min(offset + BATCH_SIZE - 1, targetEnd - 1);
    batchPromises.push(
      supabase
        .from('products')
        .select('id, slug, updated_at, last_price_updated, created_at')
        .eq('is_available', true)
        .order('id', { ascending: true })
        .range(offset, to)
    );
  }

  let products: { slug: string; updated_at?: string; last_price_updated?: string; created_at?: string }[] = [];
  let maxDate = '2026-10-25';

  if (batchPromises.length > 0) {
    const results = await Promise.all(batchPromises);
    for (const res of results) {
      if (res.data) {
        for (const item of res.data) {
          if (disabledProductIds.has(item.id)) continue;
          products.push({
            slug: item.slug,
            updated_at: item.updated_at,
            last_price_updated: item.last_price_updated,
            created_at: item.created_at,
          });

          const itemDate = formatDate(item.updated_at || item.last_price_updated || item.created_at);
          if (itemDate > maxDate) {
            maxDate = itemDate;
          }
        }
      }
    }
  }

  return { products, totalCount, maxDate };
}

/**
 * 3. Child City Sitemap: City hub + city category routes + active city SKUs.
 */
export async function getCitySitemapXml(
  canonicalSlug: string,
  chunkIndex: number = 1
): Promise<{ xml: string; latestMod: string; totalChunks: number; totalCount: number }> {
  const dbCitySlug = toDbCitySlug(canonicalSlug);
  const rangeFrom = (chunkIndex - 1) * CHUNK_SIZE;

  // Fetch lean products for chunk
  const { products, totalCount, maxDate } = await fetchCityProducts(dbCitySlug, rangeFrom, CHUNK_SIZE);
  const totalChunks = Math.max(1, Math.ceil(totalCount / CHUNK_SIZE));
  let latestMod = maxDate;

  // City landing entry (included only on Chunk 1)
  let cityLandingEntry = '';
  if (chunkIndex === 1) {
    cityLandingEntry = `  <url>
    <loc>${DOMAIN}/${xmlEscape(canonicalSlug)}</loc>
    <lastmod>${latestMod}</lastmod>
  </url>`;
  }

  // City category entries (included only on Chunk 1)
  let cityCategoryEntries = '';
  if (chunkIndex === 1) {
    try {
      const { data: categories } = await supabase
        .from('categories')
        .select('slug, created_at')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (categories) {
        cityCategoryEntries = categories.map(cat => {
          const mod = formatDate(cat.created_at);
          return `  <url>
    <loc>${DOMAIN}/${xmlEscape(canonicalSlug)}/category/${xmlEscape(cat.slug)}</loc>
    <lastmod>${mod}</lastmod>
  </url>`;
        }).join('\n');
      }
    } catch (err) {
      console.warn('[Sitemap] Failed to fetch city categories:', err);
    }
  }

  // City product entries: 2-segment canonical /{city}/{product}
  const productEntries = products.map(prod => {
    const mod = formatDate(prod.updated_at || prod.last_price_updated || prod.created_at);
    return `  <url>
    <loc>${DOMAIN}/${xmlEscape(canonicalSlug)}/${xmlEscape(prod.slug)}</loc>
    <lastmod>${mod}</lastmod>
  </url>`;
  }).join('\n');

  const allEntries = [cityLandingEntry, cityCategoryEntries, productEntries]
    .filter(Boolean)
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allEntries}
</urlset>`.trim();

  return { xml, latestMod, totalChunks, totalCount };
}

/**
 * Sets uniform HTTP headers for all XML sitemap responses.
 */
function setSitemapHeaders(res: VercelResponse, maxAge = 1800, sMaxAge = 3600) {
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('X-Robots-Tag', 'noindex, follow');
  res.setHeader('Cache-Control', `public, max-age=${maxAge}, s-maxage=${sMaxAge}, stale-while-revalidate=86400`);
}

/**
 * Main Vercel serverless handler for /sitemap.xml and child sitemaps.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const type = String(req.query.type || 'index').toLowerCase();

  // Rate Limiting (30 requests / minute)
  const rateLimitResult = await checkRateLimit(req, 30, 60);
  setRateLimitHeaders(res, rateLimitResult);
  if (!rateLimitResult.success) {
    return res.status(429).send('Too Many Requests');
  }

  // -------------------------------------------------------------
  // 1. MASTER INDEX: /sitemap.xml
  // -------------------------------------------------------------
  if (type === 'index') {
    try {
      const activeCities = await getActiveCities();

      // Deduplicate canonical city slugs to prevent duplicate sitemaps
      const uniqueCanonicalCities = Array.from(
        new Set(activeCities.map(c => toCanonicalCitySlug(c.slug)))
      );

      // Child sitemap: Static
      const { latestMod: staticMod } = getStaticSitemapXml();
      let indexEntries = [
        `  <sitemap>
    <loc>${DOMAIN}/sitemap-static.xml</loc>
    <lastmod>${staticMod}</lastmod>
  </sitemap>`,
        `  <sitemap>
    <loc>${DOMAIN}/sitemap-categories.xml</loc>
    <lastmod>${staticMod}</lastmod>
  </sitemap>`
      ];

      // Query product count for each city to determine if chunking is required
      for (const citySlug of uniqueCanonicalCities) {
        const dbSlug = toDbCitySlug(citySlug);
        let count = 0;
        try {
          const { count: prodCount } = await supabase
            .from('products')
            .select('id', { count: 'exact', head: true })
            .eq('is_available', true);
          count = prodCount || 0;
        } catch (_) {}

        const totalChunks = Math.max(1, Math.ceil(count / CHUNK_SIZE));
        const todayDate = formatDate(new Date());

        if (totalChunks > 1) {
          for (let i = 1; i <= totalChunks; i++) {
            indexEntries.push(`  <sitemap>
    <loc>${DOMAIN}/sitemap-${xmlEscape(citySlug)}-${i}.xml</loc>
    <lastmod>${todayDate}</lastmod>
  </sitemap>`);
          }
        } else {
          indexEntries.push(`  <sitemap>
    <loc>${DOMAIN}/sitemap-${xmlEscape(citySlug)}.xml</loc>
    <lastmod>${todayDate}</lastmod>
  </sitemap>`);
        }
      }

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexEntries.join('\n')}
</sitemapindex>`.trim();

      setSitemapHeaders(res, 600, 1800);
      return res.status(200).send(xml);
    } catch (error) {
      console.error('[Sitemap Master Index] Error:', error);
      return res.status(500).send('Error generating master sitemap index');
    }
  }

  // -------------------------------------------------------------
  // 2. CHILD STATIC SITEMAP: /sitemap-static.xml
  // -------------------------------------------------------------
  if (type === 'static') {
    const { xml } = getStaticSitemapXml();
    setSitemapHeaders(res, 86400, 86400);
    return res.status(200).send(xml);
  }

  // -------------------------------------------------------------
  // 3. CHILD CATEGORIES SITEMAP: /sitemap-categories.xml
  // -------------------------------------------------------------
  if (type === 'categories') {
    try {
      const { xml } = await getCategoriesSitemapXml();
      setSitemapHeaders(res, 3600, 7200);
      return res.status(200).send(xml);
    } catch (error) {
      console.error('[Sitemap Categories] Error:', error);
      return res.status(500).send('Error generating categories sitemap');
    }
  }

  // -------------------------------------------------------------
  // 4. CHILD CITY SITEMAP: /sitemap-[city].xml or /sitemap-[city]-[chunk].xml
  // -------------------------------------------------------------
  if (type === 'city') {
    const rawCityParam = String(req.query.city || '').toLowerCase().trim();
    const chunkParam = parseInt(String(req.query.chunk || '1'), 10) || 1;

    // Handle legacy 'aurangabad-bihar' by 301 permanently redirecting to canonical 'aurangabad'
    if (rawCityParam === 'aurangabad-bihar') {
      res.setHeader('Location', `${DOMAIN}/sitemap-aurangabad.xml`);
      return res.status(301).send('Moved Permanently');
    }

    const canonicalSlug = toCanonicalCitySlug(rawCityParam);
    const activeCities = await getActiveCities();
    const isValid = activeCities.some(c => toCanonicalCitySlug(c.slug) === canonicalSlug);

    if (!rawCityParam || !isValid) {
      return res.status(404).send('City Sitemap Not Found');
    }

    try {
      const { xml } = await getCitySitemapXml(canonicalSlug, chunkParam);
      setSitemapHeaders(res, 1800, 3600);
      return res.status(200).send(xml);
    } catch (error) {
      console.error(`[Sitemap City: ${canonicalSlug}] Error:`, error);
      return res.status(500).send('Error generating city sitemap');
    }
  }

  return res.status(400).send('Invalid sitemap type');
}
