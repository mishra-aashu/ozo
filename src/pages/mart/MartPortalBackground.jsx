import React, { useState } from 'react'
import { MART_BG_LQIP } from './martBgLqip'

/**
 * High-performance, responsive background for OZO Mart Portal
 * Features:
 * - Ultra-lightweight (0.25KB) instant LQIP blur placeholder (0ms render on 2G/3G)
 * - Responsive WebP loading: 42KB for mobile (<=768px), 111KB for desktop (>768px)
 * - Smooth fade-in transition without layout shifts
 * - Cinematic ambient overlay for high text contrast and glassmorphism support
 */
export default function MartPortalBackground() {
  const [isLoaded, setIsLoaded] = useState(false)

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
      {/* 1. Instant Low-Quality Image Placeholder (LQIP) */}
      <img
        src={MART_BG_LQIP}
        alt=""
        aria-hidden="true"
        className={`absolute inset-0 w-full h-full object-cover scale-110 filter blur-xl transition-opacity duration-1000 ${
          isLoaded ? 'opacity-0' : 'opacity-100'
        }`}
      />

      {/* 2. Responsive WebP High-Definition Image */}
      <picture>
        <source
          media="(max-width: 768px)"
          srcSet="/images/mart-partner-bg-mobile.webp"
          type="image/webp"
        />
        <img
          src="/images/mart-partner-bg.webp"
          alt="OZO Mart Partner Supermarket Pattern"
          loading="eager"
          decoding="async"
          fetchPriority="high"
          onLoad={() => setIsLoaded(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-out ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </picture>

      {/* 3. Ambient Lighting & Contrast Gradient Overlay */}
      <div 
        className="absolute inset-0 bg-slate-950/75 mix-blend-multiply transition-colors duration-300" 
        aria-hidden="true" 
      />
      <div 
        className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/80 pointer-events-none" 
        aria-hidden="true" 
      />
      <div 
        className="absolute inset-0 bg-gradient-to-r from-slate-950/70 via-transparent to-slate-950/70 pointer-events-none" 
        aria-hidden="true" 
      />
    </div>
  )
}
