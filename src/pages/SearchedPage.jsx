import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search as SearchIcon, 
  X, 
  Filter, 
  ShoppingBag,
  TrendingUp,
  Info,
  ChevronLeft,
  ArrowUpDown,
  Sparkles,
  AlertCircle,
  History,
  MapPin,
  ChevronDown,
  Mic,
  MicOff
} from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useProductStore } from '../stores/productStore'
import { useLocationStore, checkPincodeServiceable, checkDeliveryZoneStatus } from '../stores/locationStore'
import { useCartStore } from '../stores/cartStore'
import { useProductPagination } from '../hooks/useProductPagination'
import ProductCard from '../components/ProductCard'
import ProductSkeleton from '../components/ProductSkeleton'
import { resolveCategoryIcon, getGradient } from '../components/CategoryChip'
import { useOzoQuery } from '../hooks/useOzoQuery'
import OzoLoadingGuard from '../components/OzoLoadingGuard'
import Breadcrumb from '../components/Breadcrumb'

const getSearchHistory = () => {
  try {
    const history = localStorage.getItem('ozo_search_history')
    if (history === null) {
      const defaults = ['Milk', 'Chips', 'Snacks', 'Cosmetics', 'Dairy product']
      localStorage.setItem('ozo_search_history', JSON.stringify(defaults))
      return defaults
    }
    return JSON.parse(history)
  } catch (e) {
    return []
  }
}

const saveSearchQuery = (query) => {
  if (!query || !query.trim()) return
  const trimmed = query.trim()
  try {
    const history = getSearchHistory()
    const filtered = history.filter(item => item.toLowerCase() !== trimmed.toLowerCase())
    const newHistory = [trimmed, ...filtered].slice(0, 8)
    localStorage.setItem('ozo_search_history', JSON.stringify(newHistory))
    window.dispatchEvent(new Event('ozo_search_history_updated'))
  } catch (e) {
    console.error(e)
  }
}

const removeSearchQuery = (query) => {
  try {
    const history = getSearchHistory()
    const newHistory = history.filter(item => item !== query)
    localStorage.setItem('ozo_search_history', JSON.stringify(newHistory))
    window.dispatchEvent(new Event('ozo_search_history_updated'))
  } catch (e) {
    console.error(e)
  }
}

const clearSearchHistory = () => {
  try {
    localStorage.setItem('ozo_search_history', JSON.stringify([]))
    window.dispatchEvent(new Event('ozo_search_history_updated'))
  } catch (e) {
    console.error(e)
  }
}

