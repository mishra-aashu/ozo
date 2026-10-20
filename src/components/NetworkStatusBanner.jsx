import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WifiOff, ZapOff, CheckCircle2, RefreshCw, X } from 'lucide-react'
import { useNetworkQuality } from '../hooks/useNetworkQuality'

export default function NetworkStatusBanner() {
  const { isOnline, isLowNetwork, effectiveType } = useNetworkQuality()
  const [showRestored, setShowRestored] = useState(false)
  const [wasOffline, setWasOffline] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true)
      setDismissed(false)
    } else if (wasOffline) {
      setShowRestored(true)
      setDismissed(false)
      const timer = setTimeout(() => {
        setShowRestored(false)
        setWasOffline(false)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [isOnline, wasOffline])

  const showBanner = !dismissed && (!isOnline || isLowNetwork || showRestored)

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ y: -40, opacity: 0, x: '-50%' }}
          animate={{ y: 0, opacity: 1, x: '-50%' }}
          exit={{ y: -40, opacity: 0, x: '-50%' }}
          transition={{ type: 'spring', damping: 24, stiffness: 320 }}
          className="fixed left-1/2 z-[9999] pointer-events-auto w-max max-w-[calc(100vw-1.5rem)] sm:max-w-md select-none"
          style={{
            top: 'max(0.625rem, calc(env(safe-area-inset-top, 0px) + 0.375rem))'
          }}
        >
          <div className={`px-3 sm:px-4 py-1.5 rounded-full shadow-2xl backdrop-blur-xl flex items-center gap-2 border text-[11px] sm:text-xs font-black tracking-wide transition-colors ${
            !isOnline 
              ? 'bg-rose-600/95 text-white border-rose-400/40 shadow-rose-600/30'
              : showRestored
                ? 'bg-emerald-600/95 text-white border-emerald-400/40 shadow-emerald-600/30'
                : 'bg-amber-600/95 text-white border-amber-400/40 shadow-amber-600/30'
          }`}>
            {!isOnline ? (
              <>
                <WifiOff className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">
                  <span className="xs:hidden">Offline Mode · Saved Catalog</span>
                  <span className="hidden xs:inline">Offline Mode · Browsing saved catalog</span>
                </span>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="ml-0.5 p-1 hover:bg-white/20 active:scale-90 rounded-full transition-all shrink-0"
                  title="Retry connection"
                  aria-label="Retry connection"
                >
                  <RefreshCw className="w-3 h-3 text-white/90 hover:text-white" />
                </button>
              </>
            ) : showRestored ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">
                  <span className="xs:hidden">Online · Live Catalog</span>
                  <span className="hidden xs:inline">Connection restored · Live catalog</span>
                </span>
              </>
            ) : (
              <>
                <ZapOff className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">
                  <span className="xs:hidden">Slow {effectiveType?.toUpperCase()} · Data Saver</span>
                  <span className="hidden xs:inline">Slow {effectiveType?.toUpperCase()} network · Data saver active</span>
                </span>
              </>
            )}

            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="p-1 hover:bg-white/20 active:scale-90 rounded-full transition-all shrink-0 -mr-1"
              title="Dismiss notice"
              aria-label="Dismiss notice"
            >
              <X className="w-3 h-3 text-white/80 hover:text-white" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
