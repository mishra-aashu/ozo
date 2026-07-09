import { useState, useEffect, useCallback } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  MapPin, 
  CreditCard, 
  ChevronRight, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  AlertTriangle,
  ArrowLeft,
  Pencil,
  Truck,
  Ticket,
  Smartphone,
  Banknote,
  Map as MapIcon,
  ChevronDown,
  ChevronUp,
  Home,
  Briefcase,
  X,
  User,
  Users,
  Heart
} from 'lucide-react'
import { useCartStore } from '../stores/cartStore'
import { useLocationStore, checkDeliveryZoneStatus, checkPincodeServiceable, showServiceabilityModal, findCityByPincode } from '../stores/locationStore'
import { useOrderStore } from '../stores/orderStore'
import { useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useTranslation } from '../hooks/useTranslation'
import { parseLandmark, formatLandmark } from '../lib/addressHelpers'
import OzoMapPicker from '../components/OzoMapPicker'
import AddressForm from '../components/AddressForm'
import { useAuthStore } from '../stores/authStore'
import RazorpayShield from '../components/RazorpayShield'
import CashfreeShield from '../components/CashfreeShield'
import OzoLoadingGuard from '../components/OzoLoadingGuard'
import useOzoQuery from '../hooks/useOzoQuery'
import OptimizedImage from '../components/OptimizedImage'
import { supabase } from '../lib/supabase'

