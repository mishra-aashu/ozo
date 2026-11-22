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
          onLoad={() => setIsLoaded(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-out opacity-90 ${
            isLoaded ? 'opacity-90' : 'opacity-0'
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
          onLoad={() => setIsLoaded(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-out opacity-85 ${
            isLoaded ? 'opacity-85' : 'opacity-0'
          }`}
        />
      </picture>

      {/* Subtle Gradient Fog Overlays for contrast & legibility */}
      <div className="absolute inset-0 bg-white/40 dark:bg-[#070b12]/60 backdrop-blur-[2px]" />
      <div className="absolute inset-0 bg-gradient-to-t from-gray-50/90 via-transparent to-gray-50/50 dark:from-[#070b12] dark:via-transparent dark:to-[#070b12]/70" />
    </div>
  )
}
