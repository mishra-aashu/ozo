import React, { useState, useEffect, useRef, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, CircleMarker, Tooltip, Polygon, Circle, useMap, useMapEvents, GeoJSON } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Search, Navigation, MapPin, Loader2, Layers } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { checkDeliveryZoneStatus, useLocationStore } from '../stores/locationStore'
import { reverseGeocode, findNearestStreet } from '../lib/geocoding'
import toast from 'react-hot-toast'
import { useCartStore } from '../stores/cartStore'
import { GEOFENCE_DEFAULTS } from '../config/deliveryDefaults'

// Custom Pulse Marker Icon (OZO Red Theme Style)
const ozoMarker = L.divIcon({
  html: `
    <div class="relative flex flex-col items-center">
      <!-- Glowing active pulse at the anchor point -->
      <div class="absolute w-6 h-6 bg-[#E23744]/25 rounded-full animate-ping -bottom-3"></div>
      
      <!-- Inner target shadow -->
      <div class="absolute w-2 h-1 bg-black/40 rounded-full blur-[1px] -bottom-0.5"></div>
      
      <!-- Sleek Teardrop Pin -->
      <div class="relative w-8 h-8 flex items-center justify-center">
        <!-- Rotated square to form the pin bottom point -->
        <div class="absolute w-8 h-8 bg-gradient-to-tr from-[#E23744] to-[#FF6B6B] rounded-full rounded-tr-none border-2 border-white dark:border-[#1a1a1a] shadow-lg transform rotate-[135deg]"></div>
        
        <!-- Premium white center core -->
        <div class="relative z-10 w-2.5 h-2.5 bg-white rounded-full shadow-inner"></div>
      </div>
    </div>
  `,
  className: 'custom-ozo-pin',
  iconSize: [32, 36],
  iconAnchor: [16, 36],
})

// Custom Serviceable Street Marker (Clean vector SVG dot)
const serviceableStreetMarker = L.divIcon({
  html: `
    <div class="flex items-center justify-center h-full w-full">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" class="drop-shadow-sm">
        <circle cx="6" cy="6" r="4.5" fill="#10B981" stroke="#FFFFFF" stroke-width="1.5"/>
        <circle cx="6" cy="6" r="5.25" stroke="#10B981" stroke-width="0.75" stroke-opacity="0.3"/>
      </svg>
    </div>
  `,
  className: 'custom-serviceable-pin',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
})

const isLatLngInDeliveryZone = (lat, lng, config) => {
  if (!lat || !lng) return false
  const l = parseFloat(lat)
  const g = parseFloat(lng)
  if (isNaN(l) || isNaN(g)) return false
  
  const centerLat = parseFloat(config?.warehouse_lat) || 24.745736
  const centerLng = parseFloat(config?.warehouse_lng) || 84.390014
  const maxRadius = parseFloat(config?.max_radius_km) || 2.5
  
  const R = 6371
  const dLat = (l - centerLat) * Math.PI / 180
  const dLon = (g - centerLng) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(centerLat * Math.PI / 180) * Math.cos(l * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c <= maxRadius
}

// Simple Levenshtein distance algorithm for fuzzy searching
const getLevenshteinDistance = (a, b) => {
  const tmp = []
  let i, j
  for (i = 0; i <= a.length; i++) {
    tmp[i] = [i]
  }
  for (j = 0; j <= b.length; j++) {
    tmp[0][j] = j
  }
  for (i = 1; i <= a.length; i++) {
    for (j = 1; j <= b.length; j++) {
      tmp[i][j] = Math.min(
        tmp[i - 1][j] + 1,
        tmp[i][j - 1] + 1,
        tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      )
    }
  }
  return tmp[a.length][b.length]
}


// Sub-component: ONLY re-centers map when position changes AFTER mount
// Uses a ref to skip the very first mount (so we don't fight the initial center)
const MapController = ({ position, setPosition, onLocationSelect, serviceableStreets, setZoomLevel, setMapBounds, geofenceConfig }) => {
  const map = useMap()
  const isMounted = useRef(false)

  // Initialize bounds on mount / center change
  useEffect(() => {
    setMapBounds(map.getBounds())
  }, [map, setMapBounds])

  useEffect(() => {
    // Call invalidateSize at multiple intervals to cover page transitions & modal animations
    map.invalidateSize()
    const t1 = setTimeout(() => map.invalidateSize(), 100)
    const t2 = setTimeout(() => map.invalidateSize(), 350)
    const t3 = setTimeout(() => map.invalidateSize(), 700)
    const t4 = setTimeout(() => map.invalidateSize(), 1200)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4) }
  }, [map])

  useEffect(() => {
    if (!isMounted.current) {
      // Skip first render — map is already centered at the correct GPS point
      isMounted.current = true
      // Also invalidate size here
      map.invalidateSize()
      return
    }
    if (position) {
      map.flyTo(position, 16, { animate: true, duration: 1.2 })
    }
  }, [position, map])

  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng
      if (!isLatLngInDeliveryZone(lat, lng, geofenceConfig)) {
        toast.error("Pinned location is outside Ozo's delivery zone.", { id: 'outside-zone-toast' })
        return
      }
      setPosition([lat, lng])
      triggerSelect(lat, lng)
    },
    zoomend() {
      setZoomLevel(map.getZoom())
      setMapBounds(map.getBounds())
    },
    moveend() {
      setMapBounds(map.getBounds())
    }
  })

  const triggerSelect = async (lat, lng) => {
    if (onLocationSelect) {
      const result = await reverseGeocode(lat, lng, serviceableStreets)
      onLocationSelect({
        lat,
        lng,
        displayName: result.displayName,
        addressDetails: result.addressDetails,
        nearestStreet: result.nearestStreet
      })
    }
  }

  return null
}

