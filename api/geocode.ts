import { VercelRequest, VercelResponse } from '@vercel/node';
import { checkRateLimit, setRateLimitHeaders } from './_ratelimit.js';

const LOCATIONIQ_KEY = process.env.LOCATIONIQ_API_KEY || process.env.VITE_LOCATIONIQ_KEY || '';

// Whitelist of allowed domains to prevent SSRF
const ALLOWED_DOMAINS = [
  'maps.app.goo.gl',
  'goo.gl',
  'maps.google.com',
  'www.google.com',
  'google.com',
  'g.co',
  'g.page',
];

// Simple in-memory cache (Vercel serverless function instances persist in memory between warm requests)
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 3600000; // 1 hour

function isAllowedUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') return false;
    return ALLOWED_DOMAINS.some(d => parsed.hostname === d || parsed.hostname.endsWith('.' + d));
  } catch {
    return false;
  }
}

function isAllowedFinalUrl(finalUrl: string): boolean {
  try {
    const parsed = new URL(finalUrl);
    if (parsed.protocol !== 'https:') return false;
    
    const finalAllowed = [
      'google.com',
      'google.co.in',
      'google.co.uk',
      'google.co.jp',
      'google.de',
      'google.fr',
      'google.es',
      'google.it',
      'google.ca',
      'google.com.sg',
      'google.com.au'
    ];
    return finalAllowed.some(d => parsed.hostname === d || parsed.hostname.endsWith('.' + d));
  } catch {
    return false;
  }
}

function extractCoordinatesFromUrl(url: string): { lat: number, lng: number } | null {
  if (!url || typeof url !== 'string') return null;

  // Pattern 0: Google Maps exact place coordinates (!3d<lat>!4d<lng>)
  const gmapsPlaceMatch = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (gmapsPlaceMatch) {
    return { lat: parseFloat(gmapsPlaceMatch[1]), lng: parseFloat(gmapsPlaceMatch[2]) };
  }

  // Pattern 1: @lat,lng (e.g. @24.7511,84.3745)
  const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) {
    return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
  }

  // Pattern 2: q=lat,lng or query=lat,lng or ll=lat,lng
  const queryMatch = url.match(/[?&](query|q|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (queryMatch) {
    return { lat: parseFloat(queryMatch[2]), lng: parseFloat(queryMatch[3]) };
  }

  // Pattern 3: /place/lat,lng or /search/lat,lng
  const placeMatch = url.match(/\/(place|search)\/(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (placeMatch) {
    return { lat: parseFloat(placeMatch[2]), lng: parseFloat(placeMatch[3]) };
  }

  // Pattern 4: Any two decimal numbers separated by comma in the URL
  const genericMatch = url.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
  if (genericMatch) {
    const lat = parseFloat(genericMatch[1]);
    const lng = parseFloat(genericMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }

  return null;
}

function parseQueryFromUrl(urlStr: string): string | null {
  try {
    const url = new URL(urlStr);
    const placeMatch = url.pathname.match(/\/(?:maps\/)?(?:place|search|dir)\/([^/@?#]+)/);
    if (placeMatch && placeMatch[1]) {
      return decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
    }
    
    const qParam = url.searchParams.get('q') || url.searchParams.get('query');
    if (qParam) {
      return qParam;
    }
  } catch (e) {
    const match = urlStr.match(/\/(?:place|search|dir)\/([^/@?#\s]+)/);
    if (match && match[1]) {
      return decodeURIComponent(match[1].replace(/\+/g, ' '));
    }
  }
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin || '';
  const allowedOrigins = ["https://www.ozomart.store", "https://ozomart.store"];
  const isAllowed = allowedOrigins.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
  res.setHeader('Access-Control-Allow-Origin', isAllowed ? origin : 'https://www.ozomart.store');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Apply rate limiting (30 requests per minute)
  const rateLimitResult = await checkRateLimit(req, 30, 60);
  setRateLimitHeaders(res, rateLimitResult);
  if (!rateLimitResult.success) {
    return res.status(429).json({ 
      error: 'Rate limit exceeded. Please try again in a minute.' 
    });
  }

  const { type, url: linkUrl, q, lat, lon } = req.query;

  // Handle URL resolve (Google Maps link resolution) if url query parameter is present or type is resolve-link
  if (linkUrl || type === 'resolve-link') {
    const targetUrl = String(linkUrl || '');
    if (!targetUrl) {
      return res.status(400).json({ error: 'Missing url query parameter' });
    }

    if (!isAllowedUrl(targetUrl)) {
      return res.status(400).json({ error: 'Only Google Maps links are supported' });
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(targetUrl, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        }
      });
      clearTimeout(timeout);

      const finalUrl = response.url;

      if (!isAllowedFinalUrl(finalUrl)) {
        return res.status(422).json({ error: 'Resolved URL is not a valid Google Maps page' });
      }

      // 1. Try parsing coordinates directly from final URL
      let coordinates = extractCoordinatesFromUrl(finalUrl);
      let place = null;

      // 2. If SerpApi Key is set, query SerpApi to get structured details
      const serpApiKey = process.env.SERPAPI_API_KEY;
      if (serpApiKey) {
        const query = parseQueryFromUrl(finalUrl);
        if (query) {
          const llParam = coordinates ? `@${coordinates.lat},${coordinates.lng},15z` : '';
          
          const serpApiUrl = new URL('https://serpapi.com/search.json');
          serpApiUrl.searchParams.set('engine', 'google_maps');
          serpApiUrl.searchParams.set('q', query);
          serpApiUrl.searchParams.set('api_key', serpApiKey);
          if (llParam) {
            serpApiUrl.searchParams.set('ll', llParam);
          }

          try {
            const serpRes = await fetch(serpApiUrl.toString());
            if (serpRes.ok) {
              const serpData = await serpRes.json();
              
              let foundPlace = null;
              if (serpData.place_results && serpData.place_results.gps_coordinates) {
                foundPlace = serpData.place_results;
              } else if (serpData.local_results && serpData.local_results.length > 0) {
                foundPlace = serpData.local_results[0];
              }

              if (foundPlace && foundPlace.gps_coordinates) {
                const gps = foundPlace.gps_coordinates;
                coordinates = { lat: gps.latitude, lng: gps.longitude };
                
                const addr = foundPlace.address || '';
                const pincodeMatch = addr.match(/\b\d{6}\b/);
                const pincode = pincodeMatch ? pincodeMatch[0] : '';
                
                place = {
                  title: foundPlace.title || '',
                  address: addr,
                  pincode
                };
              }
            }
          } catch (serpErr) {
            console.error('SerpApi lookup failed:', serpErr);
          }
        }
      }

      return res.status(200).json({ finalUrl, coordinates, place });
    } catch (error: any) {
      console.error('Resolve link error:', error);
      const message = error.name === 'AbortError' ? 'Request timed out' : (error.message || 'Failed to resolve link');
      return res.status(500).json({ error: message });
    }
  }

  // Handle standard geocoding (reverse/search)
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
