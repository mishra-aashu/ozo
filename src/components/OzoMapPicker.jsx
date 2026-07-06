import React, { useState, useEffect, useRef, useMemo } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Search, Navigation, MapPin, Loader2, Layers, Route, Home } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { checkDeliveryZoneStatus, useLocationStore } from '../stores/locationStore'
import { reverseGeocode, findNearestStreet } from '../lib/geocoding'
import toast from 'react-hot-toast'
import { useCartStore } from '../stores/cartStore'
import { GEOFENCE_DEFAULTS } from '../config/deliveryDefaults'

const isLatLngInDeliveryZone = (lat, lng, config) => {
  return checkDeliveryZoneStatus(lat, lng, { geofenceConfig: config })
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

const isInsideBounds = (bounds, lat, lng) => {
  if (!bounds) return true
  if (typeof bounds.contains === 'function') {
    return bounds.contains([lng, lat])
  }
  return true
}

const createGeoJSONCircle = (center, radiusInKm, points = 64) => {
  const [lng, lat] = center
  const km = radiusInKm
  const ret = []
  const distanceX = km / (111.32 * Math.cos((lat * Math.PI) / 180))
  const distanceY = km / 110.574

  let theta, x, y
  for (let i = 0; i < points; i++) {
    theta = (i / points) * (2 * Math.PI)
    x = distanceX * Math.cos(theta)
    y = distanceY * Math.sin(theta)
    ret.push([lng + x, lat + y])
  }
  ret.push(ret[0]) // close the polygon

  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [ret]
    }
  }
}

const LOCATIONIQ_KEY = import.meta.env.VITE_LOCATIONIQ_KEY || '';

const streetStyle = {
  version: 8,
  sources: {
    'raster-tiles': {
      type: 'raster',
      tiles: [
        LOCATIONIQ_KEY && LOCATIONIQ_KEY !== 'YOUR_FREE_KEY_HERE' && !LOCATIONIQ_KEY.includes('YOUR_')
          ? `https://tiles.locationiq.com/v3/streets/r/{z}/{x}/{y}.png?key=${LOCATIONIQ_KEY}`
          : 'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png'
      ],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap contributors'
    }
  },
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
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

const satelliteStyle = {
  version: 8,
  sources: {
    'satellite-tiles': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      ],
      tileSize: 256,
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri'
    },
    'transportation-tiles': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}'
      ],
      tileSize: 256
    },
    'boundaries-tiles': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'
      ],
      tileSize: 256
    }
  },
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  layers: [
    {
      id: 'satellite-layer',
      type: 'raster',
      source: 'satellite-tiles',
      minzoom: 0,
      maxzoom: 19
    },
    {
      id: 'transportation-layer',
      type: 'raster',
      source: 'transportation-tiles',
      minzoom: 0,
      maxzoom: 19
    },
    {
      id: 'boundaries-layer',
      type: 'raster',
      source: 'boundaries-tiles',
      minzoom: 0,
      maxzoom: 19
    }
  ]
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
      [centerLng - lngDelta, centerLat - latDelta],
      [centerLng + lngDelta, centerLat + latDelta]
    ]
  }, [centerLat, centerLng, maxRadius])

  const fetchSettings = useCartStore(state => state.fetchSettings)
  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const localities = useLocationStore((state) => state.localities)
  const landmarks = useLocationStore((state) => state.landmarks)
  const galis = useLocationStore((state) => state.galis)

  const [useSteppedSearch, setUseSteppedSearch] = useState(true)
  const [step, setStep] = useState(1)
  const [selectedZone, setSelectedZone] = useState(null)
  const [selectedLocality, setSelectedLocality] = useState(null)
  const [selectedLandmark, setSelectedLandmark] = useState(null)
  const [selectedGali, setSelectedGali] = useState(null)
  const [customGaliText, setCustomGaliText] = useState('')
  const [localitySearch, setLocalitySearch] = useState('')
  const [landmarkSearch, setLandmarkSearch] = useState('')
  const [galiSearch, setGaliSearch] = useState('')
  const [zones, setZones] = useState([])

  useEffect(() => {
    const loadZones = async () => {
      try {
        const { data, error } = await supabase.from('delivery_zones').select('*')
        if (!error && data) {
          setZones(data)
        }
      } catch (e) {
        console.error('Error fetching zones:', e)
      }
    }
    loadZones()
  }, [])

  // position is null until GPS resolves — prevents rendering map at wrong default
  const [position, setPosition] = useState(() => {
    if (initialPosition && isLatLngInDeliveryZone(initialPosition[0], initialPosition[1], geofenceConfig)) {
      return initialPosition
    }
    return null
  })
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const serviceableMarkersRef = useRef([])
  const geoJsonDataRef = useRef(null)
  
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

  const handleConfirmSteppedAddress = () => {
    if (!selectedLocality) return

    let lat = position ? position[0] : parseFloat(selectedLocality.latitude)
    let lng = position ? position[1] : parseFloat(selectedLocality.longitude)

    if (selectedGali && customGaliText.includes(selectedGali.name)) {
      lat = parseFloat(selectedGali.latitude)
      lng = parseFloat(selectedGali.longitude)
    } else if (selectedLandmark && !customGaliText) {
      lat = parseFloat(selectedLandmark.latitude)
      lng = parseFloat(selectedLandmark.longitude)
    }

    const parts = []
    if (customGaliText) {
      parts.push(customGaliText.trim())
    }
    if (selectedLandmark) {
      parts.push(selectedLandmark.name_hi ? `${selectedLandmark.name} (${selectedLandmark.name_hi})` : selectedLandmark.name)
    }
    parts.push(selectedLocality.name_hi ? `${selectedLocality.name} (${selectedLocality.name_hi})` : selectedLocality.name)
    parts.push('Aurangabad')
    parts.push('Bihar')
    parts.push('824101')

    const displayName = parts.join(', ')

    const addressDetails = {
      road: customGaliText || (selectedLandmark ? selectedLandmark.name : ''),
      suburb: selectedLocality.name,
      city: 'Aurangabad',
      state: 'Bihar',
      postcode: '824101'
    }

    setPosition([lat, lng])

    if (onLocationSelect) {
      onLocationSelect({
        lat,
        lng,
        displayName,
        addressDetails,
        nearestStreet: selectedGali || selectedLocality
      })
    }
    
    toast.success('Address set successfully!')
  }


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

  // MapLibre Layer Setup Function
  const setupMapLayers = (map) => {
    if (!map) return

    // 1. Setup Geofence
    if (map.getSource('geofence')) {
      if (map.getLayer('geofence-fill')) map.removeLayer('geofence-fill')
      if (map.getLayer('geofence-stroke')) map.removeLayer('geofence-stroke')
      map.removeSource('geofence')
    }

    map.addSource('geofence', {
      type: 'geojson',
      data: createGeoJSONCircle([centerLng, centerLat], maxRadius)
    })

    map.addLayer({
      id: 'geofence-fill',
      type: 'fill',
      source: 'geofence',
      layout: {},
      paint: {
        'fill-color': '#E23744',
        'fill-opacity': 0.12
      }
    })

    map.addLayer({
      id: 'geofence-stroke',
      type: 'line',
      source: 'geofence',
      layout: {},
      paint: {
        'line-color': '#E23744',
        'line-width': 3,
        'line-dasharray': [2, 2]
      }
    })

    // 2. Setup Streets if loaded
    if (geoJsonDataRef.current) {
      if (map.getSource('streets-geojson')) {
        if (map.getLayer('streets-layer')) map.removeLayer('streets-layer')
        map.removeSource('streets-geojson')
      }

      map.addSource('streets-geojson', {
        type: 'geojson',
        data: geoJsonDataRef.current
      })

      map.addLayer({
        id: 'streets-layer',
        type: 'line',
        source: 'streets-geojson',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
          'visibility': zoomLevel > 14 ? 'visible' : 'none'
        },
        paint: {
          'line-color': [
            'case',
            ['in', ['get', 'highway'], ['literal', ['primary', 'secondary']]],
            '#E23744',
            '#3B82F6'
          ],
          'line-width': [
            'case',
            ['==', ['get', 'highway'], 'primary'],
            4.5,
            ['==', ['get', 'highway'], 'secondary'],
            3.5,
            2
          ],
          'line-opacity': 0.65
        }
      })
    }
  }

  // 1. Load street network GeoJSON dynamically
  useEffect(() => {
    import('../data/aurangabad_streets.json').then((module) => {
      const data = module.default || module
      geoJsonDataRef.current = data
      if (mapRef.current && mapRef.current.isStyleLoaded()) {
        setupMapLayers(mapRef.current)
      }
    })
  }, [])

  // 2. Initialize Map when position is resolved
  useEffect(() => {
    if (!position || !mapContainerRef.current || mapRef.current) return

    const [lat, lng] = position
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: isSatellite ? satelliteStyle : streetStyle,
      center: [lng, lat],
      zoom: 16,
      minZoom: 12,
      maxZoom: 19,
      maxBounds: [
        [centerLng - 0.15, centerLat - 0.15],
        [centerLng + 0.15, centerLat + 0.15]
      ],
      attributionControl: false
    })

    mapRef.current = map

    map.on('load', () => {
      setMapBounds(map.getBounds())
      setZoomLevel(Math.round(map.getZoom()))
      setupMapLayers(map)
    })

    map.on('moveend', () => {
      setMapBounds(map.getBounds())
    })

    map.on('zoomend', () => {
      setZoomLevel(Math.round(map.getZoom()))
      setMapBounds(map.getBounds())
    })

    map.on('click', async (e) => {
      const { lat, lng } = e.lngLat
      if (!isLatLngInDeliveryZone(lat, lng, geofenceConfig)) {
        toast.error("Pinned location is outside Ozo's delivery zone.", { id: 'outside-zone-toast' })
        return
      }
      setPosition([lat, lng])
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
    })

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [position === null])

  // 3. Update style on satellite toggle
  useEffect(() => {
    if (mapRef.current) {
      const map = mapRef.current
      map.setStyle(isSatellite ? satelliteStyle : streetStyle)
      
      const onStyleLoad = () => {
        setupMapLayers(map)
      }
      map.on('style.load', onStyleLoad)
      return () => {
        map.off('style.load', onStyleLoad)
      }
    }
  }, [isSatellite])

  // 4. Update street layer visibility when zoomLevel changes
  useEffect(() => {
    if (mapRef.current) {
      const map = mapRef.current
      if (map.getLayer('streets-layer')) {
        map.setLayoutProperty('streets-layer', 'visibility', zoomLevel > 14 ? 'visible' : 'none')
      }
    }
  }, [zoomLevel])

  // 5. Sync main position marker and fly to position if changed externally
  useEffect(() => {
    if (!mapRef.current || !position) return

    const map = mapRef.current
    const [lat, lng] = position

    const center = map.getCenter()
    if (Math.abs(center.lat - lat) > 0.0001 || Math.abs(center.lng - lng) > 0.0001) {
      map.flyTo({
        center: [lng, lat],
        zoom: 16,
        duration: 1200,
        essential: true
      })
    }

    if (markerRef.current) {
      markerRef.current.setLngLat([lng, lat])
    } else {
      const el = document.createElement('div')
      el.className = 'custom-ozo-pin'
      el.innerHTML = `
        <div class="relative flex flex-col items-center">
          <div class="absolute w-6 h-6 bg-[#E23744]/25 rounded-full animate-ping -bottom-3"></div>
          <div class="absolute w-2 h-1 bg-black/40 rounded-full blur-[1px] -bottom-0.5"></div>
          <div class="relative w-8 h-8 flex items-center justify-center">
            <div class="absolute w-8 h-8 bg-gradient-to-tr from-[#E23744] to-[#FF6B6B] rounded-full rounded-tr-none border-2 border-white dark:border-[#1a1a1a] shadow-lg transform rotate-[135deg]"></div>
            <div class="relative z-10 w-2.5 h-2.5 bg-white rounded-full shadow-inner"></div>
          </div>
        </div>
      `
      markerRef.current = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([lng, lat])
        .addTo(map)
    }
  }, [position])

  // 6. Sync serviceable street markers from database based on map bounds and zoom level
  useEffect(() => {
    if (!mapRef.current) return

    const map = mapRef.current

    serviceableMarkersRef.current.forEach(m => m.remove())
    serviceableMarkersRef.current = []

    if (serviceableStreets && mapBounds) {
      serviceableStreets
        .filter((st) => {
          if (!st.latitude || !st.longitude) return false
          const lat = parseFloat(st.latitude)
          const lng = parseFloat(st.longitude)
          return isInsideBounds(mapBounds, lat, lng)
        })
        .forEach((st) => {
          const lat = parseFloat(st.latitude)
          const lng = parseFloat(st.longitude)

          const el = document.createElement('div')
          el.className = 'custom-serviceable-pin cursor-pointer'
          el.innerHTML = `
            <div class="flex items-center justify-center h-full w-full">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" class="drop-shadow-sm">
                <circle cx="6" cy="6" r="4.5" fill="#10B981" stroke="#FFFFFF" stroke-width="1.5"/>
                <circle cx="6" cy="6" r="5.25" stroke="#10B981" stroke-width="0.75" stroke-opacity="0.3"/>
              </svg>
            </div>
          `

          const label = st.name_hi ? `${st.name} (${st.name_hi})` : st.name
          const popup = new maplibregl.Popup({
            offset: [0, -6],
            closeButton: false,
            closeOnClick: false
          }).setHTML(`<div class="custom-map-label text-[10px] font-bold px-1.5 py-0.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded shadow-md text-gray-800 dark:text-gray-200">${label}</div>`)

          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([lng, lat])
            .setPopup(popup)
            .addTo(map)

          if (zoomLevel >= 17) {
            popup.addTo(map)
          }

          el.addEventListener('click', (e) => {
            e.stopPropagation()
            handleSelectServiceableStreet(st)
          })

          serviceableMarkersRef.current.push(marker)
        })
    }
  }, [serviceableStreets, mapBounds, zoomLevel])


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

      {/* Floating Search Bar & Stepped Autocomplete Container */}
      <div className="absolute top-4 left-4 right-4 z-[1000] max-w-md">
        {/* Toggle between stepped and manual search */}
        <div className="flex bg-[#ffffff]/90 dark:bg-[#121212]/90 backdrop-blur-md border border-gray-200 dark:border-zinc-800 p-1.5 rounded-2xl mb-2 gap-1 shadow-lg">
          <button
            type="button"
            onClick={() => setUseSteppedSearch(true)}
            className={`flex-1 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${
              useSteppedSearch 
                ? 'bg-gradient-to-tr from-[#E23744] to-[#FF6B6B] text-white shadow-md' 
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800'
            }`}
          >
            <MapPin size={10} /> Guided Steps
          </button>
          <button
            type="button"
            onClick={() => setUseSteppedSearch(false)}
            className={`flex-1 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${
              !useSteppedSearch 
                ? 'bg-gradient-to-tr from-[#E23744] to-[#FF6B6B] text-white shadow-md' 
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Search size={10} /> Search Text
          </button>
        </div>

        {!useSteppedSearch ? (
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
        ) : (
          <div className="bg-[#ffffff]/95 dark:bg-[#121212]/95 border border-gray-200 dark:border-zinc-800 rounded-3xl shadow-2xl backdrop-blur-md p-4 flex flex-col gap-3 transition-all max-h-[380px] overflow-y-auto">
            {/* Header: Back & Step Indicator */}
            <div className="flex items-center justify-between border-b border-gray-150 dark:border-zinc-800 pb-2">
              <div className="flex items-center gap-2">
                {step > 1 && (
                  <button
                    type="button"
                    onClick={() => setStep(prev => prev - 1)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg text-gray-500 dark:text-gray-400 transition-colors font-bold text-xs"
                  >
                    ← Back
                  </button>
                )}
                <span className="text-[10px] font-black uppercase tracking-widest text-[#E23744]">
                  Step {step} of 4
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStep(1)
                  setSelectedZone(null)
                  setSelectedLocality(null)
                  setSelectedLandmark(null)
                  setSelectedGali(null)
                  setCustomGaliText('')
                }}
                className="text-[9px] font-black uppercase tracking-widest text-gray-450 hover:text-gray-650 dark:hover:text-gray-200"
              >
                Reset
              </button>
            </div>

            {/* Step Content */}
            {step === 1 && (
              <div className="flex flex-col gap-2">
                <p className="text-[11px] font-black uppercase tracking-wider text-gray-400">
                  Select Delivery Zone
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {zones.map((zone) => (
                    <button
                      key={zone.id}
                      type="button"
                      onClick={() => {
                        setSelectedZone(zone)
                        setStep(2)
                      }}
                      className="p-3 bg-gray-50 dark:bg-zinc-850 hover:bg-[#E23744]/10 dark:hover:bg-[#E23744]/10 border border-gray-150 dark:border-zinc-800 hover:border-[#E23744]/30 rounded-2xl flex flex-col text-left transition-all active:scale-[0.98]"
                    >
                      <span className="text-xs font-black text-gray-900 dark:text-white leading-tight">
                        {zone.name.split(':')[1]?.split('(')[0]?.trim() || zone.name}
                      </span>
                      {zone.name_hi && (
                        <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 mt-1">
                          {zone.name_hi.split(':')[1]?.split('(')[0]?.trim() || zone.name_hi}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="flex flex-col gap-2">
                <p className="text-[11px] font-black uppercase tracking-wider text-gray-400">
                  Select Locality
                </p>
                <input
                  type="text"
                  placeholder="Filter localities..."
                  value={localitySearch}
                  onChange={(e) => setLocalitySearch(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-zinc-900 border border-gray-250 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-ozo-red/50 text-gray-900 dark:text-white font-bold"
                />
                <div className="overflow-y-auto divide-y divide-gray-150 dark:divide-zinc-800/60 max-h-48 pr-1">
                  {localities
                    .filter(loc => loc.zone_id === selectedZone?.id)
                    .filter(loc => 
                      loc.name.toLowerCase().includes(localitySearch.toLowerCase()) ||
                      (loc.name_hi && loc.name_hi.includes(localitySearch))
                    )
                    .map((loc) => (
                      <button
                        key={loc.id}
                        type="button"
                        onClick={() => {
                          setSelectedLocality(loc)
                          const lat = parseFloat(loc.latitude)
                          const lng = parseFloat(loc.longitude)
                          setPosition([lat, lng])
                          setStep(3)
                        }}
                        className="w-full py-2.5 text-left flex justify-between items-center hover:bg-gray-50 dark:hover:bg-zinc-800/30 px-2 transition-colors rounded-lg"
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-gray-900 dark:text-white">
                            {loc.name}
                          </span>
                          {loc.name_hi && (
                            <span className="text-[10px] text-gray-500 dark:text-gray-400">
                              {loc.name_hi}
                            </span>
                          )}
                        </div>
                        <span className="text-[8px] text-emerald-500 font-black uppercase bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          ~{loc.radius}m Spread
                        </span>
                      </button>
                    ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="flex flex-col gap-2">
                <p className="text-[11px] font-black uppercase tracking-wider text-gray-400">
                  Select Sub-Locality / Landmark
                </p>
                <input
                  type="text"
                  placeholder="Filter landmarks..."
                  value={landmarkSearch}
                  onChange={(e) => setLandmarkSearch(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-zinc-900 border border-gray-250 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-ozo-red/50 text-gray-900 dark:text-white font-bold"
                />
                <div className="overflow-y-auto divide-y divide-gray-150 dark:divide-zinc-800/60 max-h-40 pr-1">
                  {landmarks
                    .filter(lm => lm.locality_id === selectedLocality?.id)
                    .filter(lm => 
                      lm.name.toLowerCase().includes(landmarkSearch.toLowerCase()) ||
                      (lm.name_hi && lm.name_hi.includes(landmarkSearch))
                    )
                    .map((lm) => (
                      <button
                        key={lm.id}
                        type="button"
                        onClick={() => {
                          setSelectedLandmark(lm)
                          const lat = parseFloat(lm.latitude)
                          const lng = parseFloat(lm.longitude)
                          setPosition([lat, lng])
                          setStep(4)
                        }}
                        className="w-full py-2.5 text-left flex flex-col hover:bg-gray-50 dark:hover:bg-zinc-800/30 px-2 transition-colors rounded-lg"
                      >
                        <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                          <MapPin size={12} className="text-[#E23744] shrink-0" />
                          <span>{lm.name}</span>
                        </span>
                        {lm.name_hi && (
                          <span className="text-[10px] text-gray-500 dark:text-gray-400 pl-4">
                            {lm.name_hi}
                          </span>
                        )}
                      </button>
                    ))}
                  {landmarks.filter(lm => lm.locality_id === selectedLocality?.id).length === 0 && (
                    <div className="py-4 text-center text-[10px] text-gray-450 uppercase tracking-wider">
                      No landmarks registered in this locality
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedLandmark(null)
                    setStep(4)
                  }}
                  className="mt-1 w-full py-2 border border-dashed border-gray-200 dark:border-zinc-850 hover:bg-gray-50 dark:hover:bg-zinc-800/20 text-gray-500 dark:text-gray-400 text-xs font-black rounded-xl uppercase tracking-wider transition-all"
                >
                  Skip Landmark
                </button>
              </div>
            )}

            {step === 4 && (
              <div className="flex flex-col gap-2">
                <p className="text-[11px] font-black uppercase tracking-wider text-gray-400">
                  Select Street/Gali or Enter House details
                </p>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Enter custom House No., Apartment, or Gali..."
                    value={customGaliText}
                    onChange={(e) => setCustomGaliText(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs bg-gray-50 dark:bg-zinc-900 border border-gray-250 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-ozo-red/50 text-gray-900 dark:text-white font-bold"
                  />
                </div>
                
                <p className="text-[9px] font-black uppercase tracking-wider text-gray-405 mt-1">
                  Or select verified streets from database:
                </p>
                <div className="overflow-y-auto divide-y divide-gray-150 dark:divide-zinc-800/60 max-h-32 pr-1">
                  {galis
                    .filter(g => g.locality_id === selectedLocality?.id)
                    .map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => {
                          setSelectedGali(g)
                          setCustomGaliText(g.name_hi ? `${g.name} (${g.name_hi})` : g.name)
                          const lat = parseFloat(g.latitude)
                          const lng = parseFloat(g.longitude)
                          setPosition([lat, lng])
                        }}
                        className="w-full py-2 text-left flex justify-between items-center hover:bg-gray-50 dark:hover:bg-zinc-800/30 px-2 transition-colors rounded-lg"
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                            <Route size={12} className="text-[#E23744] shrink-0" />
                            <span>{g.name}</span>
                          </span>
                          {g.name_hi && (
                            <span className="text-[10px] text-gray-500 dark:text-gray-400 pl-4">
                              {g.name_hi}
                            </span>
                          )}
                        </div>
                        <span className="text-[8px] text-blue-500 font-black uppercase bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                          {g.length ? `~${g.length}m Stretch` : `~${g.radius}m Bounds`}
                        </span>
                      </button>
                    ))}
                  {galis.filter(g => g.locality_id === selectedLocality?.id).length === 0 && (
                    <div className="py-2 text-center text-[9px] text-gray-450 uppercase tracking-wider">
                      No streets registered in this locality
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    handleConfirmSteppedAddress()
                  }}
                  className="mt-2 w-full py-3 bg-gradient-to-tr from-[#E23744] to-[#FF6B6B] text-white text-xs font-black rounded-2xl uppercase tracking-wider hover:shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  Confirm Location
                </button>
              </div>
            )}
          </div>
        )}

        {/* Search Results Dropdown */}
        {!useSteppedSearch && searchResults.length > 0 && (
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

      {/* MapLibre Map Container */}
      {position && (
        <div style={{ width: '100%', height: '420px', flexShrink: 0 }} className="relative">
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
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
          <span>Lat: {position[0].toFixed(5)}</span>
          <span className="opacity-30">|</span>
          <span>Lng: {position[1].toFixed(5)}</span>
        </div>
      )}
    </div>
  )
}

export default OzoMapPicker