export default function SearchedPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const urlQuery = searchParams.get('q') || ''
  
  const [searchTerm, setSearchTerm] = useState(urlQuery)
  const [sortBy, setSortBy] = useState('relevance') // 'relevance', 'price_asc', 'price_desc', 'name'
  const [filterBestseller, setFilterBestseller] = useState(false)
  const [filterFeatured, setFilterFeatured] = useState(false)
  const searchInputRef = useRef(null)

  const fetchCategories = useProductStore(state => state.fetchCategories)
  const { address, coordinates, addressDetails, nearestCity, tracedThrough } = useLocationStore(useShallow(state => ({
    address: state.address,
    coordinates: state.coordinates,
    addressDetails: state.addressDetails,
    nearestCity: state.nearestCity,
    tracedThrough: state.tracedThrough,
  })))

  // Determine if location is serviceable
  const isLocationServiceable = (() => {
    if (!address) return true
    
    // 1. If coordinates are available, geofence check is Single Source of Truth
    if (coordinates && coordinates.lat && coordinates.lng) {
      return checkDeliveryZoneStatus(coordinates.lat, coordinates.lng, useCartStore.getState())
    }

    // 2. Otherwise, check if postcode is allowed in city settings
    let postcode = addressDetails?.postcode || addressDetails?.pincode || ''
    if (!postcode && typeof address === 'string') {
      const match = address.match(/\b\d{6}\b/)
      if (match) {
        postcode = match[0]
      }
    }

    if (postcode) {
      return checkPincodeServiceable(postcode, addressDetails?.city || nearestCity?.name)
    }

    // Fallback: nearest city active status
    if (nearestCity) {
      return nearestCity.is_active
    }

    return true
  })()

  const [searchHistory, setSearchHistory] = useState([])

  // Voice Search states & logic
  const [isListening, setIsListening] = useState(false)
  const [voiceTranscript, setVoiceTranscript] = useState('')
  const [voiceError, setVoiceError] = useState('')
  const recognitionRef = useRef(null)
  const errorTimeoutRef = useRef(null)

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current)
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch (e) {}
      }
    }
  }, [])

  const startListening = () => {
    // Clear any previous error timeout
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current)
      errorTimeoutRef.current = null
    }

    // Abort previous speech recognition instance if active
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort()
      } catch (e) {}
    }

    setVoiceError('')
    setVoiceTranscript('')
    
    // Check SpeechRecognition support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setVoiceError('Voice search is not supported in this browser. Please try Chrome, Safari or Edge.')
      setIsListening(true)
      errorTimeoutRef.current = setTimeout(() => {
        setIsListening(false)
      }, 3000)
      return
    }

    try {
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = true
      recognition.lang = 'en-IN' // Understands Hinglish and Indian accents perfectly

      recognition.onstart = () => {
        setIsListening(true)
      }

      recognition.onerror = (event) => {
        console.error('Speech recognition error', event)
        if (event.error === 'no-speech') {
          setVoiceError('No speech detected. Please tap the mic to speak again.')
        } else if (event.error === 'not-allowed') {
          setVoiceError('Microphone permission blocked. Please check browser settings.')
        } else {
          setVoiceError('Could not recognize speech. Please try again.')
        }
        
        // Auto-close overlay after 4 seconds of error display, unless user restarts
        errorTimeoutRef.current = setTimeout(() => {
          setIsListening(false)
        }, 4000)
      }

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0])
          .map(result => result.transcript)
          .join('')

        setVoiceTranscript(transcript)

        if (event.results[0].isFinal) {
          const finalQuery = transcript.trim()
          if (finalQuery) {
            triggerSearch(finalQuery)
            setTimeout(() => {
              setIsListening(false)
            }, 600)
          }
        }
      }

      recognitionRef.current = recognition
      recognition.start()
    } catch (e) {
      console.error(e)
      setVoiceError('Could not start microphone.')
      errorTimeoutRef.current = setTimeout(() => {
        setIsListening(false)
      }, 2500)
    }
  }

  const stopListening = () => {
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current)
      errorTimeoutRef.current = null
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort()
      } catch (e) {}
    }
    setIsListening(false)
  }

  const breadcrumbItems = useMemo(() => {
    return [
      { name: 'Home', url: '/' },
      { name: 'Search', url: null }
    ]
  }, [])

  // Load and subscribe to search history updates
  useEffect(() => {
    setSearchHistory(getSearchHistory())
    const handleUpdate = () => {
      setSearchHistory(getSearchHistory())
    }
    window.addEventListener('ozo_search_history_updated', handleUpdate)
    return () => {
      window.removeEventListener('ozo_search_history_updated', handleUpdate)
    }
  }, [])

  // Use paginated product hook
  const {
    products,
    spellingSuggestion,
    isLoading,
    isLoadingMore,
    isError,
    hasMore,
    fetchProductsPage,
    reset
  } = useProductPagination()

  // Fetch categories for search page landing mode (when query is empty)
  const { data: categoriesData, isLoading: isCategoriesLoading, isError: isCategoriesError, refetch } = useOzoQuery(
    async (signal) => {
      const res = await fetchCategories({ signal })
      if (!res.success) {
        throw res.error || new Error('Failed to fetch categories')
      }
      return res.data || []
    },
    [fetchCategories]
  )

  // Sync state with URL search param
  useEffect(() => {
    setSearchTerm(urlQuery)
  }, [urlQuery])

  // Trigger page fetch whenever search term, sorting, or filters change
  useEffect(() => {
    if (urlQuery.trim()) {
      let options = {
        search: urlQuery,
        featured: filterFeatured,
        bestseller: filterBestseller
      }

      if (sortBy === 'price_asc') {
        options.sortBy = 'price'
        options.ascending = true
      } else if (sortBy === 'price_desc') {
        options.sortBy = 'price'
        options.ascending = false
      } else if (sortBy === 'name') {
        options.sortBy = 'name'
        options.ascending = true
      } else {
        options.sortBy = 'relevance'
      }

      fetchProductsPage(options)
    } else {
      reset()
    }
  }, [urlQuery, sortBy, filterBestseller, filterFeatured, fetchProductsPage, reset])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    if (searchTerm.trim()) {
      saveSearchQuery(searchTerm.trim())
      setSearchParams({ q: searchTerm.trim() })
    }
  }

  const handleSearchChange = (e) => {
    const val = e.target.value
    setSearchTerm(val)
    if (val.trim() === '') {
      setSearchParams({})
      reset()
    }
  }

  const triggerSearch = (term) => {
    setSearchTerm(term)
    saveSearchQuery(term)
    setSearchParams({ q: term })
  }

  const loadMore = () => {
    let options = {
      search: urlQuery,
      featured: filterFeatured,
      bestseller: filterBestseller
    }

    if (sortBy === 'price_asc') {
      options.sortBy = 'price'
      options.ascending = true
    } else if (sortBy === 'price_desc') {
      options.sortBy = 'price'
      options.ascending = false
    } else if (sortBy === 'name') {
      options.sortBy = 'name'
      options.ascending = true
    } else {
      options.sortBy = 'relevance'
    }

    fetchProductsPage(options, true)
  }

  const observerRef = useRef(null)

  useEffect(() => {
    if (!hasMore || isLoadingMore || isLoading) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore()
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
  }, [hasMore, isLoadingMore, isLoading, loadMore])

  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      const aOOS = !a?.is_available || a?.quantity_available === 0;
      const bOOS = !b?.is_available || b?.quantity_available === 0;
      if (aOOS && !bOOS) return 1;
      if (!aOOS && bOOS) return -1;
      return 0;
    });
  }, [products]);

  const trendingSearches = ['Mango', 'Milk', 'Organic Vegetables', 'Cooking Oil', 'Bread', 'Snacks']

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] pb-24 transition-colors duration-300">
      {/* Sticky Header Bar (Mobile Only) */}
      <div className="page-header-sticky md:hidden !py-2.5 bg-white dark:bg-[#0a0a0a] border-b border-gray-150/10 dark:border-white/5 shadow-sm">
        <div className="px-3.5 space-y-2.5">
          {/* Location Selector (Mobile Only - Second Row) */}
          <div className="max-w-4xl mx-auto">
            <button 
              onClick={() => {
                navigate('/select-location')
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-300 border shadow-sm group ${
                isLocationServiceable
                  ? 'bg-gray-50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 border-gray-100/80 dark:border-white/5 hover:border-ozo-red/20'
                  : 'bg-red-50/50 dark:bg-red-950/20 hover:bg-red-50 border-red-200 dark:border-red-900/40 hover:border-red-300'
              }`}
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 transition-all flex-shrink-0 ${
                isLocationServiceable
                  ? 'bg-red-50 dark:bg-ozo-red/10 text-ozo-red'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
              }`}>
                <MapPin className="w-3.5 h-3.5" />
              </div>
              <div className="text-left min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-[7.5px] uppercase tracking-widest text-ozo-gray dark:text-gray-400 font-black leading-none mb-0.5">Deliver to</p>
                  {!isLocationServiceable && (
                    <span className="text-[6.5px] font-black text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-1 py-0.5 rounded leading-none uppercase tracking-wider">
                      Not Serviceable
                    </span>
                  )}
                </div>
                <p className={`text-xs font-black flex items-center gap-1 truncate ${
                  isLocationServiceable ? 'text-gray-900 dark:text-white' : 'text-red-600 dark:text-red-400'
                }`}>
                  <span className="truncate">{address || 'Select Location'}</span>
                  <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 ${
                    isLocationServiceable ? 'text-ozo-red' : 'text-red-600'
                  }`} />
                </p>
              </div>
            </button>
          </div>

          <div className="max-w-4xl mx-auto">
            <form 
              onSubmit={handleSearchSubmit} 
              className="w-full relative group"
            >
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-ozo-red transition-colors w-4.5 h-4.5" />
              <input 
                ref={searchInputRef}
                autoFocus
                type="text" 
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Search for mango, milk, bread, snacks..."
                className="w-full pl-11 pr-20 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/50 dark:border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-ozo-red/20 focus:border-ozo-red transition-all font-semibold text-sm placeholder:text-gray-400 text-gray-900 dark:text-white"
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {searchTerm && (
                  <button 
                    type="button"
                    onClick={() => { 
                      setSearchTerm(''); 
                      setSearchParams({});
                      reset(); 
                    }}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-colors text-gray-500 hover:text-ozo-red flex items-center justify-center"
                  >
                    <X size={16} />
                  </button>
                )}
                <button 
                  type="button"
                  onClick={startListening}
                  className="p-1.5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-colors text-gray-500 hover:text-ozo-red flex items-center justify-center active:scale-90"
                >
                  <Mic size={16} />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div className="container-custom py-4 sm:py-8">
        <div className="max-w-6xl mx-auto">
          {/* Breadcrumbs for desktop */}
          <Breadcrumb items={breadcrumbItems} className="hidden md:block mb-6" />

          <AnimatePresence mode="wait">
            {!urlQuery ? (
              // 1. Landing View (Empty Search query)
              <motion.div 
                key="initial"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-3xl mx-auto space-y-8 mt-2"
              >
                {/* Search History */}
                {searchHistory.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[11px] font-black uppercase tracking-widest text-ozo-gray dark:text-gray-400 flex items-center gap-1.5">
                        <History size={14} className="text-ozo-red animate-pulse" />
                        Recent Searches
                      </h3>
                      <button
                        onClick={clearSearchHistory}
                        className="text-[10px] font-black text-ozo-red hover:underline uppercase tracking-wider"
                      >
                        Clear All
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {searchHistory.map((item) => (
                        <div
                          key={item}
                          className="flex items-center gap-1.5 bg-white dark:bg-white/5 hover:bg-gray-150/50 dark:hover:bg-white/10 rounded-xl px-3 py-1.5 border border-gray-150/40 dark:border-white/5 transition-all duration-200 shadow-sm"
                        >
                          <button
                            onClick={() => triggerSearch(item)}
                            className="text-xs font-semibold text-gray-700 dark:text-gray-300 hover:text-ozo-red transition-colors"
                          >
                            {item}
                          </button>
                          <button
                            onClick={() => removeSearchQuery(item)}
                            className="p-0.5 hover:bg-gray-200 dark:hover:bg-white/15 rounded-full transition-colors text-gray-400 hover:text-ozo-red flex items-center justify-center"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Trending Searches */}
                <div className="space-y-4">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-ozo-gray dark:text-gray-400 flex items-center gap-1.5">
                    <TrendingUp size={14} className="text-ozo-green" />
                    Trending Searches
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {trendingSearches.map((term) => (
                      <button 
                        key={term}
                        onClick={() => triggerSearch(term)}
                        className="px-4 py-2 bg-white dark:bg-white/5 border border-gray-200/50 dark:border-white/10 rounded-xl font-semibold text-xs text-gray-700 dark:text-gray-300 hover:border-ozo-red hover:text-ozo-red hover:bg-red-50/20 dark:hover:bg-red-500/5 transition-all shadow-sm active:scale-95"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Browse Categories */}
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-ozo-gray dark:text-gray-500 mb-6 flex items-center gap-2">
                    Browse Categories
                  </h3>
                  <OzoLoadingGuard
                    isLoading={isCategoriesLoading}
                    isError={isCategoriesError}
                    isEmpty={!isCategoriesLoading && (categoriesData || []).length === 0}
                    onRetry={refetch}
                    skeleton={
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {[...Array(6)].map((_, i) => (
                          <div key={i} className="h-40 bg-white dark:bg-white/5 rounded-[2rem] border border-gray-100 dark:border-white/10 animate-pulse" />
                        ))}
                      </div>
                    }
                  >
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {(categoriesData || []).slice(0, 6).map((cat) => {
                        const isEmoji = cat.icon && cat.icon.codePointAt(0) > 127
                        const IconComponent = isEmoji ? null : (resolveCategoryIcon(cat) || ShoppingBag)
                        const gradientClasses = getGradient(cat.slug, cat.name)
                        const gradientSplit = gradientClasses.split(' ')
                        const fromTo = gradientSplit.slice(0, 2).join(' ')
                        const textColor = gradientSplit[2] || 'text-gray-600'

                        return (
                          <Link 
                            key={cat.id} 
                            to={`/category/${cat.slug}`}
                            className="p-6 bg-white dark:bg-[#111] rounded-[2rem] border border-gray-100 dark:border-white/5 hover:border-ozo-red hover:shadow-xl transition-all group flex flex-col items-center text-center gap-4"
                          >
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform bg-gradient-to-br ${fromTo}`}>
                              {isEmoji ? (
                                <span className="text-2xl">{cat.icon}</span>
                              ) : (
                                <IconComponent size={28} className={textColor} strokeWidth={2} />
                              )}
                            </div>
                            <span className="font-bold text-gray-900 dark:text-white">{cat.name}</span>
                          </Link>
                        )
                      })}
                    </div>
                  </OzoLoadingGuard>
                </div>
              </motion.div>
            ) : (
              // 2. Search Results View
              <motion.div 
                key="results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                {/* Spelling Suggestion Banner */}
                {spellingSuggestion && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-3xl bg-white dark:bg-[#111] border border-ozo-red/15 dark:border-ozo-red/20 shadow-sm flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 flex-wrap text-sm">
                      <Sparkles size={16} className="text-ozo-red animate-pulse" />
                      <span className="text-gray-500 dark:text-gray-400 font-medium">Showing results for:</span>
                      <button
                          onClick={() => triggerSearch(spellingSuggestion)}
                          className="font-black text-gradient hover:underline focus:outline-none"
                      >
                        {spellingSuggestion}
                      </button>
                      <span className="text-gray-350 dark:text-gray-700 mx-1">|</span>
                      <span className="text-gray-500 dark:text-gray-400 font-medium">Search instead for:</span>
                      <button
                        onClick={() => {
                          // Bypass suggestion by keeping exact literal query in URL
                          setSearchParams({ q: urlQuery })
                        }}
                        className="font-bold text-ozo-red dark:text-red-400 hover:underline focus:outline-none"
                      >
                        {urlQuery}
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Filters, Badges and Results Header */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white dark:bg-[#111] p-6 md:p-8 rounded-[2rem] border border-gray-150/20 dark:border-white/5 shadow-sm">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-ozo-gray dark:text-gray-500">Search Results</span>
                    <h1 className="text-xl md:text-2xl font-display font-black text-gray-900 dark:text-white mt-1 flex flex-wrap items-center gap-2">
                      Showing results for <span className="text-gradient">"{urlQuery}"</span>
                      <span className="inline-flex items-center px-3 py-1 bg-gray-50 dark:bg-white/5 rounded-xl text-xs font-black text-ozo-gray uppercase tracking-wider border border-gray-100 dark:border-white/5">
                        {products.length} {products.length === 1 ? 'item' : 'items'} found
                      </span>
                    </h1>
                  </div>

                  {/* Filter / Sort Actions */}
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Sort Dropdown */}
                    <div className="flex items-center gap-2.5 bg-gray-50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 rounded-2xl px-4 py-2.5 border border-gray-100 dark:border-white/10 transition-all duration-300 shadow-sm focus-within:border-ozo-red/40">
                      <ArrowUpDown size={16} className="text-ozo-gray" />
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="bg-transparent text-sm font-black text-gray-700 dark:text-gray-300 focus:outline-none cursor-pointer pr-1"
                      >
                        <option value="relevance">Sort: Relevance</option>
                        <option value="price_asc">Price: Low to High</option>
                        <option value="price_desc">Price: High to Low</option>
                        <option value="name">Name: A to Z</option>
                      </select>
                    </div>

                    {/* Bestseller Filter Chip */}
                    <button
                      onClick={() => setFilterBestseller(!filterBestseller)}
                      className={`px-5 py-2.5 rounded-2xl border text-sm font-black transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${
                        filterBestseller
                          ? 'bg-ozo-yellow/10 border-ozo-yellow text-ozo-yellow-dark dark:text-ozo-yellow shadow-sm'
                          : 'bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-white/20'
                      }`}
                    >
                      Bestsellers
                    </button>

                    {/* Featured Filter Chip */}
                    <button
                      onClick={() => setFilterFeatured(!filterFeatured)}
                      className={`px-5 py-2.5 rounded-2xl border text-sm font-black transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${
                        filterFeatured
                          ? 'bg-ozo-green/10 border-ozo-green text-ozo-green-dark dark:text-ozo-green shadow-sm'
                          : 'bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-white/20'
                      }`}
                    >
                      Featured
                    </button>
                  </div>
                </div>

                {/* Products Grid / Loading State */}
                {isLoading ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6">
                    {[...Array(10)].map((_, i) => (
                      <div key={i} className="aspect-[3/4] bg-white dark:bg-[#111] rounded-[2.5rem] animate-pulse border border-gray-100 dark:border-white/5" />
                    ))}
                  </div>
                ) : sortedProducts.length > 0 ? (
                  <div className="space-y-8">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6">
                      {sortedProducts.map((product) => (
                        <ProductCard key={product.id} product={product} />
                      ))}
                    </div>

                    {/* Pagination / Load More */}
                    {hasMore && (
                      <div ref={observerRef} className="flex justify-center pt-6 py-6">
                        <div className="flex items-center gap-2.5 text-xs font-black uppercase tracking-widest text-ozo-red">
                          <span className="w-5 h-5 border-2 border-ozo-red border-t-transparent rounded-full animate-spin" />
                          <span>Loading more items...</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  // Empty results view
                  <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-[#111] rounded-[3rem] border border-gray-100 dark:border-white/5 shadow-sm">
                    <div className="w-20 h-20 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center text-gray-400 mb-6">
                      <AlertCircle size={40} className="text-ozo-gray" />
                    </div>
                    <h3 className="text-2xl font-black mb-2 text-gray-900 dark:text-white">No results found</h3>
                    <p className="text-ozo-gray max-w-sm mb-8">We couldn't find anything matching "{urlQuery}". Try adjusting spelling or searching other items.</p>
                    
                    <div className="space-y-4">
                      <p className="text-xs font-black uppercase tracking-wider text-ozo-gray">Popular searches</p>
                      <div className="flex flex-wrap justify-center gap-2 max-w-md">
                        {trendingSearches.map((term) => (
                          <button
                            key={term}
                            onClick={() => triggerSearch(term)}
                            className="px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-150/40 dark:border-white/10 rounded-xl font-bold text-sm text-gray-700 hover:border-ozo-red transition-all"
                          >
                            {term}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
      </div>

      {/* Voice Search Overlay */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-[9999] flex flex-col items-center justify-center text-white px-6"
          >
            <div className="relative flex flex-col items-center max-w-md w-full text-center space-y-8">
              {/* Pulsing visual circles for voice waves */}
              <div className="relative flex items-center justify-center w-32 h-32">
                {!voiceError && (
                  <>
                    <motion.div
                      animate={{ scale: [1, 1.8, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut" }}
                      className="absolute inset-0 bg-ozo-red/25 rounded-full"
                    />
                    <motion.div
                      animate={{ scale: [1, 1.4, 1], opacity: [0.8, 0, 0.8] }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut", delay: 0.3 }}
                      className="absolute inset-2 bg-ozo-red/35 rounded-full"
                    />
                  </>
                )}
                <button 
                  onClick={startListening}
                  className="relative z-10 w-16 h-16 bg-ozo-red hover:bg-red-650 active:bg-red-700 rounded-full flex items-center justify-center shadow-lg shadow-ozo-red/40 transition-all hover:scale-105 active:scale-95 focus:outline-none"
                >
                  <Mic size={28} className={`text-white ${!voiceError ? 'animate-pulse' : ''}`} />
                </button>
              </div>

              <div className="space-y-3">
                <h2 className="text-xl font-black tracking-wide">
                  {voiceTranscript ? "Listening..." : "Speak Now..."}
                </h2>
                <p className="text-base font-bold text-gray-200 min-h-[1.5rem] px-4">
                  {voiceTranscript || "Try saying 'fresh mango', 'organic milk'..."}
                </p>
              </div>

              {voiceError && (
                <p className="text-xs font-semibold text-red-500 bg-red-500/10 px-3.5 py-2 rounded-full border border-red-500/20 max-w-xs mx-auto">
                  {voiceError}
                </p>
              )}

              <button
                onClick={stopListening}
                className="mt-6 px-6 py-2.5 bg-white/10 hover:bg-white/15 active:bg-white/25 border border-white/10 rounded-full text-xs font-bold uppercase tracking-wider transition-all"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  </div>
  )
}
