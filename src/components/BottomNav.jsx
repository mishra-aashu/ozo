import { useEffect } from 'react'
import { NavLink, useLocation, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home,
  Search,
  LayoutGrid,
  User,
  ShoppingCart,
  ChevronRight,
  Bike,
  Clock,
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { useCartStore } from '../stores/cartStore'
import { useOrderStore } from '../stores/orderStore'

const getStatusText = (status) => {
  const s = status?.toUpperCase() || ''
  if (s.includes('PLACED')) return 'Order Placed'
  if (s.includes('CONFIRM')) return 'Confirmed & Preparing'
  if (s.includes('PREPAR')) return 'Preparing Your Order'
  if (s.includes('RIDER') || s.includes('ASSIGN') || s.includes('PICK') || s.includes('OUT') || s.includes('DELIVERY')) return 'Out for Delivery!'
  return 'Processing Order'
}

const BottomNav = () => {
  const location = useLocation()
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const totalItems = useCartStore(state => state.totalItems)
  const subtotal = useCartStore(state => state.subtotal)
  const cartItems = useCartStore(state => state.items)
  
  const activeOrder = useOrderStore(state => state.activeOrder)
  const fetchActiveOrder = useOrderStore(state => state.fetchActiveOrder)

  useEffect(() => {
    if (isAuthenticated) {
      fetchActiveOrder()
      const interval = setInterval(() => {
        fetchActiveOrder()
      }, 15000)
      return () => clearInterval(interval)
    }
  }, [isAuthenticated, fetchActiveOrder])

  const shouldShowActiveOrder = activeOrder && !location.pathname.startsWith('/order/')
  const shouldShowCartBanner = totalItems > 0 && !activeOrder && !['/cart', '/checkout'].includes(location.pathname)

  const navItems = [
    {
      icon: Home,
      label: 'Home',
      path: '/',
      color: 'text-ozo-red',
    },
    {
      icon: LayoutGrid,
      label: 'Categories',
      path: '/categories',
      color: 'text-ozo-yellow',
    },
    {
      icon: Search,
      label: 'Search',
      path: '/search',
      color: 'text-ozo-green',
    },
    {
      icon: ShoppingCart,
      label: 'Cart',
      path: '/cart',
      color: 'text-ozo-green',
      badge: totalItems,
    },
    {
      icon: User,
      label: isAuthenticated ? 'Profile' : 'Login',
      path: isAuthenticated ? '/profile' : '/auth',
      color: 'text-ozo-red',
    },
  ]

  const checkIsActive = (path) => {
    const current = location.pathname
    if (path === '/') {
      return (
        current === '/' ||
        (!current.startsWith('/admin') &&
         !['/categories', '/category/', '/search', '/cart', '/checkout', '/profile', '/auth', '/help', '/offers', '/orders', '/order/', '/product/', '/combo/', '/wishlist', '/notifications', '/settings', '/referral'].some(p => current.startsWith(p)))
      )
    }
    if (path === '/categories') {
      return current.startsWith('/categories') || current.startsWith('/category/')
    }
    if (path === '/search') {
      return current.startsWith('/search')
    }
    if (path === '/cart') {
      return current.startsWith('/cart') || current.startsWith('/checkout')
    }
    if (path === '/profile' || path === '/auth') {
      return (
        current.startsWith('/profile') ||
        current.startsWith('/auth') ||
        current.startsWith('/orders') ||
        current.startsWith('/order/') ||
        current.startsWith('/wishlist') ||
        current.startsWith('/notifications') ||
        current.startsWith('/settings') ||
        current.startsWith('/referral')
      )
    }
    return current === path
  }

  // Hide on admin routes
  if (location.pathname.startsWith('/admin')) {
    return null
  }

  return (
    <>
      <AnimatePresence>
        {shouldShowActiveOrder && (
          <motion.div
            key="active-order"
            initial={{ opacity: 0, y: 40, scale: 0.95, x: '-50%' }}
            animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
            exit={{ opacity: 0, y: 40, scale: 0.95, x: '-50%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 360 }}
            className="fixed bottom-[calc(96px+env(safe-area-inset-bottom,0px))] md:bottom-6 left-1/2 w-max max-w-[calc(100%-2rem)] bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-full py-1.5 pl-3 pr-2 flex items-center shadow-[0_8px_20px_rgba(249,115,22,0.25)] z-50 border border-white/10"
          >
            <Link
              to={`/order/${activeOrder.id}`}
              className="flex items-center gap-2 w-full"
            >
              {activeOrder.order_items && activeOrder.order_items.length > 0 ? (
                <div className="flex items-center -space-x-3.5 flex-shrink-0 mr-0.5">
                  {activeOrder.order_items.slice(0, 2).map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="w-8 h-8 rounded-full overflow-hidden border border-white bg-white shadow-md shrink-0 flex items-center justify-center"
                      style={{ zIndex: idx }}
                    >
                      {item.product_image ? (
                        <img
                          src={item.product_image}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ShoppingCart className="w-3.5 h-3.5 text-zinc-400" />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center shadow-inner shrink-0">
                  {['preparing', 'preparation', 'PREPARING'].some(s => activeOrder.status?.toUpperCase()?.includes(s)) ? (
                    <Clock className="w-4 h-4 text-white animate-pulse" />
                  ) : (
                    <Bike className="w-4 h-4 text-white animate-bounce-slow" />
                  )}
                </div>
              )}
              
              <div className="text-left pr-1.5">
                <p className="text-[12.5px] font-black text-white leading-tight">Track Order</p>
                <p className="text-[10px] font-bold text-orange-100 leading-none mt-0.5">
                  {getStatusText(activeOrder.status)}
                </p>
              </div>

              <div className="w-7 h-7 rounded-full bg-black/15 flex items-center justify-center shrink-0">
                <ChevronRight className="w-4 h-4 text-white" />
              </div>
            </Link>
          </motion.div>
        )}

        {shouldShowCartBanner && (
          <motion.div
            key="cart-banner"
            initial={{ opacity: 0, y: 40, scale: 0.95, x: '-50%' }}
            animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
            exit={{ opacity: 0, y: 40, scale: 0.95, x: '-50%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 360 }}
            className={`fixed ${shouldShowActiveOrder ? 'bottom-[calc(152px+env(safe-area-inset-bottom,0px))] md:bottom-20' : 'bottom-[calc(96px+env(safe-area-inset-bottom,0px))] md:bottom-6'} left-1/2 w-max max-w-[calc(100%-2rem)] bg-[#0c831f] text-white rounded-full py-1.5 pl-3 pr-2 flex items-center shadow-[0_8px_20px_rgba(12,131,31,0.25)] z-50 border border-white/10`}
          >
            <Link
              to="/cart"
              className="flex items-center gap-2 w-full"
            >
              {cartItems && cartItems.length > 0 ? (
                <div className="flex items-center -space-x-3.5 flex-shrink-0 mr-0.5">
                  {cartItems.slice(0, 2).map((item, idx) => (
                    <div
                      key={item.id || item.productId || idx}
                      className="w-8 h-8 rounded-full overflow-hidden border border-white bg-white shadow-md shrink-0 flex items-center justify-center"
                      style={{ zIndex: idx }}
                    >
                      {item.image ? (
                        <img
                          src={item.image}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ShoppingCart className="w-3.5 h-3.5 text-zinc-400" />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center shadow-inner shrink-0">
                  <ShoppingCart className="w-4 h-4 text-white" />
                </div>
              )}
              
              <div className="text-left pr-1.5">
                <p className="text-[12.5px] font-black text-white leading-tight">View cart</p>
                <p className="text-[10px] font-bold text-white/85 leading-none mt-0.5">
                  {totalItems} item{totalItems > 1 ? 's' : ''} {subtotal > 0 && `• ₹${subtotal}`}
                </p>
              </div>

              <div className="w-7 h-7 rounded-full bg-black/15 flex items-center justify-center shrink-0">
                <ChevronRight className="w-4 h-4 text-white" />
              </div>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      <nav 
        className="fixed bottom-0 left-0 right-0 backdrop-blur-md bg-white/85 dark:bg-black/70 border-t border-gray-200/50 dark:border-white/10 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] dark:shadow-[0_-8px_30px_rgba(0,0,0,0.5)] z-50 md:hidden transition-colors duration-200"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-center justify-around h-20 px-2">
          {navItems.map((item) => {
            const active = checkIsActive(item.path)
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={
                  `flex flex-col items-center justify-center py-2 px-3 outline-none transition-all duration-150 ${
                    active 
                      ? 'text-zinc-900 dark:text-white' 
                      : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                  }`
                }
              >
                <motion.div
                  whileTap={{ scale: 0.95 }}
                  className="relative flex flex-col items-center justify-center gap-1"
                >
                  {/* Icon with animation */}
                  <div className="relative">
                    <motion.div
                      animate={{
                        scale: active ? 1.12 : 1,
                        y: active ? -3 : 0,
                      }}
                      transition={{ type: 'spring', stiffness: 600, damping: 25 }}
                      className={`p-1.5 rounded-xl transition-colors duration-150 ${
                        active ? 'bg-zinc-100 dark:bg-white/10' : 'bg-transparent'
                      }`}
                    >
                      <item.icon
                        size={24}
                        strokeWidth={active ? 2.5 : 2}
                        className={active ? item.color : 'text-zinc-400 dark:text-zinc-500'}
                      />
                    </motion.div>

                    {/* Cart Badge */}
                    {item.badge > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-ozo-red text-white text-[8px] rounded-full flex items-center justify-center font-black border border-white dark:border-[#0d0d0d] shadow-sm">
                        {item.badge}
                      </span>
                    )}
                  </div>
   
                  {/* Label */}
                  <span
                    className={`text-[8px] xs:text-[9.5px] uppercase tracking-wider transition-all duration-150 ${
                      active 
                        ? 'font-black text-zinc-900 dark:text-white scale-105' 
                        : 'font-semibold text-zinc-400 dark:text-zinc-550'
                    }`}
                  >
                    {item.label}
                  </span>
   
                  {/* Active indicator bar */}
                  {active && (
                    <motion.div
                      layoutId="bottomNavIndicator"
                      className="absolute -bottom-2 w-6 h-1 bg-gradient-to-r from-ozo-red to-ozo-red-light rounded-full shadow-[0_2px_8px_rgba(226,55,68,0.5)] dark:shadow-[0_2px_8px_rgba(226,55,68,0.8)]"
                      transition={{ type: 'spring', stiffness: 600, damping: 25 }}
                    />
                  )}
                </motion.div>
              </NavLink>
            )
          })}
        </div>
      </nav>
    </>
  )
}

export default BottomNav