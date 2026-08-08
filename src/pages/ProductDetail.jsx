import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useParams, useNavigate, Link } from 'react-router-dom'
import SEO from '../components/SEO'
import Breadcrumb from '../components/Breadcrumb'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ShoppingCart, 
  Heart, 
  Share2, 
  ChevronLeft, 
  ChevronRight,
  Star, 
  Clock, 
  ShieldCheck, 
  Truck, 
  Minus, 
  Plus,
  ArrowRight,
  Info,
  Zap,
  Package,
  Camera,
  Upload,
  X,
  Trash2,
  Loader2,
  Eye,
  Copy,
  Check,
  Bell,
  AlertCircle
} from 'lucide-react'

import { useProductStore } from '../stores/productStore'
import { useLocationStore } from '../stores/locationStore'
import { findMatchingActiveCityForDetails } from '../components/LocationPromptModal'
import OptimizedImage from '../components/OptimizedImage'
import { useCartStore } from '../stores/cartStore'
import { useWishlistStore } from '../stores/wishlistStore'
import { useAuthStore } from '../stores/authStore'
import { supabase, supabaseAdmin } from '../lib/supabase'
import ImageUpload from '../components/ImageUpload'
import toast from 'react-hot-toast'
import SuggestedProducts from '../components/SuggestedProducts'
import { getProductVariants } from '../utils/productGrouper'
import { promptOneSignalPush, oneSignalAddTag } from '../utils/onesignal'
import OzoLoadingGuard from '../components/OzoLoadingGuard'

const getShelfLifeString = (product) => {
  if (product?.shelf_life_hours) {
    const hours = product.shelf_life_hours
    if (hours < 24) {
      return `${hours} Hour${hours > 1 ? 's' : ''}`
    }
    const days = Math.round(hours / 24)
    return `${days} Day${days > 1 ? 's' : ''}`
  }
  if (product?.is_perishable) {
    return '2-3 Days (Keep Refrigerated)'
  }
  return 'Refer to packaging'
}

const getProductHighlights = (product) => {
  if (!product) return []
  
  const highlights = []
  
  const categoryName = (product.category?.name || '').toLowerCase()
  const categorySlug = (product.category?.slug || '').toLowerCase()
  const productName = (product.name || '').toLowerCase()
  
  // List of keywords indicating non-food categories or cosmetic items
  const nonFoodKeywords = [
    'beauty', 'hygiene', 'shampoo', 'conditioner', 'soap', 'cleaner', 'detergent', 
    'personal care', 'skin', 'face', 'hair', 'body wash', 'lotion', 'cream', 
    'perfume', 'deodorant', 'household', 'utensil', 'brush', 'toothpaste', 
    'diaper', 'wipes', 'scrubber', 'liquid wash', 'sanitizer', 'makeup', 'cosmetic',
    'comb', 'oil for hair', 'hair oil', 'perfumes', 'perfumed', 'fragrance',
    'shaving', 'razor', 'blade', 'grooming'
  ]
  
  // Whitelist keywords indicating food items
  const foodKeywords = [
    'veg', 'fruit', 'greens', 'organic', 'snack', 'food', 'drink', 'beverage', 
    'dairy', 'bakery', 'grocery', 'oil', 'masala', 'meat', 'fish', 'egg', 'chocolate', 
    'sweet', 'cookie', 'cereal', 'staple', 'spices', 'rice', 'noodle', 'pasta', 
    'sauce', 'spread', 'mandi', 'snack', 'biscuit', 'namkeen', 'tea', 'coffee'
  ]

  const hasNonFoodKeyword = nonFoodKeywords.some(kw => 
    categoryName.includes(kw) || 
    categorySlug.includes(kw) || 
    productName.includes(kw)
  )

  const hasFoodKeyword = foodKeywords.some(kw => 
    categoryName.includes(kw) || 
    categorySlug.includes(kw) || 
    productName.includes(kw)
  )

  // A product is a food item if it explicitly matches food signals or has no non-food signal
  const isFood = hasFoodKeyword || !hasNonFoodKeyword
  
  // 1. Veg / Non-Veg status (Only for Food Items)
  if (isFood && product.is_vegetarian !== null && product.is_vegetarian !== undefined) {
    highlights.push({
      text: product.is_vegetarian ? '100% Vegetarian' : 'Non-Vegetarian',
      type: 'veg_status',
      color: product.is_vegetarian ? 'bg-ozo-green' : 'bg-ozo-red'
    })
  }

  // 2. Brand Authenticity
  if (product.brand && typeof product.brand === 'string' && product.brand.trim()) {
    highlights.push({
      text: `Original ${product.brand.trim()}`,
      type: 'brand',
      color: 'bg-ozo-green'
    })
  }

  // 3. Shelf Life / Storage Advice
  if (product.shelf_life_hours) {
    highlights.push({
      text: `Shelf Life: ${getShelfLifeString(product)}`,
      type: 'shelf_life',
      color: 'bg-ozo-green'
    })
  } else if (product.is_perishable) {
    highlights.push({
      text: 'Keep Refrigerated',
      type: 'perishable',
      color: 'bg-ozo-red'
    })
  }

  // 4. Bestseller / Featured badges
  if (product.is_bestseller) {
    highlights.push({
      text: 'OZO Bestseller',
      type: 'bestseller',
      color: 'bg-ozo-green'
    })
  }

  // 5. Max Order limit
  if (product.max_order_qty && product.max_order_qty > 0 && product.max_order_qty < 50) {
    highlights.push({
      text: `Max Order Limit: ${product.max_order_qty} units`,
      type: 'max_order',
      color: 'bg-ozo-red'
    })
  }

  // 6. Barcode / SKU
  if (product.barcode && typeof product.barcode === 'string' && product.barcode.trim()) {
    highlights.push({
      text: `SKU: ${product.barcode.trim()}`,
      type: 'sku',
      color: 'bg-ozo-red'
    })
  }

  // 7. Check if product has tags for quality/origin (filtered and cleaned)
  let tagList = []
  if (Array.isArray(product.tags)) {
    tagList = product.tags
  } else if (typeof product.tags === 'string' && product.tags.trim()) {
    const trimmed = product.tags.trim()
    if (trimmed.startsWith('[')) {
      try {
        tagList = JSON.parse(trimmed)
      } catch (_) {}
    } else {
      tagList = trimmed.split(',').map(t => t.trim())
    }
  }

  if (tagList.length > 0) {
    const brandLower = (product.brand || '').toLowerCase().trim()
    const catLower = (product.category?.name || '').toLowerCase().trim()
    
    const usefulTags = tagList.filter(t => {
      if (typeof t !== 'string') return false
      const lower = t.toLowerCase().trim()
      return lower &&
             !lower.includes('off') && 
             !lower.includes('eta') && 
             !lower.includes('earliest') &&
             lower !== brandLower &&
             lower !== catLower &&
             lower !== 'in stock' &&
             lower !== 'out of stock' &&
             lower !== 'available'
    })
    
    usefulTags.slice(0, 2).forEach(tag => {
      const formatted = tag.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      highlights.push({
        text: formatted,
        type: 'tag',
        color: 'bg-ozo-red'
      })
    })
  }

  // 8. Fallback items to guarantee at least 4 items if database fields are sparse
  const defaultItems = [
    { text: 'Superfast Delivery', color: 'bg-ozo-red' },
    { text: 'Hygienically Packed', color: 'bg-ozo-green' },
    { text: 'Quality Guaranteed', color: 'bg-ozo-green' },
    { text: 'Easy Returns & Refunds', color: 'bg-ozo-red' }
  ]

  let defaultIdx = 0
  while (highlights.length < 4 && defaultIdx < defaultItems.length) {
    const item = defaultItems[defaultIdx]
    if (!highlights.some(h => h.text.toLowerCase() === item.text.toLowerCase())) {
      highlights.push(item)
    }
    defaultIdx++
  }

  // Visual layout coloring polish: veg/non-veg status keeps its color, others alternate nicely
  return highlights.slice(0, 4).map((h, idx) => {
    if (h.type === 'veg_status') return h
    return {
      ...h,
      color: idx % 2 === 0 ? 'bg-ozo-green' : 'bg-ozo-red'
    }
  })
}

