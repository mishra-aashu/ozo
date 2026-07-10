import React, { useState } from 'react'
import { Home, Briefcase, MapPin, Map as MapIcon, ChevronUp, ChevronDown, Loader2, Route, Info, Search, FileText, Phone, User, Check, Navigation, Star, Bike } from 'lucide-react'
import { findCityByPincode, findMatchingActiveCity, checkDeliveryZoneStatus, checkPincodeServiceable, useLocationStore } from '../stores/locationStore'
import { reverseGeocode, extractCoordinatesFromUrl } from '../lib/geocoding'
import toast from 'react-hot-toast'

const WhatsAppIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
)

const GoogleMapsIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#EA4335" />
    <path d="M12 2c-.07 0-.13.01-.2.01V6.5c.2 0 .2.5.2.5s.3 0 .5.2l1.3-1.3c-.47-.55-1.1-.9-1.8-1.01V2z" fill="#4285F4" />
    <path d="M7.7 13.3l1.3-1.3c.2.2.5.3.7.3h.8V9.1L9 7.7c-.55.47-.9 1.1-1.01 1.8H6.5c0 .2.01.39.01.59l1.19 3.21z" fill="#FBBC05" />
    <path d="M12 22s4.9-5.42 6.3-9.1l-1.3-1.3c-.2.2-.5.3-.7.3h-.8v3.4l1.5 1.4c-.6.9-1.7 2.1-3 3.6v2.3z" fill="#34A853" />
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
    const toastId = toast.loading('Resolving location link...')
    
    try {
      let resolvedUrl = url.trim()
      // Extract URL if there's surrounding text (e.g. "My location: https://maps.app.goo.gl/xyz")
      const urlRegex = /(https?:\/\/[^\s]+)/gi
      const match = resolvedUrl.match(urlRegex)
      if (match) {
        resolvedUrl = match[0]
      } else {
        // If there's no http/https protocol but it looks like a maps link, prepend https://
        const mapDomains = ['maps.app.goo.gl', 'goo.gl', 'maps.google.com', 'google.com', 'g.co', 'g.page']
        const hasDomain = mapDomains.some(d => resolvedUrl.toLowerCase().includes(d))
        if (hasDomain && !resolvedUrl.startsWith('http://') && !resolvedUrl.startsWith('https://')) {
          resolvedUrl = 'https://' + resolvedUrl
        }
      }

      let coords = extractCoordinatesFromUrl(resolvedUrl)

      if (!coords && (resolvedUrl.startsWith('http://') || resolvedUrl.startsWith('https://'))) {
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
      let addressLine1 = titlePrefix + ([road, suburb].filter(Boolean).join(', ') || geocodeResult.displayName)

      // Search database local lists to map coordinates to nearest street/landmark!
      let matchedLocalityId = null
      let matchedLocalityName = ''
      let matchedGaliId = null
      let matchedLandmarkId = null
      let matchedLandmarkName = ''

      const textToSearch = (titlePrefix + ' ' + road + ' ' + suburb + ' ' + geocodeResult.displayName).toLowerCase()
      
      // 1. Check for exact/partial text match in landmarks
      const foundLandmark = landmarks.find(lm => 
        textToSearch.includes(lm.name.toLowerCase()) || 
        (lm.name_hi && textToSearch.includes(lm.name_hi.toLowerCase()))
      )
      
      // 2. Check for exact/partial text match in galis
      const foundGali = galis.find(g => 
        textToSearch.includes(g.name.toLowerCase()) || 
        (g.name_hi && textToSearch.includes(g.name_hi.toLowerCase()))
      )

      // 3. Check for exact/partial text match in localities
      const foundLocality = localities.find(l => 
        textToSearch.includes(l.name.toLowerCase()) || 
        (l.name_hi && textToSearch.includes(l.name_hi.toLowerCase()))
      )

      if (foundLandmark) {
        matchedLandmarkId = foundLandmark.id
        matchedLandmarkName = foundLandmark.name
        matchedLocalityId = foundLandmark.locality_id
        const locObj = localities.find(l => l.id === foundLandmark.locality_id)
        if (locObj) matchedLocalityName = locObj.name
      } else if (foundGali) {
        matchedGaliId = foundGali.id
        matchedLocalityId = foundGali.locality_id
        const locObj = localities.find(l => l.id === foundGali.locality_id)
        if (locObj) matchedLocalityName = locObj.name
        if (!addressLine1.toLowerCase().includes(foundGali.name.toLowerCase())) {
          addressLine1 = `${foundGali.name}, ${addressLine1}`
        }
      } else if (foundLocality) {
        matchedLocalityId = foundLocality.id
        matchedLocalityName = foundLocality.name
      } else {
        // Find by closest coordinate distance (with a threshold, e.g. 500m for street/landmark, 2000m for locality)
        let closestLandmark = null
        let minLandmarkDist = 500 // max 500 meters
        landmarks.forEach(lm => {
          if (lm.latitude && lm.longitude) {
            const dist = getDistance(coords.lat, coords.lng, parseFloat(lm.latitude), parseFloat(lm.longitude))
            if (dist < minLandmarkDist) {
              minLandmarkDist = dist
              closestLandmark = lm
            }
          }
        })

        let closestGali = null
        let minGaliDist = 300 // max 300 meters
        galis.forEach(g => {
          if (g.latitude && g.longitude) {
            const dist = getDistance(coords.lat, coords.lng, parseFloat(g.latitude), parseFloat(g.longitude))
            if (dist < minGaliDist) {
              minGaliDist = dist
              closestGali = g
            }
          }
        })

        let closestLocality = null
        let minLocalityDist = 2000 // max 2km
        localities.forEach(l => {
          if (l.latitude && l.longitude) {
            const dist = getDistance(coords.lat, coords.lng, parseFloat(l.latitude), parseFloat(l.longitude))
            if (dist < minLocalityDist) {
              minLocalityDist = dist
              closestLocality = l
            }
          }
        })

        if (closestLandmark) {
          matchedLandmarkId = closestLandmark.id
          matchedLandmarkName = closestLandmark.name
          matchedLocalityId = closestLandmark.locality_id
          const locObj = localities.find(l => l.id === closestLandmark.locality_id)
          if (locObj) matchedLocalityName = locObj.name
        } else if (closestGali) {
          matchedGaliId = closestGali.id
          matchedLocalityId = closestGali.locality_id
          const locObj = localities.find(l => l.id === closestGali.locality_id)
          if (locObj) matchedLocalityName = locObj.name
          if (!addressLine1.toLowerCase().includes(closestGali.name.toLowerCase())) {
            addressLine1 = `${closestGali.name}, ${addressLine1}`
          }
        } else if (closestLocality) {
          matchedLocalityId = closestLocality.id
          matchedLocalityName = closestLocality.name
        }
      }

      onChange({
        latitude: coords.lat,
        longitude: coords.lng,
        address_line2: matchedLocalityName || titlePrefix + ([road, suburb].filter(Boolean).join(', ') || geocodeResult.displayName),
        locality_id: matchedLocalityId,
        gali_id: matchedGaliId,
        landmark: matchedLandmarkName,
        landmark_id: matchedLandmarkId,
        address_line1: addressLine1,
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
      setActiveTab('manual')
    } catch (error) {
      console.error('Failed to locate from link:', error)
      toast.error('Failed to parse location link', { id: toastId })
    } finally {
      setIsResolving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Map Section at the top */}
      {!mapConfig?.hide_map && OzoMapPicker && (
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

      {/* 4. Address Information Fields */}
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

      {formData.address_line2 && (
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
