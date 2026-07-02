import { VercelRequest, VercelResponse } from '@vercel/node';
import { checkRateLimit, setRateLimitHeaders } from './_ratelimit.js';

const LOCATIONIQ_KEY = process.env.LOCATIONIQ_API_KEY || process.env.VITE_LOCATIONIQ_KEY || '';

// Simple in-memory cache (Vercel serverless function instances persist in memory between warm requests)
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 3600000; // 1 hour

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS — restrict to OZO domains + localhost
  const origin = (req.headers.origin || '') as string;
  const allowedOrigins = ["https://www.ozomart.store", "https://ozomart.store"];
  const isAllowed = allowedOrigins.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
  res.setHeader('Access-Control-Allow-Origin', isAllowed ? origin : 'https://www.ozomart.store');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Apply Inbound Rate Limiting (e.g., 30 requests per minute)
  const rateLimitResult = await checkRateLimit(req, 30, 60);
  setRateLimitHeaders(res, rateLimitResult);
  if (!rateLimitResult.success) {
    return res.status(429).json({ 
      error: 'Rate limit exceeded. Please try again in a minute.' 
    });
  }

  const { q, lat, lon, type } = req.query;

  if (type === 'reverse') {
    if (!lat || !lon) {
      return res.status(400).json({ error: 'Missing coordinates for reverse geocoding' });
    }
  } else if (type === 'search') {
    if (!q) {
      return res.status(400).json({ error: 'Missing query for search geocoding' });
    }
  } else {
    return res.status(400).json({ error: 'Invalid or missing type parameter' });
  }

  try {
    const cacheKey = type === 'reverse'
      ? `reverse:${lat},${lon}`
      : `search:${q}`;

    const cached = cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      res.setHeader('X-Cache', 'HIT');
      return res.status(200).json(cached.data);
    }

    let resultData;

    if (type === 'reverse') {
      resultData = await reverseGeocode(Number(lat), Number(lon));
    } else {
      resultData = await forwardGeocode(String(q));
    }

    // Cache the result
    cache.set(cacheKey, {
      data: resultData,
      timestamp: Date.now()
    });

    res.setHeader('X-Cache', 'MISS');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.status(200).json(resultData);
  } catch (error: any) {
    console.error('Proxy geocoding error:', error);
    return res.status(500).json({ error: error.message || 'Geocoding failed' });
  }
}

async function reverseGeocode(lat: number, lon: number) {
  // 1. LocationIQ
  if (LOCATIONIQ_KEY && LOCATIONIQ_KEY !== 'YOUR_FREE_KEY_HERE' && !LOCATIONIQ_KEY.includes('YOUR_')) {
    try {
      const url = `https://us1.locationiq.com/v1/reverse.php?key=${LOCATIONIQ_KEY}&lat=${lat}&lon=${lon}&format=json&accept-language=en`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'OZOMart/1.0 (contact@ozomart.store)',
          'Referer': 'https://ozomart.store'
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (data && data.address) {
          return data;
        }
      }
    } catch (e) {
      console.warn('LocationIQ proxy reverse geocoding failed:', e);
    }
  }

  // 2. Nominatim
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'OZOMart/1.0 (contact@ozomart.store)',
      'Referer': 'https://ozomart.store'
    }
  });

  if (!response.ok) {
    throw new Error(`Nominatim request failed: ${response.statusText}`);
  }

  return await response.json();
}

async function forwardGeocode(query: string) {
  // 1. LocationIQ Autocomplete
  if (LOCATIONIQ_KEY && LOCATIONIQ_KEY !== 'YOUR_FREE_KEY_HERE' && !LOCATIONIQ_KEY.includes('YOUR_')) {
    try {
      const url = `https://api.locationiq.com/v1/autocomplete?key=${LOCATIONIQ_KEY}&q=${encodeURIComponent(query)}&limit=10&countrycodes=in&accept-language=en`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'OZOMart/1.0 (contact@ozomart.store)',
          'Referer': 'https://ozomart.store'
        }
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.warn('LocationIQ proxy autocomplete failed:', e);
    }
  }

  // 2. Nominatim Search
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=10&addressdetails=1&countrycodes=in`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'OZOMart/1.0 (contact@ozomart.store)',
      'Referer': 'https://ozomart.store'
    }
  });

  if (!response.ok) {
    throw new Error(`Nominatim search failed: ${response.statusText}`);
  }

  return await response.json();
}
