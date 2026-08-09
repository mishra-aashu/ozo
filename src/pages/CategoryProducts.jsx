import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft,
  SlidersHorizontal,
  LayoutGrid,
  List,
  ChevronDown,
  X,
  Filter,
  Box,
  Check,
  ShoppingBag
} from 'lucide-react'
import { useProductStore } from '../stores/productStore'
import { useTranslation } from '../hooks/useTranslation'
import ProductCard from '../components/ProductCard'
import SortDropdown, { sortOptions } from '../components/SortDropdown'
import { resolveCategoryIcon, getGradient, isCategoryListingSoon, getCategoryFallbackImage } from '../components/CategoryChip'
import OzoLoadingGuard from '../components/OzoLoadingGuard'
import { useProductPagination } from '../hooks/useProductPagination'
import ProductSkeleton from '../components/ProductSkeleton'
import Breadcrumb from '../components/Breadcrumb'
import { promptOneSignalPush, oneSignalAddTag } from '../utils/onesignal'
import toast from 'react-hot-toast'
import SEO from '../components/SEO'

// Premium "Listing Soon" interactive widget for Fruits & Vegetables categories
const ComingSoonSection = ({ category }) => {
  const [isSubscribed, setIsSubscribed] = useState(() => {
    try {
      return localStorage.getItem(`notify_cat_${category?.slug}`) === 'true';
    } catch {
      return false;
    }
  });

  const [requestText, setRequestText] = useState('');
  const [requestSubmitted, setRequestSubmitted] = useState(false);

  const handleNotify = async () => {
    try {
      const permission = await promptOneSignalPush();
      if (permission === 'granted') {
        localStorage.setItem(`notify_cat_${category?.slug}`, 'true');
        await oneSignalAddTag(`notify_cat_${category?.slug}`, 'true');
        setIsSubscribed(true);
        toast.success(`We will notify you when fresh stock for ${category?.name} arrives!`, {
          icon: '🔔',
          style: {
            borderRadius: '16px',
            background: '#333',
            color: '#fff',
          }
        });
      }
    } catch (e) {
      console.error('[OneSignal] Category notification subscription failed:', e);
    }
  };

  const handleRequestSubmit = (e) => {
    e.preventDefault();
    if (!requestText.trim()) return;
    setRequestSubmitted(true);
    setRequestText('');
  };

  const gradientClasses = getGradient(category?.slug, category?.name) || 'from-zinc-500/10 to-zinc-600/10 text-zinc-600';
  const IconComponent = resolveCategoryIcon(category);
  const isEmoji = category?.icon && category.icon.codePointAt(0) > 127;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-6 md:p-10 border border-gray-150 dark:border-white/5 shadow-premium rounded-3xl overflow-hidden relative mt-2"
    >
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-amber-500/10 to-red-500/10 blur-3xl pointer-events-none rounded-full" />
      
      <div className="relative z-10 max-w-2xl mx-auto text-center space-y-6">
        {/* Animated Icon Container */}
        <div className="relative flex justify-center">
          <motion.div
            animate={{
              y: [0, -10, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className={`w-20 h-20 md:w-24 md:h-24 rounded-2xl flex items-center justify-center bg-gradient-to-br ${gradientClasses?.split?.(' ')?.slice?.(0, 2)?.join?.(' ')} shadow-lg`}
          >
            {isEmoji ? (
              <span className="text-4xl md:text-5xl">{category?.icon}</span>
            ) : (
              <IconComponent size={40} className={gradientClasses?.split?.(' ')?.[2]} />
            )}
          </motion.div>
          <span className="absolute -bottom-1 bg-gradient-ozo text-white text-[9px] md:text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-md border-2 border-white dark:border-zinc-900">
            Coming Soon
          </span>
        </div>

        {/* Text */}
        <div className="space-y-3">
          <h2 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tight font-display">
            Freshness is on its <span className="text-gradient">way!</span>
          </h2>
          <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300 font-semibold leading-relaxed max-w-lg mx-auto">
            We are working directly with local Aurangabad farmers and trusted distributors to bring you the highest quality, handpicked fresh {category?.name || 'produce'} at the best price.
          </p>
        </div>

        {/* Informational Cards (Row) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-4">
          <div className="bg-white/50 dark:bg-white/5 border border-gray-100 dark:border-white/5 p-4 rounded-2xl text-center shadow-sm">
            <div className="text-lg font-black text-ozo-red mb-1">🌽 Local Sourcing</div>
            <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-bold">Directly from Aurangabad farms</div>
          </div>
          <div className="bg-white/50 dark:bg-white/5 border border-gray-100 dark:border-white/5 p-4 rounded-2xl text-center shadow-sm">
            <div className="text-lg font-black text-ozo-red mb-1">🧼 Hygienically Safe</div>
            <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-bold">Thoroughly washed & sorted</div>
          </div>
          <div className="bg-white/50 dark:bg-white/5 border border-gray-100 dark:border-white/5 p-4 rounded-2xl text-center shadow-sm">
            <div className="text-lg font-black text-ozo-red mb-1">⚡ Superfast Delivery</div>
            <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-bold">Guaranteed within 30 minutes</div>
          </div>
        </div>

        {/* Notification and Request Section */}
        <div className="max-w-md mx-auto bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 p-6 rounded-2xl shadow-inner space-y-5">
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider font-display">
              {isSubscribed ? "🎉 You're on the list!" : "Get notified when stock arrives"}
            </h4>
            
            <AnimatePresence mode="wait">
              {isSubscribed ? (
                <motion.div
                  key="subscribed"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 font-black text-sm uppercase py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl"
                >
                  <Check size={16} strokeWidth={3} />
                  Notification Subscribed
                </motion.div>
              ) : (
                <motion.button
                  key="subscribe-btn"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleNotify}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-ozo text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-premium hover:shadow-lg transition-all cursor-pointer"
                >
                  <ShoppingBag size={14} />
                  Notify Me At Launch
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          <div className="border-t border-gray-200/50 dark:border-white/5 pt-4">
            {requestSubmitted ? (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 py-2.5 px-4 rounded-xl border border-emerald-500/10"
              >
                Thank you! We've noted your request and will prioritize stocking those items first.
              </motion.div>
            ) : (
              <form onSubmit={handleRequestSubmit} className="space-y-2.5">
                <label className="block text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider text-left">
                  Request items you want us to stock first:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={requestText}
                    onChange={(e) => setRequestText(e.target.value)}
                    placeholder="e.g. Broccoli, Kiwis, Fresh Mint..."
                    className="flex-1 bg-white dark:bg-[#121212] border border-gray-300 dark:border-white/10 rounded-xl px-3.5 py-2 text-xs md:text-sm font-semibold text-gray-800 dark:text-white focus:outline-none focus:border-ozo-red"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-950 hover:bg-gray-850 dark:hover:bg-gray-50 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                  >
                    Submit
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const CategoryProducts = () => {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const categories = useProductStore(state => state.categories)
  const fetchCategories = useProductStore(state => state.fetchCategories)
  const getProductsByCategory = useProductStore(state => state.getProductsByCategory)

  // Layout and Filter states
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'list'
  const [sortBy, setSortBy] = useState('random')
  const [inStockOnly, setInStockOnly] = useState(false)
  const [bestsellerOnly, setBestsellerOnly] = useState(false)
  const [featuredOnly, setFeaturedOnly] = useState(false)
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [showFiltersScrolled, setShowFiltersScrolled] = useState(false)
  const productsContainerRef = useRef(null)
  const [brokenImages, setBrokenImages] = useState({})


  // Fetch initial category list if empty
  useEffect(() => {
    if (categories.length === 0) {
      fetchCategories()
    }
  }, [categories, fetchCategories])

  // Reset all filters and scroll to top when category slug changes
  useEffect(() => {
    setInStockOnly(false)
    setBestsellerOnly(false)
    setFeaturedOnly(false)
    setSortBy('random')
    setIsScrolled(false)
    setShowFiltersScrolled(false)
    window.scrollTo({ top: 0, behavior: 'instant' })
    if (productsContainerRef.current) {
      productsContainerRef.current.scrollTo({ top: 0, behavior: 'instant' })
    }
  }, [slug])

  const {
    products,
    isLoading: isProductsLoading,
    isLoadingMore,
    isError,
    hasMore,
    fetchProductsPage
  } = useProductPagination()

  useEffect(() => {
    if (slug) {
      fetchProductsPage({
        categorySlug: slug
      })
    }
  }, [slug, fetchProductsPage])

  const handleLoadMore = useCallback(() => {
    fetchProductsPage({ categorySlug: slug }, true)
  }, [fetchProductsPage, slug])

  const observerRef = useRef(null)

  useEffect(() => {
    if (!hasMore || isLoadingMore || isProductsLoading) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          handleLoadMore()
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    )

    const currentTarget = observerRef.current
    if (currentTarget) {
      observer.observe(currentTarget)
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [hasMore, isLoadingMore, isProductsLoading, handleLoadMore])

  const refetch = useCallback(() => {
    if (slug) {
      fetchProductsPage({
        categorySlug: slug
      })
    }
  }, [slug, fetchProductsPage])
  // Find active category info
  const currentCategory = useMemo(() => {
    return categories.find(c => c.slug === slug)
  }, [categories, slug])
  const isListingSoon = useMemo(() => {
    if (currentCategory) return isCategoryListingSoon(currentCategory)
    return isCategoryListingSoon({ slug })
  }, [currentCategory, slug])
  const [expandedParents, setExpandedParents] = useState({})
  // Group categories into parent-child hierarchy
  const structuredCategories = useMemo(() => {
    const parents = categories.filter(c => !c.parent_id)
    const children = categories.filter(c => c.parent_id)
    return parents.map(parent => ({
      ...parent,
      subcategories: children.filter(child => child.parent_id === parent.id)
    }))
  }, [categories])

  // Get active parent category context for rendering subcategory filter bar
  const currentParentInfo = useMemo(() => {
    if (!currentCategory) return null
    const parentId = currentCategory.parent_id
    if (parentId) {
      return structuredCategories.find(p => p.id === parentId)
    }
    return structuredCategories.find(p => p.id === currentCategory.id)
  }, [currentCategory, structuredCategories])

  // Automatically expand the parent category if a subcategory is active
  useEffect(() => {
    if (slug && categories.length > 0) {
      const current = categories.find(c => c.slug === slug)
      if (current && current.parent_id) {
        setExpandedParents(prev => ({
          ...prev,
          [current.parent_id]: true
        }))
      }
    }
  }, [slug, categories])

  // Compute maximum price of items in the current category
  const maxCategoryPrice = useMemo(() => {
    if (products.length === 0) return 2000
    return Math.max(...products.map(p => p?.price || 0), 2000)
  }, [products])

  const [priceLimit, setPriceLimit] = useState(2000)

  // Reset price limit when max category price changes
  useEffect(() => {
    setPriceLimit(maxCategoryPrice)
  }, [maxCategoryPrice])

  // Filter and sort products locally
  const filteredAndSortedProducts = useMemo(() => {
    let result = [...products]

    // Apply Price Filter
    result = result.filter(p => (p?.price || 0) <= priceLimit)

    // Apply Stock Filter
    if (inStockOnly) {
      result = result.filter(p => p?.is_available && p?.quantity_available > 0)
    }

    // Apply Bestseller Filter
    if (bestsellerOnly) {
      result = result.filter(p => p?.is_bestseller)
    }

    // Apply Featured Filter
    if (featuredOnly) {
      result = result.filter(p => p?.is_featured)
    }

    // Apply Sorting
    if (sortBy === 'random') {
      result.sort((a, b) => (a?.randomWeight || 0) - (b?.randomWeight || 0))
    } else if (sortBy === 'price_low_high') {
      result.sort((a, b) => (a?.price || 0) - (b?.price || 0))
    } else if (sortBy === 'price_high_low') {
      result.sort((a, b) => (b?.price || 0) - (a?.price || 0))
    } else if (sortBy === 'rating') {
      result.sort((a, b) => (b?.rating || 0) - (a?.rating || 0))
    } else if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b?.created_at || 0) - new Date(a?.created_at || 0))
    } else if (sortBy === 'name_desc') {
      result.sort((a, b) => (b?.name || '').localeCompare(a?.name || ''))
    } else if (sortBy === 'discount') {
      const getDiscount = (p) => {
        if (p?.discount_percentage) return p.discount_percentage
        const price = p?.price ?? 0
        const mrp = p?.mrp ?? 0
        if (mrp && mrp > price) {
          return ((mrp - price) / mrp) * 100
        }
        return 0
      }
      result.sort((a, b) => getDiscount(b) - getDiscount(a))
    } else if (sortBy === 'popularity') {
      const getPopularityScore = (p) => {
        let score = 0
        if (p?.is_bestseller) score += 50
        if (p?.is_featured) score += 30
        if (p?.rating) score += p.rating * 5
        return score
      }
      result.sort((a, b) => getPopularityScore(b) - getPopularityScore(a))
    } else {
      // Default: alphabetical A to Z
      result.sort((a, b) => (a?.name || '').localeCompare(b?.name || ''))
    }

    // Stable sort: in-stock first, out-of-stock last
    return result.sort((a, b) => {
      const aOOS = !a?.is_available || a?.quantity_available === 0;
      const bOOS = !b?.is_available || b?.quantity_available === 0;
      if (aOOS && !bOOS) return 1;
      if (!aOOS && bOOS) return -1;
      return 0;
    });
  }, [products, priceLimit, inStockOnly, bestsellerOnly, featuredOnly, sortBy])

  const groupedProducts = filteredAndSortedProducts

  useEffect(() => {
    const handleScroll = () => {
      const mobileScrollY = productsContainerRef.current ? productsContainerRef.current.scrollTop : 0
      const currentScrollY = window.innerWidth >= 1024 ? window.scrollY : mobileScrollY
      // Disable sticky header collapse if the product list is small to prevent layout jitter loop
      const hasEnoughItems = filteredAndSortedProducts.length >= 6
      setIsScrolled(currentScrollY > 50 && hasEnoughItems)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    const prodEl = productsContainerRef.current
    if (prodEl) {
      prodEl.addEventListener('scroll', handleScroll, { passive: true })
    }

    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (prodEl) {
        prodEl.removeEventListener('scroll', handleScroll)
      }
    }
  }, [filteredAndSortedProducts.length, productsContainerRef.current])

  // Title formatter helper
  const renderTitle = (titleString) => {
    if (!titleString || typeof titleString !== 'string') return null
    const words = titleString.trim().split(/\s+/)
    if (words.length <= 1) {
      return <>{titleString}<span className="text-gradient">.</span></>
    }
    const firstPart = words.slice(0, -1).join(' ')
    const lastWord = words[words.length - 1]
    return <>{firstPart} <span className="text-gradient">{lastWord}.</span></>
  }

  // Gradient variables for Banner
  const { bannerGradient, textColor, IconComponent, iconEmoji, pageBgGradient } = useMemo(() => {
    const gradientClasses = getGradient(slug, currentCategory?.name)
    const parts = gradientClasses.split(' ')
    const isEmoji = typeof currentCategory?.icon === 'string' && currentCategory.icon.codePointAt(0) > 127
    const rawBanner = parts.slice(0, 2).join(' ')
    return {
      bannerGradient: rawBanner,
      pageBgGradient: rawBanner.replace(/\/10/g, '/4'),
      textColor: parts[2] || 'text-gray-600',
      IconComponent: isEmoji ? null : (resolveCategoryIcon(currentCategory)),
      iconEmoji: isEmoji ? currentCategory?.icon : null
    }
  }, [slug, currentCategory])

  const breadcrumbItems = useMemo(() => {
    return [
      { name: t('home') || 'Home', url: '/' },
      { name: t('categories') || 'Categories', url: '/categories' },
      { name: currentCategory?.name || 'Category', url: null }
    ]
  }, [t, currentCategory])

  // Dynamic SEO schema: BreadcrumbList + ItemList of products for Google rich results
  const categorySchema = useMemo(() => {
    const catName = currentCategory?.name || slug
    const catUrl = `https://ozomart.store/category/${slug}`
    const breadcrumbSchema = {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://ozomart.store/" },
        { "@type": "ListItem", "position": 2, "name": "Categories", "item": "https://ozomart.store/categories" },
        { "@type": "ListItem", "position": 3, "name": catName, "item": catUrl }
      ]
    }
    const itemListSchema = products.length > 0 ? {
      "@type": "ItemList",
      "name": `${catName} — OZO Mart`,
      "url": catUrl,
      "numberOfItems": products.length,
      "itemListElement": products.slice(0, 10).map((p, i) => ({
        "@type": "ListItem",
        "position": i + 1,
        "url": `https://ozomart.store/product/${slug}/${p.slug}`,
        "name": p.name
      }))
    } : null
    return {
      "@context": "https://schema.org",
      "@graph": itemListSchema
        ? [breadcrumbSchema, itemListSchema]
        : [breadcrumbSchema]
    }
  }, [currentCategory, slug, products])

  // Framer Motion Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.3
      }
    }
  }

  const pageVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.05
      }
    }
  }

  const headerVariants = {
    hidden: { opacity: 0, y: -15 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        type: "spring", 
        stiffness: 140, 
        damping: 20 
      }
    }
  }

  const sidebarVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { 
        type: "spring", 
        stiffness: 120, 
        damping: 18 
      }
    }
  }

  const contentVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        type: "spring", 
        stiffness: 100, 
        damping: 16 
      }
    }
  }

  const catName = currentCategory?.name || slug
  const catDesc = currentCategory?.description
    || `Buy fresh ${catName} online in Aurangabad & Patna. Delivered in 30 minutes by OZO Mart. Best quality, best price.`

  return (
    <motion.div
      key={slug}
      initial="hidden"
      animate="visible"
      variants={pageVariants}
      className={`flex flex-col bg-gradient-to-br ${pageBgGradient} dark:from-[#0a0a0a] dark:to-[#0a0a0a] transition-colors duration-300 will-change-[transform,opacity] transform-gpu h-[calc(100vh-80px)] h-[calc(100dvh-80px)] lg:h-auto overflow-hidden lg:overflow-visible`}
    >
      <SEO
        title={`Buy ${catName} Online | OZO Mart Aurangabad`}
        description={catDesc}
        keywords={`buy ${catName} online, ${catName} delivery Aurangabad, ${catName} online grocery, OZO Mart ${catName}, fresh ${catName} Bihar`}
        canonical={`https://www.ozomart.store/category/${slug}`}
        schema={categorySchema}
      />
      <motion.div 
        variants={headerVariants}
        className={`flex-shrink-0 sticky top-0 z-30 transition-all duration-300 border-b transform-gpu will-change-[background-color,box-shadow,border-color] ${
          isScrolled 
            ? 'bg-white/95 dark:bg-[#0d0d0d]/95 backdrop-blur-md shadow-md border-ozo-gray-lighter/30 dark:border-white/5' 
            : 'bg-white/80 dark:bg-[#0d0d0d]/80 border-transparent'
        }`} 
        style={{ 
          top: '0px',
          transition: 'background-color 0.3s, border-color 0.3s, box-shadow 0.3s',
          transform: 'translate3d(0,0,0)',
          backfaceVisibility: 'hidden'
        }}
      >
        <div 
          className="container-custom relative z-10 transform-gpu"
          style={{
            paddingTop: `calc(env(safe-area-inset-top, 0px) + 0.625rem)`,
            paddingBottom: '0.625rem'
          }}
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 lg:gap-3 w-full">
            {/* Left Back Arrow and Title info */}
            <div className="flex items-center gap-2.5 min-w-0 w-full lg:w-auto">
              <button
                onClick={() => navigate('/')}
                className="btn-icon p-2 rounded-xl border border-gray-200/20 dark:border-white/10 bg-white/45 dark:bg-black/25 text-gray-700 dark:text-gray-200 hover:text-ozo-red dark:hover:text-white transition-all shadow-sm flex-shrink-0"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="font-black text-gray-900 dark:text-white uppercase tracking-tight text-sm xs:text-base md:text-xl leading-tight font-display">
                  {currentCategory ? renderTitle(currentCategory.name) : 'Loading Category...'}
                </h1>
                <p className="font-bold text-ozo-gray dark:text-gray-400 uppercase tracking-wider text-[9px] xs:text-[10px] md:text-xs mt-0.5">
                  {isProductsLoading ? 'Fetching products...' : `Showing ${filteredAndSortedProducts.length} items`}
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 w-full lg:w-auto justify-between lg:justify-end border-t border-gray-100/50 dark:border-white/5 pt-2 lg:pt-0 lg:border-t-0 flex-shrink-0">
              {/* Desktop Filters Toggle Button when scrolled */}
              <button
                onClick={() => setShowFiltersScrolled(!showFiltersScrolled)}
                className={`hidden lg:flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs transition-all border transform-gpu will-change-transform ${
                  showFiltersScrolled
                    ? 'bg-gradient-ozo text-white border-transparent shadow-sm scale-105'
                    : 'bg-white/50 dark:bg-white/5 text-gray-700 dark:text-gray-200 border-ozo-gray-lighter dark:border-white/10 hover:border-ozo-red/30'
                }`}
              >
                <SlidersHorizontal size={14} />
                <span>Filters</span>
                {((priceLimit < maxCategoryPrice ? 1 : 0) + (inStockOnly ? 1 : 0) + (bestsellerOnly ? 1 : 0) + (featuredOnly ? 1 : 0)) > 0 && (
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black ${
                    showFiltersScrolled ? 'bg-white text-ozo-red' : 'bg-ozo-red text-white'
                  }`}>
                    {(priceLimit < maxCategoryPrice ? 1 : 0) + (inStockOnly ? 1 : 0) + (bestsellerOnly ? 1 : 0) + (featuredOnly ? 1 : 0)}
                  </span>
                )}
              </button>

              {/* View toggles for larger devices */}
              <div className="hidden sm:flex items-center bg-gray-100 dark:bg-white/5 p-1 rounded-xl">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-all ${
                    viewMode === 'grid'
                      ? 'bg-white dark:bg-white/10 shadow-sm text-ozo-red dark:text-white'
                      : 'text-ozo-gray dark:text-gray-400 hover:text-ozo-red dark:hover:text-white'
                  }`}
                >
                  <LayoutGrid size={18} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-all ${
                    viewMode === 'list'
                      ? 'bg-white dark:bg-white/10 shadow-sm text-ozo-red dark:text-white'
                      : 'text-ozo-gray dark:text-gray-400 hover:text-ozo-red dark:hover:text-white'
                  }`}
                >
                  <List size={18} />
                </button>
              </div>

              {/* Mobile Filters Toggle Button */}
              <div className="flex lg:hidden items-center gap-2.5 w-full justify-between">
                <button
                  onClick={() => setShowMobileFilters(true)}
                  className="flex-1 flex items-center justify-center border bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-200 border-ozo-gray-lighter dark:border-white/10 hover:border-ozo-red/50 transition-all duration-300 gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold"
                >
                  <SlidersHorizontal size={13} className="text-ozo-red" />
                  <span>Filters</span>
                  {((priceLimit < maxCategoryPrice ? 1 : 0) + (inStockOnly ? 1 : 0) + (bestsellerOnly ? 1 : 0) + (featuredOnly ? 1 : 0)) > 0 && (
                    <span className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-black bg-ozo-red text-white">
                      {(priceLimit < maxCategoryPrice ? 1 : 0) + (inStockOnly ? 1 : 0) + (bestsellerOnly ? 1 : 0) + (featuredOnly ? 1 : 0)}
                    </span>
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <SortDropdown sortBy={sortBy} onChange={setSortBy} isCompact={true} />
                </div>
              </div>

              {/* Desktop Sorting Select Option */}
              <div className="hidden lg:block">
                <SortDropdown sortBy={sortBy} onChange={setSortBy} isCompact={true} />
              </div>
            </div>
          </div>
        </div>

        {/* Floating Filters Dropdown when scrolled on desktop */}
        <AnimatePresence>
          {isScrolled && showFiltersScrolled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="absolute top-full left-0 right-0 bg-white/95 dark:bg-[#0d0d0d]/95 backdrop-blur-md border-b border-gray-150/40 dark:border-white/5 shadow-lg overflow-hidden z-20 hidden lg:block"
            >
              <div className="container-custom py-4 flex items-center justify-between gap-6">
                <div className="flex items-center gap-6 flex-1">
                  {/* Price Slider */}
                  <div className="flex items-center gap-3 w-80">
                    <span className="text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Price Range:</span>
                    <input
                      type="range"
                      className="w-full accent-ozo-red cursor-pointer h-1 bg-gray-200 dark:bg-white/10 rounded-lg appearance-none"
                      min="0"
                      max={maxCategoryPrice}
                      value={priceLimit}
                      onChange={(e) => setPriceLimit(Number(e.target.value))}
                    />
                    <span className="text-xs font-black text-gradient whitespace-nowrap min-w-[85px] text-right">Max: ₹{priceLimit}</span>
                  </div>

                  <div className="w-px h-5 bg-gray-200 dark:bg-white/10" />

                  {/* Toggle Filters */}
                  <div className="flex items-center gap-5">
                    {/* In Stock */}
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div className={`w-4.5 h-4.5 rounded border flex items-center justify-center transition-all ${
                        inStockOnly
                          ? 'bg-gradient-ozo border-transparent text-white'
                          : 'border-gray-300 dark:border-white/10 group-hover:border-ozo-red'
                      }`}>
                        {inStockOnly && <Check size={10} strokeWidth={4} />}
                      </div>
                      <input
                        type="checkbox"
                        checked={inStockOnly}
                        onChange={(e) => setInStockOnly(e.target.checked)}
                        className="hidden"
                      />
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300 select-none whitespace-nowrap">
                        In Stock Only
                      </span>
                    </label>

                    {/* Bestseller */}
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div className={`w-4.5 h-4.5 rounded border flex items-center justify-center transition-all ${
                        bestsellerOnly
                          ? 'bg-gradient-ozo border-transparent text-white'
                          : 'border-gray-300 dark:border-white/10 group-hover:border-ozo-red'
                      }`}>
                        {bestsellerOnly && <Check size={10} strokeWidth={4} />}
                      </div>
                      <input
                        type="checkbox"
                        checked={bestsellerOnly}
                        onChange={(e) => setBestsellerOnly(e.target.checked)}
                        className="hidden"
                      />
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300 select-none whitespace-nowrap">
                        Bestsellers Only
                      </span>
                    </label>

                    {/* Featured */}
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div className={`w-4.5 h-4.5 rounded border flex items-center justify-center transition-all ${
                        featuredOnly
                          ? 'bg-gradient-ozo border-transparent text-white'
                          : 'border-gray-300 dark:border-white/10 group-hover:border-ozo-red'
                      }`}>
                        {featuredOnly && <Check size={10} strokeWidth={4} />}
                      </div>
                      <input
                        type="checkbox"
                        checked={featuredOnly}
                        onChange={(e) => setFeaturedOnly(e.target.checked)}
                        className="hidden"
                      />
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300 select-none whitespace-nowrap">
                        Featured Items Only
                      </span>
                    </label>
                  </div>
                </div>

                {/* Clear Button */}
                {(priceLimit < maxCategoryPrice || inStockOnly || bestsellerOnly || featuredOnly) && (
                  <button
                    onClick={() => {
                      setPriceLimit(maxCategoryPrice)
                      setInStockOnly(false)
                      setBestsellerOnly(false)
                      setFeaturedOnly(false)
                      setSortBy('random')
                    }}
                    className="px-3 py-1.5 rounded-xl font-bold text-[11px] border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors whitespace-nowrap flex items-center gap-1 hover:border-ozo-red/50 hover:text-ozo-red"
                  >
                    <X size={12} />
                    Clear Filters
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <div className="max-w-[1440px] mx-auto w-full px-2 xs:px-3 sm:px-6 lg:px-8 flex-1 min-h-0 py-2 md:py-6 flex flex-col">
        {/* Breadcrumb path */}
        <Breadcrumb items={breadcrumbItems} className="hidden md:flex mb-6" />

        {/* Category Banner Card - Desktop/Tablet Only */}
        <div className={`hidden md:block relative overflow-hidden rounded-[2rem] p-8 mb-6 bg-gradient-to-br ${bannerGradient} border border-ozo-gray-lighter/25 dark:border-white/5 shadow-sm`}>
          {/* Floating Background Icon / Emoji */}
          <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-[0.08] dark:opacity-[0.04] pointer-events-none select-none flex items-center justify-center">
            {iconEmoji ? (
              <span className="text-[140px] leading-none block">{iconEmoji}</span>
            ) : (
              IconComponent && <IconComponent size={200} className="text-current" />
            )}
          </div>

          <div className="relative z-10 max-w-2xl">
            <span className="inline-block text-[11px] font-black text-ozo-red dark:text-red-400 uppercase tracking-widest mb-2 px-2.5 py-1 rounded-full bg-ozo-red/10 dark:bg-red-500/10 font-display">
              OZO Mart
            </span>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tight mb-3 font-display">
              {currentCategory ? currentCategory.name : 'Loading Category...'}
            </h1>
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 leading-relaxed">
              {currentCategory?.description || `Browse fresh and premium-grade segment items handpicked just for you. Guaranteed delivery at your doorstep in Aurangabad within 30 minutes.`}
            </p>
          </div>
        </div>

        {/* Subcategory Chips Navigation Bar - Desktop Only */}
        {currentParentInfo && currentParentInfo.subcategories && currentParentInfo.subcategories.length > 0 && (
          <div className="hidden lg:flex items-center gap-2 overflow-x-auto scrollbar-hide py-2.5 mb-6 border-b border-gray-150/40 dark:border-white/5 no-scrollbar">
            <button
              onClick={() => navigate(`/category/${currentParentInfo.slug}`)}
              className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all duration-300 border flex items-center gap-1.5 ${
                slug === currentParentInfo.slug
                  ? 'bg-gradient-ozo text-white border-transparent shadow-md shadow-ozo-red/20 scale-105'
                  : 'bg-white/40 dark:bg-black/25 text-gray-700 dark:text-gray-300 border-gray-200/40 dark:border-white/10 hover:border-ozo-red/40 hover:text-ozo-red hover:bg-white dark:hover:bg-white/5'
              }`}
            >
              <Box size={14} className="flex-shrink-0" />
              <span>All {currentParentInfo.name}</span>
            </button>
            {currentParentInfo.subcategories.map((sub) => {
              const isEmoji = sub.icon && sub.icon.codePointAt(0) > 127
              const IconComponent = isEmoji ? null : resolveCategoryIcon(sub)
              return (
                <button
                  key={sub.id}
                  onClick={() => navigate(`/category/${sub.slug}`)}
                  className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all duration-300 border flex items-center gap-1.5 ${
                    slug === sub.slug
                      ? 'bg-gradient-ozo text-white border-transparent shadow-md shadow-ozo-red/20 scale-105'
                      : 'bg-white/40 dark:bg-black/25 text-gray-700 dark:text-gray-300 border-gray-200/40 dark:border-white/10 hover:border-ozo-red/40 hover:text-ozo-red hover:bg-white dark:hover:bg-white/5'
                  }`}
                >
                  {isEmoji ? (
                    <span className="text-sm leading-none flex items-center justify-center select-none">{sub.icon}</span>
                  ) : (
                    <IconComponent size={14} className="flex-shrink-0" />
                  )}
                  <span>{sub.name}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* Desktop Filters Panel - Premium Style */}
        <div className="hidden lg:flex items-center justify-between gap-6 bg-white dark:bg-white/[0.02] border border-gray-150/40 dark:border-white/5 rounded-2xl p-4.5 mb-6 shadow-sm">
          <div className="flex items-center gap-6 flex-1">
            {/* Price Slider */}
            <div className="flex items-center gap-3 w-80">
              <span className="text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Price Range:</span>
              <input
                type="range"
                className="w-full accent-ozo-red cursor-pointer h-1 bg-gray-200 dark:bg-white/10 rounded-lg appearance-none"
                min="0"
                max={maxCategoryPrice}
                value={priceLimit}
                onChange={(e) => setPriceLimit(Number(e.target.value))}
              />
              <span className="text-xs font-black text-gradient whitespace-nowrap min-w-[85px] text-right">Max: ₹{priceLimit}</span>
            </div>

            <div className="w-px h-5 bg-gray-200 dark:bg-white/10" />

            {/* Toggle Filters */}
            <div className="flex items-center gap-5">
              {/* In Stock */}
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className={`w-4.5 h-4.5 rounded border flex items-center justify-center transition-all ${
                  inStockOnly
                    ? 'bg-gradient-ozo border-transparent text-white'
                    : 'border-gray-300 dark:border-white/10 group-hover:border-ozo-red'
                }`}>
                  {inStockOnly && <Check size={10} strokeWidth={4} />}
                </div>
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className="hidden"
                />
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 select-none whitespace-nowrap">
                  In Stock Only
                </span>
              </label>

              {/* Bestseller */}
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className={`w-4.5 h-4.5 rounded border flex items-center justify-center transition-all ${
                  bestsellerOnly
                    ? 'bg-gradient-ozo border-transparent text-white'
                    : 'border-gray-300 dark:border-white/10 group-hover:border-ozo-red'
                }`}>
                  {bestsellerOnly && <Check size={10} strokeWidth={4} />}
                </div>
                <input
                  type="checkbox"
                  checked={bestsellerOnly}
                  onChange={(e) => setBestsellerOnly(e.target.checked)}
                  className="hidden"
                />
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 select-none whitespace-nowrap">
                  Bestsellers Only
                </span>
              </label>

              {/* Featured */}
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className={`w-4.5 h-4.5 rounded border flex items-center justify-center transition-all ${
                  featuredOnly
                    ? 'bg-gradient-ozo border-transparent text-white'
                    : 'border-gray-300 dark:border-white/10 group-hover:border-ozo-red'
                }`}>
                  {featuredOnly && <Check size={10} strokeWidth={4} />}
                </div>
                <input
                  type="checkbox"
                  checked={featuredOnly}
                  onChange={(e) => setFeaturedOnly(e.target.checked)}
                  className="hidden"
                />
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 select-none whitespace-nowrap">
                  Featured Items Only
                </span>
              </label>
            </div>
          </div>

          {/* Clear Button */}
          {(priceLimit < maxCategoryPrice || inStockOnly || bestsellerOnly || featuredOnly) && (
            <button
              onClick={() => {
                setPriceLimit(maxCategoryPrice)
                setInStockOnly(false)
                setBestsellerOnly(false)
                setFeaturedOnly(false)
                setSortBy('random')
              }}
              className="px-3 py-1.5 rounded-xl font-bold text-[11px] border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors whitespace-nowrap flex items-center gap-1 hover:border-ozo-red/50 hover:text-ozo-red"
            >
              <X size={12} />
              Clear Filters
            </button>
          )}
        </div>

        {/* Main Grid containing filters and products */}
        <div className="flex gap-1.5 md:gap-8 flex-1 min-h-0 h-full lg:h-auto">
          {/* Sidebar - Mobile/Tablet Subcategories */}
          {currentParentInfo && currentParentInfo.subcategories && currentParentInfo.subcategories.length > 0 && (
            <motion.div 
              variants={sidebarVariants}
              className="lg:hidden w-[60px] xs:w-[70px] sm:w-[86px] flex-shrink-0 overflow-y-auto no-scrollbar pt-1 pb-24 pr-0.5 border-r border-gray-100 dark:border-white/5 h-full transform-gpu will-change-[transform,scroll-position]"
            >
              <div className="space-y-1.5">
                {/* All parent button */}
                <button
                  onClick={() => navigate(`/category/${currentParentInfo.slug}`)}
                  className={`w-full relative flex flex-col items-center gap-1 p-1 rounded-xl text-center transition-all border duration-300 transform-gpu will-change-transform ${
                    slug === currentParentInfo.slug
                      ? 'bg-white dark:bg-[#1a1a1a] border-ozo-red/20 dark:border-white/10 shadow-sm text-ozo-red dark:text-white font-extrabold scale-105'
                      : 'bg-transparent text-gray-700 dark:text-gray-400 border-transparent hover:bg-white/30 dark:hover:bg-white/5'
                  }`}
                >
                  <div className={`w-10 h-10 xs:w-[46px] xs:h-[46px] rounded-full overflow-hidden flex items-center justify-center bg-white dark:bg-[#1a1a1a] border transition-all duration-300 ${
                    slug === currentParentInfo.slug
                      ? 'border-ozo-red shadow-md shadow-ozo-red/15'
                      : 'border-gray-150/50 dark:border-white/5'
                  }`}>
                    {currentParentInfo.image_url && !brokenImages[currentParentInfo.image_url] ? (
                      <img 
                        src={currentParentInfo.image_url} 
                        alt="All" 
                        onError={() => setBrokenImages(prev => ({ ...prev, [currentParentInfo.image_url]: true }))}
                        className="w-full h-full object-contain p-0.5 select-none scale-105"
                      />
                    ) : (() => {
                      const parentFallback = getCategoryFallbackImage(currentParentInfo.slug, currentParentInfo.name);
                      if (parentFallback && !brokenImages[parentFallback]) {
                        return (
                          <img 
                            src={parentFallback} 
                            alt="All" 
                            onError={() => setBrokenImages(prev => ({ ...prev, [parentFallback]: true }))}
                            className="w-full h-full object-contain p-0.5 select-none scale-105"
                          />
                        )
                      }
                      return <Box size={16} className="text-gray-400 dark:text-gray-500" />
                    })()}
                  </div>
                  <span className="text-[9px] xs:text-[10px] font-black tracking-tight leading-tight line-clamp-2 w-full overflow-hidden break-words select-none text-center">
                    All
                  </span>
                </button>
 
                {/* Subcategory buttons */}
                {currentParentInfo.subcategories.map((sub) => {
                  const isSelected = slug === sub.slug
                  const isEmoji = sub.icon && sub.icon.codePointAt(0) > 127
                  const IconComponent = isEmoji ? null : resolveCategoryIcon(sub)
                  const subFallback = getCategoryFallbackImage(sub.slug, sub.name)

                  return (
                    <button
                      key={sub.id}
                      onClick={() => navigate(`/category/${sub.slug}`)}
                      className={`w-full relative flex flex-col items-center gap-1 p-1 rounded-xl text-center transition-all border duration-300 transform-gpu will-change-transform ${
                        isSelected
                          ? 'bg-white dark:bg-[#1a1a1a] border-ozo-red/20 dark:border-white/10 shadow-sm text-ozo-red dark:text-white font-extrabold scale-105'
                          : 'bg-transparent text-gray-700 dark:text-gray-400 border-transparent hover:bg-white/30 dark:hover:bg-white/5'
                      }`}
                    >
                      <div className={`w-10 h-10 xs:w-[46px] xs:h-[46px] rounded-full overflow-hidden flex items-center justify-center bg-white dark:bg-[#1a1a1a] border transition-all duration-300 ${
                        isSelected
                          ? 'border-ozo-red shadow-md shadow-ozo-red/15'
                          : 'border-gray-150/50 dark:border-white/5'
                      }`}>
                        {sub.image_url && !brokenImages[sub.image_url] ? (
                          <img 
                            src={sub.image_url} 
                            alt={sub.name} 
                            onError={() => setBrokenImages(prev => ({ ...prev, [sub.image_url]: true }))}
                            className="w-full h-full object-contain p-0.5 select-none scale-105"
                          />
                        ) : subFallback && !brokenImages[subFallback] ? (
                          <img 
                            src={subFallback} 
                            alt={sub.name} 
                            onError={() => setBrokenImages(prev => ({ ...prev, [subFallback]: true }))}
                            className="w-full h-full object-contain p-0.5 select-none scale-105"
                          />
                        ) : isEmoji ? (
                          <span className="text-[15px] xs:text-lg select-none">{sub.icon}</span>
                        ) : (
                          <IconComponent size={16} className="text-gray-400 dark:text-gray-500" />
                        )}
                      </div>
                      <span className="text-[9px] xs:text-[10px] font-black tracking-tight leading-tight line-clamp-2 w-full overflow-hidden break-words select-none text-center">
                        {sub.name}
                      </span>
                    </button>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* Sidebar - Desktop */}
          <motion.div 
            variants={sidebarVariants}
            className="hidden lg:block w-80 flex-shrink-0"
          >
            <div 
              className="card p-6 sticky border border-gray-100 dark:border-white/5 shadow-sm space-y-4 transition-all duration-300" 
              style={{ 
                top: '76px',
                transition: 'background-color 0.3s, border-color 0.3s'
              }}
            >
              <div>
                <h3 className="font-extrabold text-[13px] text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4.5 flex items-center gap-2.5 font-display">
                  <Filter size={16} className="text-ozo-red" />
                  All Categories
                </h3>
                <div className="space-y-1.5 max-h-[calc(100vh-240px)] overflow-y-auto overflow-x-hidden custom-scrollbar pr-3">
                  {/* All Products button */}
                  <button
                    onClick={() => navigate('/products')}
                    className={`w-full flex items-center gap-3.5 px-3 py-2 rounded-2xl transition-all text-left border ${
                      !slug || slug === 'all'
                        ? 'bg-gradient-to-r from-ozo-red/10 to-transparent border-ozo-red/20 text-ozo-red font-bold'
                        : 'bg-transparent text-gray-805 dark:text-gray-300 border-transparent hover:bg-gray-105/70 dark:hover:bg-white/5 hover:text-ozo-red dark:hover:text-white'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center bg-white dark:bg-[#1a1a1a] border transition-all duration-300 ${
                      !slug || slug === 'all'
                        ? 'border-ozo-red/30 dark:border-white/20 shadow-sm'
                        : 'border-gray-150/50 dark:border-white/5'
                    }`}>
                      <Box size={18} className={!slug || slug === 'all' ? 'text-ozo-red' : 'text-gray-400 dark:text-gray-500'} strokeWidth={1.8} />
                    </div>
                    <span className="text-[14px] font-bold flex-1">All Products</span>
                  </button>

                  {/* Hierarchical Categories */}
                  {structuredCategories.map((parent) => {
                    const CatIcon = resolveCategoryIcon(parent)
                    const isParentActive = parent.slug === slug
                    const hasSubs = parent.subcategories && parent.subcategories.length > 0
                    const isExpanded = !!expandedParents[parent.id]
                    
                    return (
                      <div key={parent.id} className="space-y-1">
                        <div
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-2xl transition-all border ${
                            isParentActive
                              ? 'bg-gradient-to-r from-ozo-red/10 to-transparent border-ozo-red/20 text-ozo-red font-bold'
                              : 'bg-transparent text-gray-805 dark:text-gray-300 border-transparent hover:bg-gray-105/70 dark:hover:bg-white/5 hover:text-ozo-red dark:hover:text-white'
                          }`}
                        >
                          <button
                            onClick={() => {
                              navigate(`/category/${parent.slug}`)
                              if (hasSubs) {
                                setExpandedParents(prev => ({
                                  ...prev,
                                  [parent.id]: !prev[parent.id]
                                }))
                              }
                            }}
                            className="flex items-center gap-3.5 flex-1 text-left"
                          >
                            <div className={`w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center bg-white dark:bg-[#1a1a1a] border transition-all duration-300 ${
                              isParentActive 
                                ? 'border-ozo-red/30 dark:border-white/20 shadow-sm' 
                                : 'border-gray-150/50 dark:border-white/5'
                            }`}>
                              {parent.image_url && !brokenImages[parent.image_url] ? (
                                <img 
                                  src={parent.image_url} 
                                  alt={parent.name} 
                                  onError={() => setBrokenImages(prev => ({ ...prev, [parent.image_url]: true }))}
                                  className="w-full h-full object-contain p-1 select-none"
                                />
                              ) : (() => {
                                const parentFallback = getCategoryFallbackImage(parent.slug, parent.name);
                                if (parentFallback && !brokenImages[parentFallback]) {
                                  return (
                                    <img 
                                      src={parentFallback} 
                                      alt={parent.name} 
                                      onError={() => setBrokenImages(prev => ({ ...prev, [parentFallback]: true }))}
                                      className="w-full h-full object-contain p-1 select-none"
                                    />
                                  )
                                }
                                return <CatIcon size={18} className={isParentActive ? 'text-ozo-red' : 'text-gray-400 dark:text-gray-500'} strokeWidth={1.8} />
                              })()}
                            </div>
                            <span className="text-[14px] font-bold whitespace-normal break-words leading-tight flex-1">{parent.name}</span>
                          </button>
                          
                          {hasSubs && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setExpandedParents(prev => ({
                                  ...prev,
                                  [parent.id]: !prev[parent.id]
                                }))
                              }}
                              className="p-1.5 hover:bg-gray-200/50 dark:hover:bg-white/10 rounded-lg transition-all text-gray-550 dark:text-gray-400 hover:text-ozo-red dark:hover:text-white ml-1.5 flex-shrink-0"
                            >
                              <ChevronDown
                                size={15}
                                className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                              />
                            </button>
                          )}
                        </div>

                        {/* Subcategories list */}
                        {hasSubs && isExpanded && (
                          <div className="ml-5 pl-3.5 border-l-2 border-gray-200 dark:border-white/5 space-y-1 py-1">
                            {parent.subcategories.map((child) => {
                              const isChildActive = child.slug === slug
                              return (
                                <button
                                  key={child.id}
                                  onClick={() => navigate(`/category/${child.slug}`)}
                                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all text-left text-xs border ${
                                    isChildActive
                                      ? 'bg-ozo-red/5 dark:bg-ozo-red/10 border-ozo-red/10 text-ozo-red font-bold'
                                      : 'bg-transparent text-gray-655 dark:text-gray-400 border-transparent hover:bg-gray-50 dark:hover:bg-white/5 hover:text-ozo-red dark:hover:text-white'
                                  }`}
                                >
                                  <div className={`w-7.5 h-7.5 rounded-lg overflow-hidden flex items-center justify-center bg-white dark:bg-[#1a1a1a] border transition-all duration-300 ${
                                    isChildActive 
                                      ? 'border-ozo-red/30 dark:border-white/20' 
                                      : 'border-gray-150/50 dark:border-white/5'
                                  }`}>
                                    {child.image_url && !brokenImages[child.image_url] ? (
                                      <img 
                                        src={child.image_url} 
                                        alt={child.name} 
                                        onError={() => setBrokenImages(prev => ({ ...prev, [child.image_url]: true }))}
                                        className="w-full h-full object-contain p-0.5 select-none"
                                      />
                                    ) : (() => {
                                      const childFallback = getCategoryFallbackImage(child.slug, child.name);
                                      if (childFallback && !brokenImages[childFallback]) {
                                        return (
                                          <img 
                                            src={childFallback} 
                                            alt={child.name} 
                                            onError={() => setBrokenImages(prev => ({ ...prev, [childFallback]: true }))}
                                            className="w-full h-full object-contain p-0.5 select-none"
                                          />
                                        )
                                      }
                                      return <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors ${isChildActive ? 'bg-ozo-red' : 'bg-gray-300 dark:bg-gray-600'}`} />
                                    })()}
                                  </div>
                                  <span className="font-bold text-xs whitespace-normal break-words leading-tight flex-1">{child.name}</span>
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Product grid / list main viewport */}
          <motion.div 
            ref={productsContainerRef} 
            variants={contentVariants}
            className="flex-1 min-w-0 pb-24 lg:pb-6 px-1 py-1 h-full overflow-y-auto no-scrollbar lg:overflow-visible transform-gpu will-change-[transform,scroll-position]"
          >
            {isListingSoon ? (
              <ComingSoonSection category={currentCategory} />
            ) : (
              <>
                {/* Product Rendering */}
                <OzoLoadingGuard
                  isLoading={isProductsLoading}
                  isError={isError}
                  isEmpty={!isProductsLoading && filteredAndSortedProducts.length === 0}
                  onRetry={refetch}
                  skeleton={<ProductSkeleton viewMode={viewMode} count={8} />}
                  fallback={
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="card p-12 text-center max-w-md mx-auto border border-dashed border-gray-200 dark:border-white/10 shadow-sm"
                    >
                      <div className="w-16 h-16 bg-gradient-to-br from-red-500/10 to-red-600/10 text-ozo-red rounded-full flex items-center justify-center mx-auto mb-5">
                        <ShoppingBag size={28} />
                      </div>
                      <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight mb-2 font-display">
                        No Products Found
                      </h3>
                      <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mb-6 font-semibold leading-relaxed">
                        We couldn't find any items matching your selected criteria. Try adjusting the price range or resetting options.
                      </p>
                      <button
                        onClick={() => {
                          setPriceLimit(maxCategoryPrice)
                          setInStockOnly(false)
                          setSortBy('random')
                        }}
                        className="btn btn-primary btn-sm rounded-xl font-bold text-xs"
                      >
                        Reset All Filters
                      </button>
                    </motion.div>
                  }
                >
                  {/* Actual products grid list rendering */}
                  <motion.div
                    key={`${slug}_${viewMode}_${priceLimit}_${inStockOnly}_${bestsellerOnly}_${featuredOnly}_${sortBy}`}
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className={`grid transform-gpu will-change-transform ${
                      viewMode === 'grid'
                        ? 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4'
                        : 'grid-cols-1'
                    } gap-1.5 xs:gap-2 sm:gap-6`}
                  >
                    {groupedProducts.map((product, idx) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        index={idx}
                        variant={viewMode === 'grid' ? 'default' : 'horizontal'}
                      />
                    ))}
                  </motion.div>

                   {hasMore && (
                    <div ref={observerRef} className="flex justify-center mt-10 py-6">
                      <div className="flex items-center gap-2.5 text-xs font-black uppercase tracking-widest text-ozo-red">
                        <span className="w-5 h-5 border-2 border-ozo-red border-t-transparent rounded-full animate-spin" />
                        <span>Loading more items...</span>
                      </div>
                    </div>
                  )}
                </OzoLoadingGuard>
              </>
            )}
          </motion.div>
        </div>
      </div>

      {/* Mobile Filters Drawer / Sheet */}
      <AnimatePresence>
        {showMobileFilters && (
          <>
            {/* Sheet backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileFilters(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 lg:hidden"
            />

            {/* Bottom sliding filter drawer */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#121212] rounded-t-[2.5rem] p-6 z-50 lg:hidden border-t border-gray-100 dark:border-white/5 max-h-[85vh] overflow-y-auto shadow-2xl"
            >
              {/* Header section inside drawer */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100 dark:border-white/5">
                <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2 font-display">
                  <SlidersHorizontal size={18} className="text-ozo-red" />
                  Refine Products
                </h3>
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-6">
                {/* Price range input inside drawer */}
                <div>
                  <h4 className="font-black text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 font-display">Price Range</h4>
                  <div className="space-y-4">
                    <input
                      type="range"
                      className="w-full accent-ozo-red cursor-pointer"
                      min="0"
                      max={maxCategoryPrice}
                      value={priceLimit}
                      onChange={(e) => setPriceLimit(Number(e.target.value))}
                    />
                    <div className="flex items-center justify-between text-xs font-bold text-ozo-gray dark:text-gray-400">
                      <span>₹0</span>
                      <span className="text-gradient font-black text-sm">Max: ₹{priceLimit}</span>
                      <span>₹{maxCategoryPrice}</span>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-gray-200 dark:bg-white/5" />

                {/* Stock availability & Feature filters inside drawer */}
                <div>
                  <h4 className="font-black text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 font-display">Filters</h4>
                  <div className="space-y-3">
                    {/* In Stock */}
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                        inStockOnly
                          ? 'bg-gradient-ozo border-transparent text-white'
                          : 'border-gray-300 dark:border-white/10 group-hover:border-ozo-red'
                      }`}>
                        {inStockOnly && <Check size={12} strokeWidth={4} />}
                      </div>
                      <input
                        type="checkbox"
                        checked={inStockOnly}
                        onChange={(e) => setInStockOnly(e.target.checked)}
                        className="hidden"
                      />
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-300 select-none">
                        In Stock Only
                      </span>
                    </label>

                    {/* Bestseller */}
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                        bestsellerOnly
                          ? 'bg-gradient-ozo border-transparent text-white'
                          : 'border-gray-300 dark:border-white/10 group-hover:border-ozo-red'
                      }`}>
                        {bestsellerOnly && <Check size={12} strokeWidth={4} />}
                      </div>
                      <input
                        type="checkbox"
                        checked={bestsellerOnly}
                        onChange={(e) => setBestsellerOnly(e.target.checked)}
                        className="hidden"
                      />
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-300 select-none">
                        Bestsellers Only
                      </span>
                    </label>

                    {/* Featured */}
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                        featuredOnly
                          ? 'bg-gradient-ozo border-transparent text-white'
                          : 'border-gray-300 dark:border-white/10 group-hover:border-ozo-red'
                      }`}>
                        {featuredOnly && <Check size={12} strokeWidth={4} />}
                      </div>
                      <input
                        type="checkbox"
                        checked={featuredOnly}
                        onChange={(e) => setFeaturedOnly(e.target.checked)}
                        className="hidden"
                      />
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-300 select-none">
                        Featured Items Only
                      </span>
                    </label>
                  </div>
                </div>

                <div className="h-px bg-gray-200 dark:bg-white/5" />

                {/* Sort options inside drawer */}
                <div>
                  <h4 className="font-black text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 font-display">Sort By</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {sortOptions.map((option) => {
                      const isActive = option.value === sortBy
                      const Icon = option.icon
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setSortBy(option.value)}
                          className={`px-3 py-2.5 rounded-xl text-[11px] font-bold transition-all border flex items-center justify-center gap-1.5 ${
                            isActive
                              ? 'bg-gradient-ozo text-white border-transparent shadow-ozo font-black'
                              : 'bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 border-gray-100 dark:border-white/5 hover:border-ozo-red/50'
                          }`}
                        >
                          <Icon size={12} />
                          <span className="truncate">{option.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="h-px bg-gray-200 dark:bg-white/5" />

                {/* Categories selector inside drawer */}
                <div>
                  <h4 className="font-black text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 font-display">Segment Category</h4>
                  <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                    {/* All Products button */}
                    <button
                      onClick={() => {
                        navigate('/products')
                        setShowMobileFilters(false)
                      }}
                      className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-all text-left border text-xs ${
                        !slug || slug === 'all'
                          ? 'bg-gradient-ozo text-white border-transparent shadow-ozo font-black'
                          : 'bg-gray-50 dark:bg-white/5 text-gray-750 dark:text-gray-300 border-transparent'
                      }`}
                    >
                      <Box size={14} />
                      <span className="font-semibold">All Products</span>
                    </button>

                    {/* Hierarchical Categories */}
                    {structuredCategories.map((parent) => {
                      const CatIcon = resolveCategoryIcon(parent)
                      const isParentActive = parent.slug === slug
                      const hasSubs = parent.subcategories && parent.subcategories.length > 0
                      const isExpanded = !!expandedParents[parent.id]

                      return (
                        <div key={parent.id} className="space-y-1">
                          <div
                            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all border text-xs ${
                              isParentActive
                                ? 'bg-gradient-ozo text-white border-transparent shadow-ozo font-black'
                                : 'bg-gray-50 dark:bg-white/5 text-gray-750 dark:text-gray-300 border-transparent'
                            }`}
                          >
                            <button
                              onClick={() => {
                                navigate(`/category/${parent.slug}`)
                                setShowMobileFilters(false)
                              }}
                              className="flex items-center gap-2.5 flex-1 text-left font-bold"
                            >
                              <CatIcon size={14} />
                              <span className="truncate">{parent.name}</span>
                            </button>

                            {hasSubs && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setExpandedParents(prev => ({
                                    ...prev,
                                    [parent.id]: !prev[parent.id]
                                  }))
                                }}
                                className="p-1 hover:bg-gray-200/50 dark:hover:bg-white/10 rounded-lg transition-all"
                              >
                                <ChevronDown
                                  size={12}
                                  className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''} ${isParentActive ? 'text-white' : 'text-gray-400'}`}
                                />
                              </button>
                            )}
                          </div>

                          {/* Subcategories list */}
                          {hasSubs && isExpanded && (
                            <div className="ml-4 pl-3 border-l border-gray-150 dark:border-white/5 space-y-1 py-1">
                              {parent.subcategories.map((child) => {
                                const isChildActive = child.slug === slug
                                return (
                                  <button
                                    key={child.id}
                                    onClick={() => {
                                      navigate(`/category/${child.slug}`)
                                      setShowMobileFilters(false)
                                    }}
                                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl transition-all text-left text-[11px] border ${
                                      isChildActive
                                        ? 'bg-ozo-red/5 dark:bg-ozo-red/10 border-ozo-red/10 text-ozo-red font-bold'
                                        : 'bg-transparent text-gray-650 dark:text-gray-400 border-transparent'
                                    }`}
                                  >
                                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors ${isChildActive ? 'bg-ozo-red' : 'bg-gray-300 dark:bg-gray-600'}`} />
                                    <span className="font-semibold truncate">{child.name}</span>
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Action buttons inside drawer */}
              <div className="flex gap-4 mt-8 pt-4 border-t border-gray-100 dark:border-white/5">
                <button
                  onClick={() => {
                    setPriceLimit(maxCategoryPrice)
                    setInStockOnly(false)
                    setBestsellerOnly(false)
                    setFeaturedOnly(false)
                    setSortBy('random')
                  }}
                  className="flex-1 py-3.5 rounded-xl font-bold text-xs border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  Clear Filters
                </button>
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="flex-1 py-3.5 rounded-xl font-bold text-xs bg-gradient-ozo text-white shadow-ozo hover:opacity-95 transition-opacity"
                >
                  Apply Filters
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default CategoryProducts
