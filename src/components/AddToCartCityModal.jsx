import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Navigation, Search, X, ShoppingCart } from 'lucide-react'
import { useLocationStore, checkPincodeServiceable } from '../stores/locationStore'
import { useCartStore } from '../stores/cartStore'
import toast from 'react-hot-toast'

/**
 * AddToCartCityModal
 *
 * Shown when a user clicks "Add to Cart" but has not yet confirmed their city.
 * After city confirmation the pending cart operation is auto-executed.
 *
 * Render once in App.jsx — manages its own open state via locationStore.
 */
export default function AddToCartCityModal() {
  const {
    activeCities,
    addToCartCityModal,
    closeAddToCartCityModal,
    detectLocation,
    isDetecting,
  } = useLocationStore()

  const addToCart = useCartStore(state => state.addToCart)

  const [pincodeInput, setPincodeInput] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const isOpen = !!addToCartCityModal?.isOpen
  const pendingProduct = addToCartCityModal?.product ?? null
  const pendingQty = addToCartCityModal?.quantity ?? 1

  const commitCity = useCallback(async (city) => {
    if (!city) return
    setConfirming(true)
    const baseCityName = city.name?.split(',')[0]?.trim() ?? city.slug

    useLocationStore.setState({
      selectedCitySlug: city.slug,
      browsingCitySlug: city.slug,
      deliveryCitySlug: city.slug,
      nearestCity: city,
      ...(city.latitude && city.longitude
        ? { coordinates: { lat: parseFloat(city.latitude), lng: parseFloat(city.longitude) } }
        : {}),
    })

    toast.success(`📍 City set to ${baseCityName}`, { duration: 2000 })

    if (pendingProduct) {
      await addToCart(pendingProduct, pendingQty, true)
    }

    setConfirming(false)
    closeAddToCartCityModal?.()
    setPincodeInput('')
  }, [pendingProduct, pendingQty, addToCart, closeAddToCartCityModal])

  const handleCityPick = useCallback(async (city) => {
    await commitCity(city)
  }, [commitCity])

  const handleGPS = useCallback(async () => {
    const success = await detectLocation(true, true)
    if (success) {
      const state = useLocationStore.getState()
      const detected = state.nearestCity || state.activeCities?.[0] || null
      if (detected) {
        await commitCity(detected)
      } else {
        toast.error('Could not detect your city. Please pick manually.')
      }
    } else {
      toast.error('GPS detection failed. Please pick a city manually.')
    }
  }, [detectLocation, commitCity])

  const handlePincode = useCallback(async (e) => {
    e.preventDefault()
    const pin = pincodeInput.trim()
    if (pin.length !== 6) {
      toast.error('Please enter a valid 6-digit pincode')
      return
    }
    setIsValidating(true)
    const isServiceable = checkPincodeServiceable(pin)
    if (!isServiceable) {
      toast.error('Sorry, we are not serviceable in this pincode yet')
      setIsValidating(false)
      return
    }
    const cities = useLocationStore.getState().activeCities || []
    const matched = cities.find(c => Array.isArray(c.allowed_pincodes) && c.allowed_pincodes.includes(pin)) || cities[0] || null
    if (matched) {
      await commitCity(matched)
    } else {
      toast.error('Could not verify location. Please select a city.')
    }
    setIsValidating(false)
  }, [pincodeInput, commitCity])

  const handleDismiss = useCallback(() => {
    closeAddToCartCityModal?.()
    setPincodeInput('')
  }, [closeAddToCartCityModal])

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[210] flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
            onClick={handleDismiss}
          />
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 60, scale: 0.97 }}
            transition={{ type: 'spring', damping: 28, stiffness: 380 }}
            className="relative w-full sm:max-w-md bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl p-5 pb-8 sm:pb-6 shadow-2xl z-10 border border-gray-100 dark:border-zinc-800 max-h-[90vh] overflow-y-auto"
          >
            <button
              onClick={handleDismiss}
              className="absolute right-4 top-4 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <div className="flex flex-col items-center text-center mb-5">
              <div className="relative mb-3">
                <span className="absolute inline-flex h-full w-full rounded-full bg-ozo-red/20 animate-ping opacity-75" />
                <div className="relative flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-ozo-red to-rose-500 text-white rounded-full shadow-lg">
                  <ShoppingCart size={22} />
                </div>
              </div>
              <h3 className="text-lg font-extrabold text-zinc-900 dark:text-white leading-snug">
                Select Your City
              </h3>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-1 max-w-xs leading-relaxed">
                {pendingProduct?.name
                  ? `Where should we deliver "${pendingProduct.name}"?`
                  : 'Tell us your city so we can show the right prices & availability.'}
              </p>
            </div>

            {activeCities && activeCities.length > 0 && (
              <div className="mb-5">
                <p className="text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-2.5 text-center">
                  We Deliver In
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  {activeCities.map(city => {
                    const cityName = city.name?.split(',')[0]?.trim() ?? city.slug
                    return (
                      <button
                        key={city.slug}
                        onClick={() => handleCityPick(city)}
                        disabled={confirming}
                        className="flex items-center gap-2.5 p-3.5 rounded-2xl border-2 border-ozo-red/20 hover:border-ozo-red bg-ozo-red/5 hover:bg-ozo-red/10 dark:bg-ozo-red/5 dark:hover:bg-ozo-red/10 transition-all active:scale-95 text-left disabled:opacity-60"
                      >
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-ozo-red to-rose-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                          <MapPin size={15} className="text-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-[13px] text-gray-900 dark:text-white truncate">{cityName}</p>
                          <p className="font-semibold text-[10px] text-gray-400 dark:text-zinc-500 truncate">
                            {city.state || 'Bihar'}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="relative w-full flex items-center justify-center my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-150 dark:border-zinc-800" />
              </div>
              <span className="relative px-3 bg-white dark:bg-zinc-900 text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest">
                OR
              </span>
            </div>

            <button
              onClick={handleGPS}
              disabled={isDetecting || confirming}
              className="w-full flex items-center justify-center gap-2 py-3 px-3 border border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-xl transition-all text-xs font-bold text-gray-700 dark:text-zinc-300 disabled:opacity-60 mb-3"
            >
              <Navigation size={14} className={isDetecting ? 'animate-spin text-ozo-red' : 'text-ozo-red'} />
              {isDetecting ? 'Detecting location...' : 'Use GPS to auto-detect'}
            </button>

            <form onSubmit={handlePincode} className="space-y-2.5">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-ozo-red transition-colors" />
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Enter 6-digit Pincode (e.g. 824101)"
                  value={pincodeInput}
                  onChange={e => setPincodeInput(e.target.value.replace(/\D/g, ''))}
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-zinc-800 border-2 border-transparent rounded-xl focus:bg-white dark:focus:bg-zinc-850 focus:outline-none focus:border-ozo-red/20 transition-all text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400 shadow-sm"
                />
              </div>
              <button
                type="submit"
                disabled={isValidating || confirming || pincodeInput.length !== 6}
                className="w-full py-3 px-4 text-white font-black text-xs bg-gradient-to-r from-ozo-red to-rose-600 hover:from-rose-600 hover:to-ozo-red active:scale-[0.98] transition-all rounded-xl shadow-md disabled:opacity-60 disabled:cursor-not-allowed uppercase tracking-wider"
              >
                {isValidating ? 'Verifying...' : confirming ? 'Adding to cart...' : 'Verify & Add to Cart'}
              </button>
            </form>

            <button
              onClick={handleDismiss}
              className="mt-4 w-full text-[11px] font-extrabold text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors uppercase tracking-widest text-center"
            >
              Skip for now
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
