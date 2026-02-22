import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_supabase.js';
import { checkRateLimit, setRateLimitHeaders } from '../_ratelimit.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS — restrict to OZO domains + localhost
  const origin = (req.headers.origin || '') as string;
  const allowedOrigins = ["https://www.ozomart.store", "https://ozomart.store"];
  const isAllowed = allowedOrigins.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
  res.setHeader('Access-Control-Allow-Origin', isAllowed ? origin : 'https://www.ozomart.store');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Validate Authorization
  const authHeader = req.headers.authorization;
  const expectedSecret = process.env.CRON_SECRET;
  
  if (!expectedSecret) {
    console.error('CRON_SECRET environment variable is not defined.');
    return res.status(500).json({ error: 'Configuration error: CRON_SECRET is not set' });
  }

  if (!authHeader || authHeader !== `Bearer ${expectedSecret}`) {
    // Stop enumeration by rate limiting failed attempts specifically (5 per minute)
    const rateLimitResult = await checkRateLimit(req, 5, 60);
    setRateLimitHeaders(res, rateLimitResult);
    if (!rateLimitResult.success) {
      return res.status(429).json({ error: 'Too many unauthorized attempts. Rate limit exceeded.' });
    }
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }


  try {
    const { data, error } = await supabase.rpc('process_order_state_transitions');
    
    if (error) {
      console.error('Error calling process_order_state_transitions RPC:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({
      success: true,
      cooling_confirmed: data?.cooling_confirmed || 0,
      verifying_completed: data?.verifying_completed || 0,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('Cron order manager error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
