import { motion } from 'framer-motion'
import { 
  Zap, 
  Gift, 
  Tag, 
  ArrowRight, 
  Clock, 
  Percent, 
  Star,
  Copy
} from 'lucide-react'
import { useProductStore } from '../stores/productStore'
import { Link } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import toast from 'react-hot-toast'
import useOzoQuery from '../hooks/useOzoQuery'
import OzoLoadingGuard from '../components/OzoLoadingGuard'
import { useCartStore } from '../stores/cartStore'
import { supabase } from '../lib/supabase'

const Offers = () => {
  const { fetchBestsellerProducts, fetchFeaturedProducts } = useProductStore()

  const { data: bestsellerData, isLoading: isBestsellersLoading, isError: isBestsellersError, refetch: refetchBestsellers } = useOzoQuery(
    async (signal) => {
      const res = await fetchBestsellerProducts({ signal })
      if (!res.success) {
        throw res.error || new Error('Failed to fetch bestseller products')
      }
      return res.data || []
    },
    [fetchBestsellerProducts]
  )

  const { data: featuredData, isLoading: isFeaturedLoading, isError: isFeaturedError, refetch: refetchFeatured } = useOzoQuery(
    async (signal) => {
      const res = await fetchFeaturedProducts({ signal })
      if (!res.success) {
        throw res.error || new Error('Failed to fetch featured products')
      }
      return res.data || []
    },
    [fetchFeaturedProducts]
  )

  const bestsellerProducts = bestsellerData || []
  const featuredProducts = featuredData || []

  const { deliveryConfig } = useCartStore()
  const freeAbove = deliveryConfig?.free_above ?? 99

  const { data: couponsData } = useOzoQuery(
    async () => {
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .eq('is_active', true)
        .not('coupon_code', 'is', null)
      if (error) throw error
      return data || []
    },
    []
  )

  const coupons = (couponsData || []).map(offer => ({
    code: offer.coupon_code,
    desc: offer.description || `Get discount of ₹${offer.discount_value} on order`,
    minOrder: offer.min_order_value || 0
  }))

  const copyCode = (code) => {
    navigator.clipboard.writeText(code)
    toast.success('Code copied: ' + code)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] pb-24 transition-colors duration-300">
      {/* Hero Section */}
      <div className="bg-gradient-green pt-16 pb-24 relative overflow-hidden">
        <div className="container-custom relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-white max-w-2xl"
          >
            <div className="flex items-center gap-3 mb-6">
               <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                  <Zap size={24} className="text-yellow-400 fill-yellow-400" />
               </div>
               <span className="text-sm font-black uppercase tracking-widest opacity-80">Exclusive Offers</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight font-display">
              Super Savings <br /> <span className="text-yellow-300">Every Single Day.</span>
            </h1>
            <p className="text-lg font-medium opacity-90 mb-10 max-w-md">
              Grab the best deals on fresh fruits, vegetables, and regional specials. Save big on your daily needs!
            </p>
          </motion.div>
        </div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-2xl -ml-32 -mb-32" />
      </div>

      <div className="container-custom -mt-12 relative z-20 space-y-16">
        
        {/* Coupons Grid */}
        {coupons.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {coupons.map((coupon, i) => (
              <motion.div 
                key={coupon.code}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white dark:bg-[#1a1a1a] p-8 rounded-[2.5rem] shadow-xl border-2 border-dashed border-gray-100 dark:border-white/10 group relative overflow-hidden"
              >
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                     <div className="w-10 h-10 bg-red-50 dark:bg-ozo-red/10 text-ozo-red rounded-xl flex items-center justify-center">
                        <Tag size={20} />
                     </div>
                     <button 
                      onClick={() => copyCode(coupon.code)}
                      className="p-2 text-ozo-gray hover:text-ozo-red transition-colors"
                     >
                       <Copy size={16} />
                     </button>
                  </div>
                  <h3 className="text-lg font-black mb-1">{coupon.code}</h3>
                  <p className="text-sm text-ozo-gray dark:text-gray-400 font-medium mb-6">{coupon.desc}</p>
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-ozo-green">
                     <Clock size={12} />
                     Expiring Soon
                  </div>
                </div>
                {/* Punch-out effect */}
                <div className="absolute top-1/2 left-0 w-6 h-12 bg-gray-50 dark:bg-[#0a0a0a] rounded-r-full -translate-y-1/2 -ml-3 border-r-2 border-dashed border-gray-100 dark:border-white/10" />
                <div className="absolute top-1/2 right-0 w-6 h-12 bg-gray-50 dark:bg-[#0a0a0a] rounded-l-full -translate-y-1/2 -mr-3 border-l-2 border-dashed border-gray-100 dark:border-white/10" />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white dark:bg-[#1a1a1a] rounded-[2.5rem] border border-gray-150/50 dark:border-white/5 max-w-xl mx-auto shadow-sm">
            <div className="w-16 h-16 bg-red-50 dark:bg-ozo-red/10 text-ozo-red rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
               <Tag size={28} />
            </div>
            <h3 className="text-xl font-black mb-2 text-gray-900 dark:text-white">No Active Coupons</h3>
            <p className="text-sm text-ozo-gray dark:text-gray-400 font-medium px-4">There are no active discount coupons available right now. Check back soon for exciting offers!</p>
          </div>
        )}

        {/* Bestseller Deals */}
        <section>
          <div className="flex items-start justify-between gap-2 md:gap-4 mb-8">
             <div className="flex items-start gap-3 md:gap-4">
                <div className="w-12 h-12 bg-red-50 dark:bg-ozo-red/10 text-ozo-red rounded-2xl flex items-center justify-center shadow-sm shrink-0 mt-0.5">
                   <Percent size={24} />
                </div>
                <div className="min-w-0">
                   <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white leading-tight">Bestseller <span className="text-gradient">Deals.</span></h2>
                   <p className="text-xs sm:text-sm text-ozo-gray font-medium mt-1">Most popular items at heavy discounts</p>
                </div>
             </div>
             <Link to="/products?filter=bestseller" className="text-ozo-red font-bold text-xs sm:text-sm flex items-center gap-1 hover:underline flex-shrink-0 whitespace-nowrap mt-1">
                View All <ArrowRight size={16} />
             </Link>
          </div>
          
          <OzoLoadingGuard
            isLoading={isBestsellersLoading}
            isError={isBestsellersError}
            isEmpty={!isBestsellersLoading && bestsellerProducts.length === 0}
            onRetry={refetchBestsellers}
            skeleton={
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6 w-full">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="aspect-[3/4] bg-white dark:bg-[#1a1a1a] rounded-[2.5rem] animate-pulse border border-gray-100 dark:border-white/5 shadow-sm space-y-4 p-4">
                    <div className="w-full h-1/2 bg-gray-200 dark:bg-white/5 rounded-2xl" />
                    <div className="w-3/4 h-4 bg-gray-200 dark:bg-white/5 rounded-lg" />
                    <div className="w-1/2 h-3 bg-gray-200 dark:bg-white/5 rounded-lg" />
                  </div>
                ))}
              </div>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6">
              {bestsellerProducts?.map(product => (
                <ProductCard key={product?.id} product={product} />
              ))}
            </div>
          </OzoLoadingGuard>
        </section>

        {/* Featured Packs */}
        <section>
          <div className="flex items-start justify-between gap-2 md:gap-4 mb-8">
             <div className="flex items-start gap-3 md:gap-4">
                <div className="w-12 h-12 bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 rounded-2xl flex items-center justify-center shadow-sm shrink-0 mt-0.5">
                   <Star size={24} />
                </div>
                <div className="min-w-0">
                   <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white leading-tight">Featured <span className="text-gradient">Packs.</span></h2>
                   <p className="text-xs sm:text-sm text-ozo-gray font-medium mt-1">Handpicked deals for your kitchen</p>
                </div>
             </div>
             <Link to="/products?filter=featured" className="text-ozo-red font-bold text-xs sm:text-sm flex items-center gap-1 hover:underline flex-shrink-0 whitespace-nowrap mt-1">
                View All <ArrowRight size={16} />
             </Link>
          </div>
          
          <OzoLoadingGuard
            isLoading={isFeaturedLoading}
            isError={isFeaturedError}
            isEmpty={!isFeaturedLoading && featuredProducts.length === 0}
            onRetry={refetchFeatured}
            skeleton={
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6 w-full">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="aspect-[3/4] bg-white dark:bg-[#1a1a1a] rounded-[2.5rem] animate-pulse border border-gray-100 dark:border-white/5 shadow-sm space-y-4 p-4">
                    <div className="w-full h-1/2 bg-gray-200 dark:bg-white/5 rounded-2xl" />
                    <div className="w-3/4 h-4 bg-gray-200 dark:bg-white/5 rounded-lg" />
                    <div className="w-1/2 h-3 bg-gray-200 dark:bg-white/5 rounded-lg" />
                  </div>
                ))}
              </div>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6">
              {featuredProducts?.map(product => (
                <ProductCard key={product?.id} product={product} />
              ))}
            </div>
          </OzoLoadingGuard>
        </section>

      </div>
    </div>
  )
}

export default Offers
