import { VercelRequest, VercelResponse } from '@vercel/node';
import { checkRateLimit, setRateLimitHeaders } from './_ratelimit.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Apply a rate limit of 30 requests per minute
  const rateLimitResult = await checkRateLimit(req, 30, 60);
  setRateLimitHeaders(res, rateLimitResult);
  if (!rateLimitResult.success) {
    res.setHeader('Content-Type', 'text/plain');
    return res.status(429).send('Rate limit exceeded');
  }

  const { key } = req.query;
  const indexNowKey = process.env.VITE_INDEXNOW_KEY || 'e8f38ed1f5024872aef3741996d6c9ba';

  if (!indexNowKey || key !== indexNowKey) {
    return res.status(404).send('Not Found');
  }

  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
  return res.status(200).send(indexNowKey);
}

