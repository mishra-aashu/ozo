import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Heart,
  Plus,
  Minus,
  ShoppingCart,
  Star,
  Clock,
  TrendingUp,
  Zap,
  Check,
} from 'lucide-react'
import { useCartStore } from '../stores/cartStore'
import { useWishlistStore } from '../stores/wishlistStore'
import { useAuthStore } from '../stores/authStore'
import toast from 'react-hot-toast'

const ProductCard = ({ product, variant = 'default' }) => {
  const [imageLoading, setImageLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)

  const { isAuthenticated } = useAuthStore()
  const { addToCart, updateQuantity, getItemQuantity, items } = useCartStore()
  const { toggleWishlist, isInWishlist } = useWishlistStore()

  const quantity = getItemQuantity(product.id)
  const cartItem = items.find(item => item.productId === product.id)
  const isFavorite = isInWishlist(product.id)

  const discountPercentage = product.discount_percentage ||
    (product.mrp > product.price ? Math.round(((product.mrp - product.price) / product.mrp) * 100) : 0)

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to add items to cart')
      return
    }

    setIsAdding(true)
    const result = await addToCart(product, 1)

    // Animation effect
    setTimeout(() => {
      setIsAdding(false)
    }, 500)

    if (!result.success) {
      toast.error('Failed to add to cart')
    }
  }

  const handleIncrement = async () => {
    if (cartItem) {
      if (quantity >= product.max_order_qty) {
        toast.error(`Maximum ${product.max_order_qty} items allowed`)
        return
      }
      await updateQuantity(cartItem.id, quantity + 1)
    }
  }

  const handleDecrement = async () => {
    if (cartItem && quantity > 0) {
      await updateQuantity(cartItem.id, quantity - 1)
    }
  }

  const handleToggleWishlist = async (e) => {
    e.preventDefault()
    e.stopPropagation()

    if (!isAuthenticated) {
      toast.error('Please login to add to wishlist')
      return
    }

    await toggleWishlist(product)
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: 'easeOut',
      },
    },
    hover: {
      y: -5,
      transition: {
        duration: 0.2,
        ease: 'easeInOut',
      },
    },
  }

  // Compact variant for cart/checkout
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-3 p-3 bg-white rounded-xl">
        <img
          src={product.image_url}
          alt={product.name}
          className="w-16 h-16 object-cover rounded-lg"
        />
        <div className="flex-1">
          <h4 className="font-semibold text-sm line-clamp-1">{product.name}</h4>
          <p className="text-xs text-ozo-gray">{product.unit}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="font-bold text-sm">₹{product.price}</span>
            {product.mrp > product.price && (
              <span className="text-xs text-ozo-gray line-through">₹{product.mrp}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDecrement}
            className="w-7 h-7 rounded-lg bg-ozo-gray-bg hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="w-8 text-center font-semibold">{quantity}</span>
          <button
            onClick={handleIncrement}
            className="w-7 h-7 rounded-lg bg-ozo-gray-bg hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  // Horizontal variant for lists
  if (variant === 'horizontal') {
    return (
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        whileHover="hover"
        className="flex gap-4 p-4 bg-white rounded-2xl shadow-card hover:shadow-card-hover transition-all"
      >
        <Link to={`/product/${product.slug}`} className="flex-shrink-0">
          <img
            src={product.image_url}
            alt={product.name}
            className="w-24 h-24 object-cover rounded-xl"
          />
        </Link>
        <div className="flex-1">
          <Link to={`/product/${product.slug}`}>
            <h3 className="font-semibold hover:text-ozo-red transition-colors line-clamp-1">
              {product.name}
            </h3>
          </Link>
          <p className="text-sm text-ozo-gray mb-2">{product.unit}</p>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">₹{product.price}</span>
            {product.mrp > product.price && (
              <>
                <span className="text-sm text-ozo-gray line-through">₹{product.mrp}</span>
                <span className="text-sm text-ozo-green font-semibold">{discountPercentage}% OFF</span>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end justify-between">
          <button
            onClick={handleToggleWishlist}
            className="p-2 rounded-lg hover:bg-ozo-gray-bg transition-colors"
          >
            <Heart
              className={`w-5 h-5 ${
                isFavorite ? 'fill-ozo-red text-ozo-red' : 'text-ozo-gray'
              }`}
            />
          </button>
          {quantity > 0 ? (
            <div className="flex items-center gap-2 bg-ozo-green text-white rounded-lg px-2 py-1">
              <button onClick={handleDecrement} className="p-1 hover:bg-white/20 rounded">
                <Minus className="w-4 h-4" />
              </button>
              <span className="font-semibold min-w-[20px] text-center">{quantity}</span>
              <button onClick={handleIncrement} className="p-1 hover:bg-white/20 rounded">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleAddToCart}
              className="btn btn-sm btn-primary"
            >
              Add
            </button>
          )}
        </div>
      </motion.div>
    )
  }

  // Default card variant
  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      className="product-card group"
    >
      {/* Badges */}
      <div className="absolute top-2 left-2 z-10 flex flex-col gap-2">
        {discountPercentage > 0 && (
          <span className="product-badge product-badge-discount">
            {discountPercentage}% OFF
          </span>
        )}
        {product.is_bestseller && (
          <span className="product-badge product-badge-bestseller flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            Bestseller
          </span>
        )}
        {product.is_featured && (
          <span className="product-badge product-badge-new flex items-center gap-1">
            <Zap className="w-3 h-3" />
            Featured
          </span>
        )}
      </div>

      {/* Wishlist Button */}
      <button
        onClick={handleToggleWishlist}
        className="absolute top-2 right-2 z-10 p-2 bg-white rounded-full shadow-md hover:shadow-lg transition-all"
      >
        <motion.div
          animate={{
            scale: isFavorite ? [1, 1.3, 1] : 1,
          }}
          transition={{ duration: 0.3 }}
        >
          <Heart
            className={`w-5 h-5 ${
              isFavorite ? 'fill-ozo-red text-ozo-red' : 'text-ozo-gray hover:text-ozo-red'
            } transition-colors`}
          />
        </motion.div>
      </button>

      {/* Product Image */}
      <Link to={`/product/${product.slug}`} className="block relative overflow-hidden">
        {imageLoading && (
          <div className="product-card-image shimmer" />
        )}
        <img
          src={product.image_url}
          alt={product.name}
          className={`product-card-image group-hover:scale-110 transition-transform duration-300 ${
            imageLoading ? 'opacity-0' : 'opacity-100'
          }`}
          onLoad={() => setImageLoading(false)}
        />

        {/* Quick View on hover */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <span className="px-4 py-2 bg-white text-ozo-dark rounded-lg font-semibold transform scale-90 group-hover:scale-100 transition-transform">
            Quick View
          </span>
        </div>
      </Link>

      {/* Product Details */}
      <div className="product-card-body">
        {/* Delivery Time */}
        <div className="flex items-center gap-1 text-xs text-ozo-gray mb-2">
          <Clock className="w-3 h-3" />
          <span>10 mins</span>
        </div>

        {/* Product Name */}
        <Link to={`/product/${product.slug}`}>
          <h3 className="font-semibold text-sm mb-1 line-clamp-2 hover:text-ozo-red transition-colors">
            {product.name}
          </h3>
        </Link>

        {/* Unit */}
        <p className="text-xs text-ozo-gray mb-2">{product.unit}</p>

        {/* Rating (if available) */}
        {product.rating && (
          <div className="flex items-center gap-1 mb-2">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-3 h-3 ${
                    i < Math.floor(product.rating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-ozo-gray">({product.review_count || 0})</span>
          </div>
        )}

        {/* Price */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-ozo-dark">₹{product.price}</span>
              {product.mrp > product.price && (
                <span className="text-xs text-ozo-gray line-through">₹{product.mrp}</span>
              )}
            </div>
          </div>
        </div>

        {/* Add to Cart Button / Quantity Selector */}
        <div className="mt-auto">
          {quantity > 0 ? (
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="flex items-center justify-between bg-ozo-green text-white rounded-lg px-3 py-2"
            >
              <button
                onClick={handleDecrement}
                className="p-1 hover:bg-white/20 rounded transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="font-semibold">{quantity}</span>
              <button
                onClick={handleIncrement}
                className="p-1 hover:bg-white/20 rounded transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </motion.div>
          ) : (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleAddToCart}
              disabled={!product.is_available || product.quantity_available === 0}
              className={`w-full py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                !product.is_available || product.quantity_available === 0
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-ozo text-white hover:shadow-ozo'
              }`}
            >
              {isAdding ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.5 }}
                >
                  <Check className="w-4 h-4" />
                </motion.div>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4" />
                  {!product.is_available ? 'Out of Stock' : 'Add'}
                </>
              )}
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default ProductCard