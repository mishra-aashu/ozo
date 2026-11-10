import React, { useState } from 'react'

/**
 * High-performance, responsive dual-theme background for OZO Captain Portal
 * Features:
 * - Native Light & Dark Mode 3D delivery rider illustrations
 * - Responsive WebP loading: Mobile (<=768px) and Desktop (>768px)
 * - Neon green route lines, GPS pins, electric delivery scooters & helmets
 * - Subtle ambient vignette for maximum card contrast and background visibility
 */
export default function CaptainPortalBackground() {
  const [isLoaded, setIsLoaded] = useState(false)

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
      {/* 1. Responsive WebP High-Definition Image - LIGHT MODE */}
      <picture className="dark:hidden">
        <source
          media="(max-width: 768px)"
          srcSet="/images/captain-rider-bg-light-mobile.webp"
          type="image/webp"
        />
        <img
          src="/images/captain-rider-bg-light.webp"
          alt="OZO Captain Delivery Pattern Light"
          loading="eager"
          decoding="async"
          fetchPriority="high"
          onLoad={() => setIsLoaded(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-out ${
            isLoaded ? 'opacity-95' : 'opacity-0'
          }`}
        />
      </picture>

      {/* 2. Responsive WebP High-Definition Image - DARK MODE */}
      <picture className="hidden dark:block">
        <source
          media="(max-width: 768px)"
          srcSet="/images/captain-rider-bg-dark-mobile.webp"
          type="image/webp"
        />
        <img
          src="/images/captain-rider-bg-dark.webp"
          alt="OZO Captain Delivery Pattern Dark"
          loading="eager"
          decoding="async"
          fetchPriority="high"
          onLoad={() => setIsLoaded(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-out ${
            isLoaded ? 'opacity-90' : 'opacity-0'
          }`}
        />
      </picture>

      {/* 3. Ambient Vignette Overlay */}
      <div 
        className="absolute inset-0 bg-transparent dark:bg-[#070709]/30 transition-colors duration-300" 
        aria-hidden="true" 
      />
      <div 
        className="absolute inset-0 bg-gradient-to-t from-gray-100/40 via-transparent to-gray-100/30 dark:from-[#070709]/80 dark:via-transparent dark:to-[#070709]/60 pointer-events-none transition-colors duration-300" 
        aria-hidden="true" 
      />
      <div 
        className="absolute inset-0 bg-gradient-to-r from-gray-100/30 via-transparent to-gray-100/30 dark:from-[#070709]/60 dark:via-transparent dark:to-[#070709]/60 pointer-events-none transition-colors duration-300" 
        aria-hidden="true" 
      />
    </div>
  )
}
