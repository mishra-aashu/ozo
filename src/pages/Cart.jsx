import { useState, useEffect, useCallback } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  Tag,
  Clock,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  X,
  Percent,
  Truck,
  ShoppingBag,
  Heart,
  PlusCircle,
} from 'lucide-react'
import { useCartStore } from '../stores/cartStore'
import { useLocationStore } from '../stores/locationStore'
import { useWishlistStore } from '../stores/wishlistStore'

import { useProductStore } from '../stores/productStore'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'
import SuggestedProducts from '../components/SuggestedProducts'
import toast from 'react-hot-toast'
import { useTranslation } from '../hooks/useTranslation'
import OzoLoadingGuard from '../components/OzoLoadingGuard'
import OptimizedImage from '../components/OptimizedImage'

const roundTo2Decimals = (num) => Math.round((num + Number.EPSILON) * 100) / 100

const Cart = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState(null)
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false)
  const [itemToRemove, setItemToRemove] = useState(null)
  const [showClearCartModal, setShowClearCartModal] = useState(false)
  const [showServiceHoursModal, setShowServiceHoursModal] = useState(false)

  const {
    items,
    isLoading,
    totalItems,
    subtotal,
    deliveryFee,
    distance,
    distanceCharge,
    discount,
    total,
    updateQuantity,
    removeFromCart,
    clearCart,
    applyDiscount,
    removeDiscount,
    deliveryConfig,
    orderConfig,
    serviceHoursConfig,
    couponCode: storeCouponCode,
    fetchCart,
  } = useCartStore(useShallow(state => ({
    items: state.items,
    isLoading: state.isLoading,
    totalItems: state.totalItems,
    subtotal: state.subtotal,
    deliveryFee: state.deliveryFee,
    distance: state.distance,
    distanceCharge: state.distanceCharge,
    discount: state.discount,
    total: state.total,
    updateQuantity: state.updateQuantity,
    removeFromCart: state.removeFromCart,
    clearCart: state.clearCart,
    applyDiscount: state.applyDiscount,
    removeDiscount: state.removeDiscount,
    deliveryConfig: state.deliveryConfig,
    orderConfig: state.orderConfig,
    serviceHoursConfig: state.serviceHoursConfig,
    couponCode: state.couponCode,
    fetchCart: state.fetchCart,
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

  const freeAboveLimit = deliveryConfig?.free_above ?? 99
  const minOrderValueLimit = orderConfig?.min_order_value ?? 0
  const hasOutOfStockItems = items.some(item => !item.isAvailable || item.quantityAvailable <= 0)
  const hasInsufficientStockItems = items.some(item => item.isAvailable && item.quantityAvailable > 0 && item.quantity > item.quantityAvailable)

  const coordinates = useLocationStore(state => state.coordinates)

  useEffect(() => {
    fetchCart()
  }, [fetchCart])

  useEffect(() => {
    if (coordinates) {
      useCartStore.getState().calculateTotals({
        lat: coordinates.lat,
        lng: coordinates.lng
      })
    } else {
      useCartStore.getState().calculateTotals()
    }
  }, [coordinates])

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
            setCouponCode(data.coupon_code)
          }
        } catch (e) {
          console.error(e)
        }
      }
    }
    fetchAppliedCoupon()
  }, [storeCouponCode])

  const toggleWishlist = useWishlistStore(state => state.toggleWishlist)
  const wishlistItems = useWishlistStore(state => state.items)

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error('Please enter a coupon code')
      return
    }

    setIsApplyingCoupon(true)

    try {
      // Fetch coupon from database
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .eq('coupon_code', couponCode.toUpperCase())
        .eq('is_active', true)
        .single()

      if (error || !data) {
        toast.error('Invalid coupon code')
        setIsApplyingCoupon(false)
        return
      }

      // Check if coupon is valid
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

      // Check minimum order value
      if (data.min_order_value && subtotal < data.min_order_value) {
        toast.error(`Minimum order value of ₹${data.min_order_value} required`)
        setIsApplyingCoupon(false)
        return
      }

      // Calculate discount
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
    setCouponCode('')
    toast.success('Coupon removed')
  }

  const handleClearCart = () => {
    setShowClearCartModal(true)
  }

  const handleProceedToCheckout = () => {
    if (isClosed && serviceHoursConfig?.prevent_checkout) {
      setShowServiceHoursModal(true)
      return
    }
    if (items.length === 0) {
      toast.error('Your cart is empty')
      return
    }
    if (hasOutOfStockItems) {
      toast.error('Please remove out of stock items to proceed')
      return
    }
    if (hasInsufficientStockItems) {
      toast.error('Please adjust quantities of items with insufficient stock')
      return
    }
    if (subtotal < minOrderValueLimit) {
      navigate('/')
      return
    }
    if (!isAuthenticated) {
      toast.error('Please login to proceed to checkout')
      navigate('/auth', { state: { from: { pathname: '/checkout' } } })
      return
    }
    navigate('/checkout')
  }

  const handleCheckout = () => {
    if (isClosed && serviceHoursConfig?.prevent_checkout) {
      setShowServiceHoursModal(true)
      return
    }
    if (items.length === 0) {
      toast.error('Your cart is empty')
      return
    }
    if (hasOutOfStockItems) {
      toast.error('Please remove out of stock items to proceed')
      return
    }
    if (hasInsufficientStockItems) {
      toast.error('Please adjust quantities of items with insufficient stock')
      return
    }
    if (subtotal < minOrderValueLimit) {
      navigate('/')
      return
    }
    if (!isAuthenticated) {
      toast.error('Please login to proceed to checkout')
      navigate('/auth', { state: { from: { pathname: '/checkout' } } })
      return
    }
    navigate('/checkout')
  }

  const savings = roundTo2Decimals(items.reduce((total, item) => {
    const itemSavings = roundTo2Decimals((item.mrp || 0) - (item.price || 0))
    return total + (itemSavings * item.quantity)
  }, 0))

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
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

  const emptyState = (
    <div className="min-h-screen bg-ozo-gray-bg dark:bg-[#0a0a0a] py-8 transition-colors duration-300">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="empty-state bg-white dark:bg-[#1a1a1a] border border-transparent dark:border-white/5 rounded-2xl p-12 transition-colors duration-300"
        >
          <ShoppingCart className="empty-state-icon text-ozo-gray dark:text-gray-400" />
          <h2 className="empty-state-title text-gray-900 dark:text-white">Your cart is empty</h2>
          <p className="empty-state-text text-ozo-gray dark:text-gray-400">
            Looks like you haven't added anything to your cart yet
          </p>
          <Link to="/" className="btn btn-primary inline-flex items-center justify-center">
            Start Shopping <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>

        {/* Suggested Products */}
        <SuggestedProducts
          limit={6}
          title="You Might Also Like"
          gridColsClass="grid-cols-2 md:grid-cols-3 lg:grid-cols-6"
          className="mt-12"
        />
      </div>
    </div>
  )

  const skeleton = (
    <div className="min-h-screen bg-ozo-gray-bg dark:bg-[#0a0a0a] pt-6 pb-32 md:py-12 animate-pulse">
      <div className="container-custom">
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-gray-200 dark:bg-white/5 rounded-lg animate-pulse" />
            <div className="h-4 w-20 bg-gray-200 dark:bg-white/5 rounded-lg animate-pulse" />
          </div>
          <div className="h-6 w-24 bg-gray-200 dark:bg-white/5 rounded-lg animate-pulse" />
        </div>
        <div className="grid lg:grid-cols-3 gap-4 md:gap-8">
          <div className="lg:col-span-2 space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-4 h-32" />
            ))}
          </div>
          <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-6 h-64" />
        </div>
      </div>
    </div>
  )

  return (
    <OzoLoadingGuard
      isLoading={isLoading}
      isEmpty={items.length === 0}
      skeleton={skeleton}
      fallback={emptyState}
    >
      <div className="min-h-screen bg-ozo-gray-bg dark:bg-[#0a0a0a] pt-6 pb-32 md:py-12 transition-colors duration-300 w-full overflow-x-hidden">
      <div className="container-custom">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tight">{renderTitle(t?.('myCart') || 'My Cart')}</h1>
            <p className="text-ozo-gray dark:text-gray-400">{totalItems} items</p>
          </div>
          <button
            onClick={handleClearCart}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-red-200/50 dark:border-red-950/40 text-ozo-red bg-red-50/20 hover:bg-red-50/50 dark:hover:bg-red-950/20 text-xs font-bold transition-all hover:scale-105 active:scale-95 shadow-sm"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Cart
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-4 md:gap-8">
          {/* Cart Items */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="lg:col-span-2 space-y-4"
          >
            {/* Delivery Time Banner */}
            {isClosed ? (
              <div className="bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/10 rounded-2xl p-4 shadow-sm transition-colors duration-300">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 animate-pulse" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider">Delivery Notice</p>
                    <p className="text-sm font-bold text-amber-900 dark:text-amber-300">Next-Morning Delivery (6:00 AM onwards)</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-[#1a1a1a] border border-transparent dark:border-white/5 rounded-2xl p-4 shadow-sm transition-colors duration-300">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-ozo-red/10 dark:bg-ozo-red/20 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 text-ozo-red animate-pulse" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-ozo-gray uppercase tracking-wider">Delivery Time</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">Delivery in 30 minutes</p>
                  </div>
                </div>
              </div>
            )}

            <AnimatePresence>
              {items.map((item) => (
                <motion.div
                  layout
                  key={item.id}
                  variants={itemVariants}
                  exit={{ opacity: 0, x: -50 }}
                  className={`border rounded-2xl p-4 shadow-card dark:shadow-none transition-all duration-300 overflow-hidden ${
                    (!item.isAvailable || item.quantityAvailable <= 0)
                      ? 'border-red-300 dark:border-red-900/50 bg-red-50/40 dark:bg-red-950/10 shadow-[0_0_12px_rgba(239,68,68,0.06)]'
                      : item.quantity > item.quantityAvailable
                        ? 'border-amber-300 dark:border-amber-900/50 bg-amber-50/20 dark:bg-amber-950/10'
                        : 'bg-white dark:bg-[#1a1a1a] border-transparent dark:border-white/5'
                  }`}
                >
                  {/* Top Row: Image + Name/Unit */}
                  <div className="flex gap-3 w-full items-start">
                    <Link to={`/product/${item.slug}`} className="flex-shrink-0">
                      <OptimizedImage
                        src={item.image}
                        slug={item.slug}
                        alt={item.name}
                        width={200}
                        className="w-full h-full object-cover"
                        containerClassName="w-20 h-20 rounded-xl"
                        fallbackSrc="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=200"
                      />
                    </Link>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <Link to={`/product/${item.slug}`}>
                        <h3 className="font-semibold text-sm text-gray-900 dark:text-white hover:text-ozo-red transition-colors line-clamp-2 leading-snug">
                          {item.name}
                        </h3>
                      </Link>
                      <p className="text-xs text-ozo-gray dark:text-gray-400 mt-0.5">{item.unit}</p>
                    </div>
                    {/* Delete button relocated to top right of the card */}
                    <button
                      onClick={() => setItemToRemove(item)}
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-ozo-red transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Bottom Row: Price + Actions + Qty */}
                  <div className="flex items-end justify-between gap-2 mt-3">
                    {/* Price block */}
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span className="text-base font-bold text-gray-900 dark:text-white">
                        ₹{roundTo2Decimals(item.price * item.quantity).toLocaleString()}
                      </span>
                      {item.mrp > item.price && (
                        <span className="text-xs text-ozo-gray dark:text-gray-400 line-through font-medium">
                          ₹{roundTo2Decimals(item.mrp * item.quantity).toLocaleString()}
                        </span>
                      )}
                      {item.mrp > item.price && (
                        <span className="text-xs text-ozo-green font-bold">
                          {item.discountPercentage}% OFF
                        </span>
                      )}
                    </div>

                    {/* Actions + Qty */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => toggleWishlist({
                          id: item.productId,
                          name: item.name,
                          slug: item.slug,
                          price: item.price,
                          mrp: item.mrp,
                          discount_percentage: item.discountPercentage,
                          image_url: item.image,
                          unit: item.unit,
                          is_available: item.isAvailable,
                          quantity_available: item.quantityAvailable,
                          brand: item.brand,
                        })}
                        className="p-1.5 rounded-lg hover:bg-ozo-gray-bg dark:hover:bg-white/5 transition-colors"
                      >
                        <Heart 
                          className={`w-4 h-4 transition-colors ${
                            wishlistItems.some(w => w.productId === item.productId) 
                              ? 'fill-ozo-red text-ozo-red' 
                              : 'text-ozo-gray dark:text-gray-400'
                          }`} 
                        />
                      </button>

                      {/* Qty Selector */}
                      <div className="flex items-center gap-1 bg-ozo-green text-white rounded-lg px-2 py-1.5 ml-1">
                        <button
                          onClick={() => {
                            if (item.quantity === 1) {
                               setItemToRemove(item)
                            } else {
                              updateQuantity(item.id, item.quantity - 1)
                            }
                          }}
                          className="hover:bg-white/20 rounded transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-bold min-w-[20px] text-center text-sm">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={item.quantity >= item.maxOrderQty || item.quantity >= item.quantityAvailable}
                          className="hover:bg-white/20 rounded transition-colors disabled:opacity-50"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Stock Warning & Availability Status */}
                  {(!item.isAvailable || item.quantityAvailable <= 0) ? (
                    <div className="mt-3 bg-red-500/10 dark:bg-red-500/20 text-red-650 dark:text-red-400 px-3 py-1.5 rounded-xl border border-red-500/20 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 w-fit">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
                      <span>Out of Stock / Unavailable</span>
                    </div>
                  ) : item.quantity > item.quantityAvailable ? (
                    <div className="mt-3 bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 px-3 py-1.5 rounded-xl border border-amber-500/20 text-xs font-black flex items-center gap-1.5 w-fit">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-500" />
                      <span>Only {item.quantityAvailable} units available (Requested: {item.quantity})</span>
                    </div>
                  ) : item.quantityAvailable < 10 ? (
                    <p className="text-xs text-ozo-red mt-2 flex items-center gap-1 font-bold">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Only {item.quantityAvailable} left in stock
                    </p>
                  ) : null}
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

          {/* Order Summary */}
          <div className="lg:sticky lg:top-24 h-fit space-y-4">
            {/* Coupon Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-[#1a1a1a] border border-transparent dark:border-white/5 rounded-2xl p-4 sm:p-6 shadow-card dark:shadow-none transition-colors duration-300"
            >
              <h3 className="font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
                <Tag className="w-5 h-5 text-ozo-red" />
                Apply Coupon
              </h3>

              {appliedCoupon ? (
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30 rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-450" />
                      <div>
                        <p className="font-semibold text-green-700 dark:text-green-400">
                          {appliedCoupon.coupon_code}
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-450">
                          You saved ₹{discount}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleRemoveCoupon}
                      className="p-1 hover:bg-green-100 rounded"
                    >
                      <X className="w-4 h-4 text-green-600" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="Enter coupon code"
                    className="input flex-1 min-w-0"
                  />
                  <button
                    onClick={handleApplyCoupon}
                    disabled={isApplyingCoupon}
                    className="btn btn-outline flex-shrink-0 whitespace-nowrap"
                  >
                    {isApplyingCoupon ? '...' : 'Apply'}
                  </button>
                </div>
              )}
            </motion.div>

            {/* Bill Details */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white dark:bg-[#1a1a1a] border border-transparent dark:border-white/5 rounded-2xl p-4 sm:p-6 shadow-card dark:shadow-none transition-colors duration-300"
            >
              <h3 className="font-semibold mb-4 text-gray-900 dark:text-white">Bill Details</h3>

              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-ozo-gray dark:text-gray-400">Item Total</span>
                  <span className="font-medium text-gray-900 dark:text-white">₹{subtotal}</span>
                </div>

                {savings > 0 && (
                  <div className="flex justify-between text-ozo-green">
                    <span>Item Discount</span>
                    <span>-₹{savings}</span>
                  </div>
                )}
                {discount > 0 && (
                  <div className="flex justify-between text-ozo-green">
                    <span className="flex items-center gap-1">
                      <Percent className="w-4 h-4" />
                      Coupon Discount
                    </span>
                    <span>-₹{discount}</span>
                  </div>
                )}
                <div className="flex justify-between text-[10px] text-ozo-gray dark:text-gray-400 font-medium italic pt-1">
                  <span className="flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5" />
                    Delivery & platform charges
                  </span>
                  <span>Calculated at checkout</span>
                </div>

                {/* Free Delivery Progress Banner */}
                {(() => {
                  const freeAbove = parseFloat(deliveryConfig?.free_above) || 99
                  const needed = roundTo2Decimals(freeAbove - subtotal)
                  if (needed <= 0 || subtotal === 0) return null
                  const pct = Math.min(100, Math.round((subtotal / freeAbove) * 100))
                  return (
                    <div className="mt-2 p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200/60 dark:border-orange-900/30 rounded-xl">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-black text-orange-700 dark:text-orange-400 uppercase tracking-wide flex items-center gap-1">
                          <Truck className="w-3 h-3" />
                          Free Delivery
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

                <div className="pt-3 border-t border-gray-150/50 dark:border-white/5">
                  <div className="flex justify-between">
                    <span className="text-lg font-bold text-gray-900 dark:text-white">Total</span>
                    <span className="text-lg font-bold text-gray-900 dark:text-white">₹{roundTo2Decimals(subtotal - discount)}</span>
                  </div>
                  {(savings + discount) > 0 && (
                    <p className="text-sm text-ozo-green mt-1 font-medium">
                      You saved ₹{roundTo2Decimals(savings + discount)} on this order!
                    </p>
                  )}
                </div>
              </div>



              {subtotal < minOrderValueLimit && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl flex items-start gap-2 text-xs text-red-650 dark:text-red-400">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>
                    Minimum order amount is <strong>₹{minOrderValueLimit}</strong>. Please add <strong>₹{roundTo2Decimals(minOrderValueLimit - subtotal)}</strong> worth of items to checkout.
                  </span>
                </div>
              )}

              {(hasOutOfStockItems || hasInsufficientStockItems) && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl flex items-start gap-2 text-xs text-red-650 dark:text-red-400">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500" />
                  <span>
                    Some items in your cart are out of stock or have insufficient quantity. Please adjust your cart to proceed.
                  </span>
                </div>
              )}

              {/* Checkout Button */}
              <div className="w-full mt-6">
                <button
                  onClick={handleCheckout}
                  className={`w-full py-4 px-6 rounded-[1.5rem] font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 border shadow-sm ${
                    subtotal < minOrderValueLimit
                      ? 'bg-transparent text-ozo-red border-ozo-red hover:bg-ozo-red/5 hover:scale-[1.01] active:scale-[0.99] cursor-pointer'
                      : (hasOutOfStockItems || hasInsufficientStockItems)
                        ? 'bg-transparent text-red-500 border-red-500 hover:bg-red-500/5 hover:scale-[1.01] active:scale-[0.99] cursor-pointer'
                        : 'bg-gradient-to-r from-ozo-red to-orange-500 hover:from-ozo-red hover:to-orange-600 text-white border-transparent shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99]'
                  }`}
                >
                  {subtotal < minOrderValueLimit ? (
                    <>
                      <PlusCircle className="w-4.5 h-4.5 flex-shrink-0" />
                      Add ₹{roundTo2Decimals(minOrderValueLimit - subtotal)} more (Go to Shop)
                    </>
                  ) : (hasOutOfStockItems || hasInsufficientStockItems) ? (
                    <>
                      <AlertCircle className="w-4.5 h-4.5 flex-shrink-0 text-red-500" />
                      Fix Stock Issues to Proceed
                    </>
                  ) : (
                    <>
                      Proceed to Checkout
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
                {subtotal < minOrderValueLimit && (
                  <p className="text-center text-[10px] text-red-500 dark:text-red-450 font-black mt-2 uppercase tracking-widest animate-pulse">
                    * Min. Order Amount: ₹{minOrderValueLimit}
                  </p>
                )}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Suggested Products (More Products) */}
        <SuggestedProducts
          limit={6}
          title="More Products"
          gridColsClass="grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6"
          className="mt-16 border-t border-gray-150/50 dark:border-white/5 pt-12"
        />
      </div>

      <AnimatePresence>
        {itemToRemove && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setItemToRemove(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative w-full max-w-sm bg-white dark:bg-[#1a1a1a] rounded-[2rem] p-6 shadow-2xl border border-gray-100 dark:border-white/5 overflow-hidden z-10"
            >
              <div className="flex flex-col items-center text-center">
                {/* Trash Icon Wrapper */}
                <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center mb-4 text-ozo-red shadow-inner">
                  <Trash2 className="w-7 h-7" />
                </div>

                <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2">
                  Remove Item?
                </h3>
                <p className="text-xs text-ozo-gray dark:text-gray-400 mb-5 max-w-[280px]">
                  Are you sure you want to remove <span className="font-bold text-gray-900 dark:text-white">"{itemToRemove.name}"</span> from your cart?
                </p>

                {/* Mini Item Preview Card */}
                <div className="flex items-center gap-3 w-full bg-gray-50 dark:bg-white/5 p-3 rounded-2xl mb-6 border border-gray-100 dark:border-white/5">
                  <OptimizedImage 
                    src={itemToRemove.image} 
                    slug={itemToRemove.slug}
                    alt={itemToRemove.name}
                    width={100}
                    className="w-full h-full object-cover"
                    containerClassName="w-12 h-12 rounded-xl"
                  />
                  <div className="text-left flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{itemToRemove.name}</p>
                    <p className="text-[10px] text-ozo-gray dark:text-gray-400">{itemToRemove.unit}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-gray-900 dark:text-white">₹{itemToRemove.price * itemToRemove.quantity}</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3 w-full">
                  <button
                    onClick={() => setItemToRemove(null)}
                    className="py-3 px-4 rounded-xl border border-gray-300 dark:border-white/10 text-xs font-bold hover:bg-gray-50 dark:hover:bg-white/5 active:scale-95 transition-all text-gray-700 dark:text-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      removeFromCart(itemToRemove.id)
                      setItemToRemove(null)
                      toast.success(`${itemToRemove.name} removed`)
                    }}
                    className="py-3 px-4 rounded-xl bg-ozo-red hover:bg-ozo-red/90 text-white text-xs font-bold active:scale-95 transition-all shadow-sm hover:shadow-md"
                  >
                    Yes, Remove
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {showClearCartModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowClearCartModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative w-full max-w-sm bg-white dark:bg-[#1a1a1a] rounded-[2rem] p-6 shadow-2xl border border-gray-100 dark:border-white/5 overflow-hidden z-10"
            >
              <div className="flex flex-col items-center text-center">
                {/* Trash Icon Wrapper */}
                <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center mb-4 text-ozo-red shadow-inner">
                  <Trash2 className="w-7 h-7" />
                </div>

                <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2">
                  Clear Cart?
                </h3>
                <p className="text-xs text-ozo-gray dark:text-gray-400 mb-6 max-w-[280px]">
                  Are you sure you want to remove all <span className="font-bold text-gray-900 dark:text-white">{totalItems} items</span> from your cart? This action cannot be undone.
                </p>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3 w-full">
                  <button
                    onClick={() => setShowClearCartModal(false)}
                    className="py-3 px-4 rounded-xl border border-gray-300 dark:border-white/10 text-xs font-bold hover:bg-gray-50 dark:hover:bg-white/5 active:scale-95 transition-all text-gray-700 dark:text-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      clearCart()
                      setShowClearCartModal(false)
                      toast.success('Cart cleared')
                    }}
                    className="py-3 px-4 rounded-xl bg-ozo-red hover:bg-ozo-red/90 text-white text-xs font-bold active:scale-95 transition-all shadow-sm hover:shadow-md"
                  >
                    Yes, Clear All
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {showServiceHoursModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowServiceHoursModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative w-full max-w-sm bg-white dark:bg-[#1a1a1a] rounded-[2rem] p-8 shadow-2xl border border-gray-100 dark:border-white/5 overflow-hidden z-10 text-center"
            >
              <div className="flex flex-col items-center">
                {/* Warning Icon Wrapper */}
                <div className="w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-950/20 text-amber-500 flex items-center justify-center mb-6 shadow-inner animate-pulse">
                  <AlertTriangle className="w-8 h-8" />
                </div>

                <h3 className="text-xl font-black text-gray-900 dark:text-white mb-3">
                  Delivery Service Closed
                </h3>
                <p className="text-sm text-ozo-gray dark:text-gray-400 mb-8 leading-relaxed">
                  {serviceHoursConfig?.checkout_text || "Please note that OZO Mart does not deliver overnight yet. Orders placed after 9:00 PM are queued for next-morning delivery. We are currently scaling our operations to transition into a 24-hour system shortly. Thank you for supporting a local startup!"}
                </p>

                {/* Action Button */}
                <button
                  onClick={() => setShowServiceHoursModal(false)}
                  className="w-full py-4 bg-gradient-ozo hover:opacity-90 text-white font-black rounded-2xl active:scale-[0.98] transition-all text-sm shadow-ozo"
                >
                  Got It
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>
    </OzoLoadingGuard>
  )
}

export default Cart