import React, { useState, useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Search, MapPin, X, Loader2, Compass } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const streetStyle = {
  version: 8,
  sources: {
    'raster-tiles': {
      type: 'raster',
      tiles: ['https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap contributors'
    }
  },
  layers: [
    {
      id: 'simple-tiles',
      type: 'raster',
      source: 'raster-tiles',
      minzoom: 0,
      maxzoom: 19
    }
  ]
}

const AdminMapPickerModal = ({ isOpen, onClose, initialLat, initialLng, onSelect }) => {
  // Default center: Aurangabad, Bihar coordinates (fallback)
  const defaultLat = 24.745736
  const defaultLng = 84.390014

  const [position, setPosition] = useState([defaultLat, defaultLng])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [currentAddress, setCurrentAddress] = useState('')
  const [isLoadingAddress, setIsLoadingAddress] = useState(false)

  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)

  // Initialize position when modal opens
  useEffect(() => {
    if (isOpen) {
      const lat = parseFloat(initialLat)
      const lng = parseFloat(initialLng)
      if (!isNaN(lat) && !isNaN(lng)) {
        setPosition([lat, lng])
      } else {
        setPosition([defaultLat, defaultLng])
      }
      setSearchQuery('')
      setSearchResults([])
      setCurrentAddress('')
    }
  }, [isOpen, initialLat, initialLng])

  // Initialize MapLibre Map
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return

    // Clean up if exists
    if (mapRef.current) {
      mapRef.current.remove()
      mapRef.current = null
      markerRef.current = null
    }

    const [lat, lng] = position
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: streetStyle,
      center: [lng, lat],
      zoom: 15,
      attributionControl: false
    })

    mapRef.current = map

    map.on('click', (e) => {
      const { lat, lng } = e.lngLat
      setPosition([lat, lng])
    })

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        markerRef.current = null
      }
    }
  }, [isOpen])

  // Sync marker and center when position changes
  useEffect(() => {
    if (!mapRef.current) return
    const map = mapRef.current
    const [lat, lng] = position

    // Move center
    const center = map.getCenter()
    if (Math.abs(center.lat - lat) > 0.0001 || Math.abs(center.lng - lng) > 0.0001) {
      map.panTo([lng, lat])
    }

    // Set marker
    if (markerRef.current) {
      markerRef.current.setLngLat([lng, lat])
    } else {
      const el = document.createElement('div')
      el.className = 'custom-admin-pin'
      el.innerHTML = `
        <div class="relative flex flex-col items-center">
          <div class="absolute w-6 h-6 bg-blue-500/20 rounded-full animate-ping -bottom-3"></div>
          <div class="absolute w-2 h-1 bg-black/40 rounded-full blur-[1px] -bottom-0.5"></div>
          <div class="relative w-8 h-8 flex items-center justify-center">
            <div class="absolute w-8 h-8 bg-gradient-to-tr from-blue-600 to-indigo-400 rounded-full rounded-tr-none border-2 border-white dark:border-[#1a1a1a] shadow-lg transform rotate-[135deg]"></div>
            <div class="relative z-10 w-2.5 h-2.5 bg-white rounded-full shadow-inner"></div>
          </div>
        </div>
      `
      markerRef.current = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([lng, lat])
        .addTo(map)
    }
  }, [position, isOpen])

  // Fetch address representation of selected coordinates (reverse geocoding)
  useEffect(() => {
    if (!isOpen || !position) return

    let isMounted = true
    const fetchAddress = async () => {
      setIsLoadingAddress(true)
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position[0]}&lon=${position[1]}&zoom=18&addressdetails=1`
        )
        if (res.ok) {
          const data = await res.json()
          if (isMounted) {
            setCurrentAddress(data.display_name || `${position[0].toFixed(6)}, ${position[1].toFixed(6)}`)
          }
        }
      } catch (err) {
        console.error('Error reverse geocoding:', err)
        if (isMounted) {
          setCurrentAddress(`${position[0].toFixed(6)}, ${position[1].toFixed(6)}`)
        }
      } finally {
        if (isMounted) {
          setIsLoadingAddress(false)
        }
      }
    }

    const timer = setTimeout(fetchAddress, 400) // Debounce API requests on drag/click
    return () => {
      isMounted = false
      clearTimeout(timer)
    }
  }, [position, isOpen])

  // Search address handler using OpenStreetMap Nominatim
  const handleSearchSubmit = async (e) => {
    if (e) e.preventDefault()
    if (!searchQuery.trim()) return

    setIsSearching(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&countrycodes=in`
      )
      if (res.ok) {
        const data = await res.json()
        setSearchResults(data || [])
      }
    } catch (err) {
      console.error('Search error:', err)
    } finally {
      setIsSearching(false)
    }
  }

  // Select location from search results list
  const handleSelectSearchResult = (result) => {
    const lat = parseFloat(result.lat)
    const lon = parseFloat(result.lon)
    if (!isNaN(lat) && !isNaN(lon)) {
      setPosition([lat, lon])
      setSearchResults([])
      setSearchQuery(result.display_name)
    }
  }

  // Try locating admin via device GPS
  const handleLocateMe = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition([pos.coords.latitude, pos.coords.longitude])
      },
      (err) => {
        console.warn('Geolocation error:', err)
      }
    )
  }

  const handleConfirm = () => {
    if (position && onSelect) {
      onSelect({
        lat: position[0],
        lng: position[1],
        address: currentAddress
      })
    }
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="relative bg-white dark:bg-slate-900 w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[85vh] border border-gray-100 dark:border-slate-800"
          >
            {/* Header */}
            <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-gray-800 dark:text-white uppercase tracking-wider">Select Mart Coordinates</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Search or click anywhere on the map to set the store location.</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 relative flex flex-col min-h-0">
              {/* Floating Search Bar */}
              <div className="absolute top-4 left-4 right-4 z-[1000] max-w-md">
                <form onSubmit={handleSearchSubmit} className="relative flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Search city, street or landmark..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-white/95 dark:bg-slate-900/95 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs sm:text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-lg backdrop-blur-sm transition-all"
                    />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    {isSearching && (
                      <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 animate-spin" />
                    )}
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-2xl transition-all shadow-md active:scale-95"
                  >
                    Find
                  </button>
                </form>

                {/* Search Results Dropdown */}
                {searchResults.length > 0 && (
                  <div className="mt-2 bg-white/95 dark:bg-slate-900/95 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-2xl backdrop-blur-sm max-h-60 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-800">
                    {searchResults.map((result, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectSearchResult(result)}
                        className="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-800/50 flex items-start gap-2.5 transition-colors text-xs"
                      >
                        <MapPin className="w-4 h-4 mt-0.5 text-blue-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-800 dark:text-white line-clamp-1">
                            {result.name || 'Location'}
                          </p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-2">
                            {result.display_name}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Map Container */}
              <div className="w-full h-full z-10 relative">
                <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
              </div>

              {/* GPS Target Floating Button */}
              <button
                type="button"
                onClick={handleLocateMe}
                className="absolute bottom-4 right-4 z-[1000] p-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors text-gray-600 dark:text-gray-300"
                title="Locate Me"
              >
                <Compass className="w-5 h-5 animate-pulse" />
              </button>
            </div>

            {/* Footer / Selected Info */}
            <div className="p-5 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase font-black tracking-widest text-gray-400">Current Coordinates</p>
                <div className="flex items-center gap-2 mt-0.5 text-xs font-bold text-gray-700 dark:text-gray-300">
                  <span className="bg-gray-200 dark:bg-slate-800 px-2 py-0.5 rounded-lg">Lat: {position[0].toFixed(6)}</span>
                  <span className="bg-gray-200 dark:bg-slate-800 px-2 py-0.5 rounded-lg">Lng: {position[1].toFixed(6)}</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1.5">
                  {isLoadingAddress ? 'Resolving address...' : currentAddress || 'Click map to view address'}
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-500/10 active:scale-95"
                >
                  Confirm Location
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default AdminMapPickerModal
