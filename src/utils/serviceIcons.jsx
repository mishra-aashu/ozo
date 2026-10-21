import React, { useState } from 'react'
import {
  Wrench,
  Zap,
  Snowflake,
  Hammer,
  Sparkles,
  Paintbrush,
  Bug,
  Droplets,
  ShieldCheck,
  Flame,
  Home,
  Sliders
} from 'lucide-react'

// Lightweight, retina-optimized WebP vector illustrations (~8-12 KB each vs previous 750 KB)
import plumbingImg from '../assets/services/plumbing_vector_art.webp'
import electricianImg from '../assets/services/electrician_vector_art.webp'
import acRepairImg from '../assets/services/ac_repair_vector_art.webp'
import carpentryImg from '../assets/services/carpentry_vector_art.webp'
import homeCleaningImg from '../assets/services/home_cleaning_vector_art.webp'
import paintingImg from '../assets/services/painting_vector_art.webp'
import pestControlImg from '../assets/services/pest_control_vector_art.webp'

// Map of category slug / title / icon key to 3D vector illustration image
export const VECTOR_ART_MAP = {
  // Slugs
  'plumbing': plumbingImg,
  'electrician': electricianImg,
  'ac-appliance': acRepairImg,
  'ac-repair': acRepairImg,
  'carpentry': carpentryImg,
  'home-cleaning': homeCleaningImg,
  'cleaning': homeCleaningImg,
  'painting': paintingImg,
  'pest-control': pestControlImg,

  // Titles / Keys
  'Plumbing': plumbingImg,
  'Electrician': electricianImg,
  'AC Repair': acRepairImg,
  'AC & Appliance Repair': acRepairImg,
  'Carpentry': carpentryImg,
  'Deep Home Cleaning': homeCleaningImg,
  'Cleaning': homeCleaningImg,
  'Painting': paintingImg,
  'Painting & Waterproofing': paintingImg,
  'Pest Control': pestControlImg,

  // Legacy Emojis
  '🚰': plumbingImg,
  '⚡': electricianImg,
  '❄️': acRepairImg,
  '🪚': carpentryImg,
  '🧹': homeCleaningImg,
  '🎨': paintingImg,
  '🐜': pestControlImg
}

// Mapping of category slugs and emoji identifiers to Lucide SVG components (instant fallback)
export const ICON_MAP = {
  // Slugs
  'plumbing': Wrench,
  'electrician': Zap,
  'ac-appliance': Snowflake,
  'ac-repair': Snowflake,
  'carpentry': Hammer,
  'home-cleaning': Sparkles,
  'cleaning': Sparkles,
  'painting': Paintbrush,
  'pest-control': Bug,
  
  // Titles / Keys
  'Plumbing': Wrench,
  'Electrician': Zap,
  'AC Repair': Snowflake,
  'AC & Appliance Repair': Snowflake,
  'Carpentry': Hammer,
  'Deep Home Cleaning': Sparkles,
  'Cleaning': Sparkles,
  'Painting': Paintbrush,
  'Painting & Waterproofing': Paintbrush,
  'Pest Control': Bug,

  // Legacy Emoji String Mappings
  '🚰': Wrench,
  '⚡': Zap,
  '❄️': Snowflake,
  '🪚': Hammer,
  '🧹': Sparkles,
  '🎨': Paintbrush,
  '🐜': Bug
}

// Tailored vibrant color gradients for instant 0ms visual rendering
export const SERVICE_GRADIENTS = {
  'plumbing': 'from-blue-600 to-cyan-500',
  '🚰': 'from-blue-600 to-cyan-500',
  'Plumbing': 'from-blue-600 to-cyan-500',

  'electrician': 'from-amber-500 to-yellow-500',
  '⚡': 'from-amber-500 to-yellow-500',
  'Electrician': 'from-amber-500 to-yellow-500',

  'ac-appliance': 'from-sky-500 to-blue-600',
  'ac-repair': 'from-sky-500 to-blue-600',
  '❄️': 'from-sky-500 to-blue-600',
  'AC Repair': 'from-sky-500 to-blue-600',
  'AC & Appliance Repair': 'from-sky-500 to-blue-600',

  'carpentry': 'from-amber-700 to-orange-700',
  '🪚': 'from-amber-700 to-orange-700',
  'Carpentry': 'from-amber-700 to-orange-700',

  'home-cleaning': 'from-emerald-500 to-teal-600',
  'cleaning': 'from-emerald-500 to-teal-600',
  '🧹': 'from-emerald-500 to-teal-600',
  'Cleaning': 'from-emerald-500 to-teal-600',
  'Deep Home Cleaning': 'from-emerald-500 to-teal-600',

  'painting': 'from-purple-600 to-indigo-600',
  '🎨': 'from-purple-600 to-indigo-600',
  'Painting': 'from-purple-600 to-indigo-600',
  'Painting & Waterproofing': 'from-purple-600 to-indigo-600',

  'pest-control': 'from-rose-600 to-red-600',
  '🐜': 'from-rose-600 to-red-600',
  'Pest Control': 'from-rose-600 to-red-600'
}

/**
 * Reusable 3D Vector Illustration & Lucide SVG Icon renderer for service categories.
 * Features:
 * - Instant 0ms SVG icon + gradient background (never leaves an empty dark square)
 * - Ultra-lightweight 8-12KB WebP vector illustration loading eagerly on top
 * - Graceful fallback on error or slow connections
 */
export function CategoryIcon({ icon, slug, title, image, size, className = "", alt = "" }) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)

  const vectorImg = image || 
    VECTOR_ART_MAP[icon] || 
    VECTOR_ART_MAP[slug] || 
    VECTOR_ART_MAP[title]

  const IconComponent = 
    ICON_MAP[icon] || 
    ICON_MAP[slug] || 
    ICON_MAP[title] || 
    Wrench

  const gradient = 
    SERVICE_GRADIENTS[slug] || 
    SERVICE_GRADIENTS[icon] || 
    SERVICE_GRADIENTS[title] || 
    'from-sky-500 to-blue-600'

  return (
    <div className={`relative w-full h-full rounded-2xl overflow-hidden flex items-center justify-center bg-gradient-to-tr ${gradient} select-none shadow-sm ${className}`}>
      {/* 1. Instant 0ms Vector Icon Fallback */}
      <IconComponent 
        size={size || 26} 
        className="text-white drop-shadow-md shrink-0 pointer-events-none transition-transform duration-300" 
      />

      {/* 2. Razor-sharp, lightweight 8-12KB WebP Art Overlay */}
      {vectorImg && !hasError && (
        <img 
          src={vectorImg} 
          alt={alt || title || slug || "Service Category"} 
          loading="eager"
          decoding="async"
          fetchPriority="high"
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          className={`absolute inset-0 w-full h-full object-cover rounded-2xl transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </div>
  )
}

export default CategoryIcon
