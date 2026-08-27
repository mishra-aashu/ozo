import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, X, ArrowLeft, Keyboard } from 'lucide-react'
import { useLocationStore, findMatchingActiveCity, findCityByPincode } from '../stores/locationStore'
import toast from 'react-hot-toast'

export default function ServiceabilityModal() {
  const { serviceabilityModal, closeServiceabilityModal } = useLocationStore()
  const { isOpen, cityName, pincode } = serviceabilityModal || { isOpen: false, cityName: '', pincode: '' }

  const [isEnteringPin, setIsEnteringPin] = useState(false)
  const [manualPin, setManualPin] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // Resolve the active city details to list allowed pincodes
  const matchedCity = isOpen ? findMatchingActiveCity(cityName) : null
  const allowedPincodes = matchedCity?.allowed_pincodes || []

  // Reset local state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsEnteringPin(false)
      setManualPin('')
      setErrorMsg('')
    }
  }, [isOpen])

  const handleVerifyPin = () => {
    if (manualPin.length !== 6) {
      setErrorMsg('Please enter a valid 6-digit pincode')
      return
    }

    const matchedCityObj = findCityByPincode(manualPin)
    if (matchedCityObj) {
      const baseCityName = matchedCityObj?.name ? matchedCityObj.name.split(',')[0].trim() : '';
      // Update location store state with city center coordinates and manually typed pincode
      useLocationStore.setState({
        address: `${baseCityName}, ${matchedCityObj.state || 'Bihar'} - ${manualPin}`,
        coordinates: { 
          lat: parseFloat(matchedCityObj.latitude || 24.7527), 
          lng: parseFloat(matchedCityObj.longitude || 84.3740) 
        },
        addressDetails: {
          road: '',
          suburb: '',
          city: baseCityName,
          state: matchedCityObj.state || 'Bihar',
          postcode: manualPin
        },
        selectedCitySlug: matchedCityObj.slug,
        nearestCity: matchedCityObj,
        tracedThrough: 'manual_pincode'
      })

      toast.success(`Location updated to ${matchedCityObj.name} (${manualPin})`)
      closeServiceabilityModal()
    } else {
      setErrorMsg(`Pincode ${manualPin} is currently not serviceable by OZO.`)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          {/* Backdrop Click Dismisses */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
            onClick={closeServiceabilityModal}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-md overflow-hidden bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl z-10"
          >
            {/* Close Button */}
            <button
              onClick={closeServiceabilityModal}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-850 transition"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            {!isEnteringPin ? (
              /* Screen 1: Non-serviceable Warning Alert */
              <div className="flex flex-col items-center text-center mt-2">
                {/* Pulsing Pin Icon Wrapper */}
                <div className="relative mb-5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-ozo-red/20 animate-ping opacity-75" />
                  <div className="relative flex items-center justify-center w-16 h-16 bg-gradient-to-tr from-ozo-red to-rose-500 text-white rounded-full shadow-lg">
                    <MapPin size={28} className="animate-bounce" />
                  </div>
                </div>

                <h3 className="text-xl font-extrabold text-zinc-900 dark:text-white leading-snug">
                  Non-Serviceable Area
                </h3>
                <p className="text-sm font-semibold text-ozo-red mt-1.5">
                  We are expanding soon!
                </p>
                
                <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-2xl p-4 w-full mt-4 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed text-left border border-gray-100 dark:border-zinc-800">
                  <p className="mb-2">
                    OZO is currently not delivering to the pincode <strong className="text-zinc-900 dark:text-white">{pincode}</strong> in <strong className="text-zinc-900 dark:text-white">{cityName || 'your area'}</strong>.
                  </p>
                  {allowedPincodes.length > 0 ? (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-zinc-800">
                      <p className="font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                        Serviceable pincodes in this region:
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {allowedPincodes.map(p => (
                          <span key={p} className="bg-green-50 dark:bg-ozo-green/10 text-ozo-green px-2.5 py-1 rounded-lg font-bold text-[11px] border border-ozo-green/20">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 text-zinc-500 dark:text-zinc-400">
                      We are expanding our operations rapidly to new locations. Thank you for your patience!
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col w-full gap-2.5 mt-6">
                  <button
                    onClick={closeServiceabilityModal}
                    className="w-full py-3.5 px-4 text-white font-bold text-sm bg-gradient-to-r from-ozo-red to-rose-600 hover:from-rose-600 hover:to-ozo-red active:scale-[0.98] transition-all rounded-xl shadow-md hover:shadow-lg focus:outline-none"
                  >
                    Okay, Got It
                  </button>
                  
                  <button
                    onClick={() => setIsEnteringPin(true)}
                    className="w-full py-3 px-4 text-zinc-600 dark:text-zinc-400 hover:text-ozo-red dark:hover:text-ozo-red font-bold text-xs bg-gray-50 hover:bg-red-50 dark:bg-zinc-800/30 dark:hover:bg-red-950/10 border border-gray-150 dark:border-zinc-700/50 rounded-xl transition-all flex items-center justify-center gap-1.5"
                  >
                    <Keyboard size={14} />
                    Enter Pincode Manually
                  </button>
                </div>
              </div>
            ) : (
              /* Screen 2: Manual Pincode Entry Form */
              <div className="flex flex-col mt-2">
                <div className="flex items-center gap-2 mb-4">
                  <button 
                    onClick={() => {
                      setIsEnteringPin(false)
                      setErrorMsg('')
                      setManualPin('')
                    }}
                    className="p-1 text-gray-500 hover:text-gray-800 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <h3 className="text-lg font-black text-zinc-900 dark:text-white">
                    Enter Pincode
                  </h3>
                </div>

                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-5 leading-normal">
                  If OZO fetched your wrong GPS coordinate, type your local 6-digit pincode below to check serviceability.
                </p>

                <div className="space-y-4">
                  <div>
                    <input
                      type="text"
                      maxLength={6}
                      pattern="\d*"
                      autoFocus
                      value={manualPin}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '')
                        setManualPin(val)
                        setErrorMsg('')
                      }}
                      placeholder="e.g. 824101"
                      className="w-full text-center tracking-[0.2em] text-xl font-black py-4 px-4 bg-gray-50 dark:bg-zinc-800/40 border border-gray-200 dark:border-zinc-700 rounded-2xl focus:ring-2 focus:ring-ozo-red focus:border-transparent focus:bg-white transition-all text-zinc-900 dark:text-white"
                    />
                    
                    {errorMsg && (
                      <motion.p 
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-xs font-bold text-ozo-red mt-2 text-center"
                      >
                        {errorMsg}
                      </motion.p>
                    )}
                  </div>

                  <button
                    onClick={handleVerifyPin}
                    className="w-full mt-2 py-3.5 px-4 text-white font-black text-sm bg-gradient-to-r from-ozo-red to-rose-600 hover:from-rose-600 hover:to-ozo-red active:scale-[0.98] transition-all rounded-xl shadow-md hover:shadow-lg focus:outline-none"
                  >
                    Verify & Set Location
                  </button>

                  <div className="pt-2 border-t border-gray-100 dark:border-zinc-800 text-[10px] text-zinc-400 dark:text-zinc-500">
                    <span className="font-bold block mb-1 uppercase tracking-wider text-[9px]">Operating Regions (Aurangabad, Bihar)</span>
                    <p>Allowed Pincodes: 824101 (Town), 824115 (Madanpur), and other neighboring serviceable sectors.</p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

