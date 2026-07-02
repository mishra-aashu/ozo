import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown,
  Check,
  Star,
  Clock,
  TrendingUp,
  ArrowUp,
  ArrowDown,
  Percent,
  SlidersHorizontal,
  Shuffle
} from 'lucide-react'

export const sortOptions = [
  {
    value: 'random',
    label: 'Default (Random)',
    description: 'Discover new items on every visit',
    icon: Shuffle
  },
  {
    value: 'default',
    label: 'Alphabetical: A to Z',
    description: 'Sort alphabetically from A to Z',
    icon: SlidersHorizontal
  },
  {
    value: 'name_desc',
    label: 'Alphabetical: Z to A',
    description: 'Sort alphabetically from Z to A',
    icon: SlidersHorizontal
  },
  {
    value: 'popularity',
    label: 'Popularity',
    description: 'Trending and best sellers first',
    icon: TrendingUp
  },
  {
    value: 'price_low_high',
    label: 'Price: Low to High',
    description: 'Budget friendly options first',
    icon: ArrowUp
  },
  {
    value: 'price_high_low',
    label: 'Price: High to Low',
    description: 'Premium quality items first',
    icon: ArrowDown
  },
  {
    value: 'rating',
    label: 'Customer Rating',
    description: 'Top rated products by users',
    icon: Star
  },
  {
    value: 'discount',
    label: 'Super Discounts',
    description: 'Biggest savings and discount offers',
    icon: Percent
  },
  {
    value: 'newest',
    label: 'New Arrivals',
    description: 'Fresh and newly listed items',
    icon: Clock
  }
]

export default function SortDropdown({ sortBy, onChange }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Find active option
  const activeOption = sortOptions.find(opt => opt.value === sortBy) || sortOptions[0]

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative inline-block w-full md:w-64" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full bg-white dark:bg-[#1a1a1a] border border-ozo-gray-lighter dark:border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-200 hover:border-ozo-red dark:hover:border-ozo-red/50 hover:shadow-sm focus:outline-none transition-all duration-300"
      >
        <div className="flex items-center gap-2">
          <activeOption.icon className="w-4 h-4 text-ozo-red" />
          <span className="truncate">Sort: {activeOption.label}</span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-ozo-gray dark:text-gray-400 transition-transform duration-300 ${
            isOpen ? 'rotate-180 text-ozo-red' : ''
          }`}
        />
      </button>

      {/* Floating Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 mt-2 w-full md:w-[320px] bg-white/95 dark:bg-[#121212]/95 backdrop-blur-md border border-gray-100 dark:border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="p-2 max-h-[360px] overflow-y-auto scrollbar-hide space-y-0.5">
              {sortOptions.map((option) => {
                const isSelected = option.value === sortBy
                const Icon = option.icon
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value)
                      setIsOpen(false)
                    }}
                    className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-left transition-all duration-200 ${
                      isSelected
                        ? 'bg-gradient-ozo text-white shadow-md'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-ozo-red dark:hover:text-white'
                    }`}
                  >
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'bg-white/20'
                          : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : ''}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-black truncate">{option.label}</span>
                        {isSelected && <Check className="w-4 h-4 text-white" />}
                      </div>
                      <p
                        className={`text-[10px] truncate leading-tight font-medium ${
                          isSelected ? 'text-white/80' : 'text-gray-400 dark:text-gray-500'
                        }`}
                      >
                        {option.description}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
