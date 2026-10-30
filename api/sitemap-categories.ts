import { VercelRequest, VercelResponse } from '@vercel/node';
import { checkRateLimit, setRateLimitHeaders } from './_ratelimit.js';
import { getCategoriesSitemapXml } from './sitemap.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Apply Inbound Rate Limiting (e.g., 30 requests per minute)
  const rateLimitResult = await checkRateLimit(req, 30, 60);
  setRateLimitHeaders(res, rateLimitResult);
  if (!rateLimitResult.success) {
    return res.status(429).send('Too Many Requests');
  }

  try {
    const { xml } = await getCategoriesSitemapXml();
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('X-Robots-Tag', 'noindex, follow');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=7200, stale-while-revalidate=86400');
    return res.status(200).send(xml);
  } catch (err) {
    console.error('[Sitemap Categories API] Error:', err);
    return res.status(500).send('Error generating categories sitemap');
  }
}
