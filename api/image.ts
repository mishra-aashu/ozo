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

  // Handle POST - Image Upload Proxy
  if (req.method === 'POST') {
    const apiKey = process.env.VITE_IMGBB_API_KEY || process.env.IMGBB_API_KEY;
    const freeimageKey = process.env.VITE_FREEIMAGE_API_KEY || process.env.FREEIMAGE_API_KEY;

    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) {
      return res.status(400).json({ error: 'Invalid Content-Type, must be multipart/form-data' });
    }

    // Read full request body
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    const bodyBuffer = Buffer.concat(chunks);

    let uploadSuccess = false;
    let responseData: any = null;

    // 1. Try ImgBB (Primary)
    if (apiKey) {
      try {
        const url = `https://api.imgbb.com/1/upload?key=${apiKey}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'content-type': contentType,
          },
          body: bodyBuffer,
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        if (response.ok) {
          responseData = await response.json();
          uploadSuccess = true;
        } else {
          console.warn(`[Upload-Proxy] ImgBB upload returned status ${response.status}`);
        }
      } catch (err) {
        console.warn('[Upload-Proxy] Primary ImgBB upload failed:', err);
      }
    } else {
      console.warn('[Upload-Proxy] ImgBB API key not configured.');
    }

    // 2. Try Freeimage.host (Fallback)
    if (!uploadSuccess && freeimageKey) {
      console.log('[Upload-Proxy] Attempting fallback to Freeimage.host...');
      try {
        const boundaryMatch = contentType.match(/boundary=(.+)$/);
        let boundary = boundaryMatch ? boundaryMatch[1] : '';
        boundary = boundary.replace(/['"]/g, ''); // Strip quotes
        
        const boundaryStr = `--${boundary}`;
        const boundaryIndex = bodyBuffer.indexOf(boundaryStr);
        const imageHeaderIndex = bodyBuffer.indexOf('name="image"');
        const headersEndIndex = bodyBuffer.indexOf('\r\n\r\n', imageHeaderIndex);
        
        if (boundaryIndex !== -1 && imageHeaderIndex !== -1 && headersEndIndex !== -1) {
          const fileStart = headersEndIndex + 4;
          const nextBoundaryIndex = bodyBuffer.indexOf(boundaryStr, fileStart);
          if (nextBoundaryIndex !== -1) {
            const fileEnd = nextBoundaryIndex - 2;
            const fileBuffer = bodyBuffer.slice(fileStart, fileEnd);
            
            // Upload to Freeimage.host
            const base64Image = fileBuffer.toString('base64');
            const payload = new URLSearchParams({
              key: freeimageKey,
              action: 'upload',
              source: base64Image,
              format: 'json'
            });
            
            const freeimageRes = await fetch('https://freeimage.host/api/1/upload', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
              },
              body: payload.toString()
            });

            if (freeimageRes.ok) {
              const resJson = await freeimageRes.json();
              if (resJson.image && resJson.image.url) {
                responseData = {
                  data: {
                    url: resJson.image.url
                  },
                  success: true,
                  status: 200
                };
                uploadSuccess = true;
                console.log('[Upload-Proxy] Fallback to Freeimage.host succeeded!');
              }
            } else {
              console.error(`[Upload-Proxy] Freeimage.host upload returned status ${freeimageRes.status}`);
            }
          }
        }
      } catch (fallbackErr) {
        console.error('[Upload-Proxy] Fallback to Freeimage.host failed:', fallbackErr);
      }
    } else if (!uploadSuccess && !freeimageKey) {
      console.warn('[Upload-Proxy] Primary upload failed and Freeimage.host API key not configured.');
    }

    if (uploadSuccess && responseData) {
      return res.status(200).json(responseData);
    } else {
      return res.status(500).json({ error: 'All image upload providers failed.' });
    }
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

      if (error || !targetUrl || targetUrl.includes('raw.githubusercontent.com')) {
        if (req.query.fallback && !String(req.query.fallback).includes('raw.githubusercontent.com')) {
          const fallbackStr = String(req.query.fallback);
          try {
            const parsedUrl = new URL(fallbackStr);
            const allowedCDNs = ['ozomart.store', 'wsrv.nl', 'supabase.co'];
            const isAllowedDomain = allowedCDNs.some(d => parsedUrl.hostname === d || parsedUrl.hostname.endsWith('.' + d));
            if (isAllowedDomain) {
              targetUrl = fallbackStr;
            } else {
              targetUrl = 'https://ozomart.store/images/logo_transparent.png';
            }
          } catch {
            targetUrl = 'https://ozomart.store/images/logo_transparent.png';
          }
        } else {
          // Fallback placeholder image (OZO Mart's public logo)
          targetUrl = 'https://ozomart.store/images/logo_transparent.png';
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
