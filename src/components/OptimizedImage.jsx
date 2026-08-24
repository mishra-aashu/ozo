import { useState, useEffect } from 'react'
import { getOptimizedImageUrl } from '../utils/imageOptimizer'
import { Package } from 'lucide-react'
import { useThemeStore } from '../stores/themeStore'

// URLs that are blocked by the image proxy (GitHub raw, broken placeholder)
const isBlockedUrl = (url) =>
  !url ||
  url.includes('raw.githubusercontent.com') ||
  url.includes('logo_transparent.png')

export default function OptimizedImage({
  src,
  alt = 'Product image',
  width = 300,
  quality = 80,
  fallbackSrc = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=60&w=400',
  className = '',
  containerClassName = 'w-full h-full',
  showLoader = true,
  style = {},
  slug = '',
  fetchPriority,
  onLoad: externalOnLoad,
  onError: externalOnError,
  loading,
  fallbackIcon = null,
  showTextFallback = true,
  ...props
}) {
  const [currentSrc, setCurrentSrc] = useState('')
  const [status, setStatus] = useState('optimizing') // 'optimizing' | 'original' | 'fallback'
  const [imageLoading, setImageLoading] = useState(true)
  const [detectedBg, setDetectedBg] = useState(null)

  // Use the global theme store to listen to dark mode changes reactively
  const theme = useThemeStore((state) => state.theme)
  const isDark = theme === 'dark'

  // Reset states when source URL or slug changes
  useEffect(() => {
    setDetectedBg(null)
    
    if (slug) {
      // SEO Friendly Local Domain Image Proxy URL
      // Only pass fallback if src is a real, non-blocked URL
      const fallbackParam =
        src && !isBlockedUrl(src) ? `&fallback=${encodeURIComponent(src)}` : ''
      const localUrl = `/product-images/${slug}.png?w=${width}&q=${quality}${fallbackParam}`
      setCurrentSrc(localUrl)
      setStatus('optimizing')
      setImageLoading(true)
    } else if (src) {
      const optimizedUrl = getOptimizedImageUrl(src, { width, quality })
      setCurrentSrc(optimizedUrl)
      setStatus(optimizedUrl === src ? 'original' : 'optimizing')
      setImageLoading(true)
    } else {
      setCurrentSrc('')
      setStatus('fallback')
      setImageLoading(false)
    }
  }, [src, slug, width, quality])

  const handleError = (e) => {
    if (status === 'optimizing') {
      // If src is blocked/invalid, skip it and go straight to placeholder
      if (!src || isBlockedUrl(src)) {
        setCurrentSrc(fallbackSrc)
        setStatus('fallback')
      } else {
        // Try the original (non-proxied) URL next
        setCurrentSrc(src)
        setStatus('original')
      }
    } else if (status === 'original') {
      // If original URL fails, fallback to the placeholder image
      setCurrentSrc(fallbackSrc)
      setStatus('fallback')
    } else {
      // If even the fallback fails, stop to prevent infinite loops
      setImageLoading(false)
    }

    if (externalOnError) {
      externalOnError(e)
    }
  }

  const handleLoad = (e) => {
    setImageLoading(false)

    // Bypass canvas creation completely for performance.
    // Catalog product images are known to have a white background.
    const isProduct =
      src?.includes('ibb.co') ||
      src?.includes('freeimage') ||
      src?.includes('imagekit') ||
      slug
    if (isProduct) {
      setDetectedBg('#ffffff')
    } else {
      setDetectedBg('transparent')
    }

    if (externalOnLoad) {
      externalOnLoad(e)
    }
  }

  const isDefaultFallback = fallbackSrc.includes('unsplash.com/photo-1542838132-92c53300491e') || 
                            fallbackSrc.includes('unsplash.com/photo-1619566636858-adf3ef46400b');
  const showSvgPlaceholder = (!src && !slug && !imageLoading) || (status === 'fallback' && isDefaultFallback);

  // Separate container styles from image-only styles
  const { backgroundColor, ...restStyle } = style || {}

  // Compute container background based on detectedBg and isDark
  let computedBg = backgroundColor
  if (detectedBg === '#ffffff') {
    computedBg = isDark ? '#f3f4f6' : '#ffffff'
  } else if (detectedBg && detectedBg !== 'transparent') {
    computedBg = detectedBg
  }

  // Compute image style (multiply blend mode for solid backgrounds in dark mode)
  const imageStyle = {
    mixBlendMode: (isDark && detectedBg === '#ffffff') ? 'multiply' : undefined
  }

  return (
    <div 
      className={`relative overflow-hidden ${containerClassName}`} 
      style={{ ...restStyle, backgroundColor: computedBg }}
    >
      {/* Loading Shimmer Overlay */}
      {showLoader && imageLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-150 dark:bg-white/5">
          <div className="w-full h-full shimmer" />
        </div>
      )}
      
      {/* Empty State / Neutral SVG Placeholder */}
      {showSvgPlaceholder ? (
        <div className={`absolute inset-0 flex flex-col items-center justify-center text-center select-none ${
          showTextFallback 
            ? 'bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700/50 p-2' 
            : 'bg-transparent'
        }`}>
          {fallbackIcon || <Package className="w-8 h-8 text-gray-300 dark:text-zinc-600 mb-1" />}
          {showTextFallback && (
            <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-medium px-2 truncate max-w-full">
              {alt && alt !== 'Product image' ? alt : 'No Image'}
            </span>
          )}
        </div>
      ) : (
        currentSrc && (
          <img
            src={currentSrc}
            alt={alt}
            loading={loading}
            onLoad={handleLoad}
            onError={handleError}
            className={`${className} transition-opacity duration-300 ${
              imageLoading ? 'opacity-0' : 'opacity-100'
            }`}
            fetchpriority={fetchPriority}
            style={imageStyle}
            {...props}
          />
        )
      )}
    </div>
  )
}
