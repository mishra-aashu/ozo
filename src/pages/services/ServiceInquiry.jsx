import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Camera,
  Upload,
  MessageSquare,
  Phone,
  ShieldCheck,
  MapPin,
  CheckCircle2,
  Loader2,
  Info,
  Sparkles,
  HelpCircle,
  X,
  ChevronDown,
  Send,
  Calendar,
  Plus
} from 'lucide-react'
import { useServicesStore } from '../../stores/servicesStore'
import { useLocationStore } from '../../stores/locationStore'
import SEO from '../../components/SEO'
import toast from 'react-hot-toast'

export default function ServiceInquiry() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryParams = new URLSearchParams(location.search)
  const categoryFromUrl = queryParams.get('category') || ''

  const { categories, fetchCategories, fetchVisitingFees, getVisitingFee, createInquiry, uploadInquiryImage, visitingFeesByCity } = useServicesStore()
  const { address, addressDetails, city: storeCity, activeCities, fetchActiveCities } = useLocationStore()

  const optionPanelRef = useRef(null)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [customerAddress, setCustomerAddress] = useState(address || '')
  const [categoryName, setCategoryName] = useState(categoryFromUrl || 'General Inquiry')
  const [issueDescription, setIssueDescription] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittedInquiry, setSubmittedInquiry] = useState(null)
  const [selectedOption, setSelectedOption] = useState(null) // 'post' | 'whatsapp' | 'call' | null

  const handleOptionSelect = (optionKey) => {
    setSelectedOption(optionKey)
    setTimeout(() => {
      optionPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  // Fetch live database categories, visiting fees & active cities on mount
  useEffect(() => {
    if (fetchCategories) fetchCategories(true)
    if (fetchVisitingFees) fetchVisitingFees()
    if (fetchActiveCities) fetchActiveCities()
  }, [])

  // Build unique list of serviceable cities combining locationStore & servicesStore
  const serviceableCities = useMemo(() => {
    const cityMap = new Map()

    if (activeCities && activeCities.length > 0) {
      activeCities.forEach(c => {
        const cityName = (c.name || c.cityName || '').trim()
        if (cityName && c.is_active !== false) {
          cityMap.set(cityName, getVisitingFee(cityName))
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

  // Auto-detect user's current city & prefill doorstep address
  useEffect(() => {
    if (address && !customerAddress) {
      setCustomerAddress(address)
    }

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
  }, [address, addressDetails, storeCity, serviceableCities])

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

    // For Option 1 (Post Inquiry), enforce full validation
    if (type === 'post') {
      if (!name.trim() || !phone.trim() || !issueDescription.trim()) {
        toast.error('Please fill in your name, phone number, and problem details to post inquiry.')
        return
      }
    }

    // For WhatsApp or Call, if phone or name is missing, use fallbacks or prompt
    const finalName = name.trim() || 'Valued Customer'
    const finalPhone = phone.trim() || 'N/A'
    const finalIssue = issueDescription.trim() || 'Technician inspection & visiting fee inquiry'

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
        console.warn('Inquiry record creation warning:', err)
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
      if (inquiry) setSubmittedInquiry(inquiry)
    } else if (type === 'call') {
      const supportPhone = import.meta.env.VITE_SUPPORT_PHONE || '1800-123-4567'
      const cleanSupport = supportPhone.replace(/[^0-9+]/g, '')
      window.location.href = `tel:${cleanSupport}`
    } else {
      if (inquiry) setSubmittedInquiry(inquiry)
      toast.success(`Inquiry posted successfully!`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f0f0f] py-8 px-4 sm:px-6 lg:px-8 text-left transition-colors">
      <SEO
        title="Custom Doorstep Service Inquiry & Photo Upload - OZO"
        description="Need a custom repair, pipe leakage estimate, or AC diagnosis? Upload photo & request technician visit at doorstep."
      />

      <div className="max-w-3xl mx-auto">
        {/* Back Navigation Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back to Doorstep Services</span>
        </button>

        {/* Page Header with Embedded Doorstep Inspection Fee */}
        <div className="bg-gradient-to-r from-gray-900 via-sky-950 to-gray-900 text-white p-6 sm:p-7 rounded-3xl shadow-xl mb-6 border border-white/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 -translate-y-10 translate-x-10 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3">
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-sky-400 bg-sky-500/15 border border-sky-500/30 px-3 py-1 rounded-full">
              Doorstep Inspection
            </span>

            {/* Embedded Inspection Fee Badge */}
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/15 px-3 py-1 rounded-xl shadow-inner">
              <ShieldCheck size={15} className="text-sky-400 shrink-0" />
              <span className="text-xs font-bold text-gray-200">
                Fee ({city || 'City'}):
              </span>
              <span className="text-xs font-black text-sky-400 bg-sky-500/20 px-2 py-0.5 rounded-md border border-sky-400/30">
                ₹{currentVisitingFee}
              </span>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black mt-1">
            Custom Service Inquiry
          </h1>
          <p className="text-xs sm:text-sm text-gray-300 mt-1.5 font-medium max-w-xl leading-relaxed">
            Upload fault photo or describe your issue for expert technician doorstep diagnosis.
          </p>

          {/* Embedded Fee Waiver Note */}
          <div className="mt-3.5 pt-2.5 border-t border-white/10 flex items-center gap-2 text-xs font-bold text-emerald-400">
            <CheckCircle2 size={14} className="shrink-0" />
            <span>✓ ₹{currentVisitingFee} inspection fee is 100% adjusted in final bill upon service completion.</span>
          </div>
        </div>

        {submittedInquiry ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-[#1a1a1a] rounded-3xl p-6 sm:p-10 border border-gray-200 dark:border-white/10 shadow-xl text-center space-y-6 max-w-2xl mx-auto"
          >
            {/* Success Icon */}
            <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30 shadow-inner">
              <CheckCircle2 size={44} className="animate-pulse" />
            </div>

            <div>
              <span className="text-xs font-black uppercase text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                Inquiry Posted Successfully
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mt-3">
                Inquiry #{submittedInquiry.inquiry_number}
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium mt-1">
                Our doorstep dispatch manager has received your inquiry. Expert technician will contact you within 15-30 minutes for visit confirmation!
              </p>
            </div>

            {/* Inquiry Summary Box */}
            <div className="p-5 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10 text-left space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2.5 border-b border-gray-200 dark:border-white/10">
                <span className="font-extrabold text-gray-500">Service Requirement:</span>
                <span className="font-black text-gray-900 dark:text-white">{submittedInquiry.category_name}</span>
              </div>

              <div className="flex items-center justify-between pb-2.5 border-b border-gray-200 dark:border-white/10">
                <span className="font-extrabold text-gray-500">Inspection Fee ({submittedInquiry.city}):</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">₹{submittedInquiry.visiting_fee} (Adjusted in bill)</span>
              </div>

              <div className="pb-2.5 border-b border-gray-200 dark:border-white/10">
                <span className="font-extrabold text-gray-500 block mb-1">Customer & Address:</span>
                <span className="font-bold text-gray-900 dark:text-white">{submittedInquiry.name} ({submittedInquiry.phone}) - {submittedInquiry.address || submittedInquiry.city}</span>
              </div>

              <div>
                <span className="font-extrabold text-gray-500 block mb-1">Issue Details:</span>
                <p className="text-gray-800 dark:text-gray-200 font-medium leading-relaxed bg-white dark:bg-[#121212] p-3 rounded-xl border border-gray-200 dark:border-white/10">
                  "{submittedInquiry.issue_description}"
                </p>
              </div>

              {submittedInquiry.image_url && (
                <div className="pt-2 flex items-center gap-3">
                  <img src={submittedInquiry.image_url} alt="Attached issue photo" className="w-16 h-16 rounded-xl object-cover border border-sky-500/30" />
                  <span className="text-xs font-bold text-sky-500 flex items-center gap-1">
                    <Camera size={14} /> Photo Attached
                  </span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate('/services/my-bookings')}
                className="w-full py-3.5 px-4 bg-sky-500 hover:bg-sky-600 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <Calendar size={16} />
                <span>View in My Bookings</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSubmittedInquiry(null)
                  setIssueDescription('')
                  setSelectedFile(null)
                  setImagePreview(null)
                }}
                className="w-full py-3.5 px-4 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-800 dark:text-white font-extrabold text-xs sm:text-sm rounded-2xl transition-all flex items-center justify-center gap-2"
              >
                <Plus size={16} />
                <span>Post Another Requirement</span>
              </button>
            </div>
          </motion.div>
        ) : (
          <>
            {/* 3 Quick Action Mode Selector Cards */}
            <div className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Option 1: Post Inquiry */}
              <button
                type="button"
                onClick={() => handleOptionSelect('post')}
                className={`p-4 rounded-3xl border transition-all text-left flex items-start gap-3.5 shadow-sm cursor-pointer ${
                  selectedOption === 'post'
                    ? 'bg-sky-500/10 border-sky-500 ring-2 ring-sky-500/30 text-sky-600 dark:text-sky-400'
                    : 'bg-white dark:bg-[#1a1a1a] border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:border-sky-500/40'
                }`}
              >
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                  selectedOption === 'post' ? 'bg-sky-500 text-white shadow-md' : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400'
                }`}>
                  <Send size={18} />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider block text-sky-500">Option 1</span>
                  <h4 className="text-sm font-extrabold text-gray-900 dark:text-white mt-0.5">Post Inquiry</h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium mt-0.5 leading-snug">
                    Fill form & upload fault photo
                  </p>
                </div>
              </button>

              {/* Option 2: WhatsApp Chat */}
              <button
                type="button"
                onClick={() => handleOptionSelect('whatsapp')}
                className={`p-4 rounded-3xl border transition-all text-left flex items-start gap-3.5 shadow-sm cursor-pointer ${
                  selectedOption === 'whatsapp'
                    ? 'bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                    : 'bg-white dark:bg-[#1a1a1a] border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:border-emerald-500/40'
                }`}
              >
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                  selectedOption === 'whatsapp' ? 'bg-emerald-500 text-white shadow-md' : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400'
                }`}>
                  <MessageSquare size={18} />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider block text-emerald-500">Option 2</span>
                  <h4 className="text-sm font-extrabold text-gray-900 dark:text-white mt-0.5">WhatsApp Chat</h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium mt-0.5 leading-snug">
                    Instant chat with technician
                  </p>
                </div>
              </button>

              {/* Option 3: Direct Call */}
              <button
                type="button"
                onClick={() => handleOptionSelect('call')}
                className={`p-4 rounded-3xl border transition-all text-left flex items-start gap-3.5 shadow-sm cursor-pointer ${
                  selectedOption === 'call'
                    ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/30 text-amber-600 dark:text-amber-400'
                    : 'bg-white dark:bg-[#1a1a1a] border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:border-amber-500/40'
                }`}
              >
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                  selectedOption === 'call' ? 'bg-amber-500 text-white shadow-md' : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400'
                }`}>
                  <Phone size={18} />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider block text-amber-500">Option 3</span>
                  <h4 className="text-sm font-extrabold text-gray-900 dark:text-white mt-0.5">Direct Call</h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium mt-0.5 leading-snug">
                    Call helpline directly
                  </p>
                </div>
              </button>
            </div>

            {/* Selected Option Content Container with Auto-Scroll Ref */}
            <div ref={optionPanelRef} className="scroll-mt-6">
              {selectedOption === null && (
                <div className="bg-sky-500/5 dark:bg-white/5 border border-dashed border-sky-500/30 rounded-3xl p-8 sm:p-10 text-center space-y-2">
                  <div className="w-12 h-12 bg-sky-500/10 text-sky-500 rounded-2xl flex items-center justify-center mx-auto border border-sky-500/20">
                    <Sparkles size={24} className="animate-pulse" />
                  </div>
                  <h3 className="text-sm sm:text-base font-extrabold text-gray-900 dark:text-white">
                    Select an Option Above to Proceed
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    Tap Option 1 (Post Inquiry), Option 2 (WhatsApp Chat), or Option 3 (Direct Call)
                  </p>
                </div>
              )}

              {selectedOption === 'call' && (
                <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl p-6 sm:p-10 border border-amber-500/30 shadow-xl text-center space-y-6">
                  <div className="w-20 h-20 bg-amber-500/10 text-amber-500 rounded-3xl flex items-center justify-center mx-auto border border-amber-500/20 shadow-inner">
                    <Phone size={36} className="animate-bounce" />
                  </div>

                  <div>
                    <span className="text-xs font-black uppercase text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                      Direct Doorstep Dispatch Helpline
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mt-3">
                      Call OZO Technician Desk Now
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium mt-2 max-w-md mx-auto leading-relaxed">
                      No form fill required! Speak directly with our dispatch manager for instant technician allocation in <strong className="text-amber-500 font-bold">{city}</strong>.
                    </p>
                  </div>

                  {/* Helpline Box */}
                  <div className="p-4 bg-amber-500/5 dark:bg-amber-500/10 rounded-2xl border border-amber-500/20 flex flex-col sm:flex-row items-center justify-between gap-4 max-w-md mx-auto text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
                        <Phone size={20} />
                      </div>
                      <div>
                        <span className="text-[10px] font-extrabold uppercase text-amber-500 tracking-wider">Support Hotline</span>
                        <h4 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">1800-123-4567</h4>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                      ● Active Now
                    </span>
                  </div>

                  {/* Direct Call Button */}
                  <button
                    type="button"
                    onClick={(e) => handleSubmit(e, 'call')}
                    className="w-full max-w-md mx-auto py-4 px-6 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-black text-sm rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Phone size={20} />
                    <span>Call +91 1800-123-4567 Directly</span>
                  </button>
                </div>
              )}

              {(selectedOption === 'post' || selectedOption === 'whatsapp') && (
                /* Main Inquiry Form for Post & WhatsApp */
              <form onSubmit={(e) => handleSubmit(e, selectedOption)} className="bg-white dark:bg-[#1a1a1a] rounded-3xl p-6 sm:p-8 border border-gray-200 dark:border-white/10 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/10 pb-4">
                  <h3 className="text-lg font-black text-gray-900 dark:text-white">
                    Provide Contact & Issue Details
                  </h3>
                  <span className={`text-xs font-black uppercase px-3 py-1 rounded-full border ${
                    selectedOption === 'post' ? 'bg-sky-500/10 border-sky-500/30 text-sky-500' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                  }`}>
                    Selected: {selectedOption === 'post' ? 'Option 1 (Post Inquiry)' : 'Option 2 (WhatsApp Chat)'}
                  </span>
                </div>

                {/* Contact Person Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-extrabold text-gray-700 dark:text-gray-300 mb-1.5">
                      Your Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-gray-700 dark:text-gray-300 mb-1.5">
                      Mobile / WhatsApp Number *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>

                {/* City & Address Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-extrabold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center justify-between">
                      <span>Select City</span>
                      <span className="text-[10px] text-emerald-500 font-bold">✓ Serviceable</span>
                    </label>
                    <div className="relative">
                      <select
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full pl-4 pr-10 py-3.5 bg-gray-50 dark:bg-[#141824] border border-gray-200 dark:border-white/10 rounded-2xl text-xs sm:text-sm font-extrabold text-gray-900 dark:text-white appearance-none cursor-pointer focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all shadow-sm dark:[color-scheme:dark]"
                      >
                        {serviceableCities.map((c) => (
                          <option key={c.name} value={c.name} className="bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white py-2 font-bold">
                            {c.name} (₹{c.fee})
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-extrabold text-gray-700 dark:text-gray-300 mb-1.5">
                      Doorstep Visit Address
                    </label>
                    <input
                      type="text"
                      placeholder="House/Flat No, Street, Landmark"
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      className="w-full px-4 py-3.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all shadow-sm"
                    />
                  </div>
                </div>

                {/* Quick Category Chips Selection */}
                <div>
                  <label className="block text-xs font-extrabold text-gray-700 dark:text-gray-300 mb-2 flex items-center justify-between">
                    <span>Quick Choose Category</span>
                    <span className="text-[10px] text-sky-500 font-bold">Tap to select topic</span>
                  </label>
                  <div className="flex flex-wrap gap-2 mb-3">
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
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                            isSelected
                              ? 'bg-sky-500 text-white border-sky-500 shadow-md scale-105'
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

                {/* Service Category Selection Dropdown */}
                <div>
                  <label className="block text-xs font-extrabold text-gray-700 dark:text-gray-300 mb-1.5">
                    Full Category Dropdown
                  </label>
                  <div className="relative">
                    <select
                      value={categoryName}
                      onChange={(e) => setCategoryName(e.target.value)}
                      className="w-full pl-4 pr-10 py-3.5 bg-gray-50 dark:bg-[#141824] border border-gray-200 dark:border-white/10 rounded-2xl text-xs sm:text-sm font-bold text-gray-900 dark:text-white appearance-none cursor-pointer focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all shadow-sm dark:[color-scheme:dark]"
                    >
                      <option value="General Inquiry" className="bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white py-2 font-bold">
                        General Inquiry / Custom Issue
                      </option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.title} className="bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white py-2 font-bold">
                          {c.title}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Issue Description */}
                <div>
                  <label className="block text-xs font-extrabold text-gray-700 dark:text-gray-300 mb-1.5">
                    Problem Description / Specific Requirement
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Describe your issue in detail (e.g., Water leaking from wall joint in bathroom, need new switchboard wiring, or multi-room wall painting estimate)..."
                    value={issueDescription}
                    onChange={(e) => setIssueDescription(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                {/* Live WhatsApp Short Message Preview */}
                {selectedOption === 'whatsapp' && (
                  <div className="p-4 bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                        <MessageSquare size={14} /> Live WhatsApp Short Message Preview
                      </span>
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-white dark:bg-black/40 px-2 py-0.5 rounded-full border border-emerald-500/30">
                        OZO Official WhatsApp (+91 98765 43210)
                      </span>
                    </div>

                    <div className="p-3.5 bg-white dark:bg-[#121212] rounded-xl border border-emerald-500/20 text-xs font-medium text-gray-800 dark:text-gray-200 leading-relaxed font-sans shadow-inner">
                      👋 <strong>*Hi OZO Doorstep Services!*</strong><br />
                      --------------------------------<br />
                      🔧 <strong>*Category:*</strong> {categoryName || 'General Service'}<br />
                      🏙️ <strong>*City:*</strong> {city}<br />
                      📍 <strong>*Address:*</strong> {customerAddress || 'Will share location on chat'}<br />
                      {name.trim() && <>👤 <strong>*Name:*</strong> {name.trim()}<br /></>}
                      {phone.trim() && <>📞 <strong>*Phone:*</strong> {phone.trim()}<br /></>}
                      📝 <strong>*Requirement:*</strong> {issueDescription.trim() || 'Doorstep diagnostic & quotation needed'}<br />
                      💰 <strong>*Visiting Fee:*</strong> ₹{currentVisitingFee}<br />
                      --------------------------------<br />
                      Please connect me with available expert technician!
                    </div>
                  </div>
                )}

                {/* Image Upload Box */}
                <div>
                  <label className="block text-xs font-extrabold text-gray-700 dark:text-gray-300 mb-1.5">
                    Upload Photo of Fault / Area (Optional)
                  </label>

                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <label className="w-full sm:flex-1 cursor-pointer flex items-center justify-center gap-3 p-4 bg-gray-50 dark:bg-white/5 hover:bg-sky-500/10 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-2xl text-xs font-extrabold text-gray-700 dark:text-gray-300 transition-all group">
                      <Camera size={20} className="text-sky-500 group-hover:scale-110 transition-transform" />
                      <span>{selectedFile ? selectedFile.name : 'Click to Upload Photo or Capture Image'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>

                    {imagePreview && (
                      <div className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-sky-500 shadow-md shrink-0">
                        <img src={imagePreview} alt="Uploaded preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFile(null)
                            setImagePreview(null)
                          }}
                          className="absolute top-1 right-1 bg-black/70 text-white p-1 rounded-full hover:bg-black transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Single Action Button Matching Selected Option */}
                <div className="pt-4 border-t border-gray-100 dark:border-white/10">
                  {selectedOption === 'post' && (
                    <button
                      type="button"
                      onClick={(e) => handleSubmit(e, 'post')}
                      disabled={isSubmitting}
                      className="w-full py-4 px-6 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-xl transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <>
                          <Send size={18} />
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
                      className="w-full py-4 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-xl transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <>
                          <MessageSquare size={18} />
                          <span>Open WhatsApp Chat with OZO</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </form>
            )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
