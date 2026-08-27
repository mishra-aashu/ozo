import React, { useState } from 'react'
import { Home, Briefcase, MapPin, Map as MapIcon, ChevronUp, ChevronDown, Loader2, Route, Info, Search, FileText, Phone, User, Check, Navigation, Star, Bike, DoorOpen, Bell, BellOff } from 'lucide-react'
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
    if (!q) {
      const hasLocalities = options.some(opt => opt.type === 'locality')
      if (hasLocalities) {
        return options.filter(opt => opt.type === 'locality').slice(0, 15)
      }
      return options.slice(0, 15)
    }
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
                  {opt.type && <SuggestionIcon type={opt.type} className="w-3.5 h-3.5 shrink-0" />}
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
  // Consume cached operating cities and hierarchical data layers
  const activeCities = useLocationStore((state) => state.activeCities || [])
  const localities = useLocationStore((state) => state.localities || [])
  const landmarks = useLocationStore((state) => state.landmarks || [])
  const galis = useLocationStore((state) => state.galis || [])

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

  // Parse serviceable pincodes from operating cities configuration
  const serviceablePincodes = React.useMemo(() => {
    const list = []
    activeCities.forEach(city => {
      if (city.allowed_pincodes && Array.isArray(city.allowed_pincodes)) {
        city.allowed_pincodes.forEach(pin => {
          if (!list.some(item => item.pincode === pin)) {
            list.push({
              pincode: pin,
              cityName: city?.name ? city.name.split(',')[0].trim() : '',
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
    const mappedLocalities = localities.map(loc => {
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
        priority,
        type: 'locality'
      };
    });

    const mappedGalis = galis.map(g => {
      const parentLoc = localities.find(l => l.id === g.locality_id);
      return {
        id: g.id,
        name: g.name,
        name_hi: g.name_hi,
        latitude: g.latitude,
        longitude: g.longitude,
        subtitle: parentLoc ? `Street/Apartment in ${parentLoc.name}` : 'Street/Apartment',
        isCore: false,
        priority: 0,
        type: 'gali',
        parentLocalityId: g.locality_id
      };
    });

    const mappedLandmarks = landmarks.map(lm => {
      const parentLoc = localities.find(l => l.id === lm.locality_id);
      return {
        id: lm.id,
        name: lm.name,
        name_hi: lm.name_hi,
        latitude: lm.latitude,
        longitude: lm.longitude,
        subtitle: parentLoc ? `Landmark near ${parentLoc.name}` : 'Landmark',
        isCore: false,
        priority: 0,
        type: 'landmark',
        parentLocalityId: lm.locality_id
      };
    });

    // Localities are sorted by primary/priority first.
    const sortedLocalities = mappedLocalities.sort((a, b) => {
      if (a.isCore !== b.isCore) {
        return a.isCore ? -1 : 1;
      }
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return a.name.localeCompare(b.name);
    });

    // Combine all options. Keep localities at the top so they show up initially.
    return [...sortedLocalities, ...mappedGalis, ...mappedLandmarks];
  }, [localities, galis, landmarks])

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
        currentGali.name?.includes('College Gate Side') ||
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

    if (opt.type === 'gali') {
      const parentLoc = localities.find(l => l.id === opt.parentLocalityId)
      const currentLine1 = formData.address_line1 || ''
      const updatedLine1 = currentLine1.toLowerCase().includes(opt.name.toLowerCase())
        ? currentLine1
        : currentLine1 ? `${currentLine1}, ${opt.name}` : opt.name

      const updateData = {
        address_line2: parentLoc ? parentLoc.name : '',
        locality_id: parentLoc ? parentLoc.id : null,
        gali_id: opt.id || null,
        landmark: '',
        landmark_id: null,
        address_line1: updatedLine1,
        latitude: opt.latitude ? parseFloat(opt.latitude) : null,
        longitude: opt.longitude ? parseFloat(opt.longitude) : null
      }

      onChange(updateData)

      if (onMapLocationSelect && opt.latitude && opt.longitude) {
        onMapLocationSelect({
          lat: parseFloat(opt.latitude),
          lng: parseFloat(opt.longitude),
          displayName: `${opt.name}, ${parentLoc ? parentLoc.name + ', ' : ''}Aurangabad, Bihar, ${formData.pincode || '824101'}`,
          isManualSelect: true,
          addressDetails: {
            road: opt.name,
            suburb: parentLoc ? parentLoc.name : '',
            city: formData.city || 'Aurangabad',
            state: formData.state || 'Bihar',
            postcode: formData.pincode || '824101'
          }
        })
      }
    } else if (opt.type === 'landmark') {
      const parentLoc = localities.find(l => l.id === opt.parentLocalityId)
      
      const updateData = {
        address_line2: parentLoc ? parentLoc.name : '',
        locality_id: parentLoc ? parentLoc.id : null,
        gali_id: null,
        landmark: opt.name,
        landmark_id: opt.id || null,
        latitude: opt.latitude ? parseFloat(opt.latitude) : null,
        longitude: opt.longitude ? parseFloat(opt.longitude) : null
      }

      onChange(updateData)

      if (onMapLocationSelect && opt.latitude && opt.longitude) {
        onMapLocationSelect({
          lat: parseFloat(opt.latitude),
          lng: parseFloat(opt.longitude),
          displayName: `${opt.name}, ${parentLoc ? parentLoc.name + ', ' : ''}Aurangabad, Bihar, ${formData.pincode || '824101'}`,
          isManualSelect: true,
          addressDetails: {
            road: '',
            suburb: parentLoc ? parentLoc.name : '',
            city: formData.city || 'Aurangabad',
            state: formData.state || 'Bihar',
            postcode: formData.pincode || '824101'
          }
        })
      }
    } else {
      // Regular locality
      const updateData = {
        address_line2: opt.name,
        locality_id: opt.id || null,
        landmark: '',
        landmark_id: null,
        gali_id: null,
        latitude: opt.latitude ? parseFloat(opt.latitude) : null,
        longitude: opt.longitude ? parseFloat(opt.longitude) : null
      }

      onChange(updateData)

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
              city: formData.city || 'Aurangabad',
              state: formData.state || 'Bihar',
              postcode: formData.pincode || '824101'
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
                  className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
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
              value=""
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
