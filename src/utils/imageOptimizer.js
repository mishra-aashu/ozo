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

  let cleanUrl = url;
  if (url.startsWith('/')) {
    const isLocal = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || 
       window.location.hostname === '127.0.0.1' || 
       window.location.hostname.includes('gitpod') || 
       window.location.hostname.includes('webcontainer'));
    if (!isLocal && typeof window !== 'undefined') {
      cleanUrl = window.location.origin + url;
    } else {
      return url;
    }
  }

  // Construct wsrv.nl URL with progressive loading (il)
  try {
    return `https://wsrv.nl/?url=${encodeURIComponent(cleanUrl)}&w=${width}&q=${quality}&output=${output}&il`;
  } catch (e) {
    console.error('Error generating optimized image URL:', e);
    return url;
  }
};
