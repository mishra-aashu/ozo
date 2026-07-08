import { useState, useRef, useEffect } from 'react'
import { Upload, X, Loader2, Camera, RefreshCw, Check, RotateCcw, AlertTriangle } from 'lucide-react'
import { validateFileHeader, uploadToImgbb } from '../lib/supabase'
import toast from 'react-hot-toast'

const ImageUpload = ({
  value = '', // URL string or array of URL strings
  onChange,
  multiple = false,
  limit = 5,
  maxSize = 5 * 1024 * 1024, // 5MB default
  customNamePrefix = 'ozo',
  className = '',
  label = '',
  disabled = false,
  onUploadingStateChange,
  capture,
  cameraOnly = false
}) => {
  const [localUploading, setLocalUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  // Camera states
  const [showCamera, setShowCamera] = useState(false)
  const [stream, setStream] = useState(null)
  const [cameraError, setCameraError] = useState('')
  const [capturedImage, setCapturedImage] = useState('')
  const [facingMode, setFacingMode] = useState('environment') // Back camera first
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false)
  const videoRef = useRef(null)

  const handleUploadingState = (state) => {
    setLocalUploading(state)
    if (onUploadingStateChange) {
      onUploadingStateChange(state)
    }
  }

  // Camera handling
  const stopCamera = (activeStream = stream) => {
    if (activeStream) {
      activeStream.getTracks().forEach(track => track.stop())
    }
    setStream(null)
  }

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [stream])

  // Synchronize stream to video element when camera is open and stream is loaded
  useEffect(() => {
    if (showCamera && stream && videoRef.current) {
      videoRef.current.srcObject = stream
      videoRef.current.play().catch(err => {
        console.error('Error playing upload video stream:', err)
      })
    }
  }, [showCamera, stream])

  const startCamera = async (currentFacingMode = facingMode) => {
    // Stop any existing stream before starting a new one
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
    }
    setStream(null)
    setCameraError('')
    try {
      let newStream
      try {
        const constraints = {
          video: {
            facingMode: { ideal: currentFacingMode },
            width: { ideal: 1280 },
            height: { ideal: 960 }
          },
          audio: false
        }
        newStream = await navigator.mediaDevices.getUserMedia(constraints)
      } catch (firstErr) {
        console.warn('Failed with facingMode constraint, trying default video...', firstErr)
        newStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        })
      }
      
      setStream(newStream)

      // Check if there are multiple video devices
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter(device => device.kind === 'videoinput')
      setHasMultipleCameras(videoDevices.length > 1)
    } catch (err) {
      console.error('Error starting webcam:', err)
      setCameraError('Camera access denied or device not found. Please allow camera access in browser settings.')
      toast.error('Could not access camera. Please allow camera permissions.')
    }
  }

  const toggleFacingMode = () => {
    const nextFacingMode = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(nextFacingMode)
    startCamera(nextFacingMode)
  }

  const closeCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
    }
    setStream(null)
    setShowCamera(false)
    setCapturedImage('')
    setCameraError('')
  }

  const capturePhoto = () => {
    if (!videoRef.current) return
    const video = videoRef.current
    const canvas = document.createElement('canvas')
    
    // Set matching dimensions
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Mirror the capture if using the front camera (user facing)
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
    setCapturedImage(dataUrl)
  }

  const confirmPhoto = async () => {
    if (!capturedImage) return
    
    try {
      // Helper function to convert dataURL to File object
      const filename = `${customNamePrefix}_capture_${Date.now()}.jpg`
      const arr = capturedImage.split(',')
      const mime = arr[0].match(/:(.*?);/)[1]
      const bstr = atob(arr[1])
      let n = bstr.length
      const u8arr = new Uint8Array(n)
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n)
      }
      const file = new File([u8arr], filename, { type: mime })
      
      const url = await processFile(file)
      if (url) {
        if (multiple) {
          const currentUrls = Array.isArray(value) ? value : (value ? [value] : [])
          onChange([...currentUrls, url])
        } else {
          onChange(url)
        }
        closeCamera()
      }
    } catch (err) {
      console.error('Error processing live capture:', err)
      toast.error('Failed to process image capture')
    }
  }

  const processFile = async (file) => {
    // Strictly enforce a 5MB maximum file size limit
    const strictMaxSize = Math.min(maxSize, 5 * 1024 * 1024)
    if (file.size > strictMaxSize) {
      toast.error('File size must be less than 5 MB')
      return null
    }

    // Securely validate the file's content header (magic numbers) to prevent zip/malicious file uploads
    const validation = await validateFileHeader(file)
    if (!validation.valid) {
      toast.error(validation.error)
      return null
    }

    handleUploadingState(true)
    const toastId = toast.loading('Uploading to ImgBB...')

    try {
      // Enforce filename sanitization using lowercase alphanumeric characters, underscores, and unique timestamp
      const cleanPrefix = customNamePrefix.trim().toLowerCase().replace(/[^a-z0-9]/g, '_')
      const customName = `${cleanPrefix}_${Date.now()}`
      const { url, error } = await uploadToImgbb(file, customName)

      if (error) {
        throw error
      }

      toast.success('Upload complete!', { id: toastId })
      return url
    } catch (err) {
      console.error('ImageUpload component error:', err)
      toast.error('Upload failed. Please try again.', { id: toastId })
      return null
    } finally {
      handleUploadingState(false)
    }
  }

  const handleFileChange = async (e) => {
    if (cameraOnly) return // Prevent any file inputs when cameraOnly is active
    
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    if (multiple) {
      const currentUrls = Array.isArray(value) ? value : (value ? [value] : [])
      if (currentUrls.length + files.length > limit) {
        toast.error(`You can upload up to ${limit} images only`)
        return
      }

      const uploadedUrls = [...currentUrls]
      for (const file of files) {
        const url = await processFile(file)
        if (url) {
          uploadedUrls.push(url)
          onChange(uploadedUrls)
        }
      }
    } else {
      const url = await processFile(files[0])
      if (url) {
        onChange(url)
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemove = (urlToRemove) => {
    if (multiple) {
      const currentUrls = Array.isArray(value) ? value : []
      const filtered = currentUrls.filter(u => u !== urlToRemove)
      onChange(filtered)
    } else {
      onChange('')
    }
  }

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault()
    if (!disabled && !localUploading && !cameraOnly) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    setIsDragging(false)
    if (disabled || localUploading || cameraOnly) return

    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) return

    if (multiple) {
      const currentUrls = Array.isArray(value) ? value : (value ? [value] : [])
      if (currentUrls.length + files.length > limit) {
        toast.error(`You can upload up to ${limit} images only`)
        return
      }

      const uploadedUrls = [...currentUrls]
      for (const file of files) {
        const url = await processFile(file)
        if (url) {
          uploadedUrls.push(url)
          onChange(uploadedUrls)
        }
      }
    } else {
      const url = await processFile(files[0])
      if (url) {
        onChange(url)
      }
    }
  }

  // Render Section
  const urls = multiple 
    ? (Array.isArray(value) ? value : (value ? [value] : []))
    : (value ? [value] : [])

  return (
    <div className={`space-y-3 ${className}`}>
      {label && (
        <label className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider block">
          {label} {multiple && `(${urls.length}/${limit})`}
        </label>
      )}

      {/* Show single preview if not multiple and we have a value */}
      {!multiple && urls.length > 0 ? (
        <div className="relative rounded-2xl overflow-hidden border border-gray-200/80 dark:border-white/10 h-44 group bg-gray-50 dark:bg-white/5">
          <img src={urls[0]} alt="Uploaded preview" className="w-full h-full object-contain" />
          {localUploading ? (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-10 animate-fadeIn">
              <Loader2 className="w-8 h-8 animate-spin text-white" />
              <span className="text-xs font-bold text-white">Uploading to ImgBB...</span>
            </div>
          ) : (
            !disabled && (
              <button
                type="button"
                onClick={() => handleRemove(urls[0])}
                className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-black text-white rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )
          )}
        </div>
      ) : (
        /* Large Dropzone (Visible when single and no value, or multiple and below limit) */
        (!multiple || urls.length < limit) && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => {
              if (disabled || localUploading) return
              if (cameraOnly) {
                setShowCamera(true)
                startCamera(facingMode)
              } else {
                fileInputRef.current?.click()
              }
            }}
            className={`border-dashed border-2 rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
              isDragging
                ? 'border-ozo-red bg-red-500/5'
                : 'border-gray-300 dark:border-white/10 hover:border-gray-400 hover:bg-gray-50/50 dark:hover:bg-white/[0.01]'
            } ${disabled || localUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {!cameraOnly && (
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                multiple={multiple}
                capture={capture}
                className="hidden"
                disabled={disabled || localUploading}
              />
            )}
            <div className="flex flex-col items-center justify-center gap-2">
              {localUploading ? (
                <>
                  <Loader2 className="w-8 h-8 animate-spin text-ozo-red" />
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-350">Uploading image...</p>
                </>
              ) : cameraOnly ? (
                <>
                  <Camera className="w-8 h-8 text-gray-400" />
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Click to <span className="text-ozo-red">capture live photo</span>
                  </p>
                  <p className="text-xs text-gray-450">Live camera capture only.</p>
                </>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-gray-400" />
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Drag and drop your image{multiple && '(s)'} here, or <span className="text-ozo-red">browse</span>
                  </p>
                  <p className="text-xs text-gray-450">Supports PNG, JPG, JPEG, WEBP files.</p>
                </>
              )}
            </div>
          </div>
        )
      )}

      {/* Show thumbnails gallery below ONLY if multiple is true and we have urls */}
      {multiple && urls.length > 0 && (
        <div className="flex flex-wrap gap-3 mt-2">
          {urls.map((url, idx) => (
            <div key={idx} className="relative w-20 h-20 rounded-2xl overflow-hidden border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#1a1a1a]">
              <img src={url} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover" />
              {!disabled && !localUploading && (
                <button
                  type="button"
                  onClick={() => handleRemove(url)}
                  className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white hover:bg-ozo-red transition-colors focus:outline-none"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
          {localUploading && (
            <div className="w-20 h-20 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#1a1a1a] flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-ozo-red" />
            </div>
          )}
        </div>
      )}

      {/* Render Live Camera Modal */}
      {renderCameraModal()}
    </div>
  )

  // Camera Modal Renderer Function
  function renderCameraModal() {
    if (!showCamera) return null

    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <div className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-[2rem] p-6 shadow-2xl space-y-6 overflow-hidden flex flex-col">
          
          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="flex items-center gap-2.5 text-white">
              <Camera className="w-5 h-5 text-emerald-500 dark:text-blue-500" />
              <span className="text-sm font-black uppercase tracking-wider">Live Camera Capture</span>
            </div>
            <button
              type="button"
              onClick={closeCamera}
              className="p-1.5 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Camera Viewport */}
          <div className="relative w-full aspect-[3/4] bg-black rounded-2xl overflow-hidden border border-white/5 flex items-center justify-center">
            {cameraError ? (
              <div className="p-6 text-center space-y-3">
                <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
                <p className="text-sm font-semibold text-gray-300">{cameraError}</p>
                <button
                  type="button"
                  onClick={() => startCamera(facingMode)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all"
                >
                  Try Again
                </button>
              </div>
            ) : capturedImage ? (
              <img
                src={capturedImage}
                alt="Captured snapshot"
                className="w-full h-full object-cover"
              />
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
                />
                {!stream && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-ozo-red" />
                    <span className="text-xs text-gray-400">Initializing camera feed...</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Camera Controls */}
          <div className="flex items-center justify-center gap-6">
            {capturedImage ? (
              <>
                <button
                  type="button"
                  onClick={() => setCapturedImage('')}
                  className="flex items-center gap-2 px-5 py-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl text-xs font-black uppercase tracking-wider transition-all active:scale-95"
                >
                  <RotateCcw className="w-4 h-4" /> Retake
                </button>
                <button
                  type="button"
                  onClick={confirmPhoto}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-700 text-black rounded-2xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-md shadow-blue-500/10"
                >
                  <Check className="w-4 h-4 stroke-[3]" /> Confirm
                </button>
              </>
            ) : (
              <>
                {hasMultipleCameras && (
                  <button
                    type="button"
                    onClick={toggleFacingMode}
                    className="p-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-full transition-all active:scale-90"
                    title="Switch Camera"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                )}
                
                {/* Shutter Button */}
                <button
                  type="button"
                  onClick={capturePhoto}
                  disabled={!stream}
                  className={`w-16 h-16 rounded-full border-4 border-white flex items-center justify-center p-1 transition-all active:scale-90 ${
                    !stream ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white/10'
                  }`}
                >
                  <div className="w-full h-full rounded-full bg-red-600 active:bg-red-700" />
                </button>

                {hasMultipleCameras && <div className="w-11" />}
              </>
            )}
          </div>
        </div>
      </div>
    )
  }
}

export default ImageUpload
