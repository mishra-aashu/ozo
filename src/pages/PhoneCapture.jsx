import React, { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { 
  Camera, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  RotateCcw, 
  Sparkles,
  Smartphone,
  Check,
  ChevronRight
} from 'lucide-react'
import { supabase, uploadCatalogImage } from '../lib/supabase'
import toast from 'react-hot-toast'

const STEPS = [
  {
    title: '1. Front View',
    desc: 'Capture the front of the product showing brand & name clearly.',
    key: 'front'
  },
  {
    title: '2. Back View',
    desc: 'Capture the back label with ingredients, nutritional info, etc.',
    key: 'back'
  },
  {
    title: '3. MRP & Barcode',
    desc: 'Capture the printed barcode block and MRP clearly.',
    key: 'barcode'
  }
]

export default function PhoneCapture() {
  const { sessionId } = useParams()
  const [session, setSession] = useState(null)
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sessionError, setSessionError] = useState(null)

  const [photos, setPhotos] = useState([null, null, null])
  const [activeStep, setActiveStep] = useState(0)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [completed, setCompleted] = useState(false)

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  // 1. Fetch Session and Product on Mount
  useEffect(() => {
    async function loadSessionAndProduct() {
      try {
        setLoading(true)
        const { data: sessData, error: sessErr } = await supabase
          .from('capture_sessions')
          .select('*')
          .eq('session_id', sessionId)
          .maybeSingle()

        if (sessErr) throw sessErr
        if (!sessData) {
          setSessionError('Session not found. Please scan a valid QR code.')
          return
        }

        // Check expiry
        if (new Date(sessData.expires_at) < new Date()) {
          setSessionError('This QR code session has expired. Please request a new one.')
          return
        }

        if (sessData.status === 'completed') {
          setCompleted(true)
          setSession(sessData)
          return
        }

        setSession(sessData)

        // Fetch associated product details
        const { data: prodData } = await supabase
          .from('products')
          .select('name, brand, unit')
          .eq('barcode', sessData.barcode)
          .maybeSingle()

        if (prodData) {
          setProduct(prodData)
        }
      } catch (err) {
        console.error('Error loading session:', err)
        setSessionError('Failed to load capture session.')
      } finally {
        setLoading(false)
      }
    }

    if (sessionId) {
      loadSessionAndProduct()
    }
  }, [sessionId])

  // 2. Start Phone Camera
  const startCamera = async () => {
    setCameraError(null)
    try {
      if (streamRef.current) {
        stopCamera()
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
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
      setCameraError('Camera access denied. Please upload files manually or grant camera permissions.')
      setIsCameraActive(false)
    }
  }

  // 3. Stop Phone Camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setIsCameraActive(false)
  }

  // Auto-start camera when step changes and session is active
  useEffect(() => {
    if (session && !completed && !loading && !sessionError) {
      startCamera()
    }
    return () => stopCamera()
  }, [activeStep, session, completed, loading, sessionError])

  // 4. Capture Frame
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)

    const newPhotos = [...photos]
    newPhotos[activeStep] = dataUrl
    setPhotos(newPhotos)
    stopCamera()
  }

  // 5. File Upload Fallback
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

  // 6. Reset step photo
  const retakePhoto = () => {
    const newPhotos = [...photos]
    newPhotos[activeStep] = null
    setPhotos(newPhotos)
    startCamera()
  }

  // 7. Proceed or Trigger Upload Sequence
  const handleNext = async () => {
    if (activeStep < 2) {
      setActiveStep(activeStep + 1)
      return
    }

    // Finished capturing all 3 -> Upload
    setUploading(true)
    setUploadProgress('Preparing upload...')
    const uploadedUrls = []

    try {
      for (let i = 0; i < 3; i++) {
        const photoDataUrl = photos[i]
        if (!photoDataUrl) continue

        setUploadProgress(`Uploading photo ${i + 1} of 3...`)

        const res = await fetch(photoDataUrl)
        const blob = await res.blob()
        const file = new File([blob], `${session.barcode}_${i}.jpg`, { type: 'image/jpeg' })

        const uploadRes = await uploadCatalogImage(file, session.barcode, i)
        if (uploadRes.error) {
          throw new Error(uploadRes.error.message || uploadRes.error)
        }
        uploadedUrls.push(uploadRes.url)
      }

      setUploadProgress('Completing session...')

      // Update capture_session to let the laptop know we are done
      const { error: sessionUpdateErr } = await supabase
        .from('capture_sessions')
        .update({
          photos: uploadedUrls,
          status: 'completed'
        })
        .eq('session_id', sessionId)

      if (sessionUpdateErr) throw sessionUpdateErr

      setCompleted(true)
      toast.success('All photos uploaded successfully!')
    } catch (err) {
      console.error('[PhoneCapture] Upload failed:', err)
      toast.error(`Upload failed: ${err.message || 'Unknown error'}`)
    } finally {
      setUploading(false)
      setUploadProgress('')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-ozo-red animate-spin mb-4" />
        <p className="text-gray-400 font-medium">Validating capture session...</p>
      </div>
    )
  }

  if (sessionError) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-red-950/40 border border-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-6">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold mb-2">Session Error</h2>
        <p className="text-gray-400 max-w-sm mb-6">{sessionError}</p>
        <p className="text-xs text-gray-500">Scan a new QR Code on the store dashboard to retry.</p>
      </div>
    )
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-emerald-950/40 border border-emerald-500/30 text-emerald-500 rounded-full flex items-center justify-center mb-8 animate-bounce">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold mb-3">Upload Complete!</h2>
        <p className="text-emerald-400 font-medium mb-1">Barcode: {session?.barcode}</p>
        <p className="text-gray-400 max-w-xs mb-8">
          The photos have been successfully uploaded and linked to the catalog. You can now close this tab.
        </p>
        <div className="text-xs text-gray-500">
          The store register panel has been updated in real-time.
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between">
      {/* Hidden canvas for capturing frames */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Header */}
      <header className="p-4 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-10 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-ozo-red to-orange-500 flex items-center justify-center shadow-lg shadow-ozo-red/20">
          <Smartphone className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-sm leading-tight">Catalog Photo Capture</h1>
          <p className="text-xs text-gray-400 truncate max-w-[220px]">
            {product?.name || `Product: ${session.barcode}`}
          </p>
        </div>
      </header>

      {/* Main Stream Area */}
      <main className="flex-1 flex flex-col justify-center p-4">
        {/* Guide / Description card */}
        <div className="mb-4 bg-slate-900/60 border border-slate-800 rounded-2xl p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-widest text-ozo-red">
              Step {activeStep + 1} of 3
            </span>
            <span className="text-xs text-gray-400 font-bold bg-slate-800 px-2 py-0.5 rounded-full">
              {session.barcode}
            </span>
          </div>
          <h2 className="text-lg font-bold mb-1">{STEPS[activeStep].title}</h2>
          <p className="text-xs text-gray-400 leading-relaxed">{STEPS[activeStep].desc}</p>
        </div>

        {/* Viewport Frame */}
        <div className="relative aspect-video sm:aspect-square bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center">
          {!photos[activeStep] ? (
            isCameraActive ? (
              <video 
                ref={videoRef} 
                className="w-full h-full object-cover" 
                playsInline 
                muted 
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-6 text-center text-gray-500">
                <Loader2 className="w-8 h-8 animate-spin text-ozo-red mb-2" />
                <p className="text-xs font-medium">Starting camera...</p>
              </div>
            )
          ) : (
            <img 
              src={photos[activeStep]} 
              alt={`Capture step ${activeStep}`} 
              className="w-full h-full object-cover"
            />
          )}

          {/* Camera Error banner */}
          {cameraError && !photos[activeStep] && (
            <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center">
              <AlertCircle className="w-8 h-8 text-amber-500 mb-2" />
              <p className="text-xs text-gray-400 mb-4">{cameraError}</p>
              <label className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Choose File
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileChange} 
                  className="hidden" 
                />
              </label>
            </div>
          )}

          {/* Uploading Overlay */}
          {uploading && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6">
              <Loader2 className="w-10 h-10 text-ozo-red animate-spin mb-4" />
              <p className="text-sm font-bold text-white">{uploadProgress}</p>
            </div>
          )}
        </div>
      </main>

      {/* Controls & Steps Indicators */}
      <footer className="p-4 bg-slate-950/95 border-t border-slate-900 sticky bottom-0">
        {/* Small slots showing status of 3 steps */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {STEPS.map((step, idx) => (
            <div 
              key={step.key} 
              className={`p-2 rounded-xl border text-center transition-all ${
                activeStep === idx 
                  ? 'bg-slate-900 border-ozo-red' 
                  : photos[idx] 
                    ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-400' 
                    : 'bg-slate-950 border-slate-900 text-gray-500'
              }`}
            >
              <div className="text-[10px] font-black uppercase tracking-wider mb-0.5">
                {step.key}
              </div>
              <div className="flex items-center justify-center h-4">
                {photos[idx] ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <div className={`w-1.5 h-1.5 rounded-full ${activeStep === idx ? 'bg-ozo-red animate-ping' : 'bg-slate-800'}`} />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between gap-4">
          {!photos[activeStep] ? (
            <>
              {/* File upload fallback link */}
              <label className="flex-1 bg-slate-900 hover:bg-slate-850 active:scale-95 border border-slate-800 py-3.5 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm cursor-pointer transition-all">
                <Upload className="w-4 h-4 text-gray-400" />
                Upload Image
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileChange} 
                  className="hidden" 
                />
              </label>

              {/* Shutter capture button */}
              <button 
                onClick={capturePhoto}
                disabled={!isCameraActive}
                className="w-14 h-14 rounded-full bg-white text-slate-950 flex items-center justify-center shadow-lg shadow-white/20 active:scale-90 disabled:opacity-50 disabled:scale-100 transition-all"
              >
                <Camera className="w-6 h-6" />
              </button>
            </>
          ) : (
            <>
              {/* Retake button */}
              <button 
                onClick={retakePhoto}
                className="flex-1 bg-slate-900 hover:bg-slate-850 py-3.5 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm border border-slate-800 transition-all active:scale-95"
              >
                <RotateCcw className="w-4 h-4 text-gray-400" />
                Retake
              </button>

              {/* Next/Save button */}
              <button 
                onClick={handleNext}
                className="flex-1 bg-gradient-to-r from-ozo-red to-orange-500 py-3.5 rounded-2xl flex items-center justify-center gap-2 font-black text-sm text-white transition-all active:scale-95 shadow-lg shadow-ozo-red/20"
              >
                {activeStep === 2 ? 'Upload Photos' : 'Next Step'}
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </footer>
    </div>
  )
}
