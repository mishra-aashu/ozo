import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, Check, ShoppingBag, Wrench } from 'lucide-react'
import OzoLogo from './OzoLogo'
import { useServiceModeStore } from '../stores/serviceModeStore'

export default function VerticalDropdownHeader() {
  const { currentMode, setMode } = useServiceModeStore()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (mode) => {
    setMode(mode)
    setIsOpen(false)
    if (mode === 'mart') {
      navigate('/')
    } else {
      navigate('/services')
    }
  }

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Clickable Header Logo with Chevron */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 p-1 rounded-2xl hover:bg-gray-100 dark:hover:bg-white/5 transition-all duration-200 focus:outline-none group cursor-pointer"
        aria-label="Switch Vertical"
      >
        <OzoLogo
          size="sm"
          verticalMode={currentMode}
          subText={currentMode === 'mart' ? 'Jo Chahiye, Jab Chahiye' : 'Local Doorstep Experts'}
          subTextClassName="hidden sm:inline-block mt-1"
          imgClassName="group-hover:scale-105 group-hover:rotate-3 transition-all duration-300"
        />

        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-300 group-hover:text-ozo-red group-hover:bg-red-50 dark:group-hover:bg-white/20 transition-all duration-200 ml-0.5">
          <ChevronDown
            size={14}
            className={`transition-transform duration-300 ${isOpen ? 'rotate-180 text-ozo-red' : ''}`}
          />
        </div>
      </button>

      {/* Animated Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 p-2 z-50 animate-fadeIn divide-y divide-gray-100 dark:divide-white/10">
          <div className="px-3 py-2">
            <p className="text-[10px] font-black text-gray-400 dark:text-gray-400 uppercase tracking-widest">
              Switch Service Vertical
            </p>
          </div>

          <div className="py-1.5 space-y-1">
            {/* OZO Mart Option */}
            <button
              type="button"
              onClick={() => handleSelect('mart')}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl transition-all duration-200 ${
                currentMode === 'mart'
                  ? 'bg-amber-500/10 text-gray-900 dark:text-white border border-amber-500/30'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-sm">
                  <ShoppingBag size={18} />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-black text-red-600">OZO</span>
                    <span style={{ fontFamily: "'Dancing Script', cursive" }} className="text-sm font-bold text-amber-600 dark:text-yellow-400">
                      mart
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Grocery & Daily Essentials</p>
                </div>
              </div>

              {currentMode === 'mart' && (
                <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                  <Check size={12} strokeWidth={3} />
                </div>
              )}
            </button>

            {/* OZO Services Option */}
            <button
              type="button"
              onClick={() => handleSelect('services')}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl transition-all duration-200 ${
                currentMode === 'services'
                  ? 'bg-sky-500/10 text-gray-900 dark:text-white border border-sky-500/30'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white flex items-center justify-center shadow-sm">
                  <Wrench size={18} />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-black text-red-600">OZO</span>
                    <span style={{ fontFamily: "'Dancing Script', cursive" }} className="text-sm font-bold text-sky-500 dark:text-sky-400">
                      services
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Plumber, Electrician, AC Repair</p>
                </div>
              </div>

              {currentMode === 'services' && (
                <div className="w-5 h-5 rounded-full bg-sky-500 text-white flex items-center justify-center">
                  <Check size={12} strokeWidth={3} />
                </div>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
