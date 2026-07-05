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
  Check,
  RefreshCw,
  Clock
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
  // 'select' | 'webcam' | 'phone_qr'
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

  // ==========================================
  // WEBCAM CAPTURE LOGIC
  // ==========================================
  
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
        const file = new File([blob], `${barcode}_${i}.jpg`, { type: 'image/jpeg' })

        const uploadRes = await uploadCatalogImage(file, barcode, i)
        
        if (uploadRes.error) {
          throw new Error(uploadRes.error.message || uploadRes.error)
        }
        uploadedUrls.push(uploadRes.url)
      }

      setWebcamProgress('Saving to product catalog...')

      // Update database product entry
      const primaryUrl = uploadedUrls[0]
      const { error: dbError } = await supabase
        .from('products')
        .update({
          image_url: primaryUrl,
          images: uploadedUrls,
          enrichment_status: 'merchant_upload',
          enrichment_source: 'merchant_webcam'
        })
        .eq('barcode', barcode)

      if (dbError) throw dbError

      toast.success('Product catalog enriched successfully via Webcam!')
      if (onComplete) {
        onComplete({
          ...product,
          image_url: primaryUrl,
          images: uploadedUrls,
          enrichment_status: 'merchant_upload',
          enrichment_source: 'merchant_webcam'
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
      
      // Get current mart operator's mart ID
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
      
      // Construct QR code URL
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
    // Unsubscribe from any previous
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
            // Save updates to products table using the photos captured on phone
            try {
              const primaryUrl = photos[0]
              const { error: dbError } = await supabase
                .from('products')
                .update({
                  image_url: primaryUrl,
                  images: photos,
                  enrichment_status: 'merchant_upload',
                  enrichment_source: 'merchant_phone'
                })
                .eq('barcode', barcode)

              if (dbError) throw dbError

              // Play sound chime if available
              try {
                const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav')
                audio.play()
              } catch (_) {}

              toast.success('Product catalog enriched successfully via Phone!')
              
              // Call complete callback
              if (onComplete) {
                onComplete({
                  ...product,
                  image_url: primaryUrl,
                  images: photos,
                  enrichment_status: 'merchant_upload',
                  enrichment_source: 'merchant_phone'
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

  // Cleanup subscriptions on unmount
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
            {mode !== 'select' && (
              <button 
                onClick={() => {
                  stopCamera()
                  setMode('select')
                }}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <h3 className="font-bold text-white text-base">
                {mode === 'select' && 'Select Capture Method'}
                {mode === 'webcam' && 'Laptop Webcam Capture'}
                {mode === 'phone_qr' && 'Phone Capture Loop'}
              </h3>
              <p className="text-xs text-gray-500 truncate max-w-[280px]">
                {product?.name || `Barcode: ${barcode}`}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-800 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* ==========================================
            SCREEN 1: CHOOSE METHOD SCREEN
           ========================================== */}
        {mode === 'select' && (
          <div className="p-6">
            <div className="mb-6 p-4 rounded-2xl bg-slate-900/40 border border-slate-850 flex gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-orange-950/20 border border-orange-500/20 flex items-center justify-center text-orange-400 shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-orange-400 mb-0.5">Photo Enrichment Required</h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  This product has no catalog image. Capture or upload 3 view angles to activate it in the customer store.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Option A: Laptop Webcam */}
              <button
                onClick={() => setMode('webcam')}
                className="flex flex-col items-center justify-center p-6 bg-slate-900/30 hover:bg-slate-900/70 border border-slate-850 hover:border-slate-700 rounded-2xl text-center group transition-all duration-300 active:scale-[0.98]"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Camera className="w-6 h-6" />
                </div>
                <h5 className="font-bold text-white text-sm mb-1">Laptop Webcam</h5>
                <p className="text-xs text-gray-500 max-w-[160px] leading-relaxed">
                  Take photos instantly using your laptop’s built-in webcam.
                </p>
              </button>

              {/* Option B: Mobile via QR */}
              <button
                onClick={startPhoneCaptureSession}
                disabled={creatingSession}
                className="flex flex-col items-center justify-center p-6 bg-slate-900/30 hover:bg-slate-900/70 border border-slate-850 hover:border-slate-700 rounded-2xl text-center group transition-all duration-300 active:scale-[0.98] disabled:opacity-50"
              >
                <div className="w-12 h-12 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  {creatingSession ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <QrCode className="w-6 h-6" />
                  )}
                </div>
                <h5 className="font-bold text-white text-sm mb-1">Mobile QR Code</h5>
                <p className="text-xs text-gray-500 max-w-[160px] leading-relaxed">
                  Scan QR code to capture HD photos from your phone camera.
                </p>
              </button>
            </div>
          </div>
        )}

        {/* ==========================================
            SCREEN 2: WEBCAM CAPTURE SCREEN
           ========================================== */}
        {mode === 'webcam' && (
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
              {WEBCAM_STEPS.map((step, idx) => (
                <div 
                  key={step.key} 
                  className={`p-2 rounded-xl border text-center transition-all ${
                    webcamStep === idx 
                      ? 'bg-slate-900/60 border-emerald-500/50' 
                      : webcamPhotos[idx] 
                        ? 'bg-emerald-950/10 border-emerald-500/20 text-emerald-400' 
                        : 'bg-transparent border-slate-900 text-gray-600'
                  }`}
                >
                  <div className="text-[10px] font-black uppercase tracking-wider mb-0.5">
                    {step.key}
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
                className="px-4 py-2.5 rounded-xl border border-slate-800 text-xs font-bold text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400 transition-all"
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
                      className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 text-xs font-black px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all active:scale-[0.97]"
                    >
                      <Camera className="w-4 h-4" />
                      Capture
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={retakePhoto}
                      className="bg-slate-900 hover:bg-slate-800 text-gray-350 text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-850 flex items-center gap-2"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Retake
                    </button>

                    {webcamStep === 2 ? (
                      <button
                        onClick={handleWebcamSave}
                        className="bg-gradient-to-r from-emerald-500 to-[#00FF66] text-slate-950 text-xs font-black px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-500/10 flex items-center gap-2"
                      >
                        Save Images
                      </button>
                    ) : (
                      <button
                        onClick={handleWebcamNext}
                        className="bg-emerald-505 hover:bg-emerald-500 text-slate-950 text-xs font-black px-5 py-2.5 rounded-xl flex items-center gap-2"
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
            SCREEN 3: PHONE QR SCAN SCREEN
           ========================================== */}
        {mode === 'phone_qr' && (
          <div className="p-6 flex flex-col items-center">
            
            {/* Countdown / Session Status indicator */}
            <div className="w-full flex justify-between items-center mb-5 bg-slate-900/30 border border-slate-850 p-3 rounded-2xl">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-400" />
                <span className="text-xs font-bold text-gray-400">QR Session Expiry</span>
              </div>
              <span className="text-xs font-mono font-black text-orange-400">
                {formatTime(timeLeft)}
              </span>
            </div>

            {/* QR Code Container */}
            {sessionStatus !== 'expired' ? (
              <div className="relative p-5 bg-white rounded-3xl shadow-xl flex flex-col items-center justify-center max-w-[220px] mx-auto mb-5 border border-slate-200">
                <QRCode 
                  value={qrUrl} 
                  size={180}
                  style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                  viewBox={`0 0 256 256`}
                />
              </div>
            ) : (
              <div className="p-6 bg-red-950/20 border border-red-500/20 text-center rounded-2xl mb-5 w-full">
                <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                <h4 className="font-bold text-sm text-red-400 mb-1">Session Expired</h4>
                <p className="text-xs text-gray-500 mb-4">The 5-minute capture window has closed.</p>
                <button
                  onClick={startPhoneCaptureSession}
                  className="bg-slate-900 hover:bg-slate-800 text-xs font-bold px-4 py-2 rounded-xl text-white transition-all"
                >
                  Regenerate QR Code
                </button>
              </div>
            )}

            {/* Instructions */}
            <div className="text-center max-w-sm mb-6">
              <h4 className="font-bold text-white text-sm mb-1">Scan with Phone Camera</h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                Scan the QR code to open the HD capture portal on your phone. Stream will sync automatically.
              </p>
            </div>

            {/* Live Status indicator */}
            <div className="w-full border-t border-slate-900 pt-5 mt-2">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-gray-500 font-bold">Live Stream Status</span>
                <span className="text-xs text-gray-400 flex items-center gap-1.5 font-bold">
                  {sessionStatus === 'waiting' && (
                    <>
                      <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-ping" />
                      Waiting for scan...
                    </>
                  )}
                  {sessionStatus === 'uploading' && (
                    <>
                      <span className="w-2.5 h-2.5 bg-yellow-500 rounded-full animate-pulse" />
                      Receiving photos...
                    </>
                  )}
                  {sessionStatus === 'completed' && (
                    <>
                      <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                      Perfect! Saving...
                    </>
                  )}
                </span>
              </div>

              {/* Captured photos indicator */}
              <div className="grid grid-cols-3 gap-2">
                {[0, 1, 2].map((idx) => {
                  const hasPhoto = phonePhotos[idx]
                  return (
                    <div 
                      key={idx} 
                      className={`h-14 rounded-xl border flex flex-col items-center justify-center transition-all overflow-hidden ${
                        hasPhoto 
                          ? 'border-emerald-500/30 bg-emerald-950/10' 
                          : 'border-slate-850 bg-slate-900/10'
                      }`}
                    >
                      {hasPhoto ? (
                        <img 
                          src={hasPhoto} 
                          alt={`Step ${idx + 1}`} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Smartphone className="w-4 h-4 text-gray-700" />
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
