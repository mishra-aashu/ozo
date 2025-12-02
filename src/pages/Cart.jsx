import { useState, useEffect } from 'react'
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
  X,
  Percent,
  Truck,
  ShoppingBag,
  Heart,
} from 'lucide-react'
import { useCartStore } from '../stores/cartStore'
import { useWishlistStore } from '../stores/wishlistStore'
import { useProductStore } from '../stores/productStore'
import { supabase } from '../lib/supabase'
import ProductCard from '../components/ProductCard'
import toast from 'react-hot-toast'

const Cart = () => {
  const navigate = useNavigate()
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState(null)
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false)
  const [suggestedProducts, setSuggestedProducts] = useState([])

  const {
    items,
    totalItems,
    subtotal,
    deliveryFee,
    discount,
    total,
    updateQuantity,
    removeFromCart,
    clearCart,
    applyDiscount,
    removeDiscount,
  } = useCartStore()

  const { toggleWishlist } = useWishlistStore()
  const { fetchProducts } = useProductStore()

  useEffect(() => {
    // Fetch suggested products
    fetchSuggestedProducts()
  }, [])

  const fetchSuggestedProducts = async () => {
    const { data } = await fetchProducts({ limit: 6, featured: true })
    if (data) {
      setSuggestedProducts(data)
    }
  }

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

      applyDiscount(discountAmount)
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
    if (window.confirm('Are you sure you want to clear your cart?')) {
      clearCart()
      toast.success('Cart cleared')
    }
  }

  const handleCheckout = () => {
    if (items.length === 0) {
      toast.error('Your cart is empty')
      return
    }
    navigate('/checkout')
  }

  const savings = items.reduce((total, item) => {
    return total + ((item.mrp - item.price) * item.quantity)
  }, 0)

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

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-ozo-gray-bg py-8">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="empty-state bg-white rounded-2xl p-12"
          >
            <ShoppingCart className="empty-state-icon text-ozo-gray" />
            <h2 className="empty-state-title">Your cart is empty</h2>
            <p className="empty-state-text">
              Looks like you haven't added anything to your cart yet
            </p>
            <Link to="/" className="btn btn-primary">
              Start Shopping <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </motion.div>

          {/* Suggested Products */}
          {suggestedProducts.length > 0 && (
            <div className="mt-12">
              <h3 className="text-xl font-bold mb-6">You might also like</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {suggestedProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ozo-gray-bg py-8">
      <div className="container-custom">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">My Cart</h1>
            <p className="text-ozo-gray">{totalItems} items</p>
          </div>
          <button
            onClick={handleClearCart}
            className="text-ozo-red hover:underline flex items-center gap-1"
          >
            <Trash2 className="w-4 h-4" />
            Clear Cart
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="lg:col-span-2 space-y-4"
          >
            <AnimatePresence>
              {items.map((item) => (
                <motion.div
                  key={item.id}
                  variants={itemVariants}
                  exit={{ opacity: 0, x: -50 }}
                  className="bg-white rounded-2xl p-4 shadow-card"
                >
                  <div className="flex gap-4">
                    {/* Product Image */}
                    <Link to={`/product/${item.slug}`}>
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-24 h-24 object-cover rounded-xl"
                      />
                    </Link>

                    {/* Product Details */}
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <div>
                          <Link to={`/product/${item.slug}`}>
                            <h3 className="font-semibold hover:text-ozo-red transition-colors">
                              {item.name}
                            </h3>
                          </Link>
                          <p className="text-sm text-ozo-gray">{item.unit}</p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-start gap-2">
                          <button
                            onClick={() => toggleWishlist(item)}
                            className="p-2 rounded-lg hover:bg-ozo-gray-bg transition-colors"
                          >
                            <Heart className="w-5 h-5 text-ozo-gray" />
                          </button>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="p-2 rounded-lg hover:bg-red-50 text-ozo-red transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      {/* Price and Quantity */}
                      <div className="flex items-center justify-between mt-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-bold">₹{item.price * item.quantity}</span>
                            {item.mrp > item.price && (
                              <>
                                <span className="text-sm text-ozo-gray line-through">
                                  ₹{item.mrp * item.quantity}
                                </span>
                                <span className="text-sm text-ozo-green font-semibold">
                                  {item.discountPercentage}% OFF
                                </span>
                              </>
                            )}
                          </div>
                          <p className="text-xs text-ozo-gray">₹{item.price} per item</p>
                        </div>

                        {/* Quantity Selector */}
                        <div className="flex items-center gap-2 bg-ozo-green text-white rounded-lg px-2 py-1">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="p-1 hover:bg-white/20 rounded transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="font-semibold min-w-[30px] text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            disabled={item.quantity >= item.maxOrderQty}
                            className="p-1 hover:bg-white/20 rounded transition-colors disabled:opacity-50"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Stock Warning */}
                      {item.quantityAvailable < 10 && (
                        <p className="text-xs text-ozo-red mt-2 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Only {item.quantityAvailable} left in stock
                        </p>
                      )}
                    </div>
                  </div>
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
              className="bg-white rounded-2xl p-6 shadow-card"
            >
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Tag className="w-5 h-5 text-ozo-red" />
                Apply Coupon
              </h3>

              {appliedCoupon ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="font-semibold text-green-700">
                          {appliedCoupon.coupon_code}
                        </p>
                        <p className="text-xs text-green-600">
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
                    className="input flex-1"
                  />
                  <button
                    onClick={handleApplyCoupon}
                    disabled={isApplyingCoupon}
                    className="btn btn-outline"
                  >
                    {isApplyingCoupon ? 'Applying...' : 'Apply'}
                  </button>
                </div>
              )}
            </motion.div>

            {/* Bill Details */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl p-6 shadow-card"
            >
              <h3 className="font-semibold mb-4">Bill Details</h3>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-ozo-gray">Item Total</span>
                  <span className="font-medium">₹{subtotal}</span>
                </div>

                {savings > 0 && (
                  <div className="flex justify-between text-ozo-green">
                    <span>Item Discount</span>
                    <span>-₹{savings}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-ozo-gray flex items-center gap-1">
                    <Truck className="w-4 h-4" />
                    Delivery Fee
                  </span>
                  <span className={deliveryFee === 0 ? 'text-ozo-green' : 'font-medium'}>
                    {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
                  </span>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between text-ozo-green">
                    <span className="flex items-center gap-1">
                      <Percent className="w-4 h-4" />
                      Coupon Discount
                    </span>
                    <span>-₹{discount}</span>
                  </div>
                )}

                <div className="pt-3 border-t border-ozo-gray-lighter">
                  <div className="flex justify-between">
                    <span className="text-lg font-bold">Total</span>
                    <span className="text-lg font-bold">₹{total}</span>
                  </div>
                  {(savings + discount) > 0 && (
                    <p className="text-sm text-ozo-green mt-1">
                      You saved ₹{savings + discount} on this order! 🎉
                    </p>
                  )}
                </div>
              </div>

              {/* Delivery Info */}
              <div className="mt-4 p-3 bg-ozo-gray-bg rounded-xl">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-ozo-red" />
                  <span className="font-semibold">Delivery in 10 minutes</span>
                </div>
                {deliveryFee > 0 && (
                  <p className="text-xs text-ozo-gray mt-1">
                    Add ₹{199 - subtotal} more for free delivery
                  </p>
                )}
              </div>

              {/* Checkout Button */}
              <button
                onClick={handleCheckout}
                className="btn btn-primary w-full mt-6 flex items-center justify-center gap-2"
              >
                Proceed to Checkout
                <ArrowRight className="w-5 h-5" />
              </button>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Cart