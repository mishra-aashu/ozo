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
  // 1. Primary: BigBasket Catalog Search (High resolution, clean grocery pack images)
  try {
    console.log(`[Search-Image] Searching BigBasket catalog for: ${query}`);
    const results = await searchBigBasketImages(query);
    if (results.length > 0) {
      return results;
    }
  } catch (err) {
    console.error('[Search-Image] BigBasket search failed:', err);
  }

  // 2. Fallback: OpenSERP (Google/Bing/DuckDuckGo combined API)
  const openSerpUrl = process.env.OPENSERP_URL || "http://localhost:7000";
  try {
    console.log(`[Search-Image] BigBasket empty. Querying OpenSERP at ${openSerpUrl} for query: ${query}`);
    const url = `${openSerpUrl}/mega/image?text=${encodeURIComponent(query)}&engines=google,bing,duck&limit=24`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(6000)
    });
    if (response.ok) {
      const data = await response.json();
      if (data.results && Array.isArray(data.results) && data.results.length > 0) {
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

  // 3. Fallback: Open Food Facts Search
  try {
    console.log(`[Search-Image] OpenSERP failed. Trying Open Food Facts fallback for: ${query}`);
    const results = await searchOpenFoodFactsImages(query);
    if (results.length > 0) {
      return results;
    }
  } catch (err) {
    console.error('[Search-Image] Open Food Facts fallback failed:', err);
  }

  return [];
}

async function searchBigBasketImages(query: string): Promise<ImageSearchResult[]> {
  const fallbackCookie = '_bb_cid=1; _bb_sa_ids=19224; _bb_cda_sa_info=djIuY2RhX3NhLjEwLjE5MjI0; is_integrated_sa=1; _bb_aid="MjkxMzA4NDUzMA=="; _bb_nhid=7427; _bb_hid=7427; _bb_dsid=7427; _bb_dsevid=7427; is_global=1; bb2_enabled=true; ufi=1; _bb_vid=MTMwMDkyNDE2MjYxOTM5MjQ5NA==; bigbasket.com=b623f16c-2c81-4d29-94a2-29f8cdbd834f; isintegratedsa=true; PWA=1';
  const headers = {
    'accept': '*/*',
    'accept-language': 'en-GB,en;q=0.9,hi-IN;q=0.8,hi;q=0.7,en-US;q=0.6',
    'common-client-static-version': '101',
    'content-type': 'application/json',
    'dnt': '1',
    'osmos-enabled': 'true',
    'sec-ch-ua-mobile': '?1',
    'sec-ch-ua-platform': '"Android"',
    'user-agent': 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Mobile Safari/537.36',
    'x-caller': 'bigbasket-pwa',
    'x-channel': 'BB-PWA',
    'x-entry-context': 'bbnow',
    'x-entry-context-id': '10',
    'x-requested-with': 'XMLHttpRequest',
    'cookie': process.env.CATALOG_COOKIE || fallbackCookie
  };

  const url = `https://www.bigbasket.com/listing-svc/v2/products?type=ps&slug=${encodeURIComponent(query)}&page=1&bucket_id=36`;
  try {
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(6000) });
    if (!response.ok) {
      console.warn(`[Search-Image] BigBasket API returned status ${response.status}`);
      return [];
    }
    const data = await response.json() as any;
    const tabs = data.tabs || [];
    if (tabs.length === 0) return [];
    
    const products = tabs[0]?.product_info?.products || [];
    const results: ImageSearchResult[] = [];
    for (const prod of products) {
      const images = prod.images || [];
      const imageUrl = images[0] ? (images[0].xxl || images[0].xl || images[0].l || images[0].m || images[0].s) : null;
      if (imageUrl) {
        const brandName = prod.brand?.name ? `[${prod.brand.name}] ` : '';
        const packSize = prod.w ? ` (${prod.w})` : '';
        results.push({
          url: imageUrl,
          thumbnail: imageUrl,
          title: `${brandName}${prod.desc || query}${packSize}`,
          source: 'BigBasket'
        });
      }
    }
    return results;
  } catch (err) {
    console.error('[Search-Image] BigBasket API query failed:', err);
  }
  return [];
}

async function searchOpenFoodFactsImages(query: string): Promise<ImageSearchResult[]> {
  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=10`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'OzoMartImageTool/1.0 (mishra.aashu@gmail.com)' },
      signal: AbortSignal.timeout(4000)
    });
    if (response.ok) {
      const data = await response.json() as any;
      if (data.products && Array.isArray(data.products)) {
        const results: ImageSearchResult[] = [];
        for (const prod of data.products) {
          const imgUrl = prod.image_url || prod.image_front_url || prod.image_small_url;
          if (imgUrl) {
            results.push({
              url: imgUrl,
              thumbnail: prod.image_small_url || imgUrl,
              title: prod.product_name || query,
              source: 'Open Food Facts'
            });
          }
        }
        return results;
      }
    }
  } catch (err) {
    console.error('[Search-Image] Open Food Facts query failed:', err);
  }
  return [];
}