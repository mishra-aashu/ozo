import React, { useState } from 'react'
import { Home, Briefcase, MapPin, Map as MapIcon, ChevronUp, ChevronDown, Loader2, Route, Info, Search, FileText, Phone, User, Check, Navigation, Star, Bike, DoorOpen, Bell, BellOff, GraduationCap } from 'lucide-react'
import { findCityByPincode, findMatchingActiveCity, checkDeliveryZoneStatus, checkPincodeServiceable, useLocationStore } from '../stores/locationStore'
import { reverseGeocode, extractCoordinatesFromUrl } from '../lib/geocoding'
import toast from 'react-hot-toast'

const WhatsAppIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" clipRule="evenodd" d="M12.01 0C5.39 0 0 5.39 0 12.01c0 2.45.74 4.73 2.01 6.64L.25 24l5.52-1.72a11.96 11.96 0 006.24 1.73c6.62 0 12.01-5.39 12.01-12.01C24.02 5.39 18.63 0 12.01 0z" fill="#25D366"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M12.01 1.83c-5.61 0-10.18 4.57-10.18 10.18 0 2.22.72 4.28 1.94 5.96l.24.32-.82 2.63 2.74-.78.33.2c1.6.98 3.47 1.49 5.39 1.49 5.61 0 10.18-4.57 10.18-10.18S17.62 1.83 12.01 1.83z" fill="#FFFFFF"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M16.94 13.9c-.27-.13-1.61-.79-1.86-.88-.25-.09-.43-.14-.61.13-.18.27-.7 1.86-.86 2.04-.16.18-.32.2-.59.07a7.48 7.48 0 01-2.2-1.36c-.85-.76-1.42-1.7-1.59-1.97-.17-.27-.02-.42.12-.55.12-.12.27-.31.4-.47.14-.16.18-.27.27-.45.09-.18.05-.34-.02-.48-.07-.14-.61-1.47-.84-2.02-.22-.53-.45-.46-.61-.47-.16-.01-.34-.01-.52-.01-.18 0-.48.07-.73.34-.25.27-.95.93-.95 2.27 0 1.34.98 2.63 1.11 2.81.14.18 1.92 2.93 4.65 4.11.65.28 1.16.45 1.55.57.65.21 1.25.18 1.72.11.52-.08 1.61-.66 1.84-1.3.23-.63.23-1.18.16-1.3-.07-.11-.25-.18-.52-.31z" fill="#25D366"/>
  </svg>
)

const GoogleMapsIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <clipPath id="maps-shape">
        <rect x="10" y="10" width="100" height="100" rx="22" />
      </clipPath>
    </defs>
    <g clipPath="url(#maps-shape)">
      <rect x="10" y="10" width="100" height="100" fill="#34A853" />
      <path d="M10 110 L110 110 L110 60 L60 60 Z" fill="#4285F4" />
      <path d="M10 110 L110 30 L110 10 L85 10 L10 85 Z" fill="#FBBC05" />
      <path d="M60 60 L110 110 L115 110 L75 60 Z" fill="#FFFFFF" />
      <path d="M38 32 C30 32 25 37 25 45 C25 53 30 58 38 58 C45 58 49 54 50 48 L38 48 L38 42 L56 42 C56 52 48 64 38 64 C26 64 18 55 18 45 C18 35 26 26 38 26 C44 26 50 29 53 33 L47 38 C45 35 42 32 38 32 Z" fill="#FFFFFF" />
    </g>
    <g>
      <path d="M85 10 C70 10 58 22 58 37 C58 56 85 85 85 85 C85 85 112 56 112 37 C112 22 100 10 85 10 Z" fill="#EA4335" />
      <circle cx="85" cy="37" r="11" fill="#B71C1C" />
    </g>
  </svg>
)

const AppleMapsIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <clipPath id="apple-maps-shape">
        <rect x="10" y="10" width="100" height="100" rx="22" />
      </clipPath>
    </defs>
    <g clipPath="url(#apple-maps-shape)">
      <rect x="10" y="10" width="100" height="100" fill="#E5E5EA" />
      <path d="M10 60 H110" stroke="#FFFFFF" strokeWidth="8" />
      <path d="M60 10 V110" stroke="#FFFFFF" strokeWidth="8" />
      <path d="M10 10 L110 110" stroke="#FFFFFF" strokeWidth="6" />
      <path d="M10 60 H110" stroke="#007AFF" strokeWidth="4" />
      <path d="M60 10 V110" stroke="#34C759" strokeWidth="4" />
      <path d="M45 45 C45 35 75 35 75 45 C75 55 45 55 45 45 Z" fill="#FF9500" />
      <path d="M52 42 H68 V52 H52 Z" fill="#FFFFFF" />
      <circle cx="60" cy="47" r="2" fill="#FF9500" />
    </g>
    <g>
      <path d="M60 20 C50 20 42 28 42 38 C42 50 60 72 60 72 C60 72 78 50 78 38 C78 28 70 20 60 20 Z" fill="#FF3B30" />
      <circle cx="60" cy="38" r="5" fill="#FFFFFF" />
    </g>
  </svg>
)

// Helper component for styled suggestion icons
const SuggestionIcon = ({ type, isCampus = false, className = "w-4 h-4" }) => {
  if (isCampus) {
    return <GraduationCap className={`${className} text-ozo-red`} />
  }
  switch (type) {
    case 'locality':
      return <Home className={`${className} text-blue-500`} />
    case 'gali':
      return <Route className={`${className} text-emerald-500`} />
    case 'landmark':
      return <MapPin className={`${className} text-ozo-red`} />
    default:
      return <MapPin className={`${className} text-gray-400`} />
  }
}

// Helper to calculate distance between two coordinates in meters
const getDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity
  const R = 6371e3 // metres
  const phi1 = lat1 * Math.PI/180
  const phi2 = lat2 * Math.PI/180
  const deltaPhi = (lat2-lat1) * Math.PI/180
  const deltaLambda = (lon2-lon1) * Math.PI/180

  const a = Math.sin(deltaPhi/2) * Math.sin(deltaPhi/2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda/2) * Math.sin(deltaLambda/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

  return R * c
}

