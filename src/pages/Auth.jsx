import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ShoppingBag,
  Truck,
  Shield,
  Gift,
  ShoppingCart,
  Loader2,
  Home,
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import toast from 'react-hot-toast'
import OzoLogo from '../components/OzoLogo'

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false)

  const navigate = useNavigate()
  const location = useLocation()
  const { signInWithGoogle, isAuthenticated, profile } = useAuthStore()

  const getRedirectPath = () => {
    const searchParams = new URLSearchParams(location.search)
    const redirectParam = searchParams.get('redirect')
    if (redirectParam) {
      return redirectParam
    }
    if (location.state?.from) {
      if (typeof location.state.from === 'string') {
        return location.state.from
      }
      return `${location.state.from.pathname}${location.state.from.search || ''}`
    }
    return '/'
  }
  const from = getRedirectPath()

  useEffect(() => {
    if (isAuthenticated) {
      if (!profile?.phone) {
        navigate('/complete-profile', { replace: true })
      } else {
        navigate(from, { replace: true })
      }
    }
  }, [isAuthenticated, profile, navigate, from])

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    try {
      const result = await signInWithGoogle()
      if (result?.success) {
        toast.loading('Redirecting to Google...')
      }
    } catch (error) {
      console.error('Google Auth error:', error)
      toast.error('Google Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const features = [
    { icon: ShoppingBag, text: 'Wide range of daily essentials' },
    { icon: Truck, text: 'Superfast 30-minute delivery' },
    { icon: Shield, text: '100% secure payments' },
    { icon: Gift, text: 'Exclusive cashback & offers' },
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.5, staggerChildren: 0.1 }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row relative overflow-hidden bg-white dark:bg-[#060608]">
      {/* Left Side - Login Action */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-full lg:w-1/2 min-h-screen flex flex-col justify-between py-6 px-4 sm:px-8 bg-white dark:bg-[#060608] relative overflow-hidden"
      >
        {/* Glow orbs */}
        <div className="absolute top-[-10%] right-[-10%] w-72 h-72 bg-ozo-red/5 rounded-full filter blur-3xl opacity-75 pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-72 h-72 bg-amber-500/5 rounded-full filter blur-3xl opacity-75 pointer-events-none" />

        {/* Floating Home Button */}
        <div className="w-full flex justify-start z-50">
          <Link
            to="/"
            className="flex items-center gap-2 px-4.5 py-2.5 bg-white/70 dark:bg-black/30 backdrop-blur-md hover:bg-white dark:hover:bg-black/50 border border-gray-200/50 dark:border-white/10 hover:border-ozo-red/35 dark:hover:border-ozo-red/35 text-gray-800 dark:text-gray-200 hover:text-ozo-red dark:hover:text-ozo-red-light rounded-full transition-all duration-300 font-bold text-xs uppercase tracking-wider shadow-sm group"
          >
            <Home size={15} className="group-hover:scale-110 group-hover:-translate-y-0.5 transition-all duration-300 text-ozo-red dark:text-ozo-red-light" />
            <span>Home</span>
          </Link>
        </div>

        {/* Center Content */}
        <div className="w-full max-w-md mx-auto my-auto py-4 flex flex-col justify-center relative z-10">
          {/* Logo & Greeting */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 100, delay: 0.1 }}
            className="text-center mb-8"
          >
            <div className="relative inline-block mb-4">
              {/* Glow effect behind logo */}
              <div className="absolute inset-0 bg-ozo-red/20 rounded-full blur-2xl opacity-60 scale-75 animate-pulse-slow" />
              <OzoLogo mode="logo" size="xl" imgClassName="mx-auto transform hover:scale-105 hover:rotate-3 transition-transform duration-300" />
            </div>
            <h1 className="text-3xl sm:text-4.5xl font-black text-gray-900 dark:text-white tracking-tight text-center leading-tight">
              Welcome to{' '}
              <span className="inline-flex items-baseline gap-0.5 notranslate" translate="no">
                <span className="text-gradient drop-shadow-sm">OZO</span>
                <span 
                  style={{ fontFamily: "'Dancing Script', cursive" }} 
                  className="text-yellow-600 dark:text-yellow-400 font-extrabold text-[1em] tracking-wide normal-case translate-y-[-1px] select-none filter drop-shadow-md"
                >
                  mart
                </span>
              </span>
            </h1>
            <p className="text-ozo-gray dark:text-gray-400 mt-3 text-sm sm:text-base font-semibold text-center leading-relaxed">
              Get fresh produce delivered to your door in <span className="text-ozo-red dark:text-ozo-red-light font-black">30 minutes</span>
            </p>
          </motion.div>

          {/* Action Box */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6 bg-gray-50/50 dark:bg-white/[0.02] backdrop-blur-md p-4 sm:p-8 rounded-3xl border border-gray-150/50 dark:border-white/5 shadow-sm"
          >
            <motion.div variants={itemVariants} className="text-center">
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                Sign in with your Google account to start shopping
              </p>
            </motion.div>

            {/* Google Sign In Button */}
            <motion.div 
              variants={itemVariants}
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.985 }}
            >
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 px-3.5 py-3.5 sm:px-6 sm:py-4 border border-gray-200/80 dark:border-white/10 rounded-2xl bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 hover:border-ozo-red/35 dark:hover:border-ozo-red/35 transition-all duration-300 font-bold text-gray-700 dark:text-gray-200 shadow-sm hover:shadow-ozo dark:hover:shadow-ozo/20 disabled:opacity-60 disabled:cursor-not-allowed group"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-ozo-red" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" viewBox="0 0 24 24">
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
                    <span className="whitespace-nowrap text-sm sm:text-base">Continue with Google</span>
                  </>
                )}
              </button>
            </motion.div>

            {/* Footer terms */}
            <motion.div variants={itemVariants} className="text-center pt-2">
              <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 leading-relaxed px-4">
                By logging in, you agree to <span className="notranslate" translate="no">OZO</span>'s{' '}
                <a href="/terms" className="text-ozo-red dark:text-ozo-red-light font-black hover:text-ozo-red-dark dark:hover:text-white transition-colors duration-200">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="/privacy" className="text-ozo-red dark:text-ozo-red-light font-black hover:text-ozo-red-dark dark:hover:text-white transition-colors duration-200">
                  Privacy Policy
                </a>.
              </p>
            </motion.div>
          </motion.div>
        </div>

        {/* Empty bottom element to balance */}
        <div className="h-6" />
      </motion.div>

      {/* Right Side - Features / Hero Panel */}
      <div className="hidden lg:flex lg:flex-col lg:w-1/2 relative overflow-hidden">
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex-1 w-full bg-gradient-to-br from-[#FF3B30] via-ozo-red to-ozo-red-dark text-white p-12 flex items-center justify-center relative overflow-hidden"
        >
          {/* Animated ambient particles / blurred lights */}
          <div className="absolute top-[10%] right-[10%] w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none animate-float" style={{ animationDuration: '6s' }} />
          <div className="absolute bottom-[10%] left-[-10%] w-[450px] h-[450px] bg-red-400/20 rounded-full blur-3xl pointer-events-none animate-float" style={{ animationDuration: '8s', animationDelay: '2s' }} />
          <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none animate-pulse-slow" />
          
          {/* Decorative Grid Line Mask */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:30px_30px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

          <div className="max-w-md relative z-10">
            <h2 className="text-4xl font-black mb-6 leading-tight tracking-tight drop-shadow-md">
              Fresh produce, delivered in <span className="text-yellow-350 drop-shadow-[0_2px_10px_rgba(253,224,71,0.2)]">minutes.</span>
            </h2>
            <p className="text-lg mb-10 text-white/90 font-semibold leading-relaxed">
              Experience the future of fresh delivery. Get fresh fruits, vegetables, and Mithila specialties delivered lightning-fast.
            </p>

            {/* Features List */}
            <div className="space-y-5">
              {features.map((feature, index) => {
                const Icon = feature.icon
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 + 0.3 }}
                    whileHover={{ scale: 1.02, x: 5 }}
                    className="flex items-center gap-4 bg-white/[0.06] hover:bg-white/[0.12] backdrop-blur-xl p-4.5 rounded-2xl border border-white/[0.1] hover:border-white/[0.2] transition-all duration-300 shadow-lg shadow-black/10 group cursor-default"
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-white/20 to-white/5 shadow-inner border border-white/15 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <Icon className="w-6 h-6 text-white group-hover:rotate-12 transition-transform duration-300" />
                    </div>
                    <span className="font-extrabold text-base tracking-wide text-white/95">{feature.text}</span>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default Auth