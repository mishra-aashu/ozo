import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, setRateLimitHeaders } from './_ratelimit.js';

const supabaseUrl = process.env.VITE_SUPABASE_DIRECT_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS setup for both methods
  const origin = req.headers.origin || '';
  const allowedOrigins = ["https://www.ozomart.store", "https://ozomart.store"];
  const isAllowed = allowedOrigins.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
  res.setHeader('Access-Control-Allow-Origin', isAllowed ? origin : 'https://www.ozomart.store');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Handle POST - DEPRECATED (Uploads now go directly to ImageKit/Supabase client-side)
  if (req.method === 'POST') {
    return res.status(410).json({ error: 'POST endpoint is deprecated. Use direct ImageKit/Supabase upload helpers.' });
  }


  // Handle GET - Product Image Optimized Proxy
  if (req.method === 'GET') {
    // Apply Inbound Rate Limiting (e.g., 60 requests per minute)
    const rateLimitResult = await checkRateLimit(req, 60, 60);
    setRateLimitHeaders(res, rateLimitResult);
    if (!rateLimitResult.success) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded. Please try again in a minute.' 
      });
    }

    const { slug } = req.query;

    if (!slug) {
      res.setHeader('Content-Type', 'image/gif');
      return res.status(200).send(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
    }

    try {
      // 1. Fetch the product's image url from Supabase
      const { data, error } = await supabase
        .from('products')
        .select('image_url')
        .eq('slug', String(slug))
        .maybeSingle();

      let targetUrl = data?.image_url;

      if (error || !targetUrl || targetUrl.includes('raw.githubusercontent.com') || targetUrl.includes('logo_transparent.png')) {
        if (req.query.fallback && !String(req.query.fallback).includes('raw.githubusercontent.com') && !String(req.query.fallback).includes('logo_transparent.png')) {
          const fallbackStr = String(req.query.fallback);
          try {
            const parsedUrl = new URL(fallbackStr);
            const allowedCDNs = ['ozomart.store', 'wsrv.nl', 'supabase.co', 'i.ibb.co', 'freeimage.host', 'unsplash.com'];
            const isAllowedDomain = allowedCDNs.some(d => parsedUrl.hostname === d || parsedUrl.hostname.endsWith('.' + d));
            if (isAllowedDomain) {
              targetUrl = fallbackStr;
            } else {
              res.setHeader('Content-Type', 'text/plain');
              return res.status(404).send('Image not found or broken');
            }
          } catch {
            res.setHeader('Content-Type', 'text/plain');
            return res.status(404).send('Image not found or broken');
          }
        } else {
          res.setHeader('Content-Type', 'text/plain');
          return res.status(404).send('Image not found or broken');
        }
      }

      // 2. Fetch the image from the source URL. Use wsrv.nl proxy to optimize and compress!
      const width = req.query.w ? String(req.query.w) : '300';
      const quality = req.query.q ? String(req.query.q) : '80';
      
      let response;
      let contentType = 'image/webp';
      
      if (targetUrl && !targetUrl.endsWith('.svg') && targetUrl.startsWith('http')) {
        const optimizedUrl = `https://wsrv.nl/?url=${encodeURIComponent(targetUrl)}&w=${width}&q=${quality}&output=webp&il`;
        try {
          response = await fetch(optimizedUrl);
          if (!response.ok) {
            throw new Error('wsrv.nl returned non-200');
          }
        } catch (wsrvErr) {
          console.warn('[Image-Proxy] wsrv.nl optimization failed, falling back to original URL:', wsrvErr);
          response = await fetch(targetUrl);
          contentType = '';
        }
      } else {
        response = await fetch(targetUrl);
        contentType = '';
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }

      const finalContentType = contentType || response.headers.get('content-type') || 'image/png';
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // 3. Set aggressive cache headers for Vercel Edge CDN & Googlebot
      res.setHeader('Content-Type', finalContentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return res.status(200).send(buffer);
    } catch (err) {
      console.error('[Image-Proxy] Error serving product image:', err);
      return res.status(404).send('Image not found');
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
