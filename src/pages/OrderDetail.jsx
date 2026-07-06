import { useEffect, useState, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronLeft, 
  Package, 
  MapPin, 
  Truck, 
  CreditCard, 
  Clock, 
  Printer, 
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Phone,
  MessageSquare,
  Star,
  Loader2,
  ExternalLink,
  RefreshCw
} from 'lucide-react'
import { useOrderStore } from '../stores/orderStore'
import { useAuthStore } from '../stores/authStore'
import { useCartStore } from '../stores/cartStore'
import { useOzoQuery } from '../hooks/useOzoQuery'
import { useLanguageStore } from '../stores/languageStore'
import Breadcrumb from '../components/Breadcrumb'
import OzoLoadingGuard from '../components/OzoLoadingGuard'
import ReasonSelector from '../components/ReasonSelector'
import ImageUpload from '../components/ImageUpload'
import OptimizedImage from '../components/OptimizedImage'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'

import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

const getGoogleMapsUrl = (address, order) => {
  if (order && order.latitude && order.longitude) {
    return `https://www.google.com/maps/search/?api=1&query=${order.latitude},${order.longitude}`;
  }
  if (address && address.latitude && address.longitude) {
    return `https://www.google.com/maps/search/?api=1&query=${address.latitude},${address.longitude}`;
  }
  if (!address) return '';
  const addressParts = [
    address.address_line1,
    address.address_line2,
    address.city,
    address.state,
    address.pincode
  ].filter(Boolean);
  const addressString = addressParts.join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressString)}`;
};

// Live tracking map card component for customers using MapLibre GL JS
const OrderTrackingMap = ({ order }) => {
  const customerLat = order?.latitude ? parseFloat(order.latitude) : null
  const customerLng = order?.longitude ? parseFloat(order.longitude) : null

  const captainLat = order?.rider?.current_lat ? parseFloat(order.rider.current_lat) : null
  const captainLng = order?.rider?.current_long ? parseFloat(order.rider.current_long) : null

  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const customerMarkerRef = useRef(null)
  const captainMarkerRef = useRef(null)

  const streetStyle = useMemo(() => ({
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
  }), [])

  const hasRiderCoords = captainLat && captainLng

  // Initialize Map
  useEffect(() => {
    if (!customerLat || !customerLng || !mapContainerRef.current) return

    if (mapRef.current) {
      mapRef.current.remove()
      mapRef.current = null
      customerMarkerRef.current = null
      captainMarkerRef.current = null
    }

    const centerLng = hasRiderCoords ? (customerLng + captainLng) / 2 : customerLng
    const centerLat = hasRiderCoords ? (customerLat + captainLat) / 2 : customerLat

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: streetStyle,
      center: [centerLng, centerLat],
      zoom: 14,
      attributionControl: false
    })

    mapRef.current = map

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [customerLat, customerLng])

  // Update Markers and Polyline
  useEffect(() => {
    const map = mapRef.current
    if (!map || !customerLat || !customerLng) return

    // Setup / update Customer marker
    if (!customerMarkerRef.current) {
      const el = document.createElement('div')
      el.className = 'customer-home-pin'
      el.innerHTML = `
        <div class="relative flex flex-col items-center">
          <div class="absolute w-8 h-8 bg-[#E23744]/25 rounded-full animate-pulse -bottom-4"></div>
          <div class="relative w-10 h-10 rounded-full border-2 border-[#E23744] bg-white shadow-lg overflow-hidden flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E23744" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="text-ozo-red"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          <div class="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-[#E23744] -mt-0.5"></div>
        </div>
      `
      customerMarkerRef.current = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([customerLng, customerLat])
        .addTo(map)
    } else {
      customerMarkerRef.current.setLngLat([customerLng, customerLat])
    }

    // Setup / update Captain marker and Polyline route path
    const drawRouteAndCaptain = () => {
      if (hasRiderCoords) {
        if (!captainMarkerRef.current) {
          const selfieUrl = order?.rider?.selfie_url
          const initials = order?.rider?.full_name?.split(' ').map(n => n[0]).join('') || 'C'
          const el = document.createElement('div')
          el.className = 'captain-live-pin'
          el.innerHTML = `
            <div class="relative flex flex-col items-center">
              <div class="absolute w-8 h-8 bg-emerald-500/25 rounded-full animate-ping -bottom-4"></div>
              <div class="relative w-10 h-10 rounded-full border-2 border-emerald-500 bg-white shadow-lg overflow-hidden flex items-center justify-center">
                ${selfieUrl 
                  ? `<img src="${selfieUrl}" class="w-full h-full object-cover" />` 
                  : `<span class="text-xs font-black text-emerald-600">${initials}</span>`
                }
              </div>
              <div class="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-emerald-500 -mt-0.5"></div>
            </div>
          `
          captainMarkerRef.current = new maplibregl.Marker({ element: el, anchor: 'bottom' })
            .setLngLat([captainLng, captainLat])
            .addTo(map)
        } else {
          captainMarkerRef.current.setLngLat([captainLng, captainLat])
        }

        // Draw Polyline route between captain and customer
        if (map.getSource('route')) {
          map.removeLayer('route-line')
          map.removeSource('route')
        }

        map.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: [
                [captainLng, captainLat],
                [customerLng, customerLat]
              ]
            }
          }
        })

        map.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#10B981',
            'line-width': 3,
            'line-dasharray': [2, 2]
          }
        })

        // Adjust bounds to fit both points
        const bounds = new maplibregl.LngLatBounds()
        bounds.extend([customerLng, customerLat])
        bounds.extend([captainLng, captainLat])
        map.fitBounds(bounds, { padding: 50, maxZoom: 16 })
      } else {
        // Just fit customer
        map.panTo([customerLng, customerLat])
        if (captainMarkerRef.current) {
          captainMarkerRef.current.remove()
          captainMarkerRef.current = null
        }
        if (map.getLayer('route-line')) map.removeLayer('route-line')
        if (map.getSource('route')) map.removeSource('route')
      }
    }

    if (map.isStyleLoaded()) {
      drawRouteAndCaptain()
    } else {
      map.once('style.load', drawRouteAndCaptain)
    }

  }, [customerLat, customerLng, captainLat, captainLng, hasRiderCoords])

  if (!customerLat || !customerLng) {
    return null
  }

  return (
    <div className="bg-white dark:bg-[#121214] rounded-[2.5rem] p-8 shadow-sm border border-gray-100 dark:border-white/5 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
            <Truck size={22} className="text-ozo-red animate-pulse" />
            Live <span className="text-gradient">Tracking.</span>
          </h3>
          <p className="text-xs text-gray-400 font-bold mt-1">
            {hasRiderCoords 
              ? "Track your Captain's live location on the map" 
              : "Live location will be available as soon as the Captain departs"
            }
          </p>
        </div>
        {hasRiderCoords && (
          <span className="self-start sm:self-auto px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest animate-pulse">
            Active Tracking
          </span>
        )}
      </div>

      <div className="w-full h-[350px] rounded-3xl overflow-hidden border border-gray-100 dark:border-white/5 relative bg-gray-50 dark:bg-zinc-900 z-10">
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  )
}

const ProductReviewForm = ({ productId, onSubmit, isSubmitting }) => {
  const [rating, setRating] = useState(5)
  const [reviewText, setReviewText] = useState('')
  const [images, setImages] = useState([])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!reviewText.trim()) return
    onSubmit(productId, rating, reviewText, images)
  }

  return (
    <div className="bg-gray-50/50 dark:bg-white/[0.01] border border-gray-100 dark:border-white/5 rounded-[2rem] p-6 space-y-4 w-full mt-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-black uppercase tracking-tight text-gray-900 dark:text-white flex items-center gap-1.5">
          <Star size={16} className="text-yellow-500 fill-current" />
          Write a Review
        </h4>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
          Rating
        </span>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((stars) => (
            <button
              type="button"
              key={stars}
              onClick={() => setRating(stars)}
              className="hover:scale-110 transition-transform focus:outline-none"
            >
              <Star
                size={24}
                className={`${
                  stars <= rating
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300 dark:text-gray-650'
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
          Review Message
        </label>
        <textarea
          rows={3}
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          placeholder="What did you like or dislike about this product? Share your experience..."
          className="w-full rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#09090b] px-4 py-3 text-sm focus:border-ozo-red focus:outline-none focus:ring-1 focus:ring-ozo-red dark:text-white font-medium placeholder:text-gray-400 dark:placeholder:text-gray-550 placeholder:opacity-50 resize-none overflow-hidden"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
          Product Images
        </label>
        <ImageUpload
          value={images}
          onChange={setImages}
          multiple={true}
          limit={3}
          label="Add Photos (Max 3)"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || !reviewText.trim()}
          className="w-full py-3 bg-gradient-ozo text-white rounded-2xl font-black text-xs hover:opacity-90 disabled:opacity-50 transition-all shadow-ozo flex items-center justify-center gap-1.5"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting...
            </>
          ) : (
            'Submit Review'
          )}
        </button>
      </div>
    </div>
  )
}

const OrderDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { currentOrder, fetchOrderById, cancelOrder, serverTimeOffset } = useOrderStore()
  const { isAdmin, profile } = useAuthStore()
  const isOrderOwner = currentOrder?.user_id === profile?.id
  const { t } = useLanguageStore()
  const mapConfig = useCartStore(state => state.mapConfig)
  const fetchSettings = useCartStore(state => state.fetchSettings)

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const handlePrintInvoice = () => {
    window.print()
  }

  const breadcrumbItems = useMemo(() => {
    return [
      { name: t('home') || 'Home', url: '/' },
      { name: t('myOrders') || 'My Orders', url: '/orders' },
      { name: 'Order Details', url: null }
    ]
  }, [t, currentOrder])

  // High-friction cancellation state to prevent accidental/casual cancellation
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false)
  const [hasCalledPartner, setHasCalledPartner] = useState(false)
  const [confirmationText, setConfirmationText] = useState('')
  const [isCancelling, setIsCancelling] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelCustomNote, setCancelCustomNote] = useState('')

  // Reviews state
  const [reviews, setReviews] = useState([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)
  const [hasAutoPrompted, setHasAutoPrompted] = useState(false)

  // Return requests state
  const [returnRequestInfo, setReturnRequestInfo] = useState(null)
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false)
  const [returnReason, setReturnReason] = useState('')
  const [returnCustomNote, setReturnCustomNote] = useState('')
  const [returnImage, setReturnImage] = useState('')
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false)
  const [returnTimeLeftStr, setReturnTimeLeftStr] = useState('')
  const [returnWindowExpired, setReturnWindowExpired] = useState(false)
  const [cancelTimeLeftStr, setCancelTimeLeftStr] = useState('')
  const [cancelWindowExpired, setCancelWindowExpired] = useState(false)

  const reviewSectionRef = useRef(null)

  // Helper functions defined before hooks use them
  const getProductReview = (productId) => {
    return reviews.find(r => r.product_id === productId)
  }

  const handleOpenReviewForm = () => {
    setTimeout(() => {
      reviewSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 150)
  }

  const fetchOrderReviews = async () => {
    if (!id) return
    setReviewsLoading(true)
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('order_id', id)
      if (error) throw error
      setReviews(data || [])
    } catch (err) {
      console.error('Error fetching order reviews:', err)
    } finally {
      setReviewsLoading(false)
    }
  }

  const fetchReturnRequest = async () => {
    if (!id) return
    try {
      const { data, error } = await supabase
        .from('return_requests')
        .select('*')
        .eq('order_id', id)
        .maybeSingle()
      if (error) throw error
      setReturnRequestInfo(data || null)
    } catch (err) {
      console.error('Error fetching return request:', err)
    }
  }

  // Hook query (depends on fetchOrderReviews & fetchReturnRequest being initialized)
  const { isLoading: isOrderDetailLoading, isError, refetch } = useOzoQuery(
    async (signal) => {
      useOrderStore.setState({ currentOrder: null })
      const res = await fetchOrderById(id, { signal })
      if (!res.success) {
        throw res.error || new Error('Failed to fetch order details')
      }
      await fetchOrderReviews()
      await fetchReturnRequest()
    },
    [id, fetchOrderById]
  )

  // Effects


  useEffect(() => {
    setHasAutoPrompted(false)
  }, [id])

  // Realtime subscription for order status updates
  useEffect(() => {
    if (!id) return

    const channelName = `order-status-realtime-${id}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${id}`
        },
        async (payload) => {
          console.log('Order status update received:', payload.new)
          // Silent fetch to update order details without skeleton flash
          await fetchOrderById(id, { silent: true })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [id, fetchOrderById])

  // Realtime subscription for rider live location updates
  useEffect(() => {
    const riderId = currentOrder?.rider_id
    if (!riderId) return

    const channelName = `rider-location-realtime-${riderId}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'captains',
          filter: `id=eq.${riderId}`
        },
        (payload) => {
          console.log('Rider location update received:', payload.new)
          const { current_lat, current_long } = payload.new
          
          // Safe Zustand state functional update to bypass subscription recreation
          useOrderStore.setState((state) => {
            if (!state.currentOrder) return state
            return {
              currentOrder: {
                ...state.currentOrder,
                rider: {
                  ...state.currentOrder.rider,
                  current_lat: current_lat ? parseFloat(current_lat) : null,
                  current_long: current_long ? parseFloat(current_long) : null
                }
              }
            }
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentOrder?.rider_id])

  useEffect(() => {
    if (!isAdmin && currentOrder && ['delivered', 'DELIVERED_VERIFYING', 'COMPLETED'].includes(currentOrder.status) && !isOrderDetailLoading && !reviewsLoading && !hasAutoPrompted) {
      const unreviewedItem = currentOrder.order_items?.filter(item => !item.is_cancelled).find(item => !getProductReview(item.product_id))
      if (unreviewedItem) {
        handleOpenReviewForm()
        setHasAutoPrompted(true)
      }
    }
  }, [currentOrder, reviews, reviewsLoading, isOrderDetailLoading, hasAutoPrompted, isAdmin])

  useEffect(() => {
    if (!currentOrder || !['delivered', 'DELIVERED_VERIFYING'].includes(currentOrder.status) || !currentOrder.delivered_at) {
      setReturnWindowExpired(true)
      setReturnTimeLeftStr('')
      return
    }

    const deliveredAt = new Date(currentOrder.delivered_at)
    const expiryTime = new Date(deliveredAt.getTime() + 5 * 60 * 1000)

    const updateTimer = () => {
      const estimatedServerTime = new Date(new Date().getTime() + (serverTimeOffset || 0))
      const diffMs = expiryTime.getTime() - estimatedServerTime.getTime()

      if (diffMs <= 0) {
        setReturnWindowExpired(true)
        setReturnTimeLeftStr('Expired')
      } else {
        setReturnWindowExpired(false)
        const mins = Math.floor(diffMs / 60000)
        const secs = Math.floor((diffMs % 60000) / 1000)
        setReturnTimeLeftStr(`${mins}m ${secs}s left`)
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [currentOrder, serverTimeOffset])

  useEffect(() => {
    if (!currentOrder || currentOrder.status !== 'PLACED_COOLING' || !currentOrder.created_at) {
      setCancelWindowExpired(true)
      setCancelTimeLeftStr('')
      return
    }

    const createdAt = new Date(currentOrder.created_at)
    const expiryTime = new Date(createdAt.getTime() + 5 * 60 * 1000)

    const updateTimer = () => {
      const estimatedServerTime = new Date(new Date().getTime() + (serverTimeOffset || 0))
      const diffMs = expiryTime.getTime() - estimatedServerTime.getTime()

      if (diffMs <= 0) {
        setCancelWindowExpired(true)
        setCancelTimeLeftStr('Expired')
      } else {
        setCancelWindowExpired(false)
        const mins = Math.floor(diffMs / 60000)
        const secs = Math.floor((diffMs % 60000) / 1000)
        setCancelTimeLeftStr(`${mins}m ${secs}s left`)
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [currentOrder, serverTimeOffset])

  const handleReturnSubmit = async () => {
    const deliveredAt = currentOrder?.delivered_at ? new Date(currentOrder.delivered_at) : null
    const estimatedServerTime = new Date(new Date().getTime() + (serverTimeOffset || 0))
    const isExpired = deliveredAt ? (estimatedServerTime.getTime() - deliveredAt.getTime() > 5 * 60 * 1000) : true

    if (isExpired) {
      toast.error('The 5-minute return window has expired.')
      setIsReturnModalOpen(false)
      return
    }

    if (!returnReason) {
      toast.error('Please select a reason for the return')
      return
    }
    if (!returnImage) {
      toast.error('Proof image is required for return verification')
      return
    }

    setIsSubmittingReturn(true)
    const toastId = toast.loading('Submitting return request...')

    try {
      const { data: { user }, error: userErr } = await supabase.auth.getUser()
      if (userErr || !user) {
        throw new Error('Please login to submit a return request')
      }

      const returnPayload = {
        order_id: id,
        user_id: user.id,
        reason: returnReason,
        custom_note: returnCustomNote?.trim() || null,
        proof_image: returnImage,
        status: 'pending'
      }

      const { error } = await supabase
        .from('return_requests')
        .insert([returnPayload])

      if (error) {
        throw new Error(error.message || 'Failed to submit return request')
      }

      // Update order status to RETURN_REQUESTED
      const { error: orderStatusErr } = await supabase
        .from('orders')
        .update({ status: 'RETURN_REQUESTED', updated_at: new Date().toISOString() })
        .eq('id', id)
      
      if (orderStatusErr) {
        console.error('Failed to update order status to RETURN_REQUESTED:', orderStatusErr)
      }

      toast.success('Return request submitted successfully!', { id: toastId })
      setIsReturnModalOpen(false)
      setReturnReason('')
      setReturnCustomNote('')
      setReturnImage('')
      
      await fetchReturnRequest()
    } catch (err) {
      console.error('Error submitting return request:', err)
      toast.error(err.message || 'Failed to submit return request', { id: toastId })
    } finally {
      setIsSubmittingReturn(false)
    }
  }

  const handleReviewSubmit = async (productId, rating, reviewText, images) => {
    if (!reviewText.trim()) {
      toast.error('Please enter review text')
      return
    }

    setIsSubmittingReview(true)
    const toastId = toast.loading('Submitting your review...')

    try {
      const { data: { user }, error: userErr } = await supabase.auth.getUser()
      if (userErr || !user) {
        throw new Error('Please login to submit a review')
      }

      const hasImage = images && images.length > 0
      const reviewPayload = {
        product_id: productId,
        user_id: user.id,
        order_id: id,
        rating: rating,
        review_text: reviewText.trim(),
        is_verified: true,
        image_url: images[0] || null,
        images: images,
        is_image_approved: hasImage ? false : null
      }

      const { error } = await supabase
        .from('reviews')
        .insert([reviewPayload])

      if (error) throw error

      toast.success('Review submitted successfully!', { id: toastId })
      setHasAutoPrompted(false)
      
      // Refresh order reviews list
      fetchOrderReviews()
    } catch (err) {
      console.error('Error submitting review:', err)
      toast.error(err.message || 'Failed to submit review', { id: toastId })
    } finally {
      setIsSubmittingReview(false)
    }
  }

  const steps = [
    { 
      label: 'Placed', 
      icon: Package, 
      activeBg: 'bg-ozo-red text-white shadow-[0_0_15px_rgba(225,29,72,0.4)]', 
      pulseBg: 'bg-ozo-red/20',
      activeText: 'text-ozo-red font-black dark:text-red-400'
    },
    { 
      label: 'Confirmed', 
      icon: CheckCircle2, 
      activeBg: 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]', 
      pulseBg: 'bg-emerald-500/20',
      activeText: 'text-emerald-500 font-black dark:text-emerald-400'
    },
    { 
      label: 'Shipped', 
      icon: Truck, 
      activeBg: 'bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]', 
      pulseBg: 'bg-indigo-500/20',
      activeText: 'text-indigo-500 font-black dark:text-indigo-400'
    },
    { 
      label: 'Delivered', 
      icon: MapPin, 
      activeBg: 'bg-teal-500 text-white shadow-[0_0_15px_rgba(20,184,166,0.4)]', 
      pulseBg: 'bg-teal-500/20',
      activeText: 'text-teal-500 font-black dark:text-teal-400'
    },
  ]

  const getStatusValue = (status) => {
    switch (status) {
      case 'pending':
      case 'placed':
      case 'PLACED_COOLING':
        return 0
      case 'CONFIRMED_SYSTEM':
      case 'confirmed':
      case 'preparing':
      case 'packed':
        return 1
      case 'assigned':
      case 'picked_up':
      case 'dispatched':
        return 2
      case 'delivered':
      case 'DELIVERED_VERIFYING':
      case 'COMPLETED':
      case 'RETURN_REQUESTED':
        return 3
      case 'cancelled':
      case 'CANCELLED_BY_USER':
        return -1
      default:
        return 0
    }
  }

  const getProgressWidth = (status) => {
    switch (status) {
      case 'pending':
      case 'placed':
      case 'PLACED_COOLING':
        return 0
      case 'CONFIRMED_SYSTEM':
      case 'confirmed':
        return 33.33
      case 'preparing':
        return 45
      case 'packed':
        return 55
      case 'assigned':
        return 66.66
      case 'picked_up':
      case 'dispatched':
        return 83.33
      case 'delivered':
      case 'DELIVERED_VERIFYING':
      case 'COMPLETED':
      case 'RETURN_REQUESTED':
        return 100
      case 'cancelled':
      case 'CANCELLED_BY_USER':
        return 0
      default:
        return 0
    }
  }

  const getProgressColor = (status) => {
    switch (status) {
      case 'pending':
      case 'placed':
      case 'PLACED_COOLING':
        return 'bg-ozo-red'
      case 'CONFIRMED_SYSTEM':
      case 'confirmed':
      case 'preparing':
      case 'packed':
        return 'bg-emerald-500'
      case 'assigned':
      case 'picked_up':
      case 'dispatched':
        return 'bg-indigo-500'
      case 'delivered':
      case 'DELIVERED_VERIFYING':
      case 'COMPLETED':
      case 'RETURN_REQUESTED':
        return 'bg-teal-500'
      default:
        return 'bg-ozo-red'
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'delivered': 
      case 'DELIVERED_VERIFYING':
      case 'COMPLETED':
        return 'bg-teal-100 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400 border border-teal-200 dark:border-teal-500/20'
      case 'RETURN_REQUESTED':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20'
      case 'cancelled': 
      case 'CANCELLED_BY_USER':
        return 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400 border border-red-200 dark:border-red-500/20'
      case 'pending': 
      case 'placed':
      case 'PLACED_COOLING':
        return 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20'
      case 'CONFIRMED_SYSTEM':
      case 'confirmed':
      case 'preparing':
      case 'packed':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
      case 'assigned':
      case 'picked_up':
      case 'dispatched': 
        return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20'
      default: 
        return 'bg-gray-100 text-gray-700 dark:bg-gray-500/10 dark:text-gray-400 border border-gray-200'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'delivered': 
      case 'DELIVERED_VERIFYING':
      case 'COMPLETED':
        return <CheckCircle2 size={24} className="text-teal-500" />
      case 'RETURN_REQUESTED':
        return <RefreshCw size={24} className="text-amber-500 animate-spin" style={{ animationDuration: '4s' }} />
      case 'cancelled': 
      case 'CANCELLED_BY_USER':
        return <XCircle size={24} className="text-red-500" />
      case 'pending': 
      case 'placed':
      case 'PLACED_COOLING':
        return <Clock size={24} className="text-rose-500 animate-pulse" />
      case 'CONFIRMED_SYSTEM':
      case 'confirmed':
      case 'preparing':
      case 'packed':
        return <Package size={24} className="text-emerald-500 animate-bounce" />
      case 'assigned':
      case 'picked_up':
      case 'dispatched': 
        return <Truck size={24} className="text-indigo-500 animate-pulse" />
      default: 
        return <Package size={24} className="text-gray-500" />
    }
  }

  const getStatusDetail = (status) => {
    switch (status) {
      case 'pending':
      case 'placed':
      case 'PLACED_COOLING':
        return {
          title: 'Order Placed & Awaiting Confirmation',
          desc: 'Your order has been received by Ozo. The store is reviewing the items and will confirm shortly.',
          color: 'text-rose-700 dark:text-rose-400',
          bg: 'bg-rose-50 dark:bg-rose-500/5',
          border: 'border-rose-100 dark:border-rose-500/10'
        }
      case 'CONFIRMED_SYSTEM':
      case 'confirmed':
        return {
          title: 'Order Confirmed',
          desc: 'The store has accepted your order. Packing and preparation will begin momentarily.',
          color: 'text-emerald-700 dark:text-emerald-400',
          bg: 'bg-emerald-50 dark:bg-emerald-500/5',
          border: 'border-emerald-100 dark:border-emerald-500/10'
        }
      case 'preparing':
        return {
          title: 'Preparing Your Order',
          desc: 'Your items are being carefully picked and packed at Ozo Mart.',
          color: 'text-emerald-700 dark:text-emerald-400',
          bg: 'bg-emerald-50 dark:bg-emerald-500/5',
          border: 'border-emerald-100 dark:border-emerald-500/10'
        }
      case 'packed':
        return {
          title: 'Order Packed & Ready',
          desc: 'Your order is fully packed and ready for pickup. We are assigning a delivery captain.',
          color: 'text-emerald-700 dark:text-emerald-450',
          bg: 'bg-emerald-50 dark:bg-emerald-500/5',
          border: 'border-emerald-100 dark:border-emerald-500/10'
        }
      case 'assigned':
        return {
          title: 'Captain Assigned',
          desc: 'A delivery captain has accepted your order and is heading to the store to pick it up.',
          color: 'text-indigo-700 dark:text-indigo-400',
          bg: 'bg-indigo-50 dark:bg-indigo-500/5',
          border: 'border-indigo-100 dark:border-indigo-500/10'
        }
      case 'picked_up':
      case 'dispatched':
        return {
          title: 'Out for Delivery',
          desc: 'Ozo Captain is on the way! Your order has left the store and is heading towards your delivery address.',
          color: 'text-indigo-700 dark:text-indigo-400',
          bg: 'bg-indigo-50 dark:bg-indigo-500/5',
          border: 'border-indigo-100 dark:border-indigo-500/10'
        }
      case 'delivered':
      case 'DELIVERED_VERIFYING':
        return {
          title: 'Delivered (Inspection Window)',
          desc: 'Your order has been physically delivered. You have a 5-minute window to verify your items and request returns if needed.',
          color: 'text-teal-700 dark:text-teal-400',
          bg: 'bg-teal-50 dark:bg-teal-500/5',
          border: 'border-teal-100 dark:border-teal-500/10'
        }
      case 'COMPLETED':
        return {
          title: 'Order Completed',
          desc: 'The inspection window has successfully closed. Thank you for shopping with Ozo!',
          color: 'text-teal-700 dark:text-teal-400',
          bg: 'bg-teal-50 dark:bg-teal-500/5',
          border: 'border-teal-100 dark:border-teal-500/10'
        }
      case 'RETURN_REQUESTED':
        return {
          title: 'Return Requested',
          desc: 'You have submitted a return request. Admin is reviewing the submitted proof.',
          color: 'text-amber-700 dark:text-amber-400',
          bg: 'bg-amber-50 dark:bg-amber-500/5',
          border: 'border-amber-100 dark:border-amber-500/10'
        }
      case 'cancelled':
      case 'CANCELLED_BY_USER':
        return {
          title: 'Order Cancelled',
          desc: 'This order was cancelled. If you paid online, the refund will be credited back to your payment source.',
          color: 'text-red-700 dark:text-red-400',
          bg: 'bg-red-50 dark:bg-red-500/5',
          border: 'border-red-100 dark:border-red-500/10'
        }
      default:
        return {
          title: 'Order Processing',
          desc: 'Your order is being processed by Ozo.',
          color: 'text-gray-700 dark:text-gray-400',
          bg: 'bg-gray-50 dark:bg-gray-500/5',
          border: 'border-gray-100 dark:border-gray-500/10'
        }
    }
  }

  const handleConfirmCancellation = async () => {
    setIsCancelling(true)
    const res = await cancelOrder(currentOrder.id, { 
      reason: cancelReason, 
      note: cancelCustomNote?.trim() || null 
    })
    setIsCancelling(false)
    if (res.success) {
      setIsCancelModalOpen(false)
      setHasCalledPartner(false)
      setConfirmationText('')
      setCancelReason('')
      setCancelCustomNote('')
      refetch()
    }
  }

  const currentStepIndex = currentOrder ? getStatusValue(currentOrder.status) : 0
  const progressWidth = currentOrder ? getProgressWidth(currentOrder.status) : 0
  const statusDetail = currentOrder ? getStatusDetail(currentOrder.status) : null

  return (
    <OzoLoadingGuard
      isLoading={isOrderDetailLoading}
      isError={isError}
      onRetry={refetch}
      skeleton={
        <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-ozo-red border-t-transparent rounded-full animate-spin" />
            <p className="font-bold text-ozo-gray">Loading Order Details...</p>
          </div>
        </div>
      }
      isEmpty={!currentOrder}
      fallback={
        <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] flex flex-col items-center justify-center p-8 text-center">
          <AlertCircle size={64} className="text-ozo-red mb-4" />
          <h2 className="text-2xl font-black mb-2">Order Not Found</h2>
          <p className="text-ozo-gray mb-8">The order you're looking for doesn't exist or you don't have access.</p>
          <button onClick={() => navigate('/orders')} className="btn btn-primary px-8">Back to Orders</button>
        </div>
      }
    >
      {currentOrder && (
        <div className="min-h-screen bg-slate-50 dark:bg-[#070709] pb-24 transition-colors duration-300 relative overflow-hidden">
          {/* Ambient decorative background glows */}
          <div className="absolute top-[20%] left-[-10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-ozo-red/5 dark:bg-ozo-red/[0.012] blur-[120px] rounded-full pointer-events-none z-0" />
          <div className="absolute bottom-[20%] right-[-10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-indigo-500/5 dark:bg-indigo-500/[0.012] blur-[120px] rounded-full pointer-events-none z-0" />

      {/* Header */}
      <div className="bg-white dark:bg-[#0d0d0f] border-b border-gray-100 dark:border-white/5 pt-12 pb-8 relative z-10">
        <div className="container-custom">
          {/* SEO Breadcrumb Trail */}
          <Breadcrumb items={breadcrumbItems} className="mb-4" />

          <button 
            onClick={() => navigate('/orders')}
            className="flex items-center gap-2 text-ozo-gray hover:text-ozo-red font-bold text-sm mb-6 transition-colors group"
          >
            <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            Back to Orders
          </button>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white font-display break-all">
                  Your <span className="text-gradient">Order.</span>
                </h1>
                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex-shrink-0 ${getStatusColor(currentOrder.status)}`}>
                  {currentOrder.status.replace('_', ' ')}
                </span>
                {currentOrder.delivery_instructions?.includes('[Order Edited: true]') && (
                  <span className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex-shrink-0 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 animate-pulse">
                    Modified by Store
                  </span>
                )}
              </div>
              <p className="text-ozo-gray dark:text-gray-400 font-medium">
                Placed on {new Date(currentOrder.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {currentOrder && !['cancelled', 'CANCELLED_BY_USER', 'pending', 'placed', 'PLACED_COOLING'].includes(currentOrder.status) && (
                <button
                  onClick={handlePrintInvoice}
                  className="btn bg-[#059669] hover:bg-[#047857] text-white px-6 flex items-center gap-2 rounded-2xl font-bold text-sm shadow-xl transition-all hover:scale-105 active:scale-95"
                >
                  <Printer size={18} />
                  Download Invoice
                </button>
              )}
              <Link to="/help" className="btn bg-ozo-dark text-white dark:bg-white/5 dark:border dark:border-white/10 px-6 flex items-center gap-2 rounded-2xl font-bold text-sm shadow-xl">
                <HelpCircle size={18} />
                Need Help?
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container-custom py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 space-y-8">
            {/* Tracking / Timeline */}
            <div className="bg-white dark:bg-[#121214] rounded-[2.5rem] p-4 sm:p-8 shadow-sm border border-gray-100 dark:border-white/5 relative z-10">
              <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight mb-10">
                Track <span className="text-gradient">Order.</span>
              </h2>
              
              <div className="relative flex justify-between px-1 sm:px-4">
                {/* Connector Line Container */}
                <div className="absolute top-6 sm:top-7 left-8 sm:left-10 right-8 sm:right-10 h-1 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${getProgressColor(currentOrder.status)} transition-all duration-1000`} 
                    style={{ width: `${progressWidth}%` }} 
                  />
                </div>
                
                {steps.map((step, index) => {
                  const isActive = currentStepIndex >= index && currentStepIndex !== -1
                  const isCurrent = currentStepIndex === index && currentOrder.status !== 'cancelled'
                  
                  return (
                    <div key={index} className="relative z-10 flex flex-col items-center gap-2.5 w-16 sm:w-20">
                      <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center transition-all duration-500 relative ${
                        isActive 
                          ? step.activeBg 
                          : 'bg-white dark:bg-[#252525] text-gray-300 border border-gray-100 dark:border-white/5 shadow-sm'
                      }`}>
                        <step.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                        {isCurrent && (
                          <span className={`absolute -inset-1.5 rounded-3xl ${step.pulseBg} animate-ping pointer-events-none`} />
                        )}
                      </div>
                      <p className={`text-[9px] sm:text-xs font-black uppercase tracking-wider sm:tracking-widest transition-colors duration-500 text-center ${
                        isActive ? step.activeText : 'text-gray-400'
                      }`}>
                        {step.label}
                      </p>
                    </div>
                  )
                })}
              </div>

              {/* Status details information panel */}
              <div className="mt-10 h-px bg-gray-100 dark:bg-white/5" />
              <div className={`mt-8 p-6 rounded-[2rem] border flex flex-col sm:flex-row items-start sm:items-center gap-5 transition-all ${statusDetail.bg} ${statusDetail.border}`}>
                <div className="p-3.5 rounded-2xl bg-white dark:bg-[#202020] shadow-sm flex-shrink-0">
                  {getStatusIcon(currentOrder.status)}
                </div>
                <div className="flex-1">
                  <h4 className={`font-black text-base ${statusDetail.color} mb-1`}>
                    {statusDetail.title}
                  </h4>
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 leading-relaxed">
                    {statusDetail.desc}
                  </p>
                </div>
              </div>
            </div>

            {/* Live tracking map shown for active (not delivered/cancelled) orders */}
            {!['delivered', 'DELIVERED_VERIFYING', 'COMPLETED', 'cancelled', 'CANCELLED_BY_USER', 'RETURN_REQUESTED'].includes(currentOrder.status) && !mapConfig?.hide_map && (
              <OrderTrackingMap order={currentOrder} />
            )}

              {/* Product Review System */}
              {['delivered', 'DELIVERED_VERIFYING', 'COMPLETED'].includes(currentOrder.status) && (
                <div ref={reviewSectionRef} className="bg-white dark:bg-[#121214] rounded-[2.5rem] overflow-hidden shadow-sm border border-gray-100 dark:border-white/5 relative z-10">
                  <div className="p-8 border-b border-gray-50 dark:border-white/5">
                    <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                      <Star size={22} className="text-yellow-500 fill-current animate-pulse" />
                      {!isOrderOwner && isAdmin ? (
                        <>Customer <span className="text-gradient">Feedback.</span></>
                      ) : (
                        <>Share Your <span className="text-gradient">Feedback.</span></>
                      )}
                    </h3>
                    <p className="text-xs text-gray-455 dark:text-gray-400 font-bold mt-1">
                      {!isOrderOwner && isAdmin
                        ? "Reviews submitted by the customer for this order"
                        : "Review the items from this order to help others make better choices"
                      }
                    </p>
                  </div>

                  <div className="divide-y divide-gray-50 dark:divide-white/5">
                    {reviews.length === 0 && !isOrderOwner && isAdmin ? (
                      <div className="p-8 text-center text-gray-500">
                        <Star size={32} className="text-gray-300 dark:text-gray-700 mx-auto mb-2" />
                        <p className="text-sm font-bold">No feedback submitted by the customer yet.</p>
                      </div>
                    ) : (
                      currentOrder.order_items?.filter(item => !item.is_cancelled).map((item) => {
                        const existingReview = getProductReview(item.product_id)

                        return (
                          <div key={item.id} className="py-6 px-3 sm:px-6 md:p-8 space-y-6 transition-colors duration-300">
                            {/* Item Header */}
                            <div className="flex items-center justify-between gap-4">
                              {item.product_slug ? (
                                <Link
                                  to={`/product/${item.product_slug}`}
                                  className="flex items-center gap-4 flex-1 min-w-0 group cursor-pointer"
                                >
                                  <OptimizedImage
                                    src={item.product_image}
                                    slug={item.product_slug}
                                    alt={item.product_name}
                                    width={120}
                                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                                    containerClassName="w-16 h-16 bg-gray-50 dark:bg-white/5 rounded-2xl p-1.5 flex-shrink-0 border border-gray-100 dark:border-white/5 overflow-hidden"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-gray-900 dark:text-white truncate text-base group-hover:text-ozo-red transition-colors">{item.product_name}</h4>
                                    <p className="text-xs text-gray-455 dark:text-gray-400 font-bold">Quantity: {item.quantity}</p>
                                  </div>
                                </Link>
                              ) : (
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                  <OptimizedImage
                                    src={item.product_image}
                                    alt={item.product_name}
                                    width={120}
                                    className="w-full h-full object-contain"
                                    containerClassName="w-16 h-16 bg-gray-50 dark:bg-white/5 rounded-2xl p-1.5 flex-shrink-0 border border-gray-100 dark:border-white/5"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-gray-900 dark:text-white truncate text-base">{item.product_name}</h4>
                                    <p className="text-xs text-gray-455 dark:text-gray-400 font-bold">Quantity: {item.quantity}</p>
                                  </div>
                                </div>
                              )}

                              {!existingReview && !isOrderOwner && isAdmin && (
                                <span className="text-xs font-bold text-gray-455 bg-gray-100 dark:bg-white/5 px-3 py-1.5 rounded-xl border border-gray-200/50 dark:border-white/5">
                                  Not Reviewed
                                </span>
                              )}
                            </div>

                            {/* Existing Review */}
                            {existingReview && (
                              <div className="bg-gray-50/50 dark:bg-white/[0.01] border border-gray-100 dark:border-white/5 rounded-[2rem] p-6 space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="flex gap-0.5">
                                      {[...Array(5)].map((_, i) => (
                                        <Star
                                          key={i}
                                          size={13}
                                          className={`${
                                            i < existingReview.rating
                                              ? 'fill-yellow-400 text-yellow-400'
                                              : 'text-gray-200 dark:text-gray-700'
                                          }`}
                                        />
                                      ))}
                                    </div>
                                    <span className="text-[10px] font-black uppercase text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20 tracking-wider">
                                      Verified Purchase
                                    </span>
                                  </div>
                                  <span className="text-xs text-gray-400 font-bold">
                                    {new Date(existingReview.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-750 dark:text-gray-300 font-medium">
                                  {existingReview.review_text}
                                </p>
                                {existingReview.images && existingReview.images.length > 0 && (
                                  <div className="flex gap-2 flex-wrap pt-1">
                                    {existingReview.images.map((imgUrl, imgIdx) => (
                                      <a
                                        key={imgIdx}
                                        href={imgUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="relative group block w-14 h-14 rounded-xl overflow-hidden border border-gray-100 dark:border-white/5 hover:border-ozo-red transition-all cursor-zoom-in"
                                      >
                                        <OptimizedImage
                                          src={imgUrl}
                                          alt={`Review upload ${imgIdx + 1}`}
                                          width={100}
                                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                          containerClassName="w-full h-full"
                                        />
                                      </a>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Inline Review Form (displayed directly when not reviewed) */}
                            {!existingReview && (isOrderOwner || !isAdmin) && (
                              <ProductReviewForm 
                                productId={item.product_id}
                                onSubmit={handleReviewSubmit}
                                isSubmitting={isSubmittingReview}
                              />
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Order Items */}
              <div className="bg-white dark:bg-[#121214] rounded-[2.5rem] overflow-hidden shadow-sm border border-gray-100 dark:border-white/5 relative z-10">
                <div className="p-8 border-b border-gray-50 dark:border-white/5">
                  <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                    Order Items <span className="text-gradient">({currentOrder.order_items?.length || 0}).</span>
                  </h2>
                </div>
                <div className="divide-y divide-gray-50 dark:divide-white/5">
                  {currentOrder.order_items?.map((item) => {
                    const isCancelled = !!item.is_cancelled;
                    const productLink = isCancelled ? null : (item.product_slug ? `/product/${item.product_slug}` : null);
                    const content = (
                      <>
                        <OptimizedImage
                          src={item.product_image}
                          slug={item.product_slug}
                          alt={item.product_name}
                          width={200}
                          className={`w-full h-full object-contain ${isCancelled ? 'opacity-40' : ''}`}
                          containerClassName="w-24 h-24 bg-gray-50 dark:bg-white/5 rounded-3xl p-2 flex-shrink-0 group-hover:scale-105 transition-transform duration-500 overflow-hidden border border-gray-100 dark:border-white/5"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className={`font-bold mb-1 truncate text-base transition-colors ${
                            isCancelled 
                              ? 'line-through text-gray-400 dark:text-gray-500' 
                              : 'text-gray-900 dark:text-white group-hover:text-ozo-red'
                          }`}>{item.product_name}</h4>
                          <p className={`text-xs font-bold mb-2 ${
                            isCancelled 
                              ? 'line-through text-gray-450 dark:text-gray-500' 
                              : 'text-ozo-gray dark:text-gray-500'
                          }`}>Quantity: {item.quantity}</p>
                          <p className={`text-sm font-black ${
                            isCancelled 
                              ? 'line-through text-gray-450 dark:text-gray-500' 
                              : 'text-gray-900 dark:text-white'
                          }`}>₹{item.unit_price.toLocaleString()} per unit</p>
                        </div>
                        <div className="text-right flex flex-col items-end gap-1">
                          <p className={`text-lg font-black font-display ${
                            isCancelled 
                              ? 'line-through text-gray-400 dark:text-gray-555' 
                              : 'text-ozo-red'
                          }`}>₹{item.total_price.toLocaleString()}</p>
                          {isCancelled && (
                            <span className="px-2 py-0.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[9px] font-black uppercase rounded-md tracking-wider">
                              Cancelled
                            </span>
                          )}
                        </div>
                      </>
                    );

                    return productLink ? (
                      <Link
                        key={item.id}
                        to={productLink}
                        className="p-6 md:p-8 flex items-center gap-6 group hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors duration-300 cursor-pointer"
                      >
                        {content}
                      </Link>
                    ) : (
                      <div
                        key={item.id}
                        className="p-6 md:p-8 flex items-center gap-6 group hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors duration-300"
                      >
                        {content}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

          <div className="space-y-8">
            {/* Captain / Rider details card */}
            {currentOrder.rider && (
              <div className="bg-white dark:bg-[#121214] rounded-[2.5rem] p-8 shadow-sm border border-gray-100 dark:border-white/5 space-y-6 relative z-10">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                    <Truck size={20} className="text-ozo-red animate-pulse" />
                    Ozo <span className="text-gradient">Captain.</span>
                  </h3>
                  <span className="px-3 py-1 bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400 rounded-full text-[10px] font-black uppercase tracking-widest">
                    Assigned
                  </span>
                </div>
                
                <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-white/[0.02] rounded-3xl border border-gray-100 dark:border-white/5">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-white/10 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center border border-gray-200 dark:border-white/10 shadow-inner">
                    {currentOrder?.rider?.selfie_url ? (
                      <OptimizedImage
                        src={currentOrder.rider.selfie_url}
                        alt={currentOrder.rider.full_name || 'Rider'}
                        width={120}
                        className="w-full h-full object-cover"
                        containerClassName="w-full h-full"
                      />
                    ) : (
                      <span className="text-xl font-black text-ozo-gray dark:text-gray-400">
                        {currentOrder?.rider?.full_name?.charAt(0) || 'C'}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-gray-900 dark:text-white truncate text-sm">{currentOrder?.rider?.full_name || 'Assigned Captain'}</h4>
                    <p className="text-xs font-bold text-gray-500 flex items-center gap-1 mt-0.5">
                      ⭐ {currentOrder?.rider?.rating || '4.9'} • Ozo Captain
                    </p>
                    {currentOrder?.rider?.bike_number && (
                      <span className="inline-block mt-2 px-2.5 py-0.5 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 rounded text-[10px] font-mono font-bold uppercase tracking-wider">
                        Bike: {currentOrder.rider.bike_number}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <a 
                    href={`tel:${currentOrder.rider.phone}`}
                    className="flex-1 py-3.5 bg-ozo-red text-white text-center rounded-2xl font-black text-xs hover:opacity-90 active:scale-95 transition-all shadow-ozo flex items-center justify-center gap-2"
                  >
                    <Phone size={14} />
                    Call Captain
                  </a>
                  {currentOrder.rider.phone && (
                    <a 
                      href={`https://wa.me/91${currentOrder.rider.phone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-3.5 bg-green-600 text-white text-center rounded-2xl font-black text-xs hover:opacity-90 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2"
                    >
                      <MessageSquare size={14} />
                      WhatsApp
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Delivery Details */}
            <div className="bg-white dark:bg-[#121214] rounded-[2.5rem] p-8 shadow-sm border border-gray-100 dark:border-white/5 relative z-10">
              <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight mb-6 flex items-center gap-2">
                <MapPin size={20} className="text-ozo-green" />
                Delivery <span className="text-gradient">Address.</span>
              </h3>
              <div className="space-y-2 text-sm">
                <p className="font-black text-gray-900 dark:text-white">{currentOrder.address?.label || 'Home'}</p>
                <p className="text-ozo-gray dark:text-gray-400 font-semibold leading-relaxed">
                  {currentOrder.address?.address_line1}<br />
                  {currentOrder.address?.address_line2 && <>{currentOrder.address.address_line2}<br /></>}
                  {currentOrder.address?.city}, {currentOrder.address?.state} - {currentOrder.address?.pincode}
                </p>
                {currentOrder.address && (isAdmin || profile?.role === 'captain') && (
                  <div className="pt-2">
                    <a 
                      href={getGoogleMapsUrl(currentOrder.address, currentOrder)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-ozo-green/10 hover:bg-ozo-green/20 text-ozo-green text-xs font-black uppercase tracking-wider rounded-2xl transition-colors mt-2 border border-ozo-green/10"
                    >
                      <ExternalLink size={14} />
                      View on Google Maps
                    </a>
                  </div>
                )}
                {(() => {
                  const cleaned = currentOrder.delivery_instructions 
                    ? currentOrder.delivery_instructions.replace(/\[Payment\s+ID:\s*[^\]]+\]/gi, '').trim() 
                    : '';
                  return cleaned ? (
                    <div className="mt-4 p-4 bg-gray-50 dark:bg-white/5 rounded-2xl text-xs text-ozo-gray border border-gray-100 dark:border-white/5">
                      <p className="font-black mb-1 uppercase tracking-widest text-[10px] text-gray-900 dark:text-white">Instructions</p>
                      {cleaned}
                    </div>
                  ) : null;
                })()}
              </div>
            </div>

            {/* Payment Summary */}
            <div className="bg-white dark:bg-[#121214] rounded-[2.5rem] p-8 shadow-sm border border-gray-100 dark:border-white/5 space-y-6 relative z-10">
              <div>
                <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <CreditCard size={20} className="text-blue-500" />
                  Price <span className="text-gradient">Details.</span>
                </h3>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between text-sm font-medium">
                  <span className="text-ozo-gray dark:text-gray-400">Items Total</span>
                  <span className="text-gray-900 dark:text-white font-bold">₹{currentOrder.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm font-medium">
                  <span className="text-ozo-gray dark:text-gray-400">Delivery Fee</span>
                  <span className="text-ozo-green font-bold">
                    {currentOrder.delivery_fee === 0 ? 'FREE' : `₹${currentOrder.delivery_fee.toLocaleString()}`}
                  </span>
                </div>
                {currentOrder.distance > 0 && (
                  <div className="flex justify-between text-xs font-semibold text-gray-550 dark:text-gray-500 -mt-2">
                    <span>Delivery Distance</span>
                    <span>{Number(currentOrder.distance).toFixed(1)} km</span>
                  </div>
                )}
                {currentOrder.platform_fee > 0 && (
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-ozo-gray dark:text-gray-400">Handling Fee</span>
                    <span className="text-gray-900 dark:text-white font-bold">₹{Number(currentOrder.platform_fee).toLocaleString()}</span>
                  </div>
                )}
                {currentOrder.charity_donation > 0 && (
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-ozo-gray dark:text-gray-400">Charity Donation</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">₹{Number(currentOrder.charity_donation).toLocaleString()}</span>
                  </div>
                )}
                {currentOrder.discount > 0 && (
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-ozo-gray dark:text-gray-400">Discount</span>
                    <span className="text-ozo-red font-bold">-₹{currentOrder.discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="h-px bg-gray-50 dark:bg-white/5 my-2" />
                <div className="flex justify-between items-center pt-2">
                  <span className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight">Total Payable</span>
                  <span className="text-2xl font-black text-ozo-red font-display">₹{currentOrder.total.toLocaleString()}</span>
                </div>
              </div>
              
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-between border border-gray-100 dark:border-white/5">
                <div className="flex items-center gap-3">
                  <Clock size={16} className="text-ozo-gray" />
                  <span className="text-xs font-bold text-ozo-gray">Payment Method:</span>
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white bg-white dark:bg-white/10 px-3 py-1 rounded-lg border border-gray-100 dark:border-white/5 shadow-sm">
                  {currentOrder.payment_method === 'cod' ? 'Cash on Delivery' : 'Online Payment'}
                </span>
              </div>
            </div>

            {/* Cancel order action with cooling period countdown */}
            {['pending', 'PLACED_COOLING'].includes(currentOrder.status) && (
              !cancelWindowExpired ? (
                <button 
                  onClick={() => setIsCancelModalOpen(true)}
                  className="w-full py-4 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-500/5 dark:hover:bg-red-500/10 dark:text-red-400 rounded-[2rem] font-black text-xs uppercase tracking-wider transition-all duration-300 border border-red-100 dark:border-red-500/10 flex flex-col items-center justify-center gap-1 active:scale-[0.98] shadow-sm animate-pulse"
                >
                  <div className="flex items-center gap-2">
                    <XCircle size={16} />
                    <span>Cancel Order</span>
                  </div>
                  <span className="text-[10px] font-mono tracking-normal normal-case opacity-75">
                    Cancel free for {cancelTimeLeftStr}
                  </span>
                </button>
              ) : (
                <div className="w-full py-4 bg-gray-50 text-gray-400 dark:bg-white/5 dark:text-gray-500 rounded-[2rem] font-black text-xs uppercase tracking-wider border border-gray-100 dark:border-white/5 flex items-center justify-center gap-2 select-none cursor-not-allowed">
                  <Clock size={16} />
                  <span>Order is confirming...</span>
                </div>
              )
            )}

            {/* Return Order Status / Action */}
            {['delivered', 'DELIVERED_VERIFYING', 'RETURN_REQUESTED', 'COMPLETED'].includes(currentOrder.status) && (
              <div className="space-y-4">
                {returnRequestInfo ? (
                  <div className={`rounded-[2rem] p-6 border ${
                    returnRequestInfo.status === 'approved'
                      ? 'bg-emerald-500/5 border-emerald-500/25 text-emerald-600 dark:text-emerald-400'
                      : returnRequestInfo.status === 'rejected'
                      ? 'bg-red-500/5 border-red-500/25 text-red-600 dark:text-red-400'
                      : 'bg-amber-500/5 border-amber-500/25 text-amber-600 dark:text-amber-400'
                  }`}>
                    <div className="flex items-center gap-2 mb-3">
                      <AlertCircle size={18} />
                      <h4 className="font-black text-xs uppercase tracking-wider">
                        Return Request: {returnRequestInfo.status}
                      </h4>
                    </div>
                    <p className="text-xs font-bold leading-relaxed mb-2 opacity-90">
                      {returnRequestInfo.status === 'approved' && "Approved! The total payable amount has been refunded to your OZO Wallet."}
                      {returnRequestInfo.status === 'rejected' && "Your request was declined. Verified proof does not meet criteria."}
                      {returnRequestInfo.status === 'pending' && "Your request is currently being verified. Please check back shortly."}
                    </p>
                    {returnRequestInfo.admin_comment && (
                      <div className="mt-2 p-3 bg-black/5 dark:bg-white/5 rounded-xl text-xs font-semibold">
                        <span className="font-black block uppercase tracking-widest text-[9px] mb-0.5 opacity-55">Admin Feedback</span>
                        {returnRequestInfo.admin_comment}
                      </div>
                    )}
                    <div className="text-[10px] font-mono opacity-75 mt-3">
                      Requested: {new Date(returnRequestInfo.created_at).toLocaleString()}
                    </div>
                  </div>
                ) : (
                  !returnWindowExpired ? (
                    <button 
                      onClick={() => setIsReturnModalOpen(true)}
                      className="w-full py-4 bg-amber-50 hover:bg-amber-100 text-amber-600 dark:bg-amber-500/5 dark:hover:bg-amber-500/10 dark:text-amber-400 rounded-[2rem] font-black text-xs uppercase tracking-wider transition-all duration-300 border border-amber-100 dark:border-amber-500/10 flex flex-col items-center justify-center gap-1 active:scale-[0.98] shadow-sm animate-pulse"
                    >
                      <div className="flex items-center gap-2">
                        <RefreshCw size={16} className="animate-spin" style={{ animationDuration: '4s' }} />
                        <span>Return / Refund Items</span>
                      </div>
                      <span className="text-[10px] font-mono tracking-normal normal-case opacity-75">
                        Window closes in {returnTimeLeftStr}
                      </span>
                    </button>
                  ) : (
                    <div className="w-full py-4 bg-gray-50 text-gray-400 dark:bg-white/5 dark:text-gray-500 rounded-[2rem] font-black text-xs uppercase tracking-wider border border-gray-100 dark:border-white/5 flex items-center justify-center gap-2 select-none cursor-not-allowed">
                      <Clock size={16} />
                      <span>Return Window Closed</span>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cancellation Dialog Backdrop & Modal */}
      <AnimatePresence>
        {isCancelModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-[#121214] rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-gray-100 dark:border-white/5 relative flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center gap-3 text-gray-900 dark:text-white mb-4 flex-shrink-0">
                <AlertCircle size={28} className="text-ozo-red animate-pulse" />
                <h3 className="text-xl font-black uppercase tracking-tight">Cancel Order Request</h3>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 -mr-2 my-2 space-y-6">
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 leading-relaxed">
                  To prevent fuel and food wastage, cancellation is restricted. Please contact our support team or your assigned Captain to authorize this request.
                </p>

                {/* Rider / Support card info displayed directly inside modal */}
                {currentOrder?.rider ? (
                  <div className="p-4 bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5 rounded-3xl flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-200 dark:bg-white/10 rounded-2xl overflow-hidden flex items-center justify-center flex-shrink-0 border border-gray-300 dark:border-white/10 shadow-inner">
                      {currentOrder.rider.selfie_url ? (
                        <OptimizedImage
                          src={currentOrder.rider.selfie_url}
                          alt={currentOrder.rider.full_name || 'Rider'}
                          width={100}
                          className="w-full h-full object-cover"
                          containerClassName="w-full h-full"
                        />
                      ) : (
                        <span className="font-black text-sm text-gray-500">{currentOrder?.rider?.full_name?.charAt(0) || 'C'}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-0.5">Assigned Captain</h5>
                      <h4 className="text-sm font-black text-gray-900 dark:text-white truncate">{currentOrder?.rider?.full_name || 'Assigned Captain'}</h4>
                      <p className="text-xs font-bold text-gray-500">{currentOrder?.rider?.phone || ''}</p>
                    </div>
                    <a 
                      href={`tel:${currentOrder.rider.phone}`}
                      className="w-10 h-10 bg-ozo-red hover:bg-ozo-red/90 text-white rounded-xl flex items-center justify-center shadow-md active:scale-95 transition-all flex-shrink-0"
                      title="Call Captain"
                    >
                      <Phone size={16} />
                    </a>
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5 rounded-3xl flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-200 dark:bg-white/10 rounded-2xl flex items-center justify-center flex-shrink-0 text-ozo-red">
                      <Phone size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-0.5">Ozo Customer Support</h5>
                      <h4 className="text-sm font-black text-gray-900 dark:text-white">+91 1800-OZO-DEL</h4>
                      <p className="text-xs font-bold text-gray-500">Helpline Center</p>
                    </div>
                    <a 
                      href="tel:+911800-OZO-DEL"
                      className="w-10 h-10 bg-ozo-red hover:bg-ozo-red/90 text-white rounded-xl flex items-center justify-center shadow-md active:scale-95 transition-all flex-shrink-0"
                      title="Call Support"
                    >
                      <Phone size={16} />
                    </a>
                  </div>
                )}

                {/* Cancellation Reason Selector */}
                <div>
                  <ReasonSelector
                    type="cancel"
                    selectedReason={cancelReason}
                    onChange={setCancelReason}
                    customNote={cancelCustomNote}
                    onCustomNoteChange={setCancelCustomNote}
                  />
                </div>

                <div className="space-y-4">
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={hasCalledPartner}
                      onChange={(e) => setHasCalledPartner(e.target.checked)}
                      className="mt-1 w-4 h-4 text-ozo-red border-gray-300 rounded focus:ring-ozo-red accent-ozo-red cursor-pointer"
                    />
                    <span className="text-xs text-gray-700 dark:text-gray-300 font-bold leading-relaxed">
                      I have discussed this cancellation with {currentOrder.rider ? 'Captain' : 'Customer Support'}.
                    </span>
                  </label>

                  <div>
                    <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">
                      Type "CONFIRM" to authorize
                    </label>
                    <input 
                      type="text" 
                      value={confirmationText}
                      onChange={(e) => setConfirmationText(e.target.value)}
                      placeholder="Type CONFIRM here"
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-ozo-red/20 font-bold text-sm text-center uppercase"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 flex-shrink-0 pt-2 border-t border-gray-50 dark:border-white/5">
                <button 
                  onClick={() => {
                    setIsCancelModalOpen(false)
                    setHasCalledPartner(false)
                    setConfirmationText('')
                    setCancelReason('')
                    setCancelCustomNote('')
                  }}
                  className="flex-1 py-3 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 text-gray-900 dark:text-white rounded-2xl font-black text-xs hover:bg-gray-100 dark:hover:bg-white/10 transition-all"
                >
                  Keep Order
                </button>
                <button 
                  disabled={!cancelReason || !hasCalledPartner || confirmationText.toUpperCase() !== 'CONFIRM' || isCancelling}
                  onClick={handleConfirmCancellation}
                  className="flex-1 py-3 bg-red-600 text-white rounded-2xl font-black text-xs hover:bg-red-700 disabled:bg-gray-200 disabled:text-gray-400 dark:disabled:bg-white/5 dark:disabled:text-gray-600 transition-all shadow-lg shadow-red-600/20 flex items-center justify-center gap-2"
                >
                  {isCancelling ? 'Cancelling...' : 'Confirm Cancel'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Return Request Backdrop & Modal */}
      <AnimatePresence>
        {isReturnModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-[#121214] rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-gray-100 dark:border-white/5 relative flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <div className="flex items-center gap-3 text-gray-900 dark:text-white">
                  <RefreshCw size={24} className="text-amber-500 animate-spin animate-duration-10000" />
                  <h3 className="text-xl font-black uppercase tracking-tight">Return Order</h3>
                </div>
                <button
                  onClick={() => setIsReturnModalOpen(false)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
                >
                  <XCircle size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 -mr-2 my-2 space-y-6">
                <div className="p-4 bg-amber-500/[0.04] dark:bg-amber-500/[0.06] border border-amber-500/20 rounded-2xl">
                  <h5 className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-1">Strict Policy Enforcement</h5>
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 leading-relaxed space-y-2">
                    <span className="block mb-2 text-amber-600 dark:text-amber-400 font-bold">Returns must be filed within 15 minutes of delivery. A <strong>live camera photo</strong> of the damaged/expired products is mandatory (no gallery uploads).</span>
                    <span className="block text-[11px] text-gray-500 font-medium">
                      To maintain the highest standards of food safety and hygiene, OZO Mart operates a strict quality check loop. Since grocery items include fresh perishables (milk, vegetables, frozen goods) that require immediate refrigeration, any discrepancy in quality, expiry, or items must be logged within 15 minutes of delivery. This allows our dark stores to instantly investigate the batch and process your refund or replacement without delay.
                    </span>
                  </p>
                </div>

                <ReasonSelector
                  type="return"
                  selectedReason={returnReason}
                  onChange={setReturnReason}
                  customNote={returnCustomNote}
                  onCustomNoteChange={setReturnCustomNote}
                />

                {/* Live Photo Upload */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                    Live Photo Proof
                  </label>
                  <ImageUpload
                    value={returnImage}
                    onChange={setReturnImage}
                    multiple={false}
                    capture="environment"
                    label="Capture Photo"
                  />
                  <span className="text-[10px] font-bold text-gray-550 mt-1 block">
                    * Opens camera directly on mobile. Make sure to capture the defect clearly.
                  </span>
                </div>
              </div>

              <div className="flex gap-3 flex-shrink-0 pt-2 border-t border-gray-50 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setIsReturnModalOpen(false)}
                  className="flex-1 py-3 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 text-gray-900 dark:text-white rounded-2xl font-black text-xs hover:bg-gray-100 dark:hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReturnSubmit}
                  disabled={isSubmittingReturn || !returnReason || !returnImage}
                  className="flex-1 py-3 bg-gradient-ozo text-white rounded-2xl font-black text-xs hover:opacity-90 disabled:opacity-50 transition-all shadow-ozo flex items-center justify-center gap-1.5"
                >
                  {isSubmittingReturn ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting...
                    </>
                  ) : (
                    'Submit Request'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Invoice printable layout using Portal */}
      {currentOrder && createPortal(
        <div id="print-invoice-container" className="hidden print:block bg-white text-gray-900 p-8 font-sans max-w-[800px] mx-auto">
          {/* Header */}
          <div className="flex justify-between border-b-4 border-[#059669] pb-4 mb-6" style={{ contentVisibility: 'auto' }}>
            <div>
              <img src="/images/logo_transparent.png" alt="OZO Mart Logo" className="h-10 w-auto object-contain mb-1" />
              <p className="m-0 mt-0.5 text-[9px] text-gray-500 font-black uppercase tracking-wider">Order &bull; Zero Delay &bull; On-Time</p>
            </div>
            <div className="text-right">
              <h2 className="m-0 text-xl text-gray-800 font-light tracking-wide">RETAIL INVOICE</h2>
              <p className="m-0 mt-1 text-[10px] text-gray-600 leading-relaxed font-semibold">
                <strong>Order ID:</strong> #{currentOrder.order_number || currentOrder.id.substring(0, 8).toUpperCase()}<br />
                <strong>Invoice No:</strong> INV-{new Date(currentOrder.created_at).getFullYear()}-{currentOrder.id.substring(0, 8).toUpperCase()}<br />
                <strong>Date:</strong> {new Date(currentOrder.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
              </p>
            </div>
          </div>

          {/* Info section (Customer details only) */}
          <div className="mb-6 text-[11px] leading-relaxed">
            <div className="border-l-4 border-[#059669] pl-3">
              <h3 className="m-0 mb-1 text-[10px] text-gray-500 uppercase tracking-wider font-extrabold">Delivered To (Customer)</h3>
              <p className="m-0 text-gray-700 font-medium">
                <strong className="text-gray-900">{currentOrder.recipient_name || profile?.full_name || 'Customer'}</strong><br />
                {currentOrder.house_no && <>{currentOrder.house_no}, </>}
                {currentOrder.street_gali && <>{currentOrder.street_gali}, </>}
                {currentOrder.address?.address_line1}<br />
                {currentOrder.address?.address_line2 && <>{currentOrder.address.address_line2}<br /></>}
                {currentOrder.address?.city || 'Aurangabad'}, {currentOrder.address?.state || 'Bihar'} - {currentOrder.address?.pincode || '824101'}<br />
                <strong>Phone:</strong> {currentOrder.recipient_phone || profile?.phone || '—'}
              </p>
            </div>
          </div>

          {/* Items table */}
          <table className="w-full border-collapse mb-6 text-[10px]">
            <thead>
              <tr className="bg-[#059669] text-white">
                <th className="w-[8%] text-center uppercase tracking-wider font-extrabold p-2 border border-[#059669]">S.No</th>
                <th className="w-[62%] text-left uppercase tracking-wider font-extrabold p-2 border border-[#059669]">Item Description</th>
                <th className="w-[10%] text-center uppercase tracking-wider font-extrabold p-2 border border-[#059669]">Qty</th>
                <th className="w-[10%] text-right uppercase tracking-wider font-extrabold p-2 border border-[#059669]">Price</th>
                <th className="w-[10%] text-right uppercase tracking-wider font-extrabold p-2 border border-[#059669]">Total</th>
              </tr>
            </thead>
            <tbody>
              {currentOrder.order_items?.map((item, index) => {
                const isCancelled = !!item.is_cancelled;
                return (
                  <tr key={item.id} className={`${index % 2 === 1 ? 'bg-gray-50' : 'bg-white'} ${isCancelled ? 'text-gray-400 font-normal' : ''}`}>
                    <td className={`text-center p-2 border-b border-gray-200 font-medium ${isCancelled ? 'line-through' : ''}`}>{index + 1}</td>
                    <td className={`text-left p-2 border-b border-gray-200 font-medium ${isCancelled ? 'line-through text-gray-400' : ''}`}>
                      {item.product_name} {isCancelled && <span className="text-[8px] bg-red-100 text-red-700 px-1 py-0.5 rounded font-black ml-1 uppercase">Cancelled</span>}
                    </td>
                    <td className={`text-center p-2 border-b border-gray-200 font-semibold ${isCancelled ? 'line-through' : ''}`}>{item.quantity}</td>
                    <td className={`text-right p-2 border-b border-gray-200 font-medium ${isCancelled ? 'line-through text-gray-400' : ''}`}>₹{item.unit_price.toFixed(2)}</td>
                    <td className={`text-right p-2 border-b border-gray-200 font-bold ${isCancelled ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                      ₹{isCancelled ? '0.00' : item.total_price.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Calculations and payment info side-by-side */}
          <div className="grid grid-cols-12 gap-8 text-[11px]">
            <div className="col-span-7">
              <div className="bg-[#ecfdf5] border border-[#a7f3d0] rounded-xl p-4">
                <p className="m-0 mb-1.5 text-[#065f46] font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                  💳 Payment Information
                </p>
                <p className="m-0 text-gray-700 leading-relaxed font-semibold">
                  <strong>Mode:</strong> {currentOrder.payment_method === 'cod' ? 'Cash on Delivery (COD)' : 'Online UPI/Wallet'}<br />
                  <strong>Status:</strong> {currentOrder.payment_status?.toUpperCase() || 'SUCCESSFUL'}<br />
                  {currentOrder.transaction_id && <><strong>Transaction ID:</strong> {currentOrder.transaction_id}<br /></>}
                  <strong>Delivery Partner:</strong> OZO Rider Fleet {currentOrder.rider?.full_name ? `(${currentOrder.rider.full_name})` : ''}
                </p>
              </div>
            </div>
            <div className="col-span-5 flex flex-col justify-end">
              <table className="w-full border-collapse text-[11px]">
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="py-1.5 text-gray-500 font-medium">Subtotal (Gross Amount):</td>
                    <td className="py-1.5 text-right text-gray-900 font-bold">₹{currentOrder.subtotal.toFixed(2)}</td>
                  </tr>
                  {currentOrder.platform_fee > 0 && (
                    <tr className="border-b border-gray-100">
                      <td className="py-1.5 text-gray-500 font-medium">Platform Fee:</td>
                      <td className="py-1.5 text-right text-gray-900 font-bold">₹{currentOrder.platform_fee.toFixed(2)}</td>
                    </tr>
                  )}
                  <tr className="border-b border-gray-100">
                    <td className="py-1.5 text-gray-500 font-medium">Delivery Charges:</td>
                    <td className="py-1.5 text-right text-[#059669] font-extrabold">
                      {currentOrder.delivery_fee === 0 ? 'FREE' : `₹${currentOrder.delivery_fee.toFixed(2)}`}
                    </td>
                  </tr>
                  {currentOrder.distance > 0 && (
                    <tr className="border-b border-gray-100">
                      <td className="py-1.5 text-gray-500 font-medium">Delivery Distance:</td>
                      <td className="py-1.5 text-right text-gray-900 font-semibold">{Number(currentOrder.distance).toFixed(1)} km</td>
                    </tr>
                  )}
                  {currentOrder.discount > 0 && (
                    <tr className="border-b border-gray-100">
                      <td className="py-1.5 text-gray-500 font-medium">Coupon Discount:</td>
                      <td className="py-1.5 text-right text-red-600 font-bold">-₹{currentOrder.discount.toFixed(2)}</td>
                    </tr>
                  )}
                  {currentOrder.charity_donation > 0 && (
                    <tr className="border-b border-gray-100">
                      <td className="py-1.5 text-gray-500 font-medium">Charity Donation:</td>
                      <td className="py-1.5 text-right text-emerald-600 font-bold">₹{Number(currentOrder.charity_donation).toFixed(2)}</td>
                    </tr>
                  )}
                  <tr className="border-b border-gray-100">
                    <td className="py-1.5 text-gray-500 font-medium">Taxes (Inclusive GST):</td>
                    <td className="py-1.5 text-right text-gray-900 font-semibold">₹0.00</td>
                  </tr>
                  <tr className="border-t border-gray-300">
                    <td className="pt-2 text-xs font-black text-gray-900 uppercase tracking-tight">Grand Total:</td>
                    <td className="pt-2 text-right text-sm font-black text-gray-950 font-display">₹{currentOrder.total.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Dotted separator and footer note */}
          <div className="mt-12 text-center border-t border-dashed border-gray-300 pt-4 text-gray-400 text-[10px] font-semibold">
            Thank you for ordering with OZO Mart!<br />
            <strong>Order &bull; Zero Delay &bull; On-Time</strong> &bull; For further enquiries, please visit the Contact Us page on OZO Mart.
          </div>
        </div>,
        document.body
      )}
      </div>
      )}
    </OzoLoadingGuard>
  )
}

export default OrderDetail
