import { useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Heart, 
  Trash2, 
  ShoppingCart, 
  ArrowRight, 
  ShoppingBag,
  Clock,
  Zap,
  Info
} from 'lucide-react'
import { useWishlistStore } from '../stores/wishlistStore'
import { useCartStore } from '../stores/cartStore'
import { useTranslation } from '../hooks/useTranslation'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import useOzoQuery from '../hooks/useOzoQuery'
import OzoLoadingGuard from '../components/OzoLoadingGuard'
import OptimizedImage from '../components/OptimizedImage'

const Wishlist = () => {
  const { t } = useTranslation()
  const items = useWishlistStore(state => state.items)
  const fetchWishlist = useWishlistStore(state => state.fetchWishlist)
  const removeFromWishlist = useWishlistStore(state => state.removeFromWishlist)
  const addToCart = useCartStore(state => state.addToCart)

  const { isLoading: isWishlistLoading, isError, refetch } = useOzoQuery(
    async (signal) => {
      const res = await fetchWishlist({ signal })
      if (!res.success) {
        throw res.error || new Error('Failed to fetch wishlist')
      }
    },
    [fetchWishlist]
  )

  const handleAddToCart = useCallback((product) => {
    useCartStore.getState().addToCart(product)
  }, [])

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
      <div className="bg-white dark:bg-[#0d0d0d] border-b border-gray-100 dark:border-white/5 pt-12 pb-8">
        <div className="container-custom">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                 <div className="p-2 bg-pink-50 dark:bg-pink-500/10 rounded-xl text-pink-500">
                    <Heart size={24} fill="currentColor" />
                 </div>
                 <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white font-display">{renderTitle(t('wishlist') || 'My Wishlist')}</h1>
              </div>
              <p className="text-ozo-gray dark:text-gray-400 font-medium">Items you've saved for later</p>
            </div>
            {items.length > 0 && (
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 px-4 py-2 rounded-2xl border border-gray-100 dark:border-white/10">
                <span className="text-sm font-black text-gray-900 dark:text-white">{items.length}</span>
                <span className="text-xs font-bold text-ozo-gray dark:text-gray-500 uppercase tracking-widest">Items Saved</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container-custom py-12">
        <OzoLoadingGuard
          isLoading={isWishlistLoading}
          isError={isError}
          isEmpty={items.length === 0}
          onRetry={refetch}
          skeleton={
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white dark:bg-[#1a1a1a] rounded-[2.5rem] h-[400px] animate-pulse border border-gray-100 dark:border-white/5 p-6 flex flex-col justify-between">
                  <div className="w-full h-48 bg-gray-200 dark:bg-white/5 rounded-2xl mb-4" />
                  <div className="w-3/4 h-6 bg-gray-200 dark:bg-white/5 rounded-lg mb-2" />
                  <div className="w-1/2 h-4 bg-gray-200 dark:bg-white/5 rounded-lg mb-6" />
                  <div className="w-full h-12 bg-gray-200 dark:bg-white/5 rounded-2xl" />
                </div>
              ))}
            </div>
          }
          fallback={
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-24 h-24 bg-pink-50 dark:bg-pink-500/10 rounded-[2.5rem] flex items-center justify-center text-pink-500 mb-8 shadow-xl">
                <Heart size={48} />
              </div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Your Wishlist is Empty</h2>
              <p className="text-ozo-gray dark:text-gray-400 font-medium max-w-sm mb-10">
                Found something you like? Tap on the heart icon to save it here for later.
              </p>
              <Link to="/products" className="btn btn-primary px-10 rounded-2xl shadow-ozo flex items-center gap-2">
                Explore Products <ArrowRight size={20} />
              </Link>
            </div>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence mode="popLayout">
              {items.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white dark:bg-[#1a1a1a] rounded-[2.5rem] shadow-sm hover:shadow-xl border border-gray-100 dark:border-white/5 transition-shadow duration-300 overflow-hidden group flex flex-col"
                >
                  {/* Image Section */}
                  <div className="relative h-56 bg-gray-50 dark:bg-white/5 p-6 overflow-hidden">
                    <OptimizedImage 
                      src={item.image} 
                      slug={item.slug}
                      alt={item.name} 
                      width={300}
                      className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-700"
                      containerClassName="w-full h-full"
                    />
                    <div className="absolute top-4 left-4 flex flex-col gap-2">
                       <div className="px-3 py-1 bg-white/90 dark:bg-black/60 backdrop-blur-md rounded-lg text-[10px] font-black uppercase tracking-widest text-gray-900 dark:text-white border border-white/20">
                          {item.brand}
                       </div>
                    </div>
                    <button 
                      onClick={() => removeFromWishlist(item.id)}
                      className="absolute top-4 right-4 w-10 h-10 bg-white/90 dark:bg-black/60 backdrop-blur-md text-ozo-red rounded-xl flex items-center justify-center shadow-lg border border-white/20 hover:bg-ozo-red hover:text-white transition-all transform hover:rotate-6 active:scale-95"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  {/* Info Section */}
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.15em] text-ozo-gray dark:text-gray-500">{item.unit}</span>
                      </div>
                      <Link to={`/product/${item.slug}`}>
                        <h3 className="font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 hover:text-ozo-red transition-colors">
                          {item.name}
                        </h3>
                      </Link>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-50 dark:border-white/5">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <p className="text-xl font-black text-ozo-red font-display">₹{item.price.toLocaleString()}</p>
                          {item.mrp > item.price && (
                            <p className="text-xs text-ozo-gray dark:text-gray-500 line-through">₹{item.mrp.toLocaleString()}</p>
                          )}
                        </div>
                        {item.discountPercentage > 0 && (
                          <span className="px-2 py-1 bg-green-100 dark:bg-ozo-green/10 text-ozo-green text-[10px] font-black rounded-lg">
                            {item.discountPercentage}% OFF
                          </span>
                        )}
                      </div>

                      <button 
                        onClick={() => handleAddToCart({
                          id: item.productId,
                          name: item.name,
                          price: item.price,
                          image_url: item.image,
                          unit: item.unit
                        })}
                        className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-ozo text-white rounded-2xl font-black shadow-lg hover:shadow-ozo-lg transition-all active:scale-95"
                      >
                        <ShoppingCart size={20} />
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </OzoLoadingGuard>
      </div>

      {/* Recommended Section (Simple Promo) */}
      <div className="container-custom pb-12">
         <div className="bg-gradient-green rounded-[3rem] p-8 md:p-12 text-white relative overflow-hidden group">
            <div className="relative z-10 max-w-lg">
               <div className="flex items-center gap-3 mb-4">
                  <Zap size={24} className="text-yellow-400 fill-yellow-400" />
                  <span className="text-sm font-black uppercase tracking-widest opacity-90">Daily Deals</span>
               </div>
               <h2 className="text-3xl md:text-4xl font-black mb-6 leading-tight">Flash Sale is live! Get up to 60% off.</h2>
               <Link to="/products" className="inline-flex items-center gap-3 px-8 py-4 bg-white text-ozo-green rounded-2xl font-black shadow-xl hover:scale-105 transition-transform active:scale-95">
                  Grab Deals <ArrowRight size={20} />
               </Link>
            </div>
            <div className="absolute top-0 right-0 w-1/2 h-full opacity-20 pointer-events-none">
               <div className="absolute top-[-20%] right-[-10%] w-[80%] h-[80%] bg-white blur-[120px] rounded-full" />
            </div>
         </div>
      </div>
    </div>
  )
}

export default Wishlist
