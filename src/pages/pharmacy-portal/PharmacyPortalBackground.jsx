import React, { useState } from 'react'

/**
 * High-performance, responsive dual-theme background for OzoCare Pharmacy Portal
 * Features:
 * - Native Light & Dark Mode 3D pharmacy dispensary illustrations
 * - Seamless Light Mode (modern retail pharmacy dispensary counter) and Dark Mode (sleek neon apothecary tech)
 * - Soft ambient backdrop overlay for crystal-clear card readability
 */
export default function PharmacyPortalBackground() {
  const [isLoaded, setIsLoaded] = useState(false)

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
      {/* Light Mode 3D Pharmacy Scene */}
      <picture className="dark:hidden">
        <img
          src="/images/care/pharmacy-bg-light.jpg"
          alt="OzoCare Pharmacy Background Light"
          loading="eager"
          decoding="async"
          fetchPriority="high"
          onLoad={() => setIsLoaded(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-out ${
            isLoaded ? 'opacity-95' : 'opacity-80'
          }`}
        />
      </picture>

      {/* Dark Mode 3D Neon Apothecary Scene */}
      <picture className="hidden dark:block">
        <img
          src="/images/care/pharmacy-bg-dark.jpg"
          alt="OzoCare Pharmacy Background Dark"
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
