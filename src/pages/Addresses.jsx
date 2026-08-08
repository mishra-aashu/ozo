import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  MapPin, 
  Plus, 
  Trash2, 
  Edit3, 
  Home, 
  Briefcase, 
  Check, 
  ArrowLeft,
  X,
  PlusCircle,
  Navigation,
  Map as MapIcon,
  ChevronDown,
  ChevronUp,
  User,
  Users,
  Phone
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useLocationStore, checkDeliveryZoneStatus, checkPincodeServiceable, showServiceabilityModal, findCityByPincode } from '../stores/locationStore'
import { useCartStore } from '../stores/cartStore'
import { useTranslation } from '../hooks/useTranslation'
import { useAuthStore } from '../stores/authStore'
import { useShallow } from 'zustand/react/shallow'
import { parseLandmark, formatLandmark, resolveSnappedAddress } from '../lib/addressHelpers'
import toast from 'react-hot-toast'
import OzoMapPicker from '../components/OzoMapPicker'
import AddressForm from '../components/AddressForm'
import OzoLoadingGuard from '../components/OzoLoadingGuard'
import useOzoQuery from '../hooks/useOzoQuery'

const Addresses = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const profile = useAuthStore(state => state.profile)
  const { 
    userAddresses, 
    fetchUserAddresses, 
    addUserAddress, 
    updateUserAddress, 
    deleteUserAddress, 
    isLoading 
  } = useLocationStore(useShallow(state => ({
    userAddresses: state.userAddresses,
    fetchUserAddresses: state.fetchUserAddresses,
    addUserAddress: state.addUserAddress,
    updateUserAddress: state.updateUserAddress,
    deleteUserAddress: state.deleteUserAddress,
    isLoading: state.isLoading
  })))

  const mapConfig = useCartStore(state => state.mapConfig)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAddress, setEditingAddress] = useState(null)
  const [showMapPicker, setShowMapPicker] = useState(false)
  const [addressToDelete, setAddressToDelete] = useState(null)
  const [recipientType, setRecipientType] = useState(null)
  
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
      google_maps_url: '',
      is_default: false,
      locality_id: null,
      landmark_id: null,
      gali_id: null
    }
  })

  const { isLoading: isAddressesLoading, isError, refetch } = useOzoQuery(
    async (signal) => {
      const res = await fetchUserAddresses({ signal })
      if (!res.success && !res.aborted) {
        throw res.error || new Error('Failed to fetch addresses')
      }
    },
    [fetchUserAddresses]
  )

  const openAddModal = () => {
    setEditingAddress(null)
    const nearestCity = useLocationStore.getState().nearestCity
    setRecipientType(null)
    setFormData({
      label: 'Home',
      address_line1: '',
      address_line2: '',
      city: '',
      state: nearestCity?.state || '',
      pincode: '',
      landmark: '',
      receiver_name: profile?.full_name || '',
      receiver_phone: profile?.phone_number || profile?.phone || '',
      notes: '',
      latitude: null,
      longitude: null,
      google_maps_url: '',
      is_default: userAddresses.length === 0, // default to true if it is the first address
      locality_id: null,
      landmark_id: null,
      gali_id: null
    })
    setShowMapPicker(false)
    setIsModalOpen(true)
  }

  const openEditModal = (addr) => {
    const parsed = parseLandmark(addr.landmark)
    const isMyself = parsed.receiverName === (profile?.full_name || '') && parsed.receiverPhone === (profile?.phone_number || profile?.phone || '')
    setRecipientType(isMyself ? 'myself' : 'other')
    setEditingAddress(addr)
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
      google_maps_url: addr.google_maps_url || '',
      is_default: addr.is_default || false,
      traced_through: addr.traced_through || 'manual',
      locality_id: addr.locality_id || null,
      landmark_id: addr.landmark_id || null,
      gali_id: addr.gali_id || null
    })
    setShowMapPicker(false)
    setIsModalOpen(true)
  }

  const handleLocationSelect = (loc) => {
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

    const { street, cityVal, stateVal, pincodeVal, landmarkVal } = resolveSnappedAddress(loc)

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

  const handleSubmit = async (e) => {
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
      google_maps_url: formData.google_maps_url || null,
      is_default: formData.is_default,
      traced_through: formData.traced_through || 'map',
      locality_id: formData.locality_id || null,
      landmark_id: formData.landmark_id || null,
      gali_id: formData.gali_id || null
    }

    let success = false
    if (editingAddress) {
      const res = await updateUserAddress(editingAddress.id, payload)
      if (res) success = true
    } else {
      const res = await addUserAddress(payload)
      if (res) success = true
    }

    if (success) {
      setIsModalOpen(false)
    }
  }
  const handleDelete = (id, e) => {
    e.stopPropagation()
    setAddressToDelete(id)
  }

  const handleSetDefault = async (addr) => {
    if (addr.is_default) return
    await updateUserAddress(addr.id, { ...addr, is_default: true })
  }

  const getLabelIcon = (labelStr) => {
    const l = (labelStr || '').toLowerCase()
    if (l.includes('home')) return Home
    if (l.includes('work') || l.includes('office')) return Briefcase
    return MapPin
  }

  const renderTitle = (titleString) => {
    if (!titleString) return null
    const words = titleString.trim().split(/\s+/)
    if (words.length <= 1) {
      return <>{titleString}<span className="text-gradient">.</span></>
    }
    const firstPart = words.slice(0, -1).join(' ')
    const lastWord = words[words.length - 1]
    return <>{firstPart} <span className="text-gradient">{lastWord}.</span></>
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] pb-24 transition-colors duration-300">
      {/* Header */}
      <div className="page-header-sticky">
        <div className="container-custom">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate(-1)} 
                className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors flex-shrink-0"
              >
                <ArrowLeft size={24} className="text-gray-900 dark:text-white" />
              </button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-display font-black text-gray-900 dark:text-white leading-tight">
                  {renderTitle(t('savedAddresses') || 'Saved Addresses')}
                </h1>
                <p className="text-xs sm:text-sm text-ozo-gray dark:text-gray-400 font-medium">
                  Manage your delivery locations
                </p>
              </div>
            </div>
            
            <button 
              onClick={openAddModal}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-ozo text-white rounded-2xl font-black text-sm shadow-ozo hover:scale-105 active:scale-95 transition-all flex-shrink-0"
            >
              <Plus size={18} strokeWidth={3} /> Add New Address
            </button>
          </div>
        </div>
      </div>

      <div className="container-custom py-12">
        <div className="max-w-4xl mx-auto">
          <OzoLoadingGuard
            isLoading={isAddressesLoading}
            isEmpty={userAddresses.length === 0}
            isError={isError}
            onRetry={refetch}
            skeleton={
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <div 
                    key={i} 
                    className="bg-white dark:bg-[#1a1a1a] p-8 rounded-[2.5rem] border border-gray-100 dark:border-white/5 flex flex-col justify-between min-h-[240px]"
                  >
                    <div>
                      {/* Top Row: Icon and Label + Badges */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl shimmer flex-shrink-0" />
                          <div className="h-5 w-16 rounded-md shimmer" />
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-16 rounded-full shimmer" />
                          <div className="h-6 w-16 rounded-full shimmer" />
                        </div>
                      </div>

                      {/* Middle Row: Address Details */}
                      <div className="space-y-2.5 mb-6 pr-6">
                        <div className="h-6 w-28 rounded-xl shimmer" />
                        <div className="h-4 w-4/5 rounded-md shimmer" />
                        <div className="h-3.5 w-2/3 rounded-md shimmer" />
                        <div className="h-3.5 w-1/2 rounded-md shimmer" />
                      </div>
                    </div>

                    {/* Bottom Row: Actions */}
                    <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-50 dark:border-white/5">
                      <div className="flex-1 h-10 rounded-xl shimmer" />
                      <div className="w-10 h-10 rounded-xl shimmer" />
                    </div>
                  </div>
                ))}
              </div>
            }
            fallback={
              <div className="text-center py-20 bg-white dark:bg-[#1a1a1a] rounded-[2.5rem] p-8 border border-gray-100 dark:border-white/5">
                <div className="w-20 h-20 bg-green-50 dark:bg-ozo-green/10 text-ozo-green rounded-[1.8rem] flex items-center justify-center mx-auto mb-6">
                  <MapPin size={40} />
                </div>
                <h3 className="text-2xl font-black mb-2 text-gray-900 dark:text-white">No Addresses Saved Yet</h3>
                <p className="text-ozo-gray dark:text-gray-400 font-medium max-w-sm mx-auto mb-8">
                  Please add a delivery address to complete your orders and check standard delivery times.
                </p>
                <button 
                  onClick={openAddModal}
                  className="px-8 py-4 bg-gradient-ozo text-white rounded-2xl font-black text-sm shadow-ozo hover:scale-105 active:scale-95 transition-all"
                >
                  Add Your First Address
                </button>
              </div>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {userAddresses.map((addr) => {
                const Icon = getLabelIcon(addr.label)
                const parsed = parseLandmark(addr.landmark)
                return (
                  <div 
                    key={addr.id}
                    onClick={() => handleSetDefault(addr)}
                    className={`relative bg-white dark:bg-[#1a1a1a] p-8 rounded-[2.5rem] border transition-all cursor-pointer group flex flex-col justify-between min-h-[240px] ${
                      addr.is_default 
                        ? 'border-ozo-green shadow-xl ring-2 ring-ozo-green/15' 
                        : 'border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10 hover:shadow-lg'
                    }`}
                  >
                    <div>
                      {/* Label and Badge */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            addr.is_default 
                              ? 'bg-green-50 dark:bg-ozo-green/10 text-ozo-green' 
                              : 'bg-gray-50 dark:bg-white/5 text-gray-400 group-hover:text-ozo-red'
                          } transition-colors`}>
                            <Icon size={20} />
                          </div>
                          <span className="font-black text-gray-900 dark:text-white capitalize">{addr.label}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {(() => {
                            const isServiceable = addr.latitude && addr.longitude
                              ? checkDeliveryZoneStatus(addr.latitude, addr.longitude, useCartStore.getState())
                              : checkPincodeServiceable(addr.pincode, addr.city);
                            return !isServiceable && (
                              <span className="flex items-center gap-1 text-[10px] uppercase tracking-widest font-black text-red-650 bg-red-50 dark:bg-red-950/20 px-3 py-1 rounded-full border border-red-200">
                                ⚠️ Non-Serviceable
                              </span>
                            );
                          })()}
                          {addr.latitude && addr.longitude && (
                            <span className="text-[10px] uppercase tracking-widest font-black text-ozo-red bg-red-50 dark:bg-ozo-red/10 px-3 py-1 rounded-full border border-ozo-red/20 flex items-center gap-1">
                              <MapPin size={10} /> Pinned
                            </span>
                          )}
                          {addr.is_default && (
                            <span className="flex items-center gap-1 text-[10px] uppercase tracking-widest font-black text-ozo-green bg-green-50 dark:bg-ozo-green/10 px-3 py-1 rounded-full border border-ozo-green/20">
                              <Check size={10} strokeWidth={3} /> Default
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Address Lines */}
                      <div className="space-y-2 mb-6 pr-6">
                        {(parsed.receiverName || parsed.receiverPhone) && (
                          <div className="flex items-center gap-2 text-xs text-gray-900 dark:text-white font-black mb-3">
                            <User size={13} className="text-ozo-red dark:text-red-400 flex-shrink-0" />
                            <span>{parsed.receiverName.toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}</span>
                            {parsed.receiverPhone && (
                              <>
                                <span className="text-gray-300 dark:text-gray-700 font-normal">|</span>
                                <Phone size={11} className="text-ozo-red dark:text-red-400 flex-shrink-0" />
                                <span className="text-xs text-ozo-gray dark:text-gray-450 font-bold">
                                  {parsed.receiverPhone}
                                </span>
                              </>
                            )}
                          </div>
                        )}
                        {addr.address_line1 && addr.address_line1.startsWith('Location Link: ') ? (
                          <div className="mb-2">
                            <a
                              href={addr.google_maps_url || addr.address_line1.replace('Location Link: ', '')}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-[10px] font-black tracking-wider uppercase text-ozo-red hover:underline inline-flex items-center gap-1.5 bg-red-50 dark:bg-ozo-red/10 border border-ozo-red/15 px-2.5 py-1 rounded-xl"
                            >
                              🗺️ View Pin on Map
                            </a>
                          </div>
                        ) : (
                          <p className="font-bold text-gray-800 dark:text-white text-sm leading-relaxed">
                            {addr.address_line1}
                          </p>
                        )}
                        {addr.address_line2 && (
                          <p className="text-gray-550 dark:text-gray-400 text-xs font-semibold leading-normal">
                            {addr.address_line2}
                          </p>
                        )}
                        {parsed.landmark && (
                          <p className="text-gray-550 dark:text-gray-400 text-xs font-semibold mt-0.5">
                            Landmark: {parsed.landmark}
                          </p>
                        )}
                        <p className="font-black text-gray-900 dark:text-white text-xs mt-1.5 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 px-2.5 py-1 rounded-lg w-fit">
                          {addr.city}, {addr.state} - {addr.pincode}
                        </p>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-50 dark:border-white/5">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation()
                          openEditModal(addr)
                        }}
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl text-xs font-black transition-all"
                      >
                        <Edit3 size={14} /> Edit
                      </button>
                      
                      {!addr.is_default && (
                        <button 
                          onClick={(e) => handleDelete(addr.id, e)}
                          className="p-3 bg-red-50 dark:bg-ozo-red/10 text-ozo-red hover:bg-ozo-red hover:text-white rounded-xl transition-all"
                          title="Delete Address"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </OzoLoadingGuard>
        </div>
      </div>

      {/* Add / Edit Address Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-[#1a1a1a] rounded-[2.5rem] p-8 shadow-2xl border border-gray-100 dark:border-white/5 w-full max-w-xl relative z-10 max-h-[90vh] overflow-y-auto scrollbar-hide text-gray-800 dark:text-white"
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-6 right-6 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <X size={20} />
              </button>

              <h3 className="text-2xl font-black mb-2 flex items-center gap-3">
                <span className="w-1.5 h-6 bg-ozo-red rounded-full" />
                {editingAddress ? 'Edit Address' : 'Add New Address'}
              </h3>
              <p className="text-sm text-ozo-gray dark:text-gray-400 font-medium mb-6">
                Enter details for your delivery address.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
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
                  <div className="space-y-5 animate-fadeIn">
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
                      onMapLocationSelect={handleLocationSelect}
                    />

                    {/* Set default checkbox */}
                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, is_default: !formData.is_default })}
                        className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                          formData.is_default 
                            ? 'bg-ozo-green border-ozo-green text-white' 
                            : 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5'
                        }`}
                      >
                        {formData.is_default && <Check size={14} strokeWidth={3} />}
                      </button>
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Set as default delivery address</span>
                    </div>

                    {/* Form Actions */}
                    <div className="flex justify-end gap-4 pt-4 border-t border-gray-100 dark:border-white/5">
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="px-6 py-3.5 bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-gray-300 font-black rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-all text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-10 py-3.5 bg-gradient-ozo text-white font-black rounded-xl shadow-ozo hover:scale-105 transition-all text-sm"
                      >
                        Save Address
                      </button>
                    </div>
                  </div>
                )}
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {addressToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAddressToDelete(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
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
                    toast.success('Address deleted successfully')
                  }}
                  className="flex-1 py-4 bg-gradient-ozo text-white font-black rounded-2xl shadow-ozo hover:scale-[1.02] active:scale-[0.98] transition-all text-xs animate-pulse-subtle"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Addresses
