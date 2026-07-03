import { useState, useEffect } from 'react'
import { getOptimizedImageUrl } from '../utils/imageOptimizer'
import { ShoppingCart, Package } from 'lucide-react'

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
  ...props
}) {
  const [currentSrc, setCurrentSrc] = useState('')
  const [status, setStatus] = useState('optimizing') // 'optimizing' | 'original' | 'fallback'
  const [imageLoading, setImageLoading] = useState(true)

  // Reset states when source URL or slug changes
  useEffect(() => {
    if (slug) {
      // SEO Friendly Local Domain Image Proxy URL
      const fallbackParam = src ? `&fallback=${encodeURIComponent(src)}` : '';
      const localUrl = `/product-images/${slug}.png?w=${width}&q=${quality}${fallbackParam}`;
      setCurrentSrc(localUrl);
      setStatus('optimizing');
      setImageLoading(true);
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

  const handleError = () => {
    if (status === 'optimizing') {
      // If optimized image fails (e.g. proxy issue), fallback to the original URL
      setCurrentSrc(src)
      setStatus('original')
    } else if (status === 'original') {
      // If original URL fails, fallback to the placeholder image
      setCurrentSrc(fallbackSrc)
      setStatus('fallback')
    } else {
      // If even the fallback fails, stop to prevent infinite loops
      setImageLoading(false)
    }
  }

  const handleLoad = () => {
    setImageLoading(false)
  }

  const isDefaultFallback = fallbackSrc.includes('unsplash.com/photo-1542838132-92c53300491e') || 
                            fallbackSrc.includes('unsplash.com/photo-1619566636858-adf3ef46400b');
  const showSvgPlaceholder = (!src && !slug && !imageLoading) || (status === 'fallback' && isDefaultFallback);

  return (
    <div className={`relative overflow-hidden ${containerClassName}`} style={style}>
      {/* Loading Shimmer Overlay */}
      {showLoader && imageLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-150 dark:bg-white/5">
          <div className="w-full h-full shimmer" />
        </div>
      )}
      
      {/* Empty State / Neutral SVG Placeholder */}
      {showSvgPlaceholder ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700/50 p-2 text-center select-none">
          <Package className="w-8 h-8 text-gray-300 dark:text-zinc-600 mb-1" />
          <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-medium px-2 truncate max-w-full">
            {alt && alt !== 'Product image' ? alt : 'No Image'}
          </span>
        </div>
      ) : (
        currentSrc && (
          <img
            src={currentSrc}
            alt={alt}
            onLoad={handleLoad}
            onError={handleError}
            className={`${className} transition-opacity duration-300 ${
              imageLoading ? 'opacity-0' : 'opacity-100'
            }`}
            fetchpriority={fetchPriority}
            {...props}
          />
        )
      )}
    </div>
  )
}

