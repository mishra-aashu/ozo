import React from 'react'
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

import plumbingImg from '../assets/services/plumbing_vector_art.jpg'
import electricianImg from '../assets/services/electrician_vector_art.jpg'
import acRepairImg from '../assets/services/ac_repair_vector_art.jpg'
import carpentryImg from '../assets/services/carpentry_vector_art.jpg'
import homeCleaningImg from '../assets/services/home_cleaning_vector_art.jpg'
import paintingImg from '../assets/services/painting_vector_art.jpg'
import pestControlImg from '../assets/services/pest_control_vector_art.jpg'

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

// Mapping of category slugs and emoji identifiers to Lucide SVG components (fallback)
export const ICON_MAP = {
  // Slugs
  'plumbing': Wrench,
  'electrician': Zap,
  'ac-appliance': Snowflake,
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

/**
 * Reusable 3D Vector Illustration & Lucide SVG Icon renderer for service categories.
 */
export function CategoryIcon({ icon, slug, title, image, size, className = "", alt = "" }) {
  const vectorImg = image || 
    VECTOR_ART_MAP[icon] || 
    VECTOR_ART_MAP[slug] || 
    VECTOR_ART_MAP[title]

  if (vectorImg) {
    return (
      <img 
        src={vectorImg} 
        alt={alt || title || slug || "Service Category"} 
        className={`w-full h-full object-cover rounded-2xl shadow-sm transition-all duration-300 ${className}`}
        onError={(e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.style.display = 'none';
        }}
      />
    )
  }

  const IconComponent = 
    ICON_MAP[icon] || 
    ICON_MAP[slug] || 
    ICON_MAP[title] || 
    Wrench

  return <IconComponent size={size || 24} className={className} />
}

export default CategoryIcon
