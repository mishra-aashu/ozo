import { useState, useEffect, useRef, useCallback } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  MapPin,
  User,
  ShoppingCart,
  Heart,
  Menu,
  X,
  ChevronDown,
  Clock,
  Package,
  LogOut,
  Settings,
  Bell,
  Sun,
  Moon,
  Tag,
  Shield,
  Bike,
  Store,
  LayoutGrid,
  History,
  Home as HomeIcon,
  Gift
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { useCartStore } from '../stores/cartStore'
import { useWishlistStore } from '../stores/wishlistStore'
import { useProductStore } from '../stores/productStore'
import { useLocationStore, checkDeliveryZoneStatus, checkPincodeServiceable } from '../stores/locationStore'
import { useThemeStore } from '../stores/themeStore'
import { useNotificationStore } from '../stores/notificationStore'
import LocationPicker from './LocationPicker'
import BrowsingBanner from './BrowsingBanner'
import OzoLogo from './OzoLogo'
import toast from 'react-hot-toast'
import UserAvatar from './UserAvatar'
import OptimizedImage from './OptimizedImage'

const getSearchHistory = () => {
  try {
    const history = localStorage.getItem('ozo_search_history')
    return history ? JSON.parse(history) : []
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
    localStorage.removeItem('ozo_search_history')
    window.dispatchEvent(new Event('ozo_search_history_updated'))
  } catch (e) {
    console.error(e)
  }
}

