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
  ChevronRight,
  ArrowLeft,
  SunDim,
  Zap,
  ZapOff
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
  const [uploadedUrls, setUploadedUrls] = useState([null, null, null])
  const [syncing, setSyncing] = useState(false)
  const [activeStep, setActiveStep] = useState(0)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [completed, setCompleted] = useState(false)
  const [isTooDark, setIsTooDark] = useState(false)
  const [triggerShake, setTriggerShake] = useState(false)
  const [hasTorch, setHasTorch] = useState(false)
  const [isTorchOn, setIsTorchOn] = useState(false)

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
        if (sessData.photos) {
          setUploadedUrls(sessData.photos)
          const loadedPhotos = [null, null, null]
          sessData.photos.forEach((url, i) => {
            if (url) loadedPhotos[i] = url
          })
          setPhotos(loadedPhotos)
        }

        // Mark session as joined so the desktop operator knows phone is connected
        if (sessData.status === 'waiting') {
          await supabase
            .from('capture_sessions')
            .update({ status: 'joined' })
            .eq('session_id', sessionId)
        }

        // Fetch associated product details
        let productQuery = supabase
          .from('products')
          .select('name, brand, unit')

        if (sessData.product_id) {
          productQuery = productQuery.eq('id', sessData.product_id)
        } else {
          productQuery = productQuery.eq('barcode', sessData.barcode)
        }

        const { data: prodData } = await productQuery.maybeSingle()

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
      let stream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
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

      // Query track capabilities for flashlight support
      const track = stream.getVideoTracks()[0]
      if (track) {
        setTimeout(() => {
          try {
            const capabilities = track.getCapabilities?.() || {}
            setHasTorch(!!capabilities.torch)
            setIsTorchOn(false)
          } catch (err) {
            console.warn('Could not query track capabilities:', err)
          }
        }, 500)
      }
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
    setHasTorch(false)
    setIsTorchOn(false)
  }

  // Flashlight / Torch Toggle
  const toggleTorch = async () => {
    try {
      const track = streamRef.current?.getVideoTracks()[0]
      if (track && hasTorch) {
        const newTorchState = !isTorchOn
        await track.applyConstraints({
          advanced: [{ torch: newTorchState }]
        })
        setIsTorchOn(newTorchState)
      }
    } catch (err) {
      console.error('Failed to toggle torch:', err)
    }
  }

  // Synchronize stream to video element when active
  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(err => {
        console.error('Error playing phone video stream:', err)
      })
    }
  }, [isCameraActive])

  // Auto-start camera when step changes and session is active
  useEffect(() => {
    if (session && !completed && !loading && !sessionError) {
      startCamera()
    }
    return () => stopCamera()
  }, [activeStep, session, completed, loading, sessionError])

  // Brightness check loop for low-lighting warning & lock
  useEffect(() => {
    if (!isCameraActive || photos[activeStep]) {
      setIsTooDark(false)
      return
    }

    const checkBrightness = () => {
      if (!videoRef.current) return
      const video = videoRef.current
      if (video.readyState < 2) return

      // Create an offscreen small canvas for performance
      const canvas = document.createElement('canvas')
      canvas.width = 40
      canvas.height = 30
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data
        let totalLuminance = 0
        for (let i = 0; i < imgData.length; i += 4) {
          const r = imgData[i]
          const g = imgData[i + 1]
          const b = imgData[i + 2]
          // Standard relative luminance formula
          const luminance = 0.299 * r + 0.587 * g + 0.114 * b
          totalLuminance += luminance
        }
        const avgBrightness = totalLuminance / (imgData.length / 4)
        
        // Threshold: 65 is optimized for clear product photos
        setIsTooDark(avgBrightness < 65)
      } catch (err) {
        console.warn('Error reading brightness:', err)
      }
    }

    const interval = setInterval(checkBrightness, 600)
    return () => {
      clearInterval(interval)
      setIsTooDark(false)
    }
  }, [isCameraActive, activeStep, photos])

  // Helper to upload single photo instantly
  const uploadCapturedPhoto = async (dataUrl, stepIndex) => {
    try {
      setSyncing(true)
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      const fileIdentifier = session.barcode || session.product_id || 'nobarcode'
      const file = new File([blob], `${fileIdentifier}_${stepIndex}.jpg`, { type: 'image/jpeg' })

      const uploadRes = await uploadCatalogImage(file, fileIdentifier, stepIndex)
      if (uploadRes.error) {
        throw new Error(uploadRes.error.message || uploadRes.error)
      }

      const newUrls = [...uploadedUrls]
      newUrls[stepIndex] = uploadRes.url
      setUploadedUrls(newUrls)

      // Update capture_session in database
      const { error: syncErr } = await supabase
        .from('capture_sessions')
        .update({
          photos: newUrls,
          status: 'uploading'
        })
        .eq('session_id', sessionId)

      if (syncErr) throw syncErr
      toast.success(`${STEPS[stepIndex].title.split('. ')[1]} synced to catalog!`)
    } catch (err) {
      console.error('[PhoneCapture] Real-time photo sync failed:', err)
      toast.error('Sync failed: ' + err.message)
    } finally {
      setSyncing(false)
    }
  }

  // 4. Capture Frame
  const capturePhoto = () => {
    if (isTooDark) {
      if (navigator.vibrate) {
        navigator.vibrate([150, 100, 150])
      }
      setTriggerShake(true)
      setTimeout(() => setTriggerShake(false), 500)
      return
    }

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

    // Sync immediately
    uploadCapturedPhoto(dataUrl, activeStep)
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

      // Sync immediately
      uploadCapturedPhoto(dataUrl, activeStep)
    }
    reader.readAsDataURL(file)
  }

  // 6. Reset step photo
  const retakePhoto = async () => {
    try {
      setSyncing(true)
      const fileIdentifier = session?.barcode || session?.product_id || 'nobarcode'

      // 1. Delete the existing photo from Supabase Storage bucket to free up space
      const supabasePath = `merchant-photos/${fileIdentifier}/${activeStep}.jpg`
      const { error: deleteErr } = await supabase.storage
        .from('mart-assets')
        .remove([supabasePath])
      
      if (deleteErr) {
        console.warn('[PhoneCapture] Failed to delete image from Supabase Storage:', deleteErr)
      } else {
        console.log('[PhoneCapture] Successfully deleted old image from storage to save space:', supabasePath)
      }

      // 2. Delete the photo from ImageKit CDN via the Edge Function POST action
      try {
        const { data: ikDeleteData, error: ikDeleteErr } = await supabase.functions.invoke('imagekit-auth', {
          body: {
            action: 'delete',
            filePath: `/ozomart-products/${fileIdentifier}_${activeStep}.jpg`
          }
        })
        if (ikDeleteErr) {
          console.warn('[PhoneCapture] ImageKit CDN deletion error:', ikDeleteErr)
        } else {
          console.log('[PhoneCapture] ImageKit CDN deletion response:', ikDeleteData)
        }
      } catch (ikErr) {
        console.error('[PhoneCapture] ImageKit delete invocation failed:', ikErr)
      }

      const newPhotos = [...photos]
      newPhotos[activeStep] = null
      setPhotos(newPhotos)

      const newUrls = [...uploadedUrls]
      newUrls[activeStep] = null
      setUploadedUrls(newUrls)

      // Sync cleared array to DB
      await supabase
        .from('capture_sessions')
        .update({
          photos: newUrls
        })
        .eq('session_id', sessionId)
    } catch (err) {
      console.error('[PhoneCapture] Retake sync failed:', err)
    } finally {
      setSyncing(false)
      startCamera()
    }
  }

  // 7. Proceed or Trigger Upload Sequence
  const handleNext = async () => {
    if (activeStep < 2) {
      setActiveStep(activeStep + 1)
      return
    }

    // Finished capturing all 3 -> Complete session
    setUploading(true)
    setUploadProgress('Completing session...')

    try {
      const finalUrls = [...uploadedUrls]

      // Fallback: If any photo was captured but failed to sync earlier, upload it now
      for (let i = 0; i < 3; i++) {
        if (!finalUrls[i] && photos[i]) {
          setUploadProgress(`Uploading photo ${i + 1} of 3...`)
          const res = await fetch(photos[i])
          const blob = await res.blob()
          const fileIdentifier = session.barcode || session.product_id || 'nobarcode'
          const file = new File([blob], `${fileIdentifier}_${i}.jpg`, { type: 'image/jpeg' })
          const uploadRes = await uploadCatalogImage(file, fileIdentifier, i)
          if (uploadRes.error) throw new Error(uploadRes.error)
          finalUrls[i] = uploadRes.url
        }
      }

      setUploadProgress('Finalizing sync session...')

      // Update capture_session to notify the catalog system that we are done
      const { error: sessionUpdateErr } = await supabase
        .from('capture_sessions')
        .update({
          photos: finalUrls,
          status: 'completed'
        })
        .eq('session_id', sessionId)

      if (sessionUpdateErr) throw sessionUpdateErr

      setCompleted(true)
      toast.success('All photos uploaded successfully!')
    } catch (err) {
      console.error('[PhoneCapture] Upload completion failed:', err)
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
    <div className="h-[100dvh] overflow-hidden bg-slate-950 text-white flex flex-col justify-between">
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15%, 45%, 75% { transform: translateX(-6px); }
          30%, 60%, 90% { transform: translateX(6px); }
        }
        .shake-element {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>
      {/* Hidden canvas for capturing frames */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Header */}
      <header className="px-4 py-2.5 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (activeStep > 0) {
                setActiveStep(activeStep - 1)
              } else {
                window.history.back()
              }
            }}
            className="p-2 -ml-2 rounded-xl hover:bg-slate-900 active:scale-95 text-gray-400 hover:text-white transition-all"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-rose-500 block leading-none mb-1">
              Step {activeStep + 1} of 3
            </span>
            <h1 className="font-bold text-sm text-white leading-none">
              {STEPS[activeStep].title.split('. ')[1]}
            </h1>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-gray-300 font-mono font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
            {session.barcode}
          </span>
          <p className="text-[10px] text-gray-500 mt-1 max-w-[140px] truncate">
            {product?.name || 'New Product'}
          </p>
        </div>
      </header>

      {/* Main Stream Area */}
      <main className="flex-1 flex flex-col justify-center px-2 py-3 min-h-0">
        {/* Viewport Frame - aspect-[3/4] for a taller, larger preview */}
        <div className="relative aspect-[3/4] w-full max-w-md md:max-w-lg max-h-[calc(100dvh-170px)] mx-auto bg-slate-900 border border-slate-800 rounded-[32px] overflow-hidden shadow-2xl flex items-center justify-center">
          {/* Top Instruction Guide Overlay (Floating inside camera) */}
          <div className="absolute top-4 left-4 right-4 z-10 px-3 py-2 bg-slate-950/85 backdrop-blur-md rounded-2xl border border-white/5 text-center shadow-lg">
            <p className="text-[11px] text-gray-200 font-medium leading-relaxed">
              {STEPS[activeStep].desc}
            </p>
          </div>
          {!photos[activeStep] ? (
            isCameraActive ? (
              <>
                <video 
                  ref={videoRef} 
                  className="w-full h-full object-cover" 
                  playsInline 
                  muted 
                />
                 {isTooDark && (
                  <div className={`absolute inset-x-4 top-16 bg-rose-600/90 backdrop-blur-sm text-white px-3 py-2 rounded-xl border border-rose-500/30 flex items-center justify-center gap-2 shadow-lg z-10 select-none text-center ${
                    triggerShake ? 'shake-element' : 'animate-pulse'
                  }`}>
                    <SunDim className="w-4 h-4 animate-spin text-amber-350 shrink-0" />
                    <span className="text-[10px] font-black uppercase tracking-wider">
                      Too Dark! Move product to a brighter area
                    </span>
                  </div>
                )}
                {hasTorch && (
                  <button
                    onClick={toggleTorch}
                    type="button"
                    className={`absolute bottom-4 right-4 z-20 w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md border transition-all active:scale-90 ${
                      isTorchOn 
                        ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.5)]' 
                        : 'bg-slate-950/65 border-white/15 text-white hover:bg-slate-900/80'
                    }`}
                    title={isTorchOn ? "Turn off flashlight" : "Turn on flashlight"}
                  >
                    {isTorchOn ? <Zap className="w-5 h-5 fill-current" /> : <ZapOff className="w-5 h-5" />}
                  </button>
                )}
              </>
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

          {/* Syncing Overlay */}
          {syncing && (
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 z-10 animate-fade-in">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mb-2" />
              <p className="text-xs font-bold text-emerald-400 animate-pulse">Syncing photo to catalog...</p>
            </div>
          )}

          {/* Uploading Overlay */}
          {uploading && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 z-20">
              <Loader2 className="w-10 h-10 text-ozo-red animate-spin mb-4" />
              <p className="text-sm font-bold text-white">{uploadProgress}</p>
            </div>
          )}
        </div>
      </main>

      {/* Controls & Steps Indicators */}
      <footer className="p-3 bg-slate-950/95 border-t border-slate-900 sticky bottom-0">
        {/* Small slots showing status of 3 steps */}
        <div className="grid grid-cols-3 gap-2 mb-3">
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
        <div className="flex items-center justify-between w-full">
          {!photos[activeStep] ? (
            <div className="grid grid-cols-3 items-center justify-items-center w-full py-2">
              {/* Left: Gallery Upload button */}
              <label 
                className={`w-12 h-12 rounded-full bg-slate-900/90 hover:bg-slate-800 active:scale-95 border border-slate-800/80 flex items-center justify-center cursor-pointer transition-all shadow-md ${
                  syncing ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
                }`}
                title="Upload Image"
              >
                <Upload className="w-5 h-5 text-gray-300" />
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileChange} 
                  disabled={syncing}
                  className="hidden" 
                />
              </label>

              {/* Center: iOS/Android-style Camera Shutter Button */}
              <button 
                onClick={capturePhoto}
                disabled={!isCameraActive || syncing}
                className={`w-16 h-16 rounded-full border-4 flex items-center justify-center transition-all focus:outline-none ${
                  isTooDark 
                    ? 'border-rose-900 bg-rose-950/40 text-rose-500 cursor-not-allowed shadow-none'
                    : 'border-white bg-transparent active:scale-90 disabled:opacity-40 disabled:scale-100 shadow-lg shadow-white/5 cursor-pointer'
                }`}
                title={isTooDark ? "Capture locked: Lighting is too dark" : "Capture photo"}
              >
                <div className={`w-11 h-11 rounded-full transition-all ${isTooDark ? 'bg-rose-900/60' : 'bg-white'}`} />
              </button>

              {/* Right: Empty spacer to align items symmetrically */}
              <div className="w-12 h-12" />
            </div>
          ) : (
            <>
              {/* Retake button */}
              <button 
                onClick={retakePhoto}
                disabled={syncing}
                className="flex-1 bg-slate-900 hover:bg-slate-850 py-3.5 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm border border-slate-800 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RotateCcw className="w-4 h-4 text-gray-400" />
                Retake
              </button>

              {/* Next/Save button */}
              <button 
                onClick={handleNext}
                disabled={syncing}
                className="flex-1 bg-gradient-to-r from-ozo-red to-orange-500 py-3.5 rounded-2xl flex items-center justify-center gap-2 font-black text-sm text-white transition-all active:scale-95 shadow-lg shadow-ozo-red/20 disabled:opacity-55 disabled:cursor-not-allowed"
              >
                {syncing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    Syncing...
                  </>
                ) : (
                  <>
                    {activeStep === 2 ? 'Complete & Save' : 'Next Step'}
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </footer>
    </div>
  )
}