const Checkout = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { 
    items, 
    total: totalAmount, 
    subtotal, 
    deliveryFee, 
    platformFee,
    distance, 
    distanceCharge, 
    discount, 
    clearCart, 
    orderConfig,
    deliveryConfig,
    couponCode: storeCouponCode,
    applyDiscount,
    removeDiscount,
    fetchCart,
    isLoading,
    mapConfig,
    launchConfig,
    serviceHoursConfig,
    paymentConfig,
    platformConfig
  } = useCartStore(useShallow(state => ({
    items: state.items,
    total: state.total,
    subtotal: state.subtotal,
    deliveryFee: state.deliveryFee,
    platformFee: state.platformFee,
    distance: state.distance,
    distanceCharge: state.distanceCharge,
    discount: state.discount,
    clearCart: state.clearCart,
    orderConfig: state.orderConfig,
    deliveryConfig: state.deliveryConfig,
    couponCode: state.couponCode,
    applyDiscount: state.applyDiscount,
    removeDiscount: state.removeDiscount,
    fetchCart: state.fetchCart,
    isLoading: state.isLoading,
    mapConfig: state.mapConfig,
    launchConfig: state.launchConfig,
    serviceHoursConfig: state.serviceHoursConfig,
    paymentConfig: state.paymentConfig,
    platformConfig: state.platformConfig
  })))
  const minOrderValueLimit = orderConfig?.min_order_value ?? 0
  const hasOutOfStockItems = items.some(item => !item.isAvailable || item.quantityAvailable <= 0)
  const hasInsufficientStockItems = items.some(item => item.isAvailable && item.quantityAvailable > 0 && item.quantity > item.quantityAvailable)
  const savings = Math.round((items.reduce((total, item) => {
    const itemSavings = Math.max(0, (item.mrp || 0) - (item.price || 0))
    return total + (itemSavings * item.quantity)
  }, 0) + Number.EPSILON) * 100) / 100
  const userAddresses = useLocationStore(state => state.userAddresses)
  const fetchUserAddresses = useLocationStore(state => state.fetchUserAddresses)
  const addUserAddress = useLocationStore(state => state.addUserAddress)
  const deleteUserAddress = useLocationStore(state => state.deleteUserAddress)
  const { placeOrder, isPlacingOrder } = useOrderStore(useShallow(state => ({
    placeOrder: state.placeOrder,
    isPlacingOrder: state.isPlacingOrder,
  })))
  const profile = useAuthStore(state => state.profile)

  const [selectedAddress, setSelectedAddress] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('cod')
  const [isAddingAddress, setIsAddingAddress] = useState(false)
  const [showMapPicker, setShowMapPicker] = useState(false)
  const [addressToDelete, setAddressToDelete] = useState(null)
  const [isShieldOpen, setIsShieldOpen] = useState(false)
  const [isCfShieldOpen, setIsCfShieldOpen] = useState(false)
  const [tempOrderNumber, setTempOrderNumber] = useState('')
  const [isAddressDropdownOpen, setIsAddressDropdownOpen] = useState(false)
  const [appliedCoupon, setAppliedCoupon] = useState(null)
  const [couponInput, setCouponInput] = useState('')
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false)
  const [isSuccessRedirecting, setIsSuccessRedirecting] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [pendingOrderId, setPendingOrderId] = useState(null)
  const [recipientType, setRecipientType] = useState(null)
  const [isCharitySelected, setIsCharitySelected] = useState(false)

  const baseTotal = subtotal + deliveryFee + platformFee - discount
  const charityDonationAmount = parseFloat(platformConfig?.charity_amount) || 10
  const charityName = platformConfig?.charity_name || 'local feeding programs'
  const activeCharityDonation = isCharitySelected ? charityDonationAmount : 0
  const displayTotal = baseTotal + activeCharityDonation

  // Filter available payment methods based on DB config
  const availablePaymentMethods = []
  if (!paymentConfig || paymentConfig.cod_enabled !== false) {
    availablePaymentMethods.push({ id: 'cod', label: 'Cash on Delivery', desc: 'Pay when your order arrives' })
  }
  if (!paymentConfig || paymentConfig.cashfree_enabled || paymentConfig.razorpay_enabled) {
    availablePaymentMethods.push({ id: 'upi', label: 'UPI / PhonePe / GPay', desc: 'Instant & Secure online payment' })
    availablePaymentMethods.push({ id: 'card', label: 'Credit / Debit Card', desc: 'All major cards accepted' })
  }

  useEffect(() => {
    if (paymentConfig) {
      const isCodAvail = paymentConfig.cod_enabled !== false
      const isOnlineAvail = paymentConfig.cashfree_enabled || paymentConfig.razorpay_enabled

      if (paymentMethod === 'cod' && !isCodAvail && isOnlineAvail) {
        setPaymentMethod('upi')
      } else if ((paymentMethod === 'upi' || paymentMethod === 'card') && !isOnlineAvail && isCodAvail) {
        setPaymentMethod('cod')
      }
    }
  }, [paymentConfig, paymentMethod])

  const [showServiceHoursModal, setShowServiceHoursModal] = useState(false)
  const [hasAcknowledgedServiceHours, setHasAcknowledgedServiceHours] = useState(false)

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

  useEffect(() => {
    const fetchAppliedCoupon = async () => {
      if (storeCouponCode && !appliedCoupon) {
        try {
          const { data, error } = await supabase
            .from('offers')
            .select('*')
            .eq('coupon_code', storeCouponCode)
            .eq('is_active', true)
            .single()
          if (data && !error) {
            setAppliedCoupon(data)
            setCouponInput(data.coupon_code)
          }
        } catch (e) {
          console.error(e)
        }
      }
    }
    fetchAppliedCoupon()
  }, [storeCouponCode])

  useEffect(() => {
    fetchCart()
  }, [fetchCart])

  useEffect(() => {
    if (!isLoading && items.length > 0) {
      const outOfStock = items.some(item => !item.isAvailable || item.quantityAvailable <= 0)
      const insufficientStock = items.some(item => item.isAvailable && item.quantityAvailable > 0 && item.quantity > item.quantityAvailable)
      if (outOfStock) {
        toast.error('Some items in your cart are out of stock. Redirecting to cart.')
        navigate('/cart')
      } else if (insufficientStock) {
        toast.error('Some items in your cart have insufficient stock. Redirecting to cart.')
        navigate('/cart')
      }
    }
  }, [items, isLoading, navigate])

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) {
      toast.error('Please enter a coupon code')
      return
    }

    setIsApplyingCoupon(true)

    try {
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .eq('coupon_code', couponInput.toUpperCase())
        .eq('is_active', true)
        .single()

      if (error || !data) {
        toast.error('Invalid coupon code')
        setIsApplyingCoupon(false)
        return
      }

      const now = new Date()
      const startDate = data.start_date ? new Date(data.start_date) : null
      const endDate = data.end_date ? new Date(data.end_date) : null

      if (startDate && now < startDate) {
        toast.error('This coupon is not yet active')
        setIsApplyingCoupon(false)
        return
      }

      if (endDate && now > endDate) {
        toast.error('This coupon has expired')
        setIsApplyingCoupon(false)
        return
      }

      if (data.min_order_value && subtotal < data.min_order_value) {
        toast.error(`Minimum order value of ₹${data.min_order_value} required`)
        setIsApplyingCoupon(false)
        return
      }

      let discountAmount = 0
      if (data.discount_type === 'percentage') {
        discountAmount = (subtotal * data.discount_value) / 100
        if (data.max_discount && discountAmount > data.max_discount) {
          discountAmount = data.max_discount
        }
      } else {
        discountAmount = data.discount_value
      }

      applyDiscount(discountAmount, data.coupon_code)
      setAppliedCoupon(data)
      toast.success(`Coupon applied! You saved ₹${discountAmount}`)
    } catch (error) {
      console.error('Apply coupon error:', error)
      toast.error('Failed to apply coupon')
    } finally {
      setIsApplyingCoupon(false)
    }
  }

  const handleRemoveCoupon = () => {
    removeDiscount()
    setAppliedCoupon(null)
    setCouponInput('')
  }
  
  const [newAddress, setNewAddress] = useState(() => {
    const nearestCity = useLocationStore.getState().nearestCity
    return {
      label: 'Home',
      address_line1: '',
      address_line2: '',
      city: '',
      state: nearestCity?.state || 'Bihar',
      pincode: '',
      landmark: '',
      receiver_name: '',
      receiver_phone: '',
      notes: '',
      latitude: null,
      longitude: null,
      google_maps_url: '',
      locality_id: null,
      landmark_id: null,
      gali_id: null
    }
  })

  const handleLocationSelect = (loc) => {
    if (loc.isManualSelect) {
      setNewAddress(prev => ({
        ...prev,
        latitude: loc.lat,
        longitude: loc.lng
      }))
      return
    }

    const isDeliverable = checkDeliveryZoneStatus(loc.lat, loc.lng, useCartStore.getState())
    if (!isDeliverable) {
      const { geofenceConfig } = useCartStore.getState()
      if (geofenceConfig?.strict_enforcement) {
        toast.error('Location is outside our active delivery zone.', {
          duration: 4000
        })
      } else {
        toast.success('Location is outside zone. Double delivery fee will apply.', {
          duration: 4000
        })
      }
    }

    const addr = loc.addressDetails || {}
    const nearest = loc.nearestStreet || null
    
    // Use nearest street name if available, fallback to Nominatim street
    const street = nearest 
      ? (nearest.name_hi ? `${nearest.name} (${nearest.name_hi})` : nearest.name)
      : [addr.road, addr.pedestrian || addr.suburb].filter(Boolean).join(', ')
    
    const nearestCity = useLocationStore.getState().nearestCity
    const cityVal = nearest ? (nearestCity?.name || 'Aurangabad') : (addr.city || addr.town || addr.village || addr.county || '')
    const stateVal = nearest ? (nearestCity?.state || 'Bihar') : (addr.state || '')
    const pincodeVal = nearest ? (nearestCity?.allowed_pincodes?.[0] || '') : (addr.postcode || '')
    const landmarkVal = addr.amenity || addr.landmark || addr.commercial || addr.shop || ''

    // Compute smart snapping from hierarchical database nodes
    const snapResult = useLocationStore.getState().findClosestHierarchicalMatch(loc.lat, loc.lng)
    const matchedLocalityName = snapResult.locality ? snapResult.locality.name : ''
    const matchedLandmarkName = snapResult.landmark ? snapResult.landmark.name : ''

    setNewAddress(prev => ({
      ...prev,
      latitude: loc.lat,
      longitude: loc.lng,
      address_line1: prev.address_line1 || (snapResult.gali ? snapResult.gali.name : ''),
      address_line2: matchedLocalityName || street || prev.address_line2 || '',
      city: cityVal || prev.city || '',
      state: stateVal || prev.state || '',
      pincode: pincodeVal || prev.pincode || '',
      landmark: prev.landmark || matchedLandmarkName || landmarkVal || '',
      traced_through: 'map',
      locality_id: snapResult.locality ? snapResult.locality.id : prev.locality_id,
      landmark_id: snapResult.landmark ? snapResult.landmark.id : prev.landmark_id,
      gali_id: snapResult.gali ? snapResult.gali.id : prev.gali_id
    }))
  }

  const { isLoading: isAddressesLoading, isError, refetch } = useOzoQuery(
    async (signal) => {
      const res = await fetchUserAddresses({ signal })
      if (!res.success && !res.aborted) {
        throw res.error || new Error('Failed to fetch addresses')
      }
    },
    [fetchUserAddresses]
  )

  useEffect(() => {
    if (userAddresses.length > 0 && !selectedAddress) {
      setSelectedAddress(userAddresses[0].id)
    }
  }, [userAddresses, selectedAddress])

  useEffect(() => {
    if (selectedAddress) {
      const activeAddr = userAddresses.find(a => a.id === selectedAddress)
      if (activeAddr && activeAddr.latitude !== undefined && activeAddr.longitude !== undefined) {
        useCartStore.getState().calculateTotals({
          lat: parseFloat(activeAddr.latitude),
          lng: parseFloat(activeAddr.longitude)
        })
      } else {
        useCartStore.getState().calculateTotals()
      }
    } else {
      useCartStore.getState().calculateTotals()
    }
  }, [selectedAddress, userAddresses])

  useEffect(() => {
    if (isPlacingOrder || isSuccessRedirecting || isProcessing) {
      window.scrollTo(0, 0)
    }
  }, [isPlacingOrder, isSuccessRedirecting, isProcessing])

  const handlePlaceOrder = async (bypassAlert = false) => {
    if (isClosed && serviceHoursConfig?.prevent_checkout) {
      setShowServiceHoursModal(true)
      toast.error('Delivery service is closed. Checkout is blocked.')
      return
    }

    if (isClosed && !hasAcknowledgedServiceHours && bypassAlert !== true) {
      setShowServiceHoursModal(true)
      return
    }

    if (items.length === 0) {
      toast.error('Your cart is empty')
      return
    }

    if (hasOutOfStockItems) {
      toast.error('Some items in your cart are out of stock. Please edit your cart.')
      navigate('/cart')
      return
    }

    if (hasInsufficientStockItems) {
      toast.error('Some items in your cart have insufficient stock. Please edit your cart.')
      navigate('/cart')
      return
    }

    if (subtotal < minOrderValueLimit) {
      toast.error(`Minimum order value of ₹${minOrderValueLimit} is required to checkout`)
      return
    }

    if (!selectedAddress) {
      toast.error('Please select a delivery address')
      return
    }

    const activeAddr = userAddresses.find(a => a.id === selectedAddress)
    if (activeAddr) {
      const parsed = parseLandmark(activeAddr.landmark)
      const recipientName = parsed.receiverName || profile?.full_name || ''
      const recipientPhone = parsed.receiverPhone || profile?.phone_number || profile?.phone || ''
      const houseNo = activeAddr.address_line1 || ''
      const streetGali = activeAddr.address_line2 || ''
      const landmarkVal = parsed.landmark || ''
      
      if (!recipientName.trim()) {
        toast.error('Selected address is missing recipient name. Please edit the address.')
        return
      }
      if (!recipientPhone.trim()) {
        toast.error('Selected address is missing recipient phone number. Please edit the address.')
        return
      }
      if (!houseNo.trim()) {
        toast.error('Selected address is missing Flat/House/Building number. Please edit the address.')
        return
      }
      if (!streetGali.trim()) {
        toast.error('Selected address is missing Street/Gali/Area. Please edit the address.')
        return
      }
      if (!activeAddr.city?.trim()) {
        toast.error('Selected address is missing City. Please edit the address.')
        return
      }
      if (!activeAddr.state?.trim()) {
        toast.error('Selected address is missing State. Please edit the address.')
        return
      }
      if (!activeAddr.pincode?.trim()) {
        toast.error('Selected address is missing Pincode. Please edit the address.')
        return
      }

      // Geofence circle check is the Single Source of Truth if coordinates are available.
      let isAddressServiceable = true
      if (activeAddr.latitude && activeAddr.longitude) {
        isAddressServiceable = checkDeliveryZoneStatus(activeAddr.latitude, activeAddr.longitude, useCartStore.getState())
      } else if (activeAddr.pincode) {
        isAddressServiceable = checkPincodeServiceable(activeAddr.pincode, activeAddr.city)
      }

      if (!isAddressServiceable) {
        if (activeAddr.latitude && activeAddr.longitude) {
          const { geofenceConfig } = useCartStore.getState()
          if (geofenceConfig?.strict_enforcement) {
            toast.error('Selected address is outside our active delivery zone.')
            return
          } else {
            toast.success('Proceeding with out-of-zone address (double delivery fee applied).')
          }
        } else {
          showServiceabilityModal(activeAddr.city, activeAddr.pincode)
          return
        }
      }
    }

    if (paymentMethod === 'upi' || paymentMethod === 'card') {
      if (!paymentConfig?.cashfree_enabled && !paymentConfig?.razorpay_enabled) {
        toast.error('Online payments are temporarily disabled.')
        return
      }

      setIsProcessing(true)
      const pendingOrderToast = toast.loading('Initializing secure transaction context...')
      try {
        const isCashfree = paymentConfig?.cashfree_enabled;
        const edgeFuncName = isCashfree ? 'cashfree-payment' : 'verify-razorpay-payment';
        const { data: totalsData, error: totalsError } = await supabase.functions.invoke(edgeFuncName, {
          body: {
            action: 'calculate_totals',
            addressId: selectedAddress,
            couponCode: storeCouponCode,
            charityDonation: activeCharityDonation
          }
        });

        if (totalsError || !totalsData || !totalsData.success) {
          throw new Error(totalsError?.message || totalsData?.error || 'Failed to verify transaction pricing');
        }

        const orderTotals = totalsData.calculatedDetails;
        const activeAddr = userAddresses.find(a => a.id === selectedAddress)
        const parsed = parseLandmark(activeAddr?.landmark)
        const houseNo = activeAddr?.address_line1 || ''
        const streetGali = activeAddr?.address_line2 || ''
        const landmarkVal = parsed.landmark || ''
        const recipientName = parsed.receiverName || profile?.full_name || ''
        const recipientPhone = parsed.receiverPhone || profile?.phone_number || profile?.phone || ''
        const isMyself = recipientName.trim().toLowerCase() === (profile?.full_name || '').trim().toLowerCase()
        const orderFor = isMyself ? 'myself' : 'other'
        const landmarkPart = landmarkVal.trim() ? `, Near ${landmarkVal.trim()}` : ''
        const fullTextAddress = `${houseNo}, ${streetGali}${landmarkPart}, ${activeAddr?.city || 'Aurangabad'}, Bihar, India`
        const googleMapsUrl = activeAddr?.google_maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullTextAddress)}`

        let etaMinutes = deliveryConfig?.estimated_minutes ?? 30;
        const currentHour = new Date().getHours();
        if (
          streetGali.toLowerCase().includes('coaching gali') &&
          currentHour >= 13 &&
          currentHour < 16
        ) {
          etaMinutes += 4;
        }

        const orderData = {
          addressId: selectedAddress,
          subtotal: orderTotals.subtotal,
          deliveryFee: orderTotals.deliveryFee,
          platformFee: orderTotals.platformFee || platformFee || 0,
          discount: orderTotals.discount,
          total: orderTotals.total,
          paymentMethod,
          paymentStatus: 'pending_payment',
          estimatedDelivery: new Date(Date.now() + etaMinutes * 60000).toISOString(),
          transactionId: null,
          deliveryInstructions: deliveryInstructions || null,
          couponCode: storeCouponCode || null,
          orderFor,
          recipientName,
          recipientPhone,
          houseNo,
          streetGali,
          landmark: landmarkVal,
          deliveryCity: activeAddr?.city || 'Aurangabad',
          googleMapsUrl,
          latitude: activeAddr?.latitude ? parseFloat(activeAddr.latitude) : null,
          longitude: activeAddr?.longitude ? parseFloat(activeAddr.longitude) : null,
          martId: null,
          distance: distance || null,
          charityDonation: activeCharityDonation
        }

        const result = await placeOrder(orderData)
        toast.dismiss(pendingOrderToast)
        if (result.success) {
          setPendingOrderId(result.data.id)
          setTempOrderNumber(result.data.order_number || `OZO-${Math.floor(100000 + Math.random() * 900000)}`)
          setIsProcessing(false)
          
          if (paymentConfig?.cashfree_enabled) {
            setIsCfShieldOpen(true)
          } else {
            setIsShieldOpen(true)
          }
        } else {
          setIsProcessing(false)
          toast.error('Failed to initialize order details')
        }
      } catch (err) {
        toast.dismiss(pendingOrderToast)
        console.error('Pending order creation error:', err)
        toast.error(`Transaction initialization error: ${err.message}`)
        setIsProcessing(false)
      }
      return
    }

    await executePlaceOrder()
  }

  const executePlaceOrder = async (transactionId = null, deliveryInstructions = null, serverCalculatedTotals = null) => {
    setIsShieldOpen(false)
    setIsCfShieldOpen(false)
    setIsProcessing(true)

    if (pendingOrderId) {
      localStorage.removeItem('active_mart_id')
      setIsSuccessRedirecting(true)
      clearCart()
      navigate(`/order/${pendingOrderId}`)
      return
    }

    try {
      let orderTotals = serverCalculatedTotals;
      
      // If no serverCalculatedTotals is provided (e.g. COD route or fallback), fetch it from Edge Function
      if (!orderTotals) {
        const loadingToast = toast.loading('Calculating secure server-side totals...');
        try {
          const isCashfree = (paymentMethod === 'upi' || paymentMethod === 'card') && paymentConfig?.cashfree_enabled;
          const edgeFuncName = isCashfree ? 'cashfree-payment' : 'verify-razorpay-payment';
          const { data: totalsData, error: totalsError } = await supabase.functions.invoke(edgeFuncName, {
            body: {
              action: 'calculate_totals',
              addressId: selectedAddress,
              couponCode: storeCouponCode,
              charityDonation: activeCharityDonation
            }
          });
          toast.dismiss(loadingToast);
          if (totalsError || !totalsData || !totalsData.success) {
            let errMsg = 'Failed to calculate expected amount';
            if (totalsError) {
              if (totalsError.context) {
                try {
                  const body = await totalsError.context.json();
                  errMsg = body.error || body.message || totalsError.message;
                } catch {
                  try {
                    const text = await totalsError.context.text();
                    errMsg = text || totalsError.message;
                  } catch {
                    errMsg = totalsError.message;
                  }
                }
              } else {
                errMsg = totalsError.message;
              }
            } else if (totalsData && totalsData.error) {
              errMsg = totalsData.error;
            }
            toast.error(`Order Placement Blocked: ${errMsg}`);
            setIsProcessing(false)
            return;
          }
          orderTotals = totalsData.calculatedDetails;
        } catch (err) {
          toast.dismiss(loadingToast);
          toast.error(`Failed to verify pricing structure: ${err.message}`);
          setIsProcessing(false)
          return;
        }
      }

      const activeAddr = userAddresses.find(a => a.id === selectedAddress)
      const parsed = parseLandmark(activeAddr?.landmark)
      const houseNo = activeAddr?.address_line1 || ''
      const streetGali = activeAddr?.address_line2 || ''
      const landmarkVal = parsed.landmark || ''
      const recipientName = parsed.receiverName || profile?.full_name || ''
      const recipientPhone = parsed.receiverPhone || profile?.phone_number || profile?.phone || ''
      
      const isMyself = recipientName.trim().toLowerCase() === (profile?.full_name || '').trim().toLowerCase()
      const orderFor = isMyself ? 'myself' : 'other'
      
      // Dynamic Google Maps URL Generation using universal query formatting
      const landmarkPart = landmarkVal.trim() ? `, Near ${landmarkVal.trim()}` : ''
      const fullTextAddress = `${houseNo}, ${streetGali}${landmarkPart}, ${activeAddr?.city || 'Aurangabad'}, Bihar, India`
      const googleMapsUrl = activeAddr?.google_maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullTextAddress)}`

      const orderData = {
        addressId: selectedAddress,
        subtotal: orderTotals.subtotal,
        deliveryFee: orderTotals.deliveryFee,
        platformFee: orderTotals.platformFee || platformFee || 0,
        discount: orderTotals.discount,
        total: orderTotals.total,
        paymentMethod,
        paymentStatus: paymentMethod === 'cod' ? 'pending' : 'paid',
        estimatedDelivery: new Date(Date.now() + (deliveryConfig?.estimated_minutes ?? 30) * 60000).toISOString(),
        transactionId,
        deliveryInstructions,
        couponCode: storeCouponCode || null,
        
        // Pukka address & recipient columns
        orderFor,
        recipientName,
        recipientPhone,
        houseNo,
        streetGali,
        landmark: landmarkVal,
        deliveryCity: activeAddr?.city || 'Aurangabad',
        googleMapsUrl,
        latitude: activeAddr?.latitude ? parseFloat(activeAddr.latitude) : null,
        longitude: activeAddr?.longitude ? parseFloat(activeAddr.longitude) : null,
        martId: null,
        distance: distance || null,
        charityDonation: activeCharityDonation
      }

      const result = await placeOrder(orderData)
      if (result.success) {
        localStorage.removeItem('active_mart_id')
        setIsSuccessRedirecting(true)
        clearCart() // Make sure cart is cleared upon successful order placement
        navigate(`/order/${result.data.id}`)
      } else {
        setIsProcessing(false)
      }
    } catch (err) {
      console.error(err)
      toast.error(`Order placement error: ${err.message}`)
      setIsProcessing(false)
    }
  }

  const handleAddAddress = async (e) => {
    e.preventDefault()

    let finalReceiverName = newAddress.receiver_name
    let finalReceiverPhone = newAddress.receiver_phone

    if (recipientType === 'myself') {
      finalReceiverName = profile?.full_name || ''
      finalReceiverPhone = profile?.phone_number || profile?.phone || ''
    }

    if (!finalReceiverName.trim()) {
      toast.error('Receiver name is required')
      return
    }
    if (!finalReceiverPhone.trim()) {
      toast.error('Receiver phone number is required')
      return
    }
    if (!newAddress.address_line1.trim()) {
      toast.error('Flat/House/Building number is required')
      return
    }
    if (!newAddress.address_line2.trim()) {
      toast.error('Street/Gali/Area is required')
      return
    }
    if (!newAddress.city.trim()) {
      toast.error('City is required')
      return
    }
    if (!newAddress.state.trim()) {
      toast.error('State is required')
      return
    }
    if (!newAddress.pincode.trim()) {
      toast.error('Pincode is required')
      return
    }

    // Geofence circle check is the Single Source of Truth if coordinates are available.
    let isNewAddressServiceable = true
    if (newAddress.latitude && newAddress.longitude) {
      isNewAddressServiceable = checkDeliveryZoneStatus(newAddress.latitude, newAddress.longitude, useCartStore.getState())
    } else if (newAddress.pincode) {
      isNewAddressServiceable = checkPincodeServiceable(newAddress.pincode, newAddress.city)
    }

    if (!isNewAddressServiceable) {
      if (newAddress.latitude && newAddress.longitude) {
        const { geofenceConfig } = useCartStore.getState()
        if (geofenceConfig?.strict_enforcement) {
          toast.error('Location is outside our active delivery zone.')
          return
        } else {
          toast.success('Adding location outside zone (double delivery fee will apply).')
        }
      } else {
        showServiceabilityModal(newAddress.city, newAddress.pincode)
        return
      }
    }

    const payload = {
      label: newAddress.label,
      address_line1: newAddress.address_line1,
      address_line2: newAddress.address_line2,
      city: newAddress.city,
      state: newAddress.state,
      pincode: newAddress.pincode,
      landmark: formatLandmark(finalReceiverName, finalReceiverPhone, newAddress.landmark, newAddress.notes),
      latitude: newAddress.latitude,
      longitude: newAddress.longitude,
      google_maps_url: newAddress.google_maps_url || null,
      is_default: false,
      traced_through: newAddress.traced_through || 'map',
      locality_id: newAddress.locality_id || null,
      landmark_id: newAddress.landmark_id || null,
      gali_id: newAddress.gali_id || null
    }

    const result = await addUserAddress(payload)
    if (result) {
      setIsAddingAddress(false)
      setShowMapPicker(false)
      setSelectedAddress(result.id)
      setRecipientType(null) // Reset recipient toggle state
      const nearestCity = useLocationStore.getState().nearestCity
      setNewAddress({ 
        label: 'Home', 
        address_line1: '', 
        address_line2: '', 
        city: '', 
        state: nearestCity?.state || 'Bihar', 
        pincode: '',
        landmark: '',
        notes: '',
        receiver_name: '',
        receiver_phone: '',
        latitude: null,
        longitude: null,
        google_maps_url: '',
        locality_id: null,
        landmark_id: null,
        gali_id: null
      })
    }
  }

  if (isPlacingOrder || isSuccessRedirecting || isProcessing) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] flex flex-col items-center justify-center p-8 text-center transition-colors duration-300">
        <div className="relative mb-8">
          <div className="absolute inset-0 rounded-full bg-ozo-red/10 animate-ping opacity-75" />
          <div className="w-24 h-24 bg-red-50 dark:bg-ozo-red/10 rounded-[2.5rem] flex items-center justify-center text-ozo-red shadow-xl relative z-10">
            <Truck size={48} className="animate-pulse" />
          </div>
        </div>
        <h2 className="text-2xl font-black mb-2 text-gray-900 dark:text-white">
          {isSuccessRedirecting ? 'Order Confirmed!' : 'Processing Your Order...'}
        </h2>
        <p className="text-ozo-gray dark:text-gray-400 font-medium max-w-sm mb-6">
          {isSuccessRedirecting 
            ? 'Redirecting you to the order tracking page...' 
            : 'Please do not close this page or press back. We are preparing your order.'}
        </p>

        {/* Premium animated progress bar */}
        <div className="w-48 h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden mb-6 mx-auto">
          <motion.div 
            className="h-full bg-gradient-ozo"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ 
              repeat: Infinity, 
              duration: 2, 
              ease: "easeInOut" 
            }}
          />
        </div>

        <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-white/5 rounded-full text-xs font-bold text-gray-600 dark:text-gray-400 mx-auto w-fit">
          <div className="w-2 h-2 rounded-full bg-ozo-green animate-pulse" />
          Secure Transaction Audited
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] flex flex-col items-center justify-center p-8 text-center">
        <div className="w-24 h-24 bg-red-50 dark:bg-ozo-red/10 rounded-[2.5rem] flex items-center justify-center text-ozo-red mb-6 shadow-xl">
           <Truck size={48} />
        </div>
        <h2 className="text-2xl font-black mb-2">Your Cart is Empty</h2>
        <p className="text-ozo-gray mb-8">Add some items to your cart before checking out.</p>
        <Link to="/products" className="btn btn-primary px-10">Start Shopping</Link>
      </div>
    )
  }

  const renderTitle = (titleString) => {
    if (!titleString) return null
    const words = titleString.trim().split(/\s+/)
    if (words.length <= 1) {
      return <>{titleString}<span className="text-gradient">.</span></>
    }
    const firstPart = words.slice(0, -1).join(' ')
    const lastWord = words[words.length - 1]
    return <>{firstPart} <span className="text-gradient">{lastWord}.</span></>
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] pb-24 transition-colors duration-300">
      {/* Header */}
      <div className="page-header-sticky">
        <div className="container-custom">
          <div className="flex items-center gap-4">
             <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors">
                <ArrowLeft size={24} className="text-gray-900 dark:text-white" />
             </button>
             <div>
                <h1 className="text-2xl font-black text-gray-900 dark:text-white font-display">{renderTitle(t?.('checkout') || 'Checkout')}</h1>
                <p className="text-xs font-bold text-ozo-gray uppercase tracking-widest">{items.length} Items in cart</p>
             </div>
          </div>
        </div>
      </div>

      <div className="container-custom py-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 items-start">
          
          {/* Main Checkout Flow */}
          <div className="md:col-span-7 lg:col-span-8 space-y-6">
            
            {/* Step 1: Delivery Address */}
            <section className="bg-white dark:bg-[#1a1a1a] rounded-[2rem] p-6 shadow-sm border border-gray-100 dark:border-white/5">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-green-50 dark:bg-ozo-green/10 text-ozo-green rounded-2xl flex items-center justify-center">
                      <MapPin size={24} />
                   </div>
                   <h2 className="text-xl font-black">Delivery Address</h2>
                </div>
                <button 
                   onClick={() => {
                    setIsAddingAddress(!isAddingAddress)
                    setRecipientType(null)
                    setShowMapPicker(false)
                    setIsAddressDropdownOpen(false)
                  }}
                  className="flex items-center gap-2 text-ozo-red font-black text-sm hover:underline"
                >
                  <Plus size={18} />
                  {isAddingAddress ? 'Show List' : 'Add New'}
                </button>
              </div>

               {!isAddingAddress && (
                <OzoLoadingGuard
                  isLoading={isAddressesLoading}
                  isEmpty={userAddresses.length === 0}
                  isError={isError}
                  onRetry={refetch}
                  skeleton={
                    <div className="p-4 md:p-5 rounded-[1.5rem] border border-gray-150 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 animate-pulse space-y-3">
                      <div className="w-16 h-5 bg-gray-200 dark:bg-white/10 rounded" />
                      <div className="w-3/4 h-4 bg-gray-200 dark:bg-white/10 rounded" />
                      <div className="w-1/2 h-3 bg-gray-200 dark:bg-white/10 rounded" />
                    </div>
                  }
                  fallback={
                    <div className="text-center py-8 px-4 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-[2rem] bg-gray-50/30 dark:bg-white/5 flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-ozo-red/10 text-ozo-red flex items-center justify-center mb-3">
                        <MapPin size={24} />
                      </div>
                      <p className="text-sm font-black text-gray-800 dark:text-white mb-1">No Addresses Saved Yet</p>
                      <p className="text-xs text-ozo-gray dark:text-gray-400 font-bold mb-4">Please add a delivery address to place your order.</p>
                      <button 
                        onClick={() => {
                          setIsAddingAddress(true)
                          setRecipientType(null)
                          setShowMapPicker(false)
                          setIsAddressDropdownOpen(false)
                        }}
                        className="px-5 py-2.5 bg-gradient-ozo text-white text-xs font-black rounded-xl hover:shadow-lg active:scale-95 transition-all flex items-center gap-1.5"
                      >
                        <Plus size={16} /> Add New Address
                      </button>
                    </div>
                  }
                >
                  <div className="space-y-4">
                    {/* Selected Address Card */}
                    {(() => {
                      const activeAddr = userAddresses.find(a => a.id === selectedAddress) || userAddresses[0]
                      if (!activeAddr) return null
                      const parsed = parseLandmark(activeAddr.landmark)
                      return (
                        <div 
                          onClick={() => setIsAddressDropdownOpen(!isAddressDropdownOpen)}
                          className="relative p-4 md:p-5 rounded-[1.5rem] border-2 border-ozo-red bg-red-50/20 dark:bg-ozo-red/5 ring-4 ring-ozo-red/10 cursor-pointer transition-all hover:bg-red-50/30"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-3">
                                <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-gray-900 dark:bg-white/10 text-white rounded-lg">
                                  {activeAddr.label}
                                </span>
                                {(() => {
                                  const isServiceable = activeAddr.latitude && activeAddr.longitude
                                    ? checkDeliveryZoneStatus(activeAddr.latitude, activeAddr.longitude, useCartStore.getState())
                                    : checkPincodeServiceable(activeAddr.pincode, activeAddr.city);
                                  return !isServiceable && (
                                    <span className="flex items-center gap-1 text-[10px] uppercase tracking-widest font-black text-red-600 bg-red-50 dark:bg-red-950/20 px-3 py-1 rounded-full border border-red-200">
                                      ⚠️ Non-Serviceable
                                    </span>
                                  );
                                })()}
                                {(parsed.receiverName || parsed.receiverPhone) && (
                                  <div className="flex items-center gap-1.5 text-[10px] font-black text-ozo-red dark:text-red-400 bg-red-50/50 dark:bg-ozo-red/5 px-2 py-0.5 rounded-md w-fit">
                                    <span>👤 {parsed.receiverName}</span>
                                    {parsed.receiverPhone && <span className="opacity-60">• {parsed.receiverPhone}</span>}
                                  </div>
                                )}
                              </div>
                              <p className="text-sm font-black text-gray-900 dark:text-white mb-1">{activeAddr.address_line1}</p>
                              <p className="text-xs text-ozo-gray dark:text-gray-400 font-bold leading-relaxed">
                                {activeAddr.address_line2 && activeAddr.address_line2 + ', '}
                                {parsed.landmark && `Near ${parsed.landmark}, `}
                                {activeAddr.city}, {activeAddr.state} - {activeAddr.pincode}
                              </p>
                            </div>
                            
                            {/* Dropdown Action Controls */}
                            <div className="flex flex-col items-end gap-3 flex-shrink-0">
                              <div className="flex items-center gap-1 bg-white dark:bg-[#1a1a1a] shadow-sm border border-gray-150 dark:border-white/5 py-1 px-3 rounded-full text-xs font-black text-ozo-red transition-all hover:scale-105">
                                <span>Change</span>
                                {isAddressDropdownOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })()}

                    {/* Dropdown List of Other Addresses */}
                    <AnimatePresence>
                      {isAddressDropdownOpen && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden border-t border-dashed border-gray-200 dark:border-white/10 pt-4"
                        >
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {(() => {
                              const otherAddresses = userAddresses.filter(addr => addr.id !== selectedAddress)
                              if (otherAddresses.length === 0) {
                                return (
                                  <div className="col-span-full p-6 bg-gray-50/50 dark:bg-white/5 rounded-[1.5rem] border border-dashed border-gray-200 dark:border-white/10 text-center flex flex-col items-center justify-center">
                                    <p className="text-sm font-black text-gray-700 dark:text-gray-300 mb-1">No other saved addresses</p>
                                    <p className="text-xs text-ozo-gray dark:text-gray-500 font-bold mb-4">You can add another address to deliver to a different location.</p>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setIsAddingAddress(true)
                                        setRecipientType(null)
                                        setShowMapPicker(false)
                                        setIsAddressDropdownOpen(false)
                                      }}
                                      className="px-4 py-2 bg-gradient-ozo text-white text-xs font-black rounded-xl hover:shadow-lg active:scale-95 transition-all flex items-center gap-1.5"
                                    >
                                      <Plus size={14} /> Add New Address
                                    </button>
                                  </div>
                                )
                              }
                              return (
                                <>
                                  {otherAddresses.map((addr) => {
                                    const parsed = parseLandmark(addr.landmark)
                                    return (
                                      <div 
                                        key={addr.id}
                                        onClick={() => {
                                          setSelectedAddress(addr.id)
                                          setIsAddressDropdownOpen(false)
                                        }}
                                        className="relative p-4 md:p-5 rounded-[1.5rem] border-2 border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10 bg-white dark:bg-[#1a1a1a] cursor-pointer transition-all"
                                      >
                                        <div className="flex items-start justify-between mb-3">
                                           <div className="flex items-center gap-2">
                                             <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 rounded-lg">
                                               {addr.label}
                                             </span>
                                             {(() => {
                                               const isServiceable = addr.latitude && addr.longitude
                                                 ? checkDeliveryZoneStatus(addr.latitude, addr.longitude, useCartStore.getState())
                                                 : checkPincodeServiceable(addr.pincode, addr.city);
                                               return !isServiceable && (
                                                 <span className="flex items-center gap-1 text-[10px] uppercase tracking-widest font-black text-red-650 bg-red-50 dark:bg-red-950/20 px-2 py-0.5 rounded border border-red-200">
                                                   ⚠️ Non-Serviceable
                                                 </span>
                                               );
                                             })()}
                                           </div>
                                           <button
                                             type="button"
                                             onClick={(e) => {
                                               e.stopPropagation()
                                               setAddressToDelete(addr.id)
                                             }}
                                             className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-gray-400 hover:text-ozo-red transition-colors"
                                             title="Delete Address"
                                           >
                                             <Trash2 size={14} />
                                           </button>
                                        </div>
                                        
                                        {(parsed.receiverName || parsed.receiverPhone) && (
                                          <div className="flex items-center gap-1.5 text-[10px] font-black text-ozo-gray dark:text-gray-400 mb-1.5 bg-gray-50 dark:bg-white/5 px-2 py-0.5 rounded-md w-fit">
                                            <span>👤 {parsed.receiverName}</span>
                                            {parsed.receiverPhone && <span className="opacity-60">• {parsed.receiverPhone}</span>}
                                          </div>
                                        )}
                                        
                                        <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">{addr.address_line1}</p>
                                        <p className="text-xs text-ozo-gray dark:text-gray-400 font-medium leading-relaxed">
                                          {addr.address_line2 && addr.address_line2 + ', '}
                                          {parsed.landmark && `Near ${parsed.landmark}, `}
                                          {addr.city}, {addr.state} - {addr.pincode}
                                        </p>
                                      </div>
                                    )
                                  })}

                                  {/* Add New Address Card inside Grid */}
                                  <div 
                                    onClick={() => {
                                      setIsAddingAddress(true)
                                      setRecipientType(null)
                                      setShowMapPicker(false)
                                      setIsAddressDropdownOpen(false)
                                    }}
                                    className="relative p-5 rounded-[1.5rem] border-2 border-dashed border-gray-200 dark:border-white/10 hover:border-ozo-red/50 hover:bg-red-50/10 dark:hover:bg-white/5 cursor-pointer transition-all flex flex-col items-center justify-center min-h-[140px] text-center group"
                                  >
                                    <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-ozo-red/10 text-ozo-red flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                      <Plus size={20} />
                                    </div>
                                    <p className="text-sm font-black text-gray-800 dark:text-white">Add New Address</p>
                                    <p className="text-xs text-ozo-gray dark:text-gray-400 font-bold mt-1">Deliver to another location</p>
                                  </div>
                                </>
                              )
                            })()}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </OzoLoadingGuard>
              )}

              {isAddingAddress && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-8 pt-8 border-t border-gray-100 dark:border-white/5"
                >
                  <form onSubmit={handleAddAddress} className="space-y-6">
                    {!recipientType ? (
                      <div className="text-center py-12 animate-fadeIn space-y-8">
                        <div>
                          <p className="text-base font-black text-gray-800 dark:text-gray-200 mb-2">
                            Who is this address for?
                          </p>
                          <p className="text-xs text-ozo-gray dark:text-gray-400 font-bold">
                            Please select to continue
                          </p>
                        </div>
                        <div className="grid grid-cols-1 gap-4 max-w-sm mx-auto">
                          <button
                            type="button"
                            onClick={() => {
                              setRecipientType('myself');
                              setNewAddress({
                                ...newAddress,
                                receiver_name: profile?.full_name || '',
                                receiver_phone: profile?.phone_number || profile?.phone || '',
                                notes: ''
                              });
                            }}
                            className="p-6 rounded-[2.2rem] border border-gray-200 dark:border-white/5 bg-white dark:bg-[#1a1a1a] hover:border-ozo-red dark:hover:border-ozo-red/50 hover:bg-red-50/10 dark:hover:bg-ozo-red/5 transition-all text-left flex items-center gap-4 group active:scale-95 shadow-sm"
                          >
                            <div className="w-14 h-14 bg-red-50 dark:bg-ozo-red/10 text-ozo-red rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
                              <User size={26} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h5 className="font-black text-sm text-gray-900 dark:text-white">For Myself</h5>
                              <p className="text-[10px] text-gray-500 font-bold mt-1 leading-normal truncate">
                                {profile?.full_name || 'Your Name'} ({profile?.phone_number || profile?.phone || 'Your Phone'})
                              </p>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setRecipientType('other');
                              setNewAddress({
                                ...newAddress,
                                receiver_name: '',
                                receiver_phone: '',
                                notes: ''
                              });
                            }}
                            className="p-6 rounded-[2.2rem] border border-gray-200 dark:border-white/5 bg-white dark:bg-[#1a1a1a] hover:border-ozo-red dark:hover:border-ozo-red/50 hover:bg-red-50/10 dark:hover:bg-ozo-red/5 transition-all text-left flex items-center gap-4 group active:scale-95 shadow-sm"
                          >
                            <div className="w-14 h-14 bg-blue-50 dark:bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
                              <Users size={26} />
                            </div>
                            <div>
                              <h5 className="font-black text-sm text-gray-900 dark:text-white">For Someone Else</h5>
                              <p className="text-[10px] text-gray-500 font-bold mt-1 leading-normal">
                                Deliver to a friend, family, or other contact
                              </p>
                            </div>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6 animate-fadeIn">
                        {/* Recipient Details Header */}
                        <div className="p-4 bg-red-50/20 dark:bg-white/[0.02] border border-red-500/10 dark:border-white/5 rounded-2xl flex items-center justify-between gap-3 animate-fadeIn">
                          <div>
                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-wider">Recipient Mode</p>
                            <p className="text-xs font-bold text-gray-800 dark:text-gray-200 mt-0.5">
                              {recipientType === 'myself' 
                                ? `For Myself (${profile?.full_name || 'Your Name'} - ${profile?.phone_number || profile?.phone || 'No Phone'})` 
                                : 'For Someone Else'}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setRecipientType(null)}
                            className="text-[10px] font-black uppercase tracking-wider text-ozo-red hover:underline"
                          >
                            Change
                          </button>
                        </div>

                        {/* Reusable AddressForm */}
                        <AddressForm
                          formData={newAddress}
                          onChange={(updated) => setNewAddress(prev => ({ ...prev, ...updated }))}
                          showContactFields={recipientType === 'other'}
                          mapConfig={mapConfig}
                          showMapPicker={showMapPicker}
                          setShowMapPicker={setShowMapPicker}
                          OzoMapPicker={OzoMapPicker}
                          onMapLocationSelect={handleLocationSelect}
                        />

                        <div className="flex gap-4">
                           <button type="submit" className="btn btn-primary px-10">Save Address</button>
                           <button type="button" onClick={() => { setIsAddingAddress(false); setShowMapPicker(false); }} className="px-10 font-bold text-ozo-gray">Cancel</button>
                        </div>
                      </div>
                    )}
                  </form>
                </motion.div>
              )}
            </section>

            {/* Step 2: Payment Method */}
            <section className="bg-white dark:bg-[#1a1a1a] rounded-[2rem] p-6 shadow-sm border border-gray-100 dark:border-white/5">
              <div className="flex items-center gap-4 mb-6">
                 <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center">
                    <CreditCard size={24} />
                 </div>
                 <h2 className="text-xl font-black">{t?.('payment_method') || 'Payment Method'}</h2>
              </div>

              <div className="space-y-4">
                {availablePaymentMethods.length === 0 ? (
                  <div className="p-5 text-center text-sm font-bold text-red-500 bg-red-50 dark:bg-red-950/20 border border-red-150 dark:border-red-950/30 rounded-2xl">
                    No payment methods currently available. Please contact support.
                  </div>
                ) : (
                  availablePaymentMethods.map((method) => (
                  <div 
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    className={`relative p-4 md:p-5 rounded-[1.5rem] border-2 cursor-pointer transition-all ${
                      paymentMethod === method.id 
                      ? 'border-ozo-red bg-red-50/20 dark:bg-ozo-red/5 ring-4 ring-ozo-red/10 shadow-sm' 
                      : 'border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10 bg-white dark:bg-[#1a1a1a]'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Premium Radio Selector on Left */}
                      <div className={`mt-1.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                        paymentMethod === method.id ? 'border-ozo-red bg-ozo-red' : 'border-gray-300 dark:border-white/20'
                      }`}>
                         {paymentMethod === method.id && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </div>

                      {/* Content Area */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-black text-base text-gray-900 dark:text-white leading-tight">
                              {method.label}
                            </p>
                            <p className="text-xs text-ozo-gray dark:text-gray-400 font-medium mt-1">
                              {method.desc}
                            </p>
                          </div>

                          {/* Brand Logos */}
                          <div className="flex items-center gap-3 bg-gray-50/80 dark:bg-white/[0.02] px-3 py-1 rounded-xl border border-gray-100/50 dark:border-white/5 w-fit flex-shrink-0 h-9">
                            {method.id === 'cod' && (
                              <img src="https://img.icons8.com/color/48/cash-in-hand.png" alt="Cash" className="h-[24px] w-auto object-contain" />
                            )}
                            {method.id === 'upi' && (
                              <div className="flex items-center gap-3">
                                <img src="https://upload.wikimedia.org/wikipedia/commons/7/71/PhonePe_Logo.svg" alt="PhonePe" className="h-[13px] w-auto object-contain" />
                                <img src="https://img.icons8.com/color/48/google-pay.png" alt="Google Pay" className="h-[28px] w-auto object-contain" />
                                <img src="https://img.icons8.com/color/48/paytm.png" alt="Paytm" className="h-[22px] w-auto object-contain" />
                              </div>
                            )}
                            {method.id === 'card' && (
                              <div className="flex items-center gap-2.5">
                                <img src="https://img.icons8.com/color/48/visa.png" alt="Visa" className="h-[22px] w-auto object-contain" />
                                <img src="https://img.icons8.com/color/48/mastercard.png" alt="Mastercard" className="h-[24px] w-auto object-contain" />
                                <img src="https://upload.wikimedia.org/wikipedia/commons/d/d1/RuPay.svg" alt="RuPay" className="h-[12px] w-auto object-contain dark:brightness-200" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
                )}
              </div>
            </section>
          </div>

          {/* Order Summary Sidebar */}
          <div className="md:col-span-5 lg:col-span-4 space-y-6 sticky top-36">
            <section className="bg-white dark:bg-[#1a1a1a] rounded-[2rem] p-6 shadow-xl border border-gray-100 dark:border-white/5">
               <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-black">Order Summary</h3>
                  <button 
                    onClick={() => navigate('/cart')}
                    className="text-xs font-black text-ozo-red bg-ozo-red/10 dark:bg-ozo-red/20 px-3 py-1.5 rounded-full hover:bg-ozo-red hover:text-white hover:scale-[1.03] active:scale-95 transition-all flex items-center gap-1.5 shadow-sm hover:shadow-md border border-ozo-red/20"
                  >
                    <Pencil size={11} strokeWidth={2.5} />
                    <span>Edit Cart</span>
                  </button>
               </div>
               
               <div className="divide-y divide-gray-150/50 dark:divide-white/5 mb-6 max-h-[320px] overflow-y-auto scrollbar-hide">
                 {items.map((item) => {
                   const isItemOutOfStock = !item.isAvailable || item.quantityAvailable <= 0;
                   const isItemInsufficient = item.isAvailable && item.quantityAvailable > 0 && item.quantity > item.quantityAvailable;
                   return (
                     <div key={item.productId} className={`flex items-center gap-4 py-3 first:pt-0 last:pb-0 ${isItemOutOfStock ? 'opacity-50' : ''}`}>
                        <OptimizedImage
                          src={item.image}
                          slug={item.slug}
                          alt={item.name}
                          width={100}
                          className="w-full h-full object-contain"
                          containerClassName="w-12 h-12 bg-gray-50 dark:bg-white/5 rounded-xl p-1 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                           <p className="text-sm font-bold text-gray-900 dark:text-white truncate" title={item.name}>{item.name}</p>
                           <p className="text-[10px] text-ozo-gray font-black uppercase mt-0.5">Qty: {item.quantity} × ₹{item.price}</p>
                           {isItemOutOfStock ? (
                             <span className="text-[9px] bg-red-500/10 text-red-500 font-bold px-1.5 py-0.5 rounded border border-red-500/20 block w-fit mt-0.5">
                               {launchConfig?.launch_mode_enabled ? 'LISTING SOON' : 'OUT OF STOCK'}
                             </span>
                           ) : isItemInsufficient ? (
                             <span className="text-[9px] bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold px-1.5 py-0.5 rounded border border-amber-500/20 block w-fit mt-0.5">ONLY {item.quantityAvailable} LEFT</span>
                           ) : null}
                        </div>
                        <div className="text-right flex-shrink-0">
                           <p className="text-sm font-black text-gray-900 dark:text-white">₹{(item.price * item.quantity).toLocaleString()}</p>
                        </div>
                     </div>
                   );
                 })}
               </div>

               <div className="space-y-4 pt-6 border-t border-gray-50 dark:border-white/5">
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-ozo-gray dark:text-gray-400">Subtotal</span>
                    <span className="text-gray-900 dark:text-white font-bold">₹{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-ozo-gray dark:text-gray-400">Delivery Fee</span>
                    <span className="text-ozo-green font-bold">{deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}</span>
                  </div>

                  {/* Free Delivery Progress Banner */}
                  {(() => {
                    const freeAbove = parseFloat(deliveryConfig?.free_above) || 99
                    const needed = Math.round((freeAbove - subtotal) * 100) / 100
                    if (deliveryFee === 0 || needed <= 0 || subtotal === 0) return null
                    const pct = Math.min(100, Math.round((subtotal / freeAbove) * 100))
                    return (
                      <div className="p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200/60 dark:border-orange-900/30 rounded-xl">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-black text-orange-700 dark:text-orange-400 uppercase tracking-wide flex items-center gap-1">
                            🚚 Free Delivery
                          </span>
                          <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400">
                            Add <span className="font-black">₹{needed}</span> more
                          </span>
                        </div>
                        <div className="h-1.5 bg-orange-200/60 dark:bg-orange-900/40 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-orange-400 to-ozo-red rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-[9px] text-orange-600/80 dark:text-orange-500 mt-1 font-semibold">
                          ₹{subtotal} / ₹{freeAbove} — {pct}% to free delivery
                        </p>
                      </div>
                    )
                  })()}

                  {platformFee > 0 && (
                    <div className="flex justify-between text-sm font-medium">
                      <span className="text-ozo-gray dark:text-gray-400">Handling Fee</span>
                      <span className="text-gray-900 dark:text-white font-bold">₹{platformFee}</span>
                    </div>
                  )}
                  {distance > 0 && (
                    <div className="flex justify-between text-xs text-gray-455 dark:text-gray-500 mt-[-8px]">
                      <span>Distance: {distance.toFixed(1)} km</span>
                      {distanceCharge > 0 && <span>(incl. ₹{distanceCharge} distance charge)</span>}
                    </div>
                  )}
                  {discount > 0 && (
                    <div className="flex justify-between text-sm font-medium">
                      <span className="text-ozo-gray dark:text-gray-400">Discount</span>
                      <span className="text-ozo-red font-bold">-₹{discount.toLocaleString()}</span>
                    </div>
                  )}
                  
                  {/* Coupon Code Input */}
                  {appliedCoupon ? (
                    <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30 rounded-2xl p-3 flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-450" />
                        <div>
                          <p className="font-semibold text-green-700 dark:text-green-400 text-sm">
                            {appliedCoupon.coupon_code}
                          </p>
                          <p className="text-xs text-green-600 dark:text-green-450">
                            Saved ₹{discount}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleRemoveCoupon}
                        className="p-1 hover:bg-green-100 dark:hover:bg-white/10 rounded transition-colors"
                      >
                        <X className="w-4 h-4 text-green-600 dark:text-green-400" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2 mt-2">
                      <div className="relative flex-1">
                        <Ticket className="absolute left-4 top-1/2 -translate-y-1/2 text-ozo-gray" size={18} />
                        <input 
                          type="text" 
                          value={couponInput}
                          onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                          placeholder="Coupon Code"
                          className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-ozo-red/20 transition-all font-bold text-sm"
                        />
                      </div>
                      <button
                        onClick={handleApplyCoupon}
                        disabled={isApplyingCoupon}
                        className="px-6 bg-gray-900 hover:bg-gray-800 dark:bg-white/10 dark:hover:bg-white/20 text-white rounded-2xl font-bold text-sm transition-all disabled:opacity-50"
                      >
                        {isApplyingCoupon ? '...' : 'Apply'}
                      </button>
                    </div>
                  )}

                  {/* Charity Option Card */}
                  {platformConfig?.charity_enabled && charityDonationAmount > 0 && (
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl p-4 flex items-center justify-between transition-all hover:scale-[1.01] shadow-sm my-2">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl mt-0.5">
                          <Heart className="w-5 h-5 fill-current" />
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-emerald-800 dark:text-emerald-450 text-sm">
                            Charity Donation
                          </p>
                          <p className="text-[11px] text-emerald-600 dark:text-emerald-500/80 font-semibold mt-0.5">
                            Donate ₹{charityDonationAmount} to support {charityName}.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setIsCharitySelected(!isCharitySelected)}
                        className={`px-4 py-2 rounded-xl font-bold text-xs transition-all uppercase tracking-wider flex items-center gap-1.5 shadow-sm border ${
                          isCharitySelected
                            ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                            : 'bg-white dark:bg-white/5 text-emerald-600 border-emerald-200 dark:border-emerald-900/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                        }`}
                      >
                        {isCharitySelected ? 'Added ✓' : 'Add'}
                      </button>
                    </div>
                  )}

                  {/* Charity Line Item inside Breakdown */}
                  {isCharitySelected && (
                    <div className="flex justify-between text-sm font-medium">
                      <span className="text-ozo-gray dark:text-gray-400">Charity Donation</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">₹{charityDonationAmount}</span>
                    </div>
                  )}

                  <div className="h-px bg-gray-50 dark:bg-white/5 my-4" />
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-black text-gray-900 dark:text-white">Total</span>
                    <span className="text-3xl font-black text-ozo-red font-display">₹{displayTotal.toLocaleString()}</span>
                  </div>
                  {(savings + discount) > 0 && (
                    <p className="text-xs sm:text-sm text-ozo-green mt-1 font-semibold text-left">
                      You saved ₹{Math.round((savings + discount + Number.EPSILON) * 100) / 100} on this order!
                    </p>
                  )}
                </div>
                  {isClosed && (
                    <div className={`mt-6 p-4 rounded-2xl flex items-start gap-3 border ${
                      serviceHoursConfig.prevent_checkout 
                        ? 'bg-red-500/5 text-red-500 border-red-500/10 dark:text-red-400' 
                        : 'bg-amber-500/5 text-amber-600 border-amber-500/10 dark:text-amber-400'
                    }`}>
                      <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <div className="text-left text-xs font-semibold leading-relaxed">
                        <strong>{serviceHoursConfig?.prevent_checkout ? "Delivery Service Closed" : "Late-Night Delivery Notice"}</strong>
                        <p className="mt-1 text-[11px] opacity-90">
                          {serviceHoursConfig?.checkout_text || "Our delivery services are currently inactive. Orders placed now will be queued for tomorrow morning."}
                        </p>
                      </div>
                    </div>
                  )}

               <button 
                onClick={handlePlaceOrder}
                disabled={isPlacingOrder || (isClosed && serviceHoursConfig?.prevent_checkout)}
                className={`w-full mt-10 flex items-center justify-center gap-3 px-8 py-5 text-white rounded-[2rem] font-black text-lg transition-all ${
                  (isClosed && serviceHoursConfig?.prevent_checkout)
                    ? 'bg-gray-400 dark:bg-neutral-800 cursor-not-allowed shadow-none'
                    : isPlacingOrder 
                      ? 'bg-gradient-ozo opacity-70 cursor-not-allowed' 
                      : 'bg-gradient-ozo shadow-ozo-lg hover:scale-[1.02] active:scale-95'
                }`}
               >
                 {isPlacingOrder ? (
                   <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                 ) : (
                   <>
                    {isClosed && serviceHoursConfig?.prevent_checkout ? "Delivery Closed - Order Blocked" : "Place Order"}
                    <ChevronRight size={22} />
                   </>
                 )}
               </button>

               <div className="mt-8 flex items-center justify-center gap-2 text-ozo-green">
                  <ShieldCheck size={16} fill="currentColor" className="opacity-20" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Secure Checkout Guaranteed</span>
               </div>
            </section>
          </div>

        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AnimatePresence>
        {addressToDelete && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAddressToDelete(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-[#1a1a1a] rounded-[2.5rem] p-8 shadow-2xl border border-gray-100 dark:border-white/5 w-full max-w-md relative z-10 text-center text-gray-800 dark:text-white"
            >
              <div className="w-16 h-16 bg-red-50 dark:bg-ozo-red/10 text-ozo-red rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <Trash2 size={28} />
              </div>
              
              <h3 className="text-xl font-black mb-2">Delete Address?</h3>
              <p className="text-sm text-ozo-gray dark:text-gray-400 font-medium mb-8">
                Are you sure you want to delete this address? This action cannot be undone.
              </p>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setAddressToDelete(null)}
                  className="flex-1 py-4 bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-gray-300 font-black rounded-2xl hover:bg-gray-100 dark:hover:bg-white/10 transition-all text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await deleteUserAddress(addressToDelete)
                    if (selectedAddress === addressToDelete) {
                      setSelectedAddress(null)
                    }
                    setAddressToDelete(null)
                  }}
                  className="flex-1 py-4 bg-gradient-ozo text-white font-black rounded-2xl shadow-ozo hover:scale-[1.02] active:scale-[0.98] transition-all text-xs"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delivery Service Hours Notice Modal */}
      <AnimatePresence>
        {showServiceHoursModal && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!serviceHoursConfig?.prevent_checkout) {
                  setShowServiceHoursModal(false)
                }
              }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-[#1a1a1a] rounded-[2.5rem] p-8 shadow-2xl border border-gray-100 dark:border-white/5 w-full max-w-md relative z-10 text-center text-gray-800 dark:text-white"
            >
              <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/20 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner animate-pulse">
                <AlertTriangle size={28} />
              </div>
              
              <h3 className="text-xl font-black mb-2">
                {serviceHoursConfig?.prevent_checkout ? "Delivery Service Closed" : "Late-Night Delivery Notice"}
              </h3>
              <p className="text-sm text-ozo-gray dark:text-gray-400 font-medium mb-8 leading-relaxed">
                {serviceHoursConfig?.checkout_text || "Please note that OZO Mart does not deliver overnight yet. Orders placed after 9:00 PM are queued for next-morning delivery. We are currently scaling our operations to transition into a 24-hour system shortly. Thank you for supporting a local startup!"}
              </p>

              <div className="flex gap-4">
                {serviceHoursConfig?.prevent_checkout ? (
                  <button
                    type="button"
                    onClick={() => {
                      setShowServiceHoursModal(false)
                      navigate('/cart')
                    }}
                    className="flex-1 py-4 bg-gradient-ozo text-white font-black rounded-2xl shadow-ozo hover:scale-[1.02] active:scale-[0.98] transition-all text-xs"
                  >
                    Go Back to Cart
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowServiceHoursModal(false)}
                      className="flex-1 py-4 bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-gray-300 font-black rounded-2xl hover:bg-gray-100 dark:hover:bg-white/10 transition-all text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setHasAcknowledgedServiceHours(true)
                        setShowServiceHoursModal(false)
                        handlePlaceOrder(true)
                      }}
                      className="flex-1 py-4 bg-gradient-ozo text-white font-black rounded-2xl shadow-ozo hover:scale-[1.02] active:scale-[0.98] transition-all text-xs"
                    >
                      I Understand, Place Order
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <RazorpayShield
        isOpen={isShieldOpen}
        onClose={() => setIsShieldOpen(false)}
        amount={displayTotal}
        orderNumber={tempOrderNumber}
        addressId={selectedAddress}
        couponCode={storeCouponCode}
        userData={{
          fullName: profile?.full_name,
          email: profile?.email,
          phone: profile?.phone_number || profile?.phone
        }}
        onPaymentSuccess={(transactionId, extraInstructions, serverCalculatedTotals) => {
          executePlaceOrder(transactionId, extraInstructions, serverCalculatedTotals)
        }}
        pendingOrderId={pendingOrderId}
        charityDonation={activeCharityDonation}
      />

      <CashfreeShield
        isOpen={isCfShieldOpen}
        onClose={() => setIsCfShieldOpen(false)}
        amount={displayTotal}
        orderNumber={tempOrderNumber}
        addressId={selectedAddress}
        couponCode={storeCouponCode}
        userData={{
          fullName: profile?.full_name,
          email: profile?.email,
          phone: profile?.phone_number || profile?.phone
        }}
        onPaymentSuccess={(transactionId, extraInstructions, serverCalculatedTotals) => {
          executePlaceOrder(transactionId, extraInstructions, serverCalculatedTotals)
        }}
        pendingOrderId={pendingOrderId}
        charityDonation={activeCharityDonation}
      />
    </div>
  )
}

export default Checkout
