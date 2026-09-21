import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShoppingBag, Wrench } from 'lucide-react'
import OzoLogo from './OzoLogo'
import { useServiceModeStore } from '../stores/serviceModeStore'

export default function VerticalDropdownHeader({ fullWidth = false, showLogo = true }) {
  const { currentMode, setMode } = useServiceModeStore()
  const navigate = useNavigate()
  const location = useLocation()

  const handleSelect = (mode) => {
    if (currentMode === mode && ((mode === 'mart' && location.pathname === '/') || (mode === 'services' && location.pathname === '/services'))) {
      return
    }
    setMode(mode)
    if (mode === 'mart') {
      navigate('/')
    } else {
      navigate('/services')
    }
  }

  const isServices = currentMode === 'services' || location.pathname.startsWith('/services')

  return (
    <div className={`flex items-center gap-2 ${fullWidth ? 'w-full' : 'flex-shrink-0 min-w-0'}`}>
      {showLogo && (
        <button 
          type="button"
          onClick={() => handleSelect('mart')}
          className="flex items-center focus:outline-none hover:scale-105 transition-transform cursor-pointer flex-shrink-0"
          aria-label="Go to Home"
        >
          <OzoLogo
            mode="both"
            size="sm"
            verticalMode={isServices ? 'services' : 'mart'}
          />
        </button>
      )}

      {/* Segmented Toggle Switch (Mart vs Services) */}
      <div className={`relative flex items-center p-1 bg-gray-100 dark:bg-white/10 rounded-full border border-gray-200/80 dark:border-white/15 shadow-inner select-none ${fullWidth ? 'w-full' : 'flex-shrink-0'}`}>
        {/* Sliding Active Pill Background */}
        <motion.div
          className={`absolute top-1 bottom-1 rounded-full shadow-md ${
            isServices 
              ? 'bg-gradient-to-r from-sky-500 to-blue-600 shadow-sky-500/30' 
              : 'bg-gradient-to-r from-red-600 via-amber-600 to-orange-500 shadow-red-500/30'
          }`}
          initial={false}
          animate={{
            left: isServices ? '50%' : '4px',
            width: 'calc(50% - 4px)',
          }}
          transition={{ type: 'spring', stiffness: 450, damping: 32 }}
        />

        {/* Mart Toggle Button */}
        <button
          type="button"
          onClick={() => handleSelect('mart')}
          aria-label="Switch to OZO Mart"
          className={`relative z-10 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black transition-colors duration-200 cursor-pointer ${
            fullWidth ? 'flex-1' : 'flex-shrink-0'
          } ${
            !isServices 
              ? 'text-white' 
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <ShoppingBag size={14} className="flex-shrink-0" />
          <span className="notranslate flex items-baseline gap-0.5 leading-none" translate="no">
            <span className="font-black text-xs">OZO</span>
            <span style={{ fontFamily: "'Dancing Script', cursive" }} className="text-[13px] font-bold">mart</span>
          </span>
        </button>

        {/* Services Toggle Button */}
        <button
          type="button"
          onClick={() => handleSelect('services')}
          aria-label="Switch to OZO Services"
          className={`relative z-10 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black transition-colors duration-200 cursor-pointer ${
            fullWidth ? 'flex-1' : 'flex-shrink-0'
          } ${
            isServices 
              ? 'text-white' 
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Wrench size={14} className="flex-shrink-0" />
          <span className="notranslate flex items-baseline gap-0.5 leading-none" translate="no">
            <span className="font-black text-xs">OZO</span>
            <span style={{ fontFamily: "'Dancing Script', cursive" }} className="text-[13px] font-bold">services</span>
          </span>
        </button>
      </div>
    </div>
  )
}



