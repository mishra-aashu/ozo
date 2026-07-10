import { useEffect, useState, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from '../hooks/useTranslation'
import Breadcrumb from '../components/Breadcrumb'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronLeft, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Check, 
  Sparkles, 
  Info, 
  Zap, 
  IceCream, 
  Coffee, 
  Leaf, 
  Flame,
  ArrowRight,
  TrendingDown
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useCartStore } from '../stores/cartStore'
import { useAuthStore } from '../stores/authStore'
import toast from 'react-hot-toast'
import OzoLoadingGuard from '../components/OzoLoadingGuard'
import OptimizedImage from '../components/OptimizedImage'

const ComboDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const addToCart = useCartStore(state => state.addToCart)
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const { t } = useTranslation()

  // State
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)
  const [addonQuantities, setAddonQuantities] = useState({})
  const [isAddingToCart, setIsAddingToCart] = useState(false)

  // Configure combo static definitions
  const comboConfig = useMemo(() => {
    if (id === 'naan-qalia' || id === 'naan-special') {
      return {
        title: 'Aurangabad Naan & Curry Combo',
        subtitle: 'Royal regional curry ingredients',
        badge: 'Hot Selling',
        badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        glowColor: 'from-amber-500/[0.02] to-[#d35400]/[0.02] dark:from-amber-500/5 dark:to-[#d35400]/5',
        accentBorder: 'hover:border-amber-500/40',
        accentText: 'text-amber-600 dark:text-amber-400',
        accentBg: 'bg-gradient-to-r from-amber-500 to-[#d35400]',
        cardBg: 'bg-gradient-to-br from-[#fffdfa] via-[#fff6ef] to-[#ffedd5] dark:from-[#2b180d] dark:via-[#3a2012] dark:to-[#1c0f08] border-amber-200/50 dark:border-[#4d2d1a]/80 shadow-premium dark:shadow-2xl text-gray-900 dark:text-amber-100',
        description: 'A royal culinary legacy hailing from historical Aurangabad. This combo contains premium spices, fragrant basmati rice, and essential cooking staples, perfect for preparing authentic regional curries and traditional feasts paired with baked flatbread (Naan) at home!',
        baseSlugs: [
          'tata-sampann-coriander-powder-with-natural-oils-dhaniya-100-g',
          'premium-basmati-rice-1kg',
          'ginger-garlic-paste-200g',
          'special-tandoori-atta-1kg'
        ],
        emoji: '🍲',
        bundlePrice: 189,
        bundleMrp: 240,
      }
    } else {
      return {
        title: 'Chhatrapati Chowk Mandi Combo',
        subtitle: 'Freshly harvested daily veggies',
        badge: '🥬 Farm Fresh',
        badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        glowColor: 'from-emerald-500/[0.02] to-[#2ecc71]/[0.02] dark:from-emerald-500/5 dark:to-[#2ecc71]/5',
        accentBorder: 'hover:border-emerald-500/40',
        accentText: 'text-emerald-600 dark:text-emerald-400',
        accentBg: 'bg-gradient-to-r from-emerald-500 to-[#2ecc71]',
        cardBg: 'bg-gradient-to-br from-[#f6fdf9] via-[#ecfaf1] to-[#dcfce7] dark:from-[#0a2015] dark:via-[#103020] dark:to-[#07160e] border-emerald-200/50 dark:border-[#1b4d34]/80 shadow-premium dark:shadow-2xl text-gray-900 dark:text-emerald-100',
        description: 'Freshly plucked, high-nutrition green vegetables sourced straight from Chhatrapati Chowk Mandi at dawn. Packed immediately with clean, sustainable packaging to preserve their natural aroma, moisture, and crisp texture. Perfect for cooking healthy everyday meals with maximum farm freshness.',
        baseSlugs: [
          'fresh-methi-leaves-bunch',
          'fresh-red-onion-pyaz-fres',
          'fresh-green-chilli-hari-mirch-fres',
          'fresh-lemon-pack-4-pcs'
        ],
        emoji: '🥬',
        bundlePrice: 79,
        bundleMrp: 110,
      }
    }
  }, [id])

  const breadcrumbItems = useMemo(() => {
    return [
      { name: t('home') || 'Home', url: '/' },
      { name: comboConfig?.title || 'Combo Detail', url: null }
    ]
  }, [t, comboConfig])

  // Budget add-ons slugs (always shown as sasta additions)
  const addonSlugs = useMemo(() => [
    'amul-vanilla-ice-cream-cup-100ml',
    'amul-chocobar-ice-cream-60ml',
    'coca-cola-soft-drink-can-250ml',
    'sweet-gulab-jamun-cup-2-pcs',
    'fresh-coriander-bunch-dhaniya'
  ], [])

  // Fetch all related products from database
  useEffect(() => {
    const fetchComboProducts = async () => {
      setIsLoading(true)
      setIsError(false)
      try {
        const allSlugs = [...comboConfig.baseSlugs, ...addonSlugs]
        const { data, error } = await supabase
          .from('products')
          .select('id, name, unit, image_url, price, mrp, slug, is_available, is_upcoming, quantity_available, max_order_qty, is_vegetarian, is_featured, is_bestseller, category_id')
          .in('slug', allSlugs)
          .eq('is_available', true)

        if (error) throw error

        if (!data || data.length === 0) {
          setIsError(true)
        } else {
          // Format numeric fields
          const formattedProducts = data.map(p => ({
            ...p,
            price: parseFloat(p.price),
            mrp: parseFloat(p.mrp)
          }))
          setProducts(formattedProducts)
        }
      } catch (err) {
        console.error('Error fetching combo products:', err)
        setIsError(true)
      } finally {
        setIsLoading(false)
      }
    }

    if (id) {
      fetchComboProducts()
    }
  }, [id, comboConfig, addonSlugs])

  // Filter products into base list and add-ons list
  const baseProducts = useMemo(() => {
    return products.filter(p => comboConfig.baseSlugs.includes(p.slug))
  }, [products, comboConfig])

  const addonProducts = useMemo(() => {
    return products.filter(p => addonSlugs.includes(p.slug))
  }, [products, addonSlugs])

  // Handle addon quantity change
  const handleAddonQuantityChange = (productId, change) => {
    setAddonQuantities(prev => {
      const current = prev[productId] || 0
      const next = Math.max(0, current + change)
      return { ...prev, [productId]: next }
    })
  }

  // Calculate totals
  const totals = useMemo(() => {
    let addonTotal = 0
    let totalItemsCount = baseProducts.length

    addonProducts.forEach(addon => {
      const qty = addonQuantities[addon.id] || 0
      addonTotal += addon.price * qty
      totalItemsCount += qty
    })

    const total = comboConfig.bundlePrice + addonTotal
    const originalTotal = comboConfig.bundleMrp + addonProducts.reduce((sum, addon) => {
      return sum + (addon.mrp * (addonQuantities[addon.id] || 0))
    }, 0)
    const savings = originalTotal - total

    return {
      total,
      originalTotal,
      savings,
      totalItemsCount
    }
  }, [baseProducts, addonProducts, addonQuantities, comboConfig])

  // Add all selected products to cart
  const handleAddComboToCart = useCallback(async () => {
    setIsAddingToCart(true)
    const toastId = toast.loading('Adding combo bundle to basket...')

    try {
      const cartState = useCartStore.getState()
      // 1. Add base products
      for (const product of baseProducts) {
        await cartState.addToCart(product, 1, false)
      }

      // 2. Add selected add-ons
      for (const addon of addonProducts) {
        const qty = addonQuantities[addon.id] || 0
        if (qty > 0) {
          await cartState.addToCart(addon, qty, false)
        }
      }

      toast.success(`${comboConfig.title} Pack added successfully! 🛒`, { id: toastId })
      
      // Auto-navigate to cart to complete checkout
      setTimeout(() => {
        navigate('/cart')
      }, 800)
    } catch (err) {
      console.error(err)
      toast.error('Failed to add combo items to cart', { id: toastId })
    } finally {
      setIsAddingToCart(false)
    }
  }, [baseProducts, addonProducts, addonQuantities, comboConfig.title, navigate])

  // Set emoji or visual icon for add-ons mapping
  const getAddonIcon = (slug) => {
    if (slug.includes('vanilla')) return <IceCream className="text-yellow-600 dark:text-yellow-200" size={24} />
    if (slug.includes('chocobar')) return <IceCream className="text-amber-900 dark:text-amber-600" size={24} />
    if (slug.includes('coca-cola')) return <Coffee className="text-red-500 dark:text-red-400" size={24} />
    if (slug.includes('gulab-jamun')) return <Sparkles className="text-orange-500 dark:text-orange-400" size={24} />
    return <Leaf className="text-emerald-600 dark:text-emerald-400" size={24} />
  }

  return (
    <OzoLoadingGuard
      isLoading={isLoading}
      isError={isError}
      skeleton={
        <div className="container-custom py-12 text-gray-900 dark:text-white">
          <div className="flex flex-col lg:flex-row gap-12">
            <div className="w-full lg:w-1/2 aspect-square rounded-[3rem] bg-gray-250 dark:bg-zinc-900 animate-pulse" />
            <div className="w-full lg:w-1/2 space-y-6">
              <div className="h-10 w-3/4 bg-gray-250 dark:bg-zinc-900 rounded-2xl animate-pulse" />
              <div className="h-24 w-full bg-gray-250 dark:bg-zinc-900 rounded-3xl animate-pulse" />
              <div className="h-32 w-full bg-gray-250 dark:bg-zinc-900 rounded-3xl animate-pulse" />
            </div>
          </div>
        </div>
      }
      fallback={
        <div className="container-custom py-20 text-center text-gray-900 dark:text-white">
          <h2 className="text-3xl font-black mb-4">Combo not found</h2>
          <button onClick={() => navigate('/')} className="btn btn-primary bg-amber-500 text-black px-6 py-2 rounded-xl font-bold">Go Home</button>
        </div>
      }
    >
      <div className="min-h-screen bg-ozo-gray-bg dark:bg-[#0a0a0a] text-gray-900 dark:text-white pb-24 relative overflow-hidden transition-colors duration-500">
        
        {/* Glow Effects */}
        <div className={`absolute -top-40 -left-40 w-96 h-96 bg-gradient-to-br ${comboConfig.glowColor} rounded-full blur-[120px] pointer-events-none`} />
        <div className="absolute top-1/3 right-0 w-80 h-80 bg-red-500/[0.01] dark:bg-red-500/5 rounded-full blur-[100px] pointer-events-none" />

        {/* Header Back Link */}
        <div className="container-custom pt-8 relative z-10">
          {/* SEO Breadcrumb Trail */}
          <Breadcrumb items={breadcrumbItems} className="mb-4" />

          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white font-black text-xs uppercase tracking-widest transition-colors mb-6 group"
          >
            <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            Back to Hub
          </button>
        </div>

        {/* Content Wrapper */}
        <div className="container-custom relative z-10">
          <div className="flex flex-col lg:flex-row gap-10 xl:gap-16 items-start">
            
            {/* LEFT COLUMN: Hero visual card + history story */}
            <div className="w-full lg:w-1/2 xl:w-[48%] space-y-6">
              
              {/* Premium Visual Banner */}
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className={`p-8 rounded-[2.5rem] backdrop-blur-md relative overflow-hidden group border shadow-xl ${comboConfig.cardBg} ${comboConfig.accentBorder}`}
              >
                <div className="absolute top-4 right-4 text-6xl opacity-20 dark:opacity-25 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500 pointer-events-none">
                  {comboConfig.emoji}
                </div>

                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${comboConfig.badgeColor}`}>
                      {comboConfig.badge}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-red-500/10 text-[10px] font-black uppercase tracking-wider text-red-500 dark:text-red-400 border border-red-500/20 flex items-center gap-1.5 animate-pulse">
                      <Zap size={11} className="fill-current" /> Super Value
                    </span>
                  </div>

                  <h1 className="text-3xl sm:text-4xl font-black mb-2 tracking-tight leading-tight">
                    {comboConfig.title}
                  </h1>
                  <p className="text-sm font-bold text-zinc-600 dark:text-zinc-400 mb-6">{comboConfig.subtitle}</p>

                  <div className="flex items-baseline gap-3">
                    <span className={`text-4xl font-black ${comboConfig.accentText}`}>₹{comboConfig.bundlePrice}</span>
                    <span className="text-lg text-zinc-450 dark:text-zinc-500 line-through font-bold">₹{comboConfig.bundleMrp}</span>
                    <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-xs font-black text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      Save ₹{comboConfig.bundleMrp - comboConfig.bundlePrice}!
                    </span>
                  </div>
                </div>

                {/* Aesthetic Gradient Wave */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />
              </motion.div>

              {/* Story/Details Section */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="p-6 rounded-3xl bg-white dark:bg-zinc-900/20 border border-gray-150 dark:border-zinc-800/40 text-zinc-700 dark:text-zinc-300 space-y-4 shadow-premium dark:shadow-none"
              >
                <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-gray-900 dark:text-white">
                  <Info size={16} className={comboConfig.accentText} />
                  <span>About this Combo</span>
                </div>
                <p className="text-sm leading-relaxed text-zinc-655 dark:text-zinc-400 font-medium">
                  {comboConfig.description}
                </p>
              </motion.div>

            </div>

            {/* RIGHT COLUMN: Pack list + Sasta Add-ons + Checkout */}
            <div className="w-full lg:w-1/2 xl:w-[52%] space-y-8">
              
              {/* Section 1: Included Pack list */}
              <div className="p-6 rounded-[2rem] bg-white dark:bg-zinc-900/30 border border-gray-150 dark:border-zinc-800/60 shadow-premium dark:shadow-xl">
                <h3 className="text-sm font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-4 flex items-center justify-between">
                  <span>Included Base Items</span>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-black normal-case">Pre-checked bundle</span>
                </h3>

                <div className="space-y-3">
                  {baseProducts.map(product => (
                    <div 
                      key={product.id}
                      className="p-4 rounded-2xl bg-gray-50/70 dark:bg-zinc-900/60 border border-gray-100 dark:border-zinc-855/40 flex items-center justify-between hover:border-gray-200 dark:hover:border-zinc-800 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-white dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800/40 p-1 flex items-center justify-center shadow-sm dark:shadow-none">
                          <OptimizedImage 
                            src={product.image_url} 
                            slug={product.slug}
                            alt={product.name} 
                            width={100}
                            className="w-full h-full object-contain"
                            containerClassName="w-full h-full"
                          />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-gray-900 dark:text-white">{product.name}</h4>
                          <span className="text-[10px] text-zinc-550 dark:text-zinc-500 font-bold">{product.unit}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-xs text-zinc-400 dark:text-zinc-500 line-through block font-bold">₹{product.mrp}</span>
                          <span className="text-sm font-black text-gray-900 dark:text-white">₹{product.price}</span>
                        </div>
                        <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-650 dark:text-emerald-400 shadow-inner">
                          <Check size={12} className="stroke-[3.5px]" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 2: Cheap Add-ons Grid ("Sasta Wala Extras") */}
              <div className="p-6 rounded-[2rem] bg-white dark:bg-zinc-900/30 border border-gray-150 dark:border-zinc-800/60 shadow-premium dark:shadow-xl space-y-4">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                    <Sparkles size={16} className="text-yellow-500 dark:text-yellow-400 animate-spin-slow" />
                    <span>Pair with Sasta Extras & Treats</span>
                  </h3>
                  <p className="text-[11px] text-zinc-550 dark:text-zinc-500 font-bold mt-1">Get budget-friendly ice cream cups, soft drinks, or fresh kitchen greens</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {addonProducts.map(addon => {
                    const qty = addonQuantities[addon.id] || 0
                    const isSelected = qty > 0

                    return (
                      <div 
                        key={addon.id}
                        className={`p-4 rounded-2xl border transition-all duration-300 flex flex-col justify-between ${
                          isSelected 
                            ? 'bg-amber-500/[0.02] dark:bg-zinc-800/40 border-amber-500/40 dark:border-amber-500/30 shadow-md dark:shadow-lg dark:shadow-amber-950/20' 
                            : 'bg-gray-50/50 dark:bg-zinc-900/50 border-gray-150 dark:border-zinc-850/60 hover:border-gray-200 dark:hover:border-zinc-850'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800/40 flex items-center justify-center text-lg shadow-sm dark:shadow-none">
                              {getAddonIcon(addon.slug)}
                            </div>
                            <div>
                              <h4 className="text-xs font-black text-gray-900 dark:text-white leading-tight break-words max-w-[120px]">{addon.name}</h4>
                              <span className="text-[9px] text-zinc-550 dark:text-zinc-500 font-bold block mt-0.5">{addon.unit}</span>
                            </div>
                          </div>

                          <div className="text-right">
                            {addon.mrp > addon.price && (
                              <span className="text-[9px] text-zinc-400 dark:text-zinc-500 line-through font-bold block">₹{addon.mrp}</span>
                            )}
                            <span className="text-xs font-black text-gray-900 dark:text-white">₹{addon.price}</span>
                          </div>
                        </div>

                        {/* Quantity controls */}
                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-150 dark:border-zinc-800/40">
                          <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                            {isSelected ? 'Selected' : 'Add to combo'}
                          </span>
                          
                          <div className="flex items-center bg-white dark:bg-zinc-950 rounded-xl p-0.5 border border-gray-200 dark:border-zinc-800/80 shadow-sm">
                            {isSelected ? (
                              <>
                                <button 
                                  onClick={() => handleAddonQuantityChange(addon.id, -1)}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-gray-900 hover:bg-gray-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-900 transition-colors"
                                >
                                  <Minus size={12} className="stroke-[3px]" />
                                </button>
                                <span className="w-6 text-center text-xs font-black text-gray-900 dark:text-white">
                                  {qty}
                                </span>
                                <button 
                                  onClick={() => handleAddonQuantityChange(addon.id, 1)}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-gray-900 hover:bg-gray-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-900 transition-colors"
                                >
                                  <Plus size={12} className="stroke-[3px]" />
                                </button>
                              </>
                            ) : (
                              <button 
                                onClick={() => handleAddonQuantityChange(addon.id, 1)}
                                className="px-3 py-1 flex items-center gap-1 text-[10px] font-black text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-white transition-colors"
                              >
                                <Plus size={10} className="stroke-[3.5px]" /> ADD
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Section 3: Summary & Add to Cart button */}
              <div className="p-6 rounded-[2.5rem] bg-gradient-to-br from-white to-gray-50 dark:from-zinc-900 dark:to-zinc-950 border border-gray-150 dark:border-zinc-800 shadow-premium dark:shadow-2xl relative overflow-hidden text-gray-900 dark:text-white">
                
                <div className="absolute right-4 top-4 text-emerald-550/[0.04] dark:text-emerald-500/10 pointer-events-none">
                  <TrendingDown size={140} className="stroke-[1.5px]" />
                </div>

                <div className="relative z-10 space-y-4">
                  <div className="flex justify-between items-center text-xs font-bold text-zinc-500 dark:text-zinc-400">
                    <span>Selected combo pack & additions:</span>
                    <span>{totals.totalItemsCount} items</span>
                  </div>

                  <div className="flex justify-between items-end">
                    <div>
                      <span className="text-zinc-500 dark:text-zinc-500 text-[10px] font-black uppercase tracking-wider block">Total Bundle Price</span>
                      <div className="flex items-baseline gap-2.5">
                        <span className="text-3xl font-black text-gray-900 dark:text-white">₹{totals.total}</span>
                        <span className="text-sm text-zinc-450 dark:text-zinc-500 line-through font-bold">₹{totals.originalTotal}</span>
                      </div>
                    </div>

                    <div className="bg-emerald-500/10 dark:bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-2xl text-right">
                      <span className="text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase tracking-wider block">Total Savings</span>
                      <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">Save ₹{totals.savings}!</span>
                    </div>
                  </div>

                  <button 
                    onClick={handleAddComboToCart}
                    disabled={isAddingToCart}
                    className={`w-full h-14 ${comboConfig.accentBg} text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl hover:shadow-2xl hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50`}
                  >
                    <span>{isAddingToCart ? 'Adding to Basket...' : 'Add Entire Bundle to Basket'}</span>
                    <ShoppingCart size={16} className="stroke-[2.5px] animate-bounce-slow" />
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>

      </div>
    </OzoLoadingGuard>
  )
}

export default ComboDetail
