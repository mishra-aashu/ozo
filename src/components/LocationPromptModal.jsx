import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Navigation, Search, X } from 'lucide-react'
import { useLocationStore, checkPincodeServiceable, findMatchingActiveCity } from '../stores/locationStore'
import { useAuthStore } from '../stores/authStore'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

export const isAddressIncomplete = (addr, activeCities = []) => {
  if (!addr) return true
  const cleanAddr = addr.toString().trim()
  if (cleanAddr.startsWith('GPS:') || cleanAddr.startsWith('Lat:')) return true
  
  const lower = cleanAddr.toLowerCase()
  if (lower === 'bihar') return true
  
  // Check if it matches any active city name exactly
  const matchesAnyCity = activeCities.some(city => {
    const cityName = city.name.split(',')[0].toLowerCase().trim()
    return lower === cityName
  })
  if (matchesAnyCity) return true
  
  // Match any 6-digit pincode
  const hasPincode = /\b\d{6}\b/.test(cleanAddr)
  if (!hasPincode) return true
  
  return false
}

export const findMatchingActiveCityForDetails = (addr, coords, details, activeCities) => {
  if (!activeCities || activeCities.length === 0) return null
  
  // 1. Try details city/town/village
  if (details) {
    const cityVal = (details.city || details.town || details.county || details.village || '').toLowerCase().trim()
    if (cityVal) {
      const match = activeCities.find(c => {
        const name = c.name.toLowerCase()
        const slug = c.slug.toLowerCase()
        return name.includes(cityVal) || cityVal.includes(name) || slug.includes(cityVal) || cityVal.includes(slug)
      })
      if (match) return match
    }
  }

  // 2. Try searching in address string
  if (addr) {
    const cleanAddr = addr.toString().toLowerCase()
    const match = activeCities.find(c => {
      const name = c.name.split(',')[0].toLowerCase().trim() // e.g. "aurangabad" from "Aurangabad, Bihar"
      const slug = c.slug.toLowerCase().trim()
      return cleanAddr.includes(name) || cleanAddr.includes(slug)
    })
    if (match) return match
  }

  // 3. Try checking coordinates distance
  if (coords && coords.lat && coords.lng) {
    const lat = parseFloat(coords.lat)
    const lng = parseFloat(coords.lng)
    
    let nearestCityObj = null
    let minDistance = Infinity
    const R = 6371 // Earth's radius in km

    for (const city of activeCities) {
      if (city.latitude && city.longitude) {
        const cLat = parseFloat(city.latitude)
        const cLng = parseFloat(city.longitude)
        
        const dLat = (cLat - lat) * Math.PI / 180
        const dLon = (cLng - lng) * Math.PI / 180
        const a = 
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat * Math.PI / 180) * Math.cos(cLat * Math.PI / 180) * 
          Math.sin(dLon / 2) * Math.sin(dLon / 2)
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        const distance = R * c

        if (distance < minDistance) {
          minDistance = distance
          nearestCityObj = city
        }
      }
    }

    if (nearestCityObj) {
      const maxRadius = Math.max(parseFloat(nearestCityObj.service_radius_km) || 25.0, 25.0)
      if (minDistance <= maxRadius) {
        return nearestCityObj
      }
    }
  }

  return null
}

