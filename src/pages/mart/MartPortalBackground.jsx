import React, { useState } from 'react'
import { MART_BG_LQIP } from './martBgLqip'

/**
 * High-performance, responsive dual-theme background for OZO Mart Portal
 * Features:
 * - Native Light & Dark Mode 3D grocery illustrations with rich detail
 * - Responsive WebP loading: Mobile (<=768px) and Desktop (>768px)
 * - Ultra-lightweight (0.25KB) instant LQIP blur placeholder
 * - Crisp visibility of 3D carts, bags, fruits & delivery elements in both modes
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

      {/* 2. Responsive WebP High-Definition Image - LIGHT MODE */}
      <picture className="dark:hidden">
        <source
          media="(max-width: 768px)"
          srcSet="/images/mart-partner-bg-light-mobile.webp"
          type="image/webp"
        />
        <img
          src="/images/mart-partner-bg-light.webp"
          alt="OZO Mart Partner Supermarket Pattern Light"
          loading="eager"
          decoding="async"
          fetchPriority="high"
          onLoad={() => setIsLoaded(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-out opacity-95`}
        />
      </picture>

      {/* 3. Responsive WebP High-Definition Image - DARK MODE */}
      <picture className="hidden dark:block">
        <source
          media="(max-width: 768px)"
          srcSet="/images/mart-partner-bg-mobile.webp"
          type="image/webp"
        />
        <img
          src="/images/mart-partner-bg.webp"
          alt="OZO Mart Partner Supermarket Pattern Dark"
          loading="eager"
          decoding="async"
          fetchPriority="high"
          onLoad={() => setIsLoaded(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-out opacity-90`}
        />
      </picture>

      {/* 4. Ambient Lighting & Subtle Contrast Vignette */}
      <div 
        className="absolute inset-0 bg-transparent dark:bg-slate-950/40 dark:mix-blend-multiply transition-colors duration-300" 
        aria-hidden="true" 
      />
      <div 
        className="absolute inset-0 bg-gradient-to-t from-slate-200/40 via-transparent to-slate-200/20 dark:from-slate-950/80 dark:via-transparent dark:to-slate-950/60 pointer-events-none transition-colors duration-300" 
        aria-hidden="true" 
      />
      <div 
        className="absolute inset-0 bg-gradient-to-r from-slate-200/30 via-transparent to-slate-200/30 dark:from-slate-950/60 dark:via-transparent dark:to-slate-950/60 pointer-events-none transition-colors duration-300" 
        aria-hidden="true" 
      />
    </div>
  )
}
