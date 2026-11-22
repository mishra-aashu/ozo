import React, { useState, useMemo, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { 
  Search, 
  X, 
  Check, 
  Stethoscope, 
  ChevronRight
} from 'lucide-react'
import { CARE_SPECIALTIES } from '../../utils/careIcons'

export default function DoctorSpecialtyModal({
  isOpen,
  onClose,
  selectedSlug,
  onSelect
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const searchInputRef = useRef(null)

  // Lock body scroll and focus search input when modal opens
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      const timer = setTimeout(() => {
        searchInputRef.current?.focus()
      }, 100)
      return () => {
        clearTimeout(timer)
        document.body.style.overflow = ''
      }
    } else {
      document.body.style.overflow = ''
      setSearchQuery('')
      setActiveCategory('All')
    }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Category tags mapping
  const categories = [
    { label: 'All', filter: () => true },
    { 
      label: 'General & Primary', 
      filter: (s) => ['general-physician', 'pediatrics', 'gynecology'].includes(s.slug) 
    },
    { 
      label: 'Specialist', 
      filter: (s) => ['cardiology', 'neurology', 'pulmonology', 'gastroenterology', 'urology', 'endocrinology'].includes(s.slug) 
    },
    { 
      label: 'Bones & Surgery', 
      filter: (s) => ['orthopedic', 'general-surgery', 'dental', 'ent', 'ophthalmology'].includes(s.slug) 
    },
    { 
      label: 'Wellness & Rehab', 
      filter: (s) => ['dermatology', 'psychiatry', 'physiotherapy', 'ayurveda', 'nutrition', 'pathology'].includes(s.slug) 
    }
  ]

  // Filtered Specialties
  const filteredSpecialties = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const activeCatObj = categories.find(c => c.label === activeCategory) || categories[0]

    return CARE_SPECIALTIES.filter(s => {
      // 1. Category check
      if (!activeCatObj.filter(s)) return false

      // 2. Query check
      if (!q) return true

      const matchTitle = s.title?.toLowerCase().includes(q)
      const matchSubtitle = s.subtitle?.toLowerCase().includes(q)
      const matchDescription = s.description?.toLowerCase().includes(q)
      const matchSlug = s.slug?.toLowerCase().includes(q)
      const matchBadge = s.badge?.toLowerCase().includes(q)
      const matchAliases = s.aliases?.some(a => a.toLowerCase().includes(q))

      return matchTitle || matchSubtitle || matchDescription || matchSlug || matchBadge || matchAliases
    })
  }, [searchQuery, activeCategory])

  if (!isOpen) return null

  const modalContent = (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/65 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg bg-white dark:bg-[#0c0c16] border border-gray-200/90 dark:border-white/10 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scaleIn transition-all duration-300 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-gray-100 dark:border-white/5 flex items-center justify-between gap-4 bg-white dark:bg-[#0c0c16]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 shrink-0">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white font-display tracking-tight">
                Select Medical Specialty
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                Choose your primary area of clinical practice
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-[#161626] dark:hover:bg-[#202038] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center justify-center transition-all cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar & Category Chips */}
        <div className="p-4 sm:px-6 pb-3 bg-gray-50/70 dark:bg-[#0f0f1c]/70 border-b border-gray-100 dark:border-white/5">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search specialty (e.g. Heart, Skin, Fever, MBBS)..."
              className="w-full bg-white dark:bg-[#141426] border border-gray-200 dark:border-white/10 rounded-2xl py-3 pl-10 pr-9 text-xs sm:text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 font-medium transition-all shadow-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-full cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-3 pb-0.5">
            {categories.map((c) => (
              <button
                key={c.label}
                type="button"
                onClick={() => setActiveCategory(c.label)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
                  activeCategory === c.label
                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-500/20'
                    : 'bg-white dark:bg-[#141426] text-gray-600 dark:text-gray-400 border-gray-200/80 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Specialty List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2.5">
          {filteredSpecialties.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-[#161626] text-gray-400 flex items-center justify-center mx-auto mb-3">
                <Search className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">
                No specialties found
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Try searching for general terms like "doctor", "fever", or "skin"
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('')
                  setActiveCategory('All')
                }}
                className="mt-3 px-4 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs hover:bg-emerald-500/20 transition-all cursor-pointer"
              >
                Reset Search Filters
              </button>
            </div>
          ) : (
            filteredSpecialties.map((specialty) => {
              const IconComp = specialty.icon || Stethoscope
              const isSelected = selectedSlug === specialty.slug

              return (
                <button
                  key={specialty.slug}
                  type="button"
                  onClick={() => {
                    onSelect(specialty.slug)
                    onClose()
                  }}
                  className={`w-full text-left p-3.5 rounded-2xl transition-all flex items-center gap-3.5 border cursor-pointer group active:scale-[0.99] ${
                    isSelected
                      ? 'bg-emerald-50/90 dark:bg-emerald-500/15 border-2 border-emerald-500 dark:border-emerald-400 shadow-sm shadow-emerald-500/10'
                      : 'bg-white hover:bg-emerald-50/40 dark:bg-[#121222]/80 dark:hover:bg-[#18182e] border-gray-200/80 hover:border-emerald-300/80 dark:border-white/5 dark:hover:border-emerald-500/30 shadow-xs'
                  }`}
                >
                  {/* Specialty Icon */}
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-tr ${specialty.gradient || 'from-emerald-500 to-teal-600'} flex items-center justify-center text-white shrink-0 shadow-sm`}>
                    <IconComp className="w-5 h-5" />
                  </div>

                  {/* Specialty Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-gray-900 dark:text-white font-display truncate">
                        {specialty.title}
                      </span>
                      {specialty.badge && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 shrink-0">
                          {specialty.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium truncate mt-0.5">
                      {specialty.subtitle}
                    </p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 line-clamp-1 mt-0.5">
                      {specialty.description}
                    </p>
                  </div>

                  {/* Active Indicator */}
                  <div className="shrink-0 pl-1">
                    {isSelected ? (
                      <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/30">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-transparent group-hover:bg-gray-100 dark:group-hover:bg-white/10 flex items-center justify-center text-gray-400 dark:text-gray-500 transition-all">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 px-6 border-t border-gray-100 dark:border-white/5 bg-gray-50/80 dark:bg-[#0c0c16]/90 backdrop-blur-md flex items-center justify-between">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            Showing <strong className="text-gray-900 dark:text-white font-bold">{filteredSpecialties.length}</strong> clinical specialties
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gray-200/80 hover:bg-gray-300 dark:bg-[#1a1a2e] dark:hover:bg-[#252540] text-gray-700 dark:text-gray-200 font-bold text-xs transition-all cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )

  // Render via React Portal into document.body to ensure full viewport positioning and prevent clipping by parent backdrop-blur containers
  return createPortal(modalContent, document.body)
}
