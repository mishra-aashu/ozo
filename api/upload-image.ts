import { VercelRequest, VercelResponse } from '@vercel/node';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  const origin = req.headers.origin || '';
  const allowedOrigins = ["https://www.ozomart.store", "https://ozomart.store"];
  const isAllowed = allowedOrigins.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
  res.setHeader('Access-Control-Allow-Origin', isAllowed ? origin : 'https://www.ozomart.store');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.VITE_IMGBB_API_KEY || process.env.IMGBB_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server configuration error: missing upload credentials' });
  }

  try {
    const url = `https://api.imgbb.com/1/upload?key=${apiKey}`;
    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) {
      return res.status(400).json({ error: 'Invalid Content-Type, must be multipart/form-data' });
    }

    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    const bodyBuffer = Buffer.concat(chunks);

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

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error: any) {
    console.error('[Upload-Proxy] Error proxying image:', error);
    return res.status(500).json({ error: error.message || 'Image upload proxy failed' });
  }
}
