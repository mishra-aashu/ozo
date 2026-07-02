import { VercelRequest, VercelResponse } from '@vercel/node';
import { checkRateLimit, setRateLimitHeaders } from './_ratelimit.js';
import { IncomingMessage } from 'http';

// =============================================
// IMPORTANT: Disable Vercel's automatic body parser.
// The client sends encrypted hex strings with Content-Type: application/json.
// Vercel's parser would try to JSON.parse() the hex string and crash with 502.
// We read the raw body manually, exactly like Cloudflare Worker's request.text().
// =============================================
export const config = {
  api: {
    bodyParser: false,
  },
};

const CRYPTO_SECRET = process.env.VITE_CRYPTO_SECRET || "";
if (!CRYPTO_SECRET) {
  console.warn("VITE_CRYPTO_SECRET is missing. Secure proxy decryption will fail.");
}

// Read raw body from the request stream (replaces Cloudflare's `await request.text()`)
function getRawBody(req: IncomingMessage & { body?: any }): Promise<string> {
  // If Vite's localApiPlugin has already read the request stream and populated req.body, use it
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') {
      return Promise.resolve(req.body);
    }
    if (Buffer.isBuffer(req.body)) {
      return Promise.resolve(req.body.toString('utf-8'));
    }
    try {
      return Promise.resolve(JSON.stringify(req.body));
    } catch (e) {
      return Promise.resolve('');
    }
  }

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

// Helper functions for AES-GCM encryption/decryption
function bufToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBuf(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes.buffer;
}

async function encryptText(text: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const hash = await crypto.subtle.digest("SHA-256", keyData);
  const key = await crypto.subtle.importKey(
    "raw",
    hash,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    encoder.encode(text)
  );
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return bufToHex(combined.buffer);
}

