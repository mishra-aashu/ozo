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
  Image as ImageIcon
} from 'lucide-react'
import { uploadCatalogImage } from '../../lib/supabase'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const STEPS = [
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
  const [photos, setPhotos] = useState([null, null, null])
  const [activeStep, setActiveStep] = useState(0)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  // Start Camera
  const startCamera = async () => {
    setCameraError(null)
    try {
      if (streamRef.current) {
        stopCamera()
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      setIsCameraActive(true)
    } catch (err) {
      console.error('Camera access error:', err)
      setCameraError('Camera access denied or unavailable. You can upload files instead.')
      setIsCameraActive(false)
    }
  }

  // Stop Camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setIsCameraActive(false)
  }

  // Trigger camera on step changes or mount
  useEffect(() => {
    startCamera()
    return () => {
      stopCamera()
    }
  }, [activeStep])

  // Capture Image from Video Stream
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    // Set canvas dimensions to match video stream
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw the current video frame to the canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Convert canvas to base64 Data URL
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)

    // Update photos state
    const newPhotos = [...photos]
    newPhotos[activeStep] = dataUrl
    setPhotos(newPhotos)

    // Stop camera for current capture
    stopCamera()
  }

  // Handle Manual File Upload
  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target.result
      const newPhotos = [...photos]
      newPhotos[activeStep] = dataUrl
      setPhotos(newPhotos)
      stopCamera()
    }
    reader.readAsDataURL(file)
  }

  // Retake photo for current step
  const retakePhoto = () => {
    const newPhotos = [...photos]
    newPhotos[activeStep] = null
    setPhotos(newPhotos)
    startCamera()
  }

  // Proceed to next step or start uploading
  const handleNext = () => {
    if (activeStep < 2) {
      setActiveStep(activeStep + 1)
    }
  }

  // Go back to previous step
  const handlePrev = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1)
    }
  }

  // Upload captured photos to Supabase Storage & Free image hosting
  const handleUploadAndSave = async () => {
    setUploading(true)
    const uploadedUrls = []
    
    try {
      for (let i = 0; i < 3; i++) {
        const photoDataUrl = photos[i]
        if (!photoDataUrl) continue

        setUploadProgress(`Uploading photo ${i + 1} of 3...`)

        // Convert dataUrl to Blob & File
        const res = await fetch(photoDataUrl)
        const blob = await res.blob()
        const file = new File([blob], `${barcode}_${i}.jpg`, { type: 'image/jpeg' })

        // Upload using parallel uploader
        const uploadRes = await uploadCatalogImage(file, barcode, i)
        
        if (uploadRes.error) {
          throw new Error(`Upload failed for photo ${i + 1}: ${uploadRes.error.message || uploadRes.error}`)
        }
        
        // Push the resolved url
        uploadedUrls.push(uploadRes.url)
      }

      setUploadProgress('Saving to product catalog...')

      // Update database product entry
      const primaryUrl = uploadedUrls[0]
      const { error: dbError } = await supabase
        .from('products')
        .update({
          image_url: primaryUrl,
          images: uploadedUrls,
          enrichment_status: 'merchant_upload',
          enrichment_source: 'merchant_upload'
        })
        .eq('barcode', barcode)

      if (dbError) throw dbError

      toast.success('Product catalog enriched successfully!')
      if (onComplete) {
        onComplete({
          ...product,
          image_url: primaryUrl,
          images: uploadedUrls,
          enrichment_status: 'merchant_upload',
          enrichment_source: 'merchant_upload'
        })
      }
    } catch (err) {
      console.error('Enrichment upload error:', err)
      toast.error(`Enrichment failed: ${err.message || 'Unknown error'}`)
    } finally {
      setUploading(false)
      setUploadProgress('')
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
      {/* Hidden canvas for capturing */}
      <canvas ref={canvasRef} className="hidden" />

      <div className="relative w-full max-w-lg bg-white dark:bg-[#0c0c12] border border-gray-200 dark:border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Top Header */}
        <header className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#00FF66]/10 p-2.5 rounded-2xl text-[#00FF66] border border-[#00FF66]/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black uppercase tracking-wide text-gray-900 dark:text-white">Enrich Missing Catalog</h2>
              <p className="text-xs text-gray-400 font-bold">EAN / Barcode: {barcode}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            disabled={uploading}
            className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all cursor-pointer disabled:opacity-30"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Product Details Banner */}
        <div className="px-6 py-3 bg-gray-50 dark:bg-[#12121a] border-b border-gray-100 dark:border-white/5 flex items-center gap-3">
          {product?.image_url && (
            <img 
              src={product.image_url} 
              alt={product.name} 
              className="w-10 h-10 object-cover rounded-lg border border-gray-200 dark:border-white/10" 
            />
          )}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white line-clamp-1">
              {product?.name || 'Unknown Placeholder Product'}
            </h4>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
              Category: {product?.category_name || 'General'}
            </p>
          </div>
        </div>

        {/* Steps Progress Indicator */}
        <div className="px-6 pt-4 flex items-center gap-2">
          {STEPS.map((s, idx) => (
            <div 
              key={s.key}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                idx === activeStep 
                  ? 'bg-[#00FF66]' 
                  : photos[idx] 
                  ? 'bg-[#00FF66]/40' 
                  : 'bg-gray-250 dark:bg-white/10'
              }`}
            />
          ))}
        </div>

        {/* Capture/Step Workspace */}
        <div className="p-6 flex-1 flex flex-col justify-between overflow-y-auto space-y-6">
          <div className="space-y-2">
            <h3 className="text-md font-black uppercase text-gray-900 dark:text-white tracking-wide">
              {STEPS[activeStep].title}
            </h3>
            <p className="text-xs text-gray-550 dark:text-gray-450 leading-relaxed font-bold">
              {STEPS[activeStep].desc}
            </p>
          </div>

          {/* Visual capture display area */}
          <div className="relative w-full aspect-video rounded-3xl overflow-hidden bg-black border border-gray-100 dark:border-white/5 flex items-center justify-center shadow-inner">
            {photos[activeStep] ? (
              // Captured image preview
              <img 
                src={photos[activeStep]} 
                alt="Captured step" 
                className="w-full h-full object-cover" 
              />
            ) : isCameraActive ? (
              // Live camera stream
              <video 
                ref={videoRef} 
                playsInline 
                muted 
                className="w-full h-full object-cover transform -scale-x-100" 
              />
            ) : (
              // Empty / Error fallback area
              <div className="p-6 text-center space-y-3">
                <AlertCircle className="w-8 h-8 text-yellow-500 mx-auto" />
                <p className="text-xs text-gray-400 font-bold max-w-xs mx-auto leading-relaxed">
                  {cameraError || 'Camera stream is loading or inactive.'}
                </p>
                {!isCameraActive && (
                  <button 
                    onClick={startCamera} 
                    className="px-4 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-xs font-black uppercase hover:bg-gray-50 transition-all text-gray-900 dark:text-white cursor-pointer"
                  >
                    Activate Camera
                  </button>
                )}
              </div>
            )}

            {/* Steps Guide Overlay Text */}
            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-[#00FF66] border border-[#00FF66]/20">
              {STEPS[activeStep].key.toUpperCase()} CAPTURE
            </div>
          </div>

          {/* Capture Controls */}
          <div className="flex items-center justify-center gap-4">
            {photos[activeStep] ? (
              <button 
                onClick={retakePhoto}
                className="px-5 py-2.5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-red-500/20 transition-all flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" /> Retake
              </button>
            ) : (
              <>
                {isCameraActive && (
                  <button 
                    onClick={capturePhoto}
                    className="px-6 py-3 bg-[#00FF66] text-black font-black uppercase rounded-2xl text-xs hover:shadow-lg hover:shadow-[#00FF66]/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Camera className="w-4 h-4" /> Snap Photo
                  </button>
                )}
                <label className="px-5 py-2.5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-gray-50 dark:hover:bg-white/10 transition-all flex items-center gap-2 cursor-pointer">
                  <Upload className="w-4 h-4" /> Choose File
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileChange}
                    className="hidden" 
                  />
                </label>
              </>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <footer className="p-6 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-[#0c0c12]/80 flex items-center justify-between">
          <button 
            onClick={handlePrev}
            disabled={activeStep === 0 || uploading}
            className="px-5 py-2.5 bg-white dark:bg-[#12121a] hover:bg-gray-150 dark:hover:bg-[#1a1a26] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-30 cursor-pointer"
          >
            Back
          </button>

          {activeStep < 2 ? (
            <button 
              onClick={handleNext}
              disabled={!photos[activeStep] || uploading}
              className="px-6 py-2.5 bg-[#00FF66] disabled:bg-gray-300 dark:disabled:bg-white/5 text-black disabled:text-gray-500 font-black uppercase rounded-2xl text-xs hover:shadow-lg hover:shadow-[#00FF66]/15 transition-all cursor-pointer"
            >
              Next Step
            </button>
          ) : (
            <button 
              onClick={handleUploadAndSave}
              disabled={photos.some(p => !p) || uploading}
              className="px-6 py-3 bg-[#00FF66] disabled:bg-gray-300 dark:disabled:bg-white/5 text-black disabled:text-gray-500 font-black uppercase rounded-2xl text-xs hover:shadow-lg hover:shadow-[#00FF66]/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Uploading...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" /> Save catalog
                </>
              )}
            </button>
          )}
        </footer>

        {/* Upload Overlay Banner */}
        {uploading && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-6 space-y-4 z-50 animate-fadeIn">
            <Loader2 className="w-12 h-12 text-[#00FF66] animate-spin" />
            <h4 className="text-white font-black uppercase tracking-widest text-sm">Uploading Assets</h4>
            <p className="text-[#00FF66] text-xs font-bold animate-pulse">{uploadProgress}</p>
          </div>
        )}
      </div>
    </div>
  )
}
