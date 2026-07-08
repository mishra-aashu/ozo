import { useState, useEffect } from 'react'
import { getOptimizedImageUrl } from '../utils/imageOptimizer'
import { Package } from 'lucide-react'

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
  ...props
}) {
  const [currentSrc, setCurrentSrc] = useState('')
  const [status, setStatus] = useState('optimizing') // 'optimizing' | 'original' | 'fallback'
  const [imageLoading, setImageLoading] = useState(true)
  const [isDark, setIsDark] = useState(false)
  const [detectedBg, setDetectedBg] = useState(null)

  // Listen to dark mode changes
  useEffect(() => {
    const checkDark = () => {
      setIsDark(document.documentElement.classList.contains('dark'))
    }
    checkDark()
    const observer = new MutationObserver(checkDark)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

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

    // CORS Safe Client-side background color detection
    const imgUrl = e.target.src
    if (imgUrl && !imgUrl.startsWith('data:') && status !== 'fallback') {
      const tempImg = new Image()
      tempImg.crossOrigin = 'anonymous'
      tempImg.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          canvas.width = 10
          canvas.height = 10
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.drawImage(tempImg, 0, 0, 10, 10)
            const corners = [
              ctx.getImageData(0, 0, 1, 1).data,
              ctx.getImageData(9, 0, 1, 1).data,
              ctx.getImageData(0, 9, 1, 1).data,
              ctx.getImageData(9, 9, 1, 1).data
            ]
            
            const isWhite = corners.every(c => c[0] > 240 && c[1] > 240 && c[2] > 240 && c[3] > 10)
            if (isWhite) {
              setDetectedBg('#ffffff')
            } else {
              const isTransparent = corners.every(c => c[3] < 30)
              if (isTransparent) {
                setDetectedBg('transparent')
              } else {
                let r = 0, g = 0, b = 0, a = 0
                corners.forEach(c => {
                  r += c[0]; g += c[1]; b += c[2]; a += c[3]
                })
                r = Math.round(r / 4)
                g = Math.round(g / 4)
                b = Math.round(b / 4)
                a = a / 4
                
                if (a > 100) {
                  setDetectedBg(`rgb(${r}, ${g}, ${b})`)
                } else {
                  setDetectedBg('transparent')
                }
              }
            }
          }
        } catch (err) {
          // Swallow canvas errors
        }
      }
      tempImg.onerror = () => {
        // Fallback: guess white background for remote product images
        const isProduct = src?.includes('ibb.co') || src?.includes('freeimage') || src?.includes('imagekit') || slug
        if (isProduct) {
          setDetectedBg('#ffffff')
        }
      }
      tempImg.src = imgUrl
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