const LOCATIONIQ_KEY = import.meta.env.VITE_LOCATIONIQ_KEY || '';

const getTileUrls = () => {
  const urls = [];
  // LocationIQ streets tile — has full labels, no {s} subdomain needed
  if (LOCATIONIQ_KEY && LOCATIONIQ_KEY !== 'YOUR_FREE_KEY_HERE' && !LOCATIONIQ_KEY.includes('YOUR_')) {
    urls.push(`https://tiles.locationiq.com/v3/streets/r/{z}/{x}/{y}.png?key=${LOCATIONIQ_KEY}`);
  }
  // OSM standard — always has labels
  urls.push('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
  // Carto Voyager — labels version (no {r} retina, plain URL)
  urls.push('https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png');
  return urls;
};

const TILE_URLS = getTileUrls();

// Street overlay component using optimized GeoJSON with lazy load
const StreetOverlay = ({ mapBounds }) => {
  const [geoJsonData, setGeoJsonData] = useState(null)

  useEffect(() => {
    let isMounted = true
    import('../data/aurangabad_streets.json').then((module) => {
      if (isMounted) {
        setGeoJsonData(module.default || module)
      }
    })
    return () => {
      isMounted = false
    }
  }, [])

  const streetStyle = (feature) => {
    const type = feature.properties.highway
    return {
      color: type === 'primary' || type === 'secondary' ? '#E23744' : '#3B82F6',
      weight: type === 'primary' ? 4.5 : type === 'secondary' ? 3.5 : 2,
      opacity: 0.65
    }
  }

  const onEachStreet = (feature, layer) => {
    const nameEn = feature.properties.name || ''
    const nameHi = feature.properties['name:hi'] || ''
    if (!nameEn && !nameHi) return

    const displayLabel = nameHi && nameEn 
      ? `${nameHi} (${nameEn})` 
      : nameHi || nameEn

    layer.bindTooltip(displayLabel, {
      sticky: true,
      className: 'street-map-label'
    })
  }

  // Filter features to only those inside map bounds to optimize mobile rendering performance
  const filteredGeoJson = useMemo(() => {
    if (!geoJsonData) return null
    if (!mapBounds) return geoJsonData
    
    const features = geoJsonData.features.filter((feature) => {
      const geomType = feature.geometry?.type
      if (geomType === 'LineString') {
        const coords = feature.geometry.coordinates
        if (!Array.isArray(coords)) return false
        return coords.some(([lng, lat]) => mapBounds.contains([lat, lng]))
      } else if (geomType === 'MultiLineString') {
        const coords = feature.geometry.coordinates
        if (!Array.isArray(coords)) return false
        return coords.some((line) => 
          Array.isArray(line) && line.some(([lng, lat]) => mapBounds.contains([lat, lng]))
        )
      }
      return false
    })
    
    return {
      ...geoJsonData,
      features
    }
  }, [geoJsonData, mapBounds])

  if (!filteredGeoJson || filteredGeoJson.features.length === 0) return null

  return (
    <GeoJSON 
      key={`streets-${filteredGeoJson.features.length}`}
      data={filteredGeoJson} 
      style={streetStyle} 
      onEachFeature={onEachStreet} 
    />
  )
}

const OzoMapPicker = ({ onLocationSelect, initialPosition, className = "h-96" }) => {
  const nearestCity = useLocationStore((state) => state.nearestCity)
  const rawGeofenceConfig = useCartStore((state) => state.geofenceConfig) || GEOFENCE_DEFAULTS
  const deliveryConfig = useCartStore((state) => state.deliveryConfig) || {}

  const geofenceConfig = {
    ...rawGeofenceConfig,
    warehouse_lat: nearestCity ? parseFloat(nearestCity.latitude) : (parseFloat(deliveryConfig.store_lat) || parseFloat(rawGeofenceConfig.warehouse_lat) || GEOFENCE_DEFAULTS.warehouse_lat),
    warehouse_lng: nearestCity ? parseFloat(nearestCity.longitude) : (parseFloat(deliveryConfig.store_lng) || parseFloat(rawGeofenceConfig.warehouse_lng) || GEOFENCE_DEFAULTS.warehouse_lng),
    max_radius_km: nearestCity ? (parseFloat(nearestCity.service_radius_km) || GEOFENCE_DEFAULTS.max_radius_km) : (parseFloat(rawGeofenceConfig.max_radius_km) || GEOFENCE_DEFAULTS.max_radius_km)
  }
  const centerLat = parseFloat(geofenceConfig.warehouse_lat) || GEOFENCE_DEFAULTS.warehouse_lat
  const centerLng = parseFloat(geofenceConfig.warehouse_lng) || GEOFENCE_DEFAULTS.warehouse_lng
  const maxRadius = parseFloat(geofenceConfig.max_radius_km) || GEOFENCE_DEFAULTS.max_radius_km

  const mapMaxBounds = React.useMemo(() => {
    const latDelta = (maxRadius * 2.0) / 111
    const lngDelta = (maxRadius * 2.0) / (111 * Math.cos(centerLat * Math.PI / 180))
    return [
      [centerLat - latDelta, centerLng - lngDelta],
      [centerLat + latDelta, centerLng + lngDelta]
    ]
  }, [centerLat, centerLng, maxRadius])

  const fetchSettings = useCartStore(state => state.fetchSettings)
  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  // position is null until GPS resolves — prevents rendering map at wrong default
  const [position, setPosition] = useState(() => {
    if (initialPosition && isLatLngInDeliveryZone(initialPosition[0], initialPosition[1], geofenceConfig)) {
      return initialPosition
    }
    return null
  })
  const [tileUrlIdx, setTileUrlIdx] = useState(0)
  const [isLocating, setIsLocating] = useState(false)
  const [locationError, setLocationError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [serviceableStreets, setServiceableStreets] = useState([])
  const [zoomLevel, setZoomLevel] = useState(16)
  const [mapBounds, setMapBounds] = useState(null)
  const [isSatellite, setIsSatellite] = useState(false)
  const hasAutoDetected = useRef(false)
  const isDeliverable = position ? checkDeliveryZoneStatus(position[0], position[1], useCartStore.getState()) : false


  // Fetch verified serviceable streets on mount
  useEffect(() => {
    let isMounted = true
    const controller = new AbortController()

    const loadServiceableStreets = async () => {
      try {
        let query = supabase
          .from('serviceable_streets')
          .select('*')
          .eq('is_active', true)
        
        query = query.abortSignal(controller.signal)
        const { data, error } = await query
        if (error) throw error
        if (isMounted) {
          setServiceableStreets(data || [])
        }
      } catch (err) {
        if (err.name === 'AbortError' || controller.signal.aborted) {
          return
        }
        console.error('Error fetching serviceable streets:', err)
      }
    }
    loadServiceableStreets()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [])

  // Handle clicking on a serviceable street marker to select it
  const handleSelectServiceableStreet = async (st) => {
    const lat = parseFloat(st.latitude)
    const lng = parseFloat(st.longitude)
    if (isNaN(lat) || isNaN(lng)) return
    
    setPosition([lat, lng])
    setSearchQuery(st.name_hi ? `${st.name} (${st.name_hi})` : st.name)
    
    if (onLocationSelect) {
      const fallbackCity = nearestCity?.name || 'Aurangabad'
      const fallbackState = nearestCity?.state || 'Bihar'
      const fallbackPostcode = nearestCity?.allowed_pincodes?.[0] || ''

      const displayName = st.name_hi
        ? `${st.name} (${st.name_hi}), ${fallbackCity}, ${fallbackState}`
        : `${st.name}, ${fallbackCity}, ${fallbackState}`
      
      const addressDetails = {
        road: st.name,
        suburb: st.type,
        city: fallbackCity,
        state: fallbackState,
        postcode: fallbackPostcode
      }
      
      onLocationSelect({
        lat,
        lng,
        displayName,
        addressDetails,
        nearestStreet: st
      })
    }
  }

  const doGPS = (force = false) => {
    if (force) {
      localStorage.removeItem('ozo_location_permission_denied')
    }
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser')
      setPosition([centerLat, centerLng])
      return
    }
    setIsLocating(true)
    setLocationError(null)

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        setIsLocating(false)
        localStorage.removeItem('ozo_location_permission_denied')

        let targetLat = latitude
        let targetLng = longitude

        if (!isLatLngInDeliveryZone(latitude, longitude, geofenceConfig)) {
          toast.error("Your pinned location is outside Ozo's delivery zone. Showing store center.", { id: 'outside-zone-toast' })
          targetLat = centerLat
          targetLng = centerLng
        }

        // Set position FIRST so map renders at correct location
        setPosition([targetLat, targetLng])

        // Then fire reverse geocoding for address label via utility
        if (onLocationSelect) {
          const result = await reverseGeocode(targetLat, targetLng, serviceableStreets)
          onLocationSelect({
            lat: targetLat,
            lng: targetLng,
            displayName: result.displayName,
            addressDetails: result.addressDetails,
            nearestStreet: result.nearestStreet
          })
        }
      },
      (err) => {
        console.error('GPS locate error:', err.code, err.message)
        setIsLocating(false)
        if (err.code === err.PERMISSION_DENIED) {
          localStorage.setItem('ozo_location_permission_denied', 'true')
          setLocationError('Location permission denied. Please allow location access.')
        } else {
          setLocationError('Could not detect GPS. Try searching manually.')
        }
        if (!position) setPosition([centerLat, centerLng])
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }


  // Auto-detect on mount — only if no initialPosition provided
  useEffect(() => {
    if (hasAutoDetected.current) return
    hasAutoDetected.current = true

    if (!initialPosition) {
      const isDenied = localStorage.getItem('ozo_location_permission_denied') === 'true'
      if (!isDenied) {
        doGPS(false)
      } else {
        // Fallback to center if permission previously denied to avoid prompt loop
        setPosition([centerLat, centerLng])
      }
    } else if (!isLatLngInDeliveryZone(initialPosition[0], initialPosition[1], geofenceConfig)) {
      // If the provided initial position is outside delivery zone, force default
      setPosition([centerLat, centerLng])
    }
  }, [serviceableStreets, geofenceConfig])

  // Debounced search trigger for typing suggestions (Autosuggest)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    let isMounted = true
    const controller = new AbortController()
    const { signal } = controller

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true)
      const query = searchQuery.trim().toLowerCase()

      // 1. Search locally in our serviceable_streets using fuzzy matching
      const scoredStreets = serviceableStreets.map(st => {
        const nameLower = st.name.toLowerCase()
        const nameHiLower = st.name_hi ? st.name_hi.toLowerCase() : ''
        
        // Exact substring matches get the highest score (distance 0)
        if (nameLower.includes(query) || (nameHiLower && nameHiLower.includes(query))) {
          return { street: st, score: 0 }
        }

        // Split into words and calculate min Levenshtein distance
        const words = nameLower.split(/\s+/).filter(w => w.length > 2)
        let minWordDistance = 999
        for (const w of words) {
          const dist = getLevenshteinDistance(query, w)
          if (dist < minWordDistance) {
            minWordDistance = dist
          }
        }

        // Full name distance
        const fullNameDistance = getLevenshteinDistance(query, nameLower)

        // Accept match if word distance is <= 2 or full name distance is <= 3
        const isFuzzyMatch = minWordDistance <= 2 || fullNameDistance <= 3
        
        if (isFuzzyMatch) {
          const finalDistance = Math.min(minWordDistance, fullNameDistance)
          return { street: st, score: finalDistance }
        }

        return null
      }).filter(Boolean)

      const localMatches = scoredStreets
        .sort((a, b) => a.score - b.score)
        .slice(0, 5)
        .map(({ street: st }) => ({
          isLocal: true,
          lat: st.latitude.toString(),
          lon: st.longitude.toString(),
          display_name: st.name_hi
            ? `${st.name} (${st.name_hi}), ${nearestCity?.name || 'Aurangabad'}, ${nearestCity?.state || 'Bihar'}`
            : `${st.name}, ${nearestCity?.name || 'Aurangabad'}, ${nearestCity?.state || 'Bihar'}`,
          name: st.name,
          address: {
            road: st.name,
            suburb: st.type,
            city: nearestCity?.name || 'Aurangabad',
            state: nearestCity?.state || 'Bihar',
            postcode: nearestCity?.allowed_pincodes?.[0] || ''
          },
          nearestStreet: st
        }))


      try {
        const apiQuery = searchQuery.toLowerCase().includes((nearestCity?.name || 'Aurangabad').toLowerCase())
          ? searchQuery
          : `${searchQuery}, ${nearestCity?.name || 'Aurangabad'}, ${nearestCity?.state || 'Bihar'}`

        // 2. Try LocationIQ Autocomplete first (uses our existing key)
        if (LOCATIONIQ_KEY && LOCATIONIQ_KEY !== 'YOUR_FREE_KEY_HERE') {
          const res = await fetch(
            `https://api.locationiq.com/v1/autocomplete?key=${LOCATIONIQ_KEY}&q=${encodeURIComponent(apiQuery)}&limit=10&countrycodes=in&lat=${centerLat}&lon=${centerLng}&tag=place:city,place:town,place:village,highway:residential,highway:primary,highway:secondary&accept-language=en`,
            { signal }
          )
          if (res.ok) {
            const data = await res.json()
            const iqResults = (data || [])
              .map(item => ({
                lat: item.lat,
                lon: item.lon,
                display_name: item.display_name,
                name: item.display_name?.split(',')[0] || item.display_name,
                address: item.address || {}
              }))
              .filter(item => isLatLngInDeliveryZone(item.lat, item.lon, geofenceConfig))

            if (isMounted) {
              setSearchResults([...localMatches, ...iqResults].slice(0, 5))
              setIsSearching(false)
            }
            return
          }
        }
        // 3. Fallback to Nominatim
        await fetchNominatim(localMatches, signal)
      } catch (err) {
        if (err.name === 'AbortError' || signal.aborted) {
          return
        }
        console.warn('LocationIQ autocomplete failed, falling back to Nominatim:', err)
        await fetchNominatim(localMatches, signal)
      }
    }, 450)

    const fetchNominatim = async (localMatches, abortSignal) => {
      try {
        const apiQuery = searchQuery.toLowerCase().includes((nearestCity?.name || 'Aurangabad').toLowerCase())
          ? searchQuery
          : `${searchQuery}, ${nearestCity?.name || 'Aurangabad'}, ${nearestCity?.state || 'Bihar'}`

        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(apiQuery)}&limit=10&addressdetails=1&countrycodes=in`,
          { signal: abortSignal }
        )
        const data = await response.json()
        const filteredData = (data || [])
          .filter(item => isLatLngInDeliveryZone(item.lat, item.lon, geofenceConfig))
        
        if (isMounted) {
          setSearchResults([...localMatches, ...filteredData].slice(0, 5))
        }
      } catch (err) {
        if (err.name === 'AbortError' || abortSignal.aborted) {
          return
        }
        console.error('Nominatim autocomplete failed:', err)
        if (isMounted) {
          setSearchResults(localMatches)
        }
      } finally {
        if (isMounted) {
          setIsSearching(false)
        }
      }
    }

    return () => {
      isMounted = false
      clearTimeout(delayDebounceFn)
      controller.abort()
    }
  }, [searchQuery, serviceableStreets])

  // Handle Search submit button (forced trigger)
  const handleSearch = async (e) => {
    e.preventDefault()
    // Autocomplete already handles suggestion updates. If user presses Enter, select first result.
    if (searchResults.length > 0) {
      handleSelectResult(searchResults[0])
    }
  }

  const handleSelectResult = async (result) => {
    setIsSearching(true)
    let lat = null
    let lng = null
    let displayName = result.display_name
    let addressDetails = result.address || {}
    let nearest = null

    // All results now have direct lat/lon (LocationIQ or Nominatim)
    lat = parseFloat(result.lat)
    lng = parseFloat(result.lon)

    if (lat === null || lng === null) {
      setIsSearching(false)
      return
    }

    setPosition([lat, lng])
    setSearchResults([])
    setSearchQuery(displayName)
    setIsSearching(false)

    // Find nearest verified street from serviceable streets in database
    nearest = result.isLocal 
      ? result.nearestStreet 
      : findNearestStreet(lat, lng, serviceableStreets)

    if (nearest && !result.isLocal) {
      const fallbackCity = nearestCity?.name || 'Aurangabad'
      const fallbackState = nearestCity?.state || 'Bihar'
      const fallbackPostcode = nearestCity?.allowed_pincodes?.[0] || ''

      displayName = nearest.name_hi 
        ? `${nearest.name} (${nearest.name_hi}), ${fallbackCity}, ${fallbackState}`
        : `${nearest.name}, ${fallbackCity}, ${fallbackState}`
      
      addressDetails = {
        ...addressDetails,
        road: nearest.name,
        suburb: nearest.type,
        city: fallbackCity,
        state: fallbackState,
        postcode: fallbackPostcode
      }
    }

    if (onLocationSelect) {
      onLocationSelect({
        lat,
        lng,
        displayName,
        addressDetails,
        nearestStreet: nearest
      })
    }
  }

  return (
    <div className={`w-full ${className} rounded-3xl overflow-hidden border border-gray-200 dark:border-zinc-800 relative shadow-2xl bg-gray-100 dark:bg-zinc-900 flex flex-col ${isSatellite ? 'satellite-active' : ''}`}>
      <style>{`
        .custom-map-label {
          background: rgba(255, 255, 255, 0.95) !important;
          border: 1px solid rgba(226, 232, 240, 0.85) !important;
          border-radius: 9999px !important;
          padding: 3px 8px !important;
          font-size: 9px !important;
          font-weight: 600 !important;
          color: #0f172a !important;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08) !important;
          white-space: nowrap !important;
          font-family: inherit !important;
          backdrop-filter: blur(4px) !important;
        }
        .dark .custom-map-label {
          background: rgba(24, 24, 27, 0.95) !important;
          border: 1px solid rgba(63, 63, 70, 0.85) !important;
          color: #f4f4f5 !important;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.25) !important;
        }
        .satellite-active .custom-map-label {
          background: #ffffff !important;
          border: 1.5px solid #10b981 !important;
          color: #0f172a !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
        }
        .custom-map-label::before {
          display: none !important;
        }
        .street-map-label {
          background: rgba(255, 255, 255, 0.95) !important;
          border: 1px solid rgba(0, 0, 0, 0.1) !important;
          border-radius: 8px !important;
          padding: 4px 8px !important;
          font-size: 10px !important;
          font-weight: 750 !important;
          color: #1f2937 !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08) !important;
          font-family: inherit !important;
          transition: all 0.2s ease !important;
        }
        .dark .street-map-label {
          background: rgba(18, 18, 18, 0.95) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          color: #f3f4f6 !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
        }
        .street-map-label::before {
          display: none !important;
        }
      `}</style>

      {/* Floating Search Bar */}
      <div className="absolute top-4 left-4 right-4 z-[1000] max-w-md">
        <div className="relative flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search address or area..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleSearch(e)
                }
              }}
              className="w-full pl-11 pr-4 py-3 bg-[#ffffff]/95 dark:bg-[#121212]/95 border border-gray-200 dark:border-zinc-800 rounded-2xl text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-ozo-red/50 shadow-lg backdrop-blur-md transition-all"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            {isSearching && (
              <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ozo-red animate-spin" />
            )}
          </div>
          <button
            type="button"
            onClick={handleSearch}
            className="px-4 py-3 bg-gradient-to-tr from-[#E23744] to-[#FF6B6B] hover:shadow-[0_4px_15px_rgba(226,55,68,0.3)] text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-md flex items-center justify-center"
          >
            Find
          </button>
        </div>

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="mt-2 bg-[#ffffff]/95 dark:bg-[#121212]/95 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-2xl backdrop-blur-md max-h-60 overflow-y-auto divide-y divide-gray-100 dark:divide-zinc-800 scrollbar-hide">
            {searchResults.map((result, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectResult(result)}
                className="w-full text-left px-5 py-3 hover:bg-gray-50 dark:hover:bg-zinc-800/50 flex items-start gap-3 transition-colors"
              >
                <MapPin className={`w-4 h-4 mt-0.5 flex-shrink-0 ${result.isLocal ? 'text-emerald-500' : result.isGoogle ? 'text-blue-500' : 'text-ozo-red'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-gray-900 dark:text-white line-clamp-1">
                      {result.address?.road || result.address?.suburb || result.name || 'Location'}
                    </p>
                    {result.isLocal && (
                      <span className="text-[8px] uppercase tracking-widest font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        Verified Area
                      </span>
                    )}
                    {result.isGoogle && (
                      <span className="text-[8px] uppercase tracking-widest font-black text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                        Google Maps
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-2">
                    {result.display_name}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Satellite / Street Map Toggle Button */}
      <button
        type="button"
        onClick={() => setIsSatellite(prev => !prev)}
        className={`absolute bottom-20 right-4 z-[1000] p-3 rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 border backdrop-blur-md ${
          isSatellite 
            ? 'bg-gradient-to-tr from-[#10B981] to-[#34D399] border-emerald-400 text-white hover:shadow-[0_8px_25px_rgba(16,185,129,0.3)]' 
            : 'bg-white/95 dark:bg-zinc-900/95 border-gray-200 dark:border-zinc-800 text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-zinc-800'
        }`}
        title={isSatellite ? "Switch to Street View" : "Switch to Satellite View"}
      >
        <Layers className="w-4 h-4" />
        <span className="text-[9px] font-black tracking-wider uppercase pr-0.5">
          {isSatellite ? 'Street' : 'Satellite'}
        </span>
      </button>

      {/* Floating GPS Button */}
      <button
        type="button"
        onClick={() => doGPS(true)}
        disabled={isLocating}
        className="absolute bottom-4 right-4 z-[1000] p-3.5 bg-gradient-to-tr from-[#E23744] to-[#FF6B6B] hover:shadow-[0_8px_25px_rgba(226,55,68,0.4)] text-white rounded-2xl shadow-xl transition-all active:scale-95 disabled:opacity-50"
        title="Locate Me"
      >
        <Navigation className={`w-5 h-5 ${isLocating ? 'animate-spin' : ''}`} />
      </button>

      {/* GPS Loading Overlay — shown while waiting for GPS (before map renders) */}
      {!position && (
        <div className="absolute inset-0 z-[500] flex flex-col items-center justify-center gap-4 bg-zinc-950">
          <div className="w-16 h-16 rounded-full bg-[#E23744]/10 border-2 border-[#E23744]/30 flex items-center justify-center">
            <Navigation className="w-7 h-7 text-[#E23744] animate-spin" />
          </div>
          <p className="text-sm font-bold text-white">
            {locationError ? locationError : 'Detecting your location...'}
          </p>
          {locationError && (
            <button
              onClick={() => doGPS(true)}
              className="px-5 py-2.5 bg-gradient-to-tr from-[#E23744] to-[#FF6B6B] text-white text-xs font-black rounded-xl"
            >
              Try Again
            </button>
          )}
        </div>
      )}

      {/* Leaflet Map — only rendered AFTER position is resolved */}
      {position && (
        <div style={{ width: '100%', height: '420px', flexShrink: 0 }}>
          <MapContainer
            center={position}
            zoom={16}
            minZoom={12}
            maxZoom={19}
            maxBounds={mapMaxBounds}
            maxBoundsViscosity={1.0}
            className=""
            style={{ width: '100%', height: '100%' }}
            zoomControl={false}
            attributionControl={false}
          >
            {isSatellite ? (
              <>
                <TileLayer
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  maxZoom={19}
                  attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                />
                <TileLayer
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}"
                  maxZoom={19}
                  pane="shadowPane"
                />
                <TileLayer
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                  maxZoom={19}
                  pane="overlayPane"
                />
              </>
            ) : (
              <TileLayer
                key={TILE_URLS[tileUrlIdx] || 'default-osm'}
                attribution='&copy; <a href="https://locationiq.com">LocationIQ</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url={TILE_URLS[tileUrlIdx] || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}
                maxZoom={20}
                eventHandlers={{
                  tileerror: () => {
                    setTileUrlIdx(prev => {
                      if (prev < TILE_URLS.length - 1) {
                        return prev + 1
                      }
                      return prev
                    })
                  }
                }}
              />
            )}

            {/* 🔥 OZO ACTIVE GEOFENCE CIRCLE */}
            <Circle 
              center={[centerLat, centerLng]}
              radius={maxRadius * 1000} 
              pathOptions={{
                color: '#E23744',
                fillColor: '#E23744',
                fillOpacity: 0.12,
                weight: 3,
                dashArray: '6, 6',
              }} 
            />

            {/* 🛣️ STREET NAME OVERLAY LAYER */}
            {zoomLevel > 14 && <StreetOverlay mapBounds={mapBounds} />}

            {/* 🟢 SERVICEABLE STREETS FROM DATABASE (FILTERED BY VIEWPORT BOUNDS) */}
            {mapBounds && serviceableStreets
              .filter((st) => {
                if (!st.latitude || !st.longitude) return false
                const lat = parseFloat(st.latitude)
                const lng = parseFloat(st.longitude)
                return mapBounds.contains([lat, lng])
              })
              .map((st) => {
                const lat = parseFloat(st.latitude)
                const lng = parseFloat(st.longitude)
                return (
                  <Marker
                    key={st.id}
                    position={[lat, lng]}
                    icon={serviceableStreetMarker}
                    eventHandlers={{
                      click: () => handleSelectServiceableStreet(st)
                    }}
                  >
                    <Tooltip direction="top" offset={[0, -6]} opacity={1} permanent={zoomLevel >= 17} className="custom-map-label">
                      <span>{st.name_hi ? `${st.name} (${st.name_hi})` : st.name}</span>
                    </Tooltip>
                  </Marker>
                )
              })}

            <Marker position={position} icon={ozoMarker} />
            
            <MapController 
              position={position} 
              setPosition={setPosition} 
              onLocationSelect={onLocationSelect} 
              serviceableStreets={serviceableStreets} 
              setZoomLevel={setZoomLevel}
              setMapBounds={setMapBounds}
              geofenceConfig={geofenceConfig}
            />
          </MapContainer>
        </div>
      )}

      {/* Active Delivery Zone Badge */}
      {position && (
        <div className="absolute bottom-[112px] left-4 z-[1000] bg-black/80 dark:bg-zinc-950/90 text-white border border-[#E23744]/40 px-3 py-1.5 rounded-xl text-[10px] font-black tracking-wider uppercase backdrop-blur-md flex items-center gap-2 shadow-lg">
          <span className="w-2.5 h-2.5 rounded-full bg-[#E23744] animate-pulse"></span>
          <span className="notranslate" translate="no">OZO Delivery Zone</span>
        </div>
      )}

      {/* Serviceability Status Badge */}
      {position && (
        <div className={`absolute bottom-[64px] left-4 z-[1000] px-4 py-2 rounded-2xl text-[11px] font-black uppercase tracking-wider backdrop-blur-md flex items-center gap-2 shadow-xl border transition-all duration-300 ${
          isDeliverable 
            ? 'bg-emerald-500/90 dark:bg-emerald-600/90 text-white border-emerald-400/30' 
            : 'bg-rose-600/95 dark:bg-rose-600/95 text-white border-rose-400/40 animate-pulse'
        }`}>
          <span className={`w-2 h-2 rounded-full bg-white ${isDeliverable ? 'animate-ping' : 'animate-pulse'}`}></span>
          <span>{isDeliverable ? 'Serviceable Area' : 'Not Serviceable Area'}</span>
        </div>
      )}

      {/* Latitude/Longitude Badge */}
      {position && (
        <div className="absolute bottom-4 left-4 z-[1000] bg-[#121212]/90 text-white border border-zinc-800 px-4 py-2 rounded-2xl text-[11px] font-bold backdrop-blur-md flex items-center gap-2 shadow-lg">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>📍 Lat: {position[0].toFixed(5)}</span>
          <span className="opacity-30">|</span>
          <span>Lng: {position[1].toFixed(5)}</span>
        </div>
      )}
    </div>
  )
}

export default OzoMapPicker
