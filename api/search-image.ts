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
  try {
    // 1. Fetch DuckDuckGo Main Page to Extract VQD Token
    const mainUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
    const mainRes = await fetch(mainUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!mainRes.ok) {
      throw new Error(`DuckDuckGo main page returned status ${mainRes.status}`);
    }

    const html = await mainRes.text();
    const vqdMatch = html.match(/vqd=[\'\"]?([^\'\"]+?)[\'\"]?&/i) || html.match(/vqd\s*[:=]\s*[\'\"]?([^\'\"]+?)[\'\"]?/i);
    
    if (!vqdMatch) {
      console.warn('[Search-Image] VQD token not found in DuckDuckGo HTML.');
      return [];
    }

    const vqd = vqdMatch[1];

    // 2. Fetch Images using DuckDuckGo JSON Endpoint
    const imgUrl = `https://duckduckgo.com/i.js?o=json&q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,`;
    const imgRes = await fetch(imgUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });

    if (!imgRes.ok) {
      throw new Error(`DuckDuckGo image API returned status ${imgRes.status}`);
    }

    const data = await imgRes.json();
    if (!data.results || !Array.isArray(data.results)) {
      return [];
    }

    return data.results.slice(0, 24).map((item: any) => ({
      url: item.image,
      thumbnail: item.thumbnail,
      title: item.title || '',
      source: item.source || ''
    }));

  } catch (err) {
    console.error('[Search-Image] DuckDuckGo search failed:', err);
    return [];
  }
}