export default function LocationPromptModal() {
  const { address, userAddresses, detectLocation, isDetecting } = useLocationStore()
  const [isOpen, setIsOpen] = useState(false)
  const [pincodeInput, setPincodeInput] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    let timer

    const runLocationPromptCheck = () => {
      // Sequence: Wait for notification permission flow to be resolved/dismissed first
      const isNotificationFlowDone = !useAuthStore.getState().user || 
        (typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'default') || 
        sessionStorage.getItem('ozo_notification_prompt_dismissed') === 'true'

      if (!isNotificationFlowDone) {
        // Notification flow not finished yet, check again in 2 seconds
        timer = setTimeout(runLocationPromptCheck, 2000)
        return
      }

      const isDismissed = sessionStorage.getItem('ozo_location_prompt_dismissed') === 'true'
      
      if (isDismissed) {
        setIsOpen(false)
        return
      }

      // Don't pop up on admin, mart, captain, or select-location pages
      const isSpecialRoute = window.location.pathname.startsWith('/admin') || 
                             window.location.pathname.startsWith('/mart') || 
                             window.location.pathname.startsWith('/captain') ||
                             window.location.pathname.includes('/select-location')

      if (isSpecialRoute) {
        setIsOpen(false)
        return
      }

      const activeCities = useLocationStore.getState().activeCities || []

      // If location is already fetched, check if it is related to any active city and serviceable
      if (address) {
        const coords = useLocationStore.getState().coordinates
        const details = useLocationStore.getState().addressDetails
        
        const matchedCity = findMatchingActiveCityForDetails(address, coords, details, activeCities)
        
        if (!matchedCity) {
          // No active city matched, meaning it's not a serviceable area
          sessionStorage.setItem('ozo_location_prompt_dismissed', 'true')
          setIsOpen(false)
          return
        }

        // We matched an active city! Now check the pincode
        let detectedPincode = details?.postcode || details?.pincode || ''
        if (!detectedPincode) {
          const pinMatch = address.match(/\b\d{6}\b/)
          if (pinMatch) {
            detectedPincode = pinMatch[0]
          }
        }

        if (detectedPincode) {
          const cleanPin = detectedPincode.toString().trim()
          const isPincodeAllowed = !matchedCity.allowed_pincodes || 
                                   !Array.isArray(matchedCity.allowed_pincodes) || 
                                   matchedCity.allowed_pincodes.length === 0 || 
                                   matchedCity.allowed_pincodes.includes(cleanPin)
          
          if (isPincodeAllowed) {
            // Serviceable and we have their pincode. No modal needed.
            sessionStorage.setItem('ozo_location_prompt_dismissed', 'true')
            setIsOpen(false)
            return
          } else {
            // Pincode is NOT allowed (not serviceable). Modal not needed.
            sessionStorage.setItem('ozo_location_prompt_dismissed', 'true')
            setIsOpen(false)
            return
          }
        }
      }

      const isIncomplete = isAddressIncomplete(address, activeCities)
      
      const hasSavedAddressWithPincode = userAddresses && userAddresses.some(addr => {
        return addr.pincode && /\b\d{6}\b/.test(addr.pincode.toString())
      })
      
      if (isIncomplete && !hasSavedAddressWithPincode) {
        setIsOpen(true)
      } else {
        setIsOpen(false)
      }
    }

    // Start checking after a short delay to allow notifications modal to render/interact first
    timer = setTimeout(runLocationPromptCheck, 5000)

    return () => clearTimeout(timer)
  }, [address, userAddresses])

  const handleDismiss = () => {
    setIsOpen(false)
    sessionStorage.setItem('ozo_location_prompt_dismissed', 'true')
  }

  const handleVerifyPincode = async (e) => {
    e.preventDefault()
    if (!pincodeInput.trim() || pincodeInput.trim().length !== 6) {
      toast.error('Please enter a valid 6-digit pincode')
      return
    }

    setIsValidating(true)
    
    // Check if the pincode is serviceable
    const isServiceable = checkPincodeServiceable(pincodeInput)
    if (!isServiceable) {
      toast.error('Sorry, we are not serviceable in this pincode yet')
      setIsValidating(false)
      return
    }

    // Find the operating city for this pincode
    const activeCities = useLocationStore.getState().activeCities || []
    let matchedCity = null
    
    // Look through active cities for one that contains this pincode
    for (const city of activeCities) {
      if (city.allowed_pincodes && city.allowed_pincodes.includes(pincodeInput)) {
        matchedCity = city
        break
      }
    }

    // Fallback: match by city name or default to the first active city
    if (!matchedCity && activeCities.length > 0) {
      matchedCity = activeCities[0]
    }

    if (matchedCity) {
      // Save details locally in store
      useLocationStore.setState({
        address: `Pincode: ${pincodeInput}, ${matchedCity.name}, ${matchedCity.state || 'Bihar'}`,
        coordinates: { lat: parseFloat(matchedCity.latitude), lng: parseFloat(matchedCity.longitude) },
        nearestCity: matchedCity,
        selectedCitySlug: matchedCity.slug,
        addressDetails: {
          road: '',
          suburb: '',
          city: matchedCity.name,
          state: matchedCity.state || 'Bihar',
          postcode: pincodeInput
        }
      })

      toast.success(`Welcome to OZO! Service verified for ${matchedCity.name}`)
      sessionStorage.setItem('ozo_location_prompt_dismissed', 'true')
      setIsOpen(false)
    } else {
      toast.error('Could not verify location. Please select manually.')
    }
    
    setIsValidating(false)
  }

  const handleGPSDetect = async () => {
    const success = await detectLocation(true, true)
    if (success) {
      const updatedAddress = useLocationStore.getState().address
      const updatedCoords = useLocationStore.getState().coordinates
      const updatedDetails = useLocationStore.getState().addressDetails
      const activeCities = useLocationStore.getState().activeCities || []
      
      const matchedCity = findMatchingActiveCityForDetails(updatedAddress, updatedCoords, updatedDetails, activeCities)
      
      if (!matchedCity) {
        sessionStorage.setItem('ozo_location_prompt_dismissed', 'true')
        setIsOpen(false)
        toast.error('Sorry, we are not serviceable in this area yet')
        return
      }

      // Since coordinates are physically verified and matchedCity is found, we do not block on pincode validation here.
      sessionStorage.setItem('ozo_location_prompt_dismissed', 'true')
      setIsOpen(false)
      toast.success(`Welcome to OZO! Service verified for ${matchedCity.name}`)
    }
  }

  const handleSelectOnMap = () => {
    setIsOpen(false)
    sessionStorage.setItem('ozo_location_prompt_dismissed', 'true')
    navigate('/select-location')
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[190] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          {/* Backdrop (Non-clickable to prevent dismissal) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-md overflow-hidden bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl z-10"
          >
            {/* Close / Dismiss Button */}
            <button
              onClick={handleDismiss}
              className="absolute right-5 top-5 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors focus:outline-none"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            {/* Content */}
            <div className="flex flex-col items-center text-center mt-2">
              {/* Pulsing Pin Icon */}
              <div className="relative mb-5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-ozo-red/20 animate-ping opacity-75" />
                <div className="relative flex items-center justify-center w-16 h-16 bg-gradient-to-tr from-ozo-red to-rose-500 text-white rounded-full shadow-lg">
                  <MapPin size={28} className="animate-bounce" />
                </div>
              </div>

              <h3 className="text-xl font-extrabold text-zinc-900 dark:text-white leading-snug">
                Let Us Know Your Location
              </h3>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-1.5 max-w-xs leading-relaxed">
                Provide your pincode to check if we service your area and show the best local items!
              </p>

              {/* Pincode Input Form */}
              <form onSubmit={handleVerifyPincode} className="w-full mt-6 space-y-4">
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-ozo-red transition-colors" />
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Enter 6-digit Pincode (e.g. 824101)"
                    value={pincodeInput}
                    onChange={(e) => setPincodeInput(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-11 pr-4 py-3.5 bg-gray-50 dark:bg-zinc-800 border-2 border-transparent rounded-xl focus:bg-white dark:focus:bg-zinc-850 focus:outline-none focus:border-ozo-red/20 transition-all text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400 shadow-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isValidating}
                  className="w-full py-3.5 px-4 text-white font-black text-xs bg-gradient-to-r from-ozo-red to-rose-600 hover:from-rose-600 hover:to-ozo-red active:scale-[0.98] transition-all rounded-xl shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-ozo-red/50 uppercase tracking-wider"
                >
                  {isValidating ? 'Verifying...' : 'Verify & Browse'}
                </button>
              </form>

              {/* Divider */}
              <div className="relative w-full flex items-center justify-center my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-150 dark:border-zinc-800" />
                </div>
                <span className="relative px-3 bg-white dark:bg-zinc-900 text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest">
                  OR
                </span>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-3 w-full">
                <button
                  onClick={handleGPSDetect}
                  disabled={isDetecting}
                  className="flex items-center justify-center gap-2 py-3 px-3 border border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-xl transition-all text-xs font-bold text-gray-700 dark:text-zinc-300"
                >
                  <Navigation size={14} className={isDetecting ? 'animate-spin text-ozo-red' : 'text-ozo-red'} />
                  {isDetecting ? 'Detecting...' : 'Use GPS'}
                </button>

                <button
                  onClick={handleSelectOnMap}
                  className="flex items-center justify-center gap-2 py-3 px-3 border border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-xl transition-all text-xs font-bold text-gray-700 dark:text-zinc-300"
                >
                  <MapPin size={14} className="text-emerald-500" />
                  Select on Map
                </button>
              </div>

              {/* Skip for now option */}
              <button
                onClick={handleDismiss}
                className="mt-5 text-[11px] font-extrabold text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors uppercase tracking-widest"
              >
                Skip for now
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
