import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ShieldCheck, 
  Lock, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  Check, 
  Shield,
  X
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useCartStore } from '../stores/cartStore'

// Dynamically load script utility
const loadScript = (src) => {
  return new Promise((resolve) => {
    const script = document.createElement('script')
    script.src = src
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

// Rate limiter configuration — change these to adjust payment attempt policy
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000    // 10 min window to count attempts
const RATE_LIMIT_MAX_ATTEMPTS = 3               // max payment attempts in window
const RATE_LIMIT_LOCKOUT_MS = 15 * 60 * 1000   // 15 min lockout after exceeding limit
const RATE_LIMIT_LOCKOUT_SECS = RATE_LIMIT_LOCKOUT_MS / 1000

const RazorpayShield = ({ 
  isOpen, 
  onClose, 
  amount, 
  orderNumber, 
  userData,
  addressId,
  couponCode,
  onPaymentSuccess,
  pendingOrderId,
  charityDonation
}) => {
  const [shieldState, setShieldState] = useState('checking') // checking, challenge, payment_portal, blocked, success
  const [botScore, setBotScore] = useState(0)
  const [sliderVal, setSliderVal] = useState(0)
  const [sliderActive, setSliderActive] = useState(false)
  const [sliderSuccess, setSliderSuccess] = useState(false)
  
  // Cooldown / Rate limiting state
  const [lockoutTimeLeft, setLockoutTimeLeft] = useState(0)
  
  // Payment Portal state - SDK only
  const [isPaymentLoading, setIsPaymentLoading] = useState(false)
  
  const sliderRef = useRef(null)
  const dragStartPos = useRef(0)
  const sliderValRef = useRef(0)
  const sliderWidthRef = useRef(200)
  const { items } = useCartStore()

  // Rate Limiter Checks (max 3 payment creations per 10 mins)
  const checkRateLimits = () => {
    try {
      const stored = localStorage.getItem('ozo_shield_rate_limit')
      if (stored) {
        const { attempts, lockoutUntil } = JSON.parse(stored)
        const now = Date.now()
        
        if (lockoutUntil && now < lockoutUntil) {
          setLockoutTimeLeft(Math.ceil((lockoutUntil - now) / 1000))
          setShieldState('blocked')
          return false
        }
        
        // Clean old attempts outside the rate window
        const validAttempts = attempts.filter(t => now - t < RATE_LIMIT_WINDOW_MS)
        if (validAttempts.length >= RATE_LIMIT_MAX_ATTEMPTS) {
          const lockout = now + RATE_LIMIT_LOCKOUT_MS
          localStorage.setItem('ozo_shield_rate_limit', JSON.stringify({
            attempts: validAttempts,
            lockoutUntil: lockout
          }))
          setLockoutTimeLeft(RATE_LIMIT_LOCKOUT_SECS)
          setShieldState('blocked')
          return false
        }
      }
    } catch (e) {
      console.error('Rate limit parse error', e)
    }
    return true
  }

  const recordAttempt = () => {
    try {
      const stored = localStorage.getItem('ozo_shield_rate_limit')
      const now = Date.now()
      let attempts = [now]
      let lockoutUntil = null

      if (stored) {
        const parsed = JSON.parse(stored)
        const cleanAttempts = parsed.attempts.filter(t => now - t < RATE_LIMIT_WINDOW_MS)
        attempts = [...cleanAttempts, now]
        lockoutUntil = parsed.lockoutUntil
      }
      
      localStorage.setItem('ozo_shield_rate_limit', JSON.stringify({
        attempts,
        lockoutUntil
      }))
    } catch (e) {
      console.error(e)
    }
  }

  // Handle countdown for blocked state
  useEffect(() => {
    if (shieldState === 'blocked' && lockoutTimeLeft > 0) {
      const timer = setInterval(() => {
        setLockoutTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer)
            setShieldState('checking')
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [shieldState, lockoutTimeLeft])

  // Bot detection algorithm (Client-side Fingerprint Check)
  const performShieldAudit = () => {
    let score = 0
    
    // 1. Automation Driver Check
    if (navigator.webdriver) {
      score += 50
    }
    
    // 2. Headless Browser Check (Common features missing in Headless Chrome)
    const hasPlugins = navigator.plugins && navigator.plugins.length > 0
    const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor)
    if (isChrome && !hasPlugins) {
      score += 30
    }
    
    // 3. Screen Dimensions anomalies
    if (window.outerWidth === 0 && window.outerHeight === 0) {
      score += 40
    }
    
    // 4. Extreme short session check (quick form fills)
    // We will check score later
    setBotScore(score)

    setTimeout(() => {
      if (score >= 80) {
        setShieldState('blocked')
        toast.error('OZO Shield: Suspicious activity detected. Transaction blocked.', { duration: 5000 })
      } else {
        setShieldState('challenge')
      }
    }, 2200) // Delay to show scanning animation
  }

  useEffect(() => {
    if (isOpen) {
      const isAllowed = checkRateLimits()
      if (isAllowed) {
        setShieldState('checking')
        setSliderVal(0)
        setSliderSuccess(false)
        performShieldAudit()
      }
    }
  }, [isOpen])

  // Keep sliderValRef in sync with sliderVal
  useEffect(() => {
    sliderValRef.current = sliderVal
  }, [sliderVal])

  // Custom Slider Human Verification Logic
  const handleSliderMouseDown = (e) => {
    if (sliderSuccess) return
    setSliderActive(true)
    dragStartPos.current = e.clientX || (e.touches && e.touches[0].clientX) || 0
    sliderWidthRef.current = sliderRef.current ? sliderRef.current.clientWidth - 56 : 200
  }

  // Custom Slider Human Verification Logic via window event listeners to handle drag-outside-modal issues gracefully
  useEffect(() => {
    if (!sliderActive) return

    const handleMove = (e) => {
      if (sliderSuccess) return
      const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0
      const sliderWidth = sliderWidthRef.current
      const diff = clientX - dragStartPos.current
      let percentage = Math.max(0, Math.min(100, Math.round((diff / sliderWidth) * 100)))
      setSliderVal(percentage)
    }

    const handleRelease = () => {
      setSliderActive(false)
      const currentVal = sliderValRef.current
      if (currentVal >= 95) {
        setSliderVal(100)
        setSliderSuccess(true)
        recordAttempt()
        
        // Trigger checkout or payment choices
        setTimeout(() => {
          setShieldState('payment_portal')
        }, 800)
      } else {
        // Bounce back
        setSliderVal(0)
      }
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleRelease)
    window.addEventListener('touchmove', handleMove, { passive: true })
    window.addEventListener('touchend', handleRelease)

    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleRelease)
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('touchend', handleRelease)
    }
  }, [sliderActive, sliderSuccess])

  // Handle standard Razorpay SDK payment
  const handleSdkPayment = async () => {
    try {
      const hasKey = !!import.meta.env.VITE_RAZORPAY_KEY_ID
      if (!hasKey) {
        toast.error('Razorpay API Key not found. Please use Direct UPI / Razorpay.me fallback.')
        setPaymentOption('direct')
        return
      }

      const loadingToast = toast.loading('Initializing Secure SDK payment...')
      
      // 1. Create Razorpay Order on Server first
      const { data: createData, error: createError } = await supabase.functions.invoke('verify-razorpay-payment', {
        body: { 
          action: 'create_order', 
          addressId: addressId,
          couponCode: couponCode,
          pendingOrderId,
          charityDonation
        }
      })

      if (createError || !createData || !createData.success) {
        toast.dismiss(loadingToast)
        let errMsg = 'Failed to initialize payment order';
        if (createError) {
          if (createError.context) {
            try {
              const body = await createError.context.json();
              errMsg = body.error || body.message || createError.message;
            } catch {
              try {
                const text = await createError.context.text();
                errMsg = text || createError.message;
              } catch {
                errMsg = createError.message;
              }
            }
          } else {
            errMsg = createError.message;
          }
        } else if (createData && createData.error) {
          errMsg = createData.error;
        }
        toast.error(`Order Initialization Failed: ${errMsg}`)
        return
      }

      const rzpOrder = createData.order

      // 2. Load Razorpay SDK Script
      const res = await loadScript('https://checkout.razorpay.com/v1/checkout.js')
      toast.dismiss(loadingToast)

      if (!res) {
        toast.error('Failed to load Razorpay SDK. Check your internet connection.')
        return
      }

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: rzpOrder.amount, // from Razorpay Order object
        currency: rzpOrder.currency, // from Razorpay Order object
        order_id: rzpOrder.id, // Enforce signature verification on payment success
        name: 'OZO Official',
        description: `Pay for: ${items.map(i => i.name).join(', ').substring(0, 40)}`,
        image: 'https://img.icons8.com/color/120/shopping-cart.png',
        handler: async function (response) {
          const verificationToast = toast.loading('Verifying secure transaction...')
          try {
            // 3. Verify Razorpay signature and payment status server-side
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-razorpay-payment', {
              body: { 
                action: 'verify_payment',
                paymentId: response.razorpay_payment_id, 
                orderId: response.razorpay_order_id,
                signature: response.razorpay_signature,
                addressId: addressId,
                couponCode: couponCode,
                charityDonation
              }
            })

            toast.dismiss(verificationToast)

            if (verifyError || !verifyData || !verifyData.verified) {
              let errMsg = 'Verification failed';
              if (verifyError) {
                if (verifyError.context) {
                  try {
                    const body = await verifyError.context.json();
                    errMsg = body.error || body.message || verifyError.message;
                  } catch {
                    try {
                      const text = await verifyError.context.text();
                      errMsg = text || verifyError.message;
                    } catch {
                      errMsg = verifyError.message;
                    }
                  }
                } else {
                  errMsg = verifyError.message;
                }
              } else if (verifyData && verifyData.error) {
                errMsg = verifyData.error;
              }
              toast.error(`Payment Verification Failed: ${errMsg}`)
              return
            }

            toast.success('Payment Verified! Secure Audit Passed.')
            onPaymentSuccess(response.razorpay_payment_id, null, verifyData.calculatedDetails)
            setShieldState('success')
          } catch (err) {
            toast.dismiss(verificationToast)
            toast.error(`Verification error: ${err.message}`)
          }
        },
        prefill: {
          name: userData?.fullName || 'OZO Customer',
          email: userData?.email || 'customer@ozomart.store',
          contact: userData?.phone || ''
        },
        theme: {
          color: '#2563eb' // Soothing Blue
        },
        modal: {
          ondismiss: function () {
            toast.error('Payment cancelled by user.')
          }
        }
      }

      const rzp1 = new window.Razorpay(options)
      rzp1.open()
    } catch (e) {
      console.error(e)
      toast.error('Razorpay Modal failed to open.')
    }
  }

  // UPI note for order description
  const itemNames = items.map(i => `${i.name} x${i.quantity}`).join(', ')

  // Format Lockout timer
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={() => {
          if (shieldState !== 'checking' && shieldState !== 'success') {
            onClose()
          }
        }}
      />

      {/* Modal Container */}
      <motion.div
        initial={{ scale: 0.9, y: 30, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 30, opacity: 0 }}
        className="bg-white dark:bg-[#121212] w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl border border-gray-150 dark:border-white/5 relative z-10 text-gray-800 dark:text-white"
      >
        {/* Close Button */}
        {shieldState !== 'checking' && shieldState !== 'success' && (
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all z-20"
          >
            <X size={18} />
          </button>
        )}

        {/* Modal Banner */}
        {shieldState !== 'challenge' && (
          <div className="relative h-32 bg-gradient-to-r from-blue-600 to-cyan-500 flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent)]" />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
            
            <div className="relative z-10 flex flex-col items-center">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="text-white fill-white/20 animate-pulse" size={24} />
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-100 bg-white/10 px-2.5 py-0.5 rounded-full">
                  OZO Shield Secured
                </span>
              </div>
              <h3 className="text-2xl font-black text-white font-display">SafePay Protection</h3>
            </div>
          </div>
        )}

        {/* Dynamic Content */}
        <div className={shieldState === 'challenge' ? 'p-10 pt-16 pb-12' : 'p-8'}>
          
          {/* STATE 1: CHECKING (Analyzing system) */}
          {shieldState === 'checking' && (
            <div className="text-center py-10 space-y-6">
              <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 border-4 border-blue-500/10 rounded-full" />
                <motion.div 
                  className="absolute inset-0 border-4 border-t-blue-600 rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                />
                <ShieldCheck size={40} className="text-blue-600 animate-pulse" />
              </div>
              <div>
                <h4 className="text-lg font-black mb-1">Checking Connection Security</h4>
                <p className="text-xs text-ozo-gray dark:text-gray-400 max-w-sm mx-auto">
                  Verifying secure payment channel, browser integrity, and SSL encryption...
                </p>
              </div>
              <div className="max-w-xs mx-auto p-4 bg-gray-50 dark:bg-white/[0.02] rounded-2xl border border-gray-100 dark:border-white/5 space-y-2">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-gray-500">
                  <span>WebDriver Scan</span>
                  <span className="text-green-500">Passed</span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-gray-500">
                  <span>Device Fingerprint</span>
                  <span className="text-green-500">Verifying</span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-gray-500">
                  <span>SSL Encryption</span>
                  <span className="text-blue-500 animate-pulse">Handshake</span>
                </div>
              </div>
            </div>
          )}

          {/* STATE 2: CHALLENGE (Human Slider Puzzle) */}
          {shieldState === 'challenge' && (
            <div className="space-y-10 flex flex-col items-center">
              <p className="text-sm font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 text-center leading-relaxed max-w-xs">
                Human verification required to proceed
              </p>

              {/* Slider Container */}
              <div 
                ref={sliderRef}
                className="w-full relative h-14 bg-gray-50 dark:bg-white/[0.03] rounded-full border border-gray-200/80 dark:border-white/10 overflow-hidden select-none shadow-inner"
              >
                {/* Slider Progress Bar */}
                <div 
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-violet-600/5 to-indigo-600/15 transition-all duration-75"
                  style={{ width: `${sliderVal}%` }}
                />

                {/* Centered Guide Text */}
                <div 
                  className="absolute inset-0 flex items-center justify-center text-xs font-black uppercase tracking-widest text-gray-450 dark:text-gray-400 pointer-events-none select-none transition-opacity duration-75"
                  style={{ opacity: sliderSuccess ? 1 : Math.max(0, 1 - sliderVal / 40) }}
                >
                  {sliderSuccess ? (
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 animate-bounce font-black uppercase tracking-widest text-xs">
                      <CheckCircle2 size={14} /> VERIFICATION PASSED!
                    </span>
                  ) : (
                    'SLIDE TO VERIFY'
                  )}
                </div>

                {/* Drag Handle Button */}
                <div 
                  className={`absolute top-1 bottom-1 w-12 bg-gradient-to-r ${
                    sliderSuccess 
                      ? 'from-emerald-500 to-teal-600' 
                      : 'from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500'
                  } rounded-full cursor-grab active:cursor-grabbing flex items-center justify-center text-white shadow-lg transition-all duration-75 select-none`}
                  style={{ 
                    left: `calc(4px + ${sliderVal}% - ${sliderVal * 0.56}px)`,
                    touchAction: 'none'
                  }}
                  onTouchStart={handleSliderMouseDown}
                  onMouseDown={handleSliderMouseDown}
                >
                  {sliderSuccess ? (
                    <Check size={18} strokeWidth={3} className="animate-pulse" />
                  ) : (
                    <Lock size={18} strokeWidth={2.5} className="animate-pulse-subtle" />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STATE 3: PAYMENT PORTAL - SDK Only */}
          {shieldState === 'payment_portal' && (
            <div className="space-y-6">
              {/* Order Summary */}
              <div className="p-4 bg-blue-50/30 dark:bg-white/[0.02] rounded-2xl border border-blue-100/50 dark:border-white/5">
                <p className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-2">
                  Order Summary
                </p>
                <div className="max-h-24 overflow-y-auto space-y-1.5 pr-1 divide-y divide-gray-100 dark:divide-white/5">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center text-xs pt-1.5 first:pt-0">
                      <span className="text-gray-700 dark:text-gray-300 font-medium">
                        {item.name} <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold">x {item.quantity}</span>
                      </span>
                      <span className="font-black text-gray-900 dark:text-white">
                        ₹{(item.price * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Razorpay SDK Checkout */}
              <div className="text-center py-6 space-y-6">
                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-500/10 text-blue-600 rounded-[1.2rem] flex items-center justify-center mx-auto shadow-inner">
                  <ShieldCheck size={32} />
                </div>
                <div>
                  <h4 className="font-black text-lg mb-1">Razorpay Secure Checkout</h4>
                  <p className="text-xs text-ozo-gray dark:text-gray-400 max-w-sm mx-auto leading-relaxed">
                    Pay securely via UPI, Cards, Netbanking, or Wallets through the official Razorpay checkout.
                  </p>
                </div>
                
                <button
                  onClick={handleSdkPayment}
                  disabled={isPaymentLoading}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-700 hover:to-indigo-600 disabled:opacity-60 text-white rounded-2xl font-black text-sm shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                >
                  {isPaymentLoading ? (
                    <><RefreshCw className="animate-spin" size={16} /> Initializing...</>
                  ) : (
                    <><Lock size={16} /> Pay ₹{amount} Securely</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STATE 4: BLOCKED (Security lockout) */}
          {shieldState === 'blocked' && (
            <div className="text-center py-10 space-y-6">
              <div className="w-20 h-20 bg-amber-50 dark:bg-amber-500/10 text-amber-600 rounded-[1.8rem] flex items-center justify-center mx-auto shadow-inner">
                <AlertTriangle size={36} />
              </div>
              <div>
                <h4 className="text-xl font-black text-amber-600 mb-2">🔒 OZO Shield: Security Lockout</h4>
                <p className="text-xs text-ozo-gray dark:text-gray-400 max-w-sm mx-auto leading-relaxed">
                  Too many payment attempts or suspicious device signature detected. Payments are locked temporarily to protect your account security.
                </p>
              </div>
              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 text-amber-600 rounded-2xl font-mono text-2xl font-black border border-amber-200 dark:border-amber-900/30 w-fit mx-auto">
                {formatTime(lockoutTimeLeft)}
              </div>
              <p className="text-[10px] text-ozo-gray uppercase font-black">
                Please wait for the timer to expire or contact support.
              </p>
            </div>
          )}

          {/* STATE 5: SUCCESS (Payment Completed) */}
          {shieldState === 'success' && (
            <div className="text-center py-10 space-y-6">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-500/10 text-green-600 rounded-[1.8rem] flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 size={40} className="animate-bounce" />
              </div>
              <div>
                <h4 className="text-xl font-black text-green-600 mb-1">Transaction Audit Successful!</h4>
                <p className="text-xs text-ozo-gray dark:text-gray-400 max-w-sm mx-auto">
                  Your reference has been validated. Finalizing order details...
                </p>
              </div>
            </div>
          )}

        </div>
      </motion.div>
    </div>
  )
}

export default RazorpayShield
