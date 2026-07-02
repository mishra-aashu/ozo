import { VercelRequest, VercelResponse } from '@vercel/node';
import { getActiveCities } from './_supabase.js';
import { checkRateLimit, setRateLimitHeaders } from './_ratelimit.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Apply Inbound Rate Limiting (e.g., 10 requests per minute)
  const rateLimitResult = await checkRateLimit(req, 10, 60);
  setRateLimitHeaders(res, rateLimitResult);
  if (!rateLimitResult.success) {
    return res.status(429).json({ error: 'Too Many Requests' });
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { productSlug, productSlugs, cities } = req.body;

  if (!productSlug && (!productSlugs || !Array.isArray(productSlugs))) {
    return res.status(400).json({ error: 'Bad Request: Missing productSlug or productSlugs array' });
  }

  // Fetch active cities from DB or fallback
  const activeCities = await getActiveCities();
  const activeCitySlugs = activeCities.map(c => c.slug);

  // Fallback to all serviceable cities if no specific cities were requested
  const citiesToIndex = Array.isArray(cities) && cities.length > 0 
    ? cities.filter(c => activeCitySlugs.includes(c))
    : activeCitySlugs;

  const host = req.headers.host || 'www.ozomart.store';
  const protocol = host.includes('localhost') ? 'http' : 'https';

  const urls: string[] = [];

  // Build URLs based on input type
  if (productSlugs && Array.isArray(productSlugs)) {
    for (const slug of productSlugs) {
      for (const city of citiesToIndex) {
        if (slug === 'all' || slug === 'homepage') {
          urls.push(`${protocol}://${host}/${city}`);
        } else {
          urls.push(`${protocol}://${host}/${city}/${slug}`);
        }
      }
    }
  } else if (productSlug) {
    for (const city of citiesToIndex) {
      if (productSlug === 'all' || productSlug === 'homepage') {
        urls.push(`${protocol}://${host}/${city}`);
      } else {
        urls.push(`${protocol}://${host}/${city}/${productSlug}`);
      }
    }
  }

  const indexNowKey = process.env.VITE_INDEXNOW_KEY || 'e8f38ed1f5024872aef3741996d6c9ba';

  try {
    // IndexNow allows maximum 10,000 URLs per request.
    // We chunk into batches of 5,000 URLs to be completely safe and avoid payloads that are too large.
    const CHUNK_SIZE = 5000;
    const urlChunks: string[][] = [];
    for (let i = 0; i < urls.length; i += CHUNK_SIZE) {
      urlChunks.push(urls.slice(i, i + CHUNK_SIZE));
    }

    if (indexNowKey && urls.length > 0) {
      for (const chunk of urlChunks) {
        // Submit to IndexNow (Bing, Yandex, etc.)
        const indexNowRes = await fetch('https://api.indexnow.org/indexnow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            host: host,
            key: indexNowKey,
            keyLocation: `${protocol}://${host}/${indexNowKey}.txt`,
            urlList: chunk
          })
        });
        
        if (!indexNowRes.ok) {
          const errorMsg = await indexNowRes.text();
          console.warn(`IndexNow submission failed (status ${indexNowRes.status}): ${errorMsg}`);
        }
      }
    }

    return res.status(200).json({ success: true, indexedUrls: urls });
  } catch (error) {
    console.error('Instant Indexing error:', error);
    return res.status(500).json({ error: 'Internal Server Error during indexing' });
  }
}
