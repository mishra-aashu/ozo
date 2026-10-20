import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WifiOff, ZapOff, CheckCircle2, RefreshCw } from 'lucide-react'
import { useNetworkQuality } from '../hooks/useNetworkQuality'

export default function NetworkStatusBanner() {
  const { isOnline, isLowNetwork, effectiveType } = useNetworkQuality()
  const [showRestored, setShowRestored] = useState(false)
  const [wasOffline, setWasOffline] = useState(false)

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true)
    } else if (wasOffline) {
      setShowRestored(true)
      const timer = setTimeout(() => {
        setShowRestored(false)
        setWasOffline(false)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [isOnline, wasOffline])

  const showBanner = !isOnline || isLowNetwork || showRestored

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="fixed top-2.5 left-1/2 -translate-x-1/2 z-[9999] pointer-events-auto max-w-[92vw] sm:max-w-md"
        >
          <div className={`px-3.5 py-1.5 rounded-full shadow-lg backdrop-blur-md flex items-center gap-2 border text-xs font-bold transition-colors ${
            !isOnline 
              ? 'bg-rose-500/90 text-white border-rose-400/30 shadow-rose-500/20'
              : showRestored
                ? 'bg-emerald-500/90 text-white border-emerald-400/30 shadow-emerald-500/20'
                : 'bg-amber-500/90 text-white border-amber-400/30 shadow-amber-500/20'
          }`}>
            {!isOnline ? (
              <>
                <WifiOff className="w-3.5 h-3.5 animate-pulse shrink-0" />
                <span className="truncate">Offline Mode · Browsing saved catalog</span>
              </>
            ) : showRestored ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Connection restored · Live catalog</span>
              </>
            ) : (
              <>
                <ZapOff className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Slow {effectiveType.toUpperCase()} network · Data saver active</span>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
