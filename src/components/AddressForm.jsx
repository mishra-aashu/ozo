import React, { useState } from 'react'
import { Home, Briefcase, MapPin, Map as MapIcon, ChevronUp, ChevronDown, Loader2, Route, Info, Search, FileText, Phone, User, Check, Navigation, Star, Bike } from 'lucide-react'
import { findCityByPincode, findMatchingActiveCity, checkDeliveryZoneStatus, checkPincodeServiceable, useLocationStore } from '../stores/locationStore'
import { reverseGeocode, extractCoordinatesFromUrl } from '../lib/geocoding'
import toast from 'react-hot-toast'

// Helper component for styled suggestion icons
const SuggestionIcon = ({ type, className = "w-4 h-4" }) => {
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
        // Restore value if search query was cleared without selection
        if (!searchQuery && value) {
          setSearchQuery(value)
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [searchQuery, value])

  const filteredOptions = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return options.slice(0, 15) // Show top 15 initially
    return options.filter(opt => 
      (opt.name && opt.name.toLowerCase().includes(q)) || 
      (opt.name_hi && opt.name_hi.toLowerCase().includes(q))
    ).slice(0, 15)
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
            if (customAllowed) {
              onChange({ name: e.target.value, isCustom: true })
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
                  opt.isCore ? 'bg-amber-500/[0.02] dark:bg-amber-500/[0.03]' : ''
                }`}
              >
                <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5 font-sans font-medium">
                  {opt.isCore && <Star size={12} className="text-amber-500 fill-amber-500 shrink-0" />}
                  {opt.isBikeOnly && <Bike size={12} className="text-amber-500 shrink-0" />}
                  <span className={opt.isCore ? 'text-amber-600 dark:text-amber-400' : ''}>{opt.name}</span>
                  {opt.name_hi && (
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-normal">
                      ({opt.name_hi})
                    </span>
                  )}
                </span>
                {opt.subtitle && (
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
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
  const [pastedLink, setPastedLink] = useState('')
  const [isResolving, setIsResolving] = useState(false)

  // Consume cached operating cities and hierarchical data layers
  const activeCities = useLocationStore((state) => state.activeCities || [])
  const localities = useLocationStore((state) => state.localities || [])
  const landmarks = useLocationStore((state) => state.landmarks || [])
  const galis = useLocationStore((state) => state.galis || [])

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

  // Parse serviceable pincodes from operating cities configuration
  const serviceablePincodes = React.useMemo(() => {
    const list = []
    activeCities.forEach(city => {
      if (city.allowed_pincodes && Array.isArray(city.allowed_pincodes)) {
        city.allowed_pincodes.forEach(pin => {
          if (!list.some(item => item.pincode === pin)) {
            list.push({
              pincode: pin,
              cityName: city.name.split(',')[0].trim(),
              state: city.state || 'Bihar',
              latitude: city.latitude,
              longitude: city.longitude
            })
          }
        })
      }
    })
    return list
  }, [activeCities])

  // Auto-select first serviceable pincode & city if not set
  React.useEffect(() => {
    if (!formData.pincode && serviceablePincodes.length > 0) {
      const first = serviceablePincodes[0]
      onChange({
        pincode: first.pincode,
        city: first.cityName,
        state: first.state,
        latitude: first.latitude ? parseFloat(first.latitude) : null,
        longitude: first.longitude ? parseFloat(first.longitude) : null
      })
    }
  }, [formData.pincode, serviceablePincodes, onChange])

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

  // Prepare searchable select options for localities, prioritizing core areas dynamically
  const localitySelectOptions = React.useMemo(() => {
    const mapped = localities.map(loc => {
      const isCore = !!loc.is_primary;
      const priority = parseInt(loc.priority) || 0;
      return {
        id: loc.id,
        name: loc.name,
        name_hi: loc.name_hi,
        latitude: loc.latitude,
        longitude: loc.longitude,
        subtitle: isCore ? `Primary Area • ${loc.pincode || '824101'}` : `Area/Mohalla • ${loc.pincode || '824101'}`,
        isCore,
        priority
      };
    });

    // Sort: Higher priority/primary areas first, then alphabetically
    return mapped.sort((a, b) => {
      if (a.isCore !== b.isCore) {
        return a.isCore ? -1 : 1;
      }
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return a.name.localeCompare(b.name);
    });
  }, [localities])

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
        latitude: lm.latitude,
        longitude: lm.longitude,
        subtitle: `Landmark • ${parentLoc ? parentLoc.name : 'Aurangabad'}`
      }
    })
  }, [landmarks, currentLocality, localities])

  // Filter galis / apartments strictly relative to current selected locality ID
  const filteredGalis = React.useMemo(() => {
    if (!currentLocality) return []

    // Get galis mapped to this locality
    const matchedGalis = galis.filter(g => g.locality_id === currentLocality.id)
    const galiOptions = matchedGalis.map(g => {
      const parentLoc = localities.find(l => l.id === g.locality_id)
      const isBikeOnly = g.vehicle_restriction === 'bike_only'
      return {
        id: g.id,
        name: g.name,
        name_hi: g.name_hi,
        latitude: g.latitude,
        longitude: g.longitude,
        subtitle: isBikeOnly 
          ? `Bike Only • Street/Apartment • ${parentLoc ? parentLoc.name : 'Aurangabad'}`
          : `Street/Apartment • ${parentLoc ? parentLoc.name : 'Aurangabad'}`,
        vehicle_restriction: g.vehicle_restriction || 'all',
        isBikeOnly
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
        latitude: lm.latitude,
        longitude: lm.longitude,
        subtitle: `Landmark • ${parentLoc ? parentLoc.name : 'Aurangabad'}`,
        vehicle_restriction: 'all',
        isBikeOnly: false
      }
    })

    // Return combined list (galis first, then landmarks)
    return [...galiOptions, ...landmarkOptions]
  }, [galis, landmarks, currentLocality, localities])

  const housePlaceholder = React.useMemo(() => {
    const isSinhaCollege = 
      (currentLocality && (
        currentLocality.id === 'f0a21680-4578-4a33-a757-c529dfc03d17' ||
        currentLocality.name?.includes('Sinha College') ||
        currentLocality.name?.includes('Ram Nagar') ||
        currentLocality.name?.includes('Adarsh Colony') ||
        currentLocality.name?.includes('Professor') ||
        currentLocality.name?.includes('Surya Nagar')
      )) ||
      (currentGali && (
        currentGali.name?.includes('Coaching Gali') ||
        currentGali.name?.includes('Gate Back Lane')
      ));
    return isSinhaCollege 
      ? 'e.g. Room No 12, Shanti Boys Lodge'
      : 'e.g. Room No 102, Shanti Boys Lodge / Flat 3A, Maa Sharda Complex';
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

    const updateData = {
      address_line2: opt.name,
      locality_id: opt.id || null,
      landmark: '', // Clear landmark to force re-selection relative to new locality
      landmark_id: null,
      gali_id: null,
      latitude: opt.latitude ? parseFloat(opt.latitude) : null,
      longitude: opt.longitude ? parseFloat(opt.longitude) : null
    }

    onChange(updateData)

    // Snap map center to locality coordinate
    if (onMapLocationSelect && opt.latitude && opt.longitude) {
      onMapLocationSelect({
        lat: parseFloat(opt.latitude),
        lng: parseFloat(opt.longitude),
        displayName: `${opt.name}, Aurangabad, Bihar, ${formData.pincode || '824101'}`,
        isManualSelect: true,
        addressDetails: {
          road: '',
          suburb: opt.name,
          city: formData.city || 'Aurangabad',
          state: formData.state || 'Bihar',
          postcode: formData.pincode || '824101'
        }
      })
    }
  }

  // Handle landmark dropdown selection (Snaps rider directly to landmark coordinates)
  const handleLandmarkSelect = (opt) => {
    if (!opt) {
      onChange({ landmark: '', landmark_id: null })
      return
    }

    const updateData = {
      landmark: opt.name,
      landmark_id: opt.id || null
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
        displayName: `${opt.name}, ${formData.address_line2 ? formData.address_line2 + ', ' : ''}Aurangabad, Bihar, ${formData.pincode || '824101'}`,
        isManualSelect: true,
        addressDetails: {
          road: '',
          suburb: formData.address_line2 || '',
          city: formData.city || 'Aurangabad',
          state: formData.state || 'Bihar',
          postcode: formData.pincode || '824101'
        }
      })
    }
  }

  // Handle Gali/Apartment selection (Pre-fills or appends to house details and snaps coordinates)
  const handleGaliSelect = (opt) => {
    if (!opt) return

    const updateData = {
      gali_id: opt.id || null
    }

    // Snap coordinates to granular street/gali
    if (opt.latitude && opt.longitude) {
      updateData.latitude = parseFloat(opt.latitude)
      updateData.longitude = parseFloat(opt.longitude)
    }

    // Pre-fill or append to address_line1 (House Details)
    const currentLine1 = formData.address_line1 || ''
    if (!currentLine1.toLowerCase().includes(opt.name.toLowerCase())) {
      updateData.address_line1 = currentLine1 
        ? `${currentLine1}, ${opt.name}`
        : opt.name
    }

    onChange(updateData)

    if (onMapLocationSelect && opt.latitude && opt.longitude) {
      onMapLocationSelect({
        lat: parseFloat(opt.latitude),
        lng: parseFloat(opt.longitude),
        displayName: `${opt.name}, ${formData.address_line2 ? formData.address_line2 + ', ' : ''}Aurangabad, Bihar, ${formData.pincode || '824101'}`,
        isManualSelect: true,
        addressDetails: {
          road: opt.name,
          suburb: formData.address_line2 || '',
          city: formData.city || 'Aurangabad',
          state: formData.state || 'Bihar',
          postcode: formData.pincode || '824101'
        }
      })
    }
  }

  const handleLocateLink = async () => {
    if (!pastedLink) return
    setIsResolving(true)
    const toastId = toast.loading('Resolving location link...')
    
    try {
      let resolvedUrl = pastedLink.trim()
      let coords = extractCoordinatesFromUrl(resolvedUrl)

      if (!coords && resolvedUrl.includes('//')) {
        try {
          const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
          const apiUrl = isDev 
            ? `https://www.ozomart.store/api/resolve-link?url=${encodeURIComponent(resolvedUrl)}`
            : `/api/resolve-link?url=${encodeURIComponent(resolvedUrl)}`

          const response = await fetch(apiUrl)
          if (response.ok) {
            const data = await response.json()
            if (data && data.finalUrl) {
              resolvedUrl = data.finalUrl
              coords = data.coordinates || extractCoordinatesFromUrl(resolvedUrl)
              if (data.place) {
                const parts = data.place.address.split(',').map(p => p.trim())
                let resolvedPincode = data.place.pincode || ''
                let resolvedCity = ''
                let resolvedState = ''
                
                const countryPart = parts[parts.length - 1]
                let statePincodePart = ''
                let cityPart = ''
                
                if (countryPart && countryPart.toLowerCase() === 'india') {
                  statePincodePart = parts[parts.length - 2] || ''
                  cityPart = parts[parts.length - 3] || ''
                } else {
                  statePincodePart = parts[parts.length - 1] || ''
                  cityPart = parts[parts.length - 2] || ''
                }
                
                if (statePincodePart) {
                  const pinMatch = statePincodePart.match(/\b\d{6}\b/)
                  if (pinMatch) {
                    resolvedPincode = pinMatch[0]
                  }
                  resolvedState = statePincodePart.replace(/\d+/g, '').trim()
                }
                
                if (cityPart) {
                  resolvedCity = cityPart.split(' ')[0].trim()
                }
                
                window._resolvedPlaceDetails = {
                  title: data.place.title,
                  address: data.place.address,
                  pincode: resolvedPincode,
                  city: resolvedCity,
                  state: resolvedState
                }
              }
            }
          }
        } catch (fetchErr) {
          console.warn('API proxy fetch failed:', fetchErr)
        }
      }

      if (!coords) {
        toast.error('Could not extract coordinates from link. Please search or pin manually.', { id: toastId })
        setIsResolving(false)
        return
      }

      const geocodeResult = await reverseGeocode(coords.lat, coords.lng)
      const road = geocodeResult.addressDetails?.road || geocodeResult.addressDetails?.street || ''
      const suburb = geocodeResult.addressDetails?.suburb || geocodeResult.addressDetails?.neighbourhood || ''
      
      const resolvedPlaceDetails = window._resolvedPlaceDetails
      window._resolvedPlaceDetails = null

      const city = resolvedPlaceDetails?.city || geocodeResult.addressDetails?.city || geocodeResult.addressDetails?.town || 'Aurangabad'
      const state = resolvedPlaceDetails?.state || geocodeResult.addressDetails?.state || 'Bihar'
      const pincode = resolvedPlaceDetails?.pincode || geocodeResult.addressDetails?.postcode || ''

      const titlePrefix = resolvedPlaceDetails?.title ? `${resolvedPlaceDetails.title}, ` : ''
      onChange({
        latitude: coords.lat,
        longitude: coords.lng,
        address_line2: titlePrefix + ([road, suburb].filter(Boolean).join(', ') || geocodeResult.displayName),
        city,
        state,
        pincode,
        google_maps_url: resolvedUrl
      })

      if (setShowMapPicker) {
        setShowMapPicker(true)
      }

      if (onMapLocationSelect) {
        onMapLocationSelect({
          lat: coords.lat,
          lng: coords.lng,
          displayName: geocodeResult.displayName,
          addressDetails: geocodeResult.addressDetails,
          nearestStreet: geocodeResult.nearestStreet
        })
      }

      const isServiceable = checkDeliveryZoneStatus(coords.lat, coords.lng)
      if (!isServiceable) {
        toast.error("Location link parsed, but it is outside Ozo's delivery zone.", { id: toastId })
        setIsResolving(false)
        return
      }

      if (pincode && !checkPincodeServiceable(pincode, city)) {
        toast.success(`Location parsed and pinned successfully! (Pincode ${pincode} may be marked outside regular zone)`, { id: toastId })
      } else {
        toast.success('Location parsed and pinned successfully!', { id: toastId })
      }
      setPastedLink('')
    } catch (error) {
      console.error('Failed to locate from link:', error)
      toast.error('Failed to parse location link', { id: toastId })
    } finally {
      setIsResolving(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Smart Link Parser shortcut (Google Maps / WhatsApp) */}
      <div className="p-4 bg-gradient-to-br from-gray-50 to-white dark:from-zinc-900 dark:to-zinc-900/60 border border-emerald-500/20 dark:border-emerald-500/10 rounded-2xl shadow-sm space-y-3.5 relative overflow-hidden group">
        <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none -mr-4 -mt-4 group-hover:bg-emerald-500/10 transition-colors duration-500" />
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <label className="text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              Smart Setup Shortcut
            </label>
          </div>
          <span className="text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded font-black uppercase tracking-wide">
            Link Snap
          </span>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Paste Google Maps or WhatsApp Live Location Link..."
            value={pastedLink}
            onChange={(e) => setPastedLink(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleLocateLink(); } }}
            disabled={isResolving}
            className="flex-1 px-3.5 py-2.5 border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-black/25 text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50 placeholder:text-gray-400 dark:placeholder:text-white/20 transition-all font-medium"
          />
          <button
            type="button"
            onClick={handleLocateLink}
            disabled={isResolving || !pastedLink}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl text-xs font-black uppercase tracking-wider active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50 shadow-sm shadow-emerald-500/10 hover:shadow-emerald-500/20"
          >
            {isResolving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Snapping...
              </>
            ) : (
              <>
                <Navigation size={12} className="rotate-45" />
                Snap
              </>
            )}
          </button>
        </div>
        <p className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold leading-relaxed flex items-start gap-1.5">
          <Info size={12} className="text-emerald-500 shrink-0 mt-0.5" />
          <span>
            Paste WhatsApp <b>"Share Live Location"</b> or Google Maps link here to instantly locate your address.
          </span>
        </p>
      </div>

      {/* Contact Details (Receiver Name/Phone) */}
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

      {/* Address Type Selector */}
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
              className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                formData.label === lbl
                  ? 'border-ozo-red bg-red-500/5 text-ozo-red shadow-sm'
                  : 'border-gray-200 dark:border-white/10 bg-transparent text-gray-500 hover:border-gray-300 dark:hover:border-white/20'
              }`}
            >
              <Icon size={12} />
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* Address Details Container */}
      <div className="border border-gray-100 dark:border-white/5 rounded-2xl p-4 bg-gray-50/[0.15] dark:bg-zinc-900/10 space-y-4">
        <span className="text-[10px] font-black uppercase tracking-widest text-ozo-red">
          Address Information
        </span>

        {/* 1. City & Pincode Selection Chips */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400">
            Delivery City & Pincode <span className="text-ozo-red">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {serviceablePincodes.map(item => {
              const isSelected = formData.pincode === item.pincode
              return (
                <button
                  key={item.pincode}
                  type="button"
                  onClick={() => {
                    onChange({
                      pincode: item.pincode,
                      city: item.cityName,
                      state: item.state,
                      latitude: item.latitude ? parseFloat(item.latitude) : null,
                      longitude: item.longitude ? parseFloat(item.longitude) : null
                    })
                    if (onMapLocationSelect && item.latitude && item.longitude) {
                      onMapLocationSelect({
                        lat: parseFloat(item.latitude),
                        lng: parseFloat(item.longitude),
                        displayName: `${item.cityName}, Bihar, ${item.pincode}`,
                        isManualSelect: true,
                        addressDetails: {
                          road: '',
                          suburb: '',
                          city: item.cityName,
                          state: item.state,
                          postcode: item.pincode
                        }
                      })
                    }
                  }}
                  className={`px-3.5 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'border-ozo-red bg-red-500/10 text-ozo-red shadow-sm'
                      : 'border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  <MapPin size={12} className={isSelected ? 'text-ozo-red' : 'text-gray-400'} />
                  {item.cityName} ({item.pincode})
                  {isSelected && <Check size={11} className="text-ozo-red shrink-0" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* 2. Locality / Area Dropdown Selection */}
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
            {/* 3. Gali / Apartment / Street (Optional Dropdown Selection) */}
            <SearchableSelect
              label="Street / Gali / Apartment (Optional)"
              placeholder={currentLocality ? "Search streets/galis in this area..." : "Please select an Area/Locality first"}
              value=""
              options={filteredGalis}
              onChange={handleGaliSelect}
              required={false}
              disabled={!formData.address_line2}
              icon={Route}
              noOptionsMessage="No streets recorded in this area. Type custom details above."
            />

            {/* 4. Flat / House No. / Building / Lodge */}
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

            {/* 5. Landmark Dropdown Selection */}
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

            {/* Geospatial Snapping Radius Feedback */}
            {radiusMetrics && (
              <div className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-start gap-2.5 transition-all shadow-sm ${
                radiusMetrics.isValid 
                  ? 'bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400' 
                  : 'bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400 animate-pulse'
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
                        Coordinates snapped successfully (approx. {Math.round(radiusMetrics.distance)} meters from {
                          radiusMetrics.type === 'street' ? 'street' :
                          radiusMetrics.type === 'landmark' ? 'landmark' :
                          'locality'
                        } center; allowed radius: {radiusMetrics.allowedRadius} meters).
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <Info size={16} className="shrink-0 text-amber-500 mt-0.5" />
                    <div>
                      <p className="font-extrabold text-sm mb-0.5">
                        ⚠️ Out of Bound Warning for {
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
                        } center, which exceeds the allowed limit of {radiusMetrics.allowedRadius} meters. Please verify the map marker.
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

      {formData.address_line2 && (
        <div className="space-y-4 slide-up">
          {/* Delivery Notes / Instructions */}
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
            {currentGali && currentGali.vehicle_restriction === 'bike_only' && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400/90 font-bold mt-1.5 flex items-center gap-1.5">
                <Info size={12} className="shrink-0" />
                <span>Note: This street is narrow; delivery will be completed via bike.</span>
              </p>
            )}
          </div>

          {/* Map Picker Accordion */}
          {!mapConfig?.hide_map && OzoMapPicker && setShowMapPicker && (
            <div className="border border-gray-100 dark:border-white/5 rounded-2xl overflow-hidden bg-white dark:bg-white/5 shadow-sm mt-2">
              <button
                type="button"
                onClick={() => setShowMapPicker(!showMapPicker)}
                className="w-full flex items-center justify-between p-3.5 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-all"
              >
                <span className="flex items-center gap-2">
                  <MapIcon size={14} className="text-ozo-red animate-pulse" />
                  {formData.latitude && formData.longitude ? 'Location Pinned (Open Map to Adjust)' : 'Pin Location on Map (Optional)'}
                </span>
                {showMapPicker ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {showMapPicker && (
                <div className="h-60 w-full relative">
                  <OzoMapPicker
                    initialPosition={formData.latitude && formData.longitude ? [formData.latitude, formData.longitude] : null}
                    onLocationSelect={onMapLocationSelect}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
