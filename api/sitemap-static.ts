import { VercelRequest, VercelResponse } from '@vercel/node';
import { checkRateLimit, setRateLimitHeaders } from './_ratelimit.js';
import { getStaticSitemapXml } from './sitemap.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Apply Inbound Rate Limiting (e.g., 30 requests per minute)
  const rateLimitResult = await checkRateLimit(req, 30, 60);
  setRateLimitHeaders(res, rateLimitResult);
  if (!rateLimitResult.success) {
    return res.status(429).send('Too Many Requests');
  }

  const xml = getStaticSitemapXml();
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=3600');
  return res.status(200).send(xml);
}