const ProductDetail = () => {
  const { city, category, slug } = useParams()
  const navigate = useNavigate()
  const selectedCitySlug = useLocationStore(state => state.selectedCitySlug)
  const setSelectedCitySlug = useLocationStore(state => state.setSelectedCitySlug)
  const address = useLocationStore(state => state.address)
  const coordinates = useLocationStore(state => state.coordinates)
  const addressDetails = useLocationStore(state => state.addressDetails)
  const activeCities = useLocationStore(state => state.activeCities)
  const isFirstMount = useRef(true)

  const [quantity, setQuantity] = useState(1)
  const [activeTab, setActiveTab] = useState('description')
  const [relatedProducts, setRelatedProducts] = useState([])
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)

  const handleShare = () => {
    setIsShareModalOpen(true)
  }

  const handleCopyLink = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl)
        .then(() => {
          setCopied(true)
          toast.success('Link copied to clipboard!')
          setTimeout(() => setCopied(false), 2000)
        })
        .catch((err) => {
          console.error('Failed to copy link:', err)
          toast.error('Failed to copy link')
        })
    } else {
      try {
        const textArea = document.createElement('textarea')
        textArea.value = shareUrl
        textArea.style.position = 'fixed'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        const successful = document.execCommand('copy')
        document.body.removeChild(textArea)
        if (successful) {
          setCopied(true)
          toast.success('Link copied to clipboard!')
          setTimeout(() => setCopied(false), 2000)
        } else {
          throw new Error('Fallback copy command was unsuccessful')
        }
      } catch (err) {
        console.error('Fallback copy failed:', err)
        toast.error('Failed to copy link')
      }
    }
  }

  const currentProduct = useProductStore(state => state.currentProduct)
  const fetchProductBySlug = useProductStore(state => state.fetchProductBySlug)
  const fetchProducts = useProductStore(state => state.fetchProducts)
  const isProductDetailLoading = useProductStore(state => state.isProductDetailLoading)
  const [isError, setIsError] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)

  const categorySlug = currentProduct?.category?.slug || 'item'

  const shareUrl = selectedCitySlug
    ? `${window.location.origin}/${selectedCitySlug}/${categorySlug}/${slug}`
    : `${window.location.origin}/product/${categorySlug}/${slug}`
  
  const addToCart = useCartStore(state => state.addToCart)
  const updateQuantity = useCartStore(state => state.updateQuantity)
  const launchConfig = useCartStore(state => state.launchConfig)

  const toggleWishlist = useWishlistStore(state => state.toggleWishlist)
  const isInWishlist = useWishlistStore(state => state.isInWishlist)

  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const user = useAuthStore(state => state.user)
  const authProfile = useAuthStore(state => state.profile)
  const isAdmin = useAuthStore(state => state.isAdmin)
  const [isUpdatingAvailability, setIsUpdatingAvailability] = useState(false)
  const [isNotified, setIsNotified] = useState(() => {
    try {
      return localStorage.getItem(`notify_prod_${currentProduct?.id}`) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (currentProduct?.id) {
      try {
        setIsNotified(localStorage.getItem(`notify_prod_${currentProduct.id}`) === 'true')
      } catch {
        setIsNotified(false)
      }
    } else {
      setIsNotified(false)
    }
  }, [currentProduct])

  const handleNotifyMe = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      const permission = await promptOneSignalPush();
      if (permission === 'granted') {
        localStorage.setItem(`notify_prod_${currentProduct?.id}`, 'true');
        setIsNotified(true);
        await oneSignalAddTag(`notify_prod_${currentProduct?.id}`, 'true');

        toast.success(`We will notify you when ${currentProduct?.name} is back in stock!`, {
          icon: '🔔',
          style: {
            borderRadius: '16px',
            background: '#333',
            color: '#fff',
          }
        });
      }
    } catch (err) {
      console.error('[OneSignal] Notification request failed:', err);
    }
  };

  const toggleAvailability = async () => {
    if (!currentProduct?.id) return
    setIsUpdatingAvailability(true)
    const newStatus = !currentProduct.is_available
    const toastId = toast.loading(newStatus ? 'Marking as In Stock...' : 'Marking as Out of Stock...')
    try {
      const { error } = await supabaseAdmin
        .from('products')
        .update({ is_available: newStatus })
        .eq('id', currentProduct.id)

      if (error) throw error

      await fetchProductBySlug(slug)
      toast.success(newStatus ? 'Product marked In Stock!' : 'Product marked Out of Stock!', { id: toastId })
    } catch (err) {
      console.error('Error toggling availability:', err)
      toast.error('Failed to update product availability', { id: toastId })
    } finally {
      setIsUpdatingAvailability(false)
    }
  }

  // Reviews State
  const [reviews, setReviews] = useState([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [newRating, setNewRating] = useState(5)
  const [newReviewText, setNewReviewText] = useState('')
  const [reviewImageUrls, setReviewImageUrls] = useState([])
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)

  const detailTextareaRef = useRef(null)

  useEffect(() => {
    if (detailTextareaRef.current) {
      detailTextareaRef.current.style.height = 'auto'
      detailTextareaRef.current.style.height = `${detailTextareaRef.current.scrollHeight}px`
    }
  }, [newReviewText, currentProduct])

  const fetchReviews = async () => {
    if (!currentProduct?.id) return
    setReviewsLoading(true)
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          user:users (
            full_name,
            avatar_url
          )
        `)
        .eq('product_id', currentProduct.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setReviews(data || [])
    } catch (err) {
      console.error('Error fetching reviews:', err)
    } finally {
      setReviewsLoading(false)
    }
  }

  useEffect(() => {
    if (currentProduct?.id) {
      fetchReviews()
    }
  }, [currentProduct?.id])

  const handleSubmitReview = async (e) => {
    e.preventDefault()
    if (!isAuthenticated || !authProfile?.id) {
      toast.error('Please login to write a review')
      return
    }

    if (!newReviewText.trim()) {
      toast.error('Please enter review text')
      return
    }

    setIsSubmittingReview(true)
    const toastId = toast.loading('Submitting your review...')

    try {
      let isVerified = false
      try {
        const { data: userOrders, error: orderErr } = await supabase
          .from('orders')
          .select('id')
          .eq('user_id', authProfile.id)
          .in('status', ['delivered', 'DELIVERED_VERIFYING', 'COMPLETED'])
        
        if (!orderErr && userOrders && userOrders.length > 0) {
          const orderIds = userOrders.map(o => o.id)
          const { data: orderedItem, error: itemErr } = await supabase
            .from('order_items')
            .select('id')
            .in('order_id', orderIds)
            .eq('product_id', currentProduct?.id)
            .limit(1)
          
          if (!itemErr && orderedItem && orderedItem.length > 0) {
            isVerified = true
          }
        }
      } catch (err) {
        console.warn('Could not check user order verification:', err)
      }

      const hasImage = reviewImageUrls && reviewImageUrls.length > 0
      const reviewPayload = {
        product_id: currentProduct?.id,
        user_id: authProfile.id,
        rating: newRating,
        review_text: newReviewText.trim(),
        is_verified: isVerified,
        image_url: reviewImageUrls[0] || null,
        images: reviewImageUrls,
        is_image_approved: hasImage ? false : null
      }

      const { error } = await supabase
        .from('reviews')
        .insert([reviewPayload])

      if (error) throw error

      toast.success('Review submitted successfully!', { id: toastId })
      setNewRating(5)
      setNewReviewText('')
      setReviewImageUrls([])
      fetchReviews()
    } catch (err) {
      console.error('Error submitting review:', err)
      toast.error(err.message || 'Failed to submit review', { id: toastId })
    } finally {
      setIsSubmittingReview(false)
    }
  }

  const cartQuantity = useCartStore(
    useCallback(
      (state) => currentProduct?.id ? state.items.find(item => item.productId === currentProduct.id)?.quantity || 0 : 0,
      [currentProduct?.id]
    )
  )
  const isFavorite = useWishlistStore(
    useCallback(
      (state) => currentProduct?.id ? state.items.some(item => item.productId === currentProduct.id) : false,
      [currentProduct?.id]
    )
  )

  const [variants, setVariants] = useState([])
  const [activeImage, setActiveImage] = useState(null)
  const [isDark, setIsDark] = useState(false)
  const [imageBgColor, setImageBgColor] = useState(null)

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

  // Callback to detect background color of product image on load
  const handleImageLoad = useCallback((e) => {
    const img = e.target
    if (!img) return

    // If it's a data url, ignore
    if (img.src && img.src.startsWith('data:')) return

    try {
      const canvas = document.createElement('canvas')
      canvas.width = 10
      canvas.height = 10
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const tempImg = new Image()
      tempImg.crossOrigin = 'anonymous'
      tempImg.src = img.src
      tempImg.onload = () => {
        try {
          ctx.drawImage(tempImg, 0, 0, 10, 10)
          const corners = [
            ctx.getImageData(0, 0, 1, 1).data,
            ctx.getImageData(9, 0, 1, 1).data,
            ctx.getImageData(0, 9, 1, 1).data,
            ctx.getImageData(9, 9, 1, 1).data
          ]

          // Check if corners are white/off-white (opaque)
          const isWhite = corners.every(c => c[0] > 240 && c[1] > 240 && c[2] > 240 && c[3] > 10)
          if (isWhite) {
            setImageBgColor('#ffffff')
          } else {
            const isTransparent = corners.every(c => c[3] < 30)
            if (isTransparent) {
              setImageBgColor('transparent')
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
                setImageBgColor(`rgb(${r}, ${g}, ${b})`)
              } else {
                setImageBgColor('transparent')
              }
            }
          }
        } catch (err) {
          // Fallback
        }
      }
      tempImg.onerror = () => {
        const isProduct = img.src?.includes('ibb.co') || img.src?.includes('freeimage') || img.src?.includes('imagekit')
        if (isProduct) {
          setImageBgColor('#ffffff')
        }
      }
    } catch (err) {
      // Swallowed
    }
  }, [])

  // Track current loading session id to discard stale fetch results (e.g. from aborted requests in Strict Mode)
  const loadIdRef = useRef(0)

  // Stable load function stored in ref so visibility handler can call it
  const loadProduct = useCallback(async (productSlug) => {
    const currentLoadId = ++loadIdRef.current
    setIsError(false)
    setIsInitializing(true)
    const result = await fetchProductBySlug(productSlug)
    
    // If a newer load has started, ignore this stale result entirely to prevent race conditions
    if (currentLoadId !== loadIdRef.current) return

    if (!result.success || !result.data) {
      setIsError(true)
      setIsInitializing(false)
      return
    }

    setActiveImage(result.data.image_url)
    setImageBgColor(null)

    // Track recently viewed product
    try {
      const viewed = JSON.parse(localStorage.getItem('ozo_recently_viewed') || '[]')
      const filtered = viewed.filter(id => id !== result.data.id)
      filtered.unshift(result.data.id)
      localStorage.setItem('ozo_recently_viewed', JSON.stringify(filtered.slice(0, 10)))
    } catch (e) {
      console.error('Failed to track recently viewed:', e)
    }

    // Fetch all products from same category to find variants (including out of stock ones)
    const related = await fetchProducts({
      categoryId: result.data.category_id,
      includeUnavailable: true
    })
    
    // Check if stale before updating state from related products call
    if (currentLoadId !== loadIdRef.current) return

    if (related.success) {
      const foundVariants = getProductVariants(result.data, related.data)
      setVariants(foundVariants)

      const variantIds = new Set(foundVariants.map(v => v.id))
      const filteredRelated = related.data.filter(
        p => p.id !== result.data.id && !variantIds.has(p.id)
      )
      setRelatedProducts(filteredRelated.slice(0, 5))
    }

    setIsInitializing(false)
  }, [fetchProductBySlug, fetchProducts])

  // Ref so visibility handler always sees the latest loadProduct + slug
  const loadProductRef = useRef(loadProduct)
  const slugRef = useRef(slug)
  useEffect(() => { loadProductRef.current = loadProduct }, [loadProduct])
  useEffect(() => { slugRef.current = slug }, [slug])

  // Synchronize URL parameters with location store and product category
  useEffect(() => {
    if (!currentProduct) return

    const isUrlCityValid = activeCities && activeCities.some(c => c.slug === city)
    
    // Determine the correct city/product segment
    let targetCitySegment = 'product'
    
    if (address) {
      const matchedCity = findMatchingActiveCityForDetails(address, coordinates, addressDetails, activeCities)
      if (matchedCity) {
        targetCitySegment = matchedCity.slug
        if (selectedCitySlug !== matchedCity.slug) {
          setSelectedCitySlug(matchedCity.slug)
        }
      } else {
        if (selectedCitySlug !== null) {
          setSelectedCitySlug(null)
        }
      }
    } else {
      // Temporarily use URL city if valid and no location is set yet
      if (isUrlCityValid) {
        targetCitySegment = city
        if (selectedCitySlug !== city) {
          setSelectedCitySlug(city)
        }
      }
    }

    // Check if the current URL matches the target structure
    // If not, perform the redirect
    const targetUrl = targetCitySegment === 'product'
      ? `/product/${categorySlug}/${slug}`
      : `/${targetCitySegment}/${categorySlug}/${slug}`

    if (window.location.pathname !== targetUrl) {
      navigate(targetUrl, { replace: true })
    }
  }, [
    currentProduct,
    selectedCitySlug,
    city,
    category,
    slug,
    address,
    coordinates,
    addressDetails,
    activeCities,
    navigate,
    setSelectedCitySlug
  ])

  // Primary load — fires when slug changes
  useEffect(() => {
    loadProduct(slug)
    window.scrollTo(0, 0)
    return () => {
      // Invalidate any in-flight loads on slug change or unmount
      loadIdRef.current++
    }
  }, [slug, loadProduct])

  // Page Visibility API — when user returns from background (tab switch,
  // mobile app switch, screen lock) and product data is missing, re-fetch
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && !currentProduct) {
        loadProductRef.current(slugRef.current)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [currentProduct])

  const handleAddToCart = useCallback(async () => {
    const cartState = useCartStore.getState()
    const result = await cartState.addToCart(currentProduct, quantity)
    if (!result.success) {
      toast.error('Failed to add to cart')
    }
  }, [currentProduct, quantity])

  const handleIncrement = useCallback(() => {
    const cartState = useCartStore.getState()
    const item = currentProduct?.id ? cartState.items.find(i => i.productId === currentProduct.id) : null
    const currentQty = item ? cartQuantity : quantity
    const availableStock = currentProduct?.quantity_available !== undefined && currentProduct.quantity_available !== null
      ? currentProduct.quantity_available
      : Infinity

    if (currentQty >= availableStock) {
      toast.error(`Only ${availableStock} units available in stock`)
      return
    }

    if (item) {
      cartState.updateQuantity(item.id, cartQuantity + 1)
    } else {
      setQuantity(prev => prev + 1)
    }
  }, [currentProduct, cartQuantity, quantity])

  const handleDecrement = useCallback(() => {
    const cartState = useCartStore.getState()
    const item = currentProduct?.id ? cartState.items.find(i => i.productId === currentProduct.id) : null
    if (item) {
      if (cartQuantity > 0) {
        cartState.updateQuantity(item.id, cartQuantity - 1)
      }
    } else {
      setQuantity(prev => (prev > 1 ? prev - 1 : 1))
    }
  }, [currentProduct, cartQuantity])

  const handleToggleWishlist = useCallback(() => {
    const authState = useAuthStore.getState()
    if (!authState.isAuthenticated) {
      toast.error('Please login to add to wishlist')
      return
    }
    const wishlistState = useWishlistStore.getState()
    wishlistState.toggleWishlist(currentProduct)
  }, [currentProduct])

  const isOutOfStock = !currentProduct?.is_available || (currentProduct?.quantity_available !== undefined && currentProduct.quantity_available === 0)

  const isUpcoming = (launchConfig?.launch_mode_enabled && isOutOfStock)
    ? true
    : (currentProduct?.is_upcoming || false);

  const discountPercentage = currentProduct?.price && currentProduct?.mrp && currentProduct.mrp > currentProduct.price 
    ? Math.round(((currentProduct.mrp - currentProduct.price) / currentProduct.mrp) * 100) 
    : 0

  const averageRating = Array.isArray(reviews) && reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + (r?.rating || 0), 0) / reviews.length).toFixed(1)
    : '0.0'

  const totalReviewsCount = reviews.length
  const ratingDistribution = [5, 4, 3, 2, 1].map(stars => {
    const count = Array.isArray(reviews) ? reviews.filter(r => r?.rating === stars).length : 0
    const percentage = totalReviewsCount > 0 ? Math.round((count / totalReviewsCount) * 100) : 0
    return { stars, count, percentage }
  })

  const productSchema = useMemo(() => {
    if (!currentProduct) return null
    
    const schema = {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": currentProduct.name,
      "image": [
        currentProduct.image_url,
        ...(Array.isArray(currentProduct.images) ? currentProduct.images : [])
      ].filter(img => img && !img.includes('raw.githubusercontent.com') && !img.includes('logo_transparent.png')),
      "description": currentProduct.description || `${currentProduct.name} - high quality grocery item from OZO Mart.`,
      "sku": `OZO-${currentProduct.id}`,
      "mpn": currentProduct.id,
      "category": currentProduct.category?.name || "Groceries",
      "brand": {
        "@type": "Brand",
        "name": currentProduct.brand || "OZO Mart"
      },
      "offers": {
        "@type": "Offer",
        "url": window.location.href,
        "priceCurrency": "INR",
        "price": currentProduct.price,
        "priceValidUntil": new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString().split('T')[0],
        "itemCondition": "https://schema.org/NewCondition",
        "availability": currentProduct.is_available 
          ? "https://schema.org/InStock" 
          : "https://schema.org/OutOfStock",
        "seller": {
          "@type": "Organization",
          "name": "OZO Mart",
          "url": "https://ozomart.store"
        }
      }
    }

    if (Array.isArray(reviews) && reviews.length > 0) {
      const ratingVal = Number(averageRating)
      schema.aggregateRating = {
        "@type": "AggregateRating",
        "ratingValue": ratingVal > 0 ? ratingVal : 5,
        "reviewCount": reviews.length,
        "bestRating": "5",
        "worstRating": "1"
      }
      schema.review = reviews.slice(0, 5).map(r => ({
        "@type": "Review",
        "author": {
          "@type": "Person",
          "name": r.user?.full_name || "OZO Customer"
        },
        "datePublished": new Date(r.created_at).toISOString().split('T')[0],
        "reviewBody": r.review_text,
        "reviewRating": {
          "@type": "Rating",
          "ratingValue": r.rating,
          "bestRating": "5",
          "worstRating": "1"
        }
      }))
    }

    return schema
  }, [currentProduct, reviews, averageRating])

  const breadcrumbItems = useMemo(() => {
    const items = [
      { name: 'Home', url: '/' },
      { name: 'Categories', url: '/categories' }
    ]
    if (currentProduct?.category) {
      items.push({
        name: currentProduct.category.name,
        url: `/category/${currentProduct.category.slug}`
      })
    }
    items.push({
      name: currentProduct?.name || 'Product',
      url: null
    })
    return items
  }, [currentProduct])

  // BreadcrumbList schema — shows breadcrumb trail in Google search snippets (boosts CTR)
  const breadcrumbSchema = useMemo(() => {
    if (!currentProduct) return productSchema
    const base = 'https://ozomart.store'
    return {
      "@context": "https://schema.org",
      "@graph": [
        ...(productSchema ? [productSchema] : []),
        {
          "@type": "BreadcrumbList",
          "itemListElement": breadcrumbItems
            .filter(item => item.url)
            .map((item, i) => ({
              "@type": "ListItem",
              "position": i + 1,
              "name": item.name,
              "item": item.url.startsWith('http') ? item.url : `${base}${item.url}`
            }))
        }
      ]
    }
  }, [currentProduct, breadcrumbItems, productSchema])

  const isLoading = isInitializing || isProductDetailLoading

  return (
    <OzoLoadingGuard
      isLoading={isLoading}
      isError={isError}
      isEmpty={!isLoading && !currentProduct}
      skeleton={
        <div className="container-custom py-12">
          <div className="flex flex-col md:flex-row gap-12">
            <div className="w-full md:w-1/2 aspect-square rounded-[3rem] shimmer" />
            <div className="w-full md:w-1/2 space-y-6">
              <div className="h-10 w-3/4 shimmer rounded-2xl" />
              <div className="h-6 w-1/4 shimmer rounded-xl" />
              <div className="h-24 w-full shimmer rounded-3xl" />
              <div className="h-16 w-1/2 shimmer rounded-2xl" />
            </div>
          </div>
        </div>
      }
      fallback={
        <div className="container-custom py-20 text-center">
          <h2 className="text-3xl font-black mb-4">Product not found</h2>
          <button onClick={() => navigate('/')} className="btn btn-primary">Go Home</button>
        </div>
      }
    >
      <div className="min-h-screen bg-ozo-gray-bg dark:bg-[#0a0a0a] transition-colors duration-500">
        {currentProduct && (
          <SEO 
            title={`${currentProduct.name} (${currentProduct.unit}) | OZO Mart`}
            description={currentProduct.description || `Order ${currentProduct.name} (${currentProduct.unit}) online on OZO Mart. Swift 30-minute grocery delivery in Patna & Aurangabad.`}
            keywords={`${currentProduct.name}, buy ${currentProduct.name} online, ${currentProduct.brand || 'Ozo Fresh'} products, Patna grocery, Aurangabad grocery`}
            canonical={`https://www.ozomart.store/product/${slug}`}
            schema={breadcrumbSchema}
          />
        )}
      {/* Breadcrumbs & Back */}
      <div className="container-custom pt-6 md:pt-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          {/* Breadcrumb Path */}
          <Breadcrumb items={breadcrumbItems} className="flex-1" />

          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-ozo-gray hover:text-ozo-red font-black text-xs uppercase tracking-widest transition-colors self-start md:self-auto flex-shrink-0"
          >
            <ChevronLeft size={16} />
            Back to Shopping
          </button>
        </div>
      </div>

      <div className="container-custom pb-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-12 xl:gap-16 items-start">
          {/* Left: Product Image */}
          <div className="md:col-span-5 lg:col-span-5 xl:col-span-5 max-w-lg mx-auto md:max-w-none w-full">
             <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               className="relative rounded-[2.5rem] overflow-hidden bg-white dark:bg-[#111111] border border-gray-150 dark:border-white/10 shadow-premium group"
             >
                {/* Badges */}
                <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                   {discountPercentage > 0 && (
                     <span className="bg-ozo-red text-white text-[11px] font-black px-3 py-1.5 rounded-xl shadow-lg backdrop-blur-md">
                       {discountPercentage}% SAVINGS
                     </span>
                   )}
                   {currentProduct?.is_featured && (
                     <span className="bg-ozo-green text-white text-[11px] font-black px-3 py-1.5 rounded-xl shadow-lg backdrop-blur-md flex items-center gap-1.5">
                       <Zap size={13} className="fill-white" />
                       FEATURED
                     </span>
                   )}
                </div>

                 {/* Actions */}
                 <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
                    <button 
                     onClick={handleToggleWishlist}
                     className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-90 ${
                       isFavorite ? 'bg-ozo-red text-white' : 'bg-white/90 dark:bg-black/60 backdrop-blur-md text-gray-400 hover:text-ozo-red'
                     }`}
                    >
                      <Heart size={20} className={isFavorite ? 'fill-white' : ''} />
                    </button>
                    <button 
                       onClick={handleShare}
                       className="w-10 h-10 rounded-full bg-white/90 dark:bg-black/60 backdrop-blur-md flex items-center justify-center text-gray-400 hover:text-ozo-red shadow-lg transition-all active:scale-90"
                     >
                       <Share2 size={20} />
                     </button>
                 </div>

                 <div className={`w-full aspect-[4/3.8] max-h-[440px] flex items-center justify-center p-6 sm:p-8 md:p-10 relative transition-colors duration-300 ${
                    (!imageBgColor || (isDark && imageBgColor !== '#ffffff')) ? 'bg-gray-50/80 dark:bg-[#181818]' : ''
                  }`}
                  style={{ 
                    backgroundColor: imageBgColor === '#ffffff' 
                      ? (isDark ? '#f3f4f6' : '#ffffff') 
                      : (imageBgColor || undefined) 
                  }}>
                    <button 
                      onClick={() => setIsImageModalOpen(true)}
                      className="w-full h-full flex items-center justify-center cursor-zoom-in focus:outline-none"
                    >
                      <OptimizedImage 
                        src={activeImage || currentProduct?.image_url} 
                        slug={(!activeImage || activeImage === currentProduct?.image_url) ? currentProduct?.slug : undefined}
                        alt={currentProduct?.name}
                        width={800}
                        quality={95}
                        loading="eager"
                        fetchPriority="high"
                        className={`max-h-[300px] sm:max-h-[360px] w-auto h-auto max-w-full object-contain transition-transform duration-500 group-hover:scale-105 drop-shadow-sm ${
                          isOutOfStock ? 'grayscale opacity-50 contrast-75' : ''
                        }`}
                        containerClassName="w-full h-full flex items-center justify-center"
                         onLoad={handleImageLoad}
                         style={{ mixBlendMode: (isDark && imageBgColor === '#ffffff') ? 'multiply' : undefined }}
                      />
                    </button>
                    
                    {isOutOfStock && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/5 dark:bg-black/20 pointer-events-none select-none">
                        <div className="flex flex-col items-center gap-2">
                          {isUpcoming ? (
                            <div className="bg-amber-500 text-white font-black text-xs sm:text-sm px-6 py-3 rounded-2xl shadow-xl tracking-widest uppercase flex items-center gap-2 border border-white/20">
                              Listing Soon
                            </div>
                          ) : (
                            <div className="bg-ozo-red/90 text-white font-black text-xs sm:text-sm px-6 py-3 rounded-2xl shadow-xl tracking-widest uppercase flex items-center gap-2 border border-white/20">
                              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                              OUT OF STOCK
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                {/* Zoom Indicator */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/30 backdrop-blur-md rounded-full text-white/80 text-[9px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  Click to view full image
                </div>
             </motion.div>

             {/* Thumbnail gallery */}
             {Array.isArray(currentProduct?.images) && 
              currentProduct.images.filter(img => img && !img.includes('raw.githubusercontent.com') && !img.includes('logo_transparent.png')).length > 0 && (
               <div className="flex gap-3 mt-4 justify-center flex-wrap">
                 {currentProduct.images
                   .filter(img => img && !img.includes('raw.githubusercontent.com') && !img.includes('logo_transparent.png'))
                   .map((imgUrl, index) => (
                     <button
                       key={index}
                        onClick={() => {
                          setActiveImage(imgUrl)
                          setImageBgColor(null)
                        }}
                       className={`w-16 h-16 rounded-xl overflow-hidden border-2 bg-white dark:bg-[#111111] p-1.5 flex items-center justify-center transition-all ${
                         (activeImage || currentProduct?.image_url) === imgUrl
                           ? 'border-ozo-red shadow-md scale-105'
                           : 'border-transparent opacity-70 hover:opacity-100'
                       }`}
                     >
                        <OptimizedImage
                          src={imgUrl}
                          alt={`${currentProduct?.name} - View ${index + 1}`}
                          width={120}
                          className="w-full h-full object-contain"
                          containerClassName="w-full h-full"
                        />
                     </button>
                   ))}
               </div>
             )}
          </div>

          {/* Right: Product Info */}
          <div className="md:col-span-7 lg:col-span-7 xl:col-span-7 flex flex-col">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <span className="px-3 py-1 bg-red-50 dark:bg-ozo-red/10 text-ozo-red text-[10px] font-black uppercase tracking-widest rounded-lg border border-ozo-red/10">
                  {currentProduct?.category?.name || 'Fresh Produce'}
                </span>
                {currentProduct?.brand && (
                  <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-lg border border-emerald-500/10">
                    Brand: {currentProduct.brand}
                  </span>
                )}
                {currentProduct?.is_available ? (
                   <span className="flex items-center gap-1.5 text-ozo-green text-[10px] font-black uppercase tracking-widest">
                     <div className="w-2 h-2 rounded-full bg-ozo-green animate-pulse" />
                     In Stock
                   </span>
                ) : (
                  <div className="flex flex-col gap-0.5">
                    {isUpcoming ? (
                      <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Listing Soon</span>
                    ) : (
                      <span className="text-ozo-red text-[10px] font-black uppercase tracking-widest">Out of Stock</span>
                    )}
                  </div>
                )}
                {isAdmin && (
                  <button
                    onClick={toggleAvailability}
                    disabled={isUpdatingAvailability}
                    className="ml-auto flex items-center gap-1.5 px-3 py-1 bg-zinc-100 hover:bg-zinc-200 dark:bg-white/10 dark:hover:bg-white/15 text-zinc-800 dark:text-zinc-200 text-[10px] font-black uppercase tracking-widest rounded-lg transition-colors border border-black/10 dark:border-white/10 active:scale-95 disabled:opacity-50"
                  >
                    {isUpdatingAvailability ? (
                      <Loader2 className="w-3 h-3 animate-spin text-ozo-red" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    )}
                    Toggle Status (Admin)
                  </button>
                )}
              </div>

              {currentProduct?.brand && (
                <div className="text-xs font-black uppercase tracking-[0.2em] text-ozo-red mb-1.5">
                  {currentProduct.brand}
                </div>
              )}
              <h1 className="text-3xl md:text-3xl lg:text-4xl xl:text-5xl font-black text-gray-900 dark:text-white mb-2 leading-tight break-words">
                {currentProduct?.name}
              </h1>
              <p className="text-xl font-bold text-ozo-gray dark:text-gray-400 mb-6">{currentProduct?.unit}</p>

              {/* Variant Selector */}
              {variants && variants.length > 1 && (
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Select Variety:
                    </h3>
                    <span className="text-[10px] text-ozo-gray font-bold uppercase tracking-wider animate-pulse-slow">
                      ← Swipe for more →
                    </span>
                  </div>
                  
                  <div className="flex gap-3 overflow-x-auto pb-3 pt-1 -mx-2 px-2 scrollbar-hide snap-x snap-mandatory touch-pan-x">
                    {variants.map((v) => {
                      const isSelected = v.id === currentProduct?.id
                      return (
                        <Link
                          key={v.id}
                          to={selectedCitySlug 
                            ? `/${selectedCitySlug}/${categorySlug}/${v.slug}` 
                            : `/product/${categorySlug}/${v.slug}`}
                          className={`flex flex-col items-center p-3.5 pb-4 rounded-[1.5rem] border transition-all duration-300 active:scale-95 flex-shrink-0 snap-start select-none w-[150px] shadow-sm text-center ${
                            isSelected
                              ? 'border-ozo-red bg-red-50/50 dark:bg-ozo-red/10 ring-2 ring-ozo-red/20 shadow-premium'
                              : 'bg-white dark:bg-[#111111] text-gray-700 dark:text-gray-300 border-gray-150 dark:border-white/10 hover:border-ozo-red/40 hover:bg-gray-50 dark:hover:bg-white/[0.02]'
                          } ${!v.is_available ? 'opacity-75' : ''}`}
                        >
                          {/* Variant Image */}
                          <div className={`w-24 h-24 rounded-2xl bg-gray-50 dark:bg-[#181818] p-2 flex items-center justify-center border flex-shrink-0 transition-colors ${
                            isSelected ? 'border-ozo-red/30 bg-white dark:bg-black/20' : 'border-gray-100 dark:border-white/5'
                          }`}>
                            <OptimizedImage 
                              src={v.image_url} 
                              slug={v.slug}
                              alt={v.variantName}
                              width={200}
                              quality={85}
                              className="w-full h-full object-contain"
                              containerClassName="w-full h-full"
                            />
                          </div>

                          {/* Variant Info */}
                          <div className="flex flex-col items-center mt-3 w-full">
                            <span className={`text-xs font-black line-clamp-2 min-h-[2rem] leading-tight ${
                              isSelected ? 'text-ozo-red' : 'text-gray-900 dark:text-white'
                            }`}>
                              {v.variantName}
                            </span>
                            <span className="text-[10px] text-ozo-gray dark:text-gray-400 font-extrabold mt-1">
                              {v.unit}
                            </span>
                            <span className={`text-xs font-black mt-1 ${
                              v.is_available ? 'text-gray-900 dark:text-white' : 'text-ozo-red font-bold'
                            }`}>
                              {v.is_available ? `₹${v.price}` : (launchConfig?.launch_mode_enabled || v.is_upcoming ? 'Listing Soon' : 'Out of Stock')}
                            </span>
                            {!v.is_available && (
                              <span className="text-[9px] font-bold text-amber-500 uppercase tracking-wider mt-0.5 leading-none">
                                {(launchConfig?.launch_mode_enabled || v.is_upcoming) ? 'Listing Soon' : 'Out of Stock'}
                              </span>
                            )}
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )}


              {/* Price & Action Section */}
              <div className="bg-white dark:bg-[#111111] p-5 sm:p-6 lg:p-8 rounded-[2.5rem] border border-gray-100 dark:border-white/5 shadow-premium mb-8 relative overflow-hidden">
                {/* Active Cart Status Banner if item is in cart */}
                {cartQuantity > 0 && (
                  <div className="mb-4 flex items-center justify-between px-4 py-2.5 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider">
                      <Check size={16} className="stroke-[3px]" />
                      <span>{cartQuantity} {cartQuantity === 1 ? 'item' : 'items'} in your Basket</span>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-500 text-white px-2.5 py-0.5 rounded-full shadow-sm">
                      Active in Cart
                    </span>
                  </div>
                )}

                <div className="flex items-baseline justify-between gap-4 mb-2">
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <span className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 dark:text-white tracking-tight">
                      {currentProduct?.price 
                        ? `₹${currentProduct.price * (cartQuantity > 0 ? cartQuantity : quantity)}` 
                        : 'Price on Request'}
                    </span>
                    {currentProduct?.price && currentProduct?.mrp && currentProduct.mrp > currentProduct.price && (
                      <div className="flex items-center gap-2">
                        <span className="text-lg sm:text-xl text-ozo-gray line-through font-bold">
                          ₹{(currentProduct?.mrp || 0) * (cartQuantity > 0 ? cartQuantity : quantity)}
                        </span>
                        {discountPercentage > 0 && (
                          <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                            {discountPercentage}% OFF
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {currentProduct?.unit && (
                  <p className="text-xs sm:text-sm font-extrabold text-gray-500 dark:text-gray-400 mb-1">
                    Net Quantity: {currentProduct.unit}
                  </p>
                )}
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-6 font-semibold">Inclusive of all taxes</p>

                {/* Main Action Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
                  {isOutOfStock ? (
                    <div className="w-full flex flex-col gap-2">
                      {isUpcoming ? (
                        <div className="text-xs sm:text-sm font-black uppercase text-amber-500 dark:text-amber-400 tracking-wider flex items-center gap-1.5 justify-start">
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                          Listing Soon
                        </div>
                      ) : (
                        <div className="text-xs sm:text-sm font-black uppercase text-ozo-red tracking-wider flex items-center gap-1.5 justify-start">
                          <span className="w-2 h-2 rounded-full bg-ozo-red animate-pulse" />
                          Out of Stock
                        </div>
                      )}
                      {((isUpcoming && launchConfig?.show_listing_soon_btn !== false) || 
                        (!isUpcoming && launchConfig?.show_out_of_stock_btn !== false)) && (
                        <button
                          onClick={handleNotifyMe}
                          className={`w-full h-14 rounded-2xl font-black text-sm sm:text-base uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg border ${
                            isNotified
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                              : 'border-ozo-red/30 text-ozo-red bg-ozo-red/5 hover:bg-gradient-ozo hover:text-white hover:border-transparent active:scale-95'
                          }`}
                        >
                          {isNotified ? (
                            <>
                              <Check size={20} className="stroke-[3px]" />
                              <span>Notification Requested</span>
                            </>
                          ) : (
                            <>
                              <Bell size={20} className="stroke-[2.5px]" />
                              <span>{isUpcoming ? 'Request to Get Notification' : 'Request Notification'}</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 sm:gap-3 w-full">
                      {/* Quantity Stepper */}
                      <div className={`flex items-center justify-between rounded-2xl p-1 sm:p-1.5 border transition-all duration-300 shrink-0 ${
                        cartQuantity > 0 
                          ? 'bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                          : 'bg-gray-50 dark:bg-[#1a1a20] border-gray-200 dark:border-white/10 text-gray-900 dark:text-white'
                      }`}>
                        <button 
                          onClick={handleDecrement}
                          disabled={!currentProduct?.price || !currentProduct?.is_available}
                          className={`w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center rounded-xl transition-all active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed ${
                            cartQuantity > 0 
                              ? 'hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                              : 'hover:bg-white dark:hover:bg-white/10 text-gray-700 dark:text-gray-200'
                          }`}
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3px]" />
                        </button>

                        <span className="w-7 sm:w-9 text-center font-black text-base sm:text-lg select-none">
                          {cartQuantity > 0 ? cartQuantity : quantity}
                        </span>

                        <button 
                          onClick={handleIncrement}
                          disabled={!currentProduct?.price || !currentProduct?.is_available}
                          className={`w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center rounded-xl transition-all active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed ${
                            cartQuantity > 0 
                              ? 'hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                              : 'hover:bg-white dark:hover:bg-white/10 text-gray-700 dark:text-gray-200'
                          }`}
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3px]" />
                        </button>
                      </div>

                      {/* Primary Action Button */}
                      <button 
                        onClick={cartQuantity > 0 ? () => navigate('/cart') : handleAddToCart}
                        disabled={!currentProduct?.price || (!currentProduct?.is_available && cartQuantity === 0)}
                        className={`flex-1 h-12 sm:h-14 rounded-2xl font-black text-xs sm:text-base lg:text-lg tracking-wide sm:tracking-wider transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-1.5 sm:gap-2.5 px-3 sm:px-6 shadow-lg ${
                          !currentProduct?.price || (!currentProduct?.is_available && cartQuantity === 0)
                            ? 'opacity-50 cursor-not-allowed bg-gray-200 dark:bg-white/10 text-gray-400'
                            : cartQuantity > 0
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25 hover:shadow-emerald-600/40'
                              : 'bg-gradient-ozo text-white shadow-ozo hover:shadow-ozo-lg'
                        }`}
                      >
                        {!currentProduct?.price ? (
                          <span className="whitespace-nowrap">Price on Request</span>
                        ) : cartQuantity > 0 ? (
                          <>
                            <span className="whitespace-nowrap uppercase">View in Basket</span>
                            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5px] flex-shrink-0" />
                          </>
                        ) : (
                          <>
                            <span className="whitespace-nowrap uppercase">Add to Basket</span>
                            <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5px] flex-shrink-0" />
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Trust Badges */}
              <div className="grid grid-cols-2 gap-4 mb-10">
                 <div className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-[#111111] border border-gray-100 dark:border-white/5">
                    <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-ozo-red/10 flex items-center justify-center text-ozo-red">
                       <Clock size={20} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white">30 Mins</h4>
                      <p className="text-[10px] text-ozo-gray font-bold">Superfast Delivery</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-[#111111] border border-gray-100 dark:border-white/5">
                    <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-ozo-green/10 flex items-center justify-center text-ozo-green">
                       <ShieldCheck size={20} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white">Purest</h4>
                      <p className="text-[10px] text-ozo-gray font-bold">Quality Guaranteed</p>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </div>

        {/* Product Details Tabs (now outside the columns grid to span across the page) */}
          <div className="mt-12 mb-10 max-w-5xl">
            <div className="flex gap-6 sm:gap-8 border-b border-gray-100 dark:border-white/5 mb-6 overflow-x-auto scrollbar-none whitespace-nowrap">
              {['description', 'details', 'reviews'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-4 text-xs font-black uppercase tracking-[0.2em] transition-all relative flex-shrink-0 ${
                    activeTab === tab ? 'text-ozo-red' : 'text-ozo-gray hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {tab === 'reviews' ? `reviews (${totalReviewsCount})` : tab}
                  {activeTab === tab && (
                    <motion.div 
                      layoutId="tab-indicator"
                      className="absolute bottom-0 left-0 right-0 h-1 bg-ozo-red rounded-full" 
                    />
                  )}
                </button>
              ))}
            </div>
            
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-ozo-gray dark:text-gray-400 leading-relaxed font-medium"
            >
              {activeTab === 'description' && (
                <div className="space-y-4">
                  <p>{currentProduct?.description || 'Experience the finest quality items delivered straight to your door. Freshness you can taste, convenience you can trust.'}</p>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3.5 text-xs">
                    {getProductHighlights(currentProduct).map((highlight, idx) => (
                      <li key={idx} className="flex items-center gap-3 py-1 text-gray-800 dark:text-gray-200 font-bold transition-all hover:translate-x-1 duration-200">
                        <span className={`w-2.5 h-2.5 rounded-full ${highlight.color || 'bg-ozo-red'} shadow-sm ring-4 ${
                          highlight.color === 'bg-ozo-green' ? 'ring-emerald-500/10' : 'ring-red-500/10'
                        } flex-shrink-0`} />
                        <span>{highlight.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {activeTab === 'details' && (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-gray-50 dark:border-white/5">
                    <span className="font-bold">Shelf Life</span>
                    <span>{getShelfLifeString(currentProduct)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-50 dark:border-white/5">
                    <span className="font-bold">Unit</span>
                    <span>{currentProduct?.unit || '1 unit'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-50 dark:border-white/5">
                    <span className="font-bold">Brand</span>
                    <span>{currentProduct?.brand || 'Ozo Fresh'}</span>
                  </div>
                </div>
              )}
              {activeTab === 'reviews' && (
                <div className="space-y-8 text-left">
                  {/* Rating Stats Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 rounded-3xl bg-gray-50/50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                    {/* Average Rating */}
                    <div className="flex flex-col items-center justify-center text-center">
                      <p className="text-5xl font-black text-gray-900 dark:text-white mb-2">{averageRating}</p>
                      <div className="flex gap-1 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            size={18} 
                            className={`${
                              i < Math.round(Number(averageRating))
                                ? 'fill-yellow-400 text-yellow-400' 
                                : 'text-gray-300 dark:text-gray-600'
                            }`} 
                          />
                        ))}
                      </div>
                      <p className="text-xs text-ozo-gray font-medium">Based on {totalReviewsCount} {totalReviewsCount === 1 ? 'rating' : 'ratings'}</p>
                    </div>

                    {/* Rating Breakdown Progress Bars */}
                    <div className="md:col-span-2 space-y-2.5">
                      {ratingDistribution.map(({ stars, percentage, count }) => (
                        <div key={stars} className="flex items-center gap-3 text-xs">
                          <span className="w-12 font-bold flex items-center gap-1 justify-end">
                            {stars} <Star size={12} className="fill-yellow-400 text-yellow-400 inline" />
                          </span>
                          <div className="flex-1 h-2 bg-gray-200/60 dark:bg-white/10 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-ozo-red rounded-full" 
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="w-12 text-right text-ozo-gray font-medium">{percentage}% ({count})</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Review List */}
                  <div className="space-y-6">
                    <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-wider">
                      Customer Reviews ({totalReviewsCount})
                    </h3>

                    {reviewsLoading ? (
                      <div className="flex flex-col items-center justify-center py-10 space-y-3">
                        <Loader2 className="animate-spin text-ozo-red" size={32} />
                        <span className="text-xs text-ozo-gray">Loading reviews...</span>
                      </div>
                    ) : reviews.length === 0 ? (
                      <div className="text-center py-10 border border-dashed border-gray-200 dark:border-white/10 rounded-3xl">
                        <p className="text-sm font-medium text-ozo-gray mb-2">No reviews yet for this product.</p>
                        <p className="text-xs text-ozo-gray/60">Be the first to share your thoughts and help others make a decision!</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100 dark:divide-white/5 space-y-6">
                        {reviews.map((review) => (
                          <div key={review.id} className="pt-6 first:pt-0 space-y-3">
                            {/* User Meta */}
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-center gap-3">
                                <OptimizedImage 
                                  src={review.user?.avatar_url} 
                                  alt={review.user?.full_name || 'User'} 
                                  width={80}
                                  fallbackSrc="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"
                                  className="w-full h-full object-cover"
                                  containerClassName="w-10 h-10 rounded-full border border-gray-100 dark:border-white/10 flex-shrink-0"
                                />
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-bold text-sm text-gray-900 dark:text-white leading-none">
                                      {review.user?.full_name || 'Ozo Customer'}
                                    </h4>
                                    {review.is_verified && (
                                      <span className="inline-flex items-center gap-1 bg-green-500/10 text-green-500 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-green-500/20">
                                        <ShieldCheck size={10} className="fill-green-500/15" /> Verified Purchase
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-ozo-gray mt-1">
                                    {new Date(review.created_at).toLocaleDateString(undefined, { 
                                      year: 'numeric', 
                                      month: 'long', 
                                      day: 'numeric' 
                                    })}
                                  </p>
                                </div>
                              </div>

                              {/* Star Rating Display */}
                              <div className="flex gap-0.5">
                                {[...Array(5)].map((_, i) => (
                                  <Star 
                                    key={i} 
                                    size={14} 
                                    className={`${
                                      i < review.rating 
                                        ? 'fill-yellow-400 text-yellow-400' 
                                        : 'text-gray-200 dark:text-gray-700'
                                    }`} 
                                  />
                                ))}
                              </div>
                            </div>

                            {/* Review Text */}
                            <p 
                              className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 leading-relaxed"
                              style={{ paddingLeft: '3.25rem' }}
                            >
                              {review.review_text}
                            </p>

                            {/* Review Images Grid */}
                            {(review.is_image_approved === true || review.user_id === user?.id || isAdmin) && Array.isArray(review?.images) && review.images.length > 0 && (
                              <div 
                                className="flex gap-2 flex-wrap pt-1"
                                style={{ paddingLeft: '3.25rem' }}
                              >
                                {review.images.map((url, imgIdx) => (
                                  <a 
                                    key={imgIdx} 
                                    href={url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="relative group block w-20 h-20 rounded-2xl overflow-hidden border border-gray-100 dark:border-white/5 hover:border-ozo-red transition-all cursor-zoom-in"
                                  >
                                    <OptimizedImage 
                                      src={url} 
                                      alt={`Review upload ${imgIdx + 1}`} 
                                      width={160}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                      containerClassName="w-full h-full"
                                    />
                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                      <Eye size={16} className="text-white" />
                                    </div>
                                  </a>
                                ))}
                              </div>
                            )}

                            {review.user_id === user?.id && !review.is_image_approved && Array.isArray(review?.images) && review.images.length > 0 && (
                              <div className="flex items-center gap-1.5 mt-1" style={{ paddingLeft: '3.25rem' }}>
                                <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-amber-500/20">
                                  <AlertCircle size={10} /> Image under moderation (Only you can see this)
                                </span>
                              </div>
                            )}

                            {/* Official Admin Reply */}
                            {review.reply_text && (
                              <div className="relative mt-3" style={{ marginLeft: '3.25rem' }}>
                                {/* Connecting Thread Line */}
                                <div className="absolute right-full mr-3 -top-10 bottom-1/2 w-5 border-l-2 border-b-2 border-red-500/20 dark:border-red-500/30 rounded-bl-xl pointer-events-none" />
                                
                                <div className="p-3 bg-red-500/5 dark:bg-red-500/[0.02] border border-red-500/10 dark:border-red-500/20 rounded-2xl space-y-1 max-w-lg">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-black text-red-600 dark:text-red-400">ozoofficial</span>
                                    <span className="w-3.5 h-3.5 rounded-full bg-red-600 text-white flex items-center justify-center text-[8px] font-black shadow-sm">✓</span>
                                    <span className="text-[10px] text-gray-400 font-medium ml-1">
                                      replying to @{review.user?.full_name || 'customer'}
                                    </span>
                                  </div>
                                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 leading-relaxed">
                                    {review.reply_text}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Review Submission Form */}
                  <div className="border-t border-gray-100 dark:border-white/5 pt-8 space-y-6">
                    <div className="flex flex-col gap-1">
                      <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-wider">
                        Write a Review
                      </h3>
                      <p className="text-xs text-ozo-gray">Share your experience with this product with other buyers</p>
                    </div>

                    {!isAuthenticated ? (
                      <div className="flex flex-col items-center justify-center py-8 px-4 border border-dashed border-gray-200 dark:border-white/10 rounded-3xl bg-gray-50/30 dark:bg-white/[0.01]">
                        <p className="text-sm text-ozo-gray mb-4 font-medium">Please login to write a review for this product</p>
                        <Link to="/auth" className="btn btn-primary px-6 text-xs uppercase tracking-wider font-black">
                          Sign In / Register
                        </Link>
                      </div>
                    ) : (
                      <form onSubmit={handleSubmitReview} className="space-y-5">
                        {/* Rating Selector */}
                        <div className="flex flex-col gap-2">
                          <span className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Overall Rating</span>
                          <div className="flex gap-1.5">
                            {[1, 2, 3, 4, 5].map((stars) => (
                              <button
                                type="button"
                                key={stars}
                                onClick={() => setNewRating(stars)}
                                className="focus:outline-none transition-transform hover:scale-110"
                              >
                                <Star 
                                  size={24} 
                                  className={`${
                                    stars <= newRating 
                                      ? 'fill-yellow-400 text-yellow-400' 
                                      : 'text-gray-300 dark:text-gray-600 hover:text-yellow-400'
                                  }`} 
                                />
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Review Text */}
                        <div className="flex flex-col gap-2">
                          <label htmlFor="review-text" className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Your Review</label>
                          <textarea
                            id="review-text"
                            ref={detailTextareaRef}
                            rows={4}
                            value={newReviewText}
                            onChange={(e) => setNewReviewText(e.target.value)}
                            maxLength={1000}
                            placeholder="What did you like or dislike? How was the quality?"
                            className="w-full rounded-2xl border border-gray-200 dark:border-white/10 bg-transparent px-4 py-3 text-sm focus:border-ozo-red focus:outline-none focus:ring-1 focus:ring-ozo-red dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 font-medium resize-none overflow-hidden"
                          />
                        </div>

                        {/* Image Uploader */}
                        <ImageUpload
                          value={reviewImageUrls}
                          onChange={setReviewImageUrls}
                          multiple={true}
                          limit={5}
                          customNamePrefix={`review_${currentProduct?.id}`}
                          label="Add Photos"
                          disabled={isSubmittingReview}
                        />

                        {/* Submit Button */}
                        <button
                          type="submit"
                          disabled={isSubmittingReview}
                          className="btn btn-primary flex items-center justify-center gap-2 px-8 py-3 text-xs uppercase tracking-wider font-black disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSubmittingReview ? (
                            <>
                              <Loader2 size={16} className="animate-spin" /> Submitting...
                            </>
                          ) : (
                            'Submit Review'
                          )}
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </div>

        {/* Related Products Section */}
        <SuggestedProducts
          productId={currentProduct?.id}
          categoryId={currentProduct?.category_id}
          excludeProductIds={variants.map(v => v.id)}
          limit={5}
          title="You Might Also Like"
          exploreLink={currentProduct?.category?.slug ? `/category/${currentProduct.category.slug}` : '/products'}
          gridColsClass="grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
          className="mt-20"
        />
      </div>
      
      {/* Share Modal */}
      <AnimatePresence>
        {isShareModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsShareModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            {/* Modal Card */}
            <motion.div 
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              className="relative w-full max-w-md bg-white dark:bg-[#121212] border border-gray-100 dark:border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl p-6 sm:p-8 z-10"
            >
              {/* Close Button */}
              <button 
                onClick={() => setIsShareModalOpen(false)}
                className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
              >
                <X size={20} />
              </button>

              <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-wider mb-6 text-center">
                Share Product
              </h3>

              {/* Product Preview Card */}
              <div className="flex items-center gap-4 bg-gray-50 dark:bg-white/5 p-4 rounded-3xl border border-gray-100 dark:border-white/5 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-white dark:bg-black/20 p-2 flex-shrink-0 flex items-center justify-center border border-gray-100 dark:border-white/5">
                  <OptimizedImage 
                    src={activeImage || currentProduct?.image_url} 
                    slug={currentProduct?.slug}
                    alt={currentProduct?.name}
                    width={100}
                    className="w-full h-full object-contain"
                    containerClassName="w-full h-full"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-black text-gray-900 dark:text-white truncate">
                    {currentProduct?.name}
                  </h4>
                  <p className="text-[10px] text-ozo-gray font-bold mb-1">{currentProduct?.unit} • {currentProduct?.brand || 'Ozo Fresh'}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-black text-ozo-red">
                      {currentProduct?.price ? `₹${currentProduct.price}` : 'Price on Request'}
                    </span>
                    {currentProduct?.price && currentProduct?.mrp && currentProduct.mrp > currentProduct.price && (
                      <span className="text-xs text-ozo-gray line-through">₹{currentProduct?.mrp ?? 0}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Share Channels */}
              <div className="flex flex-wrap justify-center gap-6 mb-6">
                {/* WhatsApp */}
                <a 
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Check out this amazing product on OZO Mart: *${currentProduct?.name}* ${currentProduct?.price ? `for just ₹${currentProduct.price}` : 'with price on request'}!\n\nLink: ` + shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center group cursor-pointer"
                >
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-green-50 dark:bg-green-500/10 flex items-center justify-center text-green-500 group-hover:scale-105 active:scale-95 transition-all shadow-sm">
                    <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 mt-2">WhatsApp</span>
                </a>

                {/* Twitter / X */}
                <a 
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out ${currentProduct?.name} on OZO Mart!`)}&url=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center group cursor-pointer"
                >
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-900 dark:text-white group-hover:scale-105 active:scale-95 transition-all shadow-sm">
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 mt-2">Twitter / X</span>
                </a>

                {/* Facebook */}
                <a 
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center group cursor-pointer"
                >
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 group-hover:scale-105 active:scale-95 transition-all shadow-sm">
                    <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 mt-2">Facebook</span>
                </a>

                {/* Native / System Share */}
                {navigator.share && (
                  <button 
                    onClick={async () => {
                      try {
                        await navigator.share({
                          title: currentProduct?.name || 'OZO Mart',
                          text: currentProduct?.description || 'Check out this product on OZO Mart!',
                          url: shareUrl
                        })
                        setIsShareModalOpen(false)
                      } catch (err) {
                        if (err.name !== 'AbortError') {
                          console.error('Error sharing:', err)
                        }
                      }
                    }}
                    className="flex flex-col items-center group"
                  >
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-purple-500 group-hover:scale-105 active:scale-95 transition-all shadow-sm">
                      <Share2 size={24} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 mt-2">More</span>
                  </button>
                )}
              </div>

              {/* Copy Link Input Box */}
              <div className="flex items-center bg-gray-50 dark:bg-white/5 border border-gray-150 dark:border-white/10 rounded-2xl p-1 gap-2">
                <input 
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="flex-1 bg-transparent px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 select-all outline-none truncate"
                />
                <button 
                  onClick={handleCopyLink}
                  className="bg-gradient-ozo text-white text-xs font-black uppercase px-4 py-2 rounded-xl flex items-center gap-1.5 active:scale-95 transition-all shrink-0 shadow-sm"
                >
                  {copied ? (
                    <>
                      <Check size={14} className="stroke-[3px]" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} className="stroke-[3px]" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Product Image Lightbox Modal */}
      <AnimatePresence>
        {isImageModalOpen && (
          <div 
            onClick={() => setIsImageModalOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md cursor-zoom-out"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#151515] rounded-[2.5rem] p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-gray-100 dark:border-white/5 relative flex flex-col items-center gap-6 cursor-default"
            >
              {/* Header */}
              <div className="flex items-center justify-between w-full">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-ozo-red uppercase tracking-widest">Image Preview</span>
                  <h3 className="text-base font-black text-gray-900 dark:text-white truncate max-w-[320px]">{currentProduct?.name}</h3>
                </div>
                <button
                  onClick={() => setIsImageModalOpen(false)}
                  className="w-10 h-10 bg-gray-50 hover:bg-gray-100 dark:bg-white/5 dark:hover:bg-white/10 rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition-colors flex items-center justify-center"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Image Container */}
              <div className={`w-full aspect-square rounded-3xl p-6 border border-gray-100 dark:border-white/5 flex items-center justify-center overflow-hidden transition-colors duration-300 ${
                  (!imageBgColor || (isDark && imageBgColor !== '#ffffff')) ? 'bg-gray-50 dark:bg-[#1c1c1c]' : ''
                }`}
                style={{ 
                  backgroundColor: imageBgColor === '#ffffff' 
                    ? (isDark ? '#f3f4f6' : '#ffffff') 
                    : (imageBgColor || undefined) 
                }}>
                <OptimizedImage 
                  src={activeImage || currentProduct?.image_url} 
                  slug={currentProduct?.slug}
                  alt={currentProduct?.name}
                  width={800}
                  quality={90}
                  className="w-full h-full object-contain max-h-[60vh]"
                  containerClassName="w-full h-full"
                  style={{ mixBlendMode: (isDark && imageBgColor === '#ffffff') ? 'multiply' : undefined }}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
    </OzoLoadingGuard>
  )
}

export default ProductDetail
