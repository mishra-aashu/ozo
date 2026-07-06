import { motion, AnimatePresence } from 'framer-motion'
import { 
  MapPin, 
  Search, 
  X, 
  Navigation, 
  ChevronRight, 
  Home, 
  Briefcase, 
  Map as MapIcon,
  Plus,
  LogIn,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Trash2,
  User,
  Users
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useLocationStore, checkDeliveryZoneStatus, checkPincodeServiceable, showServiceabilityModal, findMatchingActiveCity, findCityByPincode } from '../stores/locationStore'
import { useCartStore } from '../stores/cartStore'
import { useAuthStore } from '../stores/authStore'
import { parseLandmark, formatLandmark } from '../lib/addressHelpers'
import OzoMapPicker from './OzoMapPicker'
import AddressForm from './AddressForm'
import toast from 'react-hot-toast'

const LocationPicker = ({ isOpen, onClose }) => {
  const { 
    address, 
    setAddress, 
    coordinates,
    setCoordinates,
    detectLocation, 
    isDetecting, 
    userAddresses, 
    fetchUserAddresses, 
    addUserAddress,
    deleteUserAddress,
    isLoading 
  } = useLocationStore()
  const { isAuthenticated, profile } = useAuthStore()
  const { mapConfig } = useCartStore()
  const [recipientType, setRecipientType] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showMapPicker, setShowMapPicker] = useState(false)
  const [editingAddressId, setEditingAddressId] = useState(null)
  const [addressToDelete, setAddressToDelete] = useState(null)

  const [formData, setFormData] = useState(() => {
    const nearestCity = useLocationStore.getState().nearestCity
    return {
      label: 'Home',
      address_line1: '',
      address_line2: '',
      city: '',
      state: nearestCity?.state || '',
      pincode: '',
      landmark: '',
      receiver_name: '',
      receiver_phone: '',
      notes: '',
      latitude: null,
      longitude: null,
      locality_id: null,
      landmark_id: null,
      gali_id: null
    }
  })

  // Synchronize initial map coordinates and fields when editing
  const handleMapLocationSelect = (loc) => {
    if (loc.isManualSelect) {
      setFormData(prev => ({
        ...prev,
        latitude: loc.lat,
        longitude: loc.lng
      }))
      return
    }

    const isDeliverable = checkDeliveryZoneStatus(loc.lat, loc.lng, useCartStore.getState())
    if (!isDeliverable) {
      const { geofenceConfig } = useCartStore.getState()
      if (geofenceConfig?.strict_enforcement) {
        toast.error('Location is outside our active delivery zone.', {
          duration: 4000
        })
        return
      } else {
        toast.success('Location is outside zone. Double delivery fee will apply.', {
          duration: 4000
        })
      }
    }

    const addr = loc.addressDetails || {}
    const nearest = loc.nearestStreet || null
    
    const street = nearest 
      ? (nearest.name_hi ? `${nearest.name} (${nearest.name_hi})` : nearest.name)
      : [addr.road, addr.pedestrian || addr.suburb].filter(Boolean).join(', ')
    
    const nearestCity = useLocationStore.getState().nearestCity
    const cityVal = nearest ? (nearestCity?.name || 'Aurangabad') : (addr.city || addr.town || addr.village || addr.county || '')
    const stateVal = nearest ? (nearestCity?.state || 'Bihar') : (addr.state || '')
    const pincodeVal = nearest ? (nearestCity?.allowed_pincodes?.[0] || '') : (addr.postcode || '')
    const landmarkVal = addr.amenity || addr.landmark || addr.commercial || addr.shop || ''

    // Compute smart snapping from hierarchical database nodes
    const snapResult = useLocationStore.getState().findClosestHierarchicalMatch(loc.lat, loc.lng)
    const matchedLocalityName = snapResult.locality ? snapResult.locality.name : ''
    const matchedLandmarkName = snapResult.landmark ? snapResult.landmark.name : ''

    setFormData(prev => ({
      ...prev,
      latitude: loc.lat,
      longitude: loc.lng,
      address_line1: prev.address_line1 || (snapResult.gali ? snapResult.gali.name : ''),
      address_line2: matchedLocalityName || street || prev.address_line2 || '',
      city: cityVal || prev.city || '',
      state: stateVal || prev.state || '',
      pincode: pincodeVal || prev.pincode || '',
      landmark: prev.landmark || matchedLandmarkName || landmarkVal || '',
      traced_through: 'map',
      locality_id: snapResult.locality ? snapResult.locality.id : prev.locality_id,
      landmark_id: snapResult.landmark ? snapResult.landmark.id : prev.landmark_id,
      gali_id: snapResult.gali ? snapResult.gali.id : prev.gali_id
    }))
  }

  useEffect(() => {
    if (isOpen) {
      const controller = new AbortController()
      fetchUserAddresses({ signal: controller.signal })
      return () => {
        controller.abort()
      }
    }
  }, [isOpen, fetchUserAddresses])

  const handleSelect = (addr) => {
    // Directly select saved address for checkout/home, and close picker
    const cleanAddressLine = [addr.address_line1, addr.address_line2].filter(Boolean).join(', ')
    const formattedAddress = `${cleanAddressLine}, ${addr.city}, ${addr.state} - ${addr.pincode}`
    setAddress(formattedAddress)
    
    const matchedCity = findMatchingActiveCity(addr.city)
    
    if (addr.latitude && addr.longitude) {
      setCoordinates({ lat: parseFloat(addr.latitude), lng: parseFloat(addr.longitude) })
    } else {
      useLocationStore.setState({
        nearestCity: matchedCity || null,
        selectedCitySlug: matchedCity ? matchedCity.slug : null
      })
    }
    useLocationStore.setState({
      tracedThrough: addr.traced_through || 'manual',
      addressDetails: {
        city: addr.city,
        state: addr.state,
        postcode: addr.pincode
      }
    })
    onClose()
  }

  const handleOpenAddForm = () => {
    setEditingAddressId(null)
    const nearestCity = useLocationStore.getState().nearestCity
    setRecipientType(isAuthenticated ? null : 'myself')
    setFormData({
      label: 'Home',
      address_line1: '',
      address_line2: '',
      city: '',
      state: nearestCity?.state || '',
      pincode: '',
      landmark: '',
      receiver_name: profile?.full_name || 'Guest User',
      receiver_phone: profile?.phone_number || profile?.phone || '9999999999',
      notes: '',
      latitude: null,
      longitude: null,
      locality_id: null,
      landmark_id: null,
      gali_id: null
    })
    setShowMapPicker(false)
    setShowForm(true)
  }

  const handleOpenEditForm = (addr, e) => {
    e.stopPropagation()
    const parsed = parseLandmark(addr.landmark)
    const isMyself = parsed.receiverName === (profile?.full_name || '') && parsed.receiverPhone === (profile?.phone_number || profile?.phone || '')
    setRecipientType(isMyself ? 'myself' : 'other')
    setEditingAddressId(addr.id)
    setFormData({
      label: addr.label || 'Home',
      address_line1: addr.address_line1 || '',
      address_line2: addr.address_line2 || '',
      city: addr.city || '',
      state: addr.state || '',
      pincode: addr.pincode || '',
      landmark: parsed.landmark || '',
      receiver_name: parsed.receiverName || '',
      receiver_phone: parsed.receiverPhone || '',
      notes: parsed.notes || '',
      latitude: addr.latitude || null,
      longitude: addr.longitude || null,
      traced_through: addr.traced_through || 'manual',
      locality_id: addr.locality_id || null,
      landmark_id: addr.landmark_id || null,
      gali_id: addr.gali_id || null
    })
    setShowMapPicker(false)
    setShowForm(true)
  }

  const handleSaveForm = async (e) => {
    e.preventDefault()

    let finalReceiverName = formData.receiver_name
    let finalReceiverPhone = formData.receiver_phone

    if (recipientType === 'myself') {
      finalReceiverName = profile?.full_name || ''
      finalReceiverPhone = profile?.phone_number || profile?.phone || ''
    }

    if (!finalReceiverName.trim()) {
      toast.error('Receiver name is required')
      return
    }
    if (!finalReceiverPhone.trim()) {
      toast.error('Receiver phone number is required')
      return
    }
    if (!formData.address_line1.trim()) {
      toast.error('Flat/House/Building number is required')
      return
    }
    if (!formData.address_line2.trim()) {
      toast.error('Street/Gali/Area is required')
      return
    }
    if (!formData.city.trim()) {
      toast.error('City is required')
      return
    }
    if (!formData.state.trim()) {
      toast.error('State is required')
      return
    }
    if (!formData.pincode.trim()) {
      toast.error('Pincode is required')
      return
    }

    // Geofence circle check is the Single Source of Truth if coordinates are available.
    let isFormDataServiceable = true
    if (formData.latitude && formData.longitude) {
      isFormDataServiceable = checkDeliveryZoneStatus(formData.latitude, formData.longitude, useCartStore.getState())
    } else if (formData.pincode) {
      isFormDataServiceable = checkPincodeServiceable(formData.pincode, formData.city)
    }

    if (!isFormDataServiceable) {
      if (formData.latitude && formData.longitude) {
        const { geofenceConfig } = useCartStore.getState()
        if (geofenceConfig?.strict_enforcement) {
          toast.error('Location is outside our active delivery zone.')
          return
        } else {
          toast.success('Adding location outside zone (double delivery fee will apply).')
        }
      } else {
        showServiceabilityModal(formData.city, formData.pincode)
        return
      }
    }

    const payload = {
      label: formData.label,
      address_line1: formData.address_line1,
      address_line2: formData.address_line2,
      city: formData.city,
      state: formData.state,
      pincode: formData.pincode,
      landmark: formatLandmark(finalReceiverName, finalReceiverPhone, formData.landmark, formData.notes),
      latitude: formData.latitude,
      longitude: formData.longitude,
      is_default: false,
      traced_through: formData.traced_through || 'map',
      locality_id: formData.locality_id || null,
      landmark_id: formData.landmark_id || null,
      gali_id: formData.gali_id || null
    }

    let result
    if (editingAddressId) {
      result = await useLocationStore.getState().updateUserAddress(editingAddressId, payload)
    } else {
      result = await addUserAddress(payload)
    }

    if (result) {
      const cleanAddressLine = [payload.address_line1, payload.address_line2].filter(Boolean).join(', ')
      const formattedAddress = `${cleanAddressLine}, ${payload.city}, ${payload.state} - ${payload.pincode}`
      setAddress(formattedAddress)
      if (payload.latitude && payload.longitude) {
        await setCoordinates({ lat: payload.latitude, lng: payload.longitude })
      } else {
        const matchedCity = findMatchingActiveCity(payload.city)
        useLocationStore.setState({
          nearestCity: matchedCity || null,
          selectedCitySlug: matchedCity ? matchedCity.slug : null
        })
      }
      useLocationStore.setState({
        tracedThrough: payload.traced_through || 'manual',
        addressDetails: {
          city: payload.city,
          state: payload.state,
          postcode: payload.pincode
        }
      })
      setShowForm(false)
      setShowMapPicker(false)
      onClose()
    }
  }

  const getIcon = (title) => {
    const t = (title || '').toLowerCase()
    if (t.includes('home')) return Home
    if (t.includes('work') || t.includes('office')) return Briefcase
    return MapPin
  }

  // Filter addresses by search query
  const filteredAddresses = userAddresses.filter(addr => {
    const query = searchQuery.toLowerCase().trim()
    if (!query) return true
    
    const parsed = parseLandmark(addr.landmark)
    return (
      (addr.label || '').toLowerCase().includes(query) ||
      (addr.address_line1 || '').toLowerCase().includes(query) ||
      (addr.address_line2 || '').toLowerCase().includes(query) ||
      (addr.city || '').toLowerCase().includes(query) ||
      (parsed.receiverName || '').toLowerCase().includes(query) ||
      (parsed.receiverPhone || '').toLowerCase().includes(query) ||
      (parsed.landmark || '').toLowerCase().includes(query)
    )
  })

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />

          {/* Sidebar Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-[450px] bg-white dark:bg-[#0d0d0d] z-[101] overflow-hidden flex flex-col border-l border-gray-100 dark:border-white/5 shadow-[-20px_0_50px_rgba(0,0,0,0.1)] dark:shadow-[-20px_0_50px_rgba(0,0,0,0.4)] text-gray-800 dark:text-white"
          >
            {/* Header */}
            <div className="p-8 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-white/80 dark:bg-[#0d0d0d]/80 backdrop-blur-md sticky top-0 z-10">
              <div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white font-display">
                  {showForm ? (editingAddressId ? 'Edit Address' : 'Add Address') : 'Select Location'}
                </h2>
                <p className="text-xs text-ozo-gray dark:text-gray-400 font-medium">
                  {showForm ? 'Enter your complete address details' : 'To see items available in your area'}
                </p>
              </div>
              <button 
                onClick={showForm ? () => { setShowForm(false); setShowMapPicker(false); } : onClose}
                className="p-3 rounded-2xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-all group"
              >
                {showForm ? (
                  <ArrowLeft size={24} className="text-gray-400 group-hover:text-ozo-red transition-colors" />
                ) : (
                  <X size={24} className="text-gray-400 group-hover:text-ozo-red transition-colors" />
                )}
              </button>
            </div>

            {showForm ? (
              /* Address Form View */
              <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-hide">
                <form onSubmit={handleSaveForm} className="space-y-6">
                  {!recipientType ? (
                    <div className="text-center py-12 animate-fadeIn space-y-8">
                      <div>
                        <p className="text-base font-black text-gray-800 dark:text-gray-200 mb-2">
                          Who is this address for?
                        </p>
                        <p className="text-xs text-ozo-gray dark:text-gray-400 font-bold">
                          Please select to continue
                        </p>
                      </div>
                      <div className="grid grid-cols-1 gap-4 max-w-sm mx-auto">
                        <button
                          type="button"
                          onClick={() => {
                            setRecipientType('myself');
                            setFormData({
                              ...formData,
                              receiver_name: profile?.full_name || '',
                              receiver_phone: profile?.phone_number || profile?.phone || ''
                            });
                          }}
                          className="p-6 rounded-[2.2rem] border border-gray-200 dark:border-white/5 bg-white dark:bg-[#1a1a1a] hover:border-ozo-red dark:hover:border-ozo-red/50 hover:bg-red-50/10 dark:hover:bg-ozo-red/5 transition-all text-left flex items-center gap-4 group active:scale-95 shadow-sm"
                        >
                          <div className="w-14 h-14 bg-red-50 dark:bg-ozo-red/10 text-ozo-red rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
                            <User size={26} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="font-black text-sm text-gray-900 dark:text-white">For Myself</h5>
                            <p className="text-[10px] text-gray-500 font-bold mt-1 leading-normal truncate">
                              {profile?.full_name || 'Your Name'} ({profile?.phone_number || profile?.phone || 'Your Phone'})
                            </p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setRecipientType('other');
                            setFormData({
                              ...formData,
                              receiver_name: '',
                              receiver_phone: ''
                            });
                          }}
                          className="p-6 rounded-[2.2rem] border border-gray-200 dark:border-white/5 bg-white dark:bg-[#1a1a1a] hover:border-ozo-red dark:hover:border-ozo-red/50 hover:bg-red-50/10 dark:hover:bg-ozo-red/5 transition-all text-left flex items-center gap-4 group active:scale-95 shadow-sm"
                        >
                          <div className="w-14 h-14 bg-blue-50 dark:bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
                            <Users size={26} />
                          </div>
                          <div>
                            <h5 className="font-black text-sm text-gray-900 dark:text-white">For Someone Else</h5>
                            <p className="text-[10px] text-gray-500 font-bold mt-1 leading-normal">
                              Deliver to a friend, family, or other contact
                            </p>
                          </div>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6 animate-fadeIn">
                      {/* Recipient Details Header */}
                      <div className="p-4 bg-red-50/20 dark:bg-white/[0.02] border border-red-500/10 dark:border-white/5 rounded-2xl flex items-center justify-between gap-3 animate-fadeIn">
                        <div>
                          <p className="text-[9px] font-black text-gray-500 uppercase tracking-wider">Recipient Mode</p>
                          <p className="text-xs font-bold text-gray-800 dark:text-gray-200 mt-0.5">
                            {recipientType === 'myself' 
                              ? `For Myself (${profile?.full_name || 'Your Name'} - ${profile?.phone_number || profile?.phone || 'No Phone'})` 
                              : 'For Someone Else'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setRecipientType(null)}
                          className="text-[10px] font-black uppercase tracking-wider text-ozo-red hover:underline"
                        >
                          Change
                        </button>
                      </div>

                      {/* Contact details for Other */}
                      {/* Reusable AddressForm */}
                      <AddressForm
                        formData={formData}
                        onChange={(updated) => setFormData(prev => ({ ...prev, ...updated }))}
                        showContactFields={recipientType === 'other'}
                        mapConfig={mapConfig}
                        showMapPicker={showMapPicker}
                        setShowMapPicker={setShowMapPicker}
                        OzoMapPicker={OzoMapPicker}
                        onMapLocationSelect={handleMapLocationSelect}
                      />

                      {/* Form Submission Actions */}
                      <div className="flex gap-4 pt-4 border-t border-gray-100 dark:border-white/5">
                        <button
                          type="button"
                          onClick={() => { setShowForm(false); setShowMapPicker(false); }}
                          className="flex-1 py-4 bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-gray-300 font-black rounded-2xl hover:bg-gray-100 dark:hover:bg-white/10 transition-all text-xs text-center"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="flex-1 py-4 bg-gradient-ozo text-white font-black rounded-2xl shadow-ozo hover:scale-[1.02] transition-all text-xs text-center"
                        >
                          Save & Select
                        </button>
                      </div>
                    </div>
                  )}
                </form>
              </div>
            ) : (
              /* Address List View */
              <div className="flex-1 overflow-y-auto p-8 space-y-10 scrollbar-hide">
                {/* Search Bar */}
                <div className="relative group">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-ozo-gray group-focus-within:text-ozo-red transition-colors" />
                  <input
                    type="text"
                    placeholder="Search for area, street name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-14 pr-6 py-5 bg-gray-50 dark:bg-white/5 border-2 border-transparent rounded-[1.5rem] focus:bg-white dark:focus:bg-white/10 focus:outline-none focus:border-ozo-red/20 transition-all text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400 shadow-sm focus:shadow-xl"
                  />
                </div>

              {/* Current Location Button */}
              <button 
                onClick={async () => {
                  const success = await detectLocation(true, true)
                  if (success) {
                    const currentAddress = useLocationStore.getState().address
                    const currentCoords = useLocationStore.getState().coordinates
                    if (currentCoords) {
                      setAddress(currentAddress)
                      setCoordinates({ lat: currentCoords.lat, lng: currentCoords.lng })
                      toast.success('Location set to Aurangabad successfully')
                    }
                    onClose()
                  }
                }}
                disabled={isDetecting}
                className="w-full flex items-center gap-5 p-5 rounded-[2rem] bg-red-50 dark:bg-ozo-red/10 text-ozo-red hover:bg-red-100 dark:hover:bg-ozo-red/20 transition-all group border border-ozo-red/10"
              >
                  <div className={`w-12 h-12 rounded-2xl bg-white dark:bg-[#1a1a1a] shadow-sm flex items-center justify-center ${isDetecting ? 'animate-pulse' : 'group-hover:scale-110 group-hover:rotate-12 transition-all'}`}>
                    <Navigation size={22} className={isDetecting ? 'animate-spin' : ''} />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-black text-sm">Use Current Location</p>
                    <p className="text-[10px] uppercase tracking-widest font-bold opacity-60">{isDetecting ? 'Detecting...' : 'Using GPS'}</p>
                  </div>
                  <ChevronRight className="opacity-40 group-hover:translate-x-1 transition-transform" />
                </button>

                {/* Saved Addresses */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="text-xs font-black text-ozo-gray dark:text-gray-500 uppercase tracking-[0.2em]">Saved Addresses</h3>
                    {isAuthenticated && (
                      <button 
                        onClick={handleOpenAddForm}
                        className="text-[10px] font-black text-ozo-red flex items-center gap-1.5 uppercase tracking-wider hover:underline"
                      >
                        <Plus size={14} strokeWidth={3} /> Add New
                      </button>
                    )}
                  </div>

                  {!isAuthenticated ? (
                    <div className="p-8 text-center bg-gray-50 dark:bg-white/5 rounded-[2rem] border border-gray-150 dark:border-white/5 shadow-sm">
                      <p className="text-xs text-ozo-gray dark:text-gray-400 font-bold mb-4">
                        Login to view your saved addresses and speed up checkouts.
                      </p>
                      <Link 
                        to="/auth" 
                        onClick={onClose}
                        className="inline-flex items-center justify-center gap-2 bg-gradient-ozo text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-sm hover:scale-105 transition-all"
                      >
                        <LogIn size={14} /> Login Now
                      </Link>
                    </div>
                  ) : isLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map(i => (
                        <div
                          key={i}
                          className="w-full flex items-center gap-5 p-5 bg-white dark:bg-white/5 rounded-[2rem] border border-gray-100 dark:border-white/5"
                        >
                          <div className="w-14 h-14 rounded-2xl shimmer flex-shrink-0" />
                          <div className="flex-1 min-w-0 space-y-2.5">
                            <div className="flex items-center gap-2">
                              <div className="h-4 w-20 rounded-md shimmer" />
                              <div className="h-3.5 w-12 rounded-full shimmer" />
                            </div>
                            <div className="h-3 w-36 rounded-md shimmer" />
                            <div className="h-3.5 w-4/5 rounded-md shimmer" />
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="w-8 h-8 rounded-xl shimmer" />
                            <div className="w-8 h-8 rounded-xl shimmer" />
                            <div className="w-5 h-5 rounded-md shimmer" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : userAddresses.length === 0 ? (
                    <div className="p-10 text-center bg-gray-50 dark:bg-white/5 rounded-[2.5rem] border border-gray-100 dark:border-white/5">
                      <p className="text-sm text-ozo-gray dark:text-gray-400 font-bold">No saved addresses yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredAddresses.map((addr) => {
                        const Icon = getIcon(addr.label || addr.title || '')
                        const parsed = parseLandmark(addr.landmark)
                        return (
                          <div
                            key={addr.id}
                            onClick={() => handleSelect(addr)}
                            className="w-full flex items-center gap-5 p-5 rounded-[2rem] hover:bg-gray-50 dark:hover:bg-white/5 transition-all text-left group border border-transparent hover:border-gray-100 dark:hover:border-white/5 hover:shadow-xl relative cursor-pointer"
                          >
                            <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-[#1a1a1a] flex items-center justify-center group-hover:bg-white dark:group-hover:bg-white/10 group-hover:shadow-md transition-all">
                              <Icon size={24} className="text-ozo-gray dark:text-gray-400 group-hover:text-ozo-red transition-colors" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-black text-gray-900 dark:text-white capitalize">{addr.label || addr.title}</p>
                                {addr.latitude && addr.longitude && (
                                  <span className="text-[8px] uppercase tracking-wider font-black text-ozo-red bg-red-50 dark:bg-ozo-red/10 px-2 py-0.5 rounded-full border border-ozo-red/15 flex items-center gap-1">
                                    <MapPin size={8} /> Pinned
                                  </span>
                                )}
                              </div>
                              
                              {(parsed.receiverName || parsed.receiverPhone) && (
                                <p className="text-[10px] font-bold text-ozo-red dark:text-red-400 mt-0.5 flex items-center gap-1">
                                  <User size={10} className="shrink-0" />
                                  <span>{parsed.receiverName} {parsed.receiverPhone && `(${parsed.receiverPhone})`}</span>
                                </p>
                              )}
                              
                              <p className="text-sm text-ozo-gray dark:text-gray-500 font-medium truncate mt-0.5">{addr.address_line1}, {addr.city}</p>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <span 
                                onClick={(e) => handleOpenEditForm(addr, e)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-all"
                                  title="Edit Address"
                                >
                                  <Edit3 size={16} className="text-gray-400 hover:text-ozo-red" />
                                </span>
                                <span 
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setAddressToDelete(addr.id)
                                  }}
                                  className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-all"
                                  title="Delete Address"
                                >
                                  <Trash2 size={16} className="text-gray-400 hover:text-ozo-red" />
                                </span>
                                <ChevronRight size={20} className="text-gray-300 dark:text-gray-700 group-hover:translate-x-1 transition-all" />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Manual Selection */}
                  <button 
                    onClick={handleOpenAddForm}
                    className="w-full flex items-center gap-5 p-6 rounded-[2.5rem] border-2 border-dashed border-gray-200 dark:border-white/10 text-ozo-gray dark:text-gray-400 hover:border-ozo-red/50 hover:text-ozo-red transition-all group bg-white dark:bg-white/5 shadow-sm"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-[#1a1a1a] group-hover:bg-red-50 dark:group-hover:bg-ozo-red/10 flex items-center justify-center transition-all shadow-sm">
                      <MapIcon size={24} />
                    </div>
                    <div className="text-left">
                      <span className="font-black text-sm block text-gray-900 dark:text-white">
                        {mapConfig?.hide_map ? 'Add Address Details' : 'Add / Locate on Map'}
                      </span>
                      <span className="text-[10px] text-gray-550 font-semibold block mt-0.5">
                        {mapConfig?.hide_map ? 'Enter flat, street, city and pincode' : 'Enter details & pin your precise spot'}
                      </span>
                    </div>
                    <ChevronRight className="ml-auto opacity-40 group-hover:translate-x-1 transition-all" />
                  </button>
                </div>
            )}

            {/* Footer */}
            <div className="p-8 bg-gray-50 dark:bg-[#0d0d0d] border-t border-gray-100 dark:border-white/5">
              <p className="text-center text-[10px] text-ozo-gray dark:text-gray-500 font-black uppercase tracking-[0.2em] leading-relaxed">
                Your location helps us find <br /> the nearest <span className="notranslate" translate="no">OZO</span> stores
              </p>
            </div>
          </motion.div>

          {/* Delete Confirmation Dialog */}
          <AnimatePresence>
            {addressToDelete && (
              <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setAddressToDelete(null)}
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                {/* Modal Content */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="bg-white dark:bg-[#1a1a1a] rounded-[2.5rem] p-8 shadow-2xl border border-gray-100 dark:border-white/5 w-full max-w-md relative z-10 text-center text-gray-800 dark:text-white"
                >
                  <div className="w-16 h-16 bg-red-50 dark:bg-ozo-red/10 text-ozo-red rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                    <Trash2 size={28} />
                  </div>
                  
                  <h3 className="text-xl font-black mb-2">Delete Address?</h3>
                  <p className="text-sm text-ozo-gray dark:text-gray-400 font-medium mb-8">
                    Are you sure you want to delete this address? This action cannot be undone.
                  </p>

                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setAddressToDelete(null)}
                      className="flex-1 py-4 bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-gray-300 font-black rounded-2xl hover:bg-gray-100 dark:hover:bg-white/10 transition-all text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await deleteUserAddress(addressToDelete)
                        setAddressToDelete(null)
                      }}
                      className="flex-1 py-4 bg-gradient-ozo text-white font-black rounded-2xl shadow-ozo hover:scale-[1.02] active:scale-[0.98] transition-all text-xs"
                    >
                      Delete
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  )
}

// Add simple SVG fallback for Edit3 in case not imported
const Edit3 = ({ size, className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M12 20h9"/>
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
  </svg>
)

export default LocationPicker
