import React, { useState } from 'react'
import { SERVICE_BG_LQIP } from './serviceManagerBgLqip'

/**
 * High-performance ambient dual-theme backdrop for OZO Service Manager Portal
 */
export default function ServicePortalBackground() {
  const [isLoaded, setIsLoaded] = useState(false)

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
      {/* 1. Instant LQIP Placeholder */}
      <img
        src={SERVICE_BG_LQIP}
        alt=""
        aria-hidden="true"
        className={`absolute inset-0 w-full h-full object-cover scale-110 filter blur-2xl transition-opacity duration-1000 ${
          isLoaded ? 'opacity-0' : 'opacity-100'
        }`}
      />

      {/* 2. Ambient Gradient Blobs (Dynamic CSS Mesh - Industrial Amber & Gold Theme) */}
      <div className="absolute inset-0 opacity-40 dark:opacity-25 transition-opacity duration-700">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-gradient-to-br from-amber-400 to-orange-600 rounded-full blur-3xl opacity-60" />
        <div className="absolute top-1/3 -right-32 w-96 h-96 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-full blur-3xl opacity-40" />
        <div className="absolute -bottom-32 left-1/4 w-96 h-96 bg-gradient-to-br from-orange-400 to-amber-700 rounded-full blur-3xl opacity-50" />
      </div>

      {/* 3. Subtle Technical Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.07] bg-[radial-gradient(#000_1px,transparent_1px)] dark:bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px]"
        onLoad={() => setIsLoaded(true)}
      />
    </div>
  )
}
