import React, { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Upload, Camera, MessageSquare, Phone, ShieldCheck, MapPin, CheckCircle2, Loader2, Info, ChevronDown, Send } from 'lucide-react'
import { useServicesStore } from '../../stores/servicesStore'
import { useLocationStore } from '../../stores/locationStore'
import toast from 'react-hot-toast'

export default function ServiceInquiryModal({ isOpen, onClose, initialCategory = '' }) {
  const { categories, getVisitingFee, createInquiry, uploadInquiryImage, visitingFeesByCity } = useServicesStore()
  const { address, addressDetails, city: storeCity, activeCities, fetchActiveCities } = useLocationStore()

  const optionPanelRef = useRef(null)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [customerAddress, setCustomerAddress] = useState(address || '')
  const [categoryName, setCategoryName] = useState(initialCategory || 'General Inquiry')
  const [issueDescription, setIssueDescription] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedOption, setSelectedOption] = useState(null) // 'post' | 'whatsapp' | 'call' | null

  const handleOptionSelect = (optionKey) => {
    setSelectedOption(optionKey)
    setTimeout(() => {
      optionPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  useEffect(() => {
    if (fetchActiveCities) fetchActiveCities()
  }, [])

  const serviceableCities = useMemo(() => {
    const cityMap = new Map()

    if (activeCities && activeCities.length > 0) {
      activeCities.forEach(c => {
        const cName = (c.name || c.cityName || '').trim()
        if (cName && c.is_active !== false) {
          cityMap.set(cName, getVisitingFee(cName))
        }
      })
    }

    if (visitingFeesByCity) {
      Object.keys(visitingFeesByCity).forEach(cName => {
        const clean = cName.trim()
        if (clean && !cityMap.has(clean)) {
          cityMap.set(clean, getVisitingFee(clean))
        }
      })
    }

    if (cityMap.size === 0) {
      cityMap.set('Muzaffarpur', 99)
      cityMap.set('Patna', 149)
      cityMap.set('Darbhanga', 99)
    }

    return Array.from(cityMap.entries()).map(([cityName, fee]) => ({ name: cityName, fee }))
  }, [activeCities, visitingFeesByCity, getVisitingFee])

  // Calculate dynamic visiting fee based on selected city
  const currentVisitingFee = getVisitingFee(city)

  useEffect(() => {
    if (initialCategory) setCategoryName(initialCategory)
    if (address && !customerAddress) setCustomerAddress(address)

    const detectedUserCity = addressDetails?.city || storeCity
    if (detectedUserCity && serviceableCities.length > 0) {
      const matched = serviceableCities.find(c =>
        c.name.toLowerCase().includes(detectedUserCity.toLowerCase()) ||
        detectedUserCity.toLowerCase().includes(c.name.toLowerCase())
      )
      if (matched && city !== matched.name) {
        setCity(matched.name)
      } else if (!city) {
        setCity(serviceableCities[0].name)
      }
    } else if (serviceableCities.length > 0 && !city) {
      setCity(serviceableCities[0].name)
    }
  }, [initialCategory, address, addressDetails, storeCity, serviceableCities])

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Image size must be less than 10MB')
        return
      }
      setSelectedFile(file)
      const reader = new FileReader()
      reader.onloadend = () => setImagePreview(reader.result)
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e, type = 'whatsapp') => {
    if (e) e.preventDefault()

    if (type === 'post') {
      if (!name.trim() || !phone.trim() || !issueDescription.trim()) {
        toast.error('Please fill in your name, phone number, and problem details to post inquiry.')
        return
      }
    }

    const finalName = name.trim() || 'Valued Customer'
    const finalPhone = phone.trim() || 'N/A'
    const finalIssue = issueDescription.trim() || 'Doorstep inspection & quotation needed'

    setIsSubmitting(true)
    let uploadedUrl = null

    if (selectedFile && type === 'post') {
      setIsUploading(true)
      try {
        uploadedUrl = await uploadInquiryImage(selectedFile)
      } catch (err) {
        console.warn('Upload warning:', err)
      } finally {
        setIsUploading(false)
      }
    }

    let inquiry = null
    if (name.trim() && phone.trim() && issueDescription.trim()) {
      try {
        inquiry = await createInquiry({
          name: finalName,
          phone: finalPhone,
          city,
          address: customerAddress,
          category_name: categoryName,
          issue_description: finalIssue,
          image_url: uploadedUrl,
          visiting_fee: currentVisitingFee
        })
      } catch (err) {
        console.warn('Inquiry creation warning:', err)
      }
    }

    setIsSubmitting(false)

    if (type === 'whatsapp') {
      const whatsappNumber = import.meta.env.VITE_WHATSAPP_NUMBER || '+919876543210'
      const cleanPhone = whatsappNumber.replace(/[^0-9]/g, '')
      const message = `👋 *Hi OZO Doorstep Services!*\n` +
        `--------------------------------\n` +
        `🔧 *Category:* ${categoryName || 'General Service'}\n` +
        `🏙️ *City:* ${city}\n` +
        `📍 *Address:* ${customerAddress || 'Will share location on WhatsApp'}\n` +
        (name.trim() ? `👤 *Name:* ${name.trim()}\n` : '') +
        (phone.trim() ? `📞 *Phone:* ${phone.trim()}\n` : '') +
        `📝 *Requirement:* ${issueDescription.trim() || 'Doorstep diagnostic & quotation needed'}\n` +
        `💰 *Visiting Fee:* ₹${currentVisitingFee}\n` +
        (inquiry?.inquiry_number ? `🔖 *Inquiry ID:* #${inquiry.inquiry_number}\n` : '') +
        `--------------------------------\n` +
        `Please connect me with available expert technician!`

      const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
      window.open(waUrl, '_blank')
    } else if (type === 'call') {
      const supportPhone = import.meta.env.VITE_SUPPORT_PHONE || '1800-123-4567'
      const cleanSupport = supportPhone.replace(/[^0-9+]/g, '')
      window.location.href = `tel:${cleanSupport}`
    } else if (type === 'post') {
      toast.success(`Inquiry posted successfully! Our dispatch team will contact you shortly.`)
    }

    onClose()
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg bg-white dark:bg-[#1c1c24] rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-white/10 my-8 text-left"
        >
          {/* Modal Header with Embedded Inspection Fee */}
          <div className="bg-gradient-to-r from-gray-900 via-sky-950 to-gray-900 text-white p-5 sm:p-6 relative">
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pr-8">
              <span className="text-[10px] font-black uppercase tracking-wider text-sky-400 bg-sky-500/15 border border-sky-500/30 px-2.5 py-0.5 rounded-full">
                Doorstep Inspection
              </span>

              {/* Embedded Fee Badge */}
              <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md border border-white/15 px-2.5 py-0.5 rounded-lg">
                <ShieldCheck size={13} className="text-sky-400 shrink-0" />
                <span className="text-[11px] font-bold text-gray-200">
                  Fee ({city || 'City'}):
                </span>
                <span className="text-[11px] font-black text-sky-400 bg-sky-500/20 px-2 py-0.5 rounded border border-sky-400/30">
                  ₹{currentVisitingFee}
                </span>
              </div>
            </div>

            <h2 className="text-xl font-black mt-1">Need Custom Service?</h2>
            <p className="text-xs text-gray-300 mt-1 font-medium leading-relaxed">
              Upload fault photo or describe issue for doorstep diagnosis.
            </p>

            <div className="mt-3 pt-2 border-t border-white/10 flex items-center gap-1.5 text-[11px] font-bold text-emerald-400">
              <CheckCircle2 size={13} className="shrink-0" />
              <span>✓ ₹{currentVisitingFee} fee 100% adjusted in final bill upon completion.</span>
            </div>
          </div>

          {/* Form Content / Direct Call View */}
          <div className="p-6 max-h-[75vh] overflow-y-auto space-y-4">
            {/* 3 Quick Action Mode Selector Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleOptionSelect('post')}
                className={`p-3 rounded-2xl border transition-all text-left flex items-start gap-2.5 cursor-pointer ${
                  selectedOption === 'post'
                    ? 'bg-sky-500/10 border-sky-500 ring-2 ring-sky-500/30'
                    : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 hover:border-sky-500/40'
                }`}
              >
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                  selectedOption === 'post' ? 'bg-sky-500 text-white' : 'bg-gray-200 dark:bg-white/10 text-gray-500'
                }`}>
                  <Send size={14} />
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase text-sky-500 block">Option 1</span>
                  <h5 className="text-xs font-extrabold text-gray-900 dark:text-white leading-tight">Post Inquiry</h5>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleOptionSelect('whatsapp')}
                className={`p-3 rounded-2xl border transition-all text-left flex items-start gap-2.5 cursor-pointer ${
                  selectedOption === 'whatsapp'
                    ? 'bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/30'
                    : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 hover:border-emerald-500/40'
                }`}
              >
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                  selectedOption === 'whatsapp' ? 'bg-emerald-500 text-white' : 'bg-gray-200 dark:bg-white/10 text-gray-500'
                }`}>
                  <MessageSquare size={14} />
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase text-emerald-500 block">Option 2</span>
                  <h5 className="text-xs font-extrabold text-gray-900 dark:text-white leading-tight">WhatsApp Chat</h5>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleOptionSelect('call')}
                className={`p-3 rounded-2xl border transition-all text-left flex items-start gap-2.5 cursor-pointer ${
                  selectedOption === 'call'
                    ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/30'
                    : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 hover:border-amber-500/40'
                }`}
              >
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                  selectedOption === 'call' ? 'bg-amber-500 text-white' : 'bg-gray-200 dark:bg-white/10 text-gray-500'
                }`}>
                  <Phone size={14} />
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase text-amber-500 block">Option 3</span>
                  <h5 className="text-xs font-extrabold text-gray-900 dark:text-white leading-tight">Direct Call</h5>
                </div>
              </button>
            </div>

            <div ref={optionPanelRef} className="scroll-mt-4">
              {selectedOption === null && (
                <div className="bg-sky-500/5 dark:bg-white/5 border border-dashed border-sky-500/30 rounded-2xl p-6 text-center space-y-1.5 my-2">
                  <Sparkles size={22} className="mx-auto text-sky-500 animate-pulse" />
                  <h4 className="text-xs font-extrabold text-gray-900 dark:text-white">
                    Select an Option Above to Begin
                  </h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                    Tap Option 1 (Post Inquiry), Option 2 (WhatsApp Chat), or Option 3 (Direct Call)
                  </p>
                </div>
              )}

              {selectedOption === 'call' && (
                <div className="bg-amber-500/5 dark:bg-amber-500/10 rounded-2xl p-5 border border-amber-500/20 text-center space-y-4 my-2">
                  <div className="w-14 h-14 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center mx-auto border border-amber-500/20">
                    <Phone size={26} className="animate-bounce" />
                  </div>

                  <div>
                    <h4 className="text-base font-black text-gray-900 dark:text-white">Call Doorstep Dispatch Desk</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">
                      No form required! Speak directly for instant technician pairing in <strong>{city}</strong>.
                    </p>
                  </div>

                  <div className="p-3 bg-white dark:bg-[#121212] rounded-xl border border-amber-500/20 text-left flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[9px] font-extrabold text-amber-500 uppercase tracking-wider block">Hotline</span>
                      <span className="text-sm font-black text-gray-900 dark:text-white">1800-123-4567</span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      ● Active Now
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleSubmit(e, 'call')}
                    className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-black text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Phone size={16} />
                    <span>Call +91 1800-123-4567 Directly</span>
                  </button>
                </div>
              )}

              {(selectedOption === 'post' || selectedOption === 'whatsapp') && (
                <form onSubmit={(e) => handleSubmit(e, selectedOption)} className="space-y-4">

            {/* Name & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Your Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Mobile Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            {/* City & Address */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Select City</label>
                <div className="relative">
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full pl-3 pr-8 py-2.5 bg-gray-50 dark:bg-[#141824] border border-gray-200 dark:border-white/10 rounded-xl text-xs font-extrabold text-gray-900 dark:text-white appearance-none cursor-pointer focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all shadow-sm dark:[color-scheme:dark]"
                  >
                    {serviceableCities.map((c) => (
                      <option key={c.name} value={c.name} className="bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white py-1 font-bold">
                        {c.name} (₹{c.fee})
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Full Doorstep Address</label>
                <input
                  type="text"
                  placeholder="House/Flat No, Landmark, Area"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all shadow-sm"
                />
              </div>
            </div>

            {/* Quick Category Chips Selection */}
            <div>
              <label className="block text-xs font-extrabold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center justify-between">
                <span>Quick Choose Category</span>
                <span className="text-[10px] text-sky-500 font-bold">Tap topic</span>
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {[
                  { label: 'Plumbing', icon: '🚿' },
                  { label: 'Electrician', icon: '⚡' },
                  { label: 'AC Repair', icon: '❄️' },
                  { label: 'Carpentry', icon: '🔨' },
                  { label: 'Home Cleaning', icon: '🧹' },
                  { label: 'Painting', icon: '🎨' },
                  { label: 'Pest Control', icon: '🐜' },
                  { label: 'General Inquiry', icon: '🛠️' }
                ].map((cat) => {
                  const isSelected = categoryName.toLowerCase().includes(cat.label.toLowerCase()) || cat.label.toLowerCase().includes(categoryName.toLowerCase())
                  return (
                    <button
                      key={cat.label}
                      type="button"
                      onClick={() => setCategoryName(cat.label)}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all border flex items-center gap-1 cursor-pointer ${
                        isSelected
                          ? 'bg-sky-500 text-white border-sky-500 shadow-sm scale-105'
                          : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:border-sky-500/40'
                      }`}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Service Category Selection */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Service Type Dropdown</label>
              <div className="relative">
                <select
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className="w-full pl-3.5 pr-9 py-2.5 bg-gray-50 dark:bg-[#141824] border border-gray-200 dark:border-white/10 rounded-xl text-sm font-bold text-gray-900 dark:text-white appearance-none cursor-pointer focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all shadow-sm dark:[color-scheme:dark]"
                >
                  <option value="General Inquiry" className="bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white py-1 font-bold">General Inquiry / Custom Issue</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.title} className="bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white py-1 font-bold">
                      {c.title}
                    </option>
                  ))}
                </select>
                <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Problem Description */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Describe Problem / Service Required
              </label>
              <textarea
                rows={2.5}
                placeholder="e.g. Bathroom pipe leaking behind wall, or split AC not cooling..."
                value={issueDescription}
                onChange={(e) => setIssueDescription(e.target.value)}
                className="w-full px-3.5 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-xs font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* Live WhatsApp Message Preview */}
            {selectedOption === 'whatsapp' && (
              <div className="p-3 bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <MessageSquare size={12} /> WhatsApp Message Preview
                  </span>
                  <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-white dark:bg-black/40 px-1.5 py-0.5 rounded-md border border-emerald-500/30">
                    OZO WhatsApp
                  </span>
                </div>

                <div className="p-2.5 bg-white dark:bg-[#121212] rounded-lg border border-emerald-500/20 text-[11px] font-medium text-gray-800 dark:text-gray-200 leading-relaxed font-sans shadow-inner">
                  👋 <strong>*Hi OZO Doorstep Services!*</strong><br />
                  🔧 <strong>*Category:*</strong> {categoryName || 'General Service'}<br />
                  🏙️ <strong>*City:*</strong> {city}<br />
                  📍 <strong>*Address:*</strong> {customerAddress || 'Will share on chat'}<br />
                  {name.trim() && <>👤 <strong>*Name:*</strong> {name.trim()}<br /></>}
                  📝 <strong>*Requirement:*</strong> {issueDescription.trim() || 'Doorstep diagnostic needed'}<br />
                  💰 <strong>*Visiting Fee:*</strong> ₹{currentVisitingFee}<br />
                  Please connect me with expert technician!
                </div>
              </div>
            )}

            {/* Image Photo Upload */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Upload Photo of Fault / Issue (Optional)
              </label>
              
              <div className="flex items-center gap-3">
                <label className="flex-1 cursor-pointer flex items-center justify-center gap-2 p-3 bg-gray-50 dark:bg-white/5 hover:bg-sky-500/10 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-2xl text-xs font-bold text-gray-600 dark:text-gray-300 transition-colors">
                  <Camera size={16} className="text-sky-500" />
                  <span>{selectedFile ? selectedFile.name : 'Choose Photo or Take Picture'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>

                {imagePreview && (
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-sky-500/30 shrink-0">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null)
                        setImagePreview(null)
                      }}
                      className="absolute top-0 right-0 bg-black/60 text-white p-0.5"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Single Action Button Matching Selected Option */}
            <div className="pt-3 border-t border-gray-100 dark:border-white/10">
              {selectedOption === 'post' && (
                <button
                  type="button"
                  onClick={(e) => handleSubmit(e, 'post')}
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <Send size={16} />
                      <span>Submit & Post Inquiry Online</span>
                    </>
                  )}
                </button>
              )}

              {selectedOption === 'whatsapp' && (
                <button
                  type="button"
                  onClick={(e) => handleSubmit(e, 'whatsapp')}
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <MessageSquare size={16} />
                      <span>Open WhatsApp Chat with OZO</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  </motion.div>
  </div>
</AnimatePresence>
  )
}
