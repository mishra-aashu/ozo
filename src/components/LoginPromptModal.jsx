import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, 
  Sparkles, 
  Zap, 
  ShoppingBag, 
  Truck, 
  ShieldCheck, 
  CheckCircle2, 
  Loader2, 
  ArrowRight 
} from 'lucide-react'
import { useLocation, Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import OzoLogo from './OzoLogo'
import toast from 'react-hot-toast'

export default function LoginPromptModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { isAuthenticated, signInWithGoogle } = useAuthStore()
  const location = useLocation()

  // Routes where the modal must never be shown
  const isExcludedRoute = 
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/auth') ||
    location.pathname.startsWith('/mart') ||
    location.pathname.startsWith('/captain') ||
    location.pathname.startsWith('/rider-dashboard') ||
    location.pathname.startsWith('/capture')

  useEffect(() => {
    // If authenticated or on an excluded route, close immediately
    if (isAuthenticated || isExcludedRoute) {
      setIsOpen(false)
      return
    }

    // Check if dismissed in this session
    const isDismissed = sessionStorage.getItem('ozo_login_prompt_dismissed') === 'true'
    if (isDismissed) return

    // Show after 2.5s for new guest visitors so initial page paint is smooth
    const timer = setTimeout(() => {
      // Re-verify auth & dismissed status before opening
      const currentlyDismissed = sessionStorage.getItem('ozo_login_prompt_dismissed') === 'true'
      if (!useAuthStore.getState().isAuthenticated && !currentlyDismissed) {
        setIsOpen(true)
      }
    }, 2500)

    return () => clearTimeout(timer)
  }, [isAuthenticated, isExcludedRoute, location.pathname])

  // Allow external triggers (e.g. window.dispatchEvent(new CustomEvent('open_login_modal')))
  useEffect(() => {
    const handleOpen = () => {
      if (!useAuthStore.getState().isAuthenticated) {
        setIsOpen(true)
      }
    }
    window.addEventListener('open_login_modal', handleOpen)
    return () => window.removeEventListener('open_login_modal', handleOpen)
  }, [])

  const handleClose = () => {
    sessionStorage.setItem('ozo_login_prompt_dismissed', 'true')
    setIsOpen(false)
  }

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    try {
      const result = await signInWithGoogle()
      if (result?.success) {
        toast.loading('Connecting to Google...')
      }
    } catch (error) {
      console.error('Google Auth Error:', error)
      toast.error('Google Sign-in failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isAuthenticated || isExcludedRoute) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          {/* Backdrop Blur Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/65 backdrop-blur-md transition-opacity"
          />

          {/* Modal Card - Flipkart-style split container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="relative w-full max-w-[760px] bg-white dark:bg-[#121217] rounded-3xl sm:rounded-[2rem] shadow-2xl overflow-hidden border border-gray-100 dark:border-white/10 flex flex-col md:flex-row z-10 my-auto"
          >
            {/* Close Button ('X') - Floating at top right */}
            <button
              onClick={handleClose}
              aria-label="Close login popup"
              className="absolute top-3.5 right-3.5 z-30 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20 text-gray-600 dark:text-gray-300 flex items-center justify-center transition-all duration-200 active:scale-90"
            >
              <X size={18} strokeWidth={2.5} />
            </button>

            {/* LEFT COLUMN: OZO Brand Hero & Benefits (Flipkart Blue Banner equivalent) */}
            <div className="w-full md:w-[42%] bg-gradient-to-br from-ozo-red via-rose-600 to-rose-700 text-white p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden shrink-0">
              {/* Background ambient lighting */}
              <div className="absolute top-0 right-0 w-44 h-44 bg-white/10 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-yellow-400/15 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 space-y-4">
                {/* Logo & Tag */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-[10px] font-black uppercase tracking-wider">
                  <Sparkles size={12} className="text-yellow-300" />
                  <span>Welcome to OZO</span>
                </div>

                <div className="space-y-1">
                  <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
                    Login / Sign up
                  </h2>
                  <p className="text-xs sm:text-sm text-white/90 font-medium leading-relaxed">
                    Get access to your Orders, Wishlist and Express 30-min Delivery.
                  </p>
                </div>

                {/* Benefits Bullet Points */}
                <div className="space-y-2.5 pt-2 hidden sm:block">
                  <div className="flex items-center gap-2 text-xs font-semibold text-white/95">
                    <div className="w-5 h-5 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                      <Zap size={11} className="text-yellow-300" />
                    </div>
                    <span>Superfast 30-min Express Delivery</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-white/95">
                    <div className="w-5 h-5 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                      <Truck size={11} className="text-white" />
                    </div>
                    <span>Live GPS Rider Order Tracking</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-white/95">
                    <div className="w-5 h-5 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                      <ShieldCheck size={11} className="text-emerald-300" />
                    </div>
                    <span>100% Secure Instant Payments</span>
                  </div>
                </div>
              </div>

              {/* Bottom Decorative Graphic (Laptop/Shopping cart illustration like Flipkart) */}
              <div className="relative z-10 pt-6 mt-auto hidden md:flex items-center justify-center">
                <div className="w-full bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/15 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white text-ozo-red flex items-center justify-center shadow-md shrink-0">
                    <ShoppingBag size={20} className="stroke-[2.5]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-wider text-yellow-300">
                      Fresh Mart & Services
                    </p>
                    <p className="text-[10px] text-white/80 font-medium truncate">
                      Groceries delivered at your doorstep
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: 1-Click Google Sign-in & Actions */}
            <div className="w-full md:w-[58%] p-6 sm:p-9 flex flex-col justify-between">
              <div className="space-y-6">
                {/* Header */}
                <div className="space-y-1.5 pr-6">
                  <h3 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white tracking-tight leading-snug">
                    Log in for the best experience
                  </h3>
                  <p className="text-xs sm:text-[13px] text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                    Sign in with Google in 1 click to save addresses, track orders, and get personalized member offers.
                  </p>
                </div>

                {/* Primary Google 1-Click Login Button */}
                <div className="space-y-3 pt-1">
                  <motion.button
                    whileHover={{ scale: 1.015 }}
                    whileTap={{ scale: 0.985 }}
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-3.5 px-5 py-3.5 sm:py-4 rounded-2xl bg-white dark:bg-[#1a1a24] hover:bg-gray-50 dark:hover:bg-[#22222e] border-2 border-gray-200 dark:border-white/10 hover:border-ozo-red/40 dark:hover:border-ozo-red/40 text-gray-800 dark:text-gray-100 font-black text-sm sm:text-base shadow-sm hover:shadow-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed group"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin text-ozo-red" />
                        <span>Connecting to Google...</span>
                      </>
                    ) : (
                      <>
                        {/* Google Multicolor 'G' SVG Logo */}
                        <svg className="w-5 h-5 shrink-0 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                          />
                        </svg>
                        <span>Continue with Google</span>
                      </>
                    )}
                  </motion.button>

                  {/* Or browse as guest */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="text-xs font-bold text-gray-500 hover:text-ozo-red dark:text-gray-400 dark:hover:text-white transition-colors"
                    >
                      Browse store first as Guest →
                    </button>

                    <Link
                      to="/auth"
                      onClick={handleClose}
                      className="text-xs font-bold text-ozo-red hover:underline"
                    >
                      Use Email / Password
                    </Link>
                  </div>
                </div>

                {/* Perks Checklist */}
                <div className="pt-2 pb-1 border-t border-gray-100 dark:border-white/5 space-y-2">
                  <div className="flex items-center gap-2 text-[11px] sm:text-xs font-bold text-gray-600 dark:text-gray-300">
                    <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                    <span>Instant access — No password setup required</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] sm:text-xs font-bold text-gray-600 dark:text-gray-300">
                    <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                    <span>Auto-saves your cart & delivery addresses</span>
                  </div>
                </div>
              </div>

              {/* Legal Disclaimer */}
              <div className="pt-4 mt-4 border-t border-gray-100 dark:border-white/5">
                <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium text-center leading-relaxed">
                  By continuing, you agree to OZO's{' '}
                  <Link to="/terms" onClick={handleClose} className="text-ozo-red font-bold hover:underline">
                    Terms of Use
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy" onClick={handleClose} className="text-ozo-red font-bold hover:underline">
                    Privacy Policy
                  </Link>.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
