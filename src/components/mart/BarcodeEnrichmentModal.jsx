import React, { useState, useEffect, useRef } from 'react'
import { 
  Camera, 
  X, 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  RotateCcw, 
  Sparkles,
  Smartphone,
  QrCode,
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  Check,
  RefreshCw,
  Clock,
  Info,
  Tag,
  Package,
  Layers,
  Search
} from 'lucide-react'
import QRCode from 'react-qr-code'
import { uploadCatalogImage } from '../../lib/supabase'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const WEBCAM_STEPS = [
  {
    title: '1. Front View',
    desc: 'Show product front side with brand name & main logo clearly visible.',
    key: 'front'
  },
  {
    title: '2. Back View',
    desc: 'Show back label containing details, ingredients, or instruction text.',
    key: 'back'
  },
  {
    title: '3. MRP & Barcode',
    desc: 'Show barcode block, price print, and batch manufacturing details.',
    key: 'barcode'
  }
]

export default function BarcodeEnrichmentModal({ barcode, product, onClose, onComplete }) {
  // Wizard Step: 1 = Product Info Form, 2 = Photo Capture Flow
  const [step, setStep] = useState(1)

  // Step 1 Form States
  const [editedProduct, setEditedProduct] = useState({
    name: product?.name || '',
    category_id: product?.category_id || '',
    brand: product?.brand || '',
    unit: product?.unit || '1 unit',
    price: product?.price || '',
    mrp: product?.mrp || '',
    stock_quantity: product?.stock_quantity !== undefined ? product?.stock_quantity : ''
  })
  
  const [categoriesList, setCategoriesList] = useState([])
  const [loadingCategories, setLoadingCategories] = useState(false)
  const [savingInfo, setSavingInfo] = useState(false)

  // Searchable Category Dropdown States
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [categorySearchQuery, setCategorySearchQuery] = useState('')
  const dropdownRef = useRef(null)

  // Step 2 Capture Mode states: 'select' | 'webcam' | 'phone_qr'
  const [mode, setMode] = useState('select')
  
  // State for Webcam Capture
  const [webcamPhotos, setWebcamPhotos] = useState([null, null, null])
  const [webcamStep, setWebcamStep] = useState(0)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState(null)
  const [webcamUploading, setWebcamUploading] = useState(false)
  const [webcamProgress, setWebcamProgress] = useState('')

  // State for Phone Capture
  const [sessionId, setSessionId] = useState(null)
  const [sessionStatus, setSessionStatus] = useState('waiting') // waiting | uploading | completed | expired
  const [phonePhotos, setPhonePhotos] = useState([])
  const [qrUrl, setQrUrl] = useState('')
  const [timeLeft, setTimeLeft] = useState(300) // 5 minutes in seconds
  const [creatingSession, setCreatingSession] = useState(false)

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const sessionSubscriptionRef = useRef(null)

  const selectedCategoryName = categoriesList.find(cat => cat.id === editedProduct.category_id)?.name || ''
  const filteredCategories = categoriesList.filter(cat =>
    cat.name.toLowerCase().includes(categorySearchQuery.toLowerCase())
  )

  // ==========================================
  // FETCH CATEGORIES
  // ==========================================
  useEffect(() => {
    async function loadCategories() {
      try {
        setLoadingCategories(true)
        const { data, error } = await supabase
          .from('categories')
          .select('id, name')
          .order('name')
        if (error) throw error
        if (data) {
          setCategoriesList(data)
          // Prefill category if empty
          if (!editedProduct.category_id && data.length > 0) {
            setEditedProduct(prev => ({ ...prev, category_id: data[0].id }))
          }
        }
      } catch (err) {
        console.error('Failed to load categories:', err)
      } finally {
        setLoadingCategories(false)
      }
    }
    loadCategories()
  }, [])

  // Handle click outside searchable category dropdown to close it
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ==========================================
  // SAVE FORM INFO & PROCEED TO PHOTO STEP
  // ==========================================
  const handleNextToPhoto = async () => {
    if (!editedProduct.name.trim()) {
      toast.error('Product Name is required')
      return
    }
    if (!editedProduct.category_id) {
      toast.error('Category is required')
      return
    }
    if (!editedProduct.price || parseFloat(editedProduct.price) <= 0) {
      toast.error('Valid Price is required')
      return
    }

    try {
      setSavingInfo(true)
      
      const baseSlug = editedProduct.name.toLowerCase().trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '')
      const fallbackSlug = `${baseSlug}-${Date.now()}`

      const payload = {
        name: editedProduct.name.trim(),
        slug: product?.slug || fallbackSlug,
        category_id: editedProduct.category_id,
        brand: editedProduct.brand.trim() || null,
        unit: editedProduct.unit.trim() || '1 unit',
        price: parseFloat(editedProduct.price) || 0,
        mrp: parseFloat(editedProduct.mrp) || parseFloat(editedProduct.price) || 0,
        barcode: barcode || product?.barcode || null,
        is_available: true,
        enrichment_status: product?.image_url ? 'merchant_upload' : 'pending_photo',
        enrichment_source: product?.image_url ? 'merchant_upload' : 'placeholder'
      }

      if (product?.id) {
        const { error } = await supabase
          .from('products')
          .update(payload)
          .eq('id', product.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('products')
          .upsert(payload, { onConflict: 'barcode' })
        if (error) throw error
      }

      if (error) throw error

      // Proceed to Step 2 (Photo Mode Selection Screen)
      setStep(2)
      setMode('select')
    } catch (err) {
      console.error('Error saving product info:', err)
      toast.error('Failed to save product details: ' + err.message)
    } finally {
      setSavingInfo(false)
    }
  }

  // ==========================================
  // WEBCAM CAPTURE LOGIC
  // ==========================================
  
  const startCamera = async () => {
    setCameraError(null)
    try {
      if (streamRef.current) {
        stopCamera()
      }
      let stream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false
        })
      } catch (firstErr) {
        console.warn('Failed with environment constraint, trying default video...', firstErr)
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        })
      }
      streamRef.current = stream
      setIsCameraActive(true)
    } catch (err) {
      console.error('Webcam access error:', err)
      setCameraError('Camera access denied or unavailable. Please use the QR code phone capture option or upload files.')
      setIsCameraActive(false)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setIsCameraActive(false)
  }

  // Synchronize stream to video element when active
  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(err => {
        console.error('Error playing camera video stream:', err)
      })
    }
  }, [isCameraActive])

  useEffect(() => {
    if (mode === 'webcam') {
      startCamera()
    } else {
      stopCamera()
    }
    return () => stopCamera()
  }, [mode, webcamStep])

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)

    const newPhotos = [...webcamPhotos]
    newPhotos[webcamStep] = dataUrl
    setWebcamPhotos(newPhotos)
    stopCamera()
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target.result
      const newPhotos = [...webcamPhotos]
      newPhotos[webcamStep] = dataUrl
      setWebcamPhotos(newPhotos)
      stopCamera()
    }
    reader.readAsDataURL(file)
  }

  const retakePhoto = () => {
    const newPhotos = [...webcamPhotos]
    newPhotos[webcamStep] = null
    setWebcamPhotos(newPhotos)
    startCamera()
  }

  const handleWebcamNext = () => {
    if (webcamStep < 2) {
      setWebcamStep(webcamStep + 1)
    }
  }

  const handleWebcamPrev = () => {
    if (webcamStep > 0) {
      setWebcamStep(webcamStep - 1)
    }
  }

  const handleWebcamSave = async () => {
    setWebcamUploading(true)
    const uploadedUrls = []
    
    try {
      for (let i = 0; i < 3; i++) {
        const photoDataUrl = webcamPhotos[i]
        if (!photoDataUrl) continue

        setWebcamProgress(`Uploading photo ${i + 1} of 3...`)

        const res = await fetch(photoDataUrl)
        const blob = await res.blob()
        const fileIdentifier = barcode || product?.id || 'nobarcode'
        const file = new File([blob], `${fileIdentifier}_${i}.jpg`, { type: 'image/jpeg' })

        const uploadRes = await uploadCatalogImage(file, fileIdentifier, i)
        
        if (uploadRes.error) {
          throw new Error(uploadRes.error.message || uploadRes.error)
        }
        uploadedUrls.push(uploadRes.url)
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Operator authentication session lost.')

      const { data: operatorMart, error: martErr } = await supabase
        .from('marts')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle()

      if (martErr) throw martErr

      setWebcamProgress('Saving catalog image references...')

      const matchQuery = product?.id ? { id: product.id } : { barcode: barcode }

      // Save all updated details + images to pending verification columns
      const { data: updatedProduct, error: dbError } = await supabase
        .from('products')
        .update({
          verification_status: 'pending',
          pending_name: editedProduct.name.trim(),
          pending_brand: editedProduct.brand.trim() || null,
          pending_images: uploadedUrls,
          enriched_by_mart_id: operatorMart?.id || null,
          category_id: editedProduct.category_id,
          unit: editedProduct.unit.trim() || '1 unit',
          price: parseFloat(editedProduct.price) || 0,
          mrp: parseFloat(editedProduct.mrp) || parseFloat(editedProduct.price) || 0,
          enrichment_status: 'merchant_upload',
          enrichment_source: 'merchant_webcam'
        })
        .match(matchQuery)
        .select()
        .single()

      if (dbError) throw dbError

      toast.success('Product catalog enriched successfully via Webcam!')
      if (onComplete) {
        onComplete({
          ...updatedProduct,
          stock_quantity: parseInt(editedProduct.stock_quantity) || 0
        })
      }
    } catch (err) {
      console.error('Webcam enrichment upload error:', err)
      toast.error(`Enrichment failed: ${err.message || 'Unknown error'}`)
    } finally {
      setWebcamUploading(false)
      setWebcamProgress('')
    }
  }

  // ==========================================
  // PHONE QR CAPTURE LOGIC
  // ==========================================
  
  const startPhoneCaptureSession = async () => {
    try {
      setCreatingSession(true)
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Operator authentication session lost.')

      const { data: operatorMart, error: martErr } = await supabase
        .from('marts')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle()

      if (martErr) throw martErr
      if (!operatorMart) {
        throw new Error('No associated mart found for your operator account.')
      }

      // Create capture session row in DB
      const { data: sessionData, error: sessionErr } = await supabase
        .from('capture_sessions')
        .insert({
          barcode: barcode,
          mart_id: operatorMart.id,
          status: 'waiting'
        })
        .select()
        .single()

      if (sessionErr) throw sessionErr
      
      const newSessionId = sessionData.session_id
      setSessionId(newSessionId)
      
      const appUrl = window.location.origin
      const captureUrl = `${appUrl}/capture/${newSessionId}`
      setQrUrl(captureUrl)
      setMode('phone_qr')

      // Listen to database Realtime updates for this session
      subscribeToSessionUpdates(newSessionId)

    } catch (err) {
      console.error('Failed to create capture session:', err)
      toast.error(`Session creation failed: ${err.message || 'Unknown error'}`)
    } finally {
      setCreatingSession(false)
    }
  }

  const subscribeToSessionUpdates = (sessId) => {
    if (sessionSubscriptionRef.current) {
      supabase.removeChannel(sessionSubscriptionRef.current)
    }

    const channel = supabase
      .channel(`session-${sessId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'capture_sessions',
          filter: `session_id=eq.${sessId}`
        },
        async (payload) => {
          console.log('[Realtime] Capture session update received:', payload)
          const newStatus = payload.new.status
          const photos = payload.new.photos

          setSessionStatus(newStatus)
          if (photos) {
            setPhonePhotos(photos)
          }

          if (newStatus === 'completed' && photos && photos.length > 0) {
            try {
              const primaryUrl = photos[0]
              
              // Save details + images to pending verification columns
              const { data: updatedProduct, error: dbError } = await supabase
                .from('products')
                .update({
                  verification_status: 'pending',
                  pending_name: editedProduct.name.trim(),
                  pending_brand: editedProduct.brand.trim() || null,
                  pending_images: photos,
                  enriched_by_mart_id: operatorMart.id,
                  category_id: editedProduct.category_id,
                  unit: editedProduct.unit.trim() || '1 unit',
                  price: parseFloat(editedProduct.price) || 0,
                  mrp: parseFloat(editedProduct.mrp) || parseFloat(editedProduct.price) || 0,
                  enrichment_status: 'merchant_upload',
                  enrichment_source: 'merchant_phone'
                })
                .eq('barcode', barcode)
                .select()
                .single()

              if (dbError) throw dbError

              try {
                const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav')
                audio.play()
              } catch (_) {}

              toast.success('Product catalog enriched successfully via Phone!')
              
              if (onComplete) {
                onComplete({
                  ...updatedProduct,
                  stock_quantity: parseInt(editedProduct.stock_quantity) || 0
                })
              }
            } catch (saveErr) {
              console.error('Error saving product on realtime completion:', saveErr)
              toast.error('Realtime save failed: ' + saveErr.message)
            }
          }
        }
      )
      .subscribe()

    sessionSubscriptionRef.current = channel
  }

  // Timer Countdown for Session Expiry
  useEffect(() => {
    if (mode !== 'phone_qr' || timeLeft <= 0) return

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          setSessionStatus('expired')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [mode, timeLeft])

  useEffect(() => {
    return () => {
      if (sessionSubscriptionRef.current) {
        supabase.removeChannel(sessionSubscriptionRef.current)
      }
    }
  }, [])

  const formatTime = (sec) => {
    const mins = Math.floor(sec / 60)
    const secs = sec % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#070709]/85 backdrop-blur-md p-4 animate-fadeIn">
      {/* Hidden canvas for capturing */}
      <canvas ref={canvasRef} className="hidden" />

      <div className="relative w-full max-w-lg bg-[#0d0d12] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl transition-all duration-300">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-900 bg-slate-950/50">
          <div className="flex items-center gap-3">
            {step === 2 && (
              <button 
                onClick={() => {
                  if (mode !== 'select') {
                    stopCamera()
                    setMode('select')
                  } else {
                    setStep(1)
                  }
                }}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <h3 className="font-bold text-white text-base">
                {step === 1 && 'Step 1: Product Details'}
                {step === 2 && mode === 'select' && 'Step 2: Select Photo Method'}
                {step === 2 && mode === 'webcam' && 'Webcam Photo Capture'}
                {step === 2 && mode === 'phone_qr' && 'Phone Camera QR Sync'}
              </h3>
              <p className="text-xs text-gray-500 truncate max-w-[280px]">
                {editedProduct.name || `Barcode: ${barcode}`}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-850 text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* ==========================================
            STEP 1: PRODUCT INFO DETAILS FORM
           ========================================== */}
        {step === 1 && (
          <div className="p-6 space-y-5">
            <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 flex gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-0.5">master catalog registration</h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Provide catalog details, pricing, and category mapping. This information will be saved directly to the Master Catalog.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Product Name */}
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">Product Name *</label>
                <input
                  type="text"
                  value={editedProduct.name}
                  onChange={(e) => setEditedProduct({ ...editedProduct, name: e.target.value })}
                  className="w-full bg-[#12121a] border border-slate-800 focus:border-indigo-500/50 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all font-medium"
                  placeholder="e.g. Coca Cola 2.25 L"
                  required
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">Category *</label>
                {loadingCategories ? (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                    Loading categories...
                  </div>
                ) : (
                  <div className="relative" ref={dropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="w-full bg-[#12121a] border border-slate-800 focus:border-indigo-500/50 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all flex items-center justify-between cursor-pointer font-medium text-left"
                    >
                      <span className={selectedCategoryName ? "text-white" : "text-gray-500"}>
                        {selectedCategoryName || "Select Category"}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1.5 bg-[#12121a] border border-slate-800 rounded-xl shadow-2xl p-2 space-y-2 max-h-60 overflow-hidden flex flex-col animate-fade-in">
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Search category..."
                            value={categorySearchQuery}
                            onChange={(e) => setCategorySearchQuery(e.target.value)}
                            className="w-full bg-[#08080c] border border-slate-800/80 focus:border-indigo-500/30 rounded-lg pl-8 pr-8 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/10"
                            autoFocus
                          />
                          <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          {categorySearchQuery && (
                            <button
                              type="button"
                              onClick={() => setCategorySearchQuery("")}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        <div className="overflow-y-auto max-h-40 space-y-0.5 pr-1 no-scrollbar">
                          {filteredCategories.length === 0 ? (
                            <div className="text-gray-500 text-xs py-3 text-center">No categories found</div>
                          ) : (
                            filteredCategories.map((cat) => (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() => {
                                  setEditedProduct({ ...editedProduct, category_id: cat.id })
                                  setIsDropdownOpen(false)
                                  setCategorySearchQuery("")
                                }}
                                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all duration-150 flex items-center justify-between ${
                                  editedProduct.category_id === cat.id
                                    ? 'bg-indigo-600 text-white font-bold'
                                    : 'text-gray-300 hover:bg-slate-900/60 hover:text-white'
                                }`}
                              >
                                <span>{cat.name}</span>
                                {editedProduct.category_id === cat.id && <Check className="w-3.5 h-3.5 text-white" />}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Brand & Unit (Side by Side) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">Brand Name</label>
                  <input
                    type="text"
                    value={editedProduct.brand}
                    onChange={(e) => setEditedProduct({ ...editedProduct, brand: e.target.value })}
                    className="w-full bg-[#12121a] border border-slate-800 focus:border-indigo-500/50 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all font-medium"
                    placeholder="e.g. Coca-Cola"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">Product Unit</label>
                  <input
                    type="text"
                    value={editedProduct.unit}
                    onChange={(e) => setEditedProduct({ ...editedProduct, unit: e.target.value })}
                    className="w-full bg-[#12121a] border border-slate-800 focus:border-indigo-500/50 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all font-medium"
                    placeholder="e.g. 1 unit, 500g, 1L"
                  />
                </div>
              </div>

              {/* Price & MRP (Side by Side) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">Mart Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editedProduct.price}
                    onChange={(e) => setEditedProduct({ ...editedProduct, price: e.target.value })}
                    className="w-full bg-[#12121a] border border-slate-800 focus:border-indigo-500/50 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all font-medium"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">Mart MRP (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editedProduct.mrp}
                    onChange={(e) => setEditedProduct({ ...editedProduct, mrp: e.target.value })}
                    className="w-full bg-[#12121a] border border-slate-800 focus:border-indigo-500/50 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all font-medium"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              {/* Stock Quantity */}
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">Stock Quantity *</label>
                <input
                  type="number"
                  value={editedProduct.stock_quantity}
                  onChange={(e) => setEditedProduct({ ...editedProduct, stock_quantity: e.target.value })}
                  className="w-full bg-[#12121a] border border-slate-800 focus:border-indigo-500/50 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all font-medium"
                  placeholder="0"
                  required
                />
              </div>
            </div>

            {/* Step 1 Footer */}
            <div className="border-t border-slate-900 pt-4 flex justify-between items-center mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-800 bg-transparent hover:bg-slate-900 text-xs font-bold text-gray-400 hover:text-white rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleNextToPhoto}
                disabled={savingInfo}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-indigo-600/15 disabled:opacity-50"
              >
                {savingInfo ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Saving Details...
                  </>
                ) : (
                  <>
                    Next: Add Photos
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ==========================================
            STEP 2: OPTION CHOOSE METHOD SCREEN
           ========================================== */}
         {step === 2 && mode === 'select' && (
          <div className="p-6">
            <div className="mb-6 p-4 rounded-2xl bg-slate-900/40 border border-slate-850">
              <h4 className="text-xs font-black uppercase tracking-wider text-orange-400 mb-1">Photo Enrichment Required</h4>
              <p className="text-xs text-gray-450 leading-relaxed">
                This product has no catalog image. Capture or upload 3 view angles to activate it in the customer store.
              </p>
            </div>

            <div className="space-y-3">
              {/* Option A: Laptop Webcam */}
              <button
                onClick={() => setMode('webcam')}
                className="w-full p-4 bg-[#12121e]/40 hover:bg-[#12121e]/85 border border-slate-850 hover:border-slate-700 rounded-2xl transition-all duration-200 active:scale-[0.99] cursor-pointer text-left flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform duration-200 shrink-0">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-white text-sm">Use Laptop Webcam</h5>
                    <p className="text-xs text-gray-500 mt-0.5">Take photos instantly using your laptop's built-in webcam</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
              </button>

              {/* Option B: Mobile via QR */}
              <button
                onClick={startPhoneCaptureSession}
                disabled={creatingSession}
                className="w-full p-4 bg-[#12121e]/40 hover:bg-[#12121e]/85 border border-slate-850 hover:border-slate-700 rounded-2xl transition-all duration-200 active:scale-[0.99] disabled:opacity-50 cursor-pointer text-left flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform duration-200 shrink-0">
                    {creatingSession ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Smartphone className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h5 className="font-bold text-white text-sm">
                      {creatingSession ? 'Creating sync session...' : 'Use Mobile Phone Camera'}
                    </h5>
                    <p className="text-xs text-gray-500 mt-0.5">Scan QR code to capture HD photos from your phone camera</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
              </button>
            </div>
          </div>
        )}

        {/* ==========================================
            STEP 2: WEBCAM CAPTURE SCREEN
           ========================================== */}
        {step === 2 && mode === 'webcam' && (
          <div className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-widest text-[#00FF66]">
                Step {webcamStep + 1} of 3: {WEBCAM_STEPS[webcamStep].title}
              </span>
              <span className="text-xs text-gray-500 font-bold">
                {barcode}
              </span>
            </div>
            <p className="text-xs text-gray-400 mb-4 bg-slate-900/50 p-3 rounded-xl border border-slate-850">
              {WEBCAM_STEPS[webcamStep].desc}
            </p>

            <div className="relative aspect-video bg-slate-950 border border-slate-850 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
              {!webcamPhotos[webcamStep] ? (
                isCameraActive ? (
                  <video 
                    ref={videoRef} 
                    className="w-full h-full object-cover" 
                    playsInline 
                    muted 
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-gray-500 p-4">
                    <Loader2 className="w-7 h-7 animate-spin text-emerald-500 mb-2" />
                    <p className="text-xs font-medium">Starting local camera stream...</p>
                  </div>
                )
              ) : (
                <img 
                  src={webcamPhotos[webcamStep]} 
                  alt="Captured" 
                  className="w-full h-full object-cover"
                />
              )}

              {cameraError && !webcamPhotos[webcamStep] && (
                <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center">
                  <AlertCircle className="w-8 h-8 text-amber-500 mb-2" />
                  <p className="text-xs text-gray-400 mb-4">{cameraError}</p>
                  <label className="bg-slate-850 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Select File
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileChange} 
                      className="hidden" 
                    />
                  </label>
                </div>
              )}

              {webcamUploading && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6">
                  <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-3" />
                  <p className="text-xs font-bold text-white">{webcamProgress}</p>
                </div>
              )}
            </div>

            {/* Bottom step preview slots */}
            <div className="grid grid-cols-3 gap-2 mt-4">
              {WEBCAM_STEPS.map((stepInfo, idx) => (
                <div 
                  key={stepInfo.key} 
                  className={`p-2 rounded-xl border text-center transition-all ${
                    webcamStep === idx 
                      ? 'bg-slate-900/60 border-emerald-500/50' 
                      : webcamPhotos[idx] 
                        ? 'bg-emerald-950/10 border-emerald-500/20 text-emerald-400' 
                        : 'bg-transparent border-slate-900 text-gray-600'
                  }`}
                >
                  <div className="text-[10px] font-black uppercase tracking-wider mb-0.5">
                    {stepInfo.key}
                  </div>
                  <div className="flex items-center justify-center h-4">
                    {webcamPhotos[idx] ? (
                      <Check className="w-3.5 h-3.5 text-emerald-450" />
                    ) : (
                      <div className={`w-1.5 h-1.5 rounded-full ${webcamStep === idx ? 'bg-emerald-500 animate-ping' : 'bg-slate-800'}`} />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between gap-4 mt-6">
              <button 
                type="button"
                onClick={handleWebcamPrev}
                disabled={webcamStep === 0}
                className="px-4 py-2.5 rounded-xl border border-slate-800 text-xs font-bold text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400 transition-all cursor-pointer"
              >
                Back
              </button>

              <div className="flex items-center gap-3">
                {!webcamPhotos[webcamStep] ? (
                  <>
                    <label className="bg-slate-900 hover:bg-slate-800 text-gray-300 text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-850 cursor-pointer flex items-center gap-2">
                      <Upload className="w-3.5 h-3.5" />
                      Upload
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleFileChange} 
                        className="hidden" 
                      />
                    </label>

                    <button
                      onClick={capturePhoto}
                      disabled={!isCameraActive}
                      className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 text-xs font-black px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all active:scale-[0.97] cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      Capture
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={retakePhoto}
                      className="bg-slate-900 hover:bg-slate-800 text-gray-355 text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-850 flex items-center gap-2 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Retake
                    </button>

                    {webcamStep === 2 ? (
                      <button
                        onClick={handleWebcamSave}
                        className="bg-gradient-to-r from-emerald-500 to-[#00FF66] text-slate-950 text-xs font-black px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-500/10 flex items-center gap-2 cursor-pointer"
                      >
                        Save Images
                      </button>
                    ) : (
                      <button
                        onClick={handleWebcamNext}
                        className="bg-emerald-505 hover:bg-emerald-500 text-slate-950 text-xs font-black px-5 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer"
                      >
                        Next Step
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            STEP 2: PHONE QR SCAN SCREEN
           ========================================== */}
        {step === 2 && mode === 'phone_qr' && (
          <div className="p-6 flex flex-col items-center">
            {/* Inline Scanner Line Animation Styles */}
            <style>{`
              @keyframes qr-scan-pulse {
                0%, 100% { top: 6%; opacity: 0.2; }
                50% { top: 94%; opacity: 1; }
              }
              .qr-scanner-line {
                animation: qr-scan-pulse 2.2s ease-in-out infinite;
              }
            `}</style>
            
            {/* Countdown / Session Status indicator */}
            <div className="w-full flex justify-between items-center mb-5 bg-amber-500/5 border border-amber-500/10 p-3 rounded-2xl">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-550" />
                <span className="text-xs font-bold text-amber-500/80">QR Session Expiry</span>
              </div>
              <span className="text-xs font-mono font-black text-amber-400 bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-500/15">
                {formatTime(timeLeft)}
              </span>
            </div>

            {/* QR Code Container */}
            {sessionStatus === 'expired' ? (
              <div className="p-6 bg-red-950/20 border border-red-500/20 text-center rounded-2xl mb-5 w-full">
                <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                <h4 className="font-bold text-sm text-red-400 mb-1">Session Expired</h4>
                <p className="text-xs text-gray-500 mb-4">The 5-minute capture window has closed.</p>
                <button
                  onClick={startPhoneCaptureSession}
                  className="bg-slate-900 hover:bg-slate-800 text-xs font-bold px-4 py-2 rounded-xl text-white transition-all cursor-pointer"
                >
                  Regenerate QR Code
                </button>
              </div>
            ) : (sessionStatus === 'joined' || sessionStatus === 'uploading') ? (
              <div className="w-full max-w-[280px] p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-3xl text-center mb-5 flex flex-col items-center justify-center space-y-4 min-h-[220px] shadow-[0_0_30px_rgba(16,185,129,0.08)]">
                <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 relative">
                  <span className="absolute inset-0 rounded-2xl bg-emerald-500/20 animate-ping opacity-75" />
                  <Smartphone className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">Phone Connected</h4>
                  <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                    Capture session is active. Take photos on your phone and watch them sync live.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-500/15 animate-pulse">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                  Live Syncing
                </div>
              </div>
            ) : (
              <div className="relative p-5 bg-white rounded-3xl shadow-[0_0_30px_rgba(99,102,241,0.15)] flex flex-col items-center justify-center max-w-[220px] mx-auto mb-5 border border-indigo-500/20 overflow-hidden">
                {/* Neon scan line */}
                <div className="absolute inset-x-4 h-0.5 bg-gradient-to-r from-transparent via-indigo-500 to-transparent shadow-[0_0_8px_#6366f1] qr-scanner-line pointer-events-none" />
                <QRCode 
                  value={qrUrl} 
                  size={180}
                  style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                  viewBox={`0 0 256 256`}
                />
              </div>
            )}

            {/* Instructions */}
            <div className="text-center max-w-sm mb-6">
              <h4 className="font-bold text-white text-sm mb-1">
                {(sessionStatus === 'joined' || sessionStatus === 'uploading') ? 'Live Catalog Capture' : 'Scan with Phone Camera'}
              </h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                {(sessionStatus === 'joined' || sessionStatus === 'uploading') 
                  ? 'Keep this window open. As you press capture on your phone, images appear here instantly.'
                  : 'Scan the QR code to open the HD capture portal on your phone. Stream will sync automatically.'}
              </p>
            </div>

            {/* Live Status indicator */}
            <div className="w-full border-t border-slate-900/60 pt-5 mt-2">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-gray-400 font-bold">Live Stream Status</span>
                <span className="text-xs flex items-center gap-1.5 font-bold">
                  {sessionStatus === 'waiting' && (
                    <span className="text-indigo-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-indigo-500 rounded-full animate-ping" />
                      Waiting for scan...
                    </span>
                  )}
                  {sessionStatus === 'joined' && (
                    <span className="text-emerald-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                      Phone Connected
                    </span>
                  )}
                  {sessionStatus === 'uploading' && (
                    <span className="text-amber-455 flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                      Syncing photos...
                    </span>
                  )}
                  {sessionStatus === 'completed' && (
                    <span className="text-emerald-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                      Perfect! Saving...
                    </span>
                  )}
                </span>
              </div>

              {/* Captured photos indicator */}
              <div className="grid grid-cols-3 gap-3">
                {[0, 1, 2].map((idx) => {
                  const hasPhoto = phonePhotos[idx]
                  const labels = ["Front View", "Back View", "Barcode Label"]
                  const icons = [
                    <Package className="w-4 h-4 text-indigo-400/40" />,
                    <Layers className="w-4 h-4 text-indigo-400/40" />,
                    <Tag className="w-4 h-4 text-indigo-400/40" />
                  ]
                  
                  return (
                    <div 
                      key={idx} 
                      className={`h-16 rounded-xl border flex flex-col items-center justify-center transition-all overflow-hidden relative ${
                        hasPhoto 
                          ? 'border-emerald-500/40 bg-emerald-950/10' 
                          : 'border-slate-800/80 bg-slate-950/20'
                      }`}
                    >
                      {hasPhoto ? (
                        <div className="relative w-full h-full animate-fade-in">
                          <img 
                            src={hasPhoto} 
                            alt={labels[idx]} 
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-1 right-1 bg-emerald-500 text-slate-950 p-0.5 rounded-full shadow-md">
                            <Check className="w-2.5 h-2.5 font-black" />
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          {icons[idx]}
                          <span className="text-[8px] font-black text-gray-500 uppercase tracking-wider">{labels[idx].split(' ')[0]}</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
            
          </div>
        )}

      </div>
    </div>
  )
}