async function decryptText(hex: string, secret: string): Promise<string> {
  const buf = hexToBuf(hex);
  const bytes = new Uint8Array(buf);
  const iv = bytes.slice(0, 12);
  const ciphertext = bytes.slice(12);
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const hash = await crypto.subtle.digest("SHA-256", keyData);
  const key = await crypto.subtle.importKey(
    "raw",
    hash,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv },
    key,
    ciphertext
  );
  return new TextDecoder().decode(decrypted);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = (req.headers.origin || '') as string;
  const allowedOrigins = [
    "https://www.ozomart.store",
    "https://ozomart.store"
  ];
  
  const isAllowedOrigin = allowedOrigins.includes(origin) || 
    /^http:\/\/localhost:\d+$/.test(origin) || 
    /^http:\/\/127\.0\.0\.1:\d+$/.test(origin);

  const corsHeaders = {
    "Access-Control-Allow-Origin": isAllowedOrigin ? origin : "https://www.ozomart.store",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Expose-Headers": "x-encrypted",
  };

  // Set CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // Apply rate limit on proxy endpoints (e.g. max 150 requests per minute)
  const rateLimitResult = await checkRateLimit(req, 150, 60);
  setRateLimitHeaders(res, rateLimitResult);
  if (!rateLimitResult.success) {
    const clientIp = req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || 'unknown';
    console.warn(`[Proxy Rate Limit Exceeded] IP: ${clientIp}`);
    return res.status(429).json({ error: "Too many requests. Rate limit exceeded." });
  }

  const SUPABASE_URL = process.env.VITE_SUPABASE_DIRECT_URL || "https://ungxccwdondssatixzlz.supabase.co";

  try {
    const url = new URL(req.url || '', 'http://localhost');
    // Remove Vercel rewrite parameter 'path' to prevent PostgREST parsing errors
    url.searchParams.delete('path');
    
    // Remove the '/api/proxy' prefix to extract the raw Supabase path
    const cleanPath = url.pathname.replace(/^\/api\/proxy/, '');

    if (!cleanPath || cleanPath === "/" || cleanPath === "/favicon.ico") {
      return res.status(200).send("OZO Proxy Active ✅");
    }

    if (req.headers.upgrade === "websocket") {
      return res.status(400).send("WebSocket not supported. Use direct Supabase URL for realtime.");
    }

    const targetUrl = `${SUPABASE_URL}${cleanPath}${url.search}`;
    
    // Construct proxy headers to forward to Supabase
    const proxyHeaders = new Headers();
    const headersToForward = [
      'authorization',
      'apikey',
      'content-type',
      'prefer',
      'x-client-info',
      'accept',
      'x-original-content-type'
    ];

    headersToForward.forEach(header => {
      const value = req.headers[header];
      if (value) {
        proxyHeaders.set(header, Array.isArray(value) ? value.join(', ') : value);
      }
    });

    const isHead = req.method === "HEAD";
    const fetchOptions: RequestInit = {
      method: isHead ? "GET" : req.method,
      headers: proxyHeaders,
      redirect: "manual",
    };

    // Read raw body and decrypt if encrypted (exactly like Cloudflare Worker)
    if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method || '')) {
      let reqBody = await getRawBody(req);
      
      const isRequestEncrypted = req.headers["x-encrypted"] === "true";
      if (isRequestEncrypted && reqBody) {
        if (!CRYPTO_SECRET) {
          console.error("Cannot decrypt: VITE_CRYPTO_SECRET is empty on server.");
          return res.status(500).json({ error: "Server encryption key not configured." });
        }
        try {
          reqBody = await decryptText(reqBody, CRYPTO_SECRET);
        } catch (err) {
          console.error("Failed to decrypt request body:", err);
          // Return 400 immediately — forwarding an encrypted blob to Supabase
          // produces misleading 502 errors and triggers infinite SDK retries.
          return res.status(400).json({ error: "Request decryption failed." });
        }
      }
      fetchOptions.body = reqBody;

      // If the client encrypted the body, it switched Content-Type to
      // text/plain (to avoid Vercel's edge parsing the hex as JSON).
      // Restore the original Content-Type so Supabase/PostgREST gets
      // the correct application/json header.
      if (isRequestEncrypted) {
        const origCt = req.headers['x-original-content-type'];
        if (origCt) {
          proxyHeaders.set('content-type', Array.isArray(origCt) ? origCt.join(', ') : origCt);
        } else {
          proxyHeaders.set('content-type', 'application/json');
        }
        // Remove internal header — not meant for Supabase
        proxyHeaders.delete('x-original-content-type');
      }
    }

    // Abort outbound fetch if Supabase doesn't respond within 15 seconds
    // to prevent the Vercel function from hanging until its own hard timeout.
    const controller = new AbortController();
    const fetchTimeout = setTimeout(() => controller.abort(), 15000);
    fetchOptions.signal = controller.signal;

    let response: Response;
    try {
      response = await fetch(targetUrl, fetchOptions);
    } catch (fetchErr: any) {
      clearTimeout(fetchTimeout);
      if (fetchErr.name === 'AbortError') {
        console.error("Proxy fetch timed out for:", targetUrl);
        return res.status(504).json({ error: "Upstream request timed out." });
      }
      throw fetchErr; // re-throw to outer catch for 502
    }
    clearTimeout(fetchTimeout);

    // Prepare response headers
    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete('content-encoding');
    responseHeaders.delete('content-length');

    // Handle redirection locations if any
    if (response.status >= 300 && response.status < 400) {
      let location = responseHeaders.get("Location");
      if (location) {
        const supabaseHost = new URL(SUPABASE_URL).host;
        const reqHost = req.headers.host || '';
        if (location.includes(supabaseHost)) {
          location = location.replace(supabaseHost, reqHost);
          responseHeaders.set("Location", location);
        }
      }
    }

    // Set all response headers to response object
    responseHeaders.forEach((value, key) => {
      res.setHeader(key, value);
    });
    
    // Ensure CORS headers override any backend responses
    Object.entries(corsHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    // Encrypt response payload if it is JSON
    let responseBody: string | null = null;
    if (!isHead) {
      const contentType = responseHeaders.get("content-type") || "";
      if (contentType.includes("application/json")) {
        try {
          const rawText = await response.text();
          try {
            const encryptedHex = await encryptText(rawText, CRYPTO_SECRET);
            responseBody = encryptedHex;
            res.setHeader("content-type", "text/plain");
            res.setHeader("x-encrypted", "true");
          } catch {
            responseBody = rawText;
          }
        } catch {
          // response.text() can only be called once — body is already consumed.
          // Fall back to an empty error placeholder.
          responseBody = '{"error":"Failed to read response body"}';
        }
      } else {
        responseBody = await response.text();
      }
    }

    return res.status(response.status).send(responseBody);

  } catch (error: any) {
    console.error("Proxy Error:", error);
    return res.status(502).json({ error: error.message });
  }
}
