import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useCaptainStore } from '../../stores/captainStore'
import { useCartStore } from '../../stores/cartStore'
import { useShallow } from 'zustand/react/shallow'
import { motion, AnimatePresence } from 'framer-motion'
import ImageUpload from '../../components/ImageUpload'
import toast from 'react-hot-toast'
import { parseLandmark } from '../../lib/addressHelpers'
import { 
  Wifi, 
  WifiOff, 
  MapPin, 
  Map, 
  Phone, 
  Compass, 
  ShoppingBag, 
  ChevronRight, 
  HelpCircle, 
  CreditCard,
  CheckCircle2,
  Bell,
  BellOff,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Award,
  Camera,
  UploadCloud,
  X
} from 'lucide-react'

// Swipe Slider Button Component
const SwipeButton = React.memo(({ onSwipeComplete, text, color = '#00FF66', disabled = false }) => {
  const [sliderPos, setSliderPos] = useState(0)
  const [isDraggingActive, setIsDraggingActive] = useState(false)
  const startX = useRef(0)
  const containerRef = useRef(null)
  const containerWidthRef = useRef(200)
  const sliderPosRef = useRef(0)

  // Keep sliderPosRef in sync with sliderPos
  useEffect(() => {
    sliderPosRef.current = sliderPos
  }, [sliderPos])

  // Sync callback to ref to prevent stale closures and unnecessary re-registers of event listeners
  const onSwipeCompleteRef = useRef(onSwipeComplete)
  useEffect(() => {
    onSwipeCompleteRef.current = onSwipeComplete
  }, [onSwipeComplete])

  const handleStart = (e) => {
    if (disabled) return
    setIsDraggingActive(true)
    startX.current = e.touches ? e.touches[0].clientX : e.clientX
    containerWidthRef.current = containerRef.current ? containerRef.current.clientWidth : 200
  }

  useEffect(() => {
    if (!isDraggingActive) return

    const handleMove = (e) => {
      const currentX = e.touches ? e.touches[0].clientX : e.clientX
      const diff = currentX - startX.current
      const maxSlide = containerWidthRef.current - 56 // 56px is button width

      if (diff > 0 && diff <= maxSlide) {
        setSliderPos(diff)
      } else if (diff > maxSlide) {
        setSliderPos(maxSlide)
      }
    }

    const handleEnd = () => {
      setIsDraggingActive(false)
      const maxSlide = containerWidthRef.current - 56
      const currentPos = sliderPosRef.current

      if (currentPos >= maxSlide * 0.85) {
        setSliderPos(maxSlide)
        if (onSwipeCompleteRef.current) {
          onSwipeCompleteRef.current()
        }
        setTimeout(() => setSliderPos(0), 1000)
      } else {
        setSliderPos(0)
      }
    }

    window.addEventListener('mouseup', handleEnd)
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('touchend', handleEnd)
    window.addEventListener('touchmove', handleMove, { passive: true })

    return () => {
      window.removeEventListener('mouseup', handleEnd)
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('touchend', handleEnd)
      window.removeEventListener('touchmove', handleMove)
    }
  }, [isDraggingActive])

  return (
    <div 
      ref={containerRef}
      onMouseDown={handleStart}
      onTouchStart={handleStart}
      className={`relative w-full h-14 bg-gray-50 dark:bg-[#12121e] border border-gray-200 dark:border-[#232338] rounded-xl overflow-hidden select-none cursor-pointer flex items-center justify-center ${
        disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
      }`}
    >
      <div 
        className="absolute left-1 top-1 bottom-1 w-12 rounded-lg flex items-center justify-center text-black font-black transition-shadow duration-300"
        style={{ 
          transform: `translateX(${sliderPos}px)`, 
          backgroundColor: color,
          boxShadow: `0 0 12px ${color}40`
        }}
      >
        <ArrowRight className="w-5 h-5 stroke-[3]" />
      </div>

      <span 
        className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 pointer-events-none"
        style={{ opacity: Math.max(0.2, 1 - (sliderPos / (containerWidthRef.current || 200))) }}
      >
        {text}
      </span>
    </div>
  )
})

