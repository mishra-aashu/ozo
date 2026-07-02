import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, getActiveCities } from './_supabase.js';
import { checkRateLimit, setRateLimitHeaders } from './_ratelimit.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Apply Inbound Rate Limiting (e.g., 15 requests per minute)
  const rateLimitResult = await checkRateLimit(req, 15, 60);
  setRateLimitHeaders(res, rateLimitResult);
  if (!rateLimitResult.success) {
    return res.status(429).send('Too Many Requests');
  }

  const { city } = req.query;
  const cityStr = String(city).toLowerCase();

  // 1. City validation
  const activeCities = await getActiveCities();
  const isValid = activeCities.some(c => c.slug === cityStr);

  if (!city || !isValid) {
    return res.status(404).send('City Sitemap Not Found');
  }

  try {
    // 2. Fetch products and city availability overrides (paginated to bypass Supabase 1000 limit)
    let allProducts: any[] = [];
    let from = 0;
    let to = 999;
    let hasMore = true;

    while (hasMore) {
      const { data: products, error } = await supabase
        .from('products')
        .select(`
          id,
          slug,
          updated_at,
          is_available,
          categories (
            slug
          ),
          product_city_availability(
            is_available
          )
        `)
        .eq('is_available', true)
        .eq('product_city_availability.city_slug', cityStr)
        .range(from, to);

      if (error) {
        console.error('Error fetching products for sitemap:', error);
        return res.status(500).send('Error generating sitemap');
      }

      if (products && products.length > 0) {
        allProducts = allProducts.concat(products);
        if (products.length < 1000) {
          hasMore = false;
        } else {
          from += 1000;
          to += 1000;
        }
      } else {
        hasMore = false;
      }
    }

    const availableProducts = allProducts.filter((prod: any) => {
      const pca = prod.product_city_availability?.[0] || null;
      const isAvailable = pca && pca.is_available !== null && pca.is_available !== undefined
        ? pca.is_available
        : prod.is_available;
      return isAvailable;
    });

    // 3. City landing page URL entry
    const cityUrl = `
    <url>
      <loc>https://www.ozomart.store/${cityStr}</loc>
      <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
      <changefreq>daily</changefreq>
      <priority>1.0</priority>
    </url>
    `;

    // 4. Product page URL entries
    const urls = availableProducts.map((prod: any) => {
      const categoryObj = prod.categories as any;
      const categorySlug = (Array.isArray(categoryObj) ? categoryObj[0]?.slug : categoryObj?.slug) || 'item';
      return `
    <url>
      <loc>https://www.ozomart.store/${cityStr}/${categorySlug}/${prod.slug}</loc>
      <lastmod>${new Date(prod.updated_at || Date.now()).toISOString().split('T')[0]}</lastmod>
      <changefreq>daily</changefreq>
      <priority>0.8</priority>
    </url>
    `;
    }).join('');

    // 5. Wrap in urlset
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${cityUrl}
      ${urls}
    </urlset>`.trim();

    // 6. Set caching headers
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).send(xml);
  } catch (error) {
    console.error('Sitemap generation error:', error);
    return res.status(500).send('Internal Server Error');
  }
}
