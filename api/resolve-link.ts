import { VercelRequest, VercelResponse } from '@vercel/node';
import { checkRateLimit, setRateLimitHeaders } from './_ratelimit.js';

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
    
    // Check path for place or search or dir
    // e.g., /maps/place/Name+Here/@... or /maps/search/Name+Here/@...
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
  const allowedOrigin = origin.includes('ozomart.store') || origin.includes('localhost') ? origin : 'https://ozomart.store';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
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

  const { url } = req.query;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing url query parameter' });
  }

  if (!isAllowedUrl(url)) {
    return res.status(400).json({ error: 'Only Google Maps links are supported' });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
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