// Reusable Searchable Select Component for premium autocomplete dropdowns
function SearchableSelect({
  label,
  placeholder,
  value,
  options = [],
  onChange,
  required = false,
  disabled = false,
  customAllowed = true,
  icon: IconComponent = MapPin,
  noOptionsMessage = "No matching options found"
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const containerRef = React.useRef(null)

  // Sync display text when value changes
  React.useEffect(() => {
    setSearchQuery(value || '')
  }, [value])

  // Handle click outside to close dropdown
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
        // Restore value if search query was modified without selection
        setSearchQuery(value || '')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [value])

  const filteredOptions = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) {
      return options.slice(0, 30)
    }
    return options.filter(opt => 
      (opt.name && opt.name.toLowerCase().includes(q)) || 
      (opt.name_hi && opt.name_hi.toLowerCase().includes(q)) ||
      (opt.subtitle && opt.subtitle.toLowerCase().includes(q))
    ).slice(0, 30)
  }, [searchQuery, options])

  const exactMatch = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return options.some(opt => opt.name?.toLowerCase().trim() === q)
  }, [searchQuery, options])

  const handleOptionSelect = (opt) => {
    onChange(opt)
    setSearchQuery(opt.name)
    setIsOpen(false)
  }

  const handleCustomSelect = () => {
    if (searchQuery.trim()) {
      onChange({ name: searchQuery.trim(), isCustom: true })
      setIsOpen(false)
    }
  }

  return (
    <div className="relative space-y-1.5" ref={containerRef}>
      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400">
        {label} {required && <span className="text-ozo-red">*</span>}
      </label>
      <div className="relative">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/30 pointer-events-none">
          <IconComponent size={14} />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            setIsOpen(true)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              if (searchQuery.trim()) {
                const match = options.find(o => o.name?.toLowerCase().trim() === searchQuery.toLowerCase().trim())
                if (match) {
                  handleOptionSelect(match)
                } else if (customAllowed) {
                  handleCustomSelect()
                }
              }
            }
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full pl-10 pr-10 py-2.5 border border-gray-200 dark:border-white/10 rounded-xl bg-gray-50/50 dark:bg-white/5 text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-ozo-red placeholder:text-gray-400 dark:placeholder:text-white/20 transition-all font-semibold disabled:opacity-50"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery('')
              onChange(null)
              setIsOpen(true)
            }}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white/60 transition-colors"
          >
            <span className="text-sm font-bold">×</span>
          </button>
        )}
      </div>

      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-2xl z-[1050] max-h-56 overflow-y-auto divide-y divide-gray-100 dark:divide-zinc-850 scrollbar-hide">
          {customAllowed && searchQuery.trim() && !exactMatch && (
            <button
              type="button"
              onClick={handleCustomSelect}
              className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-zinc-800/50 flex items-center justify-between transition-colors text-xs font-bold text-ozo-red border-b border-gray-100 dark:border-zinc-850 bg-red-500/[0.02]"
            >
              <span>Use custom: "{searchQuery}"</span>
              <span className="text-[10px] bg-red-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold text-red-500">Custom</span>
            </button>
          )}

          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt) => (
              <button
                key={opt.id || opt.name}
                type="button"
                onClick={() => handleOptionSelect(opt)}
                className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-zinc-800/50 flex flex-col transition-colors ${
                  opt.isCampus
                    ? 'bg-red-500/[0.04] dark:bg-red-500/[0.08] hover:bg-red-500/[0.08] border-l-2 border-ozo-red'
                    : opt.isCore ? 'bg-amber-500/[0.02] dark:bg-amber-500/[0.03]' : ''
                }`}
              >
                <div className="flex items-center justify-between w-full gap-2">
                  <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5 font-sans">
                    <SuggestionIcon type={opt.type} isCampus={opt.isCampus} className="w-3.5 h-3.5 shrink-0" />
                    {opt.isCampus && <Star size={11} className="text-ozo-red fill-ozo-red shrink-0" />}
                    <span className={opt.isCampus ? 'text-ozo-red font-black' : opt.isCore ? 'text-amber-600 dark:text-amber-400 font-bold' : ''}>
                      {opt.name}
                    </span>
                    {opt.isBikeOnly && <Bike size={12} className="text-amber-500 shrink-0" />}
                  </span>
                  {opt.badgeText && (
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider shrink-0 ${
                      opt.isCampus
                        ? 'bg-ozo-red/10 text-ozo-red border border-ozo-red/20'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    }`}>
                      {opt.badgeText}
                    </span>
                  )}
                </div>
                {opt.subtitle && (
                  <span className={`text-[10px] mt-0.5 ${
                    opt.isCampus 
                      ? 'text-red-700/80 dark:text-red-400/80 font-medium' 
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {opt.subtitle}
                  </span>
                )}
              </button>
            ))
          ) : (
            <div className="px-4 py-3 text-xs text-gray-400 dark:text-zinc-500 text-center font-semibold">
              {noOptionsMessage}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function AddressForm({
  formData,
  onChange,
  showContactFields = true,
  mapConfig = null,
  showMapPicker = false,
  setShowMapPicker = null,
  OzoMapPicker = null,
  onMapLocationSelect = null
}) {
  // Consume cached operating cities and hierarchical data layers
  const activeCities = useLocationStore((state) => state.activeCities || [])
  const localities = useLocationStore((state) => state.localities || [])
  const landmarks = useLocationStore((state) => state.landmarks || [])
  const galis = useLocationStore((state) => state.galis || [])
  const selectedCitySlug = useLocationStore((state) => state.selectedCitySlug || state.browsingCitySlug || state.deliveryCitySlug)

  const [pastedLink, setPastedLink] = React.useState(formData.google_maps_url || '')
  const [isResolving, setIsResolving] = React.useState(false)
  const [showLinkAutofill, setShowLinkAutofill] = React.useState(!!formData.google_maps_url)

  // Sync state if google_maps_url is updated on load or props change
  React.useEffect(() => {
    if (formData.google_maps_url && !pastedLink) {
      setPastedLink(formData.google_maps_url)
    }
    if (formData.google_maps_url) {
      setShowLinkAutofill(true)
    }
  }, [formData.google_maps_url])

  const activeLinkAutofill = showLinkAutofill && !mapConfig?.hide_map_links

  // Auto-fetch active cities and hierarchical database entries on mount
  React.useEffect(() => {
    const loadStoreData = async () => {
      try {
        const store = useLocationStore.getState()
        if (!store.activeCities || store.activeCities.length === 0) {
          await store.fetchActiveCities()
        }
        if (!store.localities || store.localities.length === 0) {
          await store.fetchHierarchicalData()
        }
      } catch (err) {
        console.error('Failed to load locations hierarchical data:', err)
      }
    }
    loadStoreData()
  }, [])

  // Parse serviceable cities from operating cities configuration (1 chip per operating city)
  const serviceableCities = React.useMemo(() => {
    return activeCities.map(city => {
      const cityName = city?.name ? city.name.split(',')[0].trim() : ''
      const allowedPins = Array.isArray(city.allowed_pincodes) ? city.allowed_pincodes : []
      const primaryPin = allowedPins[0] || ''
      return {
        id: city.id,
        slug: city.slug,
        cityName,
        fullName: city.name,
        state: city.state || 'Bihar',
        pincode: primaryPin,
        allowedPincodes: allowedPins,
        latitude: city.latitude,
        longitude: city.longitude,
        displayLabel: allowedPins.length > 0 
          ? `${cityName} (${allowedPins.join(', ')})` 
          : cityName
      }
    })
  }, [activeCities])

  // Auto-select relevant serviceable city & pincode if not set
  React.useEffect(() => {
    if (!formData.city && !formData.pincode && serviceableCities.length > 0) {
      let matched = serviceableCities[0]
      if (selectedCitySlug) {
        const found = serviceableCities.find(c => 
          selectedCitySlug.toLowerCase().includes(c.cityName.toLowerCase()) ||
          c.cityName.toLowerCase().includes(selectedCitySlug.toLowerCase()) ||
          selectedCitySlug.toLowerCase() === (c.slug || '').toLowerCase()
        )
        if (found) matched = found
      }
      onChange({
        pincode: matched.pincode,
        city: matched.cityName,
        state: matched.state,
        latitude: matched.latitude ? parseFloat(matched.latitude) : null,
        longitude: matched.longitude ? parseFloat(matched.longitude) : null
      })
    }
  }, [formData.city, formData.pincode, serviceableCities, selectedCitySlug, onChange])

  // If address_line2 was set to generic city name (e.g. "Bhagalpur, BIHAR" or "Bhagalpur"),
  // reset it so the user can select their hostel/campus/area cleanly.
  React.useEffect(() => {
    if (formData.address_line2 && activeCities.length > 0) {
      const line2Lower = formData.address_line2.toLowerCase().trim()
      const isJustCity = activeCities.some(c => {
        const cName = (c.name || '').toLowerCase().trim()
        const cSlug = (c.slug || '').toLowerCase().trim()
        const baseName = cName.split(',')[0].trim()
        return line2Lower === cName || line2Lower === cSlug || line2Lower === baseName || 
               line2Lower === `${baseName}, bihar` || line2Lower === `${cName}, bihar`
      })
      if (isJustCity) {
        onChange({
          address_line2: '',
          locality_id: null
        })
      }
    }
  }, [formData.address_line2, activeCities, onChange])

  // Get active locality object by matching current form's address_line2 string or locality_id
  const currentLocality = React.useMemo(() => {
    if (formData.locality_id) {
      const found = localities.find(loc => loc.id === formData.locality_id)
      if (found) return found
    }
    if (!formData.address_line2) return null
    return localities.find(loc => 
      loc.name.toLowerCase().trim() === formData.address_line2.toLowerCase().trim()
    )
  }, [formData.locality_id, formData.address_line2, localities])

  // Get active Gali/Apartment object by matching current form's gali_id
  const currentGali = React.useMemo(() => {
    if (formData.gali_id) {
      const found = galis.find(g => g.id === formData.gali_id)
      if (found) return found
    }
    return null
  }, [formData.gali_id, galis])

  // Get active landmark object by matching current form's landmark_id or name
  const currentLandmark = React.useMemo(() => {
    if (formData.landmark_id) {
      const found = landmarks.find(lm => lm.id === formData.landmark_id)
      if (found) return found
    }
    if (!formData.landmark) return null
    return landmarks.find(lm => 
      lm.name.toLowerCase().trim() === formData.landmark.toLowerCase().trim()
    )
  }, [formData.landmark_id, formData.landmark, landmarks])

  // Calculate distance from pinned/selected coordinates to locality/street/landmark center
  const radiusMetrics = React.useMemo(() => {
    if (!currentLocality || !formData.latitude || !formData.longitude) return null;

    // 1. If Gali is selected, calculate distance relative to Gali's coordinates
    if (currentGali && currentGali.latitude && currentGali.longitude) {
      const lat1 = parseFloat(formData.latitude);
      const lon1 = parseFloat(formData.longitude);
      const lat2 = parseFloat(currentGali.latitude);
      const lon2 = parseFloat(currentGali.longitude);

      const R = 6371; // Earth's radius in km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distMeters = R * c * 1000;
      const allowedRadius = parseFloat(currentGali.length) || parseFloat(currentGali.radius) || 300;

      return {
        type: 'street',
        name: currentGali.name,
        distance: distMeters,
        allowedRadius,
        isValid: distMeters <= (allowedRadius + 10)
      };
    }

    // 2. If Landmark is selected, calculate distance relative to Landmark's coordinates
    if (currentLandmark && currentLandmark.latitude && currentLandmark.longitude) {
      const lat1 = parseFloat(formData.latitude);
      const lon1 = parseFloat(formData.longitude);
      const lat2 = parseFloat(currentLandmark.latitude);
      const lon2 = parseFloat(currentLandmark.longitude);

      const R = 6371; // Earth's radius in km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distMeters = R * c * 1000;
      const allowedRadius = parseFloat(currentLandmark.radius) || 100;

      return {
        type: 'landmark',
        name: currentLandmark.name,
        distance: distMeters,
        allowedRadius,
        isValid: distMeters <= (allowedRadius + 10)
      };
    }

    // 3. Fallback: Locality coordinates
    if (currentLocality.latitude && currentLocality.longitude) {
      const lat1 = parseFloat(formData.latitude);
      const lon1 = parseFloat(formData.longitude);
      const lat2 = parseFloat(currentLocality.latitude);
      const lon2 = parseFloat(currentLocality.longitude);

      const R = 6371; // Earth's radius in km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distMeters = R * c * 1000;
      const allowedRadius = parseFloat(currentLocality.radius) || 250;

      return {
        type: 'locality',
        name: currentLocality.name,
        distance: distMeters,
        allowedRadius,
        isValid: distMeters <= (allowedRadius + 10)
      };
    }

    return null;
  }, [currentLocality, currentGali, currentLandmark, formData.latitude, formData.longitude])

  // Derive active operating city and its allowed pincodes purely from database records
  const currentCityObj = React.useMemo(() => {
    const pin = (formData.pincode || '').toString().trim()
    const city = (formData.city || '').toLowerCase().trim()

    // 1. Match by pincode in operating_cities allowed_pincodes
    if (pin) {
      const byPin = activeCities.find(c => 
        c.allowed_pincodes && Array.isArray(c.allowed_pincodes) && c.allowed_pincodes.map(p => p.toString().trim()).includes(pin)
      )
      if (byPin) return byPin
    }

    // 2. Match by city name or slug
    if (city) {
      const byName = activeCities.find(c => {
        const cName = (c.name || '').toLowerCase()
        const cSlug = (c.slug || '').toLowerCase()
        return cName.includes(city) || city.includes(cName) || cSlug.includes(city)
      })
      if (byName) return byName
    }

    // 3. Fallback to first active city
    return activeCities[0] || null
  }, [activeCities, formData.pincode, formData.city])

  const activeCityName = currentCityObj?.name ? currentCityObj.name.split(',')[0].trim() : (formData.city || '')
  const activePincode = (formData.pincode || currentCityObj?.allowed_pincodes?.[0] || '').toString().trim()
  const allowedPins = React.useMemo(() => {
    if (currentCityObj?.allowed_pincodes && Array.isArray(currentCityObj.allowed_pincodes)) {
      return currentCityObj.allowed_pincodes.map(p => p.toString().trim())
    }
    return activePincode ? [activePincode] : []
  }, [currentCityObj, activePincode])

  // Prepare searchable select options for localities, prioritizing core areas dynamically
  const localitySelectOptions = React.useMemo(() => {
    const relevantLocalities = localities.filter(loc => {
      const locPin = (loc.pincode || '').toString().trim()
      // 1. Direct pincode match with active selected pincode
      if (locPin && activePincode && locPin === activePincode) return true;
      // 2. Match with any allowed pincode for this operating city from DB
      if (locPin && allowedPins.includes(locPin)) return true;
      // 3. Spatial proximity match: If locality coordinates are within city's service_radius_km from DB
      if (currentCityObj?.latitude && currentCityObj?.longitude && loc.latitude && loc.longitude) {
        const distKm = getDistance(
          parseFloat(currentCityObj.latitude),
          parseFloat(currentCityObj.longitude),
          parseFloat(loc.latitude),
          parseFloat(loc.longitude)
        ) / 1000;
        const maxRadius = Math.max(parseFloat(currentCityObj.service_radius_km) || 25.0, 25.0);
        if (distKm <= maxRadius) return true;
      }
      return false;
    });

    // Fallback: If no localities match the filter, show all so user isn't stuck
    const sourceLocalities = relevantLocalities.length > 0 ? relevantLocalities : localities;
    const relevantLocalityIds = new Set(sourceLocalities.map(l => l.id));

    const mappedLocalities = sourceLocalities.map(loc => {
      const isPrimary = !!loc.is_primary;
      const isCampus = loc.name.toLowerCase().includes('bce') || 
                       loc.name.toLowerCase().includes('campus') || 
                       loc.name.toLowerCase().includes('hostel');
      const priority = parseInt(loc.priority) || 0;
      const displayPin = loc.pincode || activePincode;
      
      let subtitle = `Area/Mohalla • ${displayPin}`;
      if (isCampus) {
        subtitle = `🏛️ BCE Campus Zone • ${displayPin}`;
      } else if (isPrimary) {
        subtitle = `Primary Area • ${displayPin}`;
      }

      return {
        id: loc.id,
        name: loc.name,
        pincode: loc.pincode,
        latitude: loc.latitude,
        longitude: loc.longitude,
        subtitle,
        isCore: isPrimary || isCampus,
        isCampus,
        badgeText: isCampus ? 'BCE Campus' : (isPrimary ? 'Primary' : null),
        priority: isCampus ? priority + 200 : priority,
        type: 'locality'
      };
    });

    const sourceGalis = galis.filter(g => {
      if (relevantLocalityIds.has(g.locality_id)) return true;
      const gPin = (g.pincode || '').toString().trim();
      if (gPin && allowedPins.includes(gPin)) return true;
      return false;
    });

    const mappedGalis = sourceGalis.map(g => {
      const parentLoc = localities.find(l => l.id === g.locality_id);
      const isHostel = g.type === 'hostel' || g.name.toLowerCase().includes('hostel');
      const isCampus = isHostel || (parentLoc && parentLoc.name.toLowerCase().includes('bce'));
      return {
        id: g.id,
        name: g.name,
        pincode: g.pincode || parentLoc?.pincode,
        latitude: g.latitude,
        longitude: g.longitude,
        subtitle: isHostel 
          ? `🛏️ Student Hostel • ${parentLoc ? parentLoc.name : activeCityName}`
          : (parentLoc ? `Street/Apartment in ${parentLoc.name}` : 'Street/Apartment'),
        isCore: isCampus,
        isCampus,
        badgeText: isHostel ? 'Hostel Block' : null,
        priority: isHostel ? 150 : 0,
        type: 'gali',
        parentLocalityId: g.locality_id
      };
    });

    const sourceLandmarks = landmarks.filter(lm => relevantLocalityIds.has(lm.locality_id));

    const mappedLandmarks = sourceLandmarks.map(lm => {
      const parentLoc = localities.find(l => l.id === lm.locality_id);
      const isCampus = lm.name.toLowerCase().includes('bce') || (parentLoc && parentLoc.name.toLowerCase().includes('bce'));
      return {
        id: lm.id,
        name: lm.name,
        pincode: parentLoc?.pincode,
        latitude: lm.latitude,
        longitude: lm.longitude,
        subtitle: parentLoc ? `Landmark near ${parentLoc.name}` : `Landmark • ${activeCityName}`,
        isCore: false,
        isCampus,
        priority: 0,
        type: 'landmark',
        parentLocalityId: lm.locality_id
      };
    });

    // Sort localities: Campus areas first, then primary, then alphabetical
    const sortedLocalities = mappedLocalities.sort((a, b) => {
      if (a.isCampus !== b.isCampus) return a.isCampus ? -1 : 1;
      if (a.isCore !== b.isCore) return a.isCore ? -1 : 1;
      if (a.priority !== b.priority) return b.priority - a.priority;
      return a.name.localeCompare(b.name);
    });

    // Hostels prioritized at the top of streets/galis
    const sortedGalis = mappedGalis.sort((a, b) => {
      if (a.isCampus !== b.isCampus) return a.isCampus ? -1 : 1;
      if (a.isCore !== b.isCore) return a.isCore ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    // Combine all options. Keep campus areas and hostels at the top so they show up immediately.
    return [...sortedLocalities, ...sortedGalis, ...mappedLandmarks];
  }, [localities, galis, landmarks, currentCityObj, activeCityName, activePincode, allowedPins])

  // Filter landmarks strictly relative to current selected locality ID
  const filteredLandmarks = React.useMemo(() => {
    if (!currentLocality) return []

    const list = landmarks.filter(lm => lm.locality_id === currentLocality.id)
    
    return list.map(lm => {
      const parentLoc = localities.find(l => l.id === lm.locality_id)
      return {
        id: lm.id,
        name: lm.name,
        name_hi: lm.name_hi,
        pincode: parentLoc?.pincode,
        latitude: lm.latitude,
        longitude: lm.longitude,
        subtitle: `Landmark • ${parentLoc ? parentLoc.name : activeCityName}`
      }
    })
  }, [landmarks, currentLocality, localities, activeCityName])

  // Filter galis / apartments strictly relative to current selected locality ID
  const filteredGalis = React.useMemo(() => {
    if (!currentLocality) return []

    // Get galis mapped to this locality
    const matchedGalis = galis.filter(g => g.locality_id === currentLocality.id)
    const galiOptions = matchedGalis.map(g => {
      const parentLoc = localities.find(l => l.id === g.locality_id)
      const isBikeOnly = g.vehicle_restriction === 'bike_only'
      const isHostel = g.type === 'hostel' || g.name.toLowerCase().includes('hostel')
      const isCampus = isHostel || (parentLoc && parentLoc.name.toLowerCase().includes('bce'))
      const subtitleText = isHostel
        ? `🛏️ Student Hostel • ${parentLoc ? parentLoc.name : activeCityName}`
        : (isBikeOnly 
            ? `Bike Only • Street/Apartment • ${parentLoc ? parentLoc.name : activeCityName}`
            : `Street/Apartment • ${parentLoc ? parentLoc.name : activeCityName}`)
      return {
        id: g.id,
        name: g.name,
        pincode: g.pincode || parentLoc?.pincode,
        latitude: g.latitude,
        longitude: g.longitude,
        subtitle: subtitleText,
        vehicle_restriction: g.vehicle_restriction || 'all',
        isBikeOnly,
        isCampus,
        isCore: isCampus,
        badgeText: isHostel ? 'Hostel Block' : null
      }
    })

    // Get landmarks mapped to this locality to also display in the Gali dropdown
    const matchedLandmarks = landmarks.filter(lm => lm.locality_id === currentLocality.id)
    const landmarkOptions = matchedLandmarks.map(lm => {
      const parentLoc = localities.find(l => l.id === lm.locality_id)
      return {
        id: lm.id,
        name: lm.name,
        name_hi: lm.name_hi,
        pincode: parentLoc?.pincode,
        latitude: lm.latitude,
        longitude: lm.longitude,
        subtitle: `Landmark • ${parentLoc ? parentLoc.name : activeCityName}`,
        vehicle_restriction: 'all',
        isBikeOnly: false
      }
    })

    // Return combined list (galis first, then landmarks)
    return [...galiOptions, ...landmarkOptions]
  }, [galis, landmarks, currentLocality, localities, activeCityName])

  const housePlaceholder = React.useMemo(() => {
    const locName = (currentLocality?.name || '').toLowerCase()
    const galiName = (currentGali?.name || '').toLowerCase()
    const galiType = (currentGali?.type || '').toLowerCase()

    const isHostel = galiType === 'hostel' || locName.includes('hostel') || galiName.includes('hostel')
    if (isHostel) {
      return 'e.g. Room No 204, Floor 2, Hostel Block'
    }

    const isCampusOrCollege = locName.includes('college') || locName.includes('campus') || locName.includes('university')
    if (isCampusOrCollege) {
      return 'e.g. Room No 12, Student Lodge / Staff Quarters'
    }

    return 'e.g. Flat 3A, House No 12, Maa Sharda Complex'
  }, [currentLocality, currentGali]);

  const updateField = (key, value) => {
    onChange({ [key]: value })
  }

  // Handle locality dropdown selection
  const handleLocalitySelect = (opt) => {
    if (!opt) {
      onChange({
        address_line2: '',
        locality_id: null,
        landmark: '',
        landmark_id: null,
        gali_id: null,
        latitude: null,
        longitude: null
      })
      return
    }

    if (opt.type === 'gali') {
      const parentLoc = localities.find(l => l.id === opt.parentLocalityId)
      const targetPin = opt.pincode || parentLoc?.pincode || activePincode

      const updateData = {
        address_line2: parentLoc ? parentLoc.name : '',
        locality_id: parentLoc ? parentLoc.id : null,
        gali_id: opt.id || null,
        landmark: '',
        landmark_id: null,
        ...(targetPin ? { pincode: targetPin } : {}),
        latitude: opt.latitude ? parseFloat(opt.latitude) : null,
        longitude: opt.longitude ? parseFloat(opt.longitude) : null
      }

      onChange(updateData)

      if (onMapLocationSelect && opt.latitude && opt.longitude) {
        onMapLocationSelect({
          lat: parseFloat(opt.latitude),
          lng: parseFloat(opt.longitude),
          displayName: `${opt.name}, ${parentLoc ? parentLoc.name + ', ' : ''}${activeCityName}, Bihar, ${targetPin}`,
          isManualSelect: true,
          addressDetails: {
            road: opt.name,
            suburb: parentLoc ? parentLoc.name : '',
            city: activeCityName,
            state: formData.state || 'Bihar',
            postcode: targetPin
          }
        })
      }
    } else if (opt.type === 'landmark') {
      const parentLoc = localities.find(l => l.id === opt.parentLocalityId)
      const targetPin = opt.pincode || parentLoc?.pincode || activePincode
      
      const updateData = {
        address_line2: parentLoc ? parentLoc.name : '',
        locality_id: parentLoc ? parentLoc.id : null,
        gali_id: null,
        landmark: opt.name,
        landmark_id: opt.id || null,
        ...(targetPin ? { pincode: targetPin } : {}),
        latitude: opt.latitude ? parseFloat(opt.latitude) : null,
        longitude: opt.longitude ? parseFloat(opt.longitude) : null
      }

      onChange(updateData)

      if (onMapLocationSelect && opt.latitude && opt.longitude) {
        onMapLocationSelect({
          lat: parseFloat(opt.latitude),
          lng: parseFloat(opt.longitude),
          displayName: `${opt.name}, ${parentLoc ? parentLoc.name + ', ' : ''}${activeCityName}, Bihar, ${targetPin}`,
          isManualSelect: true,
          addressDetails: {
            road: '',
            suburb: parentLoc ? parentLoc.name : '',
            city: activeCityName,
            state: formData.state || 'Bihar',
            postcode: targetPin
          }
        })
      }
    } else {
      // Regular locality
      const targetPin = opt.pincode || activePincode
      const updateData = {
        address_line2: opt.name,
        locality_id: opt.id || null,
        landmark: '',
        landmark_id: null,
        gali_id: null,
        ...(targetPin ? { pincode: targetPin } : {}),
        latitude: opt.latitude ? parseFloat(opt.latitude) : null,
        longitude: opt.longitude ? parseFloat(opt.longitude) : null
      }

      onChange(updateData)

      if (onMapLocationSelect && opt.latitude && opt.longitude) {
        onMapLocationSelect({
          lat: parseFloat(opt.latitude),
          lng: parseFloat(opt.longitude),
          displayName: `${opt.name}, ${activeCityName}, Bihar, ${targetPin}`,
          isManualSelect: true,
          addressDetails: {
            road: '',
            suburb: opt.name,
            city: activeCityName,
            state: formData.state || 'Bihar',
            postcode: targetPin
          }
        })
      }
    }
  }

  // Handle landmark dropdown selection (Snaps rider directly to landmark coordinates)
  const handleLandmarkSelect = (opt) => {
    if (!opt) {
      onChange({ landmark: '', landmark_id: null })
      return
    }

    const targetPin = opt.pincode || activePincode
    const updateData = {
      landmark: opt.name,
      landmark_id: opt.id || null,
      ...(opt.pincode ? { pincode: opt.pincode } : {})
    }

    // Set precise snapping coordinates from landmark
    if (opt.latitude && opt.longitude) {
      updateData.latitude = parseFloat(opt.latitude)
      updateData.longitude = parseFloat(opt.longitude)
    }

    onChange(updateData)

    if (onMapLocationSelect && opt.latitude && opt.longitude) {
      onMapLocationSelect({
        lat: parseFloat(opt.latitude),
        lng: parseFloat(opt.longitude),
        displayName: `${opt.name}, ${formData.address_line2 ? formData.address_line2 + ', ' : ''}${activeCityName}, Bihar, ${targetPin}`,
        isManualSelect: true,
        addressDetails: {
          road: '',
          suburb: formData.address_line2 || '',
          city: activeCityName,
          state: formData.state || 'Bihar',
          postcode: targetPin
        }
      })
    }
  }

  // Handle Gali/Apartment selection (Snaps coordinates and records gali_id)
  const handleGaliSelect = (opt) => {
    if (!opt) {
      onChange({ gali_id: null })
      return
    }

    const targetPin = opt.pincode || activePincode
    const updateData = {
      gali_id: opt.id || null,
      ...(opt.pincode ? { pincode: opt.pincode } : {})
    }

    // Snap coordinates to granular street/gali
    if (opt.latitude && opt.longitude) {
      updateData.latitude = parseFloat(opt.latitude)
      updateData.longitude = parseFloat(opt.longitude)
    }

    onChange(updateData)

    if (onMapLocationSelect && opt.latitude && opt.longitude) {
      onMapLocationSelect({
        lat: parseFloat(opt.latitude),
        lng: parseFloat(opt.longitude),
        displayName: `${opt.name}, ${formData.address_line2 ? formData.address_line2 + ', ' : ''}${activeCityName}, Bihar, ${targetPin}`,
        isManualSelect: true,
        addressDetails: {
          road: opt.name,
          suburb: formData.address_line2 || '',
          city: activeCityName,
          state: formData.state || 'Bihar',
          postcode: targetPin
        }
      })
    }
  }

  const resolveLocationLink = async (url) => {
    if (!url) return
    setIsResolving(true)
    const toastId = toast.loading('Saving location link...')
    
    try {
      let resolvedUrl = url.trim()
      // Extract URL if there's surrounding text
      const urlRegex = /(https?:\/\/[^\s]+)/gi
      const match = resolvedUrl.match(urlRegex)
      if (match) {
        resolvedUrl = match[0]
      } else {
        const mapDomains = ['maps.app.goo.gl', 'goo.gl', 'maps.google.com', 'google.com', 'g.co', 'g.page']
        const hasDomain = mapDomains.some(d => resolvedUrl.toLowerCase().includes(d))
        if (hasDomain && !resolvedUrl.startsWith('http://') && !resolvedUrl.startsWith('https://')) {
          resolvedUrl = 'https://' + resolvedUrl
        }
      }

      // Try client-side extraction of coordinates to update map location
      const coords = extractCoordinatesFromUrl(resolvedUrl)
      
      const updateData = {
        google_maps_url: resolvedUrl,
        address_line2: 'Delivery via Link'
      }

      // Pre-fill address_line1 with the link to satisfy the required field
      updateData.address_line1 = `Location Link: ${resolvedUrl}`

      if (coords) {
        updateData.latitude = coords.lat
        updateData.longitude = coords.lng
        
        if (onMapLocationSelect) {
          onMapLocationSelect({
            lat: coords.lat,
            lng: coords.lng,
            displayName: `Pinned from Link: ${resolvedUrl}`,
            addressDetails: {
              road: resolvedUrl,
              city: activeCityName,
              state: formData.state || 'Bihar',
              postcode: activePincode
            }
          })
        }
      }

      onChange(updateData)
      toast.success('Location link saved successfully!', { id: toastId })
    } catch (error) {
      console.error('Failed to save location link:', error)
      toast.error('Failed to save location link', { id: toastId })
    } finally {
      setIsResolving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Map Section at the top */}
      {!activeLinkAutofill && !mapConfig?.hide_map && OzoMapPicker && (
        <div className="space-y-2">
          <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-zinc-550">
            Pin Delivery Location
          </label>
          <div className="border border-gray-150 dark:border-white/5 rounded-2xl overflow-hidden bg-white dark:bg-white/5 shadow-sm">
            <div className="h-48 w-full relative">
              <OzoMapPicker
                initialPosition={formData.latitude && formData.longitude ? [formData.latitude, formData.longitude] : null}
                onLocationSelect={onMapLocationSelect}
              />
            </div>
            <div className="p-3 bg-gray-50 dark:bg-zinc-900/30 border-t border-gray-150 dark:border-white/5 text-[10px] font-bold text-gray-550 dark:text-gray-400 flex items-center gap-1.5">
              <MapIcon size={12} className="text-ozo-red shrink-0" />
              <span>Drag or tap the map to fine-tune your exact delivery pin point.</span>
            </div>
          </div>
        </div>
      )}

      {/* Optional Link Autofill Accordion */}
      {!mapConfig?.hide_map_links && (
        <div className="border border-gray-100 dark:border-white/5 rounded-2xl bg-gray-50/35 dark:bg-zinc-950/20 overflow-hidden transition-all duration-300">
        <button
          type="button"
          onClick={() => setShowLinkAutofill(!showLinkAutofill)}
          className="w-full flex items-center justify-between p-3.5 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-zinc-900/30 transition-all gap-2"
        >
          <span className="flex items-center gap-2.5 min-w-0">
            <div className="flex items-center gap-1 shrink-0">
              <WhatsAppIcon className="w-[18px] h-[18px]" />
              <GoogleMapsIcon className="w-[18px] h-[18px]" />
              <AppleMapsIcon className="w-[18px] h-[18px]" />
            </div>
            <span className="truncate text-xs font-extrabold text-gray-700 dark:text-gray-200">
              Paste your location
            </span>
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] bg-gray-200/50 dark:bg-white/10 px-1.5 py-0.5 rounded font-black text-gray-500 dark:text-zinc-400 uppercase tracking-wide">
              Optional
            </span>
            {showLinkAutofill ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
          </div>
        </button>

        {showLinkAutofill && (
          <div className="p-4 pt-0 space-y-3 slide-up border-t border-gray-100/50 dark:border-white/5 mt-1">
            <div className="text-[10px] text-gray-450 dark:text-zinc-500 font-semibold flex items-center gap-1.5 flex-wrap">
              <span>Supports:</span>
              <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                <WhatsAppIcon className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </div>
              <span className="text-gray-300 dark:text-zinc-700">|</span>
              <div className="flex items-center gap-1 text-red-500 font-bold">
                <GoogleMapsIcon className="w-3.5 h-3.5" />
                <span>Google Maps</span>
              </div>
              <span className="text-gray-300 dark:text-zinc-700">|</span>
              <div className="flex items-center gap-1 text-blue-500 font-bold">
                <AppleMapsIcon className="w-3.5 h-3.5" />
                <span>Apple Maps</span>
              </div>
            </div>
            
            <div className="relative flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={pastedLink}
                  onChange={(e) => setPastedLink(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-black/20 text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-ozo-red placeholder:text-gray-400 dark:placeholder:text-white/20 transition-all font-semibold"
                  placeholder="Paste WhatsApp text, Google Maps, or Apple Maps link..."
                />
              </div>
              <button
                type="button"
                disabled={!pastedLink || isResolving}
                onClick={async () => {
                  if (!pastedLink) return
                  await resolveLocationLink(pastedLink)
                }}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                  pastedLink && !isResolving
                    ? 'bg-ozo-red text-white hover:bg-red-600 shadow-sm cursor-pointer'
                    : 'bg-gray-100 dark:bg-white/5 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isResolving ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Link</span>
                )}
              </button>
            </div>

            {formData.google_maps_url && (
              <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10 flex items-center justify-between gap-3 text-xs text-emerald-800 dark:text-emerald-350 font-semibold animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="min-w-0">
                  <p className="font-extrabold text-[11px] text-emerald-700 dark:text-emerald-400">Location Link Saved & Active</p>
                  <a 
                    href={formData.google_maps_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="truncate font-mono text-[10px] opacity-80 mt-0.5 block text-emerald-600 dark:text-emerald-450 hover:underline"
                  >
                    {formData.google_maps_url}
                  </a>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPastedLink('')
                    onChange({
                      google_maps_url: '',
                      address_line1: '',
                      address_line2: '',
                      latitude: null,
                      longitude: null
                    })
                  }}
                  className="text-[10px] text-red-500 hover:text-red-650 hover:bg-red-50 dark:hover:bg-red-950/20 px-2.5 py-1.5 rounded-lg transition-all shrink-0 font-bold"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      )}

      {/* 2. Contact Details (Receiver Name/Phone) */}
      {showContactFields && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
              Receiver's Name *
            </label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/20 pointer-events-none">
                <User size={14} />
              </div>
              <input
                type="text"
                value={formData.receiver_name || ''}
                onChange={(e) => updateField('receiver_name', e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-white/10 rounded-xl bg-gray-50/50 dark:bg-white/5 text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-ozo-red placeholder:text-gray-400 dark:placeholder:text-white/20 transition-all font-semibold"
                placeholder="e.g. Aashu Mishra"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
              Receiver's Phone *
            </label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/20 pointer-events-none">
                <Phone size={14} />
              </div>
              <input
                type="tel"
                value={formData.receiver_phone || ''}
                onChange={(e) => updateField('receiver_phone', e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-white/10 rounded-xl bg-gray-50/50 dark:bg-white/5 text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-ozo-red placeholder:text-gray-400 dark:placeholder:text-white/20 transition-all font-semibold"
                placeholder="10-digit mobile number"
                required
              />
            </div>
          </div>
        </div>
      )}

      {/* 3. Address Type Selector */}
      {!activeLinkAutofill && (
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
            Save Address As
          </label>
          <div className="flex gap-2">
            {[
              { label: 'Home', icon: Home },
              { label: 'Work', icon: Briefcase },
              { label: 'Other', icon: MapPin }
            ].map(({ label: lbl, icon: Icon }) => (
              <button
                key={lbl}
                type="button"
                onClick={() => updateField('label', lbl)}
                className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  formData.label === lbl
                    ? 'border-ozo-red bg-red-500/5 text-ozo-red shadow-sm'
                    : 'border-gray-200 dark:border-white/10 bg-transparent text-gray-550 hover:border-gray-300 dark:hover:border-white/20'
                }`}
              >
                <Icon size={12} />
                {lbl}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 4. Address Information Fields */}
      {!activeLinkAutofill && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between pb-1 border-b border-gray-150 dark:border-zinc-800">
          <span className="text-[10px] font-black uppercase tracking-widest text-ozo-red">
            Address Information
          </span>
        </div>

        {/* City & Pincode Chips */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400">
            Delivery City & Pincode <span className="text-ozo-red">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {serviceableCities.map(item => {
              const currentPin = (formData.pincode || '').toString().trim()
              const currentCity = (formData.city || '').toLowerCase().trim()
              const isSelected = 
                (currentCity && (currentCity === item.cityName.toLowerCase() || item.cityName.toLowerCase().includes(currentCity))) ||
                (currentPin && item.allowedPincodes.includes(currentPin))

              return (
                <button
                  key={item.id || item.cityName}
                  type="button"
                  onClick={() => {
                    const isDifferentCity = !isSelected;
                    const resetObj = isDifferentCity ? {
                      address_line2: '',
                      locality_id: null,
                      gali_id: null,
                      landmark: '',
                      landmark_id: null
                    } : {};

                    // Keep existing pincode if it is already in this city's allowed pincodes; otherwise use primary
                    const resolvedPin = (currentPin && item.allowedPincodes.includes(currentPin)) 
                      ? currentPin 
                      : item.pincode;

                    onChange({
                      ...resetObj,
                      pincode: resolvedPin,
                      city: item.cityName,
                      state: item.state,
                      latitude: item.latitude ? parseFloat(item.latitude) : null,
                      longitude: item.longitude ? parseFloat(item.longitude) : null
                    })
                    if (onMapLocationSelect && item.latitude && item.longitude) {
                      onMapLocationSelect({
                        lat: parseFloat(item.latitude),
                        lng: parseFloat(item.longitude),
                        displayName: `${item.cityName}, ${item.state}, ${resolvedPin}`,
                        isManualSelect: true,
                        addressDetails: {
                          road: '',
                          suburb: '',
                          city: item.cityName,
                          state: item.state,
                          postcode: resolvedPin
                        }
                      })
                    }
                  }}
                  className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'border-ozo-red bg-red-500/10 text-ozo-red shadow-sm'
                      : 'border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  <MapPin size={12} className={isSelected ? 'text-ozo-red' : 'text-gray-400'} />
                  {item.displayLabel}
                  {isSelected && <Check size={11} className="text-ozo-red shrink-0" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Locality Dropdown */}
        <SearchableSelect
          label="Area / Locality"
          placeholder="Search and select your Area/Locality..."
          value={formData.address_line2}
          options={localitySelectOptions}
          onChange={handleLocalitySelect}
          required={true}
          icon={Home}
          noOptionsMessage="No localities found. Type to use custom area."
        />

        {formData.address_line2 ? (
          <div className="space-y-4 slide-up">
            {/* Gali / Apartment / Street */}
            <SearchableSelect
              label="Street / Gali / Apartment (Optional)"
              placeholder={currentLocality ? "Search streets/galis in this area..." : "Please select an Area/Locality first"}
              value={currentGali?.name || ''}
              options={filteredGalis}
              onChange={handleGaliSelect}
              required={false}
              disabled={!formData.address_line2}
              icon={Route}
              noOptionsMessage="No streets recorded in this area. Type custom details above."
            />

            {/* House details */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
                Flat / House No. / Building / Lodge <span className="text-ozo-red">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/20 pointer-events-none">
                  <FileText size={14} />
                </div>
                <input
                  type="text"
                  value={formData.address_line1 || ''}
                  onChange={(e) => updateField('address_line1', e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-black/20 text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-ozo-red placeholder:text-gray-400 dark:placeholder:text-white/20 transition-all font-semibold"
                  placeholder={housePlaceholder}
                  required
                />
              </div>
            </div>

            {/* Landmark */}
            <SearchableSelect
              label="Nearest Landmark (Optional)"
              placeholder={currentLocality ? "Search nearby landmarks..." : "Please select an Area/Locality first"}
              value={formData.landmark}
              options={filteredLandmarks}
              onChange={handleLandmarkSelect}
              required={false}
              disabled={!formData.address_line2}
              icon={MapPin}
              noOptionsMessage="No matching landmarks. Type to enter a custom landmark."
            />

            {/* Pin Info Banner */}
            {radiusMetrics && (
              <div className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-start gap-2.5 transition-all shadow-sm ${
                radiusMetrics.isValid 
                  ? 'bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400' 
                  : 'bg-blue-500/5 dark:bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400'
              }`}>
                {radiusMetrics.isValid ? (
                  <>
                    <Check size={16} className="shrink-0 text-emerald-500 mt-0.5" />
                    <div>
                      <p className="font-extrabold text-sm mb-0.5">
                        ✓ Address Verified {
                          radiusMetrics.type === 'street' ? `on Street: ${radiusMetrics.name}` :
                          radiusMetrics.type === 'landmark' ? `near Landmark: ${radiusMetrics.name}` :
                          `inside ${currentLocality.name_hi ? `${currentLocality.name} (${currentLocality.name_hi})` : currentLocality.name}`
                        }
                      </p>
                      <p className="text-[11px] font-medium leading-relaxed opacity-90">
                        Coordinates matched successfully (approx. {Math.round(radiusMetrics.distance)} meters from {
                          radiusMetrics.type === 'street' ? 'street' :
                          radiusMetrics.type === 'landmark' ? 'landmark' :
                          'locality'
                        } center; allowed radius: {radiusMetrics.allowedRadius} meters).
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <Info size={16} className="shrink-0 text-blue-500 mt-0.5" />
                    <div>
                      <p className="font-extrabold text-sm mb-0.5">
                        ℹ️ Location Pin Info for {
                          radiusMetrics.type === 'street' ? `Street: ${radiusMetrics.name}` :
                          radiusMetrics.type === 'landmark' ? `Landmark: ${radiusMetrics.name}` :
                          `${currentLocality.name_hi ? `${currentLocality.name} (${currentLocality.name_hi})` : currentLocality.name}`
                        }
                      </p>
                      <p className="text-[11px] font-medium leading-relaxed opacity-90">
                        This pinned location is {Math.round(radiusMetrics.distance)} meters from the {
                          radiusMetrics.type === 'street' ? 'street' :
                          radiusMetrics.type === 'landmark' ? 'landmark' :
                          'locality'
                        } center. Please verify if the map marker is placed correctly.
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="p-5 rounded-2xl border border-dashed border-gray-200 dark:border-white/10 bg-gray-50/30 dark:bg-zinc-900/20 text-center text-xs font-bold text-gray-400 dark:text-zinc-500 flex flex-col items-center gap-1.5 py-7">
            <span className="text-xl">📍</span>
            <span>Please select an Area/Locality above to proceed.</span>
            <span className="text-[10px] font-medium opacity-80">(Required to calculate serviceability & reveal delivery details)</span>
          </div>
        )}
      </div>
      )}

      {(formData.address_line2 || activeLinkAutofill) && (
        <div className="space-y-4 slide-up">
          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 flex items-center justify-between">
              <span>Delivery Notes / Instructions (Optional)</span>
              {currentGali && currentGali.vehicle_restriction === 'bike_only' && (
                <span className="text-[10px] bg-amber-500/15 dark:bg-amber-500/25 text-amber-600 dark:text-amber-400 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                  <Bike size={11} className="shrink-0" /> Bike Only Lane
                </span>
              )}
            </label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => updateField('notes', e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-white/10 rounded-xl bg-gray-50/50 dark:bg-white/5 text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-ozo-red placeholder:text-gray-400 dark:placeholder:text-white/20 transition-all resize-none h-16 font-medium"
              placeholder={currentGali && currentGali.vehicle_restriction === 'bike_only' 
                ? "This street is narrow, bike delivery only. Any specific instructions?" 
                : "e.g. Ring bell, leave at gate, or call on arrival..."}
            />

            {/* Quick-tap suggestions */}
            <div className="flex flex-wrap gap-2 mt-2">
              {[
                'Call on arrival',
                'Leave at gate',
                'Ring bell',
                "Don't ring bell"
              ].map((label) => {
                const currentNotes = formData.notes || ''
                const isSelected = currentNotes.split(',').map(p => p.trim().toLowerCase()).includes(label.toLowerCase())
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      const parts = currentNotes.split(',').map(p => p.trim()).filter(Boolean)
                      if (isSelected) {
                        const filtered = parts.filter(p => p.toLowerCase() !== label.toLowerCase())
                        updateField('notes', filtered.join(', '))
                      } else {
                        if (!parts.some(p => p.toLowerCase() === label.toLowerCase())) {
                          parts.push(label)
                        }
                        updateField('notes', parts.join(', '))
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all ${
                      isSelected
                        ? 'border-ozo-red bg-red-500/5 text-ozo-red shadow-sm'
                        : 'border-gray-200 dark:border-white/10 bg-transparent text-gray-550 hover:border-gray-305 dark:text-gray-300 dark:hover:border-white/25'
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
            {currentGali && currentGali.vehicle_restriction === 'bike_only' && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400/90 font-bold mt-1.5 flex items-center gap-1.5">
                <Info size={12} className="shrink-0" />
                <span>Note: This street is narrow; delivery will be completed via bike.</span>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
