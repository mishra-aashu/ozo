import { VercelRequest } from '@vercel/node';

// Environment variables for Vercel KV / Upstash Redis
const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

// Local in-memory cache fallback for development or missing Redis credentials
interface MemoryRateLimit {
  count: number;
  resetAt: number;
}
const memoryCache = new Map<string, MemoryRateLimit>();

// Periodically clean up memory cache to prevent memory leaks
if (typeof setInterval !== 'undefined') {
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, val] of memoryCache.entries()) {
      if (val.resetAt < now) {
        memoryCache.delete(key);
      }
    }
  }, 60000);
  // Prevent keeping the node process alive in serverless environment
  if (cleanupInterval && typeof cleanupInterval.unref === 'function') {
    cleanupInterval.unref();
  }
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp in seconds when the window resets
}

/**
 * Checks rate limit for the incoming request based on the client IP address.
 * Automatically uses Upstash Redis / Vercel KV if configured, otherwise falls back to local in-memory tracking.
 * 
 * @param req The Vercel request object
 * @param limit Max number of requests allowed in the window
 * @param windowSeconds Duration of the rate limiting window in seconds (default: 60)
 * @returns Rate limit status details
 */
export async function checkRateLimit(
  req: VercelRequest,
  limit: number = 60,
  windowSeconds: number = 60
): Promise<RateLimitResult> {
  // Extract client IP Address safely, prioritizing x-real-ip set by Vercel edge
  let ip = '127.0.0.1';
  const realIp = req.headers['x-real-ip'];
  if (realIp && typeof realIp === 'string') {
    ip = realIp.trim();
  } else {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor && typeof forwardedFor === 'string') {
      const parts = forwardedFor.split(',');
      for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed) {
          ip = trimmed;
          break;
        }
      }
    }
  }

  // Extract path to namespace rate limits per API endpoint
  const urlPath = req.url ? new URL(req.url, 'http://localhost').pathname : 'api';
  const route = urlPath.replace(/^\/api\//, '');

  const nowMs = Date.now();
  const windowId = Math.floor(nowMs / (windowSeconds * 1000));
  const key = `ratelimit:${route}:${ip}:${windowId}`;
  const resetTimestampSeconds = (windowId + 1) * windowSeconds;

  // Try Redis/Vercel KV first if credentials are set
  if (redisUrl && redisToken) {
    try {
      const cleanUrl = redisUrl.replace(/\/$/, '');
      const response = await fetch(`${cleanUrl}/pipeline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${redisToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          ['INCR', key],
          ['EXPIRE', key, windowSeconds * 2],
        ]),
      });

      if (response.ok) {
        const data = await response.json();
        // The data is an array: [{"result": count}, {"result": status}]
        if (Array.isArray(data) && data[0] && typeof data[0].result === 'number') {
          const count = data[0].result;
          const success = count <= limit;
          if (!success) {
            console.warn(`[Rate Limit Exceeded] Route: ${route}, IP: ${ip}, Limit: ${limit} (Redis)`);
          }
          return {
            success,
            limit,
            remaining: Math.max(0, limit - count),
            reset: resetTimestampSeconds,
          };
        }
      }
      console.warn('[Rate Limit] Redis pipeline response error, falling back to memory.');
    } catch (err) {
      console.warn('[Rate Limit] Redis connection failed, falling back to memory:', err);
    }
  }

  // Inline random prune (10% chance) to clean up expired keys in serverless environments
  // where setInterval cannot be relied upon due to container freeze.
  if (Math.random() < 0.1) {
    const pruneTime = Date.now();
    for (const [k, v] of memoryCache.entries()) {
      if (v.resetAt < pruneTime) {
        memoryCache.delete(k);
      }
    }
  }

  // Local In-Memory Fallback
  const cached = memoryCache.get(key);
  const resetAtMs = resetTimestampSeconds * 1000;

  if (cached) {
    if (nowMs < cached.resetAt) {
      cached.count += 1;
      const success = cached.count <= limit;
      if (!success) {
        console.warn(`[Rate Limit Exceeded] Route: ${route}, IP: ${ip}, Limit: ${limit} (Memory Fallback)`);
      }
      return {
        success,
        limit,
        remaining: Math.max(0, limit - cached.count),
        reset: Math.floor(cached.resetAt / 1000),
      };
    } else {
      // Current window expired, reset
      memoryCache.delete(key);
    }
  }

  // Create new window entry
  memoryCache.set(key, {
    count: 1,
    resetAt: resetAtMs,
  });

  return {
    success: true,
    limit,
    remaining: limit - 1,
    reset: resetTimestampSeconds,
  };
}

/**
 * Standard utility to apply rate limiting headers to the response object.
 */
export function setRateLimitHeaders(
  res: any,
  result: RateLimitResult
) {
  res.setHeader('X-RateLimit-Limit', String(result.limit));
  res.setHeader('X-RateLimit-Remaining', String(result.remaining));
  res.setHeader('X-RateLimit-Reset', String(result.reset));
}

