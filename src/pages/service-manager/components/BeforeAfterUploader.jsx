import React, { useState } from 'react'
import { Camera, Image as ImageIcon, CheckCircle, ArrowRightLeft, Upload } from 'lucide-react'

export default function BeforeAfterUploader({ booking, onUploadMedia, isReadOnly = false }) {
  const [beforeUrl, setBeforeUrl] = useState(booking?.service_specific_data?.beforePhoto || null)
  const [afterUrl, setAfterUrl] = useState(booking?.service_specific_data?.afterPhoto || null)
  const [sliderPosition, setSliderPosition] = useState(50)

  const handleSimulatedUpload = (type) => {
    // Demo image placeholder for doorstep service proof
    const demoImage = type === 'before'
      ? 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=600&q=80'
      : 'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=600&q=80'

    if (type === 'before') {
      setBeforeUrl(demoImage)
    } else {
      setAfterUrl(demoImage)
    }

    if (onUploadMedia) {
      onUploadMedia(type, demoImage)
    }
  }

  return (
    <div className="bg-white/80 dark:bg-[#1a1a1a]/80 border border-gray-200 dark:border-white/10 rounded-2xl p-4 text-left">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-amber-500" />
          <h4 className="text-xs font-black uppercase tracking-wider text-gray-800 dark:text-gray-200">
            Work Verification & Photo Proof
          </h4>
        </div>
        <span className="text-[10px] font-bold text-gray-400">Required for customer closure</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        {/* Before Photo */}
        <div className="border border-dashed border-gray-300 dark:border-white/15 rounded-xl p-3 flex flex-col items-center justify-center min-h-[140px] relative overflow-hidden bg-gray-50/50 dark:bg-black/20">
          {beforeUrl ? (
            <img src={beforeUrl} alt="Before Service" className="w-full h-32 object-cover rounded-lg" />
          ) : (
            <div className="text-center">
              <Camera className="w-6 h-6 text-gray-400 mx-auto mb-1" />
              <p className="text-xs font-bold text-gray-600 dark:text-gray-300">Before Work Photo</p>
              <p className="text-[10px] text-gray-400 mb-2">Damaged coil, tap, or dirty area</p>
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={() => handleSimulatedUpload('before')}
                  className="px-2.5 py-1 bg-gray-200 dark:bg-white/10 hover:bg-amber-500 hover:text-white rounded-lg text-[10px] font-black transition-all"
                >
                  Upload / Snap
                </button>
              )}
            </div>
          )}
          <span className="absolute top-2 left-2 bg-black/60 text-white text-[9px] font-black px-1.5 py-0.5 rounded">
            BEFORE
          </span>
        </div>

        {/* After Photo */}
        <div className="border border-dashed border-gray-300 dark:border-white/15 rounded-xl p-3 flex flex-col items-center justify-center min-h-[140px] relative overflow-hidden bg-gray-50/50 dark:bg-black/20">
          {afterUrl ? (
            <img src={afterUrl} alt="After Service" className="w-full h-32 object-cover rounded-lg" />
          ) : (
            <div className="text-center">
              <CheckCircle className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
              <p className="text-xs font-bold text-gray-600 dark:text-gray-300">After Work Photo</p>
              <p className="text-[10px] text-gray-400 mb-2">Restored, shiny & leak-proof</p>
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={() => handleSimulatedUpload('after')}
                  className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg text-[10px] font-black transition-all"
                >
                  Upload / Snap
                </button>
              )}
            </div>
          )}
          <span className="absolute top-2 left-2 bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded">
            AFTER
          </span>
        </div>
      </div>
    </div>
  )
}
