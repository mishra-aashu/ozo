import { VercelRequest, VercelResponse } from '@vercel/node';
import { checkRateLimit, setRateLimitHeaders } from './_ratelimit.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS setup
  const origin = req.headers.origin || '';
  const allowedOrigins = ["https://www.ozomart.store", "https://ozomart.store"];
  const isAllowed = allowedOrigins.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
  
  res.setHeader('Access-Control-Allow-Origin', isAllowed ? origin : 'https://www.ozomart.store');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate Limiting (e.g., 40 requests per minute)
  const rateLimitResult = await checkRateLimit(req, 40, 60);
  setRateLimitHeaders(res, rateLimitResult);
  if (!rateLimitResult.success) {
    return res.status(429).json({ 
      error: 'Rate limit exceeded. Please try again in a minute.' 
    });
  }

  const query = req.query.q ? String(req.query.q).trim() : '';
  if (!query) {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }

  try {
    const results = await searchImages(query);
    return res.status(200).json({ results });
  } catch (error: any) {
    console.error('[Search-Image] Search failed:', error);
    return res.status(500).json({ error: error.message || 'Failed to search images' });
  }
}

interface ImageSearchResult {
  url: string;
  thumbnail: string;
  title: string;
  source: string;
}

async function searchImages(query: string): Promise<ImageSearchResult[]> {
  const openSerpUrl = process.env.OPENSERP_URL || "http://localhost:7000";
  try {
    console.log(`[Search-Image] Querying OpenSERP at ${openSerpUrl} for query: ${query}`);
    const url = `${openSerpUrl}/mega/image?text=${encodeURIComponent(query)}&engines=google,bing,duck&limit=24`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000) // Increase to 10s for Chrome cold-start queries
    });
    if (response.ok) {
      const data = await response.json();
      if (data.results && Array.isArray(data.results)) {
        return data.results.map((item: any) => {
          const imgData = item.image || {};
          const sourceInfo = item.source || {};
          return {
            url: imgData.url || item.image || '',
            thumbnail: imgData.thumbnail || item.thumbnail || imgData.url || '',
            title: item.title || '',
            source: sourceInfo.domain || item.engine || 'openserp'
          };
        });
      }
    } else {
      console.warn(`[Search-Image] OpenSERP returned status ${response.status}`);
    }
  } catch (err) {
    console.error('[Search-Image] OpenSERP request failed:', err);
  }
  return [];
}