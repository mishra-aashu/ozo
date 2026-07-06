import React, { useState } from 'react'
import { Home, Briefcase, MapPin, Map as MapIcon, ChevronUp, ChevronDown, Loader2 } from 'lucide-react'
import { findCityByPincode, findMatchingActiveCity, checkDeliveryZoneStatus, checkPincodeServiceable } from '../stores/locationStore'
import { reverseGeocode, extractCoordinatesFromUrl } from '../lib/geocoding'
import toast from 'react-hot-toast'

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

  const updateField = (key, value) => {
    onChange({ [key]: value })
  }

  const handlePincodeChange = (pin) => {
    const matchedCity = findCityByPincode(pin)
    if (matchedCity) {
      onChange({
        pincode: pin,
        city: matchedCity.name,
        state: matchedCity.state || 'Bihar',
        latitude: matchedCity.latitude ? parseFloat(matchedCity.latitude) : null,
        longitude: matchedCity.longitude ? parseFloat(matchedCity.longitude) : null
      })
    } else {
      onChange({ pincode: pin })
    }
  }

  const handleCityChange = (cityName) => {
    const matchedCity = findMatchingActiveCity(cityName)
    if (matchedCity) {
      onChange({
        city: cityName,
        state: matchedCity.state || 'Bihar',
        latitude: matchedCity.latitude ? parseFloat(matchedCity.latitude) : null,
        longitude: matchedCity.longitude ? parseFloat(matchedCity.longitude) : null
      })
    } else {
      onChange({ city: cityName })
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
          // Try calling our serverless resolve-link proxy
          // Use deployed production URL in local development because Vite dev server doesn't host Vercel serverless functions.
          const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
          const apiUrl = isDev 
            ? `https://www.ozomart.store/api/resolve-link?url=${encodeURIComponent(resolvedUrl)}`
            : `/api/resolve-link?url=${encodeURIComponent(resolvedUrl)}`;

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

      // 1. Reverse geocode first to get the address details matching nearest street
      const geocodeResult = await reverseGeocode(coords.lat, coords.lng)
      const road = geocodeResult.addressDetails?.road || geocodeResult.addressDetails?.street || ''
      const suburb = geocodeResult.addressDetails?.suburb || geocodeResult.addressDetails?.neighbourhood || ''
      
      const resolvedPlaceDetails = window._resolvedPlaceDetails
      window._resolvedPlaceDetails = null

      const city = resolvedPlaceDetails?.city || geocodeResult.addressDetails?.city || geocodeResult.addressDetails?.town || 'Aurangabad'
      const state = resolvedPlaceDetails?.state || geocodeResult.addressDetails?.state || 'Bihar'
      const pincode = resolvedPlaceDetails?.pincode || geocodeResult.addressDetails?.postcode || ''

      // 2. Populate the form fields immediately so the user sees the auto-fill action
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

      // 3. Open map picker and sync the pin location
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

      // 4. Now perform serviceability checks and display feedback
      const isServiceable = checkDeliveryZoneStatus(coords.lat, coords.lng)
      if (!isServiceable) {
        toast.error("Location link parsed, but it is outside Ozo's delivery zone.", { id: toastId })
        setIsResolving(false)
        return
      }

      // Since coordinates are inside the delivery zone (geofence), pincode check is secondary and non-blocking
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
    <div className="space-y-4">
      {/* Paste Maps Link Tool */}
      <div className="p-4 bg-gray-50/50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl space-y-3">
        <label className="block text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Paste Google Maps / WhatsApp Location Link
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="https://maps.app.goo.gl/... or WhatsApp link"
            value={pastedLink}
            onChange={(e) => setPastedLink(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleLocateLink(); } }}
            disabled={isResolving}
            className="flex-1 px-4 py-2 border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-black/25 text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-ozo-red disabled:opacity-50 placeholder:text-gray-400 dark:placeholder:text-white/20 transition-all"
          />
          <button
            type="button"
            onClick={handleLocateLink}
            disabled={isResolving || !pastedLink}
            className="px-4 py-2 bg-gradient-to-r from-ozo-red to-red-500 text-white rounded-xl text-xs font-black uppercase tracking-wider active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            {isResolving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Locating...
              </>
            ) : (
              'Locate'
            )}
          </button>
        </div>
        <p className="text-[10px] text-gray-400 font-bold leading-normal">
          Pasting a link will automatically set the coordinates, address, and pin on the map.
        </p>
      </div>

      {/* Contact Details */}
      {showContactFields && (

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
              Receiver's Name *
            </label>
            <input
              type="text"
              value={formData.receiver_name || ''}
              onChange={(e) => updateField('receiver_name', e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-white/10 rounded-xl bg-gray-50/50 dark:bg-white/5 text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-ozo-red placeholder:text-gray-450/30 dark:placeholder:text-white/20 transition-all"
              placeholder="e.g. Aashu Mishra"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
              Receiver's Phone *
            </label>
            <input
              type="tel"
              value={formData.receiver_phone || ''}
              onChange={(e) => updateField('receiver_phone', e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-white/10 rounded-xl bg-gray-50/50 dark:bg-white/5 text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-ozo-red placeholder:text-gray-450/30 dark:placeholder:text-white/20 transition-all"
              placeholder="10-digit mobile number"
              required
            />
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

      {/* Street/Flat Details */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
          Flat / House No. / Building *
        </label>
        <input
          type="text"
          value={formData.address_line1 || ''}
          onChange={(e) => updateField('address_line1', e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-200 dark:border-white/10 rounded-xl bg-gray-50/50 dark:bg-white/5 text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-ozo-red placeholder:text-gray-450/30 dark:placeholder:text-white/20 transition-all"
          placeholder="e.g. Flat 101, Block B"
          required
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
          Street / Gali / Area *
        </label>
        <input
          type="text"
          value={formData.address_line2 || ''}
          onChange={(e) => updateField('address_line2', e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-200 dark:border-white/10 rounded-xl bg-gray-50/50 dark:bg-white/5 text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-ozo-red placeholder:text-gray-450/30 dark:placeholder:text-white/20 transition-all"
          placeholder="e.g. Gali No. 2, Bypass Road"
          required
        />
      </div>

      {/* Landmark & Pincode */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
            Landmark (Optional)
          </label>
          <input
            type="text"
            value={formData.landmark || ''}
            onChange={(e) => updateField('landmark', e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-200 dark:border-white/10 rounded-xl bg-gray-50/50 dark:bg-white/5 text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-ozo-red placeholder:text-gray-455/25 dark:placeholder:text-white/15 transition-all"
            placeholder="e.g. Near Hanuman Temple"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
            Pincode *
          </label>
          <input
            type="text"
            value={formData.pincode || ''}
            onChange={(e) => handlePincodeChange(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-200 dark:border-white/10 rounded-xl bg-gray-50/50 dark:bg-white/5 text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-ozo-red placeholder:text-gray-450/30 dark:placeholder:text-white/20 transition-all"
            placeholder="e.g. 824101"
            required
          />
        </div>
      </div>

      {/* City & State */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
            City *
          </label>
          <input
            type="text"
            value={formData.city || ''}
            onChange={(e) => handleCityChange(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-200 dark:border-white/10 rounded-xl bg-gray-50/50 dark:bg-white/5 text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-ozo-red placeholder:text-gray-450/30 dark:placeholder:text-white/20 transition-all"
            placeholder="City"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
            State *
          </label>
          <input
            type="text"
            value={formData.state || ''}
            onChange={(e) => updateField('state', e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-200 dark:border-white/10 rounded-xl bg-gray-50/50 dark:bg-white/5 text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-ozo-red placeholder:text-gray-450/30 dark:placeholder:text-white/20 transition-all"
            placeholder="State"
            required
          />
        </div>
      </div>

      {/* Notes / Rider Instructions */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
          Delivery Notes / Instructions (Optional)
        </label>
        <textarea
          value={formData.notes || ''}
          onChange={(e) => updateField('notes', e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-200 dark:border-white/10 rounded-xl bg-gray-50/50 dark:bg-white/5 text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-ozo-red placeholder:text-gray-450/30 dark:placeholder:text-white/20 transition-all resize-none h-16"
          placeholder="e.g. Ring bell, leave at door, or call on arrival..."
        />
      </div>

      {/* Map Picker wrapper if needed */}
      {!mapConfig?.hide_map && OzoMapPicker && setShowMapPicker && (
        <div className="border border-gray-100 dark:border-white/5 rounded-2xl overflow-hidden bg-white dark:bg-white/5 shadow-sm mt-2">
          <button
            type="button"
            onClick={() => setShowMapPicker(!showMapPicker)}
            className="w-full flex items-center justify-between p-3.5 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-all"
          >
            <span className="flex items-center gap-2">
              <MapIcon size={14} className="text-ozo-red animate-pulse" />
              {formData.latitude && formData.longitude ? '📍 Location Pinned (Change)' : '📍 Pin Location on Map (Optional)'}
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
  )
}
