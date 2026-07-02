import { VercelRequest, VercelResponse } from '@vercel/node';
import { getActiveCities } from './_supabase.js';
import { checkRateLimit, setRateLimitHeaders } from './_ratelimit.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Apply Inbound Rate Limiting (e.g., 15 requests per minute)
  const rateLimitResult = await checkRateLimit(req, 15, 60);
  setRateLimitHeaders(res, rateLimitResult);
  if (!rateLimitResult.success) {
    return res.status(429).send('Too Many Requests');
  }
  const activeCities = await getActiveCities();

  const citySitemaps = activeCities.map(c => `
    <sitemap>
      <loc>https://www.ozomart.store/sitemap-${c.slug}.xml</loc>
      <lastmod>${new Date().toISOString()}</lastmod>
    </sitemap>
  `).join('');

  const staticSitemap = `
    <sitemap>
      <loc>https://www.ozomart.store/sitemap-static.xml</loc>
      <lastmod>${new Date().toISOString()}</lastmod>
    </sitemap>
  `;

  const sitemaps = staticSitemap + citySitemaps;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${sitemaps}
    </sitemapindex>`.trim();

  res.setHeader('Content-Type', 'application/xml');
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=3600');
  return res.status(200).send(xml);
}
