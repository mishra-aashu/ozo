import { useState, useEffect, memo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useShallow } from 'zustand/react/shallow'
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
  Eye,
  EyeOff,
  Loader2,
  Bell,
} from 'lucide-react'
import { useCartStore } from '../stores/cartStore'
import { useWishlistStore } from '../stores/wishlistStore'
import { useAuthStore } from '../stores/authStore'
import { useLocationStore } from '../stores/locationStore'
import { supabase, supabaseAdmin } from '../lib/supabase'
import toast from 'react-hot-toast'
import OptimizedImage from './OptimizedImage'
import { promptOneSignalPush, oneSignalAddTag } from '../utils/onesignal'

function ProductCard({ product, variant = 'default', index }) {
  const navigate = useNavigate()
  const selectedCitySlug = useLocationStore(state => state.selectedCitySlug)
  const categorySlug = product.category?.slug || product.category_slug || 'item'
  const productLink = selectedCitySlug ? `/${selectedCitySlug}/${categorySlug}/${product.slug}` : `/product/${categorySlug}/${product.slug}`
  const hasVariants = Array.isArray(product?.variants) && product.variants.length > 0
  const [selectedProduct, setSelectedProduct] = useState(
    hasVariants ? product?.variants[0] : product
  )
  const [isAdding, setIsAdding] = useState(false)

  const { isAuthenticated, isAdmin } = useAuthStore()
  const addToCart = useCartStore(state => state.addToCart)
  const updateQuantity = useCartStore(state => state.updateQuantity)
  const launchConfig = useCartStore(state => state.launchConfig)

  // Use a shallow selector to fetch only the primitive quantity and cartItemId
  // to prevent this card from re-rendering when other cart items change.
  const { quantity, cartItemId } = useCartStore(useShallow(state => {
    const item = state.items.find(item => item.productId === selectedProduct?.id)
    return {
      quantity: item ? item.quantity : 0,
      cartItemId: item ? item.id : null
    }
  }))

  const toggleWishlist = useWishlistStore(state => state.toggleWishlist)
  const isFavorite = useWishlistStore(state => 
    state.items.some(item => item.productId === selectedProduct?.id)
  )
  const [isUpdating, setIsUpdating] = useState(false)
  const [isNotified, setIsNotified] = useState(() => {
    try {
      return localStorage.getItem(`notify_prod_${selectedProduct?.id}`) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (selectedProduct?.id) {
      try {
        setIsNotified(localStorage.getItem(`notify_prod_${selectedProduct.id}`) === 'true');
      } catch {
        setIsNotified(false);
      }
    }
  }, [selectedProduct]);

  // A product is "out of stock" if:
  //   - is_available is explicitly false, OR
  //   - quantity_available is a real number AND equals 0 (NOT null — null means "untracked / unlimited")
  const isQtyOOS = selectedProduct?.quantity_available !== null && selectedProduct?.quantity_available !== undefined && selectedProduct.quantity_available === 0;
  const isUpcoming = (launchConfig?.launch_mode_enabled && (!selectedProduct?.is_available || isQtyOOS))
    ? true
    : (selectedProduct?.is_upcoming || false);
  const handleNotifyMe = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      const permission = await promptOneSignalPush();
      if (permission === 'granted') {
        localStorage.setItem(`notify_prod_${selectedProduct?.id}`, 'true');
        setIsNotified(true);
        await oneSignalAddTag(`notify_prod_${selectedProduct?.id}`, 'true');

        toast.success(`We will notify you when ${selectedProduct?.name} is back in stock!`, {
          icon: '🔔',
          style: {
            borderRadius: '16px',
            background: '#333',
            color: '#fff',
          }
        });
      }
    } catch (err) {
      console.error('[OneSignal] Notification request failed:', err);
    }
  };

  const toggleAvailability = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!selectedProduct?.id) return;
    setIsUpdating(true)
    const newStatus = !selectedProduct.is_available
    const toastId = toast.loading(newStatus ? 'Marking as In Stock...' : 'Marking as Out of Stock...')
    try {
      const { error } = await supabaseAdmin
        .from('products')
        .update({ is_available: newStatus })
        .eq('id', selectedProduct.id)

      if (error) throw error

      // Update local state
      setSelectedProduct(prev => ({ ...prev, is_available: newStatus }))
      if (product.variants) {
        const idx = product.variants.findIndex(v => v.id === selectedProduct.id)
        if (idx !== -1) {
          product.variants[idx] = { ...product.variants[idx], is_available: newStatus }
        }
      } else {
        product.is_available = newStatus
      }
      
      toast.success(newStatus ? 'Product marked In Stock!' : 'Product marked Out of Stock!', { id: toastId })
    } catch (err) {
      console.error('Error toggling availability:', err)
      toast.error('Failed to update availability', { id: toastId })
    } finally {
      setIsUpdating(false)
    }
  }

  // Sync selectedProduct if the main product prop changes
  useEffect(() => {
    setSelectedProduct(hasVariants ? product.variants[0] : product)
  }, [product, hasVariants])

  // Selected state quantities and wishlist values are fetched reactively via fine-grained selectors above

  const discountPercentage = selectedProduct?.discount_percentage ||
    (selectedProduct?.price && selectedProduct?.mrp && selectedProduct.mrp > selectedProduct.price 
      ? Math.round(((selectedProduct.mrp - selectedProduct.price) / selectedProduct.mrp) * 100) 
      : 0)

  const handleAddToCart = async (e) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    setIsAdding(true)
    const result = await addToCart(selectedProduct, 1)

    // Animation effect
    setTimeout(() => {
      setIsAdding(false)
    }, 500)

    if (!result.success) {
      toast.error('Failed to add to cart')
    }
  }

  const handleIncrement = async (e) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    if (cartItemId) {
      if (quantity >= (selectedProduct?.max_order_qty ?? 99)) {
        toast.error(`Maximum ${selectedProduct?.max_order_qty ?? 99} items allowed`)
        return
      }
      await updateQuantity(cartItemId, quantity + 1)
    }
  }

  const handleDecrement = async (e) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    if (cartItemId && quantity > 0) {
      await updateQuantity(cartItemId, quantity - 1)
    }
  }

  const handleToggleWishlist = async (e) => {
    e.preventDefault()
    e.stopPropagation()

    if (!isAuthenticated) {
      toast.error('Please login to add to wishlist')
      return
    }

    await toggleWishlist(selectedProduct)
  }
  const cardVariants = {
    hidden: { 
      opacity: 0, 
      y: 30,
      scale: 0.96
    },
    visible: (index) => ({
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 16,
        mass: 0.9,
        delay: typeof index === 'number' ? Math.min(index * 0.035, 0.4) : 0,
        opacity: { duration: 0.25, ease: 'easeOut', delay: typeof index === 'number' ? Math.min(index * 0.035, 0.4) : 0 }
      },
    }),
    hover: {
      y: -8,
      transition: {
        duration: 0.3,
        ease: [0.16, 1, 0.3, 1],
      },
    },
  }

  // Compact variant for cart/checkout
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-4 p-4 bg-white dark:bg-white/5 rounded-2xl border border-white/10 dark:border-white/5 shadow-sm">
        <OptimizedImage
          src={selectedProduct.image_url}
          slug={selectedProduct.slug}
          alt={selectedProduct.name}
          width={150}
          loading="lazy"
          className="w-full h-full object-contain p-1.5 rounded-xl shadow-sm bg-gray-50/50 dark:bg-white/[0.02]"
          containerClassName="w-20 h-20 rounded-xl border border-gray-100 dark:border-white/5"
        />
        <div className="flex-1">
          <h4 className="font-black text-sm line-clamp-1 text-gray-800 dark:text-white break-words">{selectedProduct?.name}</h4>
          <p className="text-xs font-bold text-ozo-gray">{selectedProduct?.unit}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="font-black text-sm">
              {selectedProduct?.price ? `₹${selectedProduct.price}` : 'Price on Request'}
            </span>
            {selectedProduct?.price && selectedProduct?.mrp && selectedProduct.mrp > selectedProduct.price && (
              <span className="text-xs text-ozo-gray line-through font-bold">₹{selectedProduct?.mrp ?? 0}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDecrement}
            aria-label="Decrease quantity"
            className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-ozo-red hover:text-white flex items-center justify-center transition-all active:scale-90"
          >
            <Minus className="w-4 h-4 stroke-[3px]" />
          </button>
          <span className="w-6 text-center font-black text-sm">{quantity}</span>
          <button
            onClick={handleIncrement}
            aria-label="Increase quantity"
            className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-ozo-red hover:text-white flex items-center justify-center transition-all active:scale-90"
          >
            <Plus className="w-4 h-4 stroke-[3px]" />
          </button>
        </div>
      </div>
    )
  }

  // Horizontal variant for lists
  if (variant === 'horizontal') {
    return (
      <div
        onClick={(e) => {
          if (
            e.target.closest('button') || 
            e.target.closest('a') || 
            e.target.closest('input')
          ) {
            return
          }
          navigate(productLink)
        }}
        style={{
          animationDelay: typeof index === 'number' ? `${Math.min(index * 0.035, 0.4)}s` : '0s'
        }}
        className="product-card-animate flex gap-5 p-5 bg-white dark:bg-white/5 rounded-3xl shadow-premium hover:shadow-ozo-lg hover:-translate-y-2 border border-gray-200/90 dark:border-white/10 cursor-pointer transform-gpu will-change-transform transition-all duration-300"
      >
        <Link to={productLink} className="flex-shrink-0 relative overflow-hidden rounded-2xl group/img">
          <OptimizedImage
            src={selectedProduct.image_url}
            slug={selectedProduct.slug}
            alt={selectedProduct.name}
            width={250}
            loading="lazy"
            className={`w-full h-full object-contain p-1.5 group-hover/img:scale-110 transition-transform duration-500 bg-gray-50/50 dark:bg-white/[0.02] ${
              !selectedProduct?.is_available || (selectedProduct?.quantity_available !== undefined && selectedProduct.quantity_available === 0) ? 'grayscale opacity-60 contrast-75' : ''
            }`}
            containerClassName="w-32 h-32 xs:w-36 xs:h-36 rounded-2xl border border-gray-100 dark:border-white/5"
          />
          {(!selectedProduct?.is_available || (selectedProduct?.quantity_available !== undefined && selectedProduct.quantity_available === 0)) && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/5 pointer-events-none select-none">
              <div className="flex flex-col items-center gap-1">
                {isUpcoming ? (
                  <div className="bg-amber-500 text-white font-black text-[9px] px-2.5 py-1 rounded-lg shadow-md tracking-wider uppercase flex items-center gap-1.5 border border-white/10">
                    Listing Soon
                  </div>
                ) : (
                  <div className="bg-ozo-red/90 text-white font-black text-[9px] px-2.5 py-1 rounded-lg shadow-md tracking-wider uppercase flex items-center gap-1.5 border border-white/10">
                    OUT OF STOCK
                  </div>
                )}
              </div>
            </div>
          )}
        </Link>
        <div className="flex-1 flex flex-col justify-center">
          {product.category?.name && (
            <span className="text-[10px] font-bold text-ozo-gray dark:text-gray-400 uppercase tracking-wider mb-1 block">
              {product.category.name}
            </span>
          )}
          <Link to={productLink}>
            <h3 className="font-black text-lg hover:text-ozo-red transition-colors line-clamp-1 mb-1 text-gray-800 dark:text-white break-words">
              {product.name}
            </h3>
          </Link>
          <p className="text-sm font-bold text-ozo-gray mb-1.5">{selectedProduct.unit}</p>

          {/* Variant Selector Pills */}
          {hasVariants && product.variants.length > 1 && (
            <div className="flex flex-wrap gap-1.5 mb-3 mt-1">
              {product.variants.map((v) => {
                const isSelected = selectedProduct.id === v.id;
                return (
                  <button
                    key={v.id}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedProduct(v);
                    }}
                    className={`text-[9px] font-black px-2.5 py-1 rounded-lg border transition-all ${
                      isSelected
                        ? 'bg-ozo-red text-white border-ozo-red shadow-sm'
                        : 'bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-white/5 hover:border-gray-300'
                    }`}
                  >
                    {v.variantName}
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex items-center gap-3">
            <span className="text-2xl font-black text-gray-900 dark:text-white">
              {selectedProduct?.price ? `₹${selectedProduct.price}` : 'Price on Request'}
            </span>
            {selectedProduct?.price && selectedProduct?.mrp && selectedProduct.mrp > selectedProduct.price && (
              <div className="flex flex-col">
                <span className="text-xs text-ozo-gray line-through font-bold leading-none">₹{selectedProduct?.mrp ?? 0}</span>
                <span className="text-[10px] text-ozo-green font-black uppercase tracking-wider">{discountPercentage}% OFF</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end justify-between py-1">
          <div className="flex gap-2">
            {isAdmin && (
              <button
                onClick={toggleAvailability}
                disabled={isUpdating}
                aria-label="Toggle availability"
                className="p-3 rounded-2xl bg-gray-50 dark:bg-white/5 hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors flex items-center justify-center text-gray-400 hover:text-ozo-red"
                title="Toggle Availability (Admin)"
              >
                {isUpdating ? (
                  <Loader2 className="w-6 h-6 animate-spin text-ozo-red" />
                ) : selectedProduct.is_available ? (
                  <Eye className="w-6 h-6 text-ozo-green" />
                ) : (
                  <EyeOff className="w-6 h-6 text-ozo-red" />
                )}
              </button>
            )}
            <button
              onClick={handleToggleWishlist}
              aria-label={isFavorite ? "Remove from wishlist" : "Add to wishlist"}
              className="p-3 rounded-2xl bg-gray-50 dark:bg-white/5 hover:bg-ozo-red/10 dark:hover:bg-ozo-red/10 transition-colors group/heart"
            >
              <Heart
                className={`w-6 h-6 transition-all ${
                  isFavorite ? 'fill-ozo-red text-ozo-red scale-110' : 'text-gray-400 group-hover/heart:text-ozo-red'
                }`}
              />
            </button>
          </div>
          {quantity > 0 ? (
            <div className="flex items-center gap-3 bg-ozo-green text-white rounded-xl p-1.5 shadow-lg shadow-ozo-green/20">
              <button onClick={handleDecrement} aria-label="Decrease quantity" className="p-1.5 hover:bg-white/20 rounded-lg active:scale-90 transition-all">
                <Minus className="w-4 h-4 stroke-[3px]" />
              </button>
              <span className="font-black min-w-[24px] text-center">{quantity}</span>
              <button onClick={handleIncrement} aria-label="Increase quantity" className="p-1.5 hover:bg-white/20 rounded-lg active:scale-90 transition-all">
                <Plus className="w-4 h-4 stroke-[3px]" />
              </button>
            </div>
          ) : !selectedProduct?.is_available || isQtyOOS ? (
            <div className="flex flex-col items-end gap-1.5">
              {isUpcoming ? (
                <span className="text-[10px] font-black uppercase text-amber-500 dark:text-amber-400 tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Listing Soon
                </span>
              ) : (
                <span className="text-[10px] font-black uppercase text-ozo-red tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-ozo-red animate-pulse" />
                  Out of Stock
                </span>
              )}
              {((isUpcoming && launchConfig?.show_listing_soon_btn !== false) || 
                (!isUpcoming && launchConfig?.show_out_of_stock_btn !== false)) && (
                <button
                  onClick={handleNotifyMe}
                  className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-sm border ${
                    isNotified
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                      : 'border-ozo-red/30 text-ozo-red bg-ozo-red/5 hover:bg-gradient-ozo hover:text-white hover:border-transparent active:scale-95'
                  }`}
                >
                  {isNotified ? (
                    <>
                      <Check className="w-3.5 h-3.5 stroke-[3px]" />
                      <span>Requested</span>
                    </>
                  ) : (
                    <>
                      <Bell className="w-3.5 h-3.5 stroke-[2.5px]" />
                      <span>{isUpcoming ? 'Notify' : 'Notify Me'}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={handleAddToCart}
              disabled={!selectedProduct?.is_available || !selectedProduct?.price}
              className={`px-8 py-3 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${
                !selectedProduct?.is_available || !selectedProduct?.price
                  ? 'bg-gray-100 dark:bg-white/5 text-gray-400 cursor-not-allowed shadow-none opacity-60'
                  : 'bg-gradient-ozo text-white shadow-ozo shadow-ozo-red/20 hover:scale-105 active:scale-95'
              }`}
            >
              {!selectedProduct?.is_available ? 'OOS' : 'Add'}
            </button>
          )}
        </div>
      </div>
    )
  }

  // Default card variant (Premium Horizontal Card Layout)
  return (
    <div
      onClick={(e) => {
        if (
          e.target.closest('button') || 
          e.target.closest('a') || 
          e.target.closest('input')
        ) {
          return
        }
        navigate(productLink)
      }}
      style={{
        animationDelay: typeof index === 'number' ? `${Math.min(index * 0.035, 0.4)}s` : '0s'
      }}
      className="product-card product-card-animate relative group flex flex-col items-stretch gap-1.5 sm:gap-2.5 p-2 sm:p-3 bg-white dark:bg-[#0c0c0e] border border-gray-200/90 dark:border-white/10 rounded-xl sm:rounded-2xl overflow-hidden shadow-sm hover:shadow-ozo-lg hover:-translate-y-2 transition-all duration-500 cursor-pointer transform-gpu will-change-transform w-full"
    >
      {/* Badges (Discount, Featured, Bestseller) - Positioned nicely */}
      <div className="absolute top-1.5 left-1.5 z-10 flex flex-col gap-1 items-start">
        {selectedProduct?.price && selectedProduct?.mrp && selectedProduct.mrp > selectedProduct.price && (
          <span className="bg-gradient-to-r from-amber-400 to-yellow-300 dark:from-amber-500 dark:to-yellow-400 text-red-800 dark:text-red-950 font-black text-[7px] sm:text-[9px] px-1.5 py-0.5 rounded shadow-sm border border-amber-300/30 select-none uppercase tracking-wider">
            {discountPercentage}% OFF
          </span>
        )}
      </div>

      {/* Wishlist Button - Top Right */}
      <button
        onClick={handleToggleWishlist}
        aria-label={isFavorite ? "Remove from wishlist" : "Add to wishlist"}
        className="absolute top-2 right-2 z-10 p-1.5 bg-white/70 dark:bg-black/40 backdrop-blur-md hover:bg-white dark:hover:bg-black/60 rounded-full shadow-sm hover:shadow-md transition-all border border-gray-250/30 dark:border-white/10"
      >
        <motion.div
          animate={{
            scale: isFavorite ? [1, 1.3, 1] : 1,
          }}
          transition={{ duration: 0.3 }}
        >
          <Heart
            className={`w-3.5 h-3.5 ${
              isFavorite ? 'fill-ozo-red text-ozo-red' : 'text-gray-500 dark:text-gray-400 hover:text-ozo-red'
            } transition-colors`}
          />
        </motion.div>
      </button>

      {/* Admin Toggle Availability */}
      {isAdmin && (
        <button
          onClick={toggleAvailability}
          disabled={isUpdating}
          aria-label="Toggle availability"
          className="absolute top-10 right-2 z-10 p-1.5 bg-white/70 dark:bg-black/40 backdrop-blur-md hover:bg-white dark:hover:bg-black/60 rounded-full shadow-sm hover:shadow-md transition-all border border-gray-250/30 dark:border-white/10 flex items-center justify-center hover:scale-105 active:scale-95 text-gray-400 hover:text-ozo-red"
          title="Toggle Availability (Admin)"
        >
          {isUpdating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-ozo-red" />
          ) : selectedProduct.is_available ? (
            <Eye className="w-3.5 h-3.5 text-ozo-green" />
          ) : (
            <EyeOff className="w-3.5 h-3.5 text-ozo-red" />
          )}
        </button>
      )}

      {/* Product Image (Top centered) */}
      <Link 
        to={productLink} 
        className="relative w-full h-24 xs:h-28 sm:h-36 md:h-40 flex-shrink-0 overflow-hidden bg-gray-50/50 dark:bg-white/[0.01] rounded-lg sm:rounded-xl border border-gray-100 dark:border-white/[0.02] flex items-center justify-center"
      >
        <OptimizedImage
          src={selectedProduct.image_url}
          slug={selectedProduct.slug}
          alt={selectedProduct.name}
          width={300}
          loading="lazy"
          className={`w-full h-full object-contain p-1 sm:p-2 group-hover:scale-105 transition-transform duration-500 ${
            !selectedProduct?.is_available || (selectedProduct?.quantity_available !== undefined && selectedProduct.quantity_available === 0) ? 'grayscale opacity-60 contrast-75' : ''
          }`}
          containerClassName="w-full h-full"
        />

        {(!selectedProduct?.is_available || (selectedProduct?.quantity_available !== undefined && selectedProduct.quantity_available === 0)) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/5 pointer-events-none select-none">
            <div className="flex flex-col items-center gap-0.5">
              {isUpcoming ? (
                <div className="bg-amber-500 text-white font-black text-[7px] sm:text-[9px] px-1.5 py-0.5 rounded shadow-lg tracking-wider uppercase border border-white/10">
                  Soon
                </div>
              ) : (
                <div className="bg-ozo-red/90 text-white font-black text-[7px] sm:text-[9px] px-1.5 py-0.5 rounded shadow-lg tracking-wider uppercase border border-white/10">
                  OOS
                </div>
              )}
            </div>
          </div>
        )}
      </Link>

      {/* Product Details (Bottom) */}
      <div className="product-card-body flex flex-col flex-1 min-w-0 p-0.5 sm:p-2 sm:pt-1">
        {/* Delivery Time & Rating Info */}
        <div className="flex items-center gap-1 sm:gap-1.5 mb-1 sm:mb-1.5">
          <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-500/10 dark:bg-amber-500/20 text-[7px] sm:text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            <Clock className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-amber-500 fill-amber-500/20" />
            <span>30m</span>
          </div>
          {selectedProduct.rating && (
            <div className="flex items-center gap-0.5 bg-emerald-500/10 dark:bg-emerald-500/20 px-1.5 py-0.5 rounded-full">
              <Star className="w-2 h-2 sm:w-2.5 sm:h-2.5 fill-emerald-600 text-emerald-600 dark:fill-emerald-400 dark:text-emerald-400" />
              <span className="text-[7px] sm:text-[9px] font-black text-emerald-600 dark:text-emerald-400">{selectedProduct.rating}</span>
            </div>
          )}
        </div>

        {/* Product Name */}
        <Link to={productLink} className="block mb-0.5 sm:mb-1 pr-1">
          <h3 className="font-extrabold text-[11px] sm:text-[13px] md:text-[14px] line-clamp-2 leading-tight text-gray-800 dark:text-gray-100 group-hover:text-ozo-red transition-colors break-words">
            {product.name}
          </h3>
        </Link>

        {/* Unit */}
        <p className="text-[8px] sm:text-[10px] font-semibold text-gray-400 dark:text-gray-400 mb-1 sm:mb-2">{selectedProduct.unit || 'per pc'}</p>

        {/* Variant Selector Pills */}
        {hasVariants && product.variants.length > 1 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {product.variants.map((v) => {
              const isSelected = selectedProduct.id === v.id;
              return (
                <button
                  key={v.id}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedProduct(v);
                  }}
                  className={`text-[7px] sm:text-[8px] font-black px-1.5 py-0.5 rounded border transition-all ${
                    isSelected
                      ? 'bg-ozo-red text-white border-ozo-red shadow-sm'
                      : 'bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-white/5 hover:border-gray-300'
                  }`}
                >
                  {v.variantName}
                </button>
              );
            })}
          </div>
        )}

        {/* Price & Add Section */}
        <div className="mt-auto pt-1.5 sm:pt-2 flex items-center justify-between gap-2 border-t border-gray-100 dark:border-white/[0.04]">
          <div className="flex flex-col min-w-0">
            <span className="font-black text-gray-900 dark:text-white text-[12px] sm:text-[14px] md:text-[15px] leading-tight">
              {selectedProduct?.price ? `₹${selectedProduct.price}` : 'Price on Request'}
            </span>
            {selectedProduct?.price && selectedProduct?.mrp && selectedProduct.mrp > selectedProduct.price && (
              <span className="text-gray-400 dark:text-gray-500 line-through leading-none mt-0.5 font-semibold text-[9px] sm:text-[10px] md:text-[11px]">
                ₹{selectedProduct.mrp}
              </span>
            )}
          </div>

          {/* Add Button */}
          <div className="w-[64px] sm:w-[72px] md:w-[84px] flex-shrink-0">
            {quantity > 0 ? (
              <div className="flex items-center justify-between bg-emerald-600 dark:bg-emerald-600 text-white rounded-xl py-1.5 px-1.5 sm:py-2 sm:px-2 shadow-md shadow-emerald-600/10">
                <button
                  onClick={handleDecrement}
                  aria-label="Decrease quantity"
                  className="p-1 hover:bg-white/10 rounded transition-colors active:scale-90"
                >
                  <Minus className="w-2 h-2 sm:w-3 sm:h-3 stroke-[3px] text-white" />
                </button>
                <span className="font-black text-[10px] sm:text-xs select-none text-white">{quantity}</span>
                <button
                  onClick={handleIncrement}
                  aria-label="Increase quantity"
                  className="p-1 hover:bg-white/10 rounded transition-colors active:scale-95"
                >
                  <Plus className="w-2 h-2 sm:w-3 sm:h-3 stroke-[3px] text-white" />
                </button>
              </div>
            ) : !selectedProduct?.is_available || isQtyOOS ? (
              <div className="text-[8px] sm:text-[10px] font-bold uppercase text-ozo-red text-center py-1 select-none leading-none">
                OOS
              </div>
            ) : (
              <button
                onClick={handleAddToCart}
                disabled={!selectedProduct?.is_available || isQtyOOS || !selectedProduct?.price}
                className={`w-full py-1.5 sm:py-2 rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-0.5 shadow-sm hover:shadow-md ${
                  !selectedProduct?.is_available || isQtyOOS || !selectedProduct?.price
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none opacity-60'
                    : 'bg-ozo-red hover:bg-ozo-red-dark text-white hover:shadow-lg hover:shadow-ozo-red/20 active:scale-95'
                }`}
              >
                {isAdding ? (
                  <span className="font-black text-[9px] text-white">...</span>
                ) : (
                  <span className="text-white">ADD</span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default memo(ProductCard)