import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MapPin,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Home,
  Briefcase,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  X
} from 'lucide-react'
import { useLocationStore, checkDeliveryZoneStatus, checkPincodeServiceable } from '../stores/locationStore'
import { useCartStore } from '../stores/cartStore'
import { useAuthStore } from '../stores/authStore'
import { parseLandmark, formatLandmark } from '../lib/addressHelpers'
import AddressForm from './AddressForm'
import ConfirmModal from './ConfirmModal'
import toast from 'react-hot-toast'

// Helper to determine distance in km
const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

const getAddressIcon = (label) => {
  const l = (label || '').toLowerCase()
  if (l.includes('home')) return Home
  if (l.includes('work') || l.includes('office')) return Briefcase
  return MapPin
}

export default function OrderDeliveryAddress({
  selectedAddressId,
  onSelectAddress,
  mapConfig = null,
  OzoMapPicker = null
}) {
  const userAddresses = useLocationStore((state) => state.userAddresses || [])
  const activeCities = useLocationStore((state) => state.activeCities || [])
  const liveAddressText = useLocationStore((state) => state.address)
  const liveCoords = useLocationStore((state) => state.coordinates)
  const liveAddressDetails = useLocationStore((state) => state.addressDetails)
  const selectedCitySlug = useLocationStore((state) => state.selectedCitySlug)
  const browsingCitySlug = useLocationStore((state) => state.browsingCitySlug)
  const addUserAddress = useLocationStore((state) => state.addUserAddress)
  const updateUserAddress = useLocationStore((state) => state.updateUserAddress)
  const deleteUserAddress = useLocationStore((state) => state.deleteUserAddress)
  const localities = useLocationStore((state) => state.localities || [])
  const galis = useLocationStore((state) => state.galis || [])

  const cartCitySlug = useCartStore((state) => state.cartCitySlug)
  const profile = useAuthStore((state) => state.profile)

  const [isAddressDropdownOpen, setIsAddressDropdownOpen] = useState(false)
  const [showOtherCitiesList, setShowOtherCitiesList] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingAddressId, setEditingAddressId] = useState(null)
  const [addressToDeleteId, setAddressToDeleteId] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [showMapPicker, setShowMapPicker] = useState(false)

  // Address Form State
  const [formData, setFormData] = useState({
    label: 'Home',
    address_line1: '',
    address_line2: '',
    city: '',
    state: 'Bihar',
    pincode: '',
    landmark: '',
    receiver_name: '',
    receiver_phone: '',
    notes: '',
    latitude: null,
    longitude: null,
    google_maps_url: '',
    locality_id: null,
    landmark_id: null,
    gali_id: null,
    gali_name: '',
    is_default: false
  })

  // 1. Resolve Active City for Order Context
  const activeTargetCitySlug = cartCitySlug || browsingCitySlug || selectedCitySlug || ''
  
  const currentCityObj = useMemo(() => {
    if (!activeCities || activeCities.length === 0) return null
    if (activeTargetCitySlug) {
      const found = activeCities.find(c => 
        c.slug === activeTargetCitySlug || 
        (c.slug && (activeTargetCitySlug.startsWith(c.slug) || c.slug.startsWith(activeTargetCitySlug)))
      )
      if (found) return found
    }
    // Fallback: match by live address or default to first city
    if (liveAddressText) {
      const match = activeCities.find(c => 
        liveAddressText.toLowerCase().includes((c.name || '').split(',')[0].toLowerCase().trim())
      )
      if (match) return match
    }
    return activeCities[0]
  }, [activeCities, activeTargetCitySlug, liveAddressText])

  const activeCityName = useMemo(() => {
    if (!currentCityObj?.name) return 'Your Area'
    return currentCityObj.name.split(',')[0].trim()
  }, [currentCityObj])

  const allowedPincodes = useMemo(() => {
    return currentCityObj?.allowed_pincodes || []
  }, [currentCityObj])

  // Helper: Checks if an address belongs to current active city
  const isAddressInActiveCity = useCallback((addr) => {
    if (!currentCityObj) return true
    
    // 1. Pincode match
    if (addr.pincode && allowedPincodes.includes(addr.pincode)) {
      return true
    }
    
    // 2. Spatial coordinate match
    if (addr.latitude && addr.longitude && currentCityObj.latitude && currentCityObj.longitude) {
      const distKm = calculateDistanceKm(
        parseFloat(addr.latitude),
        parseFloat(addr.longitude),
        parseFloat(currentCityObj.latitude),
        parseFloat(currentCityObj.longitude)
      )
      const maxRadius = Math.max(parseFloat(currentCityObj.service_radius_km) || 25, 25)
      if (distKm <= maxRadius) return true
    }
    
    // 3. City name textual match
    if (addr.city && activeCityName) {
      const cleanAddrCity = addr.city.toLowerCase()
      const cleanTargetCity = activeCityName.toLowerCase()
      if (cleanAddrCity.includes(cleanTargetCity) || cleanTargetCity.includes(cleanAddrCity)) {
        return true
      }
    }
    
    return false
  }, [currentCityObj, allowedPincodes, activeCityName])

  // 2. Split user addresses into Serviceable in this City vs Other Cities
  const { serviceableAddresses, otherCityAddresses } = useMemo(() => {
    const serviceable = []
    const other = []
    for (const addr of userAddresses) {
      if (isAddressInActiveCity(addr)) {
        serviceable.push(addr)
      } else {
        other.push(addr)
      }
    }
    return { serviceableAddresses: serviceable, otherCityAddresses: other }
  }, [userAddresses, isAddressInActiveCity])

  // 3. Auto-Selection Logic: Prioritize addresses in the ACTIVE city
  useEffect(() => {
    if (userAddresses.length === 0) return

    const isSelectedInServiceable = serviceableAddresses.some(a => a.id === selectedAddressId)
    
    if (!isSelectedInServiceable) {
      if (serviceableAddresses.length > 0) {
        // Find default or first serviceable address
        const defaultAddr = serviceableAddresses.find(a => a.is_default) || serviceableAddresses[0]
        onSelectAddress(defaultAddr.id)
      } else {
        // No serviceable address in this city — clear selection so wrong-city address isn't used
        if (selectedAddressId) {
          onSelectAddress(null)
        }
      }
    }
  }, [serviceableAddresses, selectedAddressId, userAddresses.length, onSelectAddress])

  // 4. Live / Header Location Detection: Does user have an active location without a saved address?
  const pendingActiveLocation = useMemo(() => {
    if (!liveAddressText) return null
    
    // Check if live location belongs to active city
    const isLiveInCity = isAddressInActiveCity({
      pincode: liveAddressDetails?.pincode,
      latitude: liveCoords?.lat,
      longitude: liveCoords?.lng,
      city: liveAddressDetails?.city || liveAddressText
    })

    if (!isLiveInCity) return null

    // Check if a saved address already corresponds to this location
    const alreadySaved = serviceableAddresses.some(addr => {
      if (addr.latitude && addr.longitude && liveCoords?.lat && liveCoords?.lng) {
        const distM = calculateDistanceKm(
          parseFloat(addr.latitude),
          parseFloat(addr.longitude),
          parseFloat(liveCoords.lat),
          parseFloat(liveCoords.lng)
        ) * 1000
        if (distM < 60) return true
      }
      if (addr.address_line2 && liveAddressText.toLowerCase().includes(addr.address_line2.toLowerCase().trim())) {
        return true
      }
      return false
    })

    if (alreadySaved) return null

    // Format clean location title
    let displayTitle = liveAddressText
    if (displayTitle.length > 60) {
      const parts = displayTitle.split(',')
      displayTitle = parts.slice(0, 2).join(', ').trim()
    }

    return {
      title: displayTitle,
      fullText: liveAddressText,
      coords: liveCoords,
      details: liveAddressDetails
    }
  }, [liveAddressText, liveCoords, liveAddressDetails, isAddressInActiveCity, serviceableAddresses])

  // 5. Handlers for Opening & Pre-filling the Form
  const handleStartAddAddress = useCallback((prefillLocation = null) => {
    setEditingAddressId(null)
    
    let defaultCity = activeCityName
    let defaultPin = allowedPincodes[0] || ''
    let defaultState = currentCityObj?.state || 'Bihar'
    let defaultArea = ''
    let defaultLat = currentCityObj?.latitude ? parseFloat(currentCityObj.latitude) : null
    let defaultLng = currentCityObj?.longitude ? parseFloat(currentCityObj.longitude) : null
    let matchedLocalityId = null
    let matchedGaliId = null

    if (prefillLocation) {
      if (prefillLocation.details?.city) defaultCity = prefillLocation.details.city
      if (prefillLocation.details?.pincode) defaultPin = prefillLocation.details.pincode
      if (prefillLocation.details?.state) defaultState = prefillLocation.details.state
      if (prefillLocation.coords?.lat) defaultLat = parseFloat(prefillLocation.coords.lat)
      if (prefillLocation.coords?.lng) defaultLng = parseFloat(prefillLocation.coords.lng)

      // Try finding matching locality or gali/hostel in database
      const locText = `${prefillLocation.fullText || ''} ${prefillLocation.title || ''}`.toLowerCase()
      const foundGali = galis.find(g => 
        locText.includes(g.name.toLowerCase().trim())
      )
      const foundLoc = localities.find(loc => 
        locText.includes(loc.name.toLowerCase().trim())
      )

      if (foundGali) {
        matchedGaliId = foundGali.id
        matchedLocalityId = foundGali.locality_id
        const parentLoc = localities.find(l => l.id === foundGali.locality_id)
        defaultArea = parentLoc ? parentLoc.name : ''
        if (foundGali.pincode) defaultPin = foundGali.pincode
      } else if (foundLoc) {
        matchedLocalityId = foundLoc.id
        defaultArea = foundLoc.name
        if (foundLoc.pincode) defaultPin = foundLoc.pincode
      } else {
        // If it's just the generic city name (e.g. "Bhagalpur, BIHAR" or "Aurangabad, Bihar"),
        // leave defaultArea empty so the user can select their hostel/campus/area cleanly!
        defaultArea = ''
      }
    }

    // If no specific area was matched, check if the current active city has a primary or single locality in DB
    if (!defaultArea && localities.length > 0) {
      const cityLocs = localities.filter(l => {
        const pin = (l.pincode || '').toString().trim()
        return pin && allowedPincodes.includes(pin)
      })
      if (cityLocs.length === 1) {
        const singleLoc = cityLocs[0]
        defaultArea = singleLoc.name
        matchedLocalityId = singleLoc.id
        if (singleLoc.pincode) defaultPin = singleLoc.pincode
        if (singleLoc.latitude) defaultLat = parseFloat(singleLoc.latitude)
        if (singleLoc.longitude) defaultLng = parseFloat(singleLoc.longitude)
      } else if (cityLocs.length > 1) {
        const primaryLoc = cityLocs.find(l => l.is_primary || (l.name || '').toLowerCase().includes('campus'))
        if (primaryLoc && (defaultCity.toLowerCase().includes('bhagalpur') || currentCityObj?.slug?.includes('bhagalpur'))) {
          defaultArea = primaryLoc.name
          matchedLocalityId = primaryLoc.id
          if (primaryLoc.pincode) defaultPin = primaryLoc.pincode
          if (primaryLoc.latitude) defaultLat = parseFloat(primaryLoc.latitude)
          if (primaryLoc.longitude) defaultLng = parseFloat(primaryLoc.longitude)
        }
      }
    }

    setFormData({
      label: 'Home',
      address_line1: '', // To be filled by user: Room / Flat / House
      address_line2: defaultArea,
      city: defaultCity,
      state: defaultState,
      pincode: defaultPin,
      landmark: '',
      receiver_name: profile?.full_name || '',
      receiver_phone: profile?.phone_number || profile?.phone || '',
      notes: '',
      latitude: defaultLat,
      longitude: defaultLng,
      google_maps_url: '',
      locality_id: matchedLocalityId,
      landmark_id: null,
      gali_id: matchedGaliId,
      gali_name: matchedGaliId ? (galis.find(g => g.id === matchedGaliId)?.name || '') : '',
      is_default: serviceableAddresses.length === 0
    })

    setIsFormOpen(true)
    setIsAddressDropdownOpen(false)
  }, [activeCityName, allowedPincodes, currentCityObj, profile, localities, galis, serviceableAddresses.length])

  const handleStartEditAddress = useCallback((addr) => {
    const parsed = parseLandmark(addr.landmark)
    const foundGali = addr.gali_id ? galis.find(g => g.id === addr.gali_id) : null
    const galiName = foundGali ? foundGali.name : ''

    setEditingAddressId(addr.id)
    setFormData({
      label: addr.label || 'Home',
      address_line1: addr.address_line1 || '',
      address_line2: addr.address_line2 || '',
      city: addr.city || activeCityName,
      state: addr.state || currentCityObj?.state || 'Bihar',
      pincode: addr.pincode || allowedPincodes[0] || '',
      landmark: parsed.landmark || '',
      receiver_name: parsed.receiverName || profile?.full_name || '',
      receiver_phone: parsed.receiverPhone || profile?.phone_number || profile?.phone || '',
      notes: parsed.notes || '',
      latitude: addr.latitude || null,
      longitude: addr.longitude || null,
      google_maps_url: addr.google_maps_url || '',
      locality_id: addr.locality_id || null,
      landmark_id: addr.landmark_id || null,
      gali_id: addr.gali_id || null,
      gali_name: galiName,
      is_default: !!addr.is_default
    })
    setIsFormOpen(true)
    setIsAddressDropdownOpen(false)
  }, [activeCityName, currentCityObj, allowedPincodes, profile, galis])

  // 6. Submit Address Form
  const handleSubmitForm = async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    
    if (!formData.address_line1.trim()) {
      toast.error('Please enter Room / House / Flat number')
      return
    }
    if (!formData.address_line2.trim()) {
      toast.error('Please select Locality / Campus / Street area')
      return
    }
    if (!formData.city.trim()) {
      toast.error('City is required')
      return
    }
    if (!formData.pincode.trim()) {
      toast.error('Pincode is required')
      return
    }
    if (!formData.receiver_name.trim()) {
      toast.error('Recipient name is required')
      return
    }
    if (!formData.receiver_phone.trim()) {
      toast.error('Contact phone number is required')
      return
    }

    setIsSaving(true)
    try {
      const formattedLandmark = formatLandmark(
        formData.receiver_name,
        formData.receiver_phone,
        formData.landmark,
        formData.notes
      )

      // Resolve combined address_line2 (Gali/Hostel + Locality) so rider/admin sees full campus block details
      const selectedGaliObj = galis.find(g => g.id === formData.gali_id) || (formData.gali_name ? { name: formData.gali_name } : null)
      const selectedLocObj = localities.find(l => l.id === formData.locality_id)
      
      const locName = selectedLocObj ? selectedLocObj.name.trim() : formData.address_line2.trim()
      const galiName = selectedGaliObj ? selectedGaliObj.name.trim() : (formData.gali_name || '').trim()

      let finalAddressLine2 = locName
      if (galiName && !finalAddressLine2.toLowerCase().includes(galiName.toLowerCase())) {
        finalAddressLine2 = `${galiName}, ${locName}`
      }

      const payload = {
        label: formData.label || 'Home',
        address_line1: formData.address_line1.trim(),
        address_line2: finalAddressLine2,
        city: formData.city.trim(),
        state: formData.state.trim() || 'Bihar',
        pincode: formData.pincode.trim(),
        landmark: formattedLandmark,
        latitude: formData.latitude,
        longitude: formData.longitude,
        google_maps_url: formData.google_maps_url || null,
        is_default: formData.is_default,
        traced_through: 'order_checkout',
        locality_id: formData.locality_id || null,
        landmark_id: formData.landmark_id || null,
        gali_id: formData.gali_id || null
      }

      let result
      if (editingAddressId) {
        result = await updateUserAddress(editingAddressId, payload)
      } else {
        result = await addUserAddress(payload)
      }

      if (result) {
        onSelectAddress(result.id)
        setIsFormOpen(false)
        setEditingAddressId(null)
      }
    } catch (err) {
      console.error('Failed to save address:', err)
      toast.error(err.message || 'Failed to save address')
    } finally {
      setIsSaving(false)
    }
  }

  // 7. Delete Address Handler
  const handleConfirmDelete = async () => {
    if (!addressToDeleteId) return
    const idToDelete = addressToDeleteId
    setAddressToDeleteId(null)
    try {
      await deleteUserAddress(idToDelete)
      if (selectedAddressId === idToDelete) {
        onSelectAddress(null)
      }
    } catch (err) {
      console.error('Error deleting address:', err)
      toast.error('Failed to delete address')
    }
  }

  const selectedAddrObj = useMemo(() => {
    return serviceableAddresses.find(a => a.id === selectedAddressId)
  }, [serviceableAddresses, selectedAddressId])

  return (
    <section className="bg-white dark:bg-[#121214] rounded-[2rem] p-5 sm:p-7 md:p-8 shadow-sm border border-gray-100 dark:border-white/5 transition-all">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-green-50 dark:bg-ozo-green/10 text-ozo-green rounded-2xl flex items-center justify-center shrink-0">
            <MapPin size={22} className="stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
              <span>Delivery Address</span>
              {activeCityName && (
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-ozo-red/10 text-ozo-red border border-ozo-red/20">
                  {activeCityName}
                </span>
              )}
            </h2>
            <p className="text-xs text-gray-550 dark:text-gray-400 font-semibold">
              Select or add your destination address for this order
            </p>
          </div>
        </div>

        {!isFormOpen && (
          <button
            type="button"
            onClick={() => handleStartAddAddress()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-ozo text-white text-xs font-black shadow-sm hover:shadow-md hover:scale-105 active:scale-95 transition-all"
          >
            <Plus size={15} className="stroke-[3]" />
            <span>Add New</span>
          </button>
        )}
      </div>

      {/* When Address Form is OPEN (Add / Edit Mode) */}
      <AnimatePresence mode="wait">
        {isFormOpen ? (
          <motion.div
            key="address-form-container"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6 pt-2 border-t border-gray-100 dark:border-white/5"
          >
            <div className="flex items-center justify-between bg-gray-50/80 dark:bg-white/5 p-3.5 rounded-2xl border border-gray-150 dark:border-white/5">
              <span className="text-xs font-black uppercase tracking-wider text-gray-800 dark:text-gray-200">
                {editingAddressId ? 'Edit Delivery Address' : `New Address in ${activeCityName}`}
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsFormOpen(false)
                  setEditingAddressId(null)
                }}
                className="text-xs font-bold text-gray-500 hover:text-ozo-red flex items-center gap-1 p-1"
              >
                <X size={14} /> Cancel
              </button>
            </div>

            {/* AddressForm Component */}
            <AddressForm
              formData={formData}
              onChange={(updated) => setFormData(prev => ({ ...prev, ...updated }))}
              showContactFields={true}
              mapConfig={mapConfig}
              showMapPicker={showMapPicker}
              setShowMapPicker={setShowMapPicker}
              OzoMapPicker={OzoMapPicker}
              onMapLocationSelect={(loc) => {
                setFormData(prev => ({
                  ...prev,
                  latitude: loc.lat,
                  longitude: loc.lng,
                  address_line2: loc.street || prev.address_line2,
                  city: loc.cityVal || prev.city,
                  state: loc.stateVal || prev.state,
                  pincode: loc.pincodeVal || prev.pincode
                }))
              }}
            />

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2 relative z-0">
              <button
                type="button"
                onClick={() => {
                  setIsFormOpen(false)
                  setEditingAddressId(null)
                }}
                className="flex-1 py-3 px-4 rounded-xl border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 font-bold text-xs hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSubmitForm}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-ozo text-white font-black text-xs shadow-ozo hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSaving ? (
                  <span>Saving...</span>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>{editingAddressId ? 'Update & Select Address' : 'Save & Deliver Here'}</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        ) : (
          /* Address Cards & Selection View */
          <div className="space-y-4">
            {/* Quick Completion Banner for Live/Catalog Location */}
            {pendingActiveLocation && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-r from-ozo-red/10 via-rose-500/10 to-amber-500/10 border-2 border-ozo-red/30 dark:border-ozo-red/40 shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-ozo-red">
                      <Sparkles size={13} className="animate-pulse" />
                      <span>Current Selected Order Location</span>
                    </div>
                    <p className="text-sm font-black text-gray-900 dark:text-white truncate">
                      {pendingActiveLocation.title}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                      Complete your Room / Hostel / Flat number & Phone to deliver here.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleStartAddAddress(pendingActiveLocation)}
                    className="shrink-0 flex items-center justify-center gap-2 px-4 py-2.5 bg-ozo-red hover:bg-ozo-red-dark text-white rounded-xl text-xs font-black shadow-md hover:shadow-lg active:scale-95 transition-all self-start sm:self-auto"
                  >
                    <span>Complete Address & Deliver Here</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Currently Selected Address Card */}
            {selectedAddrObj ? (
              (() => {
                const parsed = parseLandmark(selectedAddrObj.landmark)
                const IconComponent = getAddressIcon(selectedAddrObj.label)
                const isServiceable = selectedAddrObj.latitude && selectedAddrObj.longitude
                  ? checkDeliveryZoneStatus(selectedAddrObj.latitude, selectedAddrObj.longitude, useCartStore.getState())
                  : checkPincodeServiceable(selectedAddrObj.pincode, selectedAddrObj.city)

                return (
                  <div
                    onClick={() => setIsAddressDropdownOpen(!isAddressDropdownOpen)}
                    className="address-card address-card-selected cursor-pointer group transition-all"
                  >
                    <div className="card-icon">
                      <IconComponent size={20} />
                    </div>

                    <div className="card-content">
                      <div className="card-header">
                        <div className="title-wrapper">
                          <h3>{selectedAddrObj.label}</h3>
                          {selectedAddrObj.latitude && selectedAddrObj.longitude && (
                            <span className="badge-pinned">
                              <MapPin size={10} /> PINNED
                            </span>
                          )}
                          {!isServiceable && (
                            <span className="badge-non-serviceable">
                              ⚠️ Non-Serviceable
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleStartEditAddress(selectedAddrObj)
                            }}
                            className="flex items-center gap-1.5 bg-white dark:bg-white/5 shadow-sm border border-gray-200 dark:border-white/10 py-1.5 px-3 rounded-full text-xs font-black text-gray-700 dark:text-gray-300 hover:text-ozo-red transition-all"
                            title="Edit Address"
                          >
                            <Pencil size={12} />
                            <span>Edit</span>
                          </button>
                          
                          <div className="flex items-center gap-1.5 bg-white dark:bg-white/5 shadow-sm border border-gray-200 dark:border-white/10 py-1.5 px-3.5 rounded-full text-xs font-black text-ozo-red">
                            <span>Change</span>
                            {isAddressDropdownOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </div>
                        </div>
                      </div>

                      {/* Recipient details */}
                      {(parsed.receiverName || parsed.receiverPhone) && (
                        <div className="user-details">
                          <span className="user-name">{parsed.receiverName}</span>
                          {parsed.receiverPhone && (
                            <span className="user-phone">• {parsed.receiverPhone}</span>
                          )}
                        </div>
                      )}

                      {/* Address Lines */}
                      <div className="address-text">
                        <p className="font-bold text-gray-800 dark:text-white text-[13px] leading-normal m-0">
                          {selectedAddrObj.address_line1}
                        </p>
                        {selectedAddrObj.address_line2 && (
                          <p className="text-gray-550 dark:text-gray-400 text-xs font-semibold mt-0.5 mb-0">
                            {selectedAddrObj.address_line2}
                          </p>
                        )}
                        <p className="text-gray-550 dark:text-gray-400 text-xs font-semibold mt-0.5 mb-0">
                          {parsed.landmark && `Near ${parsed.landmark}, `}
                          {selectedAddrObj.city}, {selectedAddrObj.state} - {selectedAddrObj.pincode}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })()
            ) : (
              /* No Address Selected in this city */
              <div className="p-6 rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 text-center flex flex-col items-center justify-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-ozo-red/10 text-ozo-red flex items-center justify-center">
                  <MapPin size={24} />
                </div>
                <div>
                  <p className="text-sm font-black text-gray-900 dark:text-white">
                    No Saved Address in {activeCityName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold mt-0.5">
                    Please add a delivery address in {activeCityName} to place your order.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleStartAddAddress()}
                  className="px-5 py-2.5 bg-gradient-ozo text-white text-xs font-black rounded-xl shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <Plus size={16} /> Add Address in {activeCityName}
                </button>
              </div>
            )}

            {/* Dropdown list of other addresses in this city */}
            <AnimatePresence>
              {isAddressDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden border-t border-dashed border-gray-200 dark:border-white/10 pt-4"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
                    {serviceableAddresses
                      .filter(addr => addr.id !== selectedAddressId)
                      .map((addr) => {
                        const parsed = parseLandmark(addr.landmark)
                        const IconComponent = getAddressIcon(addr.label)
                        return (
                          <div
                            key={addr.id}
                            onClick={() => {
                              onSelectAddress(addr.id)
                              setIsAddressDropdownOpen(false)
                            }}
                            className="address-card cursor-pointer group"
                          >
                            <div className="card-icon">
                              <IconComponent size={20} />
                            </div>

                            <div className="card-content">
                              <div className="card-header">
                                <div className="title-wrapper">
                                  <h3>{addr.label}</h3>
                                  {addr.latitude && addr.longitude && (
                                    <span className="badge-pinned">
                                      <MapPin size={10} /> PINNED
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleStartEditAddress(addr)
                                    }}
                                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl text-gray-400 hover:text-ozo-red transition-all"
                                    title="Edit Address"
                                  >
                                    <Pencil size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setAddressToDeleteId(addr.id)
                                    }}
                                    className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl text-gray-400 hover:text-red-500 transition-all"
                                    title="Delete Address"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>

                              {(parsed.receiverName || parsed.receiverPhone) && (
                                <div className="user-details">
                                  <span className="user-name">{parsed.receiverName}</span>
                                  {parsed.receiverPhone && (
                                    <span className="user-phone">• {parsed.receiverPhone}</span>
                                  )}
                                </div>
                              )}

                              <div className="address-text">
                                <p className="font-bold text-gray-800 dark:text-white text-[13px] leading-normal m-0">
                                  {addr.address_line1}
                                </p>
                                {addr.address_line2 && (
                                  <p className="text-gray-550 dark:text-gray-400 text-xs font-semibold mt-0.5 mb-0">
                                    {addr.address_line2}
                                  </p>
                                )}
                                <p className="text-gray-550 dark:text-gray-400 text-xs font-semibold mt-0.5 mb-0">
                                  {parsed.landmark && `Near ${parsed.landmark}, `}
                                  {addr.city}, {addr.state} - {addr.pincode}
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      })}

                    {/* Add New Address Card inside dropdown */}
                    <div
                      onClick={() => handleStartAddAddress()}
                      className="relative p-4 rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10 hover:border-ozo-red/50 hover:bg-red-50/10 dark:hover:bg-white/5 cursor-pointer transition-all flex flex-col items-center justify-center min-h-[120px] text-center group"
                    >
                      <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-ozo-red/10 text-ozo-red flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                        <Plus size={18} />
                      </div>
                      <p className="text-xs font-black text-gray-800 dark:text-white">Add New Address</p>
                      <p className="text-[10px] text-gray-400 font-bold mt-0.5">Deliver to another location in {activeCityName}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Partitioned Section: Addresses Saved in Other Cities */}
            {otherCityAddresses.length > 0 && (
              <div className="pt-3 border-t border-gray-100 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setShowOtherCitiesList(!showOtherCitiesList)}
                  className="w-full flex items-center justify-between text-left p-3 rounded-xl bg-gray-50/70 dark:bg-white/5 hover:bg-gray-100/70 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                    <span className="text-xs font-bold text-gray-600 dark:text-gray-400">
                      Saved addresses in other cities ({otherCityAddresses.length})
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-black text-gray-400 uppercase">
                    <span>{showOtherCitiesList ? 'Hide' : 'View'}</span>
                    {showOtherCitiesList ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </div>
                </button>

                <AnimatePresence>
                  {showOtherCitiesList && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden mt-3 space-y-2.5"
                    >
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold px-1">
                        These addresses are located in other cities (e.g. Aurangabad) and cannot be selected for this {activeCityName} order.
                      </p>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 opacity-75">
                        {otherCityAddresses.map((addr) => {
                          return (
                            <div
                              key={addr.id}
                              onClick={() => {
                                toast.error(`This address is in ${addr.city || 'another city'}. Please select an address in ${activeCityName}.`, {
                                  icon: '⚠️'
                                })
                              }}
                              className="p-3.5 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50/40 dark:bg-white/5 cursor-not-allowed flex flex-col justify-between"
                            >
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="text-xs font-black text-gray-700 dark:text-gray-300">{addr.label}</span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/50">
                                  {addr.city || 'Other City'}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 truncate">{addr.address_line1}</p>
                              <p className="text-[11px] text-gray-400 truncate">{addr.address_line2 || `${addr.city}, ${addr.pincode}`}</p>
                            </div>
                          )
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!addressToDeleteId}
        onClose={() => setAddressToDeleteId(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Address?"
        message="Are you sure you want to remove this address from your saved addresses?"
        confirmText="Delete"
        cancelText="Keep"
        isDanger={true}
      />
    </section>
  )
}
