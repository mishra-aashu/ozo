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

      {/* 2. Ambient Gradient Blobs (Dynamic CSS Mesh) */}
      <div className="absolute inset-0 opacity-40 dark:opacity-25 transition-opacity duration-700">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-gradient-to-br from-sky-400 to-blue-600 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-32 w-96 h-96 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 left-1/4 w-96 h-96 bg-gradient-to-br from-teal-400 to-emerald-600 rounded-full blur-3xl" />
      </div>

      {/* 3. Subtle Technical Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.07] bg-[radial-gradient(#000_1px,transparent_1px)] dark:bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px]"
        onLoad={() => setIsLoaded(true)}
      />
    </div>
  )
}
