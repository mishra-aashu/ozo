import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  ShieldCheck,
  Lock,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Check,
  Shield,
  X,
  Zap
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useCartStore } from '../stores/cartStore'

// ─── Rate Limiter Config ──────────────────────────────────────
const RATE_LIMIT_WINDOW_MS  = 10 * 60 * 1000   // 10 min window
const RATE_LIMIT_MAX        = 3                  // max attempts
const RATE_LIMIT_LOCKOUT_MS = 15 * 60 * 1000   // 15 min lockout

const CashfreeShield = ({
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
  // shield states: checking → challenge → payment_portal → blocked → success
  const [shieldState, setShieldState]     = useState('checking')
  const [lockoutTimeLeft, setLockoutTimeLeft] = useState(0)
  const [isPaymentLoading, setIsPaymentLoading] = useState(false)

  // Slider state
  const [sliderVal, setSliderVal]       = useState(0)
  const [sliderActive, setSliderActive] = useState(false)
  const [sliderSuccess, setSliderSuccess] = useState(false)

  const sliderRef       = useRef(null)
  const dragStartPos    = useRef(0)
  const sliderValRef    = useRef(0)
  const sliderWidthRef  = useRef(200)

  const { items } = useCartStore()

  // ── Rate Limiter ─────────────────────────────────────────────
  const checkRateLimits = () => {
    try {
      const stored = localStorage.getItem('ozo_cf_shield_rate')
      if (stored) {
        const { attempts, lockoutUntil } = JSON.parse(stored)
        const now = Date.now()
        if (lockoutUntil && now < lockoutUntil) {
          setLockoutTimeLeft(Math.ceil((lockoutUntil - now) / 1000))
          setShieldState('blocked')
          return false
        }
        const valid = attempts.filter((t) => now - t < RATE_LIMIT_WINDOW_MS)
        if (valid.length >= RATE_LIMIT_MAX) {
          const lockout = now + RATE_LIMIT_LOCKOUT_MS
          localStorage.setItem('ozo_cf_shield_rate', JSON.stringify({ attempts: valid, lockoutUntil: lockout }))
          setLockoutTimeLeft(RATE_LIMIT_LOCKOUT_MS / 1000)
          setShieldState('blocked')
          return false
        }
      }
    } catch (e) { console.error('CF rate limit parse error', e) }
    return true
  }

  const recordAttempt = () => {
    try {
      const stored = localStorage.getItem('ozo_cf_shield_rate')
      const now = Date.now()
      let attempts = [now]
      let lockoutUntil = null
      if (stored) {
        const parsed = JSON.parse(stored)
        const clean = parsed.attempts.filter((t) => now - t < RATE_LIMIT_WINDOW_MS)
        attempts = [...clean, now]
        lockoutUntil = parsed.lockoutUntil
      }
      localStorage.setItem('ozo_cf_shield_rate', JSON.stringify({ attempts, lockoutUntil }))
    } catch (e) { console.error(e) }
  }

  // ── Lockout countdown ────────────────────────────────────────
  useEffect(() => {
    if (shieldState === 'blocked' && lockoutTimeLeft > 0) {
      const timer = setInterval(() => {
        setLockoutTimeLeft(prev => {
          if (prev <= 1) { clearInterval(timer); setShieldState('checking'); return 0 }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [shieldState, lockoutTimeLeft])

  // ── Bot detection ────────────────────────────────────────────
  const performShieldAudit = () => {
    let score = 0
    if (navigator.webdriver) score += 50
    const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor)
    if (isChrome && !(navigator.plugins && navigator.plugins.length > 0)) score += 30
    if (window.outerWidth === 0 && window.outerHeight === 0) score += 40

    setTimeout(() => {
      if (score >= 80) {
        setShieldState('blocked')
        toast.error('OZO Shield: Suspicious activity detected. Transaction blocked.', { duration: 5000 })
      } else {
        setShieldState('challenge')
      }
    }, 2200)
  }

  useEffect(() => {
    if (isOpen) {
      const allowed = checkRateLimits()
      if (allowed) {
        setShieldState('checking')
        setSliderVal(0)
        setSliderSuccess(false)
        performShieldAudit()
      }
    }
  }, [isOpen])

  // ── Slider sync ──────────────────────────────────────────────
  useEffect(() => { sliderValRef.current = sliderVal }, [sliderVal])

  const handleSliderDown = (e) => {
    if (sliderSuccess) return
    setSliderActive(true)
    dragStartPos.current = e.clientX || (e.touches && e.touches[0].clientX) || 0
    sliderWidthRef.current = sliderRef.current ? sliderRef.current.clientWidth - 56 : 200
  }

  useEffect(() => {
    if (!sliderActive) return
    const handleMove = (e) => {
      if (sliderSuccess) return
      const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0
      const diff = clientX - dragStartPos.current
      const pct = Math.max(0, Math.min(100, Math.round((diff / sliderWidthRef.current) * 100)))
      setSliderVal(pct)
    }
    const handleRelease = () => {
      setSliderActive(false)
      if (sliderValRef.current >= 95) {
        setSliderVal(100)
        setSliderSuccess(true)
        recordAttempt()
        setTimeout(() => setShieldState('payment_portal'), 800)
      } else {
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

  // ── Cashfree Payment Handler ─────────────────────────────────
  const handleCashfreePayment = async () => {
    setIsPaymentLoading(true)
    const loadingToast = toast.loading('Initializing Cashfree Secure Payment...')

    try {
      // 1. Call our Cashfree edge function to create order
      const { data, error } = await supabase.functions.invoke('cashfree-payment', {
        body: {
          action: 'create_cashfree_order',
          addressId,
          couponCode,
          customerName:  userData?.fullName  || 'OZO Customer',
          customerPhone: userData?.phone     || '9999999999',
          customerEmail: userData?.email     || 'customer@ozomart.store',
          pendingOrderId,
          charityDonation
        }
      })

      toast.dismiss(loadingToast)

      if (error || !data?.success) {
        let msg = 'Failed to initialize Cashfree payment'
        if (error?.context) {
          try { msg = (await error.context.json()).error || msg } catch { /* ignore */ }
        } else if (data?.error) {
          msg = data.error
        }
        toast.error(`Cashfree Init Failed: ${msg}`)
        setIsPaymentLoading(false)
        return
      }

      const { payment_session_id, cf_order_id, calculatedDetails } = data

      // 2. Check Cashfree SDK is loaded
      if (!window.Cashfree) {
        toast.error('Cashfree SDK is not loaded. Please refresh the page and try again.')
        setIsPaymentLoading(false)
        return
      }

      // 3. Initialize Cashfree SDK
      const cfMode = import.meta.env.VITE_CASHFREE_MODE || 'sandbox'
      const cashfree = window.Cashfree({ mode: cfMode })

      // 4. Launch Cashfree Checkout
      const checkoutOptions = {
        paymentSessionId: payment_session_id,
        redirectTarget: '_modal'  // Opens as modal overlay — no page redirect
      }

      cashfree.checkout(checkoutOptions).then(async (result) => {
        if (result.error) {
          console.log('[Cashfree] User dropped or error:', result.error)
          toast.error('Payment Cancelled or Failed. Please try again.')
          setIsPaymentLoading(false)
          return
        }

        if (result.paymentDetails) {
          // Payment done — now verify server-side
          const verifyToast = toast.loading('Verifying Cashfree payment...')
          try {
            const { data: vData, error: vError } = await supabase.functions.invoke('cashfree-payment', {
              body: {
                action: 'verify_cashfree_payment',
                cfOrderId: cf_order_id,
                addressId,
                couponCode,
                charityDonation
              }
            })
            toast.dismiss(verifyToast)

            if (vError || !vData?.verified) {
              let vMsg = 'Verification failed'
              if (vError?.context) {
                try { vMsg = (await vError.context.json()).error || vMsg } catch { /* ignore */ }
              } else if (vData?.error) {
                vMsg = vData.error
              }
              toast.error(`Cashfree Verification Failed: ${vMsg}`)
              setIsPaymentLoading(false)
              return
            }

            toast.success('Cashfree Payment Verified! 🎉')
            setShieldState('success')
            onPaymentSuccess(cf_order_id, null, vData.calculatedDetails)
          } catch (err) {
            toast.dismiss(verifyToast)
            toast.error(`Verification error: ${err.message}`)
            setIsPaymentLoading(false)
          }
        }

        if (result.redirect) {
          // Redirect flow — user was sent to return_url
          console.log('[Cashfree] Redirect triggered for order:', cf_order_id)
        }
      })

    } catch (e) {
      toast.dismiss(loadingToast)
      console.error('[CashfreeShield]', e)
      toast.error('Cashfree checkout failed to open. Please try again.')
      setIsPaymentLoading(false)
    }
  }

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
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
          if (shieldState !== 'checking' && shieldState !== 'success') onClose()
        }}
      />

      {/* Modal */}
      <motion.div
        initial={{ scale: 0.9, y: 30, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 30, opacity: 0 }}
        className="bg-white dark:bg-[#121212] w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl border border-gray-100 dark:border-white/5 relative z-10 text-gray-800 dark:text-white"
      >
        {/* Close button */}
        {shieldState !== 'checking' && shieldState !== 'success' && (
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all z-20"
          >
            <X size={18} />
          </button>
        )}

        {/* Header Banner — Cashfree blue-green gradient */}
        {shieldState !== 'challenge' && (
          <div className="relative h-32 bg-gradient-to-r from-[#00C2FF] to-[#00854A] flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent)]" />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
            <div className="relative z-10 flex flex-col items-center">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="text-white fill-white/30 animate-pulse" size={20} />
                <span className="text-[10px] font-black uppercase tracking-widest text-white/80 bg-white/15 px-2.5 py-0.5 rounded-full">
                  OZO Shield · Cashfree
                </span>
              </div>
              <h3 className="text-2xl font-black text-white font-display">SafePay Protection</h3>
            </div>
          </div>
        )}

        <div className={shieldState === 'challenge' ? 'p-10 pt-16 pb-12' : 'p-8'}>

          {/* STATE: checking */}
          {shieldState === 'checking' && (
            <div className="text-center py-10 space-y-6">
              <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 border-4 border-[#00C2FF]/10 rounded-full" />
                <motion.div
                  className="absolute inset-0 border-4 border-t-[#00C2FF] rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                />
                <ShieldCheck size={40} className="text-[#00C2FF] animate-pulse" />
              </div>
              <div>
                <h4 className="text-lg font-black mb-1">Checking Connection Security</h4>
                <p className="text-xs text-ozo-gray dark:text-gray-400 max-w-sm mx-auto">
                  Verifying secure payment channel, browser integrity, and SSL encryption...
                </p>
              </div>
              <div className="max-w-xs mx-auto p-4 bg-gray-50 dark:bg-white/[0.02] rounded-2xl border border-gray-100 dark:border-white/5 space-y-2">
                {[
                  { label: 'WebDriver Scan',     status: 'Passed',    color: 'text-green-500' },
                  { label: 'Device Fingerprint', status: 'Verifying', color: 'text-green-500' },
                  { label: 'SSL Encryption',     status: 'Handshake', color: 'text-[#00C2FF] animate-pulse' },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-gray-500">
                    <span>{row.label}</span>
                    <span className={row.color}>{row.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STATE: challenge (human slider) */}
          {shieldState === 'challenge' && (
            <div className="space-y-10 flex flex-col items-center">
              <p className="text-sm font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 text-center leading-relaxed max-w-xs">
                Human verification required to proceed
              </p>
              <div
                ref={sliderRef}
                className="w-full relative h-14 bg-gray-50 dark:bg-white/[0.03] rounded-full border border-gray-200/80 dark:border-white/10 overflow-hidden select-none shadow-inner"
              >
                {/* Progress fill */}
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#00C2FF]/10 to-[#00854A]/20 transition-all duration-75"
                  style={{ width: `${sliderVal}%` }}
                />
                {/* Label */}
                <div
                  className="absolute inset-0 flex items-center justify-center text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-400 pointer-events-none select-none transition-opacity duration-75"
                  style={{ opacity: sliderSuccess ? 1 : Math.max(0, 1 - sliderVal / 40) }}
                >
                  {sliderSuccess ? (
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 animate-bounce font-black uppercase tracking-widest text-xs">
                      <CheckCircle2 size={14} /> VERIFICATION PASSED!
                    </span>
                  ) : 'SLIDE TO VERIFY'}
                </div>
                {/* Handle */}
                <div
                  className={`absolute top-1 bottom-1 w-12 bg-gradient-to-r ${
                    sliderSuccess
                      ? 'from-emerald-500 to-teal-600'
                      : 'from-[#00C2FF] to-[#00854A] hover:brightness-110'
                  } rounded-full cursor-grab active:cursor-grabbing flex items-center justify-center text-white shadow-lg transition-all duration-75 select-none`}
                  style={{
                    left: `calc(4px + ${sliderVal}% - ${sliderVal * 0.56}px)`,
                    touchAction: 'none'
                  }}
                  onMouseDown={handleSliderDown}
                  onTouchStart={handleSliderDown}
                >
                  {sliderSuccess ? <Check size={18} strokeWidth={3} className="animate-pulse" /> : <Lock size={18} strokeWidth={2.5} />}
                </div>
              </div>
            </div>
          )}

          {/* STATE: payment_portal */}
          {shieldState === 'payment_portal' && (
            <div className="space-y-6">
              {/* Order summary */}
              <div className="p-4 bg-[#00C2FF]/5 dark:bg-white/[0.02] rounded-2xl border border-[#00C2FF]/20 dark:border-white/5">
                <p className="text-[10px] font-black uppercase tracking-wider text-[#00854A] dark:text-[#00C2FF] mb-2">Order Summary</p>
                <div className="max-h-24 overflow-y-auto space-y-1.5 pr-1 divide-y divide-gray-100 dark:divide-white/5">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center text-xs pt-1.5 first:pt-0">
                      <span className="text-gray-700 dark:text-gray-300 font-medium">
                        {item.name} <span className="text-[10px] text-gray-500 font-bold">x {item.quantity}</span>
                      </span>
                      <span className="font-black text-gray-900 dark:text-white">
                        ₹{(item.price * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cashfree Pay Button */}
              <div className="text-center py-4 space-y-5">
                <div className="w-16 h-16 bg-[#00C2FF]/10 dark:bg-[#00C2FF]/10 text-[#00854A] rounded-[1.2rem] flex items-center justify-center mx-auto shadow-inner">
                  <ShieldCheck size={32} />
                </div>
                <div>
                  <h4 className="font-black text-lg mb-1">Cashfree Secure Checkout</h4>
                  <p className="text-xs text-ozo-gray dark:text-gray-400 max-w-sm mx-auto leading-relaxed">
                    Pay securely via UPI, Cards, Netbanking, or Wallets. Powered by Cashfree Payments.
                  </p>
                </div>

                <button
                  onClick={handleCashfreePayment}
                  disabled={isPaymentLoading}
                  className="w-full py-4 bg-gradient-to-r from-[#00C2FF] to-[#00854A] hover:brightness-110 disabled:opacity-60 text-white rounded-2xl font-black text-sm shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                >
                  {isPaymentLoading ? (
                    <><RefreshCw className="animate-spin" size={16} /> Initializing...</>
                  ) : (
                    <><Lock size={16} /> Pay ₹{amount?.toLocaleString()} via Cashfree</>
                  )}
                </button>

                {/* Powered by Cashfree badge */}
                <p className="text-[10px] text-gray-400 dark:text-gray-600 font-bold uppercase tracking-widest flex items-center justify-center gap-1.5">
                  <Shield size={10} /> Powered by Cashfree Payments
                </p>
              </div>
            </div>
          )}

          {/* STATE: blocked */}
          {shieldState === 'blocked' && (
            <div className="text-center py-10 space-y-6">
              <div className="w-20 h-20 bg-amber-50 dark:bg-amber-500/10 text-amber-600 rounded-[1.8rem] flex items-center justify-center mx-auto shadow-inner">
                <AlertTriangle size={36} />
              </div>
              <div>
                <h4 className="text-xl font-black text-amber-600 mb-2">🔒 OZO Shield: Security Lockout</h4>
                <p className="text-xs text-ozo-gray dark:text-gray-400 max-w-sm mx-auto leading-relaxed">
                  Too many payment attempts detected. Payments are locked temporarily to protect your account.
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

          {/* STATE: success */}
          {shieldState === 'success' && (
            <div className="text-center py-10 space-y-6">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-500/10 text-green-600 rounded-[1.8rem] flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 size={40} className="animate-bounce" />
              </div>
              <div>
                <h4 className="text-xl font-black text-green-600 mb-1">Payment Verified! 🎉</h4>
                <p className="text-xs text-ozo-gray dark:text-gray-400 max-w-sm mx-auto">
                  Your Cashfree payment has been verified. Finalizing your order...
                </p>
              </div>
            </div>
          )}

        </div>
      </motion.div>
    </div>
  )
}

export default CashfreeShield