const trendingSearches = [
  { name: 'Alphonso Mango', icon: '🥭' },
  { name: 'Mithila Makhana', icon: '🍿' },
  { name: 'Fresh Milk', icon: '🥛' },
  { name: 'Organic Vegetables', icon: '🥦' },
  { name: 'Brown Bread', icon: '🍞' },
  { name: 'Chocolate Cookies', icon: '🍪' }
]

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [searchHistory, setSearchHistory] = useState([])
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

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

  const location = useLocation()
  const navigate = useNavigate()

  // Sync search query in header with URL parameter 'q' when on the search page
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const q = params.get('q') || ''
    if (location.pathname === '/search') {
      setSearchQuery(q)
    } else {
      setSearchQuery('')
    }
  }, [location.pathname, location.search])

  const { user, profile, isAuthenticated, signOut, isAdmin } = useAuthStore(useShallow(state => ({
    user: state.user,
    profile: state.profile,
    isAuthenticated: state.isAuthenticated,
    signOut: state.signOut,
    isAdmin: state.isAdmin,
  })))
  const isSuperAdmin = profile?.isSuperAdmin || profile?.role === 'super_admin' || profile?.role === 'admin'
  const isCityManager = profile?.isCityManager || profile?.role === 'city_manager'
  const hasAdminPermission = isAdmin || isSuperAdmin || isCityManager
  const isCaptain = profile?.role === 'captain' || profile?.role === 'rider' || profile?.isRider || hasAdminPermission
  const isMartOperator = profile?.role === 'mart_operator' || profile?.role === 'mart_owner' || profile?.isMartOwner || hasAdminPermission
  const { totalItems, deliveryConfig, serviceHoursConfig } = useCartStore(useShallow(state => ({
    totalItems: state.totalItems,
    deliveryConfig: state.deliveryConfig,
    serviceHoursConfig: state.serviceHoursConfig
  })))

  const isClosed = (() => {
    if (!serviceHoursConfig || !serviceHoursConfig.enabled) return false

    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const currentTimeInMinutes = currentHour * 60 + currentMinute

    // Parse start_time (e.g. "06:00")
    const [startHour, startMin] = (serviceHoursConfig.start_time || "06:00").split(":").map(Number)
    const startTimeInMinutes = startHour * 60 + startMin

    // Parse end_time (e.g. "21:00")
    const [endHour, endMin] = (serviceHoursConfig.end_time || "21:00").split(":").map(Number)
    const endTimeInMinutes = endHour * 60 + endMin

    if (startTimeInMinutes < endTimeInMinutes) {
      // Standard daily hours (e.g. 6 AM to 9 PM)
      return currentTimeInMinutes < startTimeInMinutes || currentTimeInMinutes >= endTimeInMinutes
    } else {
      // Overnight hours (e.g. 9 PM to 6 AM)
      return currentTimeInMinutes >= endTimeInMinutes && currentTimeInMinutes < startTimeInMinutes
    }
  })()

  const freeAbove = deliveryConfig?.free_above ?? 99
  const wishlistItems = useWishlistStore(state => state.items)
  const { searchProducts, searchResults, isSearchLoading } = useProductStore(useShallow(state => ({
    searchProducts: state.searchProducts,
    searchResults: state.searchResults,
    isSearchLoading: state.isSearchLoading,
  })))
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
  const { theme, toggleTheme } = useThemeStore(useShallow(state => ({
    theme: state.theme,
    toggleTheme: state.toggleTheme,
  })))
  const unreadCount = useNotificationStore(useCallback(state => state.notifications.filter(n => !n.is_read).length, []))

  const [isScrolled, setIsScrolled] = useState(false)
  const [showHeader, setShowHeader] = useState(true)
  const lastScrollY = useRef(0)
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false)
  const profileDropdownRef = useRef(null)
  const searchDropdownRef = useRef(null)

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setIsProfileOpen(false)
      }
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(event.target)) {
        setShowSearch(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close dropdowns when route changes
  useEffect(() => {
    setIsMenuOpen(false)
    setIsProfileOpen(false)
    setShowSearch(false)
  }, [location])

  useEffect(() => {
    let ticking = false
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY
          
          setIsScrolled(prev => {
            const next = currentScrollY > 20
            return prev === next ? prev : next
          })

          if (currentScrollY >= 0) {
            if (currentScrollY <= 50) {
              setShowHeader(true)
            } else {
              const diff = currentScrollY - lastScrollY.current
              if (diff > 5) {
                setShowHeader(false)
                lastScrollY.current = currentScrollY
              } else if (diff < -5) {
                setShowHeader(true)
                lastScrollY.current = currentScrollY
              }
            }
          }
          ticking = false
        })
        ticking = true
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Update CSS variable for header height dynamically
  useEffect(() => {
    const headerElement = document.querySelector('.header')
    
    const updateHeaderHeight = () => {
      if (!showHeader) {
        document.documentElement.style.setProperty('--header-height', '0px')
        return
      }

      if (headerElement) {
        const rect = headerElement.getBoundingClientRect()
        if (rect && rect.height > 0) {
          document.documentElement.style.setProperty('--header-height', `${rect.height}px`)
          return
        }
      }
      
      // Fallback
      const isDesktop = window.innerWidth >= 1024
      const height = isDesktop ? '80px' : '124px'
      document.documentElement.style.setProperty('--header-height', height)
    }

    updateHeaderHeight()
    window.addEventListener('resize', updateHeaderHeight)
    
    let resizeObserver
    if (headerElement && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(updateHeaderHeight)
      })
      resizeObserver.observe(headerElement)
    }

    return () => {
      window.removeEventListener('resize', updateHeaderHeight)
      if (resizeObserver) {
        resizeObserver.disconnect()
      }
    }
  }, [showHeader])

  // Handle search
  useEffect(() => {
    if (!searchQuery.trim()) {
      return
    }
    const delayDebounceFn = setTimeout(() => {
      searchProducts(searchQuery)
    }, 300)

    return () => clearTimeout(delayDebounceFn)
  }, [searchQuery, searchProducts])

  const handleLogout = useCallback(async () => {
    setIsMenuOpen(false)
    setIsProfileOpen(false)
    const result = await useAuthStore.getState().signOut()
    if (result.success) {
      navigate('/')
    }
  }, [navigate])

  const handleSearchSelect = useCallback((product) => {
    setSearchQuery('')
    setShowSearch(false)
    navigate(`/product/${product.slug}`)
  }, [navigate])

  const handleTrendingClick = useCallback((term) => {
    setSearchQuery(term)
    saveSearchQuery(term)
    useProductStore.getState().searchProducts(term)
    setShowSearch(true)
  }, [])

  const handleHistoryClick = useCallback((term) => {
    setSearchQuery(term)
    saveSearchQuery(term)
    useProductStore.getState().searchProducts(term)
    setShowSearch(true)
  }, [])

  const handleSearchSubmit = useCallback((e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      saveSearchQuery(searchQuery.trim())
      setShowSearch(false)
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }, [searchQuery, navigate])

  return (
    <>
      {/* Dynamic Delivery Service Hours Banner */}
      <AnimatePresence>
        {isClosed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 text-white relative z-[100] border-b border-white/10 shadow-md overflow-hidden"
          >
            <div className="container-custom py-3 px-4 flex items-center justify-center text-center">
              <p className="text-xs sm:text-sm font-bold tracking-wide flex items-center justify-center gap-2 leading-relaxed max-w-4xl mx-auto">
                {serviceHoursConfig.banner_text || "⏰ OZO Service Update: Delivery services are currently closed."}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Browsing & Drift Banner */}
      <BrowsingBanner />

      {/* Top Bar */}
      <div className="bg-gradient-ozo text-white py-2 hidden md:block">
        <div className="container-custom">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-6">
              {!isClosed && (
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Delivery in 30 minutes
                </span>
              )}
              <span>
                {freeAbove > 5000 
                  ? `Delivery fee: ₹${deliveryConfig?.base_fee ?? 30}` 
                  : `Free delivery on orders above ₹${freeAbove}`}
              </span>
            </div>
            <div className="flex items-center gap-6">
              <Link to="/offers" className="hover:underline">Offers</Link>
              <Link to="/help" className="hover:underline">Help</Link>
              <Link to="/help" className="hover:underline">📞 Contact Us</Link>
            </div>
          </div>
        </div>
      </div>

      <header 
        className={`header ${isScrolled ? 'header-scrolled py-2' : 'py-3 md:py-4'}`}
        style={{
          top: showHeader ? '0' : '-150px',
          transition: 'top 0.3s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.3s, border-color 0.3s'
        }}
      >
        <div className="container-custom">
          <div className="flex items-center justify-between gap-1.5 xs:gap-3 md:gap-4">
            
             {/* Logo + Location Column/Row */}
            <div className="flex items-center gap-1.5 md:gap-2.5 min-w-0 md:flex-shrink-0">
              <Link to="/" className="flex items-center gap-1.5 xs:gap-2 flex-shrink-0 group">
                <OzoLogo
                  size="sm"
                  subText="Jo Chahiye, Jab Chahiye"
                  subTextClassName="hidden sm:inline-block mt-1"
                  imgClassName="group-hover:scale-105 group-hover:rotate-3 transition-all duration-500"
                />
              </Link>

              {/* Location Selector (Desktop Only) */}
              <button 
                onClick={() => {
                  if (window.innerWidth < 1024) {
                    navigate('/select-location')
                  } else {
                    setIsLocationPickerOpen(true)
                  }
                }}
                aria-label="Select Delivery Location"
                className={`hidden lg:flex items-center translate-y-[2.5px] lg:translate-y-0 gap-1 lg:gap-2 px-1.5 lg:px-3 py-1 lg:py-1.5 rounded-xl lg:rounded-2xl transition-all duration-300 border shadow-sm hover:shadow-md group max-w-[240px] lg:max-w-[280px] ${
                  isLocationServiceable 
                    ? 'bg-gray-50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 border-gray-100 dark:border-white/5 hover:border-ozo-red/20 dark:hover:border-ozo-red/20' 
                    : 'bg-red-50/50 dark:bg-red-950/20 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-900/40 hover:border-red-300 dark:hover:border-red-800'
                }`}
              >
                <div className={`w-5 h-5 xs:w-7 xs:h-7 lg:w-9 lg:h-9 rounded-md xs:rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 transition-all flex-shrink-0 ${
                  isLocationServiceable
                    ? 'bg-red-50 dark:bg-ozo-red/10 text-ozo-red'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                }`}>
                  <MapPin className="w-2.5 h-2.5 xs:w-3.5 xs:h-3.5 lg:w-4 lg:h-4" />
                </div>
                <div className="text-left min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[6px] xs:text-[8px] lg:text-[10px] uppercase tracking-widest text-ozo-gray dark:text-gray-400 font-black leading-none mb-0.5">
                      Deliver to
                    </p>
                    {!isLocationServiceable && (
                      <span className="text-[6px] xs:text-[8px] lg:text-[9px] font-black text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-1 py-0.5 rounded leading-none uppercase tracking-wider">
                        Not Serviceable
                      </span>
                    )}
                  </div>
                  <p className={`text-[9px] xs:text-xs lg:text-sm font-black flex items-center gap-0.5 xs:gap-1 truncate ${
                    isLocationServiceable ? 'text-gray-900 dark:text-white' : 'text-red-600 dark:text-red-400'
                  }`}>
                    <span className="truncate">{address || 'Select Location'}</span>
                    <ChevronDown className={`w-2.5 h-2.5 xs:w-3.5 xs:h-3.5 lg:w-3.5 lg:h-3.5 flex-shrink-0 ${
                      isLocationServiceable ? 'text-ozo-red' : 'text-red-600'
                    }`} />
                  </p>
                </div>
              </button>
            </div>

            {/* Search Bar (Desktop Only) */}
            <form 
              ref={searchDropdownRef}
              onSubmit={handleSearchSubmit}
              className="flex-1 min-w-[200px] md:min-w-[240px] lg:min-w-[320px] max-w-md lg:max-w-xl relative hidden md:block"
            >
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-ozo opacity-0 group-focus-within:opacity-5 blur-xl transition-opacity duration-500 rounded-3xl pointer-events-none" />
                <button type="submit" aria-label="Search" className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-ozo-gray hover:text-ozo-red hover:scale-110 active:scale-95 transition-all duration-300 flex items-center justify-center">
                  <Search className="w-5 h-5" />
                </button>
                <input
                  type="text"
                  placeholder="Search for 'fresh mango' or 'thekua'..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setShowSearch(true)}
                  className="w-full pl-14 pr-6 py-3.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-[1.5rem] focus:bg-white dark:focus:bg-[#1a1a1a] focus:outline-none focus:ring-4 focus:ring-ozo-red/10 focus:border-ozo-red transition-all duration-500 text-sm font-bold text-gray-800 dark:text-white placeholder:text-gray-400 shadow-sm focus:shadow-xl"
                />

                {/* Search Results Dropdown */}
                <AnimatePresence>
                  {showSearch && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full left-0 right-0 mt-3 bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl border border-gray-100 dark:border-white/5 max-h-[32rem] overflow-hidden z-50"
                    >
                      <div className="overflow-y-auto max-h-[30rem] scrollbar-hide">
                        {isSearchLoading ? (
                          <div className="p-4 space-y-3">
                            {[1, 2, 3].map((n) => (
                              <div key={n} className="flex items-center gap-4 p-3 animate-pulse">
                                <div className="w-14 h-14 bg-gray-100 dark:bg-white/5 rounded-xl flex-shrink-0" />
                                <div className="flex-1 space-y-2">
                                  <div className="h-4 bg-gray-100 dark:bg-white/5 rounded w-2/3" />
                                  <div className="h-3 bg-gray-100 dark:bg-white/5 rounded w-1/3" />
                                </div>
                                <div className="w-12 h-4 bg-gray-100 dark:bg-white/5 rounded" />
                              </div>
                            ))}
                          </div>
                        ) : searchQuery.trim() === '' ? (
                          <div className="p-5 space-y-6">
                            {/* Search History */}
                            {searchHistory.length > 0 && (
                              <div>
                                <div className="flex items-center justify-between mb-3">
                                  <h3 className="text-xs font-black text-ozo-gray dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <History size={13} className="text-ozo-red animate-pulse" />
                                    Recent Searches
                                  </h3>
                                  <button
                                    type="button"
                                    onClick={clearSearchHistory}
                                    className="text-[10px] font-bold text-ozo-red hover:underline uppercase tracking-wider"
                                  >
                                    Clear All
                                  </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {searchHistory.map((item) => (
                                    <div
                                      key={item}
                                      className="flex items-center gap-1.5 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl px-3 py-1.5 border border-gray-150/10 dark:border-white/5 transition-all duration-200"
                                    >
                                      <button
                                        type="button"
                                        onClick={() => handleHistoryClick(item)}
                                        className="text-xs font-bold text-gray-700 dark:text-gray-300 hover:text-ozo-red transition-colors"
                                      >
                                        {item}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => removeSearchQuery(item)}
                                        aria-label="Remove search history item"
                                        className="p-0.5 hover:bg-gray-205 dark:hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-ozo-red flex items-center justify-center"
                                      >
                                        <X size={10} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Trending Searches */}
                            <div>
                              <h3 className="text-xs font-black text-ozo-gray dark:text-gray-400 uppercase tracking-wider mb-3">
                                🔥 Trending Searches
                              </h3>
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                                {trendingSearches.map((item) => (
                                  <button
                                    key={item.name}
                                    type="button"
                                    onClick={() => handleTrendingClick(item.name)}
                                    className="flex items-center gap-2 md:gap-2.5 px-3 py-2.5 md:px-4 md:py-3 bg-gray-50 dark:bg-white/5 hover:bg-red-50/50 dark:hover:bg-white/10 border border-gray-100 dark:border-white/5 hover:border-ozo-red/20 rounded-xl text-left transition-all duration-300 group"
                                  >
                                    <span className="text-base md:text-lg group-hover:scale-125 transition-transform duration-300">{item.icon}</span>
                                    <span className="text-xs md:text-sm font-bold text-gray-700 dark:text-gray-300 group-hover:text-ozo-red transition-colors duration-300 truncate">{item.name}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : searchResults.length > 0 ? (
                          <div className="p-2">
                            {searchResults.map((product) => (
                              <button
                                key={product.id}
                                type="button"
                                onClick={() => handleSearchSelect(product)}
                                className="flex items-center gap-4 p-3 hover:bg-red-50/50 dark:hover:bg-white/5 rounded-xl transition-all duration-200 w-full text-left group"
                              >
                                <div className="w-14 h-14 rounded-lg overflow-hidden border border-gray-100 dark:border-white/5 flex-shrink-0">
                                  <OptimizedImage
                                    src={product.image_url}
                                    slug={product.slug}
                                    alt={product.name}
                                    width={100}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                    containerClassName="w-full h-full"
                                  />
                                </div>
                                <div className="flex-1">
                                  <p className="font-bold text-gray-800 dark:text-white line-clamp-1">{product.name}</p>
                                  <p className="text-xs text-ozo-gray dark:text-gray-400 font-medium">{product.unit}</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-black text-gray-900 dark:text-white">₹{product.price}</p>
                                  {product.mrp > product.price && (
                                    <p className="text-[10px] text-ozo-gray dark:text-gray-400 line-through decoration-ozo-red/50">₹{product.mrp}</p>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="p-8 text-center">
                            <p className="text-3xl mb-2">🔍</p>
                            <p className="font-bold text-gray-800 dark:text-white">No results found</p>
                            <p className="text-xs text-ozo-gray dark:text-gray-400 mt-1">We couldn't find anything matching "{searchQuery}"</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </form>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-1 md:gap-1.5 lg:gap-3 flex-shrink-0 relative">
              {/* Auth Button/Profile */}
              {isAuthenticated ? (
                <div ref={profileDropdownRef}>
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center gap-2 p-1 md:pr-3 rounded-2xl hover:bg-ozo-gray-bg dark:hover:bg-white/5 transition-all duration-300"
                  >
                    <UserAvatar 
                      profile={profile} 
                      user={user} 
                      className="w-9 h-9 rounded-xl overflow-hidden bg-gradient-green text-white font-bold shadow-sm flex items-center justify-center text-sm uppercase"
                      imgClassName="w-full h-full object-cover"
                    />
                    <span className="hidden lg:block text-sm font-bold text-gray-800 dark:text-gray-200">
                      {profile?.full_name?.split(' ')[0] || 'User'}
                    </span>
                    <ChevronDown 
                      className={`w-3.5 h-3.5 text-ozo-gray dark:text-gray-400 transition-transform duration-300 transform-gpu ${
                        isProfileOpen ? 'rotate-180' : ''
                      }`} 
                      style={{ willChange: 'transform' }}
                    />
                  </button>

                  {/* Profile Dropdown */}
                  <AnimatePresence>
                    {isProfileOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 12, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 12, scale: 0.95 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                        style={{ willChange: 'transform, opacity' }}
                        className="absolute right-0 top-full mt-3 w-80 bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl border border-ozo-gray-lighter dark:border-white/10 overflow-hidden z-50 p-2 transform-gpu"
                      >
                        <div className="flex items-center gap-3.5 p-3.5 bg-gray-50 dark:bg-white/5 rounded-xl mb-2 border border-gray-100/50 dark:border-white/5">
                          <UserAvatar 
                            profile={profile} 
                            user={user} 
                            className="w-10 h-10 rounded-xl overflow-hidden bg-gradient-green text-white font-bold shadow-sm flex items-center justify-center text-sm uppercase flex-shrink-0"
                            imgClassName="w-full h-full object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="font-black text-gray-900 dark:text-white leading-tight truncate">{profile?.full_name}</p>
                            <p className="text-xs text-ozo-gray dark:text-gray-400 font-medium truncate mt-0.5">{user?.email}</p>
                          </div>
                        </div>
                        <div className="space-y-1">
                          {[
                            ...(hasAdminPermission ? [{ to: '/admin', icon: Shield, label: isSuperAdmin ? 'Admin Panel' : 'City Manager Portal' }] : []),
                            { to: '/profile', icon: User, label: 'My Profile' },
                            { to: '/orders', icon: Package, label: 'My Orders' },
                            { to: '/referral', icon: Gift, label: 'Refer & Earn' },
                            ...(isCaptain ? [{ to: '/captain', icon: Bike, label: 'Rider Portal' }] : []),
                            ...(isMartOperator ? [{ to: '/mart', icon: Store, label: 'Mart Portal' }] : []),
                            { to: '/wishlist', icon: Heart, label: 'Wishlist' },
                            { to: '/notifications', icon: Bell, label: 'Notifications' },
                            { to: '/settings', icon: Settings, label: 'Settings' },
                          ].map((item) => (
                            <Link
                              key={item.to}
                              to={item.to}
                              className="flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 hover:text-ozo-red dark:hover:text-ozo-red-light rounded-xl transition-all duration-200 font-semibold text-sm"
                            >
                              <item.icon size={18} />
                              <span>{item.label}</span>
                            </Link>
                          ))}
                          <div className="h-px bg-gray-100 dark:bg-white/10 my-2 mx-2" />
                          <button
                            onClick={() => {
                              setIsProfileOpen(false)
                              setShowLogoutConfirm(true)
                            }}
                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 dark:hover:bg-white/5 text-ozo-red rounded-xl transition-all duration-200 w-full text-left font-bold text-sm"
                          >
                            <LogOut size={18} />
                            <span>Logout</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <Link
                  to="/auth"
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-ozo text-white rounded-xl hover:shadow-ozo-lg transition-all duration-300 font-bold text-sm"
                >
                  <User size={18} />
                  <span className="hidden md:block">Login</span>
                </Link>
              )}

              {/* Theme Toggle */}
              <div className="relative group">
                <button
                  onClick={toggleTheme}
                  className="p-1.5 md:p-2 lg:p-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-ozo-gray dark:text-gray-400 hover:text-ozo-red dark:hover:text-ozo-red transition-all duration-300 shadow-sm hover:shadow-md active:scale-95 flex items-center justify-center"
                  aria-label="Toggle Theme"
                >
                  <AnimatePresence mode="wait">
                    {theme === 'light' ? (
                      <motion.div
                        key="moon"
                        initial={{ opacity: 0, rotate: -90, scale: 0.8 }}
                        animate={{ opacity: 1, rotate: 0, scale: 1 }}
                        exit={{ opacity: 0, rotate: 90, scale: 0.8 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Moon size={20} strokeWidth={2.5} />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="sun"
                        initial={{ opacity: 0, rotate: 90, scale: 0.8 }}
                        animate={{ opacity: 1, rotate: 0, scale: 1 }}
                        exit={{ opacity: 0, rotate: -90, scale: 0.8 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Sun size={20} strokeWidth={2.5} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              </div>

              <div className="h-8 w-px bg-gray-200 dark:bg-white/10 mx-1 hidden md:block" />

              {/* Wishlist */}
              <Link
                to="/wishlist"
                aria-label="Wishlist"
                className="relative p-1.5 md:p-2 lg:p-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-ozo-red/10 text-ozo-gray dark:text-gray-400 hover:text-ozo-red dark:hover:text-ozo-red-light transition-all duration-300 group"
              >
                <Heart size={24} strokeWidth={2} className="group-hover:scale-110 transition-transform" />
                {wishlistItems.length > 0 && (
                  <span className="absolute top-1 right-1 w-5 h-5 bg-ozo-red text-white text-[10px] rounded-full flex items-center justify-center font-black shadow-ozo border-2 border-white dark:border-[#1C1C1C]">
                    {wishlistItems.length}
                  </span>
                )}
              </Link>

              {/* Notifications */}
              {isAuthenticated && (
                <Link
                  to="/notifications"
                  aria-label="Notifications"
                  className="relative p-1.5 md:p-2 lg:p-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-ozo-red/10 text-ozo-gray dark:text-gray-400 hover:text-ozo-red dark:hover:text-ozo-red-light transition-all duration-300 group"
                >
                  <Bell size={24} strokeWidth={2} className="group-hover:scale-110 transition-transform" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-5 h-5 bg-ozo-red text-white text-[10px] rounded-full flex items-center justify-center font-black shadow-ozo border-2 border-white dark:border-[#1C1C1C]">
                      {unreadCount}
                    </span>
                  )}
                </Link>
              )}

              {/* Cart */}
              <Link
                to="/cart"
                aria-label="Cart"
                className="relative p-1.5 md:p-2 lg:p-2.5 rounded-xl hover:bg-green-50 dark:hover:bg-ozo-green/10 text-ozo-gray dark:text-gray-400 hover:text-ozo-green dark:hover:text-ozo-green transition-all duration-300 group"
              >
                <ShoppingCart size={24} className="group-hover:scale-110 transition-transform" />
                {totalItems > 0 && (
                  <span className="absolute top-1 right-1 w-5 h-5 bg-ozo-green text-white text-[10px] rounded-full flex items-center justify-center font-black shadow-lg border-2 border-white">
                    {totalItems}
                  </span>
                )}
              </Link>
            </div>

            {/* Mobile Actions */}
            <div className="flex items-center md:hidden gap-1 flex-shrink-0">
              {isAuthenticated && (
                <Link
                  to="/notifications"
                  aria-label="Notifications"
                  className="relative p-1.5 rounded-xl hover:bg-red-50 dark:hover:bg-ozo-red/10 text-ozo-gray dark:text-gray-400 hover:text-ozo-red transition-all"
                >
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-ozo-red text-white text-[9px] rounded-full flex items-center justify-center font-black border-2 border-white dark:border-[#0d0d0d]">
                      {unreadCount}
                    </span>
                  )}
                </Link>
              )}

              <Link
                to="/cart"
                aria-label="Cart"
                className="relative p-1.5 rounded-xl hover:bg-green-50 dark:hover:bg-ozo-green/10 text-ozo-gray dark:text-gray-400 hover:text-ozo-green dark:hover:text-ozo-green transition-all"
              >
                <ShoppingCart size={20} />
                {totalItems > 0 && (
                  <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-ozo-green text-white text-[9px] rounded-full flex items-center justify-center font-black border-2 border-white dark:border-[#0d0d0d]">
                    {totalItems}
                  </span>
                )}
              </Link>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label={isMenuOpen ? "Close menu" : "Open menu"}
                className="p-1.5 rounded-xl bg-gray-50 dark:bg-white/5 ml-0.5 border border-transparent active:scale-95 transition-all"
              >
                {isMenuOpen ? <X size={22} className="text-ozo-red" /> : <Menu size={22} className="text-ozo-gray dark:text-gray-400" />}
              </button>
            </div>
          </div>

          {/* Location Selector (Mobile / Tablet - Second Row) */}
          <div className="mt-2.5 lg:hidden">
            <button 
              onClick={() => {
                navigate('/select-location')
              }}
              aria-label="Select Delivery Location"
              className={`w-full md:max-w-[280px] flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl transition-all duration-300 border shadow-sm hover:shadow-md group ${
                isLocationServiceable
                  ? 'bg-gray-50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 border-gray-100 dark:border-white/5 hover:border-ozo-red/20 dark:hover:border-ozo-red/20'
                  : 'bg-red-50/50 dark:bg-red-950/20 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-900/40 hover:border-red-300 dark:hover:border-red-800'
              }`}
            >
              <div className={`w-7 h-7 rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 transition-all flex-shrink-0 ${
                isLocationServiceable
                  ? 'bg-red-50 dark:bg-ozo-red/10 text-ozo-red'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
              }`}>
                <MapPin className="w-3.5 h-3.5" />
              </div>
              <div className="text-left min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-[8px] uppercase tracking-widest text-ozo-gray dark:text-gray-400 font-black leading-none mb-0.5">Deliver to</p>
                  {!isLocationServiceable && (
                    <span className="text-[7px] font-black text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-1 py-0.5 rounded leading-none uppercase tracking-wider">
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
        </div>
      </header>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] md:hidden"
            />
            
            {/* Menu Content */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-[85%] max-w-[320px] bg-white dark:bg-[#0d0d0d] z-[101] shadow-2xl flex flex-col md:hidden border-l border-gray-100 dark:border-white/5"
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                 <OzoLogo
                    size="w-9 h-9"
                    subText="Jo Chahiye, Jab Chahiye"
                    subTextClassName="text-[8px] mt-0.5"
                  />
                 <button onClick={() => setIsMenuOpen(false)} aria-label="Close menu" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5">
                    <X size={20} className="text-ozo-gray" />
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
                {/* User Section */}
                <div className="bg-gray-50 dark:bg-white/5 p-5 rounded-[2rem] border border-gray-100 dark:border-white/5">
                  {isAuthenticated ? (
                    <div className="flex items-center gap-4">
                      <UserAvatar 
                        profile={profile} 
                        user={user} 
                        className="w-14 h-14 bg-gradient-green rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-lg overflow-hidden uppercase"
                        imgClassName="w-full h-full object-cover"
                      />
                      <div className="flex-1 min-w-0">
                         <p className="font-black text-gray-900 dark:text-white truncate">{profile?.full_name}</p>
                         <p className="text-xs text-ozo-gray font-medium truncate">{user?.email}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center space-y-4 py-2">
                      <p className="text-sm text-ozo-gray dark:text-gray-400 font-bold">Experience the 30-minute magic!</p>
                      <Link 
                        to="/auth" 
                        className="btn btn-primary w-full py-3 rounded-xl flex items-center justify-center gap-2"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <User size={18} /> Login / Register
                      </Link>
                    </div>
                  )}
                </div>

                {/* Search (Mobile) */}
                <div className="relative">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ozo-gray" />
                   <input 
                      type="text" 
                      placeholder="Search products..."
                      className="w-full pl-11 pr-4 py-4 bg-gray-50 dark:bg-white/5 border border-transparent rounded-2xl focus:outline-none focus:border-ozo-red/20 transition-all text-sm font-bold"
                      onClick={() => { setIsMenuOpen(false); navigate('/search'); }}
                      readOnly
                   />
                </div>

                {/* Main Links */}
                <div className="space-y-1">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-ozo-gray dark:text-gray-500 mb-4 px-2">Navigation</h4>
                  {[
                    ...(hasAdminPermission ? [{ to: '/admin', icon: Shield, label: isSuperAdmin ? 'Admin Panel' : 'City Manager Portal' }] : []),
                    { to: '/', icon: HomeIcon, label: 'Home' },
                    ...(isAuthenticated ? [
                      { to: '/orders', icon: Package, label: 'My Orders' },
                      { to: '/referral', icon: Gift, label: 'Refer & Earn' }
                    ] : []),
                    { to: '/categories', icon: LayoutGrid, label: 'Categories' },
                    { to: '/offers', icon: Tag, label: 'Offers' },
                    { to: '/wishlist', icon: Heart, label: 'Wishlist', badge: wishlistItems.length },
                    ...(isAuthenticated ? [
                      { to: '/notifications', icon: Bell, label: 'Notifications', badge: unreadCount },
                      ...(isCaptain ? [{ to: '/captain', icon: Bike, label: 'Rider Portal' }] : []),
                      ...(isMartOperator ? [{ to: '/mart', icon: Store, label: 'Mart Portal' }] : []),
                    ] : []),
                  ].map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setIsMenuOpen(false)}
                      className={`flex items-center justify-between p-4 rounded-2xl transition-all ${location.pathname === item.to ? 'bg-red-50 dark:bg-ozo-red/10 text-ozo-red' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'}`}
                    >
                      <div className="flex items-center gap-3 font-bold">
                         <item.icon size={20} />
                         <span>{item.label}</span>
                      </div>
                      {item.badge > 0 && (
                        <span className="bg-ozo-red text-white text-[10px] px-2 py-0.5 rounded-full font-black">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>

                {/* Settings & Theme */}
                <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-white/5">
                  <button 
                    onClick={toggleTheme}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-2xl transition-all"
                  >
                     <div className="flex items-center gap-3 font-bold text-gray-700 dark:text-gray-300">
                        {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                        <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
                     </div>
                     <div className={`w-10 h-5 rounded-full p-1 transition-all ${theme === 'dark' ? 'bg-ozo-red' : 'bg-gray-300'}`}>
                        <div className={`w-3 h-3 bg-white rounded-full transition-all ${theme === 'dark' ? 'translate-x-5' : 'translate-x-0'}`} />
                     </div>
                  </button>
                  
                  <Link
                    to="/settings"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 p-4 font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 rounded-2xl transition-all"
                  >
                     <Settings size={20} />
                     <span>Settings</span>
                  </Link>
                  
                  <Link
                    to="/help"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 p-4 font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 rounded-2xl transition-all"
                  >
                     <Bell size={20} />
                     <span>Help & Support</span>
                  </Link>
                </div>

                {isAuthenticated && (
                  <button 
                    onClick={() => {
                      setIsMenuOpen(false)
                      setShowLogoutConfirm(true)
                    }}
                    className="w-full flex items-center gap-3 p-4 text-ozo-red font-black hover:bg-red-50 dark:hover:bg-ozo-red/10 rounded-2xl transition-all"
                  >
                     <LogOut size={20} />
                     Logout
                  </button>
                )}
              </div>

              <div className="p-6 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-[#0a0a0a]">
                 <p className="text-[10px] text-center font-black uppercase tracking-widest text-ozo-gray notranslate" translate="no">OZO v1.0</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <LocationPicker 
        isOpen={isLocationPickerOpen} 
        onClose={() => setIsLocationPickerOpen(false)} 
      />

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogoutConfirm(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000]"
            />
            
            {/* Modal Container */}
            <div className="fixed inset-0 flex items-center justify-center p-4 z-[1001] pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: "spring", duration: 0.4 }}
                className="w-full max-w-sm bg-white dark:bg-[#121214] rounded-3xl p-6 shadow-2xl border border-gray-100 dark:border-white/5 pointer-events-auto"
              >
                {/* Warning Icon Container */}
                <div className="mx-auto w-14 h-14 bg-red-50 dark:bg-red-950/20 text-ozo-red rounded-full flex items-center justify-center mb-4 shadow-inner">
                  <LogOut size={24} className="stroke-[2.5]" />
                </div>
                
                {/* Title & Desc */}
                <h3 className="text-lg font-black text-gray-900 dark:text-white text-center tracking-tight mb-2">
                  Confirm Logout
                </h3>
                <p className="text-sm text-ozo-gray dark:text-gray-400 text-center font-semibold mb-6 leading-relaxed">
                  Are you sure you want to log out of your OZO account? You will need to log in again to manage orders.
                </p>
                
                {/* Action Buttons */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowLogoutConfirm(false)}
                    className="flex-1 py-3 px-4 bg-gray-50 hover:bg-gray-100 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200 text-sm font-black rounded-2xl transition-all border border-gray-150/10 dark:border-white/5 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      setShowLogoutConfirm(false)
                      await handleLogout()
                    }}
                    className="flex-1 py-3 px-4 bg-gradient-ozo hover:opacity-95 text-white text-sm font-black rounded-2xl transition-all shadow-[0_4px_12px_rgba(227,30,36,0.25)] hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Yes, Logout
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

export default Header