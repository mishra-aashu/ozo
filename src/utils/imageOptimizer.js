/**
 * Optimizes and compresses an image URL by proxying it through wsrv.nl (Cloudflare-backed image CDN).
 * Automatically converts formats to WebP, resizes, compresses, and caches the image.
 * 
 * @param {string} url - The original image URL
 * @param {object} options - Optimization options
 * @param {number} options.width - Width of the image (e.g., 300 for grid cards, 600 for details)
 * @param {number} options.quality - Quality from 1 to 100 (default 80)
 * @param {string} options.output - Format output (default 'webp')
 * @returns {string} Optimized image URL or original URL if not suitable for optimization
 */
import { checkIsLowNetwork } from '../hooks/useNetworkQuality'

export const getOptimizedImageUrl = (url, { width = 300, quality = 80, output = 'webp' } = {}) => {
  if (!url) return '';
  
  // Return immediately if it's already a data URL, blob, SVG, or already proxied
  if (
    url.startsWith('data:') || 
    url.startsWith('blob:') ||
    url.includes('wsrv.nl') ||
    url.includes('.svg') ||
    url.includes('dicebear.com') ||
    url.includes('githubusercontent.com')
  ) {
    return url;
  }

  // Adaptive Low-Network Downscaling (2G, 3G, or Save-Data mode)
  // Cuts image payload from ~35KB to ~7KB WebP on slow networks
  let targetWidth = width;
  let targetQuality = quality;

  if (checkIsLowNetwork()) {
    targetWidth = Math.min(width, 160);
    targetQuality = Math.min(quality, 42);
  }

  let cleanUrl = url;
  
  // Convert proxied Supabase public storage URLs to direct Supabase storage CDN
  const directBase = import.meta.env.VITE_SUPABASE_DIRECT_URL || 'https://ungxccwdondssatixzlz.supabase.co';
  if (cleanUrl.includes('/api/proxy/storage/v1/object/public/')) {
    const storagePath = cleanUrl.split('/api/proxy/storage/v1/object/public/')[1];
    cleanUrl = `${directBase}/storage/v1/object/public/${storagePath}`;
  }

  if (cleanUrl.startsWith('/')) {
    const isLocal = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || 
       window.location.hostname === '127.0.0.1' || 
       window.location.hostname.includes('gitpod') || 
       window.location.hostname.includes('webcontainer'));
    if (!isLocal && typeof window !== 'undefined') {
      cleanUrl = window.location.origin + cleanUrl;
    } else {
      return cleanUrl;
    }
  }

  // Construct wsrv.nl URL with progressive loading (il)
  try {
    return `https://wsrv.nl/?url=${encodeURIComponent(cleanUrl)}&w=${targetWidth}&q=${targetQuality}&output=${output}&il`;
  } catch (e) {
    console.error('Error generating optimized image URL:', e);
    return url;
  }
};

/**
 * Checks if a product image URL is missing, invalid, or a default placeholder
 */
export const isImageMissing = (url) => {
  if (!url || typeof url !== 'string') return true;
  const trimmed = url.trim().toLowerCase();
  if (
    trimmed === '' || 
    trimmed === 'null' || 
    trimmed === 'undefined' ||
    trimmed.includes('raw.githubusercontent.com') ||
    trimmed.includes('logo_transparent.png') ||
    trimmed.includes('placeholder') ||
    trimmed.includes('unsplash.com/photo-1542838132-92c53300491e') ||
    trimmed.includes('unsplash.com/photo-1619566636858')
  ) {
    return true;
  }
  return false;
};

/**
 * Resolves a proxied Supabase public storage URL directly to the Supabase CDN.
 * Ensures zero-latency loading and prevents UTF-8 string conversions on serverless proxies.
 */
export const getDirectStorageUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  const directBase = import.meta.env.VITE_SUPABASE_DIRECT_URL || 'https://ungxccwdondssatixzlz.supabase.co';
  if (url.includes('/api/proxy/storage/v1/object/public/')) {
    const storagePath = url.split('/api/proxy/storage/v1/object/public/')[1];
    return `${directBase}/storage/v1/object/public/${storagePath}`;
  }
  return url;
};
