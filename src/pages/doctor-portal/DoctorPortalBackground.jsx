import React, { useState } from 'react'

/**
 * High-performance, responsive dual-theme background for OzoCare Doctor Portal
 * Features:
 * - Native Light & Dark Mode 3D medical clinical illustrations
 * - Seamless Light Mode (fresh 3D clinic desk & stethoscope) and Dark Mode (sleek neon medical tablet & monitoring)
 * - Soft ambient backdrop overlay for crystal-clear card readability
 */
export default function DoctorPortalBackground() {
  const [isLoaded, setIsLoaded] = useState(false)

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
      {/* Light Mode 3D Medical Scene */}
      <picture className="dark:hidden">
        <img
          src="/images/care/doctor-bg-light.jpg"
          alt="OzoCare Clinical Background Light"
          loading="eager"
          decoding="async"
          fetchPriority="high"
          onLoad={() => setIsLoaded(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-out ${
            isLoaded ? 'opacity-95' : 'opacity-80'
          }`}
        />
      </picture>

      {/* Dark Mode 3D Neon Clinical Scene */}
      <picture className="hidden dark:block">
        <img
          src="/images/care/doctor-bg-dark.jpg"
          alt="OzoCare Clinical Background Dark"
          loading="eager"
          decoding="async"
          fetchPriority="high"
          onLoad={() => setIsLoaded(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-out ${
            isLoaded ? 'opacity-90' : 'opacity-80'
          }`}
        />
      </picture>

      {/* Ambient Vignette Overlay for Crisp Readability without washing out 3D art */}
      <div 
        className="absolute inset-0 bg-transparent dark:bg-[#070709]/30 transition-colors duration-300" 
        aria-hidden="true" 
      />
      <div 
        className="absolute inset-0 bg-gradient-to-t from-gray-100/40 via-transparent to-gray-100/30 dark:from-[#070709]/80 dark:via-transparent dark:to-[#070709]/60 pointer-events-none transition-colors duration-300" 
        aria-hidden="true" 
      />
      <div 
        className="absolute inset-0 bg-gradient-to-r from-gray-100/30 via-transparent to-gray-100/30 dark:from-[#070709]/50 dark:via-transparent dark:to-[#070709]/50 pointer-events-none transition-colors duration-300" 
        aria-hidden="true" 
      />
    </div>
  )
}