// Memoized OrderCard for radar order list to prevent unwanted item list re-renders
const OrderCard = React.memo(({ order, onAccept }) => {
  const handleSwipeComplete = useCallback(() => {
    onAccept(order.id)
  }, [order.id, onAccept])

  return (
    <div 
      className="bg-white dark:bg-[#0c0c14] border border-gray-200/80 dark:border-[#1e1e32] hover:border-emerald-500/80 dark:hover:border-[#00FF66] rounded-[1.75rem] p-6 space-y-5 relative overflow-hidden transition-all duration-300 shadow-sm hover:shadow-md"
    >
      {/* Blink radar effect */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#00FF66]/2 rounded-full blur-2xl pointer-events-none"></div>

      {/* Order header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-gray-200 dark:border-[#18182a]">
        <div>
          <span className="bg-[#FF9900]/10 border border-[#FF9900]/25 text-[#FF9900] text-xs font-black px-2.5 py-0.5 rounded-lg">
            FLASH OFFER
          </span>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Earnings</p>
          <p className="text-lg font-black text-emerald-600 dark:text-[#00FF66]">₹{order.estimatedEarnings.toFixed(2)}</p>
        </div>
      </div>

      {/* Route Details */}
      <div className="space-y-3">
        <div className="flex items-start gap-2.5">
          <MapPin className="w-4 h-4 text-[#FFD133] shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-gray-500 font-bold">PICKUP</p>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mt-0.5">Apna Bazar Supermarket</p>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <MapPin className="w-4 h-4 text-[#FF3366] shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-gray-500 font-bold">DELIVERY DROP</p>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mt-0.5">
              {order.address?.address_line1 || 'OZO customer locality'}
              {(() => {
                const parsed = parseLandmark(order.address?.landmark);
                return parsed.landmark ? ` (Near ${parsed.landmark})` : '';
              })()}
            </p>
          </div>
        </div>
      </div>

      {/* Distance & Details */}
      <div className="grid grid-cols-2 bg-gray-50 dark:bg-[#12121f] rounded-2xl p-4 border border-gray-250/50 dark:border-[#1b1b2f] text-center text-xs">
        <div>
          <p className="text-gray-500 font-bold">Est. Distance</p>
          <p className="font-extrabold text-gray-900 dark:text-white mt-0.5">4.2 KM total</p>
        </div>
        <div className="border-l border-gray-200 dark:border-[#1b1b2f]">
          <p className="text-gray-500 font-bold">Items Count</p>
          <p className="font-extrabold text-gray-900 dark:text-white mt-0.5">
            {order.order_items?.reduce((acc, item) => acc + (item.quantity || 0), 0) || 0} Packets
          </p>
        </div>
      </div>

      {/* Order Items Preview */}
      <div className="bg-gray-50 dark:bg-[#12121f] border border-gray-250/50 dark:border-[#1b1b2f] rounded-2xl p-4 space-y-3 text-xs text-left">
        <p className="font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-[10px] flex items-center gap-1.5 pb-1 border-b border-gray-150 dark:border-gray-800">
          <ShoppingBag className="w-3.5 h-3.5 text-emerald-500 dark:text-[#00FF66]" />
          Items in Order
        </p>
        <div className="divide-y divide-gray-150 dark:divide-gray-800 max-h-32 overflow-y-auto pr-1">
          {order.order_items && order.order_items.length > 0 ? (
            order.order_items.map((item, idx) => (
              <div key={item.id || idx} className="py-2 flex items-center justify-between gap-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-2">
                  {item.product_image && (
                    <img 
                      src={item.product_image} 
                      alt={item.product_name} 
                      className="w-7 h-7 object-cover rounded border border-gray-200 dark:border-[#232338]" 
                    />
                  )}
                  <span className="font-semibold text-gray-800 dark:text-gray-200 line-clamp-1">
                    {item.product_name}
                  </span>
                </div>
                <span className="font-black text-gray-550 dark:text-gray-400 bg-gray-100 dark:bg-[#1e1e2d] px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap">
                  x{item.quantity}
                </span>
              </div>
            ))
          ) : (
            <p className="text-gray-450 dark:text-[#232338] text-center italic py-1">No items details</p>
          )}
        </div>
      </div>

      {/* Swipe to Accept */}
      <SwipeButton 
        onSwipeComplete={handleSwipeComplete} 
        text="Swipe to Accept Duty" 
        color="#00FF66"
      />
    </div>
  )
})

const CaptainRadar = () => {
  const {
    nearbyOrders,
    activeOrder,
    isLoadingRadar,
    toggleDuty,
    fetchNearbyOrders,
    acceptOrder,
    arriveAtMart,
    confirmPickup,
    deliverOrder,
    radarSoundEnabled,
    setRadarSoundEnabled
  } = useCaptainStore(useShallow(state => ({
    nearbyOrders: state.nearbyOrders,
    activeOrder: state.activeOrder,
    isLoadingRadar: state.isLoadingRadar,
    toggleDuty: state.toggleDuty,
    fetchNearbyOrders: state.fetchNearbyOrders,
    acceptOrder: state.acceptOrder,
    arriveAtMart: state.arriveAtMart,
    confirmPickup: state.confirmPickup,
    deliverOrder: state.deliverOrder,
    radarSoundEnabled: state.radarSoundEnabled,
    setRadarSoundEnabled: state.setRadarSoundEnabled
  })))

  const captainStatus = useCaptainStore(state => state.captainProfile?.status)

  // Steps within accepted delivery: 'heading_to_mart', 'packing_checklist', 'delivering'
  const [deliveryStep, setDeliveryStep] = useState('heading_to_mart')
  const [isUpdatingStep, setIsUpdatingStep] = useState(false)
  const [verificationChecklist, setVerificationChecklist] = useState([])

  // Delivery proof states
  const [isProofModalOpen, setIsProofModalOpen] = useState(false)
  const [proofImage1, setProofImage1] = useState('')
  const [proofImage2, setProofImage2] = useState('')
  const [isSubmittingProof, setIsSubmittingProof] = useState(false)

  // Translation states for delivery instructions
  const [isTranslating, setIsTranslating] = useState(false)
  const [showingTranslation, setShowingTranslation] = useState(false)
  const [translatedText, setTranslatedText] = useState('')

  const handleProofSubmit = useCallback(async () => {
    if (!proofImage1 || !proofImage2) {
      toast.error('Both delivery proof photos are mandatory!')
      return
    }
    setIsSubmittingProof(true)
    try {
      await deliverOrder(proofImage1, proofImage2)
      setIsProofModalOpen(false)
      // Reset proof states
      setProofImage1('')
      setProofImage2('')
    } catch (err) {
      console.error('Error submitting delivery proof:', err)
      toast.error('Failed to complete delivery')
    } finally {
      setIsSubmittingProof(false)
    }
  }, [proofImage1, proofImage2, deliverOrder])

  const geofenceConfig = useCartStore(state => state.geofenceConfig)
  const mapConfig = useCartStore(state => state.mapConfig)
  const fetchSettings = useCartStore(state => state.fetchSettings)

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const triggerNavigation = useCallback((useCurrentLocationAsOrigin = true) => {
    // Proactively open universal Google Maps link with text search query if present
    if (useCurrentLocationAsOrigin && activeOrder?.google_maps_url) {
      window.open(activeOrder.google_maps_url, '_blank')
      return
    }

    const originLat = geofenceConfig?.warehouse_lat || 24.745736
    const originLng = geofenceConfig?.warehouse_lng || 84.390014
    
    let destLat = null
    let destLng = null
    
    if (activeOrder?.latitude && activeOrder?.longitude) {
      destLat = parseFloat(activeOrder.latitude)
      destLng = parseFloat(activeOrder.longitude)
    } else if (activeOrder?.address) {
      destLat = parseFloat(activeOrder.address.latitude)
      destLng = parseFloat(activeOrder.address.longitude)
    }
    
    if (!destLat || isNaN(destLat) || !destLng || isNaN(destLng)) {
      const addressString = activeOrder?.google_maps_url 
        ? activeOrder.google_maps_url 
        : (activeOrder?.address 
          ? `${activeOrder.address.address_line1}, ${activeOrder.address.city}`
          : 'Ozo Customer Location')
      
      if (activeOrder?.google_maps_url) {
        window.open(activeOrder.google_maps_url, '_blank')
      } else {
        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressString)}`, '_blank')
      }
      return
    }
    
    const userAgent = navigator.userAgent || navigator.vendor || window.opera
    const isAndroid = /android/i.test(userAgent)
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream
    
    if (useCurrentLocationAsOrigin) {
      // Force native Google Maps navigation if on mobile
      if (isAndroid) {
        window.location.href = `google.navigation:q=${destLat},${destLng}`
      } else if (isIOS) {
        window.location.href = `comgooglemaps://?daddr=${destLat},${destLng}&directionsmode=driving`
        setTimeout(() => {
          window.open(`https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&travelmode=driving`, '_blank')
        }, 500)
      } else {
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&travelmode=driving`, '_blank')
      }
    } else {
      // Show Route (Mart -> Customer)
      if (isAndroid) {
        window.location.href = `intent://maps.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat},${destLng}&travelmode=driving#Intent;scheme=https;package=com.google.android.apps.maps;end`
      } else if (isIOS) {
        window.location.href = `comgooglemaps://?saddr=${originLat},${originLng}&daddr=${destLat},${destLng}&directionsmode=driving`
        setTimeout(() => {
          window.open(`https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat},${destLng}&travelmode=driving`, '_blank')
        }, 500)
      } else {
        window.open(`https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat},${destLng}&travelmode=driving`, '_blank')
      }
    }
  }, [activeOrder, geofenceConfig])

  const triggerNavigationToCoords = useCallback((lat, lng) => {
    if (!lat || isNaN(parseFloat(lat)) || !lng || isNaN(parseFloat(lng))) return
    
    const userAgent = navigator.userAgent || navigator.vendor || window.opera
    const isAndroid = /android/i.test(userAgent)
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream
    
    if (isAndroid) {
      window.location.href = `google.navigation:q=${lat},${lng}`
    } else if (isIOS) {
      window.location.href = `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`
      setTimeout(() => {
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`, '_blank')
      }, 500)
    } else {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`, '_blank')
    }
  }, [])

  // Keep track of the active order ID to prevent checklist updates on background polling / location updates
  const lastOrderIdRef = useRef(null)

  useEffect(() => {
    if (activeOrder) {
      if (activeOrder.status === 'assigned') {
        setDeliveryStep('heading_to_mart')
      } else if (activeOrder.status === 'preparing_order') {
        setDeliveryStep('packing_checklist')
      } else if (activeOrder.status === 'dispatched') {
        setDeliveryStep('delivering')
      }
      
      // Initialize checklist only if it's a new active order to prevent background updates from resetting checkboxes
      if (lastOrderIdRef.current !== activeOrder.id) {
        lastOrderIdRef.current = activeOrder.id
        setShowingTranslation(false)
        setTranslatedText('')
        setVerificationChecklist(
          activeOrder.order_items.map(item => ({
            id: item.id,
            name: item.product_name,
            quantity: item.quantity,
            image: item.product_image,
            checked: false
          }))
        )
      }
    } else {
      lastOrderIdRef.current = null
    }
  }, [activeOrder])

  const handleTranslateText = useCallback(async (text) => {
    if (!text) return
    if (showingTranslation) {
      setShowingTranslation(false)
      return
    }
    
    setIsTranslating(true)
    try {
      const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|hi`)
      const data = await res.json()
      if (data.responseData?.translatedText) {
        setTranslatedText(data.responseData.translatedText)
        setShowingTranslation(true)
      } else {
        toast.error('Translation failed')
      }
    } catch (err) {
      toast.error('Error translating text')
    } finally {
      setIsTranslating(false)
    }
  }, [showingTranslation])

  const toggleChecklist = useCallback((id) => {
    setVerificationChecklist(prev => 
      prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item)
    )
  }, [])

  const allItemsVerified = verificationChecklist.every(item => item.checked)

  const handleAcceptSwipe = useCallback(async (orderId) => {
    await acceptOrder(orderId)
  }, [acceptOrder])

  const handleArrived = useCallback(async () => {
    if (isUpdatingStep) return
    setIsUpdatingStep(true)
    try {
      await arriveAtMart()
      setDeliveryStep('packing_checklist')
    } catch (err) {
      console.error('Failed to update arrival:', err)
    } finally {
      setIsUpdatingStep(false)
    }
  }, [isUpdatingStep, arriveAtMart])

  const handlePickupSwipe = useCallback(async () => {
    if (isUpdatingStep) return
    setIsUpdatingStep(true)
    try {
      await confirmPickup()
      setDeliveryStep('delivering')
    } catch (err) {
      console.error('Failed to confirm pickup:', err)
    } finally {
      setIsUpdatingStep(false)
    }
  }, [isUpdatingStep, confirmPickup])

  const handleDeliverySwipe = useCallback(async () => {
    setIsProofModalOpen(true)
  }, [])

  const isOnline = captainStatus === 'online' || captainStatus === 'busy'

  return (
    <div className="flex-1 flex flex-col bg-gray-50 dark:bg-[#070709] overflow-y-auto pb-36 relative">
      {/* Top Banner Control */}
      {isOnline && (
        <div className="bg-white/90 dark:bg-[#0c0c14]/90 border-b border-gray-200 dark:border-[#18181f] p-5 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md shadow-sm">
          <div className="flex items-center gap-3">
            <motion.button
              layoutId="duty-toggle-btn"
              onClick={toggleDuty}
              className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all bg-emerald-50 dark:bg-[#00FF66]/10 border border-emerald-250 dark:border-[#00FF66]/20 text-emerald-600 dark:text-[#00FF66] shadow-md shadow-[#00FF66]/5 hover:bg-emerald-100 dark:hover:bg-[#00FF66]/20 active:scale-95"
            >
              <Wifi className="w-4 h-4 text-emerald-500 dark:text-[#00FF66]" /> On Duty
            </motion.button>
            
            <button
              onClick={() => setRadarSoundEnabled(!radarSoundEnabled)}
              className="p-2 border border-gray-200 dark:border-[#23233b] hover:bg-gray-100 dark:hover:bg-[#121220] rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all active:scale-95"
              title={radarSoundEnabled ? "Mute Radar Pings" : "Unmute Radar Pings"}
            >
              {radarSoundEnabled ? <Bell className="w-4 h-4 text-emerald-500 dark:text-[#00FF66]" /> : <BellOff className="w-4 h-4" />}
            </button>
          </div>

          <button 
            onClick={fetchNearbyOrders}
            className="text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-gray-950 dark:hover:text-white border border-gray-200 dark:border-[#23233b] bg-white dark:bg-[#0c0c14] px-4 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-[#121220] transition-all active:scale-95"
          >
            Refresh Radar
          </button>
        </div>
      )}

      {/* Duty Container */}
      <div className="flex-1 max-w-md w-full mx-auto p-4 flex flex-col pb-24">
        {!isOnline ? (
          // STATE 1: OFFLINE RESTING
          <div className="flex-1 flex flex-col items-center justify-center text-center py-20 px-6 relative overflow-hidden">
            {/* Ambient background glows */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-[#FF3366]/5 dark:bg-[#FF3366]/5 rounded-full blur-[80px] pointer-events-none animate-pulse-subtle"></div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="bg-white/80 dark:bg-[#0c0c14]/85 border border-gray-200/80 dark:border-[#181829] rounded-[2.5rem] p-8 max-w-sm w-full shadow-[0_8px_30px_rgb(0,0,0,0.03)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] flex flex-col items-center relative overflow-hidden backdrop-blur-md"
            >
              {/* Subtle background glow inside the card */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#FF3366]/5 rounded-full blur-2xl pointer-events-none"></div>

              <div className="bg-red-50 dark:bg-[#FF3366]/5 p-6 rounded-full text-red-500 dark:text-[#FF3366] mb-6 relative border border-red-100/20 dark:border-[#FF3366]/10">
                <Compass className="w-14 h-14 stroke-[1.5] animate-pulse" />
                <span className="absolute bottom-1.5 right-1.5 w-4.5 h-4.5 rounded-full bg-[#FF3366] border-4 border-white dark:border-[#0c0c14] animate-ping"></span>
                <span className="absolute bottom-1.5 right-1.5 w-4.5 h-4.5 rounded-full bg-[#FF3366] border-4 border-white dark:border-[#0c0c14]"></span>
              </div>
              
              <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">You are Offline</h3>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-2 max-w-[240px] leading-relaxed">
                Toggle On Duty to start receiving nearby fresh delivery broadcasts.
              </p>

              <motion.button
                layoutId="duty-toggle-btn"
                onClick={toggleDuty}
                className="mt-8 w-full py-4 bg-gradient-to-r from-[#FF3366] to-[#ff4e7c] text-white font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2.5 transition-all duration-300 shadow-lg shadow-[#FF3366]/20 hover:shadow-[#FF3366]/30 active:scale-[0.97] border border-white/10"
              >
                <WifiOff className="w-4 h-4 text-white" />
                <span>Go On Duty</span>
              </motion.button>
            </motion.div>
          </div>
        ) : activeOrder ? (
          // STATE 2: ACTIVE ORDER ASSIGNED AND IN DELIVERY CYCLE
          <div className="space-y-6">
            {/* Delivery Steps Header Card */}
            <div className="bg-white dark:bg-[#0c0c14] border border-gray-200/80 dark:border-[#181829] rounded-[1.75rem] p-5 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-emerald-500 dark:text-[#00FF66] animate-spin" style={{ animationDuration: '6s' }} />
                <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">Active Delivery Task</span>
              </div>
              <span className="font-mono text-xs font-bold bg-gray-50 dark:bg-[#141423] text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-[#222238] px-2.5 py-1 rounded-lg">
                #{activeOrder.order_number}
              </span>
            </div>

            {/* STEP 1: Heading to Mart */}
            {deliveryStep === 'heading_to_mart' && (
              <div className="space-y-5 animate-fadeIn">
                <div className="bg-white dark:bg-[#0c0c14] border border-gray-200/80 dark:border-[#181829] rounded-[1.75rem] p-6 space-y-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="bg-emerald-50 dark:bg-[#00FF66]/10 p-2.5 rounded-xl border border-emerald-100 dark:border-[#00FF66]/10 text-emerald-600 dark:text-[#00FF66] font-bold text-xs shrink-0">
                      STEP 1
                    </div>
                    <div>
                      <h4 className="font-bold text-base text-gray-900 dark:text-white">Drive to Pickup Location</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Collect the sealed order bag from Mart</p>
                    </div>
                  </div>

                  {!mapConfig?.hide_mart_pickup && (
                    <div className="p-5 bg-gray-50 dark:bg-[#12121c] border border-gray-200/60 dark:border-[#1e1e32] rounded-2xl space-y-3 shadow-sm">
                      <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Pickup From</p>
                      <div>
                        <p className="font-black text-base text-gray-800 dark:text-gray-200">OZO Mega Mart</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                          Apna Bazar, Near Bypass Crossing, City Main Road
                        </p>
                        <div className="mt-2 text-[10px] font-mono text-gray-400 dark:text-gray-450 bg-white dark:bg-[#0c0c14] p-1.5 rounded border border-gray-200 dark:border-[#222238] flex justify-between">
                          <span>Lat: {geofenceConfig?.warehouse_lat || 24.745736}</span>
                          <span>Lng: {geofenceConfig?.warehouse_lng || 84.390014}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Order Items Summary */}
                  <div className="p-5 bg-gray-50 dark:bg-[#12121c] border border-gray-200/60 dark:border-[#1e1e32] rounded-2xl space-y-3 shadow-sm">
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <ShoppingBag className="w-3.5 h-3.5 text-emerald-500 dark:text-[#00FF66]" />
                      Items to Pick Up ({activeOrder.order_items?.reduce((acc, item) => acc + (item.quantity || 0), 0) || 0} Total Qty)
                    </p>
                    <div className="divide-y divide-gray-200 dark:divide-[#1e1e32] space-y-2">
                      {activeOrder.order_items?.map((item, idx) => (
                        <div key={item.id || idx} className="pt-2 first:pt-0 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            {item.product_image && (
                              <img 
                                src={item.product_image} 
                                alt={item.product_name} 
                                className="w-9 h-9 object-cover rounded-lg border border-gray-200 dark:border-[#232338]" 
                              />
                            )}
                            <div>
                              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 leading-tight line-clamp-1">
                                {item.product_name}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs font-black px-2 py-0.5 rounded bg-white dark:bg-[#0c0c14] border border-gray-200 dark:border-[#222238] text-gray-550 dark:text-gray-400 whitespace-nowrap">
                            QTY: {item.quantity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {!mapConfig?.hide_mart_pickup && (
                    <button 
                      onClick={() => triggerNavigationToCoords(geofenceConfig?.warehouse_lat || 24.745736, geofenceConfig?.warehouse_lng || 84.390014)}
                      className="w-full py-3.5 px-4 rounded-xl border border-blue-500/20 dark:border-blue-500/30 bg-gradient-to-r from-blue-50/60 via-emerald-50/60 to-yellow-50/60 dark:from-blue-950/15 dark:via-emerald-950/15 dark:to-yellow-950/15 text-blue-750 dark:text-blue-300 hover:from-blue-100/70 hover:via-emerald-100/70 hover:to-yellow-100/70 dark:hover:from-blue-900/35 dark:hover:via-emerald-900/35 dark:hover:to-yellow-900/35 font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-500/5 active:scale-[0.98] group"
                    >
                      <svg className="w-5 h-5 shrink-0 transition-transform group-hover:scale-110" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19.5 9.5c0-4.14-3.36-7.5-7.5-7.5S4.5 5.36 4.5 9.5c0 3.54 2.86 7.06 6.88 11.23c.34.35.9.35 1.24 0c4.02-4.17 6.88-7.69 6.88-11.23z" fill="#EA4335" />
                        <path d="M12 2C7.86 2 4.5 5.36 4.5 9.5c0 3.54 2.86 7.06 6.88 11.23c.34.35.9.35 1.24 0L13 20.3c-3.66-3.8-6.5-6.84-6.5-10.8C6.5 6.13 8.96 3.5 12 3.5s5.5 2.63 5.5 6c0 1.95-.58 3.8-1.55 5.61l.4.41C17.43 13.56 18 11.47 18 9.5C18 5.36 14.64 2 12 2z" fill="#34A853" />
                        <path d="M12 6.5c-1.66 0-3 1.34-3 3s1.34 3 3 3s3-1.34 3-3s-1.34-3-3-3z" fill="#4285F4" />
                        <circle cx="12" cy="9.5" r="1.5" fill="#FBBC05" />
                      </svg>
                      Open Google Maps (Navigate to Mart)
                    </button>
                  )}

                  {/* SVG Route Visualization */}
                  {!mapConfig?.hide_map && !mapConfig?.hide_mart_pickup && (
                    <div className="h-44 bg-gray-100 dark:bg-[#0a0a0f] border border-gray-200/60 dark:border-[#181829] rounded-2xl overflow-hidden relative flex items-center justify-center shadow-sm">
                      <div className="absolute inset-0 opacity-[0.07] bg-[radial-gradient(#00FF66_1px,transparent_1px)] [background-size:16px_16px]"></div>
                      {/* Simulated Path */}
                      <svg className="w-full h-full px-6" viewBox="0 0 300 150">
                        {/* Grid / Roads */}
                        <path d="M 0,75 L 300,75" stroke="currentColor" className="text-gray-200 dark:text-[#1d1d2d]" strokeWidth="6" strokeLinecap="round" />
                        <path d="M 150,0 L 150,150" stroke="currentColor" className="text-gray-200 dark:text-[#1d1d2d]" strokeWidth="6" strokeLinecap="round" />
                        
                        {/* Route Line */}
                        <path d="M 50,75 L 150,75 L 150,30 L 250,30" fill="none" stroke="#00FF66" strokeWidth="3" strokeDasharray="6,4" strokeLinecap="round" className="animate-pulse" />
                        
                        {/* Rider dot */}
                        <circle cx="50" cy="75" r="7" fill="#00FF66" />
                        <text x="35" y="60" fill="#00FF66" fontSize="10" fontWeight="bold">Rider (You)</text>
                        
                        {/* Mart dot */}
                        <circle cx="250" cy="30" r="7" fill="#FFD133" />
                        <text x="230" y="52" fill="#FFD133" fontSize="10" fontWeight="bold">Apna Bazar</text>
                      </svg>
                    </div>
                  )}

                  <button
                    onClick={handleArrived}
                    disabled={isUpdatingStep}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-[#00FF66] to-[#00CC52] text-black font-black text-sm hover:shadow-lg hover:shadow-[#00FF66]/10 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUpdatingStep ? 'Processing...' : 'I Have Arrived at Mart'}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Collect & Check Items */}
            {deliveryStep === 'packing_checklist' && (
              <div className="space-y-5 animate-fadeIn">
                <div className="bg-white dark:bg-[#0c0c14] border border-gray-200/80 dark:border-[#181829] rounded-[1.75rem] p-6 space-y-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="bg-sky-50 dark:bg-[#33B8FF]/10 p-2.5 rounded-xl border border-sky-100 dark:border-[#33B8FF]/10 text-sky-600 dark:text-[#33B8FF] font-bold text-xs shrink-0">
                      STEP 2
                    </div>
                    <div>
                      <h4 className="font-bold text-base text-gray-900 dark:text-white">Verify Order Items</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Tick items at counter to confirm pickup</p>
                    </div>
                  </div>

                  {/* Checklist */}
                  <div className="border border-gray-200/80 dark:border-[#18182a] bg-white dark:bg-[#12121d] rounded-2xl divide-y divide-gray-200 dark:divide-[#18182a] overflow-hidden shadow-sm">
                    {verificationChecklist.map(item => (
                      <div 
                        key={item.id}
                        onClick={() => toggleChecklist(item.id)}
                        className="p-3.5 flex items-center justify-between cursor-pointer select-none hover:bg-gray-50 dark:hover:bg-[#151525]"
                      >
                        <div className="flex items-center gap-3">
                          {item.checked ? (
                            <div className="w-5 h-5 rounded bg-sky-500 dark:bg-[#33B8FF] flex items-center justify-center text-white dark:text-black shrink-0">
                              <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded border-2 border-gray-300 dark:border-gray-600 shrink-0"></div>
                          )}
                          {item.image && (
                            <img 
                              src={item.image} 
                              alt={item.name} 
                              className="w-9 h-9 object-cover rounded-lg border border-gray-250 dark:border-[#232338] shrink-0" 
                            />
                          )}
                          <span className={`text-sm font-semibold ${item.checked ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-850 dark:text-gray-200'}`}>
                            {item.name}
                          </span>
                        </div>

                        <span className="text-xs font-black px-2 py-0.5 rounded bg-gray-100 dark:bg-[#1e1e2d] border border-gray-200 dark:border-[#2b2b3f] text-gray-550 dark:text-gray-400">
                          QTY: {item.quantity}
                        </span>
                      </div>
                    ))}
                  </div>

                  {allItemsVerified ? (
                    <SwipeButton 
                      onSwipeComplete={handlePickupSwipe} 
                      text={isUpdatingStep ? 'Processing...' : "Swipe to Pick Up Bag"} 
                      color="#33B8FF"
                      disabled={isUpdatingStep}
                    />
                  ) : (
                    <button
                      disabled
                      className="w-full py-4 rounded-xl bg-gray-100 dark:bg-[#1c1c2b] text-gray-450 dark:text-gray-550 border border-gray-200 dark:border-[#2b2b3f] cursor-not-allowed font-bold text-xs flex items-center justify-center gap-1.5"
                    >
                      Verify checklist to pick up
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* STEP 3: Delivering to Customer */}
            {deliveryStep === 'delivering' && (
              <div className="space-y-5 animate-fadeIn">
                <div className="bg-white dark:bg-[#0c0c14] border border-gray-200/80 dark:border-[#181829] rounded-[1.75rem] p-6 space-y-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="bg-amber-50 dark:bg-[#FF9900]/10 p-2.5 rounded-xl border border-amber-100 dark:border-[#FF9900]/10 text-amber-600 dark:text-[#FF9900] font-bold text-xs shrink-0">
                      STEP 3
                    </div>
                    <div>
                      <h4 className="font-bold text-base text-gray-900 dark:text-white">Out for Delivery</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Navigate to customer location safely</p>
                    </div>
                  </div>

                  {/* Customer Delivery details */}
                  <div className="space-y-4">
                    {/* User Details */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">Customer</p>
                        <p className="font-extrabold text-base text-gray-900 dark:text-white mt-0.5">
                          {activeOrder.recipient_name || activeOrder.user?.full_name || 'Ozo Customer'}
                          {activeOrder.order_for === 'other' && (
                            <span className="ml-2 text-[9px] font-black uppercase text-ozo-red bg-red-50 dark:bg-ozo-red/10 px-1.5 py-0.5 rounded">For Other</span>
                          )}
                        </p>
                      </div>

                      {/* Phone call shortcut */}
                      {(activeOrder.recipient_phone || activeOrder.user?.phone) ? (
                        <a 
                          href={`tel:${activeOrder.recipient_phone || activeOrder.user?.phone}`}
                          className="flex items-center gap-1.5 bg-emerald-50 dark:bg-[#00FF66]/10 text-emerald-600 dark:text-[#00FF66] hover:bg-emerald-105 dark:hover:bg-[#00FF66]/20 border border-emerald-100 dark:border-[#00FF66]/20 px-3 py-1.5 rounded-xl text-xs font-black transition-all active:scale-95 shadow-sm"
                        >
                          <Phone className="w-3.5 h-3.5 stroke-[2.5] animate-pulse" />
                          Call Client
                        </a>
                      ) : (
                        <span className="text-[10px] font-bold text-gray-450 dark:text-gray-550 bg-gray-100 dark:bg-gray-800 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-transparent">
                          No Phone
                        </span>
                      )}
                    </div>

                    <div className="border-t border-gray-150 dark:border-white/5 my-3"></div>

                    {/* Address details */}
                    <div>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">Delivery Address</p>
                      {activeOrder.house_no ? (
                        <p className="text-sm font-semibold text-gray-850 dark:text-gray-300 mt-1 leading-relaxed">
                          <span className="font-extrabold text-gray-900 dark:text-white">{activeOrder.house_no}</span>, {activeOrder.street_gali}
                          <br />
                          {activeOrder.delivery_city} - {activeOrder.address?.pincode || '824101'}
                        </p>
                      ) : (activeOrder.address?.address_line1 || activeOrder.address?.address_line2) ? (
                        <p className="text-sm font-semibold text-gray-850 dark:text-gray-300 mt-1 leading-relaxed">
                          {activeOrder.address?.address_line1}
                          {activeOrder.address?.address_line2 && `, ${activeOrder.address.address_line2}`}
                          <br />
                          {activeOrder.address?.city && `${activeOrder.address.city} - `}{activeOrder.address?.pincode}
                        </p>
                      ) : (
                        <p className="text-xs font-bold text-amber-500 mt-1 leading-relaxed bg-amber-500/5 border border-amber-500/10 px-3 py-2 rounded-xl">
                          Drop coordinates available. Live Map location active below.
                        </p>
                      )}

                      {activeOrder.address?.latitude && activeOrder.address?.longitude && (
                        <div className="mt-2.5 text-[10px] font-mono text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900/40 p-2 rounded-lg border border-gray-100 dark:border-gray-800/40 flex justify-between">
                          <span>Lat: {parseFloat(activeOrder.address.latitude).toFixed(6)}</span>
                          <span>Lng: {parseFloat(activeOrder.address.longitude).toFixed(6)}</span>
                        </div>
                      )}
                    </div>

                    {(() => {
                      const rawLandmark = activeOrder.landmark || activeOrder.address?.landmark;
                      const parsed = parseLandmark(rawLandmark);
                      let displayLandmark = parsed.landmark;
                      if (parsed.notes) {
                        displayLandmark = displayLandmark ? `${displayLandmark} (Note: ${parsed.notes})` : parsed.notes;
                      }
                      if (!displayLandmark) return null;
                      return (
                        <div className="p-3.5 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-200/30 dark:border-amber-500/20 rounded-xl text-xs">
                          <p className="font-bold text-amber-600 dark:text-amber-400">Landmark / Instructions</p>
                          <p className="font-extrabold text-gray-850 dark:text-gray-200 mt-1">
                            {displayLandmark}
                          </p>
                        </div>
                      );
                    })()}

                    {activeOrder.delivery_instructions && (
                      <div className="p-3.5 bg-indigo-500/5 dark:bg-indigo-950/20 border border-indigo-200/30 dark:border-indigo-500/10 rounded-xl text-xs space-y-2 mt-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                            Delivery Instructions
                          </p>
                          <button
                            onClick={() => handleTranslateText(activeOrder.delivery_instructions)}
                            disabled={isTranslating}
                            className="text-[9px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/40 hover:bg-indigo-200 dark:hover:bg-indigo-900/60 px-2 py-1 rounded transition-all flex items-center gap-1 active:scale-95 disabled:opacity-50"
                          >
                            {isTranslating ? (
                              <span>Translating...</span>
                            ) : showingTranslation ? (
                              <span>Show Original</span>
                            ) : (
                              <span>Translate (अनुवाद करें)</span>
                            )}
                          </button>
                        </div>
                        <p className="font-extrabold text-gray-850 dark:text-gray-200 mt-1 leading-relaxed text-sm">
                          {showingTranslation ? translatedText : activeOrder.delivery_instructions}
                        </p>
                      </div>
                    )}

                    <div className="border-t border-gray-150 dark:border-white/5 my-3"></div>

                    {/* Items List */}
                    <div className="space-y-2">
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <ShoppingBag className="w-3.5 h-3.5 text-emerald-500 dark:text-[#00FF66]" />
                        Items to Deliver ({activeOrder.order_items?.reduce((acc, item) => acc + (item.quantity || 0), 0) || 0} items)
                      </p>
                      <div className="bg-gray-50 dark:bg-gray-900/40 rounded-xl p-3.5 border border-gray-100 dark:border-gray-800/40 divide-y divide-gray-100 dark:divide-gray-800/60 space-y-2">
                        {activeOrder.order_items?.map((item, idx) => (
                          <div key={item.id || idx} className="pt-2 first:pt-0 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              {item.product_image && (
                                <img 
                                  src={item.product_image} 
                                  alt={item.product_name} 
                                  className="w-8 h-8 object-cover rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm" 
                                />
                              )}
                              <span className="font-bold text-xs text-gray-800 dark:text-gray-200 line-clamp-1">{item.product_name}</span>
                            </div>
                            <span className="font-mono text-xs font-bold text-gray-400 dark:text-gray-550">x{item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-gray-150 dark:border-white/5 my-3"></div>

                    {/* Action buttons */}
                    <div className="space-y-2 flex flex-col pt-1">
                      {activeOrder.google_maps_url ? (
                        <button 
                          onClick={() => window.open(activeOrder.google_maps_url, '_blank')}
                          className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-emerald-600 to-teal-600 hover:from-blue-700 hover:via-emerald-700 hover:to-teal-700 text-white font-black text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98] group"
                        >
                          <svg className="w-5 h-5 shrink-0 transition-transform group-hover:scale-110" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M19.5 9.5c0-4.14-3.36-7.5-7.5-7.5S4.5 5.36 4.5 9.5c0 3.54 2.86 7.06 6.88 11.23c.34.35.9.35 1.24 0c4.02-4.17 6.88-7.69 6.88-11.23z" fill="#EA4335" />
                            <path d="M12 2C7.86 2 4.5 5.36 4.5 9.5c0 3.54 2.86 7.06 6.88 11.23c.34.35.9.35 1.24 0L13 20.3c-3.66-3.8-6.5-6.84-6.5-10.8C6.5 6.13 8.96 3.5 12 3.5s5.5 2.63 5.5 6c0 1.95-.58 3.8-1.55 5.61l.4.41C17.43 13.56 18 11.47 18 9.5C18 5.36 14.64 2 12 2z" fill="#34A853" />
                            <path d="M12 6.5c-1.66 0-3 1.34-3 3s1.34 3 3 3s3-1.34 3-3s-1.34-3-3-3z" fill="#4285F4" />
                            <circle cx="12" cy="9.5" r="1.5" fill="#FBBC05" />
                          </svg>
                          Open Location on Google Maps
                        </button>
                      ) : (
                        <button 
                          onClick={() => triggerNavigation(true)}
                          className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-emerald-600 to-teal-600 hover:from-blue-700 hover:via-emerald-700 hover:to-teal-700 text-white font-black text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98] group"
                        >
                          <svg className="w-5 h-5 shrink-0 transition-transform group-hover:scale-110" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M19.5 9.5c0-4.14-3.36-7.5-7.5-7.5S4.5 5.36 4.5 9.5c0 3.54 2.86 7.06 6.88 11.23c.34.35.9.35 1.24 0c4.02-4.17 6.88-7.69 6.88-11.23z" fill="#EA4335" />
                            <path d="M12 2C7.86 2 4.5 5.36 4.5 9.5c0 3.54 2.86 7.06 6.88 11.23c.34.35.9.35 1.24 0L13 20.3c-3.66-3.8-6.5-6.84-6.5-10.8C6.5 6.13 8.96 3.5 12 3.5s5.5 2.63 5.5 6c0 1.95-.58 3.8-1.55 5.61l.4.41C17.43 13.56 18 11.47 18 9.5C18 5.36 14.64 2 12 2z" fill="#34A853" />
                            <path d="M12 6.5c-1.66 0-3 1.34-3 3s1.34 3 3 3s3-1.34 3-3s-1.34-3-3-3z" fill="#4285F4" />
                            <circle cx="12" cy="9.5" r="1.5" fill="#FBBC05" />
                          </svg>
                          Navigate to Customer Live Location
                        </button>
                      )}
                    </div>
                  </div>

                  {/* COD Cash Collection Indicator */}
                  {activeOrder.payment_method === 'cod' ? (
                    <div className="bg-red-50 dark:bg-[#FF3366]/10 border border-red-200/50 dark:border-[#FF3366]/20 p-4 rounded-xl flex items-start gap-2.5 text-red-600 dark:text-[#FF3366]">
                      <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-black text-sm">COLLECT COD CASH: ₹{activeOrder.total.toFixed(2)}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                          This is a Cash on Delivery order. Collect full cash before sliding to deliver.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-emerald-50 dark:bg-[#00FF66]/10 border border-emerald-200/50 dark:border-[#00FF66]/20 p-4 rounded-xl flex items-start gap-2.5 text-emerald-700 dark:text-[#00FF66]">
                      <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-sm">PREPAID ORDER (₹{activeOrder.total.toFixed(2)})</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                          No cash needs to be collected. Leave order at door or hand over directly.
                        </p>
                      </div>
                    </div>
                  )}

                  <SwipeButton 
                    onSwipeComplete={handleDeliverySwipe} 
                    text="Swipe to Confirm Delivery" 
                    color="#00FF66"
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          // STATE 3: DUTY ACTIVE, RADAR BROADCAST LIST
          <div className="space-y-6">
            {/* Radar Header */}
            <div className="bg-white dark:bg-[#0c0c14] border border-gray-200/80 dark:border-[#181829] rounded-[1.75rem] p-5 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00FF66] animate-ping"></span>
                <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">Searching for Orders...</span>
              </div>
              <span className="text-xs text-gray-500 font-semibold">
                Radar active
              </span>
            </div>

            {/* Radar List */}
            {isLoadingRadar ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-gray-500">
                <div className="w-7 h-7 border-3 border-t-[#00FF66] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                <p className="text-xs">Connecting radar ping...</p>
              </div>
            ) : nearbyOrders.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-center px-6 bg-white dark:bg-[#0c0c14] border border-gray-200/80 dark:border-[#181829] rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.03)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] relative overflow-hidden">
                {/* Radar ripples */}
                <div className="absolute w-64 h-64 border border-[#00FF66]/10 rounded-full animate-ping pointer-events-none" style={{ animationDuration: '3s' }}></div>
                <div className="absolute w-44 h-44 border border-[#00FF66]/20 rounded-full animate-ping pointer-events-none" style={{ animationDuration: '4s' }}></div>
                
                <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-[#00FF66]/5 flex items-center justify-center text-emerald-500 dark:text-[#00FF66] mb-4 relative shadow-inner border border-emerald-100/30 dark:border-[#00FF66]/15">
                  <Compass className="w-8 h-8 animate-spin-slow text-[#00FF66]" />
                  <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-[#00FF66] border-2 border-white dark:border-[#0c0c14] animate-pulse"></span>
                </div>
                <p className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-wider">Waiting for Orders</p>
                <p className="text-xs text-gray-550 dark:text-gray-400 mt-1.5 max-w-[240px] leading-relaxed">
                  Orders packed by OZO Supermarket will instantly flash here with chime sound.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {nearbyOrders.map(order => (
                  <OrderCard 
                    key={order.id} 
                    order={order} 
                    onAccept={handleAcceptSwipe} 
                  />
                ))}
              </div>
            )}
          </div>
        )}
        {/* Delivery Verification Proof Modal */}
        <AnimatePresence>
          {isProofModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="bg-white dark:bg-[#0c0c14] rounded-[2.5rem] p-6 max-w-md w-full shadow-2xl border border-gray-200 dark:border-[#181829] relative overflow-y-auto max-h-[90vh] space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-gray-900 dark:text-white">
                    <Camera size={24} className="text-emerald-500 dark:text-[#00FF66]" />
                    <h3 className="text-lg font-black uppercase tracking-tight">Delivery Proof</h3>
                  </div>
                  <button
                    onClick={() => setIsProofModalOpen(false)}
                    className="p-1 hover:bg-gray-150 dark:hover:bg-white/5 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="p-4 bg-emerald-50/50 dark:bg-[#00FF66]/5 border border-emerald-100 dark:border-[#00FF66]/20 rounded-2xl">
                  <h5 className="text-[10px] font-black text-emerald-600 dark:text-[#00FF66] uppercase tracking-widest mb-1">Mandatory Photo Upload</h5>
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 leading-relaxed">
                    You must upload at least 2 live photos of delivery proof to complete the delivery. Make sure the pictures are clear.
                  </p>
                </div>

                {/* Photo 1: Doorstep/Customer handoff */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                    Photo 1: Package at doorstep / with customer
                  </label>
                  <ImageUpload
                    value={proofImage1}
                    onChange={setProofImage1}
                    multiple={false}
                    cameraOnly={true}
                    label="Capture Doorstep Proof"
                  />
                </div>

                {/* Photo 2: Location/Building reference */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-gray-400 dark:text-gray-505 uppercase tracking-widest">
                    Photo 2: Building number / house / location proof
                  </label>
                  <ImageUpload
                    value={proofImage2}
                    onChange={setProofImage2}
                    multiple={false}
                    cameraOnly={true}
                    label="Capture Location Proof"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsProofModalOpen(false)}
                    className="flex-1 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-[#181829] text-gray-900 dark:text-white rounded-2xl font-black text-xs hover:bg-gray-100 dark:hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleProofSubmit}
                    disabled={isSubmittingProof || !proofImage1 || !proofImage2}
                    className="flex-1 py-3 bg-[#00FF66] text-black font-black rounded-2xl text-xs hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-[#00FF66]/10"
                  >
                    {isSubmittingProof ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin text-black"></span>
                        Submitting...
                      </>
                    ) : (
                      'Complete Delivery'
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default CaptainRadar
