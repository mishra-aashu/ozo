import { useState, useEffect, useRef, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Settings,
  Truck,
  ShoppingBag,
  Percent,
  Save,
  RefreshCw,
  Sliders,
  DollarSign,
  Info,
  Database,
  CheckCircle2,
  Terminal,
  Activity,
  Users,
  Compass,
  MapPin,
  Loader2,
  Search,
  Shield,
  Rocket,
  Bell,
  Clock,
  CreditCard,
  FileDown,
  FileUp,
  Play,
  AlertTriangle,
  Image
} from 'lucide-react'
import { supabaseAdmin as supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { useCartStore } from '../../stores/cartStore'
import { useLocationStore } from '../../stores/locationStore'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

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

const AdminSettings = () => {
  const fetchHierarchicalData = useLocationStore(state => state.fetchHierarchicalData)
  const localities = useLocationStore(state => state.localities || [])
  const landmarks = useLocationStore(state => state.landmarks || [])
  const galis = useLocationStore(state => state.galis || [])

  const [showLocalities, setShowLocalities] = useState(true)
  const [showLandmarks, setShowLandmarks] = useState(true)
  const [showGalis, setShowGalis] = useState(true)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [logs, setLogs] = useState([])

  // State for Mandi Price Sync Configuration
  const [mandiSyncConfig, setMandiSyncConfig] = useState({
    api_key: '579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b',
    state: 'Bihar',
    district: 'Gaya',
    market: 'Tekari APMC',
    markup_percent: 25,
    mrp_markup_percent: 50,
    auto_sync: true,
    mappings: {}
  })
  const [vegetableProducts, setVegetableProducts] = useState([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [syncLoading, setSyncLoading] = useState(false)
  const [dryRunLog, setDryRunLog] = useState(null)
  const [mapperSearch, setMapperSearch] = useState('')
  const [mapperPage, setMapperPage] = useState(1)
  const itemsPerPage = 10

  // State for all settings groups
  const [deliveryConfig, setDeliveryConfig] = useState({
    base_fee: 30,
    free_above: 99,
    surge_multiplier: 1,
    distance_charge_enabled: false,
    charge_per_km: 10,
    free_distance: 3,
    store_lat: 24.752871,
    store_lng: 84.3738
  })

  const [orderConfig, setOrderConfig] = useState({
    min_order_value: 99,
    max_items_per_order: 50,
    pre_order_lead_hours: 4
  })

  const [platformConfig, setPlatformConfig] = useState({
    platform_fee: 2,
    charity_enabled: true,
    charity_amount: 10,
    charity_name: 'Local Feeding Programs',
    global_commission_pct: 24
  })

  const [shgConfig, setShgConfig] = useState({
    enabled: true
  })

  const [riderConfig, setRiderConfig] = useState({
    base_payout: 10,
    distance_bonus_per_km: 5,
    max_cash_limit: 2000
  })

  const [geofenceConfig, setGeofenceConfig] = useState({
    strict_enforcement: true,
    warehouse_lat: 24.754622,
    warehouse_lng: 84.375011,
    max_radius_km: 1.5
  })

  const [securityConfig, setSecurityConfig] = useState({
    max_sessions_per_user: 2
  })

  // Change Admin Password States
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [updatingPassword, setUpdatingPassword] = useState(false)

  const [mapConfig, setMapConfig] = useState({
    hide_map: false,
    hide_mart_pickup: false
  })

  const [launchConfig, setLaunchConfig] = useState({
    launch_mode_enabled: true,
    show_out_of_stock_btn: true,
    show_listing_soon_btn: true,
    show_mandi_section: true,
    show_budget_section: true
  })

  const [serviceHoursConfig, setServiceHoursConfig] = useState({
    enabled: true,
    start_time: '06:00',
    end_time: '21:00',
    prevent_checkout: false,
    banner_text: '',
    checkout_text: ''
  })

  const [paymentConfig, setPaymentConfig] = useState({
    cashfree_enabled: true,
    razorpay_enabled: false,
    cod_enabled: true
  })

  // State for Localhost Image Tool Config
  const [imageToolConfig, setImageToolConfig] = useState({
    download_url: ''
  })

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [isPlacingWarehouse, setIsPlacingWarehouse] = useState(false)
  const [isPlacingStore, setIsPlacingStore] = useState(false)
  const [mapLoaded, setMapLoaded] = useState(false)

  // MapLibre configuration refs and effects
  const settingsMapContainerRef = useRef(null)
  const settingsMapRef = useRef(null)
  const warehouseMarkerRef = useRef(null)
  const storeMarkerRef = useRef(null)
  const localitiesMarkersRef = useRef([])
  const landmarksMarkersRef = useRef([])
  const galisMarkersRef = useRef([])

  const isPlacingWarehouseRef = useRef(isPlacingWarehouse)
  const isPlacingStoreRef = useRef(isPlacingStore)

  useEffect(() => {
    isPlacingWarehouseRef.current = isPlacingWarehouse
  }, [isPlacingWarehouse])

  useEffect(() => {
    isPlacingStoreRef.current = isPlacingStore
  }, [isPlacingStore])

  // Initialize Settings Map
  useEffect(() => {
    if (loading) return
    if (!settingsMapContainerRef.current) return
    if (settingsMapRef.current) return // Already initialized

    const initialLat = geofenceConfig.warehouse_lat || 24.754622
    const initialLng = geofenceConfig.warehouse_lng || 84.375011

    const map = new maplibregl.Map({
      container: settingsMapContainerRef.current,
      style: streetStyle,
      center: [initialLng, initialLat],
      zoom: 14,
      attributionControl: false
    })

    settingsMapRef.current = map

    map.on('load', () => {
      setMapLoaded(true)
    })

    map.on('click', (e) => {
      const { lat, lng } = e.lngLat
      const fixedLat = parseFloat(lat.toFixed(6))
      const fixedLng = parseFloat(lng.toFixed(6))

      if (isPlacingWarehouseRef.current) {
        setGeofenceConfig(prev => ({
          ...prev,
          warehouse_lat: fixedLat,
          warehouse_lng: fixedLng
        }))
        setIsPlacingWarehouse(false)
        toast.success("Warehouse position updated!")
      } else if (isPlacingStoreRef.current) {
        setDeliveryConfig(prev => ({
          ...prev,
          store_lat: fixedLat,
          store_lng: fixedLng
        }))
        setIsPlacingStore(false)
        toast.success("Delivery center position updated!")
      }
    })

    return () => {
      if (settingsMapRef.current) {
        settingsMapRef.current.remove()
        settingsMapRef.current = null
      }
      setMapLoaded(false)
    }
  }, [loading])

  // Sync Warehouse marker
  useEffect(() => {
    if (!settingsMapRef.current) return
    const map = settingsMapRef.current
    const lat = geofenceConfig.warehouse_lat || 24.754622
    const lng = geofenceConfig.warehouse_lng || 84.375011

    if (warehouseMarkerRef.current) {
      warehouseMarkerRef.current.setLngLat([lng, lat])
    } else {
      const el = document.createElement('div')
      el.className = 'custom-warehouse-pin cursor-pointer'
      el.innerHTML = `
        <div class="relative flex flex-col items-center">
          <div class="absolute w-8 h-8 bg-emerald-500/25 rounded-full animate-ping -bottom-4"></div>
          <div class="absolute w-2.5 h-1 bg-black/40 rounded-full blur-[1px] -bottom-0.5"></div>
          <div class="relative w-9 h-9 flex items-center justify-center">
            <div class="absolute w-9 h-9 bg-gradient-to-tr from-emerald-500 to-teal-450 rounded-full rounded-tr-none border-2 border-white dark:border-[#1a1a1a] shadow-lg transform rotate-[135deg]"></div>
            <div class="relative z-10 w-3 h-3 bg-white rounded-full shadow-inner flex items-center justify-center">
              <div class="w-1.5 h-1.5 bg-emerald-600 rounded-full"></div>
            </div>
          </div>
        </div>
      `
      warehouseMarkerRef.current = new maplibregl.Marker({ element: el, draggable: true, anchor: 'bottom' })
        .setLngLat([lng, lat])
        .addTo(map)

      warehouseMarkerRef.current.on('dragend', () => {
        const lngLat = warehouseMarkerRef.current.getLngLat()
        const fixedLat = parseFloat(lngLat.lat.toFixed(6))
        const fixedLng = parseFloat(lngLat.lng.toFixed(6))
        setGeofenceConfig(prev => ({
          ...prev,
          warehouse_lat: fixedLat,
          warehouse_lng: fixedLng
        }))
        toast.success("Warehouse position updated!")
      })
    }
  }, [geofenceConfig.warehouse_lat, geofenceConfig.warehouse_lng, mapLoaded])

  // Sync Store marker
  useEffect(() => {
    if (!settingsMapRef.current) return
    const map = settingsMapRef.current
    const lat = deliveryConfig.store_lat || 24.752871
    const lng = deliveryConfig.store_lng || 84.3738

    if (storeMarkerRef.current) {
      storeMarkerRef.current.setLngLat([lng, lat])
    } else {
      const el = document.createElement('div')
      el.className = 'custom-store-pin cursor-pointer'
      el.innerHTML = `
        <div class="relative flex flex-col items-center">
          <div class="absolute w-8 h-8 bg-amber-500/25 rounded-full animate-ping -bottom-4"></div>
          <div class="absolute w-2.5 h-1 bg-black/40 rounded-full blur-[1px] -bottom-0.5"></div>
          <div class="relative w-9 h-9 flex items-center justify-center">
            <div class="absolute w-9 h-9 bg-gradient-to-tr from-amber-500 to-yellow-400 rounded-full rounded-tr-none border-2 border-white dark:border-[#1a1a1a] shadow-lg transform rotate-[135deg]"></div>
            <div class="relative z-10 w-3 h-3 bg-white rounded-full shadow-inner flex items-center justify-center">
              <div class="w-1.5 h-1.5 bg-amber-600 rounded-full"></div>
            </div>
          </div>
        </div>
      `
      storeMarkerRef.current = new maplibregl.Marker({ element: el, draggable: true, anchor: 'bottom' })
        .setLngLat([lng, lat])
        .addTo(map)

      storeMarkerRef.current.on('dragend', () => {
        const lngLat = storeMarkerRef.current.getLngLat()
        const fixedLat = parseFloat(lngLat.lat.toFixed(6))
        const fixedLng = parseFloat(lngLat.lng.toFixed(6))
        setDeliveryConfig(prev => ({
          ...prev,
          store_lat: fixedLat,
          store_lng: fixedLng
        }))
        toast.success("Store delivery center position updated!")
      })
    }
  }, [deliveryConfig.store_lat, deliveryConfig.store_lng, mapLoaded])

  // Sync Store geofence circle
  useEffect(() => {
    if (!mapLoaded || !settingsMapRef.current) return
    const map = settingsMapRef.current
    const lat = deliveryConfig.store_lat || 24.752871
    const lng = deliveryConfig.store_lng || 84.3738
    const radius = geofenceConfig.max_radius_km || 1.5

    const setupCircle = () => {
      if (map.getSource('store-geofence')) {
        if (map.getLayer('store-geofence-fill')) map.removeLayer('store-geofence-fill')
        if (map.getLayer('store-geofence-stroke')) map.removeLayer('store-geofence-stroke')
        map.removeSource('store-geofence')
      }

      map.addSource('store-geofence', {
        type: 'geojson',
        data: createGeoJSONCircle([lng, lat], radius)
      })

      map.addLayer({
        id: 'store-geofence-fill',
        type: 'fill',
        source: 'store-geofence',
        layout: {},
        paint: {
          'fill-color': '#eab308',
          'fill-opacity': 0.05
        }
      })

      map.addLayer({
        id: 'store-geofence-stroke',
        type: 'line',
        source: 'store-geofence',
        layout: {},
        paint: {
          'line-color': '#eab308',
          'line-width': 2,
          'line-dasharray': [3, 3]
        }
      })
    }

    setupCircle()
  }, [deliveryConfig.store_lat, deliveryConfig.store_lng, geofenceConfig.max_radius_km, mapLoaded])

  // Sync Localities markers
  useEffect(() => {
    if (!mapLoaded || !settingsMapRef.current) return
    const map = settingsMapRef.current

    // Clear previous
    localitiesMarkersRef.current.forEach(({ marker, circle }) => {
      marker.remove()
      if (circle) {
        if (map.getLayer(circle.layerFillId)) map.removeLayer(circle.layerFillId)
        if (map.getLayer(circle.layerStrokeId)) map.removeLayer(circle.layerStrokeId)
        if (map.getSource(circle.sourceId)) map.removeSource(circle.sourceId)
      }
    })
    localitiesMarkersRef.current = []

    const setupLocalities = () => {
      if (showLocalities && localities) {
        localities.forEach((loc, idx) => {
          if (!loc.latitude || !loc.longitude) return
          const lat = parseFloat(loc.latitude)
          const lng = parseFloat(loc.longitude)
          const radiusM = loc.radius ? parseFloat(loc.radius) : 400

          const el = document.createElement('div')
          el.className = 'custom-locality-pin cursor-pointer'
          el.innerHTML = `
            <div class="relative flex flex-col items-center">
              <div class="relative w-7 h-7 flex items-center justify-center">
                <div class="absolute w-7 h-7 bg-blue-500 rounded-full rounded-tr-none border-2 border-white dark:border-[#1a1a1a] shadow-md transform rotate-[135deg]"></div>
                <div class="relative z-10 w-2 h-2 bg-white rounded-full shadow-inner"></div>
              </div>
            </div>
          `

          const popupHTML = `
            <div class="text-xs p-1 min-w-[150px] text-gray-850 dark:text-gray-200">
              <div class="font-bold text-blue-600 dark:text-blue-400">${loc.name}</div>
              <div class="text-gray-500 text-[10px]">${loc.name_hi || ''}</div>
              <div class="mt-1 border-t pt-1 space-y-0.5 text-[10px] text-gray-600 dark:text-gray-400">
                <div><strong>Pincode:</strong> ${loc.pincode}</div>
                <div><strong>Snapping Radius:</strong> ${radiusM}m</div>
                <div><strong>Speed Factor:</strong> ${loc.rider_speed_multiplier || '1.0'}x</div>
                <div><strong>Primary:</strong> ${loc.is_primary ? 'Yes' : 'No'}</div>
              </div>
            </div>
          `
          const popup = new maplibregl.Popup({ offset: [0, -12] }).setHTML(popupHTML)

          const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
            .setLngLat([lng, lat])
            .setPopup(popup)
            .addTo(map)

          const sourceId = `locality-circle-source-${loc.id}-${idx}`
          const layerFillId = `locality-circle-fill-${loc.id}-${idx}`
          const layerStrokeId = `locality-circle-stroke-${loc.id}-${idx}`

          map.addSource(sourceId, {
            type: 'geojson',
            data: createGeoJSONCircle([lng, lat], radiusM / 1000)
          })

          map.addLayer({
            id: layerFillId,
            type: 'fill',
            source: sourceId,
            layout: {},
            paint: {
              'fill-color': '#3b82f6',
              'fill-opacity': 0.03
            }
          })

          map.addLayer({
            id: layerStrokeId,
            type: 'line',
            source: sourceId,
            layout: {},
            paint: {
              'line-color': '#3b82f6',
              'line-width': 1,
              'line-dasharray': [3, 3]
            }
          })

          localitiesMarkersRef.current.push({
            marker,
            circle: { sourceId, layerFillId, layerStrokeId }
          })
        })
      }
    }

    setupLocalities()
  }, [showLocalities, localities, mapLoaded])

  // Sync Landmarks markers
  useEffect(() => {
    if (!mapLoaded || !settingsMapRef.current) return
    const map = settingsMapRef.current

    landmarksMarkersRef.current.forEach(marker => marker.remove())
    landmarksMarkersRef.current = []

    const setupLandmarks = () => {
      if (showLandmarks && landmarks) {
        landmarks.forEach((lm) => {
          if (!lm.latitude || !lm.longitude) return
          const lat = parseFloat(lm.latitude)
          const lng = parseFloat(lm.longitude)
          const parentLoc = localities.find(l => l.id === lm.locality_id)

          const el = document.createElement('div')
          el.className = 'custom-landmark-pin cursor-pointer'
          el.innerHTML = `
            <div class="relative flex flex-col items-center">
              <div class="relative w-6 h-6 flex items-center justify-center animate-fade-in">
                <div class="absolute w-6 h-6 bg-rose-500 rounded-full rounded-tr-none border-2 border-white dark:border-[#1a1a1a] shadow-md transform rotate-[135deg]"></div>
                <div class="relative z-10 w-1.5 h-1.5 bg-white rounded-full shadow-inner"></div>
              </div>
            </div>
          `

          const popupHTML = `
            <div class="text-xs p-1 min-w-[150px] text-gray-805 dark:text-gray-200">
              <div class="font-bold text-rose-600 dark:text-rose-400">${lm.name}</div>
              <div class="text-gray-500 text-[10px]">${lm.name_hi || ''}</div>
              <div class="mt-1 border-t pt-1 space-y-0.5 text-[10px] text-gray-600 dark:text-gray-400">
                <div><strong>Type:</strong> Landmark</div>
                <div><strong>Area:</strong> ${parentLoc ? parentLoc.name : 'Unknown'}</div>
              </div>
            </div>
          `
          const popup = new maplibregl.Popup({ offset: [0, -10] }).setHTML(popupHTML)

          const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
            .setLngLat([lng, lat])
            .setPopup(popup)
            .addTo(map)

          landmarksMarkersRef.current.push(marker)
        })
      }
    }

    setupLandmarks()
  }, [showLandmarks, landmarks, localities, mapLoaded])

  // Sync Galis markers
  useEffect(() => {
    if (!mapLoaded || !settingsMapRef.current) return
    const map = settingsMapRef.current

    galisMarkersRef.current.forEach(({ marker, circle }) => {
      marker.remove()
      if (circle) {
        if (map.getLayer(circle.layerFillId)) map.removeLayer(circle.layerFillId)
        if (map.getLayer(circle.layerStrokeId)) map.removeLayer(circle.layerStrokeId)
        if (map.getSource(circle.sourceId)) map.removeSource(circle.sourceId)
      }
    })
    galisMarkersRef.current = []

    const setupGalis = () => {
      if (showGalis && galis) {
        galis.forEach((g, idx) => {
          if (!g.latitude || !g.longitude) return
          const lat = parseFloat(g.latitude)
          const lng = parseFloat(g.longitude)
          const radiusM = g.radius ? parseFloat(g.radius) : 150
          const parentLoc = localities.find(l => l.id === g.locality_id)

          const el = document.createElement('div')
          el.className = 'custom-gali-pin cursor-pointer'
          el.innerHTML = `
            <div class="relative flex flex-col items-center">
              <div class="relative w-6 h-6 flex items-center justify-center animate-fade-in">
                <div class="absolute w-6 h-6 bg-purple-500 rounded-full rounded-tr-none border-2 border-white dark:border-[#1a1a1a] shadow-md transform rotate-[135deg]"></div>
                <div class="relative z-10 w-1.5 h-1.5 bg-white rounded-full shadow-inner"></div>
              </div>
            </div>
          `

          const popupHTML = `
            <div class="text-xs p-1 min-w-[150px] text-gray-810 dark:text-gray-200">
              <div class="font-bold text-purple-600 dark:text-purple-400">${g.name}</div>
              <div class="text-gray-500 text-[10px]">${g.name_hi || ''}</div>
              <div class="mt-1 border-t pt-1 space-y-0.5 text-[10px] text-gray-600 dark:text-gray-400">
                <div><strong>Type:</strong> ${g.type || 'Street/Gali'}</div>
                <div><strong>Area:</strong> ${parentLoc ? parentLoc.name : 'Unknown'}</div>
                <div><strong>Radius:</strong> ${radiusM}m</div>
                <div><strong>Restriction:</strong> ${g.vehicle_restriction || 'None'}</div>
                <div><strong>Speed Factor:</strong> ${g.rider_speed_multiplier || '1.0'}x</div>
              </div>
            </div>
          `
          const popup = new maplibregl.Popup({ offset: [0, -10] }).setHTML(popupHTML)

          const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
            .setLngLat([lng, lat])
            .setPopup(popup)
            .addTo(map)

          const sourceId = `gali-circle-source-${g.id}-${idx}`
          const layerFillId = `gali-circle-fill-${g.id}-${idx}`
          const layerStrokeId = `gali-circle-stroke-${g.id}-${idx}`

          map.addSource(sourceId, {
            type: 'geojson',
            data: createGeoJSONCircle([lng, lat], radiusM / 1000)
          })

          map.addLayer({
            id: layerFillId,
            type: 'fill',
            source: sourceId,
            layout: {},
            paint: {
              'fill-color': '#a855f7',
              'fill-opacity': 0.03
            }
          })

          map.addLayer({
            id: layerStrokeId,
            type: 'line',
            source: sourceId,
            layout: {},
            paint: {
              'line-color': '#a855f7',
              'line-width': 1,
              'line-dasharray': [2, 2]
            }
          })

          galisMarkersRef.current.push({
            marker,
            circle: { sourceId, layerFillId, layerStrokeId }
          })
        })
      }
    }

    setupGalis()
  }, [showGalis, galis, localities, mapLoaded])

  // Recenter Map on Warehouse/Store location when config is loaded
  useEffect(() => {
    if (!settingsMapRef.current) return
    const map = settingsMapRef.current
    const lat = geofenceConfig.warehouse_lat || 24.754622
    const lng = geofenceConfig.warehouse_lng || 84.375011

    const center = map.getCenter()
    if (Math.abs(center.lat - lat) > 0.001 || Math.abs(center.lng - lng) > 0.001) {
      map.panTo([lng, lat])
    }
  }, [geofenceConfig.warehouse_lat, geofenceConfig.warehouse_lng, mapLoaded])

  // Custom Push States
  const [customPushTitle, setCustomPushTitle] = useState('')
  const [customPushMsg, setCustomPushMsg] = useState('')
  const [isSendingCustomPush, setIsSendingCustomPush] = useState(false)
  const [offersList, setOffersList] = useState([])
  const [selectedOfferId, setSelectedOfferId] = useState('')

  const handleAddressSearch = async (query) => {
    if (!query) return
    setSearching(true)
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`)
      const data = await response.json()
      setSearchResults(data)
      if (data.length === 0) {
        toast.error("No locations found for this search query")
      }
    } catch (error) {
      console.error("Error searching address:", error)
      toast.error("Failed to search location")
    } finally {
      setSearching(false)
    }
  }

  const handleSendCustomPush = async () => {
    if (!customPushTitle.trim() || !customPushMsg.trim()) {
      toast.error('Title and Message are required!')
      return
    }

    setIsSendingCustomPush(true)
    addLog(`Sending custom push notification: "${customPushTitle.trim()}"...`, 'info')
    const toastId = toast.loading('Sending custom push notification...')

    try {
      const offer = offersList.find(o => o.id === selectedOfferId)
      const payload = {
        title: customPushTitle.trim(),
        message: customPushMsg.trim(),
        type: offer ? 'promo' : 'general',
        broadcast: true,
        data: offer ? {
          offer_id: offer.id,
          offer_type: offer.offer_type,
          category_slug: offer.category_slug || null,
          coupon_code: offer.coupon_code || null,
          url: offer.offer_type === 'banner' && offer.category_slug
            ? `https://ozomart.store/category/${offer.category_slug}`
            : 'https://ozomart.store/offers'
        } : {}
      }

      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: payload
      })

      if (error) {
        let errMsg = error.message
        if (error.context && typeof error.context.text === 'function') {
          try {
            const bodyText = await error.context.text()
            const parsed = JSON.parse(bodyText)
            if (parsed.error) errMsg = parsed.error
          } catch (_) {}
        }
        throw new Error(errMsg)
      }

      toast.success('Custom push notification broadcasted successfully!', { id: toastId })
      addLog(`Custom push notification broadcasted successfully.`, 'success')
      setCustomPushTitle('')
      setCustomPushMsg('')
      setSelectedOfferId('')
    } catch (err) {
      console.error('[PUSH] Failed to send custom notification:', err)
      toast.error(err.message || 'Failed to send custom notification!', { id: toastId })
      addLog(`Failed to send custom notification: ${err.message}`, 'error')
    } finally {
      setIsSendingCustomPush(false)
    }
  }

  const addLog = (message, type = 'info') => {
    const time = new Date().toLocaleTimeString()
    setLogs(prev => [`[${time}] [${type.toUpperCase()}] ${message}`, ...prev.slice(0, 19)])
  }

  const handleChangeAdminPassword = async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('All fields are required')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    setUpdatingPassword(true)
    try {
      const { data, error } = await supabase.rpc('change_admin_password', {
        current_password: currentPassword,
        new_password: newPassword
      })
      if (error) throw error
      toast.success('Admin password updated successfully')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      console.error('[Admin Settings]: Failed to change password', err)
      toast.error(err.message || 'Failed to change admin password')
    } finally {
      setUpdatingPassword(false)
    }
  }

  const fetchSettings = async () => {
    setLoading(true)
    addLog('Fetching system settings from database...', 'info')
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')

      if (error) throw error

      if (data) {
        // Set defaults
        let delivery = {
          base_fee: 30,
          free_above: 99,
          surge_multiplier: 1,
          distance_charge_enabled: false,
          charge_per_km: 10,
          free_distance: 3,
          store_lat: 24.752871,
          store_lng: 84.3738
        }
        let order = {
          min_order_value: 99,
          max_items_per_order: 50,
          pre_order_lead_hours: 4
        }
        let platform = {
          platform_fee: 2,
          charity_enabled: true,
          charity_amount: 10,
          charity_name: 'Local Feeding Programs',
          global_commission_pct: 24
        }
        let shg = {
          enabled: true
        }
        let rider = {
          base_payout: 10,
          distance_bonus_per_km: 5,
          max_cash_limit: 2000
        }
        let geofence = {
          strict_enforcement: true,
          warehouse_lat: 24.754622,
          warehouse_lng: 84.375011,
          max_radius_km: 1.5
        }
        let security = {
          max_sessions_per_user: 2
        }
        let mapConfigObj = {
          hide_map: false,
          hide_mart_pickup: false
        }
        let launch = {
          launch_mode_enabled: true,
          show_out_of_stock_btn: true,
          show_listing_soon_btn: true,
          show_mandi_section: true,
          show_budget_section: true
        }
        let serviceHours = {
          enabled: true,
          start_time: '06:00',
          end_time: '21:00',
          prevent_checkout: false,
          banner_text: '',
          checkout_text: ''
        }
        let payment = {
          cashfree_enabled: true,
          razorpay_enabled: false,
          cod_enabled: true
        }
        let mandiSync = {
          api_key: '579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b',
          state: 'Bihar',
          district: 'Gaya',
          market: 'Tekari APMC',
          markup_percent: 25,
          mrp_markup_percent: 50,
          auto_sync: true,
          mappings: {}
        }
        let imageTool = {
          download_url: ''
        }

        data.forEach(item => {
          switch (item.key) {
            case 'delivery_config':
              delivery = { ...delivery, ...item.value }
              addLog('Delivery configuration loaded successfully.', 'success')
              break
            case 'order_config':
              order = { ...order, ...item.value }
              addLog('Order validation configuration loaded successfully.', 'success')
              break
            case 'platform_config':
              platform = { ...platform, ...item.value }
              addLog('Platform fee & donation configuration loaded successfully.', 'success')
              break
            case 'shg_config':
            case 'bigbasket_config':
              shg = { ...shg, ...item.value }
              addLog('Local SHG Vendor Network configuration loaded successfully.', 'success')
              break
            case 'rider_config':
              rider = { ...rider, ...item.value }
              addLog('OZO Captain fleet configuration loaded successfully.', 'success')
              break
            case 'geofence_config':
              geofence = { ...geofence, ...item.value }
              addLog('Geofence & warehouse coordinates loaded successfully.', 'success')
              break
            case 'security_config':
              security = { ...security, ...item.value }
              addLog('Security & session limit configuration loaded successfully.', 'success')
              break
            case 'map_config':
              mapConfigObj = { ...mapConfigObj, ...item.value }
              addLog('Map visibility configuration loaded successfully.', 'success')
              break
            case 'launch_config':
              launch = { ...launch, ...item.value }
              addLog('Launch phase & button visibility configuration loaded successfully.', 'success')
              break
            case 'service_hours_config':
              serviceHours = { ...serviceHours, ...item.value }
              addLog('Service hours & delivery configuration loaded successfully.', 'success')
              break
            case 'payment_config':
              payment = { ...payment, ...item.value }
              addLog('Payment gateways configuration loaded successfully.', 'success')
              break
            case 'mandi_sync_config':
              mandiSync = { ...mandiSync, ...item.value }
              addLog('Mandi synchronization configuration loaded successfully.', 'success')
              break
            case 'image_tool_config':
              imageTool = { ...imageTool, ...item.value }
              addLog('Image Resolver tool configuration loaded successfully.', 'success')
              break
            default:
              addLog(`Unknown configuration key: ${item.key}`, 'warning')
          }
        })

        setDeliveryConfig(delivery)
        setOrderConfig(order)
        setPlatformConfig(platform)
        setShgConfig(shg)
        setRiderConfig(rider)
        setGeofenceConfig(geofence)
        setSecurityConfig(security)
        setMapConfig(mapConfigObj)
        setLaunchConfig(launch)
        setServiceHoursConfig(serviceHours)
        setPaymentConfig(payment)
        setMandiSyncConfig(mandiSync)
        setImageToolConfig(imageTool)
      }

      // Load active offers list for notification dropdown
      const { data: offersData, error: offersError } = await supabase
        .from('offers')
        .select('id, title, description, tagline, coupon_code, offer_type, category_slug, is_active')
        .eq('is_active', true)
        .order('display_order', { ascending: true })

      if (!offersError && offersData) {
        setOffersList(offersData)
      }
    } catch (err) {
      console.error('Error fetching settings:', err)
      addLog(`Failed to fetch settings: ${err.message}`, 'error')
      toast.error('Failed to load system settings')
    } finally {
      setLoading(false)
    }
  }

  const fetchVegetableProducts = async () => {
    setProductsLoading(true)
    try {
      // Fetch vegetable categories (Vegetables itself and its children)
      const { data: categories, error: catError } = await supabase
        .from('categories')
        .select('id, name')
        .or('id.eq.e3516d99-71e7-4e89-b3b5-75b1d2704101,parent_id.eq.e3516d99-71e7-4e89-b3b5-75b1d2704101')

      if (catError) throw catError

      if (categories && categories.length > 0) {
        const catIds = categories.map(c => c.id)
        const { data: prods, error: prodError } = await supabase
          .from('products')
          .select('id, name, slug, unit, price, mrp, base_price, base_mrp, category_id, last_price_updated')
          .in('category_id', catIds)
          .order('name', { ascending: true })

        if (prodError) throw prodError
        setVegetableProducts(prods || [])
      }
    } catch (err) {
      console.error('Error fetching vegetable products:', err)
      toast.error('Failed to load vegetable products for mapper')
    } finally {
      setProductsLoading(false)
    }
  }

  const triggerMandiSync = async (isTest = false) => {
    setSyncLoading(true)
    setDryRunLog(null)
    addLog(`Initiating Mandi Price Synchronization (${isTest ? 'Dry Run' : 'Live Sync'})...`, 'info')
    try {
      const response = await fetch(`/api/mandi-sync${isTest ? '?test=true' : ''}`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer OzoSecret123!',
          'Content-Type': 'application/json'
        }
      })
      const result = await response.json()
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Sync request failed')
      }

      if (isTest) {
        setDryRunLog(result)
        addLog(`Dry-run sync complete. ${result.summary?.updated || 0} products matched.`, 'success')
        toast.success(`Dry run completed! Matched ${result.summary?.updated || 0} products.`)
      } else {
        addLog(`Mandi synchronization complete. Status: ${result.status.toUpperCase()}.`, 'success')
        toast.success(`Mandi price sync completed successfully!`)
        // Refresh settings to get updated last run details
        await fetchSettings()
        // Refresh vegetable products to see updated price/MRP in mapping table
        await fetchVegetableProducts()
      }
    } catch (err) {
      console.error('Mandi sync execution failed:', err)
      addLog(`Mandi sync execution failed: ${err.message}`, 'error')
      toast.error(`Mandi sync failed: ${err.message}`)
    } finally {
      setSyncLoading(false)
    }
  }

  const handleMappingChange = (slug, field, value) => {
    setMandiSyncConfig(prev => {
      const currentMapping = prev.mappings[slug] || { commodity: '', variety: '' }
      
      let processedValue = value
      if (field === 'weight_override') {
        processedValue = value === '' ? undefined : parseFloat(value)
      }

      const updatedMappings = {
        ...prev.mappings,
        [slug]: {
          ...currentMapping,
          [field]: processedValue
        }
      }

      // Cleanup empty mapping values
      if (!updatedMappings[slug].commodity && !updatedMappings[slug].variety && updatedMappings[slug].weight_override === undefined) {
        delete updatedMappings[slug]
      }

      return {
        ...prev,
        mappings: updatedMappings
      }
    })
  }

  const exportMappings = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(mandiSyncConfig.mappings, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href",     dataStr);
    downloadAnchor.setAttribute("download", "mandi_mappings.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success("Mappings exported successfully!");
  }

  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split('\n');
      const newMappings = { ...mandiSyncConfig.mappings };
      let importedCount = 0;
      
      lines.forEach((line, index) => {
        // Skip header or empty lines
        if (index === 0 && line.toLowerCase().includes('slug')) return;
        if (!line.trim()) return;
        
        const parts = line.split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
        if (parts.length >= 2) {
          const slug = parts[0];
          const commodity = parts[1];
          const variety = parts[2] || '';
          const weightOverride = parts[3] ? parseFloat(parts[3]) : undefined;
          
          if (slug && commodity) {
            newMappings[slug] = {
              commodity,
              variety,
              weight_override: isNaN(weightOverride) ? undefined : weightOverride
            };
            importedCount++;
          }
        }
      });
      
      setMandiSyncConfig(prev => ({
        ...prev,
        mappings: newMappings
      }));
      toast.success(`Imported ${importedCount} mappings successfully!`);
    };
    reader.readAsText(file);
    e.target.value = null; // reset
  }

  const autoMapCommodities = () => {
    addLog('Auto-generating commodity mappings based on vegetable product names...', 'info')
    let generatedCount = 0
    const updatedMappings = { ...mandiSyncConfig.mappings }

    vegetableProducts.forEach(product => {
      const nameLower = product.name.toLowerCase()
      
      let commodity = ''
      let variety = 'Local'
      
      if (nameLower.includes('potato') || nameLower.includes('aloo')) {
        commodity = 'Potato'
      } else if (nameLower.includes('onion') || nameLower.includes('pyaz')) {
        commodity = 'Onion'
      } else if (nameLower.includes('tomato') || nameLower.includes('tamatar')) {
        commodity = 'Tomato'
      } else if (nameLower.includes('ginger') || nameLower.includes('adrak')) {
        commodity = 'Ginger'
        variety = 'Green'
      } else if (nameLower.includes('garlic') || nameLower.includes('lehsun')) {
        commodity = 'Garlic'
      } else if (nameLower.includes('lemon') || nameLower.includes('nimbu')) {
        commodity = 'Lemon'
      } else if (nameLower.includes('carrot') || nameLower.includes('gajar')) {
        commodity = 'Carrot'
      } else if (nameLower.includes('beetroot') || nameLower.includes('chukandar')) {
        commodity = 'Beetroot'
      } else if (nameLower.includes('cabbage') || nameLower.includes('gobhi')) {
        commodity = 'Cabbage'
      } else if (nameLower.includes('spinach') || nameLower.includes('palak')) {
        commodity = 'Spinach'
      } else if (nameLower.includes('coriander') || nameLower.includes('dhaniya')) {
        commodity = 'Coriander'
      } else if (nameLower.includes('mint') || nameLower.includes('pudina')) {
        commodity = 'Mint'
      } else if (nameLower.includes('bitter gourd') || nameLower.includes('karela')) {
        commodity = 'Bitter Gourd'
      } else if (nameLower.includes('brinjal') || nameLower.includes('baingan')) {
        commodity = 'Brinjal'
      } else if (nameLower.includes('cucumber') || nameLower.includes('kheera')) {
        commodity = 'Cucumber'
      } else if (nameLower.includes('chilli') || nameLower.includes('mirch')) {
        commodity = 'Green Chilly'
      } else if (nameLower.includes('corn') || nameLower.includes('bhutta')) {
        commodity = 'Sweet Corn'
      } else if (nameLower.includes('capsicum') || nameLower.includes('shimla')) {
        commodity = 'Capsicum'
      } else if (nameLower.includes('radish') || nameLower.includes('mooli')) {
        commodity = 'Radish'
      } else if (nameLower.includes('turnip') || nameLower.includes('shalgam')) {
        commodity = 'Turnip'
      }

      if (commodity && (!updatedMappings[product.slug] || !updatedMappings[product.slug].commodity)) {
        updatedMappings[product.slug] = {
          ...updatedMappings[product.slug],
          commodity,
          variety
        }
        generatedCount++
      }
    })

    setMandiSyncConfig(prev => ({
      ...prev,
      mappings: updatedMappings
    }))
    
    addLog(`Auto-mapped ${generatedCount} vegetable products. Click 'Save Configuration' to persist changes.`, 'success')
    toast.success(`Auto-mapped ${generatedCount} products! Save changes to persist.`)
  }

  useEffect(() => {
    fetchSettings()
    fetchVegetableProducts()
    fetchHierarchicalData()
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    addLog('Initiating transaction save for configurations...', 'info')

    try {
      // 1. Save delivery configuration
      addLog('Updating delivery_config...', 'info')
      const { error: err1 } = await supabase
        .from('app_settings')
        .upsert({
          key: 'delivery_config',
          value: {
            base_fee: parseFloat(deliveryConfig.base_fee) || 0,
            free_above: parseFloat(deliveryConfig.free_above) || 0,
            surge_multiplier: parseFloat(deliveryConfig.surge_multiplier) || 1,
            distance_charge_enabled: !!deliveryConfig.distance_charge_enabled,
            charge_per_km: parseFloat(deliveryConfig.charge_per_km) || 0,
            free_distance: parseFloat(deliveryConfig.free_distance) || 0,
            store_lat: parseFloat(deliveryConfig.store_lat) || 24.752871,
            store_lng: parseFloat(deliveryConfig.store_lng) || 84.3738
          },
          description: 'Configuration for delivery charges'
        })
      if (err1) throw err1
      addLog('delivery_config updated successfully.', 'success')

      // 2. Save order configuration
      addLog('Updating order_config...', 'info')
      const { error: err2 } = await supabase
        .from('app_settings')
        .upsert({
          key: 'order_config',
          value: {
            min_order_value: parseFloat(orderConfig.min_order_value) || 0,
            max_items_per_order: parseInt(orderConfig.max_items_per_order) || 50,
            pre_order_lead_hours: parseFloat(orderConfig.pre_order_lead_hours) || 0
          },
          description: 'Global order constraints'
        })
      if (err2) throw err2
      addLog('order_config updated successfully.', 'success')

      // 3. Save platform configuration
      addLog('Updating platform_config...', 'info')
      const { error: err3 } = await supabase
        .from('app_settings')
        .upsert({
          key: 'platform_config',
          value: {
            platform_fee: parseFloat(platformConfig.platform_fee) || 0,
            charity_enabled: !!platformConfig.charity_enabled,
            charity_amount: parseFloat(platformConfig.charity_amount) || 10,
            charity_name: platformConfig.charity_name || 'Local Feeding Programs',
            global_commission_pct: parseFloat(platformConfig.global_commission_pct) || 0
          },
          description: 'Platform level configurations'
        })
      if (err3) throw err3
      addLog('platform_config updated successfully.', 'success')

      // 4. Save Local SHG config + update legacy bigbasket_config
      addLog('Updating shg_config...', 'info')
      const { error: err4 } = await supabase
        .from('app_settings')
        .upsert([
          {
            key: 'shg_config',
            value: { enabled: shgConfig.enabled },
            description: 'Toggle showing or hiding Local SHG Vendor products'
          },
          {
            key: 'bigbasket_config',
            value: { enabled: shgConfig.enabled },
            description: 'Toggle showing or hiding BigBasket products (legacy)'
          }
        ])
      if (err4) throw err4
      addLog('shg_config updated successfully.', 'success')

      // Side effect: update only explicitly tagged SHG/vendor products
      // NOTE: Do NOT use mart_id.is.null here — that would override is_available
      // on ALL regular products that happen to have no mart_id assigned.
      addLog(`Updating availability of SHG Vendor products to: ${shgConfig.enabled}...`, 'info')
      const { error: prodErr } = await supabase
        .from('products')
        .update({ is_available: shgConfig.enabled })
        .or('tags.cs.{"shg"},tags.cs.{"shg_vendor"},tags.cs.{"vendor"},tags.cs.{"bigbasket"}')

      if (prodErr) {
        addLog(`SHG product update warning: ${prodErr.message}`, 'warning')
      } else {
        addLog('Successfully synchronized Local SHG Vendor product statuses.', 'success')
      }

      // 5. Save Rider configuration
      addLog('Updating rider_config...', 'info')
      const { error: errRider } = await supabase
        .from('app_settings')
        .upsert({
          key: 'rider_config',
          value: {
            base_payout: parseFloat(riderConfig.base_payout) || 0,
            distance_bonus_per_km: parseFloat(riderConfig.distance_bonus_per_km) || 0,
            max_cash_limit: parseFloat(riderConfig.max_cash_limit) || 0
          },
          description: 'Fleet and payout configuration for OZO Captains'
        })
      if (errRider) throw errRider
      addLog('rider_config updated successfully.', 'success')

      // 6. Save Geofence configuration
      addLog('Updating geofence_config...', 'info')
      const { error: errGeofence } = await supabase
        .from('app_settings')
        .upsert({
          key: 'geofence_config',
          value: {
            strict_enforcement: !!geofenceConfig.strict_enforcement,
            warehouse_lat: parseFloat(geofenceConfig.warehouse_lat) || 24.754622,
            warehouse_lng: parseFloat(geofenceConfig.warehouse_lng) || 84.375011,
            max_radius_km: parseFloat(geofenceConfig.max_radius_km) || 1.5
          },
          description: 'Geofencing rules and central coordinates'
        })
      if (errGeofence) throw errGeofence
      addLog('geofence_config updated successfully.', 'success')

      // 7. Save Security configuration
      addLog('Updating security_config...', 'info')
      const { error: errSecurity } = await supabase
        .from('app_settings')
        .upsert({
          key: 'security_config',
          value: {
            max_sessions_per_user: parseInt(securityConfig.max_sessions_per_user) || 2
          },
          description: 'Security and session limit configurations'
        })
      if (errSecurity) throw errSecurity
      addLog('security_config updated successfully.', 'success')

      // 8. Save Map visibility configuration
      addLog('Updating map_config...', 'info')
      const { error: errMap } = await supabase
        .from('app_settings')
        .upsert({
          key: 'map_config',
          value: {
            hide_map: !!mapConfig.hide_map,
            hide_mart_pickup: !!mapConfig.hide_mart_pickup
          },
          description: 'Toggle hiding the interactive map system across the frontend app'
        })
      if (errMap) throw errMap
      addLog('map_config updated successfully.', 'success')

      // 9. Save Launch configuration
      addLog('Updating launch_config...', 'info')
      const { error: errLaunch } = await supabase
        .from('app_settings')
        .upsert({
          key: 'launch_config',
          value: {
            launch_mode_enabled: !!launchConfig.launch_mode_enabled,
            show_out_of_stock_btn: !!launchConfig.show_out_of_stock_btn,
            show_listing_soon_btn: !!launchConfig.show_listing_soon_btn,
            show_mandi_section: !!launchConfig.show_mandi_section,
            show_budget_section: !!launchConfig.show_budget_section
          },
          description: 'Toggle converting out of stock products to Listing Soon, and control button visibility'
        })
      if (errLaunch) throw errLaunch
      addLog('launch_config updated successfully.', 'success')

      // 10. Save Service Hours configuration
      addLog('Updating service_hours_config...', 'info')
      const { error: errServiceHours } = await supabase
        .from('app_settings')
        .upsert({
          key: 'service_hours_config',
          value: {
            enabled: !!serviceHoursConfig.enabled,
            start_time: serviceHoursConfig.start_time || '06:00',
            end_time: serviceHoursConfig.end_time || '21:00',
            prevent_checkout: !!serviceHoursConfig.prevent_checkout,
            banner_text: serviceHoursConfig.banner_text || '',
            checkout_text: serviceHoursConfig.checkout_text || ''
          },
          description: 'Delivery service hours and notification configs'
        })
      if (errServiceHours) throw errServiceHours
      addLog('service_hours_config updated successfully.', 'success')

      // 11. Save Payment configuration
      addLog('Updating payment_config...', 'info')
      const { error: errPayment } = await supabase
        .from('app_settings')
        .upsert({
          key: 'payment_config',
          value: {
            cashfree_enabled: !!paymentConfig.cashfree_enabled,
            razorpay_enabled: !!paymentConfig.razorpay_enabled,
            cod_enabled: !!paymentConfig.cod_enabled
          },
          description: 'Payment gateway status and configurations'
        })
      if (errPayment) throw errPayment
      addLog('payment_config updated successfully.', 'success')

      // 12. Save Mandi Sync configuration
      addLog('Updating mandi_sync_config...', 'info')
      const { error: errMandi } = await supabase
        .from('app_settings')
        .upsert({
          key: 'mandi_sync_config',
          value: {
            api_key: mandiSyncConfig.api_key || '',
            state: mandiSyncConfig.state || '',
            district: mandiSyncConfig.district || '',
            market: mandiSyncConfig.market || '',
            markup_percent: parseFloat(mandiSyncConfig.markup_percent) || 0,
            mrp_markup_percent: parseFloat(mandiSyncConfig.mrp_markup_percent) || 0,
            auto_sync: !!mandiSyncConfig.auto_sync,
            mappings: mandiSyncConfig.mappings || {},
            last_run: mandiSyncConfig.last_run
          },
          description: 'Configuration for Daily Vegetable Price Synchronization via Mandi API'
        })
      if (errMandi) throw errMandi
      addLog('mandi_sync_config updated successfully.', 'success')

      // 13. Save Image Tool configuration
      addLog('Updating image_tool_config...', 'info')
      const { error: errImageTool } = await supabase
        .from('app_settings')
        .upsert({
          key: 'image_tool_config',
          value: {
            download_url: imageToolConfig.download_url
          },
          description: 'Download link configuration for the Localhost Product Image Tool'
        })
      if (errImageTool) throw errImageTool
      addLog('image_tool_config updated successfully.', 'success')

      // Reload settings & trigger success
      await fetchSettings()
      try {
        await useCartStore.getState().fetchSettings()
      } catch (storeErr) {
        console.error('Failed to sync cart store settings:', storeErr)
      }
      toast.success('System configurations updated successfully!')
      addLog('Transaction complete. All systems operating normally.', 'success')
    } catch (err) {
      console.error('Error saving settings:', err)
      addLog(`Save transaction failed: ${err.message}`, 'error')
      toast.error(`Error saving settings: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0 }
  }

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="p-8 bg-gradient-ozo text-white rounded-[2rem] shadow-premium relative overflow-hidden">
        <div className="absolute right-0 bottom-0 top-0 opacity-10 flex items-center justify-center pointer-events-none">
          <Settings className="w-80 h-80 rotate-12 translate-x-12 translate-y-12" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="bg-white/20 text-white font-bold text-xs uppercase tracking-widest px-3 py-1 rounded-full">
              System Settings
            </span>
            <h1 className="text-3xl font-black mt-4 leading-tight">
              App Configuration Panel
            </h1>
            <p className="mt-2 text-white/85 text-sm font-medium">
              Manage global checkout constraints, delivery rates, fee structures, and database integration toggles.
            </p>
          </div>
          <button
            onClick={fetchSettings}
            disabled={loading}
            type="button"
            className="flex items-center gap-2 bg-white/20 backdrop-blur-md border border-white/30 text-white px-5 py-3 rounded-2xl font-bold hover:bg-white/30 active:scale-95 transition-all self-start md:self-center disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Config
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 border-4 border-ozo-red border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-500 font-bold dark:text-gray-400">Loading system settings...</p>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-8">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
          >
            {/* Delivery Charge Card */}
            <motion.div
              variants={cardVariants}
              className="bg-white dark:bg-[#1a1a1a] rounded-[2rem] p-6 border border-gray-100 dark:border-white/5 shadow-premium flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-emerald-100 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                    <Truck className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-gray-800 dark:text-white">Delivery Charges</h2>
                    <p className="text-xs text-gray-400">Configure shipping fees and thresholds</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-400 uppercase mb-2">
                      Base Delivery Fee (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                      <input
                        type="number"
                        min="0"
                        value={deliveryConfig.base_fee}
                        onChange={e => setDeliveryConfig({ ...deliveryConfig, base_fee: parseFloat(e.target.value) || 0 })}
                        className="pl-8 pr-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-ozo-red text-sm font-semibold"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-400 uppercase mb-2">
                      Free Delivery Threshold (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                      <input
                        type="number"
                        min="0"
                        value={deliveryConfig.free_above}
                        onChange={e => setDeliveryConfig({ ...deliveryConfig, free_above: parseFloat(e.target.value) || 0 })}
                        className="pl-8 pr-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-ozo-red text-sm font-semibold"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-xs font-bold text-gray-400 dark:text-gray-400 uppercase">
                        Surge Pricing Multiplier
                      </label>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        deliveryConfig.surge_multiplier > 1.2 
                          ? 'bg-red-100 dark:bg-red-950/20 text-red-650'
                          : deliveryConfig.surge_multiplier > 1.0
                            ? 'bg-amber-100 dark:bg-amber-950/20 text-amber-650'
                            : 'bg-green-100 dark:bg-green-950/20 text-green-650'
                      }`}>
                        {deliveryConfig.surge_multiplier}x Multiplier
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1.0"
                      max="3.0"
                      step="0.1"
                      value={deliveryConfig.surge_multiplier}
                      onChange={e => setDeliveryConfig({ ...deliveryConfig, surge_multiplier: parseFloat(e.target.value) })}
                      className="w-full h-2 bg-gray-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-ozo-red"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">Multiplies the shipping fee during high-demand or bad weather periods.</p>
                  </div>

                  <div className="pt-4 border-t border-gray-150 dark:border-white/5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-gray-800 dark:text-white">Distance-based Charges</p>
                        <p className="text-[10px] text-gray-400">Add distance charges computed from store location.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={!!deliveryConfig.distance_charge_enabled}
                          onChange={e => setDeliveryConfig({ ...deliveryConfig, distance_charge_enabled: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-white/10 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-500"></div>
                      </label>
                    </div>

                    {deliveryConfig.distance_charge_enabled && (
                      <div className="space-y-4 pt-2 overflow-hidden">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase mb-1">
                              Charge/km (₹)
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={deliveryConfig.charge_per_km}
                              onChange={e => setDeliveryConfig({ ...deliveryConfig, charge_per_km: parseFloat(e.target.value) || 0 })}
                              className="px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-ozo-red text-sm font-semibold"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase mb-1">
                              Free distance (km)
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={deliveryConfig.free_distance}
                              onChange={e => setDeliveryConfig({ ...deliveryConfig, free_distance: parseFloat(e.target.value) || 0 })}
                              className="px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-ozo-red text-sm font-semibold"
                            />
                          </div>
                        </div>

                        <div className="p-3.5 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-xl text-[11px] font-semibold border border-blue-100 dark:border-blue-950/30 flex items-start gap-2.5">
                          <Info className="w-4 h-4 mt-0.5 shrink-0" />
                          <span>
                            Delivery coordinates are automatically synced with the <strong>Mart Center Location</strong> set on the geofence map below.
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Global Order Constraints */}
            <motion.div
              variants={cardVariants}
              className="bg-white dark:bg-[#1a1a1a] rounded-[2rem] p-6 border border-gray-100 dark:border-white/5 shadow-premium flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-purple-100 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 rounded-2xl">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-gray-800 dark:text-white">Order Constraints</h2>
                    <p className="text-xs text-gray-400">Configure global checkout rules</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-400 uppercase mb-2">
                      Minimum Order Value (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                      <input
                        type="number"
                        min="0"
                        value={orderConfig.min_order_value}
                        onChange={e => setOrderConfig({ ...orderConfig, min_order_value: parseFloat(e.target.value) || 0 })}
                        className="pl-8 pr-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-ozo-red text-sm font-semibold"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-400 uppercase mb-2">
                      Max Items per Order
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={orderConfig.max_items_per_order}
                      onChange={e => setOrderConfig({ ...orderConfig, max_items_per_order: parseInt(e.target.value) || 50 })}
                      className="px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-ozo-red text-sm font-semibold"
                      required
                    />
                    <p className="text-[10px] text-gray-400 mt-1">Prevents bulk abuse of order checkout by limiting unique items.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-400 uppercase mb-2">
                      Batch-Order Preloading Time (Hours)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={orderConfig.pre_order_lead_hours}
                      onChange={e => setOrderConfig({ ...orderConfig, pre_order_lead_hours: parseFloat(e.target.value) || 0 })}
                      className="px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-ozo-red text-sm font-semibold"
                      required
                    />
                    <p className="text-[10px] text-gray-400 mt-1">Lead time in hours required before delivery slot for local organic batches.</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Platform Fees & Margins */}
            <motion.div
              variants={cardVariants}
              className="bg-white dark:bg-[#1a1a1a] rounded-[2rem] p-6 border border-gray-100 dark:border-white/5 shadow-premium flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-blue-100 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-2xl">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-gray-800 dark:text-white">Platform Fees & Margins</h2>
                    <p className="text-xs text-gray-400">Manage taxes, platform commission, & charity settings</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-400 uppercase mb-2">
                      Handling / Platform Fee (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                      <input
                        type="number"
                        min="0"
                        value={platformConfig.platform_fee}
                        onChange={e => setPlatformConfig({ ...platformConfig, platform_fee: parseFloat(e.target.value) || 0 })}
                        className="pl-8 pr-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-ozo-red text-sm font-semibold"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-xs font-bold text-gray-400 dark:text-gray-400 uppercase">
                        Global Platform Commission (%)
                      </label>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 dark:bg-orange-950/20 text-orange-650">
                        {platformConfig.global_commission_pct}% Cut
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={platformConfig.global_commission_pct}
                        onChange={e => setPlatformConfig({ ...platformConfig, global_commission_pct: parseFloat(e.target.value) || 0 })}
                        className="w-full h-2 bg-gray-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-ozo-red"
                      />
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={platformConfig.global_commission_pct}
                        onChange={e => setPlatformConfig({ ...platformConfig, global_commission_pct: parseFloat(e.target.value) || 0 })}
                        className="w-20 px-2 py-1 text-center bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-1 focus:ring-ozo-red text-xs font-bold"
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">Standard commission cut charged to third-party merchant partners.</p>
                    <div className="mt-3 p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-150 dark:border-white/5 space-y-1.5">
                      <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Payout Breakdown Example (For ₹1,000 Sales)</div>
                      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 font-medium">
                        <span>Gross: <strong className="text-gray-900 dark:text-white">₹1,000</strong></span>
                        <span>-</span>
                        <span>Commission ({platformConfig.global_commission_pct}%): <strong className="text-red-500">₹{(1000 * (platformConfig.global_commission_pct / 100)).toFixed(2)}</strong></span>
                        <span>=</span>
                        <span>Mart Payout: <strong className="text-emerald-600 dark:text-[#00FF66]">₹{(1000 * (1 - platformConfig.global_commission_pct / 100)).toFixed(2)}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 text-blue-500">
                        <Info className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-800 dark:text-white">Charity Option at Checkout</p>
                        <p className="text-[10px] text-gray-400">Ask clients for small donations for charity at checkout.</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={platformConfig.charity_enabled}
                        onChange={e => setPlatformConfig({ ...platformConfig, charity_enabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-white/10 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>

                  {platformConfig.charity_enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-4 bg-gray-50/50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 rounded-2xl">
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 text-left">
                          Charity Name / Cause Description
                        </label>
                        <input
                          type="text"
                          value={platformConfig.charity_name || ''}
                          onChange={e => setPlatformConfig({ ...platformConfig, charity_name: e.target.value })}
                          placeholder="e.g. Local Feeding Programs"
                          className="w-full px-4 py-2.5 bg-white dark:bg-white/5 border border-gray-105 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-bold text-xs text-gray-800 dark:text-white text-left"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 text-left">
                          Fixed Donation Amount (₹)
                        </label>
                        <input
                          type="number"
                          value={platformConfig.charity_amount || ''}
                          onChange={e => setPlatformConfig({ ...platformConfig, charity_amount: e.target.value ? parseFloat(e.target.value) : 0 })}
                          placeholder="e.g. 10"
                          className="w-full px-4 py-2.5 bg-white dark:bg-white/5 border border-gray-105 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-bold text-xs text-gray-800 dark:text-white text-left"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Payment Gateways Card */}
            <motion.div
              variants={cardVariants}
              className="bg-white dark:bg-[#1a1a1a] rounded-[2rem] p-6 border border-gray-100 dark:border-white/5 shadow-premium flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-blue-100 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-2xl">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-gray-800 dark:text-white">Payment Gateways</h2>
                    <p className="text-xs text-gray-400">Toggle customer checkout payment methods</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Cashfree Toggle */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                    <div>
                      <p className="text-sm font-bold text-gray-800 dark:text-white">Cashfree Secure Payments</p>
                      <p className="text-[10px] text-gray-400">Allow UPI, Cards, and Netbanking via Cashfree Gateway.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={!!paymentConfig.cashfree_enabled}
                        onChange={e => setPaymentConfig({ ...paymentConfig, cashfree_enabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-white/10 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>

                  {/* Razorpay Toggle */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                    <div>
                      <p className="text-sm font-bold text-gray-800 dark:text-white">Razorpay Payments (Backup)</p>
                      <p className="text-[10px] text-gray-400">Allow UPI, Cards, and Netbanking via Razorpay Gateway.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={!!paymentConfig.razorpay_enabled}
                        onChange={e => setPaymentConfig({ ...paymentConfig, razorpay_enabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-white/10 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>

                  {/* Cash on Delivery Toggle */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                    <div>
                      <p className="text-sm font-bold text-gray-800 dark:text-white">Cash on Delivery (COD)</p>
                      <p className="text-[10px] text-gray-400">Allow Cash on Delivery at customer checkout.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={paymentConfig.cod_enabled !== false}
                        onChange={e => setPaymentConfig({ ...paymentConfig, cod_enabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-white/10 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Local SHG Vendor Network Card */}
            <motion.div
              variants={cardVariants}
              className="bg-white dark:bg-[#1a1a1a] rounded-[2rem] p-6 border border-gray-100 dark:border-white/5 shadow-premium flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-purple-100 dark:bg-purple-950/20 text-purple-650 rounded-2xl">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-gray-800 dark:text-white">Local SHG Vendor Network</h2>
                    <p className="text-xs text-gray-400">Manage local self-help group listings</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-gray-800 dark:text-white">Self-Help Group Portal Sync</p>
                        <p className="text-[10px] text-gray-400">Toggle showing or hiding third-party vendor products. If OFF, only in-house organic inventory is shown.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={shgConfig.enabled}
                          onChange={e => setShgConfig({ ...shgConfig, enabled: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-white/10 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                      </label>
                    </div>

                    <div className="flex items-start gap-2 text-xs bg-amber-500/5 text-amber-655 p-3 rounded-xl border border-amber-500/10">
                      <Info className="w-4 h-4 flex-shrink-0 mt-0.5 animate-pulse text-amber-550" />
                      <span>
                        <strong>Availability Rules:</strong> Disabling this network will automatically set all third-party items to out-of-stock.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Launch & Notification Settings */}
            <motion.div
              variants={cardVariants}
              className="bg-white dark:bg-[#1a1a1a] rounded-[2rem] p-6 border border-gray-100 dark:border-white/5 shadow-premium flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-rose-100 dark:bg-rose-950/20 text-rose-650 rounded-2xl">
                    <Rocket className="w-6 h-6 text-rose-600 animate-bounce" style={{ animationDuration: '3s' }} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-gray-800 dark:text-white">Launch & Notification Control</h2>
                    <p className="text-xs text-gray-400">Manage launch phase overlays and notify buttons</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 space-y-4">
                    {/* Launch Mode Toggle */}
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/5">
                      <div>
                        <p className="text-sm font-bold text-gray-800 dark:text-white font-display">Global Launch Mode</p>
                        <p className="text-[10px] text-gray-400">Show out-of-stock products as "Listing Soon" during launch phase.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={!!launchConfig.launch_mode_enabled}
                          onChange={e => setLaunchConfig({ ...launchConfig, launch_mode_enabled: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-white/10 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-rose-600"></div>
                      </label>
                    </div>

                    {/* Show OOS Notify Button */}
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/5">
                      <div>
                        <p className="text-sm font-bold text-gray-800 dark:text-white font-display">Out of Stock Notify Button</p>
                        <p className="text-[10px] text-gray-400">Show the "Notify Me" request button for out-of-stock products.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={!!launchConfig.show_out_of_stock_btn}
                          onChange={e => setLaunchConfig({ ...launchConfig, show_out_of_stock_btn: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-white/10 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-rose-600"></div>
                      </label>
                    </div>

                    {/* Show Listing Soon Notify Button */}
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/5">
                      <div>
                        <p className="text-sm font-bold text-gray-800 dark:text-white font-display">Listing Soon Notify Button</p>
                        <p className="text-[10px] text-gray-400">Show the "Request to Get Notification" button for listing soon products.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={!!launchConfig.show_listing_soon_btn}
                          onChange={e => setLaunchConfig({ ...launchConfig, show_listing_soon_btn: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-white/10 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-rose-600"></div>
                      </label>
                    </div>

                    {/* Show Mandi Arrivals Section */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-gray-800 dark:text-white font-display">Show Mandi Arrivals Section</p>
                        <p className="text-[10px] text-gray-400">Toggle visibility of the "Freshly Sourced This Morning" mandi section on the homepage.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={!!launchConfig.show_mandi_section}
                          onChange={e => setLaunchConfig({ ...launchConfig, show_mandi_section: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-white/10 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-rose-600"></div>
                      </label>
                    </div>

                    {/* Show Pocket-Friendly Section */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-gray-800 dark:text-white font-display">Show Pocket-Friendly Section</p>
                        <p className="text-[10px] text-gray-400">Toggle visibility of the "Pocket-Friendly Bites / Under ₹50" section on the homepage.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={!!launchConfig.show_budget_section}
                          onChange={e => setLaunchConfig({ ...launchConfig, show_budget_section: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-white/10 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-rose-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Service Hours & Delivery Limits */}
            <motion.div
              variants={cardVariants}
              className="bg-white dark:bg-[#1a1a1a] rounded-[2rem] p-6 border border-gray-100 dark:border-white/5 shadow-premium flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-indigo-100 dark:bg-indigo-950/20 text-indigo-650 rounded-2xl">
                    <Clock className="w-6 h-6 text-indigo-650" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-gray-800 dark:text-white font-display">Delivery Service Hours</h2>
                    <p className="text-xs text-gray-400">Configure delivery operation window and alerts</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 space-y-4">
                    {/* Enable Service Hours Toggle */}
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/5">
                      <div>
                        <p className="text-sm font-bold text-gray-800 dark:text-white font-display">Enable Service Hours Alert</p>
                        <p className="text-[10px] text-gray-400">Show notification banner & checkout alert when closed.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={!!serviceHoursConfig.enabled}
                          onChange={e => setServiceHoursConfig({ ...serviceHoursConfig, enabled: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-white/10 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>

                    {/* Start Time */}
                    <div>
                      <label className="block text-xs font-bold text-gray-405 dark:text-gray-400 uppercase mb-2">
                        Service Start Time (e.g. 06:00)
                      </label>
                      <input
                        type="time"
                        value={serviceHoursConfig.start_time || '06:00'}
                        onChange={e => setServiceHoursConfig({ ...serviceHoursConfig, start_time: e.target.value })}
                        className="px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-ozo-red text-sm font-semibold"
                        required
                      />
                    </div>

                    {/* End Time */}
                    <div>
                      <label className="block text-xs font-bold text-gray-405 dark:text-gray-400 uppercase mb-2">
                        Service End Time (e.g. 21:00)
                      </label>
                      <input
                        type="time"
                        value={serviceHoursConfig.end_time || '21:00'}
                        onChange={e => setServiceHoursConfig({ ...serviceHoursConfig, end_time: e.target.value })}
                        className="px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-ozo-red text-sm font-semibold"
                        required
                      />
                    </div>

                    {/* Prevent Checkout Switch */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-white/5">
                      <div>
                        <p className="text-sm font-bold text-gray-800 dark:text-white font-display">Block Checkout when Closed</p>
                        <p className="text-[10px] text-gray-400">Strictly block placing orders outside delivery hours.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={!!serviceHoursConfig.prevent_checkout}
                          onChange={e => setServiceHoursConfig({ ...serviceHoursConfig, prevent_checkout: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-white/10 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>

                    {/* Banner Alert Text */}
                    <div>
                      <label className="block text-xs font-bold text-gray-405 dark:text-gray-400 uppercase mb-2">
                        Global Home Page Banner Copy
                      </label>
                      <textarea
                        value={serviceHoursConfig.banner_text || ''}
                        onChange={e => setServiceHoursConfig({ ...serviceHoursConfig, banner_text: e.target.value })}
                        className="px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-ozo-red text-xs font-semibold h-24 resize-y"
                        placeholder="Banner text alert for customers..."
                      />
                    </div>

                    {/* Checkout Alert Copy */}
                    <div>
                      <label className="block text-xs font-bold text-gray-405 dark:text-gray-400 uppercase mb-2">
                        Checkout Warning Modal Copy
                      </label>
                      <textarea
                        value={serviceHoursConfig.checkout_text || ''}
                        onChange={e => setServiceHoursConfig({ ...serviceHoursConfig, checkout_text: e.target.value })}
                        className="px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-ozo-red text-xs font-semibold h-24 resize-y"
                        placeholder="Checkout modal warning text alert..."
                      />
                    </div>

                  </div>
                </div>
              </div>
            </motion.div>

            {/* OZO Captain Fleet Management */}
            <motion.div
              variants={cardVariants}
              className="bg-white dark:bg-[#1a1a1a] rounded-[2rem] p-6 border border-gray-100 dark:border-white/5 shadow-premium flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-cyan-100 dark:bg-cyan-950/20 text-cyan-650 rounded-2xl">
                    <Activity className="w-6 h-6 text-cyan-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-gray-800 dark:text-white">OZO Captain Fleet</h2>
                    <p className="text-xs text-gray-400">Rider payout and cash management</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-400 uppercase mb-2">
                      Rider Base Payout per Order (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                      <input
                        type="number"
                        min="0"
                        value={riderConfig.base_payout}
                        onChange={e => setRiderConfig({ ...riderConfig, base_payout: parseFloat(e.target.value) || 0 })}
                        className="pl-8 pr-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-ozo-red text-sm font-semibold"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-400 uppercase mb-2">
                      Rider Distance Bonus Fee (₹ / per KM)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                      <input
                        type="number"
                        min="0"
                        value={riderConfig.distance_bonus_per_km}
                        onChange={e => setRiderConfig({ ...riderConfig, distance_bonus_per_km: parseFloat(e.target.value) || 0 })}
                        className="pl-8 pr-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-ozo-red text-sm font-semibold"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-400 uppercase mb-2">
                      Maximum Cash-In-Hand Limit (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                      <input
                        type="number"
                        min="0"
                        value={riderConfig.max_cash_limit}
                        onChange={e => setRiderConfig({ ...riderConfig, max_cash_limit: parseFloat(e.target.value) || 0 })}
                        className="pl-8 pr-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-ozo-red text-sm font-semibold"
                        required
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">Automatic fleet block threshold for rider when cash on hand exceeds this limit.</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Security & Sessions Configuration */}
            <motion.div
              variants={cardVariants}
              className="bg-white dark:bg-[#1a1a1a] rounded-[2rem] p-6 border border-gray-100 dark:border-white/5 shadow-premium flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-red-100 dark:bg-red-955/20 text-red-650 rounded-2xl">
                    <Shield className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-gray-800 dark:text-white">Security & Active Sessions</h2>
                    <p className="text-xs text-gray-400">Configure login constraints and device limits</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-400 uppercase mb-2">
                      Max Active Sessions per User
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={securityConfig.max_sessions_per_user}
                      onChange={e => setSecurityConfig({ ...securityConfig, max_sessions_per_user: parseInt(e.target.value) || 2 })}
                      className="px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-ozo-red text-sm font-semibold text-gray-800 dark:text-white"
                      required
                    />
                    <p className="text-[10px] text-gray-400 mt-1">Limits the number of concurrent devices a user can log in with.</p>
                  </div>

                  <div className="p-3.5 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-xl text-[11px] font-semibold border border-amber-100 dark:border-amber-950/30 flex items-start gap-2.5">
                    <Info className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
                    <span>
                      If a user logs in from a new device when they are already at their session limit, the oldest active login session is automatically logged out to prevent account sharing.
                    </span>
                  </div>

                  <div className="border-t border-gray-200 dark:border-white/5 pt-6 mt-6">
                    <h3 className="text-sm font-black text-gray-850 dark:text-white mb-4 uppercase tracking-wider">Change Master Admin Password</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Current Admin Password</label>
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={e => setCurrentPassword(e.target.value)}
                          className="px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-ozo-red text-sm font-semibold text-gray-850 dark:text-white"
                          placeholder="Current Password"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-400 uppercase mb-2">New Admin Password</label>
                          <input
                            type="password"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            className="px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-ozo-red text-sm font-semibold text-gray-850 dark:text-white"
                            placeholder="New Password (min 8 chars)"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Confirm New Password</label>
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            className="px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-ozo-red text-sm font-semibold text-gray-850 dark:text-white"
                            placeholder="Confirm New Password"
                            required
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleChangeAdminPassword}
                        disabled={updatingPassword}
                        className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-ozo-red to-orange-600 hover:shadow-lg hover:shadow-ozo-red/20 active:scale-[0.98] text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {updatingPassword ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          'Update Master Password'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Map System Visibility Configuration */}
            <motion.div
              variants={cardVariants}
              className="bg-white dark:bg-[#1a1a1a] rounded-[2rem] p-6 border border-gray-100 dark:border-white/5 shadow-premium flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-indigo-100 dark:bg-indigo-950/20 text-indigo-650 rounded-2xl">
                    <MapPin className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-gray-800 dark:text-white">Map Visibility Setting</h2>
                    <p className="text-xs text-gray-400">Control map elements across the user application</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Hide Interactive Maps setting */}
                  <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-150 dark:border-white/5 space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-sm font-bold text-gray-800 dark:text-white font-display">Hide Interactive Maps</p>
                        <p className="text-[10px] text-gray-400">Toggle ON to hide MapLibre map pickers, geocoding maps, and boundary visualization for users. The app will fall back to simpler address forms.</p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border transition-all ${
                          mapConfig.hide_map 
                            ? 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400' 
                            : 'bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400'
                        }`}>
                          {mapConfig.hide_map ? 'HIDDEN (ON)' : 'SHOWN (OFF)'}
                        </span>
                        <label className="relative inline-flex items-center cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={mapConfig.hide_map}
                            onChange={e => setMapConfig({ ...mapConfig, hide_map: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-white/10 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>
                    </div>

                    <div className="p-3 bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 text-[11px] font-semibold rounded-xl border border-indigo-500/10 flex gap-2">
                      <Info className="w-4 h-4 flex-shrink-0 text-indigo-500 mt-0.5" />
                      <span>
                        When enabled, all user-facing pages will bypass map rendering and prompt manual address inputs directly, enhancing load speeds in poor network regions.
                      </span>
                    </div>
                  </div>

                  {/* Hide Rider Mart Pickup setting */}
                  <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-150 dark:border-white/5 space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-sm font-bold text-gray-800 dark:text-white font-display">Hide Rider Mart Pickup</p>
                        <p className="text-[10px] text-gray-400">Toggle ON to hide the pickup address and Mart navigation button on the Rider app radar screen.</p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border transition-all ${
                          mapConfig.hide_mart_pickup 
                            ? 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400' 
                            : 'bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400'
                        }`}>
                          {mapConfig.hide_mart_pickup ? 'HIDDEN (ON)' : 'SHOWN (OFF)'}
                        </span>
                        <label className="relative inline-flex items-center cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={!!mapConfig.hide_mart_pickup}
                            onChange={e => setMapConfig({ ...mapConfig, hide_mart_pickup: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-white/10 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>
                    </div>

                    <div className="p-3 bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 text-[11px] font-semibold rounded-xl border border-indigo-500/10 flex gap-2">
                      <Info className="w-4 h-4 flex-shrink-0 text-indigo-500 mt-0.5" />
                      <span>
                        Useful when the admin is also the rider and already knows the Mart's location.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Custom Push Notification Broadcast Card */}
            <motion.div
              variants={cardVariants}
              className="bg-white dark:bg-[#1a1a1a] rounded-[2rem] p-6 border border-gray-100 dark:border-white/5 shadow-premium flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-amber-100 dark:bg-amber-950/20 text-amber-600 rounded-2xl">
                    <Bell className="w-6 h-6 text-amber-500" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-gray-800 dark:text-white font-display">Broadcast Custom Push</h2>
                    <p className="text-xs text-gray-400">Send custom push notification to all users</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-400 uppercase mb-2">
                      Load from Active Offer (Optional)
                    </label>
                    <select
                      value={selectedOfferId}
                      onChange={e => {
                        const offerId = e.target.value
                        setSelectedOfferId(offerId)
                        if (offerId) {
                          const offer = offersList.find(o => o.id === offerId)
                          if (offer) {
                            setCustomPushTitle(offer.title || '')
                            const defaultMsg = offer.coupon_code 
                              ? `Use code ${offer.coupon_code} to get discounts! ${offer.description || ''}` 
                              : (offer.description || offer.tagline || '')
                            setCustomPushMsg(defaultMsg.trim())
                          }
                        } else {
                          setCustomPushTitle('')
                          setCustomPushMsg('')
                        }
                      }}
                      className="px-4 py-3 bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-white/10 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-ozo-red text-sm font-semibold text-gray-800 dark:text-white cursor-pointer"
                    >
                      <option value="" className="bg-white dark:bg-[#1a1a1b] text-gray-800 dark:text-white">
                        -- Write Custom Notification from Scratch --
                      </option>
                      {offersList.map(offer => (
                        <option 
                          key={offer.id} 
                          value={offer.id}
                          className="bg-white dark:bg-[#1a1a1b] text-gray-800 dark:text-white"
                        >
                          {offer.coupon_code ? `[Code: ${offer.coupon_code}]` : '[Promo]'} {offer.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-400 uppercase mb-2">
                      Notification Title
                    </label>
                    <input
                      type="text"
                      value={customPushTitle}
                      onChange={e => setCustomPushTitle(e.target.value)}
                      placeholder="e.g. Fresh Mangoes arrived! 🥭"
                      className="px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-ozo-red text-sm font-semibold text-gray-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-400 uppercase mb-2">
                      Notification Message
                    </label>
                    <textarea
                      rows={3}
                      value={customPushMsg}
                      onChange={e => setCustomPushMsg(e.target.value)}
                      placeholder="e.g. Get 20% discount on fresh mangoes only for today. Order now!"
                      className="px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-ozo-red text-sm font-semibold text-gray-800 dark:text-white resize-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleSendCustomPush}
                    disabled={isSendingCustomPush || !customPushTitle.trim() || !customPushMsg.trim()}
                    className="w-full py-3 bg-gradient-ozo text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:shadow-ozo hover:scale-[1.01] transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isSendingCustomPush ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending Broadcast...
                      </>
                    ) : (
                      <>
                        <Rocket className="w-4 h-4" />
                        Broadcast Custom Push
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Geofence & Warehouse configuration */}
            <motion.div
              variants={cardVariants}
              className="bg-white dark:bg-[#1a1a1a] rounded-[2rem] p-6 border border-gray-100 dark:border-white/5 shadow-premium md:col-span-2"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-orange-100 dark:bg-orange-950/20 text-orange-600 dark:text-orange-450 rounded-2xl">
                  <Compass className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-gray-800 dark:text-white font-display">🏪 Mart Center Location & Georouting Settings</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Set central coordinates and operational boundary radius</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Controls */}
                <div className="lg:col-span-5 space-y-6">
                  {/* Location Autocomplete Search */}
                  <div className="space-y-2 relative">
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">
                      Search & Set Warehouse Location
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-grow">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                          {searching ? (
                            <Loader2 className="w-4.5 h-4.5 animate-spin text-ozo-red" />
                          ) : (
                            <Search className="w-4 h-4 text-gray-400" />
                          )}
                        </span>
                        <input
                          type="text"
                          placeholder="Type city, area, or landmark (e.g. Aurangabad Mandi)"
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              handleAddressSearch(searchQuery)
                            }
                          }}
                          className="pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-ozo-red text-sm font-semibold text-gray-800 dark:text-white"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddressSearch(searchQuery)}
                        disabled={searching || !searchQuery}
                        className="bg-ozo-red hover:bg-ozo-red/90 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50 active:scale-95 flex items-center gap-1.5"
                      >
                        Search
                      </button>
                    </div>

                    {/* Autocomplete Dropdown List */}
                    {searchResults.length > 0 && (
                      <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl shadow-xl z-50 overflow-hidden max-h-60 overflow-y-auto">
                        {searchResults.map((result, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              const lat = parseFloat(parseFloat(result.lat).toFixed(6))
                              const lng = parseFloat(parseFloat(result.lon).toFixed(6))
                              setGeofenceConfig(prev => ({
                                ...prev,
                                warehouse_lat: lat,
                                warehouse_lng: lng
                              }))
                              setDeliveryConfig(prev => ({
                                ...prev,
                                store_lat: lat,
                                store_lng: lng
                              }))
                              setSearchResults([])
                              setSearchQuery(result.display_name)
                              toast.success("Location updated on map!")
                            }}
                            className="w-full text-left px-4 py-3 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 border-b border-gray-100 dark:border-white/5 last:border-0 transition-colors flex items-start gap-2.5"
                          >
                            <MapPin className="w-4 h-4 mt-0.5 text-ozo-red shrink-0" />
                            <span>{result.display_name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-150 dark:border-white/5 space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/5 pb-2">
                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        1. Warehouse Hub (Green Pin)
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsPlacingWarehouse(!isPlacingWarehouse);
                        setIsPlacingStore(false);
                      }}
                      className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 border ${
                        isPlacingWarehouse
                          ? 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500 animate-pulse'
                          : 'bg-white dark:bg-white/5 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 shadow-sm'
                      }`}
                    >
                      <MapPin className={`w-4 h-4 ${isPlacingWarehouse ? 'animate-bounce text-white' : 'text-emerald-500'}`} />
                      {isPlacingWarehouse ? 'Click Map to Place Warehouse...' : 'Mark Warehouse on Map'}
                    </button>

                    {/* Active Coordinates Display */}
                    <div className="grid grid-cols-2 gap-3 p-2.5 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-xl border border-emerald-500/10">
                      <div>
                        <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase">Warehouse Lat</span>
                        <p className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-450">
                          {geofenceConfig.warehouse_lat ? geofenceConfig.warehouse_lat.toFixed(6) : "0.000000"}
                        </p>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-gray-400 dark:text-gray-550 uppercase">Warehouse Lng</span>
                        <p className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-455">
                          {geofenceConfig.warehouse_lng ? geofenceConfig.warehouse_lng.toFixed(6) : "0.000000"}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold mb-1 block">Latitude</span>
                        <input
                          type="number"
                          step="0.000001"
                          value={geofenceConfig.warehouse_lat || ''}
                          onChange={e => {
                            const val = parseFloat(e.target.value) || 0;
                            setGeofenceConfig(prev => ({ ...prev, warehouse_lat: val }));
                          }}
                          className="px-3 py-2 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl w-full text-xs font-semibold text-gray-800 dark:text-white"
                          required
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold mb-1 block">Longitude</span>
                        <input
                          type="number"
                          step="0.000001"
                          value={geofenceConfig.warehouse_lng || ''}
                          onChange={e => {
                            const val = parseFloat(e.target.value) || 0;
                            setGeofenceConfig(prev => ({ ...prev, warehouse_lng: val }));
                          }}
                          className="px-3 py-2 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl w-full text-xs font-semibold text-gray-800 dark:text-white"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* STORE DELIVERY CENTER SETUP CARD (YELLOW/AMBER THEME) */}
                  <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-150 dark:border-white/5 space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/5 pb-2">
                      <span className="text-xs font-black text-amber-600 dark:text-amber-450 uppercase flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                        2. Store Delivery Center (Yellow Pin)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (navigator.geolocation) {
                            navigator.geolocation.getCurrentPosition((position) => {
                              const lat = parseFloat(position.coords.latitude.toFixed(6))
                              const lng = parseFloat(position.coords.longitude.toFixed(6))
                              setDeliveryConfig({
                                ...deliveryConfig,
                                store_lat: lat,
                                store_lng: lng
                              })
                              toast.success("Delivery Center set to current GPS coordinates!")
                            }, (err) => {
                              toast.error("Failed to get current GPS location")
                            }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 })
                          } else {
                            toast.error("Geolocation not supported by browser")
                          }
                        }}
                        className="text-[9px] text-ozo-red hover:underline font-bold"
                      >
                        Use Current GPS
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsPlacingStore(!isPlacingStore);
                        setIsPlacingWarehouse(false);
                      }}
                      className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 border ${
                        isPlacingStore
                          ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500 animate-pulse'
                          : 'bg-white dark:bg-white/5 text-gray-750 dark:text-gray-200 border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 shadow-sm'
                      }`}
                    >
                      <MapPin className={`w-4 h-4 ${isPlacingStore ? 'animate-bounce text-white' : 'text-amber-500'}`} />
                      {isPlacingStore ? 'Click Map to Place Delivery Center...' : 'Mark Delivery Center on Map'}
                    </button>

                    {/* Active Coordinates Display */}
                    <div className="grid grid-cols-2 gap-3 p-2.5 bg-amber-500/5 dark:bg-amber-500/10 rounded-xl border border-amber-500/10">
                      <div>
                        <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase">Center Lat</span>
                        <p className="text-xs font-mono font-black text-amber-600 dark:text-amber-450">
                          {deliveryConfig.store_lat ? deliveryConfig.store_lat.toFixed(6) : "0.000000"}
                        </p>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase">Center Lng</span>
                        <p className="text-xs font-mono font-black text-amber-600 dark:text-amber-450">
                          {deliveryConfig.store_lng ? deliveryConfig.store_lng.toFixed(6) : "0.000000"}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold mb-1 block">Latitude</span>
                        <input
                          type="number"
                          step="0.000001"
                          value={deliveryConfig.store_lat || ''}
                          onChange={e => {
                            const val = parseFloat(e.target.value) || 0;
                            setDeliveryConfig(prev => ({ ...prev, store_lat: val }));
                          }}
                          className="px-3 py-2 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl w-full text-xs font-semibold text-gray-800 dark:text-white"
                          required
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-550 dark:text-gray-400 font-semibold mb-1 block">Longitude</span>
                        <input
                          type="number"
                          step="0.000001"
                          value={deliveryConfig.store_lng || ''}
                          onChange={e => {
                            const val = parseFloat(e.target.value) || 0;
                            setDeliveryConfig(prev => ({ ...prev, store_lng: val }));
                          }}
                          className="px-3 py-2 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl w-full text-xs font-semibold text-gray-800 dark:text-white"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">
                        Max Operational Radius (KM)
                      </label>
                      <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-orange-100 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400">
                        {geofenceConfig.max_radius_km || 5.0} KM Radius
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="1"
                        max="25"
                        step="0.5"
                        value={geofenceConfig.max_radius_km || 5.0}
                        onChange={e => setGeofenceConfig({ ...geofenceConfig, max_radius_km: parseFloat(e.target.value) || 5.0 })}
                        className="w-full h-2 bg-gray-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-orange-500"
                      />
                      <input
                        type="number"
                        min="1"
                        max="25"
                        step="0.5"
                        value={geofenceConfig.max_radius_km || 5.0}
                        onChange={e => setGeofenceConfig({ ...geofenceConfig, max_radius_km: parseFloat(e.target.value) || 5.0 })}
                        className="w-20 px-2 py-1 text-center bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500 text-xs font-bold text-gray-800 dark:text-white"
                      />
                    </div>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">Maximum delivery coverage distance calculated from the center hub.</p>
                  </div>
                  
                  <div className="p-4 bg-blue-500/5 text-blue-600 dark:text-blue-400 text-xs rounded-xl border border-blue-500/10 flex gap-2">
                    <Info className="w-4 h-4 flex-shrink-0 text-blue-500 mt-0.5" />
                    <div>
                      <p className="font-bold">Dual-Location Config Information:</p>
                      <p className="mt-0.5">
                        1. <strong className="text-emerald-600 dark:text-emerald-400">Green Marker:</strong> Physical Warehouse (Stored inventory / warehouse location).
                      </p>
                      <p className="mt-0.5">
                        2. <strong className="text-amber-500">Yellow Marker:</strong> Store Delivery Center (Center of your yellow delivery radius circle / geofence & fee calculations).
                      </p>
                      <p className="mt-1">Drag either pin or click the placing buttons to set coordinates on the map.</p>
                    </div>
                  </div>
                </div>

                {/* Leaflet Map */}
                <div className="lg:col-span-7 h-[320px] lg:h-auto min-h-[320px] rounded-2xl overflow-hidden border border-gray-200 dark:border-white/10 relative shadow-inner bg-gray-100 dark:bg-zinc-900 z-10">
                  {isPlacingWarehouse && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold text-xs px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 border border-white/20 animate-bounce">
                      <MapPin className="w-4 h-4 text-white animate-pulse" />
                      <span>Click map to place Green Warehouse Marker</span>
                    </div>
                  )}
                  {/* Layer Control Overlay */}
                  <div className="absolute bottom-4 left-4 z-[1000] bg-white dark:bg-zinc-900/95 backdrop-blur-md p-3 rounded-xl border border-gray-200 dark:border-white/10 shadow-lg text-[11px] font-medium space-y-1.5 text-gray-700 dark:text-gray-300">
                    <div className="font-bold mb-1 text-gray-800 dark:text-white uppercase tracking-wider text-[9px]">Map Layers</div>
                    <label className="flex items-center gap-2 cursor-pointer hover:text-gray-900 dark:hover:text-white">
                      <input type="checkbox" checked={showLocalities} onChange={() => setShowLocalities(!showLocalities)} className="rounded border-gray-300 dark:border-zinc-700 text-blue-500 focus:ring-blue-500 h-3.5 w-3.5" />
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                      <span>Localities ({localities.length})</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer hover:text-gray-900 dark:hover:text-white">
                      <input type="checkbox" checked={showLandmarks} onChange={() => setShowLandmarks(!showLandmarks)} className="rounded border-gray-300 dark:border-zinc-700 text-rose-500 focus:ring-rose-500 h-3.5 w-3.5" />
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                      <span>Landmarks ({landmarks.length})</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer hover:text-gray-900 dark:hover:text-white">
                      <input type="checkbox" checked={showGalis} onChange={() => setShowGalis(!showGalis)} className="rounded border-gray-300 dark:border-zinc-700 text-purple-500 focus:ring-purple-500 h-3.5 w-3.5" />
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                      <span>Streets/Galis ({galis.length})</span>
                    </label>
                  </div>

                  <div ref={settingsMapContainerRef} className="absolute inset-0" style={{ cursor: (isPlacingWarehouse || isPlacingStore) ? 'crosshair' : 'grab' }} />
                </div>
              </div>
            </motion.div>

            {/* Mandi Price Synchronization Config Card */}
            <motion.div
              variants={cardVariants}
              className="bg-white dark:bg-[#1a1a1a] rounded-[2rem] p-6 border border-gray-100 dark:border-white/5 shadow-premium flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-amber-100 dark:bg-amber-950/20 text-amber-650 dark:text-amber-400 rounded-2xl">
                    <Database className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-gray-800 dark:text-white">Mandi Price Synchronization</h2>
                    <p className="text-xs text-gray-400">Configure data.gov.in API parameters & markup margins</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-400 uppercase mb-2">
                      Mandi API Key (data.gov.in)
                    </label>
                    <input
                      type="text"
                      value={mandiSyncConfig.api_key}
                      onChange={e => setMandiSyncConfig({ ...mandiSyncConfig, api_key: e.target.value })}
                      className="px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-ozo-red text-sm font-semibold"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-450 uppercase mb-1">
                        State
                      </label>
                      <input
                        type="text"
                        value={mandiSyncConfig.state}
                        onChange={e => setMandiSyncConfig({ ...mandiSyncConfig, state: e.target.value })}
                        className="px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-ozo-red text-xs font-semibold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-455 uppercase mb-1">
                        District
                      </label>
                      <input
                        type="text"
                        value={mandiSyncConfig.district}
                        onChange={e => setMandiSyncConfig({ ...mandiSyncConfig, district: e.target.value })}
                        className="px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-ozo-red text-xs font-semibold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-450 uppercase mb-1">
                        Market (APMC)
                      </label>
                      <input
                        type="text"
                        value={mandiSyncConfig.market}
                        onChange={e => setMandiSyncConfig({ ...mandiSyncConfig, market: e.target.value })}
                        className="px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-ozo-red text-xs font-semibold"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 dark:text-gray-400 uppercase mb-2">
                        Selling Cost Markup (%)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          value={mandiSyncConfig.markup_percent}
                          onChange={e => setMandiSyncConfig({ ...mandiSyncConfig, markup_percent: parseFloat(e.target.value) || 0 })}
                          className="pr-8 pl-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-ozo-red text-sm font-semibold"
                          required
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-450 font-bold">%</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 dark:text-gray-400 uppercase mb-2">
                        MRP Markup (%)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          value={mandiSyncConfig.mrp_markup_percent}
                          onChange={e => setMandiSyncConfig({ ...mandiSyncConfig, mrp_markup_percent: parseFloat(e.target.value) || 0 })}
                          className="pr-8 pl-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-ozo-red text-sm font-semibold"
                          required
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-450 font-bold">%</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div>
                      <p className="text-xs font-bold text-gray-800 dark:text-white">Enable Auto-Sync</p>
                      <p className="text-[10px] text-gray-400">Run daily at 5:00 AM IST automatically</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={!!mandiSyncConfig.auto_sync}
                        onChange={e => setMandiSyncConfig({ ...mandiSyncConfig, auto_sync: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-white/10 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>
                </div>

                {/* Operations & Run Status */}
                <div className="mt-6 pt-4 border-t border-gray-150 dark:border-white/5 space-y-4">
                  <h3 className="text-xs font-bold text-gray-400 dark:text-gray-400 uppercase">Synchronization Actions</h3>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      disabled={syncLoading}
                      onClick={() => triggerMandiSync(true)}
                      className="flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-bold border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200 bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
                    >
                      {syncLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                      ) : (
                        <Sliders className="w-4 h-4 text-gray-500" />
                      )}
                      Test Dry Run
                    </button>
                    <button
                      type="button"
                      disabled={syncLoading}
                      onClick={() => triggerMandiSync(false)}
                      className="flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 transition-colors disabled:opacity-50"
                    >
                      {syncLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                      ) : (
                        <Play className="w-4 h-4 text-white" />
                      )}
                      Sync Prices Now
                    </button>
                  </div>

                  {/* Execution Status Panel */}
                  {mandiSyncConfig.last_run && (
                    <div className="p-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-gray-400">LAST SYNC RUN</span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                          mandiSyncConfig.last_run.status === 'success'
                            ? 'bg-green-100 dark:bg-green-950/20 text-green-650 dark:text-green-400'
                            : mandiSyncConfig.last_run.status === 'partial'
                              ? 'bg-amber-100 dark:bg-amber-950/20 text-amber-650 dark:text-amber-400'
                              : 'bg-red-100 dark:bg-red-950/20 text-red-650 dark:text-red-400'
                        }`}>
                          {mandiSyncConfig.last_run.status?.toUpperCase() || 'UNKNOWN'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-y-1 gap-x-2 text-[10px] text-gray-500 dark:text-gray-400">
                        <div>Time: <span className="font-semibold text-gray-700 dark:text-gray-300 font-mono">{new Date(mandiSyncConfig.last_run.timestamp).toLocaleString()}</span></div>
                        <div>Duration: <span className="font-semibold text-gray-700 dark:text-gray-300 font-mono">{mandiSyncConfig.last_run.execution_time_ms !== undefined ? mandiSyncConfig.last_run.execution_time_ms : (mandiSyncConfig.last_run.duration_ms || 0)}ms</span></div>
                        <div>Processed: <span className="font-semibold text-gray-700 dark:text-gray-300 font-mono">{mandiSyncConfig.last_run.products_processed !== undefined ? mandiSyncConfig.last_run.products_processed : (mandiSyncConfig.last_run.processed || 0)}</span></div>
                        <div>Updated: <span className="font-semibold text-gray-700 dark:text-gray-300 font-mono">{mandiSyncConfig.last_run.products_updated !== undefined ? mandiSyncConfig.last_run.products_updated : (mandiSyncConfig.last_run.updated || 0)}</span></div>
                        <div>Skipped: <span className="font-semibold text-gray-700 dark:text-gray-300 font-mono">{mandiSyncConfig.last_run.products_skipped !== undefined ? mandiSyncConfig.last_run.products_skipped : (mandiSyncConfig.last_run.skipped || 0)}</span></div>
                        <div>API Calls: <span className="font-semibold text-gray-700 dark:text-gray-300 font-mono">{mandiSyncConfig.last_run.api_calls_made !== undefined ? mandiSyncConfig.last_run.api_calls_made : (mandiSyncConfig.last_run.api_calls || 1)}</span></div>
                      </div>

                      {mandiSyncConfig.last_run.errors && mandiSyncConfig.last_run.errors.length > 0 && (
                        <div className="pt-1.5 border-t border-gray-200 dark:border-white/10">
                          <span className="text-[9px] font-bold text-red-500 uppercase flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-red-505" />
                            Run Errors/Warnings ({mandiSyncConfig.last_run.errors.length})
                          </span>
                          <div className="max-h-20 overflow-y-auto mt-1 space-y-1 pr-1">
                            {mandiSyncConfig.last_run.errors.map((err, idx) => (
                              <p key={idx} className="text-[9px] font-mono text-red-500 leading-tight bg-red-500/5 dark:bg-red-500/10 p-1 rounded border border-red-500/10">
                                {err}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Dry Run Real-time Panel */}
                  {dryRunLog && (
                    <div className="p-3 bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/10 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-blue-500 font-sans">DRY-RUN RESULTS (TEST)</span>
                        <button 
                          type="button" 
                          onClick={() => setDryRunLog(null)}
                          className="text-[9px] text-gray-400 hover:text-gray-200 underline font-semibold"
                        >
                          Clear
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-y-1 gap-x-2 text-[10px] text-gray-500 dark:text-gray-400">
                        <div>Status: <span className="font-bold text-blue-500">{dryRunLog.status?.toUpperCase()}</span></div>
                        <div>Duration: <span className="font-semibold text-gray-700 dark:text-gray-300 font-mono">{dryRunLog.execution_time_ms !== undefined ? dryRunLog.execution_time_ms : (dryRunLog.duration_ms || 0)}ms</span></div>
                        <div>Processed: <span className="font-semibold text-gray-700 dark:text-gray-300 font-mono">{dryRunLog.summary?.processed || 0}</span></div>
                        <div>Matched: <span className="font-semibold text-gray-700 dark:text-gray-300 font-mono">{dryRunLog.summary?.updated || 0}</span></div>
                        <div>Skipped: <span className="font-semibold text-gray-700 dark:text-gray-300 font-mono">{dryRunLog.summary?.skipped || 0}</span></div>
                        <div>API Calls: <span className="font-semibold text-gray-700 dark:text-gray-300 font-mono">{dryRunLog.summary?.api_calls || 1}</span></div>
                      </div>

                      {dryRunLog.summary?.updates_preview && dryRunLog.summary.updates_preview.length > 0 && (
                        <div className="pt-1.5 border-t border-blue-500/10">
                          <span className="text-[9px] font-bold text-blue-500 uppercase">Updates Preview ({dryRunLog.summary.updates_preview.length})</span>
                          <div className="max-h-24 overflow-y-auto mt-1 space-y-1 pr-1 font-mono text-[9px] text-gray-700 dark:text-gray-300">
                            {dryRunLog.summary.updates_preview.map((preview, idx) => (
                              <div key={idx} className="bg-white/50 dark:bg-white/5 p-1 rounded border border-blue-500/5">
                                <span className="font-bold text-blue-600 dark:text-blue-450">{preview.name}</span>:
                                <div className="pl-2 flex flex-col gap-0.5 text-gray-500 dark:text-gray-450 mt-0.5">
                                  <span>Mandi base price: ₹{preview.base_cost_per_kg}/kg</span>
                                  <span>Mandi base MRP: ₹{preview.base_mrp_per_kg}/kg</span>
                                  <span>New Selling price: ₹{preview.new_price} (was ₹{preview.old_price})</span>
                                  <span>New MRP: ₹{preview.new_mrp} (was ₹{preview.old_mrp})</span>
                                  <span className="italic text-[8px]">Details: {preview.match_details}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {dryRunLog.errors && dryRunLog.errors.length > 0 && (
                        <div className="pt-1.5 border-t border-red-500/10">
                          <span className="text-[9px] font-bold text-red-550 uppercase">Dry-run warnings</span>
                          <div className="max-h-20 overflow-y-auto mt-1 space-y-1 pr-1">
                            {dryRunLog.errors.map((err, idx) => (
                              <p key={idx} className="text-[9px] font-mono text-red-505 leading-tight bg-red-500/5 dark:bg-red-500/10 p-1 rounded">
                                {err}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </div>
            </motion.div>

            {/* Localhost Image Tool Settings Card */}
            <motion.div
              variants={cardVariants}
              className="bg-white dark:bg-[#1a1a1a] rounded-[2rem] p-6 border border-gray-100 dark:border-white/5 shadow-premium flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-blue-100 dark:bg-blue-950/20 text-blue-600 dark:text-blue-450 rounded-2xl">
                    <Image className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-gray-800 dark:text-white">Localhost Image Tool</h2>
                    <p className="text-xs text-gray-400">Configure desktop application download link</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-400 uppercase mb-2">
                      Application Executable Download Link (Windows .exe)
                    </label>
                    <input
                      type="url"
                      placeholder="https://example.com/OzoMartImageTool.exe"
                      value={imageToolConfig.download_url}
                      onChange={e => setImageToolConfig({ ...imageToolConfig, download_url: e.target.value })}
                      className="px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-ozo-red text-sm font-semibold"
                      required
                    />
                    <p className="text-[10px] text-gray-400 mt-2">
                      Provide a URL to the standalone OzoMart executable file. This link will be displayed on the Mart Dashboard under the "Download Image Tool" action button for easy access by store owners.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Mandi Commodity Mapper Table (Full Width) */}
          <div className="bg-white dark:bg-[#1a1a1a] rounded-[2rem] p-6 border border-gray-100 dark:border-white/5 shadow-premium space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-150 dark:border-white/5 pb-6">
              <div>
                <h2 className="text-lg font-black text-gray-800 dark:text-white">Mandi Commodity Mapper</h2>
                <p className="text-xs text-gray-400">Map OZO products to Mandi commodities & customize overrides</p>
              </div>

              {/* Mapper Toolbar */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search product name or slug..."
                    value={mapperSearch}
                    onChange={e => {
                      setMapperSearch(e.target.value)
                      setMapperPage(1)
                    }}
                    className="pl-9 pr-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-ozo-red text-xs font-semibold w-56 animate-none"
                  />
                </div>

                {/* Auto Map Commodities Heuristics */}
                <button
                  type="button"
                  onClick={autoMapCommodities}
                  className="flex items-center gap-1.5 py-2 px-4 rounded-xl text-xs font-bold bg-amber-550/10 text-amber-650 dark:text-amber-450 hover:bg-amber-550/20 transition-colors shadow-sm border border-amber-550/20"
                >
                  <Sliders className="w-4 h-4 text-amber-500" />
                  Auto-Map Commodities
                </button>

                {/* Import Mappings */}
                <label className="flex items-center gap-1.5 py-2 px-4 rounded-xl text-xs font-bold border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200 bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors cursor-pointer shadow-sm">
                  <FileUp className="w-4 h-4 text-emerald-500" />
                  <span>Import CSV</span>
                  <input 
                    type="file" 
                    accept=".csv" 
                    onChange={handleImportCSV} 
                    className="hidden" 
                  />
                </label>

                {/* Export Mappings */}
                <button
                  type="button"
                  onClick={exportMappings}
                  className="flex items-center gap-1.5 py-2 px-4 rounded-xl text-xs font-bold border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200 bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors shadow-sm"
                >
                  <FileDown className="w-4 h-4 text-blue-500" />
                  Export JSON
                </button>
              </div>
            </div>

            {/* Template Guidance / Instructions */}
            <div className="p-3 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/10 rounded-xl text-[11px] text-gray-500 dark:text-gray-400 flex items-start gap-2">
              <Info className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
              <div>
                <p className="font-semibold text-gray-700 dark:text-gray-300">Mapping instructions:</p>
                <p className="mt-0.5">
                  Set the <strong>Mandi Commodity</strong> (e.g., Potato, Onion) and <strong>Mandi Variety</strong> (optional, e.g., Local, Jyoti) to match the official API commodities.
                  Use <strong>Weight Override (kg)</strong> to adjust calculations for pack sizes other than 1 kg (e.g., set 0.25 for a 250g pack).
                </p>
                <p className="mt-1">
                  <strong>CSV Import format:</strong> header-less or with <code>product_slug, mandi_commodity, mandi_variety, weight_override</code> as column headers.
                </p>
              </div>
            </div>

            {/* Mapper Table */}
            {productsLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-ozo-red mb-2" />
                <p className="text-xs text-gray-400 font-bold">Loading mapper products...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-150 dark:border-white/5 text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-bold">
                      <th className="py-3 px-4">OZO Product</th>
                      <th className="py-3 px-4">OZO Price / MRP</th>
                      <th className="py-3 px-4">Mandi Commodity</th>
                      <th className="py-3 px-4">Mandi Variety</th>
                      <th className="py-3 px-4">Weight (kg)</th>
                      <th className="py-3 px-4">Last Sync</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                    {(() => {
                      const filtered = vegetableProducts.filter(p => 
                        p.name.toLowerCase().includes(mapperSearch.toLowerCase()) || 
                        p.slug.toLowerCase().includes(mapperSearch.toLowerCase())
                      );
                      const paginated = filtered.slice((mapperPage - 1) * itemsPerPage, mapperPage * itemsPerPage);

                      if (paginated.length === 0) {
                        return (
                          <tr>
                            <td colSpan="6" className="py-10 text-center text-xs text-gray-500 italic">
                              No vegetable products found matching "{mapperSearch}"
                            </td>
                          </tr>
                        );
                      }

                      return paginated.map(product => {
                        const mapping = mandiSyncConfig.mappings[product.slug] || { commodity: '', variety: '', weight_override: '' };
                        return (
                          <tr key={product.id} className="text-xs hover:bg-gray-500/5 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-gray-800 dark:text-gray-200">{product.name}</div>
                              <div className="text-[10px] font-mono text-gray-400">{product.slug} ({product.unit})</div>
                            </td>
                            <td className="py-3.5 px-4 font-mono font-medium">
                              <div className="text-gray-800 dark:text-gray-200">Price: ₹{product.price} <span className="text-[9px] text-gray-400">(Base: ₹{product.base_price || '-'})</span></div>
                              <div className="text-gray-400 text-[10px]">MRP: ₹{product.mrp} <span className="text-[9px] text-gray-400">(Base: ₹{product.base_mrp || '-'})</span></div>
                            </td>
                            <td className="py-3.5 px-4">
                              <input
                                type="text"
                                placeholder="e.g. Potato"
                                value={mapping.commodity || ''}
                                onChange={e => handleMappingChange(product.slug, 'commodity', e.target.value)}
                                className="px-2.5 py-1.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-1 focus:ring-ozo-red text-xs font-semibold w-40"
                              />
                            </td>
                            <td className="py-3.5 px-4">
                              <input
                                type="text"
                                placeholder="e.g. Jyoti (optional)"
                                value={mapping.variety || ''}
                                onChange={e => handleMappingChange(product.slug, 'variety', e.target.value)}
                                className="px-2.5 py-1.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-1 focus:ring-ozo-red text-xs font-semibold w-40"
                              />
                            </td>
                            <td className="py-3.5 px-4">
                              <input
                                type="number"
                                step="0.01"
                                placeholder="1.0"
                                value={mapping.weight_override === undefined ? '' : mapping.weight_override}
                                onChange={e => handleMappingChange(product.slug, 'weight_override', e.target.value)}
                                className="px-2.5 py-1.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-1 focus:ring-ozo-red text-xs font-mono font-semibold w-20 text-center"
                              />
                            </td>
                            <td className="py-3.5 px-4 text-[10px] text-gray-500 font-mono">
                              {product.last_price_updated 
                                ? new Date(product.last_price_updated).toLocaleString() 
                                : 'Never synced'
                              }
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination controls */}
            {!productsLoading && vegetableProducts.length > 0 && (
              <div className="flex items-center justify-between border-t border-gray-150 dark:border-white/5 pt-4">
                <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                  {(() => {
                    const filtered = vegetableProducts.filter(p => 
                      p.name.toLowerCase().includes(mapperSearch.toLowerCase()) || 
                      p.slug.toLowerCase().includes(mapperSearch.toLowerCase())
                    );
                    const total = filtered.length;
                    const from = total === 0 ? 0 : (mapperPage - 1) * itemsPerPage + 1;
                    const to = Math.min(mapperPage * itemsPerPage, total);
                    return `Showing ${from} to ${to} of ${total} vegetable products`;
                  })()}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={mapperPage === 1}
                    onClick={() => setMapperPage(prev => prev - 1)}
                    className="py-1.5 px-3 rounded-lg border border-gray-200 dark:border-white/10 text-[11px] font-bold hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50 transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={(() => {
                      const filtered = vegetableProducts.filter(p => 
                        p.name.toLowerCase().includes(mapperSearch.toLowerCase()) || 
                        p.slug.toLowerCase().includes(mapperSearch.toLowerCase())
                      );
                      return mapperPage * itemsPerPage >= filtered.length;
                    })()}
                    onClick={() => setMapperPage(prev => prev + 1)}
                    className="py-1.5 px-3 rounded-lg border border-gray-200 dark:border-white/10 text-[11px] font-bold hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="flex justify-end gap-4 p-6 bg-white dark:bg-[#1a1a1a] rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-premium">
            <button
              type="button"
              onClick={fetchSettings}
              disabled={saving}
              className="py-3 px-6 rounded-xl border border-gray-300 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 text-xs font-bold text-gray-700 dark:text-gray-300 disabled:opacity-50 transition-colors"
            >
              Discard Changes
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-gradient-ozo hover:opacity-90 active:scale-95 text-white py-3.5 px-8 rounded-xl font-bold text-xs shadow-ozo disabled:opacity-50 transition-all"
            >
              <Save className="w-4.5 h-4.5" />
              {saving ? 'Saving System Changes...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      )}

      {/* SQL Transactions Logger */}
      <div className="bg-[#0f0f11] rounded-[2rem] border border-white/5 overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 bg-white/[0.02] border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <Terminal className="w-5 h-5 text-ozo-red animate-pulse" />
            <h3 className="text-sm font-bold text-white font-mono">system_settings_transaction_logs</h3>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-ping" />
            <span className="text-[10px] font-bold text-gray-400 font-mono">SQL-AGENT STATUS: ONLINE</span>
          </div>
        </div>
        <div className="p-6 font-mono text-xs text-gray-400 h-44 overflow-y-auto space-y-2 flex flex-col-reverse">
          {logs.length === 0 ? (
            <p className="text-gray-650 italic text-center py-8">Waiting for user actions... Logs will record here in real-time.</p>
          ) : (
            logs.map((log, idx) => {
              let color = 'text-gray-400'
              if (log.includes('[SUCCESS]')) color = 'text-green-400'
              if (log.includes('[ERROR]')) color = 'text-red-500'
              if (log.includes('[WARNING]')) color = 'text-amber-500'
              return (
                <div key={idx} className={`flex items-start gap-2 ${color}`}>
                  <span className="text-gray-600 flex-shrink-0">&gt;</span>
                  <span>{log}</span>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminSettings
