import React, { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShoppingBag, Wrench, Stethoscope } from 'lucide-react'
import OzoLogo from './OzoLogo'
import { useServiceModeStore } from '../stores/serviceModeStore'
import { useCartStore } from '../stores/cartStore'

export default function VerticalDropdownHeader({ fullWidth = false, showLogo = true }) {
  const { currentMode, setMode } = useServiceModeStore()
  const servicesConfig = useCartStore(state => state.servicesConfig)
  const navigate = useNavigate()
  const location = useLocation()

  const isServicesEnabled = servicesConfig?.enabled !== false && servicesConfig?.show_in_app !== false

  // Detect current active vertical mode based on path or store
  const isCare = location.pathname.startsWith('/care') || currentMode === 'care'
  const isServices = !isCare && isServicesEnabled && (location.pathname.startsWith('/services') || currentMode === 'services')
  const activeMode = isCare ? 'care' : isServices ? 'services' : 'mart'

  // Sync mode with route if user navigated directly via URL
  useEffect(() => {
    if (location.pathname.startsWith('/care') && currentMode !== 'care') {
      setMode('care')
    } else if (location.pathname.startsWith('/services') && currentMode !== 'services' && isServicesEnabled) {
      setMode('services')
    } else if ((location.pathname === '/' || location.pathname.startsWith('/product') || location.pathname.startsWith('/category')) && currentMode !== 'mart') {
      setMode('mart')
    }
  }, [location.pathname, currentMode, setMode, isServicesEnabled])

  // If services are disabled globally and user is on services mode, switch to mart
  useEffect(() => {
    if (!isServicesEnabled && currentMode === 'services') {
      setMode('mart')
    }
  }, [isServicesEnabled, currentMode, setMode])

  const handleSelect = (mode) => {
    if (mode === 'services' && !isServicesEnabled) return
    setMode(mode)
    if (mode === 'mart') {
      navigate('/')
    } else if (mode === 'services') {
      navigate('/services')
    } else if (mode === 'care') {
      navigate('/care')
    }
  }

  const verticalItems = [
    {
      id: 'mart',
      suffix: 'mart',
      label: 'Switch to OZO Mart',
      icon: ShoppingBag,
      gradient: 'bg-gradient-to-r from-red-600 via-amber-600 to-orange-500 shadow-red-500/30'
    },
    ...(isServicesEnabled ? [{
      id: 'services',
      suffix: 'services',
      label: 'Switch to OZO Services',
      icon: Wrench,
      gradient: 'bg-gradient-to-r from-sky-500 to-blue-600 shadow-sky-500/30'
    }] : []),
    {
      id: 'care',
      suffix: 'care',
      label: 'Switch to OZO Care',
      icon: Stethoscope,
      gradient: 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 shadow-emerald-500/30'
    }
  ]

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
            verticalMode={activeMode}
          />
        </button>
      )}

      {/* Segmented Toggle Switch (Mart vs Services vs Care) */}
      <div 
        className={`relative flex items-center p-1 bg-gray-100 dark:bg-white/10 rounded-full border border-gray-200/80 dark:border-white/15 shadow-inner select-none ${
          fullWidth ? 'w-full' : 'flex-shrink-0'
        }`}
      >
        {verticalItems.map((item) => {
          const isActive = activeMode === item.id

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item.id)}
              aria-label={item.label}
              className={`relative z-10 flex items-center justify-center gap-1.5 px-2.5 xs:px-3 py-1.5 rounded-full text-xs font-black transition-colors duration-200 cursor-pointer ${
                fullWidth ? 'flex-1' : 'flex-shrink-0'
              } ${
                isActive 
                  ? 'text-white' 
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeVerticalPill"
                  className={`absolute inset-0 rounded-full shadow-md ${item.gradient}`}
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <item.icon size={13} className="flex-shrink-0 relative z-10" />
              <span className="notranslate flex items-baseline gap-0.5 leading-none relative z-10" translate="no">
                <span className="font-black text-[11px] xs:text-xs">OZO</span>
                <span style={{ fontFamily: "'Dancing Script', cursive" }} className="text-[12px] xs:text-[13px] font-bold">
                  {item.suffix}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
